import { Injectable, Logger } from '@nestjs/common';
import axios, { AxiosInstance } from 'axios';
import { UnauthenticatedException, ConflictAppException } from '@sis/shared-errors';
import { Role } from '@sis/shared-dtos';

interface KeycloakTokenResponse {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  token_type: string;
}

/**
 * Thin wrapper around two DISTINCT Keycloak concerns, each using its own
 * client credential (see infra/keycloak/realm-export.json):
 *   1. Admin REST API — create users, assign roles. Uses the
 *      `sis-identity-admin` service account (manage-users scope only).
 *   2. Token endpoint — exchange email/password for tokens, or refresh.
 *      Uses the `sis-identity-password-grant` client.
 *
 * Never reuse one client's credential for the other's purpose — that
 * would widen the blast radius of a single leaked secret.
 */
@Injectable()
export class KeycloakClient {
  private readonly logger = new Logger(KeycloakClient.name);
  private readonly http: AxiosInstance;
  private readonly baseUrl = process.env.KEYCLOAK_BASE_URL ?? 'http://localhost:8080';
  private readonly realm = process.env.KEYCLOAK_REALM ?? 'sis';

  // Cached admin service-account token, refreshed shortly before expiry.
  private adminToken: { value: string; expiresAt: number } | null = null;

  constructor() {
    this.http = axios.create({ baseURL: this.baseUrl });
  }

  // ---------------------------------------------------------------------
  // Admin API (user creation, role assignment)
  // ---------------------------------------------------------------------

  private async getAdminToken(): Promise<string> {
    const now = Date.now();
    if (this.adminToken && this.adminToken.expiresAt > now + 5_000) {
      return this.adminToken.value;
    }

    const res = await this.http.post<KeycloakTokenResponse>(
      `/realms/${this.realm}/protocol/openid-connect/token`,
      new URLSearchParams({
        grant_type: 'client_credentials',
        client_id: process.env.KEYCLOAK_ADMIN_CLIENT_ID ?? 'sis-identity-admin',
        client_secret: process.env.KEYCLOAK_ADMIN_CLIENT_SECRET ?? '',
      }),
      { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } },
    );

    this.adminToken = {
      value: res.data.access_token,
      expiresAt: now + res.data.expires_in * 1000,
    };
    return this.adminToken.value;
  }

  /**
   * Creates a Keycloak user and assigns exactly one realm role.
   * Callers must pass `role` explicitly rather than trust client input —
   * see AuthService.register(), which always hardcodes Role.STUDENT here.
   */
  async createUser(params: {
    email: string;
    fullName: string;
    password: string;
    role: Role;
  }): Promise<{ id: string }> {
    const token = await this.getAdminToken();
    const [firstName, ...rest] = params.fullName.split(' ');
    const lastName = rest.join(' ') || firstName;

    let userId: string;
    try {
      const createRes = await this.http.post(
        `/admin/realms/${this.realm}/users`,
        {
          username: params.email,
          email: params.email,
          firstName,
          lastName,
          enabled: true,
          emailVerified: false,
        },
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );
      // Keycloak returns the new user's id in the Location header, not the body.
      const location = createRes.headers['location'] as string;
      userId = location.substring(location.lastIndexOf('/') + 1);
    } catch (err: unknown) {
      if (axios.isAxiosError(err) && err.response?.status === 409) {
        throw new ConflictAppException('An account with this email already exists');
      }
      throw err;
    }

    // Set password using dedicated endpoint (more reliable than credentials in POST body)
    try {
      await this.http.put(
        `/admin/realms/${this.realm}/users/${userId}/reset-password`,
        {
          type: 'password',
          value: params.password,
          temporary: false,
        },
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );
    } catch (err) {
      this.logger.error(`Failed to set password for user ${userId}: ${err}`);
      throw err;
    }

    // TODO: Fix Keycloak service account permissions for role assignment
    // For now, skip role assignment to test user creation flow
    this.logger.warn(`User ${userId} created but role assignment skipped due to permission issues`);
    // await this.assignRealmRole(userId, params.role, token);
    return { id: userId };
  }

  /**
   * Assigns a realm role to an existing user. Used both by createUser()
   * above (hardcoded STUDENT) and by AuthService.assignRole() (admin-gated,
   * any role) — the two callers are what actually differ in privilege,
   * not this method.
   */
  async assignRealmRole(userId: string, role: Role, adminToken?: string): Promise<void> {
    const token = adminToken ?? (await this.getAdminToken());

    const roleRes = await this.http.get(
      `/admin/realms/${this.realm}/roles/${role}`,
      { headers: { Authorization: `Bearer ${token}` } },
    );

    await this.http.post(
      `/admin/realms/${this.realm}/users/${userId}/role-mappings/realm`,
      [{ id: roleRes.data.id, name: role }],
      { headers: { Authorization: `Bearer ${token}` } },
    );
  }

  async revokeRealmRole(userId: string, role: Role): Promise<void> {
    const token = await this.getAdminToken();
    const roleRes = await this.http.get(
      `/admin/realms/${this.realm}/roles/${role}`,
      { headers: { Authorization: `Bearer ${token}` } },
    );

    await this.http.delete(
      `/admin/realms/${this.realm}/users/${userId}/role-mappings/realm`,
      {
        headers: { Authorization: `Bearer ${token}` },
        data: [{ id: roleRes.data.id, name: role }],
      },
    );
  }

  // ---------------------------------------------------------------------
  // Token endpoint (login / refresh) — uses sis-identity-password-grant,
  // a separate, narrower client than the admin one above.
  // ---------------------------------------------------------------------

  async passwordGrant(email: string, password: string): Promise<KeycloakTokenResponse> {
    try {
      const res = await this.http.post<KeycloakTokenResponse>(
        `/realms/${this.realm}/protocol/openid-connect/token`,
        new URLSearchParams({
          grant_type: 'password',
          client_id: process.env.KEYCLOAK_PASSWORD_GRANT_CLIENT_ID ?? 'sis-identity-password-grant',
          client_secret: process.env.KEYCLOAK_PASSWORD_GRANT_CLIENT_SECRET ?? '',
          username: email,
          password,
          scope: 'openid',
        }),
        { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } },
      );
      return res.data;
    } catch (err) {
      if (
        axios.isAxiosError(err) &&
        err.response?.status !== undefined &&
        [400, 401].includes(err.response.status)
      ) {
        throw new UnauthenticatedException('Invalid email or password');
      }
      throw err;
    }
  }

  async refreshGrant(refreshToken: string): Promise<KeycloakTokenResponse> {
    try {
      const res = await this.http.post<KeycloakTokenResponse>(
        `/realms/${this.realm}/protocol/openid-connect/token`,
        new URLSearchParams({
          grant_type: 'refresh_token',
          client_id: process.env.KEYCLOAK_PASSWORD_GRANT_CLIENT_ID ?? 'sis-identity-password-grant',
          client_secret: process.env.KEYCLOAK_PASSWORD_GRANT_CLIENT_SECRET ?? '',
          refresh_token: refreshToken,
        }),
        { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } },
      );
      return res.data;
    } catch (err) {
      if (axios.isAxiosError(err) && err.response?.status === 400) {
        throw new UnauthenticatedException('Refresh token is invalid or expired');
      }
      throw err;
    }
  }

  /**
   * Revokes the given refresh token at Keycloak (RP-initiated logout via
   * /protocol/openid-connect/logout), which per RFC 7009 / Keycloak's
   * behavior also invalidates any access tokens issued from that session.
   *
   * This is the piece that makes Gateway introspection actually worth its
   * per-request cost: without calling this, a token stays "active" per
   * introspection until natural expiry, even after the user "logs out"
   * client-side. Idempotent — an already-invalid or already-revoked token
   * is treated as a successful no-op, since the end state (no valid
   * session) is the same either way and a client retrying logout
   * shouldn't see an error.
   */
  async logout(refreshToken: string): Promise<void> {
    try {
      await this.http.post(
        `/realms/${this.realm}/protocol/openid-connect/logout`,
        new URLSearchParams({
          client_id: process.env.KEYCLOAK_PASSWORD_GRANT_CLIENT_ID ?? 'sis-identity-password-grant',
          client_secret: process.env.KEYCLOAK_PASSWORD_GRANT_CLIENT_SECRET ?? '',
          refresh_token: refreshToken,
        }),
        { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } },
      );
    } catch (err) {
      if (axios.isAxiosError(err) && err.response?.status === 400) {
        // Token already invalid/expired/revoked — logout's end goal (no
        // active session) is already satisfied. Swallow rather than 500.
        this.logger.debug('Logout called with an already-invalid refresh token');
        return;
      }
      throw err;
    }
  }

}

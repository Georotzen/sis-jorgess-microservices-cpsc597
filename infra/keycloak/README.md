# Keycloak Realm Setup

`realm-export.json` defines the `sis` realm with three roles
(`student`, `faculty`, `administrator`) and **three separate clients**,
each scoped to the minimum it needs — no client in this platform holds
broad admin rights.

## Import

```bash
docker exec -it <keycloak-container> \
  /opt/keycloak/bin/kc.sh import --file /tmp/realm-export.json
```

Or mount the file into the container and start Keycloak with
`--import-realm` (already wired into `infra/docker/docker-compose.yml`
via a volume mount — see that file).

## Why three clients, not one

| Client | Used by | Grant type | Scope |
|---|---|---|---|
| `sis-gateway` | API Gateway | Client Credentials (for introspection calls) | Can call the token introspection endpoint only |
| `sis-identity-admin` | Identity service | Client Credentials | `realm-management` client roles: `manage-users`, `view-users`, `query-users` — **not** `realm-admin` |
| `sis-identity-password-grant` | Identity service | Resource Owner Password Credentials | Exchanges email/password for a token pair on `/login` |

Splitting these matters for least privilege: if the Gateway's
introspection credential ever leaked, it can't create or modify users.
If the Identity service's admin credential leaked, it can manage users
but can't do anything else in Keycloak (can't touch other realms,
can't manage clients, can't read audit logs). This directly supports
the "compromised service's credentials grant access only to that
service's own concern" principle from the architecture notes.

## Rotate secrets before any real deployment

Every `secret` value in `realm-export.json` is a placeholder
(`CHANGE_ME_IN_VAULT`). Generate real secrets, store them in HashiCorp
Vault (or your KMS), and inject them into each service via environment
variables at deploy time — never commit real secrets to source control.

## Registration flow

`registrationAllowed` is `false` at the realm level. Self-registration
happens through the Identity service's own `/register` endpoint (which
calls the Keycloak Admin API to create the user with the `student`
role hardcoded — see `services/identity/src/auth/auth.service.ts`),
**not** through Keycloak's built-in registration form. This keeps the
"self-registration can only ever produce a student account" guarantee
enforced in application code we control, rather than in Keycloak
realm settings alone.

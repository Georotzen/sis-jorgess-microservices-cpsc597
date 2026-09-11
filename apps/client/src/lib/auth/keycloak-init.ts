// keycloak-init.ts
'use client';

import Keycloak from 'keycloak-js';
import { useAuthStore } from '@/store/auth';

let keycloak: Keycloak | null = null;
let initialized = false;
//let initPromise: Promise<boolean> | null = null;

export function getKeycloak() {
  if (!keycloak) {
    keycloak = new Keycloak({
      url: process.env.NEXT_PUBLIC_KEYCLOAK_URL!,
      realm: process.env.NEXT_PUBLIC_KEYCLOAK_REALM!,
      clientId: process.env.NEXT_PUBLIC_KEYCLOAK_CLIENT_ID!,
    });
  }
  return keycloak;
}
/* Updating the initialization logic to ensure it only runs once and returns a promise that resolves when initialization is complete. */
export async function initKeycloak(): Promise<Keycloak> {
  if (initialized) {
        console.log("🔥 initKeycloak() CALLED");
    return getKeycloak();

  }

  const kc = getKeycloak();

  const authenticated = await kc.init({
    onLoad: 'login-required',
    checkLoginIframe: false,
    pkceMethod: 'S256',
    silentCheckSsoRedirectUri:
      typeof window !== 'undefined'
        ? `${window.location.origin}/silent-check-sso.html`
        : undefined,
  });

  if (!authenticated) {
    console.error('[Keycloak] User is not authenticated');
    return kc;
  }

/*
export function initKeycloak() {
  const kc = getKeycloak();

  // Prevent double initialization (Strict Mode safe)
  if (!initPromise) {
    initPromise = kc.init({
      onLoad: 'login-required',
      checkLoginIframe: false,
      pkceMethod: 'S256',
    });
  }

  return initPromise;
}
*/
  // Store token
  useAuthStore.getState().setToken(kc.token || null);

  // Fetch user profile
  try {
    const profile = await kc.loadUserProfile();
    useAuthStore.getState().setUser({
      id: profile.id!,
      email: profile.email!,
      name: profile.firstName + ' ' + profile.lastName,
      role: kc.realmAccess?.roles?.[0] ?? 'user',
    });
  } catch (err) {
    console.error('[Keycloak] Failed to load user profile:', err);
  }

  // Handle token refresh
  kc.onTokenExpired = async () => {
    try {
      const refreshed = await kc.updateToken(30);
      if (refreshed) {
        console.log('[Keycloak] Token refreshed');
        useAuthStore.getState().setToken(kc.token || null);
      } else {
        console.warn('[Keycloak] Token not refreshed, user may be logged out soon');
      }
    } catch (err) {
      console.error('[Keycloak] Token refresh failed:', err);
    }
  };

  initialized = true;
  return kc;
}


import { createRemoteJWKSet, jwtVerify } from 'jose';
import { getWeb3AuthClientId } from './web3auth-config';

const WEB3AUTH_JWKS_URL = 'https://api-auth.web3auth.io/jwks';
const WEB3AUTH_ISSUER = 'https://api-auth.web3auth.io';

let jwks: ReturnType<typeof createRemoteJWKSet> | null = null;

function getJwks() {
  if (!jwks) jwks = createRemoteJWKSet(new URL(WEB3AUTH_JWKS_URL));
  return jwks;
}

export async function verifyWeb3AuthIdToken(idToken: string) {
  const token = String(idToken || '').trim();
  if (!token) throw new Error('idToken required');

  const clientId = getWeb3AuthClientId();
  const { payload } = await jwtVerify(token, getJwks(), {
    issuer: WEB3AUTH_ISSUER,
    audience: clientId,
  });
  return payload;
}

export function identityFromWeb3AuthClaims(claims: Record<string, unknown>) {
  const verifierId = String(claims.userId || claims.sub || '').trim();
  if (!verifierId) throw new Error('Token missing userId');

  const grouped = String(claims.groupedAuthConnectionId || '').toLowerCase();
  let typeOfLogin = String(claims.authConnection || '').trim() || 'unknown';
  if (grouped.includes('google')) typeOfLogin = 'google';
  else if (grouped.includes('email')) typeOfLogin = 'email_passwordless';

  return {
    verifierId,
    typeOfLogin,
    email: claims.email ? String(claims.email).trim().toLowerCase() : null,
    name: claims.name ? String(claims.name).trim() : null,
    profileImage: claims.profileImage ? String(claims.profileImage).trim() : null,
  };
}

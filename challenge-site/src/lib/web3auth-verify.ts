import { createRemoteJWKSet, jwtVerify } from 'jose';

const WEB3AUTH_JWKS_URL = 'https://api-auth.web3auth.io/jwks';
const WEB3AUTH_ISSUER = 'https://api-auth.web3auth.io';

const DEFAULT_DEVNET_CLIENT_ID =
  'BKvRj4akAwrNHHk4UyYCC4zt9KWigdiuosCX5-idVNclsk9hPPQ4_b8grcl0JF4NhT26oLWb3O5K949SVv6lTGk';

let jwks: ReturnType<typeof createRemoteJWKSet> | null = null;

function web3authClientId() {
  const useMainnet = ['1', 'true', 'yes', 'on'].includes(
    String(process.env.WEB3AUTH_USE_MAINNET || '').trim().toLowerCase(),
  );
  const mainnetId = String(process.env.WEB3AUTH_CLIENT_ID || '').trim();
  if (useMainnet && mainnetId) return mainnetId;
  return String(process.env.WEB3AUTH_CLIENT_ID_DEVNET || DEFAULT_DEVNET_CLIENT_ID).trim();
}

function getJwks() {
  if (!jwks) jwks = createRemoteJWKSet(new URL(WEB3AUTH_JWKS_URL));
  return jwks;
}

export async function verifyWeb3AuthIdToken(idToken: string) {
  const token = String(idToken || '').trim();
  if (!token) throw new Error('idToken required');

  const clientId = web3authClientId();
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

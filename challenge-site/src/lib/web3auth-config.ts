/**
 * Web3Auth Sapphire Devnet client ID for this deployment. There is no default:
 * production and staging use different client IDs, and a built-in fallback once
 * let staging run on production's ID without anyone noticing. Set
 * WEB3AUTH_CLIENT_ID_DEVNET at runtime (the PM2 ecosystem configs set it).
 */
export function getWeb3AuthClientId(): string {
  const clientId = String(process.env.WEB3AUTH_CLIENT_ID_DEVNET || '').trim();
  if (!clientId) {
    throw new Error(
      'WEB3AUTH_CLIENT_ID_DEVNET is not set. Web3Auth sign-in is disabled until it is set '
        + '(production and staging each need their own client ID; see ecosystem*.config.js).',
    );
  }
  return clientId;
}

/** Devnet only by design: Web3Auth sapphire_mainnet is a paid plan we do not hold. */
export function getWeb3AuthPublicConfig() {
  return {
    clientId: getWeb3AuthClientId(),
    web3AuthNetwork: 'sapphire_devnet',
    googleVerifier: 'web3auth-google-sapphire-devnet',
  };
}

export function getGovHubBaseUrl() {
  return String(process.env.GOVHUB_BASE_URL || 'https://interfacehub.net').replace(/\/$/, '');
}

/** Server-side Gov Hub proxy — prefer loopback to avoid nginx HTML 502 pages. */
export function getGovHubProxyBaseUrl() {
  const explicit = String(process.env.GOVHUB_INTERNAL_BASE_URL || '').trim();
  if (explicit) return explicit.replace(/\/$/, '');
  if (process.env.NODE_ENV === 'production') {
    return 'http://127.0.0.1:8000';
  }
  return getGovHubBaseUrl();
}

export function getHermesChatUrl() {
  return String(process.env.HERMES_CHAT_URL || 'http://127.0.0.1:8790').replace(/\/$/, '');
}

export function getHermesChatSecret() {
  return process.env.HERMES_CHAT_SECRET || process.env.METAWEB_OPS_SECRET || '';
}

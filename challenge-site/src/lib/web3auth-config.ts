const DEFAULT_DEVNET_CLIENT_ID =
  'BKvRj4akAwrNHHk4UyYCC4zt9KWigdiuosCX5-idVNclsk9hPPQ4_b8grcl0JF4NhT26oLWb3O5K949SVv6lTGk';

export function getWeb3AuthPublicConfig() {
  const useMainnet = ['1', 'true', 'yes', 'on'].includes(
    String(process.env.WEB3AUTH_USE_MAINNET || '').trim().toLowerCase(),
  );
  const mainnetId = String(process.env.WEB3AUTH_CLIENT_ID || '').trim();
  const devnetId = String(process.env.WEB3AUTH_CLIENT_ID_DEVNET || DEFAULT_DEVNET_CLIENT_ID).trim();

  if (useMainnet && mainnetId) {
    return {
      clientId: mainnetId,
      web3AuthNetwork: 'sapphire_mainnet',
      googleVerifier: 'web3auth-google-sapphire',
    };
  }

  return {
    clientId: devnetId,
    web3AuthNetwork: 'sapphire_devnet',
    googleVerifier: 'web3auth-google-sapphire-devnet',
  };
}

export function getGovHubBaseUrl() {
  return String(process.env.GOVHUB_BASE_URL || 'https://hub.themetalayer.org').replace(/\/$/, '');
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

'use client';

import type { AuthUser } from '@/lib/auth-types';

declare global {
  interface Window {
    __WEB3AUTH_PUBLIC_CONFIG__?: {
      clientId: string;
      web3AuthNetwork: string;
      googleVerifier: string;
    };
    Modal?: {
      Web3Auth: new (config: Record<string, unknown>) => Web3AuthInstance;
      WALLET_CONNECTORS?: { AUTH: string; METAMASK?: string; WALLET_CONNECT?: string; WALLET_CONNECT_V2?: string };
    };
    Web3?: new (provider: unknown) => {
      eth: { getAccounts: () => Promise<string[]> };
    };
  }
}

type Web3AuthInstance = {
  init: () => Promise<void>;
  connect: () => Promise<unknown>;
  connectTo: (connector: string, opts?: Record<string, unknown>) => Promise<unknown>;
  getUserInfo: () => Promise<Record<string, unknown>>;
  getIdentityToken: () => Promise<{ idToken?: string }>;
  logout: (opts?: { cleanup?: boolean }) => Promise<void>;
  closeModal?: () => void;
  connected?: boolean;
};

export type Web3AuthLoginMode = 'google' | 'email' | 'default';

type Web3AuthPublicConfig = {
  clientId: string;
  web3AuthNetwork: string;
  googleVerifier: string;
};

let web3auth: Web3AuthInstance | null = null;
let web3authInitPromise: Promise<Web3AuthInstance> | null = null;
let loginInProgress = false;

function clearWeb3AuthStorage() {
  if (typeof window === 'undefined') return;
  try {
    for (const key of Object.keys(localStorage)) {
      if (/web3auth|openlogin|torus|w3a/i.test(key)) {
        localStorage.removeItem(key);
      }
    }
  } catch {
    // ignore
  }
}

function validatePublicConfig(cfg: Partial<Web3AuthPublicConfig>): Web3AuthPublicConfig {
  const clientId = String(cfg.clientId || '').trim();
  const web3AuthNetwork = String(cfg.web3AuthNetwork || '').trim();
  const googleVerifier = String(cfg.googleVerifier || '').trim();
  if (!clientId) {
    throw new Error('Web3Auth clientId is not configured');
  }
  if (!web3AuthNetwork) {
    throw new Error('Web3Auth network is not configured');
  }
  if (!googleVerifier) {
    throw new Error('Web3Auth Google verifier is not configured');
  }
  return { clientId, web3AuthNetwork, googleVerifier };
}

async function loadPublicConfig(): Promise<Web3AuthPublicConfig> {
  if (typeof window !== 'undefined' && window.__WEB3AUTH_PUBLIC_CONFIG__) {
    return validatePublicConfig(window.__WEB3AUTH_PUBLIC_CONFIG__);
  }

  const cfgRes = await fetch('/api/auth/web3auth/config');
  if (!cfgRes.ok) throw new Error('Web3Auth config unavailable');
  const cfg = await cfgRes.json();
  return validatePublicConfig(cfg);
}

function loadScript(src: string) {
  return new Promise<void>((resolve, reject) => {
    if (document.querySelector(`script[src="${src}"]`)) {
      resolve();
      return;
    }
    const script = document.createElement('script');
    script.src = src;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error(`Failed to load ${src}`));
    document.head.appendChild(script);
  });
}

/** Gov Hub ghShouldUseSocialLoginOnly – DP site uses Google/email only (no wallet discovery). */
function useSocialLoginOnly() {
  return true;
}

function ensureApexDomain() {
  if (typeof window === 'undefined') return;
  if (window.location.hostname !== 'www.desirableproperties.org') return;
  window.location.replace(
    `https://desirableproperties.org${window.location.pathname}${window.location.search}${window.location.hash}`,
  );
}

function modalConfig() {
  const WC = window.Modal?.WALLET_CONNECTORS;
  if (!WC) return { hideWalletDiscovery: true };
  const authId = WC.AUTH || 'auth';
  const connectors: Record<string, unknown> = {
    [authId]: {
      label: 'social',
      showOnModal: true,
      loginMethods: {
        google: { name: 'Google', showOnModal: true },
        twitter: { showOnModal: false },
        email_passwordless: { showOnModal: true },
      },
    },
  };
  [WC.METAMASK, WC.WALLET_CONNECT, WC.WALLET_CONNECT_V2].forEach((key) => {
    if (key) connectors[key] = { showOnModal: false };
  });
  return { hideWalletDiscovery: true, connectors };
}

function loginMethodsOrder() {
  if (useSocialLoginOnly()) {
    return ['google', 'email_passwordless'];
  }
  return ['google', 'twitter', 'email_passwordless', 'wallet'];
}

/** Remove Web3Auth / wallet modal DOM when staying on-page (Gov Hub navigates away; we must dismiss). */
export function dismissWeb3AuthModal(instance?: Web3AuthInstance | null) {
  try {
    instance?.closeModal?.();
  } catch {
    // ignore
  }
  if (typeof document === 'undefined') return;
  const selectors = [
    '#w3a-modal',
    '#w3a-modal-container',
    '.w3a-modal',
    '.w3a-modal__overlay',
    '[id^="w3a-"]',
    '[class*="w3a-modal"]',
  ];
  selectors.forEach((sel) => {
    document.querySelectorAll(sel).forEach((el) => {
      el.remove();
    });
  });
  document.body.style.overflow = '';
  document.documentElement.style.overflow = '';
}

async function createWeb3AuthInstance(cfg: Web3AuthPublicConfig) {
  await loadScript('https://cdn.jsdelivr.net/npm/web3@1.10.0/dist/web3.min.js');
  await loadScript('https://unpkg.com/@web3auth/modal@10.13.1/dist/modal.umd.min.js');

  await new Promise<void>((resolve, reject) => {
    const start = Date.now();
    const tick = () => {
      if (window.Modal?.Web3Auth) resolve();
      else if (Date.now() - start > 10000) reject(new Error('Web3Auth load timeout'));
      else setTimeout(tick, 100);
    };
    tick();
  });

  const Web3Auth = window.Modal!.Web3Auth;
  const instance = new Web3Auth({
    clientId: cfg.clientId,
    web3AuthNetwork: cfg.web3AuthNetwork,
    chainConfig: {
      chainNamespace: 'eip155',
      chainId: '0x1',
      rpcTarget: 'https://rpc.ankr.com/eth',
      displayName: 'Ethereum Mainnet',
      blockExplorerUrl: 'https://etherscan.io',
      ticker: 'ETH',
      tickerName: 'Ethereum',
    },
    uiConfig: {
      mode: 'dark',
      theme: { primary: '#1d9bf0' },
      loginMethodsOrder: loginMethodsOrder(),
      defaultLanguage: 'en',
    },
    loginConfig: {
      google: {
        verifier: cfg.googleVerifier,
        typeOfLogin: 'google',
        clientId: cfg.clientId,
        extraLoginOptions: { prompt: 'login select_account', access_type: 'offline' },
        queryParameters: { prompt: 'login select_account', access_type: 'offline' },
      },
    },
    modalConfig: modalConfig(),
  });

  await instance.init();
  return instance;
}

async function initWeb3Auth() {
  ensureApexDomain();
  if (web3auth) return web3auth;
  if (web3authInitPromise) return web3authInitPromise;

  web3authInitPromise = (async () => {
    const cfg = await loadPublicConfig();
    let instance: Web3AuthInstance;
    try {
      instance = await createWeb3AuthInstance(cfg);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (!/clientId|web3authNetwork|project configurations/i.test(message)) {
        throw error;
      }
      clearWeb3AuthStorage();
      web3auth = null;
      instance = await createWeb3AuthInstance(cfg);
    }

    try {
      const meRes = await fetch('/api/auth/me', { credentials: 'include' });
      const me = await meRes.json();
      if (instance.connected && !me.authenticated) {
        await instance.logout({ cleanup: true });
        dismissWeb3AuthModal(instance);
      }
    } catch {
      if (instance.connected) {
        try {
          await instance.logout({ cleanup: true });
        } catch {
          // ignore
        }
        dismissWeb3AuthModal(instance);
      }
    }

    web3auth = instance;
    return instance;
  })().catch((error) => {
    web3authInitPromise = null;
    web3auth = null;
    throw error;
  });

  return web3authInitPromise;
}

/** Pre-load Web3Auth on page load. */
export function warmupWeb3Auth() {
  if (typeof window === 'undefined') return;
  void initWeb3Auth().catch(() => {
    // Non-fatal – user can retry on Sign In
  });
}

/**
 * Gov Hub connectWeb3AuthProvider – default path uses connect() (in-page modal).
 * connectTo('google') opens OAuth in a popup; Safari blocks that unless the site
 * is on the popup allowlist, and async init before connect breaks the user gesture.
 */
async function connectWeb3AuthProvider(
  instance: Web3AuthInstance,
  mode: Web3AuthLoginMode,
  emailHint?: string,
) {
  const WC = window.Modal?.WALLET_CONNECTORS;
  const authConnector = WC?.AUTH || 'auth';

  if (mode === 'email' && WC) {
    const hint = (emailHint || '').trim().toLowerCase();
    if (!hint || !hint.includes('@')) {
      throw new Error('Enter a valid email address to continue.');
    }
    return instance.connectTo(authConnector, {
      authConnection: 'email_passwordless',
      extraLoginOptions: { login_hint: hint },
      loginHint: hint,
    });
  }

  return instance.connect();
}

async function connectWeb3AuthProviderWithRetry(
  instance: Web3AuthInstance,
  mode: Web3AuthLoginMode,
  emailHint?: string,
) {
  let lastError: unknown;
  for (let attempt = 0; attempt < 4; attempt++) {
    try {
      if (attempt > 0) {
        await new Promise((resolve) => setTimeout(resolve, 350 * attempt));
      }
      return await connectWeb3AuthProvider(instance, mode, emailHint);
    } catch (error) {
      lastError = error;
      const message = error instanceof Error ? error.message : String(error);
      if (/user closed|closed popup|user rejected/i.test(message)) {
        throw error;
      }
      if (!/not ready|connector is not ready|clientId|project configurations/i.test(message)) {
        throw error;
      }
    }
  }
  throw lastError instanceof Error ? lastError : new Error('Web3Auth connect failed');
}

async function resolveEvmAddress(provider: unknown): Promise<string> {
  try {
    if (!provider || !window.Web3) return '';
    const web3 = new window.Web3(provider);
    await new Promise((resolve) => setTimeout(resolve, 500));
    const accounts = await web3.eth.getAccounts();
    return accounts?.[0] || '';
  } catch {
    return '';
  }
}

async function resolveIdentityToken(instance: Web3AuthInstance): Promise<string> {
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      if (attempt > 0) {
        await new Promise((resolve) => setTimeout(resolve, 400 * attempt));
      }
      const identity = await instance.getIdentityToken();
      const idToken = identity?.idToken || '';
      if (idToken) return idToken;
    } catch {
      // retry
    }
  }
  return '';
}

async function finishServerSession(instance: Web3AuthInstance, idToken: string, evmAddress: string) {
  const res = await fetch('/api/auth/web3auth', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ idToken, evmAddress }),
  });
  const data = await res.json();
  if (!res.ok) {
    try {
      await instance.logout({ cleanup: true });
    } catch {
      // ignore
    }
    dismissWeb3AuthModal(instance);
    throw new Error(data.error || 'Sign-in failed');
  }

  const meRes = await fetch('/api/auth/me', { credentials: 'include' });
  if (!meRes.ok) {
    dismissWeb3AuthModal(instance);
    throw new Error('Sign-in succeeded but session was not saved. Try again.');
  }
  const me = await meRes.json();
  if (!me.authenticated || !me.user) {
    dismissWeb3AuthModal(instance);
    throw new Error('Sign-in succeeded but session was not saved. Try again.');
  }

  dismissWeb3AuthModal(instance);
  return me.user as AuthUser;
}

export async function loginWithWeb3Auth(mode: Web3AuthLoginMode = 'default'): Promise<AuthUser> {
  if (loginInProgress) {
    throw new Error('Sign-in already in progress');
  }

  loginInProgress = true;
  let instance: Web3AuthInstance | null = null;
  try {
    instance = await initWeb3Auth();
    const provider = await connectWeb3AuthProviderWithRetry(instance, mode);
    dismissWeb3AuthModal(instance);

    const idToken = await resolveIdentityToken(instance);
    if (!idToken) {
      dismissWeb3AuthModal(instance);
      throw new Error('Sign-in verification failed: no identity token');
    }

    const evmAddress = await resolveEvmAddress(provider);
    return await finishServerSession(instance, idToken, evmAddress);
  } catch (error) {
    dismissWeb3AuthModal(instance);
    const message = error instanceof Error ? error.message : 'Sign-in failed';
    if (!/user closed|closed popup|user rejected/i.test(message)) {
      throw error instanceof Error ? error : new Error(message);
    }
    throw error;
  } finally {
    loginInProgress = false;
    dismissWeb3AuthModal(instance);
  }
}

export function loginWithGoogle() {
  return loginWithWeb3Auth('default');
}

export function loginWithEmail(email: string) {
  if (!email?.includes('@')) {
    return Promise.reject(new Error('Enter a valid email address to continue.'));
  }
  return (async () => {
    if (loginInProgress) throw new Error('Sign-in already in progress');
    loginInProgress = true;
    let instance: Web3AuthInstance | null = null;
    try {
      instance = await initWeb3Auth();
      const provider = await connectWeb3AuthProviderWithRetry(instance, 'email', email);
      dismissWeb3AuthModal(instance);
      const idToken = await resolveIdentityToken(instance);
      if (!idToken) throw new Error('Sign-in verification failed: no identity token');
      const evmAddress = await resolveEvmAddress(provider);
      return await finishServerSession(instance, idToken, evmAddress);
    } finally {
      loginInProgress = false;
      dismissWeb3AuthModal(instance);
    }
  })();
}

/**
 * Refresh the encrypted site session cookie with a fresh Web3Auth idToken.
 * Required before Canopi publish/stage — the stored idToken expires ~1h while
 * the session cookie can last 24h.
 */
export async function refreshSessionIdToken(): Promise<boolean> {
  try {
    const instance = await initWeb3Auth();
    if (!instance.connected) return false;

    const idToken = await resolveIdentityToken(instance);
    if (!idToken) return false;

    const res = await fetch('/api/auth/web3auth', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ idToken, evmAddress: '' }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

export async function logoutWeb3Auth() {
  dismissWeb3AuthModal(web3auth);
  if (web3auth) {
    try {
      await web3auth.logout({ cleanup: true });
    } catch {
      // ignore
    }
    web3auth = null;
    web3authInitPromise = null;
  }
  dismissWeb3AuthModal();
  await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' });
}

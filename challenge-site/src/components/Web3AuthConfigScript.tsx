import { getWeb3AuthPublicConfig } from '@/lib/web3auth-config';

/** Inline Web3Auth public config (same pattern as Gov Hub embedding clientId in HTML). */
export default function Web3AuthConfigScript() {
  let cfg: ReturnType<typeof getWeb3AuthPublicConfig>;
  try {
    cfg = getWeb3AuthPublicConfig();
  } catch (err) {
    // This renders in the root layout. A missing client ID must break sign-in loudly,
    // not every page: log it here and leave the config unset, so the client falls back
    // to /api/auth/web3auth/config, which returns the same error as a 500.
    const message = err instanceof Error ? err.message : String(err);
    console.error(`[web3auth] ${message}`);
    return (
      <script
        dangerouslySetInnerHTML={{
          __html: `console.error(${JSON.stringify(`[web3auth] ${message}`)});`,
        }}
      />
    );
  }
  return (
    <script
      dangerouslySetInnerHTML={{
        __html: `window.__WEB3AUTH_PUBLIC_CONFIG__=${JSON.stringify(cfg)};`,
      }}
    />
  );
}

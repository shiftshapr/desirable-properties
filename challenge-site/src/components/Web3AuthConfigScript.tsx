import { getWeb3AuthPublicConfig } from '@/lib/web3auth-config';

/** Inline Web3Auth public config (same pattern as Gov Hub embedding clientId in HTML). */
export default function Web3AuthConfigScript() {
  const cfg = getWeb3AuthPublicConfig();
  return (
    <script
      dangerouslySetInnerHTML={{
        __html: `window.__WEB3AUTH_PUBLIC_CONFIG__=${JSON.stringify(cfg)};`,
      }}
    />
  );
}

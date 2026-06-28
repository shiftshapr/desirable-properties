import { inscriptionUrl } from '@/lib/dpProvenance';

type OrdinalLinkProps = {
  inscriptionId: string;
  className?: string;
};

export default function OrdinalLink({ inscriptionId, className = '' }: OrdinalLinkProps) {
  const href = inscriptionUrl(inscriptionId);
  if (!href) return null;

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      title={inscriptionId}
      className={`font-mono text-xs text-slate-500 hover:text-cyan-300 break-all ${className}`}
    >
      {inscriptionId}
    </a>
  );
}

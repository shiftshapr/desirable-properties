import Image from 'next/image';
import { PEARL_AGENT_DROP_IMAGE } from '@/lib/dp-series-badges';

type Props = {
  size?: number;
  className?: string;
};

/** Small Pearl agent-drop avatar for inline PEARL mentions. */
export default function PearlMark({ size = 20, className = '' }: Props) {
  return (
    <span
      className={`relative inline-block shrink-0 align-middle ${className}`}
      style={{ width: size, height: size }}
      aria-hidden="true"
    >
      <Image
        src={PEARL_AGENT_DROP_IMAGE}
        alt=""
        fill
        className="rounded-full object-cover ring-1 ring-violet-400/40"
        sizes={`${size}px`}
      />
    </span>
  );
}

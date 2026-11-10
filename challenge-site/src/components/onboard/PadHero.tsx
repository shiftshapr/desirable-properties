import Image from 'next/image';

const HERO_SRC = '/media/be-part-of-1.0-hero.png';
const HERO_ALT =
  'Be part of 1.0 – Desirable Properties Studio. V1.0 releases Friday, November 13, 2026, 10–11 AM PT.';

export default function PadHero() {
  return (
    <figure className="w-full overflow-hidden border-b border-slate-800 bg-slate-950">
      <Image
        src={HERO_SRC}
        alt={HERO_ALT}
        width={1535}
        height={1024}
        className="h-auto w-full object-cover"
        priority
        sizes="100vw"
      />
    </figure>
  );
}

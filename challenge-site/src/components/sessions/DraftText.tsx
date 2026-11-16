import { Fragment, type ReactNode } from 'react';
import { parseClock, turnAt, type MetaGovTurn } from '@/lib/meta-governance-2026-11-16-event';

/**
 * Renders digest text (a small Markdown subset) on the server: `**[+ inserted]**`, `~~deleted~~`, `**bold**`,
 * `*italic*`, "00:06:37" timestamps (linked to the transcript turn they fall in), and bare URLs. Block level:
 * `##`/`###` headings, `- ` lists, `|` tables and paragraphs. No HTML from the source is passed through.
 */

const linkClass = 'text-cyan-300 hover:text-cyan-200';

const INLINE = /(\*\*\[\+ [\s\S]+?\]\*\*|~~[\s\S]+?~~|\*\*[\s\S]+?\*\*|\*[^*\s][^*]*?\*|\b\d{2}:\d{2}:\d{2}\b|https?:\/\/[^\s)]+[^\s).,;])/;

export function Inline({ text, turns }: { text: string; turns: MetaGovTurn[] }): ReactNode {
  const parts = text.split(INLINE);
  return parts.map((part, i) => {
    if (i % 2 === 0) return part ? <Fragment key={i}>{part}</Fragment> : null;
    if (part.startsWith('**[+ ')) {
      return (
        <ins key={i} className="rounded bg-emerald-500/15 px-0.5 text-emerald-200 no-underline" title="Suggested insertion">
          <span className="sr-only">[inserted: </span>
          <Inline text={part.slice(5, -3)} turns={turns} />
          <span className="sr-only">]</span>
        </ins>
      );
    }
    if (part.startsWith('~~')) {
      return (
        <del key={i} className="rounded bg-rose-500/10 px-0.5 text-rose-300/90" title="Suggested deletion">
          <span className="sr-only">[deleted: </span>
          <Inline text={part.slice(2, -2)} turns={turns} />
          <span className="sr-only">]</span>
        </del>
      );
    }
    if (part.startsWith('**')) return <strong key={i} className="text-white"><Inline text={part.slice(2, -2)} turns={turns} /></strong>;
    if (part.startsWith('*')) return <em key={i}><Inline text={part.slice(1, -1)} turns={turns} /></em>;
    if (/^\d{2}:/.test(part)) {
      const turn = turnAt(turns, parseClock(part));
      return turn ? (
        <a key={i} href={`#${turn.id}`} className={`font-mono text-[0.9em] tabular-nums ${linkClass}`}>
          {part}
        </a>
      ) : (
        part
      );
    }
    return (
      <a key={i} href={part} className={`break-words ${linkClass}`} rel="noopener noreferrer">
        {part}
      </a>
    );
  });
}

function cells(line: string): string[] {
  return line.trim().replace(/^\||\|$/g, '').split('|').map((c) => c.trim());
}

export function Blocks({ text, turns }: { text: string; turns: MetaGovTurn[] }) {
  const lines = text.split('\n');
  const out: ReactNode[] = [];
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    if (!line.trim() || line.trim() === '---') {
      i++;
    } else if (line.startsWith('### ') || line.startsWith('## ')) {
      const h3 = line.startsWith('## ');
      const Tag = h3 ? 'h4' : 'h5';
      out.push(
        <Tag key={i} className={h3 ? 'pt-3 text-lg font-semibold text-white' : 'pt-1 text-base font-semibold text-white'}>
          <Inline text={line.replace(/^#+ /, '')} turns={turns} />
        </Tag>,
      );
      i++;
    } else if (line.startsWith('- ')) {
      const items: string[] = [];
      while (i < lines.length && lines[i].startsWith('- ')) items.push(lines[i++].slice(2));
      out.push(
        <ul key={i} className="list-disc space-y-1.5 pl-5">
          {items.map((it, k) => (
            <li key={k}><Inline text={it} turns={turns} /></li>
          ))}
        </ul>,
      );
    } else if (line.startsWith('|')) {
      const rows: string[][] = [];
      while (i < lines.length && lines[i].startsWith('|')) {
        if (!/^\|[\s|:-]+\|$/.test(lines[i].trim())) rows.push(cells(lines[i]));
        i++;
      }
      const [head, ...body] = rows;
      out.push(
        <div key={i} className="overflow-x-auto">
          <table className="w-full min-w-[32rem] border-collapse text-left text-sm">
            <thead>
              <tr>{head.map((c, k) => <th key={k} className="border-b border-slate-700 px-2 py-1.5 font-semibold text-slate-100"><Inline text={c} turns={turns} /></th>)}</tr>
            </thead>
            <tbody>
              {body.map((r, k) => (
                <tr key={k}>{r.map((c, j) => <td key={j} className="border-b border-slate-800 px-2 py-1.5 align-top"><Inline text={c} turns={turns} /></td>)}</tr>
              ))}
            </tbody>
          </table>
        </div>,
      );
    } else {
      const para: string[] = [];
      while (i < lines.length && lines[i].trim() && !/^(- |\||#{2,3} )/.test(lines[i])) para.push(lines[i++]);
      out.push(<p key={i}><Inline text={para.join(' ')} turns={turns} /></p>);
    }
  }
  return <div className="space-y-3">{out}</div>;
}

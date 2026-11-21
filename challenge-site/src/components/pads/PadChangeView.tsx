import type { ReactNode } from 'react';
import { buildDiffOps } from '@/lib/textDiff';
import type { PadChange } from '@/lib/pads/proposal-pad-core';

/** A chapter block as plain text: Markdown markers dropped, headings bold. Highlights are passed as children. */
function Block({ children, heading, dim }: { children: ReactNode; heading?: boolean; dim?: boolean }) {
  return (
    <div
      className={`whitespace-pre-wrap break-words text-[15px] leading-relaxed ${heading ? 'font-semibold text-white' : dim ? 'text-slate-500' : 'text-slate-200'}`}
    >
      {children}
    </div>
  );
}

function clean(text: string): string {
  return String(text || '')
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/^\s*-{3,}\s*$/gm, '')
    .replace(/\*\*|__/g, '')
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/!\[[^\]]*\]\([^)]*\)/g, '')
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    .trim();
}

const isHeading = (t: string) => /^#{1,6}\s/.test(String(t || '').trim());

function trimEnd(text: string, max = 320): string {
  const t = clean(text);
  return t.length > max ? `…${t.slice(t.length - max)}` : t;
}

function trimStart(text: string, max = 320): string {
  const t = clean(text);
  return t.length > max ? `${t.slice(0, max)}…` : t;
}

const Old = ({ children }: { children: ReactNode }) => (
  <mark className="rounded bg-amber-400/20 px-0.5 text-amber-50 ring-1 ring-amber-400/40">{children}</mark>
);
const New = ({ children }: { children: ReactNode }) => (
  <ins className="rounded bg-emerald-400/15 px-0.5 text-emerald-50 no-underline ring-1 ring-emerald-400/40">{children}</ins>
);

function Panel({ label, tone, children }: { label: string; tone: 'before' | 'after'; children: ReactNode }) {
  return (
    <div
      className={`min-w-0 rounded-lg border p-3 sm:p-4 ${tone === 'before' ? 'border-amber-800/50 bg-amber-950/10' : 'border-emerald-800/50 bg-emerald-950/10'}`}
    >
      <p className={`mb-2 text-xs font-semibold uppercase tracking-wide ${tone === 'before' ? 'text-amber-300' : 'text-emerald-300'}`}>
        {label}
      </p>
      <div className="space-y-3">{children}</div>
    </div>
  );
}

function WordDiff({ original, proposed }: { original: string; proposed: string }) {
  const ops = buildDiffOps(clean(original), clean(proposed));
  if (ops.length > 600) return null;
  return (
    <div className="whitespace-pre-wrap break-words rounded-lg border border-slate-800 bg-slate-950/60 p-3 text-[15px] leading-relaxed text-slate-300">
      {ops.map((op, i) =>
        op.type === 'equal' ? (
          <span key={i}>{op.text}</span>
        ) : op.type === 'del' ? (
          <del key={i} className="text-rose-300 decoration-rose-400/70">{op.text}</del>
        ) : (
          <ins key={i} className="text-emerald-200 no-underline underline-offset-2 [text-decoration-line:underline] decoration-emerald-400/70">{op.text}</ins>
        ),
      )}
    </div>
  );
}

export function AnchorMissing({ hint }: { hint?: string | null }) {
  return (
    <div className="rounded-lg border border-rose-700/60 bg-rose-950/30 p-3 text-sm text-rose-100">
      <p className="font-semibold">Passage no longer in the chapter: needs re-anchoring</p>
      <p className="mt-1 text-rose-200/80">
        The text this proposal points at is not in the current chapter, so it cannot be applied as filed. A co-editor
        can revise it onto the passage it belongs to, or decline it.
        {hint ? ` Gov Hub: ${hint}` : ''}
      </p>
    </div>
  );
}

/** One change, before and after, inside its chapter passage. */
export function ChangeInContext({ change, hint }: { change: PadChange; hint?: string | null }) {
  const loc = change.location;
  const proposed = change.proposed.trim();
  const deletion = !proposed && change.mode === 'replace';

  if (!loc) {
    return (
      <div className="space-y-3">
        <AnchorMissing hint={hint} />
        <div className="grid gap-3 lg:grid-cols-2">
          <Panel label={change.mode === 'replace' ? 'Text it would replace' : 'Passage it was placed next to'} tone="before">
            <Block>
              <Old>{clean(change.original) || '(none)'}</Old>
            </Block>
          </Panel>
          <Panel label={deletion ? 'After: deleted' : 'Proposed text'} tone="after">
            <Block>{deletion ? <span className="text-slate-500">(removed)</span> : <New>{clean(proposed)}</New>}</Block>
          </Panel>
        </div>
      </div>
    );
  }

  const before = (
    <>
      {loc.contextBefore && clean(loc.contextBefore) ? <Block dim>{trimEnd(loc.contextBefore)}</Block> : null}
      {loc.exact ? (
        <Block heading={isHeading(loc.blocks[0])}>
          {clean(loc.exact.pre)}
          <Old>{clean(loc.exact.match)}</Old>
          {clean(loc.exact.post)}
        </Block>
      ) : (
        loc.blocks.map((b, i) => (
          <Block key={i} heading={isHeading(b)}>
            <Old>{clean(b)}</Old>
          </Block>
        ))
      )}
      {loc.contextAfter && clean(loc.contextAfter) ? <Block dim>{trimStart(loc.contextAfter)}</Block> : null}
    </>
  );

  const passage = loc.exact ? (
    <Block heading={isHeading(loc.blocks[0])}>{clean(loc.blocks[0])}</Block>
  ) : (
    loc.blocks.map((b, i) => (
      <Block key={i} heading={isHeading(b)}>
        {clean(b)}
      </Block>
    ))
  );
  const inserted = (
    <>
      {proposed
        .split(/\n\s*\n/)
        .filter((para) => clean(para))
        .map((para, i) => (
          <Block key={i} heading={isHeading(para)}>
            <New>{clean(para)}</New>
          </Block>
        ))}
    </>
  );

  let after: ReactNode;
  if (change.mode === 'insert_before') {
    after = (
      <>
        {loc.contextBefore && clean(loc.contextBefore) ? <Block dim>{trimEnd(loc.contextBefore)}</Block> : null}
        {inserted}
        {passage}
        {loc.contextAfter && clean(loc.contextAfter) ? <Block dim>{trimStart(loc.contextAfter)}</Block> : null}
      </>
    );
  } else if (change.mode === 'insert_after') {
    after = (
      <>
        {loc.contextBefore && clean(loc.contextBefore) ? <Block dim>{trimEnd(loc.contextBefore)}</Block> : null}
        {passage}
        {inserted}
        {loc.contextAfter && clean(loc.contextAfter) ? <Block dim>{trimStart(loc.contextAfter)}</Block> : null}
      </>
    );
  } else {
    after = (
      <>
        {loc.contextBefore && clean(loc.contextBefore) ? <Block dim>{trimEnd(loc.contextBefore)}</Block> : null}
        {deletion ? (
          loc.exact && clean(loc.exact.pre + loc.exact.post) ? (
            <Block heading={isHeading(loc.blocks[0])}>{clean(loc.exact.pre + loc.exact.post)}</Block>
          ) : (
            <Block>
              <span className="text-slate-500">(passage removed)</span>
            </Block>
          )
        ) : loc.exact ? (
          <Block heading={isHeading(loc.blocks[0])}>
            {clean(loc.exact.pre)}
            <New>{clean(proposed)}</New>
            {clean(loc.exact.post)}
          </Block>
        ) : (
          inserted
        )}
        {loc.contextAfter && clean(loc.contextAfter) ? <Block dim>{trimStart(loc.contextAfter)}</Block> : null}
      </>
    );
  }

  return (
    <div className="space-y-3">
      {loc.section ? <p className="text-sm text-slate-400">In {loc.section}</p> : null}
      <div className="grid gap-3 lg:grid-cols-2">
        <Panel label={change.mode === 'replace' ? 'Now in the chapter' : 'Now in the chapter (anchor highlighted)'} tone="before">
          {before}
        </Panel>
        <Panel label="With this proposal" tone="after">
          {after}
        </Panel>
      </div>
      {change.mode === 'replace' && !deletion && change.original.length < 3000 ? (
        <details className="group">
          <summary className="cursor-pointer text-sm text-cyan-300 hover:text-cyan-200">Word by word</summary>
          <div className="mt-2">
            <WordDiff original={change.original} proposed={proposed} />
          </div>
        </details>
      ) : null}
    </div>
  );
}

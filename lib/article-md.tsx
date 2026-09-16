// Minimal markdown → React renderer used by article intro/outro.
//
// Why hand-rolled instead of `marked`/`remark`: we control exactly the
// subset our authors use, output stays React (no dangerouslySetInnerHTML),
// and the bundle stays free of a parser dependency. Covers:
//
//   ## H2 / ### H3        →  <h2> / <h3>
//   paragraph text        →  <p>
//   - item                →  <ul><li>
//   1. item               →  <ol><li>
//   > quoted line         →  <blockquote>   (used for FAQs)
//   **bold** / *italic*   →  <strong> / <em>
//   [text](url)           →  <Link href> for internal /paths, <a> for external
//
// Anything not in this list is rendered as plain text — by design. If a
// content author needs more, extend this file, don't shell out to MDX.

import Link from 'next/link';
import { Fragment, type ReactNode } from 'react';

/** Public so the TOC can derive identical anchor ids without duplicating
 *  the slugification logic. */
export function slugifyHeading(s: string): string {
  // Keep Unicode letters (including Greek). Combining marks are removed via
  // NFD so accented chars match a-style. We deliberately don't transliterate
  // Greek → Latin: the anchor is for in-page navigation, not the URL bar.
  const out = s
    .normalize('NFD').replace(/\p{M}+/gu, '')
    .toLowerCase()
    .replace(/[^\p{Letter}\p{Number}\s-]/gu, '')
    .trim()
    .replace(/\s+/g, '-')
    .slice(0, 80);
  return out || 's';
}

/** Inline parser: handles **bold**, *italic*, and [text](url). */
function renderInline(text: string, keyPrefix: string): ReactNode[] {
  const out: ReactNode[] = [];
  // Tokenize by [text](url), **bold**, *italic* in a single regex; anything
  // else stays as a literal string segment.
  const re = /\[([^\]]+)\]\(([^)]+)\)|\*\*([^*]+)\*\*|\*([^*]+)\*/g;
  let last = 0;
  let i = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) out.push(text.slice(last, m.index));
    const key = `${keyPrefix}-${i++}`;
    if (m[1] && m[2]) {
      const url = m[2];
      const isInternal = url.startsWith('/');
      out.push(
        isInternal
          ? <Link key={key} href={url} className="text-[var(--color-accent-cyan)] underline-offset-2 hover:underline">{m[1]}</Link>
          : <a key={key} href={url} rel="noopener noreferrer" target="_blank" className="text-[var(--color-accent-cyan)] underline-offset-2 hover:underline">{m[1]}</a>,
      );
    } else if (m[3]) {
      out.push(<strong key={key} className="font-semibold text-[var(--color-fg-0)]">{m[3]}</strong>);
    } else if (m[4]) {
      out.push(<em key={key}>{m[4]}</em>);
    }
    last = m.index + m[0].length;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
}

type Block =
  | { kind: 'h2'; text: string }
  | { kind: 'h3'; text: string }
  | { kind: 'p'; text: string }
  | { kind: 'ul'; items: string[] }
  | { kind: 'ol'; items: string[] }
  | { kind: 'quote'; lines: string[] };

function parseBlocks(src: string): Block[] {
  const lines = src.replace(/\r\n/g, '\n').split('\n');
  const blocks: Block[] = [];
  let para: string[] = [];
  let list: { kind: 'ul' | 'ol'; items: string[] } | null = null;
  let quote: string[] | null = null;

  const flushPara = () => { if (para.length) { blocks.push({ kind: 'p', text: para.join(' ') }); para = []; } };
  const flushList = () => { if (list) { blocks.push(list); list = null; } };
  const flushQuote = () => { if (quote) { blocks.push({ kind: 'quote', lines: quote }); quote = null; } };
  const flushAll = () => { flushPara(); flushList(); flushQuote(); };

  for (const raw of lines) {
    const line = raw.trimEnd();
    if (line.trim() === '') { flushAll(); continue; }

    const h2 = /^##\s+(.+)$/.exec(line);
    const h3 = /^###\s+(.+)$/.exec(line);
    const ul = /^-\s+(.+)$/.exec(line);
    const ol = /^\d+\.\s+(.+)$/.exec(line);
    const bq = /^>\s?(.*)$/.exec(line);

    if (h2) { flushAll(); blocks.push({ kind: 'h2', text: h2[1]! }); continue; }
    if (h3) { flushAll(); blocks.push({ kind: 'h3', text: h3[1]! }); continue; }
    if (ul) {
      flushPara(); flushQuote();
      if (!list || list.kind !== 'ul') { flushList(); list = { kind: 'ul', items: [] }; }
      list.items.push(ul[1]!);
      continue;
    }
    if (ol) {
      flushPara(); flushQuote();
      if (!list || list.kind !== 'ol') { flushList(); list = { kind: 'ol', items: [] }; }
      list.items.push(ol[1]!);
      continue;
    }
    if (bq) {
      flushPara(); flushList();
      if (!quote) quote = [];
      quote.push(bq[1] ?? '');
      continue;
    }

    flushList(); flushQuote();
    para.push(line);
  }
  flushAll();
  return blocks;
}

/** Render a markdown source string to React. Caller wraps in its own container. */
export function renderMarkdown(src: string): ReactNode {
  const blocks = parseBlocks(src);
  return (
    <>
      {blocks.map((b, i) => {
        const k = `b${i}`;
        switch (b.kind) {
          case 'h2': {
            const id = slugifyHeading(b.text);
            return (
              <h2 key={k} id={id} className="mt-12 mb-4 font-display text-2xl font-semibold text-[var(--color-fg-0)] md:text-3xl">
                {renderInline(b.text, k)}
              </h2>
            );
          }
          case 'h3': {
            const id = slugifyHeading(b.text);
            return (
              <h3 key={k} id={id} className="mt-8 mb-3 font-display text-lg font-semibold text-[var(--color-fg-0)] md:text-xl">
                {renderInline(b.text, k)}
              </h3>
            );
          }
          case 'p':
            return (
              <p key={k} className="mb-5 leading-relaxed text-base text-[var(--color-fg-1)] md:text-lg">
                {renderInline(b.text, k)}
              </p>
            );
          case 'ul':
            return (
              <ul key={k} className="mb-5 list-disc space-y-2 pl-6 text-base text-[var(--color-fg-1)] md:text-lg">
                {b.items.map((it, j) => (
                  <li key={`${k}-${j}`} className="leading-relaxed">{renderInline(it, `${k}-${j}`)}</li>
                ))}
              </ul>
            );
          case 'ol':
            return (
              <ol key={k} className="mb-5 list-decimal space-y-2 pl-6 text-base text-[var(--color-fg-1)] md:text-lg">
                {b.items.map((it, j) => (
                  <li key={`${k}-${j}`} className="leading-relaxed">{renderInline(it, `${k}-${j}`)}</li>
                ))}
              </ol>
            );
          case 'quote':
            return (
              <blockquote key={k} className="mb-5 border-l-2 border-[var(--color-accent-cyan)] pl-4 text-base italic text-[var(--color-fg-1)] md:text-lg">
                {b.lines.map((line, j) => (
                  <Fragment key={`${k}-${j}`}>
                    {renderInline(line, `${k}-${j}`)}
                    {j < b.lines.length - 1 && <br />}
                  </Fragment>
                ))}
              </blockquote>
            );
        }
      })}
    </>
  );
}

/** Extract the H2 headings (text + slugified id) in order. Used by the
 *  guide page's table-of-contents sidebar. The id matches what
 *  renderMarkdown() puts on the rendered <h2>, so anchor links work
 *  without an extra lookup. */
export function extractH2Headings(src: string): { id: string; label: string }[] {
  const lines = src.replace(/\r\n/g, '\n').split('\n');
  const out: { id: string; label: string }[] = [];
  for (const line of lines) {
    const m = /^##\s+(.+?)\s*$/.exec(line);
    if (!m) continue;
    const text = m[1]!;
    out.push({ id: slugifyHeading(text), label: text });
  }
  return out;
}

/** Split the body markdown at every H2 boundary. Each section keeps its
 *  H2 line as the first element of `content` so the renderer's existing
 *  H2 rule (anchor id + heading style) fires inside the section. Used
 *  by the guide page to interleave verified business cards between
 *  prose sections. */
export function splitBodyByH2(src: string): { id: string; label: string; content: string }[] {
  const lines = src.replace(/\r\n/g, '\n').split('\n');
  const sections: { id: string; label: string; content: string }[] = [];
  let current: { id: string; label: string; lines: string[] } | null = null;
  for (const line of lines) {
    const m = /^##\s+(.+?)\s*$/.exec(line);
    if (m) {
      if (current) {
        sections.push({ id: current.id, label: current.label, content: current.lines.join('\n').trim() });
      }
      const label = m[1]!;
      current = { id: slugifyHeading(label), label, lines: [line] };
    } else if (current) {
      current.lines.push(line);
    }
    // Lines before the first H2 are dropped — the lead is handled by
    // splitLead() in the page render, so the body slot starts at H2.
  }
  if (current) {
    sections.push({ id: current.id, label: current.label, content: current.lines.join('\n').trim() });
  }
  return sections;
}

/** Map a business's section_kind to the matching H2 label using
 *  keyword heuristics (so future cities don't need a per-locale slug
 *  table). Returns true if the card belongs in that section.
 *
 *  IMPORTANT: NFD normalization preserves Greek letters as Greek (it
 *  strips diacritics but doesn't transliterate). So each kind needs
 *  BOTH Latin AND Greek keyword patterns or the el guides match nothing.
 */
export function sectionKindMatchesHeading(kind: string, label: string): boolean {
  const n = label.toLowerCase().normalize('NFD').replace(/\p{M}+/gu, '');
  switch (kind) {
    case 'seafront':
      // EN: seafront / beachfront / promenade / posidonos / beach hotels.
      // EL: παραλιακη / παραθαλασσι(α/ο) / ποσειδωνια (genitive ποσειδωνιων too).
      return /seafront|beachfront|promenade|posidonos|paralia[kn]i|poseidonia|παραλιακ[ηι]|παραθαλασσι|ποσειδων|ποσειδ\b/.test(n);
    case 'casino':
      // EN: casino. EL: καζινο (and possessive καζινου).
      return /casino|kazino|καζινο/.test(n);
    case 'beach':
      // EN: beach bar(s). EL: παραλια / beach bars (we kept the English term in EL copy too).
      return /beach.*bar|bar.*beach|παραλια.*bar|beach.*παραλι/.test(n);
    case 'spa':
      // EN: spa / thermal / wellness. EL: θερμα λουτρα / σπα / wellness (often kept in latin).
      return /\bspa\b|thermal|wellness|θερμα.*λουτρα|σπα|wellness/.test(n);
    case 'seafood':
      // Food vertical. EN: seafood / fish. EL: ψαρ(ι/οταβερν) / θαλασσιν / oyster section.
      return /seafood|\bfish\b|ψαρ|θαλασσιν|oyster/.test(n);
    case 'taverna':
      // Food vertical. EN: tavern / grill / gyro. EL: ταβερν / ψησταρι / σουβλακι.
      return /tavern|grill|gyro|ψησταρ|ταβερν|σουβλακ|γυρο/.test(n);
    case 'modern':
      // Food vertical. EN: bistro / modern / fine dining / wine. EL: μοντερν / bistro / γαστρονομ.
      return /bistro|modern|fine.?dining|gastro|γαστρονομ|μοντερν|wine|κρασ/.test(n);
    default: return false;
  }
}

/** Pull FAQ pairs from the source: any `## Question?` / `### Question?`
 *  whose answer is the following paragraphs up to the next heading.
 *  Quoted-blockquote FAQ format (`> **Q?**` / `> A`) also recognized to
 *  match the MDX guide convention. */
export function extractFaqs(src: string): { q: string; a: string }[] {
  const lines = src.replace(/\r\n/g, '\n').split('\n');
  const out: { q: string; a: string }[] = [];

  // Pattern A: `## …?` / `### …?` headings.
  for (let i = 0; i < lines.length; i++) {
    const m = /^(##|###)\s+(.+[?;])\s*$/.exec(lines[i] ?? '');
    if (!m) continue;
    const q = m[2]!.trim();
    const buf: string[] = [];
    for (let j = i + 1; j < lines.length; j++) {
      const next = lines[j] ?? '';
      if (/^#/.test(next)) break;
      if (/^>\s/.test(next)) break;
      buf.push(next);
    }
    const a = buf.join('\n').trim();
    if (a) out.push({ q, a });
  }

  // Pattern B: `> **Question?**` followed by `> Answer line(s)`.
  let i = 0;
  while (i < lines.length) {
    const qm = /^>\s*\*\*(.+[?;])\*\*\s*$/.exec(lines[i] ?? '');
    if (qm) {
      const q = qm[1]!.trim();
      const buf: string[] = [];
      let j = i + 1;
      while (j < lines.length) {
        const bm = /^>\s?(.*)$/.exec(lines[j] ?? '');
        if (!bm) break;
        buf.push(bm[1] ?? '');
        j++;
      }
      const a = buf.join('\n').trim();
      if (a) out.push({ q, a });
      i = j;
      continue;
    }
    i++;
  }
  return out;
}

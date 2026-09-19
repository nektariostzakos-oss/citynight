// The night dial — the instrument every citynight view opens on.
//
// A 24 hour ring with midnight at the top, hairline ticks, a bronze arc for
// the part of the night that has already passed, a needle at the time in
// Athens, and marks for sunset and sunrise. Inline SVG, no dependency, no
// canvas, no WebGL: the look is the data.
//
// It is a plain function component (no 'use client'), so it renders on the
// server inside a server component and also ships to the client when the
// live wrapper (night-dial-live.tsx) imports it. It never reads the clock:
// the time comes in as `now`, so the server and the client always draw the
// same picture and hydration stays quiet.
//
// Screen readers skip the drawing (aria-hidden) and read `label` instead —
// the same numbers written out in words next to it.
//
// Direction A "Αντικύθηρα", products/citynight/design/tokens.md, 2026-09-17.

import {
  athensClock, hhmm, inWindow, minutesFromISO, moonPhase,
  nightReading, parseHhmm, windowSpan,
} from './night';

export type NightDialSize = 's' | 'm' | 'l';

export type NightDialProps = {
  /** The moment to draw. Pass it in; the dial never reads the clock itself. */
  now: Date;
  /** Today's sunset, local ISO ("2026-09-19T19:34"). Without it the dial
   *  draws the ring and the needle and leaves the night arc out. */
  sunsetISO?: string;
  /** Today's sunrise, local ISO. */
  sunriseISO?: string;
  /** Today's opening windows as "HH:MM", one subject (a venue, a city hall,
   *  a spa). A window that closes after midnight wraps the ring. */
  hours?: { open: string; close: string }[];
  /** Several subjects, each on its own ring at 140, 126 and 112, the way the
   *  prototype's city dial reads its three nearest venues. `hours` is the
   *  one-subject shorthand for `rings: [hours]`; passing both ignores
   *  `hours`. More than three rings would crowd the ticks, so the rest are
   *  dropped: name them in the legend instead of drawing them. */
  rings?: { open: string; close: string }[][];
  /** s 132 px (glyph), m 260 px, l 420 px. Default m. */
  size?: NightDialSize;
  /** What a screen reader hears instead of the drawing. Written by the
   *  caller in the visitor's language, with the same numbers. */
  label?: string;
  /** Optional caption under the time, already localized and upper-cased by
   *  the caller ("Η ΝΥΧΤΑ 41%", "ΚΛΕΙΝΕΙ 23:00"). */
  sub?: string;
  className?: string;
};

const C = 210;             // centre of the 420 viewBox
const R_NIGHT = 170;       // the night ring
const R_HOURS = 140;       // the opening-hours ring
const SOON_MIN = 90;       // "κλείνει σε λίγο" threshold, minutes

const MAX_WIDTH: Record<NightDialSize, number> = { s: 132, m: 260, l: 420 };

const point = (min: number, r: number): [string, string] => {
  const a = (min / 1440) * 2 * Math.PI;
  return [(C + r * Math.sin(a)).toFixed(1), (C - r * Math.cos(a)).toFixed(1)];
};

function Arc({ r, start, span, cls }: { r: number; start: number; span: number; cls: string }) {
  const circumference = 2 * Math.PI * r;
  const len = Math.max(0, Math.min(1, span / 1440)) * circumference;
  if (len <= 0.5) return null;
  return (
    <circle
      className={cls}
      cx={C} cy={C} r={r} fill="none"
      strokeDasharray={`${len.toFixed(1)} ${circumference.toFixed(1)}`}
      transform={`rotate(${((start / 1440) * 360 - 90).toFixed(2)} ${C} ${C})`}
    />
  );
}

// 24 hairline ticks, longer every six hours, as one path instead of 24 lines:
// same drawing, about a kilobyte less markup, and the dial has a 4 KB budget.
function ticks(every: number): string {
  let d = '';
  for (let h = 0; h < 24; h += every) {
    const a = (h * 15 * Math.PI) / 180;
    const outer = h % 6 === 0 ? 188 : 182;
    d += `M${(C + 176 * Math.sin(a)).toFixed(1)} ${(C - 176 * Math.cos(a)).toFixed(1)}`
      + `L${(C + outer * Math.sin(a)).toFixed(1)} ${(C - outer * Math.cos(a)).toFixed(1)}`;
  }
  return d;
}
const TICKS_ALL = ticks(1);
const TICKS_SIX = ticks(6);

const STYLE = `
.cn-dial{width:100%;height:auto;display:block;margin-inline:auto}
.cn-dial .b{stroke:var(--color-hair);stroke-width:1.2}
.cn-dial .t{stroke:var(--color-faint);stroke-width:1.2}
.cn-dial .na{stroke:var(--color-bronze);stroke-opacity:.3;stroke-width:9}
.cn-dial .el{stroke:var(--color-bronze);stroke-width:9}
.cn-dial .wi{stroke:var(--color-faint);stroke-opacity:.45;stroke-width:5}
.cn-dial .op{stroke:var(--color-verdigris);stroke-width:5}
.cn-dial .so{stroke:var(--color-bronze);stroke-width:5}
.cn-dial .nd{stroke:var(--color-ink);stroke-width:2;stroke-linecap:round}
.cn-dial .tp{fill:var(--color-ink)}
.cn-dial .ss{fill:var(--color-bronze)}
.cn-dial .sr{fill:var(--color-surface);stroke:var(--color-bronze);stroke-width:2}
.cn-dial text{font-family:var(--font-mono);fill:var(--color-muted);font-size:11px;letter-spacing:.08em;font-variant-numeric:tabular-nums}
.cn-dial .hr{fill:var(--color-faint)}
.cn-dial .ce{fill:var(--color-ink);font-size:46px;letter-spacing:.01em}
.cn-dial .sb{font-size:12.5px;letter-spacing:.1em}
.cn-dial .ml{fill:var(--color-ink)}
.cn-dial .md{fill:var(--color-surface)}
@media (prefers-reduced-motion:no-preference){
.cn-dial .dr{animation:cn-draw 1600ms cubic-bezier(.22,1,.36,1) both}
.cn-dial .d2{animation-delay:.2s}
.cn-dial .d3{animation-delay:.4s}
@keyframes cn-draw{from{stroke-dasharray:0 1200}}}
`.replace(/\n/g, '');

export function NightDial({
  now, sunsetISO, sunriseISO, hours, rings, size = 'm', label, sub, className,
}: NightDialProps) {
  const clock = athensClock(now);
  const set = minutesFromISO(sunsetISO);
  const rise = minutesFromISO(sunriseISO);
  const hasSun = set != null && rise != null;
  const night = hasSun ? nightReading(clock.min, set, rise) : null;
  const detail = size !== 's';

  // One ring per subject, each with today's windows and the one the clock is
  // standing in. The radii step inward by 14, as in the prototype.
  const subjects = (rings ?? (hours ? [hours] : []))
    .slice(0, 3)
    .map((subject, ri) => {
      const windows = subject
        .map((h) => ({ open: parseHhmm(h.open), close: parseHhmm(h.close) }))
        .filter((w): w is { open: number; close: number } => w.open != null && w.close != null);
      const current = windows.find((w) => inWindow(clock.min, w.open, w.close)) ?? null;
      return {
        r: R_HOURS - ri * 14,
        windows,
        current,
        leftToClose: current ? windowSpan(clock.min, current.close) : null,
      };
    });
  const leftToClose = subjects[0]?.leftToClose ?? null;

  const [nx1, ny1] = point(clock.min, 92);
  const [nx2, ny2] = point(clock.min, 186);
  const moon = detail ? moonPhase(now) : null;

  return (
    <>
      <svg
        className={`cn-dial${className ? ` ${className}` : ''}`}
        viewBox="0 0 420 420"
        style={{ maxWidth: MAX_WIDTH[size] }}
        aria-hidden="true"
        focusable="false"
      >
        <style>{STYLE}</style>

        <circle className="b" cx={C} cy={C} r={R_NIGHT} fill="none" />
        <path className="t" d={detail ? TICKS_ALL : TICKS_SIX} fill="none" />

        {/* The night: the whole arc from sunset to sunrise, then the part of
            it that has already passed, in solid bronze. */}
        {hasSun && night && (
          <>
            <Arc r={R_NIGHT} start={set} span={night.length} cls="na dr" />
            {night.night && <Arc r={R_NIGHT} start={set} span={night.elapsed} cls="el dr d2" />}
          </>
        )}

        {/* Today's opening windows, and what is left of the one running now.
            Verdigris means open; bronze means it closes within 90 minutes. */}
        {subjects.map((s, ri) => (
          <g key={`ring${ri}`}>
            {s.windows.map((w, i) => (
              <Arc key={`w${i}`} r={s.r} start={w.open} span={windowSpan(w.open, w.close)} cls="wi dr d3" />
            ))}
            {s.current && s.leftToClose != null && (
              <Arc
                r={s.r}
                start={clock.min}
                span={s.leftToClose}
                cls={`${s.leftToClose <= SOON_MIN ? 'so' : 'op'} dr d3`}
              />
            )}
          </g>
        ))}

        {/* The needle sits at the time in Athens and moves once a minute. */}
        <line className="nd" x1={nx1} y1={ny1} x2={nx2} y2={ny2} />
        <circle className="tp" cx={nx2} cy={ny2} r="4" />

        {hasSun && (
          <>
            <circle className="ss" cx={point(set, R_NIGHT)[0]} cy={point(set, R_NIGHT)[1]} r="6.5" />
            <circle className="sr" cx={point(rise, R_NIGHT)[0]} cy={point(rise, R_NIGHT)[1]} r="6.5" />
          </>
        )}

        {detail && (
          <>
            <text className="hr" x={C} y="13" textAnchor="middle">00</text>
            <text className="hr" x="416" y="214" textAnchor="end">06</text>
            <text className="hr" x={C} y="418" textAnchor="middle">12</text>
            <text className="hr" x="4" y="214">18</text>
          </>
        )}

        <text className="ce" x={C} y={detail ? 200 : 224} textAnchor="middle">{hhmm(clock.min)}</text>
        {detail && sub && <text className="sb" x={C} y="226" textAnchor="middle">{sub}</text>}

        {/* The moon, lit fraction drawn as one disc shadowing another. */}
        {moon && (
          <>
            <g transform={`translate(${C} 258)`}>
              <circle className="ml" r="10" />
              <circle className="md" cx={((moon.waxing ? -1 : 1) * 20 * moon.illum).toFixed(1)} r="10" />
            </g>
            <text x={C} y="292" textAnchor="middle">{Math.round(moon.illum * 100)}%</text>
          </>
        )}
      </svg>
      {label && <span className="sr-only">{label}</span>}
    </>
  );
}

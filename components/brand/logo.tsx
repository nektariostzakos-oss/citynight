// citynight logo "Ζενίθ", picked by Nektarios on 2026-09-17 (products/citynight/design/tokens.md).
// A ring for the city's 24 hours and a bronze moon at its highest point: midnight. Midnight sits at the
// top and time runs clockwise, like the product dial. The ring and the name take the text colour
// (currentColor); the moon uses --color-brand-moon. Static uses always show midnight.
//
// Two drawings on a 100-unit grid: "main" from 32 px, "small" for 16 to 24 px, where a 4-unit gap would
// turn grey, so the ring is heavier and the moon touches it.

import { LOCKUP } from './logo-paths';

export type LogoDrawing = 'main' | 'small';

const GEOMETRY = {
  main: { r: 43, stroke: 12, moon: 13, gap: 4 },
  small: { r: 41.5, stroke: 15, moon: 16, gap: 0 },
} as const;

type MarkOptions = {
  drawing?: LogoDrawing;
  /** Time of day in minutes (0 = midnight, the moon at the top). */
  minutes?: number;
  /** Between sunrise and sunset the moon is drawn hollow. */
  day?: boolean;
  /** One colour: the moon takes the text colour too (strips on business sites). */
  mono?: boolean;
};

function MarkShapes({ drawing = 'main', minutes = 0, day = false, mono = false }: MarkOptions) {
  const g = GEOMETRY[drawing];
  const orbit = g.r - g.stroke / 2 - g.gap - g.moon;
  const angle = (minutes / 1440) * 2 * Math.PI;
  const cx = Math.round((50 + orbit * Math.sin(angle)) * 100) / 100;
  const cy = Math.round((50 - orbit * Math.cos(angle)) * 100) / 100;
  const moon = mono ? 'currentColor' : 'var(--color-brand-moon)';
  return (
    <>
      <circle cx="50" cy="50" r={g.r} fill="none" stroke="currentColor" strokeWidth={g.stroke} />
      {day ? (
        <circle cx={cx} cy={cy} r={g.moon - 2} fill="none" strokeWidth={4} style={{ stroke: moon }} />
      ) : (
        <circle cx={cx} cy={cy} r={g.moon} style={{ fill: moon }} />
      )}
    </>
  );
}

type SvgA11y = {
  className?: string;
  /** Accessible name. Leave empty when the parent link already carries the name. */
  label?: string;
};

function a11y(label?: string) {
  return label
    ? ({ role: 'img', 'aria-label': label } as const)
    : ({ 'aria-hidden': true } as const);
}

/** The symbol alone: favicon-like places, strips and badges. */
export function LogoMark({ className, label, ...mark }: MarkOptions & SvgA11y) {
  return (
    <svg viewBox="0 0 100 100" className={className} focusable="false" {...a11y(label)}>
      <MarkShapes {...mark} />
    </svg>
  );
}

/** Symbol and name as one drawing, cropped to the ink. Size it by height (e.g. h-6 w-auto). */
export function LogoLockup({
  className,
  label,
  withDomain = false,
  domainColour = 'currentColor',
  ...mark
}: Omit<MarkOptions, 'mono'> & SvgA11y & { withDomain?: boolean; domainColour?: string }) {
  return (
    <svg
      viewBox={withDomain ? LOCKUP.viewBoxWithDomain : LOCKUP.viewBox}
      className={className}
      focusable="false"
      {...a11y(label)}
    >
      <g transform={LOCKUP.markTransform}>
        <MarkShapes {...mark} />
      </g>
      <path fill="currentColor" d={LOCKUP.name} />
      {withDomain ? <path d={LOCKUP.domain} style={{ fill: domainColour }} /> : null}
    </svg>
  );
}

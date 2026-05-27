import type { Easing, Transition } from "framer-motion";

/**
 * Single source of motion timing for the demo template. Mirrors the marketing
 * site tokens so both surfaces stay in rhythm.
 *
 * Naming follows function, not duration — `enter` reveals, `exit` retreats,
 * `lift` is hover micro-motion, `cinema` is the slow art-direction tier.
 */

export const ease = {
  out: [0.22, 1, 0.36, 1] as Easing,
  inOut: [0.65, 0, 0.35, 1] as Easing,
  spring: [0.16, 1, 0.3, 1] as Easing,
  linear: "linear" as const,
} as const;

export const duration = {
  fast: 0.2,
  base: 0.4,
  slow: 0.65,
  cinema: 1.0,
} as const;

export const transition = {
  enter: { duration: duration.slow, ease: ease.out } satisfies Transition,
  exit: { duration: duration.fast, ease: ease.inOut } satisfies Transition,
  lift: { duration: duration.fast, ease: ease.out } satisfies Transition,
  cinema: { duration: duration.cinema, ease: ease.out } satisfies Transition,
} as const;

export const variants = {
  fadeUp: {
    hidden: { opacity: 0, y: 24, filter: "blur(6px)" },
    show: { opacity: 1, y: 0, filter: "blur(0px)" },
  },
  fadeIn: {
    hidden: { opacity: 0 },
    show: { opacity: 1 },
  },
  word: {
    hidden: { opacity: 0, y: 28, filter: "blur(8px)" },
    show: { opacity: 1, y: 0, filter: "blur(0px)" },
  },
  liftCard: {
    rest: { y: 0, scale: 1 },
    hover: { y: -4, scale: 1.005 },
  },
} as const;

export const stagger = {
  tight: { staggerChildren: 0.04 },
  base: { staggerChildren: 0.07 },
  loose: { staggerChildren: 0.12 },
} as const;

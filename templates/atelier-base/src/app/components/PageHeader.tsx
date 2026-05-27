"use client";

import { motion, useReducedMotion } from "framer-motion";

/**
 * Shared header for every inner demo page. It carries the same backdrop as
 * the marketing site's page headers: a fine grid and two drifting gold light
 * orbs. The orb drift honours prefers-reduced-motion.
 */
export default function PageHeader({
  eyebrow,
  title,
  subtitle,
}: {
  eyebrow: string;
  title: string;
  subtitle?: string;
}) {
  const reduced = useReducedMotion();
  return (
    <section className="relative overflow-hidden px-6 pb-20 pt-44">
      <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
        <motion.div
          className="absolute -top-40 left-[-10%] h-[440px] w-[60vw] rounded-full opacity-40 blur-3xl"
          style={{ background: "radial-gradient(circle, rgba(201,169,97,0.5), transparent 60%)" }}
          animate={reduced ? undefined : { x: [0, 40, 0], y: [0, 26, 0] }}
          transition={reduced ? undefined : { duration: 20, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div
          className="absolute -bottom-48 right-[-12%] h-[420px] w-[55vw] rounded-full opacity-25 blur-3xl"
          style={{ background: "radial-gradient(circle, rgba(201,169,97,0.38), transparent 60%)" }}
          animate={reduced ? undefined : { x: [0, -34, 0], y: [0, -24, 0] }}
          transition={reduced ? undefined : { duration: 24, repeat: Infinity, ease: "easeInOut" }}
        />
        <div
          className="absolute inset-0 opacity-[0.025]"
          style={{
            backgroundImage:
              "linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)",
            backgroundSize: "60px 60px",
          }}
        />
      </div>
      <div className="relative mx-auto max-w-5xl text-center">
        <motion.p
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mb-5 text-xs uppercase tracking-[0.3em]"
          style={{ color: "var(--muted-2)" }}
        >
          {eyebrow}
        </motion.p>
        <motion.h1
          initial={{ opacity: 0, y: 30, filter: "blur(10px)" }}
          animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
          transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1], delay: 0.1 }}
          className="font-serif text-5xl font-semibold leading-[1.05] tracking-tight sm:text-7xl"
          style={{ color: "var(--foreground)" }}
        >
          {title}
        </motion.h1>
        {subtitle && (
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.4 }}
            className="mx-auto mt-6 max-w-2xl text-lg"
            style={{ color: "var(--muted)" }}
          >
            {subtitle}
          </motion.p>
        )}
      </div>
    </section>
  );
}

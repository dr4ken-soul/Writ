'use client';

// This file is part of Writ.
// Copyright (C) 2026 Writ contributors
// SPDX-License-Identifier: Apache-2.0

/*
 * The closing call to action.
 *
 * The crescendo: the ScopeSeal is fully disclosed here, its ring gap open and a
 * light sweep along the gap edge, and the section holds nothing else competing
 * for attention.
 */

import { motion } from 'motion/react';
import { ArrowUpRight } from 'lucide-react';
import { useConsoleGate } from '@/lib/console-gate';
import { EASE, VIEWPORT } from '@/hooks/useScrollReveal';

/**
 * Renders the final call to action.
 * @returns the section element
 */
export function FinalCta(): JSX.Element {
  const { enter } = useConsoleGate();

  return (
    <section
      data-density="hero"
      data-seal-state="disclosed"
      className="relative flex w-full items-center justify-center overflow-hidden py-32 md:py-40"
    >
      <div className="relative z-[var(--z-content)] mx-auto flex max-w-2xl flex-col items-center px-6 text-center">
        <motion.h2
          className="font-display text-4xl font-extrabold leading-[1.02] tracking-[-0.02em] text-[var(--text-primary)] [text-wrap:balance] md:text-5xl"
          initial={{ opacity: 0, filter: 'blur(10px)', y: 24 }}
          whileInView={{ opacity: 1, filter: 'blur(0px)', y: 0 }}
          viewport={VIEWPORT}
          transition={{ duration: 0.8, ease: EASE }}
        >
          ISSUE YOUR FIRST WRIT
        </motion.h2>

        <motion.p
          className="mt-5 max-w-md font-body text-base text-[var(--text-secondary)]"
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={VIEWPORT}
          transition={{ duration: 0.7, ease: EASE, delay: 0.2 }}
        >
          Connect on Midnight and hand your first agent a mandate that can prove itself.
        </motion.p>

        <motion.button
          type="button"
          onClick={enter}
          className="group mt-9 flex items-center gap-3 rounded-full bg-[var(--accent)] px-9 py-4 font-mono text-sm font-medium tracking-wide text-[var(--bg-primary)] transition-colors duration-150 hover:bg-[var(--accent-hover)]"
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={VIEWPORT}
          transition={{ duration: 0.7, ease: EASE, delay: 0.4 }}
        >
          OPEN THE CONSOLE
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-black/10 transition-transform duration-200 group-hover:translate-x-0.5 group-hover:-translate-y-px">
            <ArrowUpRight size={14} />
          </span>
        </motion.button>
      </div>
    </section>
  );
}
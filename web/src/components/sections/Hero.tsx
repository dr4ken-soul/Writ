'use client';

// This file is part of Writ.
// Copyright (C) 2026 Writ contributors
// SPDX-License-Identifier: Apache-2.0

/*
 * Hero.
 *
 * Top-left lead, bottom-right support. The mandate panel is the product, not an
 * illustration of it, so it shows a real writ shape with its sensitive rows
 * masked. Nothing in that panel ever resolves to a real value: the scramble
 * settles on block characters because that is what withheld looks like.
 */

import { motion, useInView } from 'motion/react';
import { ArrowUpRight } from 'lucide-react';
import { useRef } from 'react';
import { TextScramble } from '@/components/ui/TextScramble';
import { useConsoleGate } from '@/lib/console-gate';
import { EASE, splitLines, wordMountIn } from '@/hooks/useScrollReveal';

/** The headline, one string per line. */
const HEADLINE = ['AUTHORITY THE AGENT CAN PROVE.', 'TERMS NO ONE SEES.'];

/** The masked scope rows. Sensitive fields never resolve to real values. */
const ROWS = [
  { label: 'AGENT', value: 'ops-agent-07' },
  { label: 'CEILING', value: '▮▮▮▮▮▮▮▮' },
  { label: 'WINDOW', value: '▮▮▮▮▮▮▮▮' },
  { label: 'ALLOWLIST', value: '2 COUNTERPARTIES' },
] as const;

/**
 * Renders the hero section.
 * @returns the section element
 */
export function Hero(): JSX.Element {
  const { enter } = useConsoleGate();
  const panelRef = useRef<HTMLDivElement | null>(null);
  // The masked rows re-scramble on every re-entry, driven by an observer rather
  // than a hover handler, so they work on touch and respect the CSS-only rule
  // for hover affordances.
  const inView = useInView(panelRef, { amount: 0.4 });
  const lines = splitLines(HEADLINE);

  return (
    <section
      data-density="hero"
      data-seal-state="sealed"
      className="relative min-h-[100dvh] w-full overflow-hidden"
    >
      <div className="relative z-[var(--z-content)] mx-auto flex min-h-[100dvh] max-w-[1200px] flex-col-reverse px-6 pt-24 md:px-10 lg:grid lg:grid-cols-12 lg:pt-0">
        {/* Top-left: the text stack. */}
        <div className="pt-6 lg:col-span-7 lg:pt-[150px]">
          <motion.p
            className="font-mono text-[11px] uppercase tracking-[0.25em] text-[var(--accent)] md:text-xs"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: EASE, delay: 0.35 }}
          >
            PRIVATE AUTHORITY LAYER · MIDNIGHT
          </motion.p>

          <h1 className="mt-6 font-display text-[clamp(2.6rem,6vw,4.75rem)] font-extrabold leading-[0.95] tracking-[-0.02em] text-[var(--text-primary)] [text-wrap:balance]">
            {lines.map((line) => (
              <span key={line.line} className="block">
                {line.words.map((word) => (
                  <motion.span
                    key={`${line.line}-${word.index}`}
                    className="inline-block"
                    {...wordMountIn(word.index)}
                  >
                    {word.word}
                    {' '}
                  </motion.span>
                ))}
              </span>
            ))}
          </h1>

          <motion.p
            className="mt-6 max-w-[46ch] font-body text-base leading-relaxed text-[var(--text-secondary)] md:text-lg"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease: EASE, delay: 0.8 }}
          >
            Issue private mandates to AI agents on Midnight. Scope limits stay in private state.
            Every action returns a proof it stayed in bounds.
          </motion.p>

          <motion.div
            className="mt-8 flex flex-wrap items-center gap-4"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease: EASE, delay: 1 }}
          >
            <button
              type="button"
              onClick={enter}
              className="group flex items-center gap-3 rounded-full bg-[var(--accent)] px-7 py-3.5 font-mono text-sm font-medium tracking-wide text-[var(--bg-primary)] transition-colors duration-150 hover:bg-[var(--accent-hover)]"
            >
              OPEN THE CONSOLE
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-black/10 transition-transform duration-200 group-hover:translate-x-0.5 group-hover:-translate-y-px">
                <ArrowUpRight size={14} />
              </span>
            </button>

            <a
              href="#mechanism"
              className="rounded-full border border-[var(--border-default)] px-7 py-3.5 font-mono text-sm text-[var(--text-primary)] transition-colors duration-150 hover:border-[var(--accent)]"
            >
              SEE THE MECHANISM
            </a>
          </motion.div>
        </div>

        {/* Bottom-right: the mandate panel. */}
        <div
          ref={panelRef}
          className="flex items-end pb-16 pt-10 lg:col-span-5 lg:col-start-8 lg:justify-end lg:pb-[80px] lg:pt-0"
        >
          <motion.div
            className="w-full max-w-[400px] rounded-2xl border border-[var(--border-default)] bg-[var(--bg-surface)]/70 p-6 shadow-[0_20px_60px_-20px_rgba(var(--shadow-tint),0.12)] backdrop-blur-xl md:p-7"
            initial={{ opacity: 0, y: 30, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.9, ease: EASE, delay: 0.65 }}
          >
            <div className="mb-5 flex items-center justify-between">
              <span className="font-mono text-[11px] uppercase tracking-[0.2em] text-[var(--text-muted)]">
                WRIT #0042
              </span>
              <span className="flex items-center gap-1.5 rounded-full border border-[var(--border-default)] bg-[var(--accent-glow)] px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.15em] text-[var(--accent)]">
                <span className="h-1.5 w-1.5 animate-pulse-soft rounded-full bg-[var(--accent)]" />
                SEALED
              </span>
            </div>

            {ROWS.map((row, index) => (
              <motion.div
                key={row.label}
                className="flex items-center justify-between border-b border-[var(--border-subtle)] py-3 last:border-0"
                initial={{ opacity: 0, x: 12 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.6, ease: EASE, delay: 0.9 + index * 0.12 }}
              >
                <span className="font-body text-xs text-[var(--text-secondary)]">{row.label}</span>
                <TextScramble
                  value={row.value}
                  active={inView}
                  className="font-mono text-sm text-[var(--text-primary)]"
                />
              </motion.div>
            ))}

            <p className="mt-5 border-t border-[var(--border-subtle)] pt-4 font-body text-[11px] leading-relaxed text-[var(--text-muted)]">
              Terms live in private state. The ledger sees a commitment and nothing more.
            </p>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
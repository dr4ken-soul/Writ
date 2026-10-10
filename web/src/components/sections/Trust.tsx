'use client';

// This file is part of Writ.
// Copyright (C) 2026 Writ contributors
// SPDX-License-Identifier: Apache-2.0

/*
 * Trust.
 *
 * The image slot of a split section becomes a badge stack, because no photography
 * fits a product with nothing to show. The claim is technical, so the evidence
 * next to it is technical too.
 */

import { motion } from 'motion/react';
import { EASE, VIEWPORT } from '@/hooks/useScrollReveal';

/** The four badges, in order. */
const BADGES = [
  { label: 'NETWORK', value: 'Midnight' },
  { label: 'CONTRACTS', value: 'Compact, dual-ledger' },
  { label: 'DISCLOSURE', value: 'Contract-controlled' },
  { label: 'LICENCE', value: 'Apache 2.0' },
] as const;

/**
 * Renders the trust section.
 * @returns the section element
 */
export function Trust(): JSX.Element {
  return (
    <section data-density="sparse" data-seal-state="disclosed" className="w-full py-24 md:py-32">
      <div className="relative z-[var(--z-content)] mx-auto grid max-w-[1200px] grid-cols-1 items-center gap-10 px-6 md:px-10 lg:grid-cols-2 lg:gap-16">
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={VIEWPORT}
          transition={{ duration: 0.7, ease: EASE, delay: 0.2 }}
        >
          <h2 className="font-display text-3xl font-extrabold leading-[1.05] tracking-[-0.02em] text-[var(--text-primary)] md:text-4xl lg:text-[2.75rem]">
            THE TERMS NEVER TOUCH THE PUBLIC LEDGER
          </h2>
          <p className="mt-5 max-w-[52ch] font-body text-base leading-relaxed text-[var(--text-secondary)]">
            Writ is a pair of Compact contracts on Midnight. Scope values are witness-held private
            state checked inside the circuits. Public state holds commitments, statuses and an
            append-only audit root. Disclosure happens through contract-controlled disclosure
            calls, logged every time.
          </p>
        </motion.div>

        <motion.div
          className="grid grid-cols-1 gap-4 sm:grid-cols-2"
          initial={{ opacity: 0, x: 20 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={VIEWPORT}
          transition={{ duration: 0.7, ease: EASE, delay: 0.35 }}
        >
          {BADGES.map((badge) => (
            <div
              key={badge.label}
              className="rounded-xl border border-[var(--border-default)] bg-[var(--bg-surface)]/70 p-5 backdrop-blur-sm"
            >
              {/* Badge icon slot: supply an SVG or leave empty */}
              <div className="h-8 w-8" aria-hidden="true" />
              <p className="mt-3 font-mono text-[11px] uppercase tracking-[0.15em] text-[var(--text-muted)]">
                {badge.label}
              </p>
              <p className="mt-1 font-body text-sm text-[var(--text-primary)]">{badge.value}</p>
            </div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
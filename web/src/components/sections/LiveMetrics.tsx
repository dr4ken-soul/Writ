'use client';

// This file is part of Writ.
// Copyright (C) 2026 Writ contributors
// SPDX-License-Identifier: Apache-2.0

/*
 * Live metrics.
 *
 * Two figures are read from the contract on mount. The third is a fixed zero,
 * because it is the product claim rather than a measurement, and it is backed by
 * the byte level privacy test rather than by a query.
 *
 * No mock data and no fallback number. If the deployment is missing the section
 * says so and stops.
 */

import { motion } from 'motion/react';
import { useInView, useReducedMotion } from 'motion/react';
import { useRef } from 'react';
import { useMetrics } from '@/hooks/useMetrics';
import { useCountUp } from '@/hooks/useCountUp';
import { EASE, VIEWPORT } from '@/hooks/useScrollReveal';

/** The three columns, in order. */
const COLUMNS = [
  { key: 'writsIssued', label: 'WRITS ISSUED ON MIDNIGHT' },
  { key: 'actionsInScope', label: 'ACTIONS VERIFIED IN SCOPE' },
  { key: 'termsPublished', label: 'TERMS PUBLISHED TO THE LEDGER' },
] as const;

/**
 * Renders one metric figure, counting up once it is in view.
 * @param props - the value, the label and the column index
 * @returns the metric cell
 */
function Metric({
  value,
  label,
  index,
  countUp,
}: {
  value: number;
  label: string;
  index: number;
  countUp: boolean;
}): JSX.Element {
  const displayed = useCountUp(value, countUp);

  return (
    <motion.div
      className={index < 2 ? 'md:border-r md:border-[var(--border-subtle)] md:pr-10' : ''}
      initial={{ opacity: 0, filter: 'blur(10px)', y: 20 }}
      whileInView={{ opacity: 1, filter: 'blur(0px)', y: 0 }}
      viewport={VIEWPORT}
      transition={{ duration: 0.8, ease: EASE, delay: 0.2 * index }}
    >
      <div className="font-display text-5xl font-extrabold leading-none tabular-nums text-[var(--text-primary)] md:text-6xl lg:text-7xl">
        {displayed.toLocaleString('en-GB')}
      </div>
      <div className="mt-3 font-mono text-xs uppercase tracking-[0.15em] text-[var(--text-muted)]">
        {label}
      </div>
    </motion.div>
  );
}

/**
 * Renders the live metrics section.
 * @returns the section element
 */
export function LiveMetrics(): JSX.Element {
  const state = useMetrics();
  const reducedMotion = useReducedMotion();
  const gridRef = useRef<HTMLDivElement | null>(null);
  const inView = useInView(gridRef, { amount: 0.3 });

  return (
    <section
      data-density="dense"
      data-seal-state="proven"
      className="relative w-full overflow-hidden bg-[var(--bg-primary)]/92 py-24 backdrop-blur-sm md:py-32"
    >
      <div className="relative z-[var(--z-content)] mx-auto max-w-[1200px] px-6 md:px-10">
        <p className="font-mono text-[11px] uppercase tracking-[0.25em] text-[var(--text-muted)]">
          LIVE FROM THE CONTRACT
        </p>

        {state.status === 'error' ? (
          <div
            className="mt-14 rounded-xl border border-[var(--border-default)] bg-[var(--bg-surface)]/60 p-7"
            role="status"
          >
            <p className="font-body text-base font-medium text-[var(--text-primary)]">
              These figures are read live from WritRegistry, and this build has no deployment to
              read from.
            </p>
            <p className="mt-2 max-w-[60ch] font-body text-sm leading-relaxed text-[var(--text-secondary)]">
              {state.message}
            </p>
            <p className="mt-5 border-t border-[var(--border-subtle)] pt-4 font-mono text-[11px] uppercase tracking-[0.15em] text-[var(--text-muted)]">
              TERMS PUBLISHED TO THE LEDGER · 0 · UNAVAILABLE REGARDLESS OF DEPLOYMENT
            </p>
          </div>
        ) : (
          <div ref={gridRef} className="mt-14 grid grid-cols-1 gap-10 md:grid-cols-3 md:gap-12">
            {state.status === 'loading'
              ? COLUMNS.map((column, index) => (
                  <div key={column.key} className={index < 2 ? 'md:border-r md:border-[var(--border-subtle)] md:pr-10' : ''}>
                    <div className="skeleton h-14 w-32 rounded-md" />
                    <div className="skeleton mt-3 h-3 w-40 rounded" />
                  </div>
                ))
              : COLUMNS.map((column, index) => (
                  <Metric
                    key={column.key}
                    index={index}
                    label={column.label}
                    value={state.metrics[column.key]}
                    countUp={inView && !reducedMotion}
                  />
                ))}
          </div>
        )}
      </div>
    </section>
  );
}
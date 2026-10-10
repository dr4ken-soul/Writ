'use client';

// This file is part of Writ.
// Copyright (C) 2026 Writ contributors
// SPDX-License-Identifier: Apache-2.0

/*
 * Compare.
 *
 * A three-way comparison at unequal column weights: Writ takes five columns, API
 * keys take four, public policy contracts take three. The weighting is the
 * argument, so it is carried by the grid rather than by a label.
 *
 * Entirely typographic. No icons, no images.
 */

import { motion } from 'motion/react';
import { EASE, VIEWPORT } from '@/hooks/useScrollReveal';

/** The four questions each column answers. */
const QUESTIONS = [
  'Where limits live',
  'Proof of compliance',
  'What a check reveals',
  'Revocation',
] as const;

/** The three columns. */
const COLUMNS = [
  {
    span: 'lg:col-span-5',
    title: 'WRIT',
    featured: true,
    answers: ['Private state, sealed', 'Scoped, cryptographic', 'Only the fact asked', 'Instant, status only'],
  },
  {
    span: 'lg:col-span-4',
    title: 'API KEYS AND PROMPTS',
    featured: false,
    answers: ['Environment and docs', 'Trust the logs', 'The whole key surface', 'Rotate and hope'],
  },
  {
    span: 'lg:col-span-3',
    title: 'PUBLIC POLICY CONTRACTS',
    featured: false,
    answers: ['Public contract state', 'Public trace', 'The full policy', 'Governance vote'],
  },
] as const;

/**
 * Renders the three way comparison.
 * @returns the section element
 */
export function Compare(): JSX.Element {
  return (
    <section
      id="compare"
      data-density="dense"
      data-seal-state="disclosed"
      className="w-full bg-[var(--bg-primary)]/92 py-24 backdrop-blur-sm md:py-32"
    >
      <div className="relative z-[var(--z-content)] mx-auto max-w-[1200px] px-6 md:px-10">
        <div className="mb-12 grid grid-cols-1 gap-5 lg:grid-cols-12">
          <div className="lg:col-span-12">
            <p className="font-mono text-[11px] uppercase tracking-[0.25em] text-[var(--accent)]">
              THE DIFFERENCE
            </p>
            <h2 className="mt-3 font-display text-3xl font-extrabold tracking-[-0.02em] text-[var(--text-primary)] md:text-4xl">
              THREE WAYS TO LIMIT AN AGENT
            </h2>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-5 lg:grid-cols-12">
          {COLUMNS.map((column, index) => (
            <motion.div
              key={column.title}
              className={`rounded-xl border p-7 transition-colors duration-200 ${column.span} ${
                column.featured
                  ? 'border-[var(--accent)]/40 bg-[var(--bg-surface)] shadow-[0_20px_60px_-30px_rgba(var(--shadow-tint),0.25)] hover:-translate-y-1 hover:border-[var(--accent)]/60'
                  : 'border-[var(--border-default)] bg-[var(--bg-surface)]/60'
              }`}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={VIEWPORT}
              transition={{ duration: 0.6, ease: EASE, delay: index * 0.12 }}
            >
              <h3
                className={`font-body text-lg font-medium ${
                  column.featured ? 'text-[var(--accent)]' : 'text-[var(--text-primary)]'
                }`}
              >
                {column.title}
              </h3>

              <dl className="mt-4">
                {QUESTIONS.map((question, row) => (
                  <div
                    key={question}
                    className="flex items-baseline justify-between gap-4 border-b border-[var(--border-subtle)] py-3.5 last:border-0"
                  >
                    <dt className="font-body text-xs uppercase tracking-[0.12em] text-[var(--text-muted)]">
                      {question}
                    </dt>
                    <dd className="text-right font-mono text-sm text-[var(--text-primary)]">
                      {column.answers[row]}
                    </dd>
                  </div>
                ))}
              </dl>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
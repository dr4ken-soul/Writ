'use client';

// This file is part of Writ.
// Copyright (C) 2026 Writ contributors
// SPDX-License-Identifier: Apache-2.0

/*
 * Mechanism.
 *
 * Four layers, ISSUE / ACT / PROVE / DISCLOSE, connected by a blueprint style
 * hairline that runs behind the step tags. The section is dense, so the
 * ScopeSeal dims behind it.
 */

import { motion } from 'motion/react';
import { EASE, VIEWPORT } from '@/hooks/useScrollReveal';

/** The four layers, in order. */
const LAYERS = [
  {
    tag: 'IS',
    title: 'ISSUE',
    body: 'The principal defines the scope in the browser. Ceiling, window, allowlist and action limits become private state. The ledger receives a commitment.',
  },
  {
    tag: 'AC',
    title: 'ACT',
    body: 'Every agent action passes through the contract. The circuit checks it against the sealed terms in private.',
  },
  {
    tag: 'PR',
    title: 'PROVE',
    body: 'In-scope actions return a proof the counterparty can verify. Out-of-scope attempts are rejected without exposing which bound stopped them.',
  },
  {
    tag: 'DI',
    title: 'DISCLOSE',
    body: 'When policy requires it, the contract reveals scoped facts to an auditor. The disclosure is contract-controlled and written to an append-only log.',
  },
] as const;

/**
 * Renders the four layer mechanism section.
 * @returns the section element
 */
export function Mechanism(): JSX.Element {
  return (
    <section
      id="mechanism"
      data-density="dense"
      data-seal-state="scoped"
      className="w-full bg-[var(--bg-primary)]/92 py-24 backdrop-blur-sm md:py-32"
    >
      <div className="relative z-[var(--z-content)] mx-auto max-w-[860px] px-6 md:px-10">
        <div className="mb-14 text-left">
          <p className="font-mono text-[11px] uppercase tracking-[0.25em] text-[var(--accent)]">
            THE MECHANISM
          </p>
          <h2 className="mt-3 font-display text-3xl font-extrabold tracking-[-0.02em] text-[var(--text-primary)] md:text-4xl">
            ISSUE, ACT, PROVE, DISCLOSE
          </h2>
        </div>

        <div className="flex flex-col gap-4">
          {LAYERS.map((layer, index) => (
            <motion.div
              key={layer.tag}
              className="relative flex items-start gap-5 rounded-xl border border-[var(--border-default)] bg-[var(--bg-surface)]/60 p-6 transition-colors duration-200 hover:border-[var(--accent)]/40 md:p-7"
              initial={{ opacity: 0, y: 20, filter: 'blur(6px)' }}
              whileInView={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
              viewport={VIEWPORT}
              transition={{ duration: 0.6, ease: EASE, delay: index * 0.15 }}
            >
              {/* The blueprint annotation hairline linking the step tags. Omitted
                  on the first card, where there is nothing above it to connect. */}
              {index === 0 ? null : (
                <span
                  aria-hidden="true"
                  className="pointer-events-none absolute bottom-[28px] left-[38px] top-[28px] w-px bg-[var(--border-subtle)]"
                />
              )}
              <span className="min-w-[2.5rem] pt-1 font-mono text-xs uppercase tracking-wider text-[var(--accent)]">
                {layer.tag}
              </span>
              <div>
                <h3 className="font-body text-base font-medium text-[var(--text-primary)] md:text-lg">
                  {layer.title}
                </h3>
                <p className="mt-1.5 max-w-[62ch] font-body text-sm leading-relaxed text-[var(--text-secondary)]">
                  {layer.body}
                </p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
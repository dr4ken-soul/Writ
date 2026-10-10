'use client';

// This file is part of Writ.
// Copyright (C) 2026 Writ contributors
// SPDX-License-Identifier: Apache-2.0

/*
 * Integration.
 *
 * The plug-and-play proof: three consumers, one contract surface. Each tab shows
 * what that role does and the typed SDK call it makes. The code is final text,
 * not a screenshot, so a reader can copy it.
 */

import { AnimatePresence, motion } from 'motion/react';
import { useState } from 'react';
import { EASE, VIEWPORT } from '@/hooks/useScrollReveal';

/** The three consumer roles. */
const TABS = [
  {
    id: 'principal',
    label: 'PRINCIPAL',
    title: 'Define the mandate once.',
    description:
      'Set ceiling, window, allowlist and action mask in a local form. Terms are sealed into private state before any transaction is built.',
    bullets: [
      'Set ceiling, window, allowlist and action mask in a local form.',
      'Terms are sealed into private state before any transaction is built.',
      'Revoke instantly; revocation publishes a status change only.',
    ],
    filename: 'issue.ts',
    code: [
      "import { writ } from '@writ/sdk'",
      'const sealed = await writ.issue({',
      "  ceiling:   '500000000',        // private",
      '  window:    { from: now, to: now + 48 * 3600 },',
      "  allowlist: ['0x4c…9a12', '0x88…3f07'],",
      '})',
      "// ledger sees: commitment 0x7c…a41e, status 'sealed'",
    ],
  },
  {
    id: 'agent',
    label: 'AGENT',
    title: 'Act without holding secrets.',
    description:
      'Each action is one typed call. The contract answers in-scope or rejected, and the reason stays with the agent.',
    bullets: [
      'Each action is one typed call: recipient, amount, intent.',
      'The contract answers in-scope or rejected. The reason stays private to you.',
      'No API keys, no bearer tokens, no environment sprawl.',
    ],
    filename: 'act.ts',
    code: [
      "const result = await writ.act({ writ: '0x7c…a41e', to, amount })",
      'if (result.inScope) settle(result.proof)',
      'else log(result.reason)   // private to the agent',
    ],
  },
  {
    id: 'verifier',
    label: 'VERIFIER',
    title: 'Ask for facts, not files.',
    description:
      'Request a scoped attestation. The contract decides what to disclose and records that it did.',
    bullets: [
      'Request a scoped attestation: within-writ, spend band, window valid.',
      'The contract decides what to disclose and logs that it did.',
      'Nothing else about the mandate becomes readable.',
    ],
    filename: 'attest.ts',
    code: [
      "const fact = await writ.attest({ action: '0x02…e15b' })",
      "// -> 'within-writ'  (nothing else disclosed)",
    ],
  },
] as const;

/**
 * Renders the tabbed integration explorer.
 * @returns the section element
 */
export function Integration(): JSX.Element {
  const [active, setActive] = useState(0);
  const tab = TABS[active] ?? TABS[0];

  return (
    <section
      id="integration"
      data-density="dense"
      data-seal-state="scoped"
      className="w-full bg-[var(--bg-secondary)] py-20 md:py-28"
    >
      <div className="relative z-[var(--z-content)] mx-auto max-w-[1200px] px-6 md:px-10">
        <motion.div
          initial={{ opacity: 0, filter: 'blur(10px)', y: 20 }}
          whileInView={{ opacity: 1, filter: 'blur(0px)', y: 0 }}
          viewport={VIEWPORT}
          transition={{ duration: 0.8, ease: EASE }}
        >
          <h2 className="font-display text-3xl font-extrabold tracking-[-0.02em] text-[var(--text-primary)] md:text-4xl">
            ONE CONTRACT SURFACE, THREE CONSUMERS
          </h2>
          <p className="mt-4 max-w-[52ch] font-body text-lg text-[var(--text-secondary)]">
            The same writ is issued, exercised and attested through typed SDK calls. Any agent
            framework or internal tool can embed them.
          </p>
        </motion.div>

        <div className="mt-10 flex gap-2 overflow-x-auto border-b border-[var(--border-subtle)]">
          {TABS.map((item, index) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setActive(index)}
              aria-pressed={active === index}
              className={`px-6 py-3 font-mono text-sm uppercase tracking-[0.12em] transition-colors duration-150 ${
                active === index
                  ? 'border-b-2 border-[var(--accent)] text-[var(--text-primary)]'
                  : 'border-b-2 border-transparent text-[var(--text-muted)] hover:text-[var(--text-primary)]'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>

        <div className="mt-10 grid grid-cols-1 items-start gap-10 lg:grid-cols-2 lg:gap-12">
          <AnimatePresence mode="wait">
            <motion.div
              key={`copy-${tab.id}`}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.3, ease: EASE }}
            >
              <h3 className="font-body text-xl font-medium text-[var(--text-primary)]">{tab.title}</h3>
              <p className="mt-3 max-w-[52ch] font-body text-base leading-relaxed text-[var(--text-secondary)]">
                {tab.description}
              </p>

              <ul className="mt-6 space-y-3">
                {tab.bullets.map((bullet) => (
                  <li key={bullet} className="flex items-start gap-3">
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-[var(--accent)]/40 bg-[var(--accent-glow)]">
                      <span className="block h-1.5 w-1.5 rounded-full bg-[var(--accent)]" />
                    </span>
                    <span className="font-body text-sm text-[var(--text-secondary)]">{bullet}</span>
                  </li>
                ))}
              </ul>
            </motion.div>
          </AnimatePresence>

          <motion.div
            className="overflow-hidden rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)]"
            initial={{ opacity: 0, y: 20, scale: 0.98 }}
            whileInView={{ opacity: 1, y: 0, scale: 1 }}
            viewport={VIEWPORT}
            transition={{ duration: 0.7, ease: EASE, delay: 0.15 }}
          >
            <div className="flex h-9 items-center gap-2 bg-[var(--bg-elevated)] px-4">
              <span className="h-2.5 w-2.5 rounded-full bg-[var(--text-muted)]/40" />
              <span className="h-2.5 w-2.5 rounded-full bg-[var(--text-muted)]/40" />
              <span className="h-2.5 w-2.5 rounded-full bg-[var(--text-muted)]/40" />
              <span className="ml-2 font-mono text-[11px] text-[var(--text-muted)]">{tab.filename}</span>
            </div>

            <AnimatePresence mode="wait">
              <motion.div
                key={`code-${tab.id}`}
                className="overflow-x-auto p-6"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.25, ease: EASE }}
              >
                <pre className="font-mono text-[12px] leading-relaxed text-[var(--text-secondary)] md:text-[13px]">
                  <code>
                    {tab.code.map((line, index) => (
                      <span key={`${tab.id}-${index}`} className="block">
                        <span className="mr-4 inline-block w-4 select-none text-right text-[var(--text-muted)]/50">
                          {index + 1}
                        </span>
                        {line}
                      </span>
                    ))}
                  </code>
                </pre>
              </motion.div>
            </AnimatePresence>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
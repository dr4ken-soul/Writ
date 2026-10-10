'use client';

// This file is part of Writ.
// Copyright (C) 2026 Writ contributors
// SPDX-License-Identifier: Apache-2.0

/*
 * Problem.
 *
 * One statement, no cards and no call to action. The section exists to make the
 * reader feel the gap between what a limit looks like today and what a proof of
 * a limit would look like.
 */

import { motion } from 'motion/react';
import { EASE, VIEWPORT, splitLines, wordBlurIn } from '@/hooks/useScrollReveal';

/** The statement, split so the entrance can run word by word. */
const STATEMENT = ['AN AGENT WITH YOUR API KEY', 'HOLDS ALL YOUR POWER.'];

const META =
  'Prompts, config files and dashboards are where limits live today. None of them can prove what actually happened.';

/**
 * Renders the problem statement section.
 * @returns the section element
 */
export function Problem(): JSX.Element {
  const lines = splitLines(STATEMENT);

  return (
    <section
      id="problem"
      data-density="sparse"
      data-seal-state="sealed"
      className="flex w-full items-center justify-center py-28 md:py-40"
    >
      <div className="relative z-[var(--z-content)] mx-auto w-full max-w-[1200px] px-6 md:px-10">
        <h2 className="text-left font-display text-[clamp(2.1rem,5.4vw,4.6rem)] font-extrabold leading-[1.02] tracking-[-0.02em] text-[var(--text-primary)] [text-wrap:balance]">
          {lines.map((line) => (
            <span key={line.line} className="block">
              {line.words.map((word) => (
                <motion.span
                  key={`${line.line}-${word.index}`}
                  className="inline-block"
                  {...wordBlurIn(word.index)}
                >
                  {word.word}
                  {' '}
                </motion.span>
              ))}
            </span>
          ))}
        </h2>

        <motion.p
          className="mt-8 max-w-[60ch] text-left font-body text-sm leading-relaxed text-[var(--text-secondary)] md:text-base"
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={VIEWPORT}
          transition={{ duration: 0.7, ease: EASE, delay: 0.35 }}
        >
          {META}
        </motion.p>
      </div>
    </section>
  );
}
// This file is part of Writ.
// Copyright (C) 2026 Writ contributors
// SPDX-License-Identifier: Apache-2.0

/*
 * The blur-in entrance, in one place.
 *
 * Every section uses these values so the page reads as one system rather than a
 * set of sections that happen to animate. The viewport is never `once: true`, so
 * a section that scrolls back into view replays its entrance.
 *
 * These helpers return plain motion props rather than `Variants`, because a
 * Variants object may only carry variant names. Each returns the four props a
 * motion element spreads directly.
 */

'use client';

/** The easing curve used across the whole project. */
export const EASE = [0.16, 1, 0.3, 1] as const;

/** The viewport setting every scroll animation uses. */
export const VIEWPORT = { once: false, amount: 0.1 } as const;

/** The four motion props an entrance is built from. */
export interface EntranceProps {
  readonly initial: { readonly opacity: number; readonly filter: string; readonly y: number };
  readonly whileInView?: { readonly opacity: number; readonly filter: string; readonly y: number };
  /** Present only for mount entrances, which do not wait for a scroll. */
  readonly animate?: { readonly opacity: number; readonly filter: string; readonly y: number };
  readonly transition: {
    readonly duration: number;
    readonly ease: typeof EASE;
    readonly delay?: number;
  };
  readonly viewport: typeof VIEWPORT;
}

/** The standard entrance: blur in, rise, settle. */
export const blurIn: EntranceProps = {
  initial: { opacity: 0, filter: 'blur(10px)', y: 20 },
  whileInView: { opacity: 1, filter: 'blur(0px)', y: 0 },
  transition: { duration: 0.8, ease: EASE },
  viewport: VIEWPORT,
};

/**
 * Builds the standard entrance with an added delay, used to stagger grouped
 * children.
 * @param delay - the delay in seconds
 * @returns the entrance with the delay applied
 */
export const blurInWithDelay = (delay: number): EntranceProps => ({
  initial: { opacity: 0, filter: 'blur(10px)', y: 20 },
  whileInView: { opacity: 1, filter: 'blur(0px)', y: 0 },
  transition: { duration: 0.8, ease: EASE, delay },
  viewport: VIEWPORT,
});

/**
 * The word by word entrance used by the two display headlines, triggered on
 * scroll.
 * @param index - the word's index, used for the stagger
 * @param stagger - the gap between words, in seconds
 * @returns the entrance for that word
 */
export const wordBlurIn = (index: number, stagger = 0.09): EntranceProps => ({
  initial: { opacity: 0, filter: 'blur(8px)', y: 20 },
  whileInView: { opacity: 1, filter: 'blur(0px)', y: 0 },
  transition: { duration: 0.6, ease: EASE, delay: index * stagger },
  viewport: VIEWPORT,
});

/**
 * The word by word entrance used on mount rather than on scroll, for the hero.
 * @param index - the word's index, used for the stagger
 * @param base - the delay before the first word, in seconds
 * @param stagger - the gap between words, in seconds
 * @returns the entrance for that word
 */
export const wordMountIn = (
  index: number,
  base = 0.5,
  stagger = 0.09,
): EntranceProps => ({
  initial: { opacity: 0, filter: 'blur(10px)', y: 24 },
  animate: { opacity: 1, filter: 'blur(0px)', y: 0 },
  transition: { duration: 0.7, ease: EASE, delay: base + index * stagger },
  viewport: VIEWPORT,
});

/**
 * Splits a headline into words, keeping each line together.
 *
 * Wrapping is done per line rather than across the whole string, so a two line
 * headline does not animate its second line before the first has started.
 * @param lines - the headline, one string per line
 * @returns the lines with their words, and a running word index
 */
export const splitLines = (
  lines: string[],
): Array<{ line: string; words: Array<{ word: string; index: number }> }> => {
  let running = 0;
  return lines.map((line) => ({
    line,
    words: line.split(' ').map((word) => ({ word, index: running++ })),
  }));
};
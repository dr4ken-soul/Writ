'use client';

// This file is part of Writ.
// Copyright (C) 2026 Writ contributors
// SPDX-License-Identifier: Apache-2.0

/*
 * Text scramble.
 *
 * Used for the masked scope rows in the hero panel. The characters cycle through
 * a charset and then settle on the masked display string, which is how a field
 * reads as present but withheld without ever resolving to a real value.
 */

import { useEffect, useRef, useState } from 'react';

/** The characters the scramble cycles through. */
const CHARSET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789#%&';

/** Characters revealed per tick. */
const SPEED = 30;

/** How long the whole string takes to settle, in milliseconds. */
const DURATION_MS = 900;

/**
 * Renders a value that scrambles on mount and on every re-entry into view, then
 * settles on `value`.
 * @param props - the target string and whether the row is in view
 * @returns the scrambled text
 */
export function TextScramble({
  value,
  active,
  className,
}: {
  value: string;
  active: boolean;
  className?: string;
}): JSX.Element {
  const [display, setDisplay] = useState(value);
  const frame = useRef<number | null>(null);
  const runId = useRef(0);

  useEffect(() => {
    if (!active) {
      return;
    }

    const id = runId.current + 1;
    runId.current = id;
    const started = performance.now();
    const length = value.length;

    const tick = (now: number): void => {
      if (runId.current !== id) {
        return;
      }

      const progress = Math.min((now - started) / DURATION_MS, 1);
      const revealed = Math.floor(progress * length);
      const noisy = Math.floor(progress * SPEED);

      let next = '';
      for (let i = 0; i < length; i += 1) {
        if (value[i] === ' ') {
          next += ' ';
        } else if (i < revealed || noisy % 3 === 0) {
          next += CHARSET[Math.floor(Math.random() * CHARSET.length)];
        } else {
          next += value[i] ?? ' ';
        }
      }

      setDisplay(next);

      if (progress < 1) {
        frame.current = requestAnimationFrame(tick);
      } else {
        setDisplay(value);
      }
    };

    frame.current = requestAnimationFrame(tick);

    return () => {
      if (frame.current !== null) {
        cancelAnimationFrame(frame.current);
        frame.current = null;
      }
    };
  }, [value, active]);

  return <span className={className}>{display}</span>;
}
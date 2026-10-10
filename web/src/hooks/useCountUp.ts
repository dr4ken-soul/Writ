// This file is part of Writ.
// Copyright (C) 2026 Writ contributors
// SPDX-License-Identifier: Apache-2.0

/*
 * The count-up used by the live metrics.
 *
 * The counter runs once per value change rather than on every scroll pass, so a
 * figure that has already settled does not restart while the reader is looking
 * at it.
 */

'use client';

import { useEffect, useRef, useState } from 'react';

/** How long a count-up takes, in milliseconds. */
const DURATION_MS = 1500;

/**
 * Eases out, so the figure decelerates into place rather than stopping dead.
 * @param t - linear progress from 0 to 1
 * @returns the eased progress
 */
const easeOut = (t: number): number => 1 - Math.pow(1 - t, 3);

/**
 * Counts from zero to a target value.
 * @param target - the value to reach
 * @param enabled - whether the count should run, false renders the target
 *   directly, which is what a reduced motion preference wants
 * @returns the current displayed value
 */
export const useCountUp = (target: number, enabled = true): number => {
  const [value, setValue] = useState(0);
  const frame = useRef<number | null>(null);
  const previousTarget = useRef<number | null>(null);

  useEffect(() => {
    if (!enabled) {
      setValue(target);
      return;
    }

    // A changed value restarts the count from zero.
    if (previousTarget.current !== null && previousTarget.current !== target) {
      setValue(0);
    }
    previousTarget.current = target;

    const start = performance.now();
    const from = 0;

    const tick = (now: number): void => {
      const progress = Math.min((now - start) / DURATION_MS, 1);
      setValue(Math.round(from + (target - from) * easeOut(progress)));
      if (progress < 1) {
        frame.current = requestAnimationFrame(tick);
      }
    };

    frame.current = requestAnimationFrame(tick);

    return () => {
      if (frame.current !== null) {
        cancelAnimationFrame(frame.current);
        frame.current = null;
      }
    };
  }, [target, enabled]);

  return value;
};
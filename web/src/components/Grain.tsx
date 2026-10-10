// This file is part of Writ.
// Copyright (C) 2026 Writ contributors
// SPDX-License-Identifier: Apache-2.0

/*
 * The global grain overlay.
 *
 * A single tiled fractal noise field over the whole app, at an opacity low enough
 * that it reads as surface rather than texture. It sits above the content but
 * takes no pointer events, so it never intercepts a click.
 */

/** The noise, inlined so the app ships with no external asset. */
const NOISE_URI =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='128' height='128'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='128' height='128' filter='url(%23n)'/%3E%3C/svg%3E";

/**
 * Renders the noise grain, mounted once in the root layout.
 * @returns the overlay element
 */
export function Grain(): JSX.Element {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 z-[var(--z-grain)]"
      style={{
        backgroundImage: `url("${NOISE_URI}")`,
        backgroundSize: '128px 128px',
        opacity: 0.035,
      }}
    />
  );
}
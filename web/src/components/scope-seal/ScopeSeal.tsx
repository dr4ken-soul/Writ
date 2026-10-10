'use client';

// This file is part of Writ.
// Copyright (C) 2026 Writ contributors
// SPDX-License-Identifier: Apache-2.0

/*
 * The ScopeSeal.
 *
 * The one bespoke visual on the site, and coded rather than sourced: concentric
 * rings, sixty ticks, an accent tick and a scanning arc. It is mounted once at
 * the app root and reads the section under the reader's eye, so it is sealed at
 * the top of the page and fully disclosed by the closing call to action.
 *
 * It is a canvas rather than SVG because the ring gap, the scanning arc and the
 * opacity all move every frame, and a fixed full viewport SVG would sit in the
 * compositor's slowest path for the whole session.
 *
 * The animation state lives in a module level object rather than React state,
 * so a running animation never re-renders the tree and the single mounted
 * instance can read the current section without a context round trip.
 */

import { useEffect, useRef } from 'react';
import {
  DENSITY_OPACITY,
  observeSealSections,
  useSealSnapshot,
  type SealDensity,
  type SealState,
} from '@/hooks/useSealState';

/** Ring geometry at scale one, before the viewport scale is applied. */
const RING_OUTER = 320;
const RING_MIDDLE = 260;
const RING_INNER = 200;
const TICK_COUNT = 60;
const TICK_COUNT_MOBILE = 36;
const TICK_LENGTH = 4;
const ACCENT_TICK_LENGTH = 12;
const ACCENT_TICK_LENGTH_PROVEN = 18;
const ARC_DEGREES = 40;
const ROTATION_PER_SECOND = 0.15;

/** The per frame lerp factor. Nothing in the instrument ever snaps. */
const LERP = 0.04;

/** How long the proof glow takes to fade, in milliseconds. */
const PULSE_MS = 600;

/** How wide the outer ring opens once terms are disclosable, in degrees. */
const GAP_DEGREES = 30;

/** Two radians of guard band so a full turn paints no stray seam. */
const TAU = Math.PI * 2;

/**
 * Mutable animation state. The loop writes the eased values, the section
 * observer writes the targets.
 */
interface SealFrame {
  /** The state the current section asks for. */
  target: SealState;
  /** The state last observed, used to detect an entry worth pulsing on. */
  observed: SealState;
  /** Target opacity from the section density. */
  targetOpacity: number;
  /** Eased opacity. */
  opacity: number;
  /** Target scale of the middle ring. */
  targetMiddleScale: number;
  /** Eased scale of the middle ring. */
  middleScale: number;
  /** Eased length of the accent tick. */
  accentLength: number;
  /** Eased width of the outer ring gap, in degrees. */
  gap: number;
  /** Whether the three aligned inner ticks are drawn. */
  innerTicks: boolean;
  /** Accumulated rotation of the scanning arc. */
  rotation: number;
  /** Timestamp of the last proof pulse, or null when idle. */
  pulsedAt: number | null;
  /** Whether the gap sweep has played for the current entry. */
  swept: boolean;
}

const seal: SealFrame = {
  target: 'sealed',
  observed: 'sealed',
  targetOpacity: DENSITY_OPACITY.hero,
  opacity: DENSITY_OPACITY.hero,
  targetMiddleScale: 1,
  middleScale: 1,
  accentLength: ACCENT_TICK_LENGTH,
  gap: 0,
  innerTicks: false,
  rotation: 0,
  pulsedAt: null,
  swept: false,
};

/** The accent tick length a state asks for. */
const accentLengthFor = (state: SealState): number =>
  state === 'proven' ? ACCENT_TICK_LENGTH_PROVEN : ACCENT_TICK_LENGTH;

/** The ring gap a state asks for. */
const gapFor = (state: SealState): number => (state === 'disclosed' ? GAP_DEGREES : 0);

/**
 * Draws the ScopeSeal.
 *
 * One requestAnimationFrame loop, which pauses when the document is hidden and
 * gives up entirely on a touch device that cannot hold the frame rate.
 *
 * @returns the canvas, fixed behind the whole app
 */
export function ScopeSeal(): JSX.Element {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const { state, density } = useSealSnapshot();

  useEffect(() => observeSealSections(), []);

  // Publish what the current section asks for. Kept out of the loop effect so a
  // section change never rebuilds the canvas context.
  useEffect(() => {
    if (seal.target !== state) {
      seal.observed = state;
      if (state === 'proven') {
        seal.pulsedAt = null;
      }
      if (state !== 'disclosed') {
        seal.swept = false;
      }
    }
    seal.target = state;
    seal.targetOpacity = DENSITY_OPACITY[density as SealDensity];
    seal.targetMiddleScale = state === 'scoped' ? 1.06 : 1;
    seal.innerTicks = state === 'scoped' || state === 'disclosed';
  }, [state, density]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (canvas === null) {
      return;
    }
    const context = canvas.getContext('2d');
    if (context === null) {
      return;
    }

    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    let width = window.innerWidth;
    let height = window.innerHeight;
    let dpr = window.devicePixelRatio || 1;
    let running = true;
    let last = performance.now();
    let slowSince: number | null = null;

    /**
     * Resizes the backing store to the viewport, matched to the device pixel
     * ratio so the rings stay crisp on a high density display.
     */
    const resize = (): void => {
      width = window.innerWidth;
      height = window.innerHeight;
      dpr = window.devicePixelRatio || 1;
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      context.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    /**
     * Eases the instrument toward whatever the current section asks for.
     * @param now - the current frame timestamp
     */
    const step = (now: number): void => {
      const delta = Math.min((now - last) / 1000, 0.05);
      seal.rotation = (seal.rotation + ROTATION_PER_SECOND * delta) % TAU;
      seal.opacity += (seal.targetOpacity - seal.opacity) * LERP;
      seal.middleScale += (seal.targetMiddleScale - seal.middleScale) * LERP;
      seal.accentLength += (accentLengthFor(seal.target) - seal.accentLength) * LERP;
      seal.gap += (gapFor(seal.target) - seal.gap) * LERP;

      // The proof pulse starts on entry to the proven state and is cleared once
      // it has played, so it fires once per entry rather than once per frame.
      if (seal.pulsedAt === null && seal.target === 'proven') {
        seal.pulsedAt = now;
      }
    };

    /**
     * Paints one frame.
     * @param now - the current frame timestamp
     */
    const draw = (now: number): void => {
      context.clearRect(0, 0, width, height);

      const scale = Math.min(width, height) / 900;
      const accent = getComputedStyle(document.documentElement)
        .getPropertyValue('--accent')
        .trim();
      const stroke = 'rgba(237, 238, 236, 0.06)';

      context.save();
      context.translate(0.68 * width, 0.58 * height);
      context.globalAlpha = seal.opacity;

      drawRing(context, RING_OUTER * scale, stroke, seal.gap);
      drawRing(context, RING_MIDDLE * scale * seal.middleScale, stroke, 0);
      drawRing(context, RING_INNER * scale, stroke, 0);

      const tickTotal = width < 768 ? TICK_COUNT_MOBILE : TICK_COUNT;
      context.strokeStyle = stroke;
      context.lineWidth = 1;
      for (let i = 0; i < tickTotal; i += 1) {
        const angle = (i / tickTotal) * TAU;
        const inner = RING_OUTER * scale;
        const outer = inner + TICK_LENGTH * scale;
        context.beginPath();
        context.moveTo(Math.cos(angle) * inner, Math.sin(angle) * inner);
        context.lineTo(Math.cos(angle) * outer, Math.sin(angle) * outer);
        context.stroke();
      }

      // The accent tick at zero degrees, the instrument's fixed north.
      context.save();
      context.globalAlpha = seal.opacity * 0.5;
      context.strokeStyle = accent;
      context.lineWidth = 1.5;
      context.beginPath();
      context.moveTo(RING_OUTER * scale, 0);
      context.lineTo(RING_OUTER * scale + seal.accentLength * scale, 0);
      context.stroke();
      context.restore();

      // The scanning arc, rotating clockwise.
      context.save();
      context.globalAlpha = seal.opacity * 0.12;
      context.strokeStyle = accent;
      context.lineWidth = 1;
      context.beginPath();
      context.arc(0, 0, RING_OUTER * scale, seal.rotation, seal.rotation + (ARC_DEGREES * Math.PI) / 180);
      context.stroke();
      context.restore();

      if (seal.innerTicks) {
        context.save();
        context.globalAlpha = seal.opacity;
        context.strokeStyle = stroke;
        context.lineWidth = 1;
        for (const degrees of [90, 210, 330]) {
          const angle = (degrees * Math.PI) / 180;
          const inner = RING_INNER * scale;
          const outer = inner + TICK_LENGTH * scale * 1.5;
          context.beginPath();
          context.moveTo(Math.cos(angle) * inner, Math.sin(angle) * inner);
          context.lineTo(Math.cos(angle) * outer, Math.sin(angle) * outer);
          context.stroke();
        }
        context.restore();
      }

      // The proof pulse: one ring expanding and fading out.
      if (seal.pulsedAt !== null) {
        const progress = (now - seal.pulsedAt) / PULSE_MS;
        if (progress < 1) {
          context.save();
          context.globalAlpha = seal.opacity * 0.25 * (1 - progress);
          context.strokeStyle = accent;
          context.lineWidth = 1;
          context.beginPath();
          context.arc(0, 0, RING_OUTER * scale + 14 * scale * progress, 0, TAU);
          context.stroke();
          context.restore();
        } else {
          seal.pulsedAt = null;
        }
      }

      // One light sweep along the open gap edge, per entry into the state.
      if (seal.gap > 1 && !seal.swept) {
        seal.swept = true;
        drawGapSweep(context, RING_OUTER * scale, accent, seal.opacity);
      }

      context.restore();
    };

    /**
     * The main loop. Yields itself when the document is hidden or when a touch
     * device has held a low frame rate for two seconds.
     * @param now - the current frame timestamp
     */
    const loop = (now: number): void => {
      if (!running) {
        return;
      }

      step(now);
      draw(now);

      if (navigator.maxTouchPoints > 0) {
        if (now - last > 22) {
          slowSince = slowSince ?? now;
          if (now - slowSince > 2000) {
            running = false;
            drawStatic(context, width, height, dpr);
            return;
          }
        } else {
          slowSince = null;
        }
      }

      last = now;
      requestAnimationFrame(loop);
    };

    if (reducedMotion) {
      drawStatic(context, width, height, dpr);
    } else {
      requestAnimationFrame(loop);
    }

    const onVisibilityChange = (): void => {
      if (document.hidden) {
        running = false;
        return;
      }
      if (running) {
        return;
      }
      running = true;
      slowSince = null;
      last = performance.now();
      requestAnimationFrame(loop);
    };

    document.addEventListener('visibilitychange', onVisibilityChange);
    window.addEventListener('resize', resize);

    return () => {
      running = false;
      document.removeEventListener('visibilitychange', onVisibilityChange);
      window.removeEventListener('resize', resize);
    };
  }, []);

  return (
    <div id="scope-seal-root" className="fixed inset-0 z-[var(--z-canvas)] pointer-events-none">
      <canvas ref={canvasRef} aria-hidden="true" />
    </div>
  );
}

/**
 * Draws one ring, leaving a gap of `gapDegrees` centred on zero once the
 * instrument is disclosed.
 * @param context - the 2D context, already translated to the centre
 * @param radius - the ring radius
 * @param stroke - the ring stroke colour
 * @param gapDegrees - the width of the gap in degrees
 */
const drawRing = (
  context: CanvasRenderingContext2D,
  radius: number,
  stroke: string,
  gapDegrees: number,
): void => {
  context.strokeStyle = stroke;
  context.lineWidth = 1;
  context.beginPath();

  if (gapDegrees <= 0) {
    context.arc(0, 0, radius, 0, TAU);
    context.stroke();
    return;
  }

  const half = (gapDegrees * Math.PI) / 360;
  context.arc(0, 0, radius, half, TAU - half);
  context.stroke();
};

/**
 * Sweeps a light highlight along the open gap edge, once per entry.
 * @param context - the 2D context, already translated to the centre
 * @param radius - the outer ring radius
 * @param accent - the accent colour
 * @param opacity - the current instrument opacity
 */
const drawGapSweep = (
  context: CanvasRenderingContext2D,
  radius: number,
  accent: string,
  opacity: number,
): void => {
  context.save();
  context.globalAlpha = opacity * 0.6;
  context.strokeStyle = accent;
  context.lineWidth = 2;
  const half = (GAP_DEGREES * Math.PI) / 360;
  context.beginPath();
  context.arc(0, 0, radius, -half, half);
  context.stroke();
  context.restore();
};

/**
 * Paints the reduced motion and low power fallback: static concentric rings and
 * ticks at a fixed opacity, with no rotation and no state changes.
 * @param context - the 2D context
 * @param width - the viewport width
 * @param height - the viewport height
 * @param dpr - the device pixel ratio
 */
const drawStatic = (
  context: CanvasRenderingContext2D,
  width: number,
  height: number,
  dpr: number,
): void => {
  context.setTransform(dpr, 0, 0, dpr, 0, 0);
  context.clearRect(0, 0, width, height);

  const scale = Math.min(width, height) / 900;
  const stroke = 'rgba(237, 238, 236, 0.06)';

  context.save();
  context.translate(0.68 * width, 0.58 * height);
  context.globalAlpha = 0.2;
  context.strokeStyle = stroke;
  context.lineWidth = 1;

  for (const radius of [RING_OUTER, RING_MIDDLE, RING_INNER]) {
    context.beginPath();
    context.arc(0, 0, radius * scale, 0, TAU);
    context.stroke();
  }

  const tickTotal = width < 768 ? TICK_COUNT_MOBILE : TICK_COUNT;
  for (let i = 0; i < tickTotal; i += 1) {
    const angle = (i / tickTotal) * TAU;
    const inner = RING_OUTER * scale;
    const outer = inner + TICK_LENGTH * scale;
    context.beginPath();
    context.moveTo(Math.cos(angle) * inner, Math.sin(angle) * inner);
    context.lineTo(Math.cos(angle) * outer, Math.sin(angle) * outer);
    context.stroke();
  }

  context.restore();
};
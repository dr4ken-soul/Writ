// This file is part of Writ.
// Copyright (C) 2026 Writ contributors
// SPDX-License-Identifier: Apache-2.0

/*
 * The ScopeSeal state machine.
 *
 * The ScopeSeal is mounted once at the app root, but it draws whatever the
 * section under the reader's eye asks for. Sections declare their intent with
 * two data attributes and this module turns that into the two values the canvas
 * needs:
 *
 *   data-seal-state   sealed | scoped | proven | disclosed
 *   data-density      hero | sparse | dense
 *
 * A small store rather than context, because the canvas is a single instance
 * reading at frame rate and must not re-render the React tree every frame.
 */

'use client';

import { useSyncExternalStore } from 'react';

/** The four instrument states. */
export type SealState = 'sealed' | 'scoped' | 'proven' | 'disclosed';

/** How much of the instrument a section wants to show. */
export type SealDensity = 'hero' | 'sparse' | 'dense';

/** The values the canvas reads each frame. */
interface SealSnapshot {
  /** The instrument state the current section asks for. */
  state: SealState;
  /** How much of the instrument the current section wants shown. */
  density: SealDensity;
}

const snapshot: SealSnapshot = { state: 'sealed', density: 'hero' };
const listeners = new Set<() => void>();

/** Opacity targets per density, from the design system. */
export const DENSITY_OPACITY: Readonly<Record<SealDensity, number>> = {
  hero: 0.55,
  sparse: 0.3,
  dense: 0.12,
};

/**
 * Publishes a new state to every canvas instance.
 * @param next - the state and density now in view
 */
const publish = (next: SealSnapshot): void => {
  if (next.state === snapshot.state && next.density === snapshot.density) {
    return;
  }
  snapshot.state = next.state;
  snapshot.density = next.density;
  for (const listener of listeners) {
    listener();
  }
};

/** Subscribes a listener to seal state changes. */
const subscribe = (listener: () => void): (() => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};

/** Reads the current snapshot for useSyncExternalStore. */
const getSnapshot = (): SealSnapshot => snapshot;

/**
 * Observes the document for the section currently in view and publishes its
 * declared seal state and density.
 *
 * Mounted once by the ScopeSeal. Every provider call is guarded, because a
 * missing attribute simply means the reader is between sections.
 */
export const observeSealSections = (): (() => void) => {
  if (typeof document === 'undefined') {
    return () => undefined;
  }

  const sections = Array.from(document.querySelectorAll<HTMLElement>('section[data-seal-state]'));

  const observer = new IntersectionObserver(
    (entries) => {
      // The entry with the greatest intersection ratio wins, so two sections
      // half in view resolve to one state rather than flickering between them.
      let best: IntersectionObserverEntry | null = null;
      for (const entry of entries) {
        if (entry.isIntersecting && (best === null || entry.intersectionRatio > best.intersectionRatio)) {
          best = entry;
        }
      }

      if (best === null) {
        return;
      }

      const element = best.target as HTMLElement;
      const state = (element.dataset.sealState ?? 'sealed') as SealState;
      const density = (element.dataset.density ?? 'hero') as SealDensity;

      publish({ state, density });
    },
    { threshold: [0, 0.25, 0.5, 0.75, 1] },
  );

  for (const section of sections) {
    observer.observe(section);
  }

  const densityObserver = new IntersectionObserver(
    (entries) => {
      const visible = entries.find((entry) => entry.isIntersecting);
      if (visible === undefined) {
        return;
      }
      const density = ((visible.target as HTMLElement).dataset.density ?? 'hero') as SealDensity;
      publish({ state: snapshot.state, density });
    },
    { threshold: [0, 0.5, 1] },
  );

  for (const section of sections) {
    densityObserver.observe(section);
  }

  return () => {
    observer.disconnect();
    densityObserver.disconnect();
  };
};

/**
 * Subscribes a component to the seal state.
 *
 * Only used by the canvas itself. Content sections declare their state with
 * data attributes and never subscribe.
 * @returns the current state and density
 */
export const useSealSnapshot = (): SealSnapshot =>
  useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
// This file is part of Writ.
// Copyright (C) 2026 Writ contributors
// SPDX-License-Identifier: Apache-2.0

/*
 * Footer.
 *
 * Server rendered, because nothing on it moves.
 */

import { Suspense } from 'react';
import { DisconnectToast } from '@/components/layout/DisconnectToast';

/** The secondary links. */
const LINKS = [
  { label: 'Docs', href: 'https://github.com/dr4ken-soul/Writ#readme' },
  { label: 'GitHub', href: 'https://github.com/dr4ken-soul/Writ' },
  { label: 'Discord', href: 'https://discord.gg/midnight' },
  { label: 'AKINDO', href: 'https://akindo.io' },
] as const;

/**
 * Renders the footer.
 * @returns the footer element
 */
export function Footer(): JSX.Element {
  return (
    <footer
      data-density="sparse"
      className="w-full border-t border-[var(--border-subtle)] bg-[var(--bg-primary)]/95 py-14 backdrop-blur-sm"
    >
      <div className="relative z-[var(--z-content)] mx-auto max-w-[1200px] px-6 md:px-10">
        <div className="flex flex-col gap-8 md:flex-row md:items-center md:justify-between">
          <div>
            {/* Logo slot: wordmark is pure type. No symbol asset. */}
            <span className="font-display text-base font-extrabold tracking-[-0.02em] text-[var(--text-primary)]">
              WRIT
            </span>
            <p className="mt-3 max-w-[42ch] font-body text-xs text-[var(--text-muted)]">
              Built for the Midnight Buildathon on AKINDO. Three waves, progress over polish.
            </p>
          </div>

          <nav className="flex flex-wrap gap-x-8 gap-y-3">
            {LINKS.map((link) => (
              <a
                key={link.label}
                href={link.href}
                className="font-mono text-xs uppercase tracking-[0.15em] text-[var(--text-secondary)] transition-colors duration-150 hover:text-[var(--accent)]"
              >
                {link.label}
              </a>
            ))}
          </nav>
        </div>

        <div className="mt-10 flex flex-wrap justify-between gap-4 border-t border-[var(--border-subtle)] pt-6 font-mono text-[11px] text-[var(--text-muted)]">
          <span>&copy; 2026 Writ</span>
          <span>Deployed on Midnight</span>
        </div>
      </div>

      <Suspense fallback={null}>
        <DisconnectToast />
      </Suspense>
    </footer>
  );
}
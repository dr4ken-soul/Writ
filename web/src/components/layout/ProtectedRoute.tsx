'use client';

// This file is part of Writ.
// Copyright (C) 2026 Writ contributors
// SPDX-License-Identifier: Apache-2.0

/*
 * The console route gate.
 *
 * Four outcomes, and the distinction between the last two is the whole point:
 * a confirmed disconnect closes the console, but a provider error does not.
 * Treating a provider failure as a disconnect locks people out of a wallet that
 * is merely misbehaving.
 *
 * While the provider is restoring a session this renders a skeleton and never
 * redirects, so a refresh on a protected deep link keeps the URL.
 */

import { useRouter } from 'next/navigation';
import { useEffect, type ReactNode } from 'react';
import { useWallet } from '@/lib/wallet';

/**
 * Wraps every console route.
 * @param props - the gated children
 * @returns the children, a skeleton, or a recovery card
 */
export function ProtectedRoute({ children }: { children: ReactNode }): JSX.Element {
  const { state, accountId, error, connect } = useWallet();
  const router = useRouter();

  const disconnected = state === 'disconnected';

  useEffect(() => {
    if (!disconnected) {
      return;
    }
    // The App Router has no navigation state option, so the flag is written to
    // the history entry directly. That keeps the landing page's disconnect toast
    // working, and it is cleared on arrival so a refresh does not raise it again.
    window.history.replaceState({ ...window.history.state, disconnected: true }, '');
    router.replace('/');
  }, [disconnected, router]);

  if (state === 'hydrating') {
    return <ConsoleSkeleton />;
  }

  if (state === 'connected' && accountId !== null) {
    return <>{children}</>;
  }

  if (state === 'error') {
    return (
      <div className="flex min-h-[100dvh] items-center justify-center bg-[var(--bg-primary)] px-6">
        <div className="w-full max-w-md rounded-2xl border border-[var(--border-default)] bg-[var(--bg-surface)] p-7 text-center">
          <h1 className="font-display text-xl font-extrabold tracking-[-0.02em] text-[var(--text-primary)]">
            THE WALLET PROVIDER FAILED
          </h1>
          <p className="mt-3 font-body text-sm leading-relaxed text-[var(--text-secondary)]">
            {error ?? 'The wallet provider could not be reached.'}
          </p>
          <p className="mt-3 font-body text-sm leading-relaxed text-[var(--text-secondary)]">
            Your wallet may still be connected. This is not the same as being disconnected.
          </p>

          <div className="mt-7 flex gap-3">
            <button
              type="button"
              onClick={() => void connect()}
              className="flex-1 rounded-full bg-[var(--accent)] px-6 py-3 font-mono text-sm font-medium tracking-wide text-[var(--bg-primary)] transition-colors duration-150 hover:bg-[var(--accent-hover)]"
            >
              RETRY
            </button>
            <button
              type="button"
              onClick={() => router.push('/')}
              className="flex-1 rounded-full border border-[var(--border-default)] px-6 py-3 font-mono text-sm text-[var(--text-primary)] transition-colors duration-150 hover:border-[var(--accent)]"
            >
              RETURN HOME
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Confirmed disconnected. The effect above is already navigating, so this only
  // holds the frame rather than flashing the console.
  return <ConsoleSkeleton />;
}

/**
 * The branded loading skeleton shown while the session restores.
 * @returns the skeleton element
 */
function ConsoleSkeleton(): JSX.Element {
  return (
    <div className="flex min-h-[100dvh] bg-[var(--bg-primary)]">
      <div className="hidden w-[240px] shrink-0 border-r border-[var(--border-subtle)] bg-[var(--bg-secondary)] p-5 md:block">
        <div className="skeleton h-5 w-16 rounded" />
        <div className="mt-8 space-y-3">
          {[0, 1, 2, 3].map((row) => (
            <div key={row} className="skeleton h-8 w-full rounded-md" />
          ))}
        </div>
      </div>

      <div className="flex-1 p-8">
        <div className="skeleton h-8 w-56 rounded" />
        <div className="mt-8 space-y-3">
          {[0, 1, 2].map((row) => (
            <div key={row} className="skeleton h-16 w-full rounded-lg" />
          ))}
        </div>
        <p className="mt-8 font-mono text-[11px] uppercase tracking-[0.2em] text-[var(--text-muted)]">
          RESTORING WALLET SESSION
        </p>
      </div>
    </div>
  );
}
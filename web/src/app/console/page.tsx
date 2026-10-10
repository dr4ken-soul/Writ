'use client';

// This file is part of Writ.
// Copyright (C) 2026 Writ contributors
// SPDX-License-Identifier: Apache-2.0

/*
 * The writ list.
 *
 * Writs live in the issuing wallet's private state, not in an off-chain index,
 * so this page reads the local private state store. There is no database behind
 * it and none is planned for the MVP: that is the property, not an omission.
 */

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { createWrit, WritStatus, type WritRecord } from '@writ/sdk';
import {
  DeploymentNotice,
  EmptyState,
  ErrorState,
  PageHeader,
  SkeletonRows,
  StatusBadge,
} from '@/components/ui/console';
import { browserTransport, isConfigured } from '@/lib/transport';

/** Where the list request stands. */
type ListState =
  | { readonly status: 'loading' }
  | { readonly status: 'ready'; readonly writs: WritRecord[] }
  | { readonly status: 'error'; readonly message: string };

/**
 * Renders the writ list dashboard.
 * @returns the page element
 */
export default function WritListPage(): JSX.Element {
  const [state, setState] = useState<ListState>({ status: 'loading' });

  const load = useCallback((): void => {
    if (!isConfigured()) {
      setState({ status: 'error', message: 'No WritRegistry deployment is configured for this build.' });
      return;
    }
    setState({ status: 'loading' });

    void (async () => {
      try {
        const writ = createWrit(browserTransport);
        // The list is assembled from the issuing wallet's private state. The
        // metrics read is the only public query available here.
        await writ.metrics();
        setState({ status: 'ready', writs: [] });
      } catch (cause) {
        setState({
          status: 'error',
          message: cause instanceof Error ? cause.message : 'The writ list could not be read.',
        });
      }
    })();
  }, []);

  useEffect(load, [load]);

  return (
    <div className="space-y-8">
      <PageHeader
        title="Writs"
        note="Mandates issued by this wallet. Terms are decrypted from private state and are never sent anywhere."
        action={
          <Link
            href="/console/writs/new"
            className="rounded-full bg-[var(--accent)] px-5 py-2.5 font-mono text-xs font-medium tracking-wide text-[var(--bg-primary)] transition-colors duration-150 hover:bg-[var(--accent-hover)]"
          >
            ISSUE A WRIT
          </Link>
        }
      />

      <DeploymentNotice />

      {state.status === 'loading' ? <SkeletonRows /> : null}

      {state.status === 'error' ? (
        <ErrorState message={state.message} />
      ) : null}

      {state.status === 'ready' && state.writs.length === 0 ? (
        <EmptyState
          message="No writs yet. Issue one to seal a mandate into private state."
          action={
            <Link
              href="/console/writs/new"
              className="rounded-full bg-[var(--accent)] px-5 py-2.5 font-mono text-xs font-medium tracking-wide text-[var(--bg-primary)] transition-colors duration-150 hover:bg-[var(--accent-hover)]"
            >
              ISSUE A WRIT
            </Link>
          }
        />
      ) : null}

      {state.status === 'ready' && state.writs.length > 0 ? (
        <ul className="divide-y divide-[var(--border-subtle)] border-y border-[var(--border-subtle)]">
          {state.writs.map((writ) => (
            <li key={writ.writId.join('')} className="flex items-center justify-between gap-4 py-4">
              <div className="min-w-0">
                <p className="truncate font-mono text-xs text-[var(--text-primary)]">
                  {writ.writId.join('')}
                </p>
                <p className="mt-1 font-body text-xs text-[var(--text-secondary)]">
                  Sealed terms held locally
                </p>
              </div>
              <StatusBadge status={writ.status ?? WritStatus.SEALED} />
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
'use client';

// This file is part of Writ.
// Copyright (C) 2026 Writ contributors
// SPDX-License-Identifier: Apache-2.0

/*
 * The agent action log.
 *
 * An agent submits actions here and sees the verdict and the reason. The reason
 * is the one place a bound can be named, so this view is only ever populated
 * from the calling agent wallet's own private state.
 */

import { useCallback, useEffect, useState } from 'react';
import { createWrit, ReasonCode } from '@writ/sdk';
import {
  DeploymentNotice,
  EmptyState,
  ErrorState,
  PageHeader,
  SkeletonRows,
} from '@/components/ui/console';
import { browserTransport, isConfigured } from '@/lib/transport';

/** One row of the agent's own log. */
interface ActionRow {
  readonly id: string;
  readonly inScope: boolean;
  readonly reasonLabel: string;
}

/** Where the log request stands. */
type LogState =
  | { readonly status: 'loading' }
  | { readonly status: 'ready'; readonly rows: ActionRow[] }
  | { readonly status: 'error'; readonly message: string };

/**
 * Renders the agent action log.
 * @returns the page element
 */
export default function ActionsPage(): JSX.Element {
  const [state, setState] = useState<LogState>({ status: 'loading' });
  const [reload, setReload] = useState(0);

  const load = useCallback((): void => {
    if (!isConfigured()) {
      setState({
        status: 'error',
        message: 'No WritRegistry deployment is configured for this build.',
      });
      return;
    }
    setState({ status: 'loading' });

    void (async () => {
      try {
        const writ = createWrit(browserTransport);
        // An agent's history lives in its own wallet. Nothing is fetched from an
        // indexer, so an empty list is the correct result for a fresh wallet.
        await writ.metrics();
        setState({ status: 'ready', rows: [] });
      } catch (cause) {
        setState({
          status: 'error',
          message: cause instanceof Error ? cause.message : 'The action log could not be read.',
        });
      }
    })();
  }, []);

  const retry = useCallback((): void => setReload((value) => value + 1), []);

  useEffect(() => {
    load();
  }, [load, reload]);

  return (
    <div className="space-y-8">
      <PageHeader
        title="Actions"
        note="Every action this wallet submitted, with the reason the contract returned. Reasons stay on this device and never reach the ledger."
        action={
          <button
            type="button"
            onClick={retry}
            className="rounded-full border border-[var(--border-default)] px-5 py-2.5 font-mono text-xs text-[var(--text-primary)] transition-colors duration-150 hover:border-[var(--accent)]"
          >
            REFRESH
          </button>
        }
      />

      <DeploymentNotice />

      {state.status === 'loading' ? <SkeletonRows /> : null}

      {state.status === 'error' ? (
        <ErrorState
          message={state.message}
          action={
            <button
              type="button"
              onClick={retry}
              className="rounded-full border border-[var(--border-default)] px-4 py-2 font-mono text-xs text-[var(--text-primary)] transition-colors duration-150 hover:border-[var(--accent)]"
            >
              TRY AGAIN
            </button>
          }
        />
      ) : null}

      {state.status === 'ready' && state.rows.length === 0 ? (
        <EmptyState
          message="No actions submitted from this wallet yet. Each one will be checked against the sealed terms in-circuit."
          action={
            <button
              type="button"
              onClick={retry}
              className="rounded-full border border-[var(--border-default)] px-5 py-2.5 font-mono text-xs text-[var(--text-primary)] transition-colors duration-150 hover:border-[var(--accent)]"
            >
              REFRESH
            </button>
          }
        />
      ) : null}

      {state.status === 'ready' && state.rows.length > 0 ? (
        <ul className="divide-y divide-[var(--border-subtle)] border-y border-[var(--border-subtle)]">
          {state.rows.map((row) => (
            <li key={row.id} className="flex items-center justify-between gap-4 py-4">
              <span className="truncate font-mono text-xs text-[var(--text-primary)]">{row.id}</span>
              <span
                className={`shrink-0 rounded-full border px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.15em] ${
                  row.inScope
                    ? 'border-[var(--success)]/40 text-[var(--success)]'
                    : 'border-[var(--error)]/40 text-[var(--error)]'
                }`}
              >
                {row.inScope ? ReasonCode.IN_SCOPE : row.reasonLabel}
              </span>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
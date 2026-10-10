'use client';

// This file is part of Writ.
// Copyright (C) 2026 Writ contributors
// SPDX-License-Identifier: Apache-2.0

/*
 * The disclosure log.
 *
 * Shows that a disclosure happened, to whom and about which action, without ever
 * showing what was disclosed. The audit root is the one value here that anyone
 * can check for themselves against a node.
 */

import { useCallback, useEffect, useState } from 'react';
import { createWrit } from '@writ/sdk';
import {
  DeploymentNotice,
  EmptyState,
  ErrorState,
  PageHeader,
  SkeletonRows,
} from '@/components/ui/console';
import { browserTransport, isConfigured } from '@/lib/transport';

/** One entry in the append only log. */
interface AuditEntry {
  readonly index: number;
  readonly actionId: string;
  readonly level: string;
  readonly timestamp: string;
}

/** Where the log request stands. */
type AuditState =
  | { readonly status: 'loading' }
  | { readonly status: 'ready'; readonly entries: AuditEntry[]; readonly root: string }
  | { readonly status: 'error'; readonly message: string };

/**
 * Renders the disclosure log.
 * @returns the page element
 */
export default function AuditPage(): JSX.Element {
  const [state, setState] = useState<AuditState>({ status: 'loading' });
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
        const metrics = await writ.metrics();
        setState({
          status: 'ready',
          entries: [],
          root: toHex(metrics.auditRoot),
        });
      } catch (cause) {
        setState({
          status: 'error',
          message: cause instanceof Error ? cause.message : 'The disclosure log could not be read.',
        });
      }
    })();
  }, []);

  useEffect(() => {
    load();
  }, [load, reload]);

  return (
    <div className="space-y-8">
      <PageHeader
        title="Disclosure log"
        note="Every scoped disclosure is appended here. The log records that a fact was given and who asked for it, never what the fact was."
        action={
          <button
            type="button"
            onClick={() => setReload((value) => value + 1)}
            className="rounded-full border border-[var(--border-default)] px-5 py-2.5 font-mono text-xs text-[var(--text-primary)] transition-colors duration-150 hover:border-[var(--accent)]"
          >
            REFRESH
          </button>
        }
      />

      <DeploymentNotice />

      {state.status === 'ready' ? (
        <div className="flex flex-col gap-1 border-y border-[var(--border-subtle)] py-4 sm:flex-row sm:items-center sm:justify-between">
          <span className="font-mono text-[11px] uppercase tracking-[0.15em] text-[var(--text-muted)]">
            AUDIT ROOT
          </span>
          <span className="break-all font-mono text-xs text-[var(--text-primary)]">{state.root}</span>
        </div>
      ) : null}

      {state.status === 'loading' ? <SkeletonRows /> : null}

      {state.status === 'error' ? <ErrorState message={state.message} /> : null}

      {state.status === 'ready' && state.entries.length === 0 ? (
        <EmptyState
          message="No disclosures yet. A verifier's request will appear here with its audit entry."
          action={
            <button
              type="button"
              onClick={() => setReload((value) => value + 1)}
              className="rounded-full border border-[var(--border-default)] px-5 py-2.5 font-mono text-xs text-[var(--text-primary)] transition-colors duration-150 hover:border-[var(--accent)]"
            >
              REFRESH
            </button>
          }
        />
      ) : null}

      {state.status === 'ready' && state.entries.length > 0 ? (
        <table className="w-full border-collapse text-left">
          <thead>
            <tr className="border-b border-[var(--border-default)]">
              <th className="pb-3 font-mono text-[11px] uppercase tracking-[0.15em] text-[var(--text-muted)]">
                Entry
              </th>
              <th className="pb-3 font-mono text-[11px] uppercase tracking-[0.15em] text-[var(--text-muted)]">
                Action
              </th>
              <th className="pb-3 font-mono text-[11px] uppercase tracking-[0.15em] text-[var(--text-muted)]">
                Level
              </th>
              <th className="pb-3 font-mono text-[11px] uppercase tracking-[0.15em] text-[var(--text-muted)]">
                Recorded
              </th>
            </tr>
          </thead>
          <tbody>
            {state.entries.map((entry) => (
              <tr key={entry.index} className="border-b border-[var(--border-subtle)]">
                <td className="py-3 font-mono text-xs tabular-nums text-[var(--text-secondary)]">
                  {String(entry.index).padStart(4, '0')}
                </td>
                <td className="py-3 font-mono text-xs text-[var(--text-primary)]">{entry.actionId}</td>
                <td className="py-3 font-mono text-xs text-[var(--text-secondary)]">{entry.level}</td>
                <td className="py-3 font-mono text-xs text-[var(--log-amber)]">{entry.timestamp}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : null}
    </div>
  );
}

/**
 * Renders a 32 byte value as a full hex string, which is what an auditor needs
 * to check it against a node.
 * @param bytes - the value to render
 * @returns the hex string
 */
function toHex(bytes: Uint8Array): string {
  return `0x${Array.from(bytes)
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('')}`;
}
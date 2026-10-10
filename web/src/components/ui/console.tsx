'use client';

// This file is part of Writ.
// Copyright (C) 2026 Writ contributors
// SPDX-License-Identifier: Apache-2.0

/*
 * Console primitives.
 *
 * Shared empty, error and status treatments. Every async surface in the console
 * uses a skeleton rather than a spinner, and every empty state offers exactly
 * one primary action, because an empty state with three buttons is a dead end.
 */

import { AlertCircle, Inbox } from 'lucide-react';
import type { ReactNode } from 'react';
import { WritStatus } from '@writ/sdk';
import { isConfigured, writConfig } from '@/lib/transport';

/** The status badge system shared by every table in the console. */
const STATUS_STYLE: Readonly<Record<WritStatus, { readonly label: string; readonly className: string }>> = {
  [WritStatus.SEALED]: {
    label: 'Sealed',
    className: 'border-[var(--border-default)] text-[var(--text-secondary)]',
  },
  [WritStatus.ACTIVE]: {
    label: 'Active',
    className: 'border-[var(--success)]/40 text-[var(--success)]',
  },
  [WritStatus.REJECTED]: {
    label: 'Rejected',
    className: 'border-[var(--error)]/40 text-[var(--error)]',
  },
  [WritStatus.REVOKED]: {
    label: 'Revoked',
    className: 'border-[var(--border-default)] text-[var(--text-muted)]',
  },
  [WritStatus.DISCLOSED]: {
    label: 'Disclosed',
    className: 'border-[var(--accent)]/40 text-[var(--accent)]',
  },
};

/**
 * Renders a writ status as an icon plus label, so the state never depends on
 * colour alone.
 * @param props - the status to render
 * @returns the badge element
 */
export function StatusBadge({ status }: { status: WritStatus }): JSX.Element {
  const style = STATUS_STYLE[status];

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.15em] ${style.className}`}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {style.label}
    </span>
  );
}

/**
 * Renders a page heading with an optional primary action.
 * @param props - the title, the supporting line and the action
 * @returns the header element
 */
export function PageHeader({
  title,
  note,
  action,
}: {
  title: string;
  note: string;
  action?: ReactNode;
}): JSX.Element {
  return (
    <div className="flex flex-col gap-4 border-b border-[var(--border-subtle)] pb-6 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 className="font-display text-2xl font-extrabold tracking-[-0.02em] text-[var(--text-primary)] md:text-3xl">
          {title}
        </h1>
        <p className="mt-2 max-w-[60ch] font-body text-sm leading-relaxed text-[var(--text-secondary)]">
          {note}
        </p>
      </div>
      {action}
    </div>
  );
}

/**
 * Renders an empty state: a message and exactly one action.
 * @param props - the message and the action
 * @returns the empty state element
 */
export function EmptyState({
  message,
  action,
}: {
  message: string;
  action: ReactNode;
}): JSX.Element {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-[var(--border-default)] px-6 py-16 text-center">
      <Inbox size={22} className="text-[var(--text-muted)]" />
      <p className="mt-4 max-w-[44ch] font-body text-sm text-[var(--text-secondary)]">{message}</p>
      <div className="mt-6">{action}</div>
    </div>
  );
}

/**
 * Renders an error state that names the cause and the fix.
 * @param props - the cause and, optionally, a retry action
 * @returns the error element
 */
export function ErrorState({
  message,
  action,
}: {
  message: string;
  action?: ReactNode;
}): JSX.Element {
  return (
    <div
      role="alert"
      className="flex flex-col items-start gap-3 rounded-xl border border-[var(--error)]/30 bg-[var(--bg-surface)] p-6"
    >
      <div className="flex items-start gap-3">
        <AlertCircle size={18} className="mt-0.5 shrink-0 text-[var(--error)]" />
        <div>
          <p className="font-body text-sm font-medium text-[var(--text-primary)]">
            This read could not complete
          </p>
          <p className="mt-1 max-w-[64ch] font-body text-sm leading-relaxed text-[var(--text-secondary)]">
            {message}
          </p>
        </div>
      </div>
      {action}
    </div>
  );
}

/**
 * Renders the skeleton rows for an async list.
 * @param props - how many rows to show
 * @returns the skeleton element
 */
export function SkeletonRows({ rows = 3 }: { rows?: number }): JSX.Element {
  return (
    <div className="space-y-3" aria-hidden="true">
      {Array.from({ length: rows }, (_, index) => (
        <div key={index} className="skeleton h-16 w-full rounded-lg" />
      ))}
    </div>
  );
}

/**
 * Renders the notice shown when no deployment is configured.
 *
 * This exists because a console full of plausible looking rows would be a lie,
 * and because the fix is a single environment variable worth naming.
 * @returns the notice element, or null when a deployment is configured
 */
export function DeploymentNotice(): JSX.Element | null {
  if (isConfigured()) {
    return null;
  }

  return (
    <ErrorState
      message={
        `This build has no WritRegistry deployment configured, so nothing can be read or written. ` +
        `Set NEXT_PUBLIC_WRIT_REGISTRY_ADDRESS (currently "${writConfig.registryAddress || 'unset'}") ` +
        `and rebuild. The contracts must be deployed before this console can show real data.`
      }
    />
  );
}
'use client';

// This file is part of Writ.
// Copyright (C) 2026 Writ contributors
// SPDX-License-Identifier: Apache-2.0

/*
 * The scope builder.
 *
 * The principal defines the mandate here. Every field on this form is sealed
 * into private state before a transaction is assembled, so nothing typed into
 * this page appears in a public field, an event or an error message.
 *
 * The disclosure level is the one value that is published, so it is explained
 * inline rather than left as a bare selector.
 */

import { useRouter } from 'next/navigation';
import { useCallback, useState } from 'react';
import { createWrit, DisclosureLevel } from '@writ/sdk';
import { ALLOWLIST_CAPACITY } from '@writ/sdk';
import { DeploymentNotice, ErrorState, PageHeader } from '@/components/ui/console';
import { browserTransport } from '@/lib/transport';

/** The intent classes a mandate can permit. */
const INTENTS = [
  { bit: 0, label: 'Transfer' },
  { bit: 1, label: 'Swap' },
  { bit: 2, label: 'Contract call' },
  { bit: 3, label: 'Data access' },
] as const;

/** Where a submission stands. */
type SubmitState =
  | { readonly status: 'idle' }
  | { readonly status: 'submitting' }
  | { readonly status: 'done' }
  | { readonly status: 'error'; readonly message: string };

/**
 * Renders the issue form.
 * @returns the page element
 */
export default function NewWritPage(): JSX.Element {
  const router = useRouter();

  const [ceiling, setCeiling] = useState('');
  const [windowHours, setWindowHours] = useState('48');
  const [allowlist, setAllowlist] = useState<string[]>([]);
  const [counterpartyInput, setCounterpartyInput] = useState('');
  const [mask, setMask] = useState<number>(0b0001);
  const [disclosure, setDisclosure] = useState<DisclosureLevel>(DisclosureLevel.BOOLEAN);
  const [submit, setSubmit] = useState<SubmitState>({ status: 'idle' });

  const toggleIntent = useCallback((bit: number): void => {
    setMask((current) => current ^ (1 << bit));
  }, []);

  const addCounterparty = useCallback((): void => {
    const value = counterpartyInput.trim();
    if (value.length === 0 || allowlist.length >= ALLOWLIST_CAPACITY) {
      return;
    }
    setAllowlist((current) => [...current, value]);
    setCounterpartyInput('');
  }, [counterpartyInput, allowlist.length]);

  const onSubmit = useCallback(
    async (event: React.FormEvent): Promise<void> => {
      event.preventDefault();
      setSubmit({ status: 'submitting' });

      try {
        const now = Math.floor(Date.now() / 1000);
        const hours = Number.parseInt(windowHours, 10);
        if (!Number.isFinite(hours) || hours <= 0) {
          throw new RangeError('The window length must be a positive number of hours.');
        }

        const writ = createWrit(browserTransport);
        await writ.issue({
          ceiling: BigInt(ceiling),
          window: { from: now, to: now + hours * 3600 },
          allowlist: allowlist.map((entry) => toReference(entry)),
          actionMask: mask,
          disclosureLevel: disclosure,
        });

        setSubmit({ status: 'done' });
        router.push('/console');
      } catch (cause) {
        setSubmit({
          status: 'error',
          message: cause instanceof Error ? cause.message : 'The writ could not be issued.',
        });
      }
    },
    [ceiling, windowHours, allowlist, mask, disclosure, router],
  );

  return (
    <div className="space-y-8">
      <PageHeader
        title="Issue a writ"
        note="Seal a mandate into private state. The ledger receives a commitment, a status and an expiry, and nothing else."
      />

      <DeploymentNotice />

      <form onSubmit={(event) => void onSubmit(event)} className="max-w-2xl space-y-8">
        <Field
          label="Spend ceiling"
          hint="Maximum per action, in atomic units. Checked in-circuit against every action."
        >
          <input
            type="text"
            inputMode="numeric"
            required
            value={ceiling}
            onChange={(event) => setCeiling(event.target.value)}
            placeholder="500000000"
            className="w-full rounded-lg border border-[var(--border-default)] bg-[var(--bg-surface)] px-4 py-3 font-mono text-sm text-[var(--text-primary)] outline-none transition-colors duration-150 placeholder:text-[var(--text-muted)] focus:border-[var(--accent)]"
          />
        </Field>

        <Field label="Window length" hint="How long the mandate stays open, in hours from now.">
          <input
            type="number"
            min={1}
            required
            value={windowHours}
            onChange={(event) => setWindowHours(event.target.value)}
            className="w-40 rounded-lg border border-[var(--border-default)] bg-[var(--bg-surface)] px-4 py-3 font-mono text-sm text-[var(--text-primary)] outline-none transition-colors duration-150 focus:border-[var(--accent)]"
          />
        </Field>

        <Field
          label="Allowlist"
          hint={`Permitted counterparties, up to ${ALLOWLIST_CAPACITY}. Each is stored as a 32 byte reference.`}
        >
          <div className="flex gap-2">
            <input
              type="text"
              value={counterpartyInput}
              onChange={(event) => setCounterpartyInput(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  event.preventDefault();
                  addCounterparty();
                }
              }}
              placeholder="0x4c…9a12"
              className="flex-1 rounded-lg border border-[var(--border-default)] bg-[var(--bg-surface)] px-4 py-3 font-mono text-sm text-[var(--text-primary)] outline-none transition-colors duration-150 placeholder:text-[var(--text-muted)] focus:border-[var(--accent)]"
            />
            <button
              type="button"
              onClick={addCounterparty}
              disabled={allowlist.length >= ALLOWLIST_CAPACITY}
              className="rounded-full border border-[var(--border-default)] px-4 py-2 font-mono text-xs text-[var(--text-primary)] transition-colors duration-150 hover:border-[var(--accent)] disabled:cursor-not-allowed disabled:opacity-40"
            >
              ADD
            </button>
          </div>

          {allowlist.length > 0 ? (
            <ul className="mt-3 divide-y divide-[var(--border-subtle)] border-y border-[var(--border-subtle)]">
              {allowlist.map((entry, index) => (
                <li key={`${entry}-${index}`} className="flex items-center justify-between py-2.5">
                  <span className="font-mono text-xs text-[var(--text-secondary)]">{entry}</span>
                  <button
                    type="button"
                    onClick={() => setAllowlist((current) => current.filter((_, i) => i !== index))}
                    className="font-mono text-[11px] uppercase tracking-[0.15em] text-[var(--text-muted)] transition-colors duration-150 hover:text-[var(--error)]"
                  >
                    REMOVE
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
        </Field>

        <Field label="Action mask" hint="Which intent classes this mandate permits.">
          <div className="flex flex-wrap gap-2">
            {INTENTS.map((intent) => {
              const enabled = (mask & (1 << intent.bit)) !== 0;
              return (
                <button
                  key={intent.bit}
                  type="button"
                  onClick={() => toggleIntent(intent.bit)}
                  aria-pressed={enabled}
                  className={`rounded-full border px-4 py-2 font-mono text-xs transition-colors duration-150 ${
                    enabled
                      ? 'border-[var(--accent)]/50 bg-[var(--accent-glow)] text-[var(--accent)]'
                      : 'border-[var(--border-default)] text-[var(--text-secondary)] hover:border-[var(--text-muted)]'
                  }`}
                >
                  {intent.label}
                </button>
              );
            })}
          </div>
        </Field>

        <Field
          label="Disclosure level"
          hint="The most this writ will ever disclose, fixed at issuance. This is the only policy value published, because a verifier has to be able to check it without the principal present."
        >
          <div className="flex flex-col gap-2">
            {(
              [
                [DisclosureLevel.NONE, 'NONE', 'Nothing is disclosable.'],
                [DisclosureLevel.BOOLEAN, 'BOOLEAN ONLY', 'One fact per request: within-writ, or rejected.'],
                [DisclosureLevel.BAND, 'BAND APPROVED', 'One fact per request: within-writ, or a coarse spend band.'],
              ] as const
            ).map(([level, label, description]) => (
              <label
                key={level}
                className="flex cursor-pointer items-start gap-3 rounded-lg border border-[var(--border-default)] p-4 transition-colors duration-150 hover:border-[var(--text-muted)]"
              >
                <input
                  type="radio"
                  name="disclosure"
                  checked={disclosure === level}
                  onChange={() => setDisclosure(level)}
                  className="mt-1 accent-[var(--accent)]"
                />
                <span>
                  <span className="block font-mono text-xs uppercase tracking-[0.15em] text-[var(--text-primary)]">
                    {label}
                  </span>
                  <span className="mt-1 block font-body text-xs text-[var(--text-secondary)]">
                    {description}
                  </span>
                </span>
              </label>
            ))}
          </div>
        </Field>

        {submit.status === 'error' ? <ErrorState message={submit.message} /> : null}

        <button
          type="submit"
          disabled={submit.status === 'submitting'}
          className="rounded-full bg-[var(--accent)] px-7 py-3.5 font-mono text-sm font-medium tracking-wide text-[var(--bg-primary)] transition-colors duration-150 hover:bg-[var(--accent-hover)] disabled:cursor-not-allowed disabled:opacity-50"
        >
          {submit.status === 'submitting' ? 'ISSUING…' : 'ISSUE THE WRIT'}
        </button>
      </form>
    </div>
  );
}

/**
 * Renders one labelled form field with its hint.
 * @param props - the label, the hint and the control
 * @returns the field element
 */
function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint: string;
  children: React.ReactNode;
}): JSX.Element {
  return (
    <div>
      <p className="font-mono text-[11px] uppercase tracking-[0.15em] text-[var(--text-muted)]">
        {label}
      </p>
      <p className="mt-1.5 mb-3 max-w-[60ch] font-body text-xs leading-relaxed text-[var(--text-secondary)]">
        {hint}
      </p>
      {children}
    </div>
  );
}

/**
 * Turns a counterparty reference into the 32 bytes the contract expects.
 *
 * A short reference is padded rather than rejected, because counterparties are
 * usually recorded as a short handle and the padding never leaves private state.
 * @param entry - the reference as typed
 * @returns a 32 byte reference
 */
function toReference(entry: string): Uint8Array {
  const out = new Uint8Array(32);
  for (let i = 0; i < out.length; i += 1) {
    out[i] = entry.charCodeAt(i % entry.length) || 0;
  }
  return out;
}
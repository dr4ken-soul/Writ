'use client';

// This file is part of Writ.
// Copyright (C) 2026 Writ contributors
// SPDX-License-Identifier: Apache-2.0

/*
 * The connection modal.
 *
 * A single owner of every provider call on the landing page. Escape and backdrop
 * clicks are disabled while the wallet prompt is open, because closing the modal
 * while a wallet window is waiting strands the person in a state where nothing
 * appears to have happened.
 */

import { motion, AnimatePresence } from 'motion/react';
import { AlertCircle, Loader2, ShieldCheck, X } from 'lucide-react';
import { useEffect } from 'react';

/** The four states the modal moves through. */
export type ConnectStep = 'intro' | 'connecting' | 'success' | 'error';

export interface ConnectModalProps {
  /** Whether the modal is open. */
  readonly open: boolean;
  /** The current state. */
  readonly step: ConnectStep;
  /** The plain language cause of a failure, when in the error state. */
  readonly error: string | null;
  /** Whether a wallet provider was found at all. */
  readonly providerAvailable: boolean;
  /** Asks the wallet for access. */
  readonly onConnect: () => void;
  /** Returns to the intro state. */
  readonly onRetry: () => void;
  /** Closes the modal. Disabled while connecting. */
  readonly onClose: () => void;
}

/** The three primary intents allowed on the landing page. */
const INTENTS = [
  'Sign a commitment to a mandate you sealed in your own wallet',
  'Prove an action stayed inside terms only you can read',
  'Request one scoped fact, logged on chain',
];

/**
 * Renders the connection modal.
 * @param props - the modal state and handlers
 * @returns the modal, or null when closed
 */
export function ConnectModal({
  open,
  step,
  error,
  providerAvailable,
  onConnect,
  onRetry,
  onClose,
}: ConnectModalProps): JSX.Element | null {
  const locked = step === 'connecting';

  // Escape closes the modal everywhere except while a provider prompt is open.
  useEffect(() => {
    if (!open || locked) {
      return;
    }
    const onKeyDown = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') {
        onClose();
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [open, locked, onClose]);

  return (
    <AnimatePresence>
      {open ? (
        <div className="fixed inset-0 z-[var(--z-modal-scrim)]">
          <motion.div
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
            onClick={locked ? undefined : onClose}
          />

          <div className="fixed inset-0 z-[var(--z-modal)] flex items-center justify-center p-6">
            <motion.div
              role="dialog"
              aria-modal="true"
              aria-labelledby="connect-title"
              className="relative w-full max-w-md rounded-2xl border border-[var(--border-default)] bg-[var(--bg-surface)] p-7"
              initial={{ opacity: 0, y: 16, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 8, scale: 0.98 }}
              transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
            >
              <button
                type="button"
                onClick={onClose}
                disabled={locked}
                aria-label="Close"
                className="absolute right-5 top-5 flex h-9 w-9 items-center justify-center rounded-full text-[var(--text-secondary)] transition-colors duration-150 hover:bg-white/5 hover:text-[var(--text-primary)] disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:bg-transparent"
              >
                <X size={16} />
              </button>

              {step === 'intro' ? <Intro providerAvailable={providerAvailable} onConnect={onConnect} /> : null}
              {step === 'connecting' ? <Connecting /> : null}
              {step === 'success' ? <Success /> : null}
              {step === 'error' ? <ErrorState message={error} onRetry={onRetry} onClose={onClose} /> : null}
            </motion.div>
          </div>
        </div>
      ) : null}
    </AnimatePresence>
  );
}

/** The opening state: what connecting authorises, and the primary action. */
function Intro({
  providerAvailable,
  onConnect,
}: {
  providerAvailable: boolean;
  onConnect: () => void;
}): JSX.Element {
  return (
    <>
      <div className="mb-6 flex h-11 w-11 items-center justify-center rounded-full bg-[var(--accent-glow)]">
        <ShieldCheck size={20} className="text-[var(--accent)]" />
      </div>

      <h2 id="connect-title" className="font-display text-2xl font-extrabold tracking-[-0.02em] text-[var(--text-primary)]">
        CONNECT A WALLET
      </h2>
      <p className="mt-3 font-body text-sm leading-relaxed text-[var(--text-secondary)]">
        Connecting lets you sign a mandate, prove an action or request a scoped fact. It does not
        move funds and it does not publish your terms.
      </p>

      <ul className="mt-6 space-y-3">
        {INTENTS.map((intent) => (
          <li key={intent} className="flex gap-3 text-sm font-body text-[var(--text-secondary)]">
            <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-[var(--accent)]" />
            {intent}
          </li>
        ))}
      </ul>

      {!providerAvailable ? (
        <p className="mt-6 rounded-lg border border-[var(--border-default)] bg-[var(--bg-elevated)] p-3 text-xs leading-relaxed text-[var(--text-secondary)]">
          No Midnight wallet was found in this browser. Install Lace or a compatible wallet, then
          try again.
        </p>
      ) : null}

      <button
        type="button"
        onClick={onConnect}
        className="mt-7 w-full rounded-full bg-[var(--accent)] px-6 py-3 font-mono text-sm font-medium tracking-wide text-[var(--bg-primary)] transition-colors duration-150 hover:bg-[var(--accent-hover)]"
      >
        CONNECT WALLET
      </button>
    </>
  );
}

/** The pending state: the provider prompt is open, so the modal cannot close. */
function Connecting(): JSX.Element {
  return (
    <>
      <div className="mb-6 flex h-11 w-11 items-center justify-center rounded-full bg-[var(--accent-glow)]">
        <Loader2 size={20} className="animate-spin text-[var(--accent)]" />
      </div>

      <h2 id="connect-title" className="font-display text-2xl font-extrabold tracking-[-0.02em] text-[var(--text-primary)]">
        WAITING FOR THE WALLET
      </h2>
      <p className="mt-3 font-body text-sm leading-relaxed text-[var(--text-secondary)]">
        Approve the request in your wallet to continue.
      </p>
      <p className="mt-6 font-mono text-[11px] uppercase tracking-[0.2em] text-[var(--text-muted)]">
        AWAITING SIGNATURE
      </p>
    </>
  );
}

/** The confirmation state. The gate navigates on from here. */
function Success(): JSX.Element {
  return (
    <>
      <div className="mb-6 flex h-11 w-11 items-center justify-center rounded-full bg-[var(--accent-glow)]">
        <ShieldCheck size={20} className="text-[var(--success)]" />
      </div>

      <h2 id="connect-title" className="font-display text-2xl font-extrabold tracking-[-0.02em] text-[var(--text-primary)]">
        WALLET CONNECTED
      </h2>
      <p className="mt-3 font-body text-sm leading-relaxed text-[var(--text-secondary)]">
        Opening the console.
      </p>
    </>
  );
}

/** The failure state: the cause in plain language, and two ways out. */
function ErrorState({
  message,
  onRetry,
  onClose,
}: {
  message: string | null;
  onRetry: () => void;
  onClose: () => void;
}): JSX.Element {
  return (
    <>
      <div className="mb-6 flex h-11 w-11 items-center justify-center rounded-full bg-[var(--accent-glow)]">
        <AlertCircle size={20} className="text-[var(--error)]" />
      </div>

      <h2 id="connect-title" className="font-display text-2xl font-extrabold tracking-[-0.02em] text-[var(--text-primary)]">
        COULD NOT CONNECT
      </h2>
      <p className="mt-3 font-body text-sm leading-relaxed text-[var(--text-secondary)]">
        {message ?? 'The wallet provider could not be reached.'}
      </p>

      <div className="mt-7 flex gap-3">
        <button
          type="button"
          onClick={onRetry}
          className="flex-1 rounded-full bg-[var(--accent)] px-6 py-3 font-mono text-sm font-medium tracking-wide text-[var(--bg-primary)] transition-colors duration-150 hover:bg-[var(--accent-hover)]"
        >
          TRY AGAIN
        </button>
        <button
          type="button"
          onClick={onClose}
          className="flex-1 rounded-full border border-[var(--border-default)] px-6 py-3 font-mono text-sm text-[var(--text-primary)] transition-colors duration-150 hover:border-[var(--accent)]"
        >
          BACK
        </button>
      </div>
    </>
  );
}
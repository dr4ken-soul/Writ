'use client';

// This file is part of Writ.
// Copyright (C) 2026 Writ contributors
// SPDX-License-Identifier: Apache-2.0

/*
 * The wallet pill and its dropdown.
 *
 * Console interior only. The pill carries a live dot and a truncated address; the
 * dropdown carries the full address with a copy action, the network, an explorer
 * link and the disconnect action.
 *
 * Disconnect navigates away immediately rather than waiting for the provider to
 * acknowledge, because the console closing promptly matters more than the
 * teardown being tidy.
 */

import { AnimatePresence, motion } from 'motion/react';
import { Check, ChevronDown, Copy, ExternalLink } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';
import { shortenAccount, useWallet } from '@/lib/wallet';
import { writConfig } from '@/lib/transport';

/** How long the copy button shows its confirmation. */
const COPIED_MS = 1800;

/**
 * Renders the wallet pill and dropdown.
 * @returns the pill element
 */
export function WalletMenu(): JSX.Element {
  const { accountId, disconnect } = useWallet();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const close = useCallback((): void => setOpen(false), []);

  // Dismiss on outside pointerdown and on Escape. No backdrop, so the console
  // behind the menu stays interactive.
  useEffect(() => {
    if (!open) {
      return;
    }

    const onPointerDown = (event: PointerEvent): void => {
      if (containerRef.current?.contains(event.target as Node) === false) {
        close();
      }
    };
    const onKeyDown = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') {
        close();
      }
    };

    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);

    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open, close]);

  const copyAddress = useCallback((): void => {
    if (accountId === null) {
      return;
    }
    void navigator.clipboard.writeText(accountId);
    setCopied(true);
    setTimeout(() => setCopied(false), COPIED_MS);
  }, [accountId]);

  const onDisconnect = useCallback((): void => {
    setOpen(false);
    // The flag is written to the history entry directly, because the App Router has
    // no navigation state option. The landing page clears it on arrival.
    window.history.replaceState({ ...window.history.state, disconnected: true }, '');
    router.replace('/');
    void disconnect();
  }, [router, disconnect]);

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        aria-haspopup="menu"
        className="flex items-center gap-2 rounded-full border border-[var(--border-default)] bg-[var(--bg-surface)] px-4 py-2 transition-colors duration-150 hover:border-[var(--accent)]/50"
      >
        <span className="h-1.5 w-1.5 rounded-full bg-[var(--success)]" />
        <span className="font-mono text-xs text-[var(--text-primary)]">
          {accountId === null ? '' : shortenAccount(accountId)}
        </span>
        <ChevronDown
          size={14}
          className={`text-[var(--text-secondary)] transition-transform duration-200 ${
            open ? 'rotate-180' : ''
          }`}
        />
      </button>

      <AnimatePresence>
        {open ? (
          <motion.div
            role="menu"
            className="absolute right-0 top-full z-[var(--z-dropdown)] mt-2 min-w-[280px] rounded-xl border border-[var(--border-default)] bg-[var(--bg-surface)] p-4"
            style={{ transformOrigin: 'top right' }}
            initial={{ opacity: 0, scale: 0.95, y: -6 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97, y: -4 }}
            transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
          >
            <div className="mb-4 flex items-center gap-2 border-b border-[var(--border-subtle)] pb-3">
              <span className="h-1.5 w-1.5 rounded-full bg-[var(--success)]" />
              <span className="font-mono text-[11px] tracking-[0.2em] text-[var(--text-muted)]">
                WRIT CONSOLE
              </span>
            </div>

            <div className="flex items-center justify-between gap-3">
              <span className="break-all font-mono text-xs text-[var(--text-secondary)]">
                {accountId}
              </span>
              <button
                type="button"
                onClick={copyAddress}
                aria-label="Copy address"
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[var(--text-secondary)] transition-colors duration-150 hover:bg-white/5 hover:text-[var(--text-primary)]"
              >
                {copied ? <Check size={14} className="text-[var(--success)]" /> : <Copy size={14} />}
              </button>
            </div>

            <dl className="mt-4 grid grid-cols-2 gap-y-2 border-t border-[var(--border-subtle)] pt-4">
              <dt className="font-mono text-[11px] uppercase tracking-[0.15em] text-[var(--text-muted)]">
                Network
              </dt>
              <dd className="text-right font-mono text-xs text-[var(--text-primary)]">Midnight</dd>
              <dt className="font-mono text-[11px] uppercase tracking-[0.15em] text-[var(--text-muted)]">
                Status
              </dt>
              <dd className="text-right font-mono text-xs text-[var(--success)]">Active</dd>
            </dl>

            <a
              href={
                writConfig.registryAddress.length > 0
                  ? `https://midnight.network/explorer/address/${writConfig.registryAddress}`
                  : 'https://midnight.network/explorer'
              }
              target="_blank"
              rel="noreferrer"
              className="mt-4 flex items-center gap-2 border-t border-[var(--border-subtle)] pt-4 font-mono text-[11px] uppercase tracking-[0.15em] text-[var(--text-secondary)] transition-colors duration-150 hover:text-[var(--accent)]"
            >
              VIEW IN EXPLORER
              <ExternalLink size={12} />
            </a>

            <button
              type="button"
              onClick={onDisconnect}
              className="mt-4 w-full rounded-full border border-[var(--error)]/30 px-4 py-2 font-mono text-xs text-[var(--error)] transition-colors duration-150 hover:border-[var(--error)]/60"
            >
              DISCONNECT WALLET
            </button>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
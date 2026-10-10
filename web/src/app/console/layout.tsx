'use client';

// This file is part of Writ.
// Copyright (C) 2026 Writ contributors
// SPDX-License-Identifier: Apache-2.0

/*
 * The console shell.
 *
 * A 240 pixel sidebar below md collapsing to a bottom tab bar, a 64 pixel top
 * bar holding the wallet pill, and the route content. Data surfaces use borders
 * and dividers rather than card chrome, because a dashboard reads as furniture
 * when every panel has a shadow.
 */

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { FilePlus2, Fingerprint, LayoutList, ScrollText } from 'lucide-react';
import { ProtectedRoute } from '@/components/layout/ProtectedRoute';
import { WalletMenu } from '@/components/layout/WalletMenu';

/** The console routes, in sidebar order. */
const NAV = [
  { href: '/console', label: 'Writs', icon: LayoutList },
  { href: '/console/writs/new', label: 'New writ', icon: FilePlus2 },
  { href: '/console/actions', label: 'Actions', icon: Fingerprint },
  { href: '/console/audit', label: 'Audit', icon: ScrollText },
] as const;

/**
 * Renders the console shell around a route.
 * @param props - the route content
 * @returns the shell element
 */
export default function ConsoleLayout({
  children,
}: {
  children: React.ReactNode;
}): JSX.Element {
  return (
    <ProtectedRoute>
      <div className="flex min-h-[100dvh] bg-[var(--bg-primary)]">
        {/* Sidebar. Becomes a bottom tab bar below md. */}
        <aside className="fixed bottom-0 left-0 top-0 z-[var(--z-panels)] flex w-full flex-row border-t border-[var(--border-subtle)] bg-[var(--bg-secondary)] md:w-[240px] md:flex-col md:border-r md:border-t-0">
          <div className="hidden h-16 items-center px-6 md:flex">
            <Link
              href="/"
              className="font-display text-base font-extrabold tracking-[-0.02em] text-[var(--text-primary)] transition-opacity duration-150 hover:opacity-70"
            >
              WRIT
            </Link>
          </div>

          <nav className="flex flex-1 items-stretch justify-around md:flex-col md:items-stretch md:gap-1 md:py-4">
            {NAV.map((item) => (
              <ConsoleNavRow key={item.href} {...item} />
            ))}
          </nav>
        </aside>

        <div className="flex min-w-0 flex-1 flex-col md:pl-[240px]">
          <header className="sticky top-0 z-[var(--z-nav)] flex h-16 items-center justify-between border-b border-[var(--border-subtle)] bg-[var(--bg-primary)]/90 px-6 backdrop-blur-md">
            <span className="font-mono text-[11px] uppercase tracking-[0.2em] text-[var(--text-muted)]">
              MIDNIGHT · WRIT CONSOLE
            </span>
            <WalletMenu />
          </header>

          <main className="flex-1 px-6 pb-24 pt-8 md:px-10 md:pb-10">{children}</main>
        </div>
      </div>
    </ProtectedRoute>
  );
}

/**
 * One sidebar row.
 *
 * The active row is marked by a left accent bar and a raised background, never
 * by colour alone.
 * @param props - the route, label and icon
 * @returns the row element
 */
function ConsoleNavRow({
  href,
  label,
  icon: Icon,
}: {
  href: string;
  label: string;
  icon: typeof LayoutList;
}): JSX.Element {
  const pathname = usePathname();
  const active = pathname === href;

  return (
    <Link
      href={href}
      aria-current={active ? 'page' : undefined}
      className={`flex items-center gap-3 border-l-2 px-4 py-3 text-sm transition-colors duration-150 md:py-2.5 ${
        active
          ? 'border-l-[var(--accent)] bg-[var(--bg-elevated)] text-[var(--text-primary)]'
          : 'border-l-transparent text-[var(--text-secondary)] hover:bg-[var(--bg-elevated)] hover:text-[var(--text-primary)]'
      }`}
    >
      <Icon size={16} className="shrink-0" />
      <span className="font-body">{label}</span>
    </Link>
  );
}
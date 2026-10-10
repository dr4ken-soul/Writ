import type { Metadata, Viewport } from 'next';
import '@/styles/globals.css';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { Grain } from '@/components/Grain';
import { ScopeSeal } from '@/components/scope-seal/ScopeSeal';
import { WalletProvider } from '@/lib/wallet';
import { ConsoleGateProvider } from '@/lib/console-gate';

/*
 * The app root.
 *
 * Order matters here. The ScopeSeal is mounted once at the root rather than per
 * page, the grain sits above it, and the wallet and gate providers wrap
 * everything so the landing page and the console read the same session.
 */

export const metadata: Metadata = {
  title: 'Writ, private mandates for AI agents on Midnight',
  description:
    'Issue private mandates to AI agents on Midnight. Scope limits stay in private state. Every action returns a proof it stayed in bounds.',
};

export const viewport: Viewport = {
  themeColor: '#0c0e10',
};

/**
 * The root layout, shared by every route.
 * @param children - the route tree
 * @returns the document shell
 */
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}): JSX.Element {
  return (
    <html lang="en-GB">
      <head>
        {/* Favicon slot: replace with public/favicon.ico once provided */}
      </head>
      <body className="bg-[var(--bg-primary)] text-[var(--text-primary)] antialiased">
        <ErrorBoundary>
          <WalletProvider>
            <ScopeSeal />
            <Grain />
            <ConsoleGateProvider>{children}</ConsoleGateProvider>
          </WalletProvider>
        </ErrorBoundary>
      </body>
    </html>
  );
}
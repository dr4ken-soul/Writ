'use client';

// This file is part of Writ.
// Copyright (C) 2026 Writ contributors
// SPDX-License-Identifier: Apache-2.0

/*
 * The console gate.
 *
 * Every entry point to the console goes through `enter()`. No landing page
 * element is ever a raw anchor to /console, so a person without a wallet is
 * always offered the connection flow rather than a dead link, and a person with
 * one always lands in the console.
 */

import { useRouter } from 'next/navigation';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { useWallet } from '@/lib/wallet';
import { ConnectModal, type ConnectStep } from '@/components/wallet/ConnectModal';

/** What the gate provides. */
export interface ConsoleGateValue {
  /**
   * The single wallet gated handler behind every call to action.
   *
   * Navigates to the console when a wallet is already connected, and opens the
   * connection modal otherwise.
   */
  readonly enter: () => void;
  /** Whether the connection modal is open. */
  readonly open: boolean;
}

const ConsoleGateContext = createContext<ConsoleGateValue | null>(null);

/** How long the success state is shown before the gate navigates. */
const SUCCESS_DWELL_MS = 600;

/**
 * Provides the wallet gated console entry point and owns the connection modal.
 * @param children - the app tree
 * @returns the provider element
 */
export function ConsoleGateProvider({ children }: { children: ReactNode }): JSX.Element {
  const router = useRouter();
  const { state, accountId, error, providerAvailable, connect, disconnect } = useWallet();

  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<ConnectStep>('intro');

  const enter = useCallback((): void => {
    if (state === 'connected') {
      router.push('/console');
      return;
    }
    setStep('intro');
    setOpen(true);
  }, [state, router]);

  const onConnect = useCallback((): void => {
    setStep('connecting');
    void (async () => {
      const connected = await connect();
      if (!connected) {
        setStep('error');
        return;
      }
      setStep('success');
    })();
  }, [connect]);

  // Navigate on from the success state, which is why the modal dwells briefly.
  useEffect(() => {
    if (!open || step !== 'success' || accountId === null) {
      return;
    }
    const timer = setTimeout(() => {
      setOpen(false);
      router.push('/console');
    }, SUCCESS_DWELL_MS);
    return () => clearTimeout(timer);
  }, [open, step, accountId, router]);

  const value = useMemo<ConsoleGateValue>(() => ({ enter, open }), [enter, open]);

  return (
    <ConsoleGateContext.Provider value={value}>
      {children}
      <ConnectModal
        open={open}
        step={step}
        error={error}
        providerAvailable={providerAvailable}
        onConnect={onConnect}
        onRetry={() => {
          setStep('intro');
        }}
        onClose={() => {
          setOpen(false);
          void disconnect();
        }}
      />
    </ConsoleGateContext.Provider>
  );
}

/**
 * Reads the console gate.
 * @returns the gate value
 */
export const useConsoleGate = (): ConsoleGateValue => {
  const context = useContext(ConsoleGateContext);
  if (context === null) {
    throw new Error('useConsoleGate must be called inside ConsoleGateProvider.');
  }
  return context;
};
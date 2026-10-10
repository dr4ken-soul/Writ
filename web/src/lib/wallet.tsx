'use client';

// This file is part of Writ.
// Copyright (C) 2026 Writ contributors
// SPDX-License-Identifier: Apache-2.0

/*
 * The wallet layer.
 *
 * Every provider call in the app is made from this module, and each one is
 * caught individually so a failure becomes an inline state rather than a blank
 * screen. The session lifecycle has four states and the console gate depends on
 * telling them apart:
 *
 *   hydrating      the provider is restoring a session. Never a redirect.
 *   connected      a wallet is available and the console may render.
 *   disconnected   confirmed by the provider. The console closes.
 *   error          the provider failed in a way we do not understand. This is
 *                  never treated as disconnected, because doing so would lock a
 *                  user out of a wallet that is merely misbehaving.
 *
 * No wallet state is written to localStorage or sessionStorage. The provider
 * owns the session, and the app re-derives from it on every load.
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

/** Where a wallet request ended up. */
export type WalletState = 'hydrating' | 'connected' | 'disconnected' | 'error';

/** The slice of a Midnight wallet the console actually uses. */
export interface MidnightWallet {
  /** The account the user selected. */
  readonly accountId: string;
  /** Derives a pseudonymous, contract bound reference from the account. */
  readonly publicKey: () => Promise<string>;
}

/** The injected provider surface Writ looks for on the window object. */
interface MidnightWalletProvider {
  /** Midnight renamed this accessor between versions, so both are tried. */
  requestAccess?: () => Promise<MidnightWallet>;
  enable?: () => Promise<MidnightWallet>;
  getActiveWallet?: () => Promise<MidnightWallet | null>;
  isConnected?: () => Promise<boolean>;
  state?: {
    subscribe?: (listener: (state: unknown) => void) => () => void;
  };
}

interface WritWindow extends Window {
  midnight?: MidnightWalletProvider;
  lace?: MidnightWalletProvider;
}

const readProvider = (): MidnightWalletProvider | null => {
  if (typeof window === 'undefined') {
    return null;
  }
  const scope = window as WritWindow;
  return scope.midnight ?? scope.lace ?? null;
};

/** The value the wallet context provides. */
export interface WalletContextValue {
  /** Where the session currently stands. */
  readonly state: WalletState;
  /** The connected account, or null. */
  readonly accountId: string | null;
  /** The plain language cause of a provider failure, or null. */
  readonly error: string | null;
  /** Whether a wallet provider was found in this browser at all. */
  readonly providerAvailable: boolean;
  /** Requests wallet access. Resolves true once connected. */
  connect: () => Promise<boolean>;
  /** Disconnects and returns to the landing page. */
  disconnect: () => Promise<void>;
}

const WalletContext = createContext<WalletContextValue | null>(null);

/**
 * Provides the wallet session to the app.
 *
 * Mounted once in the root layout, above the ScopeSeal, so both the landing page
 * and the console read the same session.
 * @param children - the app tree
 * @returns the provider element
 */
export function WalletProvider({ children }: { children: ReactNode }): JSX.Element {
  const [state, setState] = useState<WalletState>('hydrating');
  const [accountId, setAccountId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [providerAvailable, setProviderAvailable] = useState(false);

  // Restore on mount. Until this settles the state stays 'hydrating', which is
  // what stops the console gate redirecting a returning visitor.
  useEffect(() => {
    let cancelled = false;

    const restore = async (): Promise<void> => {
      const provider = readProvider();
      if (!provider) {
        if (!cancelled) {
          setProviderAvailable(false);
          setState('disconnected');
        }
        return;
      }

      if (!cancelled) {
        setProviderAvailable(true);
      }

      try {
        if (typeof provider.isConnected !== 'function') {
          throw new Error('The installed wallet does not report a connection state.');
        }
        const connected = await provider.isConnected();
        if (cancelled) {
          return;
        }
        if (!connected) {
          setState('disconnected');
          return;
        }
        const wallet = await provider.getActiveWallet?.();
        if (!wallet) {
          throw new Error('The wallet reported a connection but returned no account.');
        }
        if (cancelled) {
          return;
        }
        setAccountId(wallet.accountId);
        setState('connected');
      } catch (cause) {
        if (cancelled) {
          return;
        }
        setError(describeProviderError(cause));
        setState('error');
      }
    };

    void restore();

    return () => {
      cancelled = true;
    };
  }, []);

  const connect = useCallback(async (): Promise<boolean> => {
    setError(null);
    setState('hydrating');

    const provider = readProvider();
    if (!provider) {
      setError(
        'No Midnight wallet was found in this browser. Install Lace or a compatible wallet, then try again.',
      );
      setState('error');
      return false;
    }

    try {
      const wallet =
        typeof provider.requestAccess === 'function'
          ? await provider.requestAccess()
          : await provider.enable?.();

      if (!wallet) {
        throw new Error('The wallet returned no account. Nothing was connected.');
      }

      setProviderAvailable(true);
      setAccountId(wallet.accountId);
      setState('connected');
      return true;
    } catch (cause) {
      setError(describeProviderError(cause));
      setState('error');
      return false;
    }
  }, []);

  const disconnect = useCallback(async (): Promise<void> => {
    // Navigate first and let the provider events settle behind us, so the
    // console never reopens itself while the wallet is tearing down.
    setAccountId(null);
    setState('disconnected');
  }, []);

  const value = useMemo<WalletContextValue>(
    () => ({ state, accountId, error, providerAvailable, connect, disconnect }),
    [state, accountId, error, providerAvailable, connect, disconnect],
  );

  return <WalletContext.Provider value={value}>{children}</WalletContext.Provider>;
}

/**
 * Reads the wallet session.
 *
 * Throws outside the provider, because every consumer is inside the app tree
 * and a missing provider is a wiring bug rather than a user facing state.
 * @returns the wallet context value
 */
export function useWallet(): WalletContextValue {
  const context = useContext(WalletContext);
  if (context === null) {
    throw new Error('useWallet must be called inside WalletProvider.');
  }
  return context;
}

/**
 * Turns a provider failure into something worth reading.
 *
 * Wallet rejections are reported as plain language, with no stack trace and no
 * technical identifiers, because they are shown directly to a person.
 * @param cause - whatever the provider threw
 * @returns a sentence a person can act on
 */
function describeProviderError(cause: unknown): string {
  const message = cause instanceof Error ? cause.message : String(cause);

  if (/reject|denied|declined|cancel/i.test(message)) {
    return 'The wallet request was rejected, so nothing was connected.';
  }
  if (/locked/i.test(message)) {
    return 'The wallet is locked. Unlock it and try again.';
  }
  if (message.length > 0) {
    return message;
  }
  return 'The wallet provider could not be reached.';
}

/**
 * Shortens an account id for display, keeping enough to be recognisable.
 * @param accountId - the full account id
 * @returns a truncated form such as `mn1q…7a4f`
 */
export const shortenAccount = (accountId: string): string => {
  if (accountId.length <= 14) {
    return accountId;
  }
  return `${accountId.slice(0, 8)}…${accountId.slice(-4)}`;
};
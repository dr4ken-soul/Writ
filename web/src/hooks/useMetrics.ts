// This file is part of Writ.
// Copyright (C) 2026 Writ contributors
// SPDX-License-Identifier: Apache-2.0

/*
 * The two live contract reads behind the landing page metrics, and the fixed
 * zero that makes the point.
 *
 * There is no mock data and no fallback number. When the deployment is missing
 * or the call fails the section shows its error state and a skeleton, because a
 * plausible looking number on a landing page is a lie the judges would catch.
 */

'use client';

import { useEffect, useState } from 'react';
import { browserTransport, isConfigured } from '@/lib/transport';

/** The two public counters and the fixed truth value beside them. */
export interface Metrics {
  /** Writs issued on this deployment. */
  readonly writsIssued: number;
  /** Actions verified in scope on this deployment. */
  readonly actionsInScope: number;
  /**
   * Terms published to the ledger. Always zero, and never read from the chain.
   * It is the product claim, asserted by the privacy test rather than fetched.
   */
  readonly termsPublished: 0;
}

/** Where the metrics request currently stands. */
export type MetricsState =
  | { readonly status: 'loading' }
  | { readonly status: 'ready'; readonly metrics: Metrics }
  | { readonly status: 'error'; readonly message: string };

/**
 * Reads the public counters from the configured deployment.
 *
 * @returns the request state, which the section renders as a skeleton, an error
 *   card or the metric row
 */
export const useMetrics = (): MetricsState => {
  const [state, setState] = useState<MetricsState>({ status: 'loading' });

  useEffect(() => {
    let cancelled = false;

    if (!isConfigured()) {
      setState({
        status: 'error',
        message:
          'No WritRegistry deployment is configured for this build. Set NEXT_PUBLIC_WRIT_REGISTRY_ADDRESS to read the live counters.',
      });
      return;
    }

    const load = async (): Promise<void> => {
      try {
        const [writsIssued, actionsInScope] = await Promise.all([
          browserTransport.readWritCount(),
          browserTransport.readInScopeCount(),
        ]);
        if (cancelled) {
          return;
        }
        setState({
          status: 'ready',
          metrics: {
            writsIssued: Number(writsIssued),
            actionsInScope: Number(actionsInScope),
            termsPublished: 0,
          },
        });
      } catch (cause) {
        if (cancelled) {
          return;
        }
        setState({
          status: 'error',
          message:
            cause instanceof Error
              ? cause.message
              : 'The contract read failed for a reason this build cannot explain.',
        });
      }
    };

    void load();

    return () => {
      cancelled = true;
    };
  }, []);

  return state;
};
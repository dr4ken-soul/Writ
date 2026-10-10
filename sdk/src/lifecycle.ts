// This file is part of Writ.
// Copyright (C) 2026 Writ contributors
// SPDX-License-Identifier: Apache-2.0

/*
 * Revocation and public reads.
 *
 * Revoking changes a status and nothing else. The terms stay sealed and the
 * commitment stays exactly as it was, which is what makes revocation provable
 * without being informative.
 */

import { type WritTransport } from './types.js';

/**
 * Revokes a writ.
 *
 * A revoked writ rejects every subsequent action. The call publishes a status
 * change and no fact about the mandate.
 * @param transport - the transport that drives the contract
 * @param writ - the writ to revoke
 */
export const revoke = async (
  transport: WritTransport,
  writ: Uint8Array,
): Promise<void> => {
  await transport.submitRevoke({ writId: writ });
};

/**
 * Reads the commitment recorded for a writ.
 *
 * The ledger holds a commitment, a status and an expiry. It never holds terms,
 * so this read can be made by anyone and reveals nothing about the mandate.
 * @param transport - the transport that drives the contract
 * @param writ - the writ to read
 * @returns the 32 byte commitment
 */
export const status = async (
  transport: WritTransport,
  writ: Uint8Array,
): Promise<Uint8Array> => transport.readCommitment({ writId: writ });

/** The public counters and root backing the landing page metrics. */
export interface LedgerMetrics {
  /** Writs issued on this deployment. */
  readonly writsIssued: bigint;
  /** Actions verified in scope on this deployment. */
  readonly actionsInScope: bigint;
  /** The running root of the append only disclosure log. */
  readonly auditRoot: Uint8Array;
}

/**
 * Reads the public counters and the disclosure log root.
 *
 * These are the only Writ values that are public by design, which is why they
 * are safe to render on a landing page for anyone.
 * @param transport - the transport that drives the contract
 * @returns the current counters and root
 */
export const metrics = async (transport: WritTransport): Promise<LedgerMetrics> => {
  const [writsIssued, actionsInScope, auditRoot] = await Promise.all([
    transport.readWritCount(),
    transport.readInScopeCount(),
    transport.readAuditRoot(),
  ]);

  return { writsIssued, actionsInScope, auditRoot };
};
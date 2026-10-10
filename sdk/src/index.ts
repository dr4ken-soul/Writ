// This file is part of Writ.
// Copyright (C) 2026 Writ contributors
// SPDX-License-Identifier: Apache-2.0

/*
 * The integration surface.
 *
 * An agent framework embeds `writ` and calls five typed methods. No integrator
 * writes a raw circuit call, and none of them handles sealing or reason codes by
 * hand.
 */

import { type WritTransport } from './types.js';
import { issueWrit, type IssueInput, type IssueResult } from './issue.js';
import { checkAction, type ActInput } from './act.js';
import { attest, type AttestInput } from './attest.js';
import { metrics, revoke, status, type LedgerMetrics } from './lifecycle.js';
import { type ActionVerdict, type Disclosure } from './types.js';

export {
  WritStatus,
  DisclosureLevel,
  ReasonCode,
  SpendBand,
  type ActionVerdict,
  type Disclosure,
  type WritRecord,
  type WritTerms,
  type WritTransport,
} from './types.js';

export { issueWrit, sealWritTerms, type IssueInput, type IssueResult } from './issue.js';
export { checkAction, type ActInput } from './act.js';
export {
  attest,
  DISCLOSED_FACTS,
  toDisclosedFact,
  type AttestInput,
} from './attest.js';
export { metrics, revoke, status, type LedgerMetrics } from './lifecycle.js';
export {
  ALLOWLIST_CAPACITY,
  REFERENCE_BYTES,
  assertPlausibleAction,
  assertValidTerms,
  bandOf,
  padAllowlist,
} from './scope.js';
export { REASON_LABELS, describeReason, isInScope, toReasonCode } from './reason-codes.js';
export { encodeTerms, fingerprintTerms, sha256, toShortHex } from './sealing.js';

/** The five calls that cover the whole mandate lifecycle. */
export interface Writ {
  /** Seal a mandate and record its commitment. */
  issue(input: IssueInput): Promise<IssueResult>;
  /** Check one action against the sealed terms. */
  act(input: ActInput): Promise<ActionVerdict>;
  /** Request exactly one scoped disclosure. */
  attest(input: AttestInput): Promise<Disclosure>;
  /** Revoke a writ. Publishes a status change only. */
  revoke(writ: Uint8Array): Promise<void>;
  /** Public read of a writ's commitment. */
  status(writ: Uint8Array): Promise<Uint8Array>;
  /** Public counters and the disclosure log root. */
  metrics(): Promise<LedgerMetrics>;
}

/**
 * Binds the SDK to a transport.
 *
 * The transport decides which wallet signs and which private state store holds
 * the sealed terms. Keeping that behind an interface is what lets the principal
 * run this in a browser while an agent service runs it with a dedicated key,
 * with no code change at the call sites.
 * @param transport - the transport that drives the contract
 * @returns the Writ surface bound to that transport
 */
export const createWrit = (transport: WritTransport): Writ => ({
  issue: (input) => issueWrit(transport, input),
  act: (input) => checkAction(transport, input),
  attest: (input) => attest(transport, input),
  revoke: (writ) => revoke(transport, writ),
  status: (writ) => status(transport, writ),
  metrics: () => metrics(transport),
});
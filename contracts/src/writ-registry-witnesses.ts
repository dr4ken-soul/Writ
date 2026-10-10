// This file is part of Writ.
// Copyright (C) 2026 Writ contributors
// SPDX-License-Identifier: Apache-2.0

/*
 * The private state of the WritRegistry contract.
 *
 * A principal holds the mandate terms. They live on the principal's device,
 * inside the wallet's private state store, and are never sent to the network.
 * The contract reaches them through the witnesses below, sees them as private
 * circuit inputs and refuses to let any of them reach the ledger unless the
 * contract explicitly wraps them in disclose().
 *
 * The agent holds its own key. It never receives the terms. It only receives
 * the reason code, which the contract returns to it as the circuit result.
 */

import { randomBytes } from 'node:crypto';
import type { Witnesses } from './managed/writ-registry/contract/index.js';

/** One permitted counterparty, stored as a 32 byte reference. */
export type Counterparty = Uint8Array;

/**
 * The terms a principal seals before issuing a writ.
 *
 * Every field here is private. Once issued, none of them appears in public
 * state, in an event or in an error message.
 */
export interface WritTerms {
  /** Maximum spend per action, in atomic units. */
  readonly ceiling: bigint;
  /** Start of the permitted window, unix seconds. */
  readonly windowStart: number;
  /** End of the permitted window, unix seconds. */
  readonly windowEnd: number;
  /** Permitted counterparties, at most 8 entries. */
  readonly allowlist: Counterparty[];
  /** Bitfield of permitted intent classes. */
  readonly actionMask: number;
  /** Highest disclosure the principal will honour: 0, 1 or 2. */
  readonly disclosureLevel: 0 | 1 | 2;
}

/**
 * The private state of the WritRegistry contract.
 *
 * `terms` is null for a wallet that is acting as an agent rather than the
 * principal. The contract only reads it on the issuance path.
 */
export interface WritRegistryPrivateState {
  /** The principal's secret key, never disclosed, only ever hashed. */
  readonly principalSecretKey: Uint8Array;
  /** The agent's secret key, used to derive distinct action ids. */
  readonly agentSecretKey: Uint8Array;
  /** The verifier's secret key, used to attribute disclosure requests. */
  readonly verifierSecretKey: Uint8Array;
  /** The terms being issued, or null when this wallet is only acting. */
  readonly terms: WritTerms | null;
}

/**
 * Builds private state with fresh random keys and no terms.
 * @returns private state ready to issue a writ from
 */
export const createWritRegistryPrivateState = (): WritRegistryPrivateState => ({
  principalSecretKey: randomBytes(32),
  agentSecretKey: randomBytes(32),
  verifierSecretKey: randomBytes(32),
  terms: null,
});

/**
 * Returns a copy of the private state carrying the supplied terms, leaving the
 * keys untouched.
 * @param state - the current private state
 * @param terms - the mandate terms to seal
 * @returns a new private state with the terms attached
 */
export const withTerms = (
  state: WritRegistryPrivateState,
  terms: WritTerms,
): WritRegistryPrivateState => ({ ...state, terms });

/** Number of counterparties the contract allowlist holds. */
export const ALLOWLIST_CAPACITY = 8;

/**
 * Reads a field from the sealed terms, failing loudly rather than defaulting to
 * zero. A missing term must never be silently treated as "no limit".
 * @param state - the private state holding the terms
 * @param field - name of the term to read
 * @returns the term value
 */
const requireTerms = <K extends keyof WritTerms>(
  state: WritRegistryPrivateState,
  field: K,
): WritTerms[K] => {
  const terms = state.terms;
  if (terms === null) {
    throw new Error(
      `WritRegistry: the private state holds no sealed terms, so ${String(field)} cannot be read. ` +
        'Issue a writ first, or attach terms with withTerms().',
    );
  }
  return terms[field];
};

/**
 * Widens the allowlist to exactly the capacity the contract expects, padding
 * with zeros. Unused slots are masked bytes, never real counterparties.
 * @param entries - the permitted counterparties
 * @returns a fixed length list of 32 byte references
 */
const padAllowlist = (entries: Counterparty[]): Counterparty[] => {
  const padded: Counterparty[] = [];
  for (let i = 0; i < ALLOWLIST_CAPACITY; i += 1) {
    padded.push(entries[i] ?? new Uint8Array(32));
  }
  return padded;
};

/**
 * The witness implementations for WritRegistry.
 *
 * Typed against the compiler generated `Witnesses` type, so a renamed witness or
 * a changed return type fails the TypeScript build here rather than at runtime.
 * Every function returns the next private state alongside the value.
 */
export const writRegistryWitnesses: Witnesses<WritRegistryPrivateState> = {
  principalSecretKey: ({ privateState }) => [
    privateState,
    privateState.principalSecretKey,
  ],

  agentSecretKey: ({ privateState }) => [privateState, privateState.agentSecretKey],

  verifierSecretKey: ({ privateState }) => [
    privateState,
    privateState.verifierSecretKey,
  ],

  sealedCeiling: ({ privateState }) => [
    privateState,
    BigInt(requireTerms(privateState, 'ceiling')),
  ],

  sealedWindowStart: ({ privateState }) => [
    privateState,
    BigInt(requireTerms(privateState, 'windowStart')),
  ],

  sealedWindowEnd: ({ privateState }) => [
    privateState,
    BigInt(requireTerms(privateState, 'windowEnd')),
  ],

  sealedAllowlist: ({ privateState }) => [
    privateState,
    padAllowlist(requireTerms(privateState, 'allowlist')),
  ],

  sealedActionMask: ({ privateState }) => [
    privateState,
    BigInt(requireTerms(privateState, 'actionMask')),
  ],

  sealedDisclosureLevel: ({ privateState }) => [
    privateState,
    BigInt(requireTerms(privateState, 'disclosureLevel')),
  ],

  /**
   * Reads the current unix time in seconds.
   *
   * Production behaviour takes the host clock. `setTestClock` exists so the
   * test suites can pin time and exercise the window bound deterministically.
   * Nothing in the contract reads a clock argument, so a caller cannot talk its
   * way past a sealed window by passing a timestamp of its own.
   */
  currentTimestamp: ({ privateState }) => [
    privateState,
    BigInt(testClockSeconds ?? Math.floor(Date.now() / 1000)),
  ],
};

/** The pinned clock used by the test suites, or null to use the host clock. */
let testClockSeconds: number | null = null;

/**
 * Pins the clock the `currentTimestamp` witness reports.
 *
 * This is a test seam. It lives in the witness layer, which runs on the caller's
 * device, and never in the circuit, so it cannot weaken the contract itself.
 * @param seconds - unix seconds to report, or null to restore the host clock
 */
export const setTestClock = (seconds: number | null): void => {
  testClockSeconds = seconds;
};
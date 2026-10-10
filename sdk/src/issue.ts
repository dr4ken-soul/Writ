// This file is part of Writ.
// Copyright (C) 2026 Writ contributors
// SPDX-License-Identifier: Apache-2.0

/*
 * Sealing terms and issuing a writ.
 *
 * Everything in this file happens on the caller's device. The transport receives
 * an expiry and nothing else: no ceiling, no window, no allowlist, no mask.
 */

import { type WritTerms, type WritTransport, DisclosureLevel } from './types.js';
import { assertValidTerms } from './scope.js';
import { fingerprintTerms } from './sealing.js';

/** A window expressed in unix seconds. */
export interface WritWindow {
  /** Start of the permitted window. */
  readonly from: number;
  /** End of the permitted window. */
  readonly to: number;
}

/** What a principal passes to `issue`. */
export interface IssueInput {
  /** Maximum spend per action, in atomic units. */
  readonly ceiling: bigint;
  /** The permitted time window. */
  readonly window: WritWindow;
  /** Permitted counterparties, at most 8 references of 32 bytes. */
  readonly allowlist: Uint8Array[];
  /** Bitfield of permitted intent classes. */
  readonly actionMask: number;
  /** Highest disclosure the principal will honour. */
  readonly disclosureLevel: DisclosureLevel;
  /** Expiry as unix seconds. Defaults to the end of the window. */
  readonly expiry?: number;
}

/** What `issue` returns to the principal. */
export interface IssueResult {
  /** The pseudonymous writ identifier. */
  readonly writId: Uint8Array;
  /** The sealed terms, held only by the issuing wallet. */
  readonly terms: WritTerms;
  /** A local fingerprint the principal can check against later. */
  readonly fingerprint: Uint8Array;
  /** The expiry recorded on the ledger. */
  readonly expiry: number;
}

/**
 * Normalises the caller's input into the exact term shape the contract reads,
 * validating every bound before anything is sealed.
 * @param input - the principal's mandate
 * @returns the sealed terms and the expiry to record
 */
export const sealWritTerms = (
  input: IssueInput,
): { readonly terms: WritTerms; readonly expiry: number } => {
  const terms: WritTerms = {
    ceiling: input.ceiling,
    windowStart: Math.trunc(input.window.from),
    windowEnd: Math.trunc(input.window.to),
    allowlist: input.allowlist,
    actionMask: input.actionMask,
    disclosureLevel: input.disclosureLevel,
  };

  assertValidTerms(terms);

  return { terms, expiry: input.expiry ?? terms.windowEnd };
};

/**
 * Seals a mandate and records its commitment on the ledger.
 *
 * The terms are validated and fingerprinted locally, then the transport is asked
 * to issue. The transport sees the expiry and the disclosure level only: it has
 * no way to learn the ceiling, the window, the allowlist or the mask.
 * @param transport - the transport that drives the contract
 * @param input - the principal's mandate
 * @returns the writ id, the sealed terms and a local fingerprint
 */
export const issueWrit = async (
  transport: WritTransport,
  input: IssueInput,
): Promise<IssueResult> => {
  const { terms, expiry } = sealWritTerms(input);

  const writId = await transport.submitIssueWrit({
    expiry,
    disclosureLevel: terms.disclosureLevel,
  });

  return {
    writId,
    terms,
    fingerprint: fingerprintTerms(terms),
    expiry,
  };
};
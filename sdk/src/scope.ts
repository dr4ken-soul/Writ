// This file is part of Writ.
// Copyright (C) 2026 Writ contributors
// SPDX-License-Identifier: Apache-2.0

/*
 * Spend banding and allowlist normalisation.
 *
 * Both mirror what WritRegistry.compact does inside the circuit, so an agent can
 * predict its band before submitting. The circuit stays authoritative: a
 * mismatch here is a bug in this file, never a way around the contract.
 */

import { SpendBand, type WritTerms } from './types.js';

/** Number of counterparties the contract allowlist holds. */
export const ALLOWLIST_CAPACITY = 8;

/** Bytes in a counterparty reference. */
export const REFERENCE_BYTES = 32;

/**
 * Maps an amount onto a coarse spend band using the sealed ceiling.
 *
 * Mirrors `bandOf` in WritRegistry.compact.
 * @param amount - the action amount in atomic units
 * @param ceiling - the sealed ceiling in atomic units
 * @returns the band the contract will publish for this action
 */
export const bandOf = (amount: bigint, ceiling: bigint): SpendBand => {
  if (ceiling <= 0n) {
    return SpendBand.TIER_3;
  }
  const quarter = ceiling / 4n;
  const half = ceiling / 2n;
  const threeQuarters = (ceiling * 3n) / 4n;

  if (amount <= quarter) {
    return SpendBand.TIER_0;
  }
  if (amount <= half) {
    return SpendBand.TIER_1;
  }
  if (amount <= threeQuarters) {
    return SpendBand.TIER_2;
  }
  return SpendBand.TIER_3;
};

/**
 * Pads an allowlist to the capacity the contract expects, filling unused slots
 * with zero references so a short list cannot be mistaken for a longer one.
 * @param entries - the permitted counterparties
 * @returns a list of exactly ALLOWLIST_CAPACITY references
 */
export const padAllowlist = (entries: Uint8Array[]): Uint8Array[] => {
  const padded: Uint8Array[] = [];
  for (let i = 0; i < ALLOWLIST_CAPACITY; i += 1) {
    padded.push(entries[i] ?? new Uint8Array(REFERENCE_BYTES));
  }
  return padded;
};

/**
 * Checks the terms before they are sealed, so a principal finds out about a
 * mistake on their own machine rather than through a failed circuit.
 * @param terms - the mandate terms
 * @throws when a term is out of range for the contract
 */
export const assertValidTerms = (terms: WritTerms): void => {
  if (terms.ceiling <= 0n) {
    throw new RangeError('WritTerms.ceiling must be greater than zero.');
  }
  if (terms.windowEnd <= terms.windowStart) {
    throw new RangeError('WritTerms.windowEnd must be after windowStart.');
  }
  if (terms.windowStart < 0) {
    throw new RangeError('WritTerms.windowStart must be a positive unix time.');
  }
  if (terms.allowlist.length > ALLOWLIST_CAPACITY) {
    throw new RangeError(
      `WritTerms.allowlist holds at most ${ALLOWLIST_CAPACITY} counterparties.`,
    );
  }
  for (const entry of terms.allowlist) {
    if (entry.length !== REFERENCE_BYTES) {
      throw new RangeError(
        `Each allowlist entry must be exactly ${REFERENCE_BYTES} bytes.`,
      );
    }
  }
  if (!Number.isInteger(terms.actionMask) || terms.actionMask < 0 || terms.actionMask > 0xff) {
    throw new RangeError('WritTerms.actionMask must be an integer between 0 and 255.');
  }
  if (terms.disclosureLevel < 0 || terms.disclosureLevel > 2) {
    throw new RangeError('WritTerms.disclosureLevel must be 0, 1 or 2.');
  }
};

/**
 * Checks an action before it is submitted, for the bounds the caller can know.
 *
 * This is a courtesy check that saves a wasted transaction. It is never a
 * substitute for the circuit: the contract re-derives every bound from the
 * sealed terms inside the proof.
 * @param amount - the action amount
 * @param intent - the intent class bits
 * @throws when the amount or intent is obviously out of range
 */
export const assertPlausibleAction = (amount: bigint, intent: number): void => {
  if (amount <= 0n) {
    throw new RangeError('An action amount must be greater than zero.');
  }
  if (!Number.isInteger(intent) || intent < 0 || intent > 0xff) {
    throw new RangeError('An intent must be an integer between 0 and 255.');
  }
};
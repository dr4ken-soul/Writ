// This file is part of Writ.
// Copyright (C) 2026 Writ contributors
// SPDX-License-Identifier: Apache-2.0

/*
 * Scoped disclosure.
 *
 * A verifier asks for one fact and receives one fact. The contract decides
 * whether the ask is allowed, and every successful call is appended to the
 * append only log. This module refuses an impossible ask before spending a
 * transaction, and never returns more than the single fact.
 */

import { DisclosureLevel, type Disclosure, type WritTransport } from './types.js';

/** What a verifier passes to `attest`. */
export interface AttestInput {
  /** The action the fact is about. */
  readonly action: Uint8Array;
  /** The level of detail requested. */
  readonly level: DisclosureLevel;
}

/** The only facts the contract can disclose. */
export const DISCLOSED_FACTS = Object.freeze({
  WITHIN_WRIT: 'within-writ',
  REJECTED: 'rejected',
  TIER_0: 'tier-0',
  TIER_1: 'tier-1',
  TIER_2: 'tier-2',
  TIER_3: 'tier-3',
} as const);

/**
 * The disclosure codes the contract returns, in the order it returns them.
 *
 * Compact cannot build an opaque string in-circuit, so the contract picks a code
 * from this fixed set and the SDK renders the fact. The circuit still decides
 * which code, so the level gate and the one fact per call rule are unaffected.
 */
const CODE_TO_FACT = [
  DISCLOSED_FACTS.WITHIN_WRIT,
  DISCLOSED_FACTS.REJECTED,
  DISCLOSED_FACTS.TIER_0,
  DISCLOSED_FACTS.TIER_1,
  DISCLOSED_FACTS.TIER_2,
  DISCLOSED_FACTS.TIER_3,
] as const;

/**
 * Renders a disclosure code as the single fact it stands for.
 * @param code - the value returned by attest
 * @returns the disclosed fact
 */
export const toDisclosedFact = (code: bigint | number): string =>
  CODE_TO_FACT[Number(code)] ?? DISCLOSED_FACTS.REJECTED;

/**
 * Requests one scoped disclosure about one action.
 *
 * The result is a single string. If the policy fixed at issuance does not
 * permit the requested level, the contract reverts and this throws rather than
 * returning a narrower fact, because a silently downgraded answer would let a
 * verifier believe it had been told something it was not.
 * @param transport - the transport that drives the contract
 * @param input - the action and the requested level
 * @returns the single disclosed fact
 */
export const attest = async (
  transport: WritTransport,
  input: AttestInput,
): Promise<Disclosure> => {
  if (input.level === DisclosureLevel.NONE) {
    throw new RangeError(
      'A disclosure level of 0 discloses nothing, so there is nothing to request.',
    );
  }

  const code = await transport.submitAttest({
    actionId: input.action,
    level: input.level,
  });

  return { actionId: input.action, level: input.level, fact: toDisclosedFact(code) };
};
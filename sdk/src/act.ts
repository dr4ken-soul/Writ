// This file is part of Writ.
// Copyright (C) 2026 Writ contributors
// SPDX-License-Identifier: Apache-2.0

/*
 * Acting under a writ.
 *
 * One typed call. The caller states the recipient, the amount and the intent
 * and gets back whether it was in scope, plus a reason that stays on the agent's
 * device. The reason code is the only place a bound can be named, and it
 * terminates here.
 */

import { type ActionVerdict, type ReasonCode, type WritTransport } from './types.js';
import { assertPlausibleAction } from './scope.js';
import { describeReason, isInScope, toReasonCode } from './reason-codes.js';

/** What an agent passes to `act`. */
export interface ActInput {
  /** The writ the action is performed under. */
  readonly writ: Uint8Array;
  /** The counterparty reference, already hashed to 32 bytes. */
  readonly to: Uint8Array;
  /** The amount in atomic units. */
  readonly amount: bigint;
  /** The intent class bits. */
  readonly intent: number;
}

/**
 * Checks one action against the sealed terms of a writ.
 *
 * The returned reason is the circuit's private output. It is returned to the
 * calling agent and is never written to the ledger, so an integrator must not
 * log it anywhere the principal cannot reach.
 * @param transport - the transport that drives the contract
 * @param input - the action to check
 * @returns the verdict, the reason code and a label for the agent's own logs
 */
export const checkAction = async (
  transport: WritTransport,
  input: ActInput,
): Promise<ActionVerdict> => {
  assertPlausibleAction(input.amount, input.intent);

  const { reason, actionId } = await transport.submitCheckAction({
    writId: input.writ,
    to: input.to,
    amount: input.amount,
    intent: input.intent,
  });

  const code: ReasonCode = toReasonCode(reason);

  return {
    actionId,
    inScope: isInScope(code),
    reason: code,
    reasonLabel: describeReason(code),
  };
};
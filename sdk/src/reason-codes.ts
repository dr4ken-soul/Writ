// This file is part of Writ.
// Copyright (C) 2026 Writ contributors
// SPDX-License-Identifier: Apache-2.0

/*
 * Private reason codes.
 *
 * These labels are for the agent's own logs. The circuit returns a bare code,
 * and the mapping from code to words happens here, on the agent's device. Nothing
 * in this file reaches the ledger, an event or a verifier.
 */

import { ReasonCode } from './types.js';

/**
 * Human readable labels for each reason code, as written by
 * WritRegistry.compact. Deliberately vague about the bound's value: the label
 * says which rule stopped the action, never how far past it the action was.
 */
export const REASON_LABELS: Readonly<Record<ReasonCode, string>> = {
  [ReasonCode.IN_SCOPE]: 'within mandate',
  [ReasonCode.AMOUNT_ABOVE_CEILING]: 'above the sealed ceiling',
  [ReasonCode.RECIPIENT_NOT_ALLOWED]: 'recipient not on the sealed allowlist',
  [ReasonCode.OUTSIDE_WINDOW]: 'outside the sealed window',
  [ReasonCode.INTENT_NOT_PERMITTED]: 'intent not permitted by the sealed mask',
  [ReasonCode.WRIT_NOT_ACTIVE]: 'writ is not active',
};

/**
 * Converts a raw circuit result into a reason code.
 * @param raw - the value returned by `checkAction`
 * @returns the matching reason code, defaulting to WRIT_NOT_ACTIVE
 */
export const toReasonCode = (raw: bigint | number): ReasonCode => {
  const value = Number(raw);
  if (value in REASON_LABELS) {
    return Number(value) as ReasonCode;
  }
  return ReasonCode.WRIT_NOT_ACTIVE;
};

/**
 * Returns the agent facing label for a reason code.
 * @param code - the reason code
 * @returns a short label safe to log on the agent only
 */
export const describeReason = (code: ReasonCode): string => REASON_LABELS[code];

/**
 * Whether a reason code means the action was inside the mandate.
 * @param code - the reason code
 * @returns true only for IN_SCOPE
 */
export const isInScope = (code: ReasonCode): boolean => code === ReasonCode.IN_SCOPE;
// This file is part of Writ.
// Copyright (C) 2026 Writ contributors
// SPDX-License-Identifier: Apache-2.0

/*
 * The private state of the AuditLog contract.
 *
 * The log holds no mandate data at all, so the only private value is the
 * appender's key, used to derive a pseudonymous submitter reference. Callers
 * that already hold an entry hash do not need any private state beyond this.
 */

import { randomBytes } from 'node:crypto';
import type { Witnesses } from './managed/audit-log/contract/index.js';

/** The private state of the AuditLog contract. */
export interface AuditLogPrivateState {
  /** The appender's secret key, never disclosed, only ever hashed. */
  readonly appenderSecretKey: Uint8Array;
}

/**
 * Builds private state with a fresh random key.
 * @returns private state ready to append entries
 */
export const createAuditLogPrivateState = (
  appenderSecretKey: Uint8Array = randomBytes(32),
): AuditLogPrivateState => ({ appenderSecretKey });

/** The witness implementations for AuditLog. */
export const auditLogWitnesses: Witnesses<AuditLogPrivateState> = {
  appenderSecretKey: ({ privateState }) => [privateState, privateState.appenderSecretKey],
};
// This file is part of Writ.
// Copyright (C) 2026 Writ contributors
// SPDX-License-Identifier: Apache-2.0

import { CompiledContract } from '@midnight-ntwrk/midnight-js-protocol/compact-js';

export * from './managed/audit-log/contract/index.js';
export * from './audit-log-witnesses.js';

import * as CompiledAuditLog from './managed/audit-log/contract/index.js';
import * as Witnesses from './audit-log-witnesses.js';

/**
 * The compiled AuditLog contract, wired to its witnesses and its compiled
 * assets. Integrators append disclosure entry hashes and read the running root
 * back for inclusion proofs.
 */
export const AuditLogContract = CompiledContract.make<
  CompiledAuditLog.Contract<Witnesses.AuditLogPrivateState>
>(
  'AuditLog',
  CompiledAuditLog.Contract<Witnesses.AuditLogPrivateState>,
).pipe(
  CompiledContract.withWitnesses(Witnesses.auditLogWitnesses),
  CompiledContract.withCompiledFileAssets('./managed/audit-log'),
);
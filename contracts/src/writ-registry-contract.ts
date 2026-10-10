// This file is part of Writ.
// Copyright (C) 2026 Writ contributors
// SPDX-License-Identifier: Apache-2.0

import { CompiledContract } from '@midnight-ntwrk/midnight-js-protocol/compact-js';

export * from './managed/writ-registry/contract/index.js';
export * from './writ-registry-witnesses.js';

import * as CompiledWritRegistry from './managed/writ-registry/contract/index.js';
import * as Witnesses from './writ-registry-witnesses.js';

/**
 * The compiled WritRegistry contract, wired to its witnesses and its compiled
 * assets. Integrators import this object and call `issueWrit`, `checkAction`,
 * `attest` or `revoke` through the midnight.js providers.
 */
export const WritRegistryContract = CompiledContract.make<
  CompiledWritRegistry.Contract<Witnesses.WritRegistryPrivateState>
>(
  'WritRegistry',
  CompiledWritRegistry.Contract<Witnesses.WritRegistryPrivateState>,
).pipe(
  CompiledContract.withWitnesses(Witnesses.writRegistryWitnesses),
  CompiledContract.withCompiledFileAssets('./managed/writ-registry'),
);
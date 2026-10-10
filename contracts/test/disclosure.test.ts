// This file is part of Writ.
// Copyright (C) 2026 Writ contributors
// SPDX-License-Identifier: Apache-2.0

/*
 * Disclosure behaviour.
 *
 * A verifier receives exactly one scoped fact and nothing else. A level above
 * the policy fixed at issuance reverts. Every successful disclosure advances the
 * append only log root.
 */

import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  IntentClass,
  WritRegistrySimulator,
  counterparty,
  testIdentity,
} from './writ-registry-simulator.js';
import { type WritTerms, setTestClock } from '../src/writ-registry-witnesses.js';

const NOW = 1_800_000_000;
const COUNTERPARTY_A = counterparty('a');

const terms = (overrides: Partial<WritTerms> = {}): WritTerms => ({
  ceiling: 1000n,
  windowStart: NOW - 3600,
  windowEnd: NOW + 3600,
  allowlist: [COUNTERPARTY_A],
  actionMask: 0b1111,
  disclosureLevel: 1,
  ...overrides,
});

describe('WritRegistry disclosure circuit', () => {
  beforeEach(() => {
    setTestClock(NOW);
  });

  afterEach(() => {
    setTestClock(null);
  });

  /** Builds a simulator carrying the supplied terms. */
  const withTerms = async (overrides: Partial<WritTerms> = {}): Promise<WritRegistrySimulator> =>
    WritRegistrySimulator.create(testIdentity('principal'), terms(overrides));

  it('returns exactly one fact to a verifier at level 1', async () => {
    const sim = await withTerms();
    const writ = await sim.issueWrit(BigInt(NOW + 7200));
    await sim.checkAction(writ, COUNTERPARTY_A, 500n, IntentClass.TRANSFER);
    const action = sim.lastActionId();

    sim.switchIdentity(testIdentity('verifier'), terms());
    const fact = await sim.attest(action, 1n);

    expect(['within-writ', 'rejected']).toContain(fact);
  });

  it('reveals that an action was rejected without revealing why', async () => {
    const sim = await withTerms();
    const writ = await sim.issueWrit(BigInt(NOW + 7200));
    // Amount above the ceiling, so the bound that stopped it was the ceiling.
    await sim.checkAction(writ, COUNTERPARTY_A, 5000n, IntentClass.TRANSFER);
    const action = sim.lastActionId();

    sim.switchIdentity(testIdentity('verifier'), terms());
    const fact = await sim.attest(action, 1n);

    expect(fact).toBe('rejected');
    expect(fact).not.toContain('ceiling');
    expect(fact).not.toContain('amount');
  });

  it('reverts when the verifier asks above the level fixed at issuance', async () => {
    const sim = await withTerms({ disclosureLevel: 1 });
    const writ = await sim.issueWrit(BigInt(NOW + 7200));
    await sim.checkAction(writ, COUNTERPARTY_A, 500n, IntentClass.TRANSFER);
    const action = sim.lastActionId();

    sim.switchIdentity(testIdentity('verifier'), terms({ disclosureLevel: 1 }));

    await expect(sim.attest(action, 2n)).rejects.toThrow();
  });

  it('returns a spend band when the policy permits level 2', async () => {
    const sim = await withTerms({ disclosureLevel: 2 });
    const writ = await sim.issueWrit(BigInt(NOW + 7200));
    await sim.checkAction(writ, COUNTERPARTY_A, 900n, IntentClass.TRANSFER);
    const action = sim.lastActionId();

    sim.switchIdentity(testIdentity('verifier'), terms({ disclosureLevel: 2 }));
    const fact = await sim.attest(action, 2n);

    expect(['tier-0', 'tier-1', 'tier-2', 'tier-3']).toContain(fact);
    expect(fact).not.toContain('900');
  });

  it('advances the audit root on every disclosure', async () => {
    const sim = await withTerms();
    const writ = await sim.issueWrit(BigInt(NOW + 7200));
    await sim.checkAction(writ, COUNTERPARTY_A, 500n, IntentClass.TRANSFER);
    const action = sim.lastActionId();

    sim.switchIdentity(testIdentity('verifier'), terms());
    const before = await sim.auditRootOf();
    await sim.attest(action, 1n);
    const after = await sim.auditRootOf();

    expect(Buffer.from(after).toString('hex')).not.toBe(Buffer.from(before).toString('hex'));
    expect(sim.getLedger().auditCount).toBe(1n);
  });

  it('does not advance the audit root when the call reverts', async () => {
    const sim = await withTerms({ disclosureLevel: 1 });
    const writ = await sim.issueWrit(BigInt(NOW + 7200));
    await sim.checkAction(writ, COUNTERPARTY_A, 500n, IntentClass.TRANSFER);
    const action = sim.lastActionId();

    sim.switchIdentity(testIdentity('verifier'), terms({ disclosureLevel: 1 }));
    const before = await sim.auditRootOf();

    await expect(sim.attest(action, 2n)).rejects.toThrow();
    expect(Buffer.from(await sim.auditRootOf()).toString('hex')).toBe(
      Buffer.from(before).toString('hex'),
    );
  });

  it('reverts for an action the contract has never seen', async () => {
    const sim = await withTerms();
    const writ = await sim.issueWrit(BigInt(NOW + 7200));
    await sim.checkAction(writ, COUNTERPARTY_A, 500n, IntentClass.TRANSFER);

    sim.switchIdentity(testIdentity('verifier'), terms());

    await expect(sim.attest(counterparty('never-acted'), 1n)).rejects.toThrow();
  });

  it('reverts when the writ carries no disclosure policy', async () => {
    const sim = await withTerms({ disclosureLevel: 0 });
    const writ = await sim.issueWrit(BigInt(NOW + 7200));
    await sim.checkAction(writ, COUNTERPARTY_A, 500n, IntentClass.TRANSFER);
    const action = sim.lastActionId();

    sim.switchIdentity(testIdentity('verifier'), terms({ disclosureLevel: 0 }));

    await expect(sim.attest(action, 1n)).rejects.toThrow();
  });
});
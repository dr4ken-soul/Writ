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

import { beforeEach, afterEach, describe, expect, it } from 'vitest';
import { WritRegistrySimulator, counterparty, testIdentity } from './writ-registry-simulator.js';
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
  let sim: WritRegistrySimulator;

  beforeEach(() => {
    setTestClock(NOW);
    sim = new WritRegistrySimulator(testIdentity('principal'), terms());
  });

  afterEach(() => {
    setTestClock(null);
  });

  it('returns exactly one fact to a verifier at level 1', () => {
    const writ = sim.issueWrit(BigInt(NOW + 7200));
    sim.checkAction(writ, COUNTERPARTY_A, 500n, 1n);
    const action = sim.lastActionId();

    sim.switchIdentity(testIdentity('verifier'), terms());
    const fact = sim.attest(action, 1n);

    expect(['within-writ', 'rejected']).toContain(fact);
  });

  it('reveals that an action was rejected without revealing why', () => {
    const writ = sim.issueWrit(BigInt(NOW + 7200));
    // Amount above the ceiling, so the bound that stopped it was the ceiling.
    sim.checkAction(writ, COUNTERPARTY_A, 5000n, 1n);
    const action = sim.lastActionId();

    sim.switchIdentity(testIdentity('verifier'), terms());
    const fact = sim.attest(action, 1n);

    expect(fact).toBe('rejected');
    expect(fact).not.toContain('ceiling');
    expect(fact).not.toContain('amount');
  });

  it('reverts when the verifier asks above the level fixed at issuance', () => {
    sim = new WritRegistrySimulator(testIdentity('principal'), terms({ disclosureLevel: 1 }));
    const writ = sim.issueWrit(BigInt(NOW + 7200));
    sim.checkAction(writ, COUNTERPARTY_A, 500n, 1n);
    const action = sim.lastActionId();

    sim.switchIdentity(testIdentity('verifier'), terms({ disclosureLevel: 1 }));

    expect(() => sim.attest(action, 2n)).toThrow();
  });

  it('returns a spend band when the policy permits level 2', () => {
    sim = new WritRegistrySimulator(testIdentity('principal'), terms({ disclosureLevel: 2 }));
    const writ = sim.issueWrit(BigInt(NOW + 7200));
    sim.checkAction(writ, COUNTERPARTY_A, 900n, 1n);
    const action = sim.lastActionId();

    sim.switchIdentity(testIdentity('verifier'), terms({ disclosureLevel: 2 }));
    const fact = sim.attest(action, 2n);

    expect(['tier-0', 'tier-1', 'tier-2', 'tier-3']).toContain(fact);
    expect(fact).not.toContain('900');
  });

  it('advances the audit root on every disclosure', () => {
    const writ = sim.issueWrit(BigInt(NOW + 7200));
    sim.checkAction(writ, COUNTERPARTY_A, 500n, 1n);
    const action = sim.lastActionId();

    sim.switchIdentity(testIdentity('verifier'), terms());
    const before = sim.auditRootOf();
    sim.attest(action, 1n);
    const after = sim.auditRootOf();

    expect(Buffer.from(after).toString('hex')).not.toBe(Buffer.from(before).toString('hex'));
    expect(sim.getLedger().auditCount).toBe(1n);
  });

  it('does not advance the audit root when the call reverts', () => {
    const writ = sim.issueWrit(BigInt(NOW + 7200));
    sim.checkAction(writ, COUNTERPARTY_A, 500n, 1n);
    const action = sim.lastActionId();

    sim.switchIdentity(testIdentity('verifier'), terms({ disclosureLevel: 1 }));
    const before = sim.auditRootOf();

    expect(() => sim.attest(action, 2n)).toThrow();
    expect(Buffer.from(sim.auditRootOf()).toString('hex')).toBe(
      Buffer.from(before).toString('hex'),
    );
  });

  it('reverts for an action the contract has never seen', () => {
    const writ = sim.issueWrit(BigInt(NOW + 7200));
    sim.checkAction(writ, COUNTERPARTY_A, 500n, 1n);

    sim.switchIdentity(testIdentity('verifier'), terms());

    expect(() => sim.attest(counterparty('never-acted'), 1n)).toThrow();
  });

  it('reverts when the writ carries no disclosure policy', () => {
    sim = new WritRegistrySimulator(testIdentity('principal'), terms({ disclosureLevel: 0 }));
    const writ = sim.issueWrit(BigInt(NOW + 7200));
    sim.checkAction(writ, COUNTERPARTY_A, 500n, 1n);
    const action = sim.lastActionId();

    sim.switchIdentity(testIdentity('verifier'), terms({ disclosureLevel: 0 }));

    expect(() => sim.attest(action, 1n)).toThrow();
  });
});
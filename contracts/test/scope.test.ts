// This file is part of Writ.
// Copyright (C) 2026 Writ contributors
// SPDX-License-Identifier: Apache-2.0

/*
 * Scope behaviour.
 *
 * An in scope action returns reason code 0. Each out of scope dimension rejects
 * with its own reason code, so the agent can be told what went wrong without
 * the public ledger learning which bound stopped it.
 */

import { beforeEach, afterEach, describe, expect, it } from 'vitest';
import {
  WritRegistrySimulator,
  counterparty,
  testIdentity,
} from './writ-registry-simulator.js';
import { type WritTerms, setTestClock } from '../src/writ-registry-witnesses.js';

const NOW = 1_800_000_000;

/** Reason codes as written by WritRegistry.compact. */
const REASON = {
  IN_SCOPE: 0n,
  AMOUNT: 1n,
  RECIPIENT: 2n,
  WINDOW: 3n,
  INTENT: 4n,
  WRIT_INACTIVE: 5n,
} as const;

const COUNTERPARTY_A = counterparty('a');
const COUNTERPARTY_B = counterparty('b');
const COUNTERPARTY_C = counterparty('c');

/** Terms permitting up to 1000 per action, over a one hour window. */
const terms = (overrides: Partial<WritTerms> = {}): WritTerms => ({
  ceiling: 1000n,
  windowStart: NOW - 3600,
  windowEnd: NOW + 3600,
  allowlist: [COUNTERPARTY_A, COUNTERPARTY_B],
  actionMask: 0b1111,
  disclosureLevel: 1,
  ...overrides,
});

describe('WritRegistry scope circuit', () => {
  let sim: WritRegistrySimulator;

  beforeEach(() => {
    setTestClock(NOW);
    sim = new WritRegistrySimulator(testIdentity('principal'), terms());
  });

  afterEach(() => {
    setTestClock(null);
  });

  it('issues a writ and returns a writ id', () => {
    const writ = sim.issueWrit(BigInt(NOW + 7200));

    expect(writ).toHaveLength(32);
    expect(sim.getLedger().commitments.size()).toBe(1);
  });

  it('accepts an action inside every bound', () => {
    const writ = sim.issueWrit(BigInt(NOW + 7200));

    const reason = sim.checkAction(writ, COUNTERPARTY_A, 500n, 1n);

    expect(reason).toBe(REASON.IN_SCOPE);
    expect(sim.inScopeCountOf()).toBe(1n);
  });

  it('rejects an amount above the sealed ceiling', () => {
    const writ = sim.issueWrit(BigInt(NOW + 7200));

    const reason = sim.checkAction(writ, COUNTERPARTY_A, 1001n, 1n);

    expect(reason).toBe(REASON.AMOUNT);
    expect(sim.inScopeCountOf()).toBe(0n);
  });

  it('rejects a recipient outside the sealed allowlist', () => {
    const writ = sim.issueWrit(BigInt(NOW + 7200));

    const reason = sim.checkAction(writ, COUNTERPARTY_C, 500n, 1n);

    expect(reason).toBe(REASON.RECIPIENT);
  });

  it('rejects an action before the window opens', () => {
    const writ = sim.issueWrit(BigInt(NOW + 7200));

    setTestClock(NOW - 7200);
    const reason = sim.checkAction(writ, COUNTERPARTY_A, 500n, 1n);

    expect(reason).toBe(REASON.WINDOW);
  });

  it('rejects an action after the window closes', () => {
    const writ = sim.issueWrit(BigInt(NOW + 7200));

    setTestClock(NOW + 7200);
    const reason = sim.checkAction(writ, COUNTERPARTY_A, 500n, 1n);

    expect(reason).toBe(REASON.WINDOW);
  });

  it('rejects an intent bit that the action mask does not carry', () => {
    const writ = sim.issueWrit(BigInt(NOW + 7200));

    const reason = sim.checkAction(writ, COUNTERPARTY_A, 500n, 0b10000n);

    expect(reason).toBe(REASON.INTENT);
  });

  it('rejects any action once the writ has been revoked', () => {
    const writ = sim.issueWrit(BigInt(NOW + 7200));
    sim.revoke(writ);

    const reason = sim.checkAction(writ, COUNTERPARTY_A, 500n, 1n);

    expect(reason).toBe(REASON.WRIT_INACTIVE);
  });

  it('records a distinct action for every attempt', () => {
    const writ = sim.issueWrit(BigInt(NOW + 7200));

    sim.checkAction(writ, COUNTERPARTY_A, 100n, 1n);
    sim.checkAction(writ, COUNTERPARTY_B, 200n, 2n);
    const ledger = sim.getLedger();

    expect(ledger.actionWrits.size()).toBe(2);
    expect(ledger.actionVerdicts.size()).toBe(2);
  });

  it('lets an agent act under the sealed terms without changing them', () => {
    const writ = sim.issueWrit(BigInt(NOW + 7200));

    // The agent proves with its own keys while carrying the sealed terms across.
    sim.switchIdentity(testIdentity('agent'), terms());
    const reason = sim.checkAction(writ, COUNTERPARTY_A, 500n, 1n);

    expect(reason).toBe(REASON.IN_SCOPE);
  });
});
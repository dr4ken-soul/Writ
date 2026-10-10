// This file is part of Writ.
// Copyright (C) 2026 Writ contributors
// SPDX-License-Identifier: Apache-2.0

/*
 * Scope behaviour.
 *
 * An in-scope action returns reason code 0. Each out-of-scope dimension rejects
 * with its own reason code, so the agent can be told what went wrong without the
 * public ledger learning which bound stopped it.
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
  });

  afterEach(() => {
    setTestClock(null);
  });

  /** Builds a simulator carrying the supplied terms. */
  const withTerms = async (overrides: Partial<WritTerms> = {}): Promise<WritRegistrySimulator> =>
    WritRegistrySimulator.create(testIdentity('principal'), terms(overrides));

  it('issues a writ and returns a writ id', async () => {
    sim = await withTerms();

    const writ = await sim.issueWrit(BigInt(NOW + 7200));

    expect(writ).toHaveLength(32);
    expect(sim.getLedger().commitments.size()).toBe(1n);
  });

  it('accepts an action inside every bound', async () => {
    sim = await withTerms();
    const writ = await sim.issueWrit(BigInt(NOW + 7200));

    const reason = await sim.checkAction(writ, COUNTERPARTY_A, 500n, IntentClass.TRANSFER);

    expect(reason).toBe(REASON.IN_SCOPE);
    expect(await sim.inScopeCountOf()).toBe(1n);
  });

  it('rejects an amount above the sealed ceiling', async () => {
    sim = await withTerms();
    const writ = await sim.issueWrit(BigInt(NOW + 7200));

    const reason = await sim.checkAction(writ, COUNTERPARTY_A, 1001n, IntentClass.TRANSFER);

    expect(reason).toBe(REASON.AMOUNT);
    expect(await sim.inScopeCountOf()).toBe(0n);
  });

  it('rejects a recipient outside the sealed allowlist', async () => {
    sim = await withTerms();
    const writ = await sim.issueWrit(BigInt(NOW + 7200));

    const reason = await sim.checkAction(writ, COUNTERPARTY_C, 500n, IntentClass.TRANSFER);

    expect(reason).toBe(REASON.RECIPIENT);
  });

  it('rejects an action before the window opens', async () => {
    sim = await withTerms();
    const writ = await sim.issueWrit(BigInt(NOW + 7200));

    setTestClock(NOW - 7200);
    const reason = await sim.checkAction(writ, COUNTERPARTY_A, 500n, IntentClass.TRANSFER);

    expect(reason).toBe(REASON.WINDOW);
  });

  it('rejects an action after the window closes', async () => {
    sim = await withTerms();
    const writ = await sim.issueWrit(BigInt(NOW + 7200));

    setTestClock(NOW + 7200);
    const reason = await sim.checkAction(writ, COUNTERPARTY_A, 500n, IntentClass.TRANSFER);

    expect(reason).toBe(REASON.WINDOW);
  });

  it('rejects an intent the sealed action mask does not carry', async () => {
    // This mandate permits transfer, swap and contract call, but not data access.
    sim = await withTerms({ actionMask: 0b0111 });
    const writ = await sim.issueWrit(BigInt(NOW + 7200));

    const reason = await sim.checkAction(writ, COUNTERPARTY_A, 500n, IntentClass.DATA_ACCESS);

    expect(reason).toBe(REASON.INTENT);
  });

  it('rejects any action once the writ has been revoked', async () => {
    sim = await withTerms();
    const writ = await sim.issueWrit(BigInt(NOW + 7200));
    await sim.revoke(writ);

    const reason = await sim.checkAction(writ, COUNTERPARTY_A, 500n, IntentClass.TRANSFER);

    expect(reason).toBe(REASON.WRIT_INACTIVE);
  });

  it('records a distinct action for every attempt', async () => {
    sim = await withTerms();
    const writ = await sim.issueWrit(BigInt(NOW + 7200));

    await sim.checkAction(writ, COUNTERPARTY_A, 100n, IntentClass.TRANSFER);
    await sim.checkAction(writ, COUNTERPARTY_B, 200n, IntentClass.SWAP);

    const ledger = sim.getLedger();
    expect(ledger.actionWrits.size()).toBe(2n);
    expect(ledger.actionVerdicts.size()).toBe(2n);
  });

  it('accepts an action from the agent registered at issuance', async () => {
    sim = await withTerms();
    const writ = await sim.issueWrit(BigInt(NOW + 7200));

    // Acting keeps the registered agent key. Only the agent key matters here,
    // which is the point of registering it.
    const reason = await sim.checkAction(writ, COUNTERPARTY_A, 500n, IntentClass.TRANSFER);

    expect(reason).toBe(REASON.IN_SCOPE);
  });

  it('refuses an agent that was not registered at issuance', async () => {
    sim = await withTerms();
    const writ = await sim.issueWrit(BigInt(NOW + 7200));

    // A stranger holds the writ id and the terms, but is not the registered agent.
    sim.switchIdentity(testIdentity('stranger'), terms());

    await expect(
      sim.checkAction(writ, COUNTERPARTY_A, 500n, IntentClass.TRANSFER),
    ).rejects.toThrow(/not authorised/);
  });
});
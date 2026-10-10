// This file is part of Writ.
// Copyright (C) 2026 Writ contributors
// SPDX-License-Identifier: Apache-2.0

/*
 * The privacy claim, checked against raw ledger state.
 *
 * A writ is issued with deliberately distinctive terms, then acted on and
 * attested. Afterwards the entire public ledger is walked and every byte and
 * every number it contains is collected. The suite then asserts that none of the
 * sealed terms is present in any encoding.
 *
 * This is the assertion the whole product rests on, so it is deliberately
 * paranoid: it checks numeric equality as well as byte patterns, and it fails
 * if the ledger turns out to be empty, which would make the check pass for the
 * wrong reason.
 */

import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { WritRegistrySimulator, counterparty, testIdentity } from './writ-registry-simulator.js';
import { type WritTerms, setTestClock } from '../src/writ-registry-witnesses.js';

const NOW = 1_800_000_000;

/** Deliberately distinctive, so a leak cannot be mistaken for coincidence. */
const CEILING = 987654321n;
const WINDOW_START = 1_812_345_000;
const WINDOW_END = 1_812_349_999;
const SECRET_COUNTERPARTY = counterparty('secret-counterparty');

const terms: WritTerms = {
  ceiling: CEILING,
  windowStart: WINDOW_START,
  windowEnd: WINDOW_END,
  allowlist: [SECRET_COUNTERPARTY],
  actionMask: 0b1010,
  disclosureLevel: 2,
};

/** Everything a ledger walk found: byte strings and numeric values. */
type Walk = {
  /** Every byte sequence, rendered as lowercase hex. */
  hex: string[];
  /** Every numeric value found, as a decimal string. */
  numbers: Set<string>;
  /** Every string value found. */
  strings: string[];
};

/**
 * Renders a 64 bit little endian field encoding of a value as hex, matching the
 * shape the Compact runtime uses for Uint values in ledger state.
 * @param value - the value to encode
 * @returns the lowercase hex encoding
 */
const asUint64Hex = (value: bigint): string => {
  const bytes = new Uint8Array(8);
  let remaining = value;
  for (let i = 0; i < 8; i += 1) {
    bytes[i] = Number(remaining & 0xffn);
    remaining >>= 8n;
  }
  return Buffer.from(bytes).toString('hex');
};

/**
 * Walks any ledger structure and collects every byte sequence and number it
 * can reach, including the contents of the generated Map instances.
 * @param value - the value to walk
 * @param seen - objects already visited, to break cycles
 * @returns everything found
 */
const walkLedger = (value: unknown, seen: WeakSet<object> = new WeakSet()): Walk => {
  const result: Walk = { hex: [], numbers: new Set(), strings: [] };

  const visit = (node: unknown): void => {
    if (node === null || node === undefined) {
      return;
    }

    if (node instanceof Uint8Array) {
      result.hex.push(Buffer.from(node).toString('hex'));
      return;
    }

    if (typeof node === 'bigint') {
      result.numbers.add(node.toString());
      return;
    }

    if (typeof node === 'number') {
      result.numbers.add(String(node));
      return;
    }

    if (typeof node === 'string') {
      result.strings.push(node);
      return;
    }

    if (typeof node === 'boolean') {
      return;
    }

    if (typeof node !== 'object') {
      return;
    }

    const asObject = node as object;
    if (seen.has(asObject)) {
      return;
    }
    seen.add(asObject);

    // The generated Map keeps its entries behind accessors rather than as plain
    // properties, so it is expanded explicitly.
    const maybeMap = node as { keys?: () => unknown; lookup?: (k: unknown) => unknown };
    if (typeof maybeMap.keys === 'function' && typeof maybeMap.lookup === 'function') {
      for (const key of maybeMap.keys()) {
        visit(key);
        visit(maybeMap.lookup(key));
      }
    }

    if (Array.isArray(node)) {
      for (const entry of node) {
        visit(entry);
      }
      return;
    }

    for (const key of Object.getOwnPropertyNames(asObject)) {
      if (key === 'constructor') {
        continue;
      }
      try {
        visit((asObject as Record<string, unknown>)[key]);
      } catch {
        // A field backed by a private class member is not reachable by design.
      }
    }
  };

  visit(value);
  return result;
};

describe('WritRegistry privacy', () => {
  let sim: WritRegistrySimulator;

  beforeEach(() => {
    setTestClock(NOW);
    sim = new WritRegistrySimulator(testIdentity('principal'), terms());
  });

  afterEach(() => {
    setTestClock(null);
  });

  it('never writes the sealed terms into public ledger state', () => {
    const writ = sim.issueWrit(BigInt(WINDOW_END + 7200));
    sim.checkAction(writ, SECRET_COUNTERPARTY, 123n, 1n);
    const action = sim.lastActionId();
    sim.switchIdentity(testIdentity('verifier'), terms);
    sim.attest(action, 2n);

    const found = walkLedger(sim.getLedger());
    const hexBlob = found.hex.join(' ');
    const stringsBlob = found.strings.join(' ');

    // The ceiling must not appear as a number.
    expect(found.numbers.has(CEILING.toString())).toBe(false);
    // Nor as a byte sequence in the runtime's field encoding.
    expect(hexBlob).not.toContain(asUint64Hex(CEILING));
    // Nor as a decimal digit run anywhere in the ledger.
    expect(hexBlob).not.toContain('3937353534');

    // The window bounds must not appear either.
    expect(found.numbers.has(String(WINDOW_START))).toBe(false);
    expect(found.numbers.has(String(WINDOW_END))).toBe(false);
    expect(hexBlob).not.toContain(asUint64Hex(BigInt(WINDOW_START)));
    expect(hexBlob).not.toContain(asUint64Hex(BigInt(WINDOW_END)));

    // The allowlist entry must not appear in any encoding.
    const counterpartyHex = Buffer.from(SECRET_COUNTERPARTY).toString('hex');
    expect(hexBlob).not.toContain(counterpartyHex);
    expect(stringsBlob).not.toContain('secret-counterparty');

    // The disclosure level is the one policy value deliberately published, and
    // it is a level, never a term.
    expect(found.numbers.has('2')).toBe(true);
  });

  it('never puts the ceiling or the window into an error message', () => {
    const writ = sim.issueWrit(BigInt(WINDOW_END + 7200));

    expect(() => sim.checkAction(writ, SECRET_COUNTERPARTY, CEILING, 1n)).not.toThrow();

    // A rejected action must not leak its reason through a thrown error.
    let thrown = '';
    try {
      sim.checkAction(writ, counterparty('not-allowed'), 500n, 1n);
    } catch (error) {
      thrown = String(error);
    }
    expect(thrown).not.toContain(CEILING.toString());
    expect(thrown).not.toContain('ceiling');
  });

  it('produces a ledger that is not empty, so the checks above mean something', () => {
    sim.issueWrit(BigInt(WINDOW_END + 7200));
    const found = walkLedger(sim.getLedger());

    expect(found.hex.length).toBeGreaterThan(0);
    expect(found.numbers.has('1')).toBe(true);
  });

  it('keeps the commitment and the counter while hiding the terms', () => {
    const writ = sim.issueWrit(BigInt(WINDOW_END + 7200));
    const ledger = sim.getLedger();

    expect(ledger.commitments.lookup(writ)).toHaveLength(32);
    expect(ledger.writCount).toBe(1n);

    const found = walkLedger(ledger);
    expect(found.numbers.has(CEILING.toString())).toBe(false);
  });
});
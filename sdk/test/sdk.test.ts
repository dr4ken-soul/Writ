// This file is part of Writ.
// Copyright (C) 2026 Writ contributors
// SPDX-License-Identifier: Apache-2.0

/*
 * SDK behaviour.
 *
 * These run without a chain. They use a recording transport so the suite can
 * assert the property that matters most at this layer: the transport never
 * receives a ceiling, a window, an allowlist or an action mask.
 */

import { describe, expect, it } from 'vitest';
import {
  ALLOWLIST_CAPACITY,
  DisclosureLevel,
  ReasonCode,
  SpendBand,
  bandOf,
  createWrit,
  describeReason,
  encodeTerms,
  fingerprintTerms,
  isInScope,
  padAllowlist,
  sha256,
  toReasonCode,
  toShortHex,
  type WritTerms,
  type WritTransport,
} from '../src/index.js';

const NOW = 1_800_000_000;

const reference = (label: string): Uint8Array => {
  const out = new Uint8Array(32);
  for (let i = 0; i < 32; i += 1) {
    out[i] = (label.charCodeAt(i % label.length) + i) % 256;
  }
  return out;
};

const COUNTERPARTY = reference('counterparty');

const terms: WritTerms = {
  ceiling: 987654321n,
  windowStart: NOW - 3600,
  windowEnd: NOW + 3600,
  allowlist: [COUNTERPARTY],
  actionMask: 0b1111,
  disclosureLevel: DisclosureLevel.BOOLEAN,
};

/** A transport that records every call and returns fixed results. */
class RecordingTransport implements WritTransport {
  readonly calls: Array<{ method: string; payload: unknown }> = [];
  reason: bigint = BigInt(ReasonCode.IN_SCOPE);
  fact = 'within-writ';

  async submitIssueWrit(input: { expiry: number }): Promise<Uint8Array> {
    this.calls.push({ method: 'submitIssueWrit', payload: input });
    return reference('writ-id');
  }

  async submitCheckAction(input: {
    writId: Uint8Array;
    to: Uint8Array;
    amount: bigint;
    intent: number;
  }): Promise<{ reason: bigint; actionId: Uint8Array }> {
    this.calls.push({ method: 'submitCheckAction', payload: input });
    return { reason: this.reason, actionId: reference('action-id') };
  }

  async submitAttest(input: { actionId: Uint8Array; level: DisclosureLevel }): Promise<string> {
    this.calls.push({ method: 'submitAttest', payload: input });
    return this.fact;
  }

  async submitRevoke(input: { writId: Uint8Array }): Promise<void> {
    this.calls.push({ method: 'submitRevoke', payload: input });
  }

  async readCommitment(input: { writId: Uint8Array }): Promise<Uint8Array> {
    this.calls.push({ method: 'readCommitment', payload: input });
    return reference('commitment');
  }

  async readAuditRoot(): Promise<Uint8Array> {
    return reference('audit-root');
  }

  async readWritCount(): Promise<bigint> {
    return 42n;
  }

  async readInScopeCount(): Promise<bigint> {
    return 17n;
  }
}

describe('spend banding', () => {
  it('maps boundaries onto the same band as the circuit', () => {
    const ceiling = 1000n;

    expect(bandOf(0n, ceiling)).toBe(SpendBand.TIER_0);
    expect(bandOf(250n, ceiling)).toBe(SpendBand.TIER_0);
    expect(bandOf(251n, ceiling)).toBe(SpendBand.TIER_1);
    expect(bandOf(500n, ceiling)).toBe(SpendBand.TIER_1);
    expect(bandOf(501n, ceiling)).toBe(SpendBand.TIER_2);
    expect(bandOf(750n, ceiling)).toBe(SpendBand.TIER_2);
    expect(bandOf(751n, ceiling)).toBe(SpendBand.TIER_3);
    expect(bandOf(5000n, ceiling)).toBe(SpendBand.TIER_3);
  });

  it('never returns the amount or the ceiling', () => {
    expect(bandOf(987654321n, 1000n)).toBe(SpendBand.TIER_3);
  });
});

describe('allowlist normalisation', () => {
  it('pads a short allowlist to the contract capacity', () => {
    const padded = padAllowlist([COUNTERPARTY]);

    expect(padded).toHaveLength(ALLOWLIST_CAPACITY);
    expect(padded[0]).toBe(COUNTERPARTY);
    expect(padded[1]).toHaveLength(32);
  });

  it('rejects more counterparties than the contract holds', async () => {
    const many = Array.from({ length: ALLOWLIST_CAPACITY + 1 }, (_, i) => reference(`cp${i}`));

    await expect(
      createWrit(new RecordingTransport()).issue({
        ceiling: 1000n,
        window: { from: NOW, to: NOW + 60 },
        allowlist: many,
        actionMask: 1,
        disclosureLevel: DisclosureLevel.BOOLEAN,
      }),
    ).rejects.toThrow(/at most 8/);
  });

  it('rejects a counterparty that is not 32 bytes', async () => {
    await expect(
      createWrit(new RecordingTransport()).issue({
        ceiling: 1000n,
        window: { from: NOW, to: NOW + 60 },
        allowlist: [new Uint8Array(20)],
        actionMask: 1,
        disclosureLevel: DisclosureLevel.BOOLEAN,
      }),
    ).rejects.toThrow(/32 bytes/);
  });
});

describe('terms validation', () => {
  const transport = new RecordingTransport();

  it('rejects a window that ends before it starts', async () => {
    await expect(
      createWrit(transport).issue({
        ceiling: 1000n,
        window: { from: NOW, to: NOW - 60 },
        allowlist: [COUNTERPARTY],
        actionMask: 1,
        disclosureLevel: DisclosureLevel.BOOLEAN,
      }),
    ).rejects.toThrow(/windowEnd/);
  });

  it('rejects a zero ceiling', async () => {
    await expect(
      createWrit(transport).issue({
        ceiling: 0n,
        window: { from: NOW, to: NOW + 60 },
        allowlist: [COUNTERPARTY],
        actionMask: 1,
        disclosureLevel: DisclosureLevel.BOOLEAN,
      }),
    ).rejects.toThrow(/greater than zero/);
  });

  it('rejects a mask outside a byte', async () => {
    await expect(
      createWrit(transport).issue({
        ceiling: 1000n,
        window: { from: NOW, to: NOW + 60 },
        allowlist: [COUNTERPARTY],
        actionMask: 999,
        disclosureLevel: DisclosureLevel.BOOLEAN,
      }),
    ).rejects.toThrow(/between 0 and 255/);
  });
});

describe('sha256', () => {
  it('matches the published test vectors', () => {
    const encode = (value: string): Uint8Array =>
      new Uint8Array(Array.from(value, (character) => character.charCodeAt(0)));

    const toHex = (bytes: Uint8Array): string =>
      Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');

    expect(toHex(sha256(encode('')))).toBe(
      'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
    );
    expect(toHex(sha256(encode('abc')))).toBe(
      'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad',
    );
  });

  it('agrees with the platform implementation across block boundaries', async () => {
    const { createHash } = await import('node:crypto');

    for (const length of [0, 1, 55, 56, 63, 64, 65, 119, 120, 200]) {
      const input = new Uint8Array(length);
      for (let i = 0; i < length; i += 1) {
        input[i] = (i * 31 + 7) % 256;
      }

      const expected = createHash('sha256').update(Buffer.from(input)).digest('hex');
      const actual = Array.from(sha256(input), (byte) => byte.toString(16).padStart(2, '0')).join('');

      expect(actual).toBe(expected);
    }
  });
});

describe('sealing', () => {
  it('fingerprints terms deterministically', () => {
    expect(Buffer.from(fingerprintTerms(terms)).toString('hex')).toBe(
      Buffer.from(fingerprintTerms({ ...terms })).toString('hex'),
    );
  });

  it('changes the fingerprint when any single term changes', () => {
    const base = Buffer.from(fingerprintTerms(terms)).toString('hex');

    const variants: WritTerms[] = [
      { ...terms, ceiling: terms.ceiling + 1n },
      { ...terms, windowStart: terms.windowStart + 1 },
      { ...terms, windowEnd: terms.windowEnd + 1 },
      { ...terms, allowlist: [] },
      { ...terms, actionMask: 0b1110 },
      { ...terms, disclosureLevel: DisclosureLevel.BAND },
    ];

    for (const variant of variants) {
      expect(Buffer.from(fingerprintTerms(variant)).toString('hex')).not.toBe(base);
    }
  });

  it('encodes the allowlist length so short lists cannot collide', () => {
    const a = Buffer.from(encodeTerms({ ...terms, allowlist: [COUNTERPARTY] })).toString('hex');
    const b = Buffer.from(
      encodeTerms({ ...terms, allowlist: [COUNTERPARTY, new Uint8Array(32)] }),
    ).toString('hex');

    expect(a).not.toBe(b);
  });

  it('shortens hex for display', () => {
    expect(toShortHex(reference('abc'))).toMatch(/^0x[0-9a-f]{4}…[0-9a-f]{4}$/);
  });
});

describe('issue', () => {
  it('gives the transport an expiry and a level but never the terms', async () => {
    const transport = new RecordingTransport();
    await createWrit(transport).issue({
      ceiling: terms.ceiling,
      window: { from: terms.windowStart, to: terms.windowEnd },
      allowlist: [COUNTERPARTY],
      actionMask: terms.actionMask,
      disclosureLevel: DisclosureLevel.BAND,
    });

    const call = transport.calls[0];
    expect(call?.method).toBe('submitIssueWrit');

    const serialised = JSON.stringify(call?.payload, (_key, value: unknown) =>
      value instanceof Uint8Array ? Buffer.from(value).toString('hex') : value,
    );

    expect(serialised).not.toContain('ceiling');
    expect(serialised).not.toContain('window');
    expect(serialised).not.toContain('allowlist');
    expect(serialised).not.toContain('mask');
    // No counterparty reference reaches the transport either.
    expect(serialised).not.toContain(Buffer.from(COUNTERPARTY).toString('hex'));
    // And the distinctive ceiling from the fixture is absent as a decimal.
    expect(serialised).not.toContain('987654321');
  });

  it('returns the sealed terms and a local fingerprint', async () => {
    const result = await createWrit(new RecordingTransport()).issue({
      ceiling: terms.ceiling,
      window: { from: terms.windowStart, to: terms.windowEnd },
      allowlist: [COUNTERPARTY],
      actionMask: terms.actionMask,
      disclosureLevel: DisclosureLevel.BOOLEAN,
    });

    expect(result.terms.ceiling).toBe(terms.ceiling);
    expect(result.expiry).toBe(terms.windowEnd);
    expect(result.fingerprint).toHaveLength(32);
  });
});

describe('act', () => {
  it('maps an in scope result to IN_SCOPE', async () => {
    const transport = new RecordingTransport();
    transport.reason = BigInt(ReasonCode.IN_SCOPE);

    const verdict = await createWrit(transport).act({
      writ: reference('writ'),
      to: COUNTERPARTY,
      amount: 500n,
      intent: 1,
    });

    expect(verdict.inScope).toBe(true);
    expect(verdict.reason).toBe(ReasonCode.IN_SCOPE);
    expect(verdict.reasonLabel).toBe('within mandate');
  });

  it('maps every rejection to its own reason code', async () => {
    const expected: Array<[ReasonCode, boolean]> = [
      [ReasonCode.AMOUNT_ABOVE_CEILING, false],
      [ReasonCode.RECIPIENT_NOT_ALLOWED, false],
      [ReasonCode.OUTSIDE_WINDOW, false],
      [ReasonCode.INTENT_NOT_PERMITTED, false],
      [ReasonCode.WRIT_NOT_ACTIVE, false],
    ];

    for (const [code, inScope] of expected) {
      const transport = new RecordingTransport();
      transport.reason = BigInt(code);

      const verdict = await createWrit(transport).act({
        writ: reference('writ'),
        to: COUNTERPARTY,
        amount: 500n,
        intent: 1,
      });

      expect(verdict.reason).toBe(code);
      expect(verdict.inScope).toBe(inScope);
      expect(verdict.reasonLabel).toBe(describeReason(code));
    }
  });

  it('falls back to WRIT_NOT_ACTIVE for an unrecognised code', () => {
    expect(toReasonCode(99n)).toBe(ReasonCode.WRIT_NOT_ACTIVE);
  });

  it('labels every reason without naming a value', () => {
    for (const code of [
      ReasonCode.IN_SCOPE,
      ReasonCode.AMOUNT_ABOVE_CEILING,
      ReasonCode.RECIPIENT_NOT_ALLOWED,
      ReasonCode.OUTSIDE_WINDOW,
      ReasonCode.INTENT_NOT_PERMITTED,
      ReasonCode.WRIT_NOT_ACTIVE,
    ]) {
      const label = describeReason(code);
      expect(label).not.toMatch(/\d/);
      expect(label).not.toContain('987654321');
    }
  });

  it('refuses an obviously invalid action before spending a transaction', async () => {
    const transport = new RecordingTransport();

    await expect(
      createWrit(transport).act({
        writ: reference('writ'),
        to: COUNTERPARTY,
        amount: 0n,
        intent: 1,
      }),
    ).rejects.toThrow(/greater than zero/);

    expect(transport.calls).toHaveLength(0);
  });

  it('reports in scope only for code zero', () => {
    expect(isInScope(ReasonCode.IN_SCOPE)).toBe(true);
    expect(isInScope(ReasonCode.OUTSIDE_WINDOW)).toBe(false);
  });
});

describe('attest', () => {
  it('returns exactly one fact', async () => {
    const transport = new RecordingTransport();
    transport.fact = 'tier-2';

    const disclosure = await createWrit(transport).attest({
      action: reference('action'),
      level: DisclosureLevel.BAND,
    });

    expect(disclosure.fact).toBe('tier-2');
    expect(Object.keys(disclosure).sort()).toEqual(['actionId', 'fact', 'level']);
  });

  it('refuses a level of zero, which would disclose nothing', async () => {
    const transport = new RecordingTransport();

    await expect(
      createWrit(transport).attest({
        action: reference('action'),
        level: DisclosureLevel.NONE,
      }),
    ).rejects.toThrow(/discloses nothing/);

    expect(transport.calls).toHaveLength(0);
  });
});

describe('revoke and public reads', () => {
  it('revokes without passing anything but the writ id', async () => {
    const transport = new RecordingTransport();
    await createWrit(transport).revoke(reference('writ'));

    const call = transport.calls[0];
    expect(call?.method).toBe('submitRevoke');
    expect(Object.keys(call?.payload as object)).toEqual(['writId']);
  });

  it('reads the public counters and the audit root', async () => {
    const result = await createWrit(new RecordingTransport()).metrics();

    expect(result.writsIssued).toBe(42n);
    expect(result.actionsInScope).toBe(17n);
    expect(result.auditRoot).toHaveLength(32);
  });
});
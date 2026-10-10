// This file is part of Writ.
// Copyright (C) 2026 Writ contributors
// SPDX-License-Identifier: Apache-2.0

/*
 * The types an integrator touches.
 *
 * Nothing in this file ever leaves the caller's process. These shapes describe
 * sealed terms, private verdicts and the reason codes that stay with the agent.
 */

/** Lifecycle of a writ, matching WritStatus in WritRegistry.compact. */
export enum WritStatus {
  /** Issued and ready. */
  SEALED = 'sealed',
  /** At least one action has been verified in scope. */
  ACTIVE = 'active',
  /** The most recent action fell outside the mandate. */
  REJECTED = 'rejected',
  /** Revoked by the principal. The terms stay sealed. */
  REVOKED = 'revoked',
  /** A verifier has requested a scoped disclosure. */
  DISCLOSED = 'disclosed',
}

/** The most a contract will disclose, as fixed at issuance. */
export enum DisclosureLevel {
  /** Nothing is disclosable. */
  NONE = 0,
  /** One boolean per call: within-writ or rejected. */
  BOOLEAN = 1,
  /** One coarse spend band per call. */
  BAND = 2,
}

/** The mandate a principal seals before issuing a writ. */
export interface WritTerms {
  /** Maximum spend per action, in atomic units. */
  readonly ceiling: bigint;
  /** Start of the permitted window, unix seconds. */
  readonly windowStart: number;
  /** End of the permitted window, unix seconds. */
  readonly windowEnd: number;
  /** Permitted counterparties, at most 8 entries. */
  readonly allowlist: Uint8Array[];
  /** Bitfield of permitted intent classes. */
  readonly actionMask: number;
  /** Highest disclosure the principal will honour. */
  readonly disclosureLevel: DisclosureLevel;
}

/** The terms together with the public facts a ledger read returns. */
export interface WritRecord {
  /** The pseudonymous writ identifier. */
  readonly writId: Uint8Array;
  /** The commitment to the sealed terms. */
  readonly commitment: Uint8Array;
  /** Current lifecycle state. */
  readonly status: WritStatus;
  /** Expiry as unix seconds. */
  readonly expiry: number;
  /** The disclosure ceiling fixed at issuance. */
  readonly disclosureLevel: DisclosureLevel;
  /** The terms, present only in the issuing wallet's private state. */
  readonly terms?: WritTerms;
}

/** Why an action was accepted or rejected. Private to the agent. */
export enum ReasonCode {
  /** The action satisfied every bound. */
  IN_SCOPE = 0,
  /** The amount exceeded the sealed ceiling. */
  AMOUNT_ABOVE_CEILING = 1,
  /** The recipient was not on the sealed allowlist. */
  RECIPIENT_NOT_ALLOWED = 2,
  /** The action fell outside the sealed time window. */
  OUTSIDE_WINDOW = 3,
  /** The intent bit was not set in the sealed action mask. */
  INTENT_NOT_PERMITTED = 4,
  /** The writ is revoked, expired or otherwise not actionable. */
  WRIT_NOT_ACTIVE = 5,
}

/** The four coarse spend bands the contract publishes. */
export enum SpendBand {
  /** At or below a quarter of the ceiling. */
  TIER_0 = 'tier-0',
  /** Above a quarter and up to a half of the ceiling. */
  TIER_1 = 'tier-1',
  /** Above a half and up to three quarters of the ceiling. */
  TIER_2 = 'tier-2',
  /** Above three quarters of the ceiling. */
  TIER_3 = 'tier-3',
}

/** The result of acting under a writ. */
export interface ActionVerdict {
  /** The pseudonymous action identifier, for later attestation. */
  readonly actionId: Uint8Array;
  /** Whether every bound held. */
  readonly inScope: boolean;
  /** Why the action passed or failed. Never leaves the agent wallet. */
  readonly reason: ReasonCode;
  /** A short label for the agent's own logs. Never leaves the agent wallet. */
  readonly reasonLabel: string;
}

/** The single fact a verifier receives per disclosure. */
export interface Disclosure {
  /** The action the fact is about. */
  readonly actionId: Uint8Array;
  /** The level the fact was disclosed at. */
  readonly level: DisclosureLevel;
  /** Exactly one scoped fact. Nothing else is returned. */
  readonly fact: string;
}

/**
 * The transport the SDK drives. Every method maps one to one onto a circuit
 * call, so an integrator embeds the SDK and never writes a raw circuit call.
 *
 * The SDK deliberately depends on this interface rather than on a particular
 * wallet package. That keeps `AGENT_SIGNING_KEY` and the principal's key in the
 * agent service, out of the browser bundle, and lets a framework supply its own
 * transport.
 */
export interface WritTransport {
  /** Calls `issueWrit`. Resolves to the new writ id. */
  submitIssueWrit(input: {
    readonly expiry: number;
    /** Forwarded to the private state, never written to the ledger. */
    readonly disclosureLevel: DisclosureLevel;
  }): Promise<Uint8Array>;
  /** Calls `checkAction`. Resolves to the private reason code and action id. */
  submitCheckAction(input: {
    readonly writId: Uint8Array;
    readonly to: Uint8Array;
    readonly amount: bigint;
    readonly intent: number;
  }): Promise<{ readonly reason: bigint; readonly actionId: Uint8Array }>;
  /** Calls `attest`. Resolves to the single disclosed fact. */
  submitAttest(input: {
    readonly actionId: Uint8Array;
    readonly level: DisclosureLevel;
  }): Promise<string>;
  /** Calls `revoke`. */
  submitRevoke(input: { readonly writId: Uint8Array }): Promise<void>;
  /** Calls `statusOf`. Resolves to the commitment. */
  readCommitment(input: { readonly writId: Uint8Array }): Promise<Uint8Array>;
  /** Calls `auditRootOf`. */
  readAuditRoot(): Promise<Uint8Array>;
  /** Calls `writCountOf`. */
  readWritCount(): Promise<bigint>;
  /** Calls `inScopeCountOf`. */
  readInScopeCount(): Promise<bigint>;
}
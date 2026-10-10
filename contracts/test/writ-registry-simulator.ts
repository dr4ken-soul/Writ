// This file is part of Writ.
// Copyright (C) 2026 Writ contributors
// SPDX-License-Identifier: Apache-2.0

/*
 * A local testbed for WritRegistry.
 *
 * This runs the compiled circuit directly against an in memory ledger, so the
 * scope, disclosure and privacy tests need no devnet and no wallet. What it
 * proves is the circuit's behaviour and, for the privacy suite, what the public
 * ledger state actually contains after a writ has been issued.
 */

import {
  type CircuitContext,
  QueryContext,
  sampleContractAddress,
  createConstructorContext,
  CostModel,
} from '@midnight-ntwrk/compact-runtime';
import { Contract, type Ledger, ledger } from '../src/managed/writ-registry/contract/index.js';
import {
  type WritRegistryPrivateState,
  type WritTerms,
  createWritRegistryPrivateState,
  withTerms,
  writRegistryWitnesses,
} from '../src/writ-registry-witnesses.js';

/** The three keys the contract witnesses read. */
export type Identity = {
  principalSecretKey: Uint8Array;
  agentSecretKey: Uint8Array;
  verifierSecretKey: Uint8Array;
};

/** Deterministic 32 byte key for tests, so runs are reproducible. */
const key = (label: string): Uint8Array => {
  const out = new Uint8Array(32);
  for (let i = 0; i < 32; i += 1) {
    out[i] = (label.charCodeAt(i % label.length) + i * 7) % 256;
  }
  return out;
};

/** A fresh identity with three distinct keys. */
export const testIdentity = (label: string): Identity => ({
  principalSecretKey: key(`${label}:principal`),
  agentSecretKey: key(`${label}:agent`),
  verifierSecretKey: key(`${label}:verifier`),
});

/** A deterministic 32 byte counterparty reference. */
export const counterparty = (label: string): Uint8Array => key(`counterparty:${label}`);

/**
 * Serves as a testbed to exercise WritRegistry in tests.
 */
export class WritRegistrySimulator {
  readonly contract: Contract<WritRegistryPrivateState>;
  circuitContext: CircuitContext<WritRegistryPrivateState>;

  constructor(identity: Identity = testIdentity('default'), terms: WritTerms | null = null) {
    this.contract = new Contract<WritRegistryPrivateState>(writRegistryWitnesses);

    const base: WritRegistryPrivateState = {
      ...createWritRegistryPrivateState(),
      ...identity,
      terms: null,
    };
    const privateState = terms === null ? base : withTerms(base, terms);

    const { currentPrivateState, currentContractState, currentZswapLocalState } =
      this.contract.initialState(createConstructorContext(privateState, '0'.repeat(64)));

    this.circuitContext = {
      currentPrivateState,
      currentZswapLocalState,
      costModel: CostModel.initialCostModel(),
      currentQueryContext: new QueryContext(currentContractState.data, sampleContractAddress()),
    };
  }

  /**
   * Swaps the calling identity, so a test can act as the principal, the agent
   * or the verifier in turn.
   *
   * The sealed terms are carried across, because the circuit reads the terms
   * from whichever wallet is proving. A test passes null explicitly to act as a
   * wallet that holds no mandate.
   * @param identity - the keys to act with
   * @param terms - terms to carry across, or null to act without a mandate
   */
  public switchIdentity(identity: Identity, terms: WritTerms | null = null): void {
    this.circuitContext.currentPrivateState = {
      ...this.circuitContext.currentPrivateState,
      ...identity,
      terms,
    };
  }

  /**
   * Attaches sealed terms to the current identity, as a principal does before
   * issuing a writ.
   * @param terms - the mandate terms
   */
  public sealTerms(terms: WritTerms): void {
    this.circuitContext.currentPrivateState = withTerms(
      this.circuitContext.currentPrivateState,
      terms,
    );
  }

  /** Reads the public ledger state. */
  public getLedger(): Ledger {
    return ledger(this.circuitContext.currentQueryContext.state);
  }

  /** Issues a writ and returns the new writ id. */
  public issueWrit(expiry: bigint): Uint8Array {
    const { context, result } = this.contract.impureCircuits.issueWrit(this.circuitContext, expiry);
    this.circuitContext = context;
    return result;
  }

  /**
   * Checks one action and returns the reason code, the private value that only
   * the agent wallet receives.
   * @returns the reason code as written by the contract
   */
  public checkAction(
    writ: Uint8Array,
    to: Uint8Array,
    amount: bigint,
    intent: bigint,
  ): bigint {
    const { context, result } = this.contract.impureCircuits.checkAction(
      this.circuitContext,
      writ,
      to,
      amount,
      intent,
    );
    this.circuitContext = context;
    return result;
  }

  /**
   * Requests one scoped disclosure and returns the single disclosed fact.
   * @returns the disclosed fact string
   */
  public attest(action: Uint8Array, level: bigint): string {
    const { context, result } = this.contract.impureCircuits.attest(
      this.circuitContext,
      action,
      level,
    );
    this.circuitContext = context;
    return result;
  }

  /** Revokes a writ. */
  public revoke(writ: Uint8Array): void {
    const { context } = this.contract.impureCircuits.revoke(this.circuitContext, writ);
    this.circuitContext = context;
  }

  /** Public read of a writ's commitment. */
  public statusOf(writ: Uint8Array): Uint8Array {
    return this.contract.circuits.statusOf(this.circuitContext, writ).result;
  }

  /** Public read of the disclosure log root. */
  public auditRootOf(): Uint8Array {
    return this.contract.circuits.auditRootOf(this.circuitContext).result;
  }

  /** Public read of the writ counter. */
  public writCountOf(): bigint {
    return this.contract.circuits.writCountOf(this.circuitContext).result;
  }

  /** Public read of the in scope action counter. */
  public inScopeCountOf(): bigint {
    return this.contract.circuits.inScopeCountOf(this.circuitContext).result;
  }

  /**
   * Reads the action id of the most recent check, which a test needs in order
   * to ask for an attestation.
   *
   * The contract deliberately offers no circuit for this. Action ids are handed
   * to the participants of an action rather than published by the contract, so
   * the only way to reach one is to read the ledger as a test harness can.
   * @returns the most recent action id
   */
  public lastActionId(): Uint8Array {
    const state = this.getLedger();
    const index = Number(state.actionCount) - 1;
    const keys = state.actionWrits.keys();
    return keys[index] as Uint8Array;
  }
}
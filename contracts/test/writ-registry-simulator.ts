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
 *
 * The compact runtime is asynchronous: every circuit call returns a promise and
 * a fresh context, so this class threads the contract state and the private
 * state through each call.
 */

import {
  type CircuitContext,
  CostModel,
  createCircuitContext,
  createConstructorContext,
  emptyZswapLocalState,
  sampleContractAddress,
} from '@midnight-ntwrk/compact-runtime';
import {
  Contract,
  IntentClass,
  WritStatus,
  type Ledger,
  ledger,
} from '../src/managed/writ-registry/contract/index.js';
import {
  type WritRegistryPrivateState,
  type WritTerms,
  createWritRegistryPrivateState,
  withTerms,
  writRegistryWitnesses,
} from '../src/writ-registry-witnesses.js';

export { IntentClass, WritStatus };

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
 * Maps a disclosure code to the single fact it stands for.
 *
 * Compact cannot build an Opaque in-circuit, so the contract returns a code from
 * a fixed set and the client renders the fact. The mapping is total and the code
 * is chosen by the circuit, so the level gate and the one fact per call property
 * are unaffected.
 * @param code - the value returned by attest
 * @returns the disclosed fact
 */
export const disclosureFact = (code: bigint | number): string => {
  const facts = ['within-writ', 'rejected', 'tier-0', 'tier-1', 'tier-2', 'tier-3'];
  return facts[Number(code)] ?? 'rejected';
};

/**
 * Serves as a testbed to exercise WritRegistry in tests.
 *
 * Built with `WritRegistrySimulator.create` because the runtime's constructor
 * path is asynchronous.
 */
export class WritRegistrySimulator {
  readonly contract: Contract<WritRegistryPrivateState>;
  /** This simulator's own contract address. Bound once, so ids derive stably. */
  private readonly address: ReturnType<typeof sampleContractAddress>;
  private context: CircuitContext<WritRegistryPrivateState>;
  /**
   * The ledger state the next call executes against.
   *
   * Tracked here rather than read back out of `queryContexts`, because that map
   * is keyed by contract address and only holds entries for contracts that have
   * actually been called in this context.
   */
  private contractState: unknown;

  private constructor(
    contract: Contract<WritRegistryPrivateState>,
    context: CircuitContext<WritRegistryPrivateState>,
    contractState: unknown,
    address: ReturnType<typeof sampleContractAddress>,
  ) {
    this.contract = contract;
    this.context = context;
    this.contractState = contractState;
    this.address = address;
  }

  /**
   * Builds a simulator with a fresh contract and its initial ledger state.
   * @param identity - the keys to act with
   * @param terms - the mandate to seal, or null to act without one
   * @returns a ready simulator
   */
  public static async create(
    identity: Identity = testIdentity('default'),
    terms: WritTerms | null = null,
  ): Promise<WritRegistrySimulator> {
    const contract = new Contract<WritRegistryPrivateState>(writRegistryWitnesses);

    const base: WritRegistryPrivateState = {
      ...createWritRegistryPrivateState(),
      ...identity,
      terms: null,
    };
    const privateState = terms === null ? base : withTerms(base, terms);

    const coinPublicKey = '0'.repeat(64);
    const { currentPrivateState, currentContractState } = await contract.initialState(
      createConstructorContext(privateState, coinPublicKey),
    );

    const address = sampleContractAddress();

    const context = createCircuitContext<WritRegistryPrivateState>({
      circuitId: 'issueWrit',
      contractAddress: address,
      coinPublicKeyOrZswapState: emptyZswapLocalState(coinPublicKey),
      contractState: currentContractState,
      privateState: currentPrivateState,
      costModel: CostModel.initialCostModel(),
    });

    return new WritRegistrySimulator(contract, context, currentContractState, address);
  }

  /**
   * Runs one circuit and keeps the resulting context for the next call.
   * @param circuitId - the circuit to run
   * @param invoke - the circuit function to call
   * @param args - the circuit arguments
   * @returns the circuit result
   */
  private async run<R>(
    circuitId: string,
    invoke: (context: CircuitContext<WritRegistryPrivateState>, ...args: never[]) => Promise<{
      result: R;
      context: CircuitContext<WritRegistryPrivateState>;
    }>,
    ...args: unknown[]
  ): Promise<R> {
    const next = createCircuitContext<WritRegistryPrivateState>({
      circuitId,
      contractAddress: this.address,
      coinPublicKeyOrZswapState: emptyZswapLocalState('0'.repeat(64)),
      contractState: this.contractState,
      privateState: this.privateState,
      costModel: CostModel.initialCostModel(),
    });

    const { result, context } = await invoke(next, ...(args as never[]));
    this.context = context;

    const nextState = Object.values(context.queryContexts)[0];
    if (nextState !== undefined) {
      this.contractState = nextState.state;
    }

    return result;
  }

  /** The private state the next call executes against. */
  private get privateState(): WritRegistryPrivateState {
    return this.context.callContext.currentPrivateState as WritRegistryPrivateState;
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
    this.context.callContext.currentPrivateState = { ...this.privateState, ...identity, terms };
  }

  /**
   * Attaches sealed terms to the current identity, as a principal does before
   * issuing a writ.
   * @param terms - the mandate terms
   */
  public sealTerms(terms: WritTerms): void {
    this.context.callContext.currentPrivateState = withTerms(this.privateState, terms);
  }

  /** Reads the public ledger state. */
  public getLedger(): Ledger {
    return ledger(this.contractState as never);
  }

  /** Issues a writ and returns the new writ id. */
  public issueWrit(expiry: bigint): Promise<Uint8Array> {
    return this.run('issueWrit', this.contract.impureCircuits.issueWrit, expiry);
  }

  /**
   * Checks one action and returns the reason code, the private value only the
   * agent wallet receives.
   * @returns the reason code
   */
  public checkAction(
    writ: Uint8Array,
    to: Uint8Array,
    amount: bigint,
    intent: IntentClass,
  ): Promise<bigint> {
    return this.run('checkAction', this.contract.impureCircuits.checkAction, writ, to, amount, intent);
  }

  /**
   * Requests one scoped disclosure and returns the single disclosed fact.
   * @returns the disclosed fact
   */
  public attest(action: Uint8Array, level: bigint): Promise<string> {
    return this.run('attest', this.contract.impureCircuits.attest, action, level).then(
      disclosureFact,
    );
  }

  /** Revokes a writ. */
  public revoke(writ: Uint8Array): Promise<void> {
    return this.run('revoke', this.contract.impureCircuits.revoke, writ).then(() => undefined);
  }

  /** Public read of a writ's commitment. */
  public statusOf(writ: Uint8Array): Promise<Uint8Array> {
    return this.run('statusOf', this.contract.circuits.statusOf, writ);
  }

  /** Public read of the disclosure log root. */
  public auditRootOf(): Promise<Uint8Array> {
    return this.run('auditRootOf', this.contract.circuits.auditRootOf);
  }

  /** Public read of the writ counter. */
  public writCountOf(): Promise<bigint> {
    return this.run('writCountOf', this.contract.circuits.writCountOf);
  }

  /** Public read of the in scope action counter. */
  public inScopeCountOf(): Promise<bigint> {
    return this.run('inScopeCountOf', this.contract.circuits.inScopeCountOf);
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
    const entries = [...this.getLedger().actionWrits];
    const last = entries[entries.length - 1];
    return last![0];
  }
}
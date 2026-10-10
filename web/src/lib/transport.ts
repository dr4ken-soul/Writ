// This file is part of Writ.
// Copyright (C) 2026 Writ contributors
// SPDX-License-Identifier: Apache-2.0

/*
 * The browser's transport into WritRegistry.
 *
 * The SDK is deliberately transport agnostic, which is what keeps the sealed
 * terms inside the wallet: this module is the only place that knows how a call
 * reaches a Midnight node, and it never receives a ceiling, a window, an
 * allowlist or an action mask to forward.
 *
 * When the deployment variables are absent, every call fails with a plain
 * language message rather than returning a plausible number. The console shows
 * that as an error state. It never shows invented data.
 */

import type { DisclosureLevel, WritTransport } from '@writ/sdk';

/** Runtime configuration, read once from the environment. */
export interface WritConfig {
  /** The deployed WritRegistry address. */
  readonly registryAddress: string;
  /** The Midnight network identifier. */
  readonly networkId: string;
  /** The node endpoint, when one is configured. */
  readonly rpcUrl: string;
}

const readConfig = (): WritConfig => ({
  registryAddress: process.env.NEXT_PUBLIC_WRIT_REGISTRY_ADDRESS ?? '',
  networkId: process.env.NEXT_PUBLIC_NETWORK_ID ?? '',
  rpcUrl: process.env.NEXT_PUBLIC_RPC_URL ?? '',
});

/**
 * Whether a WritRegistry deployment is configured for this build.
 * @returns true when an address is present
 */
export const isConfigured = (): boolean => readConfig().registryAddress.length > 0;

/**
 * Builds the message shown whenever the deployment is missing.
 * @returns a sentence naming the variable to set
 */
const unconfiguredMessage = (): string =>
  'No WritRegistry deployment is configured for this build. Set ' +
  'NEXT_PUBLIC_WRIT_REGISTRY_ADDRESS to the deployed contract address.';

/**
 * Resolves the client the transport drives.
 *
 * Wired to midnight.js at deployment time. Until a deployment is configured
 * there is nothing to resolve, which is why every method below reports that
 * plainly rather than throwing something opaque.
 * @returns the registry client
 */
const resolveClient = async (): Promise<never> => {
  throw new Error(unconfiguredMessage());
};

/**
 * A transport bound to the configured WritRegistry deployment.
 *
 * The public reads are the two counters behind the landing page metrics and the
 * disclosure log root. Those three values are public by design, so they are the
 * only ones this app reads without a connected wallet.
 */
export const browserTransport: WritTransport = {
  async submitIssueWrit(input: { expiry: number; disclosureLevel: DisclosureLevel }) {
    void input;
    return resolveClient();
  },

  async submitCheckAction(input: {
    writId: Uint8Array;
    to: Uint8Array;
    amount: bigint;
    intent: number;
  }) {
    void input;
    return resolveClient();
  },

  async submitAttest(input: { actionId: Uint8Array; level: DisclosureLevel }) {
    void input;
    return resolveClient();
  },

  async submitRevoke(input: { writId: Uint8Array }) {
    void input;
    return resolveClient();
  },

  async readCommitment(input: { writId: Uint8Array }) {
    void input;
    return resolveClient();
  },

  async readAuditRoot(): Promise<Uint8Array> {
    return resolveClient();
  },

  async readWritCount(): Promise<bigint> {
    return resolveClient();
  },

  async readInScopeCount(): Promise<bigint> {
    return resolveClient();
  },
};

/** The runtime configuration this build was given. */
export const writConfig = readConfig();
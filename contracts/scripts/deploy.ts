// This file is part of Writ.
// Copyright (C) 2026 Writ contributors
// SPDX-License-Identifier: Apache-2.0

/*
 * Deploys WritRegistry and AuditLog to a Midnight network.
 *
 * Run against the local devnet from midnightntwrk/midnight-local-dev:
 *
 *   npm run deploy
 *
 * Configuration is read from the repository root .env, which is gitignored.
 * Fill in MIDNIGHT_DEPLOY_MNEMONIC or MIDNIGHT_DEPLOY_SEED, never both.
 *
 * On success the contract addresses are printed and written back into .env so
 * the frontend can be pointed at them.
 */

import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { setNetworkId } from '@midnight-ntwrk/midnight-js-network-id';
import { deployContract } from '@midnight-ntwrk/midnight-js-contracts';
import { indexerPublicDataProvider } from '@midnight-ntwrk/midnight-js-indexer-public-data-provider';
import { httpClientProofProvider } from '@midnight-ntwrk/midnight-js-http-client-proof-provider';
import { NodeZkConfigProvider } from '@midnight-ntwrk/midnight-js-node-zk-config-provider';
import { levelPrivateStateProvider } from '@midnight-ntwrk/midnight-js-level-private-state-provider';
import {
  LocalTestConfiguration,
  MidnightWalletProvider,
  createLogger,
} from '@midnight-ntwrk/testkit-js';

import { WritRegistryContract } from '../src/writ-registry-contract.js';
import { AuditLogContract } from '../src/audit-log-contract.js';
import {
  createWritRegistryPrivateState,
} from '../src/writ-registry-witnesses.js';
import { createAuditLogPrivateState } from '../src/audit-log-witnesses.js';

/** Ports published by midnight-local-dev. */
const PORTS = { indexer: 8088, node: 9944, proofServer: 6300 } as const;

/** Private state keys, which must match the ones the console uses later. */
const WRIT_PRIVATE_STATE_ID = 'writ-registry';
const AUDIT_PRIVATE_STATE_ID = 'writ-audit-log';

/**
 * Reads the repository root .env into a plain object.
 *
 * Deliberately hand written rather than pulling in dotenv: the deploy script is
 * the one place a key is read, so the parsing it uses should be visible.
 * @returns the parsed variables
 */
const readEnvFile = (): Record<string, string> => {
  const here = dirname(fileURLToPath(import.meta.url));
  const path = resolve(here, '..', '.env');

  let raw: string;
  try {
    raw = readFileSync(path, 'utf8');
  } catch {
    throw new Error(`No .env found at ${path}. Copy .env.example and fill in your key.`);
  }

  const out: Record<string, string> = {};
  for (const line of raw.split('\n')) {
    const trimmed = line.trim();
    if (trimmed.length === 0 || trimmed.startsWith('#')) {
      continue;
    }
    const split = trimmed.indexOf('=');
    if (split === -1) {
      continue;
    }
    out[trimmed.slice(0, split).trim()] = trimmed.slice(split + 1).trim();
  }
  return out;
};

/**
 * Writes the deployed addresses back into the root .env, leaving everything else
 * untouched.
 * @param path - the .env file to update
 * @param registry - the WritRegistry contract address
 * @param auditLog - the AuditLog contract address
 */
const writeBack = (path: string, registry: string, auditLog: string): void => {
  let raw = readFileSync(path, 'utf8');
  raw = raw.replace(
    /^NEXT_PUBLIC_WRIT_REGISTRY_ADDRESS=.*$/m,
    `NEXT_PUBLIC_WRIT_REGISTRY_ADDRESS=${registry}`,
  );
  raw = raw.replace(
    /^NEXT_PUBLIC_AUDIT_LOG_ADDRESS=.*$/m,
    `NEXT_PUBLIC_AUDIT_LOG_ADDRESS=${auditLog}`,
  );
  writeFileSync(path, raw);
};

/**
 * Deploys both contracts and prints their addresses.
 */
async function main(): Promise<void> {
  const env = readEnvFile();

  const mnemonic = env['MIDNIGHT_DEPLOY_MNEMONIC'] ?? '';
  const seed = env['MIDNIGHT_DEPLOY_SEED'] ?? '';

  if (mnemonic.length === 0 && seed.length === 0) {
    throw new Error(
      'Set MIDNIGHT_DEPLOY_MNEMONIC or MIDNIGHT_DEPLOY_SEED in .env. Fill in one, not both.',
    );
  }
  if (mnemonic.length > 0 && seed.length > 0) {
    throw new Error('Set only one of MIDNIGHT_DEPLOY_MNEMONIC and MIDNIGHT_DEPLOY_SEED.');
  }

  const logger = createLogger('info');

  const network = new LocalTestConfiguration(PORTS);
  setNetworkId(network.networkId);

  logger.info('connecting wallet');
  const wallet = await MidnightWalletProvider.build(
    logger,
    network,
    seed.length > 0 ? seed : undefined,
  );

  const here = dirname(fileURLToPath(import.meta.url));
  const zkConfigProvider = new NodeZkConfigProvider(
    resolve(here, 'src', 'managed', 'writ-registry'),
  );

  const providers = {
    privateStateProvider: levelPrivateStateProvider({
      privateStateStoreName: `writ-deploy-${Date.now()}`,
      privateStoragePasswordProvider: () => 'Writ-local-password-1!',
      accountId: wallet.getCoinPublicKey(),
    }),
    publicDataProvider: indexerPublicDataProvider(network.indexer, network.indexerWS),
    zkConfigProvider,
    proofProvider: httpClientProofProvider(network.proofServer, zkConfigProvider),
    walletProvider: wallet,
    midnightProvider: wallet,
  };

  logger.info('deploying WritRegistry');
  const registry = await deployContract(providers, {
    compiledContract: WritRegistryContract,
    privateStateId: WRIT_PRIVATE_STATE_ID,
    args: [],
    initialPrivateState: createWritRegistryPrivateState(),
  });

  logger.info('deploying AuditLog');
  const auditLog = await deployContract(providers, {
    compiledContract: AuditLogContract,
    privateStateId: AUDIT_PRIVATE_STATE_ID,
    args: [],
    initialPrivateState: createAuditLogPrivateState(),
  });

  const registryAddress = registry.contractAddress;
  const auditLogAddress = auditLog.contractAddress;

  writeBack(resolve(here, '..', '.env'), registryAddress, auditLogAddress);

  process.stdout.write('\n');
  process.stdout.write('Deployed.\n');
  process.stdout.write(`NEXT_PUBLIC_WRIT_REGISTRY_ADDRESS=${registryAddress}\n`);
  process.stdout.write(`NEXT_PUBLIC_AUDIT_LOG_ADDRESS=${auditLogAddress}\n`);
  process.stdout.write('\nCopy the registry address into web/.env.local and onto Vercel.\n');
}

main().catch((error: unknown) => {
  process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
  process.exitCode = 1;
});
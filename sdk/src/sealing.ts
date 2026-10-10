// This file is part of Writ.
// Copyright (C) 2026 Writ contributors
// SPDX-License-Identifier: Apache-2.0

/*
 * Client side sealing.
 *
 * The commitment the ledger stores is computed inside the circuit from the
 * sealed terms, because only the circuit may see them. What this module
 * produces is a local fingerprint: a hash the principal keeps in their own
 * private state so they can prove later that the terms they sealed are the terms
 * they meant.
 *
 * The fingerprint is never published. It exists to catch a wallet restoring the
 * wrong private state, nothing more.
 *
 * The hash is implemented here rather than imported so the same code runs in a
 * browser bundle and in a Node test runner. A `node:crypto` import would not
 * survive the bundler, and an async WebCrypto call would force every caller to
 * await a value that is only ever used locally.
 */

import { type WritTerms } from './types.js';

/** The first 32 bits of the fractional parts of the cube roots of the first 64 primes. */
const K = new Uint32Array([
  0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
  0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
  0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
  0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
  0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
  0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
  0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
  0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2,
]);

/**
 * Computes SHA-256 over a byte string.
 *
 * A direct implementation of FIPS 180-4, kept here so this module has no runtime
 * dependency and no environment specific import.
 * @param message - the bytes to hash
 * @returns the 32 byte digest
 */
export const sha256 = (message: Uint8Array): Uint8Array => {
  const h = new Uint32Array([
    0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a, 0x510e527f, 0x9b05688c, 0x1f83d9ab,
    0x5be0cd19,
  ]);

  // Pad to a multiple of 64 bytes: a 0x80 byte, zeros, then a 64 bit length.
  // Rounding up by (length + 9) is what makes the length field fit, and getting
  // it wrong only shows up at the block boundaries.
  const bitLength = message.length * 8;
  const paddedLength = (Math.floor((message.length + 8) / 64) + 1) * 64;
  const padded = new Uint8Array(paddedLength);
  padded.set(message);
  padded[message.length] = 0x80;

  const view = new DataView(padded.buffer);
  view.setUint32(paddedLength - 8, Math.floor(bitLength / 0x100000000));
  view.setUint32(paddedLength - 4, bitLength >>> 0);

  const w = new Uint32Array(64);

  for (let offset = 0; offset < paddedLength; offset += 64) {
    for (let i = 0; i < 16; i += 1) {
      w[i] = view.getUint32(offset + i * 4);
    }
    for (let i = 16; i < 64; i += 1) {
      const s0 = rotr(w[i - 15]!, 7) ^ rotr(w[i - 15]!, 18) ^ (w[i - 15]! >>> 3);
      const s1 = rotr(w[i - 2]!, 17) ^ rotr(w[i - 2]!, 19) ^ (w[i - 2]! >>> 10);
      w[i] = (w[i - 16]! + s0 + w[i - 7]! + s1) >>> 0;
    }

    let a = h[0]!;
    let b = h[1]!;
    let c = h[2]!;
    let d = h[3]!;
    let e = h[4]!;
    let f = h[5]!;
    let g = h[6]!;
    let hh = h[7]!;

    for (let i = 0; i < 64; i += 1) {
      const s1 = rotr(e, 6) ^ rotr(e, 11) ^ rotr(e, 25);
      const ch = (e & f) ^ (~e & g);
      const temp1 = (hh + s1 + ch + K[i]! + w[i]!) >>> 0;
      const s0 = rotr(a, 2) ^ rotr(a, 13) ^ rotr(a, 22);
      const maj = (a & b) ^ (a & c) ^ (b & c);
      const temp2 = (s0 + maj) >>> 0;

      hh = g;
      g = f;
      f = e;
      e = (d + temp1) >>> 0;
      d = c;
      c = b;
      b = a;
      a = (temp1 + temp2) >>> 0;
    }

    h[0] = (h[0]! + a) >>> 0;
    h[1] = (h[1]! + b) >>> 0;
    h[2] = (h[2]! + c) >>> 0;
    h[3] = (h[3]! + d) >>> 0;
    h[4] = (h[4]! + e) >>> 0;
    h[5] = (h[5]! + f) >>> 0;
    h[6] = (h[6]! + g) >>> 0;
    h[7] = (h[7]! + hh) >>> 0;
  }

  const digest = new Uint8Array(32);
  const digestView = new DataView(digest.buffer);
  for (let i = 0; i < 8; i += 1) {
    digestView.setUint32(i * 4, h[i]!);
  }
  return digest;
};

/**
 * Rotates a 32 bit value right by `bits`.
 * @param value - the value to rotate
 * @param bits - the rotation amount
 * @returns the rotated value
 */
const rotr = (value: number, bits: number): number =>
  ((value >>> bits) | (value << (32 - bits))) >>> 0;

/**
 * Encodes terms into a single byte string with an unambiguous layout.
 *
 * Numbers are fixed width little endian, and the allowlist is length prefixed,
 * so no two different term sets can encode to the same bytes.
 * @param terms - the mandate terms
 * @returns the canonical encoding
 */
export const encodeTerms = (terms: WritTerms): Uint8Array => {
  const chunks: Uint8Array[] = [];

  /**
   * Encodes a 64 bit value as eight little endian bytes.
   * @param value - the value to encode
   * @returns the eight byte encoding
   */
  const uint64 = (value: bigint): Uint8Array => {
    const out = new Uint8Array(8);
    let remaining = value < 0n ? 0n : value;
    for (let i = 0; i < 8; i += 1) {
      out[i] = Number(remaining & 0xffn);
      remaining >>= 8n;
    }
    return out;
  };

  chunks.push(uint64(terms.ceiling));
  chunks.push(uint64(BigInt(Math.max(0, Math.trunc(terms.windowStart)))));
  chunks.push(uint64(BigInt(Math.max(0, Math.trunc(terms.windowEnd)))));
  chunks.push(Uint8Array.from([terms.allowlist.length & 0xff]));
  for (const entry of terms.allowlist) {
    chunks.push(entry);
  }
  chunks.push(uint64(BigInt(terms.actionMask & 0xff)));
  chunks.push(Uint8Array.from([terms.disclosureLevel & 0xff]));

  const total = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
  const out = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    out.set(chunk, offset);
    offset += chunk.length;
  }
  return out;
};

/**
 * Computes the local fingerprint of a set of sealed terms.
 *
 * Deterministic, so the same terms always fingerprint the same way and a
 * principal can compare across sessions.
 * @param terms - the mandate terms
 * @returns a 32 byte fingerprint
 */
export const fingerprintTerms = (terms: WritTerms): Uint8Array => sha256(encodeTerms(terms));

/**
 * Renders a fingerprint or commitment as a shortened hex string for display.
 *
 * Always shortened: showing a full commitment in the console invites copy and
 * paste of a value that should stay local.
 * @param bytes - the value to render
 * @returns a hex string of the form `0x7c…a41e`
 */
export const toShortHex = (bytes: Uint8Array): string => {
  let hex = '';
  for (const byte of bytes) {
    hex += byte.toString(16).padStart(2, '0');
  }
  if (hex.length <= 10) {
    return `0x${hex}`;
  }
  return `0x${hex.slice(0, 4)}…${hex.slice(-4)}`;
};
# Writ: Build Guide

## Before You Write a Single Line of Code

Read APP_BLUEPRINT.md and FRONTEND_SPEC.md in full. Every data structure, contract function and disclosure rule is in APP_BLUEPRINT.md. Every class, animation value, z-index and piece of copy for the landing page is in FRONTEND_SPEC.md. This guide sequences the build, it does not repeat content that exists at full fidelity elsewhere. Where a step says "as specified in X", read that section before writing the file, do not guess. CLAUDE.md is the persistent context file for future sessions and sits alongside this guide.

---

## Prerequisites

```bash
node --version    # 18 or higher
npm --version     # 9 or higher
git --version     # any recent version
docker --version  # for the local Midnight devnet
```

- The Compact compiler from the midnightntwrk org, version pinned from docs.midnight.network at the time of build
- midnight.js SDK packages (`@midnight-ntwrk/sdk` and companions) pinned to match the compiler
- A Midnight wallet (Lace or compatible) for test-environment deployment and the demo
- Clone the reference resources as patterns to learn from, not folders to build inside:
  - `github.com/midnightntwrk/midnight-local-dev` for the local node
  - the bboard example and the midnight-rps sample app for contract and client wiring patterns

Treat all reference repositories as read-only patterns. The Writ contracts and SDK are written fresh.

---

## Repository Setup

```bash
mkdir writ && cd writ
git init
mkdir -p contracts/{src,test}
mkdir -p sdk/src
mkdir -p web/src/{app/console/{writs/new,actions,audit},components/{scope-seal,layout,wallet,sections},hooks,styles,lib}
mkdir -p docs
```

Root `.env` (copied into each package as needed, never committed):

```
NEXT_PUBLIC_NETWORK_ID=
NEXT_PUBLIC_RPC_URL=
NEXT_PUBLIC_WRIT_REGISTRY_ADDRESS=
NEXT_PUBLIC_WALLET_CONNECT_ID=
AGENT_SIGNING_KEY=
AGENT_RPC_URL=
AGENT_POLL_INTERVAL_MS=15000
```

Repository settings before the first push:
- Add topics `midnightntwrk` and `midnightntwrk-compact` (submission requirement)
- Add `LICENSE` with Apache License 2.0 covering the Midnight-related code
- Public visibility from the start

---

## Phase 1: Compact Contracts

### Step 1.1: Toolchain setup

```bash
cd contracts
npm init -y
npm install --save-dev typescript ts-node @types/node
npm install @midnight-ntwrk/sdk
```

Install and pin the Compact compiler per the current docs (the package name and command come from docs.midnight.network; pin exactly and record the version in the README). Start the local devnet:

```bash
docker compose -f ../reference/midnight-local-dev/docker-compose.yml up -d
```

Confirm the node is producing blocks before writing contract code.

### Step 1.2: WritRegistry, state and issuance

Create `contracts/src/WritRegistry.compact` with the surface specified in APP_BLUEPRINT.md, Midnight Integration Detail. Implement `issueWrit`, `statusOf` and `revoke` first. Rules for this file:

- Ledger state holds commitments, statuses and the audit root only
- Terms enter as sealed values associated with the issuing principal's private state
- Every circuit carries a comment stating what it must never disclose

Compile early and often. A compiling contract is the technical gate; do not defer the first successful compile past the end of Step 1.2.

### Step 1.3: Scope circuit

Implement `checkAction` exactly as specified in APP_BLUEPRINT.md. The circuit checks amount against the sealed ceiling, recipient against the sealed allowlist, time against the sealed window and intent against the sealed action mask, producing a sealed verdict. The public output is a status change only. The reason code goes back to the calling wallet through the client layer, never through a ledger write.

### Step 1.4: Disclosure and audit

Implement `attest` with the disclosure level fixed at issuance. Any requested level above the policy reverts. Every successful call appends to the audit log (`AuditLog.compact`) and advances its root. Implement `AuditLog.compact` as an append-only accumulator with a public root and a view function.

### Step 1.5: Tests

Write three test files as specified in the project structure:

- `scope.test.ts`: in-scope action verifies; out-of-scope amount, recipient, window and intent each reject
- `disclosure.test.ts`: allowed disclosure level returns exactly one fact; disallowed level reverts; audit root advances
- `privacy.test.ts`: the privacy claim, checked against raw ledger state. Issue a writ with distinctive terms (for example ceiling 987654321) and assert the byte representation of the terms never appears in any public state read. This test is the evidence the judge story rests on

Run everything against the local devnet. All green before moving on.

### Step 1.6: Deploy and verify

Deploy `WritRegistry` and `AuditLog` to the configured Midnight environment per the docs. Record the deployed addresses in `.env`. Confirm the deployment is visible in the explorer before moving on. An unverified or missing deployment makes the demo video look unfinished.

---

## Phase 2: SDK

### Step 2.1: Package setup

```bash
cd ../sdk
npm init -y
npm install @midnight-ntwrk/sdk
npm install --save-dev typescript @types/node
```

### Step 2.2: SDK wrappers

Implement `issue.ts`, `act.ts`, `attest.ts` and `index.ts` wrapping the four calls exactly as specified in APP_BLUEPRINT.md, SDK Surface. JSDoc on every function. The wrappers own all client-side sealing and reason-code handling so integrators never touch raw circuit calls.

---

## Phase 3: Frontend

### Step 3.1: Next.js and Tailwind setup

```bash
cd ../web
npx create-next-app@latest . --typescript --tailwind --app
npm install motion lucide-react
npm install @midnight-ntwrk/sdk
```

Translate the colour system and font imports from FRONTEND_SPEC.md Sections 1.1 and 1.2 into `tailwind.config.ts` and `src/styles/globals.css` exactly as written there. This is the one part of the spec that gets copied in full since it is foundational wiring. Add the global scrollbar rules and the semantic z-index scale (Sections 1.3 and 1.8).

### Step 3.2: Providers and wallet layer

Wire the Midnight wallet provider in `src/lib/`. Implement `ConnectModal.tsx` with the full state machine from FRONTEND_SPEC.md Section 2.2 (intro, connecting with disabled close, success, error with retry). Implement `ProtectedRoute` for the console routes with the hydration-first rule: never redirect while the provider session is restoring. Implement the `WalletMenu` dropdown and `DisconnectToast` exactly as specified.

### Step 3.3: ScopeSeal

Create `src/components/scope-seal/ScopeSeal.tsx` exactly as specified in FRONTEND_SPEC.md Section 1.4: canvas 2D, DPR-aware, single requestAnimationFrame loop paused when hidden, the four-state machine driven by section observers, density-based opacity with 0.04-per-frame lerp, reduced-motion static fallback. Mount once in the root layout, not per page.

### Step 3.4: Navigation

Create `src/components/layout/Nav.tsx` exactly as specified in FRONTEND_SPEC.md Section 2: the A2 scroll-morph with the 80px threshold, spring layout transition, expanded and pill states, mobile full-screen overlay menu, wallet-gated CTA handler.

### Step 3.5: Landing sections

One component file per section in `src/components/sections/`, implemented against the matching numbered section of FRONTEND_SPEC.md:

- `Hero.tsx`: Section 3 (mandate panel with text-scramble rows)
- `Problem.tsx`: Section 4
- `Mechanism.tsx`: Section 5
- `LiveMetrics.tsx`: Section 6, wire two metrics to real contract reads, third fixed at 0
- `Integration.tsx`: Section 7 (tabbed explorer with AnimatePresence)
- `Compare.tsx`: Section 8
- `Trust.tsx`: Section 9
- `FinalCta.tsx`: Section 10
- `Footer.tsx`: Section 11

Assemble in `src/app/page.tsx` in the order given in FRONTEND_SPEC.md. Copy for every element is final text from the spec.

### Step 3.6: Console pages

Implement the console per FRONTEND_SPEC.md Section 12: sidebar layout, dashboard hardening (borders over cards), skeleton loaders, empty states with a primary action. Wire `writs/new` to `@writ/sdk` `issue`, `actions` to `act` with private reason display, `audit` to `attest` results and the audit root viewer.

### Step 3.7: Build and deploy

```bash
npm run build
vercel --cwd web
```

Add the hosting fallback configuration named in FRONTEND_SPEC.md Section 2.2 and run the refresh/deep-link acceptance tests on the deployed URL before recording anything.

---

## Phase 4: Quality Audit

Run through this list before recording the demo video.

**Contracts audit:**
- `issueWrit` produces a transaction with no readable terms in any public field, confirmed in the explorer
- `checkAction` rejects each out-of-scope dimension independently
- `attest` reverts above the issuance-time disclosure level
- `revoke` changes status only
- All tests green, including the byte-level privacy assertion

**SDK audit:**
- The four wrappers work against the deployed contracts with no raw circuit calls leaking into integrator code
- Reason codes never leave the agent wallet path

**Frontend audit:**
- No mock data anywhere; every number in Live Metrics is a real contract read
- Logo and favicon remain plain comment slots
- Nav morph, ScopeSeal states and tab switching behave as specified
- Console loads a protected deep link correctly on refresh
- Mobile viewport: hero stacks panel-first, no horizontal overflow

**Final checklist (matches APP_BLUEPRINT.md):**
- Public repository with `midnightntwrk` topics, Apache 2.0 licence, complete README
- Slide deck and demo video
- Wave-progress description (and change log for Wave 3 resubmission)
- Preview URL live for judges

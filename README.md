# Writ

**Issue the authority. Prove every action stayed inside it. Publish nothing else.**

Writ is a private mandate layer for AI agents on Midnight. A principal defines a scope: spend
ceiling, time window, allowed counterparties, action mask. Those terms are sealed into private
state before any transaction is built. Every action the agent takes is checked inside a Compact
circuit against the sealed terms. In-scope actions return a proof. Out-of-scope attempts are
rejected without exposing which bound stopped them. Verifiers receive scoped facts through
contract-controlled disclosure, and every disclosure lands in an append-only audit log.

Built for the Midnight Buildathon on AKINDO.

---

## Status of this build

Read this before judging the code. It is the most important section in the file.

| Area | State | Evidence |
|---|---|---|
| `@writ/sdk` | **Built and tested** | 26 of 26 tests pass, `tsc` clean, package builds |
| `web` (landing + console) | **Built and tested** | `next build` clean across all 6 routes, verified in a browser |
| `contracts/src/*.compact` | **Written, not compiled** | see below |
| `contracts/test/*.test.ts` | **Written, not run** | see below |
| Deployment to a Midnight network | **Not done** | see below |

### What has not been verified, and why

Three things prevented the contracts from being compiled and run in the machine this was built
on, and they are worth stating plainly rather than burying:

1. **No Windows binary exists for the Compact compiler.** The `compact-v0.5.3` release publishes
   `apple-darwin` and `aarch64-linux-musl` artefacts only. There is no Windows target.
2. **No container runtime was available**, so `midnightntwrk/midnight-local-dev` could not be
   started and the contract test suites could not be executed.
3. **No Midnight wallet was available**, so no deployment or end-to-end wallet run was possible.

The Compact sources are written against the current reference (`pragma language_version 0.23`,
matching the official `midnightntwrk/example-bboard` and `midnight-examples/private-bid` examples)
and every circuit carries a comment on what it must never disclose. But they have **not been
compiled**, and this README does not claim otherwise. Running `npm run compact` on Linux or macOS
is the first thing to do, and it is the buildathon's technical gate.

The frontend and SDK are genuinely verified: they build, typecheck, pass their tests and render.
Where the app needs a contract that is not deployed, it says so in the interface rather than
inventing a number.

---

## Architecture

```
seal (client)      the principal seals terms into private state
issue (contract)   issueWrit(expiry) -> writ id, status Sealed
                     public: commitment, status, expiry, disclosure level
                     private: ceiling, window, allowlist, mask
act (contract)     checkAction(writ, to, amount, intent) -> reason code
                     public: status change, action verdict, coarse spend band
                     private to the agent: which bound failed
attest (contract)  attest(action, level) -> exactly one scoped fact
                     public: audit log append, status Disclosed
revoke (contract)  revoke(writ) -> status Revoked, terms stay sealed
```

The dual-ledger model is the product. Public state holds commitments, statuses, counters and an
audit root. Private state holds the ceiling, the window, the allowlist and the action mask. A
byte-level test in `contracts/test/privacy.test.ts` asserts the terms never appear in public
state.

### Repository layout

```
writ/
├── contracts/
│   ├── src/
│   │   ├── WritRegistry.compact     issue, checkAction, attest, revoke, statusOf
│   │   ├── AuditLog.compact         append-only disclosure log with a running root
│   │   ├── writ-registry-witnesses.ts   private state and the term witnesses
│   │   └── audit-log-witnesses.ts
│   └── test/
│       ├── writ-registry-simulator.ts   local circuit testbed, no devnet needed
│       ├── scope.test.ts                in-scope passes, each bound rejects
│       ├── disclosure.test.ts           one fact, gated level, advancing root
│       └── privacy.test.ts              byte-level assertion over raw ledger state
├── sdk/                             @writ/sdk: issue, act, attest, revoke, status
├── web/                             Next.js 14 landing page and wallet-gated console
├── docs/                            the original specification set
└── LICENSE                          Apache 2.0
```

---

## Running it

### Prerequisites

- Node 18 or newer, npm 9 or newer
- Docker, for the local Midnight devnet
- The Compact compiler, pinned from [docs.midnight.network](https://docs.midnight.network/compact)
- A Midnight wallet (Lace or compatible) for deployment and the demo

### The SDK

Runs anywhere. No chain needed.

```bash
cd sdk
npm install
npm test        # 26 tests, no network
npm run build
```

### The web app

```bash
cd web
npm install
npm run dev
```

Copy `.env.example` to `.env.local` and fill in `NEXT_PUBLIC_WRIT_REGISTRY_ADDRESS` once the
contracts are deployed. Without it the landing page and console render an explicit
"no deployment configured" state rather than placeholder numbers.

### The contracts

Requires the Compact compiler and a local node. The test suites run against the compiled circuit
in memory, so they need no devnet, but they do need the compiler.

```bash
cd contracts
npm install
npm run compact    # writes src/managed/*
npm test
```

For a local node, follow the `midnightntwrk/midnight-local-dev` guide, then record the deployed
addresses in the root `.env`.

---

## How to test Writ as a judge

1. **Read the contract.** `contracts/src/WritRegistry.compact` opens with a comment stating, for
   each circuit, exactly what it must never disclose. Confirm the terms never reach a ledger
   write.
2. **Compile it.** `cd contracts && npm run compact`. The ledger declarations at the top of the
   file are the entire public surface: commitments, statuses, principals, expiries, disclosure
   levels, action records, three counters and the audit root.
3. **Run the scope suite.** `npm test`. An in-scope action returns 0; amount, recipient, window and
   intent each return their own reason code.
4. **Run the privacy suite.** `contracts/test/privacy.test.ts` issues a writ with a ceiling of
   `987654321`, acts on it, attests, then walks the entire public ledger and fails if the ceiling,
   the window or the allowlist entry appears in any encoding. It also fails if the ledger is empty,
   so it cannot pass for the wrong reason.
5. **Run the SDK tests.** `cd sdk && npm test`. Among other things, one test asserts that the
   transport handed to `issue` never receives a ceiling, a window, an allowlist or a mask.
6. **Open the site.** `cd web && npm run dev`. The hero shows a mandate panel whose sensitive rows
   are masked and never resolve. The live metrics section reads the contract or says plainly that
   it cannot.

---

## Midnight integration

| Layer | Choice |
|---|---|
| Contracts | Compact on Midnight, language version 0.23 |
| Private state | witness-held, sealed, never disclosed |
| Public state | commitments, statuses, counters, audit root |
| Disclosure | contract-controlled, level fixed at issuance, always audit-logged |
| Client | midnight.js TypeScript providers |
| Local node | midnightntwrk/midnight-local-dev (Docker) |
| Database | none, by design |

The SDK depends on a `WritTransport` interface rather than on a wallet package. That is what keeps
the principal's key in the browser and an agent's signing key in an agent service, with the same
five calls in both. `AGENT_SIGNING_KEY` never enters the frontend bundle.

### One deliberate design decision worth flagging

`disclosureLevels` is stored in **public** ledger state. This is the only policy value published.
It has to be: `attest` is called by a verifier who does not hold the principal's private state, so
the circuit needs the level in order to enforce the ceiling without asking the principal for
anything. The level reveals how much may be disclosed, never what the terms are. A byte-level
test asserts the ceiling, the window and the allowlist never appear, while allowing this one
value.

More detail, including the reason codes and the disclosure model, is in
[docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).

---

## What is not being built

- Settlement adapters. Writ governs actions; execution hooks are the integrator's.
- Sub-delegation, organisation hierarchies, one principal and one writ.
- Full-reveal dispute mode. A principal may deliberately publish terms later; that is out of scope,
  not implied.
- An off-chain indexer or database.
- Mobile apps and fee abstraction.

---

## Licence

Apache 2.0 across the whole repository, covering all Midnight-related code as the buildathon
requires. See [LICENSE](LICENSE).
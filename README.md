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
| `contracts/src/*.compact` | **Compiles** | `compact 0.5.3`, 8 circuits in WritRegistry and 4 in AuditLog, provers and verifiers generated |
| `contracts/test/*.test.ts` | **23 of 23 pass** | run against the compiled circuit in memory, no devnet needed |
| `@writ/sdk` | **Built and tested** | 26 of 26 tests pass, `tsc` clean, package builds |
| `web` (landing + console) | **Built and tested** | `next build` clean across all 6 routes, verified in a browser |
| Deployment to a Midnight network | **Not done** | needs a node and a funded wallet |

### How the contracts are compiled

The Compact compiler publishes no Windows binary. The release artefacts are
`apple-darwin` and `x86_64-unknown-linux-musl`, so on Windows the build runs inside WSL:

```bash
# once
curl -sL https://github.com/midnightntwrk/compact/releases/download/compact-v0.5.3/compact-x86_64-unknown-linux-musl.tar.xz | tar -xJ

# every build
cd contracts/scripts && bash compact-build.sh
```

`contracts/scripts/compact-build.sh` compiles both contracts into
`contracts/src/managed/`. The script is also the single entry point on Linux and
macOS, where you can point `COMPACT_BIN` at your install instead.

### What is still not verified

Two things, and neither is a claim in disguise:

1. **No deployment.** There are no contract addresses, so
   `NEXT_PUBLIC_WRIT_REGISTRY_ADDRESS` is unset and the frontend renders its
   explicit "no deployment configured" state rather than a plausible number.
   Deploying needs a running node and a funded Midnight wallet, neither of which
   existed on the build machine.
2. **No funded wallet.** Everything above was exercised against the compiled
   circuit in process, which is why the test suites can run without a node, but
   an end-to-end run against a live network is still outstanding.

The contracts themselves are compiled, the full private-state flow is proven by a
byte-level assertion over the real ledger, and the frontend is verified in a
browser. That is the honest boundary.

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

Needs the Compact compiler. `contracts/scripts/compact-build.sh` is the entry point, and the test
suites run against the compiled circuit in memory, so they need no devnet.

```bash
cd contracts
npm install
npm run compact    # writes src/managed/*
npm test           # 23 tests
```

On Windows, run the compile through WSL as shown above. For a local node, follow the
`midnightntwrk/midnight-local-dev` guide, then record the deployed addresses in the root `.env`.

---

## How to test Writ as a judge

1. **Read the contract.** `contracts/src/WritRegistry.compact` opens with a comment stating, for
   each circuit, exactly what it must never disclose. Confirm the terms never reach a ledger
   write.
2. **Compile it.** `cd contracts/scripts && bash compact-build.sh` on Linux or macOS, or through
   WSL on Windows. The ledger declarations at the top of the file are the entire public surface:
   commitments, statuses, principals, expiries, disclosure levels, the authorised agent, action
   records, four counters and the audit root.
3. **Run the scope suite.** `cd contracts && npm test`. An in-scope action returns 0; amount,
   recipient, window and intent each return their own reason code, and an agent that was not
   registered at issuance is refused.
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
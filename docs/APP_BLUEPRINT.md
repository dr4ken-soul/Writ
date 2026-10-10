# Writ: App Blueprint

## Product Summary

Writ is a private mandate layer for AI agents on Midnight. A principal defines what an agent may do: spend ceiling, time window, allowed counterparties, action mask. Those terms are sealed into private state before any transaction is built. Every action the agent takes is checked inside a Compact circuit against the sealed terms. In-scope actions return a verifiable proof. Out-of-scope attempts are rejected without exposing which bound stopped them. When policy requires it, the contract discloses scoped facts to an auditor and writes the disclosure to an append-only log.

Built for the Midnight Buildathon on AKINDO, three-wave program, Wave 2 and Wave 3 submissions. Midnight is the entire trust layer. Remove it and Writ is a permissions file with extra steps.

---

## Market Context

**Who this is for:**

1. Teams deploying AI agents that hold spending power, data access or signing rights. Today those agents run on API keys and prompt constraints, neither of which can prove what the agent was allowed to do or that it stayed inside the boundary.
2. DAO operators and finance leads who approve delegated budgets. Current tooling forces a choice between full custody handover and per-transaction human approval queues.
3. Counterparties and auditors who need a defensible answer to one question: was this action authorised. They need the fact, not the mandate.

**What they currently use:** API keys and scoped tokens in environment variables, policy text in prompts and runbooks, multisig policies that publish the whole policy on-chain, or human approval queues that do not scale to agent velocity.

**Why they switch:** Every current option either leaks the policy or cannot prove compliance. Writ keeps the terms private and makes compliance a cryptographic output. The check itself reveals only the fact asked.

---

## MVP Feature Set

### Feature 1: Issue a Writ

**User story:** As a principal I want to authorise an agent with explicit limits without publishing those limits, so that the agent can operate and nobody watching the chain learns the shape of my rules.

**How it works:** The principal fills a scope form in the console (ceiling, window, allowlist, action mask). The values are sealed into private state through the midnight.js client before the transaction is assembled. The ledger receives a commitment hash, a pseudonymous principal reference, an expiry slot and a status. Nothing else.

**Acceptance criteria:** After issuance, the Midnight explorer shows a transaction to `WritRegistry` with no readable ceiling, window or allowlist. Reading the writ back through the client as the issuing wallet returns the correct terms. A second wallet sees commitment and status only.

**Complexity:** Medium

### Feature 2: Act Under a Writ

**User story:** As an agent I want every action validated against my mandate automatically, so that I never need to hold secrets or guess my limits and my principal never needs to watch me.

**How it works:** The agent submits actions (recipient, amount, intent) through `WritRegistry`. The scope circuit compares the action against the sealed terms in private: amount against the ceiling, recipient against the allowlist, timestamp against the window, intent against the action mask. The result is a sealed boolean plus a private reason code returned only to the agent.

**Acceptance criteria:** An in-scope action is recorded with a verified proof. An out-of-scope action is rejected in-circuit; the public log shows a rejected entry with no details; the agent wallet alone receives the reason (for example which bound failed).

**Complexity:** High

### Feature 3: Prove Compliance On Request

**User story:** As a verifier I want to confirm that a specific action was authorised without seeing the mandate, so that I can accept the action without absorbing the principal's private policy.

**How it works:** The verifier calls `attest` for an action id. The contract discloses a scoped fact through contract-controlled disclosure: within-writ status, optionally a spend band or window-valid boolean. The disclosure level is fixed by the writ's policy at issuance, not chosen by the verifier. The event is appended to the audit log.

**Acceptance criteria:** The verifier receives exactly one fact string and nothing else. The audit log gains an entry recording that a disclosure happened, without the disclosed value leaking further than the verifier call. Attempting a disclosure level the policy does not allow reverts.

**Complexity:** High

### Feature 4: Console (dashboard for all three roles)

**User story:** As any participant I want to see my own view of the mandate lifecycle without an off-chain database exposing anything, so that the product is usable end to end.

**How it works:** Wallet-gated console. The principal sees issued writs decrypted client-side from private state. The agent sees its authorisations and private reason codes. The verifier sees attestations it requested. All reads come from the chain and local private state. There is no off-chain index in MVP.

**Acceptance criteria:** Connecting a different wallet never surfaces another party's terms or reason codes. Empty, loading (skeleton) and error states exist for every screen. The full flow works end to end on a local Midnight node without mock data.

**Complexity:** Medium

**What makes this the one that matters for judging:** the terms are genuinely never public before disclosure, and every claim is verifiable by reading Midnight directly. That is the pitch and it maps to the rubric's engineering criterion in one property.

---

## Tech Stack

| Layer | Choice | Reason |
|---|---|---|
| Smart contracts | Compact on Midnight | The privacy layer. Witness-held private state, dual-ledger model, contract-controlled disclosure |
| Contract tooling | Compact compiler from the midnightntwrk org, pinned per docs.midnight.network | Official toolchain, matches the buildathon requirement for a compiling Compact contract |
| Client SDK | midnight.js (TypeScript providers) | Official bridge for wallet, private state and circuit calls |
| Frontend framework | Next.js 14 App Router, TypeScript | SSR for the landing page, clean provider wiring for the wallet layer |
| Styling | Tailwind CSS | Matches FRONTEND_SPEC.md exactly |
| Animation | motion/react | Correct import path for current Motion; blur-in entrance system per spec |
| Wallet | Midnight wallet provider (Lace and compatible embedded provider) | Ecosystem standard, required for signature and private-state access |
| Local development | midnightntwrk/midnight-local-dev (Docker local devnet) | Reproducible node for tests and demo recording |
| Database | None for MVP | Writ state lives on-chain and in local private state. No off-chain record can leak what the chain does not expose |
| Hosting | Vercel | Standard for Next.js, preview deployments for judging |
| Licence | Apache 2.0 for all Midnight-related code | Buildathon requirement |

Cost note: development runs against the local devnet and the public test environment, so infrastructure cost during the build is effectively zero beyond Vercel's free tier.

---

## Midnight Integration Detail

Function-level shapes below define the contract surface. Exact syntax follows the current Compact reference at docs.midnight.network at implementation time; the semantics are fixed.

### Client-side sealing of a new writ

```typescript
/**
 * Seals writ terms into private state and returns the values the
 * WritRegistry contract expects when recording the commitment.
 * @param terms - the mandate scope defined in the console form
 * @param registryAddress - the deployed WritRegistry address
 * @param walletClient - the connected midnight.js wallet client
 * @returns sealed term handle and the public commitment bytes
 */
export async function sealWritTerms(
  terms: WritTerms,
  registryAddress: string,
  walletClient: MidnightClient,
): Promise<{ sealedTerms: SealedWritTerms; commitment: Uint8Array }> {
  const sealed = await walletClient.seal(terms)
  const commitment = await walletClient.hashTerms(terms) // never sent in plaintext
  return { sealedTerms: sealed, commitment }
}
```

### Contract surface (Compact, illustrative)

```typescript
// Contract surface for WritRegistry. Illustrative Compact.
// Public ledger state keeps commitments and statuses only.

export contract WritRegistry {
  // ledger state (public)
  ledger commitments: Map<WritId, Bytes<32>>
  ledger statuses:   Map<WritId, WritStatus>   // sealed | active | rejected | revoked | disclosed
  ledger auditRoot:  Digest                     // append-only audit log root

  // private state: sealed terms travel with the principal's private state
  // and are exposed to circuits as sealed values. The ledger stores only the
  // commitment above.

  // Issue: records the commitment, opens the private scope slot
  circuit issueWrit(commitment: Bytes<32>, expiry: Slot): WritId

  // Act: checks one action against the sealed terms entirely in private.
  // Produces a sealed verdict. Public output is a status change only.
  circuit checkAction(
    writ: WritId,
    to: Bytes<32>,
    amount: Uint<64>,
    intent: Uint<8>
  ): ActionVerdict

  // Attest: contract-controlled disclosure of one scoped fact to a verifier.
  // Disclosure level was fixed at issuance. Every call appends to the audit log.
  circuit attest(
    action: ActionId,
    level: DisclosureLevel
  ): DisclosedFact

  // Revoke: status change only, no terms revealed
  circuit revoke(writ: WritId): []
}
```

### Disclosure model

- Default: nothing about the terms is disclosed. The ledger sees commitments, statuses and proof-verdicts.
- Auditor mode: `attest` discloses exactly one fact per call (within-writ boolean, spend band, window-valid boolean). The set of allowed facts is fixed in the writ policy at issuance.
- Full reveal: not in MVP. Post-hackathon, a principal may deliberately publish terms for dispute resolution. Stated as out of scope, not implied.

---

## Data Structures

```typescript
enum WritStatus { Sealed, Active, Rejected, Revoked, Disclosed }

interface WritTerms {
  ceiling: bigint           // maximum spend per action, atomic units
  windowStart: number       // unix seconds
  windowEnd: number
  allowlist: Uint8Array[]   // hashed recipient references
  actionMask: number        // bitfield of permitted intent classes
  disclosureLevel: 0 | 1 | 2 // none, boolean-only, band-approved
}

interface WritRecord {
  writId: string
  commitment: Uint8Array
  status: WritStatus
  expirySlot: number
  // decrypted client-side only for the issuing wallet
  terms?: WritTerms
}

interface ActionRecord {
  actionId: string
  writId: string
  to: Uint8Array            // hashed
  amountBand: string        // 'tier-0' ... 'tier-3', never the raw amount publicly
  verdict: 'in-scope' | 'rejected'
  // private to the agent wallet
  reason?: string
}
```

---

## Contract Interface

| Function | Caller | Description |
|---|---|---|
| `issueWrit(commitment, expiry)` | principal wallet | Records the commitment, opens the private scope slot |
| `checkAction(writ, to, amount, intent)` | agent wallet | In-circuit scope check, sealed verdict |
| `attest(action, level)` | verifier wallet | Contract-controlled scoped disclosure, audit append |
| `revoke(writ)` | principal wallet | Status change only |
| `statusOf(writ)` | any, view | Public status and commitment only |
| `auditRoot()` | any, view | Current audit log root |

---

## SDK Surface (plug-and-play layer)

```typescript
// @writ/sdk, the integration surface any agent framework embeds
writ.issue({ ceiling, window, allowlist, actionMask, disclosureLevel })
writ.act({ writ, to, amount, intent })       // -> { inScope, proof, reason? }
writ.attest({ action, level })               // -> one scoped fact
writ.revoke({ writ })
writ.status({ writ })                        // public read
```

The SDK is the plug-and-play story: three typed calls wrap the whole mandate lifecycle.

---

## Environment Variables

```
NEXT_PUBLIC_NETWORK_ID=
NEXT_PUBLIC_RPC_URL=
NEXT_PUBLIC_WRIT_REGISTRY_ADDRESS=
NEXT_PUBLIC_WALLET_CONNECT_ID=
AGENT_SIGNING_KEY=            # dedicated agent wallet only, never the principal's
AGENT_RPC_URL=
AGENT_POLL_INTERVAL_MS=15000
```

`AGENT_SIGNING_KEY` belongs to a dedicated agent wallet used only to submit actions. It never holds principal funds and never appears in the frontend bundle.

---

## App Routes

- `/`: landing page per FRONTEND_SPEC.md, public
- `/console`: wallet-gated dashboard (protected)
- `/console/writs/new`: scope builder and issue flow (protected)
- `/console/actions`: agent action log with private reason codes (protected, agent wallet)
- `/console/audit`: disclosure log viewer (protected)

---

## What Is Not Being Built in MVP

- Settlement adapters (moving funds, swapping, calling external protocols). Writ governs actions; execution hooks are the integrator's. This is the plug-and-play boundary, stated deliberately.
- Multi-chain bridges or Cardano interoperability beyond Midnight's native path.
- Full-reveal dispute mode (deliberate publication of terms).
- Organisation hierarchies and sub-delegation (one principal, one agent, one writ).
- Mobile apps and gas/fee abstraction.
- An off-chain indexer or database.

---

## Judging Rubric Mapping

| Criterion (weight) | What wins it here |
|---|---|
| Engineering and Implementation (40%) | Two compiling Compact contracts, real witness-held private state, dual-ledger usage (commitments public, terms private), contract-controlled disclosure, well-organised repo with README, `midnightntwrk` topics and ecosystem attribution |
| Quality Assurance and Reliability (15%) | Simulation and test files on the local devnet; a privacy assertion test that byte-checks public state and asserts terms never appear; all tests green |
| Product and Vision (15%) | AI-agent accountability is an urgent, real problem; the mandate layer is the missing primitive; roadmap is scoped (adapters, hierarchies, dispute mode) |
| User Experience and Design (15%) | FRONTEND_SPEC.md landing page plus a working console; full end-to-end flow with empty, loading and error states |
| Communication (10%) | Slide deck and demo video with the four-movement story: issue, act, prove, disclose |
| Business Development and Viability (5%) | Named segments (agent platforms, DAO ops, finance teams), adoption path through the `@writ/sdk` three-call surface |

---

## Hackathon Deliverables Checklist

- Public GitHub repository with complete code, `midnightntwrk` label/topics, README with install and usage instructions
- At least one Compact contract that compiles (technical gate)
- All Midnight-related code under Apache License 2.0
- Slide deck (pitch presentation)
- Demo video / video pitch
- Description of progress completed during the wave, and for resubmission a clear account of what changed
- Functional frontend end to end, no mock data
- Deployed preview URL for judges
- Optional: live presentation if selected

---

## Hackathon Build Priority

1. `WritRegistry` compiles; `issueWrit` and `checkAction` work against the local devnet with real sealed terms
2. `attest` performs one scoped disclosure correctly and appends to the audit log
3. Privacy assertion test suite green (terms never in public state)
4. `@writ/sdk` wraps the four calls
5. Console flow complete for all three roles
6. Landing page live per FRONTEND_SPEC.md
7. Deck, demo video, README and wave-progress write-up

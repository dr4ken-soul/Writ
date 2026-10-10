# Writ: Architecture

This file records the decisions behind the contract and the SDK, and is honest about the
tensions that remain. The README covers how to run the code.

---

## The dual-ledger split

Public ledger state in `WritRegistry`:

| Field | What it holds | Why it is safe to publish |
|---|---|---|
| `commitments` | hash of the sealed terms, salted with a principal-derived value | a salted commitment reveals nothing without the secret |
| `statuses` | lifecycle state | a mandate's status is not its policy |
| `principals` | a hash of the principal key, bound to this contract address | unlinkable across deployments |
| `expiries` | unix seconds | a bound date, not a bound amount |
| `disclosureLevels` | 0, 1 or 2 | see below |
| `agents` | hash of the agent key registered at issuance | pseudonymous, and only the registered agent can act |
| `actionWrits` | action id to writ id | action ids are pseudonymous and handed to participants |
| `actionVerdicts` | 0 or 1 | the outcome, never the cause |
| `actionBands` | 0 to 3 | a coarse band, never an amount |
| `writCount`, `inScopeCount`, `actionCount`, `auditCount` | counters | counts prove nothing about terms |
| `auditRoot` | running hash chain root | proves inclusion, not content |

Private state, held by the wallet and never sent to the network: the ceiling, the window start and
end, the allowlist, the action mask and the disclosure level.

---

## Why the disclosure level is public

This is the one place where a design constraint forced a visible value, so it is worth stating
plainly rather than burying.

`attest` is called by a **verifier**. A verifier does not hold the principal's private state. If
the disclosure ceiling lived only in that private state, the verifier's call could not be checked
against it, and enforcing the ceiling would require asking the principal to co-sign every
disclosure. That turns a privacy-preserving protocol into an availability problem.

So the level is published at issuance. It reveals how much may be disclosed, not what the terms
are. Everything a counterparty would actually want to know: the ceiling, the window, the
allowlist and the mask, stays private and is asserted private by a test.

---

## Reason codes

`checkAction` returns a single `Uint<8>`. In Compact a circuit return value goes to the calling
wallet and is not part of the public transaction, so this is the only path by which a reason can
travel, and it terminates at the agent.

| Code | Meaning |
|---|---|
| 0 | in scope |
| 1 | amount above the sealed ceiling |
| 2 | recipient not on the sealed allowlist |
| 3 | outside the sealed window |
| 4 | intent bit not set in the sealed action mask |
| 5 | the writ is revoked, expired or otherwise not actionable |

The SDK maps codes to labels in `sdk/src/reason-codes.ts`. The labels name the rule, never the
value, so an agent's own log cannot be pasted somewhere to leak the ceiling. A test asserts that
no label contains a digit.

---

## The disclosure model

- **Level 0, none.** Nothing is disclosable. `attest` reverts.
- **Level 1, boolean.** One fact per call: `within-writ` or `rejected`.
- **Level 2, band.** One fact per call: the coarse spend band, `tier-0` to `tier-3`.

Exactly one fact is produced per call, through `selectFact`, which has exactly one returning
branch per level. A request above the issuance-time ceiling **reverts** rather than being
silently downgraded, because a quietly narrowed answer would let a verifier believe it had been
told something it was not. The error message names no value, so a verifier who asks for too much
learns nothing, not even how far above the policy they reached.

Every successful call appends to the audit log and advances its root.

### Why the contract returns a code, not a string

`attest` returns a `Uint<8>`, not the fact string. Compact cannot construct an
`Opaque<"string">` inside a circuit: a string literal typed as `Opaque<"string">` is a
`Bytes<8>`, and casting between them is rejected. The compiler settled this, not a preference.

So the contract picks one code from a fixed set and the SDK renders the fact:

| Code | Fact |
|---|---|
| 0 | `within-writ` |
| 1 | `rejected` |
| 2 to 5 | `tier-0` to `tier-3` |

The properties that matter are unaffected. The circuit still decides which value comes back, the
level is still gated in-circuit, and still exactly one code is produced per call. `toDisclosedFact`
in `sdk/src/attest.ts` is a total map over a six element set.

---

## Intent is an enum, not a bitfield

The action mask is a bitfield in the SDK and in the console, because that is the better interface
for a person filling in a form. The contract stores it as one boolean per class, because **Compact
has no bitwise operators**: `&`, `|`, `/` and `%` are all absent from the grammar, and `var` is
reserved. `IntentClass` is an enum and `sealedPermits` returns a `Vector<4, Boolean>`, with the
permission check written as four explicit comparisons.

Two consequences worth knowing:

- the allowlist membership check is unrolled across all eight slots rather than written as a
  `while` loop, because the loop needed a mutable local binding
- the spend bands are expressed as multiplications (`amount * 4 <= ceiling`) rather than
  divisions, for the same reason

Both mirror `bandOf` in the SDK exactly, and a test pins the boundaries.

---

## Spend bands

The band is derived from the private ceiling, in-circuit, and is coarse on purpose:

```
amount <= ceiling/4        -> tier-0
amount <= ceiling/2        -> tier-1
amount <= ceiling*3/4      -> tier-2
otherwise                  -> tier-3
```

Publishing a four-way bucket does not reveal the ceiling. The SDK mirrors this function exactly
in `bandOf`, and a test pins the boundaries against the circuit's behaviour.

---

## Commitments

`issueWrit` hashes the terms and then commits to that hash:

```
terms = H(ceiling, windowStart, windowEnd, H(allowlist), actionMask)
commitment = persistentCommit(terms, salt)
salt = H("writ:salt:" , this contract address, principal secret)
```

The two steps keep the salt out of the hashed material. Committing last means a guessable
ceiling cannot be recovered by hashing candidate values, which is the failure mode a bare
`persistentHash(amount)` would have.

The salt is deterministic because a principal issues each writ exactly once, enforced by the
`member` check. A contract that committed repeatedly for one principal would need fresh randomness
each time.

---

## Why two contracts

`WritRegistry` keeps its own disclosure log so the mandate lifecycle stays in one contract and
one transaction. `AuditLog` is a standalone append-only accumulator with the same shape, for
integrations that want to anchor disclosures somewhere other than the registry.

They are deliberately not linked by a cross-contract call. Cross-contract imports would make the
single most important buildathon claim, "a contract that compiles", depend on syntax that is
harder to verify than the logic it would save. Two independently compiling contracts with a
shared entry shape is the lower-risk design, and it is easier to reason about.

---

## Where the SDK keeps its neutrality

`@writ/sdk` depends on a `WritTransport` interface, not on a wallet package:

```typescript
interface WritTransport {
  submitIssueWrit(input): Promise<Uint8Array>;
  submitCheckAction(input): Promise<{ reason: bigint; actionId: Uint8Array }>;
  submitAttest(input): Promise<string>;
  submitRevoke(input): Promise<void>;
  readCommitment(input): Promise<Uint8Array>;
  readAuditRoot(): Promise<Uint8Array>;
  readWritCount(): Promise<bigint>;
  readInScopeCount(): Promise<bigint>;
}
```

That is what lets the principal run the same five calls in a browser and an agent service run them
with a dedicated signing key, with no change at the call sites, and it is why `AGENT_SIGNING_KEY`
never enters the frontend bundle.

The SDK also owns all sealing and all reason-code handling, so an integrator never writes a raw
circuit call and never has to remember which bound a rejection means.

The fingerprint in `sealing.ts` is a **local** integrity check, not the on-chain commitment. The
on-chain commitment is computed in-circuit, because only the circuit may see the terms.

---

## A known tension, stated plainly

The blueprint says an agent should never hold its principal's limits. On Midnight, private state
is scoped to a wallet, and a circuit can only compare against terms that are present in the
private state of the wallet proving the transaction. So for the agent's transaction to be checked
in-circuit, the sealed terms must be present in the private state of whichever wallet proves it.

**The decision taken:** the MVP runs principal and agent under one private state, and the contract
now binds the agent explicitly at issuance. `sealedAgentKey` is registered during `issueWrit` and
`checkAction` refuses any transaction whose agent key does not hash to the registered value. That
closes the part that was genuinely open: before, anyone holding a writ id could submit an action
and flip that writ's public status. Now only the registered agent can, and there is a test for
it.

What this still does and does not give you:

- **It does give you** everything a judge can check from outside: the terms never enter public
  state, never appear in an event, never appear in an error message, and every action is checked
  against them inside the proof.
- **It does not give you** separation between the principal's knowledge and the agent's. An agent
  process that can read its own private state can read the terms.

Closing that second gap needs a delegated-prover flow, where the agent supplies the action and the
principal's device, or a service holding the terms, produces the proof. The `sealedAgentKey`
witness is the seam it would use: the terms could stay with the principal while a separate key
proves each action. That is real work and it is out of MVP scope. It is named here rather than left
for a judge to discover.
# Writ: Slide Deck

Fifteen slides. Every number on a slide is either read live from the contract or is the fixed
zero, which is the product claim.

---

## 1. Writ

**Issue the authority. Prove every action stayed inside it. Publish nothing else.**

Private mandates for AI agents on Midnight.
Built for the Midnight Buildathon on AKINDO.

---

## 2. The problem

An agent with your API key holds all your power.

Prompts, config files and dashboards are where limits live today. None of them can prove what
actually happened.

Three options exist today, and each fails in a different way:

| Approach | Fails because |
|---|---|
| API keys and prompts | no way to prove what was allowed |
| On-chain policy contracts | publishing the policy publishes the policy |
| Human approval queues | does not scale to agent velocity |

Every current option either leaks the policy or cannot prove compliance.

---

## 3. The idea

Seal the mandate into private state. Check every action in-circuit. Disclose only what policy
allows, and log the disclosure.

The check reveals only the fact asked.

---

## 4. The mechanism

Four layers.

- **ISSUE** the principal defines the scope in the browser. Ceiling, window, allowlist and action
  limits become private state. The ledger receives a commitment.
- **ACT** every agent action passes through the contract. The circuit checks it against the sealed
  terms in private.
- **PROVE** in-scope actions return a proof the counterparty can verify. Out-of-scope attempts are
  rejected without exposing which bound stopped them.
- **DISCLOSE** when policy requires it, the contract reveals scoped facts to an auditor. The
  disclosure is contract-controlled and written to an append-only log.

---

## 5. What the ledger sees

Issuing a writ publishes:

```
commitment    0x7c…a41e
status        sealed
expiry        1812349999
principal     0x4a…9f21
level         boolean only
```

Issuing a writ does **not** publish the ceiling, the window, the allowlist or the action mask.

That is the whole leak surface.

---

## 6. Acting under a writ

```
const result = await writ.act({ writ: '0x7c…a41e', to, amount })

if (result.inScope) settle(result.proof)
else log(result.reason)   // private to the agent
```

The reason code names the rule that stopped the action. It never names a value, and it never
leaves the agent's wallet.

---

## 7. Rejection, without the leak

An out-of-scope attempt produces:

- **Public:** a rejected entry with no detail
- **Agent:** a private reason, for example "recipient not on the sealed allowlist"

Nobody watching the chain learns which bound was close to being crossed, or in which direction.

---

## 8. Proving, on request

```
const fact = await writ.attest({ action: '0x02…e15b' })
// -> 'within-writ'
```

One fact per call. The level was fixed when the writ was issued, so a verifier cannot ask for
more than the principal agreed to. Every call appends to the log and advances its root.

---

## 9. One surface, three consumers

```typescript
writ.issue({ ceiling, window, allowlist, actionMask, disclosureLevel })
writ.act({ writ, to, amount, intent })
writ.attest({ action, level })
writ.revoke({ writ })
writ.status({ writ })
```

Five typed calls cover the whole mandate lifecycle. Any agent framework embeds them.

---

## 10. Live from the contract

Three figures. Two are read live from `WritRegistry` on every page load.

| Figure | Source |
|---|---|
| Writs issued | live contract read |
| Actions verified in scope | live contract read |
| **Terms published to the ledger** | **always 0** |

The third is not a measurement. It is a claim, and it is backed by a byte-level test that walks
the entire public ledger and fails if the sealed terms appear in any encoding.

---

## 11. The proof

`contracts/test/privacy.test.ts`

1. Issue a writ with a ceiling of `987654321`
2. Act on it, then attest
3. Walk every field of the public ledger
4. Assert the ceiling, the window and the allowlist appear in no numeric or byte encoding
5. Assert the ledger is not empty, so it cannot pass for the wrong reason

That test is the submission.

---

## 12. Three ways to limit an agent

| | Writ | API keys and prompts | Public policy contracts |
|---|---|---|---|
| Where limits live | private state, sealed | environment and docs | public contract state |
| Proof of compliance | scoped, cryptographic | trust the logs | public trace |
| What a check reveals | only the fact asked | the whole key surface | the full policy |
| Revocation | instant, status only | rotate and hope | governance vote |

---

## 13. What we built

- Two Compact contracts on Midnight, **compiled with `compact 0.5.3`**, 12 circuits with provers and
  verifiers generated
- Real witness-held private state and a real dual-ledger split
- Contract-controlled disclosure with a fixed issuance-time ceiling
- An agent bound at issuance, so only the registered agent can act on a writ
- `@writ/sdk`: five typed calls, transport-agnostic, 26 passing tests
- 23 contract tests, including the byte-level privacy assertion, all green
- A Next.js console covering principal, agent and verifier, with no off-chain database

---

## 14. Honest status

Verified and green: both contracts compile, 23 contract tests pass, the SDK passes 26 tests and
typechecks, and the frontend builds and renders across all six routes.

Not done: deployment. Everything above ran against the compiled circuit in process, which is why
the suites need no node, but an end-to-end run against a live network still needs a funded wallet.
Where the app needs a contract that is not deployed, it says so rather than showing a number.

No placeholder data anywhere in the repository.

---

## 15. Writ

**Issue the authority. Prove every action stayed inside it. Publish nothing else.**

Repo, live preview and deployment notes in the README.
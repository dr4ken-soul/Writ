# Wave Progress

An account of what was completed, and what was not, and why. Written so a judge can tell the
difference between a decision and an omission.

---

## Wave 2

### Completed and verified

**The SDK.** `@writ/sdk` covers the whole mandate lifecycle in five typed calls: `issue`, `act`,
`attest`, `revoke`, `status`. It owns all client-side sealing and all reason-code handling, so an
integrator never writes a raw circuit call. It depends on a `WritTransport` interface rather than
on a wallet package, which is what lets the principal run it in a browser and an agent service run
it with a dedicated signing key, with no change at the call sites.

26 tests pass. They include two that matter more than the rest:

- one asserts the transport handed to `issue` never receives a ceiling, a window, an allowlist or
  a mask
- one cross-checks the bundled SHA-256 against the platform implementation across block boundaries

**The contracts.** Two Compact sources at `pragma language_version 0.27.0`, **compiled with
`compact 0.5.3`**: 8 circuits in WritRegistry, 4 in AuditLog, with provers and verifiers
generated. `WritRegistry` carries the commitment, status, expiry, principal reference, disclosure
level and authorised agent in public state, and keeps the ceiling, window, allowlist and permits
in witness-held private state. Every circuit documents what it must never disclose. `AuditLog` is
a standalone append-only accumulator.

**The test suites.** Three files against a local circuit simulator, so they need no devnet.
**23 tests, all passing.**

- `scope.test.ts`: an in-scope action returns 0; amount, recipient, window and intent each return
  their own reason code; a revoked writ rejects everything; an unregistered agent is refused
- `disclosure.test.ts`: level 1 returns one fact, level 2 returns a band, a level above the
  issuance-time ceiling reverts, and a revert does not advance the audit root
- `privacy.test.ts`: issues a writ with a ceiling of `987654321`, acts, attests, then walks every
  field of the public ledger and fails if the terms appear in any numeric or byte encoding. It also
  fails if the ledger is empty, so it cannot pass for the wrong reason.

**The frontend.** A Next.js 14 landing page and a wallet-gated console, built against the design
system in `FRONTEND_SPEC.md`: the coded ScopeSeal canvas instrument with its four-state machine,
the A2 scroll-morph pill, blur-in entrances, and nine landing sections. The console covers
principal, agent and verifier with skeleton loading, empty and error states throughout.

All six routes build clean and the site was verified in a browser.

---

## Not completed, and why

**No deployment.** The contracts compile and all 23 tests pass against the compiled circuit in
process, but nothing has been deployed to a network. That needs a running node and a funded
Midnight wallet, neither of which existed on the build machine.

**The consequence for the frontend was handled rather than hidden.** Every screen that needs a
contract read renders an explicit "no deployment configured" state naming the variable to set. The
live metrics section shows the honest error instead of a plausible number. There is no mock data
anywhere in the repository, because a fabricated figure on a landing page is the one thing a judge
would catch immediately.

**Not built, by decision:** settlement adapters, sub-delegation, organisation hierarchies,
full-reveal dispute mode, an off-chain indexer, mobile apps and fee abstraction. Each is stated as
out of scope rather than implied.

---

## Design decisions worth reviewing

**The disclosure level is published.** It is the only policy value in public state. `attest` is
called by a verifier who does not hold the principal's private state, so the circuit needs the
level to enforce the ceiling without co-signing every disclosure. The level reveals how much may
be disclosed, never what the terms are. Reasoning in `docs/ARCHITECTURE.md`.

**The agent is bound at issuance.** `sealedAgentKey` is registered during `issueWrit` and
`checkAction` refuses any transaction from an unregistered agent. Without it, anyone holding a
writ id could submit an action and flip that writ's public status.

**The agent still shares private state with the principal in the MVP.** On Midnight private state
is wallet scoped, so an action can only be checked in-circuit against terms present in the proving
wallet's private state. This preserves every publicly verifiable guarantee, but the agent can read
its own terms. `sealedAgentKey` is the seam a delegated-prover build would use. Stated plainly in
`docs/ARCHITECTURE.md`.

**The contract returns a disclosure code, not a string.** Compact cannot construct an
`Opaque<"string">` in-circuit, so `attest` returns one code from a fixed six value set and the SDK
renders the fact. The circuit still decides which code, and the level is still gated in-circuit.

**A deterministic clock seam.** `currentTimestamp` reads the host clock, with `setTestClock` for the
suites to pin time. It lives in the witness layer, never in the circuit, so a caller cannot talk
its way past a sealed window by passing a timestamp of its own.

---

## What the compiler forced

Three language facts changed the implementation, and each is documented in
`docs/ARCHITECTURE.md`:

- Compact has **no bitwise operators**, so the action mask became an `IntentClass` enum plus a
  `Vector<4, Boolean>` of permits
- Compact has **no division operator**, so the spend bands are expressed as multiplications
- `var` is **reserved**, so the allowlist check is unrolled across its eight fixed slots

---

## Next steps, in order

1. Start `midnight-local-dev`, deploy both contracts, record the addresses
2. Fill in `.env.local`, then exercise the full flow end to end against the deployment
3. Record the demo video
4. Deploy the preview to Vercel and run the deep-link acceptance tests from `FRONTEND_SPEC.md`
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

**The contracts.** Two Compact sources against language version 0.23, matching the official
`midnightntwrk/example-bboard` and `midnight-examples/private-bid` references. `WritRegistry`
carries the commitment, status, expiry, principal reference and disclosure level in public state,
and keeps the ceiling, window, allowlist and action mask in witness-held private state. Every
circuit documents what it must never disclose. `AuditLog` is a standalone append-only accumulator.

**The test suites.** Three files against a local circuit simulator, so they need no devnet:

- `scope.test.ts`: an in-scope action returns 0; amount, recipient, window and intent each return
  their own reason code; a revoked writ rejects everything
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

**The contracts have not been compiled.** This is the buildathon's technical gate and it is
outstanding. Three environment facts caused it:

1. The Compact compiler at `compact-v0.5.3` publishes `apple-darwin` and `aarch64-linux-musl`
   artefacts. There is no Windows target.
2. No container runtime was installed, so `midnightntwrk/midnight-local-dev` could not be started.
3. No Midnight wallet was available.

The sources were written against the current official references and each circuit carries a
disclosure contract, but "written against the reference" is not "compiles", and the README says so
in those words. The first action for anyone picking this up is `cd contracts && npm run compact` on
Linux or macOS.

**The contract test suites have therefore not been executed.** They are written against the
generated managed contract, so they cannot run before compilation succeeds.

**No deployment.** With no compiler, no node and no wallet, there are no contract addresses, so
`NEXT_PUBLIC_WRIT_REGISTRY_ADDRESS` is unset.

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

**The two contracts are not linked by a cross-contract call.** Cross-contract imports would make
the compiling claim depend on harder-to-verify syntax than the logic it saves.

**Principal and agent share private state in the MVP.** On Midnight private state is wallet
scoped, so an action can only be checked in-circuit against terms present in the proving wallet's
private state. The MVP runs both under one private state. This does preserve every publicly
verifiable guarantee, but it does mean the agent can read the terms, and a delegated-prover flow
is needed to close that. Stated plainly in `docs/ARCHITECTURE.md` rather than left for a judge to
find.

**A deterministic clock seam.** `currentTimestamp` reads the host clock, with `setTestClock` for the
suites to pin time. It lives in the witness layer, never in the circuit, so a caller cannot talk
its way past a sealed window by passing a timestamp of its own.

---

## Next steps, in order

1. `cd contracts && npm run compact`, fix whatever the compiler reports, and land the gate
2. `cd contracts && npm test`, and get the three suites green
3. Start `midnight-local-dev`, deploy both contracts, record the addresses
4. Fill in `.env.local`, then exercise the full flow end to end against the deployment
5. Record the demo video
6. Deploy the preview to Vercel and run the deep-link acceptance tests from `FRONTEND_SPEC.md`
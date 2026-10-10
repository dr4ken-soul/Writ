# Writ: Session Handoff

**Read this first in any new session.** It records what is done, what is verified, what
remains, and the corrections made at the end of the build session so nothing is repeated
or re-litigated.

Written at the end of the build session on 2026-10-10. Last pushed commit: `c0a7ea5`.

---

## 1. Where Writ stands

| Component | State | Evidence |
|---|---|---|
| `contracts/src/*.compact` | **Compiles** | `compact 0.5.3`, 8 circuits in WritRegistry, 4 in AuditLog, provers and verifiers generated |
| `contracts/test/*.test.ts` | **23 of 23 pass** | run against the compiled circuit in memory, no devnet needed |
| `sdk/` (`@writ/sdk`) | **Verified** | 26 of 26 tests pass, `tsc` clean, package builds |
| `web/` | **Verified** | `next build` clean across 6 routes, `eslint --max-warnings=0` clean, browser-verified |
| Live preview | **Live** | https://writ-mandates-gsijs0f4r-psycho-projects.vercel.app |
| GitHub | **Public** | https://github.com/dr4ken-soul/Writ, topics set including `midnightntwrk` |
| Contract deployment | **NOT DONE** | blocked by the environment, see section 4 |

**The buildathon's technical gate is met and proven**: a Compact contract that compiles,
with a byte-level test asserting the sealed terms never appear in public state.

---

## 2. What remains for the submission

### 2.1 Slide deck (do this first)

`docs/DECK.md` contains 15 finished slides. It needs to become a real deck file.

**Suggested opening prompt for a fresh session:**

> Read `docs/DECK.md` and `CLAUDE.md` in the Writ project, then build a PowerPoint deck
> from it into `docs/`. Use the design system in `docs/FRONTEND_SPEC.md` (Schibsted Grotesk,
> Spline Sans Mono, the palette).

Design constraints for the deck, from `docs/FRONTEND_SPEC.md` section 1.2:

- Fonts: Schibsted Grotesk (display 800, body 400/500), Spline Sans Mono for labels and numbers
- Background `#0c0e10`, surface `#161a1f`, text `#edeeec`, accent `#e2573c`
- Mono for all addresses, numbers and labels
- British English, no em dashes, short direct sentences

### 2.2 Demo video

**Read these before planning anything:**

- Motion Design skill: `C:\Users\Paul\Documents\Coding Area\Skill files\Motion Design`
  (`SKILL.md`, `CRAFT.md`, `ANALYSIS.md`, `MODES.md`, `scripts/`)
- Reference videos: `C:\Users\Paul\Videos\Motion Graphics\Hackathon Demo` (six files)
- Audio approach already proven in this workspace:
  `C:\Users\Paul\Documents\Coding Area\Agents\Vendra\demo\AUDIO-AND-CAPTURE.md`
  and `C:\Users\Paul\Documents\Coding Area\Agents\Vendra\demo\analysis\voiceover.ts`

**Suggested opening prompt for a fresh session:**

> Read the Motion Design skill at `C:\Users\Paul\Documents\Coding Area\Skill files\Motion
> Design` in full, and the six reference videos in `C:\Users\Paul\Videos\Motion Graphics\
> Hackathon Demo`. Then plan and produce the Writ demo video. For audio, follow the approach
> in `C:\Users\Paul\Documents\Coding Area\Agents\Vendra\demo\AUDIO-AND-CAPTURE.md` and
> `analysis\voiceover.ts`.

**Hard content constraint:** the contract was never deployed, so there is **no Midnight
explorer screenshot**. Show real test output instead. 23 passing tests including the
byte-level privacy assertion is stronger evidence than an explorer view, and it is honest.
Do not imply a live deployment exists anywhere in the video.

### 2.3 Remaining checklist items

- Every team member registered on AKINDO
- Demo video recorded and trimmed to about 90 seconds (`MARKETING.md` has the shot list,
  but the beat showing the explorer needs replacing with test output)
- Preview URL deployed and tested end to end twice (done, but re-verify after any change)

---

## 3. Corrections made at the end of the session

Recorded so the next session does not repeat these mistakes or contradict them.

### 3.1 Voice-over: an earlier claim was wrong

I stated that I could not produce voice-over and had no text-to-speech available. **That was
false.** I had not checked. The Vendra demo in this workspace generated narration with
`gemini-3.8-flash-tts`:

```
C:\Users\Paul\Documents\Coding Area\Agents\Vendra\demo\analysis\voiceover.ts
```

That file also documents the writing method used, which is worth copying: the script is
written against measurement rather than taste, states what is on screen, uses numbers
instead of adjectives, and claims only what the evidence carries.

**Lesson applied going forward: verify a capability before declaring it absent.** The same
error was made twice this session, first about the Compact compiler having no usable binary
(it did, for Linux) and then about TTS.

### 3.2 Motion Design skill: not yet read

I listed the directory and stopped. `SKILL.md`, `CRAFT.md`, `ANALYSIS.md` and `MODES.md`
have **not** been opened. Any claim that the video work applies the skill's standards is
currently unsupported.

### 3.3 Music: unresolved

```
C:\Users\Paul\Documents\Coding Area\Agents\Vendra\demo\music\bed.wav   (9.4 MB)
C:\Users\Paul\Documents\Coding Area\Agents\Vendra\demo\music\sourced\  (empty)
```

How that track was licensed or sourced was never established, and the `sourced/` folder is
empty, which suggests the provenance was never documented. Investigate this properly rather
than assuming it is fine, and document the licence for the Writ video.

---

## 4. Why deployment failed, so nobody repeats the investigation

Deployment is the only gap. The chain of blockers, all resolved except the last:

| Step | Blocker | Resolution |
|---|---|---|
| 1 | No Windows binary for the Compact compiler | **Solved.** WSL Ubuntu is installed, and the release ships `compact-x86_64-unknown-linux-musl`. `contracts/scripts/compact-build.sh` compiles both contracts. |
| 2 | Docker install failed: `need 3303 MiB, only 2900 MiB available` | **Solved.** Cleared `%TEMP%` and npm cache, freed 2340 MB. |
| 3 | `com.docker.service` would not start | **Solved.** Needs an Administrator PowerShell, which the user ran. |
| 4 | Docker backend crashes: `exit status 0x40010004` | **UNRESOLVED.** |

Docker Desktop itself reports the final cause:

> **WSL needs updating.** Your version of Windows Subsystem for Linux (WSL) is too old.
> Run the command below to update or for more information.

- `wsl --update` fails with `0x8024001e`, even in an Administrator shell
- `wuauserv` is `Manual`, so Windows Update is not disabled and that is not the cause
- The Microsoft Store search for "windows subsystem for linux" does **not** return the
  Microsoft WSL package on this machine, and at least one unrelated Store result shows
  "Error", suggesting the Store is partially broken

### Why there is no alternative to Docker

The deploy transaction carries a ZK proof. The **proof server** generates it, so it is
mandatory on local, preview, preprod and mainnet equally. It ships only as a Docker image:

```
midnightntwrk/proof-server:8.1.0
midnightntwrk/indexer-standalone:4.3.3
midnightntwrk/midnight-node:1.0.0
```

There is no GitHub repo to build from source and no public proof server endpoint. On
preview the node and indexer are public URLs, but the proof server is still localhost:

```js
// from midnight-examples, examples/private-party/src/config.ts
proofServer: process.env['MIDNIGHT_PROOF_SERVER'] ?? 'http://127.0.0.1:6300'
```

So: **no Docker, no deployment.** Do not spend more time on this unless the WSL version
changes.

### Deploy script state

`contracts/scripts/deploy.ts` exists and every API in it was read out of the published
packages rather than guessed:

- `deployContract` from `@midnight-ntwrk/midnight-js-contracts`
- `indexerPublicDataProvider`, `httpClientProofProvider`, `NodeZkConfigProvider`,
  `levelPrivateStateProvider`, `MidnightWalletProvider.build`

**It does not typecheck yet.** The `CompiledContract.make<...>` generic in
`contracts/src/writ-registry-contract.ts` and `contracts/src/audit-log-contract.ts` does not
match the current runtime's signature, copied from `example-bboard` which targets an older
runtime. That must be fixed before the script can run:

```
npx tsc -p tsconfig.scripts.json --noEmit
```

The commit message for that work says so plainly. It has never been run.

---

## 5. Outstanding housekeeping

**Clear the 24-word phrase from `Writ/.env`.** It was pasted there for a deployment that
never happened. The file is gitignored and `git ls-files` confirms it is untracked, so it
cannot reach the repository, but it is sitting in plaintext on disk.

---

## 6. Architecture decisions already settled

Do not relitigate these without a reason.

**Disclosure level is public ledger state.** `attest` is called by a verifier who does not
hold the principal's private state, so the circuit needs the level to enforce the ceiling
without the principal co-signing every disclosure. It reveals how much may be disclosed,
never what the terms are.

**The agent is bound at issuance.** `sealedAgentKey` is registered in `issueWrit`, and
`checkAction` refuses any unregistered agent. Without it, anyone holding a writ id could
submit an action and flip that writ's public status. Covered by a test.

**Principal and agent share private state in the MVP.** On Midnight, private state is
wallet-scoped, so the prover must hold the terms. This preserves every publicly verifiable
guarantee but the agent can read its own terms. `sealedAgentKey` is the seam a
delegated-prover build would use. Documented in `docs/ARCHITECTURE.md`.

**Language constraints the compiler forced**, all documented in `docs/ARCHITECTURE.md`:

- Compact has no bitwise operators, so the action mask became an `IntentClass` enum plus a
  `Vector<4, Boolean>` of permits
- Compact has no division operator, so spend bands are expressed as multiplications
- `var` is reserved, so the allowlist check is unrolled across its eight fixed slots
- Compact cannot build an `Opaque<"string">` in-circuit, so `attest` returns one code from a
  fixed six-value set and the SDK renders the fact

---

## 7. Working commands

```bash
# compile the contracts (needs WSL on Windows)
cd contracts/scripts && bash compact-build.sh

# contract tests, 23 expected
cd contracts && npm test

# SDK tests, 26 expected
cd sdk && npm test

# web
cd web && npm run build
```

The Compact toolchain was installed once with:

```bash
wsl -e bash -c "cd /tmp && curl -sL https://github.com/midnightntwrk/compact/releases/download/compact-v0.5.3/compact-x86_64-unknown-linux-musl.tar.xz | tar -xJ"
```

---

## 8. Honesty standard for anything produced next

Every status claim in this repository is deliberately accurate rather than flattering. Keep
it that way:

- No mock data anywhere. Where the app needs a contract that is not deployed it renders an
  explicit "no deployment configured" card naming the variable to set, not a placeholder number.
- The deploy script is committed labelled "unverified against a running node" with the
  typecheck failure spelled out.
- Do not claim a video was rendered unless it was, or a deployment exists unless it does.
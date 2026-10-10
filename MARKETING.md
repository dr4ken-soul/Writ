# MARKETING.md: Writ

## Goal

Get Writ in front of the Midnight Buildathon judges and the Midnight builder community during the wave windows without sounding like a pitch deck.

The story is simple. Agents now hold real power: budgets, keys, signing rights. The limits live in prompts and config files, and none of them can prove what happened. Writ is the proof layer. Every post shows the product working, not the idea being interesting.

Core proof to show in public: a real writ issued on Midnight with no readable terms on the explorer, a real agent action verified in scope, a real out-of-scope attempt rejected without leaking the bound, and the audit log recording a scoped disclosure.

---

## Posting Style

- all lowercase
- builder voice, not company voice
- one clear idea per post
- short lines with space between thoughts
- show what works, do not explain what you plan to build
- the demo video does the heavy lifting, copy supports it

---

## Post Plan

### post 1, project announcement

```
building writ for the @MidnightNtwrk buildathon on @akindo_io 🌑

agents hold budgets, keys and signing rights today, and the limits live in prompts and env files

writ seals the mandate into private state on midnight, every action gets checked in-circuit, terms stay sealed until the contract says otherwise

paste nothing. the explorer shows a commitment and a status. that is the whole leak surface

demo clip attached. let's go
```

Attach a screen recording showing the full flow from issuing a writ to an action verifying, kept under 90 seconds.

### post 2, final submission

```
submitted writ to the midnight buildathon

issue a private mandate to an agent, watch it act in scope, watch an out-of-scope attempt get rejected without revealing which bound stopped it, then hand an auditor exactly one fact

two compact contracts, dual-ledger for real: commitments public, terms sealed, disclosures logged

live preview [link] repo [link]

@MidnightNtwrk
```

Attach the final demo video. Include the live preview link and the GitHub link in the post.

---

## Submission Notes

**Project title:** Writ

**Tagline:** Issue the authority. Prove every action stayed inside it.

**Category:** Unlimited (privacy-first theme)

**Built with:**
- Compact (Midnight smart contracts)
- midnight.js TypeScript SDK
- `@writ/sdk` (three-call integration surface)
- Next.js 14 App Router + TypeScript + Tailwind CSS
- motion/react
- midnight-local-dev (Docker local devnet for tests)

**Project description (under 200 words):**

Writ is a private mandate layer for AI agents on Midnight. A principal defines a scope: spend ceiling, time window, allowed counterparties, action mask. Those terms are sealed into private state before any transaction is built. The ledger receives a commitment, a status and an expiry slot and nothing else. Every agent action is checked inside a Compact circuit against the sealed terms. In-scope actions return a verifiable proof. Out-of-scope attempts are rejected without exposing which bound stopped them, and the reason code stays private to the agent wallet. When policy allows it, the contract discloses exactly one scoped fact to an auditor through contract-controlled disclosure, and every disclosure is appended to an audit log with a public root. Two Compact contracts, a typed SDK (issue, act, attest, revoke) that any agent framework can embed, and a wallet-gated console covering all three roles with no off-chain database. A byte-level test asserts the terms never appear in public state.

**Demo video flow (90 seconds):**
1. Landing page hero with the mandate panel, terms masked (10 seconds)
2. Connect wallet, enter the console (10 seconds)
3. Issue a writ with ceiling, window and allowlist; show the explorer afterwards with only a commitment (15 seconds)
4. Agent acts in scope, proof lands (10 seconds)
5. Agent attempts an out-of-scope action, rejected; show the public log shows no detail and the agent's private reason (15 seconds)
6. Verifier requests an attestation, receives one fact; audit log entry appears (15 seconds)
7. Close on the Writ wordmark (5 seconds)

Total: about 80 seconds, inside the limit.

---

## Checklist

- [ ] Registered on AKINDO and joined the Midnight Buildathon page
- [ ] Every team member registered individually on AKINDO
- [ ] Joined the Midnight Discord and posted in the buildathon channel
- [ ] Repository public with `midnightntwrk` label/topics before submission
- [ ] Apache License 2.0 on all Midnight-related code
- [ ] At least one Compact contract compiles (technical gate)
- [ ] Privacy assertion test included and green
- [ ] README with setup, architecture, Midnight integration and judge test instructions
- [ ] Slide deck finished
- [ ] Demo video recorded and trimmed to about 90 seconds
- [ ] Live preview URL deployed and tested end to end twice with real contract calls
- [ ] Wave progress description written (for Wave 3: explicit list of what changed)
- [ ] Post 1 goes out once the preview is live
- [ ] Post 2 goes out at submission
- [ ] Wave 2 submitted before the AKINDO countdown ends (rules say 17 Oct 2026, the platform timer is the source of truth)
- [ ] Wave 3 build window: 27 Oct to 16 Nov 2026, resubmit the same project with documented progress
- [ ] Live presentation prepared in case judges call one

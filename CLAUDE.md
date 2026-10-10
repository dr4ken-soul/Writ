# Writ: Agent Context

## What This Is

Writ is a private mandate layer for AI agents on Midnight. A principal defines a scope: spend ceiling, time window, allowed counterparties, action mask. Those terms are sealed into private state before any transaction exists. An agent submits every action through a Compact contract that checks it against the sealed terms in-circuit. In-scope actions return a proof. Out-of-scope attempts are rejected without exposing which bound stopped them. Verifiers receive scoped facts through contract-controlled disclosure, and every disclosure lands in an append-only audit log.

Built for the Midnight Buildathon on AKINDO, three-wave program, Wave 2 and Wave 3.

---

## One-Line Pitch

Issue the authority. Prove every action stayed inside it. Publish nothing else.

---

## MVP Features

1. Issue a writ: scope terms sealed client-side into private state, ledger receives a commitment, status and expiry slot only
2. Act under a writ: every agent action checked in-circuit against the sealed terms, sealed verdict, private reason code to the agent alone
3. Prove compliance: contract-controlled scoped disclosure of one fact per verifier request, always audit-logged
4. Console: wallet-gated views for principal, agent and verifier, all reads from chain and local private state, no off-chain database

Post-MVP, not in scope: settlement adapters, sub-delegation, full-reveal dispute mode, organisation hierarchies, mobile, fee abstraction, off-chain indexing.

---

## Stack

| Layer | Technology |
|---|---|
| Contracts | Compact on Midnight (two contracts: WritRegistry, AuditLog) |
| Contract tooling | Compact compiler from the midnightntwrk org, versions pinned per docs.midnight.network |
| Client | midnight.js TypeScript providers |
| SDK | `@writ/sdk` (issue, act, attest, revoke, status) |
| Frontend | Next.js 14 App Router, TypeScript, Tailwind CSS |
| Animation | motion/react |
| Wallet | Midnight wallet provider (Lace and compatible) |
| Local node | midnightntwrk/midnight-local-dev (Docker) |
| Database | None. Every read comes from the chain or local private state |
| Hosting | Vercel |
| Licence | Apache 2.0 for all Midnight-related code |

---

## Project Structure

```
writ/
├── contracts/
│   ├── src/
│   │   ├── WritRegistry.compact      (issue, checkAction, attest, revoke, statusOf)
│   │   └── AuditLog.compact          (append-only disclosure log, root maintenance)
│   ├── test/
│   │   ├── scope.test.ts             (in-scope and out-of-scope circuit behaviour)
│   │   ├── disclosure.test.ts        (allowed and disallowed attest levels)
│   │   └── privacy.test.ts           (byte-level assertion: terms never in public state)
│   └── package.json
├── sdk/
│   └── src/
│       ├── issue.ts                  (sealWritTerms + issueWrit wrapper)
│       ├── act.ts                    (checkAction wrapper, reason-code handling)
│       ├── attest.ts                 (scoped disclosure wrapper)
│       └── index.ts
├── web/
│   ├── src/
│   │   ├── app/
│   │   │   ├── page.tsx              (landing page)
│   │   │   ├── console/
│   │   │   │   ├── layout.tsx        (ProtectedRoute, sidebar, wallet pill)
│   │   │   │   ├── page.tsx          (writ list dashboard)
│   │   │   │   ├── writs/new/page.tsx
│   │   │   │   ├── actions/page.tsx
│   │   │   │   └── audit/page.tsx
│   │   │   └── layout.tsx            (providers, ScopeSeal mount, grain)
│   │   ├── components/
│   │   │   ├── scope-seal/ScopeSeal.tsx   (coded canvas instrument)
│   │   │   ├── layout/Nav.tsx             (A2 scroll-morph pill)
│   │   │   ├── layout/WalletMenu.tsx      (app-interior dropdown)
│   │   │   ├── wallet/ConnectModal.tsx    (connection state machine)
│   │   │   └── sections/                  (Hero, Problem, Mechanism, LiveMetrics,
│   │   │                                    Integration, Compare, Trust, FinalCta, Footer)
│   │   ├── hooks/
│   │   │   ├── useScrollReveal.ts
│   │   │   ├── useCountUp.ts
│   │   │   └── useSealState.ts
│   │   └── styles/globals.css
│   └── package.json
├── docs/
│   ├── APP_BLUEPRINT.md
│   ├── FRONTEND_SPEC.md
│   └── BUILD_GUIDE.md
├── README.md
└── CLAUDE.md
```

---

## Design System

All seven gates confirmed. Do not deviate from any value below.

**Aesthetic:** Bento grid operational
**Identity fingerprint:** top-left lead, bottom-right support / Swiss rational / monochrome + seal vermilion pop / technical grid + coded instruments / crescendo / subtle precision
**Dials:** DESIGN_VARIANCE 6, MOTION_INTENSITY 5, VISUAL_DENSITY 5

**Fonts:**
- Display and body: Schibsted Grotesk (800 display, 400/500 body)
- Mono: Spline Sans Mono (scope tables, addresses, labels, logs)

```css
@import url('https://fonts.googleapis.com/css2?family=Schibsted+Grotesk:wght@400;500;700;800&family=Spline+Sans+Mono:wght@400;500;600&display=swap');
```

**Colour palette:**
```css
--bg-primary:     #0c0e10;
--bg-secondary:   #111418;
--bg-surface:     #161a1f;
--bg-elevated:    #1c2127;
--accent:         #e2573c;
--accent-hover:   #f06a50;
--accent-glow:    rgba(226, 87, 60, 0.12);
--text-primary:   #edeeec;
--text-secondary: #98a0a6;
--text-muted:     #565e66;
--border-subtle:  rgba(237, 238, 236, 0.05);
--border-default: rgba(237, 238, 236, 0.10);
--success:        #6fd68f;
--error:          #ff5c7a;
--shadow-tint:    226, 87, 60;
```

**Nav:** A2 scroll-morph pill. Expanded transparent bar below 80px scroll, compact liquid-glass pill above it. Wordmark pure type. Primary CTA "OPEN THE CONSOLE" is wallet-gated, never a raw anchor.

**ScopeSeal:** the site's one signature visual, coded not sourced. A concentric ring instrument with ticks and a scanning arc, mounted once at the app root. State machine per section: sealed, scoped, proven, disclosed. Opacity tiers 0.55 / 0.30 / 0.12 by section density. Reduced motion falls back to static rings. Full spec in FRONTEND_SPEC.md Section 1.4.

---

## Landing Page Sections (in order)

1. Hero: top-left text stack, bottom-right mandate panel with masked scope rows
2. Problem: full-width statement on borrowed authority
3. Mechanism: four layers, ISSUE / ACT / PROVE / DISCLOSE
4. Live metrics: two live contract reads plus the fixed zero terms published
5. Integration: tabbed explorer for principal, agent and verifier with SDK code
6. Compare: three-way bento, API keys vs public policy contracts vs Writ
7. Trust: technical credibility with badge stack, no photography
8. Final CTA: crescendo close with ScopeSeal at full drama
9. Footer

Full section spec with exact classes, copy and animation values lives in FRONTEND_SPEC.md. This list is the map, not the territory.

---

## Logo and Favicon

Neither exists. Wordmark is pure type ("WRIT"). Leave both as plain comment slots:

```tsx
{/* Logo slot: replace with public/logo.svg once provided */}
```

```html
<!-- Favicon slot: replace with public/favicon.ico once provided -->
```

Never substitute a hardcoded placeholder, an AI-generated icon or an emoji in either slot. Ask the human before creating any symbol.

---

## Midnight Integration

Compact contracts keep terms in witness-held private state and commitments in ledger state. The dual-ledger model is the product: public state stores commitments, statuses and the audit root; private state holds ceilings, windows, allowlists and masks. Disclosure is contract-controlled through explicit disclosure calls and is always appended to the audit log. The shape to remember:

```
seal (client)       walletClient seals terms, commitment = hash(terms)
issue (contract)    issueWrit(commitment, expiry) -> WritId, status Sealed
act (contract)      checkAction(writ, to, amount, intent) -> sealed verdict
                    public: status change only
attest (contract)   attest(action, level) -> one scoped fact
                    public: audit root append
revoke (contract)   revoke(writ) -> status Revoked, terms stay sealed
```

The client's reason codes (which bound failed) are returned only to the calling agent wallet. They never enter public state, events or logs.

---

## Code Rules (follow without exception)

**Compact:**
- Comment every circuit with its intent and what it must never disclose
- Never hardcode registry addresses in source; read them from deployment environment
- Never emit raw terms in any ledger write or event
- Keep the disclosure level fixed at issuance; `attest` may never exceed it

**TypeScript / React:**
- camelCase for all variables and functions
- JSDoc comments on every function and custom hook
- CSS variables from the design system used directly, never hardcoded hex values in component files
- CSS class-based hover states only, no inline `onMouseEnter` or `onMouseLeave`
- motion/react for all entrance animations
- Blur-in entrance as the default: `initial={{ opacity: 0, filter: 'blur(10px)', y: 20 }}` to `{ opacity: 1, filter: 'blur(0px)', y: 0 }`
- Scroll animations always `viewport={{ once: false, amount: 0.1 }}`
- Loading states use skeleton shimmer, never spinners
- Never use `localStorage` or `sessionStorage` in the frontend
- `min-h-[100dvh]`, never `h-screen`, for full-height sections
- Semantic z-index scale only (FRONTEND_SPEC.md Section 1.3)

**Writing rules (apply to all copy, labels, code comments, JSDoc, README, deck notes):**
- British English throughout
- No em dashes anywhere
- Periods only when necessary
- Commas only when necessary
- Short direct sentences, no filler such as "seamlessly", "powerful", "cutting-edge", "unlock", "elevate"
- No banned headline words (FRONTEND_SKILL.md §0E)
- No placeholder data anywhere; every headline and label in FRONTEND_SPEC.md is final text

---

## Never Do These

- Never let ceiling, window, allowlist or action mask be readable in calldata, an event, an error message or an off-chain store at any point
- Never disclose more than one scoped fact per `attest` call, and never above the issuance-time disclosure level
- Never put the agent reason code anywhere the agent wallet cannot keep it private
- Never store `AGENT_SIGNING_KEY` anywhere but the agent service environment
- Never build settlement or execution hooks into the MVP contracts; governance is the product
- Never send principal, agent or writ data to any service outside the chain and the local private state
- Never redirect to the console while wallet hydration is in progress

---

## Hackathon Checklist

- Project name: Writ
- Hackathon: Midnight Buildathon, AKINDO, three waves (Wave 2 build to 17 Oct 2026, platform timer is source of truth; Wave 3 build 27 Oct to 16 Nov 2026)
- Public GitHub repository with `midnightntwrk` label, Apache 2.0 on Midnight-related code
- Technical gate: at least one Compact contract that compiles
- README with setup, architecture, Midnight integration and how judges can test
- Slide deck and demo video
- Wave-progress description, and for Wave 3 a clear account of what changed
- Deployed preview URL, functional frontend end to end
- Every team member registered on AKINDO

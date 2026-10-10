# FRONTEND_SPEC.md: Writ

Private mandates for AI agents on Midnight. A principal issues a writ: scope limits sealed into private state, every action proven in bounds, terms disclosed only when the contract allows it. Built for the Midnight Buildathon (AKINDO, three-wave program).

---

## 0. Project Identity

- **Name:** Writ
- **One-line pitch:** Issue the authority. Prove every action stayed inside it. Publish nothing else.
- **Aesthetic (Gate 1):** Bento grid operational
- **Identity Fingerprint (§0C):** top-left lead, bottom-right support / Swiss rational / monochrome + seal vermilion pop / technical grid + coded instruments / crescendo / subtle precision
- **Dials:** DESIGN_VARIANCE 6, MOTION_INTENSITY 5, VISUAL_DENSITY 5
- **Category:** A, on-chain product. Wallet signature required to issue a writ or act under one.
- **Chain:** Midnight. Contracts in Compact. Client via midnight.js TypeScript SDKs.
- **Trend flavour (accent only):** Surveillance Design primary (log typography, scope tables, status labels), Blueprint Design supporting (annotation lines, measured borders). Expression level: clear influence (dial band 4-6). Trend never overrides the base type, palette or layout grid.

---

## 1. Global Design System

### 1.1 Fonts

```css
@import url('https://fonts.googleapis.com/css2?family=Schibsted+Grotesk:wght@400;500;700;800&family=Spline+Sans+Mono:wght@400;500;600&display=swap');
```

- `--font-display`: 'Schibsted Grotesk', sans-serif, weight 800, headlines only
- `--font-body`: 'Schibsted Grotesk', sans-serif, weights 400/500, subheads and body
- `--font-mono`: 'Spline Sans Mono', monospace, scope tables, addresses, labels, logs

One grotesk carries display and body across weight contrast (Swiss discipline). Mono is the third and final family. No other font may be introduced.

### 1.2 Colour System (Gate 5, confirmed)

Colour strategy: **Restrained**. Tinted neutrals plus one accent occupying 10% or less of any surface. Composed in OKLCH-checked values, shipped as hex custom properties.

```css
:root {
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

  --radius-sm: 4px;  --radius-md: 8px;   --radius-lg: 12px;
  --radius-xl: 16px; --radius-2xl: 9999px; /* pills and tags only */

  --duration-fast: 150ms; --duration-normal: 300ms; --duration-slow: 600ms;
}
```

Trend colour modifiers (accents only, never palette overrides):
- Surveillance flavour: terminal amber `#d9a441` reserved for log lines and audit-trail timestamps inside the console, never on the landing page.
- Blueprint flavour: annotation strokes use `rgba(237, 238, 236, 0.10)` hairlines with small mono callouts at `text-[10px] tracking-[0.15em]`.

Component files reference these variables only. No hex literals in JSX.

### 1.3 Global Z-Index Map (semantic scale)

```
--z-canvas:        0   ScopeSeal canvas (fixed, app root, mounted once)
--z-grain:         3   noise grain overlay, pointer-events-none
--z-content:      10   default section content layer
--z-panels:       20   floating glass panels inside a section
--z-nav:          50   fixed navigation (scroll-morph pill)
--z-dropdown:    100   wallet dropdown, tab menus
--z-modal-scrim: 300   modal backdrop
--z-modal:       400   wallet connect modal
--z-toast:       500   disconnect toast and confirmations
```

### 1.4 The ScopeSeal (bespoke coded instrument, no COMPOSITION_RECIPES.md match)

Gate 3 deliverable: a coded canvas instrument, not an asset. Mounted once at the app root as the Unified Sticky Canvas. No video, no photography, no external files.

```
Container: fixed inset-0 z-0 pointer-events-none (id="scope-seal-root")
Renderer: <canvas> 2D context, devicePixelRatio-aware, single requestAnimationFrame loop
          (loop pauses on document.visibilitychange hidden)

Geometry (scaled by s = min(viewportWidth, viewportHeight) / 900):
  Centre: x = 0.68 * viewportWidth, y = 0.58 * viewportHeight
  Ring radii: outer 320px * s, middle 260px * s, inner 200px * s
  Ring stroke: 1px, colour rgba(237, 238, 236, 0.06)
  Ticks: 60 ticks on the outer ring, length 4px * s, same stroke colour
  Accent tick: one tick at 0 degrees, length 12px * s, colour var(--accent) at 0.5 opacity
  Scanning arc: 40-degree arc on the outer ring, var(--accent) at 0.12 opacity,
                rotates continuously at 0.15 rad/s (clockwise)

State machine (written by an IntersectionObserver on
  <section data-seal-state="sealed|scoped|proven|disclosed">):
  sealed     (hero):      rotation 0.15 rad/s, rings closed, accent tick 12px
  scoped     (mechanism): middle ring lerps scale 1.00 -> 1.06 (lerp factor 0.04/frame),
                          inner ring gains 3 aligned ticks at 90/210/330 degrees
  proven     (metrics):   accent tick expands 12px -> 18px, glow ring pulses once
                          (radius +14px, alpha 0.25 -> 0 over 600ms, ease-out)
  disclosed  (comparison, trust, final CTA):
                          outer ring opens a 30-degree gap centred on the accent tick,
                          gap lerps 0 -> 30 degrees over 800ms, light sweep along the
                          gap edge once per entry

sectionDensity (shared context, IntersectionObserver on
  <section data-density="hero|sparse|dense">):
  hero / final-cta in view       -> target opacity 0.55
  sparse sections in view        -> target opacity 0.30
  dense sections in view         -> target opacity 0.12
  Opacity lerps toward target at 0.04 per frame, never snaps

Reduced motion (prefers-reduced-motion: reduce):
  rotation, scanning arc, scale and gap lerps disabled
  static concentric rings + 60 ticks at fixed opacity 0.20, no state changes
```

### 1.5 Motion Primitives

Standard entrance used by every section unless a recipe override is stated:

```
initial:    { filter: 'blur(10px)', opacity: 0, y: 20 }
whileInView:{ filter: 'blur(0px)', opacity: 1, y: 0 }
transition: { duration: 0.8, ease: [0.16, 1, 0.3, 1] }
viewport:   { once: false, amount: 0.1 }   // NEVER once: true
```

Stagger for grouped children: `delay: 0.2 + index * 0.12` seconds. Hero uses `animate` (mount) with the delays listed in Section 3. Exit animations, where any exist, run at 65% of enter duration.

### 1.6 Scroll Reveal Implementation Note (binding)

Scroll reveals use Framer Motion `whileInView` with `viewport={{ once: false, amount: 0.1 }}`. Any CSS-class reveal variant must use transitions (not `@keyframes` with `animation-fill-mode: forwards`) and an IntersectionObserver that removes the revealed class when the element scrolls fully above the viewport. GSAP is not used on this project.

### 1.7 Noise Grain Overlay (global)

```
Element: fixed inset-0 z-[3] pointer-events-none, mounted once in the root layout
Background: inline SVG fractalNoise data URI (baseFrequency 0.9, numOctaves 4, stitchTiles stitch)
Background size: 128px 128px
Opacity: 0.035
```

### 1.8 Tailwind Extension (project-level, written once)

```js
// tailwind.config.ts extend block (values only, no hex inside components)
fontFamily: {
  display: ['"Schibsted Grotesk"', 'sans-serif'],
  body:    ['"Schibsted Grotesk"', 'sans-serif'],
  mono:    ['"Spline Sans Mono"', 'monospace'],
},
maxWidth: { container: '1200px' },
animation: {
  'shimmer':    'shimmer 1.8s linear infinite',
  'pulse-soft': 'pulseSoft 2s ease-in-out infinite',
},
```

Scrollbar policy (global CSS):

```css
html { scrollbar-width: none; scroll-behavior: smooth; }
::-webkit-scrollbar { display: none; }
```

---

## 2. Navigation: A2 Scroll-Morph Pill (Gate 2)

```
ELEMENT: motion.nav
Position: fixed top-0 inset-x-0 z-50
State logic: useScroll() from motion/react, threshold 80px
  scrollY < 80  -> "expanded" state
  scrollY >= 80 -> "pill" state
Transition between states: layout animation, spring
  { type: 'spring', stiffness: 320, damping: 32 }

EXPANDED STATE (scrollY < 80):
  Shell: w-full px-6 md:px-10 py-4 md:py-5, background transparent
  Layout: flex items-center justify-between max-w-[1200px] mx-auto

  Wordmark (left):
    Text: "WRIT"
    Classes: font-display text-lg md:text-xl font-extrabold tracking-[-0.02em]
      text-[var(--text-primary)]
    Behaviour: click smooth-scrolls to top

  Centre links (hidden md:flex):
    Container: flex items-center gap-1
    Link: px-3 py-2 text-sm font-body font-medium text-[var(--text-secondary)]
      hover:text-[var(--text-primary)] transition-colors duration-150
    Items: "Mechanism", "Integration", "Compare", "Docs"
    Active state on scroll: text-[var(--text-primary)] with a 2px underline
      (border-b-2 border-[var(--accent)]), driven by section observer,
      never colour change alone

  Right cluster: flex items-center gap-3
    Secondary text link (hidden lg:inline):
      text-sm font-body text-[var(--text-secondary)] hover:text-[var(--text-primary)]
      Label: "GitHub"
    Primary CTA (small):
      bg-[var(--accent)] text-[var(--bg-primary)] px-4 py-2 rounded-full
      font-mono text-xs font-medium tracking-wide
      hover:bg-[var(--accent-hover)] transition-colors duration-150
      Label: "OPEN THE CONSOLE"
      Trailing icon: w-5 h-5 rounded-full bg-black/10 flex items-center justify-center
        group-hover:translate-x-0.5 group-hover:-translate-y-px transition-transform
        duration-200 (button-in-button pattern)
      Behaviour: wallet-gated handler (Section 2.2), never a raw anchor

PILL STATE (scrollY >= 80):
  Shell: liquid-glass rounded-full px-2.5 py-2 max-w-fit mx-auto mt-3
    (liquid-glass class from FRONTEND_SKILL.md Step 3B Technique 2, standard variant)
  Contents: wordmark (text-base) + centre links collapse behind a menu toggle
    (three 16px lines inside a w-9 h-9 rounded-full hover:bg-white/5 button) +
    primary CTA (unchanged label)
  Menu toggle opens a dropdown (z-dropdown): liquid-glass rounded-2xl p-2
    min-w-[200px], link rows px-4 py-2.5 text-sm font-body, close on outside
    click (document mousedown listener) and Escape

MOBILE (below md):
  Expanded state shows wordmark + primary CTA only
  Menu toggle visible in both states
  Full-screen overlay menu on toggle:
    fixed inset-0 z-45 bg-[var(--bg-primary)]/95 backdrop-blur-md
    Entrance: opacity 0 -> 1, duration 0.25s, ease [0.16, 1, 0.3, 1]
    Links: font-display text-4xl font-extrabold tracking-[-0.02em]
      text-[var(--text-primary)] stacked, py-3, each with blur-in stagger 0.06s
    Bottom: mono text-[11px] tracking-[0.2em] text-[var(--text-muted)]
      "MIDNIGHT BUILDATHON · BUILD 2"

SCROLL BEHAVIOUR RULES:
  No box shadow on the nav in any state. Separation, when needed, comes from
  liquid-glass borders. Never background: white or background: black.
```

### 2.1 Logo and Favicon

```tsx
{/* Logo slot: wordmark is pure type. No symbol asset. Replace with public/logo.svg only if one is provided */}
```

```html
<!-- Favicon slot: replace with public/favicon.ico once provided -->
```

Never substitute a hardcoded placeholder, an AI-generated icon or an emoji in either slot.

### 2.2 Wallet-Gated Routing and App-Interior Wallet Menu (Mandatory)

Writ uses a wallet-connected console, so the wallet interaction contract is explicit. Connection uses the Midnight wallet provider from the midnight.js SDK (Lace or the compatible embedded provider).

```
CONNECTION FLOW:
  Every landing entry point (nav CTA, hero CTA, final CTA) calls one handler:
    if (isConnected) navigate('/console') else openConnectModal()
  No entry point is ever a raw <a href="/console">.

  ConnectModal states (single owner of all provider calls):
    intro:     explains what connecting authorises, primary "CONNECT WALLET"
    connecting: provider prompt open, close button disabled, mono status line
    success:   brief confirmation, auto-navigates to /console after 600ms
    error:     rejection reason in plain language plus "TRY AGAIN" and "BACK"
    Escape and backdrop click are disabled while connecting.

APP ROUTE GATE (ProtectedRoute, wraps /console and all nested routes):
  hydrating (provider session restoring) -> branded loading skeleton,
    never a redirect, URL preserved exactly
  connected                              -> render the requested route
  confirmed disconnected                 -> navigate('/', replace: true)
    with { state: { disconnected: true } }
  provider error (unknown)               -> in-app recovery card with
    "RETRY" and "RETURN HOME", never treated as disconnected

CONNECTED WALLET PILL (console interior only):
  Fixed top-right trigger: green live dot (w-1.5 h-1.5 rounded-full
    bg-[var(--success)]), truncated address in font-mono text-xs
    text-[var(--text-primary)], chevron rotating 180 degrees when open
  aria-expanded="true|false", aria-haspopup="menu"

WALLET MENU (dropdown panel, z-dropdown):
  Shell: bg-[var(--bg-surface)] border border-[var(--border-default)]
    rounded-xl p-4 min-w-[280px]
  Entrance: scale 0.95 -> 1, y -6 -> 0, opacity 0 -> 1, duration 0.18s,
    ease [0.22, 1, 0.36, 1], transformOrigin 'top right'
  Status header: "WRIT CONSOLE" with green dot, mono text-[11px]
    tracking-[0.2em] text-[var(--text-muted)]
  Rows:
    full address + copy button (icon swaps to check for 1.8s)
    network "Midnight" + status "Active" in a 2-column grid
    "VIEW IN EXPLORER" link
  Disconnect action: text-[var(--error)] border border-[var(--error)]/30
    rounded-full px-4 py-2 text-xs font-mono, label "DISCONNECT WALLET"
    navigates to '/' immediately with { state: { disconnected: true } }
    before provider events resolve
  Dismissal: outside pointerdown and Escape. No backdrop div.

DISCONNECT TOAST (landing page, z-toast):
  Reads location.state.disconnected, then window.history.replaceState({}, '')
  bg-[var(--bg-elevated)] border border-[var(--border-default)] rounded-full
    px-5 py-3 text-sm font-body text-[var(--text-primary)]
  Text: "Wallet disconnected. The console stays closed until you reconnect."
  Slide-down entrance (y -12 -> 0, 0.3s), auto-dismiss 4s

RUNTIME ERROR CONTAINMENT:
  App root wrapped in an ErrorBoundary rendering a branded recovery screen
    (bg-[var(--bg-primary)], wordmark, plain-language cause, "TRY AGAIN" and
    "RETURN HOME" buttons). No stack traces, no blank screens.
  Every provider call is caught individually and surfaces as an inline state.
```

Refresh and deep-link acceptance tests (required before demo, production URL and mobile viewport):

- Connect from the landing page and confirm automatic navigation to `/console`.
- Navigate to `/console/writs/new`, hard refresh, confirm the same route renders with no host 404.
- Refresh `/console` while connected and confirm no landing flash and no redirect.
- Disconnect from the wallet menu, confirm immediate navigation to `/` with the toast, refresh, confirm the console does not silently reopen.
- Open `/console` in a fresh browser session with no wallet and confirm the landing page appears, never a platform 404.
- Reject the connection prompt and confirm the modal error state with retry, page remains usable.
- Simulate a provider failure and confirm the branded error boundary with recovery actions.

Hosting fallback file (release blocker): `vercel.json` in the web package with a rewrite of all application routes to `/index.html` equivalent (Next.js handles this natively via file routing; if a static build is used, add the standard SPA rewrite). Deep links must be tested on the deployed URL, never assumed from local behaviour.

---

## 3. Section: Hero

**Recipe:** bespoke, hero family. Structure follows the `split-screen-hero` grid maths but with the composition pivot of top-left lead and bottom-right support (fingerprint axis 1). Benchmark statement: Golden Example 3 (dark product hero) for specificity level.

```
SECTION: Hero
data-density="hero" data-seal-state="sealed"
Layout: relative min-h-[100dvh] w-full overflow-hidden
Background: none, ScopeSeal shows through at 0.55

CONTENT GRID:
  Container: relative z-10 h-full min-h-[100dvh] max-w-[1200px] mx-auto
    px-6 md:px-10 grid grid-cols-1 lg:grid-cols-12
  Top-left block: lg:col-span-7 pt-[120px] md:pt-[140px] lg:pt-[150px]
  Bottom-right block: lg:col-span-5 lg:col-start-8 flex items-end lg:justify-end
    pb-16 lg:pb-[80px] pt-10 lg:pt-0

TOP-LEFT BLOCK (text stack, max 4 elements):

  Eyebrow (element 1 of 4):
    font-mono text-[11px] md:text-xs uppercase tracking-[0.25em] text-[var(--accent)]
    Text: "PRIVATE AUTHORITY LAYER · MIDNIGHT"
    Animation: initial { opacity: 0, y: 10 }, animate { opacity: 1, y: 0 },
      duration 0.6s, ease [0.16, 1, 0.3, 1], delay 0.35s

  Headline (element 2 of 4):
    font-display text-[clamp(2.6rem,6vw,4.75rem)] font-extrabold
    tracking-[-0.02em] leading-[0.95] text-[var(--text-primary)]
    text-wrap balance
    Line 1: "AUTHORITY THE AGENT CAN PROVE."
    Line 2: "TERMS NO ONE SEES."
    Animation: word-by-word blur-in
      Each word: initial { filter: 'blur(10px)', opacity: 0, y: 24 },
        animate { filter: 'blur(0px)', opacity: 1, y: 0 }
      Duration 0.7s per word, ease [0.16, 1, 0.3, 1],
        delay = 0.5 + (wordIndex * 90ms)

  Subheading (element 3 of 4):
    mt-6 max-w-[46ch] font-body text-base md:text-lg text-[var(--text-secondary)]
    leading-relaxed
    Text: "Issue private mandates to AI agents on Midnight. Scope limits stay in
      private state. Every action returns a proof it stayed in bounds."
    Animation: initial { opacity: 0, y: 16 }, animate { opacity: 1, y: 0 },
      duration 0.7s, ease [0.16, 1, 0.3, 1], delay 0.8s

  CTA cluster (element 4 of 4):
    mt-8 flex flex-wrap items-center gap-4
    (within 40px of the subheading, no dead space)
    Animation: initial { opacity: 0, y: 16 }, animate { opacity: 1, y: 0 },
      duration 0.7s, ease [0.16, 1, 0.3, 1], delay 1.0s

    Primary CTA:
      bg-[var(--accent)] text-[var(--bg-primary)] px-7 py-3.5 rounded-full
      font-mono text-sm font-medium tracking-wide hover:bg-[var(--accent-hover)]
      transition-colors duration-150 flex items-center gap-3
      Label: "OPEN THE CONSOLE"
      Trailing icon circle: w-8 h-8 rounded-full bg-black/10 flex items-center
        justify-center, ArrowUpRight size 14,
        group-hover:translate-x-0.5 group-hover:-translate-y-px
        transition-transform duration-200
      Behaviour: wallet-gated handler (Section 2.2)

    Secondary CTA:
      border border-[var(--border-default)] text-[var(--text-primary)]
      px-7 py-3.5 rounded-full font-mono text-sm
      hover:border-[var(--accent)] transition-colors duration-150
      Label: "SEE THE MECHANISM"
      Behaviour: smooth-scroll to #mechanism

BOTTOM-RIGHT BLOCK (mandate panel, product IS the visual):

  Panel:
    w-full max-w-[400px] bg-[var(--bg-surface)]/70 backdrop-blur-xl
    border border-[var(--border-default)] rounded-2xl p-6 md:p-7
    shadow-[0_20px_60px_-20px_rgba(var(--shadow-tint),0.12)]
    Animation: initial { opacity: 0, y: 30, scale: 0.96 },
      animate { opacity: 1, y: 0, scale: 1 }
      duration 0.9s, ease [0.16, 1, 0.3, 1], delay 0.65s
    z within section: z-20 (floating panel tier)

    Header row: flex items-center justify-between mb-5
      Label: font-mono text-[11px] uppercase tracking-[0.2em] text-[var(--text-muted)]
        Text: "WRIT #0042"
      Status tag: flex items-center gap-1.5 bg-[var(--accent-glow)]
        border border-[var(--border-default)] rounded-full px-2.5 py-1
        font-mono text-[10px] uppercase tracking-[0.15em] text-[var(--accent)]
        Pulsing dot: w-1.5 h-1.5 rounded-full bg-[var(--accent)] animate-pulse-soft
        Text: "SEALED"

    Data rows (4), each:
      flex items-center justify-between py-3 border-b border-[var(--border-subtle)]
      last:border-0
      Label: font-body text-xs text-[var(--text-secondary)]
      Value: font-mono text-sm text-[var(--text-primary)]
      Values use Text Scramble (COMPOSITION_RECIPES.md, Section C) on mount and on
      every re-entry, speed 30, charset 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789#%&',
      then settle to the masked display string (sensitive fields never resolve to
      real values in this demo panel)

      Row 1 "AGENT"        -> "ops-agent-07"
      Row 2 "CEILING"      -> "▮▮▮▮▮▮▮▮"
      Row 3 "WINDOW"       -> "▮▮▮▮▮▮▮▮"
      Row 4 "ALLOWLIST"    -> "2 COUNTERPARTIES"

    Footer line: mt-5 pt-4 border-t border-[var(--border-subtle)]
      font-body text-[11px] text-[var(--text-muted)] leading-relaxed
      Text: "Terms live in private state. The ledger sees a commitment and nothing more."

MOBILE (below lg):
  Single column. Order: mandate panel first, then text stack
    (grid wrapper uses flex-col-reverse at the lg breakpoint so the panel leads).
  Panel max-w-none. Headline clamp floor 2.6rem holds at 320px width.
  First text appears within 220px of the top of the viewport at 1280x800
    (pt-[120px] accounts for the expanded nav).
```

---

## 4. Section: Problem

**Recipe:** `full-width-statement` (COMPOSITION_RECIPES.md, typography family).

```
SECTION: Problem
id="problem" data-density="sparse" data-seal-state="sealed"
Layout: py-28 md:py-40 flex items-center justify-center w-full
Background: none, ScopeSeal shows through at 0.30
z-index: content z-10

CONTENT:
  Container: w-full max-w-[1200px] mx-auto px-6 md:px-10

  Statement:
    font-display text-[clamp(2.1rem,5.4vw,4.6rem)] font-extrabold
    tracking-[-0.02em] leading-[1.02] text-[var(--text-primary)] text-left
    text-wrap balance
    Text: "AN AGENT WITH YOUR API KEY HOLDS ALL YOUR POWER."
    Animation: word-by-word blur-in
      blur(8px) opacity 0 y 20 -> blur(0) opacity 1 y 0
      duration 0.6s per word, ease [0.16, 1, 0.3, 1], stagger 90ms,
      triggered by whileInView (once: false, amount 0.1)

  Metadata line:
    mt-8 max-w-[60ch] font-body text-sm md:text-base text-[var(--text-secondary)]
    leading-relaxed text-left
    Text: "Prompts, config files and dashboards are where limits live today.
      None of them can prove what actually happened."
    Animation: opacity 0 -> 1, y 12 -> 0, duration 0.7s,
      ease [0.16, 1, 0.3, 1], delay 0.35s

No images, no cards, no CTAs in this section.
```

---

## 5. Section: Mechanism

**Recipe:** `architecture-layers` (COMPOSITION_RECIPES.md, stacked layers family), adapted to 4 steps with two-letter step tags.

```
SECTION: Mechanism
id="mechanism" data-density="dense" data-seal-state="scoped"
Layout: py-24 md:py-32 w-full
Background: bg-[var(--bg-primary)]/92 backdrop-blur-sm (ScopeSeal dims to 0.12)
z-index: content z-10

Container: max-w-[860px] mx-auto px-6 md:px-10

Heading: text-left mb-14
  Eyebrow: font-mono text-[11px] uppercase tracking-[0.25em] text-[var(--accent)]
    Text: "THE MECHANISM"
  Title: font-display text-3xl md:text-4xl font-extrabold tracking-[-0.02em]
    text-[var(--text-primary)] mt-3
    Text: "ISSUE, ACT, PROVE, DISCLOSE"

Layers: flex flex-col gap-4

Layer card (4x):
  border border-[var(--border-default)] rounded-xl p-6 md:p-7
  bg-[var(--bg-surface)]/60 hover:border-[var(--accent)]/40
  transition-colors duration-200 flex items-start gap-5
  Blueprint annotation (trend flavour): relative before element drawing a
    1px vertical hairline at left-[38px] top-[28px] bottom-[28px]
    bg-[var(--border-subtle)] connecting the step tags

  Step tag: font-mono text-xs text-[var(--accent)] min-w-[2.5rem] pt-1
    uppercase tracking-wider
    Values: "IS", "AC", "PR", "DI"
  Title: font-body text-base md:text-lg font-medium text-[var(--text-primary)]
  Description: font-body text-sm text-[var(--text-secondary)] mt-1.5
    leading-relaxed max-w-[62ch]

  Content:
    ISSUE: "The principal defines the scope in the browser. Ceiling, window,
      allowlist and action limits become private state. The ledger receives a
      commitment."
    ACT: "Every agent action passes through the contract. The circuit checks it
      against the sealed terms in private."
    PROVE: "In-scope actions return a proof the counterparty can verify.
      Out-of-scope attempts are rejected without exposing which bound stopped
      them."
    DISCLOSE: "When policy requires it, the contract reveals scoped facts to an
      auditor. The disclosure is contract-controlled and written to an
      append-only log."

Animation:
  Each layer: initial { opacity: 0, y: 20, filter: 'blur(6px)' },
    whileInView { opacity: 1, y: 0, filter: 'blur(0px)' }
    delay = index * 0.15s, duration 0.6s, ease [0.16, 1, 0.3, 1]
    viewport { once: false, amount: 0.1 }
```

---

## 6. Section: Live Metrics

**Recipe:** `metrics-section` (COMPOSITION_RECIPES.md, metrics family), adapted. No eyebrow in this section (budget spent). Two metrics are live contract reads, one is a fixed truth value.

```
SECTION: Live Metrics
data-density="dense" data-seal-state="proven"
Layout: relative py-24 md:py-32 w-full overflow-hidden
Background: bg-[var(--bg-primary)]/92 backdrop-blur-sm
z-index: content z-10

Content: max-w-[1200px] mx-auto px-6 md:px-10

Subtitle (section label, not an eyebrow treatment):
  font-mono text-[11px] uppercase tracking-[0.25em] text-[var(--text-muted)]
  Text: "LIVE FROM THE CONTRACT"

Metrics grid: mt-14 grid grid-cols-1 md:grid-cols-3 gap-10 md:gap-12

Metric (3x):
  Number: font-display text-5xl md:text-6xl lg:text-7xl font-extrabold
    text-[var(--text-primary)] leading-none tabular-nums
  Label: font-mono text-xs uppercase tracking-[0.15em] text-[var(--text-muted)]
    mt-3
  Divider (md+, between columns): border-r border-[var(--border-subtle)]
    on the first two columns only

  Values (live reads are field bindings, not fixed numbers):
    Metric 1: value: live count / label: "WRITS ISSUED ON MIDNIGHT"
    Metric 2: value: live count / label: "ACTIONS VERIFIED IN SCOPE"
    Metric 3: value: fixed "0" / label: "TERMS PUBLISHED TO THE LEDGER"

Animation:
  Numbers count from 0 to the fetched value over 1.5s, ease-out
    (useCountUp pattern from FRONTEND_SKILL.md, triggered per mount of the
    in-view state, counter runs once per value change, not on every scroll pass)
  Stagger: delay 0.2s per column
  Number entrance: blur-in base primitive, delay 0s + column stagger
  Loading state: skeleton shimmer bars sized to the expected numeral width
    (animate-shimmer), never a spinner
```

---

## 7. Section: Integration

**Recipe:** `tabbed-feature-explorer` (COMPOSITION_RECIPES.md, interactive family). This is the plug-and-play proof: three consumers, one contract surface.

```
SECTION: Integration
id="integration" data-density="dense" data-seal-state="scoped"
Layout: py-20 md:py-28 w-full
Background: bg-[var(--bg-secondary)]
z-index: content z-10

Container: max-w-[1200px] mx-auto px-6 md:px-10

Section header:
  Title: font-display text-3xl md:text-4xl font-extrabold tracking-[-0.02em]
    text-[var(--text-primary)]
    Text: "ONE CONTRACT SURFACE, THREE CONSUMERS"
  Subheading: mt-4 max-w-[52ch] font-body text-lg text-[var(--text-secondary)]
    Text: "The same writ is issued, exercised and attested through typed SDK
      calls. Any agent framework or internal tool can embed them."

TAB BAR:
  mt-10 flex gap-2 border-b border-[var(--border-subtle)] overflow-x-auto
  Tab button: px-6 py-3 text-sm font-mono uppercase tracking-[0.12em]
    Inactive: text-[var(--text-muted)] hover:text-[var(--text-primary)]
      transition-colors duration-150
    Active: text-[var(--text-primary)] border-b-2 border-[var(--accent)]
  Tabs: "PRINCIPAL", "AGENT", "VERIFIER"

TAB CONTENT:
  mt-10 grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-12 items-start
  Switch animation: AnimatePresence mode="wait"
    enter: { opacity: 0, y: 12 }, to { opacity: 1, y: 0 },
      duration 0.3s, ease [0.16, 1, 0.3, 1]
    exit: { opacity: 0, y: -8 }, duration 0.2s

  Left column (per tab):
    Title: font-body text-xl font-medium text-[var(--text-primary)]
    Description: mt-3 font-body text-base text-[var(--text-secondary)]
      leading-relaxed max-w-[52ch]
    Bullets (max 3): mt-6 space-y-3
      Each: flex gap-3 items-start
      Marker: w-5 h-5 rounded-full bg-[var(--accent-glow)] border
        border-[var(--accent)]/40 flex items-center justify-center
        (inner 6px dot bg-[var(--accent)])
      Text: text-sm font-body text-[var(--text-secondary)]

    PRINCIPAL: "Define the mandate once."
      "Set ceiling, window, allowlist and action mask in a local form."
      "Terms are sealed into private state before any transaction is built."
      "Revoke instantly; revocation publishes a status change only."
    AGENT: "Act without holding secrets."
      "Each action is one typed call: recipient, amount, intent."
      "The contract answers in-scope or rejected. The reason stays private to you."
      "No API keys, no bearer tokens, no environment sprawl."
    VERIFIER: "Ask for facts, not files."
      "Request a scoped attestation: within-writ, spend band, window valid."
      "The contract decides what to disclose and logs that it did."
      "Nothing else about the mandate becomes readable."

  Right column (code panel, both tabs share the frame):
    Container: rounded-xl overflow-hidden bg-[var(--bg-surface)]
      border border-[var(--border-subtle)]
    Title bar: h-9 bg-[var(--bg-elevated)] flex items-center px-4 gap-2
      3 dots: w-2.5 h-2.5 rounded-full (bg-[var(--text-muted)]/40 x3)
      Filename: font-mono text-[11px] text-[var(--text-muted)] ml-2
        ("issue.ts", "act.ts", "attest.ts" per tab)
    Code area: p-6 font-mono text-[12px] md:text-[13px] leading-relaxed
      text-[var(--text-secondary)] overflow-x-auto
      Line numbers gutter: text-[var(--text-muted)]/50 select-none
      Strings: text-[var(--accent)], keywords: text-[var(--text-primary)]

      PRINCIPAL code (final text):
        import { writ } from '@writ/sdk'
        const sealed = await writ.issue({
          ceiling:  '500000000',        // private
          window:   { from: now, to: now + 48 * 3600 },
          allowlist: ['0x4c…9a12', '0x88…3f07'],
        })
        // ledger sees: commitment 0x7c…a41e, status 'sealed'

      AGENT code (final text):
        const result = await writ.act({ writ: '0x7c…a41e', to, amount })
        if (result.inScope) settle(result.proof)
        else log(result.reason)   // private to the agent

      VERIFIER code (final text):
        const fact = await writ.attest({ action: '0x02…e15b' })
        // -> 'within-writ'  (nothing else disclosed)

Animation:
  Header and tab bar: blur-in base, delay 0s
  Tab content: per AnimatePresence values above
  Code panel: initial { opacity: 0, y: 20, scale: 0.98 },
    whileInView to rest, duration 0.7s, ease [0.16, 1, 0.3, 1], delay 0.15s
```

---

## 8. Section: Compare

**Recipe:** `asymmetric-bento-grid` (COMPOSITION_RECIPES.md, content grid family), adapted to a three-way comparison with unequal column weights.

```
SECTION: Compare
id="compare" data-density="dense" data-seal-state="disclosed"
Layout: w-full py-24 md:py-32
Background: bg-[var(--bg-primary)]/92 backdrop-blur-sm
z-index: content z-10

Container: max-w-[1200px] mx-auto px-6 md:px-10
Grid: grid grid-cols-1 lg:grid-cols-12 gap-5

Heading (col-span-12, mb-12):
  Eyebrow: font-mono text-[11px] uppercase tracking-[0.25em] text-[var(--accent)]
    Text: "THE DIFFERENCE"
  Title: font-display text-3xl md:text-4xl font-extrabold tracking-[-0.02em]
    text-[var(--text-primary)] mt-3
    Text: "THREE WAYS TO LIMIT AN AGENT"

Card A: Writ (lg:col-span-5):
  border border-[var(--accent)]/40 bg-[var(--bg-surface)] p-7 rounded-xl
  shadow-[0_20px_60px_-30px_rgba(var(--shadow-tint),0.25)]
  Title: font-body text-lg font-medium text-[var(--accent)]
    Text: "WRIT"
  Rows (4x, flex items-baseline justify-between gap-4 py-3.5
    border-b border-[var(--border-subtle)] last:border-0):
    Question: font-body text-xs text-[var(--text-muted)] uppercase
      tracking-[0.12em]
    Answer: font-mono text-sm text-[var(--text-primary)] text-right
    "Where limits live" -> "Private state, sealed"
    "Proof of compliance" -> "Scoped, cryptographic"
    "What a check reveals" -> "Only the fact asked"
    "Revocation" -> "Instant, status only"

Card B: API keys and prompts (lg:col-span-4):
  border border-[var(--border-default)] bg-[var(--bg-surface)]/60 p-7 rounded-xl
  Title: font-body text-lg font-medium text-[var(--text-primary)]
    Text: "API KEYS AND PROMPTS"
  Rows (same structure):
    "Where limits live" -> "Environment and docs"
    "Proof of compliance" -> "Trust the logs"
    "What a check reveals" -> "The whole key surface"
    "Revocation" -> "Rotate and hope"

Card C: On-chain policy modules (lg:col-span-3):
  border border-[var(--border-default)] bg-[var(--bg-surface)]/60 p-7 rounded-xl
  Title: font-body text-lg font-medium text-[var(--text-primary)]
    Text: "PUBLIC POLICY CONTRACTS"
  Rows (same structure):
    "Where limits live" -> "Public contract state"
    "Proof of compliance" -> "Public trace"
    "What a check reveals" -> "The full policy"
    "Revocation" -> "Governance vote"

Animation:
  Cards: initial { opacity: 0, y: 20 }, whileInView to rest,
    duration 0.6s, ease [0.16, 1, 0.3, 1], delay = index * 0.12s
  Card A hover: translateY(-4px) with spring stiffness 260 damping 22,
    border shifts to border-[var(--accent)]/60, CSS transition on border-color
  Card images: none. This comparison is typographic.
```

---

## 9. Section: Trust

**Recipe:** `split-image-text` (COMPOSITION_RECIPES.md, split content family), adapted. The image slot becomes a badge stack since no photography fits.

```
SECTION: Trust
data-density="sparse" data-seal-state="disclosed"
Layout: py-24 md:py-32 w-full
Background: none, ScopeSeal shows through at 0.30
z-index: content z-10

Container: max-w-[1200px] mx-auto px-6 md:px-10
Grid: grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-16 items-center

LEFT COLUMN:
  Title: font-display text-3xl md:text-4xl lg:text-[2.75rem] font-extrabold
    tracking-[-0.02em] leading-[1.05] text-[var(--text-primary)]
    Text: "THE TERMS NEVER TOUCH THE PUBLIC LEDGER"
  Description: mt-5 font-body text-base text-[var(--text-secondary)]
    leading-relaxed max-w-[52ch]
    Text: "Writ is a pair of Compact contracts on Midnight. Scope values are
      witness-held private state checked inside the circuits. Public state holds
      commitments, statuses and an append-only audit root. Disclosure happens
      through contract-controlled disclosure calls, logged every time."
  Animation: initial { opacity: 0, x: -20 }, whileInView to rest,
    duration 0.7s, ease [0.16, 1, 0.3, 1], delay 0.2s

RIGHT COLUMN (badge stack):
  grid grid-cols-1 sm:grid-cols-2 gap-4
  Animation: initial { opacity: 0, x: 20 }, whileInView to rest,
    duration 0.7s, ease [0.16, 1, 0.3, 1], delay 0.35s

  Badge card (4x):
    border border-[var(--border-default)] rounded-xl p-5
    bg-[var(--bg-surface)]/70 backdrop-blur-sm
    Icon slot: w-8 h-8, plain comment placeholder, no AI-generated icon
      {/* Badge icon slot: supply SVG or leave empty */}
    Label: font-mono text-[11px] uppercase tracking-[0.15em]
      text-[var(--text-muted)] mt-3
    Value: font-body text-sm text-[var(--text-primary)] mt-1

    Content:
      "NETWORK" / "Midnight"
      "CONTRACTS" / "Compact, dual-ledger"
      "DISCLOSURE" / "Contract-controlled"
      "LICENCE" / "Apache 2.0"
```

---

## 10. Final CTA

**Recipe:** `footer-video` family (footer), video column removed, ScopeSeal at full drama (fingerprint crescendo close).

```
SECTION: Final CTA
data-density="hero" data-seal-state="disclosed"
Layout: relative py-32 md:py-40 w-full flex items-center justify-center
  overflow-hidden
Background: none, ScopeSeal shows through at 0.55 (disclosed state: ring gap
  open, light sweep)
z-index: content z-10

Container: relative z-10 max-w-2xl mx-auto px-6 text-center
  flex flex-col items-center

Heading:
  font-display text-4xl md:text-5xl font-extrabold tracking-[-0.02em]
  leading-[1.02] text-[var(--text-primary)] text-wrap balance
  Text: "ISSUE YOUR FIRST WRIT"
  Animation: blur(10px) opacity 0 y 24 -> blur(0) opacity 1 y 0
    duration 0.8s, ease [0.16, 1, 0.3, 1]

Subtext:
  font-body text-base text-[var(--text-secondary)] mt-5 max-w-md
  Text: "Connect on Midnight and hand your first agent a mandate that can prove
    itself."
  Animation: opacity 0 y 16 -> 1 0, duration 0.7s, ease [0.16, 1, 0.3, 1],
    delay 0.2s

CTA:
  mt-9 bg-[var(--accent)] text-[var(--bg-primary)] px-9 py-4 rounded-full
  font-mono text-sm font-medium tracking-wide hover:bg-[var(--accent-hover)]
  transition-colors duration-150 flex items-center gap-3
  Label: "OPEN THE CONSOLE"
  Trailing icon circle per the button-in-button pattern
  Behaviour: wallet-gated handler
  Animation: opacity 0 y 16 -> 1 0, duration 0.7s, ease [0.16, 1, 0.3, 1],
    delay 0.4s
```

---

## 11. Footer

```
SECTION: Footer
data-density="sparse"
Layout: py-14 w-full border-t border-[var(--border-subtle)]
Background: bg-[var(--bg-primary)]/95 backdrop-blur-sm
z-index: content z-10

Container: max-w-[1200px] mx-auto px-6 md:px-10

Row 1: flex flex-col md:flex-row md:items-center md:justify-between gap-8
  Left: wordmark + attribution
    Wordmark: font-display text-base font-extrabold tracking-[-0.02em]
      text-[var(--text-primary)] ("WRIT")
    Attribution: font-body text-xs text-[var(--text-muted)] mt-3 max-w-[42ch]
      Text: "Built for the Midnight Buildathon on AKINDO. Three waves,
        progress over polish."

  Right: flex flex-wrap gap-x-8 gap-y-3
    Link: font-mono text-xs uppercase tracking-[0.15em]
      text-[var(--text-secondary)] hover:text-[var(--accent)] transition-colors
    Links: "Docs", "GitHub", "Discord", "AKINDO"

Row 2: mt-10 pt-6 border-t border-[var(--border-subtle)] flex
  justify-between gap-4 flex-wrap
  font-mono text-[11px] text-[var(--text-muted)]
  Left: "© 2026 Writ"
  Right: "Deployed on Midnight"
```

---

## 12. Console Interior (app routes, design constraints only)

Console pages use the same global system but not the landing-page motion stack (dashboards do not need hero entrances). Rules for `/console` and nested routes:

```
LAYOUT: 240px fixed left sidebar (collapses to a bottom tab bar below md),
  fluid main content, 64px top bar holding the wallet pill (Section 2.2)
SIDEBAR: bg-[var(--bg-secondary)] border-r border-[var(--border-subtle)]
  Nav rows: font-body text-sm, active row gets bg-[var(--bg-elevated)] and a
  2px left accent bar (never colour-only indication)
DATA SURFACES: borders and dividers over card chrome (dashboard hardening).
  Cards only for panels that lift, collapse or overlap
TABLES: font-mono text-xs for addresses and amounts, tabular-nums,
  status cells use the status badge system (sealed / active / rejected /
  disclosed) with icon plus label
EMPTY STATES: message plus one primary action (e.g. "No writs yet. Issue one.").
  Skeleton shimmer for every async load. Error states state cause and fix.
FOCUS: visible focus ring (2px var(--accent) outline, offset 2px) on every
  interactive element
```

Routes:

- `/`: landing page (public)
- `/console`: wallet-gated dashboard (writ list, live status)
- `/console/writs/new`: issue form (sealed fields, scope builder)
- `/console/actions`: agent action log (private reasons visible only to the agent wallet)
- `/console/audit`: disclosure log (public audit root entries)

---

## 13. Responsive Summary

- Hero grid stacks below `lg`, mandate panel leads the stack (flex-col-reverse below lg)
- Headline uses `clamp(2.6rem, 6vw, 4.75rem)`; no bare `text-7xl` anywhere
- Nav centre links collapse behind the menu toggle below `md`; pill max width `max-w-fit`
- Comparison grid: 1 column below `lg`, weights 5/4/3 apply at `lg` and above
- Badge stack: 1 column below `sm`, 2 columns at `sm` and above
- ScopeSeal canvas: tick count drops to 36 and ring radii scale below `md`; rendering pauses below `md` if `navigator.maxTouchPoints > 0` and the frame rate drops under 45fps for 2s
- All touch targets minimum 44x44px; tab bar scrolls horizontally on small screens
- Every positional class in this spec carries its responsive variants in place

## 14. Asset Brief Summary

No photography, no video, no external images. Every visual is coded:

```
ASSET BRIEF:
  Type: coded canvas instrument (not sourced)
  Description: concentric scope-seal rings with tick marks and scanning arc
  Motion: state machine per section (sealed / scoped / proven / disclosed)
  Hosting: none. Ships in the bundle as code.
  Fallback: static rings under prefers-reduced-motion

ASSET BRIEF:
  Type: UI panel (coded, hero right)
  Description: mandate card with masked scope rows and text-scramble values
  Fallback: none required

[ASSET PENDING: logo symbol and favicon, only if one is provided later.
 Search: n/a. Until provided, comment slots per Section 2.1.]
```

## 15. Spec Self-Check (Step 3D Rule 7)

- [x] Every element has exact Tailwind classes (no vague descriptions)
- [x] Every animation has initial, animate, duration, ease and delay values
- [x] Every section declares its z-index position against the global map (1.3)
- [x] Asset briefs present; the only generated visuals are coded systems, fully specified
- [x] Every positional and sizing class carries responsive variants
- [x] Composition recipes referenced by name (`full-width-statement`, `architecture-layers`, `metrics-section`, `tabbed-feature-explorer`, `asymmetric-bento-grid`, `split-image-text`, `footer-video` family) with bespoke specs at matching detail where none applied (hero, ScopeSeal)
- [x] Entrance animations use blur-in (filter blur + opacity + translate), not plain fadeUp
- [x] All scroll animations use `viewport={{ once: false, amount: 0.1 }}` or the transition-based CSS pattern
- [x] Hover states are CSS transitions; no inline JS hover handlers
- [x] No em dashes anywhere in this spec
- [x] No placeholder copy; every headline, label and code line is final text
- [x] Eyebrow budget respected (3 total: hero, mechanism, compare)
- [x] CTA intents unique: "OPEN THE CONSOLE" (primary) and "SEE THE MECHANISM" (secondary) only
- [x] Wallet interaction explicitly specified: connection modal states, protected routing, hydration handling, disconnect routing, wallet dropdown anatomy, copy and explorer actions, dismissal, and the required refresh/deep-link acceptance tests

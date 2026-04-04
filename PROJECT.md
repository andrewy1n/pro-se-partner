# Pro Se Partner

> A persistent, multi-agent legal companion for pro se litigants navigating the court system — built for eviction defense in LA County as the MVP use case.

---

## Table of Contents

1. [Problem & Vision](#1-problem--vision)
2. [What It Does](#2-what-it-does)
3. [Tech Stack](#3-tech-stack)
4. [Architecture Overview](#4-architecture-overview)
5. [Agent Roster](#5-agent-roster)
6. [Case Stages & Flow](#6-case-stages--flow)
7. [Frontend Spec](#7-frontend-spec)
8. [MVP Scope](#8-mvp-scope)
9. [Change Log](#9-change-log)

---

## 1. Problem & Vision

Most people who end up in court without a lawyer aren't there by choice — they can't afford one. Pro se litigants face the same legal system as represented parties but without the procedural knowledge, form literacy, or research capacity to compete. They miss deadlines they didn't know existed. They file the wrong forms. They don't know they have defenses.

**Pro Se Partner eliminates the research burden entirely.** A user describes their legal situation once in plain language. The system autonomously navigates real government websites, produces pre-filled court forms, computes hard deadlines, surfaces applicable defenses, finds legal aid, and checks fee waiver eligibility — all in real time.

The MVP is scoped to eviction defense in LA County — a high-volume, time-critical case type where the stakes are immediate and the procedural traps are well-defined. But the architecture is general: any legal domain with navigable public court resources, known forms, and computable deadlines is a valid target for the same agent pattern.

When the user hits a step requiring human action (like creating an e-filing account), the system pauses, gives them one clear task, and resumes autonomously when they return. This loop repeats until the case is resolved.

---

## 2. What It Does

| Capability | Description |
|---|---|
| Situation intake | Classifies eviction type, stage, and notice type from plain language input |
| Document parsing | Extracts structured fields from uploaded notices, complaints, and leases |
| Form pre-filling | Downloads and fills UD-105 (Answer) and FW-001 (fee waiver) from LA Superior Court |
| Deadline computation | Calculates hard response deadlines accounting for service method and business day rules |
| Defense surfacing | Identifies applicable defenses (habitability, improper notice, retaliation) with citations |
| Legal aid search | Geocoded search filtered by case type, income eligibility, and availability |
| Fee waiver check | Evaluates eligibility against California thresholds, pre-fills FW-001 if qualified |
| E-filing | Navigates LA Superior Court portal, uploads completed UD-105, captures confirmation number |

---

## 3. Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 15 (React 19), Tailwind CSS |
| Data fetching | TanStack Query (1s polling for agent status and messages) |
| Agent runtime | Browser Use Cloud SDK v3 (`browser-use-sdk`) |
| AI model | Claude via Browser Use sessions (`bu-max` for complex agents) |
| Live browser view | `session.liveUrl` embedded as an iframe |
| Form handling | PDF manipulation for form pre-filling (TBD: `pdf-lib` or `pdf.js`) |
| Icons | `lucide-react` |
| Deployment | Vercel |

### Reference Implementation

Our architecture closely follows the [browser-use/chat-ui-example](https://github.com/browser-use/chat-ui-example) repo. Key patterns we adopt:

- **Session lifecycle:** `client.sessions.create()` → get `session.id` + `session.liveUrl` → send tasks → poll messages
- **Polling:** TanStack Query with a 1-second refetch interval, auto-stops on terminal states (`completed`, `stopped`, `error`, `timed_out`)
- **SDK wrapper:** All Browser Use calls isolated in `src/lib/api.ts`
- **Message conversion:** API messages transformed into UI-friendly turns in `src/lib/message-converter.ts`
- **Live browser panel:** `session.liveUrl` rendered as an `<iframe>` — no custom screensharing needed

---

## 4. Architecture Overview

```
User Input (text + optional document upload)
              |
              v
+-----------------------------+
|   Case Intake               |  <- Orchestrator, no browser
|   (direct Claude API)       |     Classifies facts, dispatches Wave 1
+------------+----------------+
             |
    +--------+-----------------+------------------+
    v        v                 v                  v
Document  Forms            Deadline          Defense Research,
Parser    Navigator        Tracker           Legal Aid, Fee Waiver
(if       (bu-max)
upload)
             |
             v
          PDF Filler
          (after forms download)
    |        |                 |                  |
    +--------+-----------------+------------------+
                         |
                         v
               Dashboard populates progressively
               (Left panel -> Center -> Right)
                         |
               +---------+---------+
               |  Human-in-the-loop|
               |  Gate: user creates|
               |  e-filing account  |
               +---------+---------+
                         |
                         v
              E-Filing (Wave 2)
              Navigates portal -> uploads UD-105
              -> captures confirmation number
```

**Execution model:**
- **Wave 1** — Document Parser, Forms Navigator, Deadline Tracker, Defense Research, Legal Aid, and Fee Waiver run concurrently via parallel Browser Use sessions after Case Intake. PDF Filler activates immediately after Forms Navigator finishes downloading the form — it does not wait for other Wave 1 agents.
- **Wave 2** — E-Filing activates only after the user manually completes a task and returns with credentials
- Each browser agent gets its own `session.liveUrl`; the Activity Strip cycles through all active sessions

---

## 5. Agent Roster

Each agent has a role-based name below. Older references may have used numeric labels (e.g. “Agent 3” for Forms Navigator); the names here are the canonical product names.

### Case Intake *(orchestrator)*
- **Type:** Orchestrator, no browser, direct Claude API call
- **Input:** Raw user text
- **Output:** Structured JSON — eviction type, proceedings stage, notice type, service date, claimed amount, jurisdiction
- **Behavior:** Dispatches all Wave 1 agents with specific context objects. Every downstream agent gets its facts from this one.

---

### Document Parser
- **Type:** Browser Use session (or direct PDF extraction)
- **Activates when:** User uploads a file (eviction notice, UD complaint, lease, pay stubs)
- **Input:** Uploaded document
- **Output:** Structured fields — case number, court name, landlord name, claimed amount, service date, allegations
- **Behavior:** Dormant if no documents uploaded. Feeds parsed fields directly into Forms Navigator and Fee Waiver.

---

### Forms Navigator
- **Type:** Browser Use session (`bu-max`)
- **Task:** Navigate LA Superior Court self-help website -> find current UD-105 and FW-001 -> download both to disk
- **Key behaviors:**
  - Handles multi-step navigation and PDF downloads
  - Recovers from broken/redirected links (visible to audience during demo)
  - Verifies the form revision date before downloading
- **Output:** Downloaded UD-105 and FW-001 PDF files + confirmation of form versions. Triggers PDF Filler on completion.

---

### PDF Filler
- **Type:** Document processing agent, no browser (`pdf-lib` or `pdf.js`)
- **Input:** PDF files from Forms Navigator + structured facts from Case Intake + parsed fields from Document Parser (if uploaded) + eligibility result from Fee Waiver
- **Task:** Fill all known fields in UD-105 and FW-001, flag any fields that require user input
- **Key behaviors:**
  - Maps structured case facts to PDF field names
  - Flags ambiguous or user-only fields rather than guessing
  - Runs independently of the browser — no session needed, faster and more debuggable
- **Output:** Pre-filled UD-105 and FW-001, download-ready

---

### Deadline Tracker
- **Type:** Browser Use session
- **Task:** Navigate California statutory sources and LA Superior Court local rules
- **Logic:** Computes response deadline accounting for service method (personal vs. substituted vs. posted), business day rules, and local rules. Cross-verifies against CCP 1167 and LA Superior Local Rule 3.350.
- **Output:** Precise date, consequence of missing it, projected trial window, both source citations

---

### Defense Research
- **Type:** Browser Use session
- **Task:** Search California Courts self-help guides and case law for defenses matching the user's specific facts
- **Defenses checked:** Warranty of habitability, improper notice, landlord acceptance of partial rent, retaliation
- **Design principle:** Conservative — each defense only surfaces if the facts support it. Fewer sourced defenses beats a long unsupported list.
- **Output:** Plain-language defense explanations with source cited

---

### Legal Aid
- **Type:** Browser Use session
- **Task:** Geocoded search for legal aid organizations near the user
- **Filters:** Case type accepted, income eligibility, current availability
- **Output:** Ranked list by distance — name, hours, contact info, walk-in vs. appointment policy, eligibility notes. Also surfaces LA Superior Court self-help centers.

---

### Fee Waiver
- **Type:** Logic agent (Claude call + optional doc parse)
- **Input:** Income from user input or extracted from pay stubs by Document Parser
- **Task:** Check against California fee waiver thresholds
- **Output:** Eligibility determination. If qualified, passes result to PDF Filler to pre-fill FW-001. Eliminates the $225-$370 filing fee barrier.

---

### E-Filing *(Stage 2)*
- **Type:** Browser Use session (`bu-max`)
- **Activates:** After user creates an LA Superior Court e-filing account and returns with credentials
- **Task:** Navigate the e-filing portal -> upload completed UD-105 -> capture confirmation number and timestamp
- **Human-in-the-loop:** System detects task completion and resumes autonomously. This is the visible handoff moment in the demo.
- **Output:** Confirmation number, timestamp, dashboard update — "Answer filed."

---

## 6. Case Stages & Flow

### Stage 1 — Intake & Preparation *(hackathon MVP)*
1. User describes situation, optionally uploads documents
2. Case Intake classifies and dispatches Wave 1 agents
3. Document Parser through Fee Waiver run in parallel; dashboard populates progressively
4. Ends with one clear call to action: "Your UD-105 is ready. To file it, you'll need an e-filing account. Here's how — it takes 5 minutes. Come back when you have your login."

### Stage 2 — Filing *(hackathon MVP)*
1. User returns with e-filing credentials
2. E-Filing activates, navigates the portal, uploads UD-105
3. Dashboard updates: "Answer filed. Confirmation #XXXXX. Trial date set within 20 days."

### Stage 3 — Trial Preparation *(post-hackathon v2)*
New agents: evidence checklist based on asserted defenses, opening statement template, judge research from public records.

### Stage 4 — Post-Hearing *(post-hackathon v2)*
User reports outcome. Win, loss, or continuance each triggers a different agent path — appeal windows, stay-of-execution options, or deadline recalculation.

---

## 7. Frontend Spec

### Layout

Single-page app. After submission the page splits into two columns: a **left column** for the live browser and agent feed, and a **right column** for the dashboard. On the home/pre-submit state, only the intake form is shown full-width.

```
+---------------------------+  +----------------------------------+
|  [ Live Browser iframe ]  |  |  Top panel: Case Facts           |
|                           |  |  Upper panel: Status & Timeline  |
|  session.liveUrl rendered |  |  Middle panel: Action Items      |
|  as <iframe>, ~60% width  |  |  Lower panel: Context & Resources|
|                           |  |                                  |
|                           |  |  (panels populate progressively) |
+---------------------------+  +----------------------------------+
|  [ Activity Strip ]       |
|  Plain-language agent     |
|  feed, updated via        |
|  TanStack Query polling   |
+---------------------------+
```

**Left column (~60% width):**

1. **Live Browser iframe** — `session.liveUrl` from the active Browser Use session rendered as a full `<iframe>`. Shows the agent navigating real government websites in real time. During Wave 1 the iframe displays the Forms Navigator (most visually compelling). During Stage 2 it switches to the E-Filing session. Implemented via `browser-panel.tsx`, same pattern as the reference repo.

2. **Activity Strip** — below the iframe. Live plain-language feed of what each agent is currently doing, updated via TanStack Query polling all active sessions.
   - Example: `Forms Navigator: Searching LA Superior Court self-help portal... Found UD-105 (rev. 2024)... Checking filing fee schedule...`
   - Each line prefixed with the agent name and a status indicator dot (running / done / error)

**Right column (~40% width):**

3. **Dashboard** — four stacked panels that populate progressively as agents finish:

| Panel | Loads | Contents |
|---|---|---|
| **Case Facts** | First | Extracted facts from intake (Eviction type, stage, notice type, date served, amount, jurisdiction) for user verification |
| **Status & Timeline** | Second | Countdown ("You have 5 days to respond"), full case arc as progress tracker, always one call to action when system is paused |
| **Action Items** | Third | Numbered prioritized checklist, pre-filled forms attached for download, each item expandable with detail |
| **Context & Resources** | Last | Applicable defenses with plain-language explanations and citations, legal aid clinics with distance/hours/eligibility |

4. **HITL Gate card** — replaces the Action Items panel content when the system is waiting on the user. Single focused instruction, e.g. *"Create a free e-filing account at lacourt.org. It takes 5 minutes. Come back when you have your login."* Dismissed automatically when Stage 2 begins.

### Component Structure

```
src/
├── app/
│   ├── layout.tsx                   # Root layout with providers
│   ├── page.tsx                     # Home — intake form
│   └── session/[id]/page.tsx        # Session view — dashboard + live browser
├── components/
│   ├── browser-panel.tsx            # Live browser iframe (session.liveUrl), left column top
│   ├── activity-strip.tsx           # Real-time agent action feed, left column bottom
│   ├── dashboard/
│   │   ├── case-facts-panel.tsx     # Stacked top-right: extracted intake facts
│   │   ├── status-panel.tsx         # Stacked upper-right: countdown + case arc
│   │   ├── action-items-panel.tsx   # Stacked mid-right: checklist + form downloads
│   │   └── resources-panel.tsx      # Stacked bottom-right: defenses + legal aid
│   ├── intake-form.tsx              # Full-width pre-submit: text input + file upload
│   └── hitl-gate.tsx                # Human-in-the-loop pause card (replaces action items)
├── context/
│   ├── session-context.tsx          # TanStack Query polling (1s interval)
│   └── case-context.tsx             # Structured case facts state
└── lib/
    ├── api.ts                       # Browser Use SDK wrapper
    ├── agent-dispatcher.ts          # Wave 1 / Wave 2 dispatch logic
    ├── message-converter.ts         # API messages -> UI turns
    └── types.ts                     # TypeScript type definitions
```

---

## 8. MVP Scope

### Must Ship
- [x] Intake form + Case Intake classification
- [ ] Forms Navigator — live navigation and UD-105 + FW-001 download
- [ ] PDF Filler — field mapping and pre-fill from structured case facts
- [ ] Deadline Tracker — deadline computation with dual source citation
- [ ] Defense Research — minimum 2 defenses
- [ ] Activity Strip with real-time agent feed
- [ ] Dashboard — all four panels populating end-to-end from agent outputs *(Case Facts panel from intake classification is implemented; Status, Action Items, and Resources still placeholders until Wave 1 agents populate context)*
- [ ] HITL gate card with clear user instructions *(component exists; gate state not wired to dispatch / pause flow)*
- [ ] Stage 2: E-Filing flow functional

### Repo progress (snapshot)

What is implemented today: home intake form; `POST /api/intake/classify` (structured Gemini output); client `sessionStorage` handoff; session page layout (browser iframe shell, Activity Strip shell with empty feed, TanStack Query polling stub); **Case Facts** panel with human-readable labels; other dashboard panels and HITL are UI shells. `dispatchWave1Agents` / `dispatchWave2Agent` in `src/lib/agent-dispatcher.ts` are not implemented yet.

### Stretch Goals
- [ ] Document Parser: parsing from uploaded files *(upload control exists; no upload pipeline)*
- [ ] Legal Aid: live geocoded search
- [ ] Fee Waiver: eligibility check + FW-001 pre-fill
- [ ] Mobile-responsive layout
- [ ] Session persistence (user can close and return)

### Explicitly Out of Scope
- Stage 3 and Stage 4 (trial prep, post-hearing)
- Real production e-filing with live court credentials
- Multi-language support

---

## 9. Change Log

This document is a living reference. Update it as decisions get made during the hack — don't let it drift from what you're actually building.

**When to update:**
- A scoping decision changes (feature added, cut, or deprioritized)
- An agent's behavior or output changes meaningfully
- The tech stack changes (library swapped, approach changed)
- The frontend layout shifts from what's specced
- A risk from Open Questions gets resolved

**How to update:**
Keep changes lightweight. Edit the relevant section in place, then append a one-liner to the log below with the date/time and what changed. No need to preserve old content — just update it and log it.

**Log:**

| Time | Change |
|---|---|
| Hack start | Initial document created |
| April 3 | Split Forms Agent into Forms Navigator and PDF Filler. E-Filing kept as a separate Wave 2 step. |
| April 4 | Added Case Facts panel for user verification of Case Intake classification. |
| April 4 | MVP checklist: marked intake + Case Intake complete; added repo progress snapshot and notes on partial UI. |
| April 4 | Renamed numbered agents to role-based names (Case Intake, Document Parser, Forms Navigator, PDF Filler, Deadline Tracker, Defense Research, Legal Aid, Fee Waiver, E-Filing). |

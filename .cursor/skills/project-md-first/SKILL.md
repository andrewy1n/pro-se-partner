---
name: project-md-first
description: Reads `PROJECT.md` before substantive work in this repo and uses it as the initial source of project intent, scope, architecture, and current progress. Treats `PROJECT.md` as a living, amendable document that should evolve with meaningful project changes. Use when planning changes, making meaningful code edits, or answering project-status questions in this repository.
---

# Project.md First

Use this skill in this repository before substantive edits or planning work.

## Core Rule

Read `PROJECT.md` first and use it as the starting source of truth for:

- product intent and MVP scope
- architecture and agent responsibilities
- current repo progress
- what is explicitly out of scope

This skill is advisory, not exclusive. After reading `PROJECT.md`, use other repo files as needed to implement or verify work. Treat `PROJECT.md` as iterative: if the intended scope, architecture, or progress snapshot meaningfully changes, update the document so it stays accurate.

## When To Apply

Apply this skill when:

- the user asks for meaningful implementation work
- the user asks for planning, roadmap, milestone, or phase guidance
- the user asks what is implemented, missing, or next
- you are about to make edits that could drift from intended scope

Skip it for trivial requests that do not depend on project context.

## Workflow

1. Read `PROJECT.md` before exploring or editing.
2. Identify the relevant constraints from these sections:
   - `What It Does`
   - `Architecture Overview`
   - `Agent Roster`
   - `Frontend Spec`
   - `MVP Scope`
   - `Repo progress (snapshot)`
3. Anchor your plan or edits to the current stated scope.
4. If code and `PROJECT.md` disagree, treat that as a mismatch to call out.
5. When meaningful project decisions or implementation changes occur, consider whether `PROJECT.md` should be amended to reflect them.
6. Keep responses concise unless the user asks for depth.

## Output Guidance

- Prefer short summaries.
- Mention `PROJECT.md` expectations when they materially affect the answer.
- Flag scope drift, missing implementation, or contradictions plainly.
- Treat `PROJECT.md` as living documentation, not a fixed spec.
- When suggesting next steps, prefer the next unfinished MVP item that matches the user's request.

## Repository-Specific Notes

- The MVP is focused on LA County eviction defense.
- Agent 1 intake/classification is implemented.
- Several Wave 1 agents and most dashboard population are still incomplete.
- Stage 3 and Stage 4 are explicitly out of scope.

## Examples

User asks: "Implement the next dashboard panel."

Agent should:
- read `PROJECT.md` first
- confirm which dashboard panels are still placeholders
- implement in a way that matches the frontend spec and current MVP scope

User asks: "What's next in this repo?"

Agent should:
- read `PROJECT.md` first
- answer from the MVP checklist and repo progress snapshot
- keep the reply concise

# Mobile App TODO

This is the implementation plan for the local-first mobile app (Expo) that talks directly to the laptop‑hosted agent over LAN HTTP, per PRD.md and UX.md. The scope covers an MVP that proves the run loop: compose → stream → diff → approve → apply/push.

Link references:
- PRD: `PRD.md`
- UX workflow: `UX.md`

## Milestones

1) Foundation & Connectivity
2) Run Composer
3) Run Detail (Live)
4) Diff & Approve
5) Apply & Success
6) Settings & Diagnostics
7) Testing & QA
8) Polishing, Performance, and Docs

Each milestone has acceptance criteria to ensure end‑to‑end functionality.

---

## 1) Foundation & Connectivity

- Project setup
  - [ ] Confirm Expo SDK and React Native versions (managed workflow).
  - [ ] Add base navigation using `expo-router` (ensure `_layout.tsx` defines a root stack).
  - [ ] Create route stubs: `app/connect.tsx`, `app/run/new.tsx`, `app/run/[id].tsx`, `app/run/[id]/diff.tsx`, `app/settings.tsx`.
  - [ ] Implement global theme support (light/dark) with system detection.

- Configuration
  - [ ] Create `constants/config.ts` with persisted `agentBaseUrl` and helpers.
  - [ ] Persist/retrieve settings using `expo-secure-store` (preferred) or `AsyncStorage` fallback.
  - [ ] Add simple in‑app “Connected” indicator sourced from settings/context.

- Networking & platform quirks
  - [ ] Install and wire an SSE client compatible with React Native: `react-native-sse` (or equivalent polyfill) for `/runs/:id/stream`.
  - [ ] Implement fetch wrapper with timeouts, JSON/text handling, and error normalization.
  - [ ] Android: allow cleartext HTTP for LAN (Expo `app.json` → `android.usesCleartextTraffic: true`).
  - [ ] iOS: add helpful diagnostics for CORS/network issues; consider `NSLocalNetworkUsageDescription` if needed.

- Connect screen (per UX Stage 1)
  - [ ] UI: input for `Agent URL` with validation and helper text.
  - [ ] Action: test connection by calling `GET /` (or fallback `GET /runs/:fake/state`).
  - [ ] Store URL on success; show success toast and navigate to Run Composer.
  - [ ] Error states: unreachable, timeout, wrong port; actionable guidance.
  - [ ] “Recent agents” quick chips; delete from recents.

Acceptance criteria
- [ ] From a fresh install, user can set `http://<LAN-IP>:8080`, test, and persist connection.
- [ ] Connection test distinguishes network vs. CORS vs. 404 errors with clear messages.

---

## 2) Run Composer

- UI & validation
  - [ ] Screen: `New Run` with fields: Repo URL (required), Base Branch (default `main`), Prompt (required, multiline).
  - [ ] Advanced: Branch prefix (readonly or configurable), allow force‑push (off), labels/tags (optional).
  - [ ] Disable submit until inputs are valid. Provide inline hints and examples.

- API integration
  - [ ] POST `${BASE_URL}/runs` with `{ repoUrl, baseBranch, prompt }`.
  - [ ] On success, navigate to Run Detail with returned `{ runId }` and an initial `RUNNING` state.
  - [ ] Persist last used repo URL and base branch (not prompt).

- UX polish
  - [ ] Keyboard behavior for multiline prompt; submit button focus behavior.
  - [ ] Helpful sample prompts.

Acceptance criteria
- [ ] Valid submissions reliably create runs and transition to Run Detail.
- [ ] Errors from the agent are surfaced with clear, actionable text.

---

## 3) Run Detail (Live)

- Data model & state
  - [ ] Define `RunState` type (`RUNNING | NEEDS_APPROVAL | APPLYING | SUCCEEDED | FAILED`) and metadata.
  - [ ] Implement a run store (Context or Zustand) to hold live state and logs.

- Streaming
  - [ ] Subscribe to SSE: `GET /runs/:id/stream` using SSE client; handle `log` and `state` events.
  - [ ] Implement exponential backoff reconnect; fall back to polling `GET /runs/:id/state` every 2s when SSE fails.
  - [ ] Retain last 1,000 log lines; use a virtualized list for performance; auto‑scroll with pause.

- UI
  - [ ] Header with runId, status chip, elapsed time.
  - [ ] Timeline: Clone → Edit → Diff Ready → Await Approval → Applying → Pushed.
  - [ ] Logs panel with search, copy‑all, and clear.
  - [ ] CTA to view Diff, disabled until `NEEDS_APPROVAL` (shows files changed count when available).

- Actions
  - [ ] Cancel Run (if supported by agent; otherwise, hide or disable with tooltip).
  - [ ] Retry Connection button to force SSE reconnect.

Acceptance criteria
- [ ] Live logs stream smoothly; SSE reconnects automatically; polling fallback works.
- [ ] Status transitions drive UI (buttons enabled/disabled appropriately).

---

## 4) Diff & Approve

- Data
  - [ ] Fetch unified patch: `GET /runs/:id/diff` as `text/plain`.
  - [ ] Parse to hunks/files; compute summary (files changed, insertions, deletions).

- UI
  - [ ] File list with badges A/M/D and per‑file counts.
  - [ ] Diff viewer with unified and side‑by‑side modes; word wrap toggle; whitespace toggle; inline search.
  - [ ] Summary bar with totals and “Download .patch” / “Copy Patch”.

- Actions
  - [ ] Approve & Push → `POST /runs/:id/approve`, then navigate back to Run Detail and show `APPLYING` state.
  - [ ] Back to Logs; Retry with New Prompt (returns to Composer with previous fields filled).

- Performance
  - [ ] Virtualize long diffs; progressive render for large patches.

Acceptance criteria
- [ ] Full patch is viewable and navigable; toggles are presentation‑only (no partial apply).
- [ ] Approval triggers apply/commit/push on the agent and the UI reflects progress.

---

## 5) Apply & Success

- Applying
  - [ ] Show progress steps: Apply patch → Commit → Push, with live updates.
  - [ ] Disable destructive actions during apply; allow “Back to Logs”.

- Success
  - [ ] Show success banner with branch name, commit message, short SHA, and change summary.
  - [ ] Actions: Open on GitHub (when remote is available), Copy branch name, Start another run.
  - [ ] Persist summary locally so it survives backgrounding.

- Errors
  - [ ] Push rejected (auth/branch protection): explain and offer “Retry Push” or guidance.
  - [ ] Non‑fast‑forward: suggest rebase flow or new branch.

Acceptance criteria
- [ ] On approval success, users see clear confirmation and useful follow‑ups.
- [ ] Common push errors are explained with next steps.

---

## 6) Settings & Diagnostics

- Settings
  - [ ] Agent URL edit with “Test Connection”.
  - [ ] Preferences: default base branch, diff view mode, haptics, retain artifacts toggle.
  - [ ] About: app version/build, Agent API version, links to PRD/AGENTS/troubleshooting.

- Diagnostics
  - [ ] Ping Agent (`GET /`) with result details.
  - [ ] SSE test (`/runs/:fake/stream`) to verify connection handling without a real run.
  - [ ] LAN helper and CORS guidance per UX.

Acceptance criteria
- [ ] Users can adjust settings and run self‑diagnostics with clear outcomes.

---

## 7) Testing & QA

- Unit & integration (Jest + React Native Testing Library)
  - [ ] Validate form validation and submission logic in Composer.
  - [ ] Mock network and SSE; test reconnect/backoff and polling fallback.
  - [ ] Diff parser tests with small/large patches; edge cases (binary files, empty diff).
  - [ ] State management store behavior for typical and error flows.

- E2E
  - [ ] Add Detox or Maestro flows: Connect → New Run → Stream → Diff → Approve → Success.

- Coverage & CI
  - [ ] Target ≥80% coverage for run lifecycle paths.
  - [ ] Add `npm test` script; optional `npm run test:watch`.

Acceptance criteria
- [ ] Core screens and run lifecycle have automated tests and stable E2E flow.

---

## 8) Polishing, Performance, and Docs

- Performance
  - [ ] Virtualize logs and diff lists; avoid unnecessary re‑renders.
  - [ ] Debounce expensive operations (search, filtering).
  - [ ] Optimize bundle size; lazy‑load diff viewer.

- Accessibility & UX
  - [ ] Respect reduced motion; ensure contrast and tap sizes.
  - [ ] Keyboard shortcuts in diff viewer where supported.
  - [ ] Haptic feedback on key events (connect, approve, success/error).

- Developer experience
  - [ ] Add scripts: `dev:mobile`, `lint`, `format`, `typecheck`.
  - [ ] Prettier/ESLint configs (if not already present); keep 2‑space indent, semicolons, single quotes.

- Documentation
  - [ ] Update `README` or `docs/` with a quickstart for local agent + mobile pairing.
  - [ ] Add an ADR in `docs/` for “Local networking approach (HTTP over LAN, SSE choice)”.
  - [ ] Troubleshooting guide: same‑LAN, firewalls, Android cleartext, CORS, SSE timeouts.

Acceptance criteria
- [ ] Smooth UX at 60fps for long logs/diffs; clear docs for setup and troubleshooting.

---

## Cross‑Cutting Technical Tasks

- API client
  - [ ] `api/runs.ts`: `createRun`, `getRunState`, `streamRun`, `getRunDiff`, `approveRun`.
  - [ ] Common error type with `status`, `message`, `hint`.

- SSE hook
  - [ ] `hooks/useRunStream(runId)` returning `{ state, logs, error, reconnect }`.

- Diff parsing
  - [ ] Lightweight unified‑diff parser (or use a small dependency) producing files → hunks → lines.
  - [ ] Compute totals (files changed, insertions, deletions).

- Storage
  - [ ] `storage/settings.ts` for agent URL, preferences, recents.

- Types
  - [ ] Shared `types/run.ts` for run statuses and payloads.

---

## Platform/Config Checklist

- [ ] Expo `app.json`: set `android.usesCleartextTraffic: true` for LAN HTTP.
- [ ] Consider `NSLocalNetworkUsageDescription` (iOS) if system prompts appear when discovering devices.
- [ ] Ensure agent enables CORS (see PRD agent code uses `cors()`).

---

## Risks & Mitigations

- SSE reliability on mobile
  - Mitigate with robust reconnect and polling fallback; keep timeboxed backoff.
- CORS and firewalls
  - Provide clear diagnostics and guidance; prefer calling agent directly and enabling `cors()`.
- Large diffs and long logs
  - Virtualize and progressively render; cap retained lines and expose download options.

---

## Open Questions

- Do we allow editing the commit message, or keep it fixed (`codex: change`) for MVP?
- Should we support canceling a run from mobile, and will the agent expose `/runs/:id/cancel`?
- Do we need a thin “backend stub” or strictly direct‑to‑agent calls for MVP?

---

## Acceptance: End‑to‑End Demo Script

- [ ] Start agent on laptop: `node agent.js`, confirm `http://<LAN-IP>:8080` reachable.
- [ ] On mobile: Connect screen → set URL and connect.
- [ ] New Run: enter repo URL, base branch, and prompt → Start Run.
- [ ] Run Detail: see live logs and status progress to `NEEDS_APPROVAL`.
- [ ] Diff & Approve: view patch, approve & push.
- [ ] Apply & Success: see success summary; open GitHub link; start another run.


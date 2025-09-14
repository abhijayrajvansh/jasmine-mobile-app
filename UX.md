# UX Workflow

## Stage 1 — Connect to Local Agent
- Goal: Let the user point the app to the laptop-hosted agent and verify connectivity.

- Entry: First app open or when no agent URL is stored.

- UI
  - Screen title: "Connect to Local Agent"
  - Field: "Agent URL" with placeholder `http://<LAN-IP>:8080`
  - Helper text: "Your laptop’s LAN IP. Port must be 8080."
  - Buttons:
    - Primary: "Connect"
    - Secondary: "How to find my IP"
  - Optional: "Recent" chips showing previously used URLs.

- Guidance (modal)
  - iOS/macOS: "Open Wi‑Fi details or run ifconfig. Copy IPv4 address."
  - Windows: "Run ipconfig. Use IPv4 ‘192.168.x.x’ or ‘10.x.x.x’."
  - Example: `http://192.168.1.10:8080`

- Validation
  - Client-side: URL format, protocol http, numeric port; warn if https chosen.
  - Connectivity check: GET `/` expecting 200 and body containing "Agent".
  - Timeout: 3s; auto-retry once.
  - Store on success in secure local storage.

- States
  - Idle: Connect disabled until a valid URL is typed.
  - Connecting: Spinner on button; field disabled.
  - Connected: Success toast "Connected to Agent on <IP>".
  - Error: Inline error with actionable tips.

- Error Handling
  - Unreachable/timeout: "Couldn’t reach the agent. Ensure your phone and laptop are on the same Wi‑Fi and the agent is running: node agent.js"
  - CORS blocked: "Agent CORS not enabled. Start agent with CORS allowed for your device."
  - Wrong port: Suggest 8080.
  - Different network: "Check that both devices share the same LAN."

- Persistence & Controls
  - Save URL in storage; show it in app header with a "Connected" indicator.
  - Settings lets users edit URL, clear recent agents, and re-run connectivity test.

- Accessibility & UX polish
  - Large tap targets, URL auto-focus, paste detection, and clear error contrast.
  - Haptic feedback on success/error.

## Stage 2 — Run Composer
- Goal: Collect inputs to start a coding run on the local agent and navigate to live details.

- Entry: From Connected state (header shows Agent URL) or via “New Run” button.

- UI
  - Screen title: "New Run"
  - Fields:
    - Repo URL (required) — placeholder `https://github.com/user/repo.git`
    - Base Branch (default `main`)
    - Prompt (multiline, required) — guidance text “Describe the change you want. Be specific.”
  - Advanced (collapsible):
    - Branch prefix (default `codex/run-`)
    - Allow force-push (off by default; info tooltip)
    - Labels/Tags input (for tracking, optional)
  - Buttons:
    - Primary: "Start Run"
    - Secondary: "Cancel"

- Validation
  - Repo URL must be `https://` or `ssh://` git URL.
  - Base Branch non-empty; warn if contains spaces.
  - Prompt min length (e.g., 10 chars) to avoid empty runs.
  - Disable Start until all required fields valid.

- Submission
  - Action: `POST /runs` to the agent with `{ repoUrl, baseBranch, prompt }`.
  - On success: receive `{ runId }`, navigate to Run Detail with status `RUNNING`.
  - Persist last-used values (except prompt) for convenience.

- States
  - Idle: form editable, Start disabled until valid.
  - Submitting: spinner on Start; form disabled to prevent duplicate posts.
  - Success: route change to Run Detail and toast “Run started”.
  - Error: inline error block with details from agent.

- Error Handling
  - Unreachable agent: show “Cannot connect to agent” with retry and link to Connection screen.
  - Git auth failure: suggest setting deploy key/token on the repo or using SSH URL.
  - Invalid branch: suggest verifying the base branch name; allow quick edit and resubmit.

- UX polish
  - Prefill Base Branch with `main`; remember last non-default.
  - Prompt helper examples (e.g., “Add Jest and a sample test to api/”).
  - Keyboard: multiline for Prompt, next/submit actions on fields.

## Stage 3 — Run Detail (Live)
- Goal: Monitor the run lifecycle in real time, view logs, and proceed to diff review when ready.

- Entry: Navigated after a successful Run Composer submission with `{ runId }`.

- UI
  - Header: Run ID, branch (e.g., `codex/run-<id>` when assigned), status chip (RUNNING, NEEDS_APPROVAL, APPLYING, SUCCEEDED, FAILED), and elapsed time.
  - Timeline: Steps with live state — Clone → Edit → Diff Ready → Await Approval → Applying → Pushed.
  - Live Logs: Streaming console view with auto-scroll (toggle pause), search filter, copy-all, and clear.
  - Diff Preview CTA: Disabled until `NEEDS_APPROVAL`; shows “X files changed” when diff is ready.
  - Secondary: Connection indicator with quick reconnect.

- Data & Streaming
  - Subscribe SSE: `GET /runs/:id/stream` to receive `log` and `state` events.
  - Fallback polling: `GET /runs/:id/state` every 2s if SSE disconnects.
  - Preserve last 1,000 log lines in UI with virtualized list for performance.

- Actions
  - Cancel Run (available while RUNNING) with confirm dialog.
  - Review Diff (enabled at NEEDS_APPROVAL) navigates to Stage 4.
  - Retry Connection attempts SSE reconnect with exponential backoff (up to 30s).

- States
  - RUNNING: Show active spinner, logs streaming.
  - NEEDS_APPROVAL: Highlight Diff CTA; freeze edit step as complete.
  - APPLYING: Disable Cancel; show commit/push progress.
  - SUCCEEDED: Success banner with branch + commit SHA; CTA to open repo and “Start Another Run”.
  - FAILED: Error banner with first error and “Retry with New Prompt”.

- Error Handling
  - SSE dropped: non-blocking toast + auto-retry; show “Reconnecting…” chip.
  - Run not found: offer to return to Composer.
  - Agent unreachable: link back to Connection settings.

- UX polish
  - Sticky controls row; keyboard shortcuts (find, copy) where supported.
  - Respect reduced motion; use accessible colors for status chips.

## Stage 4 — Diff & Approve
- Goal: Let the user review the complete patch, understand impact, and approve to apply/commit/push.

- Entry: From Run Detail when status = `NEEDS_APPROVAL`.

- UI
  - Header: Run ID, branch name, status chip, and total changed files/lines.
  - File List: Left panel with files, badges (A/M/D), and per-file change counts.
  - Diff Viewer: Side-by-side or unified view; options for word wrap, whitespace toggle, and inline search.
  - Summary Bar: Files changed, insertions, deletions; link to download `.patch`.
  - Actions:
    - Primary: "Approve & Push"
    - Secondary: "Back to Logs", "Retry with New Prompt"
    - Utilities: "Copy Patch", "Download Patch"
  - Optional: Commit message input (read-only if agent uses fixed message).

- Data
  - Fetch patch: `GET /runs/:id/diff` (text/plain). Parse client-side into hunks.
  - Keep original diff intact; UI toggles are presentation-only (no partial apply).

- States
  - Reviewing: Diff loaded; actions enabled.
  - Approving: After click, navigate back to Run Detail and show `APPLYING`.
  - Empty Diff: Show placeholder and allow “Retry with New Prompt”.

- Error Handling
  - Fetch failure: Retry with exponential backoff and inline error.
  - Large diff: Show “Loading large diff…” with progressive rendering.
  - Push failure after approval: surfaced in Run Detail with guidance to check credentials/branch protection.

- UX polish
  - Keyboard: `f` find, `[`/`]` navigate files, `j`/`k` navigate hunks.
  - Remember last view mode (unified/side-by-side).
  - Virtualize long diffs for smooth scrolling.

## Stage 5 — Apply & Success
- Goal: Communicate progress while applying the approved patch, then confirm success with clear next steps.

- Entry: After "Approve & Push" (Run Detail status transitions to `APPLYING`).

- UI (Applying)
  - Progress: Steps — Apply patch → Commit → Push.
  - Live updates: Inline messages (e.g., “Committing…”, “Pushing to origin”).
  - Disabled actions except “Back to Logs”.

- Success State
  - Banner: "Changes pushed successfully" with checkmark.
  - Details: Branch name (copyable), commit message, short SHA, files changed summary.
  - Actions:
    - "Open on GitHub" (if remote detected)
    - "Copy branch name"
    - "Review Diff" (read-only)
    - "Start Another Run"
  - Toast: “Pushed to <branch>” with share option.

- Post-Apply Notes
  - Cleanup: Show that temporary artifacts in `runs/<id>` were cleaned. Offer a toggle in settings to retain for debugging.
  - PR hint: If repo uses PRs, suggest opening one; optionally deep-link to create-PR URL when possible.

- Error Handling (during Apply)
  - Push rejected (auth): Explain token/SSH setup; link to docs. Button: “Retry Push”.
  - Branch protection: Suggest creating a new branch or opening a PR instead.
  - Non-fast-forward: Offer “Rebase on base branch and retry” or return to Composer.
  - Generic failure: Surface first error line and provide copy-to-clipboard for logs.

- UX polish
  - Haptic success/error feedback.
  - Respect reduced motion; minimal animations during progress.
  - Persist success summary locally so it’s visible if the app is backgrounded.

## Stage 6 — Settings & Diagnostics
- Goal: Manage agent connectivity, app preferences, and run basic diagnostics.

- Sections
  - Agent
    - Agent URL: editable field with "Test Connection" button.
    - Status badge: Connected / Disconnected (last checked timestamp).
    - Recent Agents: chips list with swipe-to-delete.
  - Diagnostics
    - Ping Agent: `GET /` → success/fail.
    - SSE Test: subscribe to `/runs/:fake/stream` and verify connection handling.
    - LAN Helper: instructions to find IP (ifconfig/ipconfig) + copyable examples.
    - CORS Indicator: explains enabling CORS on the agent if blocked.
  - Preferences
    - Retain run artifacts (`runs/<id>`) after success: toggle (off by default).
    - Default Base Branch: text input (default `main`).
    - Diff View Mode: unified / side-by-side.
    - Haptics: on/off.
  - About
    - App version/build, Agent API version (fetched), commit hash (if available).
    - Links: PRD, AGENTS.md, and troubleshooting.

- Actions
  - Save changes: persists immediately with confirmation toast.
  - Clear cached data: removes stored URL, recents, and preferences (confirmation dialog).
  - Export logs: bundle recent run logs to a share sheet.

- Error Handling
  - Invalid URL: inline error and disable Test/Save.
  - Test failures: show response code/body snippet and next steps (firewall, same Wi‑Fi, agent running).
  - Permissions (share/export): graceful fallback and guidance.

- UX polish
  - Surface current Agent URL in app header with quick-switch menu.
  - Non-destructive previews of preference changes (e.g., diff mode switch applies immediately in preview panel).

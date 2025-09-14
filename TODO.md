# Mobile App TODO — Remote Terminal

Implementation plan for the mobile app that connects to a computer over LAN and provides a fully interactive remote terminal, per UX.md. Focus: capture host credentials, establish an SSH PTY session, and deliver a first-class terminal experience on mobile.

Link references:
- PRD: `PRD.md`
- UX workflow: `UX.md`

## Milestones

1) Foundation & Welcome
2) Connect to Computer
3) Session Establishment (SSH + PTY)
4) Terminal Screen & Interactions
5) Command Execution Parity
6) Disconnect & Persistence
7) Settings & Diagnostics
8) Testing & QA
9) Performance, Accessibility & Docs

Each milestone has clear acceptance criteria.

---

## 1) Foundation & Welcome

- Project setup
  - [x] Confirm Expo SDK and React Native versions (managed workflow).
  - [x] Base navigation with `expo-router` (root stack in `_layout.tsx`).
  - [x] Route stubs: `app/index.tsx` (Welcome), `app/connect.tsx`, `app/terminal` (connect), `app/settings.tsx`.
  - [x] Global light/dark theme with system detection.

- Storage & context
  - [x] App context for session and saved hosts list.
  - [x] Secure storage for secrets using `expo-secure-store`; fall back to `AsyncStorage` for non-secrets.

- Welcome screen (UX Stage 1)
  - [x] CTA: "Connect to Computer"; list "Saved Hosts" with quick connect and delete.
  - [x] Help link: "How to find my IP" modal.

Acceptance criteria
- [x] App launches to Welcome; Saved Hosts visible when present; navigation works.

---

## 2) Connect to Computer

- UI & validation (UX Stage 2)
  - [ ] Fields: Host/IP, Port (default 22), Username, Password; optional Alias; Save toggle.
  - [ ] Validate IPv4/IPv6/hostname; port 1–65535; non-empty user/password.
  - [ ] Unknown host key prompt flow (fingerprint confirm) placeholder.

- Security & storage
  - [ ] Never log the password; mask input with reveal toggle.
  - [ ] Save alias/host/port/username and host key fingerprint when trusted.
  - [ ] Optionally save password in secure store if user opts in.

- Connect action
  - [ ] Show progress state with timeout (e.g., 8s).
  - [ ] On success, navigate to Terminal screen.
  - [ ] On failure, surface specific errors: unreachable, auth failed, port closed, host key mismatch.

Acceptance criteria
- [ ] Valid inputs enable Connect; success transitions to Terminal; errors are actionable.

---

## 3) Session Establishment (SSH + PTY)

- Transport options (select one for MVP; keep others as fallback plans)
  - [ ] A) Native SSH library for React Native (evaluate `react-native-ssh-sftp` or maintained alternatives) to open SSH with password auth and request PTY.
  - [ ] B) WebView + xterm.js + WebSocket bridge hosted on the target computer (dev-only helper) that proxies to a PTY (e.g., Node `ssh2` or local shell). Requires user to run a helper on the host during MVP.
  - [ ] C) WASM-based SSH client rendered in WebView (evaluate feasibility/perf).

- PTY/session
  - [ ] On connect, request PTY (`xterm-256color`) sized to device; send resize events.
  - [ ] Keep-alive pings and reconnect strategy on transient loss.

Acceptance criteria
- [ ] Session opens a shell ready for input; terminal screen receives bytes and renders output.

---

## 4) Terminal Screen & Interactions

- Rendering
  - [ ] Use `react-native-webview` to embed xterm.js with ANSI support, or a native RN terminal component if available and mature.
  - [ ] Scrollback buffer with virtualization (target 5–10k lines).

- Controls
  - [ ] On-screen accessory keys: Esc, Ctrl (latch), Tab, arrows, `|`, `~`, `/`, `\\`, `:`.
  - [ ] Copy/paste with confirmation for multiline pastes.
  - [ ] Tabs: new tab, rename, switch, close (confirm when job running).

- UI polish
  - [ ] Header: `<alias|username@host>` with status chip and latency indicator.
  - [ ] Theme presets (Light/Dark/Solarized/Monokai); font size slider.
  - [ ] Haptics for connect/disconnect/error; blinking cursor option.

Acceptance criteria
- [ ] Users can type commands, see output with correct colors, scroll history, and manage tabs.

---

## 5) Command Execution Parity

- Behavior
  - [ ] Raw keystroke streaming; support interactive apps (vim, top, htop, nano, ssh nesting).
  - [ ] Render bold/underline, cursor movements, and alternate screen buffers.
  - [ ] Backpressure handling to prevent UI jank on large outputs.

- Utilities
  - [ ] Clear screen (`Ctrl+L`) shortcut; copy visible buffer; share as `.txt`.
  - [ ] Quick commands drawer (user-defined snippets).

Acceptance criteria
- [ ] Interactive TUI apps behave correctly; large outputs remain responsive.

---

## 6) Disconnect & Persistence

- Disconnect flow
  - [ ] Disconnect button; confirm when foreground jobs detected.
  - [ ] Gracefully close session; preserve terminal buffer until tab closed.

- Persistence
  - [ ] Saved Hosts model: alias, host, port, username, host key, prefs.
  - [ ] Recent sessions list with timestamps; one-tap reconnect.

Acceptance criteria
- [ ] Users can disconnect/reconnect easily; saved hosts persist securely.

---

## 7) Settings & Diagnostics

- Preferences
  - [ ] Default port, theme, font size, bell, haptics, paste confirmation, scrollback size.
  - [ ] Keep-alive interval; auto-reconnect toggle.

- Security
  - [ ] Biometric lock for opening Saved Hosts that store credentials.
  - [ ] Manage known hosts: list and remove stored fingerprints.

- Diagnostics
  - [ ] LAN helper: instructions for macOS/Windows/Linux to find IP.
  - [ ] Ping test and port check for `host:port`.
  - [ ] Show last error details; copy-to-clipboard.

Acceptance criteria
- [ ] Users can adjust preferences and troubleshoot connection issues effectively.

---

## 8) Testing & QA

- Unit & integration (Jest + RNTL)
  - [ ] Form validation and connection flows (mock transport).
  - [ ] Terminal event pipeline: input → transport → render (mock terminal layer).
  - [ ] Resize events, tabs management, and scrollback limits.

- E2E
  - [ ] Detox/Maestro: Welcome → Connect → Terminal → Run commands → Disconnect → Reconnect.

- Coverage & CI
  - [ ] ≥80% coverage on connection, session, and terminal interactions.
  - [ ] `npm test` script; optional watch mode.

Acceptance criteria
- [ ] Stable automated coverage across connect, session, and terminal usage.

---

## 9) Performance, Accessibility & Docs

- Performance
  - [ ] Virtualize terminal output; throttle rendering on floods.
  - [ ] Avoid unnecessary re-renders; memoize heavy components.

- Accessibility & UX
  - [ ] Large text support; VoiceOver/TalkBack labels for keys and terminal.
  - [ ] High-contrast themes; respect reduce motion.

- Developer Experience
  - [ ] Scripts: `type-check`, `lint`, `format` (if configured).
  - [ ] Keep 2-space indent, semicolons, single quotes.

- Documentation
  - [ ] Update `README`/`docs/` with Remote Terminal quickstart.
  - [ ] ADR: “Terminal rendering approach (WebView + xterm.js vs native)”.
  - [ ] Troubleshooting: IP/port, firewalls, host key mismatch, timeouts.

Acceptance criteria
- [ ] Smooth 60fps during typical output; clear docs for setup and troubleshooting.

---

## Cross‑Cutting Technical Tasks

- Terminal layer
  - [ ] Embed xterm.js in `react-native-webview` with a message bridge for keystrokes and output.
  - [ ] Map mobile keyboard events to terminal input; implement accessory keys.

- Transport layer
  - [ ] Implement chosen SSH transport (native/WASM/bridge) with APIs: `connect`, `write`, `resize`, `disconnect`.
  - [ ] Common error model: `{ code, message, hint }`.

- Storage
  - [ ] `storage/hosts.ts` for saved hosts and known hosts; `storage/prefs.ts` for preferences.

- Types
  - [ ] `types/terminal.ts` for session state, tab model, and events.

---

## Platform/Config Checklist

- [ ] iOS: `NSLocalNetworkUsageDescription` in `app.json` if required.
- [ ] Android: network permissions; keyboard handling for hardware keyboards.
- [ ] Verify `react-native-webview` settings for keyboardDisplayRequiresUserAction and mixed content if using bridge.

---

## Risks & Mitigations

- SSH client availability on RN
  - Mitigate by evaluating native libs first; fallback to WebView + host-side bridge for MVP.
- Large terminal throughput
  - Virtualize, batch renders, and implement backpressure.
- Security of stored secrets
  - Use secure storage with biometric gating; never log secrets.

---

## Open Questions

- Which SSH transport path do we choose for MVP (A/B/C)?
- Do we support key-based auth in MVP or add in Phase 2?
- Do we support multiple concurrent tabs per host initially?

---

## Acceptance: End‑to‑End Demo Script

- [ ] Launch app → Welcome → "Connect to Computer".
- [ ] Enter host/IP, port 22, username, password → Connect.
- [ ] Terminal appears; run `uname -a`, `top`, open `vim`, etc.
- [ ] Open new tab; run commands; switch tabs.
- [ ] Disconnect and reconnect from Saved Hosts.

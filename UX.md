# UX Workflow — Remote Terminal

This document defines the end-to-end mobile user experience for connecting to a local computer over LAN and running terminal commands remotely from the phone.

High-level flow
- Launch app
- Enter host details (IP, port, username, password)
- Connect and authenticate to the computer
- Open an in-app terminal screen
- Interact with the remote shell (full command support)

## Stage 1 — Launch & Welcome
- Goal: Provide clear entry into “Connect to Computer”.

- Entry: First app open or when no saved hosts exist.

- UI
  - Screen title: "Remote Terminal"
  - Primary CTA: "Connect to Computer"
  - Secondary: "How to find my IP" link
  - Optional: list of "Saved Hosts" with quick connect

- Guidance (modal)
  - iOS/macOS: Open Wi‑Fi details or run `ifconfig` to find IPv4
  - Windows: Run `ipconfig` and use IPv4 address
  - Typical LAN ranges: `192.168.x.x`, `10.x.x.x`, `172.16–31.x.x`

- UX polish
  - Large hit targets; haptic feedback on actions
  - Auto-dark mode; high contrast text

## Stage 2 — Connect to Computer
- Goal: Capture host and credentials; validate and attempt connection.

- UI
  - Title: "Connect to Computer"
  - Fields
    - Host/IP (required) — placeholder `192.168.1.23`
    - Port (required, default `22`) — numeric only
    - Username (required) — placeholder `username`
    - Password (required) — secure input with reveal toggle
  - Options
    - Save to "Saved Hosts" (toggle on by default)
    - Host alias/name (optional) — for display in lists
  - Buttons
    - Primary: "Connect"
    - Secondary: "Cancel"

- Validation
  - Host: valid IPv4/IPv6 or mDNS/hostname
  - Port: 1–65535 (default to 22)
  - Username: non-empty; disallow spaces at ends
  - Password: non-empty; optionally show caps-lock indicator

- Connection
  - Action: Initiate secure session to `host:port` with username/password
  - Transport: SSH recommended; support password-based auth initially
  - Handshake timeout: 8s; show progress indicator
  - Host key prompt: If unknown host, show fingerprint prompt with "Trust & Continue" or "Cancel"

- States
  - Idle: Connect disabled until valid inputs
  - Connecting: Spinner on button; fields disabled
  - Auth Failed: Inline error and shake password field; keep values
  - Connected: Success toast "Connected to <alias|host>"

- Error Handling
  - Host unreachable/timeout: "Couldn’t reach host. Ensure same Wi‑Fi and host is online"
  - Wrong credentials: "Authentication failed. Check username or password"
  - Permission denied (too many attempts): Cooldown 10s and suggest reset
  - Port closed/firewall: "Port <port> is closed. Try 22 or adjust firewall"
  - Host key mismatch: Warn about changed keys; require explicit confirmation

- Security
  - Store credentials securely via platform secure storage; never log password
  - Store host key fingerprint on first trust
  - Offer biometric unlock before auto-connecting to saved hosts (optional)

## Stage 3 — Establish Session
- Goal: Open a remote shell ready for user input.

- Behavior
  - On successful auth, request a PTY with sensible defaults (xterm-256color)
  - Set initial rows/cols based on device; support later resize events
  - Start default login shell for the user

- UI (Transition)
  - Show brief loading state "Preparing terminal…"
  - Navigate to Terminal screen when PTY is active

- Failure Recovery
  - If PTY denied, fall back to non-PTY shell with limited features (warn user)
  - If session closes immediately, show last stderr and a "Retry" action

## Stage 4 — Terminal Screen
- Goal: Provide a fully interactive terminal to run any command.

- Layout
  - Header: `<alias|username@host>` + connection status chip + latency indicator
  - Terminal viewport: ANSI-capable renderer with scrollback buffer
  - Accessory bar: extra keys — `Esc`, `Ctrl`, `Tab`, arrow keys, `|`, `~`, `/`, `\`, `:`
  - Footer actions: Settings, Share log, New tab, Disconnect

- Interactions
  - Tap to focus and open keyboard
  - Swipe up/down to scroll history; show scroll-to-bottom affordance
  - Long-press to select/copy text; double-tap word selection
  - Paste from clipboard with confirm prompt for multiline pastes

- Keyboard & Shortcuts
  - Support modifier combos: `Ctrl+C`, `Ctrl+Z`, `Ctrl+A/E/K/U`, `Tab`, `Esc`
  - Provide on-screen `Ctrl` latch for quick chords
  - Optional hardware keyboard mappings on iPad/Android

- Session Controls
  - New Tab: opens another shell session to same host
  - Tabs list: switch, rename, close with confirmation if running foreground job
  - Resize: adapt columns/rows on orientation or viewport change
  - Keep-alive: send periodic keep-alive pings; show reconnect attempts on network blips

- Visuals
  - Themes: Light/Dark + Solarized/Monokai presets
  - Font size slider; monospace font
  - Blink cursor, bell notification haptics (toggle)

- Limits
  - Large output handling with virtualization; cap scrollback (e.g., 5–10k lines)
  - Stream backpressure to avoid UI jank

- Errors In-Session
  - Connection lost: banner with auto-retry and manual "Reconnect"; preserve buffer
  - Permission denied on command: show stderr only (no special app error)
  - Host closed: toast with reason; allow "Reconnect" or "Close"

## Stage 5 — Command Execution Flow
- Goal: Ensure commands behave like a native terminal.

- Input/Output
  - Send keystrokes as raw stream to PTY
  - Render ANSI colors, bold, underline, and cursor addressing
  - Support interactive apps (vim, top, htop, nano, ssh to another host)

- Safety
  - No destructive-command warnings by default; respect user control
  - Optional setting: confirm on `rm -rf /*`-like patterns (advanced)

- Utilities
  - Clear screen action sends `Ctrl+L`
  - Copy visible buffer; Share as `.txt` from current tab
  - Quick commands drawer (customizable snippets)

## Stage 6 — Disconnect & Session Management
- Goal: Provide clear lifecycle and persistence.

- Disconnect
  - Action in header/footer; confirm if background jobs detected
  - Close session gracefully (send exit) and then terminate channel

- Persistence
  - Saved Hosts: store alias, host, port, username, host key, and preference flags
  - Do not persist passwords unless user opted to save securely
  - Recent Sessions: last 5 connections with timestamps

- Reconnect
  - One-tap reconnect from Saved Hosts
  - Optional auto-reconnect on transient network loss (up to 30s)

## Settings & Diagnostics
- Goal: Manage preferences and troubleshoot connections.

- Preferences
  - Default port (22), theme, font size, bell, haptics
  - Paste confirmation for multiline; scrollback size
  - Keep-alive interval; auto-reconnect toggle

- Security
  - Biometric lock for opening Saved Hosts with stored credentials
  - Manage known hosts: view/remove stored fingerprints
  - Import SSH key (future): keychain-backed, passphrase protected

- Diagnostics
  - LAN helper: how to find IP on macOS/Windows/Linux
  - Ping test and port check to `host:port`
  - Show last error with copy-to-clipboard

## Empty States & Edge Cases
- No Saved Hosts: promote "Connect to Computer"
- Captive portal Wi‑Fi: detect limited connectivity, advise switching networks
- IPv6-only networks: validate and display proper examples
- Backgrounding app: pause rendering; keep session alive if allowed by OS

## Analytics & Telemetry (local only)
- Local-only counters for session success/failure and reconnects; no sensitive data stored or sent

## Accessibility
- Large text support, VoiceOver/TalkBack labels for keys and terminal
- High contrast themes; color-blind friendly palettes
- Reduce motion setting respected

## Security Notes
- Never log credentials or command input/output outside the terminal buffer
- Use secure storage APIs for any saved secrets; wipe on logout if requested
- Warn on connecting over cellular if enabled (optional)

# ADR-001: Direct SSH From Mobile App (No Agent)

Date: 2025-09-14

## Status
Accepted

## Context
Initial MVP depended on a local Node.js agent exposing a WebSocket bridge for the terminal. Requirement shifted: the app must connect directly to a computer on the same LAN via SSH (username/password), without any agent.

## Decision
Introduce a native SSH abstraction in the app and a Direct SSH terminal screen.

- Abstraction: `RNNativeSsh` native module (iOS/Android), wrapped by `lib/nativeSsh.ts`.
- UI: `app/terminal/native-session.tsx` reuses an in-app xterm.js (WebView) terminal and bridges keystrokes/stdout between WebView and the native SSH session.
- Fallback: existing WebSocket bridge flow remains available (`app/terminal/session.tsx`).

## Native Module Contract
Implement a native module named `RNNativeSsh` with the following API:

Methods
- `isAvailable(): boolean`
- `connect({ host, port?: number, username, password }): string` → returns `sessionId`
- `write(sessionId: string, data: string): void`
- `close(sessionId: string): void`

Events (DeviceEventEmitter / NativeEventEmitter)
- `ssh-data` → `{ sessionId, data }`
- `ssh-exit` → `{ sessionId, code? }`
- `ssh-error` → `{ sessionId, message }`

This can be backed by libssh2 or a platform SSH client. The app does not ship protocol code in JS.

## Security Notes
- Prefer key-based auth in the future; password auth supported for MVP.
- Do not store credentials in plaintext. Consider using `expo-secure-store` for saved hosts.
- SSH host key verification is recommended; MVP may skip but should warn.

## Migration / Build
- Managed Expo preview (web) cannot run direct SSH; use native dev client or release build to test.
- Keep the legacy “bridge” flow for development or environments without the native module.

## Alternatives Considered
- JS-only SSH over raw TCP: impractical due to crypto/Net dependencies and complexity.
- WebSocket proxy (agent): works but violates the no-agent constraint.


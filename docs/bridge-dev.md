Remote Terminal WebSocket Bridge (Dev Helper)

Use this helper during development when Direct SSH isn’t available (Expo Go or no native SSH module). It bridges a WebSocket from the phone to an SSH session on your computer.

Setup
- Install deps in the repo root:
  - npm i -D ws ssh2
- Start the bridge on your laptop (same LAN as phone):
  - npm run bridge:ssh
  - It listens on http://0.0.0.0:8080/ws/ssh by default.

Mobile app usage
- In the “SSH Terminal” screen, turn OFF “Use Direct SSH”.
- Enter your laptop’s LAN IP as the Host (if you want to SSH into the laptop itself), or any reachable SSH host.
- Set Bridge WebSocket URL to ws://<LAPTOP-LAN-IP>:8080/ws/ssh
- Connect. The app will send keystrokes to the bridge, which proxies to SSH and returns output.

Notes
- The bridge uses password auth. For keys or host key verification, extend scripts/ws-ssh-bridge.js.
- You can change PORT or PATHNAME via env vars: PORT=9090 PATHNAME=/ws/ssh-dev npm run bridge:ssh
- Security: Only run this on a trusted LAN; the bridge has no auth of its own.


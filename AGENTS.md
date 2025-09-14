# Repository Guidelines

## Project Structure & Module Organization
- `prd.md` documents the local MVP plan (mobile → local agent).
- `agent.js` (Node.js) serves the local agent HTTP API.
- `runs/` holds per-run working directories and temp diffs (gitignored).
- `scripts/` contains dev helpers (e.g., `dev.sh`, release utilities).
- `docs/` stores architecture notes and runbooks; add new ADRs here.
- Optional: `mobile/` for the Expo app; `config/` with `.env.example`.
- 
## Project Structure & Module Organization
- `app/`: Expo Router screens and layouts (e.g., `app/index.tsx`, `_layout.tsx`).
- `components/`: Reusable UI components (PascalCase filenames).
- `hooks/`: Custom hooks (prefix with `use`, TypeScript).
- `constants/`: App constants and config.
- `assets/`: Images and static files.
- `docs/`: Project docs (e.g., `docs/TODO.md`).
- TypeScript path alias: import via `@/*` (see `tsconfig.json`).

## Golden Rules
- Always use `npm` for package and script commands.
- Never start the server locally (it already runs on 8081).
- Do not start any simulator/emulator manually for ios or android.
- Do not run build or lint unless explicitly requested.
- Always type‑check after any code change and fix all errors. 
- Functional patterns preferred

## Always After and Code Changes (Mandatory)
- Type check: run `npm run type-check`; resolve all errors always after any code change.
- Stage files: `git add <each_changed_file>` (no `-a`).
- Commit: `git commit -m "feat: <6–7 word summary>"` (use correct type: feat/fix/docs/style/refactor/perf/test).
- Push: `git push origin <CURRENT_BRANCH_NAME>` (push to the current branch on origin after every successful agent completion).

## Coding Style & Naming Conventions
- Language: TypeScript with `strict: true`.
- Indentation: 2 spaces; use semicolons; single quotes preferred.
- Components: PascalCase files and exports (e.g., `Button.tsx`).
- Hooks: camelCase files, exported as `useX` (e.g., `useAuth.ts`).
- Routes (Expo Router): screen files under `app/` map to paths (e.g., `app/profile.tsx` → `/profile`).
- Linting: follow `eslint.config.js` (based on `eslint-config-expo`). Fix issues with `npm run lint`.

## Development Constraints
#### Do Not
- Execute dev server locally.
- Build the project or run lint unless explicitly requested.
- Ask to “continue to iterate” — always provide complete solutions.

#### Please check for errors, fix them and push your changes to github.
- Run `npm run type-check` after changes and resolve errors.
- If there are type errors, fix them before proceeding.
- After fixing errors, stage files with `git add <file>`.
- Commit with a proper message using the Conventional Commits format.
- Push: `git push origin <CURRENT_BRANCH_NAME>` (push to the current branch on origin after every successful agent completion).
- Follow the Git workflow below for staging, commit and push.

## Testing Guidelines
- No test setup present yet. Recommended: Jest + React Native Testing Library.
- Place tests alongside files or in `__tests__/` with `*.test.ts(x)` naming.
- Aim for meaningful coverage of hooks and components; mock native modules.

## Commit & Pull Request Guidelines
- Current history uses freeform messages (e.g., `update: ...`). Prefer Conventional Commits:
  - `feat:`, `fix:`, `chore:`, `docs:`, `refactor:`, `test:`.
  - Example: `feat(auth): add login screen route`.
- PRs: include clear description, linked issues, screenshots/GIFs for UI, and platform notes (iOS/Android/Web). Ensure `npm run doctor` passes.

## Security & Configuration Tips
- Do not commit secrets. Use `EXPO_PUBLIC_*` for public env and secure values via your CI/store.
- Keep `app.json` minimal; prefer runtime config where possible.

## Tech Stack
- Mobile: Expo app calling the agent directly over LAN HTTP.
- Agent: Node.js (Express, cors, simple-git, child_process), SSE for streaming.
- No separate backend layer; keep all endpoints in the local agent.

## Build, Test, and Development Commands
- Prereqs: Node 18+ and Git installed.
- Install deps (when `package.json` exists): `npm i`
- Quick start the agent: `node agent.js` (binds to `0.0.0.0:8080`).
- Example calls:
  - Create run: `curl -X POST http://<LAN-IP>:8080/runs -H 'Content-Type: application/json' -d '{"repoUrl":"<git url>","baseBranch":"main","prompt":"..."}'`
  - Stream: `curl http://<LAN-IP>:8080/runs/<id>/stream`
  - Diff: `curl http://<LAN-IP>:8080/runs/<id>/diff`
  - Approve: `curl -X POST http://<LAN-IP>:8080/runs/<id>/approve`
- Lint/format (if configured): `npm run lint`, `npm run format`.

## Coding Style & Naming Conventions
- JavaScript/Node: 2-space indent, semicolons on, single quotes.
- Files: `kebab-case` for scripts; classes in `PascalCase`; functions/vars in `camelCase`.
- Use Prettier and ESLint (recommended). Place configs at repo root.
- Keep modules small and focused; factor I/O (git/exec) behind helpers for testability.

## Testing Guidelines
- Framework: Jest (recommended). Tests live in `tests/` mirroring source.
- Naming: `*.spec.js` or `*.test.js`.
- Mock `child_process`, filesystem, and network. Verify endpoint states and diff output.
- Target ≥80% coverage for agent routes and run lifecycle.
- Commands: `npm test` (and `npm run test:watch` if configured).

## Git Workflow
#### Use this standard while git committing and git push
- Use git CLI only; never use `git commit -a`.
- Stage explicitly: `git add <file>`.
- Message format by type:
  - `feat:` new features
  - `fix:` bug fixes
  - `docs:` documentation
  - `style:` formatting only
  - `refactor:` non‑feature/non‑fix changes
  - `perf:` performance improvements
  - `test:` tests
- Keep summary ~6–7 words.
- After commit: `git push`.

Branches

- `main`: Main development branch
- `dev`: Development branch
- `phase-2/development`: Current phase implementation branch

## Pull Request Guidelines (On Request Only)
### When asked to raise a pull request:
- Always build the project first using `bun run build`.
- Ensure all errors are resolved.
- Create PR from current branch to `dev` branch.
- Use a structured PR description; refer to `.github/pull-requrest-standard-template.md` for the template.
- Read the current branch commits and ensure the PR description is short, clear, and concise.


## Security & Configuration Tips
- Do not commit secrets. Provide `.env.example` with `PORT`, `ALLOW_ORIGINS`, and Git credentials guidance.
- Agent binds to LAN; restrict with firewall and strict CORS. Avoid exposing beyond your network.
- Use deploy keys or tokens for push; never hardcode credentials.

## Agent-Specific Instructions
- Run flow matches `prd.md`: create run → edit → diff → approve → commit/push.
- Store ephemeral logs/diffs only under `runs/<id>`; clean up on success.
- Commit message on approval: `codex: change` (or a specific summary when available).
- Prefer minimal, surgical edits; always update docs/tests with behavior changes.

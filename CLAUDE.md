# CLAUDE.md

## Project

Ant Design Pro — React enterprise boilerplate on Umi Max v4, antd v6, ProComponents v3.

## Commands

`npm start` (no mock), `npm run dev` (no mock), `npm run build` (utoopack), `npm run lint` (Biome+tsc), `npm run test` (Vitest), `npx antd lint ./src` (antd-specific checks).

Other: `npm run openapi` (regenerate `src/services/jushu-api/` from `openapi/jushu-api.json`), `npm run openapi:legacy` (regenerate upstream template APIs from `config/oneapi.json`), `npm run simple` (**irreversible** — commit first), `npm run biome` (auto-fix), `npm run tsc` (type-check only).

## Critical Rules

- **Never hand-edit generated API code** — `src/services/jushu-api/` uses `npm run openapi`; `src/services/ant-design-pro/` uses `npm run openapi:legacy`
- **Biome only** — no ESLint, no Prettier. Both `npm run lint` and `npx antd lint ./src` must pass before commit
- **Always `npx antd info <Component>` before writing antd code** — don't guess APIs from memory
- **`npm run simple` is irreversible** — always commit/branch first
- **Conventional commits** required (commitlint enforced)
- **TypeScript strict** · **Node ≥ 22** · **`package-lock.json`** (not yarn/pnpm)
- **`.umi` dir is auto-generated** — delete `src/.umi` and restart if dev server acts up

## Architecture Essentials

**Config**: `config/config.ts` (defineConfig), `config/routes.ts` (declarative routes). Route `name` → `menu.xxx` i18n key; `access` field gates visibility.

**Convention files** (`src/`): `app.tsx` (runtime config + `getInitialState`), `access.ts` (permissions), `global.tsx` (side effects), `loading.tsx`, `typings.d.ts`.

**Auth**: Login uses `loginAuthSession()`; initialization/refresh uses `loadAuthSession()` in `src/services/auth-session/`. The selected backend is `legacy` by default; `AUTH_BACKEND=xone` selects XOne. Legacy uses `POST /api/login/account` and `POST /api/currentUser/get`. XOne uses its `/web/**` login/organization APIs and normalized session metadata; it does not call the Legacy current-user endpoint. Token failures clear the session and return to login.

**Permissions**: `src/access.ts` reads the current Organization's permissions and checks `page:*` codes (or `*`); `canAdmin` checks `page:admin`. Workspace route rules and `appCodes` control Scope/application access. Frontend visibility does not replace backend authorization. See `docs/workspace-app-access.md` for current Legacy/XOne authorization boundaries.

**Development modes**: `npm start` / `npm run dev` disable Mock and proxy `/api` to the local Express server. `npm run start:xone-mock` enables XOne mock development; `npm run start:xone` requires `XONE_API_TARGET` for the real `/web` proxy. Do not assume upstream demo credentials work against the real backend.

**Server / AI**: `server/` is a separate Express/MySQL/Mastra package. Run `npm --prefix server run dev`, `npm --prefix server test`, and `npm --prefix server run typecheck`. Legacy pAI stores conversations, runs, messages and sources in MySQL; see `docs/architecture/ai/README.md`.

**State**: `useModel('@@initialState')` for authSession/currentUser/settings. Umi also supports convention-based global models; this checkout currently has no models directory. ProTable `request` prop for most data loading. `@tanstack/react-query` for complex server state.

**Styling priority**: Tailwind CSS v4 (layout) → antd-style v4 / `createStyles` (theme tokens) → CSS Modules → Less (legacy only).

**Request**: built-in `request` from `@umijs/max`, configured in `src/requestErrorConfig.ts`. Per-page `service.ts` for non-generated APIs.

**i18n**: 8 locales in `src/locales/`. `useIntl().formatMessage({ id, defaultMessage })`.

**Mock**: `mock/` (global) + `src/pages/**/_mock.ts` (co-located). Express-style handlers.

**Cloudflare Worker**: `cloudflare-worker/` — separate Hono app, own `package.json`, not an npm workspace.

## AI Skills

This project ships with two built-in Claude Code Skills (`.claude/skills/`). If you already have these skills in your project, no installation is needed — just run them directly. To update to the latest skill definitions, run `npx skills add ant-design/ant-design-pro`.

### `/pro-upgrade` — Project Upgrade

Run `/pro-upgrade` in Claude Code to auto-upgrade the project to the latest Ant Design Pro version. It diffs the latest template against this project and merges framework changes while preserving business code. Works for any version gap (v5→v6, v6.x→latest, etc.).

### `/antd` — Ant Design CLI

Run `/antd` in Claude Code for any antd-related work. It provides access to `@ant-design/cli` with offline metadata for antd v3/v4/v5/v6. Key commands:

- `npx antd info <Component>` — look up props/API before writing code (mandatory)
- `npx antd lint ./src` — check for deprecated or problematic usage (must pass before commit)
- `npx antd demo <Component> <demo>` — get working code examples
- `npx antd migrate <from> <to>` — migration checklist between major versions

## Page Co-location

Each page dir: `index.tsx`, optional `service.ts`, `_mock.ts`, `data.d.ts`, style files. Keep page-specific code with the page.

## Collaboration Guidelines

Behavioral guidelines to reduce common LLM coding mistakes. Merge with project-specific instructions as needed.

**Tradeoff:** These guidelines bias toward caution over speed. For trivial tasks, use judgment.

## 0. 仅在明确要求时才修改代码

**除非用户明确要求修改代码，否则不得改动任何代码文件。** 分析、解释、排查问题时只输出结论与建议；只有在用户下达明确的修改指令后（如"改成/加入/删除/实现"），才动手编辑代码。

## 1. Think Before Coding

**Don't assume. Don't hide confusion. Surface tradeoffs.**

Before implementing:
- State your assumptions explicitly. If uncertain, ask.
- If multiple interpretations exist, present them - don't pick silently.
- If a simpler approach exists, say so. Push back when warranted.
- If something is unclear, stop. Name what's confusing. Ask.

## 2. Simplicity First

**Minimum code that solves the problem. Nothing speculative.**

- No features beyond what was asked.
- No abstractions for single-use code.
- No "flexibility" or "configurability" that wasn't requested.
- No error handling for impossible scenarios.
- If you write 200 lines and it could be 50, rewrite it.

Ask yourself: "Would a senior engineer say this is overcomplicated?" If yes, simplify.

## 3. Surgical Changes

**Touch only what you must. Clean up only your own mess.**

When editing existing code:
- Don't "improve" adjacent code, comments, or formatting.
- Don't refactor things that aren't broken.
- Match existing style, even if you'd do it differently.
- If you notice unrelated dead code, mention it - don't delete it.

When your changes create orphans:
- Remove imports/variables/functions that YOUR changes made unused.
- Don't remove pre-existing dead code unless asked.

The test: Every changed line should trace directly to the user's request.

## 4. Goal-Driven Execution

**Define success criteria. Loop until verified.**

Transform tasks into verifiable goals:
- "Add validation" → "Write tests for invalid inputs, then make them pass"
- "Fix the bug" → "Write a test that reproduces it, then make it pass"
- "Refactor X" → "Ensure tests pass before and after"

For multi-step tasks, state a brief plan:
```
1. [Step] → verify: [check]
2. [Step] → verify: [check]
3. [Step] → verify: [check]
```

Strong success criteria let you loop independently. Weak criteria ("make it work") require constant clarification.

---

**These guidelines are working if:** fewer unnecessary changes in diffs, fewer rewrites due to overcomplication, and clarifying questions come before implementation rather than after mistakes.

---
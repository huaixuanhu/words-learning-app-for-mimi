# Words Learning App For Mimi Stage 2: App Scaffold

Created: 2026-07-03 02:04 AEST
Last updated: 2026-07-04 00:27 AEST

Source plan:

- `plan_docs/PLAN_V1_MASTER.md`

Derived from:

- `AGENTS.md`
- `ARCHITECTURE.md`
- `plan_docs/PLAN_V1_STAGE1_PRODUCT_MVP.md`
- Next.js official installation documentation checked on 2026-07-03 AEST: `https://nextjs.org/docs/app/getting-started/installation`
- `vercel:nextjs` local skill guidance

Scope:

- Scaffold a local Next.js（React Web 框架）App Router（应用路由）project with TypeScript（类型脚本）, Tailwind CSS（样式框架）, ESLint（代码检查）, and npm（Node 包管理器）.
- Keep the first UI as a minimal working frame only: routes, page shells, forms, labels, and navigation.
- Create first-pass routes for home, add word, text import, review, library, export, and settings.
- Reflect Stage 1 product rules in the page skeleton, including automatic added time, editable added time, automatic timezone, conservative `.txt` import preview, and four review ratings.
- Add local-only utility types and sample data only when needed for scaffold validation.
- Update architecture, changelog, and AI agent log after implementation.

Non-Scope:

- No polished visual design, custom illustration, animation, brand identity, or final user-facing interface design.
- No persistent database, schema migration, remote database, or production data mutation.
- No Vercel deployment, domain setup, GitHub push, or pull request.
- No login, authentication provider, credentials, `.env` changes, analytics, AI generation, dictionary API, email, payment, or other third-party integration.
- No `.docx`, PDF, OCR, or complex document import.

Safety / Side Effects:

- This stage creates local application scaffold files under the repository.
- Existing governance and planning documents must be preserved.
- The app must not read secrets or send study data to external services.
- Any sample vocabulary or review data must be local static placeholder data, not real user data.
- Because there is no durable storage in this stage, any interactive state is demo/local browser state only unless later stages implement persistence.

Exit Criteria:

- `package.json` and lockfile exist, making the package manager explicit.
- Local Next.js app can run.
- Core routes or screens exist.
- Minimal mobile-first navigation exists.
- Stage 1 core product assumptions are visible in the scaffold.
- Validation commands are documented and runnable.
- `ARCHITECTURE.md`, `CHANGELOG.md`, and `governance/AI_AGENT_LOG.md` are updated.

Validation Plan:

- `npm run governance:preflight`
- `npm run lint`
- `npm run typecheck`
- `npm run build`
- `npm audit --json`
- Start local dev server and smoke-check the app in a browser.

Implementation Notes:

- Use a temporary scaffold directory first, then copy generated app files into the project root to avoid overwriting existing governance documents.
- Prefer simple, readable UI components over final styling. The later design stage should own visual polish.
- Keep storage behind local in-memory or browser-local placeholders until the persistence stage is planned.

Implementation Outcome:

- Scaffolded Next.js App Router with npm and `package-lock.json`.
- Implemented routes: `/`, `/add`, `/import`, `/review`, `/library`, `/export`, and `/settings`.
- Kept UI deliberately minimal: route shells, field labels, controls, static placeholder rows, and simple navigation.
- Added `npm run typecheck`.
- Preserved existing `AGENTS.md` instead of accepting the generated scaffold copy.
- Removed unused default Next.js / Vercel public SVG assets.
- Added a lightweight Tier 1 governance preflight after upgrading the local governance marker to `human-ai-governance v0.2.0`.

Current Versions:

- Next.js 16.2.10
- React 19.2.4
- TypeScript 5.9.3
- Tailwind CSS 4.3.2
- ESLint 9.39.4
- lucide-react 0.562.0
- PostCSS 8.5.16 via npm `overrides`

Security Outcome:

- The previous `next -> postcss` moderate audit finding was fixed with a root npm `overrides` entry for `postcss: 8.5.16`.
- `npm audit --json` now reports 0 vulnerabilities.
- `next@latest` remains 16.2.10 and still declares `postcss: 8.4.31`; `next@canary` declares a patched PostCSS version, but the scaffold stays on stable Next.js and uses npm override instead.

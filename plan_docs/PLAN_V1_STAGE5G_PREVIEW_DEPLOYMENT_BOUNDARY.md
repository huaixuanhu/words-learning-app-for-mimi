# Words Learning App For Mimi Stage 5G: Preview Deployment Boundary

Created: 2026-07-05 13:56 AEST
Last updated: 2026-07-05 14:26 AEST

Source plan:

- `plan_docs/PLAN_V1_MASTER.md`

Derived from:

- `AGENTS.md`
- `ARCHITECTURE.md`
- `plan_docs/PLAN_V1_STAGE5F_DEV_PREVIEW_NEON_BOOTSTRAP.md`
- Vercel official docs:
  - `https://vercel.com/docs/projects/deploy-from-cli`
  - `https://vercel.com/docs/deployments/environments`
  - `https://vercel.com/docs/git`
- User instruction on 2026-07-05 to keep the current active Production deployment（生产部署）for now, document it clearly, and use `vercel deploy` for Preview deployment（预览部署）only.

Scope:

- Check the current Vercel project production branch（生产分支）setting.
- Clearly document the current active Production deployment as non-official Stage 5F / Stage 5G residue, not the formal V1 production release.
- Create one Preview deployment using the standard `vercel deploy` command without `--prod`.
- Inspect the created deployment and require `target=preview` before treating it as valid.
- Smoke test the Preview URL with read-only route checks.
- Update docs and governance logs with exact deployment target results.

Non-Scope:

- Do not delete the current active Production deployment in this stage.
- Do not change Vercel project production branch settings.
- Do not run `vercel deploy --prod`.
- Do not promote a Preview deployment to Production.
- Do not migrate, seed, import, or mutate any Production database.
- Do not connect production domains or custom domains.
- Do not implement runtime Postgres persistence.
- Do not import local backup data.

Safety / Side Effects:

- This stage is a Tier 3 deployment-boundary session because it interacts with Vercel deployment state.
- The current active Production deployment is allowed to remain only as a clearly documented non-official artifact.
- Formal Production should wait until V1 is complete and merged through the agreed branch path.
- Stop immediately if `vercel deploy` returns a Production target or assigns production aliases.
- If a new deployment is not clearly `target=preview`, do not smoke test it as Preview and document the blocker.
- Do not print secret values.

Current Vercel Facts:

- Project: `anorias-projects/words-learning-app-for-mimi`
- Project id: `prj_qGmq7IZXGB2Bx9X2DuZaaYubg6eD`
- Git link production branch reported by Vercel API: `main`
- Current active Production deployment id: `dpl_2nvALJ1CutPjeFteXKMCHWKa4UsD`
- Current active Production deployment commit ref reported by Vercel metadata: `V1`
- Current active Production deployment commit: `d01719a6bb372c75873d042c657feb7f93d80b3a`
- This Production deployment is not treated as the official V1 production release.

Execution Plan:

1. Confirm Vercel project production branch and active deployment state with read-only CLI/API calls.
2. Update project docs to prevent state misunderstanding.
3. Run `npx vercel@latest deploy --yes`.
4. Inspect the returned URL or deployment id.
5. Continue only if inspection reports `target=preview`.
6. Smoke check `/`, `/add`, `/import`, `/library`, `/review`, `/export`, and `/settings` through the Preview URL.
7. Record results and residual risk.

Exit Criteria:

- Current Production deployment status is documented accurately.
- Vercel production branch setting is documented.
- A Preview deployment exists and is verified as `target=preview`, or a blocker is documented.
- No Production deployment is deleted or newly promoted in this stage.
- Docs, changelog, and AI log match the actual Vercel state.
- Local governance preflight passes.

Execution Results:

- Read-only Vercel API inspection reported Git link production branch `main`.
- Read-only Vercel deployment inspection found active Production deployment `dpl_2nvALJ1CutPjeFteXKMCHWKa4UsD` from branch `V1`; per user instruction, it was not deleted.
- Ran `npx vercel@latest deploy --yes`.
- Created Preview deployment `dpl_d5LUb6r1wEXiJBUENb2PACEZMVsu`.
- Preview URL: `https://words-learning-app-for-mimi-bwfhi5rap-anorias-projects.vercel.app`
- `vercel inspect` reported `target preview`.
- Vercel API OIDC（OpenID Connect，开放身份连接）claims reported `environment: preview`.
- `vercel ls words-learning-app-for-mimi` showed both the verified Preview deployment and the non-official active Production deployment.
- `vercel curl` route smoke returned HTTP 200 for `/`, `/add`, `/import`, `/library`, `/review`, `/export`, and `/settings`.
- `vercel curl` generated a deployment protection bypass token for this protected Preview access. The token value was not printed and was not written to source control.
- Preview error-log check with `vercel logs dpl_d5LUb6r1wEXiJBUENb2PACEZMVsu --level error --since 10m --json` returned no error log records.
- After the Stage 5G documentation commit reached `origin/V1`, Vercel Git integration created an additional Preview deployment:
  - URL: `https://words-learning-app-for-mimi-aczic0spy-anorias-projects.vercel.app`
  - Deployment id: `dpl_EmhfvP8yE9NrxCWPcdK3Qdd8sdk8`
  - Commit: `06120f76cd999d743658dee79a0189f2053044bb`
  - `vercel inspect` reported `target preview`.
  - Vercel API OIDC claims reported `environment: preview`.
  - Vercel metadata did not report `gitDirty`.

Residual Risks:

- The active Production deployment remains visible and reachable unless changed later in Vercel. It is explicitly non-official for V1.
- The verified Preview deployment was created from a dirty local working tree, because this Stage 5G documentation was not committed before deployment. Treat it as a preview artifact, not a formal release artifact.
- The later Git integration Preview deployment is cleaner than the manual Preview because it points at committed `origin/V1` state.
- Official Production should wait until V1 is complete and merged through the agreed branch path.

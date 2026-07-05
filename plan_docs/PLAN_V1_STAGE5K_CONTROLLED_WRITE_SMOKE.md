# Words Learning App For Mimi Stage 5K: Controlled Write Smoke

Created: 2026-07-05 15:14 AEST
Last updated: 2026-07-05 15:21 AEST

Source plan:

- `plan_docs/PLAN_V1_MASTER.md`

Derived from:

- `AGENTS.md`
- `ARCHITECTURE.md`
- `plan_docs/PLAN_V1_STAGE5H_RUNTIME_POSTGRES_ADAPTER_DESIGN.md`
- `plan_docs/PLAN_V1_STAGE5I_RUNTIME_POSTGRES_ADAPTER_IMPLEMENTATION.md`
- `plan_docs/PLAN_V1_STAGE5J_POSTGRES_ADAPTER_READ_ONLY_VERIFICATION.md`
- `src/app/api/storage/smoke/route.ts`
- `src/lib/storage/postgres/repository.ts`

Scope:

- Execute one controlled write-path smoke test（冒烟测试）against the approved development / preview Neon Postgres database.
- Keep the write flag scoped to Vercel Preview（预览）only by using `MIMI_ENABLE_STORAGE_SMOKE_WRITES=true` in Preview.
- Create a new Vercel Preview deployment and verify its deployment target before treating route results as valid.
- Call `/api/storage/smoke` exactly once with `x-mimi-storage-smoke: allow-dev-preview-write` after Preview target verification.
- Verify that the smoke route creates data under the fixed smoke person id `00000000-0000-4000-8000-0000000005f1`.
- Verify database counts after the smoke write.
- Record whether smoke rows remain in the development database.
- Remove `MIMI_ENABLE_STORAGE_SMOKE_WRITES` from Preview after the single write.
- Create a follow-up Preview deployment to verify the smoke route is disabled again.
- Remove the smoke-enabled Preview deployment after the disabled Preview is verified.

Non-Scope:

- No Production（生产）environment variable.
- No Production deployment, promotion, alias change, or database migration.
- No user-facing storage runtime cutover.
- No backup import.
- No cleanup of smoke rows unless the user separately confirms cleanup.
- No authentication（认证）, analytics（分析追踪）, AI generation, embedding（向量嵌入）, FSRS（Free Spaced Repetition Scheduler，自由间隔重复调度算法）, email, notification, or 付费/扣款 feature.
- No schema migration changes.

Safety / Side Effects:

- This stage intentionally writes non-user smoke data into the non-production development / preview Neon database.
- The smoke route is blocked in Vercel Production by `VERCEL_ENV=production`.
- The smoke route requires `MIMI_STORAGE_RUNTIME=postgres-preview`.
- The smoke route requires `MIMI_ENABLE_STORAGE_SMOKE_WRITES=true`.
- The smoke route requires the explicit confirmation header `x-mimi-storage-smoke: allow-dev-preview-write`.
- The fixed smoke person slug is `storage-smoke`.
- The smoke item text starts with `storage smoke ` and includes the route timestamp.
- The current smoke route does not expose a cleanup endpoint.
- Cleanup would be a separate destructive database action and requires a separate human confirmation.
- Vercel environment variable（环境变量）changes apply only to new deployments, so the post-smoke disable step requires a new Preview deployment.

Expected Database Counts After One Successful Smoke:

- `people=1`
- `vocabulary_items=1`
- `import_batches=0`
- `review_states=1`
- `review_events=1`
- `review_settings=1`

Stop Conditions:

- Stop if the working tree contains unexpected user-owned changes before remote actions.
- Stop if `MIMI_ENABLE_STORAGE_SMOKE_WRITES` appears in Production.
- Stop if the new deployment target is not `preview`.
- Stop if `/api/storage/health` does not report `postgres-preview` ready before the write.
- Stop if the smoke route response is ambiguous and database counts cannot prove whether a write happened.
- Stop if more than one smoke write appears to have been created.
- Stop if Vercel or database commands expose secret values in output.
- Stop immediately on any user pause request.

Execution Plan:

1. Inspect the current Git and Stage 5J baseline.
2. Inspect current development database counts.
3. Inspect Vercel Preview environment variable scope.
4. Add `MIMI_ENABLE_STORAGE_SMOKE_WRITES=true` to Preview only.
5. Create a new Vercel Preview deployment with `vercel deploy`.
6. Inspect the deployment target and ready state.
7. Verify `/api/storage/health` on the new Preview deployment.
8. Call `/api/storage/smoke` once with the required confirmation header.
9. Inspect development database counts.
10. Query Preview error logs for the new deployment.
11. Remove the smoke write flag from Preview.
12. Deploy a follow-up Preview and verify `/api/storage/smoke` is disabled.
13. Remove the smoke-enabled Preview deployment.
14. Update project docs and governance log with actual results.
15. Run local validation.

Execution Results:

- Baseline database inspection:
  - `people=0`
  - `vocabulary_items=0`
  - `import_batches=0`
  - `review_states=0`
  - `review_events=0`
  - `review_settings=0`
- Initial Vercel env scope:
  - `MIMI_STORAGE_RUNTIME` existed in Preview only.
  - `MIMI_ENABLE_STORAGE_SMOKE_WRITES` did not exist.
  - Production env list was empty.
- Added `MIMI_ENABLE_STORAGE_SMOKE_WRITES=true` to Preview only.
- Verified after add:
  - `MIMI_ENABLE_STORAGE_SMOKE_WRITES` existed in Preview only.
  - Production env list remained empty.
- Smoke-enabled Preview deployment:
  - URL: `https://words-learning-app-for-mimi-kj0qj7l5k-anorias-projects.vercel.app`
  - Deployment id: `dpl_BbgqrsKCtFzbLfKjAaazfugPvfCv`
  - `vercel inspect` target: `preview`
  - Ready state: `READY`
- Pre-write Preview health:
  - Runtime: `postgres-preview`
  - Counts: `people=0`, `vocabularyItems=0`, `reviewEvents=0`
- Smoke route call:
  - Method: `POST`
  - Confirmation header: `x-mimi-storage-smoke: allow-dev-preview-write`
  - Result: `ok=true`, `status=ready`
  - Person id: `00000000-0000-4000-8000-0000000005f1`
  - Person slug: `storage-smoke`
  - Vocabulary item id: `22ddb9a7-affb-4b1a-9915-6f13cb357b66`
  - Review event id: `5717263b-990a-4f74-94cc-48a02ad62e9d`
  - Review state id: `b324bd50-f815-4cbe-b695-1f8928fa114c`
  - Queue count: `0`
- Post-write database inspection:
  - `people=1`
  - `vocabulary_items=1`
  - `import_batches=0`
  - `review_states=1`
  - `review_events=1`
  - `review_settings=1`
- Person-scoping inspection:
  - `smoke_people=1`
  - `smoke_vocabulary_items=1`
  - `smoke_review_states=1`
  - `smoke_review_events=1`
  - `smoke_review_settings=1`
  - `review_state_item_person_matches=1`
  - `review_event_item_person_matches=1`
  - `non_smoke_vocabulary_items=0`
- Removed `MIMI_ENABLE_STORAGE_SMOKE_WRITES` from Preview after the successful write.
- Verified after removal:
  - Preview env no longer includes `MIMI_ENABLE_STORAGE_SMOKE_WRITES`.
  - Production env list remained empty.
- Follow-up disabled Preview deployment:
  - URL: `https://words-learning-app-for-mimi-7bzktk5uc-anorias-projects.vercel.app`
  - Deployment id: `dpl_BJn1pFAbLiiY4LgCyThKx2vDTSar`
  - `vercel inspect` target: `preview`
  - Ready state: `READY`
  - Branch alias: `words-learning-app-for-mimi-hemerocallys-anorias-projects.vercel.app`
- Disabled Preview health:
  - Runtime: `postgres-preview`
  - Counts: `people=1`, `vocabularyItems=1`, `reviewEvents=1`
- Disabled Preview smoke route check:
  - Method: `POST`
  - Confirmation header: not sent.
  - Result: `ok=false`, `status=disabled`, reason `smoke-writes-not-enabled`.
- Removed smoke-enabled Preview deployment `dpl_BbgqrsKCtFzbLfKjAaazfugPvfCv`.
- Final Vercel deployment list no longer includes `https://words-learning-app-for-mimi-kj0qj7l5k-anorias-projects.vercel.app`.
- Final database inspection still showed exactly one smoke row set.
- Preview error log query for `dpl_BJn1pFAbLiiY4LgCyThKx2vDTSar` returned no error records.
- Smoke rows remain in the development database. They were not cleaned because cleanup is a separate destructive database action.
- Local validation passed:
  - `npm run test`
  - `npm run typecheck`
  - `npm run lint`
  - `npm audit --json`
  - `git diff --check`
  - `npm run build`
  - `npm run governance:preflight`
  - `python3 governance/preflight.py --tier 3 --require-skill-marker`

Exit criteria:

- `MIMI_ENABLE_STORAGE_SMOKE_WRITES=true` is confirmed in Preview only.
- A new deployment is confirmed as `target=preview`.
- Preview `/api/storage/health` returns `status=ready` before the write.
- `/api/storage/smoke` returns `ok=true`.
- Database counts match exactly one smoke person, one vocabulary item, one review state, one review event, and one review settings row.
- `MIMI_ENABLE_STORAGE_SMOKE_WRITES` is removed from Preview after the write.
- A follow-up Preview deployment confirms `/api/storage/smoke` is disabled again.
- The smoke-enabled Preview deployment is removed.
- Production state remains untouched.
- Smoke rows are either explicitly documented as remaining test data or cleaned only after separate confirmation.
- Documentation and AI agent log are synchronized with actual results.
- Validation commands pass or any failure is documented with the exact blocker.

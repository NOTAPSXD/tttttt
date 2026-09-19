# Phase B Handoff — VEXANODE

Status: code complete, `npx tsc --noEmit` clean. **Migration 001 not yet run** — blocked on backup + replica-set confirmation (see Runbook).

## Architecture moved to

- **Provider abstraction** (replaces hardwired `@/lib/virtfusion.ts`, which was deleted):
  - `lib/providers/types.ts` — `ProviderAdapter` interface, `ProviderError` (code/message/retryable/raw), capability flags.
  - `lib/providers/virtfusion.ts` — real HTTP adapter (retries, 15-min capability probe cache, friendly error mapping).
  - `lib/providers/manual.ts` — TCP health-check adapter for AWS-style/unlisted infra (probes 22/80/443/8080/8443, 2s timeout, 10s cache). All ops throw `unsupported()`; routes translate that to a friendly 400.
  - `lib/providers/index.ts` — `getAdapter`, `getAdapterForServer`, `getCapabilities`, `guessProviderType`.
- **Ownership** — `lib/ownership.ts`: `assignServer`/`unassignServer` (transactional, soft-unassign = close assignment + new row; no field deletion). In-app notifications always written.
- **Sync engine** — `lib/sync.ts`: `runSync` (added/updated/missing/unassigned/orphaned plan, manual health checks, `SyncRun` record, audit), plus `getSyncCounts`/`listSyncRuns`.
- **Rules/services** — `lib/status.ts` `resolveServerStatus`, `lib/permissions.ts` (`isAdmin`, `requireSuperAdmin`), `lib/rate-limit.ts` (Mongo TTL counters, returns `{success, remaining, limit, resetAt}`), `lib/audit.ts` (`logAudit`, `notifyUser`, `withTransaction`).
- **Schema** — new collections `serverassignments`, `trafficbuckets`, `syncruns`, `migrations`; `servers.providerServerId` + `ownerId` (String id → ObjectId); users gain `SUPPORT`/`SUPER_ADMIN` roles + `emailLower`; session/email-log/login-history rate-limit/announcement collections. Indexes are verified on boot by `lib/mongodb.ts` (`verifyIndexes`).

## Routes (all migrated from `@/lib/virtfusion` to `@/lib/providers` + ownerId)

- `api/vps/[id]/power|stats|reset-password|tasks|vnc|stream|rename|settings`
- `api/vps/[id]/backups` + `[backupId]` (+ `restore`)
- `api/admin/assign`, `api/admin/server/orphans`, `api/admin/server/[id]/unassign` (soft), `suspend`, `api/admin/users`, `api/admin/users/[id]`, `api/admin/analytics`
- `api/admin/sync` (GET counts/history, POST bound run), `api/cron/sync` (CRON_SECRET Bearer-gated)
- `api/client/servers/[id]/bookmark`
- `api/servers/[id]/control` deleted (use `/power`)

## Legacy compatibility (intentional)

Raw VirtFusion payload shapes are preserved via `getUpstream()`/`listUpstream()` for:
- `/stream` + `/stats` + admin VPS page + `mapServer` in `lib/client-data.ts`
- `ClientServer.virtfusionId` field kept (populated from `providerServerId`) to avoid client churn; new `providerType` + normalized `state` also returned.

## Migration runbook — DO NOT RUN WITHOUT THESE

1. **backup**: `mongodump --uri "$MONGODB_URI" --out ~/vexanode-backup-$(date +%F)`
2. **replica-set check**: `mongo --eval "rs.status().set"` must return a set name (Phase B ownership ops use transactions).
3. **run**: `npm run migrate -- --dry` (preview), then `npm run migrate`.
4. `001-initial` does: `virtfusionId`→`providerServerId`, `userId`(str)→`ownerId`(ObjectId) + owner denorm backfill, `emailLower` backfill (mixed-case conflicts reported, never auto-merged), provider-type classification, initial `serverassignments`. Indexes are built by the app on boot, or by `lib/mongodb.ts` verify path.

## Known remaining items

- **Build verified OK** with a Node v22.23.2 runtime (`next build` completes, all routes dynamic). The repo's default Node is v18.19.1 — upgrade it (Next 16 needs ≥20.9) or use `npx node@22`-style runtime to build locally.
- During static prerender of the auth pages, a benign `Failed to fetch logs ... MONGODB_URI` error is printed and swallowed (those pages bake without a DB and are server-rendered dynamic only in dev). No runtime impact with env set.
- `UserManagement.tsx` shows **mock/fabricated** login activity rows (fixed ids/timestamps) in the user detail modal — replace with real login-history data in Phase C.
- No MONGODB_URI / VIRTFUSION credentials locally → provider calls untested at runtime.
- `admin/users` per-user server counts use `$ifNull: ["$ownerId", "$userId"]` so counts are correct pre- and post-migration.

## Phase C hooks

- zod request validation + otplib 2FA feed into existing `LoginHistory`/`PasswordResetToken`/`Session` models.
- `lib/audit.ts` `providerErrorToResponse` is the single choke point for surfacing provider failures to UI.
- SMTP: `SMTP_HOST/PORT/SECURE/USER/PASS/FROM` envs already documented in `.env.example`.
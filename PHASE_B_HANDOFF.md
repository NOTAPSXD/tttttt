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

## Phase C (delivered so far)

- **zod validation** (`lib/validation.ts`): `parseBody` helper + shared schemas; applied to register, forgot-password, reset-password, change-password and all 2FA routes. Uses zod v4 (`{ error: ... }` params).
- **TOTP 2FA** (otplib v13 functional API): secrets encrypted at rest via AES-256-GCM (`ENCRYPTION_KEY`, `lib/crypto.ts`). Routes: `api/user/2fa/{setup,enable,disable}`. `setup` GET returns `{enabled}` / POST issues a provisional secret + otpauth URL; `enable` verifies the code and mints **single-use recovery codes** (hashed at rest); `disable` requires a TOTP or recovery code (rate-limited). Login (`lib/auth.ts` authorize) now takes an optional `otp` field; it is mandatory when 2FA is enabled (TOTP or recovery). TOTP verified with ±1 step tolerance.
- **2FA UI**: QR code + manual-secret enrollment in `client/settings` (`qrcode` lib), recovery-code vault display, and an OTP field on `/login`.
- **Password reset hardening**: rate-limited per-email (forgot) and per-IP (reset); reset tokens are now **strictly single-use** (`used` flag, atomic `findOneAndUpdate`); notify-on-change email; bcrypt min 8 / max 72 enforced everywhere.
- **Login history**: failed + successful credential logins recorded into `LoginHistory` (ip/user-agent/reason). Admin user modal now shows real activity via new `api/admin/users/[id]/activity` (mock rows removed).
- **Fixed**: `register` now sets required `emailLower` (was a latent save failure); email lookup is `emailLower`-aware everywhere.
- Verify builds under Node ≥20.9; `npx tsc --noEmit` clean.
- Deferred deliberately: server-side `Session` row tracking (Phase D device management), QR provisioning for all legacy users.
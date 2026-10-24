# VEXANODE VPS CONTROL PANEL - SECURITY AUDIT REPORT
**Target System:** VexaNode VPS Control Panel (Next.js 16 + MongoDB Mongoose + VirtFusion Upstream API)  
**Date:** 2026-10-24  
**Audit Standard:** STRIDE / OWASP Top 10 / Ponytail Audit Standard  
**Status:** PHASE 1 COMPLETE — AUDIT & THREAT MODEL (NO CODE EDITS PERFORMED)

---

## 1. Executive Summary

A comprehensive security audit of the VexaNode VPS control panel codebase was conducted across all 43 API endpoints, data models, middleware configuration, authentication flows, provider adapters, and client data mappers.

### Key Risk Posture
- **Critical Risk (CRITICAL-01): Missing Next.js Middleware Execution.** The repository contains authentication and CSRF origin verification inside `proxy.ts`. However, Next.js App Router only executes middleware defined in `middleware.ts` (or `src/middleware.ts`). Because the file is named `proxy.ts`, **it is completely ignored by Next.js at runtime**. CSRF origin verification on mutations and global `/admin` route redirects are non-functional.
- **Critical Risk (CRITICAL-02): Raw VirtFusion Infrastructure Data Leaked to Client.** `lib/client-data.ts` maps `vfDetails: raw`, exposing the full unmapped upstream VirtFusion API payload (internal node IDs, hypervisor locations, template names, internal IDs) directly to client dashboards. Furthermore, `/api/vps/[id]/stats` and `/api/vps/[id]/stream` stream the un-sanitized upstream payload to the browser.
- **Critical Risk (CRITICAL-03): VirtFusion Upstream Host & Auth URL Leak via VNC Redirect.** `/api/vps/[id]/vnc` issues an HTTP 302/307 redirect directly to `${baseUrl}${vncData.url}`, sending the client's browser straight to the internal VirtFusion host domain, port, and session ticket rather than proxying the console.
- **High Risk (HIGH-01): Arbitrary Code Execution Console Parameter Misalignment & Node RCE.** `/api/admin/console` constructs a dynamic `AsyncFunction` with 18 declared parameters, but calls it with only 3 arguments (`fn(connectDB, mongoose, ObjectId)`), mapping `ObjectId` to the `User` parameter and leaving all models (`Server`, etc.) undefined. Moreover, it exposes raw server-side Node.js evaluation to administrators.
- **High Risk (HIGH-02): Missing Rate Limits on Destructive VPS Operations & 2FA Enable.** `/api/vps/[id]/reset-password` and `/api/vps/[id]/backups` have zero rate limiting. Additionally, `/api/user/2fa/enable` lacks rate limiting, allowing brute-forcing of the 6-digit TOTP code against `pendingSecretEnc`.
- **High Risk (HIGH-03): Mongoose User Model Lacks `select: false` on Password Hash.** `UserSchema` defines `password: { type: String }` without `select: false`. Generic queries without projections inadvertently load bcrypt password hashes into memory.
- **High Risk (HIGH-04): In-Memory Mock Array in Notification Read Endpoint.** `/api/notifications/[id]/read/route.ts` operates on an in-memory variable `let notifications: any[] = []` instead of the MongoDB `Notification` collection.

---

## 2. Inventory of API Routes & Server Actions

| Route | Method | Authentication | Allowed Roles | Ownership Scoped (Server-Side) | Status / Notes |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `/api/admin/analytics` | GET | Session | ADMIN, SUPER_ADMIN | N/A (Platform metrics) | OK |
| `/api/admin/assign` | POST | Session | ADMIN, SUPER_ADMIN | N/A (Admin action) | OK |
| `/api/admin/console` | POST | Session | SUPER_ADMIN | N/A | **HIGH-01**: Broken parameter wiring & RCE |
| `/api/admin/email-logs` | GET | Session | ADMIN only | N/A | **MEDIUM-01**: Blocks SUPER_ADMIN (`role !== 'ADMIN'`) |
| `/api/admin/send-mail` | POST | Session | ADMIN, SUPER_ADMIN | N/A | **MEDIUM-02**: No rate limit on bulk dispatch |
| `/api/admin/server/orphans` | GET, DELETE | Session | ADMIN, SUPER_ADMIN | N/A | OK |
| `/api/admin/server/[id]/renewal` | PATCH | Session | ADMIN only | N/A | **MEDIUM-01**: Blocks SUPER_ADMIN; unvalidated date |
| `/api/admin/server/[id]/suspend` | POST, DELETE | Session | ADMIN, SUPER_ADMIN | N/A | OK |
| `/api/admin/server/[id]/unassign` | POST | Session | ADMIN, SUPER_ADMIN | N/A | OK |
| `/api/admin/sync` | GET, POST | Session | ADMIN, SUPER_ADMIN | N/A | OK |
| `/api/admin/test-email` | POST | Session | ADMIN only | N/A | **MEDIUM-01**: Blocks SUPER_ADMIN; no rate limit |
| `/api/admin/users` | GET, POST | Session | ADMIN, SUPER_ADMIN | N/A | OK |
| `/api/admin/users/[id]` | PUT, DELETE | Session | ADMIN, SUPER_ADMIN | N/A | OK |
| `/api/admin/users/[id]/activity` | GET | Session | ADMIN, SUPER_ADMIN | N/A | OK |
| `/api/admin/users/[id]/password` | POST | Session | ADMIN, SUPER_ADMIN | N/A (Privilege checks applied) | OK |
| `/api/auth/2fa-challenge` | POST | Public / Token | All | Token-based (Challenge token) | OK |
| `/api/auth/forgot-password` | POST | Public | All | N/A | **MEDIUM-03**: No IP rate limit (email only) |
| `/api/auth/register` | POST | Public | All | N/A | OK (IP rate limit applied) |
| `/api/auth/reset-password` | POST | Public | All | Token-based | OK (Atomic single-use token) |
| `/api/auth/[...nextauth]` | GET, POST | Public / NextAuth | All | N/A | **MEDIUM-04**: Missing explicit cookie hardening |
| `/api/client/servers/[id]/bookmark` | PATCH | Session | All | **YES** (`{ _id: id, ownerId: session.user.id }`) | OK |
| `/api/client/stats` | GET | Session | All | **YES** (`ownerId: session.user.id`) | **CRITICAL-02**: Leaks `vfDetails: raw` |
| `/api/cron/sync` | POST | Bearer Secret | System / Cron | N/A (Timing safe equal) | OK |
| `/api/notifications` | GET | Session | All | **YES** (`userId: session.user.id`) | OK |
| `/api/notifications` | POST | Session | All | **YES** (Non-admin forced to own ID) | OK |
| `/api/notifications/[id]/read` | POST | Session | All | **BROKEN** | **HIGH-04**: Updates in-memory dummy array |
| `/api/user/2fa/disable` | POST | Session | All | **YES** (`session.user.id`) | OK |
| `/api/user/2fa/enable` | POST | Session | All | **YES** (`session.user.id`) | **HIGH-02**: No rate limit on TOTP verify |
| `/api/user/2fa/setup` | GET, POST | Session | All | **YES** (`session.user.id`) | OK |
| `/api/user/change-password` | POST | Session | All | **YES** (`session.user.id`) | OK |
| `/api/user/sessions` | GET, DELETE | Session | All | **YES** (`userId: session.user.id`) | OK |
| `/api/user/sessions/revoke-others` | POST | Session | All | **YES** (`userId: session.user.id`) | OK |
| `/api/user/sessions/[id]/revoke` | POST | Session | All | **YES** (`session.user.id`, `id`) | OK |
| `/api/vps/[id]/backups` | GET, POST | Session | CLIENT, ADMIN | **YES** (`{ _id: id, ownerId: session.user.id }`) | **HIGH-02**: No rate limit on backup creation |
| `/api/vps/[id]/backups/[backupId]` | DELETE | Session | CLIENT, ADMIN | **YES** (`{ _id: id, ownerId: session.user.id }`) | OK |
| `/api/vps/[id]/backups/[backupId]/restore`| POST | Session | CLIENT, ADMIN | **YES** (`{ _id: id, ownerId: session.user.id }`) | **HIGH-02**: No rate limit on restore |
| `/api/vps/[id]/power` | POST | Session | CLIENT, ADMIN | **YES** (`{ _id: id, ownerId: session.user.id }`) | **HIGH-05**: Error handler exposes `raw: mapped.raw` |
| `/api/vps/[id]/rename` | PATCH | Session | CLIENT, ADMIN | **YES** (`findById` + `ownerId` check) | **LOW-01**: Non-atomic lookup and update |
| `/api/vps/[id]/reset-password` | POST | Session | CLIENT, ADMIN | **YES** (`{ _id: id, ownerId: session.user.id }`) | **HIGH-02**: Zero rate limit on reset |
| `/api/vps/[id]/settings` | PATCH | Session | CLIENT, ADMIN | **YES** (`findById` + `ownerId` check) | **LOW-01**: Non-atomic lookup and update |
| `/api/vps/[id]/stats` | GET | Session | CLIENT, ADMIN | **YES** (`{ _id: id, ownerId: session.user.id }`) | **CRITICAL-02**: Leaks raw upstream payload |
| `/api/vps/[id]/stream` | GET (SSE) | Session | CLIENT, ADMIN | **YES** (`{ _id: id, ownerId: session.user.id }`) | **CRITICAL-02**: Streams raw upstream payload |
| `/api/vps/[id]/tasks` | GET | Session | CLIENT, ADMIN | **YES** (`{ _id: id, ownerId: session.user.id }`) | OK |
| `/api/vps/[id]/vnc` | GET | Session | CLIENT, ADMIN | **YES** (`{ _id: id, ownerId: session.user.id }`) | **CRITICAL-03**: Redirects directly to VirtFusion host |

*Note: There are no server actions (`'use server'`) present in the codebase. All actions operate via Next.js Route Handlers (`app/api/**/route.ts`).*

---

## 3. Detailed Security Findings

### CRITICAL FINDINGS

#### [CRITICAL-01] Next.js Middleware Bypass Due to Misnamed File (`proxy.ts` vs `middleware.ts`)
- **File & Line:** [`proxy.ts:1-43`](file:///c:/Users/acer/Downloads/VexaNode-Vps/proxy.ts#L1-L43)
- **Why Exploitable:** Next.js App Router specification requires middleware to be placed in `middleware.ts` or `src/middleware.ts`. The project contains `proxy.ts` exporting `withAuth(function proxy(req) ...)`. Because Next.js does not recognize `proxy.ts`, this code is **never invoked**. Consequently:
  1. The CSRF check `validateCsrfOrigin(req)` is never called for any POST/PUT/PATCH/DELETE route.
  2. Middleware route guard for `/admin` redirect is inactive.
- **Fix:** Move/rename `proxy.ts` to `middleware.ts`. Ensure `middleware.ts` runs on all configured routes and correctly enforces CSRF and route authorization.

---

#### [CRITICAL-02] Raw VirtFusion Upstream Infrastructure Data Leaked to Client
- **Files & Lines:**
  - [`lib/client-data.ts:104`](file:///c:/Users/acer/Downloads/VexaNode-Vps/lib/client-data.ts#L104): `vfDetails: raw`
  - [`app/api/vps/[id]/stats/route.ts:28-31`](file:///c:/Users/acer/Downloads/VexaNode-Vps/app/api/vps/[id]/stats/route.ts#L28-L31): `return NextResponse.json(raw)`
  - [`app/api/vps/[id]/stream/route.ts:42-43`](file:///c:/Users/acer/Downloads/VexaNode-Vps/app/api/vps/[id]/stream/route.ts#L42-L43): `send({ ...payload, _provider: server.providerType })`
- **Why Exploitable:** The backend passes the entire raw VirtFusion API JSON response (`getUpstream`) directly to the browser. This payload reveals internal infrastructure topology: VirtFusion internal node ID, hypervisor host details, hypervisor cluster IDs, raw storage pool IDs, network bridge names, internal OS template filenames, and provider server IDs.
- **Fix:** Implement a strict DTO/mapper (`sanitizeServerStats` / `sanitizeServerDetail`) that only returns whitelisted UI fields (status, cpuUsage, memUsage, rx, tx). Completely delete `vfDetails: raw` from `ClientServer`.

---

#### [CRITICAL-03] VirtFusion Internal Upstream Host & Auth Ticket Leaked via VNC HTTP Redirect
- **File & Line:** [`app/api/vps/[id]/vnc/route.ts:28-36`](file:///c:/Users/acer/Downloads/VexaNode-Vps/app/api/vps/[id]/vnc/route.ts#L28-L36)
- **Why Exploitable:** The route retrieves the VNC connection URL from the VirtFusion adapter and performs `NextResponse.redirect(targetUrl)`. The client's browser is redirected to `https://<VIRTFUSION_API_URL>/...ticket=...`. This directly exposes:
  1. The internal host domain / IP of the VirtFusion cluster.
  2. VirtFusion URL tokens and ports directly in client browser history and referer headers.
- **Fix:** Terminate or proxy the VNC websocket connection server-side, or return an opaque one-time proxy ticket handled by a websocket relay without redirecting the browser directly to the VirtFusion management host.

---

### HIGH FINDINGS

#### [HIGH-01] Broken Parameter Wiring & Unrestricted Node Eval in Admin Console
- **File & Line:** [`app/api/admin/console/route.ts:75-90`](file:///c:/Users/acer/Downloads/VexaNode-Vps/app/api/admin/console/route.ts#L75-L90)
- **Why Exploitable:** `run()` creates an `AsyncFunction` with 18 parameters:
  `"connectDB", "mongoose", "User", "Server", "ServerAssignment", ...`
  However, it invokes it as: `fn(connectDB, mongoose, ObjectId)`.
  As a result, argument 3 (`ObjectId`) is assigned to `"User"`, and all other 15 models (`Server`, `ServerAssignment`, etc.) are `undefined`. Any script accessing `Server` throws a TypeError. More critically, `new AsyncFunction` allows arbitrary code execution in the Node.js runtime process (can read `process.env`, invoke `child_process.exec`, etc.).
- **Fix:** Pass all models in correct parameter alignment or bind them to a sandboxed context. Add execution constraints and audit alarms.

---

#### [HIGH-02] Missing Rate Limits on VPS Reset-Password, Backups, and 2FA Verification
- **Files & Lines:**
  - [`app/api/vps/[id]/reset-password/route.ts:13`](file:///c:/Users/acer/Downloads/VexaNode-Vps/app/api/vps/[id]/reset-password/route.ts#L13) (No rateLimit call)
  - [`app/api/vps/[id]/backups/route.ts:40`](file:///c:/Users/acer/Downloads/VexaNode-Vps/app/api/vps/[id]/backups/route.ts#L40) (No rateLimit call)
  - [`app/api/vps/[id]/backups/[backupId]/restore/route.ts:13`](file:///c:/Users/acer/Downloads/VexaNode-Vps/app/api/vps/[id]/backups/[backupId]/restore/route.ts#L13) (No rateLimit call)
  - [`app/api/user/2fa/enable/route.ts:15`](file:///c:/Users/acer/Downloads/VexaNode-Vps/app/api/user/2fa/enable/route.ts#L15) (No rateLimit call on code verification)
- **Why Exploitable:**
  - An authenticated user can flood `reset-password`, causing repeated upstream API calls and email dispatches.
  - An attacker or rogue script can spam `createBackup` and `restoreBackup`, exhausting provider quota or causing disk thrashing.
  - On `/api/user/2fa/enable`, an attacker with temporary session access can brute-force the 6-digit TOTP code (1,000,000 combinations) against the unconfirmed `pendingSecretEnc` without restriction.
- **Fix:** Apply tiered rate limiting using `rateLimit` on all of these endpoints (per IP, per user, and per server).

---

#### [HIGH-03] User Schema Does Not Suppress Password Hash by Default (`select: false`)
- **File & Line:** [`lib/models.ts:263`](file:///c:/Users/acer/Downloads/VexaNode-Vps/lib/models.ts#L263)
- **Why Exploitable:** `password: { type: String }` does not set `select: false`. Any query such as `User.find()` or `User.findOne()` without an explicit `.select("-password")` or projection returns the bcrypt password hash. For instance, `app/(dashboard)/admin/users/page.tsx:6` executes `User.find().sort({ createdAt: -1 }).lean()`, which loads all user password hashes and 2FA secrets into memory.
- **Fix:** Set `select: false` on `password`, `twoFactor.secretEnc`, `twoFactor.pendingSecretEnc`, and `twoFactor.recoveryHashes` in `UserSchema`. Explicitly use `.select("+password")` only in `lib/auth.ts`.

---

#### [HIGH-04] Mock In-Memory Array in Notification Read Route
- **File & Line:** [`app/api/notifications/[id]/read/route.ts:6-25`](file:///c:/Users/acer/Downloads/VexaNode-Vps/app/api/notifications/[id]/read/route.ts#L6-L25)
- **Why Exploitable:** The route defines `let notifications: any[] = [];` and mutates that local in-memory array instead of updating the database with `Notification.findOneAndUpdate({ _id: params.id, userId: session.user.id }, { read: true, readAt: new Date() })`. As a result, marking notifications as read fails to persist to MongoDB and fails across multi-process or serverless deployments.
- **Fix:** Replace mock array operations with a Mongoose query scoped to `userId: session.user.id`.

---

#### [HIGH-05] Upstream VirtFusion Error Details Leaked in API Responses
- **Files & Lines:**
  - [`lib/audit.ts:125`](file:///c:/Users/acer/Downloads/VexaNode-Vps/lib/audit.ts#L125): `return { status, message: payload.message, raw: payload.raw };`
  - [`app/api/vps/[id]/power/route.ts:92`](file:///c:/Users/acer/Downloads/VexaNode-Vps/app/api/vps/[id]/power/route.ts#L92): `return NextResponse.json({ error: mapped.message, raw: mapped.raw }, { status: mapped.status });`
  - [`app/api/vps/[id]/reset-password/route.ts:69`](file:///c:/Users/acer/Downloads/VexaNode-Vps/app/api/vps/[id]/reset-password/route.ts#L69): `return NextResponse.json({ error: mapped.message, raw: mapped.raw }, { status: mapped.status });`
- **Why Exploitable:** When VirtFusion returns an error, `providerErrorToResponse` extracts `raw` and includes it in the JSON response to the user. This exposes upstream HTTP status codes, API endpoints, schema validation errors, and potentially sensitive provider diagnostics.
- **Fix:** Remove `raw` from client-facing JSON responses. Log `raw` server-side only with a unique correlation `requestId`, returning only `{ error: mapped.message, requestId }` to the client.

---

### MEDIUM FINDINGS

#### [MEDIUM-01] Role Check Inconsistency Blocks SUPER_ADMIN on Admin Endpoints
- **Files & Lines:**
  - [`app/api/admin/server/[id]/renewal/route.ts:12`](file:///c:/Users/acer/Downloads/VexaNode-Vps/app/api/admin/server/[id]/renewal/route.ts#L12)
  - [`app/api/admin/email-logs/route.ts:8`](file:///c:/Users/acer/Downloads/VexaNode-Vps/app/api/admin/email-logs/route.ts#L8)
  - [`app/api/admin/test-email/route.ts:8`](file:///c:/Users/acer/Downloads/VexaNode-Vps/app/api/admin/test-email/route.ts#L8)
- **Why Exploitable:** Routes check `session.user.role !== 'ADMIN'` instead of using the standard `isAdmin(String(session.user.role))`. Consequently, users with role `SUPER_ADMIN` receive a 401 Unauthorized when accessing renewal, email logs, or test email endpoints.
- **Fix:** Replace raw equality checks with `isAdmin(String(session.user.role))`.

---

#### [MEDIUM-02] No Rate Limits on Admin Email Operations
- **Files & Lines:**
  - [`app/api/admin/test-email/route.ts:6`](file:///c:/Users/acer/Downloads/VexaNode-Vps/app/api/admin/test-email/route.ts#L6)
  - [`app/api/admin/send-mail/route.ts:25`](file:///c:/Users/acer/Downloads/VexaNode-Vps/app/api/admin/send-mail/route.ts#L25)
- **Why Exploitable:** A compromised admin session or script could trigger massive email dispatches via SMTP without throttle limits, blacklisting the domain's SMTP reputation.
- **Fix:** Add rate limiting per admin account and per IP.

---

#### [MEDIUM-03] Missing IP-Level Rate Limit on Forgot Password
- **File & Line:** [`app/api/auth/forgot-password/route.ts:20`](file:///c:/Users/acer/Downloads/VexaNode-Vps/app/api/auth/forgot-password/route.ts#L20)
- **Why Exploitable:** Rate limiting is enforced per email (`forgot_${email}`). An attacker can cycle through thousands of email addresses from a single IP, exhausting SMTP outbound capacity.
- **Fix:** Add an IP-based rate limit (`forgot_ip_${ip}`, 10 per 10 minutes) alongside the email limit.

---

#### [MEDIUM-04] NextAuth Cookie Security Flags Not Explicitly Hardened
- **File & Line:** [`lib/auth.ts:58-64`](file:///c:/Users/acer/Downloads/VexaNode-Vps/lib/auth.ts#L58-L64)
- **Why Exploitable:** NextAuth defaults `secure: true` only if `NEXTAUTH_URL` starts with `https://`. In environments behind a reverse proxy terminating TLS, if `NEXTAUTH_URL` is set to an internal HTTP address, cookies will be issued without the `Secure` flag and without `__Host-` or `__Secure-` prefixes.
- **Fix:** Explicitly configure `useSecureCookies: process.env.NODE_ENV === "production"` and specify strict cookie attributes.

---

#### [MEDIUM-05] Missing `poweredByHeader: false` and `productionBrowserSourceMaps` in Next.js Config
- **File & Line:** [`next.config.ts:1-48`](file:///c:/Users/acer/Downloads/VexaNode-Vps/next.config.ts#L1-L48)
- **Why Exploitable:** `poweredByHeader` is not disabled, resulting in the server transmitting `X-Powered-By: Next.js`. `productionBrowserSourceMaps` is not explicitly set to `false`.
- **Fix:** Add `poweredByHeader: false` and `productionBrowserSourceMaps: false` to `nextConfig`.

---

### LOW FINDINGS

#### [LOW-01] Non-Atomic Server Ownership Check in Rename and Settings Routes
- **Files & Lines:**
  - [`app/api/vps/[id]/rename/route.ts:22-31`](file:///c:/Users/acer/Downloads/VexaNode-Vps/app/api/vps/[id]/rename/route.ts#L22-L31)
  - [`app/api/vps/[id]/settings/route.ts:23-32`](file:///c:/Users/acer/Downloads/VexaNode-Vps/app/api/vps/[id]/settings/route.ts#L23-L32)
- **Why Exploitable:** `Server.findById(id)` is executed first, followed by manual ownership verification, then a separate `Server.findByIdAndUpdate(id, ...)`. In a race condition where a server is reassigned between the read and update, an unauthorized update could occur.
- **Fix:** Use atomic `Server.findOneAndUpdate({ _id: id, ...(admin ? {} : { ownerId: session.user.id }) }, ...)` and check if the returned document exists.

---

## 4. STRIDE Threat Model

### Component 1: Login & Authentication Flow (`/api/auth/[...nextauth]`, `/api/auth/2fa-challenge`)
- **Spoofing (S):** Attacker attempts credential stuffing or OTP guessing.
  - *Mitigations Present:* Dual rate limit on login (per-email 5/5m, per-IP 30/15m). 2FA challenge route verifies bcrypt password with dummy comparison on non-existent users.
  - *Threat Unaddressed:* `/api/user/2fa/enable` does not rate limit OTP confirmation attempts during setup.
- **Tampering (T):** Attacker modifies session JWT.
  - *Mitigations Present:* Signed JWT strategy. Password hash verification in JWT callback invalidates sessions on password change.
- **Repudiation (R):** User claims they did not log in.
  - *Mitigations Present:* `LoginHistory` records IP, user-agent, status, and failure reason.
- **Information Disclosure (I):** Account enumeration via response timing or error messages.
  - *Mitigations Present:* Forgot password introduces a simulated 250ms target delay. Login returns generic invalid credentials.
- **Denial of Service (D):** Attacker floods login to lock out legitimate users.
  - *Mitigations Present:* Dual IP and email rate limiting in MongoDB.
- **Elevation of Privilege (E):** Regular client logs in with admin privileges.
  - *Mitigations Present:* Role stored in MongoDB user document, verified against JWT. OAuth email collision prevents auto-linking to ADMIN/SUPER_ADMIN accounts.

### Component 2: VPS Power Actions (`/api/vps/[id]/power`)
- **Spoofing (S):** Unauthorized actor triggers reboot or shutdown.
  - *Mitigations Present:* Session authentication + ownership query (`{ _id: id, ownerId: session.user.id }`).
- **Tampering (T):** Attacker tampers with power payload (`action`).
  - *Mitigations Present:* `powerActionSchema` validates `action` against enum (`boot`, `shutdown`, `powerOff`, `restart`).
- **Repudiation (R):** Administrator or user restarts server without record.
  - *Mitigations Present:* `logAudit` records actor, action, IP, and target server; email notification sent to server owner.
- **Information Disclosure (I):** Error response exposes internal VirtFusion diagnostics.
  - *Threat Present:* `mapped.raw` leaks internal provider data in error responses (**HIGH-05**).
- **Denial of Service (D):** Rapidly cycling power states to disrupt the VM.
  - *Mitigations Present:* Rate limit of 5 requests per 60 seconds per user.

### Component 3: Reinstall & OS Rebuild
- **Current State:** There is NO active backend route for OS rebuild. The UI in `ServerDetailContent.tsx:259` displays an informational notice ("Rebuild is not available... The provider API does not expose OS rebuild yet").
- **Threat Assessment:** When implemented, OS rebuild must require:
  1. Mandatory re-authentication (current password or 2FA challenge).
  2. Strict server-side ownership check.
  3. Strict rate limiting (e.g. 1 per hour per server).
  4. Immediate audit log and non-suppressible email notification to owner.

### Component 4: Console & VNC Access (`/api/vps/[id]/vnc`, `/api/admin/console`)
- **Spoofing (S):** Attacker attempts to obtain console tokens for arbitrary servers.
  - *Mitigations Present:* Scoped to owner or administrator.
- **Tampering (T):** Attacker intercepts or modifies VNC stream.
  - *Threat Present:* Browser redirect to VirtFusion HTTP URL exposes upstream host and token in plaintext referers (**CRITICAL-03**).
- **Repudiation (R):** VNC session generated without log.
  - *Threat Present:* `vnc` route does not call `logAudit`.
- **Information Disclosure (I):** VNC endpoint leaks VirtFusion domain and port.
- **Elevation of Privilege (E):** Arbitrary code execution via `/api/admin/console`.
  - *Threat Present:* Direct Node execution via `AsyncFunction` (**HIGH-01**).

### Component 5: Billing & Orders
- **Current State:** The repository does not contain active checkout, invoice, or credit card billing endpoints. `balance` is defined on `UserSchema` as a numeric field (`balance: 0.0`), but no mutations or transactions touch it.
- **Threat Assessment:** When a billing subsystem is introduced, all credit decrements and invoice fulfillments must use `withTransaction` and atomic MongoDB `$inc` operators with pre-condition checks (`{ balance: { $gte: cost } }`) to prevent concurrent race condition overdrafts.

---

## 5. Phase 1 Audit Summary Table

| Finding ID | Title | Severity | Impacted Files | Fix Effort |
| :--- | :--- | :--- | :--- | :--- |
| **CRITICAL-01** | Next.js Middleware Bypass (`proxy.ts` vs `middleware.ts`) | **CRITICAL** | `proxy.ts` | Low (Rename & verify) |
| **CRITICAL-02** | Raw VirtFusion Data Leaked to Client (`vfDetails: raw`) | **CRITICAL** | `lib/client-data.ts`, `app/api/vps/[id]/stats/route.ts`, `stream/route.ts` | Medium (DTO sanitize) |
| **CRITICAL-03** | Upstream Host & Ticket Leak via VNC Redirect | **CRITICAL** | `app/api/vps/[id]/vnc/route.ts` | Medium (Opaque proxy/mask) |
| **HIGH-01** | Parameter Misalignment & Node RCE in Admin Console | **HIGH** | `app/api/admin/console/route.ts` | Medium (Argument wiring & sandbox) |
| **HIGH-02** | Missing Rate Limits on Reset-Password, Backups, 2FA Enable | **HIGH** | `reset-password/route.ts`, `backups/route.ts`, `2fa/enable/route.ts` | Low (Add rate limits) |
| **HIGH-03** | Password & 2FA Secrets Not Suppressed in UserSchema | **HIGH** | `lib/models.ts` | Low (`select: false`) |
| **HIGH-04** | Mock In-Memory Array in Notification Read Route | **HIGH** | `app/api/notifications/[id]/read/route.ts` | Low (Mongoose query) |
| **HIGH-05** | Upstream Provider Error Leakage (`raw: mapped.raw`) | **HIGH** | `lib/audit.ts`, `power/route.ts`, `reset-password/route.ts` | Low (Sanitize error payload) |
| **MEDIUM-01** | `SUPER_ADMIN` Role Locked Out on Admin Routes | **MEDIUM** | `renewal/route.ts`, `email-logs/route.ts`, `test-email/route.ts` | Low (`isAdmin` helper) |
| **MEDIUM-02** | No Rate Limits on Admin Email Dispatch | **MEDIUM** | `test-email/route.ts`, `send-mail/route.ts` | Low (Add rate limits) |
| **MEDIUM-03** | Missing IP Rate Limit on Forgot Password | **MEDIUM** | `forgot-password/route.ts` | Low (Add IP limiter) |
| **MEDIUM-04** | NextAuth Cookie Security Flags Unhardened | **MEDIUM** | `lib/auth.ts` | Low (Cookie options) |
| **MEDIUM-05** | Next.js Powered-By & Source Maps Enabled | **MEDIUM** | `next.config.ts` | Low (Config options) |
| **LOW-01** | Non-Atomic Server Ownership Verification | **LOW** | `rename/route.ts`, `settings/route.ts` | Low (`findOneAndUpdate`) |

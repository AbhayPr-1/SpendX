# SpendX Security, Reliability & Performance Audit

**Audit date:** 27 October 2026  
**Scope:** Frontend, Express/Mongoose API, JSON fallback persistence, authentication, receipt uploads, scheduler, dependencies, CI and Vercel configuration.

## Executive summary

I completed a source/configuration audit and applied the confirmed, low-risk fixes directly in the project. No critical or high-severity npm advisories remain, and no confirmed critical/high code issue remained in the reviewed scope after remediation. Existing dashboard/UI behavior and API response shapes were preserved where possible; error responses are now deliberately generic.

No production database, live Vercel deployment, or user ledger was accessed or modified. Integration tests used disposable scratch databases under the ignored `.work/security-audit` directory.

## Confirmed issues fixed

- **Authentication and API input handling:** Production no longer falls back to a predictable JWT secret or ephemeral serverless JSON storage. Login/registration inputs are bounded, passwords respect bcrypt's 72-byte limit, and public authentication/identifier checks are rate-limited. Transaction, goal, budget and subscription inputs are validated; update routes use field allowlists to prevent ownership and model-field mass assignment. Internal exceptions are logged server-side and not returned to clients.
- **CORS and browser hardening:** Production CORS now grants browser access only to configured `CLIENT_ORIGIN` values; local development remains convenient and credentials are disabled. Express and Vercel responses receive anti-sniffing, anti-framing and referrer headers; Vercel also sets HSTS.
- **Private-data exposure and untrusted HTML:** Financial views clear or mask retained account data on logout/account changes and ignore stale responses. AI-generated HTML is restricted to an allowlist of tags and stripped of all attributes before insertion. The tracked-source review found no other raw HTML/evaluation sink.
- **Receipt uploads:** Uploads are size-limited, checked against the actual image signature, restricted to supported image formats, cleaned up on processing failures and served only to the owning authenticated user.
- **Persistence and recurring-bill races:** JSON writes use isolated snapshots and atomic replacement; persistence errors are surfaced, and unreadable/malformed existing snapshots fail closed instead of being replaced with empty data. Recurring scheduling is bounded and month-end-safe. A hidden unique scheduler key prevents duplicate bills when Mongo-backed serverless workers overlap or retry; model indexes are ensured before requests/scheduling. Internal keys are excluded from API responses.
- **Performance and provider reliability:** Dashboard history now uses two parallel bounded Mongo queries instead of 24 sequential queries; JSON history aggregates each collection in one pass. Query-supporting indexes were added. Gemini/OCR calls and uploads have explicit time/resource bounds.
- **Dependencies and deployment:** React Router was upgraded to patched `7.18.4`; root, client and server npm audits now report zero advisories. Environment loading now precedes modules that capture configuration. Startup/build scripts are cross-platform, Vercel installs are reproducible, and CI includes dependency-audit gates. The example environment file documents `CLIENT_ORIGIN` and `CRON_SECRET`.

## Verification results

| Check | Result |
|---|---|
| `npm run build` | Passed |
| `npm run lint` | 0 errors; 1 warning (`react/only-export-components` in `AuthContext.jsx:121`) |
| Root/client/server `npm audit` | 0 critical, high, moderate or low advisories in each workspace |
| Isolated API integration smoke test | Passed, 39 assertions: auth, ownership, invalid inputs, mass assignment, production CORS, security headers, history shape, scheduler repeat and throttling |
| JSON persistence/scheduler regression | Passed: month-end dates, repeat/replay idempotency, 25 parallel writes and detached-read behavior |
| Corrupt-snapshot regression | Passed: existing malformed snapshot remained unchanged and read failed closed |
| Backend/test JavaScript syntax and deployment/package JSON parsing | Passed |
| `git diff --check` | Passed |
| Tracked secret-path/signature scan | No common private-key/token signatures; no tracked local env, runtime database or upload files (the example template is excluded) |

## Deployment notes and remaining limits

For production, configure `MONGODB_URI`, either `JWT_SECRET` or `AUTH_SECRET`, and `CRON_SECRET` for the scheduled Vercel endpoint. If the frontend and API are on different origins, set `CLIENT_ORIGIN` to a comma-separated allowlist; same-origin Vercel rewrites do not need it. The code paths and Vercel manifest were checked locally, but an actual production Mongo index build/deployment was not run.

The authentication rate limiter is process-local, so a horizontally scaled deployment should additionally use an edge/WAF limit or shared store for global throttling. There is no dedicated backend test-runner configured; the checks above were isolated smoke/regression runs, not browser E2E tests. The one lint warning is non-fatal and was left intact rather than restructuring the auth context unnecessarily.

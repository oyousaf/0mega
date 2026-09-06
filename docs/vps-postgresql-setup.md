# VPS API and PostgreSQL setup

## Intended production layout

- Vercel serves the dashboard and proxies `/api/*` to the VPS.
- The VPS runs the same Next.js build under PM2. Its API routes and persistent
  price loop are the only production backend and engine.
- PostgreSQL runs locally on the VPS and listens only on loopback. Vercel never
  connects to PostgreSQL directly.

Set `OMEGA_API_ORIGIN=https://your-vps-api.example` in Vercel. Do not set it on
the VPS. Both frontends then use the same API, engine state, and database.

Set the same server-only `OMEGA_AUTH_USERNAME` and `OMEGA_AUTH_PASSWORD` on
Vercel and the VPS. The browser's HTTP Basic authorization header passes through
the Vercel rewrite to the VPS. Production deliberately returns 503 if these
variables are missing. Remove the obsolete `NEXT_PUBLIC_DEV_PASSCODE`; any
variable prefixed with `NEXT_PUBLIC_` is included in browser code and cannot be
used as a secret.

Set `OMEGA_ENGINE_ENABLED=true` only on the VPS. Server instrumentation starts
the persistent price loop when that Next.js process boots. Leave it unset on
Vercel so a serverless frontend instance can never start another engine.

## Fresh database

This deployment intentionally starts with an empty database. No Neon trading
history is imported because the strategy and execution model are being revised
and the new evaluation must not mix incompatible results.

Install a currently supported PostgreSQL release from the operating system's
official PostgreSQL repository. Create a dedicated database and least-privilege
login. Bind PostgreSQL to `127.0.0.1`, keep port 5432 closed in the firewall,
and use a local connection such as:

```text
DATABASE_URL=postgresql://omega_app:REDACTED@127.0.0.1:5432/omega
DATABASE_SSL=false
DATABASE_POOL_MAX=10
```

Store the real value only in the VPS process environment or a root-readable
environment file. Never commit it. Apply the versioned schema with
`npm run db:migrate`; the command records migration checksums and refuses an
edited migration that has already been applied.

## Cutover sequence

1. Disable the existing automation before deploying the revised engine.
2. Create the fresh local database and apply the versioned schema.
   Optionally review and apply `db/seeds/2026-09-major-events.sql`; verify every
   event time against the linked official source before enabling automation.
3. Point the VPS `DATABASE_URL` to local PostgreSQL and set
   `DATABASE_SSL=false`.
4. Restart the `omega` process with automation still disabled.
5. Check the dashboard, API status, advisory lock, and a controlled paper tick.
6. Enable automation and treat all resulting trades as a new evaluation run.
7. Remove Neon credentials from Vercel and the VPS after the rollback window.

Run encrypted backups to storage outside the VPS, test restores regularly, and
monitor disk space and PostgreSQL health. A local database removes Neon compute
limits but makes VPS failure a combined API, engine, and database outage.

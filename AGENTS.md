<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Project rules

## Project identity

`SLUG=ai-run.ru`, `SERVICE_NAME=ai-run-ru`, `PORT=8787`, `SITE_DOMAIN=ai-run.ru`, `HOST=ai-run.ru`, `PLAYWRIGHT_PORT=8786`, `GITHUB_REPOSITORY=eipvyaru/ai-run.ru`, `VPS_HOST=170.168.112.47`, `VPS_SSH_PORT=22`, `NODE_VERSION=v24.21.0`.

Local root: `C:\_Codex\ai-run.ru`. VPS roots: `/var/www/ai-run.ru`, `/var/lib/ai-run.ru`, `/var/cache/ai-run.ru`.

## Infrastructure

Next.js runs on `127.0.0.1:8787` behind Nginx. Production uses systemd and Node.js v24.21.0. Do not expose the application port.

## Project documentation

Read `AI_RUN_PROJECT_STANDARD.md`, `TECHNICAL_SPECIFICATION.md` and `DEVELOPMENT_PLAN.md` before changes. Update documentation with behavior changes.

## Environment synchronization

`.env` is the only editable local secrets source. After changes run `scripts/sync-vps-env.ps1`. Never print or commit `.env` or `data/.env.vps`.

## Database and system prompt

SQLite and the real system prompt live under `data/` locally and `/var/lib/ai-run.ru/` in production. Append migrations; never rewrite applied migrations. Do not commit production data or prompt.

## Git rules

Run relevant checks and create one local commit for each completed coherent change. Never push without explicit user instruction. Never use `--no-verify`.

## Release verification

`npm run verify:release` must pass before push or deployment. It must not call paid or production integrations.

## Deployment rules

Deploy only a verified explicit commit. Preserve `.env`, SQLite and system prompt. Check VPS backup before dangerous migrations and record `PREVIOUS_COMMIT` for rollback.

## Conditional integrations

LLM, CalDAV and SMTP are server-only and configured through `.env`. Real integration smoke tests require explicit enablement.

## Forbidden actions

Do not commit secrets, expose PII to LLM/debug/technical logs, edit consent evidence, deploy from a dirty tree, overwrite production data, publish on `0.0.0.0`, or modify other Nginx sites/systemd services.

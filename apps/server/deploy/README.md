# ProbeFlash server deploy docs

本目录是服务器部署材料入口。当前推荐路线是 **release tarball first**：从 GitHub Release 获取固定版本资产，校验 `SHA256SUMS.txt`，解压到 `/home/hurricane/probeflash/releases/vX.Y.Z`，再用 `current` symlink 切换当前版本。服务器不作为开发 checkout，不以服务器 `git pull` 作为主部署方式。本目录修改只影响仓库内文档、env 示例、systemd 后续模板与静态校验；不 SSH、不上传、不 sudo、不写 `/opt`、不启动 systemd、不验证 LAN。

## Current route: release tarball user-dir no-sudo verify

- Target server: `192.168.2.2`, Ubuntu 20.04.6 LTS, SSH user `hurricane`.
- Deploy root: `/home/hurricane/probeflash`.
- Runtime: `/home/hurricane/probeflash/runtime/node/bin/node`.
- Web dist: `/home/hurricane/probeflash/current/dist`, served only when `PROBEFLASH_STATIC_DIR` points there.
- Data file: `/home/hurricane/probeflash/shared/data/probeflash.sqlite`.
- Env file: `/home/hurricane/probeflash/shared/env/probeflash.env`.
- Port: `4100` for both web UI and `/api`; do not use or change port `80`.
- Host: no-sudo LAN verify may bind `PROBEFLASH_HOST=0.0.0.0`, then test `http://192.168.2.2:4100/` and `http://192.168.2.2:4100/api/health`.
- Server system Node is `v10.19.0`; ProbeFlash must not use it and must not upgrade it.
- No reverse proxy, `.local`, public exposure, permission system, Electron, AI/RAG, or existing web service changes in this phase.
- Release assets for v0.2.0: `probeflash-web-v0.2.0.tar.gz`, `probeflash-server-v0.2.0.tar.gz`, `probeflash-dev-tools-v0.2.0.tar.gz`, `SHA256SUMS.txt`.
- `git pull` is allowed only for development/debugging, not as the formal server deployment path.

## Files in this directory

- `env.example`: copy source for `/home/hurricane/probeflash/shared/env/probeflash.env`.
- `install-layout.md`: current `/home/hurricane/probeflash` release layout, plus later `/opt` notes.
- `probeflash.service.template`: later authorized systemd template for the same user-dir layout; it is not required for no-sudo verify.
- `update-rollback-runbook.md`: repo-local release update / rollback plan for the same user-dir layout; it is not a real server update proof.

Repository-side verification:

```bash
cd apps/server && npm run verify:deploy-prep
```

This check only reads repository files. It does not SSH, sudo, install Node, upload files, write `/opt`, or start systemd.

## User-dir layout

Current root: `/home/hurricane/probeflash/`.

```text
/home/hurricane/probeflash/
  current -> /home/hurricane/probeflash/releases/v0.2.0/
  releases/v0.2.0/              # immutable unpacked release payload
    apps/server/
    dist/                        # release web assets, served by apps/server when PROBEFLASH_STATIC_DIR points here
  shared/data/                  # SQLite db and WAL/SHM files
  shared/logs/                  # stdout/stderr or manual run logs
  shared/env/probeflash.env     # copied from env.example
  runtime/node/                 # independent Node runtime
```

Details are in `install-layout.md`.

## Release web UI serving

Recommended route for release tarball deployment is **single-process web/API serving**:

- Start `apps/server` with `PROBEFLASH_PORT=4100` and `PROBEFLASH_STATIC_DIR=/home/hurricane/probeflash/current/dist`.
- Browser entry: `http://192.168.2.2:4100/`.
- API entry: `http://192.168.2.2:4100/api/health` and the existing `/api/*` contract.
- `/api` is handled before static files; API routes are not changed and are not proxied.
- Non-API `GET` / `HEAD` requests are served from the dist directory; missing SPA routes fall back to `index.html`.
- Missing asset paths such as `/assets/missing.js` return 404 instead of falling back to `index.html`.
- If `PROBEFLASH_STATIC_DIR` is unset, `apps/server` remains API-only; this preserves local `dev-start.sh` and Vite proxy mode.

Comparison summary:

| Option | Shape | Decision |
|---|---|---|
| A | backend on `4100`, separate Node static web proxy on `4173`, `/api` proxy to `4100` | Kept as historical smoke / fallback. Works no-sudo and avoids 80, but adds a second process and a proxy failure surface for later systemd. |
| B | `apps/server` serves `/api` and `dist` on single port `4100` | Recommended. One process, no 80, no framework, easier systemd, no API contract change, release layout stays clear via `PROBEFLASH_STATIC_DIR`. |
| C | only deploy backend; web remains on dev machine or future reverse proxy | Not recommended for release tarball verification because it does not prove LAN Web UI access from the server release. |

## Independent runtime strategy

Must do:

- Do not change `/usr/bin/node`.
- Do not run `apt upgrade nodejs` for ProbeFlash.
- Do not use server system Node `v10.19.0`.
- Install or unpack an independent runtime at `/home/hurricane/probeflash/runtime/node/`.
- Start ProbeFlash with `/home/hurricane/probeflash/runtime/node/bin/node`.
- Keep runtime replacement independent from the OS and existing web services.

Recommended runtime: Node 24 LTS under `/home/hurricane/probeflash/runtime/node/`. Node 22 LTS is acceptable only if it is at least `v22.13.0`; earlier `v22.5.0` builds require the old `--experimental-sqlite` gate. Current code imports `DatabaseSync` from `node:sqlite`, so Node 10/18/20 cannot run this backend. As of the official Node docs checked on 2026-04-25, `node:sqlite` was added in `v22.5.0`, became available without `--experimental-sqlite` in `v22.13.0`, and is still not fully stable in every maintained line; treat it as a deliberate S3 risk and pin the runtime version used for deployment.

Official references used for this prep:

- Node release status: https://nodejs.org/en/about/previous-releases
- `node:sqlite` history and stability: https://nodejs.org/api/sqlite.html

## Port and host strategy

- Do not use port `80`; it is already occupied by filebrowser.
- Default release web/API server port: `4100` (`PROBEFLASH_PORT=4100`).
- No-sudo LAN verify may bind `PROBEFLASH_HOST=0.0.0.0`.
- Local-only smoke can bind `PROBEFLASH_HOST=127.0.0.1`.
- Historical local smoke used `4173` as a temporary web entry and `4100` for API/storage. Release tarball deployment should now prefer single-port `4100` with `PROBEFLASH_STATIC_DIR`; keep `4173` only as a fallback diagnostic, not the formal route.

Current `apps/server` service is the API/storage server and can also serve the release `dist` when `PROBEFLASH_STATIC_DIR` is set. It does not claim that true server deployment is complete by itself; the deployment verification task must still verify the actual server entry, API path, SQLite persistence, restart behavior, and filebrowser:80 boundary truthfully.

## No-sudo deploy verify checklist

Do not run these steps from this docs-only prep. They are the intended checklist for `S3-SERVER-RELEASE-USER-DIR-DEPLOY-VERIFY` only after the user confirms SSH, release download or upload method, write path, process start, and 4100 port boundaries.

1. Confirm target user is `hurricane` and no sudo/systemd action is authorized for this step.
2. Create only the user-dir tree under `/home/hurricane/probeflash/{releases,shared/{data,logs,env},runtime}`.
3. Download the fixed GitHub Release assets on the server, or upload the exact assets from a trusted local machine.
4. Verify `SHA256SUMS.txt` before unpacking; do not run unverified tarballs.
5. Put independent Node under `/home/hurricane/probeflash/runtime/node/` and verify `/home/hurricane/probeflash/runtime/node/bin/node --version`.
6. Unpack the release into `/home/hurricane/probeflash/releases/v0.2.0/` and point `/home/hurricane/probeflash/current` to it.
7. Copy `env.example` to `/home/hurricane/probeflash/shared/env/probeflash.env` and review host/port/db/workspace values.
8. Confirm `PROBEFLASH_STATIC_DIR=/home/hurricane/probeflash/current/dist` points at the unpacked web release.
9. Start a temporary user-owned ProbeFlash process with the independent runtime; do not create a systemd service in this step.
10. Verify `/`, `/api/health`, a missing SPA route, SQLite persistence, logs, restart behavior, LAN access, and the old port 80 service.

## Release update / rollback rule

- Detailed runbook: `update-rollback-runbook.md`.
- Update by downloading a new release, verifying SHA256, unpacking to `/home/hurricane/probeflash/releases/vX.Y.Z/`, switching `current`, restarting, and checking health / version / Web UI / SQLite readback.
- Rollback by switching `current` back to the previous release, restarting, and re-running the same checks.
- Never keep SQLite, env files, logs, or Node runtime inside a release directory; keep them under `shared/` and `runtime/` so they survive release replacement.

## Diagnostics bundle

`DEP-09-LOGS-DIAGNOSTICS-BUNDLE` adds a local-only diagnostics command:

```bash
cd apps/server && npm run diagnostics:bundle -- --base-url http://127.0.0.1:4100 --log-dir /home/hurricane/probeflash/shared/logs --out /home/hurricane/probeflash/shared/logs/diagnostics
```

- The command writes a reviewable `diagnostics.json` and `summary.md`; it does not upload anything.
- It captures `/api/health`, `/api/version`, local release metadata, runtime summary, and `.log` / `.txt` tails from allowed ProbeFlash log roots only.
- Allowed log roots are `apps/server/.runtime/` and `/home/hurricane/probeflash/shared/logs`; arbitrary directories are rejected.
- Log tails are redacted for authorization headers, API keys, tokens, secrets, and passwords before writing the bundle.
- The command is diagnostic only; it does not restart services, edit data, repair SQLite, run sudo, call systemd, or touch port `80`.

## Later authorized systemd route

`probeflash.service.template` is only for `S3-SERVER-SYSTEMD-AUTOSTART-PREP` / `S3-SERVER-SYSTEMD-AUTOSTART-VERIFY` after no-sudo user-dir verification succeeds and the user explicitly authorizes sudo/systemd work.

- The template points to `/home/hurricane/probeflash`, not `/opt/probeflash`.
- Installing it requires writing `/etc/systemd/system/probeflash.service`; that is not part of no-sudo verify.
- `systemctl daemon-reload`, `enable`, `start`, `status`, and `journalctl` are all later authorized steps, not current repo-local prep.

## Later / formal install / optional hardening

`/opt/probeflash` is a later formal install or hardening option only. It must not be treated as the current first deployment target. Do not move to `/opt`, reverse proxy, `.local`, or 80/443 until user-dir no-sudo verification and any authorized systemd verification are complete.

## Current env support

The server currently reads these deployment env vars:

- `PROBEFLASH_HOST`
- `PROBEFLASH_PORT`
- `PROBEFLASH_STATIC_DIR` (optional; set to `/home/hurricane/probeflash/current/dist` for release web serving)
- `PROBEFLASH_DB_PATH`
- `PROBEFLASH_LOG_DIR` (directory is created and logged; service stdout/stderr are controlled by the selected runtime method)
- `PROBEFLASH_WORKSPACE_ID`
- `PROBEFLASH_WORKSPACE_NAME`

Defaults remain local-dev friendly in code: host `127.0.0.1`, port `4100`, DB under `apps/server/.runtime/`, workspace `workspace-26-r1 / 26年 R1`. Deployment env overrides must use the explicit user-dir values above.

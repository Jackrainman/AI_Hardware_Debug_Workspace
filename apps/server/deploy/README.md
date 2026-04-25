# ProbeFlash S3 independent server deploy prep

本目录是 `S3-SERVER-INDEPENDENT-DEPLOY-PREP` 的可执行材料入口。它只准备后续部署验证所需的 layout / env / systemd 模板；本轮不 SSH、不上传、不 sudo、不启动 systemd、不验证 LAN。

## Fixed facts and non-goals

- Target server: `192.168.2.2`, Ubuntu 20.04.6 LTS.
- Port 80 is already occupied by an existing web service; ProbeFlash must not use or change it.
- Server system Node is `v10.19.0`; ProbeFlash must not use it and must not upgrade it.
- `systemd` is available; `sqlite3` CLI is not installed, but current backend uses Node built-in `node:sqlite`, not the sqlite3 CLI.
- No reverse proxy, `.local`, public exposure, permission system, Electron, AI/RAG, or existing web service changes in this phase.

## Files in this directory

- `env.example`: copy source for `/opt/probeflash/shared/env/probeflash.env`.
- `probeflash.service.template`: systemd service template for the independent ProbeFlash server process.
- `install-layout.md`: recommended `/opt/probeflash` directory layout, ownership and symlink rules.

Repository-side verification before the real deployment task:

```bash
cd apps/server && npm run verify:deploy-prep
```

This check only reads repository files. It does not SSH, sudo, install Node, or start systemd.

## Independent directory layout

Recommended root: `/opt/probeflash/`.

```text
/opt/probeflash/
  current -> /opt/probeflash/releases/<release-id>/
  releases/<release-id>/        # app code for one immutable release
  shared/data/                  # SQLite db and WAL/SHM files
  shared/logs/                  # service stdout/stderr append logs
  shared/env/probeflash.env     # EnvironmentFile, copied from env.example
  runtime/node/                 # independent Node runtime
```

Details and ownership recommendations are in `install-layout.md`.

## Independent runtime strategy

Must do:

- Do not change `/usr/bin/node`.
- Do not run `apt upgrade nodejs` for ProbeFlash.
- Install or unpack an independent runtime at `/opt/probeflash/runtime/node/`.
- `ExecStart` must use `/opt/probeflash/runtime/node/bin/node` with an absolute path.
- Keep runtime replacement independent from the OS and existing web services.

Recommended runtime: Node 24 LTS under `/opt/probeflash/runtime/node/`. Node 22 LTS is acceptable only if it is at least `v22.13.0`; earlier `v22.5.0` builds require the old `--experimental-sqlite` gate. Current code imports `DatabaseSync` from `node:sqlite`, so Node 10/18/20 cannot run this backend. As of the official Node docs checked on 2026-04-25, `node:sqlite` was added in `v22.5.0`, became available without `--experimental-sqlite` in `v22.13.0`, and is still not fully stable in every maintained line; treat it as a deliberate S3 risk and pin the runtime version used for deployment.

Official references used for this prep:

- Node release status: https://nodejs.org/en/about/previous-releases
- `node:sqlite` history and stability: https://nodejs.org/api/sqlite.html

## Independent port strategy

- Do not use port 80.
- Default API/storage server port: `4100` (`PROBEFLASH_PORT=4100`).
- Local-only smoke can bind `PROBEFLASH_HOST=127.0.0.1`.
- LAN access must bind `PROBEFLASH_HOST=0.0.0.0` or use another explicit safe exposure method.
- Temporary web/API split, if needed by the next verification task: reserve `4173` for a web entry and `4100` for API/storage. This is a temporary方案 only; do not call it a reverse proxy or `.local` solution.

Current `apps/server` service is the API/storage server. It does not claim that LAN web UI deployment is complete by itself; the next task must verify the selected web entry and API path truthfully.

## Minimal deploy flow for the next task

Do not run these commands in this prep task. They are the intended checklist for `S3-SERVER-INDEPENDENT-DEPLOY-VERIFY` after a human confirms the boundary.

1. Confirm target user and sudo boundary.
2. Create `/opt/probeflash/{releases,shared/{data,logs,env},runtime}`.
3. Put independent Node under `/opt/probeflash/runtime/node/` and verify `/opt/probeflash/runtime/node/bin/node --version`.
4. Copy a release into `/opt/probeflash/releases/<release-id>/` and point `/opt/probeflash/current` to it.
5. Copy `env.example` to `/opt/probeflash/shared/env/probeflash.env` and review host/port/db/workspace values.
6. Render `probeflash.service.template` by replacing `{{PROBEFLASH_USER}}` and `{{PROBEFLASH_GROUP}}`.
7. Install the rendered unit as `/etc/systemd/system/probeflash.service`.
8. Run daemon reload / enable / start only during the verify task.
9. Verify `/api/health`, SQLite persistence, logs, restart behavior, LAN access, and the old port 80 service.

## Pre-deploy checklist

Before touching the real server, confirm and record:

- `whoami` and intended service account / group.
- `/opt/probeflash/runtime/node/bin/node --version` and that it is Node 24 LTS or accepted Node 22 LTS (`>=22.13.0`).
- `command -v node` may still show `/usr/bin/node v10.19.0`; that is OK and must not be changed.
- `ss -ltnp | grep -E ':(80|4100|4173)\b'` or equivalent port occupancy check.
- `/opt/probeflash/shared/data` is writable by the service account.
- `/opt/probeflash/shared/logs` is writable / appendable.
- `/opt/probeflash/shared/env/probeflash.env` is readable by the service account.
- `systemctl --version` confirms systemd is available.
- DB file can be created by the service account; sqlite3 CLI is not required.
- Existing port 80 web service still responds before and after ProbeFlash changes.

## Rollback boundary

If the new service fails during the next task:

- Stop only the new service: `systemctl stop probeflash.service`.
- Disable only the new service if needed: `systemctl disable probeflash.service`.
- Inspect logs through `journalctl -u probeflash.service` and `/opt/probeflash/shared/logs/`.
- Roll back code by repointing `/opt/probeflash/current` to the previous release.
- Do not delete `/opt/probeflash/shared/data/`; SQLite data is outside release directories by design.
- Do not change or restart the existing port 80 service as part of ProbeFlash rollback.

## Current env support

The server currently reads these deployment env vars:

- `PROBEFLASH_HOST`
- `PROBEFLASH_PORT`
- `PROBEFLASH_DB_PATH`
- `PROBEFLASH_LOG_DIR` (directory is created and logged; service stdout/stderr are controlled by systemd)
- `PROBEFLASH_WORKSPACE_ID`
- `PROBEFLASH_WORKSPACE_NAME`

Defaults remain local-dev friendly: host `127.0.0.1`, port `4100`, DB under `apps/server/.runtime/`, workspace `workspace-26-r1 / 26年 R1`.

# ProbeFlash server deploy docs

本目录是服务器部署材料入口。当前可执行路线是 `S3-SERVER-USER-DIR-DEPLOY-VERIFY`：先在 `/home/hurricane/probeflash` 做 no-sudo 用户目录验证。本目录修改只影响仓库内文档、env 示例、systemd 后续模板与静态校验；不 SSH、不上传、不 sudo、不写 `/opt`、不启动 systemd、不验证 LAN。

## Current route: user-dir no-sudo verify

- Target server: `192.168.2.2`, Ubuntu 20.04.6 LTS, SSH user `hurricane`.
- Deploy root: `/home/hurricane/probeflash`.
- Runtime: `/home/hurricane/probeflash/runtime/node/bin/node`.
- Data file: `/home/hurricane/probeflash/shared/data/probeflash.sqlite`.
- Env file: `/home/hurricane/probeflash/shared/env/probeflash.env`.
- Port: `4100`; do not use or change port `80`.
- Host: no-sudo LAN verify may bind `PROBEFLASH_HOST=0.0.0.0`, then test `http://192.168.2.2:4100/`.
- Server system Node is `v10.19.0`; ProbeFlash must not use it and must not upgrade it.
- No reverse proxy, `.local`, public exposure, permission system, Electron, AI/RAG, or existing web service changes in this phase.

## Files in this directory

- `env.example`: copy source for `/home/hurricane/probeflash/shared/env/probeflash.env`.
- `install-layout.md`: current `/home/hurricane/probeflash` user-dir layout, plus later `/opt` notes.
- `probeflash.service.template`: later authorized systemd template for the same user-dir layout; it is not required for no-sudo verify.

Repository-side verification:

```bash
cd apps/server && npm run verify:deploy-prep
```

This check only reads repository files. It does not SSH, sudo, install Node, upload files, write `/opt`, or start systemd.

## User-dir layout

Current root: `/home/hurricane/probeflash/`.

```text
/home/hurricane/probeflash/
  current -> /home/hurricane/probeflash/releases/<release-id>/
  releases/<release-id>/        # app code for one immutable release
  shared/data/                  # SQLite db and WAL/SHM files
  shared/logs/                  # stdout/stderr or manual run logs
  shared/env/probeflash.env     # copied from env.example
  runtime/node/                 # independent Node runtime
```

Details are in `install-layout.md`.

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
- Default API/storage server port: `4100` (`PROBEFLASH_PORT=4100`).
- No-sudo LAN verify may bind `PROBEFLASH_HOST=0.0.0.0`.
- Local-only smoke can bind `PROBEFLASH_HOST=127.0.0.1`.
- Temporary web/API split, if needed by a later verification task: reserve `4173` for a web entry and `4100` for API/storage. This is temporary only; do not call it a reverse proxy or `.local` solution.

Current `apps/server` service is the API/storage server. It does not claim that LAN web UI deployment is complete by itself; the deployment verification task must verify the selected web entry and API path truthfully.

## No-sudo deploy verify checklist

Do not run these steps from this docs-only prep. They are the intended checklist for `S3-SERVER-USER-DIR-DEPLOY-VERIFY` only after the user confirms SSH, upload, write path, process start, and 4100 port boundaries.

1. Confirm target user is `hurricane` and no sudo/systemd action is authorized for this step.
2. Create only the user-dir tree under `/home/hurricane/probeflash/{releases,shared/{data,logs,env},runtime}`.
3. Put independent Node under `/home/hurricane/probeflash/runtime/node/` and verify `/home/hurricane/probeflash/runtime/node/bin/node --version`.
4. Copy a release into `/home/hurricane/probeflash/releases/<release-id>/` and point `/home/hurricane/probeflash/current` to it.
5. Copy `env.example` to `/home/hurricane/probeflash/shared/env/probeflash.env` and review host/port/db/workspace values.
6. Start a temporary user-owned ProbeFlash process with the independent runtime; do not create a systemd service in this step.
7. Verify `/api/health`, SQLite persistence, logs, restart behavior, LAN access, and the old port 80 service.

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
- `PROBEFLASH_DB_PATH`
- `PROBEFLASH_LOG_DIR` (directory is created and logged; service stdout/stderr are controlled by the selected runtime method)
- `PROBEFLASH_WORKSPACE_ID`
- `PROBEFLASH_WORKSPACE_NAME`

Defaults remain local-dev friendly in code: host `127.0.0.1`, port `4100`, DB under `apps/server/.runtime/`, workspace `workspace-26-r1 / 26年 R1`. Deployment env overrides must use the explicit user-dir values above.

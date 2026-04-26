# ProbeFlash install layout

本文件定义当前真实部署验证采用的 release tarball 用户目录布局。当前任务不创建服务器目录、不上传文件、不执行 sudo、不安装 systemd。

## Current user-dir layout

Current root: `/home/hurricane/probeflash`.

```text
/home/hurricane/probeflash/
  current -> /home/hurricane/probeflash/releases/v0.2.0/
  releases/
    v0.2.0/
      apps/server/
      dist/
        index.html
        assets/
      release metadata / package files as needed
  shared/
    data/
      probeflash.sqlite
      probeflash.sqlite-wal
      probeflash.sqlite-shm
    logs/
      probeflash.log
      probeflash.err.log
    env/
      probeflash.env
  runtime/
    node/
      bin/node
      bin/npm
```

## What goes where

- Release payload: `/home/hurricane/probeflash/releases/vX.Y.Z/`; `/home/hurricane/probeflash/current` is the symlink to the active release.
- Release source: fixed GitHub Release assets such as `probeflash-web-v0.2.0.tar.gz`, `probeflash-server-v0.2.0.tar.gz`, `probeflash-dev-tools-v0.2.0.tar.gz`, verified with `SHA256SUMS.txt` before unpacking.
- Web dist: `/home/hurricane/probeflash/current/dist`; set `PROBEFLASH_STATIC_DIR` to this path so `apps/server` serves the SPA and `/api` on single port `4100`.
- SQLite data: `/home/hurricane/probeflash/shared/data/probeflash.sqlite`; WAL/SHM sidecar files stay in the same directory.
- Logs: `/home/hurricane/probeflash/shared/logs/`; no-sudo verify may write process logs here, and later systemd can append stdout/stderr here.
- Env: `/home/hurricane/probeflash/shared/env/probeflash.env`; copy from `apps/server/deploy/env.example`.
- Node runtime: `/home/hurricane/probeflash/runtime/node/`; must be independent and must not use `/usr/bin/node`.
- Formal deployment must not depend on a server-side `git checkout` or `git pull`; those are development/debugging shortcuts only.

## Ownership and permissions

No-sudo verify uses the existing `hurricane` user and stays under `/home/hurricane`:

- `/home/hurricane/probeflash/releases/`: writable by `hurricane` during upload / release unpack.
- `/home/hurricane/probeflash/current`: updated by `hurricane` as a symlink.
- `/home/hurricane/probeflash/shared/data/`: readable and writable by the ProbeFlash process.
- `/home/hurricane/probeflash/shared/logs/`: writable by the ProbeFlash process.
- `/home/hurricane/probeflash/shared/env/probeflash.env`: readable by the ProbeFlash process; keep it outside release directories.
- `/home/hurricane/probeflash/runtime/node/`: readable and executable by the ProbeFlash process.

Minimum no-sudo expectation: files are owned by `hurricane:hurricane`. Do not introduce root-owned files in the user-dir verify step.

## current symlink rule

Publish a release by preparing `/home/hurricane/probeflash/releases/<new-release-id>/`, then atomically switching the user-owned symlink:

```bash
ln -sfn /home/hurricane/probeflash/releases/<new-release-id> /home/hurricane/probeflash/current
```

Rollback only points `current` back to the previous release. Do not delete `/home/hurricane/probeflash/shared/data/`.

## Persistent shared paths

Release replacement must not delete or overwrite these paths:

- `/home/hurricane/probeflash/shared/data/`
- `/home/hurricane/probeflash/shared/logs/`
- `/home/hurricane/probeflash/shared/env/`
- `/home/hurricane/probeflash/runtime/node/`

## Web/API port rule

Release deployment should use one no-sudo process on port `4100`:

- `http://192.168.2.2:4100/` serves `current/dist/index.html`.
- `http://192.168.2.2:4100/api/health` stays on the existing backend API contract.
- Missing SPA routes fall back to `index.html`; missing asset files return 404.
- Leave `PROBEFLASH_STATIC_DIR` unset for local Vite dev / API-only smoke so `dev-start.sh` still uses Vite on `5173` with `/api` proxying to `4100`.

## Later formal install option

`/opt/probeflash` is a later / formal install / optional hardening path, not the current first step. Moving to `/opt` would require explicit sudo and ownership decisions, so it must happen only after user-dir no-sudo verification and user authorization.

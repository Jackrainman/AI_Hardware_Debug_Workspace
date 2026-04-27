# ProbeFlash release update / rollback runbook

This runbook is the repository-side plan for `DEP-07-RELEASE-UPDATE-ROLLBACK-PLAN`. It is not a server execution log and must not be treated as proof that a real server update has completed.

## Scope and safety boundary

- Applies only after `DEP-01-RELEASE-USER-DIR-DEPLOY-VERIFY` proves the release tarball layout under `/home/hurricane/probeflash`.
- Keeps the formal deploy root at `/home/hurricane/probeflash`; do not move to `/opt/probeflash` in this flow.
- Uses fixed GitHub Release tarballs plus `SHA256SUMS.txt`; do not update by server-side `git pull`.
- Uses the independent runtime at `/home/hurricane/probeflash/runtime/node/bin/node`; do not use `/usr/bin/node` or upgrade the server system Node.
- Preserves `/home/hurricane/probeflash/shared/data`, `/home/hurricane/probeflash/shared/env`, `/home/hurricane/probeflash/shared/logs`, and `/home/hurricane/probeflash/runtime` across release replacement.
- Does not perform sudo, systemd installation, reverse proxy changes, 80/443 changes, public exposure, real AI setup, or destructive database migration.

## Stable layout

```text
/home/hurricane/probeflash/
  releases/
    v0.2.0/
    vX.Y.Z/
  current -> /home/hurricane/probeflash/releases/<active-version>/
  shared/data/probeflash.sqlite
  shared/env/probeflash.env
  shared/logs/
  runtime/node/bin/node
```

Only `releases/<version>` and the `current` symlink change during update / rollback. `shared/` and `runtime/` are persistent and must not be deleted by release replacement.

## Pre-update checklist

1. Confirm the user authorized a server update window and that no-sudo user-dir deployment has already passed.
2. Record the current target of `/home/hurricane/probeflash/current` and the current `/api/version` response.
3. Confirm the existing service entry is still port `4100` and `PROBEFLASH_STATIC_DIR=/home/hurricane/probeflash/current/dist`.
4. Confirm a backup or export exists before changing the active release; this runbook does not delete or rewrite the source SQLite database.
5. Confirm the new release version, expected tarball names, and `SHA256SUMS.txt` source.

## Update flow

1. Download or upload the new fixed release assets into a staging directory outside `shared/`.
2. Verify every tarball against `SHA256SUMS.txt` before unpacking.
3. Unpack the new web and server payloads into `/home/hurricane/probeflash/releases/<new-version>/`.
4. Keep `shared/env/probeflash.env` unchanged unless the release notes require a reviewed env change.
5. Switch `current` atomically with `ln -sfn /home/hurricane/probeflash/releases/<new-version> /home/hurricane/probeflash/current`.
6. Restart the existing user-owned ProbeFlash process or, after later systemd authorization, restart the `probeflash` service.
7. Run the post-switch checks below before declaring the update successful.

## Post-switch checks

1. `GET http://127.0.0.1:4100/api/health` returns ok and identifies the expected storage path.
2. `GET http://127.0.0.1:4100/api/version` matches the intended release metadata.
3. `GET http://127.0.0.1:4100/` serves the release Web UI from `current/dist`.
4. `GET http://127.0.0.1:4100/assets/missing.js` returns 404 rather than `index.html`.
5. `GET http://192.168.2.2:4100/` and `/api/health` work from the LAN when the user authorized LAN verification.
6. Create or reopen a workspace and issue, restart the process, then read the same data back from `shared/data/probeflash.sqlite`.
7. Confirm filebrowser on port `80` is still unaffected.

## Rollback flow

1. Stop or pause the current ProbeFlash process if the failed release is still running.
2. Switch `current` back to the previously recorded release with `ln -sfn /home/hurricane/probeflash/releases/<previous-version> /home/hurricane/probeflash/current`.
3. Restart the user-owned process or later authorized systemd service.
4. Re-run the same health, version, Web UI, LAN, and SQLite readback checks.
5. Keep the failed release directory for inspection unless the user explicitly authorizes cleanup.

## Failure handling

- If SHA256 verification fails, do not unpack or run the release.
- If `current/dist` is missing, roll back before touching `shared/`.
- If `/api/health` fails after switch, capture logs under `shared/logs/`, roll back, and mark the update failed.
- If SQLite readback fails, do not retry destructive repair; create a repair task and preserve the database files.
- If rollback also fails, stop and require user intervention. Do not attempt sudo/systemd, `/opt`, 80/443, nginx/Caddy, or production data edits as an unattended fix.

## Completion definition

- Update succeeds only when `current` points to the intended release, Web UI and `/api` work on port `4100`, version metadata matches, and SQLite data survives restart / readback.
- Rollback succeeds only when `current` points back to the previous release and the same checks pass.
- The runbook is planning-complete when these steps are documented and repository static verification confirms the safety boundaries.

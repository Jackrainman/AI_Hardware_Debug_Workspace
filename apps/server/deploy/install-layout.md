# ProbeFlash independent install layout

本文件只定义后续真实部署时推荐采用的目录布局；本轮不创建服务器目录、不上传文件、不执行 sudo。

## Recommended layout

```text
/opt/probeflash/
  current -> /opt/probeflash/releases/<release-id>/
  releases/
    <release-id>/
      apps/
        server/
        desktop/
      docs/
      package metadata / release notes as needed
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

- App code: `/opt/probeflash/releases/<release-id>/`；`/opt/probeflash/current` 是指向当前 release 的 symlink。
- SQLite data: `/opt/probeflash/shared/data/probeflash.sqlite`；WAL/SHM sidecar files stay in the same directory.
- Logs: `/opt/probeflash/shared/logs/`；systemd 模板把 stdout/stderr 追加到该目录，同时可用 `journalctl -u probeflash` 查看。
- Env: `/opt/probeflash/shared/env/probeflash.env`；由 `apps/server/deploy/env.example` 复制生成。
- Node runtime: `/opt/probeflash/runtime/node/`；必须是独立 runtime，不使用 `/usr/bin/node`。

## Ownership and permissions

建议创建专用服务账号，例如 `probeflash`（实际用户名由部署人确认，不在模板中写死）：

- `/opt/probeflash/releases/`：可由部署用户写入，服务账号只需读取。
- `/opt/probeflash/current`：由部署流程更新 symlink，服务账号只需读取。
- `/opt/probeflash/shared/data/`：服务账号必须可读写。
- `/opt/probeflash/shared/logs/`：服务账号必须可写；若 systemd 以 root 打开 append 文件后降权，也仍建议保持服务账号可写，便于人工排查。
- `/opt/probeflash/shared/env/probeflash.env`：服务账号可读，普通用户不可随意写。
- `/opt/probeflash/runtime/node/`：服务账号只需读取和执行。

最小建议：目录归属 `probeflash:probeflash`，env 文件 `0640`，data/logs 目录 `0750` 或按现场运维规范收紧。

## current symlink rule

发布新版本时先准备 `/opt/probeflash/releases/<new-release-id>/`，验证文件完整后再原子切换：

```bash
ln -sfn /opt/probeflash/releases/<new-release-id> /opt/probeflash/current
```

回滚时只把 `current` 指回上一个 release；不要删除 `/opt/probeflash/shared/data/`。

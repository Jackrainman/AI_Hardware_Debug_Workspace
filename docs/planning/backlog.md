# 待办池（Backlog）

> Backlog 只存**未开做候选与串行认领队列**。当前唯一主线任务看 `docs/planning/current.md`；机读顺序、依赖、验证要求与详细执行边界看 `.agent-state/handoff.json.pending_task_queue`。

## 当前阶段
- S3：存储迁移与服务器化。
- 大目标：把 D1 的浏览器 SPA + `window.localStorage` 演示版，迁移为“战队局域网可访问 + 服务端长期存储”的版本。
- 当前技术路线：**先架构缝合，再本地 WSL 闭环，再服务器独立部署验证**。
- 当前访问口径分层：
  - 本地联调：前端请求 `/api`，已通过 Vite proxy 转发到 `http://127.0.0.1:4100`。
  - 独立部署：继续按 `http://192.168.2.2:<port>/` 理解；不抢占 80 端口，不优先做 `.local` / 反向代理美化。

## 认领规则
1. AI 只能从下列队列中认领 **第一个依赖已满足且未完成** 的原子任务。
2. 每次只允许一个任务处于执行中；完成前必须做最小验证、planning sync、单任务 commit。
3. 若发现队列顺序、依赖或约束与真实仓库状态脱节，先修 `current.md` / `handoff.json` / 本文件，再继续。
4. 架构类任务不能只产出分析结论，必须附带工程化验证要求；涉及 `storage / repository / closeout / adapter / backend scaffold` 时必须同时覆盖成功态与失败态。
5. `pending_task_queue` 现在只保留**剩余未完成任务**；已完成任务只保留在 `.agent-state/handoff.json.completed_atomic_tasks` 中，不再重复混入 pending queue。

## S3 剩余串行原子任务队列

> 已完成前置：`S3-ARCH-ASYNC-STORAGE-PORT`、`S3-ARCH-CLOSEOUT-ORCHESTRATOR`、`S3-ARCH-UNIFIED-STORAGE-ERROR-STATE`、`S3-LOCAL-BACKEND-SCAFFOLD`、`S3-LOCAL-HTTP-STORAGE-ADAPTER`、`S3-LOCAL-END-TO-END-VERIFY`、`S3-SERVER-INDEPENDENT-DEPLOY-PREP`、`S3-WORKSPACE-CREATE-MINIMAL`。当前只剩 1 项主线队列。

### 1. S3-SERVER-INDEPENDENT-DEPLOY-VERIFY
- **目标**：把“本地已验证方案 + 已准备的独立部署材料”部署到服务器独立端口，由 systemd 拉起，并验证局域网设备可访问、SQLite 数据可持续、现有 80 端口服务不受影响。
- **前置依赖**：
  - `S3-SERVER-INDEPENDENT-DEPLOY-PREP` 已完成
  - 已有独立 runtime、独立目录、独立 service 模板、env 模板、目录布局说明与回滚边界
  - 本地方案已通过 `S3-LOCAL-END-TO-END-VERIFY`
- **直接输入文件 / 环境**：
  - 目标服务器 `192.168.2.2`
  - `apps/server/deploy/README.md`
  - `apps/server/deploy/install-layout.md`
  - `apps/server/deploy/env.example`
  - `apps/server/deploy/probeflash.service.template`
  - 独立 Node runtime 包 / 应用产物 / 人工确认的登录与 sudo 边界
- **执行拆解**：
  1. 部署前人工确认：SSH / 登录方式、sudo 边界、服务账号与 group、`/opt/probeflash` 创建权限、4100 端口可用性、是否允许安装独立 Node runtime、是否允许新增并启动 `probeflash.service`。
  2. 将 runtime + 应用产物复制到独立目录，不覆盖现有 Web 服务目录。
  3. 安装 / 更新独立 systemd service，执行 daemon-reload、enable、start 或等价流程。
  4. 在服务器本机先验证：服务是否监听预定独立端口、`/api/health` 是否返回 ok。
  5. 在局域网设备验证：`http://192.168.2.2:4100/` 或等价入口是否可访问，主路径是否仍落到服务器 SQLite。
  6. 验证重启 / 拉起：`systemctl restart` 后服务恢复，SQLite 数据仍可读回。
  7. 验证旁路不受影响：现有 80 端口服务仍正常。
  8. 若失败，按预先定义的回滚边界撤回新 service / 新目录变更，不影响旧服务。
- **预期改动点**：
  - 仓库内通常只会补 deployment notes / planning sync / 必要的 deploy 材料修补
  - 真实部署动作发生在服务器文件系统与 systemd 环境，不在仓库内伪造“已部署完成”
- **明确不做项**：
  - 不抢占 80 端口
  - 不修改现有服务依赖的系统 Node
  - 不把 localStorage 演示版说成服务器化完成
  - 不顺手做 `.local` / 反向代理美化
  - 未获人工确认前不默认执行 SSH / sudo / 上传 / systemd 操作
- **工程化验证**：
  - `systemctl status probeflash.service` / `journalctl -u probeflash.service`
  - `curl http://127.0.0.1:4100/api/health`（服务器本机）
  - `curl http://192.168.2.2:4100/api/health` 或等价局域网检查
  - 局域网设备访问 smoke
  - 服务重启后 SQLite 数据仍可读回
  - 确认 80 端口既有服务不受影响（端口监听与页面响应）
  - 失败时执行回滚并确认旧服务仍正常
- **完成定义**：
  - 局域网设备可通过独立端口访问 ProbeFlash
  - 服务端长期存储生效并可跨服务重启读回
  - 既有服务不受影响
  - S3 的“服务器独立部署最小闭环”成立
- **完成后下一任务**：无；后续再评估 `.local` / 反向代理美化、复杂项目管理或更深层服务器化能力。

## 当前先不做
- 不做 AI、RAG、embedding、相似问题向量检索或自治 agent。
- 不做权限系统、账号体系、多租户、复杂协同或公网暴露。
- 不做 Electron / preload / fs / IPC，不把 `.debug_workspace` 文件写盘当作当前 S3 主线。
- 不做大 UI 重构，不改变 D1 已通过 smoke 的主流程，除非当前原子任务明确要求最小适配。
- 不做离线队列、冲突合并、实时协作。

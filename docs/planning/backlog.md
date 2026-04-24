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
5. `pending_task_queue` 现在只保留**剩余未完成任务**；已完成的 `S3-ARCH-*`、`S3-LOCAL-BACKEND-SCAFFOLD`、`S3-LOCAL-HTTP-STORAGE-ADAPTER` 只保留在 `completed_atomic_tasks` 中，不再重复混入 pending queue。

## S3 剩余串行原子任务队列

> 已完成前置：`S3-ARCH-ASYNC-STORAGE-PORT`、`S3-ARCH-CLOSEOUT-ORCHESTRATOR`、`S3-ARCH-UNIFIED-STORAGE-ERROR-STATE`、`S3-LOCAL-BACKEND-SCAFFOLD`、`S3-LOCAL-HTTP-STORAGE-ADAPTER`。以下 3 项是当前仅剩的可执行主线队列。

### 1. S3-LOCAL-END-TO-END-VERIFY
- **目标**：验证“前端 -> HTTP -> SQLite”主路径真实跑通，并证明失败态不会伪装成功。
- **前置依赖**：
  - `S3-LOCAL-HTTP-STORAGE-ADAPTER` 已完成；
  - 本地 backend scaffold 与 SQLite 已可独立启动；
  - 当前 D1 主流程仍保持最小可用。
- **直接输入文件**：
  - `apps/desktop/src/App.tsx`
  - `apps/desktop/src/storage/http-*.ts`
  - `apps/desktop/src/storage/storage-repository.ts`
  - `apps/desktop/src/use-cases/closeout-orchestrator.ts`
  - `apps/server/src/server.mjs`
  - `apps/server/src/database.mjs`
  - `apps/server/scripts/verify-s3-local-backend-scaffold.mjs`
  - 当前已有 verify scripts 与可能新增的 adapter / end-to-end verify 脚本
- **执行拆解**：
  1. 固定主路径验证范围：创建问题卡 -> 加载问题卡 / 列表 -> 追加 InvestigationRecord -> closeout -> 读取 archive / error-entry / archived issue。
  2. 明确自动化与 smoke 边界：优先补最薄任务级 verify 脚本，不引入新框架；浏览器人工 smoke 只覆盖 UI 呈现与关键交互闭环。
  3. 若当前验证矩阵仍缺覆盖，补一条 `verify-s3-local-end-to-end` 脚本；它至少要能拉起本地 backend、驱动当前 HTTP storage path，并读回 SQLite 结果。
  4. 验证成功态：问题卡、排查记录、archive、error-entry、issue archived 状态都能通过 HTTP 写入并从 SQLite 读回。
  5. 验证失败态：服务关闭、错误端口、超时、`SERVICE_UNAVAILABLE` / 500 / 409 等情况下，UI 与验证脚本都不能把结果当成功。
  6. 沉淀执行证据与 planning sync，确保服务器阶段只剩“独立部署”问题。
- **预期改动点**：
  - 优先是 `apps/desktop/scripts/verify-*.mts` / `apps/server/scripts/verify-*.mjs`
  - 视验证需要做极小量 smoke helper / fixture 调整
  - 如非必要，不继续改业务代码
- **明确不做项**：
  - 不做服务器部署
  - 不升级系统 Node
  - 不做入口美化 / 反向代理
  - 不把验证任务扩成新的功能开发
- **工程化验证**：
  - `cd apps/server && npm run verify:s3-local-backend-scaffold`
  - `cd apps/desktop && npm run typecheck`
  - `cd apps/desktop && npm run build`
  - `cd apps/desktop && npm run verify:all`
  - `git diff --check`
  - `cd apps/desktop && npm run verify:handoff`
  - 任务级验证：
    - 自动化：前端 storage path / 或对应 verify harness 完整走 issue -> record -> closeout -> SQLite 读回
    - 失败态：服务停机 / 错端口 / 超时 / 写入失败时明确失败
    - 浏览器人工 smoke：确认顶部统一 storage feedback、列表 / 详情 / 结案结果与自动化结论一致
- **完成定义**：
  - 本地 WSL 最小闭环已经通过主路径验证
  - SQLite 中可读回问题卡、记录、归档摘要、错误表条目与 archived 状态
  - 失败态不会冒充成功
  - `S3-SERVER-INDEPENDENT-DEPLOY-PREP` 依赖解除
- **完成后下一任务**：`S3-SERVER-INDEPENDENT-DEPLOY-PREP`

### 2. S3-SERVER-INDEPENDENT-DEPLOY-PREP
- **目标**：只为服务器独立部署做准备，明确独立 runtime / 独立目录 / 独立端口 / 独立 systemd service 的最小可执行方案，不碰系统全局 Node。
- **前置依赖**：
  - `S3-LOCAL-END-TO-END-VERIFY` 已完成
  - 本地方案已验证可跑
  - 现有服务器事实（IP、80 端口占用、systemd 可用、系统 Node 过旧）已在事实源中存在
- **直接输入文件**：
  - `docs/planning/current.md`
  - `.agent-state/handoff.json`
  - `docs/planning/backlog.md`
  - `apps/server/package.json`
  - `apps/server/src/server.mjs`
  - 当前 / 后续会新增的部署脚本、service unit、环境变量模板（如需新增，优先集中在 `apps/server/deploy/` 与 `apps/server/scripts/`）
- **执行拆解**：
  1. 锁定独立 runtime 方案：使用随应用分发或单独放置的 Node 24 运行时，不依赖服务器系统 `node v10.19.0`。
  2. 锁定独立目录：应用目录、数据目录、日志目录、runtime 目录要彼此清晰，且不污染现有服务目录。
  3. 锁定独立端口：明确 ProbeFlash 服务监听的非 80 端口，并记录端口选择依据。
  4. 锁定独立 systemd service：单独 service name、WorkingDirectory、Environment、ExecStart、Restart 策略。
  5. 补齐最小部署材料：安装 / 更新脚本、service unit、目录说明、必要环境变量模板。
  6. 记录执行前置条件：服务器登录用户、sudo 边界、目标路径权限、开放端口 / 防火墙要求、runtime 获取方式。
  7. 在仓库内先完成语法 / 路径 / 引用级验证，不提前上服务器真正部署。
- **预期改动点**：
  - `apps/server/package.json`（如需补部署脚本入口）
  - 新增 `apps/server/deploy/*`（service unit / env 模板 / 目录说明）
  - 新增 `apps/server/scripts/*`（安装 / 启停 / 更新脚本）
  - `docs/planning/current.md` / `.agent-state/handoff.json` / `docs/planning/backlog.md`
- **明确不做项**：
  - 不上服务器执行真实部署
  - 不升级系统 Node
  - 不抢占 80 端口
  - 不改现有 Web 服务 / 反向代理 / `.local`
- **工程化验证**：
  - `git diff --check`
  - 若新增 shell 脚本：至少 `bash -n`
  - 若新增 systemd unit：至少做路径 / 字段 / 依赖检查；若环境可用再做 `systemd-analyze verify`
  - 读回确认端口、工作目录、数据目录、日志目录、runtime 路径在所有文档 / 脚本中一致
  - `cd apps/desktop && npm run verify:handoff`
- **完成定义**：
  - 独立 runtime / 目录 / 端口 / service 方案明确且可执行
  - 部署所需输入信息列全，不再靠临场拍脑袋
  - 仓库内的部署材料位置、命名、职责清晰
  - `S3-SERVER-INDEPENDENT-DEPLOY-VERIFY` 依赖解除
- **完成后下一任务**：`S3-SERVER-INDEPENDENT-DEPLOY-VERIFY`

### 3. S3-SERVER-INDEPENDENT-DEPLOY-VERIFY
- **目标**：把“本地已验证方案”部署到服务器独立端口，由 systemd 拉起，并验证局域网设备可访问、SQLite 数据可持续、现有 80 端口服务不受影响。
- **前置依赖**：
  - `S3-SERVER-INDEPENDENT-DEPLOY-PREP` 已完成
  - 已有独立 runtime、独立目录、独立 service 方案与部署脚本
  - 本地方案已通过 `S3-LOCAL-END-TO-END-VERIFY`
- **直接输入文件 / 环境**：
  - 目标服务器 `192.168.2.2`
  - 部署脚本、service unit、runtime 包、应用产物
  - 服务器上的目标安装目录 / 数据目录 / 日志查看入口
- **执行拆解**：
  1. 将 runtime + 应用产物复制到独立目录，不覆盖现有 Web 服务目录。
  2. 安装 / 更新 systemd service，执行 `daemon-reload`、`enable`、`start` 或等价流程。
  3. 在服务器本机先验证：服务是否监听预定独立端口、`/api/health` 是否返回 ok。
  4. 在局域网设备验证：`http://192.168.2.2:<port>/` 或等价入口是否可访问，主路径是否仍落到服务器 SQLite。
  5. 验证重启 / 拉起：`systemctl restart` 后服务恢复，SQLite 数据仍可读回。
  6. 验证旁路不受影响：现有 80 端口服务仍正常。
  7. 若失败，按预先定义的回滚边界撤回新 service / 新目录变更，不影响旧服务。
- **预期改动点**：
  - 仓库内通常只会补 deployment notes / planning sync / 必要的 deploy 脚本修补
  - 真实部署动作发生在服务器文件系统与 systemd 环境，不在仓库内伪造“已部署完成”
- **明确不做项**：
  - 不抢占 80 端口
  - 不修改现有服务依赖的系统 Node
  - 不把静态演示版或 localStorage 说成服务器化完成
  - 不顺手做 `.local` / 反向代理美化
- **工程化验证**：
  - `systemctl status <service>` / `journalctl -u <service>`
  - `curl http://127.0.0.1:<port>/api/health`（服务器本机）
  - `curl http://192.168.2.2:<port>/api/health` 或等价局域网检查
  - 局域网设备访问 smoke
  - 服务重启后 SQLite 数据仍可读回
  - 确认 80 端口既有服务不受影响（端口监听与页面响应）
  - 失败时执行回滚并确认旧服务仍正常
- **完成定义**：
  - 局域网设备可通过独立端口访问 ProbeFlash
  - 服务端长期存储生效并可跨服务重启读回
  - 现有 80 端口服务不受影响
  - S3 的“服务器独立部署最小闭环”成立
- **完成后下一任务**：无；后续再评估 `.local` / 反向代理美化、多 workspace 或更深层服务器化能力。

## 当前先不做
- 不做 AI、RAG、embedding、相似问题向量检索或自治 agent。
- 不做权限系统、账号体系、多租户、复杂协同或公网暴露。
- 不做 Electron / preload / fs / IPC，不把 `.debug_workspace` 文件写盘当作当前 S3 主线。
- 不做大 UI 重构，不改变 D1 已通过 smoke 的主流程，除非当前原子任务明确要求最小适配。
- 不做离线队列、冲突合并、实时协作。

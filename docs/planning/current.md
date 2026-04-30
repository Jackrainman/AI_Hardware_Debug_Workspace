# 当前执行面板（Current）

> 本文件只维护当前阶段目标、前沿任务窗口、唯一主线原子任务与下一任务选择规则。快速状态索引见 `docs/planning/status.md`，但它不是最终事实源；完整产品路线图见 `docs/planning/product-roadmap.md`；候选池与节奏见 `docs/planning/backlog.md`；机读状态见 `.agent-state/handoff.json`。v0.2.0 前历史专项输入已归档到 `docs/archive/v0.2-closeout/`，默认不读。

## 当前阶段
- 阶段：**R1：长期产品路线图执行启动**。
- 当前模式：`server_storage_migration`（保留服务器部署安全边界）。
- 阶段目标：以 v0.2.x 已完成的本地 HTTP + SQLite + release 可部署基座为起点，按 8 条产品主线推进；近期 P0 仍关注 **部署可用、数据安全、可观测**。B 组、`UI-GATE-01-MANUAL-VISUAL-DIRECTION`、`TECH-07-APP-TSX-MINIMAL-SPLIT`、`UI-MOD-01-PRE-RELAYOUT-COMPONENT-SPLIT` 与 `UI-RELAYOUT-01-WORKBENCH-FIRST-PASS` 均已完成；用户已在 `UI-GATE-04` 后指出讲解性文字过多并授权执行 `UI-POLISH-02-COPY-TRIM`，当前完成前端说明文案瘦身，停在 `UI-GATE-05-MANUAL-COPY-TRIM-REVIEW` 等待人工复查。
- 路线图事实源：`docs/planning/product-roadmap.md`。
- 最近已完成：`UI-POLISH-02-COPY-TRIM`，已完成第二轮轻量 UI 文案瘦身：顶部成功态仅保留服务 / SQLite / 版本等关键状态，项目与工作台入口、Knowledge Assist、追记、归档和结案辅助说明均压缩；服务器 / 存储错误态、Repair Task、AI-ready 未接真实 AI、文件写盘未接入等状态边界保留；未改 schema、repository、HTTP API、server、真实 AI、RAG、Electron、fs/IPC 或业务数据流。

## 当前真实状态
- 已完成：本地 HTTP + SQLite 主链路、workspace 创建 / 切换、workspace UX improvements、recent issue reopen、closeout failure input preservation hints、AI-ready draft history、issue / record / closeout / archive / error-entry 主路径、basic full-text search、search filters、search tags、archive review page、similar issues lite、search result linking、recurrence prompt、search / KB verify fixture cleanup、UI redesign stage brief、UI information architecture review、App.tsx minimal split、UI pre-relayout component split、UI relayout first pass、quick issue create、record timeline polish、closeout UX polish、`ErrorEntry.prevention` 非空修复、release tarball 部署规划、server 同端口服务 `dist` + `/api`、AI-ready prompt templates、rule-based closeout draft panel、server schema contract、HTTP feedback contract、restore dry-run、SQLite integrity check、JSON export hardening、partial closeout recovery verify、repair task generation、diagnostics bundle、night-run 安全规则、v0.2 历史文档归档、lightweight project status ledger、refactor necessity audit。
- 技术债审计：`docs/planning/refactor-assessment.md` 仍作为 TECH-07 背景输入；`SEARCH-07` 与 `UI-GATE-01` 已完成，当前没有必须先做的 broad refactor gate；大文件和重复逻辑存在但不阻塞 DEP-01 / TECH-07。
- UI 改造状态：`docs/planning/ui-redesign-brief.md` 已完成信息架构审查与 `UI-GATE-01` 人工确认记录，`TECH-07` 最小支撑拆分、`UI-MOD-01` 行为保持模块化拆分、`UI-RELAYOUT-01` 第一轮工作台重排和 `UI-POLISH-02-COPY-TRIM` 文案瘦身均已完成。当前必须停止在 `UI-GATE-05-MANUAL-COPY-TRIM-REVIEW`，等待用户人工检查桌面端和移动端观感，不得自动进入下一轮 UI polish。
- 仍 blocked：真实服务器 release 用户目录部署验证、systemd 自启、真实 AI provider/API key 接入。
- 服务器安全边界仍有效：不 sudo、不写 `/opt`、不抢 80、不升级系统 Node、不影响 filebrowser / vnt-cli / docker / Portainer；release 部署优先 `/home/hurricane/probeflash` + 独立 Node runtime + 4100。
- AI 安全边界仍有效：B 组 AI-ready 草稿历史已完成；真实 AI 必须等用户确认 provider、API key/server env、timeout 和 mock/test provider 边界；AI 只返回草稿，不直接写库。
- Code context 安全边界仍有效：先做用户显式生成的 bundle；server 不任意扫描仓库；repo connector 只作为后续 decision-needed 项。

## 8 条产品主线
1. Deployment / Operability：服务器稳定运行、可更新、可诊断。
2. Data Safety：数据不丢、可备份、可恢复。
3. Core Debug Workflow：现场记录和结案更快、更顺。
4. Search / Knowledge Base：历史问题能找回、能复用。
5. AI-ready Workflow：先把 AI 草稿流和 prompt schema 做稳，不依赖真实 API。
6. Real AI Assistance：真实 AI 帮助优化措辞、总结排查、建议预防。
7. Code Context Analysis：AI 能基于用户显式提供的代码上下文分析问题。
8. Technical Debt / Architecture：避免越跑越石山。

## 仍 blocked 的白天服务器主线（不能夜跑）
- **DEP-01-RELEASE-USER-DIR-DEPLOY-VERIFY**
  - 目标：在服务器 `/home/hurricane/probeflash` 下使用 GitHub Release tarball 完成 no-sudo 用户目录部署验证，确认 Web UI、`/api`、SQLite 持久化、独立 Node runtime、4100 端口和旧服务旁路都成立。
  - 旧任务别名：`S3-SERVER-RELEASE-USER-DIR-DEPLOY-VERIFY`。
  - 当前状态：`blocked`，需要用户白天确认 SSH、release 下载或上传方式、写入 `/home/hurricane/probeflash`、启动临时进程与 4100 端口边界。
  - 允许改动：用户授权的服务器 `/home/hurricane/probeflash/{releases,current,runtime,shared}`；仓库内仅 planning sync 或必要 deployment note。
  - 明确不做：不 sudo；不 systemd；不写 `/opt`；不碰 80；不升级系统 Node；不使用系统 Node v10；不影响既有服务；不接真实 AI。
  - 验证方式：SHA256 校验；`curl http://127.0.0.1:4100/`；`curl http://127.0.0.1:4100/api/health`；`curl http://192.168.2.2:4100/`；`curl http://192.168.2.2:4100/api/health`；创建 workspace / issue；停止重启后读回；确认 `shared/data/probeflash.sqlite` 被使用；确认 filebrowser:80 正常。
  - 完成定义：固定 release 资产在用户目录运行；4100 可本机与 LAN 访问 Web UI 和 `/api`；SQLite 重启后可读回；`shared/data` / `shared/env` / `shared/logs` 不随 release 删除；未执行 sudo / systemd / `/opt` / 服务器 `git pull`。

## 已完成 repo-local UI 改造任务（不能继续顺推 UI polish）
- **UI-RELAYOUT-01-WORKBENCH-FIRST-PASS**
  - 目标：完成第一轮 UI 层级重排，让 ProbeFlash 主界面更像清晰的问题工作台。
  - 当前状态：`completed`；repo-local；已完成并进入人工 review / smoke gate。
  - 已完成：QuickIssue landing 替代默认完整建卡大表单；快速建卡新增 severity 选择并默认 / reset 为 `medium`；workbench 形成 Issue rail / Issue main flow / Knowledge Assist supporting rail；recurrence、related、similar、search 统一进入 Knowledge Assist；旧编号文案已删除。
  - 明确未做：未改 schema、repository contract、HTTP API、server、真实 AI、RAG / embedding、Electron / fs / IPC、dashboard / console / new app；未改变 closeout/search/record 业务语义。
  - 验证方式：`git diff --check`、`python3 -m json.tool .agent-state/handoff.json >/dev/null`、`cd apps/desktop && npm run typecheck`、`cd apps/desktop && npm run build`、`cd apps/desktop && npm run verify:handoff`、`cd apps/desktop && npm run verify:all`，并记录相关 verify 与浏览器人工 smoke 状态。
  - 完成定义：自动验证通过并单任务 commit；完成后必须停止在 `UI-GATE-04-MANUAL-RELAYOUT-REVIEW`，等待用户检查桌面端和移动端观感。

- **UI-POLISH-02-COPY-TRIM**
  - 目标：删除或压缩页面中过多的讲解性文字，只保留必要操作提示与状态判断信息。
  - 当前状态：`completed`；repo-local；等待人工 review / smoke。
  - 已完成：顶部健康详情删除 DB class / 默认项目成功态信息，项目与工作台入口、Knowledge Assist、追记、归档和结案辅助说明压缩；服务器 / 存储错误态、Repair Task、AI-ready 未接真实 AI、文件写盘未接入等边界说明保留。
  - 明确未做：未改 schema、repository contract、HTTP API、server、真实 AI、RAG / embedding、Electron / fs / IPC、业务数据流或状态判断逻辑。

## 当前唯一人工检查门（day-only，AI 必须停止）
- **UI-GATE-05-MANUAL-COPY-TRIM-REVIEW**
  - 目标：用户在第二轮 UI 文案瘦身后人工检查桌面端和移动端观感，确认讲解文字是否足够少，同时服务器 / 存储状态仍便于判断。
  - 当前状态：`current`；day-only / manual smoke；不能夜跑。
  - 明确不做：AI 不自动越过此 gate 做下一轮 UI polish、closeout 视觉重排、archive drawer 重做或任何新的 UI implementation。

## 当前前沿任务窗口（最多 3 个候选）
- **DEP-01-RELEASE-USER-DIR-DEPLOY-VERIFY**
  - 状态：`blocked`；P0；白天主线；不能夜跑。
  - 选择理由：真实服务器部署仍是产品可用性的最大缺口。
- **UI-RELAYOUT-01-WORKBENCH-FIRST-PASS**
  - 状态：`completed`；P1；repo-local。
  - 选择理由：第一轮工作台重排已完成，下一步只能人工 review / smoke。
- **UI-GATE-05-MANUAL-COPY-TRIM-REVIEW**
  - 状态：`current`；P1；day-only / manual smoke。
  - 选择理由：第二轮 UI 文案瘦身完成后，必须由用户检查桌面端和移动端观感，再决定是否继续下一轮 UI polish。

## 下一步最小可执行动作
- 下一轮默认：停在 `UI-GATE-05-MANUAL-COPY-TRIM-REVIEW`；用户需要人工启动 / 浏览 ProbeFlash，检查桌面端和移动端观感。
- 无服务器授权或 repo-local 执行窗口：没有可自动顺推的 UI 任务；AI 必须停止，不能继续做下一轮 UI polish、closeout 视觉重构或任何新 UI implementation。
- `UI-POLISH-02` 已完成：等待用户人工 review / smoke；不得自动顺推下一轮 UI 任务。
- 真实 AI：仍 blocked，不得无人值守接 provider 或 API key。

## 下一任务选择流程
1. 可以先读 `docs/planning/status.md` 获取概览，但不得只凭它认领或执行任务。
2. 默认读取：`AGENTS.md`、本文件、`.agent-state/handoff.json`、`git status --short`、`git log --oneline -5`、当前任务直接相关文件。
3. 完整路线图、字段和节奏读取 `docs/planning/product-roadmap.md`。
4. 候选池和任务池读取 `docs/planning/backlog.md`。
5. 阶段切换或长期拍板读取 `docs/planning/decisions.md`。
6. README 只在对外展示 / 快速开始 / release 口径变化时读取；产品介绍只在产品定义 / 领域语言变化时读取。
7. Archive 只在 v0.2 前历史背景、专项实现追溯或归档审计时读取。
8. 每次只允许认领一个原子任务；完成前必须最小验证、planning sync、单任务 commit。
9. 夜跑遇到服务器、SSH、sudo、systemd、API key、外部账号、删除 / 迁移真实数据或产品拍板，必须停止。

## DoD / Verification Expectation
- planning-only 任务最小验证：`git diff --check`、`python3 -m json.tool .agent-state/handoff.json >/dev/null`、`cd apps/desktop && npm run verify:handoff`、`git status --short`；若涉及 `docs/planning/status.md`，同时核对其不超长、不流水账化、不复制 backlog / product-roadmap 长表。
- deploy docs / deploy verify 任务最小验证：`git diff --check`、`cd apps/server && npm run verify:deploy-prep`、`python3 -m json.tool .agent-state/handoff.json >/dev/null`、`cd apps/desktop && npm run verify:handoff`、`git status --short`。
- server script / package 任务验证：`git diff --check`、任务对应 server verify、`cd apps/server && npm run verify:s3-local-backend-scaffold`、`cd apps/server && npm run verify:deploy-prep`、`cd apps/desktop && npm run typecheck`、`cd apps/desktop && npm run build`、`cd apps/desktop && npm run verify:handoff`、`cd apps/desktop && npm run verify:all`、`python3 -m json.tool .agent-state/handoff.json >/dev/null`。
- data repair task 任务验证：`git diff --check`、`python3 -m json.tool .agent-state/handoff.json >/dev/null`、`cd apps/server && npm run verify:data-integrity-check`、`cd apps/desktop && npm run verify:data-repair-task-generation`、`cd apps/desktop && npm run typecheck`、`cd apps/desktop && npm run build`、`cd apps/desktop && npm run verify:handoff`、`cd apps/desktop && npm run verify:all`。
- desktop UI / core workflow 任务验证：`git diff --check`、任务对应 `cd apps/desktop && npm run verify:*`、`cd apps/desktop && npm run typecheck`、`cd apps/desktop && npm run build`、`cd apps/desktop && npm run verify:handoff`、`cd apps/desktop && npm run verify:all`、`python3 -m json.tool .agent-state/handoff.json >/dev/null`。
- search / knowledge base 任务验证：`git diff --check`、`python3 -m json.tool .agent-state/handoff.json >/dev/null`、任务对应 server verify、任务对应 desktop verify、`cd apps/desktop && npm run typecheck`、`cd apps/desktop && npm run build`、`cd apps/desktop && npm run verify:handoff`、`cd apps/desktop && npm run verify:all`。
- `docs/planning/current.md` 与 `.agent-state/handoff.json` 是每轮 planning sync 必更；任务池或路线变化时同步 `docs/planning/backlog.md`；状态摘要变化时可覆盖更新 `docs/planning/status.md`；长期拍板变化时同步 `docs/planning/decisions.md`。

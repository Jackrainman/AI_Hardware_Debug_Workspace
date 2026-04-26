# 当前执行面板（Current）

> 本文件只维护当前阶段目标、前沿任务窗口、唯一主线原子任务与下一任务选择规则。完整剩余串行队列与详细执行拆解见 `docs/planning/backlog.md` 与 `.agent-state/handoff.json.pending_task_queue`。v0.2.0 前历史专项输入已归档到 `docs/archive/v0.2-closeout/`，默认不读。

## 当前阶段
- 阶段：S3 到 S4 到 AI 能力的分层路线图重建后，当前仍处于 **S3：服务器安全部署**。
- 当前模式：`server_storage_migration`。
- 阶段目标：基于 v0.2.0 已完成的本地 HTTP + SQLite 主链路，先在 Ubuntu 20.04 服务器上完成安全、可回滚、可验证的用户目录部署；再进入 systemd 自启、数据安全、AI-ready 与代码上下文分析能力。
- 当前技术路线：先 `/home/hurricane/probeflash` no-sudo 验证，再准备并授权安装 `probeflash.service`，再定义 release tarball 更新 / 回滚；完成 operability / data safety 后，才进入 AI-ready、最小真实 AI 草稿、code context bundle。

## 本轮按已知事实重建后的状态
- v0.2.0 release 已完成：本地 HTTP + SQLite 主链路、`/api` adapter、`apps/server`、SQLite schema/API、workspace 创建与切换、issue / record / closeout / archive / error-entry 主路径、`dev-start.sh`、本地 release smoke 均已完成。
- S4 本地 operability / data safety 已完成：`/api/version`、增强 `/api/health`、`backup:export`、`restore:dry-run` 均已有本地自动验证；真实服务器路径仍需等部署后复验。
- AI-ready prompt/schema 已完成：`polish_closeout`、`summarize_records`、`suggest_prevention` 的 deterministic prompt 输入与 `AiDraftOutput` schema 已落地；仍未调用外部 AI。
- AI-ready closeout draft panel 已完成：closeout 表单内已有本地规则草稿面板，可生成并套用可审阅草稿；仍未调用外部 AI，仍不自动写库。
- 本地 release smoke 已确认：web dist 可被 `127.0.0.1:4173` 托管；`4173/api` 可代理到 `127.0.0.1:4100`；`4100` 后端可返回 sqlite ready；停掉后端后 `4173/api` 返回 `proxy_error`，没有 fake data / silent fallback。
- 真实服务器部署、systemd 开机自启、服务器 LAN 持久化验证、AI 功能、仓库代码上下文分析均未完成。
- 目标服务器事实：`192.168.2.2` / `hurricane-server` / SSH 用户 `hurricane` / Ubuntu 20.04.6 LTS / systemd 可用；80 端口由 filebrowser 占用；系统 Node 为 `v10.19.0`，不能用于 ProbeFlash；`4100` 当前未见监听，适合 ProbeFlash。
- 服务器安全边界：不占用 80，不升级系统 Node，不影响 filebrowser / vnt-cli / docker / Portainer；`/home/hurricane` 可写，`/opt` 属于 root，不作为第一步部署目录。
- 旧 `apps/server/deploy/*` 材料仍是已存在的部署准备输入，但其中 `/opt` 路径不能被解释为当前授权；下一轮应按本文件与 backlog 的 no-sudo 用户目录策略优先执行。
- v0.2.0 前 API / SQLite / 服务器不可达策略草案已移入 `docs/archive/v0.2-closeout/`；这些文档只作历史追溯，不再作为默认 planning 输入。

## 当前已确认约束
- 先做 **no-sudo 用户目录部署验证**：`/home/hurricane/probeflash`。
- 再做 **systemd 开机自启准备**：只准备 `probeflash.service` 内容与静态检查，不执行真正 `systemctl`，除非用户授权。
- 用户授权后才做 **systemd 安装与自启验证**：写 `/etc/systemd/system/probeflash.service` 前必须再次确认 sudo 边界。
- 最后才考虑 `/opt`、反向代理、`.local`、80/443 美化；这些不是当前前沿任务。
- AI 路线必须先 AI-ready：规则模板草稿与 prompt schema 先落地；真实 AI 只返回草稿，不直接写库；API key 只允许在 server env；不做 RAG / embedding。
- 代码上下文路线必须先 code context bundle：只分析用户显式提供的内容，不让服务器任意扫描仓库路径，不自动执行命令。
- 夜跑 / 无人值守模式只能执行 repo-local、可自动验证、可回滚任务；任何 SSH、上传、真实服务器、sudo、systemd、`/opt`、80/443 或需用户拍板事项都必须停止并留下 handoff。

## 当前唯一主线原子任务（下一轮只认领这个）
- **AI-ASSIST-POLISH-CLOSEOUT-MINIMAL**
  - 目标：接入真实 AI 的最小措辞优化，只返回 closeout 草稿。
  - 当前状态：`blocked_by_external_dependency_api_key_after_ai_ready`；夜跑 / 无人值守不可执行。
  - 前置依赖：`AI-READY-CLOSEOUT-DRAFT-PANEL` 已完成；仍需要用户确认 server env API key / provider / timeout / mock 边界。
  - 输入文件 / 环境：server env、server API、prompt templates、closeout draft panel、error state UI、用户确认的 provider/API key 边界。
  - 允许改动：server-side AI provider 最薄 adapter、server env 文档、前端请求草稿接口、timeout / error state、verify 脚本、planning sync。
  - 明确不做：browser 不持有 API key；AI 不直接写库；AI 失败不阻断 closeout；不做 RAG / embedding；不做多 provider 复杂抽象；不把草稿当事实结论。
  - 夜跑边界：blocked；需要外部账号/API key/provider 或用户确认边界，必须停止。
  - 验证要求：无 API key 时主流程正常并显示配置缺失；mock / test provider 返回草稿；timeout / provider error 有可见状态；用户确认后才应用；closeout 原路径不回归。
  - 完成定义：真实 AI 能生成措辞优化草稿；安全边界在 server；失败可降级到手写 / 规则草稿。
  - 下一个任务：`AI-ASSIST-SUGGEST-PREVENTION`。

## 当前前沿任务窗口（最多 3 个候选）
- **S3-SERVER-USER-DIR-DEPLOY-VERIFY**
  - 状态：`blocked_by_user_confirmation`；仅在用户白天确认 SSH / 上传 / 写入路径 / 启动进程 / 4100 端口边界后可执行，夜跑不可执行。
  - 选择理由：服务器真实部署未完成，但 `/opt` 与 systemd 需要更高权限；先用 `/home/hurricane/probeflash` 验证同一 runtime / DB / 端口方案，风险最小。
- **AI-ASSIST-POLISH-CLOSEOUT-MINIMAL**
  - 状态：`blocked_by_external_dependency_api_key_after_ai_ready`；必须等草稿面板完成且用户确认真实 AI/API key 边界后执行。
  - 选择理由：真实 AI 只能在 AI-ready 与规则草稿闭合后进入，并且 API key 只允许在 server env。
- **AI-ASSIST-SUGGEST-PREVENTION**
  - 状态：`pending_after_minimal_ai`；等待最小真实 AI 草稿闭合后再评估。
  - 选择理由：预防建议属于真实 AI 扩展，不能越过 API key/provider 边界。

## 剩余完整 pending queue（按执行顺序）
1. `S3-SERVER-USER-DIR-DEPLOY-VERIFY`：blocked_by_user_confirmation
2. `S3-SERVER-SYSTEMD-AUTOSTART-PREP`：blocked_by_external_dependency
3. `S3-SERVER-SYSTEMD-AUTOSTART-VERIFY`：blocked_by_user_confirmation
4. `S3-SERVER-RELEASE-UPDATE-FLOW`：blocked_by_external_dependency
5. `S4-RELEASE-VERSION-ENDPOINT`：completed
6. `S4-OPERABILITY-HEALTH-STATUS`：completed
7. `S4-DATA-BACKUP-EXPORT`：completed
8. `S4-DATA-RESTORE-DRY-RUN`：completed
9. `AI-READY-PROMPT-TEMPLATE-SYSTEM`：completed
10. `AI-READY-CLOSEOUT-DRAFT-PANEL`：completed
11. `AI-ASSIST-POLISH-CLOSEOUT-MINIMAL`：blocked_by_external_dependency_api_key_after_ai_ready
12. `AI-ASSIST-SUGGEST-PREVENTION`：pending_after_minimal_ai
13. `CODE-CONTEXT-BUNDLE-CLI`：pending_after_ai_prevention
14. `CODE-CONTEXT-ATTACH-TO-ISSUE`：pending_after_bundle_cli
15. `AI-ASSIST-ANALYZE-CODE-CONTEXT`：pending_after_bundle_attach_and_ai_adapter
16. `CODE-CONTEXT-REPO-CONNECTOR-LATER`：pending_after_user_feedback

## 下一步最小可执行动作
- 下一轮默认遇到 `AI-ASSIST-POLISH-CLOSEOUT-MINIMAL` 阻塞；夜跑必须停止，等待用户确认真实 AI/API key/provider 边界，或白天确认 S3 服务器部署边界。
- 认领前必须重新读取默认事实源 + `docs/planning/backlog.md`，确认 `S3-*` 服务器任务仍保持 blocked 且未被误标 completed。
- 真实服务器操作前必须获得用户确认：SSH 登录方式、上传方式、是否允许在 `/home/hurricane/probeflash` 写入、是否允许启动临时进程、是否允许用 4100 端口。
- 若用户未授权 SSH / 上传 / 启动进程，不得自行部署；夜跑继续扫描后续 repo-local、可自动验证、可回滚任务。
- 若后续队列只剩服务器、sudo、systemd、真实 API key 或用户拍板任务，停止并说明需要用户白天介入。

## 下一任务选择流程
1. 默认只读取：`AGENTS.md`、本文件、`.agent-state/handoff.json`、`git status --short`、`git log --oneline -5`、当前任务直接相关文件。
2. 需要完整队列、任务新增 / 重排 / 改名时读取 `docs/planning/backlog.md`。
3. 需要历史 API / SQLite / 服务器不可达策略背景、v0.2.0 前专项追溯或归档审计时，才读取 `docs/archive/v0.2-closeout/`。
4. 服务器部署任务命中时读取 `apps/server/deploy/*` 与 release asset 状态；但不得把旧 `/opt` 材料当作当前授权。
5. 夜跑 / 无人值守模式下，若候选任务需要 SSH、sudo、systemd、真实服务器、外部账号、API key、删除 / 迁移数据或用户确认，必须停止，不得硬跑。
6. 只允许从 `backlog.md` / `.agent-state/handoff.json.pending_task_queue` 中认领第一个“依赖已满足且未完成”的任务。
7. 当前任务未完成“最小验证 + planning sync + 单任务 commit”前，不得认领下一任务。
8. 真实服务器部署必须分层：用户目录 no-sudo 验证先于 systemd，自启验证先于 `/opt` / 反向代理 / `.local`。
9. AI 任务必须分层：AI-ready 草稿与 prompt schema 先于真实 AI，真实 AI 先于 code context AI，code context bundle 先于任何 repo connector。

## Night Run / Unattended Mode
- 允许任务：docs / planning 整理、机读 handoff 对齐、本地代码功能、本地 verify 脚本、单元测试 / smoke 脚本、backup / export 本地功能、AI-ready UI / prompt schema、code context bundle CLI、小型局部重构。
- 禁止任务：SSH 到服务器写入、sudo、systemd、写 `/opt`、操作 80/443、真实服务器部署、GitHub release / tag 删除、数据库 destructive migration、删除用户数据、修改真实生产数据、大规模 UI 重构、引入大型框架、需要用户拍板的产品方向、任何无法本地自动验证的任务。
- 停止条件：git status 不干净且无法归类；typecheck / build / verify 失败且不能在当前边界内修复；需要 SSH / sudo / systemd / 外部账号 / API key；需要用户确认路径、权限、端口、账号或密钥；涉及真实服务器；涉及删除 / 迁移数据；planning 与代码冲突且无法判断谁 stale；任务边界不清；连续两次修复验证仍失败；命令出现权限错误、网络错误或端口冲突但无法确定原因。
- 提交规则：每个原子任务单独 commit；提交前必须验证；提交后 `git status --short` 必须为空；不 push；不改 tag / release；不进入下一任务前留下脏工作区。
- 输出要求：夜跑结束必须输出已完成任务、每个任务 commit、验证结果、未完成任务、阻塞点、下一步最小动作、是否需要用户白天介入。
- 当前服务器任务口径：`S3-SERVER-USER-DIR-DEPLOY-VERIFY`、`S3-SERVER-SYSTEMD-AUTOSTART-PREP`、`S3-SERVER-SYSTEMD-AUTOSTART-VERIFY` 都不能夜跑。

## DoD / Verification Expectation
- 每个原子任务都必须写清：ID、目标、前置依赖、输入文件、允许改动、明确不做、验证要求、完成定义、下一个任务。
- 本轮 docs / planning / skills-only 治理验证要求：移动前后引用检查、归档文件读回、`git diff --check`、`.agent-state/handoff.json` 可被 `JSON.parse`、`cd apps/desktop && npm run verify:handoff`、`git status --short`。
- 后续代码或部署类任务若改 package 或业务代码，必须额外跑 `cd apps/desktop && npm run typecheck`、`npm run build`、`npm run verify:all` 与任务相关 server / deploy 验证。
- `docs/planning/current.md`、`.agent-state/handoff.json` 为 planning sync 必更文件；排队顺序或详细计划变化时同步 `docs/planning/backlog.md`；长期拍板变化时才同步 `docs/planning/decisions.md`。
- 任一验证未过、planning sync 未完成或未单独 commit，都不得进入下一任务选择。

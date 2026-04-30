# ProbeFlash Project Status

> 本页是人类快速阅读的项目状态索引，不是最终事实源，不承载详细任务定义，也不替代 `current.md` / `backlog.md` / `product-roadmap.md` / `.agent-state/handoff.json`。若本页与事实源冲突，以这些事实源为准；AI 不能只读本页就执行任务，执行前仍必须读取默认事实源。
>
> 硬限制：总长度建议不超过 120 行；不追加流水账；不复制 backlog 长任务表；不复制 product-roadmap 长路线图；最近完成只保留最近 10 条以内；blocked 只列当前关键 blocked；night-safe 只列前 5 个候选；每次任务结束只覆盖当前状态，不追加历史过程。

## 1. 一句话状态
ProbeFlash 已具备本地 HTTP + SQLite + release 可部署基座、workspace UX 改善、最近活跃问题恢复、结案失败输入保留提示、规则草稿历史、基础知识检索、轻量相似问题提示、历史问题人工关联和复发提示；当前白天服务器主线仍卡在真实服务器用户目录部署确认，B 组、`UI-GATE-01` 与 `TECH-07` 已完成且拆分结果已被用户认可；下一轮只自动认领 `UI-MOD-01-PRE-RELAYOUT-COMPONENT-SPLIT`，完成后停在 UI 重构前人工运行检查。

## 2. 当前能力状态

| 能力 | 状态 |
|---|---|
| 项目 / workspace | ✅ 已可用 |
| 问题卡 | ✅ 已可用 |
| 排查记录 | ✅ 已可用 |
| 结案 / 归档 / 错误表 | ✅ 已可用 |
| SQLite 持久化 | ✅ 已可用 |
| Release 部署基座 | 🟡 部分可用 |
| 搜索 | ✅ 已可用 |
| 标签 | ✅ 已可用 |
| 相似问题提示 | ✅ 已可用 |
| 历史问题关联 | ✅ 已可用 |
| 复发提示 | ✅ 已可用 |
| 归档复盘 | ✅ 已可用 |
| 数据备份 / 恢复 / 一致性检查 | 🟡 部分可用 |
| AI-ready 草稿 | 🟡 部分可用 |
| 真实服务器部署 | 🔒 被阻塞 |
| 真实 AI | 🔒 被阻塞 |

## 3. 当前主线

| 项 | 内容 |
|---|---|
| 白天主线 | `DEP-01-RELEASE-USER-DIR-DEPLOY-VERIFY` |
| 状态 | `blocked`，不能夜跑 |
| blocked 原因 | 需要真实服务器 SSH、release 下载或上传、写入 `/home/hurricane/probeflash`、启动临时进程和 4100 端口边界确认 |
| 用户需要确认什么 | SSH 登录方式、release 获取方式、用户目录写入授权、临时进程启动授权、4100 端口授权 |
| 下一轮默认认领 | `UI-MOD-01-PRE-RELAYOUT-COMPONENT-SPLIT`，只做模块化拆分 |
| UI 停止点 | `UI-GATE-03-MANUAL-RUN-CHECK-BEFORE-RELAYOUT`，模块化后由用户人工检查能否正常跑 |

## 4. 当前 night-safe / repo-local 候选
- 唯一可自动认领的下一任务：`UI-MOD-01-PRE-RELAYOUT-COMPONENT-SPLIT`，只做行为保持模块化拆分，不做三栏布局、QuickIssue landing、Knowledge Assist 合并或文案/交互修改。
- 其它 night-safe 候选暂不自动越过 UI 模块化门：`AIREADY-06-DRAFT-DIFF`、`CODECTX-01-BUNDLE-CLI`、`CODECTX-02-SECRETS-PROTECTION`、`CORE-07-ARCHIVE-FILTERS`。

## 4.1 B 组后顺序
- B 组功能完成后先修 UI，但当前顺序改为：`UI-GATE-01` completed -> `TECH-07` completed -> `UI-GATE-02` completed/manual accepted -> `UI-MOD-01` current / night-safe -> `UI-GATE-03-MANUAL-RUN-CHECK-BEFORE-RELAYOUT` day-only。
- `UI-MOD-01` 完成后必须停止，等待用户人工确认页面能正常跑；不能自动进入 UI 重排实现。

## 5. 最近完成
- `TECH-07-APP-TSX-MINIMAL-SPLIT`：已抽取 `WorkspaceChrome` / `ProjectContextShell`、`KnowledgeAssistPanel` 与 `IssueMainFlow` 纯展示壳；保持原 render 顺序、条件渲染和业务触发，不改 `App.css` 主视觉。
- `UI-GATE-01-MANUAL-VISUAL-DIRECTION`：用户已确认首屏分区、真实边界约束、`TECH-07` 最小拆分目标和第一轮 UI 修改范围；确认结果已落盘到 `ui-redesign-brief.md`，TECH-07 已按该 execution contract 执行。
- `AIREADY-05-DRAFT-HISTORY`：规则 closeout 草稿会保存浏览器本地历史，可审阅多次生成的来源时间、问题边界和草稿内容，并可清除；不接真实 AI、不自动写 archive / error-entry / issue；`verify:ai-ready-closeout-draft-panel` 已覆盖。
- `CORE-06-CLOSEOUT-PARTIAL-SAVE-HINTS`：结案写归档摘要、错误表或问题卡状态失败时，表单明确提示未归档成功，保留根因 / 修复结论 / 预防建议，并提示可重试或先处理 Repair Task；新增 `verify:core-closeout-partial-save-hints`。
- `CORE-03-RECENT-ISSUE-REOPEN`：新增 workspace-scoped 最近活跃问题本地状态；刷新 / 重开后回到当前项目最近未归档问题，缺失、已归档或 workspace 切换时安全降级；新增 `verify:core-recent-issue-reopen`。
- `CORE-02-WORKSPACE-UX-IMPROVEMENTS`：顶部项目 / 存储状态并入当前 workspace 身份，项目选择 / 创建入口、workspace 列表空态 / 错误态和 issue list 空态 / 错误态更清楚；新增 `verify:core-workspace-ux-improvements`。
- `UI-01-INFORMATION-ARCHITECTURE-REVIEW`：补齐最终信息架构，明确首屏区域、workspace/storage 状态位置、issue list/detail 主次关系、Knowledge Assist 区域、closeout 入口和 `CORE-02` 输入边界；未改 UI / CSS / 业务代码。
- `UI-REDESIGN-STAGE-BRIEF`：新增 UI 改造阶段 brief，建议进入受控 UI 小阶段；其推荐的 `UI-01` 已完成。
- `TECH-DEBT-SEARCH-KB-CLEANUP-LITE`：SEARCH-07/08/09 verify 共享 fixture / localStorage polyfill 已抽出，不改变搜索行为。
- `SEARCH-09-RECURRENCE-PROMPT`：高相似历史问题会触发可忽略复发提示，可查看根因/处理摘要并显式关联，不接 AI、不自动写库。

## 6. 当前不要碰
- 不创建 `apps/console`、dashboard UI 或新的项目管理 app。
- 不把项目管理 UI 塞进 ProbeFlash 产品本体。
- 不改 `apps/desktop` / `apps/server` 业务代码来满足本状态页。
- 不做 SSH、sudo、systemd、`/opt`、80/443、真实服务器部署或 release/tag 修改。
- 不接真实 AI provider / API key，不把 AI-ready 说成真实 AI 已完成。
- 不引入 RAG / embedding、权限系统、多租户、Electron / preload / fs / IPC。
- 不在 `UI-MOD-01` 完成并通过 `UI-GATE-03` 人工运行检查前执行后续 UI implementation；不把模块化拆分扩展成 UI 重设计或全量重写。

## 7. 用户下一步
- 今天完全不想动：停止自动推进；不碰服务器和真实 AI。
- 想继续 UI：下一次先自动执行 `UI-MOD-01` 模块化拆分；拆分提交后由用户人工运行检查，再决定是否进入三栏 UI 重排。
- 只有 10 分钟：保持当前约束，下一轮只做 `UI-MOD-01`，不切服务器。
- 如果明确想推翻本轮 UI 模块化优先约束：再单独确认是否允许白天操作 SSH、release 获取方式、`/home/hurricane/probeflash` 写入和 4100 临时进程。

## 8. 状态来源
- `AGENTS.md`
- `docs/planning/current.md`
- `docs/planning/backlog.md`
- `docs/planning/product-roadmap.md`
- `docs/planning/decisions.md`
- `.agent-state/handoff.json`
- `git log --oneline -20`

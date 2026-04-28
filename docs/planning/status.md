# ProbeFlash Project Status

> 本页是人类快速阅读的项目状态索引，不是最终事实源，不承载详细任务定义，也不替代 `current.md` / `backlog.md` / `product-roadmap.md` / `.agent-state/handoff.json`。若本页与事实源冲突，以这些事实源为准；AI 不能只读本页就执行任务，执行前仍必须读取默认事实源。
>
> 硬限制：总长度建议不超过 120 行；不追加流水账；不复制 backlog 长任务表；不复制 product-roadmap 长路线图；最近完成只保留最近 10 条以内；blocked 只列当前关键 blocked；night-safe 只列前 5 个候选；每次任务结束只覆盖当前状态，不追加历史过程。

## 1. 一句话状态
ProbeFlash 已具备本地 HTTP + SQLite + release 可部署基座、基础知识检索、轻量相似问题提示和历史问题人工关联；当前白天主线仍卡在真实服务器用户目录部署确认，无服务器授权时下一 night-safe 是 `SEARCH-09-RECURRENCE-PROMPT`。

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

## 4. 当前夜跑候选
- `SEARCH-09-RECURRENCE-PROMPT`：基于高相似度结果给出可解释复发提示，不接 AI、不自动写库。
- `TECH-DEBT-SEARCH-KB-CLEANUP-LITE`：仅清理 SEARCH-07/08/09 直接造成的 helper / fixture 重复，不拆大文件。
- `CORE-02-WORKSPACE-UX-IMPROVEMENTS`：仅改本地 workspace UX 与空状态，可自动验证且不碰服务器。
- `CORE-03-RECENT-ISSUE-REOPEN`：只处理本地最近问题回到现场，不涉及外部系统。
- `CORE-06-CLOSEOUT-PARTIAL-SAVE-HINTS`：围绕本地 closeout 失败态保留输入，不写真实服务器。

## 5. 最近完成
- `SEARCH-08-SEARCH-RESULT-LINKING`：搜索 / 相似结果可人工关联到当前问题，已关联历史问题可展示和取消；读写读回覆盖 localStorage 与 HTTP。
- `SEARCH-07-SIMILAR-ISSUES-LITE`：新增可解释相似问题排序 helper、当前问题提示面板和 localStorage / HTTP verify，不接 embedding / RAG / 真实 AI。
- `CODEBASE-REFINE-NECESSITY-AUDIT`：新增 `docs/planning/refactor-assessment.md`，确认当前无必须先做的小型重构 gate；大文件和重复逻辑后置到任务命中时最小处理。
- `11f0054`：`SEARCH-03-ARCHIVE-REVIEW-PAGE`：归档复盘页可预览 ArchiveDocument markdown 并跳回源问题。
- `1913895`：`SEARCH-04-TAGS`：问题和错误表标签能力接入搜索筛选。
- `3a96d82`：`SEARCH-02-FILTERS`：搜索结果支持类型、状态、标签和日期筛选。
- `d9ae6ad`：`SEARCH-01-BASIC-FULL-TEXT-SEARCH`：SQLite 主链路支持基础全文搜索。
- `8759a85`：`CORE-05-CLOSEOUT-UX-POLISH`：结案必填提示和空格-only 拦截更清楚。
- `6d2ff73`：`CORE-04-RECORD-TIMELINE-POLISH`：排查记录展示升级为更清晰的时间线。
- `75117b9`：`CORE-01-QUICK-ISSUE-CREATE`：支持一句话快速创建 open issue。
- `6f0d628`：`DATA-08-REPAIR-TASK-GENERATION`：读回失败可生成 repair task。
- `5dde184`：`DATA-05-PARTIAL-CLOSEOUT-RECOVERY`：partial closeout recovery 验证已覆盖。

## 6. 当前不要碰
- 不创建 `apps/console`、dashboard UI 或新的项目管理 app。
- 不把项目管理 UI 塞进 ProbeFlash 产品本体。
- 不改 `apps/desktop` / `apps/server` 业务代码来满足本状态页。
- 不做 SSH、sudo、systemd、`/opt`、80/443、真实服务器部署或 release/tag 修改。
- 不接真实 AI provider / API key，不把 AI-ready 说成真实 AI 已完成。
- 不引入 RAG / embedding、权限系统、多租户、Electron / preload / fs / IPC。

## 7. 用户下一步
- 今天完全不想动：让 AI 夜跑 `SEARCH-09-RECURRENCE-PROMPT` 这类 repo-local 任务，不碰服务器和真实 AI。
- 只有 10 分钟：确认是否允许下一次白天操作 SSH、release 获取方式、`/home/hurricane/probeflash` 写入和 4100 临时进程。
- 有 30 分钟清醒时间：一起执行 `DEP-01-RELEASE-USER-DIR-DEPLOY-VERIFY` 的服务器用户目录部署验证，并保留 no-sudo / no-systemd 边界。

## 8. 状态来源
- `AGENTS.md`
- `docs/planning/current.md`
- `docs/planning/backlog.md`
- `docs/planning/product-roadmap.md`
- `docs/planning/decisions.md`
- `.agent-state/handoff.json`
- `git log --oneline -20`

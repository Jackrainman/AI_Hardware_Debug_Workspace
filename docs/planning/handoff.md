# 交接说明（Handoff）

> 本文件是“上下文重置后继续执行”的唯一可信入口。下一轮开始前必须先读这里，再读 `current.md` 与 `.agent-state/handoff.json`。

## 当前真实状态
- 阶段：S2 阶段收口。关键路径已打通并完成文档同步：IssueCard intake → 列表选中 → InvestigationRecord 追记 → closeout → ArchiveDocument + ErrorEntry + IssueCard archived 读回。
- 当前唯一执行中的原子任务：**无**。S2-CLOSEOUT-DOCS 已完成，下一轮必须重新读取真实仓库状态后再选择唯一原子任务。
- 桌面壳当前形态：SPA + `window.localStorage`。`IssuePane` 承载 intake 表单、IssueCard 列表选中、InvestigationRecord 追记列表、Closeout 表单与 S1-A3 sample storage 冒烟控件。
- footer：`S2-A4 · IssueCard closeout + ErrorEntry + ArchiveDocument`。

## 已完成原子任务
- S0 全部：目录、AGENTS、README、skills、最终一致性校验。
- S1-A1：`apps/desktop` 最小可运行壳（Vite 5 + React 18 + TypeScript 5）。
- W-R1 / W-L1 / W-L2 / W-L3：工作流范式升级 + WSL/Linux 迁移三批。
- D-005：zod 选型。
- S1-A2：IssueCard / InvestigationRecord / ErrorEntry / ArchiveDocument 等 schema 骨架。
- S1-A3：`window.localStorage` IssueCard save/load（D-006）。
- D-007：S1 阶段 Electron 外壳延后，S1 关闭。
- S2-A1：IssueCard intake 最小表单。
- S2-A2：IssueCard 列表视图。
- M-1：typecheck 脚本修复。
- S2-A3：InvestigationRecord 追加。
- S2-A4：结案 → ErrorEntry + ArchiveDocument 生成：
  - `apps/desktop/src/domain/closeout.ts`：纯工厂 `buildCloseoutFromIssue`，输入 IssueCard + InvestigationRecord 时间线 + closeout 字段，输出 `ArchiveDocument` / `ErrorEntry` / `updatedIssueCard(status: archived)`；rootCause / resolution 为空时结构化拒绝；已 archived 的 IssueCard 结构化拒绝。
  - `apps/desktop/src/storage/archive-document-store.ts`：键前缀 `repo-debug:archive-document:<fileName>`，save + load + `not_found` / `parse_error` / `validation_error` 结构化读回。
  - `apps/desktop/src/storage/error-entry-store.ts`：键前缀 `repo-debug:error-entry:<entryId>`，save + load + 同类结构化读回。
  - `apps/desktop/src/App.tsx`：选中 IssueCard 后展示 `CloseoutForm`；提交时 load IssueCard、读取 InvestigationRecord、构建 closeout、保存 ArchiveDocument / ErrorEntry、回写 IssueCard、刷新列表。
  - `apps/desktop/scripts/verify-s2-a4.mts`：覆盖 intake → 追记 → closeout → ArchiveDocument / ErrorEntry / IssueCard 读回、必填字段拒绝、坏 JSON / schema 不符结构化错误、跨前缀隔离。
- S2-CLOSEOUT-DOCS：同步阶段状态与收口文档：
  - `README.md`：最小可演示流程、当前进度、当前不足、后续计划已从 S1 旧口径切到 S2 主闭环已打通。
  - `docs/planning/roadmap.md`：S1 标为已完成并记录 Electron 延后；S2 标为主闭环关键路径已完成；S3 标为下一阶段候选、未开始。
  - `docs/planning/backlog.md`：已完成项与未完成边界拆开，保留 UI-V1 与 S3-ENTRY-PLANNING 为候选。
  - `docs/planning/current.md` 与 `.agent-state/*`：当前唯一执行中为无，前沿窗口切到 S3-ENTRY-PLANNING / UI-V1。

## planning 与实际一致性检查
- `current.md` 已更新为 S2 阶段收口完成：当前唯一执行中为无，前沿窗口只保留 S3-ENTRY-PLANNING 与 UI-V1 浏览器冒烟。
- `.agent-state/handoff.json` 已同步：`current_atomic_task` 为 `WAITING_FOR_PLANNING_SELECTION`，`completed_atomic_tasks` 追加 `S2-CLOSEOUT-DOCS_sync_stage_status_docs`，`frontier_tasks` 变为 `[S3-ENTRY-PLANNING, UI-V1]`。
- README / roadmap / backlog 不再把 S1/S2 已完成任务写成未完成；`.debug_workspace` 文件系统双写、Electron/IPC、repair task 仍明确保留为未完成边界。
- 本轮 commit 范围应只包含 README、roadmap/backlog/current/handoff、`.agent-state/progress.md`、`.agent-state/session-log.md`、`.agent-state/handoff.json`；继续排除 `.claude/*`、shell rc、`.gitconfig`、`.gitmodules`、`.idea`、`.vscode`、`.mcp.json`、`.ripgreprc` 等本地环境文件。

## 验证状态
- PASS：执行前读取 `AGENTS.md`、`README.md`、`current.md`、`handoff.md`、`roadmap.md`、`backlog.md`、`.agent-state/handoff.json`、`git log -5`。
- PASS：`git log --oneline -5` 确认执行前最近提交包含 `ca6f260 feat(desktop): add IssueCard closeout flow (S2-A4)`。
- PASS：README 中 S1 旧口径、roadmap/backlog 未完成口径已同步为 S2 主闭环已打通。
- PASS：`.agent-state/handoff.json` 可被 Node `JSON.parse` 正常解析。
- PASS：`git diff --name-only` 仅包含本轮允许的 8 个文档/交接文件。
- PASS：`git diff --check` 无输出，退出码 0。
- S2-A4 历史验证保留：`cd apps/desktop && npm run typecheck` PASS；`verify-s2-a4.mts` 5 PASS；`verify-s1-a3.mts` / `verify-s2-a1.mts` / `verify-s2-a2.mts` / `verify-s2-a3.mts` PASS；`git diff --check` PASS。
- 本轮未执行：`npm run build`、`npm run typecheck`、Node 黑盒脚本。原因：本轮是纯文档/交接状态同步，且用户全局偏好明确“不自己尝试编译”。

## 下一轮开始前必须先检查什么
1. 读 `AGENTS.md` 第 3/4/5/10 章（滚动前沿 / 下一任务选择 / 完成门 / commit）。
2. 读 `docs/planning/current.md`、本文件、`.agent-state/handoff.json`。
3. 跑 `git status --short` 与 `git log --oneline -5`，确认最新项目 commit 是聚焦 S2-CLOSEOUT-DOCS 的文档收口提交，且没有混入功能代码。
4. 若选择 S3-ENTRY-PLANNING，先读 README / roadmap / backlog / decisions / closeout 相关 store 与验证脚本，再只更新阶段入口规划；不要直接改功能。

## 下一步最推荐动作（候选，不是指令）
- 推荐首选：**S3-ENTRY-PLANNING**。只做 S3 阶段入口评估与唯一下一原子任务选择，不写 S3 功能。
- 推荐备选：**UI-V1 浏览器冒烟**。在真实 DOM 中点 Create / Refresh list / 选中 / Append record / Refresh records / Close issue，确认 Node polyfill 之外的 UI 交互。

## 现在不要做的事情
- 不要直接进入 S3 代码实现；先做 S3-ENTRY-PLANNING 或 UI-V1。
- 不要把 `backlog.md` 整体搬进 `current.md`。
- 不要提前把 localStorage 改成 IndexedDB / 文件系统 / 远端同步。
- 不要回头实装 Electron；D-007 明确延后。
- 不要改 schema 为手写 type guard；D-005 明确使用 zod。
- 不要让四类实体共用 localStorage 前缀；当前前缀必须保持隔离：
  - `repo-debug:issue-card:`
  - `repo-debug:investigation-record:`
  - `repo-debug:archive-document:`
  - `repo-debug:error-entry:`

## 已知风险与约束
- 浏览器侧人工交互验证仍未做；Node 黑盒覆盖了数据链路，不等于真实 DOM 交互已点过。
- S2-A4 阶段的 ArchiveDocument / ErrorEntry 是 localStorage 落盘，不是 `.debug_workspace/` 文件系统写盘。若后续必须写真实文件，应重新评估 fs adapter 或 Electron/IPC。
- localStorage 同域下跨应用共用，仍可能有 id 冲突；当前策略是前缀隔离 + safeParse + 结构化错误，不做自动清理。
- Node 24 `--experimental-strip-types` 对相对 TS import 不自动补扩展名；脚本跨模块 import 继续带 `.ts` 后缀。
- `npm run typecheck` 脚本为 `tsc --noEmit -p tsconfig.json`；`npm run build` 仍是 `tsc -b && vite build`，本轮未执行。

## 如何启动当前桌面壳
```bash
cd apps/desktop
npm install
npm run dev

# Node 侧黑盒验证（不依赖浏览器）
node --experimental-strip-types scripts/verify-s1-a3.mts
node --experimental-strip-types scripts/verify-s2-a1.mts
node --experimental-strip-types scripts/verify-s2-a2.mts
node --experimental-strip-types scripts/verify-s2-a3.mts
node --experimental-strip-types scripts/verify-s2-a4.mts
```

# 交接说明（Handoff）

> 本文件是“上下文重置后继续执行”的唯一可信入口。下一轮开始前必须先读这里，再读 `current.md` 与 `.agent-state/handoff.json`。

## 当前真实状态
- 阶段：S2 调试闭环主流程。关键路径已打通：IssueCard intake → 列表选中 → InvestigationRecord 追记 → closeout → ArchiveDocument + ErrorEntry + IssueCard archived 读回。
- 当前唯一执行中的原子任务：**无**。S2-A4 已完成验证与提交收束；本轮按连续推进停止条件 7.5（当前阶段关键前沿任务已清空）停止。
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

## planning 与实际一致性检查
- `current.md` 已更新为 S2 关键路径完成：当前唯一执行中为无，前沿窗口只保留 S2 收口文档同步与 UI-V1 浏览器冒烟。
- `.agent-state/handoff.json` 已同步：`current_atomic_task` 为 `WAITING_FOR_PLANNING_SELECTION`，`completed_atomic_tasks` 追加 `S2-A4_closeout_error_entry_archive_document`，`frontier_tasks` 变为 `[S2-CLOSEOUT-DOCS, UI-V1]`。
- README 当前进度段仍偏旧，这是下一轮 `S2-CLOSEOUT-DOCS` 的推荐处理项；本轮 S2-A4 按 in-scope 未改 README。
- 本轮 commit 范围应只包含 S2-A4 代码、S2-A4 验证脚本与五份交接文件；继续排除 `.claude/*`、shell rc、`.gitconfig`、`.gitmodules`、`.idea`、`.vscode`、`.mcp.json`、`.ripgreprc` 等本地环境文件。

## 验证状态
- PASS：`cd apps/desktop && npm run typecheck`
- PASS：`cd apps/desktop && node --experimental-strip-types scripts/verify-s2-a4.mts`
- PASS：`verify-s1-a3.mts` / `verify-s2-a1.mts` / `verify-s2-a2.mts` / `verify-s2-a3.mts`
- PASS：`git diff --check`
- 未执行：`npm run build`。原因：用户全局偏好明确“不自己尝试编译”，本轮用 typecheck + Node 黑盒验证覆盖最小完成门。

## 下一轮开始前必须先检查什么
1. 读 `AGENTS.md` 第 3/4/5/10 章（滚动前沿 / 下一任务选择 / 完成门 / commit）。
2. 读 `docs/planning/current.md`、本文件、`.agent-state/handoff.json`。
3. 跑 `git status --short` 与 `git log --oneline -5`，确认最新 commit 是聚焦 S2-A4 的 `feat(desktop): add IssueCard closeout flow (S2-A4)`。
4. 读取 `apps/desktop/src/domain/closeout.ts`、`apps/desktop/src/storage/*archive*`、`apps/desktop/src/storage/*error*`、`apps/desktop/scripts/verify-s2-a4.mts`，确认 closeout 契约与前缀隔离。

## 下一步最推荐动作（候选，不是指令）
- 推荐首选：**S2-CLOSEOUT-DOCS**。同步 README / roadmap / backlog 的阶段状态，评估是否切换到 S3，并重新维护前沿窗口。
- 推荐备选：**UI-V1 浏览器冒烟**。在真实 DOM 中点 Create / Refresh list / 选中 / Append record / Refresh records / Close issue，确认 Node polyfill 之外的 UI 交互。

## 现在不要做的事情
- 不要直接进入 S3 代码实现；先做阶段收口评估。
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

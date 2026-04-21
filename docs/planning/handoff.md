# 交接说明（Handoff）

> 本文件是“上下文重置后继续执行”的唯一可信入口。下一轮开始前必须先读这里，再读 `current.md` 与 `.agent-state/handoff.json`。

## 当前真实状态
- 阶段：S2 调试闭环主流程（S1 已由 D-007 关闭）。
- 已完成原子任务（按时间顺序）：
  - S0 全部：目录、AGENTS、README、skills、最终一致性校验。
  - S1-A1：`apps/desktop` 最小可运行壳（Vite 5 + React 18 + TypeScript 5）。
  - W-R1 / W-L1 / W-L2 / W-L3：工作流范式升级 + WSL/Linux 迁移三批。
  - D-005：zod 选型。
  - S1-A2：schema 骨架五个文件。
  - S1-A3：`window.localStorage` IssueCard save/load（D-006）。
  - D-007：S1 阶段 Electron 外壳延后，S1 关闭。
  - S2-A1：IssueCard intake 最小表单（`issue-intake.ts` 工厂 + App 表单 + Node verify 3 PASS）。
  - S2-A2：IssueCard 列表视图。`listIssueCards()` 前缀扫描 + 逐条 safeParse，返回 `{valid: IssueCardSummary[], invalid: IssueCardListInvalidEntry[]}`（valid 按 createdAt 倒序、invalid 按 id 字典序）。`verify-s2-a2.mts` 5 PASS。
  - M-1：typecheck 脚本修复。
- 当前阻塞项：
  - S2-A3：**未完成 / completion gate 阻塞**。工作区已有 InvestigationRecord 追加相关代码与 verify 脚本，但本轮重新读取时没有发现 S2-A3 功能提交；当时最新功能前置提交仍是 M-1 commit（`c98b040 fix(desktop): repair typecheck script to bypass TS6310 (M-1)`），S2-A3 未完成单任务 commit；按 AGENTS §5 不能计入已完成任务。
  - 工作区相关文件包括 `apps/desktop/src/domain/investigation-intake.ts`、`apps/desktop/src/storage/investigation-record-store.ts`、`apps/desktop/scripts/verify-s2-a3.mts`、`apps/desktop/src/App.tsx`、`apps/desktop/src/App.css` 与规划/交接文件。
  - 本轮因 planning 与实际脱节，仅做最小 planning 修正，未重新运行验证、未提交 S2-A3。
- 当前唯一执行中的原子任务：**S2-A3-CG**。目标是收束 S2-A3 completion gate：重新验证现有工作区改动、必要时修正文档、严格 stage S2-A3 相关文件并提交一次单任务 commit。
- 桌面壳当前形态：SPA。"Issue" 区块在工作区已出现 S2-A3 形态，但未提交；下轮收束前不得把该形态当成主线已完成状态。

## planning 与实际一致性检查
- 本轮发现 planning 与实际脱节：`current.md` / `.agent-state/handoff.json` 曾把 S2-A3 写成“已完成并提交”，但重新读取时没有发现 S2-A3 功能提交，且 S2-A3 文件仍处于未提交状态。
- 已做最小修正：`current.md`、本文件、`.agent-state/progress.md`、`.agent-state/handoff.json`、`.agent-state/session-log.md` 统一改为 S2-A3-CG 当前阻塞；S2-A4 / UI-V1 均不得在 S2-A3 commit 前执行。
- `AGENTS.md`、`README.md`、`architecture.md`、`roadmap.md`、`backlog.md` 与当前阶段无结构性冲突；README"当前进度"段仍停在 S1 描述，拟在 S2 主闭环整体完成后（S2-A4 后）统一更新。
- 当前未提交 S2-A3 工作区不得被视为完成；下一轮若收束 S2-A3，commit 范围应仅包含 S2-A3 相关代码、verify 与交接文件。
- 本轮 commit 明确排除的工作区 untracked / 其它漂移：
  - `.claude/settings.local.json` / `.claude/scheduled_tasks.lock` / `.claude/settings.json` / `.claude/agents` / `.claude/commands` / `.claude/skills`：本地 Claude Code harness 痕迹。
  - shell rc（`.bash_profile` / `.bashrc` / `.profile` / `.zprofile` / `.zshrc`）、user VCS (`.gitconfig` / `.gitmodules`)、IDE (`.idea` / `.vscode`)、`.mcp.json`、`.ripgreprc`：用户本地环境文件，与当前原子任务无关。

## 依赖是否满足
- S2-A3-CG（completion gate 修正）：依赖已满足，且必须优先处理；验证命令应覆盖 `npm run typecheck`、`verify-s2-a3.mts`、既有 verify 无倒退、`npm run build`。
- S2-A4（结案 → ErrorEntry + ArchiveDocument）：schema 已在 S1-A2 落地，但依赖 S2-A3 commit；当前未就绪。
- UI-V1（浏览器冒烟）：技术上无硬依赖，但当前被 S2-A3 completion gate 阻塞；当前不执行。
- M-1 / S2-A1 / S2-A2：已完成。

## 下一轮开始前必须先检查什么
1. 读 `AGENTS.md` 第 3/4/5 章（滚动前沿 / 下一任务选择 / 完成门）。
2. 读 `docs/planning/current.md` 的"当前唯一执行中的原子任务"与"前沿任务窗口"。**当前执行中的原子任务为 S2-A3-CG；下一轮第一件事是收束 S2-A3 completion gate，不得选择 S2-A4。**
3. 读 `.agent-state/handoff.json` 的 `current_stage` / `current_atomic_task` / `frontier_tasks` / `next_task_selection_basis`。
4. 跑 `git status` 与 `git log -5`，确认仓库与记录一致；当前已知 S2-A3 功能文件未提交。若下轮成功收束，期望新增一条聚焦 S2-A3 的 commit。
5. 如 planning 与实际脱节（例如窗口里的任务已实际完成），**先更新 planning，再开始执行**。

## 下一步最推荐动作（候选，不是指令）
- **下一轮只推荐 S2-A3-CG**：重新验证并提交 InvestigationRecord 追加。必须先跑 typecheck / verify-s2-a3 / verify-s1-a3 / verify-s2-a1 / verify-s2-a2 / build；全部通过后，严格 stage S2-A3 相关文件并提交。
- S2-A4 与 UI-V1 暂不推荐执行；它们都要等 S2-A3-CG 完成后再重新选择。

> 本轮只做 planning 修正并 STOP；没有进入实现或验证。

## 现在不要做的事情
- 不要把 `backlog.md` 整体搬进 `current.md`。
- 不要一次性把 S2 所有剩余任务都展开成详细子任务表。
- 不要跳过 completion gate 直接推进下一任务（最小验证 + 交接更新 + commit 必须齐全）。
- 不要再改 `docs/product/产品介绍.md`。
- 不要在当前阻塞状态下启动 S2-A4；S2-A3-CG 未提交前，结案归档不是可执行任务。
- 不要提前把 localStorage 改成 IndexedDB / 文件系统 / 远端同步；D-006 / D-007 的路线是"主闭环跑通后再评估"。
- 不要回头实装 Electron；D-007 明确延后。
- 不要在 schema 文件里加手写 type guard；已由 zod 统一处理（D-005）。
- 不要让 `listIssueCards` / `listInvestigationRecordsByIssueId` 混入其它实体；各自键前缀必须保持独立（S2-A4 要新增 `archive-document:` / `error-entry:` 前缀，不要共用）。

## 已踩坑与约束
- Vite 构建成功 ≠ Dev server 启动成功；浏览器侧人工交互验证仍未做。S2-A3 选中 + 追记路径目前只是未提交工作区能力，需先完成 S2-A3-CG。
- `apps/desktop/.gitignore` 已忽略 `node_modules` / `dist` / `*.tsbuildinfo` / `vite.config.{d.ts,js}`；根 `.gitignore` 忽略 `.codex`。
- schema 校验库已由 D-005 锁定为 zod；S2-A3 工作区实现应继续让 `listInvestigationRecordsByIssueId` 的 invalid 桶携带 `ZodIssue[]`，结构与 `listIssueCards` 对齐。
- **S1-A3 / S2-A3 存储键前缀契约**：`repo-debug:issue-card:<id>`（D-006）与工作区中的 `repo-debug:investigation-record:<recordId>` 两组独立前缀必须保持隔离；S2-A3-CG 完成前不要新增 `archive-document:` / `error-entry:`。
- **Electron 外壳已由 D-007 明确延后**。
- **Node 24 `--experimental-strip-types` 对相对 TS import 不自动补扩展名**：所有 `apps/desktop/scripts/*.mts` 与跨模块 import 一律带 `.ts`/`.mts` 后缀；S2-A3-CG 收束时继续检查这一点。
- **`npm run typecheck` 脚本（M-1 已修复）**：`apps/desktop/package.json` 第 11 行 `tsc --noEmit -p tsconfig.json`；`npm run build` 仍为 `tsc -b && vite build` 不变。S2-A3 需要下轮重新跑这些验证。
- **sandbox 权限扩展（S1-A2 round 引入）**：`.claude/settings.local.json` 的 `sandbox.filesystem.allowRead` 增加了 `~/.nvm/` / `~/.npm/`，`allowWrite` 增加了 `~/.npm/`。下轮 S2-A3-CG 提交时仍不得包含此文件。
- `listInvestigationRecordsByIssueId` 的排序契约：**valid 按 createdAt 升序（最早在前）**。和 `listIssueCards`（倒序）相反——语义差别：IssueCard 列表偏"最新卡优先展示"，Investigation 记录更接近"时间线增长，从早到晚读"。S2-A4 的 ArchiveDocument timeline 汇总建议沿用升序。
- `listInvestigationRecordsByIssueId` 的过滤契约：**前缀 `repo-debug:investigation-record:` + 读盘后 safeParse 通过后再过滤 `record.issueId === queryId`**。issueId 外键匹配失败的记录既不进 valid 也不进 invalid（它们结构合法，只是不属于这次查询）。
- IssuePane 状态层级（来自当前未提交 S2-A3 工作区）：`cardList` / `selectedIssueId` / `recordList` 三者在 IssuePane 作用域内共存；切换选中卡时同步读 `listInvestigationRecordsByIssueId(id)`。这需要 S2-A3-CG 验证和提交后才能作为后续 S2-A4 的可靠前提。
- WSL/Linux 迁移：运行基线已打通（W-L3）；后续未再积压迁移类残项。

## 如何启动当前桌面壳
```bash
cd apps/desktop
npm install    # 已执行过一次，依赖已落盘；换机时重跑
npm run dev    # 默认 http://localhost:5173 —— 打开后进入"问题卡区"：
               #   上层 IntakeForm：填表创建
               #   中层 ListView：点 Refresh 看已保存的卡（按 createdAt 倒序）；点卡片本身选中
               #   选中后：InvestigationAppendForm（type + note）→ 追记列表（按 createdAt 升序）
               #   下层 StorageControls：Save / Load sample 冒烟按钮（S1-A3 样例）
npm run build  # 产物到 apps/desktop/dist（当前 49 modules ~210 kB）

# Node 侧黑盒验证（不依赖浏览器）
node --experimental-strip-types scripts/verify-s1-a3.mts
node --experimental-strip-types scripts/verify-s2-a1.mts
node --experimental-strip-types scripts/verify-s2-a2.mts
node --experimental-strip-types scripts/verify-s2-a3.mts
```

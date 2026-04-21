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
  - S2-A3：InvestigationRecord 追加。中等粒度合并"列表点击选中 + 追记"一次落地：
    - `apps/desktop/src/domain/investigation-intake.ts`：纯工厂 `buildInvestigationRecordFromIntake`，trim → 空 issueId / 空 note 结构化拒绝 → `InvestigationRecordSchema.safeParse` → 结构化失败。
    - `apps/desktop/src/storage/investigation-record-store.ts`：键前缀 `repo-debug:investigation-record:<recordId>`，`saveInvestigationRecord` + `listInvestigationRecordsByIssueId(issueId)`；前缀扫描 → safeParse → filter by issueId → 按 createdAt 升序；结构化 invalid 桶。
    - `apps/desktop/src/App.tsx`：新增 `IssuePane` 容器，抬升 `cardList` / `selectedIssueId` / `recordList`；`IssueCardListView` 改为受控选中；新增 `InvestigationAppendForm` + `InvestigationRecordListView`。
    - `apps/desktop/src/App.css`：新增 `.list-item-select` 与 `.list-item-selected` 样式。
    - `apps/desktop/scripts/verify-s2-a3.mts`：6 断言 PASS，覆盖空存储、多 issue 过滤、createdAt 升序、空 note / 空 issueId 拒绝、坏 JSON / schema 不符 invalid、与 IssueCard store 双向隔离。
- 当前唯一执行中的原子任务：**无**。S2-A3-CG 已完成验证与提交收束；下一轮按下一任务选择流程重选唯一下一原子任务。
- 桌面壳当前形态：SPA。"Issue" 区块由 `IssuePane` 承载：上层 IntakeForm 创建卡；中层 ListView 列出并点击选中；选中后显示 InvestigationAppendForm + 追记列表；底部保留 sample StorageControls（S1-A3 冒烟）。footer：`S2-A3 · IssueCard intake + list select + InvestigationRecord append`。

## planning 与实际一致性检查
- `current.md` 已按 S2-A3-CG 收束后的状态改写：阶段完成定义第 2 项打勾；"当前唯一执行中的原子任务"置为无；前沿窗口把 S2-A4 提到首位、UI-V1 保留备选。
- `.agent-state/handoff.json` 本轮同步：`current_atomic_task` 改为 `WAITING_FOR_PLANNING_SELECTION`；`completed_atomic_tasks` 追加 `S2-A3_investigation_record_append`；`frontier_tasks` 变为 `[S2-A4, UI-V1]`；notes / risks 同步 S2-A3 落地细节。
- `AGENTS.md`、`README.md`、`architecture.md`、`roadmap.md`、`backlog.md` 与当前阶段无结构性冲突；README"当前进度"段仍停在 S1 描述，拟在 S2 主闭环整体完成后（S2-A4 后）统一更新。
- 本轮 S2-A3 commit 范围仅包含：`apps/desktop/src/domain/investigation-intake.ts`、`apps/desktop/src/storage/investigation-record-store.ts`、`apps/desktop/scripts/verify-s2-a3.mts`、`apps/desktop/src/App.tsx`、`apps/desktop/src/App.css`、`docs/planning/current.md`、`docs/planning/handoff.md`、`.agent-state/progress.md`、`.agent-state/handoff.json`、`.agent-state/session-log.md`。
- 本轮 commit 明确排除的工作区 untracked / 其它漂移：
  - `.claude/settings.local.json` / `.claude/scheduled_tasks.lock` / `.claude/settings.json` / `.claude/agents` / `.claude/commands` / `.claude/skills`：本地 Claude Code harness 痕迹。
  - shell rc（`.bash_profile` / `.bashrc` / `.profile` / `.zprofile` / `.zshrc`）、user VCS (`.gitconfig` / `.gitmodules`)、IDE (`.idea` / `.vscode`)、`.mcp.json`、`.ripgreprc`：用户本地环境文件，与当前原子任务无关。

## 依赖是否满足
- S2-A4（结案 → ErrorEntry + ArchiveDocument）：schema 已在 S1-A2 落地；S2-A3 的追记数据可承载 ArchiveDocument timeline 汇总；依赖已满足，可作为下一轮首选。
- UI-V1（浏览器冒烟）：无硬依赖，随时可做；S2-A3 新 UI 路径虽已由 Node 黑盒覆盖，但真实 DOM 交互尚未点过。
- M-1 / S2-A1 / S2-A2：已完成。

## 下一轮开始前必须先检查什么
1. 读 `AGENTS.md` 第 3/4/5 章（滚动前沿 / 下一任务选择 / 完成门）。
2. 读 `docs/planning/current.md` 的"当前唯一执行中的原子任务"与"前沿任务窗口"。**当前执行中的原子任务为"无"，S2-A3 已闭合并提交；下一轮第一件事是按「下一任务选择流程」重选唯一下一任务。**
3. 读 `.agent-state/handoff.json` 的 `current_stage` / `current_atomic_task` / `frontier_tasks` / `next_task_selection_basis`。
4. 跑 `git status` 与 `git log -5`，确认仓库与记录一致；期望最新一条 commit 是聚焦 S2-A3 的 `feat(desktop): add InvestigationRecord append flow (S2-A3)`。
5. 如 planning 与实际脱节（例如窗口里的任务已实际完成），**先更新 planning，再开始执行**。

## 下一步最推荐动作（候选，不是指令）
- **下一轮直接按「下一任务选择流程」重选唯一下一原子任务**（S2-A3 已闭合）。
- 推荐首选：**S2-A4 结案 → ErrorEntry + ArchiveDocument 生成**。这是 S2 完成定义最后一项的主路径。
- 推荐备选：**UI-V1 浏览器冒烟**。S2-A3 新增了选中 + 追记路径，真实 DOM 交互仍可抽时间确认。

> 上述只是建议。下一轮必须先按 `current.md` 的"下一任务选择流程"重新判断后再选定唯一一个。

## 现在不要做的事情
- 不要把 `backlog.md` 整体搬进 `current.md`。
- 不要一次性把 S2 所有剩余任务都展开成详细子任务表。
- 不要跳过 completion gate 直接推进下一任务（最小验证 + 交接更新 + commit 必须齐全）。
- 不要再改 `docs/product/产品介绍.md`。
- 不要在下一轮未重新选择前直接启动 S2-A4；必须先按下一任务选择流程确认唯一原子任务。
- 不要提前把 localStorage 改成 IndexedDB / 文件系统 / 远端同步；D-006 / D-007 的路线是"主闭环跑通后再评估"。
- 不要回头实装 Electron；D-007 明确延后。
- 不要在 schema 文件里加手写 type guard；已由 zod 统一处理（D-005）。
- 不要让 `listIssueCards` / `listInvestigationRecordsByIssueId` 混入其它实体；各自键前缀必须保持独立（S2-A4 要新增 `archive-document:` / `error-entry:` 前缀，不要共用）。

## 已踩坑与约束
- Vite 构建成功 ≠ Dev server 启动成功；浏览器侧人工交互验证仍未做。S2-A3 的选中 + 追记路径已由 Node 黑盒验证覆盖，但真实 DOM 交互仍可在 UI-V1 中确认。
- `apps/desktop/.gitignore` 已忽略 `node_modules` / `dist` / `*.tsbuildinfo` / `vite.config.{d.ts,js}`；根 `.gitignore` 忽略 `.codex`。
- schema 校验库已由 D-005 锁定为 zod；S2-A3 的 `listInvestigationRecordsByIssueId` invalid 桶携带 `ZodIssue[]`，结构与 `listIssueCards` 对齐。
- **S1-A3 / S2-A3 存储键前缀契约**：`repo-debug:issue-card:<id>`（D-006）与 `repo-debug:investigation-record:<recordId>` 两组独立前缀必须保持隔离；S2-A4 新增 `archive-document:` / `error-entry:` 时也要保持隔离。
- **Electron 外壳已由 D-007 明确延后**。
- **Node 24 `--experimental-strip-types` 对相对 TS import 不自动补扩展名**：所有 `apps/desktop/scripts/*.mts` 与跨模块 import 一律带 `.ts`/`.mts` 后缀；S2-A3 新文件已遵守。
- **`npm run typecheck` 脚本（M-1 已修复）**：`apps/desktop/package.json` 第 11 行 `tsc --noEmit -p tsconfig.json`；`npm run build` 仍为 `tsc -b && vite build` 不变。S2-A3-CG 中两项均已重新验证通过。
- **sandbox 权限扩展（S1-A2 round 引入）**：`.claude/settings.local.json` 的 sandbox.filesystem.allowRead 增加了 `~/.nvm/` / `~/.npm/`，allowWrite 增加了 `~/.npm/`。本轮 S2-A3 commit 未包含此文件。
- `listInvestigationRecordsByIssueId` 的排序契约：**valid 按 createdAt 升序（最早在前）**。和 `listIssueCards`（倒序）相反——语义差别：IssueCard 列表偏"最新卡优先展示"，Investigation 记录更接近"时间线增长，从早到晚读"。S2-A4 的 ArchiveDocument timeline 汇总建议沿用升序。
- `listInvestigationRecordsByIssueId` 的过滤契约：**前缀 `repo-debug:investigation-record:` + 读盘后 safeParse 通过后再过滤 `record.issueId === queryId`**。issueId 外键匹配失败的记录既不进 valid 也不进 invalid（它们结构合法，只是不属于这次查询）。
- IssuePane 状态层级：`cardList` / `selectedIssueId` / `recordList` 三者在 IssuePane 作用域内共存；切换选中卡时同步读 `listInvestigationRecordsByIssueId(id)`。S2-A4 如新增 closeout 表单，建议继续挂在 IssuePane。
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

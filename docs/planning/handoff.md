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
  - S2-A2：IssueCard 列表视图。`apps/desktop/src/storage/issue-card-store.ts` 新增 `listIssueCards(): IssueCardListResult`，前缀扫描 + 逐条 safeParse，返回 `{valid: IssueCardSummary[], invalid: IssueCardListInvalidEntry[]}`（valid 按 createdAt 倒序、invalid 按 id 字典序）；同文件导出 `IssueCardSummary` / `IssueCardListInvalidEntry` / `IssueCardListResult` 类型；`App.tsx` 新增 `IssueCardListView` 组件（Refresh 按钮 + valid / invalid 分区渲染），stage footer 改为 `S2-A2 · IssueCard intake + list view`；`App.css` 增加 list-view / list-item 样式。`apps/desktop/scripts/verify-s2-a2.mts` 覆盖 5 条路径：空存储 → 两条合法（倒序）→ 坏 JSON 进 invalid[parse_error] → schema 不符进 invalid[validation_error] → 外来前缀忽略。`npm run build` 46 modules ~205 kB 通过；全三条 verify 脚本无倒退。
- 当前唯一执行中的原子任务：无。等待下一轮从 S2 前沿窗口选择。
- 桌面壳当前形态：SPA。"Issue" 区块三层堆叠：上=IntakeForm（创建）/ 中=ListView（列出所有）/ 下=StorageControls（sample 冒烟）。footer：`S2-A2 · IssueCard intake + list view`。

## planning 与实际一致性检查
- `current.md` 已按 S2-A2 完成后的前沿窗口改写：阶段完成定义 schema 校验与 Node verify 两项新增标 ✓；前沿窗口改为 [S2-A3 追记, S2-A4 预规划, M-1]。
- `.agent-state/handoff.json` 本轮同步更新：`completed_atomic_tasks` 追加 `S2-A2_issue_card_list_view`；`frontier_tasks` 替换为 [S2-A3, S2-A4(预), M-1]；risks / notes 对齐。
- `AGENTS.md`、`README.md`、`architecture.md`、`roadmap.md`、`backlog.md` 与当前阶段无结构性冲突；README"当前进度"段仍停在 S1 描述，拟在 S2 主闭环整体完成后（S2-A4 后）统一更新，本轮不动。
- 无"已完成但未提交"的脱节项（以本轮 S2-A2 commit 为准）。
- 未承诺但需要记住：`.claude/settings.local.json` sandbox 漂移 + 多个本地工具未跟踪文件（.bashrc / .zshrc / .idea / .vscode 等）仍在工作区，本轮 commit 同样未纳入。

## 依赖是否满足
- S2-A3（InvestigationRecord 追加）：schema 已在 S1-A2 落地（`investigation-record.ts`）。依赖当前 UI 的"选中 IssueCard"入口——S2-A2 的 ListView 目前只显示，不维持"当前选中"state；S2-A3 落地时应先在 ListView 上加 onClick 选中 + 抬升 state 到 App 级。或者干脆在 S2-A3 里把"选中"和"追记"一起做（仍属一个原子任务，只要 commit message 聚焦即可，但更保险的原子划分是：S2-A2b 选中语义 + S2-A3 追记）。下一轮评估时请重新判断粒度。
- S2-A4（结案 → ErrorEntry + ArchiveDocument）：依赖 S2-A3 的追记能跑通。还需要 error-entry / archive-document 的 store（目前只有 schema）。属于 S2 后半段，暂不拉入前沿。
- M-1（typecheck 脚本修复）：独立一行改动，无阻塞，任意轮次可插入。

## 下一轮开始前必须先检查什么
1. 读 `AGENTS.md` 第 3/4/5 章（滚动前沿 / 下一任务选择 / 完成门）。
2. 读 `docs/planning/current.md` 的"当前唯一执行中的原子任务"与"前沿任务窗口"。
3. 读 `.agent-state/handoff.json` 的 `current_stage` / `current_atomic_task` / `frontier_tasks` / `next_task_selection_basis`。
4. 跑 `git status` 与 `git log -5`，确认仓库与记录一致。
5. 如 planning 与实际脱节（例如窗口里的任务已实际完成），**先更新 planning，再开始执行**。

## 下一步最推荐动作（候选，不是指令）
- 推荐：**S2-A3 InvestigationRecord 追加**。是 S2 完成定义第 2 项（追记），依赖 schema 已就绪；推进后解锁 S2-A4 结案归档。实现提示（两种粒度，下一轮可自行裁定）：
  - 小原子粒度：先做 "S2-A2b 列表点击选中 + 抬升 currentIssueId"（仅 UI + state，小改动），再做 "S2-A3 追记" 单独一轮；
  - 中等粒度：一轮同时做选中 + 追记，但 commit 聚焦在"追记功能接入"（理由：选中是追记的前提，强拆反而割裂语义）。
  - storage 建议：`apps/desktop/src/storage/investigation-record-store.ts`，key 形如 `repo-debug:investigation-record:<recordId>`，每条记录里带 `issueId` 字段作外键；listByIssueId 时遍历前缀 + safeParse + filter(record.issueId === x) + 按 timestamp 排序。
  - 验证：新建 `scripts/verify-s2-a3.mts`，把"给 IssueCard A 追加两条、给 IssueCard B 追加一条、list(A) 返回两条按时间升序"跑一遍。
- 备选：**M-1**（一行改动）。若下一轮想要一个极低成本的插入式任务来消噪，这是最合适的窗口。
- 不推荐下一轮就直接做 S2-A4：闭环归档需要先有追记数据支撑。

> 上述只是建议。下一轮必须按 `current.md` 的"下一任务选择流程"重新判断后再选定唯一一个。

## 现在不要做的事情
- 不要把 `backlog.md` 整体搬进 `current.md`。
- 不要一次性把 S2 所有剩余任务都展开成详细子任务表。
- 不要跳过 completion gate 直接推进下一任务（最小验证 + 交接更新 + commit 必须齐全）。
- 不要再改 `docs/product/产品介绍.md`。
- 不要在 S2-A3 里顺手把 ErrorEntry / ArchiveDocument 的存储一起做；违反 D-003。
- 不要提前把 localStorage 改成 IndexedDB / 文件系统 / 远端同步；D-006 / D-007 的路线是"主闭环跑通后再评估"。
- 不要回头实装 Electron；D-007 明确延后。
- 不要在 schema 文件里加手写 type guard；已由 zod 统一处理（D-005）。
- 不要让 `listIssueCards` 混入其它实体（InvestigationRecord / ErrorEntry / ArchiveDocument）；S2-A3 加新实体时用独立前缀，不要合并。

## 已踩坑与约束
- Vite 构建成功 ≠ Dev server 启动成功；浏览器侧人工交互验证（点击 Create / Refresh / Save / Load）仍未做。S2-A3 落地时如条件允许，建议本机真点一次。
- `apps/desktop/.gitignore` 已忽略 `node_modules` / `dist` / `*.tsbuildinfo` / `vite.config.{d.ts,js}`；根 `.gitignore` 忽略 `.codex`。
- schema 校验库已由 D-005 锁定为 zod；S2-A2 的 `listIssueCards` 在 invalid 桶里携带 `ZodIssue[]`，上层可以用 `issue.path.join(".") + issue.message` 生成可读错误，和 S2-A1 一样的模式。
- **S1-A3 存储选型已由 D-006 锁定**：`window.localStorage`，键名 `repo-debug:issue-card:<id>`。S2-A3 新建的 investigation-record 存储建议独立前缀（例如 `repo-debug:investigation-record:`）以便 `listIssueCards` 与 `listInvestigationRecords` 互不污染。
- **Electron 外壳已由 D-007 明确延后**：不在当前阶段前沿窗口。
- **Node 24 `--experimental-strip-types` 对相对 TS import 不自动补扩展名**：S2-A2 在 issue-card-store.ts 里继续用 `.ts` 后缀；verify-s2-a2.mts 的动态 import 同样。S2-A3 新写脚本 / 新模块跨模块相对 import 一律保持这个习惯。
- **`npm run typecheck` 脚本当前报错 TS6310**：`tsc -b --noEmit` 与 composite referenced project 冲突。临时替代：`npx tsc --noEmit -p tsconfig.json`。修复在候选 M-1。
- **sandbox 权限扩展（S1-A2 round 引入）**：`.claude/settings.local.json` 的 `sandbox.filesystem.allowRead` 增加了 `~/.nvm/` / `~/.npm/`，`allowWrite` 增加了 `~/.npm/`。本轮 S2-A2 commit 未包含此文件。
- `listIssueCards` 的排序契约：**valid 按 createdAt 倒序（最新在前）、invalid 按 id 字典序升序**。这是显式决策，S2-A3 的 list UI 若要展示时间线建议遵循一致的"倒序展示最新"。
- `listIssueCards` 的过滤契约：**只扫描以 `repo-debug:issue-card:` 开头的 key**。外来前缀（例如 sample 按钮无关的 localStorage 项）不会被触碰。S2-A3 的 investigation-record list 要遵循同样的前缀隔离原则。
- WSL/Linux 迁移：运行基线已打通（W-L3）；后续未再积压迁移类残项。

## 如何启动当前桌面壳
```bash
cd apps/desktop
npm install    # 已执行过一次，依赖已落盘；换机时重跑
npm run dev    # 默认 http://localhost:5173 —— 打开后进入"问题卡区"：
               #   上层 IntakeForm：填表创建
               #   中层 ListView：点 Refresh 看已保存的卡（按 createdAt 倒序）
               #   下层 StorageControls：Save / Load sample 冒烟按钮
npm run build  # 产物到 apps/desktop/dist（当前 46 modules ~205 kB）

# Node 侧黑盒验证（不依赖浏览器）
node --experimental-strip-types scripts/verify-s1-a3.mts
node --experimental-strip-types scripts/verify-s2-a1.mts
node --experimental-strip-types scripts/verify-s2-a2.mts
```

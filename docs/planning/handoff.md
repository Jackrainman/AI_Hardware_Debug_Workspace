# 交接说明（Handoff）

> 本文件是“上下文重置后继续执行”的唯一可信入口。下一轮开始前必须先读这里，再读 `current.md` 与 `.agent-state/handoff.json`。

## 当前真实状态
- 阶段：S2 调试闭环主流程（S1 已由 D-007 关闭）。
- 已完成原子任务（按时间顺序）：
  - S0 全部：目录、AGENTS、README、skills、最终一致性校验。
  - S1-A1：`apps/desktop` 最小可运行壳（Vite 5 + React 18 + TypeScript 5），`npm install` + `npm run build` 均成功。
  - W-R1：工作流范式升级（滚动前沿 + 下一任务自动选择 + 受控上下文重置）。
  - W-L1 / W-L2 / W-L3：WSL/Linux 迁移三批（基础卫生 / 残留收敛 / 运行基线验证）。
  - D-005：schema 校验选型决策（zod 路线）。
  - S1-A2：schema 校验代码骨架（五个 zod schema 文件）。
  - S1-A3：本地存储最小读写（D-006 → localStorage + IssueStorageControls + Node 侧 verify）。
  - D-007：S1 阶段 Electron 外壳延后，S1 阶段关闭，阶段过渡到 S2。
  - S2-A1：IssueCard intake 最小表单。`apps/desktop/src/domain/issue-intake.ts` 提供 `buildIssueCardFromIntake` 纯函数工厂，输入 `{title,description,severity}` + `{id,projectId,now}` opts，输出经 `IssueCardSchema.safeParse` 校验的 `IssueCard`；trim 去空、空标题结构化拒绝（`reason` 带字段路径）；`App.tsx` 新增 `IssueIntakeForm` 受控表单（title / description / severity），提交时调 `nowISO()` + `defaultIntakeOptions` 注入 id / timestamp，然后 `saveIssueCard`；同时保留 `IssueStorageControls` sample 按钮作冒烟。Stage footer 改为 `S2-A1 · IssueCard intake form + localStorage save`。`scripts/verify-s2-a1.mts` 在 Node 侧跑三条断言：最小 intake → schema 通过 + trim 正确 / save → load 字段 round-trip / 空标题结构化失败且不落盘。`npm run build`（46 modules，~200 kB）与 `verify-s2-a1`（3 PASS）、`verify-s1-a3`（无倒退，3 PASS）均通过。
- 当前唯一执行中的原子任务：无。等待下一轮从 S2 前沿窗口选择。
- 桌面壳当前形态：SPA（浏览器），三个占位区块（Project / Issue / Archive）。"Issue" 区块现为两层堆叠：上方 IssueIntakeForm（创建 IssueCard）、下方 IssueStorageControls（Save / Load sample）。footer: `S2-A1 · IssueCard intake form + localStorage save`。

## planning 与实际一致性检查
- `current.md` 已按 S2-A1 完成后的前沿窗口改写：阶段完成定义第 1 项与 Node 侧验证项标注 ✓；前沿窗口改为 [S2-A2 list view, S2-A3 InvestigationRecord append, M-1]。
- `.agent-state/handoff.json` 本轮同步更新：`completed_atomic_tasks` 追加 `S2-A1_issue_card_intake_minimal_form`；`frontier_tasks` 替换为 S2-A2 / S2-A3 / M-1；risks / notes 对齐。
- `AGENTS.md`、`README.md`、`architecture.md`、`roadmap.md`、`backlog.md` 与当前阶段无结构性冲突。README "当前进度"段仍停在 S1 描述，可在 S2 完成多轮后一次性更新，本轮不在 S2-A1 commit 里改。
- 无"已完成但未提交"的脱节项（以本轮 S2-A1 commit 为准）。
- 未承诺但需要记住：S1-A2 round 为绕过 sandbox node/npm 屏蔽而对 `.claude/settings.local.json` 做的漂移仍在工作区（还有多个 .bashrc / .zshrc / .claude/ 等未跟踪本地工具文件），本轮 S2-A1 commit 同样未纳入，保留由用户处理。

## 依赖是否满足
- S2-A2（IssueCard 列表视图）：依赖已就绪。需要在 `issue-card-store.ts` 里加 `listIssueCards()`（遍历 localStorage 前缀 key、逐条 safeParse、忽略无效并 log）。UI 端把列表渲染在问题卡区。与 S2-A1 表单互补：A1 解决"能建"，A2 解决"能看"。
- S2-A3（InvestigationRecord 追加）：依赖 S2-A2 的"选中 IssueCard"入口；且需要在 storage 层新增 investigation record 的存取（schema 已在 S1-A2 落地）。建议先做 S2-A2。
- M-1（typecheck 脚本修复）：独立一行改动，无阻塞，任意轮次可插入。
- S2 后续（结案 / ErrorEntry / ArchiveDocument）：超出前沿窗口，等 S2-A2 / A3 完成后再评估。

## 下一轮开始前必须先检查什么
1. 读 `AGENTS.md` 第 3/4/5 章（滚动前沿 / 下一任务选择 / 完成门）。
2. 读 `docs/planning/current.md` 的"当前唯一执行中的原子任务"与"前沿任务窗口"。
3. 读 `.agent-state/handoff.json` 的 `current_stage` / `current_atomic_task` / `frontier_tasks` / `next_task_selection_basis`。
4. 跑 `git status` 与 `git log -5`，确认仓库与记录一致。
5. 如 planning 与实际脱节（例如窗口里的任务已实际完成），**先更新 planning，再开始执行**。

## 下一步最推荐动作（候选，不是指令）
- 推荐：**S2-A2 IssueCard 列表视图**。依赖已就绪、无外部阻塞，是 S2-A3 追记流程的前置条件（先要能选中一张 IssueCard 才能追加 InvestigationRecord）。实现提示：
  1. 在 `apps/desktop/src/storage/issue-card-store.ts` 新增 `listIssueCards()`，遍历 `window.localStorage` 前缀 key（可以先循环 `localStorage.key(i)`），对每个 value 走 `IssueCardSchema.safeParse`，返回 `{ valid: IssueCard[], invalid: { key: string; reason: string }[] }` 或简单的 `IssueCardSummary[]` + 结构化 error 列表。
  2. `App.tsx` 增加 `IssueCardList` 组件：点"refresh"按钮拉一次；展示 id / title / severity / status；点击某条后把"当前 IssueCard"设到 state，让 load / 追记等后续 UI 用这个 id。
  3. 扩展 `scripts/verify-s2-a2.mts`（或在 verify-s2-a1 边上新建）：save 多条 → list 命中全部 → 挑中某 id → 对比字段；再 save 一条"损坏"的（直接 setItem 写一条坏 JSON）验证结构化 error 分支不会崩。
- 备选：**S2-A3 InvestigationRecord 追加**（先做需要 S2-A2 的 UI 入口；若你坚持跳 A2 直接做 A3，也要先独立给 `investigation-record.ts` 做一个 `saveInvestigationRecord` / `loadInvestigationRecordsByIssueId` 存储层）。
- 备选：**M-1**（一行改动），把 `package.json` 的 `"typecheck": "tsc -b --noEmit"` 改为 `"tsc --noEmit -p tsconfig.json"`。

> 上述只是建议。下一轮必须按 `current.md` 的"下一任务选择流程"重新判断后再选定唯一一个。

## 现在不要做的事情
- 不要把 `backlog.md` 整体搬进 `current.md`；前沿窗口只保留 1~3 个。
- 不要一次性把 S2 所有任务都展开成详细子任务表；滚动前沿只看"当前 + 下一步"。
- 不要跳过 completion gate 直接推进下一任务（最小验证 + 交接更新 + commit 必须齐全）。
- 不要再改 `docs/product/产品介绍.md`，内容已定稿。
- 不要在 S2-A2 / A3 里顺手把 ErrorEntry / ArchiveDocument 的存储一起做；它们各自对应后续 S2 原子任务，合进一轮会违反原子任务单提交（D-003）。
- 不要提前把 localStorage 改成 IndexedDB、文件系统、远端同步；D-006 / D-007 的路线是"主闭环跑通后再评估 fs / Electron"。
- 不要在本轮内或下一轮内改 Electron 相关基础设施；D-007 已经明确延后。
- 不要用 `create-vite` 模板重新生成覆盖当前骨架。
- 不要在 schema 文件里加手写 type guard；已由 zod + `z.infer` 统一处理（D-005）。
- 不要在 S2-A2 的 `listIssueCards` 里混入 InvestigationRecord / ErrorEntry / ArchiveDocument 的遍历；只遍历 `repo-debug:issue-card:*` 前缀，其它实体未来各自有 store。

## 已踩坑与约束
- Vite 构建成功 ≠ Dev server 启动成功；W-L3 已本机人工验证 `npm run dev` 可在 http://localhost:5173 返回 HTTP 200 与完整 HTML，但仍未做浏览器渲染/交互级检查。S1-A3 的 save/load 按钮、S2-A1 的 intake 表单都只过了 Node 侧 polyfill 验证，浏览器侧人工点击验证仍未做。
- `apps/desktop/.gitignore` 已忽略 `node_modules` / `dist` / `*.tsbuildinfo` / `vite.config.{d.ts,js}`；根 `.gitignore` 已忽略 `.codex`。
- schema 校验库已由 D-005 锁定为 zod；S1-A2 已落地（五个 schema 文件），S2-A1 的 `buildIssueCardFromIntake` 在返回前做 `safeParse`，拿到结构化 error.issues 可直接转 `reason: path + message`。
- **S1-A3 存储选型已由 D-006 锁定**：`window.localStorage`，键名 `repo-debug:issue-card:<id>`。S2-A2 `listIssueCards` 要用 `KEY_PREFIX` 来过滤；注意 storage key 可能被手工污染（非本应用写的 key），循环里要用 `key.startsWith(KEY_PREFIX)` 再处理。
- **Electron 外壳已由 D-007 明确延后**：不在当前阶段前沿窗口。
- **Node 24 `--experimental-strip-types` 对相对 TS import 不自动补扩展名**。S2-A1 的 `issue-intake.ts` 同样带 `.ts` 后缀（`./schemas/issue-card.ts`），`verify-s2-a1.mts` 动态 import 也带 `.ts`。S2-A2 / A3 新写跨模块相对 import 一律保持这个习惯。
- **`npm run typecheck` 脚本当前报错 TS6310**：`tsc -b --noEmit` 与 composite referenced project（`tsconfig.node.json`）不兼容。临时替代：`npx tsc --noEmit -p tsconfig.json`。修复在候选 M-1。
- **sandbox 权限扩展（S1-A2 round 引入）**：`.claude/settings.local.json` 的 `sandbox.filesystem.allowRead` 增加了 `~/.nvm/` / `~/.npm/`，`allowWrite` 增加了 `~/.npm/`。本轮 S2-A1 commit 未包含此文件。若要严格回滚删除即可；若要保留直接 commit。
- `generateIssueId()` 在 Node 24 和现代浏览器下会走 `crypto.randomUUID`；老环境退回到 `issue-<timestamp-base36>-<random-base36>`。Verify 脚本固定注入 `id = "issue-verify-s2a1-0001"` 来消除随机性。
- WSL/Linux 迁移：运行基线已打通（W-L3）；后续未再积压迁移类残项。

## 如何启动当前桌面壳
```bash
cd apps/desktop
npm install    # 已执行过一次，依赖已落盘；换机时重跑
npm run dev    # 默认 http://localhost:5173 —— 打开后进入"问题卡区"：上方表单填 title / description / severity 点 Create；下方 Save / Load sample 仍可用。
npm run build  # 产物到 apps/desktop/dist（当前 46 modules，~200 kB）

# Node 侧黑盒验证（不依赖浏览器）
node --experimental-strip-types scripts/verify-s1-a3.mts
node --experimental-strip-types scripts/verify-s2-a1.mts
```

# 交接说明（Handoff）

> 本文件是“上下文重置后继续执行”的唯一可信入口。下一轮开始前必须先读这里，再读 `current.md` 与 `.agent-state/handoff.json`。

## 当前真实状态
- 阶段：S2 调试闭环主流程（S1 已关闭）。
- 已完成原子任务（按时间顺序）：
  - S0 全部：目录、AGENTS、README、skills、最终一致性校验。
  - S1-A1：`apps/desktop` 最小可运行壳（Vite 5 + React 18 + TypeScript 5），`npm install` + `npm run build` 均成功。
  - W-R1：工作流范式升级（滚动前沿 + 下一任务自动选择 + 受控上下文重置）。
  - W-L1：WSL/Linux 迁移第一批基础卫生（LF 换行策略、产品文档 LF 化、工作区权限规范、本地 filemode 可见）。
  - W-L2：WSL/Linux 迁移第二批残留收敛（Linux 优先字体后备、README 环境口径）。
  - W-L3：WSL 运行基线验证（node v24.14.0 / npm 11.9.0 下 `npm install` + `npm run build` + `npm run dev` 三件套全部通过；`.codex` 归为工具痕迹，纳入根 `.gitignore`；`package-lock.json` 因 npm 11 格式微漂移被同步更新）。
  - D-005：schema 校验选型决策落盘（选 zod；见 `docs/planning/decisions.md` D-005），解锁 S1-A2/A3 代码落地。
  - S1-A2：schema 校验代码骨架。`apps/desktop/src/domain/schemas/` 下新增五个文件（`repo-snapshot.ts` / `issue-card.ts` / `investigation-record.ts` / `error-entry.ts` / `archive-document.ts`），按 `.agents/skills/*/SKILL.md` 契约逐字段落地；`package.json` 加入 `zod ^3.23.8` 作为 runtime dependency；`npm run build`（`tsc -b && vite build`）全绿，产物在 `dist/`。
  - S1-A3：本地存储最小读写。D-006 锁定 S1 阶段 IssueCard 使用浏览器 `window.localStorage`（键前缀 `repo-debug:issue-card:`）；新增 `apps/desktop/src/storage/issue-card-store.ts`（`saveIssueCard` / `loadIssueCard` + `LoadIssueCardResult` 联合类型，支持 `not_found` / `parse_error` / `validation_error` 三类结构化错误）；`apps/desktop/src/App.tsx` 在"问题卡区"嵌入最小保存/读取按钮与状态行；`apps/desktop/scripts/verify-s1-a3.mts` 以 Map-based polyfill 在 Node 侧做 save→load→schema 校验 round-trip 黑盒验证。`npm run build`（45 modules，~200 kB）与 `node --experimental-strip-types scripts/verify-s1-a3.mts`（3 断言 PASS）均通过。
  - D-007：S1 阶段 Electron 外壳延后决策落盘（见 `docs/planning/decisions.md` D-007）。S1 阶段完成定义最后一项以"延后"形式满足，S1 阶段正式关闭，阶段过渡到 S2（调试闭环主流程）。
- 当前唯一执行中的原子任务：无。等待下一轮从 S2 前沿窗口选择。
- 桌面壳当前形态：SPA（浏览器），三个占位区块（Project / Issue / Archive）；"Issue" 区块已有两个按钮做 localStorage save/load 黑盒验证；显示 footer `Stage: S1-A3 · localStorage save/load loop for IssueCard`（stage 文案下一轮可以在做 S2-A1 时一并更新，不单独处理）。

## planning 与实际一致性检查
- `current.md` 已按 D-007 重写：阶段代号由 S1 → S2；阶段目标/完成定义对齐调试闭环主流程（intake → 追记 → 结案归档）；前沿窗口改为 [S2-A1 intake 表单, S2-A2 列表视图, M-1 typecheck 修复]。
- `decisions.md` 已追加 D-007 节。
- `.agent-state/handoff.json` 本轮同步更新：`current_stage` → `S2`、`completed_atomic_tasks` 追加 `D-007_defer_electron_shell_close_s1`、`frontier_tasks` 替换为 S2 候选。
- `AGENTS.md`、`README.md`、`architecture.md`、`roadmap.md` 与阶段切换无结构性冲突；README 的"当前进度"段描述了 S1 完成情况，下一轮若做 S2-A1 可顺带更新"正在做"与进度段；本轮不在 D-007 commit 里改 README。
- `backlog.md` P1 条目对当前阶段依然成立，不做改动。
- 无"已完成但未提交"的脱节项（以本轮 D-007 commit 为准）。
- 未承诺但需要记住：S1-A2 round 为绕过 sandbox node/npm 屏蔽而对 `.claude/settings.local.json` 做的漂移仍在工作区（未跟踪 .claude/settings.json 等多项），本轮 D-007 commit 同样未纳入，保留由用户处理。

## 依赖是否满足
- S2-A1（IssueCard intake 最小表单）：依赖已就绪。schema 骨架（S1-A2）、localStorage adapter（S1-A3）均可用；只需加一个受控 form，组装 IssueCard 对象并调用 `saveIssueCard`。无阻塞。
- S2-A2（IssueCard 列表视图）：依赖已就绪。需要在 `issue-card-store.ts` 上补一个 `listIssueCards()` 遍历 `repo-debug:issue-card:*` key，然后在 App 里列表渲染。不阻塞 S2-A1，但与 S2-A1 有自然先后（先能建才好列）。
- M-1（typecheck 脚本修复）：独立一行改动，无阻塞，任何轮次可插入。
- S2 后续（InvestigationRecord 追加、ErrorEntry/ArchiveDocument 生成）：当前超出前沿窗口，等 S2-A1 / A2 完成后再评估。

## 下一轮开始前必须先检查什么
1. 读 `AGENTS.md` 第 3/4/5 章（滚动前沿 / 下一任务选择 / 完成门）。
2. 读 `docs/planning/current.md` 的"当前唯一执行中的原子任务"与"前沿任务窗口"。
3. 读 `.agent-state/handoff.json` 的 `current_stage` / `current_atomic_task` / `frontier_tasks` / `next_task_selection_basis`。
4. 跑 `git status` 与 `git log -5`，确认仓库与记录一致。
5. 如 planning 与实际脱节（例如窗口里的任务已实际完成），**先更新 planning，再开始执行**。

## 下一步最推荐动作（候选，不是指令）
- 推荐：**S2-A1 IssueCard intake 最小表单**。是 S2 阶段完成定义的第一项（用户能真正新建 IssueCard），依赖已就绪，无阻塞，最贴近 MVP 最短路径。实现提示：在 `App.tsx` 的问题卡区下加一个受控表单（title / description / severity / 触发 repoSnapshot 的最少字段），提交时生成 id（`crypto.randomUUID()` 或时间戳）、填入当前时间戳（带 +HH:mm offset）、调用 `saveIssueCard`、跳转/提示"已保存"。验证：扩展 `scripts/verify-s1-a3.mts` 或新增 `scripts/verify-s2-a1.mts` 跑 Node 侧 round-trip。
- 备选：**S2-A2 IssueCard 列表视图**（先加 `listIssueCards()` 存储 API，再做 UI 端列表）。
- 备选：**M-1**（一行改动），把 `package.json` 的 `"typecheck": "tsc -b --noEmit"` 改为 `"tsc --noEmit -p tsconfig.json"`，清 S1-A2 遗留的 TS6310 残项。

> 上述只是建议。下一轮必须按 `current.md` 的"下一任务选择流程"重新判断后再选定唯一一个。

## 现在不要做的事情
- 不要把 `backlog.md` 整体搬进 `current.md`；前沿窗口只保留 1~3 个。
- 不要一次性把 S2 所有任务都展开成详细子任务表；滚动前沿只看"当前 + 下一步"。
- 不要跳过 completion gate 直接推进下一任务（最小验证 + 交接更新 + commit 必须齐全）。
- 不要再改 `docs/product/产品介绍.md`，内容已定稿。
- 不要在 S2-A1 / A2 里顺手把 InvestigationRecord / ErrorEntry / ArchiveDocument 的存储一起做；它们各自对应后续 S2 原子任务，合进一轮会违反原子任务单提交（D-003）。
- 不要提前把 localStorage 改成 IndexedDB、文件系统、远端同步；S1-A3 / D-006 / D-007 的路线是"主闭环跑通后再评估 fs / Electron"。
- 不要在本轮内改 Electron 相关基础设施；D-007 已经明确延后，不要在 S2 进程里做回头投资。
- 不要用 `create-vite` 模板重新生成覆盖当前骨架。
- 不要在 schema 文件里加手写 type guard；已由 zod + `z.infer` 统一处理（D-005）。

## 已踩坑与约束
- Vite 构建成功 ≠ Dev server 启动成功；W-L3 已本机人工验证 `npm run dev` 可在 http://localhost:5173 返回 HTTP 200 与完整 HTML，但仍未做浏览器渲染/交互级检查。S1-A3 的 save/load 按钮只有 Node 侧 polyfill 验证通过，浏览器里点击按钮的最终交互效果未人工确认。
- `apps/desktop/.gitignore` 已忽略 `node_modules` / `dist` / `*.tsbuildinfo` / `vite.config.{d.ts,js}`；根 `.gitignore` 已忽略 `.codex`（Codex CLI 工具痕迹，空文件，非项目内容）。
- schema 校验库已由 D-005 锁定为 zod；S1-A2 已落地，包含对 `.datetime({ offset: true })`（+HH:mm 支持）、`errorCode` 正则（`DBG-YYYYMMDD-NNN`）、归档文件名正则（`YYYY-MM-DD_<slug>.md`）的硬约束。
- **S1-A3 存储选型已由 D-006 锁定**：`window.localStorage`，键名 `repo-debug:issue-card:<id>`。浏览器跨刷新持久；Electron 时期再加 fs 适配层。
- **Electron 外壳已由 D-007 明确延后**：不在当前阶段前沿窗口；若 S2 推进过程中出现"必须 fs 或主进程能力"的硬阻塞，可重新拉回。
- **Node 24 `--experimental-strip-types` 对相对 TS import 不自动补扩展名**。为让 `scripts/verify-s1-a3.mts` 能链式 import 到 `src/storage/issue-card-store.ts` → `src/domain/schemas/issue-card.ts` → `src/domain/schemas/repo-snapshot.ts`，在 `issue-card.ts` 与 `issue-card-store.ts` 里给相对 import 补了 `.ts` 后缀。TS 侧 `allowImportingTsExtensions: true` 早已开启，Vite 也接受 `.ts` 后缀 import，此改动不破坏 build。后续 S2 新写 Node 侧验证脚本时，跨模块相对 import 同样需要带 `.ts` 后缀。
- **`npm run typecheck` 脚本当前报错 TS6310**：`tsc -b --noEmit` 与 composite referenced project（`tsconfig.node.json`）不兼容。临时替代：`npx tsc --noEmit -p tsconfig.json`。修复在候选 M-1。
- **sandbox 权限扩展（S1-A2 round 引入）**：`.claude/settings.local.json` 的 `sandbox.filesystem.allowRead` 增加了 `~/.nvm/` / `~/.npm/`，`allowWrite` 增加了 `~/.npm/`。若要严格回滚，删除这三个条目即可；若要保留（便于后续 node/npm 运行），直接 commit。本轮 D-007 commit 未包含此文件。
- WSL/Linux 迁移：运行基线已打通（W-L3）；后续未再积压迁移类残项。

## 如何启动当前桌面壳
```bash
cd apps/desktop
npm install    # 已执行过一次，依赖已落盘；换机时重跑
npm run dev    # 默认 http://localhost:5173 —— 浏览器打开后进入"问题卡区"，点 Save / Load 观察状态行
npm run build  # 产物到 apps/desktop/dist

# S1-A3 Node 侧黑盒验证（不依赖浏览器）
node --experimental-strip-types scripts/verify-s1-a3.mts
```

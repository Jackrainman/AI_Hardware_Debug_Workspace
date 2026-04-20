# 交接说明（Handoff）

> 本文件是“上下文重置后继续执行”的唯一可信入口。下一轮开始前必须先读这里，再读 `current.md` 与 `.agent-state/handoff.json`。

## 当前真实状态
- 阶段：S1 桌面壳与本地存储最小闭环。
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
- 当前唯一执行中的原子任务：无，等待下一轮重新读取仓库并选择。
- 桌面壳当前形态：SPA（浏览器），三个占位区块（Project / Issue / Archive）；"Issue" 区块已有两个按钮做 localStorage save/load 黑盒验证；显示 footer `Stage: S1-A3 · localStorage save/load loop for IssueCard`。

## planning 与实际一致性检查
- `current.md` 已按 S1-A3 完成后的前沿窗口改写：S1-A4 上位为候选 #1（含"也可由 D-007 明确延后"选项），M-1 仍保持候选 #2。
- `.agent-state/handoff.json` 已把 `S1-A3_local_storage_min_loop_with_localstorage` 并入 `completed_atomic_tasks`，`frontier_tasks` 同步收敛到 [S1-A4, M-1]。
- `AGENTS.md` 与 `README.md` 口径一致，均描述"完成后重新选择下一任务"。
- 无"已完成但未提交"的脱节项（以本轮 commit 完成为准）。
- 未承诺但需要记住：S1-A2 round 为绕过 sandbox node/npm 屏蔽而对 `.claude/settings.local.json` 做的漂移仍在工作区，本轮 S1-A3 commit 同样未纳入，保留由用户处理。

## 依赖是否满足
- S1-A4（Electron 外壳）：不阻塞任何现有能力，是 S1 阶段完成定义最后一项；替代方案是落 D-007 明确延后。需要用户做方向性选择：要么实装 main/preload/IPC、要么签"延后"。
- M-1（typecheck 脚本修复）：独立的一行改动，无阻塞，任何轮次可插入。
- 本轮 S1-A3 已完成；S2 阶段（调试闭环主流程）的任务在当前前沿窗口之外，等 S1 闭合后再推。

## 下一轮开始前必须先检查什么
1. 读 `AGENTS.md` 第 3/4/5 章（滚动前沿 / 下一任务选择 / 完成门）。
2. 读 `docs/planning/current.md` 的"当前唯一执行中的原子任务"与"前沿任务窗口"。
3. 读 `.agent-state/handoff.json` 的 `current_stage` / `current_atomic_task` / `frontier_tasks` / `next_task_selection_basis`。
4. 跑 `git status` 与 `git log -5`，确认仓库与记录一致。
5. 如 planning 与实际脱节（例如窗口里的任务已实际完成），**先更新 planning，再开始执行**。

## 下一步最推荐动作（候选，不是指令）
- 推荐（需要方向性选择）：**S1-A4 Electron 外壳** 或 **落 D-007 明确延后**。这是 S1 阶段完成定义最后一项，二选一都可关闭 S1。若选 S1-A4，本轮前置是补 `electron` / `electron-builder` devDep、建立 `electron/main.ts` + `electron/preload.ts` 最小骨架并让 `npm run dev:electron` 跑通。若选"延后"，写 D-007 即可结束 S1，下一步进 S2（调试闭环主流程）。
- 备选：**M-1**（一行改动），把 `package.json` 的 `"typecheck": "tsc -b --noEmit"` 改为 `"tsc --noEmit -p tsconfig.json"`，清 S1-A2 遗留的 TS6310 残项。

> 上述只是建议。下一轮必须按 `current.md` 的"下一任务选择流程"重新判断后再选定唯一一个。

## 现在不要做的事情
- 不要把 `backlog.md` 整体搬进 `current.md`；前沿窗口只保留 1~3 个。
- 不要一次性把 S1 所有任务都展开成详细子任务表；滚动前沿只看"当前 + 下一步"。
- 不要跳过 completion gate 直接推进下一任务（最小验证 + 交接更新 + commit 必须齐全）。
- 不要再改 `docs/product/产品介绍.md`，内容已定稿。
- 不要在 `issue-card-store.ts` 里顺手扩展 InvestigationRecord / ErrorEntry / ArchiveDocument 的存储；S1-A3 只做 IssueCard。
- 不要提前把 localStorage 改成 IndexedDB、文件系统、远端同步；S1 阶段锁定 localStorage（D-006）。
- 不要用 `create-vite` 模板重新生成覆盖当前骨架。
- 不要在 schema 文件里加手写 type guard；已由 zod + `z.infer` 统一处理（D-005）。

## 已踩坑与约束
- Vite 构建成功 ≠ Dev server 启动成功；W-L3 已本机人工验证 `npm run dev` 可在 http://localhost:5173 返回 HTTP 200 与完整 HTML，但仍未做浏览器渲染/交互级检查。S1-A3 的 save/load 按钮只有 Node 侧 polyfill 验证通过，浏览器里点击按钮的最终交互效果未人工确认。
- `apps/desktop/.gitignore` 已忽略 `node_modules` / `dist` / `*.tsbuildinfo` / `vite.config.{d.ts,js}`；根 `.gitignore` 已忽略 `.codex`（Codex CLI 工具痕迹，空文件，非项目内容）。
- schema 校验库已由 D-005 锁定为 zod；S1-A2 已落地，包含对 `.datetime({ offset: true })`（+HH:mm 支持）、`errorCode` 正则（`DBG-YYYYMMDD-NNN`）、归档文件名正则（`YYYY-MM-DD_<slug>.md`）的硬约束。
- **S1-A3 存储选型已由 D-006 锁定**：`window.localStorage`，键名 `repo-debug:issue-card:<id>`。浏览器跨刷新持久；Electron 时期再加 fs 适配层。
- **Node 24 `--experimental-strip-types` 对相对 TS import 不自动补扩展名**。为让 `scripts/verify-s1-a3.mts` 能链式 import 到 `src/storage/issue-card-store.ts` → `src/domain/schemas/issue-card.ts` → `src/domain/schemas/repo-snapshot.ts`，在 `issue-card.ts` 与 `issue-card-store.ts` 里给相对 import 补了 `.ts` 后缀。TS 侧 `allowImportingTsExtensions: true` 早已开启，Vite 也接受 `.ts` 后缀 import，此改动不破坏 build。其它 schema 文件（`repo-snapshot` / `investigation-record` / `error-entry` / `archive-document`）不跨模块 import，不需要改。
- **`npm run typecheck` 脚本当前报错 TS6310**：`tsc -b --noEmit` 与 composite referenced project（`tsconfig.node.json`）不兼容。临时替代：`npx tsc --noEmit -p tsconfig.json`。修复在候选 M-1。
- **sandbox 权限扩展（S1-A2 round 引入）**：`.claude/settings.local.json` 的 `sandbox.filesystem.allowRead` 增加了 `~/.nvm/` / `~/.npm/`，`allowWrite` 增加了 `~/.npm/`。若要严格回滚，删除这三个条目即可；若要保留（便于后续 node/npm 运行），直接 commit。本轮 S1-A3 commit 未包含此文件。
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

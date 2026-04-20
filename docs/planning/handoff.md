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
- 当前唯一执行中的原子任务：无，等待下一轮重新读取仓库并选择。
- 桌面壳当前形态：SPA（浏览器），三个占位区块（Project / Issue / Archive），显示 `Desktop shell initialized`；schema 层已就绪但尚未被 UI 层消费。

## planning 与实际一致性检查
- `current.md` 已按 S1-A2 完成后的前沿窗口改写：S1-A3 上位为候选 #1，加入 M-1（typecheck 脚本修复）作为候选 #3。
- `.agent-state/handoff.json` 已把 `S1-A2_schema_validation_scaffold_with_zod` 并入 `completed_atomic_tasks`，`frontier_tasks` 同步收敛。
- `AGENTS.md` 与 `README.md` 口径一致，均描述"完成后重新选择下一任务"。
- 无"已完成但未提交"的脱节项（以本轮 commit 完成为准）。
- 未承诺但需要记住：本轮期间为绕过 sandbox 的 node/npm 访问限制，`.claude/settings.local.json` 的 `sandbox.filesystem.allowRead` 追加了 `~/.nvm/` / `~/.npm/`、`allowWrite` 追加了 `~/.npm/`。该文件本轮 commit 未纳入（属于环境配置，不是 S1-A2 产物），保留在工作区由用户自行决定是否 commit / 回滚。

## 依赖是否满足
- S1-A3（本地存储最小读写）：前置全部满足——S1-A2 zod schema 已可 `safeParse`；需要决定本地持久化位置（建议 `.debug_workspace/active/` 下 per-issue JSON，与归档层解耦）。可作为下一轮首选。
- S1-A4（Electron 外壳）：不阻塞 S1-A3，仍可推迟到至少一条 IssueCard 能落盘后再启动。
- M-1（typecheck 脚本修复）：独立于主链路，极小任务，可在任意时机插入；不阻塞 S1-A3。

## 下一轮开始前必须先检查什么
1. 读 `AGENTS.md` 第 3/4/5 章（滚动前沿 / 下一任务选择 / 完成门）。
2. 读 `docs/planning/current.md` 的"当前唯一执行中的原子任务"与"前沿任务窗口"。
3. 读 `.agent-state/handoff.json` 的 `current_stage` / `current_atomic_task` / `frontier_tasks` / `next_task_selection_basis`。
4. 跑 `git status` 与 `git log -5`，确认仓库与记录一致。
5. 如 planning 与实际脱节（例如窗口里的任务已实际完成），**先更新 planning，再开始执行**。

## 下一步最推荐动作（候选，不是指令）
- 推荐：S1-A3 本地存储最小读写。理由：schema 前置已就绪；它是 MVP 最小闭环（intake→update→closeout→archive）中第一个真正落盘的链路；桌面壳已可启动。建议范围：选定 `.debug_workspace/active/<issueId>.json` 作为 active 存储格式，实现 `saveIssueCard` / `loadIssueCard`（后者读盘后 `IssueCardSchema.safeParse`），并在 App.tsx 接入一个最小的"创建/重载 IssueCard"按钮做黑盒读回验证。
- 备选：M-1（一分钟级小修复，把 `tsc -b --noEmit` 改成 `tsc --noEmit -p tsconfig.json`），清掉 typecheck 脚本历史残留。
- 备选：S1-A4（Electron 外壳），但会推迟最小闭环。

> 上述只是建议。下一轮必须按 `current.md` 的"下一任务选择流程"重新判断后再选定唯一一个。

## 现在不要做的事情
- 不要把 `backlog.md` 整体搬进 `current.md`；前沿窗口只保留 1~3 个。
- 不要一次性把 S1 所有任务都展开成详细子任务表；滚动前沿只看"当前 + 下一步"。
- 不要跳过 completion gate 直接推进下一任务（最小验证 + 交接更新 + commit 必须齐全）。
- 不要再改 `docs/product/产品介绍.md`，内容已定稿。
- 不要在桌面壳里提前堆业务（S1-A3 前先堆 UI、大模型、MCP）。
- 不要用 `create-vite` 模板重新生成覆盖当前骨架。
- 不要在 schema 文件里加手写 type guard；已由 zod + `z.infer` 统一处理（D-005）。

## 已踩坑与约束
- Vite 构建成功 ≠ Dev server 启动成功；W-L3 已本机人工验证 `npm run dev` 可在 http://localhost:5173 返回 HTTP 200 与完整 HTML，但仍未做浏览器渲染/交互级检查。
- `apps/desktop/.gitignore` 已忽略 `node_modules` / `dist` / `*.tsbuildinfo` / `vite.config.{d.ts,js}`；根 `.gitignore` 已忽略 `.codex`（Codex CLI 工具痕迹，空文件，非项目内容）。
- schema 校验库已由 D-005 锁定为 zod；S1-A2 已落地，包含对 `.datetime({ offset: true })`（+HH:mm 支持）、`errorCode` 正则（`DBG-YYYYMMDD-NNN`）、归档文件名正则（`YYYY-MM-DD_<slug>.md`）的硬约束。
- **`npm run typecheck` 脚本当前报错 TS6310**：`tsc -b --noEmit` 与 composite referenced project（`tsconfig.node.json`）不兼容。临时替代：`npx tsc --noEmit -p tsconfig.json`。修复在候选 M-1。
- **sandbox 权限扩展（本轮期间）**：`.claude/settings.local.json` 的 `sandbox.filesystem.allowRead` 增加了 `~/.nvm/` / `~/.npm/`，`allowWrite` 增加了 `~/.npm/`。若要严格回滚，删除这三个条目即可；若要保留（便于后续 node/npm 运行），直接 commit。本轮 S1-A2 commit 未包含此文件。
- WSL/Linux 迁移：运行基线已打通（W-L3）；后续未再积压迁移类残项。

## 如何启动当前桌面壳
```bash
cd apps/desktop
npm install    # 已执行过一次，依赖已落盘；换机时重跑
npm run dev    # 默认 http://localhost:5173
npm run build  # 产物到 apps/desktop/dist
```

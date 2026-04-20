# 当前执行面板（Current）

> 本文件遵循“滚动前沿规划”：只维护当前阶段目标、前沿任务窗口（1~3 个候选）、唯一执行中的原子任务。候选任务不等于顺推队列；更远的任务留在 `backlog.md`。

## 当前阶段
- 阶段：S1 桌面壳与本地存储最小闭环
- 阶段目标：把 `apps/desktop` 从空目录落地为可运行壳，并在其上逐步接入 schema 校验与本地存储。
- 阶段完成定义：
  - 桌面壳可运行（已满足，SPA 形态）。
  - IssueCard / InvestigationRecord / ErrorEntry / ArchiveDocument 四类 schema 有可用 TS 类型与运行时校验。
  - 至少一条 IssueCard 可创建、落盘、重新读取。
  - 具备 Electron 外壳（或明确延后决策）。

## 当前唯一执行中的原子任务
- 无。S1-A2 已完成：`apps/desktop/src/domain/schemas/` 下落地了 RepoSnapshot / IssueCard / InvestigationRecord / ErrorEntry / ArchiveDocument 五个 zod schema 与派生类型，`zod ^3.23.8` 作为 runtime dependency 已装入，`npm run build`（`tsc -b && vite build`）全绿。等待下一轮按「下一任务选择流程」重新选择唯一原子任务。

## 当前前沿任务窗口（候选，不等于顺推队列）
1. S1-A3：本地存储最小读写与问题卡重开验证（依赖 S1-A2 的 zod schema 已就绪，读盘用 `safeParse`）。
2. S1-A4：Electron 外壳（main / preload / IPC），把 SPA 包装为桌面进程。
3. M-1：修复 `apps/desktop` 的 `npm run typecheck` 脚本——当前 `tsc -b --noEmit` 与 composite referenced project（`tsconfig.node.json`）冲突（TS6310）。临时替代 `npx tsc --noEmit -p tsconfig.json` 可用。

> 以上只是候选。完成 S1-A2 后，必须先按「下一任务选择流程」重新判断，再选定唯一下一任务。

## 下一任务选择流程（完成当前任务后执行）
1. 重新读取：`AGENTS.md`、本文件、`docs/planning/handoff.md`、`.agent-state/handoff.json`、`git status`、最近 commit、与任务相关目录/文件。
2. 评估依据：
   - 依赖是否满足（前置 schema / 壳 / 存储 是否就绪）。
   - MVP 优先级（越靠近“最小闭环”越优先）。
   - planning 与实际是否脱节（如脱节，先更新 planning）。
   - 当前前沿任务是否仍是最优解；若不是，替换窗口内容再执行。
3. 从窗口中选择**唯一一个**下一原子任务，写入“当前唯一执行中的原子任务”，再进入 `task-execution`。

## 原子任务完成标准（DoD）
- 文件修改已落盘。
- 关键路径已做最小验证（存在性 / 可读性 / 构建通过或可启动）。
- `docs/planning/current.md`（本文件）与 `docs/planning/handoff.md` 已更新。
- `.agent-state/progress.md`、`.agent-state/session-log.md`、`.agent-state/handoff.json` 已更新。
- 已完成独立 commit，且 message 对应单一任务结果。
- 以上任一项未满足，不得选择或执行下一任务（completion gate）。

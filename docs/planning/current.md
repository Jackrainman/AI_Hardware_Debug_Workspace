# 当前执行面板（Current）

> 本文件遵循“滚动前沿规划”：只维护当前阶段目标、前沿任务窗口（1~3 个候选）、唯一执行中的原子任务。候选任务不等于顺推队列；更远的任务留在 `backlog.md`。

## 当前阶段
- 阶段：S2 阶段收口（主闭环关键路径已打通，文档状态已同步）
- 阶段目标：把"绑定仓库 → intake → 追记 → 结案归档"主闭环已完成的真实状态沉淀到 README / roadmap / backlog / handoff / `.agent-state`；本阶段仍以 `apps/desktop` SPA + localStorage（D-006）承载，fs / Electron 侧接入继续按 D-007 推迟。
- 阶段完成定义：
  - 用户可在 UI 中新建一条结构正确的 IssueCard（不依赖硬编码样例）。**[S2-A1 已完成 ✓]**
  - 可至少追加一条 InvestigationRecord，与对应 IssueCard 关联。**[S2-A3 已完成 ✓]**
  - 可对 IssueCard 执行结案动作，生成 ErrorEntry + ArchiveDocument 并落盘（阶段内落盘介质仍以 localStorage 为准，后续再评估 fs）。**[S2-A4 已完成 ✓]**
  - 关键实体入库前全部走 zod schema 校验（D-005），失败不静默降级。**[IssueCard / InvestigationRecord / ErrorEntry / ArchiveDocument 读写与 closeout 工厂均已覆盖结构化失败路径]**
  - 至少存在一个 Node 侧黑盒验证脚本覆盖 intake → 追记 → 结案 链路的最小 round-trip。**[S2-A4 已覆盖 intake → 追记 → closeout → ArchiveDocument / ErrorEntry / IssueCard 读回]**
  - README / roadmap / backlog 不再停留在 S1 或 S2-A4 之前口径。**[S2-CLOSEOUT-DOCS 已完成 ✓]**

## S1 收尾说明
- S1 阶段完成定义最后一项"具备 Electron 外壳（或明确延后决策）"已由 D-007 以"延后"形式满足，S1 阶段关闭。
- S1 落地成果：`apps/desktop` Vite + React + TS 壳、zod schema 骨架（S1-A2）、`window.localStorage` IssueCard save/load（S1-A3 / D-006）。
- S1 遗留候选 M-1（typecheck 脚本 TS6310 修复）已完成：`apps/desktop/package.json` 第 11 行 `typecheck` 脚本由 `tsc -b --noEmit` 改为 `tsc --noEmit -p tsconfig.json`；`npm run build` 未受影响。

## 当前唯一执行中的原子任务
- **无**。S2-CLOSEOUT-DOCS 已完成，S2 主闭环关键路径与文档层状态已收口；下一轮必须重新读取真实仓库状态后再选择唯一原子任务。

## 当前前沿任务窗口（候选，不等于顺推队列）
1. S3-ENTRY-PLANNING：重新读取仓库真实状态后，只做 S3 阶段入口评估与唯一下一原子任务选择，不直接写 S3 功能。
2. UI-V1（非必需原子任务）：`cd apps/desktop && npm run dev`，在浏览器中真实点一次 Create / Refresh list / 选中 / Append record / Refresh records / Close issue，确认 Node polyfill 之外的真实 DOM 交互无惊喜。

> S2-A4 与 S2-CLOSEOUT-DOCS 均已完成。下一轮仍必须先按「下一任务选择流程」重新判断；推荐首选 S3-ENTRY-PLANNING 或 UI-V1，不要直接进入 S3 功能开发。

## 下一任务选择流程（完成当前任务后执行）
1. 重新读取：`AGENTS.md`、本文件、`docs/planning/handoff.md`、`.agent-state/handoff.json`、`git status`、最近 commit、与任务相关目录/文件。
2. 评估依据：
   - 依赖是否满足（前置 schema / 壳 / 存储 是否就绪）。
   - MVP 优先级（越靠近"最小闭环"越优先）。
   - planning 与实际是否脱节（如脱节，先更新 planning）。
   - 当前前沿任务是否仍是最优解；若不是，替换窗口内容再执行。
3. 从窗口中选择**唯一一个**下一原子任务，写入"当前唯一执行中的原子任务"，再进入 `task-execution`。

## 原子任务完成标准（DoD）
- 文件修改已落盘。
- 关键路径已做最小验证（存在性 / 可读性 / 构建通过或可启动）。
- `docs/planning/current.md`（本文件）与 `docs/planning/handoff.md` 已更新。
- `.agent-state/progress.md`、`.agent-state/session-log.md`、`.agent-state/handoff.json` 已更新。
- 已完成独立 commit，且 message 对应单一任务结果。
- 以上任一项未满足，不得选择或执行下一任务（completion gate）。

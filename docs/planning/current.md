# 当前执行面板（Current）

> 本文件遵循“滚动前沿规划”：只维护当前阶段目标、前沿任务窗口（1~3 个候选）、唯一执行中的原子任务。候选任务不等于顺推队列；更远的任务留在 `backlog.md`。

## 当前阶段
- 阶段：S2 调试闭环主流程
- 阶段目标：打通"绑定仓库 → intake → 追记 → 结案归档"闭环，以 `apps/desktop` SPA + localStorage（D-006）承载前半段；fs / Electron 侧接入推迟到本阶段主闭环验证通过后再评估（D-007）。
- 阶段完成定义：
  - 用户可在 UI 中新建一条结构正确的 IssueCard（不依赖硬编码样例）。
  - 可至少追加一条 InvestigationRecord，与对应 IssueCard 关联。
  - 可对 IssueCard 执行结案动作，生成 ErrorEntry + ArchiveDocument 并落盘（阶段内落盘介质仍以 localStorage 为准，后续再评估 fs）。
  - 关键实体入库前全部走 zod schema 校验（D-005），失败不静默降级。
  - 至少存在一个 Node 侧黑盒验证脚本覆盖 intake → 追记 → 结案 链路的最小 round-trip。

## S1 收尾说明
- S1 阶段完成定义最后一项"具备 Electron 外壳（或明确延后决策）"已由 D-007 以"延后"形式满足，S1 阶段即刻关闭。
- S1 已落地成果：`apps/desktop` Vite + React + TS 壳、zod schema 骨架（S1-A2）、`window.localStorage` IssueCard save/load（S1-A3 / D-006）。
- S1 遗留候选 M-1（typecheck 脚本 TS6310 修复）不阻塞 S2，保留为任意轮次可插入的低风险小改动。

## 当前唯一执行中的原子任务
- 无。D-007 本轮已落盘，S1 阶段正式关闭。等待下一轮按「下一任务选择流程」从 S2 候选窗口重新选择唯一原子任务。

## 当前前沿任务窗口（候选，不等于顺推队列）
1. S2-A1：IssueCard intake 最小表单。在 `apps/desktop` 加一个最小输入 UI（title / description / severity 等必填字段），用户提交时构造完整 `IssueCard`（含 `repoSnapshot` 占位、时间戳、id）并调用 `saveIssueCard`；sampleIssueCard 硬编码逻辑可保留或改为"预填"，不强拆。验证：浏览器 SPA 可见、Node 侧 polyfill 验证脚本（或扩展 `verify-s1-a3.mts`）跑 intake → load round-trip。
2. S2-A2：IssueCard 列表视图。提供 `listIssueCards()` 存储 API（遍历 localStorage 带前缀的 key），在 `App.tsx` 问题卡区渲染所有已保存卡的摘要（id / title / severity / status）；点击任一条目可切换"当前 IssueCard"。验证：Node 侧可列出多条，浏览器侧看到列表。
3. M-1：修复 `apps/desktop` 的 `npm run typecheck` 脚本（把 `tsc -b --noEmit` 改为 `tsc --noEmit -p tsconfig.json`）。独立一行改动，任意轮次可插入，不属于 S2 主链但能消噪。

> 以上只是候选。完成本轮后，必须先按「下一任务选择流程」重新判断，再选定唯一下一任务。候选顺序不代表执行顺序；通常建议先 S2-A1（让用户真的能新建 IssueCard），再 S2-A2（让多卡可见），M-1 夹在任意低风险轮次。

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

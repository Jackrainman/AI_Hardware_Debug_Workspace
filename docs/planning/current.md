# 当前执行面板（Current）

> 本文件遵循“滚动前沿规划”：只维护当前阶段目标、前沿任务窗口（1~3 个候选）、唯一执行中的原子任务。候选任务不等于顺推队列；更远的任务留在 `backlog.md`。

## 当前阶段
- 阶段：S2 调试闭环主流程
- 阶段目标：打通"绑定仓库 → intake → 追记 → 结案归档"闭环，以 `apps/desktop` SPA + localStorage（D-006）承载前半段；fs / Electron 侧接入推迟到本阶段主闭环验证通过后再评估（D-007）。
- 阶段完成定义：
  - 用户可在 UI 中新建一条结构正确的 IssueCard（不依赖硬编码样例）。**[S2-A1 已完成 ✓]**
  - 可至少追加一条 InvestigationRecord，与对应 IssueCard 关联。**[S2-A3 工作区已有未提交实现；completion gate 未过，不能标完成]**
  - 可对 IssueCard 执行结案动作，生成 ErrorEntry + ArchiveDocument 并落盘（阶段内落盘介质仍以 localStorage 为准，后续再评估 fs）。
  - 关键实体入库前全部走 zod schema 校验（D-005），失败不静默降级。**[listIssueCards 已覆盖；S2-A3 的 listInvestigationRecordsByIssueId 覆盖待重新验证并提交后计入]**
  - 至少存在一个 Node 侧黑盒验证脚本覆盖 intake → 追记 → 结案 链路的最小 round-trip。**[S2-A1 + S2-A2 已覆盖 intake + 列表；S2-A3 verify 脚本在工作区未提交，结案段待后续]**

## S1 收尾说明
- S1 阶段完成定义最后一项"具备 Electron 外壳（或明确延后决策）"已由 D-007 以"延后"形式满足，S1 阶段关闭。
- S1 落地成果：`apps/desktop` Vite + React + TS 壳、zod schema 骨架（S1-A2）、`window.localStorage` IssueCard save/load（S1-A3 / D-006）。
- S1 遗留候选 M-1（typecheck 脚本 TS6310 修复）已完成：`apps/desktop/package.json` 第 11 行 `typecheck` 脚本由 `tsc -b --noEmit` 改为 `tsc --noEmit -p tsconfig.json`；`npm run build` 未受影响。

## 当前唯一执行中的原子任务
- **S2-A3（completion gate 修正 / 未完成）**。planning 曾把 S2-A3 写成“已完成并提交”，但本轮重新读取时没有发现 S2-A3 功能提交；当时最新提交仍是 `c98b040 fix(desktop): repair typecheck script to bypass TS6310 (M-1)`，且 S2-A3 相关代码、verify 脚本与交接文件仍在未提交工作区。按 AGENTS §5，S2-A3 功能 commit 缺失 = 任务未完成；不得选择或执行 S2-A4 / UI-V1，下一步只能收束 S2-A3 completion gate。

## 当前前沿任务窗口（候选，不等于顺推队列）
1. S2-A3-CG：收束 InvestigationRecord 追加的 completion gate。依赖已满足，工作区已有相关实现，但需要重新验证、更新交接并完成单任务 commit 后才可标完成。只允许处理 S2-A3 相关文件；不得引入 ErrorEntry / ArchiveDocument / Electron / fs。
2. S2-A4：结案 → ErrorEntry + ArchiveDocument 生成。技术依赖应由 S2-A3 提供，但**当前因 S2-A3 commit 缺失而未就绪**；S2-A3-CG 完成前不得执行。
3. UI-V1（非必需原子任务）：浏览器冒烟。技术上可做，但**当前被 completion gate 阻塞**；S2-A3-CG 完成前不得执行。

> 本轮发现 planning 与实际脱节，已只做最小 planning 修正。下一轮必须先收束 S2-A3-CG，不得机械顺推到 S2-A4。

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

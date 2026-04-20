# 当前执行面板（Current）

> 本文件遵循“滚动前沿规划”：只维护当前阶段目标、前沿任务窗口（1~3 个候选）、唯一执行中的原子任务。候选任务不等于顺推队列；更远的任务留在 `backlog.md`。

## 当前阶段
- 阶段：S2 调试闭环主流程
- 阶段目标：打通"绑定仓库 → intake → 追记 → 结案归档"闭环，以 `apps/desktop` SPA + localStorage（D-006）承载前半段；fs / Electron 侧接入推迟到本阶段主闭环验证通过后再评估（D-007）。
- 阶段完成定义：
  - 用户可在 UI 中新建一条结构正确的 IssueCard（不依赖硬编码样例）。**[S2-A1 已完成 ✓]**
  - 可至少追加一条 InvestigationRecord，与对应 IssueCard 关联。
  - 可对 IssueCard 执行结案动作，生成 ErrorEntry + ArchiveDocument 并落盘（阶段内落盘介质仍以 localStorage 为准，后续再评估 fs）。
  - 关键实体入库前全部走 zod schema 校验（D-005），失败不静默降级。**[listIssueCards 已覆盖：损坏 JSON / schema 不符一律进结构化 invalid 桶]**
  - 至少存在一个 Node 侧黑盒验证脚本覆盖 intake → 追记 → 结案 链路的最小 round-trip。**[S2-A1 + S2-A2 已覆盖 intake + 列表端]**

## S1 收尾说明
- S1 阶段完成定义最后一项"具备 Electron 外壳（或明确延后决策）"已由 D-007 以"延后"形式满足，S1 阶段关闭。
- S1 落地成果：`apps/desktop` Vite + React + TS 壳、zod schema 骨架（S1-A2）、`window.localStorage` IssueCard save/load（S1-A3 / D-006）。
- S1 遗留候选 M-1（typecheck 脚本 TS6310 修复）不阻塞 S2，保留为任意轮次可插入的低风险小改动。

## 当前唯一执行中的原子任务
- 无。S2-A2 已完成：`apps/desktop/src/storage/issue-card-store.ts` 新增 `listIssueCards(): IssueCardListResult`，遍历 `window.localStorage` 里前缀为 `repo-debug:issue-card:` 的 key，逐条 `JSON.parse` + `IssueCardSchema.safeParse`，返回 `{ valid: IssueCardSummary[], invalid: IssueCardListInvalidEntry[] }`（valid 按 createdAt 倒序）；同文件导出 `IssueCardSummary` / `IssueCardListInvalidEntry` / `IssueCardListResult` 类型；`src/App.tsx` 新增 `IssueCardListView` 组件（Refresh 按钮 + valid 摘要列表 + invalid 结构化一览），stage footer 更新为 `S2-A2 · IssueCard intake + list view`；`scripts/verify-s2-a2.mts` Node 侧 5 断言（空存储 / 两条有效 / 坏 JSON / schema 不符 / 外来前缀忽略）全 PASS；`verify-s1-a3` 与 `verify-s2-a1` 无倒退；`npm run build`（tsc -b + vite build，46 modules，~205 kB）通过。等待下一轮按「下一任务选择流程」重新选择唯一原子任务。

## 当前前沿任务窗口（候选，不等于顺推队列）
1. S2-A3：InvestigationRecord 追加。给选中的 IssueCard 追加一条时间线记录；需要在 UI 层先实现"选中当前 IssueCard"语义（可在 S2-A2 的列表上加点击选中），再在 storage 层新增 `saveInvestigationRecord` / `listInvestigationRecordsByIssueId`（键前缀 `repo-debug:investigation-record:<issueId>:<recordId>` 或存 `investigation-records-by-issue:<issueId>` 为数组）。实现时优先选择"单独前缀，每条记录独立 key"以便 safeParse 粒度对齐。验证：扩展 verify 脚本跑 save 多条 → 按 issueId 列出 → 字段 round-trip。
2. S2-A4（预规划）：IssueCard 结案 → ErrorEntry + ArchiveDocument 生成。S2 主闭环的后半段。依赖 S2-A3（追记），且需要 error-entry / archive-document 的 store。不是下一轮候选，保留在窗口尾部作提示；下一轮决定是否拉入前沿时再评估。
3. M-1：修复 `apps/desktop` 的 `npm run typecheck` 脚本（把 `tsc -b --noEmit` 改为 `tsc --noEmit -p tsconfig.json`）。独立一行改动，任意轮次可插入。

> 以上只是候选。完成本轮后，必须先按「下一任务选择流程」重新判断，再选定唯一下一任务。通常建议先 S2-A3（闭环推进），M-1 夹在低风险轮次。

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

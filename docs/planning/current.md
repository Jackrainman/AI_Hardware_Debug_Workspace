# 当前执行面板（Current）

> 本文件遵循“滚动前沿规划”：只维护当前阶段目标、前沿任务窗口（1~3 个候选）、唯一执行中的原子任务。候选任务不等于顺推队列；更远的任务留在 `backlog.md`。

## 当前阶段
- 阶段：S2 调试闭环主流程
- 阶段目标：打通"绑定仓库 → intake → 追记 → 结案归档"闭环，以 `apps/desktop` SPA + localStorage（D-006）承载前半段；fs / Electron 侧接入推迟到本阶段主闭环验证通过后再评估（D-007）。
- 阶段完成定义：
  - 用户可在 UI 中新建一条结构正确的 IssueCard（不依赖硬编码样例）。**[S2-A1 已完成 ✓]**
  - 可至少追加一条 InvestigationRecord，与对应 IssueCard 关联。
  - 可对 IssueCard 执行结案动作，生成 ErrorEntry + ArchiveDocument 并落盘（阶段内落盘介质仍以 localStorage 为准，后续再评估 fs）。
  - 关键实体入库前全部走 zod schema 校验（D-005），失败不静默降级。
  - 至少存在一个 Node 侧黑盒验证脚本覆盖 intake → 追记 → 结案 链路的最小 round-trip。**[S2-A1 已贡献 intake 端验证]**

## S1 收尾说明
- S1 阶段完成定义最后一项"具备 Electron 外壳（或明确延后决策）"已由 D-007 以"延后"形式满足，S1 阶段关闭。
- S1 落地成果：`apps/desktop` Vite + React + TS 壳、zod schema 骨架（S1-A2）、`window.localStorage` IssueCard save/load（S1-A3 / D-006）。
- S1 遗留候选 M-1（typecheck 脚本 TS6310 修复）不阻塞 S2，保留为任意轮次可插入的低风险小改动。

## 当前唯一执行中的原子任务
- 无。S2-A1 已完成：`apps/desktop/src/domain/issue-intake.ts` 提供 `buildIssueCardFromIntake(input, opts)` 纯函数工厂（输入 `title/description/severity`，输出经 `IssueCardSchema.safeParse` 校验后的 `IssueCard`）与 `nowISO` / `generateIssueId` / `defaultIntakeOptions` 辅助；`apps/desktop/src/App.tsx` 在"问题卡区"新增 `IssueIntakeForm` 受控表单（title / description / severity，提交后调 `saveIssueCard`），同时保留 `IssueStorageControls` 的 sample save/load 按钮作为冒烟手段；Stage footer 更新为 `S2-A1 · IssueCard intake form + localStorage save`；`scripts/verify-s2-a1.mts` 在 Node 侧用同一套 polyfill 跑 intake → save → load round-trip 与空标题结构化拒绝验证。`npm run build`（tsc -b + vite build，46 modules，~200 kB）与 `verify-s2-a1`（3 断言 PASS）均通过；S1-A3 原 verify 脚本无倒退（3 断言 PASS）。等待下一轮按「下一任务选择流程」重新选择唯一原子任务。

## 当前前沿任务窗口（候选，不等于顺推队列）
1. S2-A2：IssueCard 列表视图。在 `apps/desktop/src/storage/issue-card-store.ts` 上补 `listIssueCards(): { id: string; title: string; severity: IssueSeverity; status: IssueStatus }[]`（遍历 `repo-debug:issue-card:*` key，逐条 safeParse，跳过无效并记录 issue 数量），`App.tsx` 问题卡区渲染列表摘要并支持点击切换"当前 IssueCard"。验证：扩展或新增 verify 脚本跑多条 save → list → 按 id 点选 round-trip。
2. S2-A3：InvestigationRecord 追加。给已存在 IssueCard 追加一条时间线记录；涉及 `investigation-record.ts` schema + `src/storage/investigation-store.ts`（或合到 issue-card-store）；UI 层在选中 IssueCard 时才可用。属于 S2 主闭环中段。
3. M-1：修复 `apps/desktop` 的 `npm run typecheck` 脚本（把 `tsc -b --noEmit` 改为 `tsc --noEmit -p tsconfig.json`）。独立一行改动，任意轮次可插入。

> 以上只是候选。完成本轮后，必须先按「下一任务选择流程」重新判断，再选定唯一下一任务。通常建议先 S2-A2（list 是 S2-A3 的前提：没有"选中一张 IssueCard"的入口，追记流就接不上），M-1 夹在低风险轮次。

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

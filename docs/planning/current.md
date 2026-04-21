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
- S1 遗留候选 M-1（typecheck 脚本 TS6310 修复）已完成：`apps/desktop/package.json` 第 11 行 `typecheck` 脚本由 `tsc -b --noEmit` 改为 `tsc --noEmit -p tsconfig.json`，用户在 `apps/desktop` 下手动执行 `npm run typecheck` 外部验证 EXIT=0；`npm run build` 仍为 `tsc -b && vite build` 未受影响。

## 当前唯一执行中的原子任务
- **无**。M-1 已完成并提交，本轮等待按下一任务选择流程重新选定唯一下一原子任务（不得机械顺推）。

## 当前前沿任务窗口（候选，不等于顺推队列）
1. S2-A3：InvestigationRecord 追加。给选中的 IssueCard 追加一条时间线记录；schema 已在 `investigation-record.ts` 就绪（字段 id / issueId / type[observation|hypothesis|action|result|conclusion|note] / rawText / polishedText / aiExtractedSignals / linkedFiles / linkedCommits / createdAt）。实现提示：
   - 新增 `apps/desktop/src/domain/investigation-intake.ts`：纯函数工厂 `buildInvestigationRecordFromIntake({issueId,type,note}, opts)` → `safeParse` → 结构化 failure；复用 S2-A1 的 reason-path 模式。
   - 新增 `apps/desktop/src/storage/investigation-record-store.ts`：键前缀 `repo-debug:investigation-record:<recordId>`（独立前缀，不污染 `listIssueCards`）；每条带 `issueId` 字段作外键；导出 `saveInvestigationRecord` / `listInvestigationRecordsByIssueId(issueId)`（内部做全量扫描 + safeParse + filter + 按 createdAt 升序）与 invalid 结构化桶。
   - UI 粒度建议：先不接入"点击 ListView 选中"的 state 抬升（作为 S2-A3b 或 S2-A3 合并任务）；可以只加一个独立 `InvestigationAppendForm`，用户手填 issueId + type + note 即可完成最小闭环。
   - 验证：`scripts/verify-s2-a3.mts` 至少三条断言：多 issue 多 record → listByIssueId 仅返回对应 issue 的记录；按 createdAt 升序；坏 JSON / schema 不符进结构化 invalid 桶。
2. S2-A4（预规划）：结案 → ErrorEntry + ArchiveDocument 生成。S2 主闭环后半段，依赖 S2-A3。暂不拉入前沿窗口首位。
3. 浏览器端人工交互验证（UI-V1，非必需原子任务，但建议早晨用户开新轮前抽时间做一次）：`cd apps/desktop && npm run dev`，在 http://localhost:5173 的"问题卡区"真实点一次 Create / Refresh list / Save sample / Load sample，确认 Node 侧 polyfill 覆盖之外的真实 DOM 交互没有惊喜。

> 以上只是候选。完成本轮后，必须先按「下一任务选择流程」重新判断，再选定唯一下一任务。通常建议先 S2-A3（闭环推进）；UI-V1 可在 S2-A3 之前或之中顺带做。

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

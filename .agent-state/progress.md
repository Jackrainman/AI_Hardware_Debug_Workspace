# Progress

## 当前阶段
- S2 调试闭环主流程（S1 已由 D-007 以"延后 Electron 外壳"形式关闭）。采用"滚动前沿规划"范式推进。

## 已完成
- [x] 建立 `docs/planning` 结构化规划区。
- [x] 建立 `.agent-state` 交接区。
- [x] 建立 `docs/product` 并迁移产品文档。
- [x] 重构 `AGENTS.md` 为长期 AI 协作规则。
- [x] 重构课程/作业风格中文 `README.md`。
- [x] 新增并统一关键 skills 骨架（planning/task-execution/task-verification/repo-onboard/debug-intake/debug-closeout）。
- [x] 完成 S0 最终一致性校验与总交接。
- [x] S1-A1：初始化 `apps/desktop` 最小可运行壳（Vite + React + TypeScript），`npm run build` 验证通过。
- [x] W-R1：工作流范式升级（滚动前沿 + 下一任务自动选择 + 受控上下文重置）。
- [x] W-L1：WSL/Linux 迁移第一批基础卫生（LF 策略、产品文档 LF 化、权限规范、filemode 可见）。
- [x] W-L2：WSL/Linux 迁移第二批残留收敛（Linux 优先字体后备、README 环境口径）。
- [x] W-L3：WSL 运行基线验证（node v24.14.0 + npm 11.9.0 下 `npm install` / `npm run build` / `npm run dev` 全部通过；`.codex` 归档为工具痕迹并纳入根 `.gitignore`）。
- [x] D-005：schema 校验库选型决策（选用 zod，`docs/planning/decisions.md` D-005），解锁 S1-A2 代码落地。
- [x] S1-A2：schema 校验代码骨架。`apps/desktop/src/domain/schemas/` 下新增 `repo-snapshot.ts` / `issue-card.ts` / `investigation-record.ts` / `error-entry.ts` / `archive-document.ts` 五个文件，导出 `*Schema` 与 `z.infer` 派生类型；`package.json` 加入 `zod ^3.23.8`；`npm run build`（`tsc -b && vite build`）通过。
- [x] S1-A3：本地存储最小读写。D-006 锁定 IssueCard 使用 `window.localStorage`（键前缀 `repo-debug:issue-card:`）；新增 `apps/desktop/src/storage/issue-card-store.ts`（save/load + 结构化 `LoadIssueCardResult`）；`App.tsx` 的"问题卡区"嵌入最小 save/load 按钮与状态行；`apps/desktop/scripts/verify-s1-a3.mts` 在 Node 侧用 polyfill 跑 round-trip 黑盒验证（3 断言 PASS）；`npm run build`（45 modules，~200 kB）通过。
- [x] D-007：S1 阶段 Electron 外壳延后决策落盘（`docs/planning/decisions.md` D-007）。S1 阶段完成定义最后一项以"延后决策"形式满足，S1 阶段关闭，阶段过渡到 S2。
- [x] S2-A1：IssueCard intake 最小表单。`apps/desktop/src/domain/issue-intake.ts` 提供 `buildIssueCardFromIntake(input, opts)` 纯函数工厂（trim、空标题结构化拒绝、`IssueCardSchema.safeParse`），外加 `nowISO` / `generateIssueId` / `defaultIntakeOptions` 辅助；`App.tsx` 新增 `IssueIntakeForm` 受控表单并保留 sample `IssueStorageControls`；Stage footer 改为 `S2-A1 · IssueCard intake form + localStorage save`；新增 `scripts/verify-s2-a1.mts` 3 断言 PASS（schema-valid intake / save→load round-trip / 空标题拒绝且不落盘）；`npm run build` 46 modules ~200 kB 通过；`verify-s1-a3.mts` 无倒退。

## 当前唯一执行中
- 无。S2-A1 已完成。等待下一轮按「下一任务选择流程」重新选择唯一原子任务。

## 下一步
- 不直接顺推，而是按 `docs/planning/current.md` 的「下一任务选择流程」重新判断，再选定唯一下一任务。
- 依赖已就绪的候选：
  - **S2-A2**：IssueCard 列表视图（`listIssueCards()` + `IssueCardList` 组件；是 S2-A3 追记的前置）。
  - **S2-A3**：InvestigationRecord 追加（建议在 S2-A2 之后做）。
  - **M-1**（一行改动）：把 `typecheck` 脚本从 `tsc -b --noEmit` 改为 `tsc --noEmit -p tsconfig.json`。

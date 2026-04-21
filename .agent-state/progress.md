# Progress

## 当前阶段
- D1：交差优先中文产品壳。当前模式为 `delivery_priority`，目标是先交付一个好看、中文、能用、像产品壳的 SPA 演示版本；技术闭环深化降级为后续主线。

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
- [x] S2-A1：IssueCard intake 最小表单。`apps/desktop/src/domain/issue-intake.ts` 提供 `buildIssueCardFromIntake(input, opts)` 纯函数工厂（trim、空标题结构化拒绝、`IssueCardSchema.safeParse`），外加 `nowISO` / `generateIssueId` / `defaultIntakeOptions` 辅助；`App.tsx` 新增 `IssueIntakeForm` 受控表单并保留 sample `IssueStorageControls`；Stage footer 改为 `S2-A1 · IssueCard intake form + localStorage save`；新增 `scripts/verify-s2-a1.mts` 3 断言 PASS；`npm run build` 46 modules ~200 kB 通过；`verify-s1-a3.mts` 无倒退。
- [x] S2-A2：IssueCard 列表视图。`apps/desktop/src/storage/issue-card-store.ts` 新增 `listIssueCards()` 前缀扫描 + 逐条 safeParse，返回 `{valid: IssueCardSummary[], invalid: IssueCardListInvalidEntry[]}`（valid 按 createdAt 倒序、invalid 按 id 字典序）；`App.tsx` 新增 `IssueCardListView`（Refresh 按钮 + valid / invalid 分区渲染）；`App.css` 追加 list-view / list-item 样式；stage footer 改为 `S2-A2 · IssueCard intake + list view`；`scripts/verify-s2-a2.mts` 5 断言 PASS（空存储 / 两条有效倒序 / 坏 JSON / schema 不符 / 外来前缀忽略）；`npm run build` 46 modules ~205 kB 通过；`verify-s1-a3` / `verify-s2-a1` 无倒退。
- [x] M-1：typecheck 脚本修复。`apps/desktop/package.json` 第 11 行 `typecheck` 脚本由 `tsc -b --noEmit` 改为 `tsc --noEmit -p tsconfig.json`，绕开 TS6310（`tsc -b --noEmit` 与 composite referenced project 冲突）；`npm run build` 仍为 `tsc -b && vite build` 未受影响。
- [x] S2-A3：InvestigationRecord 追加。中等粒度合并"列表点击选中 + 追记"一次落地：
  - 新增 `apps/desktop/src/domain/investigation-intake.ts`（纯工厂 `buildInvestigationRecordFromIntake` + `defaultInvestigationIntakeOptions` + `generateRecordId` + `nowISO`；trim → 空 issueId / 空 note 结构化拒绝 → `InvestigationRecordSchema.safeParse` → 结构化失败）。
  - 新增 `apps/desktop/src/storage/investigation-record-store.ts`（键前缀 `repo-debug:investigation-record:<recordId>`，`saveInvestigationRecord` + `listInvestigationRecordsByIssueId(issueId)` 前缀扫描 → safeParse → filter by issueId → 按 createdAt 升序；结构化 invalid 桶）。
  - `apps/desktop/src/App.tsx`：新增 `IssuePane` 容器抬升 `selectedIssueId` / `cardList` / `recordList`；`IssueCardListView` 改为受控组件（点击选中、`aria-pressed` + `data-selected` + 高亮）；新增 `InvestigationAppendForm`（type + note + 当前 issue 提示）+ `InvestigationRecordListView`（Refresh + valid / invalid 分区）；footer 改为 `S2-A3 · IssueCard intake + list select + InvestigationRecord append`。
  - `apps/desktop/src/App.css`：新增 `.list-item-select` 按钮样式 + `.list-item-selected` 高亮。
  - 新增 `apps/desktop/scripts/verify-s2-a3.mts`：6 断言 PASS——空存储、A 两条 + B 一条按 createdAt 升序过滤、空 note / 空 issueId 拒绝不落盘、坏 JSON 进 parse_error、schema 不符 + 外来前缀 + issue-card 前缀不污染、listIssueCards 与 investigation-record 双向隔离。
  - 验证：`npm run typecheck` EXIT=0；`verify-s2-a3.mts` 6 PASS；`verify-s1-a3` / `verify-s2-a1` / `verify-s2-a2` 无倒退；`npm run build` 49 modules ~210 kB 通过。
- [x] S2-A4：结案 → ErrorEntry + ArchiveDocument 生成。新增 `apps/desktop/src/domain/closeout.ts` 纯函数工厂，输入选中 IssueCard + InvestigationRecord 时间线 + closeout 表单字段，输出 `ArchiveDocument`、`ErrorEntry`、`updatedIssueCard(status: archived)`；新增 `archive-document-store.ts` / `error-entry-store.ts` 两组 localStorage 独立前缀 store（`repo-debug:archive-document:` / `repo-debug:error-entry:`）与结构化 read-back 错误；`App.tsx` 在选中 IssueCard 后接入 `CloseoutForm`，成功后双写 archive/error 并回写 IssueCard；新增 `scripts/verify-s2-a4.mts` 覆盖 intake → 追记 → closeout → ArchiveDocument / ErrorEntry / IssueCard 读回、必填字段拒绝、坏 JSON / schema 不符结构化错误、跨前缀隔离。验证：`npm run typecheck` EXIT=0；S2-A4 5 PASS；S1-A3 / S2-A1 / S2-A2 / S2-A3 回归 PASS；`git diff --check` PASS。按用户偏好本轮未执行 `npm run build`。
- [x] S2-CLOSEOUT-DOCS：同步阶段状态与收口文档。`README.md` 的最小可演示流程、当前进度、当前不足、后续计划已切到 S2 主闭环已打通；`roadmap.md` 标记 S1 已完成/Electron 延后、S2 主闭环关键路径已完成、S3 下一阶段候选未开始；`backlog.md` 拆分已完成项与未完成边界；`current.md` / `handoff.md` / `.agent-state/handoff.json` 前沿窗口切到 S3-ENTRY-PLANNING 与 UI-V1。
- [x] D1-RULES-REALIGN：基于用户交差目标切换到 `delivery_priority`，把项目重整为链路 A（技术闭环后续主线）与链路 B（当前交差优先主线），同步 `AGENTS.md`、planning、handoff、`.agent-state` 与 README 口径。
- [x] D1-UI-V0-CN-SHELL-POLISH：完成第一轮中文产品壳优化。`App.tsx` 主页面标题、副标题、三栏说明、按钮、表单 label/placeholder、状态和空状态已中文化；项目区/归档区已改为可演示壳并保留 Electron/fs/.debug_workspace 未接入边界；`App.css` / `index.css` 统一了三栏布局、控件、空状态和配色变量；未改 schema / store / verify / 业务数据流。
- [x] D1-UI-V1-VISUAL-HIERARCHY：完成第二轮视觉层级优化。`App.tsx` 增加展示性层级结构、三栏徽标、问题卡流程引导、未选中提示和辅助验证说明；`App.css` / `index.css` 优化页面最大宽度、三栏比例、问题卡视觉重心、表单/列表/状态/空状态和主次按钮一致性；未改 schema / store / domain 工厂 / verify 脚本 / 业务数据流。
- [x] D1-DEMO-PATH-MIN-CN：完成最小中文演示路径。`App.tsx` 新增 `DemoHint` 组件展示"1️⃣ 填写上方表单 → 2️⃣ 点「刷新列表」选中 → 3️⃣ 追加排查记录 → 4️⃣ 填写结案归档"引导，优化项目区/归档区提示文案；`App.css` 新增 `.demo-hint` 样式；未改 schema / store / domain 工厂 / verify 脚本 / 业务数据流。
- [x] D1-MAINLINE-WIRE-CONNECT：串联主操作区主线闭环。在 `App.tsx` 里让 `handleCardCreated(id)` 自动设置 `selectedIssueId`、加载完整卡对象并刷新 recordList；新增 `selectedCard` / `lastCloseout` 状态；新增 `MainlineResultPanel`（展示当前问题卡标题/编号/状态 chip/严重度/追记数/更新时间，以及最近一次结案归档的 fileName/filePath/errorCode/归档时间/分类/markdown 预览 + 可展开 details）；新增 `FlowGuide` 根据 `cardList` / `selectedIssueId` / `selectedCard.status` / `lastCloseout` 计算当前步骤并用 `data-step-state="done|active|pending"` 反映；`CloseoutForm.onClosed` 签名改为接收 `CloseoutSummary`，`handleSubmit` 成功分支把 archiveDocument/errorEntry 摘要 + markdownPreview 传回 IssuePane；`handleSelect` / `handleCardCreated` 也清理 `lastCloseout` 防止跨卡污染。`App.css` 追加 `.mainline-panel` / `.mainline-status-chip`（按 open/investigating/resolved/archived/needs_manual_review 分色）/ `.mainline-closeout-*`（fields dl 网格 + `<details>` markdown 预览样式）/ `.flow-guide span[data-step-state="*"]` 步骤态样式。未改 schema / domain 工厂 / store / verify 脚本 / 业务数据流；用户前现场感受到的"追加记录没用 / 结案无效"本质是 UI 串联与结果反馈缺口，本轮补齐。
- [x] D1-README-AGENTS-PACKAGING：重写 `README.md` 为 ProbeFlash 参赛门面，强化痛点、Harness / Agent、Tool / CLI / Repo-aware、Feedback Loop、48 小时交付、架构图和流程图；同步 `AGENTS.md` 项目概览、`App.tsx` 可见产品名、`apps/desktop/package.json` 与 lockfile 元数据命名。未改 schema / store / Electron / fs / IPC，内部 `repo-debug:*` storage key 暂保留以兼容已有浏览器数据。
- [x] D1-ARCHIVE-PANEL-FIX：修通 closeout 结果到右侧归档区显示。`App.tsx` 将最近一次 `CloseoutSummary` 从 `IssuePane` 同步到顶层 `App`，新增 `ArchivePaneShell` 区分“尚无归档结果”和“已有归档结果”，并展示归档文件名、错误表编号、来源问题、归档状态、分类、归档时间和后续写盘位置；`App.css` 增加归档结果面板样式。未改 store / schema / Electron / fs / IPC / 项目区。

## 当前唯一执行中
- 无。D1-ARCHIVE-PANEL-FIX 已完成验证并进入提交收束。

## 下一步
- **按 `docs/planning/current.md` 的「下一任务选择流程」重选唯一下一任务**，先确认 `current_mode=delivery_priority`。最推荐 D1-MAINLINE-BROWSER-SMOKE：真人走一遍 创建 → 自动选中 → 追记 → 结案 → 中心结果面板 + 右侧归档区结果面板读回；只验证、不改代码。

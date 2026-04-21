# 交接说明（Handoff）

> 本文件是上下文重置后继续执行的可信入口。下一轮开始前必须先读这里，再读 `current.md` 与 `.agent-state/handoff.json`。

## 当前真实状态
- 当前阶段：D1：交差优先中文产品壳。
- 当前模式：`delivery_priority`。
- 当前唯一执行中的原子任务：无。本轮 **D1-ARCHIVE-PERSIST-INDEX** 已完成并进入提交收束。
- 对外项目名已统一为 **ProbeFlash — 面向嵌入式调试现场的问题闪记与知识归档系统**：README 门面、AGENTS 项目概览、应用主标题与包元数据已同步。
- S2 主闭环关键路径（domain + storage 层）早已打通：IssueCard intake → 列表选中 → InvestigationRecord 追记 → closeout → ArchiveDocument + ErrorEntry → IssueCard archived 读回。
- 上一轮 D1-ARCHIVE-PANEL-FIX 修通了结案成功后的右侧结果展示，但归档区还停在 React state 里，没有跨刷新读回，计数和历史也不可见。本轮 **D1-ARCHIVE-PERSIST-INDEX** 补齐这一段：
  - 在 `archive-document-store.ts` 新增 `listArchiveDocuments()`，在 `error-entry-store.ts` 新增 `listErrorEntries()`，均按 `generatedAt` / `createdAt` 倒序，并把 JSON 解析失败 / schema 校验失败路由到 `invalid` 桶。
  - `App.tsx` 增加 `loadArchiveIndex()`：拉取两份 list、按 `sourceIssueId` 关联 `errorCode` + `category`，生成最终 UI 索引。
  - `App` 组件 mount 时 `useEffect` 触发一次索引读回，closeout 成功后再次读回。刷新后归档区不再为空；累计归档数量徽标（"累计归档 N 条"）直接来自 localStorage 真实读回。
  - `ArchivePaneShell` 现在展示：0/N 计数徽标 + [查看归档列表] 按钮（N=0 时 disabled）+ 最近一次归档摘要（文件名 / 错误表编号 / 来源问题 / 分类 / 归档时间 / 后续写盘位置）。
  - 新增 `ArchiveListDrawer`：右侧抽屉 overlay，倒序列出全部归档条目，每条带文件名、errorCode、分类、来源问题、后续写盘位置、归档时间；抽屉明确标注当前仍在 localStorage，不伪装为 .debug_workspace 写盘。
- 当前运行形态仍是 SPA + `window.localStorage`；Electron / fs / IPC / `.debug_workspace` 文件系统双写未接入。归档区、摘要面板、抽屉所有提示文案都标注“后续写盘位置”，不把 localStorage 包装成真实文件写盘。
- 内部 localStorage key `repo-debug:*` 暂不改名，原因是保持既有浏览器数据和验证脚本兼容；这是内部存储标识，不作为对外品牌口径。
- 本轮断点判断已经闭合：刷新后归档区保留；归档展示不再是"只有最近一次"；提供 [查看归档列表] 二级页。完整归档浏览页（独立路由 / 详情页 / 过滤 / 检索 / 分页）与真实文件写盘仍未接入，也不在本轮 scope 内。

## 为什么本轮做归档区持久化读回 + 索引
- 上一轮 D1-ARCHIVE-PANEL-FIX 只修通了"当场结案时右侧有反馈"，但 `latestCloseout` 仅活在 React state，刷新就空。
- 用户即将执行 D1-MAINLINE-BROWSER-SMOKE 人工冒烟，其中会包含"刷新一次看看计数还在不在"、"看看能不能翻历史归档"。归档区一刷新就空、看不到累计、看不到历史，是交差演示里最扎眼的裂缝。
- 本轮属于链路 B 安全美化 + 演示友好化：展示层 + store 层读回函数即可修通，不需要动 closeout 工厂、schema、业务数据流或 Electron / fs。

## 两条链路

### 链路 A：技术闭环主线（后续）
- S3 入口规划。
- `.debug_workspace/archive` 与 `.debug_workspace/error-table` 文件写盘。
- Electron / preload / IPC / fs adapter。
- runtime log、repair task、恢复机制、人工升级。
- 浏览器真实 DOM 冒烟、历史相似问题检索、统计能力。

### 链路 B：当前交差优先链路（当前）
- 中文化主界面文案、按钮、表单、状态（已完成 V0/V1/DEMO-PATH 三轮）。
- 统一 UI 视觉、层级、空状态和演示提示（已完成）。
- 优化问题卡区视觉重心，让 intake / 追记 / closeout 更容易演示（已完成）。
- 主操作区主线闭环串联与结果反馈（D1-MAINLINE-WIRE-CONNECT 已完成）。
- 项目区 / 归档区改成“可演示壳”，但必须清楚标注真实功能边界（已完成）。
- 归档区持久化读回 + 累计索引 + 历史抽屉（本轮 D1-ARCHIVE-PERSIST-INDEX 已完成）。
- 尽量不动核心数据流，只做安全美化和演示友好化。

## 下一轮最推荐动作
- 先重新读取真实状态。候选方向（仅推荐，不预先选定）：
  1. **D1-MAINLINE-BROWSER-SMOKE**：在浏览器里真人走一遍 创建 → 自动选中 → 追记 → 结案 → 中心结果面板 + 右侧归档区结果面板读回 → 刷新页面验证归档计数/最近摘要仍在 → 点击 [查看归档列表] 看到全部条目；只验证、不改代码。
  2. **D1-ISSUE-LIST-HIDE-ARCHIVED**：在中间问题卡列表里隐藏或折叠 `status=archived` 的卡，让主列表聚焦未结案问题；不改 store 契约。
  3. **S3-ENTRY-PLANNING**：正式切回链路 A，评估 Electron/fs adapter、runtime log、repair task 的入口任务。
- 选前必须确认 `current_mode` 是否仍是 `delivery_priority`；若用户切回 `technical_mainline`，优先推 S3-ENTRY-PLANNING。

## 下一轮开始前必须检查
1. 读 `AGENTS.md` 第 3/4/5/6/7/10/12 章。
2. 读 `docs/planning/current.md`、本文件、`.agent-state/handoff.json`。
3. 跑 `git status --short` 与 `git log --oneline -5`。
4. 读 `apps/desktop/src/App.tsx`、`App.css`；确认 `loadArchiveIndex` / `ArchivePaneShell` / `ArchiveListDrawer` / `useEffect` 读回仍在位，不要回退。
5. 读 `apps/desktop/src/storage/archive-document-store.ts`、`error-entry-store.ts`；确认 `listArchiveDocuments()` / `listErrorEntries()` 仍然按倒序返回。
6. 读 `README.md` 与 `AGENTS.md`，确认对外项目口径仍为 ProbeFlash，且未把 Electron/fs/IPC 说成已完成。
7. 若发现 planning 与实际脱节，先修 planning，不直接写功能。

## 当前先不做
- 不扩展为完整归档浏览页（独立路由 / 详情页 / 过滤 / 检索 / 分页）。
- 不继续 S3-ENTRY-PLANNING。
- 不接 Electron / preload / IPC / fs adapter。
- 不把 ArchiveDocument / ErrorEntry 从 localStorage 迁到 `.debug_workspace`。
- 不扩展 runtime log / repair task。
- 不做大型 UI 重构或引入复杂组件库。
- 不把占位功能包装成已完成真实能力。

## 验证状态
- PASS：D1-ARCHIVE-PERSIST-INDEX Node 侧读回验证 `verify-d1-archive-persist-index.mts`，6 PASS：归档/错误条目列表倒序、按 sourceIssueId 关联 errorCode+category、坏 JSON 路由 invalid 不污染 valid、坏 schema 路由 invalid 不污染 valid、两前缀互不污染。
- PASS：`npm run typecheck` EXIT=0。
- PASS：`npm run build` EXIT=0，54 modules，JS 229.30 kB / gzip 67.90 kB（较上轮增约 4 kB，对应 `ArchiveListDrawer` + list 函数 + 样式的合理增量）。
- PASS：`verify-s1-a3` / `verify-s2-a1` / `verify-s2-a2` / `verify-s2-a3` / `verify-s2-a4` 全部 PASS，无倒退。
- PASS：`git diff --check` EXIT=0。
- PASS：`.agent-state/handoff.json` 通过 Node `JSON.parse`，且 `current_mode=delivery_priority`。
- 未执行：浏览器真实 DOM 点击冒烟——下一轮 D1-MAINLINE-BROWSER-SMOKE 必须覆盖，重点检查"刷新后归档计数仍在"和"点击 [查看归档列表] 能看到全部条目"。

## 人工浏览器验证说明（下一轮 D1-MAINLINE-BROWSER-SMOKE 用）
本轮改动在真实浏览器里应满足以下可重复步骤：
1. `cd apps/desktop && npm run dev`，打开 http://localhost:5173。
2. 清空 localStorage（DevTools → Application → Local Storage → Clear）。刷新页面。
3. 确认右侧"归档区"显示"累计归档 0 条"徽标 + `尚无归档结果` 空状态；[查看归档列表] 按钮为 disabled。
4. 在中间问题卡区填写标题与描述，点「创建问题卡」。
5. 在"排查记录"里追加一条记录。
6. 在"结案归档"里填写根因 + 修复结论，点「结案并生成归档摘要」。
7. 观察右侧归档区：计数变为"累计归档 1 条"；最近一次摘要显示文件名、errorCode、来源问题、分类、归档时间；按钮变为 enabled。
8. 按 F5 刷新页面。归档区计数 **仍是 1 条**，最近摘要依然显示；证明跨刷新读回已修通。
9. 再创建一张新问题卡并走到结案。归档区计数变为"累计归档 2 条"；最近摘要切到新那条。
10. 点击 [查看归档列表]，右侧抽屉打开，倒序列出两条归档：最新的在上。每条显示文件名、errorCode、分类、来源问题、后续写盘位置、归档时间。点击抽屉外遮罩或"关闭"按钮可关闭抽屉。
11. 再刷一次页面再打开抽屉，条目顺序、字段一致。

## 交接结论
- 当前最高优先级仍是链路 B：让交差版本的主操作区真的跑得通、让用户在右侧看到累计归档数量、最近归档、历史归档三件事。
- 链路 A 保留为后续主线，不删除、不否定，但不得在 D1 阶段自动抢占前沿窗口。
- AGENTS.md 的"用户当前偏好：由 AI 自行编译"已生效，本轮按要求跑了 typecheck + build + 全部 verify 脚本。

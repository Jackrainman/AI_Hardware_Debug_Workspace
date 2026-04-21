# 交接说明（Handoff）

> 本文件是上下文重置后继续执行的可信入口。下一轮开始前必须先读这里，再读 `current.md` 与 `.agent-state/handoff.json`。

## 当前真实状态
- 当前阶段：D1：交差优先中文产品壳。
- 当前模式：`delivery_priority`。
- 当前唯一执行中的原子任务：无。上一轮 D1-LAYOUT-HEADER-ARCHIVE-ENTRY 已完成。本轮 **D1-FLOW-GUIDE-REMOVE** 已完成并进入提交收束：删除主页面"最小演示路径"下方的四个步骤框（01 创建 / 02 选择 / 03 追记 / 04 结案）；`App.tsx` 移除 `MainlineStep` type、`FLOW_STEPS` 常量、`computeMainlineStep()` 函数、`FlowGuide` 组件，以及 `IssuePane` 里 `const step = computeMainlineStep(...)` 和 `<FlowGuide step={step} />` 的渲染；`App.css` 移除 `.flow-guide` 主块、`.flow-guide span[data-step-state="active|done|pending"]` 状态样式、`.flow-guide strong` 样式、以及 `@media (max-width: 560px)` 响应式下 `.flow-guide` 两列栅格规则。保留 `DemoHint`（"🎯 最小演示路径 + 1️⃣→2️⃣→3️⃣→4️⃣ 文字说明"）作为演示路径提示。仅改 `App.tsx` / `App.css`；未改 schema / closeout 工厂 / IssueCard 数据流 / store 契约 / verify 脚本 / 项目区 popover / 归档 Drawer / 问题卡表单与列表 / Electron / fs / IPC。
- 对外项目名已统一为 **ProbeFlash — 面向嵌入式调试现场的问题闪记与知识归档系统**：README 门面、AGENTS 项目概览、应用主标题与包元数据已同步。`apps/desktop/README.md` 与 `apps/desktop/index.html` 仍有 `RepoDebug Harness` 历史命名残留（非 src 层），本轮拆到 D1-BRAND-UNIFY-PROBEFLASH 独立处理。
- S2 主闭环关键路径（domain + storage 层）早已打通：IssueCard intake → 列表选中 → InvestigationRecord 追记 → closeout → ArchiveDocument + ErrorEntry → IssueCard archived 读回。
- 上一轮 D1-ARCHIVE-PERSIST-INDEX 修通归档区跨刷新读回 + 累计索引 + 历史抽屉；当时的信息架构仍是"项目区（左） · 问题卡（中） · 归档区（右）"三栏平铺。本轮 **D1-LAYOUT-HEADER-ARCHIVE-ENTRY** 把信息架构收束为"顶部双入口 + 单栏问题卡主体"：
  - `App.tsx` 新增 `ProjectSelector`：`header-entry-slot-left` 里的 pill 按钮"📁 项目：演示工作区 ▾"，点击 toggle popover；popover 在按钮下方 absolute 定位，渲染 `StaticPaneShell(projectPane)`（沿用原项目区 bullets）+ "当前仅演示工作区；多项目选择与仓库绑定能力后续接入"边界说明。
  - `App.tsx` 新增 `ArchiveEntryButton`：`header-entry-slot-right` 里的 pill 按钮"📦 查看归档列表 [N]"，N=0 时 disabled 并走灰色 chip 样式；点击打开原 `ArchiveListDrawer`。`data-testid="archive-open-list-button"` 与 `data-testid="archive-count-chip"` 搬到该按钮，保证测试稳定。
  - `App.tsx` 的 `main` 从 `app-grid` 三栏 map `PANES` 改为 `app-main` 单栏，只渲染问题卡 `pane`；`FlowGuide` / `DemoHint` / `MainlineResultPanel` / `IssuePane` 全部保持不动。`PANES` 定义保留（ProjectSelector / ArchiveListDrawer 分别通过 `PANES.find()` 取 projectPane / archivePane）。
  - `ArchiveListDrawer` 签名新增 `archivePane: Pane` 参数，drawer body 的原"计数 + 空状态 / 最近一次摘要 + 全部列表"结构改为"drawer header → `<ArchivePaneShell pane={archivePane} archiveIndex={archiveIndex} />`（不传 `onOpenList`，避免重复按钮）→ 新增 `archive-drawer-section` 承载"全部归档条目"列表（仅当 items>0 渲染）→ 保留底部 `.debug_workspace` 写盘边界 note"。`ArchivePaneShell.onOpenList` 改为 optional，drawer 内不传时不再渲染 `archive-summary-row` 查看列表按钮。
  - `App.css` 把 `.app-grid` 替换成 `.app-main`（flex column，gap 18）；`.app-header` 改为 column 方向带 gap 18；新增 `.app-header-top`（原 header 两端并排）、`.app-header-toolbar`（含左右两槽的二级 toolbar 带边框圆角）、`.header-entry-slot` / `.header-entry-slot-right`、`.project-entry-button` / `.archive-entry-button`（pill、disabled 淡化）、`.header-entry-icon` / `.header-entry-label` / `.project-entry-caret`、`.archive-entry-count`（带 `[data-total="0"]` 灰态）、`.project-selector` / `.project-selector-popover`（absolute 280–360px 宽，最大 360 或 viewport-48）/ `.project-selector-popover-header` / `.project-selector-note`、`.archive-drawer-section` / `.archive-drawer-section-label`；响应式 `@media (max-width: 980px)` 改为 `.app-header-top` 变 column；`@media (max-width: 560px)` 新增 `.app-header-toolbar` 垂直堆叠、入口按钮全宽、archive count 右对齐、popover 填满行宽；去掉原针对 `pane[data-pane="project"] / [data-pane="archive"]` 的 margin-top 规则（selector 已不匹配）。
  - 未改：`src/storage/*` / `src/domain/*` / `src/domain/schemas/*` / `src/App.tsx` 的 `IssuePane` / `FlowGuide` / `MainlineResultPanel` / `DemoHint` / `ArchivePaneShell` 内部展示结构 / `loadArchiveIndex()` / closeout 工厂 / scripts/verify-*.mts / `.debug_workspace` 写盘 / Electron / fs / IPC / 内部 `repo-debug:*` localStorage key。
- 当前运行形态仍是 SPA + `window.localStorage`；Electron / fs / IPC / `.debug_workspace` 文件系统双写未接入。ProjectSelector popover 里明确标注"多项目选择与仓库绑定能力后续接入"；drawer 底部 note 仍明确标注"当前归档仍在浏览器 localStorage，不是 .debug_workspace 文件写盘"。
- 内部 localStorage key `repo-debug:*` 暂不改名，原因是保持既有浏览器数据和验证脚本兼容；这是内部存储标识，不作为对外品牌口径。
- 本轮断点判断已经闭合：主页面不再三栏平铺；顶部左侧出现"项目选择"入口；顶部右侧出现"查看归档列表"入口；主页面只保留问题卡主线；点击归档入口进入 Drawer，内部内容沿用现状；主线功能（创建 / 选中 / 追记 / 结案 / 结果反馈）完全保留。主列表隐藏 archived、RepoDebug Harness 残留清理、四块大框降权等未在本轮 scope，已拆成独立候选任务。

## 为什么本轮做信息架构收束
- 用户明确要求把当前三栏页面收成更合理的产品结构：项目区作为页面顶部"项目选择入口"、归档区只在右上角保留一个"查看归档列表"入口、主页面只保留问题卡主线。
- 上一轮 D1-ARCHIVE-PERSIST-INDEX 已把归档区跨刷新读回、累计索引、历史抽屉修通；归档区作为独立右栏的信息价值（最近一次摘要、invalid 提示、全部列表）完全可以并入 Drawer 内部展示，主页面常驻的第三栏反而分散演示注意力。
- 项目区一直是"演示工作区 + 仓库快照/文件写盘后续"三条 bullets 的静态占位，常驻左栏让页面看起来像三栏平铺；改为顶部 ProjectSelector popover 让主体更聚焦，同时明确"项目切换能力后续接入"的边界。
- 本轮属于链路 B 安全美化 + 信息架构收束：只动展示层 + Drawer 入口接线，不触碰 schema / store / closeout 工厂 / Electron / fs。

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
- 项目区 / 归档区改成"可演示壳"，但必须清楚标注真实功能边界（已完成）。
- 归档区持久化读回 + 累计索引 + 历史抽屉（D1-ARCHIVE-PERSIST-INDEX 已完成）。
- 信息架构收束：三栏 → 顶部双入口 + 单栏主体（D1-LAYOUT-HEADER-ARCHIVE-ENTRY 已完成）。
- 删除"最小演示路径"下方的四个重复步骤框（本轮 D1-FLOW-GUIDE-REMOVE 已完成）。
- 尽量不动核心数据流，只做安全美化和演示友好化。

## 下一轮最推荐动作
- 先重新读取真实状态。候选方向（仅推荐，不预先选定）：
  1. **D1-ISSUE-LIST-HIDE-ARCHIVED**：中间问题卡主列表隐藏或折叠 `status=archived` 的卡，让主列表聚焦未结案问题；不改 store 契约。
  2. **D1-BRAND-UNIFY-PROBEFLASH**：清理 `apps/desktop/README.md`、`apps/desktop/index.html` 等非 src 层的 `RepoDebug Harness` 历史命名残留，统一到 ProbeFlash；不改 schema / store / 内部 `repo-debug:*` storage key。
  3. **D1-STEPPER-CLEANUP**：把 IssuePane 内"1. 创建 / 2. 选择 / 3. 追记 / 4. 结案"四块大表单的视觉重心降权；**必须保证最小演示路径仍可跑通**，DoD 需谨慎评估。
  4. **D1-MAINLINE-BROWSER-SMOKE**：浏览器真人冒烟，重点覆盖新 header 入口、ProjectSelector popover、ArchiveEntryButton 计数徽标、drawer 内嵌 ArchivePaneShell + 全部列表；只验证，不改代码。
  5. **S3-ENTRY-PLANNING**：正式切回链路 A，评估 Electron/fs adapter、runtime log、repair task 的入口任务。
- 选前必须确认 `current_mode` 是否仍是 `delivery_priority`；若用户切回 `technical_mainline`，优先推 S3-ENTRY-PLANNING。

## 下一轮开始前必须检查
1. 读 `AGENTS.md` 第 3/4/5/6/7/10/12 章。
2. 读 `docs/planning/current.md`、本文件、`.agent-state/handoff.json`。
3. 跑 `git status --short` 与 `git log --oneline -5`。
4. 读 `apps/desktop/src/App.tsx`、`App.css`；确认 `ProjectSelector` / `ArchiveEntryButton` / `app-header-toolbar` / `app-main`（单栏）/ `ArchiveListDrawer(archivePane, ...)` 内嵌 `ArchivePaneShell` 仍在位，不要回退。
5. 读 `apps/desktop/src/storage/archive-document-store.ts`、`error-entry-store.ts`；确认 `listArchiveDocuments()` / `listErrorEntries()` 仍然按倒序返回。
6. 读 `README.md` 与 `AGENTS.md`，确认对外项目口径仍为 ProbeFlash，且未把 Electron/fs/IPC 说成已完成。
7. 若发现 planning 与实际脱节，先修 planning，不直接写功能。

## 当前先不做
- 不扩展为完整归档浏览页（独立路由 / 详情页 / 过滤 / 检索 / 分页）。
- 不在主列表里隐藏 archived（留给 D1-ISSUE-LIST-HIDE-ARCHIVED 独立轮次）。
- 不清理 `apps/desktop/README.md` / `apps/desktop/index.html` 的 `RepoDebug Harness` 残留（留给 D1-BRAND-UNIFY-PROBEFLASH）。
- 不改 IssuePane 内四块大表单的视觉重心（留给 D1-STEPPER-CLEANUP，且必须保证最小演示路径仍可跑通）。
- 不继续 S3-ENTRY-PLANNING。
- 不接 Electron / preload / IPC / fs adapter。
- 不把 ArchiveDocument / ErrorEntry 从 localStorage 迁到 `.debug_workspace`。
- 不扩展 runtime log / repair task。
- 不做大型 UI 重构或引入复杂组件库。
- 不把占位功能包装成已完成真实能力。

## 验证状态
- PASS：D1-FLOW-GUIDE-REMOVE 未新增 verify 脚本（本轮仅删展示层代码）。
- PASS：`npm run typecheck` EXIT=0。
- PASS：`npm run build` EXIT=0，54 modules，JS 230.75 kB / gzip 68.03 kB（较上轮 231.32 kB / 68.27 kB 略降约 -0.57 kB 合理，对应 FlowGuide 组件 + 四类样式删除）。
- PASS：`git diff --check` EXIT=0。
- PASS：`.agent-state/handoff.json` 通过 Node `JSON.parse`，且 `current_mode=delivery_priority`。
- PASS：全仓 `FlowGuide` / `FLOW_STEPS` / `computeMainlineStep` / `MainlineStep` / `flow-guide` grep 无匹配。
- 未执行：浏览器真实 DOM 点击冒烟——下一轮 D1-MAINLINE-BROWSER-SMOKE 应覆盖，重点额外确认"最小演示路径"下方不再有四个步骤框。

## 人工浏览器验证说明（下一轮 D1-MAINLINE-BROWSER-SMOKE 用）
本轮改动在真实浏览器里应满足以下可重复步骤：
1. `cd apps/desktop && npm run dev`，打开 http://localhost:5173。
2. 清空 localStorage（DevTools → Application → Local Storage → Clear）。刷新页面。
3. 确认主页面不再是三栏平铺；顶部出现 `app-header-toolbar`：左侧"📁 项目：演示工作区 ▾"按钮、右侧"📦 查看归档列表 0"按钮（count chip 为 0 时按钮 disabled）。
4. 点击左侧"项目：演示工作区"按钮，popover 弹出，内容显示原项目区 bullets（当前项目 / 仓库快照后续接入 / 文件写盘后续接入），底部标注"多项目选择与仓库绑定能力后续接入"，点"关闭"或再次点击按钮关闭 popover。
5. 确认主体只有问题卡主线（DemoHint / 创建 / 列表 / MainlineResultPanel / 追记 / 时间线 / 结案 / 辅助验证），不再出现左右两栏，且 DemoHint 下方不再有四个步骤框。
6. 在问题卡区填写标题与描述 → 点「创建问题卡」→ 自动选中新卡 → 在"排查记录"里追加一条 → 在"结案归档"里填写根因 + 修复结论 → 点「结案并生成归档摘要」。
7. 观察右上角的 `ArchiveEntryButton`：计数 chip 从 0 变成 1 且变为 accent 绿色；按钮变为 enabled。
8. 点击「查看归档列表」，Drawer 打开：header 显示"归档区 · 共 1 条"；body 第一块是 `ArchivePaneShell`（"当前演示：localStorage，后续接文件系统"状态 + bullets + "最近一次归档摘要"）；第二块 `archive-drawer-section` 显示"全部归档条目"列表（1 条）；底部 note 标注 `.debug_workspace` 写盘边界。
9. 按 F5 刷新页面。右上角计数仍是 1 条；再次打开 Drawer，条目仍在。
10. 再创建一张新卡并走到结案。右上角计数变成 2；Drawer 打开后"全部归档条目"列表有 2 条，倒序排列。

## 交接结论
- 当前最高优先级仍是链路 B：让交差版本的信息架构收束、主列表聚焦未结案、品牌统一、stepper 降权、浏览器人工冒烟。
- 链路 A 保留为后续主线，不删除、不否定，但不得在 D1 阶段自动抢占前沿窗口。
- AGENTS.md 的"用户当前偏好：由 AI 自行编译"已生效，本轮按要求跑了 typecheck + build + 两个关键 verify 脚本。

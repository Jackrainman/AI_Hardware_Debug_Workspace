# 交接说明（Handoff）

> 本文件是上下文重置后继续执行的可信入口。下一轮开始前必须先读这里，再读 `current.md` 与 `.agent-state/handoff.json`。

## 当前真实状态
- 当前阶段：D1：交差优先中文产品壳。
- 当前模式：`delivery_priority`。
- 当前唯一执行中的原子任务：无。上一轮 **D1-MAINLINE-WIRE-CONNECT** 已完成并提交。
- S2 主闭环关键路径（domain + storage 层）早已打通：IssueCard intake → 列表选中 → InvestigationRecord 追记 → closeout → ArchiveDocument + ErrorEntry → IssueCard archived 读回。
- D1-MAINLINE-WIRE-CONNECT 之前，UI 层的”串联 + 结果反馈”是有缺口的：创建后不自动选中（用户无从发现追记/结案表单已隐藏），结案只有一行 storage-line 提示；用户在页面上感受到”看起来交差但追记/结案好像没用”。本轮修掉这两个断点——创建后自动选中、`MainlineResultPanel` 集中展示当前卡摘要与最近一次归档，`FlowGuide` 根据真实状态高亮当前步骤，`CloseoutForm.onClosed` 回传 summary 给上层。
- 当前运行形态仍是 SPA + `window.localStorage`；Electron / fs / IPC / `.debug_workspace` 文件系统双写未接入。归档摘要面板里显式标注”后续写盘位置”，不把 localStorage 包装成真实文件写盘。

## 为什么本轮做主线串联
- 用户现场试用反馈”追加记录没用 / 结案无效”，本质不是 domain/storage 层坏了，而是 UI 层漏了两个关键串联点。S2-A4 Node 黑盒验证早就证明数据层 5 PASS，任何把”追记/结案实际不工作”当真写进 planning 都属于伪描述。
- 在 D1 交差优先阶段下，主操作区主线闭环在页面上真的能跑通，比继续美化其他区域更利于验收演示。

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
- 主操作区主线闭环串联与结果反馈（本轮 D1-MAINLINE-WIRE-CONNECT 已完成）。
- 项目区 / 归档区改成”可演示壳”，但必须清楚标注真实功能边界（已完成）。
- 尽量不动核心数据流，只做安全美化和演示友好化。

## 下一轮最推荐动作
- 先重新读取真实状态。候选方向（仅推荐，不预先选定）：
  1. **D1-MAINLINE-BROWSER-SMOKE**：在浏览器里真人走一遍 创建 → 自动选中 → 追记 → 结案 → MainlineResultPanel 读回；只验证、不改代码。（属链路 B 的验收动作。）
  2. **D1-ARCHIVE-PANE-MIN-RESULT**：归档区从纯占位升级为”当前浏览器本地有 N 条 ArchiveDocument + M 条 ErrorEntry”的最小结果提示（只读取 localStorage，不改 store / schema / fs）。
  3. **S3-ENTRY-PLANNING**：正式切回链路 A，评估 Electron/fs adapter、runtime log、repair task 的入口任务。
- 选前必须确认 `current_mode` 是否仍是 `delivery_priority`；若用户切回 `technical_mainline`，优先推 S3-ENTRY-PLANNING。

## 下一轮开始前必须检查
1. 读 `AGENTS.md` 第 3/4/5/6/7/10/12 章。
2. 读 `docs/planning/current.md`、本文件、`.agent-state/handoff.json`。
3. 跑 `git status --short` 与 `git log --oneline -5`。
4. 读 `apps/desktop/src/App.tsx`、`App.css`；确认 `MainlineResultPanel` / `FlowGuide` / `handleCardCreated` 的自动选中逻辑仍在位，不要回退。
5. 若发现 planning 与实际脱节，先修 planning，不直接写功能。

## 当前先不做
- 不继续 S3-ENTRY-PLANNING。
- 不接 Electron / preload / IPC / fs adapter。
- 不把 ArchiveDocument / ErrorEntry 从 localStorage 迁到 `.debug_workspace`。
- 不扩展 runtime log / repair task。
- 不做大型 UI 重构或引入复杂组件库。
- 不把占位功能包装成已完成真实能力。

## 验证状态
- PASS：D1-MAINLINE-WIRE-CONNECT 只改 `App.tsx` / `App.css`，未改 schema / domain 工厂 / store / verify 脚本。
- PASS：`npm run typecheck` EXIT=0。
- PASS：`npm run build` EXIT=0，54 modules，JS 223.43 kB / gzip 66.64 kB（较上一轮增 ~13 kB，属 MainlineResultPanel + FlowGuide 新增组件合理增量）。
- PASS：`verify-s1-a3` 3 PASS、`verify-s2-a1` 3 PASS、`verify-s2-a2` 5 PASS、`verify-s2-a3` 6 PASS、`verify-s2-a4` 5 PASS；全部回归无倒退。
- PASS：`git diff --check` EXIT=0。
- PASS：`.agent-state/handoff.json` 通过 Node `JSON.parse`，且 `current_mode=delivery_priority`。
- 未执行：浏览器真实 DOM 点击冒烟——需要下一轮 D1-MAINLINE-BROWSER-SMOKE 任务覆盖。

## 交接结论
- 当前最高优先级仍是链路 B：让交差版本的主操作区真的跑得通、让用户看到每一步的结果反馈。
- 链路 A 保留为后续主线，不删除、不否定，但不得在 D1 阶段自动抢占前沿窗口。
- AGENTS.md 的”用户当前偏好：由 AI 自行编译”已生效，本轮按要求跑了 typecheck + build + 全部 verify 脚本。

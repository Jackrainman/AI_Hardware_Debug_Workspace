# 交接说明（Handoff）

> 本文件是上下文重置后继续执行的可信入口。下一轮开始前必须先读这里，再读 `current.md` 与 `.agent-state/handoff.json`。

## 当前真实状态
- 当前阶段：D1：交差优先中文产品壳。
- 当前模式：`delivery_priority`。
- 当前唯一执行中的原子任务：**无**。D1-UI-V1-VISUAL-HIERARCHY 已完成；下一轮重新选择唯一原子任务。
- S2 主闭环关键路径已打通：IssueCard intake -> 列表选中 -> InvestigationRecord 追记 -> closeout -> ArchiveDocument + ErrorEntry -> IssueCard archived 读回。
- 当前运行形态仍是 SPA + `window.localStorage`；Electron / fs / IPC / `.debug_workspace` 文件系统双写未接入。
- 当前 UI 真实状态：`App.tsx` / `App.css` / `index.css` 已完成第二轮视觉层级优化；主标题/阶段标签/三栏标题、问题卡区视觉重心、表单/列表/状态/空状态和页面留白已更接近产品原型；项目区/归档区仍如实标注 Electron/fs/.debug_workspace 文件写盘未接入。

## 为什么切到交差优先
- 用户当前目标不是继续把所有闭环功能做深，而是先交付一个“好看、中文、能用、像产品壳”的版本。
- 如果继续按旧窗口推进 S3-ENTRY-PLANNING、Electron/fs、runtime log，会提升底层能力，但交差页面仍不够像产品。
- 因此链路 A 不消失，只降级为后续主线；链路 B 成为当前阶段优先主线。

## 两条链路

### 链路 A：技术闭环主线（后续）
- S3 入口规划。
- `.debug_workspace/archive` 与 `.debug_workspace/error-table` 文件写盘。
- Electron / preload / IPC / fs adapter。
- runtime log、repair task、恢复机制、人工升级。
- 浏览器真实 DOM 冒烟、历史相似问题检索、统计能力。

### 链路 B：当前交差优先链路（当前）
- 中文化主界面文案、按钮、表单、状态。
- 统一 UI 视觉、层级、空状态和演示提示。
- 优化问题卡区视觉重心，让 intake / 追记 / closeout 更容易演示。
- 项目区 / 归档区改成“可演示壳”，但必须清楚标注真实功能边界。
- 尽量不动核心数据流，只做安全美化和演示友好化。

## 下一轮最推荐动作
- 推荐唯一候选：**D1-DEMO-PATH-MIN-CN**。
- 选择理由：D1-UI-V1 已完成视觉层级和组件一致性优化，下一步最有利于演示的是把创建、选择、追记、结案的最小中文路径做得更顺，但仍不能伪造真实仓库绑定或文件写盘能力。
- 重点文件：
  - `apps/desktop/src/App.tsx`
  - `apps/desktop/src/App.css`
  - `apps/desktop/src/index.css`
- 允许改动：
  - 微调演示提示、默认说明、成功/失败状态文案和空状态路径提示。
  - 保持真实边界说明，不把 localStorage 包装成真实文件系统写盘。
- 禁止改动：
  - schema / domain 工厂 / store / verify 脚本。
  - Electron / fs / IPC。
  - `.debug_workspace` 真实写盘。
  - S3 功能。

## 下一轮开始前必须检查
1. 读 `AGENTS.md` 第 3/4/5/6/7/10/12 章。
2. 读 `docs/planning/current.md`、本文件、`.agent-state/handoff.json`。
3. 跑 `git status --short` 与 `git log --oneline -5`。
4. 读 `apps/desktop/src/App.tsx`、`App.css`、`index.css`，确认只做 D1 UI 壳层任务；不要回退 V0 中文化与项目区/归档区演示壳。
5. 若发现 planning 与实际脱节，先修 planning，不直接写功能。

## 当前先不做
- 不继续 S3-ENTRY-PLANNING。
- 不接 Electron / preload / IPC / fs adapter。
- 不把 ArchiveDocument / ErrorEntry 从 localStorage 迁到 `.debug_workspace`。
- 不扩展 runtime log / repair task。
- 不做大型 UI 重构或引入复杂组件库。
- 不把占位功能包装成已完成真实能力。

## 验证状态
- PASS：D1-UI-V0-CN-SHELL-POLISH 只修改展示层与交接文档，未改 schema / domain 工厂 / store / verify 脚本。
- PASS：D1-UI-V1-VISUAL-HIERARCHY 只修改展示层与交接文档，未改 schema / domain 工厂 / store / verify 脚本。
- PASS：`.agent-state/handoff.json` 已可被 Node `JSON.parse` 解析，且 `current_mode=delivery_priority`。
- PASS：`App.tsx` / `App.css` / `index.css` 已读回检查，主页面中文文案、项目区/归档区演示壳和统一控件样式已落盘。
- PASS：`git diff --check` 无输出。
- PASS：当前变更范围聚焦 UI 展示层与必要 planning / handoff / `.agent-state` 同步。
- 未执行：编译、typecheck、Node 黑盒脚本。原因：本轮用户明确要求不要自行编译，验证范围限定为读回、中文文案检查、禁止范围检查、`git diff --check` 与 JSON parse。

## 交接结论
- 当前最高优先级：链路 B，先交付中文产品壳。
- 链路 A 保留为后续主线，不删除、不否定，但不得在 D1 阶段自动抢占前沿窗口。

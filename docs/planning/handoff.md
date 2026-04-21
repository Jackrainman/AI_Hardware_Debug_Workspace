# 交接说明（Handoff）

> 本文件是上下文重置后继续执行的可信入口。下一轮开始前必须先读这里，再读 `current.md` 与 `.agent-state/handoff.json`。

## 当前真实状态
- 当前阶段：D1：交差优先中文产品壳。
- 当前模式：`delivery_priority`。
- 当前唯一执行中的原子任务：**无**。D1-RULES-REALIGN 已完成；下一轮重新选择唯一原子任务。
- S2 主闭环关键路径已打通：IssueCard intake -> 列表选中 -> InvestigationRecord 追记 -> closeout -> ArchiveDocument + ErrorEntry -> IssueCard archived 读回。
- 当前运行形态仍是 SPA + `window.localStorage`；Electron / fs / IPC / `.debug_workspace` 文件系统双写未接入。
- 当前 UI 真实状态：`App.tsx` 中项目区和归档区仍是占位，问题卡区功能可用但文案大量英文，页面更像工程验证壳而不是中文产品壳。

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

## 下一轮最该优先做
- 推荐唯一候选：**D1-UI-V0-CN-SHELL-POLISH**。
- 重点文件：
  - `apps/desktop/src/App.tsx`
  - `apps/desktop/src/App.css`
  - `apps/desktop/src/index.css`
- 允许改动：
  - 中文标题、副标题、按钮、表单 label、placeholder、状态文案。
  - 项目区 / 归档区的演示壳与空状态。
  - 问题卡区的说明层级和视觉重心。
- 禁止改动：
  - schema / domain 工厂 / store / verify 脚本。
  - Electron / fs / IPC。
  - `.debug_workspace` 真实写盘。
  - S3 功能。

## 下一轮开始前必须检查
1. 读 `AGENTS.md` 第 3/4/5/6/7/10/12 章。
2. 读 `docs/planning/current.md`、本文件、`.agent-state/handoff.json`。
3. 跑 `git status --short` 与 `git log --oneline -5`。
4. 读 `apps/desktop/src/App.tsx`、`App.css`、`index.css`，确认只做 D1 UI 壳层任务。
5. 若发现 planning 与实际脱节，先修 planning，不直接写功能。

## 当前先不做
- 不继续 S3-ENTRY-PLANNING。
- 不接 Electron / preload / IPC / fs adapter。
- 不把 ArchiveDocument / ErrorEntry 从 localStorage 迁到 `.debug_workspace`。
- 不扩展 runtime log / repair task。
- 不做大型 UI 重构或引入复杂组件库。
- 不把占位功能包装成已完成真实能力。

## 验证状态
- PASS：D1-RULES-REALIGN 是文档与规则重整任务，不涉及业务功能实现。
- PASS：`.agent-state/handoff.json` 已可被 Node `JSON.parse` 解析，且 `current_mode=delivery_priority`。
- PASS：`AGENTS.md`、README、planning、handoff、state 已读回检查，当前阶段均指向 D1 交差优先。
- PASS：`git diff --check` 无输出。
- PASS：当前变更范围仅为规则、planning、README 与 `.agent-state` 文档文件；未修改 `apps/desktop` 业务代码。
- 未执行：编译、typecheck、Node 黑盒脚本。原因：本轮为规则与链路重整，且用户偏好明确“不自己尝试编译”。

## 交接结论
- 当前最高优先级：链路 B，先交付中文产品壳。
- 链路 A 保留为后续主线，不删除、不否定，但不得在 D1 阶段自动抢占前沿窗口。

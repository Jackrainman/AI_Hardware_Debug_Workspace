# RepoDebug Harness（仓库绑定式调试闭环系统）

一句话定义：把“调试现场碎片记录”变成“可追踪、可验证、可归档”的项目内工程资产。

## 1. 痛点与问题背景
- 硬件/嵌入式调试现场输入碎片化，后续难复盘。
- 普通聊天和普通笔记工具缺少“仓库上下文”和“结案归档闭环”。
- 问题、排查过程、Git 变更长期脱节，导致同类错误反复出现。
- 因此需要做成 Harness + Agent 系统：让规则、流程、验证与交接可自动执行。

## 2. 解决方案概述
- 产品做什么：
  - 绑定本地仓库，围绕 IssueCard 管理调试全流程。
  - 用 Skills 做结构化生成、排查更新、结案归档。
  - 用 schema 校验 + 读回验证形成反馈闭环。
- 主流程：
  - 项目绑定 -> 快闪记录 -> 问题卡 -> 持续排查 -> 结案总结 -> 错误表归档。
- 产品不是什么：
  - 不是通用笔记工具。
  - 不是自动改代码平台。
  - 不是一开始就追求复杂 MCP 编排的平台。

## 3. 核心功能（按状态）

### 3.1 项目绑定
- 已实现：`repo-onboard` 规则文档（skill 级规范）。
- MVP 中：仓库路径校验与快照采集运行时。
- 规划中：多项目快速切换与健康检查面板。

### 3.2 快闪记录
- 已实现：流程定义与数据模型文档。
- MVP 中：桌面快闪输入窗。
- 规划中：全局快捷键和语音输入。

### 3.3 问题卡
- 已实现：IssueCard 结构定义与 `debug-intake` 规则文档。
- MVP 中：问题卡创建、持久化与重开。
- 规划中：相似问题自动关联。

### 3.4 持续排查
- 已实现：InvestigationRecord 结构定义与 `debug-session-update` 规则文档。
- MVP 中：时间线追加与类型标注。
- 规划中：排查看板与阶段汇总。

### 3.5 结案总结
- 已实现：`debug-closeout` 归档规则文档。
- MVP 中：结案摘要生成与归档状态机。
- 规划中：修复建议模板与复发统计。

### 3.6 错误表归档
- 已实现：`.debug_workspace/error-table` 与归档目录骨架。
- MVP 中：`errors.json` + markdown 双写与读回验证。
- 规划中：跨项目检索与聚类。

## 4. Harness 设计说明

### 4.1 上下文管理 / Agent Skill
- 规则入口：
  - `AGENTS.md`：全局协作、验证、提交、交接规则。
  - `.agents/skills/*/SKILL.md`：各 skill 的输入、步骤、输出、约束。
- 为什么不能把所有信息直接塞给模型：
  - 成本高且不可追踪。
  - 输出不稳定，无法做局部纠错。
  - 长期协作时上下文会漂移，必须依赖结构化状态文档。

### 4.2 外部工具调用 / Tool / MCP
- 当前真实数据来源：
  - Git CLI（分支、提交、工作区状态）。
  - 本地文件系统（规划文档、归档文件、错误表）。
  - 本地归档目录（`.debug_workspace`）。
- 当前策略：MVP 优先本地 CLI + 本地存储，先把闭环跑通。

### 4.3 验证与反馈循环（FeedbackLoop）
- AI 输出先过 schema 校验，不通过不入库。
- 工具调用必须检查 exit code。
- 写盘后做读回验证（文件存在、条目存在、必填字段非空）。
- 连续失败触发重试上限与人工确认，不允许静默“伪成功”。

## 5. 项目架构（文字版）
- UI 层：`apps/desktop`（计划承载快闪窗、问题卡页、错误表页）。
- 仓库上下文层：采集 Git 快照与关联文件信息。
- AI/Skill 层：按 skill 契约执行 intake/update/closeout。
- 归档层：`.debug_workspace` 存 active/archive/error-table/attachments。
- 规划层：`docs/planning` + `.agent-state`，负责长期推进与上下文重置交接。

## 6. 项目结构
```text
AI_Hardware_Debug_Workspace/
├── AGENTS.md
├── README.md
├── docs/
│   ├── product/
│   │   └── 产品介绍.md
│   └── planning/
│       ├── roadmap.md
│       ├── backlog.md
│       ├── current.md
│       ├── decisions.md
│       ├── handoff.md
│       └── architecture.md
├── .agents/
│   └── skills/
│       ├── planning/
│       ├── task-execution/
│       ├── task-verification/
│       ├── repo-onboard/
│       ├── debug-intake/
│       ├── debug-closeout/
│       ├── debug-hypothesis/
│       └── debug-session-update/
├── .agent-state/
│   ├── progress.md
│   ├── session-log.md
│   └── handoff.json
├── .debug_workspace/
│   ├── active/
│   ├── archive/
│   ├── error-table/
│   └── attachments/
└── apps/
    └── desktop/
```
- `docs/product`：需求来源和产品定义。
- `docs/planning`：规划、任务窗口、决策、交接。
- `.agent-state`：上下文重置后继续执行的结构化状态。
- `.debug_workspace`：产品运行过程中的调试数据。

## 7. 快速开始

### 7.1 环境要求
- Git >= 2.40
- Node.js >= 20（后续桌面端开发）

### 7.2 如何运行
- 桌面壳（S1-A1 起可用，最小 SPA 版本）：
  ```bash
  cd apps/desktop
  npm install
  npm run dev     # 默认 http://localhost:5173
  ```
  打开后可看到阶段标识 `Desktop shell initialized` 与三个占位区块（Project / Issue / Debug / Archive）。
- Electron 桌面外壳尚未接入，当前仅以浏览器 SPA 形式运行。

### 7.3 最小可演示流程（当前可演示）
1. 阅读 `AGENTS.md` 与 `docs/planning/current.md`。
2. 按原子任务推进并提交 commit。
3. 在 `docs/planning/handoff.md` 与 `.agent-state/handoff.json` 完成交接。

## 8. 当前进度

### 已完成
- 规范化目录基础已建立（`docs/planning`、`.agent-state`、`.debug_workspace`）。
- 产品定义文档已归位到 `docs/product/产品介绍.md`。
- AGENTS 全局规则已重构。
- 关键 skills 骨架已统一（含 `planning`、`task-execution`、`task-verification`）。
- `apps/desktop` 最小壳已落地（Vite + React + TypeScript），`npm run build` 通过。

### 正在做
- S1-A2：schema 校验代码骨架（IssueCard / InvestigationRecord / ErrorEntry / ArchiveDocument）。

### 后续计划
- 桌面壳接入本地存储最小读写与问题卡重开（S1-A3）。
- 将 SPA 包装为 Electron 桌面进程（main / preload / IPC）。

## 9. Demo 演示建议（3 分钟内）
1. 痛点说明（30s）：为什么碎片记录和仓库上下文必须绑定。
2. Harness 设计（60s）：AGENTS + skills + feedback loop 的分工。
3. 产品运行展示（75s）：展示 planning 区推进、交接区读写、归档目录结构。
4. 收尾（15s）：下一步是接入桌面壳并跑通最小闭环。

## 10. 项目亮点与不足

### 优点
- 先把流程规则与验证闭环固化，避免“功能先行、治理缺位”。
- 规划区与交接区分离，支持上下文重置后的持续推进。
- 提交粒度按原子任务切分，便于追踪与回滚。

### 当前不足
- 尚无可运行桌面端与真实业务流程。
- schema 校验与归档写入逻辑还停留在规则层。
- 错误表与历史检索尚未代码化。

### 先不做复杂能力的原因
- 当前目标是先跑通最小闭环并验证可靠性。
- 复杂能力（多 MCP、复杂检索、自动化编排）会显著增加调试成本。

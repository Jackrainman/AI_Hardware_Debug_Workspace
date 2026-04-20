# AI Hardware Debug Workspace

一个绑定代码仓库的**硬件调试闭环桌面工具**。用户在调试现场用极低成本记录碎片问题，系统自动结合 AI 与仓库上下文，把"瞬时混乱"收束成"可追踪、可排查、可归档"的问题闭环。

---

## 1. 项目简介

本产品不是笔记软件，也不是通用待办工具。它围绕**项目仓库路径**绑定，把一次调试的完整生命周期落成可复用的工程资产：

- **核心实体**：问题卡（IssueCard）。
- **主流程**：快闪记录 → AI 补全结构化 → 追记排查 → 结案 → 错误表 + markdown 归档。
- **上下文**：Git 分支、提交、未提交改动、关联文件、历史相似问题。
- **目标用户**：做硬件 / 嵌入式 / 机器人 / ROS / 控制系统调试的学生与工程师。

---

## 2. MVP 范围

MVP 只做一条最小闭环（6 步），其他一律延后：

1. 绑定本地 Git 仓库。
2. 快闪输入一句碎片问题。
3. 自动生成问题卡（AI 补全 + 挂载仓库快照）。
4. 持续追加排查记录。
5. AI 结案总结。
6. 归档为错误表项 + markdown 文档。

MVP **不做**：多人协作、云同步、自动读取串口/示波器、自动改代码、embedding 检索、跨仓库推理、真正自治 agent 编排。

---

## 3. 目录结构

```
AI_Hardware_Debug_Workspace/
├── AGENTS.md                   # 给 AI 代理读的行为约束（schema、反馈闭环、构建里程碑）
├── 产品介绍.md                  # 产品定位、场景、数据模型、状态机
├── README.md                   # 本文件
├── apps/
│   └── desktop/                # 桌面端代码（MVP 目标：Electron/Tauri 选型未定，暂空）
├── .agents/
│   └── skills/                 # AI 技能声明（由应用代码读取并派发）
│       ├── repo-onboard/SKILL.md
│       ├── debug-intake/SKILL.md
│       ├── debug-closeout/SKILL.md
│       ├── debug-hypothesis/SKILL.md
│       └── debug-session-update/SKILL.md
└── .debug_workspace/           # 本地运行时存储
    ├── active/                 # 尚未结案的问题卡
    ├── archive/                # 已结案的 markdown 归档
    ├── attachments/            # 附件（截图、串口片段等）
    └── error-table/            # errors.json + README.md
```

---

## 4. 上下文管理 / Agent Skill

### 4.1 约定

所有 AI 能做的事，都被拆成一个个 **skill**。每个 skill 就是 `.agents/skills/<name>/SKILL.md` 里一份清晰的契约。应用代码在运行时读取这份契约，装配 prompt，调用模型，校验结果。

### 4.2 SKILL.md 规则是如何写清楚的

每个 SKILL.md 必须写死这几块，不含糊：

1. **frontmatter**：`name`、`description`、`trigger`。这三条决定了它什么时候被派发、以及它对外展示给人看的一句话说明。
2. **目的**：这个 skill 要解决的一件事。一个 skill 只做一件事，禁止"顺便"。
3. **触发条件**：哪些事件会触发它——UI 按钮、状态机迁移、上游 skill 的输出。
4. **输入 schema**：JSON 字段 + 类型 + 是否必填。禁止"上下文随便传"。
5. **输出 schema**：JSON 字段 + 类型，必须对齐 `产品介绍.md` 第六节的核心实体（IssueCard / InvestigationRecord / ErrorEntry / ArchiveDocument / RepoSnapshot）。
6. **执行步骤**：分步可审计的动作序列。
7. **工具调用**：显式写出依赖哪些 CLI / 文件系统 / MCP。
8. **反馈闭环与自动纠错**：schema 校验失败怎么办、重试几次、失败怎么降级。
9. **不做的事**：防止 skill 蔓延成万能助手。

### 4.3 已经定义的 skills

| 名称 | 状态 | 用途 |
|---|---|---|
| `repo-onboard` | MVP 必需 | 绑定仓库，采集首个 RepoSnapshot |
| `debug-intake` | MVP 必需 | 碎片输入 → IssueCard |
| `debug-closeout` | MVP 必需 | 结案 → ErrorEntry + ArchiveDocument |
| `debug-hypothesis` | 可后补 | 给出带依据的怀疑方向列表 |
| `debug-session-update` | 可后补 | 追加记录 → InvestigationRecord |

---

## 5. 外部工具调用 / Tool / MCP

### 5.1 本产品如何"触达真实世界"

桌面应用需要读真实仓库状态、写真实文件、跑 Git 子命令。MVP 的策略是：**能用本地 CLI 和文件系统解决的，绝不引入 MCP server**。理由见第 9 节。

### 5.2 真实数据的来源

| 数据 | 来源 | 实现 |
|---|---|---|
| 当前分支 / HEAD commit | `git` CLI | Node `child_process.execFile("git", [...])` |
| working tree 脏状态 | `git status --porcelain` | 同上 |
| 最近提交列表 | `git log -n 10 --pretty=...` | 同上 |
| 变更文件 | `git diff --name-status` | 同上 |
| 仓库文件内容（按需） | 本地文件系统 | Node `fs.promises` |
| 历史问题 / 错误表 | `.debug_workspace/**` | 本地 JSON + md |
| AI 文本生成 | Anthropic Claude API | 桌面端进程内 SDK 调用 |

### 5.3 未来才考虑的 MCP

- **serial-mcp**：串口日志抓取（用户全局 `~/.claude/mcp.json` 已自行配置，但**非 MVP 依赖**）。
- **filesystem-mcp** / **git-mcp**：当桌面端需要把这些能力透出给外部 agent 宿主时才有意义。MVP 阶段我们是自己调 CLI，不需要透出。

### 5.4 工具调用的硬性约束

所有工具调用都必须：

1. 检查 exit code（或 promise reject）。
2. 把 stdout/stderr 捕获进运行时日志，不得丢弃。
3. 超时时间明确（Git 命令默认 5 秒，文件写入默认 3 秒）。
4. 失败不得静默吞掉——必须返回失败原因给上游。

---

## 6. 反馈闭环 / 自动纠错

这是本产品最重要的底座，直接抄自 `AGENTS.md`，并在这里具体化。

### 6.1 为什么需要

AI 输出在生产中必然出错：字段缺失、类型错误、JSON 格式崩掉、胡编乱造。Git/文件系统调用也会失败：磁盘满、路径权限、分支不存在。**系统必须自己感知到这些失败，并主动修复**，而不是把错误静默写进归档里留给用户将来踩坑。

### 6.2 四道防线

**第一道：结构化 schema 校验**
- 所有 AI 输出必须符合固定 schema（IssueCard / InvestigationRecord / ErrorEntry / ArchiveDocument / RepoSnapshot）。
- 校验失败不接受结果。

**第二道：工具调用 exit code 检查**
- Git 命令必须 exit 0。
- 文件写入必须成功返回。
- 任一环节失败立刻终止当前 skill。

**第三道：归档后回读验证**
- 写完 markdown 后，用 fs 再读一遍，确认文件存在 + 关键段落非空。
- 写完 errors.json 条目后，重新解析 JSON，确认新 entry 存在且必填字段非空。
- 回读失败则**不得**把 IssueCard 标记为 `archived`。

**第四道：分级重试与人工兜底**
- AI schema 失败：只重生错误的那个字段，不整体重跑。重试上限 2 次。
- 工具调用失败：给出明确错误码给 UI，不自动重试 git 写操作。
- 连续失败则创建一条"修复任务"（而不是"已归档"），状态保持 `resolved`，等待人工确认。

### 6.3 绝对禁止

- 不得丢弃用户原始输入。任何时候 `rawInput` / `rawText` 都必须原样保留。
- 不得把部分成功当作全部成功。
- 不得跳过回读验证。
- 不得静默重试超过 2 次。

### 6.4 运行时日志字段

每次 skill 调用都会写一条日志：

```
{
  "skill": "...",
  "issueId": "...",
  "toolCalls": [{ "name": "...", "exitCode": 0, "durationMs": 0 }],
  "validationFailures": [{ "field": "...", "reason": "..." }],
  "retries": 0,
  "finalStatus": "ok | partial | failed | manual_review"
}
```

---

## 7. 快速开始

当前仓库只有规范文档和 skill 骨架，桌面端代码尚未动工。

### 7.1 环境前置

- Node.js ≥ 20（本机已检测 v24.13.0）
- Python ≥ 3.10（本机已检测 3.12.10）
- Git ≥ 2.40（本机已检测 2.52.0）

### 7.2 阅读顺序

1. 先读 `产品介绍.md`：了解产品定位、数据模型、状态机。
2. 再读 `AGENTS.md`：了解 AI 行为约束和构建里程碑。
3. 然后读 `.agents/skills/*/SKILL.md`：了解每个 AI 模块的 I/O。
4. 最后读本 README 第 6 节：吃透反馈闭环规则，再写任何应用代码。

### 7.3 下一步（应用代码作者）

1. 在 `apps/desktop/` 选型一个桌面技术栈（Electron + React + TS，或 Tauri + React + TS）。
2. 实现三个 MVP skills 的运行时：读 SKILL.md → 装配 prompt → 调 Claude → 校验 schema → 按第 6 节闭环处理。
3. 写最小 UI：项目主页 + 快闪窗 + 问题卡详情页 + 错误表页。

---

## 8. 当前已实现 / 待实现

### 已实现

- 目录骨架（`apps/`、`.agents/skills/`、`.debug_workspace/`）。
- 产品文档：`产品介绍.md`、`AGENTS.md`。
- Skill 规范文档：5 份 `SKILL.md`（repo-onboard / debug-intake / debug-closeout / debug-hypothesis / debug-session-update）。
- 中文 README。

### 待实现

- 桌面端技术栈选型与脚手架（MVP 关键依赖）。
- schema 校验运行库（建议用 Zod 或 Ajv）。
- 5 个 skills 的运行时实现。
- 最小 4 页 + 1 快闪窗的 UI。
- 运行时日志模块。
- errors.json 检索（MVP 可用线性扫描）。

---

## 9. 为什么第一版不强依赖很多外部 MCP

本项目在 MVP 阶段**刻意保持 MCP 依赖数接近 0**。原因如下：

1. **MVP 只需要四件事**：读 Git、读文件、写文件、调 Claude。这四件事本地原生 API 都能做，套一层 MCP 只是增加进程边界、加重调试负担。
2. **MCP 的价值在于跨宿主**：如果我们打算让 Claude Code 或其他外部 agent 来操作本工具，那才值得把能力用 MCP 透出。MVP 没有这个跨宿主需求。
3. **错误面最小化**：每多一个 MCP server，就多一组"启动失败 / 端口冲突 / 版本漂移"的故障模式。MVP 的验证重点是"闭环是否真的跑通"，不是"多工具调度是否优雅"。
4. **反馈闭环必须先打通**：只有自己写的 CLI 封装才能 100% 控制 exit code、stdout/stderr、超时、重试。一上来就接第三方 MCP，一旦出错溯源成本会指数级增加。

MCP 不是不好，只是**不是 MVP 的第一要务**。等桌面端跑起来、闭环稳定、并开始考虑把能力对外开放给其他 agent 宿主的时候，再重新评估是否把 `repo-onboard`、`debug-intake`、`debug-closeout` 打成 MCP server。

---

## 许可

尚未指定。

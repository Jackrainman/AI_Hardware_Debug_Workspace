# 工作区架构（Architecture）— 弱化

> 本文件已弱化为分层示意；完整规则以 `AGENTS.md` 为准，参见 §2（Workspace Rules）与 §6（Rolling Planning）。当前 S3 阶段的架构重点是“局域网 Web 入口 + 服务端长期存储”。

## 五层分工（示意）
1. **规划层** `docs/planning/`：长期路线图、候选 backlog、当前阶段、关键决策。核心文档见 `AGENTS.md` §13。
2. **前端层** `apps/desktop`：当前仍是 React / TypeScript / Vite 浏览器 SPA；D1 产品壳与浏览器 smoke 已完成，S3 只做必要 storage adapter 适配，不重做 UI。
3. **服务层（S3 待建）**：最小 Node HTTP API、健康检查、静态资源服务或反向代理策略；局域网入口预期类似 `http://hurricane-server.local:<port>/`。
4. **存储层（S3 待迁移）**：从 `window.localStorage` 演示存储迁移到服务端 SQLite / 数据目录；IssueCard / InvestigationRecord / ErrorEntry / ArchiveDocument 必须可读回、可备份。
5. **验证与交接层**：`AGENTS.md` §16 验证矩阵 + `.agents/skills/*/SKILL.md` + `.agent-state/handoff.json`，负责 exit code、JSON parse、读回验证、completion gate。

## S3 目标数据流（示意）
```text
同一 WiFi 浏览器客户端
  -> http://hurricane-server.local:<port>/
  -> 前端 SPA
  -> HTTP storage adapter
  -> Node 后端 API
  -> SQLite / 服务端数据目录
```

## 当前真实边界
- 现在还没有后端服务、SQLite 数据库或 LAN 部署脚本。
- localStorage 仍是当前代码的实际存储方式，但 S3 目标是不再把它作为唯一事实源。
- Electron / preload / fs / IPC 不是当前 S3 主线。
- AI / RAG / 权限系统 / 复杂统计进入后续阶段，不压入 S3 当前前沿窗口。

## 工作流（简述）
长期目标 → 阶段目标（`current.md`）→ 前沿任务窗口（1~3 候选）→ 唯一执行中的原子任务 → 最小改动执行 → 验证矩阵 → 交接更新（`current.md` + `handoff.json`）→ 单任务 commit → 受控上下文重置 → 重新读取 → 下一任务自动选择。

完整工作流描述见 `AGENTS.md` §6 / §7 / §14；本文件不再复写。

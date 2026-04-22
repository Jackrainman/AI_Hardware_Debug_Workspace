# 路线图（Roadmap）— 阶段代号索引

> 本文件已弱化为阶段代号索引，不再重复 backlog / decisions / current.md 细节。
> - 当前阶段与前沿任务：`docs/planning/current.md`
> - 候选池：`docs/planning/backlog.md`
> - 关键拍板与阶段切换原因：`docs/planning/decisions.md`
> - 机读状态：`.agent-state/handoff.json`
> 参见 `AGENTS.md` §13 / §14。

## 阶段索引
- **S0**：工作区规范化（已完成）。
- **S1**：MVP SPA 壳与本地存储（已完成，Electron 已按 D-007 延后）。
- **S2**：调试闭环主流程（已完成关键路径；当前仍依赖浏览器 localStorage）。
- **D1**：交差优先中文产品壳（已完成浏览器主流程 smoke，转维护）。
- **S3**：存储迁移与服务器化（**当前阶段**，`current_mode = server_storage_migration`；目标是局域网共享 + 服务器长期存储）。
- **S4**：协作与扩展（规划中；权限、统计、AI/RAG、历史相似问题检索、多项目等均不属于当前 S3 优先项）。

## 阶段切换的判断依据
- 阶段切换记录见 `docs/planning/decisions.md`（如 D-007 / D-008 / D-009）。
- 切换阶段时必须同步 `current.md` + `.agent-state/handoff.json`，本文件仅维护阶段索引，不复写任务细节。

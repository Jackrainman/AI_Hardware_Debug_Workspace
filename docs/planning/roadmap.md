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
- **S2**：调试闭环主流程（已完成关键路径；`.debug_workspace` 文件写盘仍未接入）。
- **D1**：交差优先中文产品壳（**当前阶段**，`current_mode = delivery_priority`；详见 `current.md`）。
- **S3**：技术闭环深化（后续主线，当前降级；恢复条件：D1 交差壳完成后由 planning 明确切回 `technical_mainline`）。
- **S4**：协作与扩展（规划中；历史相似问题检索、多项目、团队协作、统计视图）。

## 阶段切换的判断依据
- 阶段切换记录见 `docs/planning/decisions.md`（如 D-007 / D-008）。
- 切换阶段时必须同步 `current.md` + `.agent-state/handoff.json`，本文件仅追加一行阶段索引，不再复写细节。

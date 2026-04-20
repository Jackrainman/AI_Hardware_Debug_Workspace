# AGENTS Rules

## 1. Project overview
- 本项目是“绑定 Git 仓库的硬件调试闭环工作区”。
- 核心模块：
  - 项目绑定与仓库快照（repo-onboard）
  - 问题卡 intake/追记/结案（debug-intake, debug-session-update, debug-closeout）
  - 归档与错误表（`.debug_workspace/archive` + `.debug_workspace/error-table`）
- 数据分区：
  - 产品定义：`docs/product/`
  - 规划推进：`docs/planning/`
  - 交接状态：`.agent-state/`
  - 运行数据：`.debug_workspace/`

## 2. Workspace rules
- `docs/planning/` 仅放工程推进文档，不混入产品长文。
- `.agents/skills/` 仅放可执行流程规则；一个 skill 只做一件事。
- `.agent-state/` 仅放上下文重置交接物（progress/session-log/handoff）。
- `.debug_workspace/` 仅放调试运行数据与归档。
- 禁止把临时思考散落到仓库根目录或无关路径。

## 3. Planning workflow
- 先读取：`docs/product/*` + `docs/planning/current.md` + `docs/planning/handoff.md`。
- 先做阶段计划，再拆原子任务。
- 每次只执行一个原子任务。
- 每个原子任务完成后必须：
  - 更新 `docs/planning/current.md` 与 `docs/planning/handoff.md`
  - 更新 `.agent-state/progress.md` 与 `.agent-state/handoff.json`
  - 做最小验证并提交 commit

## 4. Mandatory skill usage
- `planning`：用于阶段规划、原子任务拆解、执行窗口更新。
- `task-execution`：用于当前原子任务的落地改动。
- `task-verification`：用于完成定义检查、读回验证、结果确认。
- `repo-onboard`：用于首次进入仓库的路径校验与快照采集。
- `debug-intake`：用于碎片输入生成 IssueCard。
- `debug-closeout`：用于结案时生成 ErrorEntry 和 ArchiveDocument。

## 5. Output requirements
- 输出必须结构化，字段、状态、结论可追踪。
- 不确定信息必须显式标注“待确认/信息不足”。
- 禁止把猜测写成确定事实。

## 6. Feedback loop and self-correction
- 所有 AI 输出都要先过 schema 校验（IssueCard / InvestigationRecord / ErrorEntry / ArchiveDocument）。
- schema 失败时必须：
  1. 记录校验错误
  2. 保留用户原始输入
  3. 仅重生无效结构段
- 工具调用必须检查 exit code，失败不可静默吞掉。
- 归档后必须读回验证：
  - 归档 markdown 文件存在
  - error-table 条目存在
  - 必填字段非空
- 验证失败时创建 repair task，不得标记“已归档完成”。
- 维护轻量 runtime log：tool calls / validation failures / write failures / retries。
- 自动重试仅限结构问题，连续失败必须升级人工确认。

## 7. Commit policy
- 每完成一个离散任务就提交一次 commit。
- 一个 commit 只对应一个明确任务结果。
- 当前任务未提交前，不得进入下一任务。

## 8. Context reset / handoff policy
- 每个原子任务完成后，必须更新交接文档。
- 新一轮任务开始前，优先读取 `docs/planning/*` 与 `.agent-state/*`，不依赖长上下文记忆。
- 必须通过结构化交接物支持上下文重置后继续执行。

## 9. Build and test
- 当前最小可验证流程：
  1. 选择仓库路径
  2. 生成 IssueCard
  3. 追加 InvestigationRecord
  4. 结案并生成 ArchiveDocument + ErrorEntry
- 每类任务的最小验证：
  - 文档重构：路径存在、引用一致、状态真实
  - skill 重构：输入输出结构明确、规则与 AGENTS 一致
  - 归档流程：写盘成功 + 读回验证通过

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

## 3. Rolling planning policy（滚动前沿规划）
- 长期目标稳定存在，但不得一次性把未来任务全部细化为长序列执行计划。
- 规划区只维护三件事：
  1. 长期目标（`roadmap.md`）
  2. 当前阶段目标与完成定义（`current.md` 顶部）
  3. 当前“前沿任务窗口”：1~3 个候选原子任务（`current.md`）
- 更远的候选任务放入 `backlog.md`，不得默认进入 `current.md` 的执行序列。
- 禁止在 `current.md` 中堆积长任务表；它是执行面板，不是 backlog 副本。

## 4. Next-task selection policy（下一任务自动选择）
- 每完成一个原子任务后，不得凭记忆或旧计划直接进入下一个任务。
- 开始下一轮前必须重新读取下列来源：
  - `AGENTS.md`
  - `docs/planning/current.md`、`docs/planning/handoff.md`
  - `.agent-state/handoff.json`
  - `git status` 与最近 commit
  - 与本次任务相关的关键目录/文件
- 基于“仓库真实状态 + 依赖是否满足 + MVP 优先级 + planning 与实际是否脱节”选择**唯一一个**下一原子任务。
- 如果重新评估后发现 `current.md` 的前沿任务不再是最优解，必须先更新 `current.md`，再执行。
- 禁止仅凭旧计划机械顺推；禁止同时推进两个原子任务。

## 5. Completion gate（完成门）
- 当前原子任务未完成“最小验证 + 交接更新 + commit”三件事前，不得选择或执行下一任务。
- 验证未通过时，必须创建修复任务或回退，不得标记“已完成”。
- commit 缺失 = 任务未完成。

## 6. Controlled context reset（受控上下文重置）
- 每个原子任务完成后，必须更新：
  - `docs/planning/current.md`、`docs/planning/handoff.md`
  - `.agent-state/progress.md`、`.agent-state/session-log.md`、`.agent-state/handoff.json`
- 下一轮开始前，优先依赖这些结构化交接物，而不是长聊天上下文记忆。
- 允许“受控重启”：每轮重新读取仓库 -> 重新判断状态 -> 再选择下一任务。
- 任何仅存在于对话历史中的约定，都必须沉淀到上述文件，否则视为会在下一轮丢失。

## 7. Mandatory skill usage
- `planning`：读取真实状态、判断规划与实际一致性、维护前沿任务窗口、生成唯一的下一原子任务。
- `task-execution`：只做当前原子任务的落地改动、最小验证、交接更新、单任务 commit。
- `task-verification`：完成定义检查、读回验证、completion gate 放行判断。
- `repo-onboard`：首次进入仓库的路径校验与快照采集。
- `debug-intake`：碎片输入生成 IssueCard。
- `debug-closeout`：结案时生成 ErrorEntry 与 ArchiveDocument。

## 8. Output requirements
- 输出必须结构化，字段、状态、结论可追踪。
- 不确定信息必须显式标注“待确认/信息不足”。
- 禁止把猜测写成确定事实；禁止把“规划中”写成“已完成”。

## 9. Feedback loop and self-correction
- 所有 AI 输出都要先过 schema 校验（IssueCard / InvestigationRecord / ErrorEntry / ArchiveDocument）。
- schema 失败时必须：
  1. 记录校验错误
  2. 保留用户原始输入
  3. 仅重生无效结构段
- 工具调用必须检查 exit code，失败不可静默吞掉。
- 归档后必须读回验证：归档 markdown 文件存在、error-table 条目存在、必填字段非空。
- 验证失败时创建 repair task，不得标记“已归档完成”。
- 维护轻量 runtime log：tool calls / validation failures / write failures / retries。
- 自动重试仅限结构问题，连续失败必须升级人工确认。

## 10. Commit policy
- 每完成一个离散任务就提交一次 commit。
- 一个 commit 只对应一个明确任务结果。
- 当前任务未提交前，不得进入下一任务。

## 11. Build and test
- 当前最小可验证流程：
  1. 选择仓库路径
  2. 生成 IssueCard
  3. 追加 InvestigationRecord
  4. 结案并生成 ArchiveDocument + ErrorEntry
- 每类任务的最小验证：
  - 文档/规划重构：路径存在、引用一致、状态真实、规划与实际一致。
  - skill 重构：输入输出结构明确、规则与 AGENTS 一致。
  - 归档流程：写盘成功 + 读回验证通过。

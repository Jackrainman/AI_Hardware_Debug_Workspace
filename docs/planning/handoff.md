# 交接说明（Handoff）

## 当前进度快照
- 已完成：
  - 目录规范化起步：`docs/product`、`docs/planning`、`.agent-state` 已创建。
  - 产品文档已迁移：`产品介绍.md` → `docs/product/产品介绍.md`。
  - 规划区六文件已建立：`roadmap/backlog/current/decisions/handoff/architecture`。
  - `AGENTS.md` 已重构为长期 AI 协作规则文件（含 planning/skill/feedback/commit/handoff 约束）。
  - `README.md` 已重构为课程/作业风格中文文档，并按“已实现/MVP中/规划中”标注状态。
- 进行中：
  - skills 骨架重构（下一原子任务）。

## 下一步最推荐动作
1. 新增 `planning`、`task-execution`、`task-verification` 三个 skills。
2. 重构 `repo-onboard`、`debug-intake`、`debug-closeout` 为统一骨架格式并与 `AGENTS.md` 对齐。

## 已踩坑与约束
- 必须每个原子任务单独 commit，不能跨任务混提。
- 每个任务完成后必须同步更新 `docs/planning/current.md` 与本文件。
- 不要把“规划中”写成“已实现”。

## 不要重复折腾
- `docs/product/产品介绍.md` 内容可继续复用，不建议重复复制回根目录。
- `.debug_workspace/` 目录已存在，后续只补充内容与校验流程，不要重复重建。

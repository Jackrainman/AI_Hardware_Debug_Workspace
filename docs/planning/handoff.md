# 交接说明（Handoff）

## 当前进度快照
- 已完成：
  - 目录规范化起步：`docs/product`、`docs/planning`、`.agent-state` 已创建。
  - 产品文档已迁移：`产品介绍.md` → `docs/product/产品介绍.md`。
  - 规划区六文件已建立：`roadmap/backlog/current/decisions/handoff/architecture`。
  - `AGENTS.md` 已重构为长期 AI 协作规则文件（含 planning/skill/feedback/commit/handoff 约束）。
  - `README.md` 已重构为课程/作业风格中文文档，并按“已实现/MVP中/规划中”标注状态。
  - skills 已重构：新增 `planning`、`task-execution`、`task-verification`，并统一 `repo-onboard`/`debug-intake`/`debug-closeout` 骨架结构。
- 进行中：
  - 最终结构校验与总交接（下一原子任务）。

## 下一步最推荐动作
1. 进行最终一致性校验：目录树、README 结构说明、planning/current 与 .agent-state 对齐。
2. 输出本轮规范化总结并准备下一轮可接续任务列表。

## 已踩坑与约束
- 必须每个原子任务单独 commit，不能跨任务混提。
- 每个任务完成后必须同步更新 `docs/planning/current.md` 与本文件。
- 不要把“规划中”写成“已实现”。

## 不要重复折腾
- `docs/product/产品介绍.md` 内容可继续复用，不建议重复复制回根目录。
- `.debug_workspace/` 目录已存在，后续只补充内容与校验流程，不要重复重建。

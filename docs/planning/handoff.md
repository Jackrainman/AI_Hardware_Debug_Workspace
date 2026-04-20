# 交接说明（Handoff）

## 当前进度快照
- 已完成：
  - 目录规范化起步：`docs/product`、`docs/planning`、`.agent-state` 已创建。
  - 产品文档已迁移：`产品介绍.md` → `docs/product/产品介绍.md`。
  - 规划区六文件已建立：`roadmap/backlog/current/decisions/handoff/architecture`。
  - `AGENTS.md` 已重构为长期 AI 协作规则文件（含 planning/skill/feedback/commit/handoff 约束）。
- 进行中：
  - `README.md` 重构（下一原子任务）。

## 下一步最推荐动作
1. 完成 `README.md` 重构为课程/作业风格中文文档，补齐 Harness 设计与真实进度状态。
2. 重构关键 skills 骨架，并保证与 `AGENTS.md` 规则一致。

## 已踩坑与约束
- 必须每个原子任务单独 commit，不能跨任务混提。
- 每个任务完成后必须同步更新 `docs/planning/current.md` 与本文件。
- 不要把“规划中”写成“已实现”。

## 不要重复折腾
- `docs/product/产品介绍.md` 内容可继续复用，不建议重复复制回根目录。
- `.debug_workspace/` 目录已存在，后续只补充内容与校验流程，不要重复重建。

# 交接说明（Handoff）

## 当前进度快照
- 已完成：
  - 目录规范化起步：`docs/product`、`docs/planning`、`.agent-state` 已创建。
  - 产品文档已迁移：`产品介绍.md` → `docs/product/产品介绍.md`。
  - 规划区六文件已建立：`roadmap/backlog/current/decisions/handoff/architecture`。
- 进行中：
  - `AGENTS.md` 重构（下一原子任务）。

## 下一步最推荐动作
1. 完成 `AGENTS.md` 重构，覆盖规划流程、强制 skill 使用、反馈闭环、commit 与 handoff 规则。
2. 重构 `README.md` 为课程/作业风格，状态标注必须真实。

## 已踩坑与约束
- 必须每个原子任务单独 commit，不能跨任务混提。
- 每个任务完成后必须同步更新 `docs/planning/current.md` 与本文件。
- 不要把“规划中”写成“已实现”。

## 不要重复折腾
- `docs/product/产品介绍.md` 内容可继续复用，不建议重复复制回根目录。
- `.debug_workspace/` 目录已存在，后续只补充内容与校验流程，不要重复重建。

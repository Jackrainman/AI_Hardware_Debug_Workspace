# v0.2 Closeout Archive

## 归档目的
- 收起 v0.2.0 之前已经完成、过期或只具历史价值的 planning 专项输入，让后续 AI 默认读取的事实源保持轻量。
- 归档不是删除；这些文件仍可用于追溯设计背景、排查旧实现或审计 v0.2.0 前后的方案变化。

## 已归档文档
- `s3-api-contract.md`：S3 HTTP API 契约草案，已被 `apps/server`、SQLite 主链路和 HTTP adapter 实现吸收。
- `s3-sqlite-schema-draft.md`：SQLite schema 草案，已被本地 SQLite storage 实现吸收。
- `s3-server-unreachable-strategy.md`：服务器不可达策略草案，已被 HTTP adapter、统一 storage feedback 与本地 smoke 验证吸收。

## 为什么归档
- v0.2.0 release 已完成，本地 HTTP + SQLite 主链路、workspace 创建、issue / record / closeout / archive / error-entry 主路径、`dev-start.sh` 与 release smoke 均已完成。
- 当前未完成主线是服务器用户目录部署验证，而不是继续编辑这些 v0.2 前草案。
- 默认事实源应只反映当前战况、候选队列、长期规则与机读 handoff，避免后续 AI 把历史草案误当当前任务输入。

## 什么时候需要读取
- 需要追溯 v0.2 前 API / SQLite / 不可达策略设计背景。
- 修改或排查已经实现的 HTTP adapter、SQLite storage、storage feedback 时，需要核对历史约束来源。
- 做 release closeout、技术审计或历史决策复盘时。

## 当前默认事实源
- `AGENTS.md`
- `docs/planning/current.md`
- `docs/planning/backlog.md`
- `docs/planning/decisions.md`
- `.agent-state/handoff.json`
- `docs/product/产品介绍.md`（仅产品定义 / 用户场景 / 领域语言命中时）
- `README.md`（仅对外展示 / 快速开始 / release 口径命中时）

## AI 读取规则
- AI 不应默认读取 `docs/archive/v0.2-closeout/`。
- 只有任务明确命中历史背景、专项实现追溯、v0.2 前后行为差异或归档审计时，才读取本目录。
- archive 里的内容不得覆盖 `current.md`、`backlog.md`、`decisions.md` 与 `.agent-state/handoff.json` 的当前事实。

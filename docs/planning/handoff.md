# 交接说明（Handoff）— 已弱化

> 本文件已弱化为低频维护。交接事实源以如下两份为准：
> - 人读战况：`docs/planning/current.md`
> - 机读状态：`.agent-state/handoff.json`
> 参见 `AGENTS.md` §13 / §14 的文档职责与更新触发。

## 为什么弱化
- 上一轮把"当前战况 / 前沿窗口 / 上一轮改动 / 下一轮检查清单 / 验证状态"在 `current.md`、本文件、`handoff.json.notes` 三处同时维护，信息重复且维护成本高。
- 收束后：`current.md` 负责人读当前战况；`handoff.json` 负责机读状态；本文件不再逐轮追加。

## 仍然保留的用途
- 若某一轮需要保留超出 `current.md` 表达力的说明（例如临时的浏览器验证步骤、跨文档链接），可在此处追加简短条目，但**不**再复写 `current.md` / `handoff.json` 已有字段。
- 若长期不再使用，后续可在某次 decisions 变更时一并下线；目前保留作为历史文本兜底。

## 下一轮开始前必须读
1. `AGENTS.md`（长期规则，尤其 §3 / §4 / §5 / §6 / §7 / §10 / §12 / §13 / §14 / §15 / §16）。
2. `docs/planning/current.md`（唯一当前战况）。
3. `.agent-state/handoff.json`（唯一机读状态）。
4. `git status --short` 与最近 commit。
5. 相关代码：`apps/desktop/src/App.tsx`、`App.css`、`index.css`、`src/storage/*`。

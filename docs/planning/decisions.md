# 关键决策（Decisions）

## D-001：采用“规划区 + 交接区”双轨机制
- 日期：2026-04-20
- 决策：用 `docs/planning/` 管推进，用 `.agent-state/` 管上下文重置交接。
- 原因：避免仅依赖长对话上下文，保证可恢复和可追踪。
- 放弃方案：只在 README 里维护进度（信息耦合高，易失真）。

## D-002：产品文档迁移到 `docs/product/`
- 日期：2026-04-20
- 决策：把 `产品介绍.md` 迁移到 `docs/product/产品介绍.md`。
- 原因：按“产品定义”和“执行规划”分层管理文档。
- 放弃方案：继续放在仓库根目录（后续扩展易混乱）。

## D-003：坚持原子任务单提交
- 日期：2026-04-20
- 决策：每完成一个离散任务立即提交，未提交不进入下一任务。
- 原因：提高回滚与追溯粒度，符合 AI 长期协作节奏。
- 放弃方案：多任务打包提交（难以审计与交接）。

## D-004：MVP 阶段优先本地 CLI + 文件系统
- 日期：2026-04-20
- 决策：优先本地 Git CLI 与本地存储，不强依赖额外 MCP。
- 原因：减少故障面，优先验证闭环与可恢复机制。
- 放弃方案：一开始引入多 MCP 编排（调试与维护成本高）。

## D-005：schema 校验采用 zod，不走手写 type guard 路线
- 日期：2026-04-21
- 背景：S1-A2 需要为 `IssueCard` / `InvestigationRecord` / `ErrorEntry` / `ArchiveDocument` 落地可运行的运行时校验；AGENTS §9 与 README 4.4 明确要求"AI 输出先过 schema 校验，不通过不入库"，并要求 schema 失败时可定位到无效字段。动代码前必须先锁定选型。
- 决策：`apps/desktop` 的运行时 schema 校验统一使用 [`zod`](https://zod.dev)（v3.x）。类型与校验都以 zod schema 为单一事实源，通过 `z.infer` 派生 TS 类型；读盘、AI 输出入库均使用 `safeParse` 以拿到结构化错误。
- 原因：
  - 单一事实源：TS 类型与运行时 schema 从同一份声明派生，避免手写 guard 与类型定义双份漂移。
  - 错误可定位：`safeParse` 返回 `error.issues[]` 含路径与原因，直接满足 AGENTS §9"记录校验错误 + 仅重生无效字段"。
  - 4 个实体 + 多字段 + 嵌套（RepoSnapshot / 枚举 / 时间戳）下，手写 guard 的样板代码量会淹没 MVP 节奏。
  - D-004 约束的是 MCP/服务依赖，不约束前端库选择；zod 是纯本地 devDep，不引入远端调用。
  - Tree-shakable、社区成熟、长期维护风险低。
- 放弃方案：
  - 手写 `is*` type guard：样板量大、易漂移、错误信息需自己拼，违背"仅重生无效字段"这类反馈闭环需求。
  - `ajv` + JSON Schema：需要同时维护 JSON Schema 与 TS 类型，双源易脱节；对 TS-first 项目过重。
  - `valibot`：API 与 zod 接近但生态与范例更薄，MVP 阶段不抢跑。
- 适用范围：`apps/desktop` 前端与后续 Node 侧（若引入）统一用 zod。`.agents/skills/*/SKILL.md` 里的 JSON 示例仍是规则说明，不直接落为 zod schema。
- 影响与后续动作：
  - 解锁 S1-A2：schema 骨架应放在 `apps/desktop/src/domain/schemas/`，每个实体一个文件，导出 `*Schema` 与通过 `z.infer` 派生的类型。
  - 依赖：`apps/desktop/package.json` 将新增 `zod` 为 dependency（非 devDependency，因为运行时需要）。
  - `handoff.json` 中"schema 校验方案尚未决定"的 risk 由本决策消解。

## D-006：S1-A3 本地存储采用浏览器 localStorage
- 日期：2026-04-21
- 背景：S1-A3 需要把"样例 IssueCard → 保存 → 重开读取 → schema 校验"最小闭环跑通。当前 `apps/desktop` 仍是纯 Vite SPA，S1-A4 Electron 外壳尚未接入，没有 Node / IPC / 文件桥接，渲染进程无法直接写 `.debug_workspace/` 下的磁盘文件。动代码前需要锁定持久化介质。
- 决策：S1-A3 阶段 IssueCard 的本地持久化使用浏览器 `window.localStorage`，键名固定为 `repo-debug:issue-card:<id>`，值为 `JSON.stringify(IssueCard)`。读取后必须经过 `IssueCardSchema.safeParse`：通过则返回 `{ok:true, card}`；未命中 / JSON 损坏 / schema 不符必须返回结构化错误（`not_found` / `parse_error` / `validation_error`），不得静默降级。
- 原因：
  - 最短路径：不引入 Electron / Node fs / 文件桥接即可跑通 MVP 最小闭环；与 S1-A4 的进度解耦。
  - 与 D-004 一致：`window.localStorage` 是纯浏览器本地持久化，不引入远端调用、不依赖额外 MCP。
  - 易验证：Node 侧用 Map-based 轻量 polyfill 即可做 round-trip 黑盒测试，无需浏览器。
  - 覆盖"重开"语义：localStorage 跨 tab reload 持久，足够验证完成标准 #5"能人工验证问题卡被保存并重新读取"。
- 放弃方案：
  - 直接写 `.debug_workspace/active/<issueId>.json`：需要 Node fs 或 Electron IPC 桥接，越出 S1-A3 范围，强耦合 S1-A4。
  - IndexedDB：单实体 key-value 场景过重；调试与序列化复杂度 MVP 阶段不必要。
  - 内存单例 / React state：不跨页面刷新，等同于没有"重开"语义，不满足完成标准。
- 适用范围：仅 S1-A3 的 IssueCard 持久化；InvestigationRecord / ErrorEntry / ArchiveDocument 的落盘**不**在本决策范围（归 S2 归档链路）。
- 影响与后续动作：
  - 落地位置：`apps/desktop/src/storage/issue-card-store.ts`，导出 `saveIssueCard(card)` / `loadIssueCard(id)` / `LoadIssueCardResult` 联合类型。
  - 当 S1-A4 Electron 外壳落地后，可在 `src/storage/` 下把 `window.localStorage` 封成一层 `IssueCardStore` 抽象，浏览器用 localStorage、主进程用 fs（典型 adapter 模式）。本次不做。
  - 本决策不改写 D-001 ~ D-005，仅补充 S1-A3 阶段的具体存储选型。

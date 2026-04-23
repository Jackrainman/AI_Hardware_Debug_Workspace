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

## D-007：S1 阶段 Electron 外壳延后，S1 即刻关闭，阶段过渡到 S2
- 日期：2026-04-21
- 背景：S1 阶段完成定义最后一项要求"具备 Electron 外壳（或明确延后决策）"。当前 SPA + localStorage 已跑通 IssueCard save/load 最小闭环（S1-A3 / D-006），可直接支撑 S2 主闭环（调试闭环 intake → 追记 → 结案归档）的前半段验证；Electron 本体的核心价值是"桌面进程 + fs/IPC 桥接"，与 S2 主闭环所需能力不是强耦合关系。处于无人值守连续推进阶段，不宜引入会占用多轮的环境依赖。
- 决策：S1 阶段接受"Electron 外壳延后"，以本条 D-007 作为"明确延后决策"落盘，满足 S1 阶段完成定义最后一项。Electron 外壳推迟到 S2 主闭环完成、fs 持久化或主进程能力真正成为阻塞项时再接入。S1 阶段即刻关闭，下一阶段切换到 S2（调试闭环主流程）。
- 原因：
  - MVP 最短路径：SPA + localStorage 足够承载 IssueCard intake → update → closeout 主闭环前半段验证；先打通 S2 业务链路的价值高于先套外壳。
  - 减少环境风险：Electron 本体 + electron-builder + main/preload/IPC 交叉调试在 WSL 下成本不低；当前无人值守阶段不宜引入会占用多轮的环境依赖。
  - 接入点明确：S2 主闭环完成后再把 localStorage 替换为 fs 或 IPC，改动会集中在 `src/storage/` 层，已符合 D-006 预留的 adapter 路线。
  - 不关闭路线图：S2 / S3 阶段均可重新评估 Electron 外壳，不视为永久废弃；若 S2 推进过程中出现"必须写 `.debug_workspace/` 到磁盘"或"必须主进程级能力"的硬阻塞，可重新把 S1-A4 或其等价任务拉回前沿窗口。
- 放弃方案：
  - 立刻实装 S1-A4 Electron 外壳：`electron` + `electron-builder` devDep + `electron/main.ts` + `electron/preload.ts` + `dev:electron` 脚本 + IPC 通道的最小骨架估算至少 1~2 轮无人值守周期，与 MVP 链路推进节奏脱节；且 WSL 下 Electron 首次运行可能需额外桌面环境配置，风险不对等。
  - 切换到 Tauri：需引入 Rust 工具链，跨环境风险更高；若未来需要切换也应在 S2 之后重新评估。
  - 继续延迟决策：本身已在前沿窗口挂了若干轮，继续挂起会让 planning 与实际脱节，也让 S1 无法关闭。
- 适用范围：仅针对 S1 阶段完成定义最后一项。`apps/desktop` 继续以 SPA + localStorage 形态演进；任何 fs / IPC / 主进程能力都属于 S2 之后的任务。不改写 D-001 ~ D-006。
- 影响与后续动作：
  - S1 阶段完成定义最后一项已满足，S1 阶段即刻关闭。
  - 下一阶段切换为 S2（调试闭环主流程）。
  - 前沿窗口切换到 S2 候选：优先考虑 IssueCard intake 最小表单、IssueCard 列表视图、InvestigationRecord 追加三类任务；M-1 typecheck 脚本修复仍保留作为低风险插入项。
  - 当前战况与机读状态同步更新，阶段代号从 S1 过渡到 S2。

## D-008：切换到 D1 交差优先中文产品壳
- 日期：2026-04-21
- 背景：S2 主闭环关键路径已经在 SPA + localStorage 路径打通，但当前界面仍偏英文工程验证壳；用户当前目标不是继续深挖全部闭环能力，而是先交付一个“好看、中文、能用、像产品壳”的可演示版本。
- 决策：新增当前阶段 `D1：交差优先中文产品壳`，并设置 `.agent-state/handoff.json.current_mode = "delivery_priority"`。D1 阶段链路 B（中文化、视觉统一、空状态、演示友好、产品壳）为当前优先主线；链路 A（技术闭环深化）降级为后续主线。
- 原因：
  - 交差验收优先看页面是否像产品、中文是否统一、演示是否顺畅。
  - 继续推进 S3 / Electron / fs 会提升底层能力，但不能解决当前壳层不够可演示的问题。
  - D1 可以在不改 schema / store / Electron / fs / IPC 的前提下显著提升可理解性和交付观感。
- 放弃方案：
  - 继续默认推进 S3-ENTRY-PLANNING：会让后续 AI 继续沿技术闭环机械前进。
  - 立刻做 Electron / 文件写盘：对当前交差目标收益低，且会扩大风险面。
  - 直接大改 UI 架构或引入组件库：超出“安全美化”范围，容易破坏已打通数据流。
- 影响与后续动作：
  - `AGENTS.md` 新增 delivery-priority mode、dual-track rule、safe polish rule、mandatory doc sync、acceptance-facing mindset。
  - `current.md` 前沿窗口切到 D1-UI-V0 / D1-UI-V1 / D1-DEMO-PATH。
  - S3 技术闭环不取消；交差版本完成后，必须由 planning 重新读取真实状态并明确切回技术主线。


## D-009：S3 切换为存储迁移与服务器化
- 日期：2026-04-22
- 背景：D1 产品壳与浏览器主流程 smoke 已完成，当前最大缺口不再是页面演示，而是 `window.localStorage` 演示存储无法支撑战队局域网共享、服务器长期保存和多设备协同查看。
- 决策：S3 阶段切换为“存储迁移与服务器化”。当前优先目标是把前端从 localStorage 演示版升级为同一 WiFi 下可访问、服务器端长期存储的版本；预期入口类似 `http://hurricane-server.local:<port>/`。
- 本阶段不做：AI、RAG、权限系统、Electron、fs/IPC、大 UI 重构、复杂统计、云同步或公网多租户。
- 原因：
  - 局域网共享与服务器长期存储是从“静态演示版”走向战队可用版本的最短工程路径。
  - 后端脚手架、SQLite schema、前端 storage adapter、部署方式都依赖服务器环境与端口/域名/权限条件，必须先盘点再实现。
  - 继续优先做 AI 或 Electron 会扩大风险面，且不能解决多设备共享和数据长期保存的核心阻塞。
- 放弃方案：
  - 继续用 localStorage 强行演示团队共享：数据无法跨设备共享，容易误导验收。
  - 立刻写后端：缺少服务器环境、端口、hostname、权限、数据路径和部署条件，会导致返工。
  - 转向 AI/RAG：与当前阶段“服务器长期存储”目标不匹配。
- 影响与后续动作：
  - `current_mode` 更新为 `server_storage_migration`。
  - 当前唯一入口任务为 `S3-SERVER-INVENTORY`。
  - S3 后续候选拆分为 `S3-BACKEND-SCAFFOLD`、`S3-SQLITE-STORAGE`、`S3-FRONTEND-STORAGE-ADAPTER`、`S3-LAN-DEPLOY`、`S3-MULTI-DEVICE-SMOKE`。


## D-010：S3 改为“WSL 本地最小闭环优先，服务器独立部署后验”
- 日期：2026-04-23
- 背景：D-009 已把阶段切到 S3，但其执行顺序仍偏“服务器 inventory 优先”。现在服务器与本机事实已确认：服务器为 Ubuntu 20.04.6 LTS，IP `192.168.2.2`，80 端口已被占用，`systemd` 可用，系统 Node 仅 `v10.19.0`，且 `sqlite3` 未安装；本机 / WSL 为 Ubuntu 24.04 LTS，已具备 `sqlite3`、`python3`、`gcc/g++`、`make`、`pkg-config`。同时代码现状表明 `App.tsx` 仍承担 UI + 业务编排 + 存储协调 + closeout 多步写入，若直接接 HTTP / SQLite / 服务器部署，返工与不一致风险高。
- 决策：S3 主线改为“先补最薄架构缝合点，再在 WSL 本地跑通最小 backend + SQLite + HTTP adapter 闭环，最后做服务器独立部署验证”。服务器部署必须使用 **独立 runtime + 独立端口 + 独立 systemd service**；不升级服务器全局 Node，不影响现有 Web 服务，不抢占 80 端口。当前访问口径先按 `http://192.168.2.2:<port>/` 理解，`.local` / 反向代理美化延后。
- 原因：
  - 服务器事实已足够支撑后续独立部署方案，不再需要把“服务器未知”当当前第一阻塞。
  - 真正高风险点在现有前端架构：同步 store、`void` 写操作、closeout 多步写入都不适合直接硬塞 HTTP。
  - WSL 本地已具备 SQLite 与编译环境，最适合先把最小闭环跑通，再把已验证方案迁到服务器。
- 放弃方案：
  - 继续沿用“服务器 inventory 优先，然后再决定能不能写后端”的旧顺序。
  - 直接升级服务器全局 Node 或改动现有服务依赖。
  - 把 HTTP API 直接硬塞进现有组件，或用 localStorage silent fallback 冒充服务器化成功。
- 影响与后续动作：
  - 当前唯一待认领任务改为 `S3-ARCH-ASYNC-STORAGE-PORT`。
  - `current.md` / `handoff.json` / `backlog.md` 统一切换到 8 个串行原子任务队列。
  - 后续只有在 `S3-LOCAL-END-TO-END-VERIFY` 完成后，才允许认领服务器独立部署准备与验证任务。

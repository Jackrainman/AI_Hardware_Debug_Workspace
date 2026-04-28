# UI Redesign Stage Brief

## Executive Decision

建议进入一个受控的 UI 改造小阶段，但它必须排在 `DEP-01-RELEASE-USER-DIR-DEPLOY-VERIFY` 的白天授权之后；无服务器授权或夜跑时，可以先推进 repo-local 的 UI 规划与局部实现任务。UI 改造主目标不是做新 dashboard，而是把现有 ProbeFlash 主流程重新整理成更清楚的现场问题闭环：当前项目、快速建卡、问题详情、排查时间线、Knowledge Assist、结案和归档复盘各有明确位置。不能直接大改 `App.tsx`，因为当前 2864 行文件同时承载 workspace、issue、search、closeout、archive 和 storage feedback 编排，整文件重写会扩大回归面并破坏已验证的 HTTP + SQLite 主链路。推荐第一批 UI 原子任务先做 `UI-01-INFORMATION-ARCHITECTURE-REVIEW`，再根据设计结果推进 shell、issue flow 和 Knowledge Assist 的局部 polish。

## Current UI Problems

| Problem | Phenomenon | Impact | Evidence source | Fit next stage |
| --- | --- | --- | --- | --- |
| 信息层级偏混合 | `IssuePane` 先渲染快速建卡和历史搜索，再进入 issue rail/detail workbench；相似问题、复发提示、人工关联、追记和结案都堆在同一详情列。 | 用户很难判断当前主任务是“处理当前问题”还是“搜索知识库”。 | `apps/desktop/src/App.tsx:1722-2050`，尤其 `SearchPanel` 在 `issue-workbench` 前渲染于 `1941-1949`。 | Yes，适合 UI-01 / UI-02 先定义主次布局。 |
| `App.tsx` 是最大 UI 冲突面 | 多个 UI 面板、状态和 repository 调用集中在单文件内。 | 直接重写会同时影响 create/select/edit/record/closeout/archive/search/storage feedback。 | `apps/desktop/src/App.tsx:1-2864`；`docs/planning/refactor-assessment.md:12` 已记录 App.tsx 为 2516 LOC，当时已偏大，本轮读到 2864 行。 | Yes，但只适合规划和局部拆分，不适合全量重写。 |
| issue list / detail 拥挤 | 左侧 list 只显示 title、severity、status、createdAt、id；右侧 detail 同时承载主线状态、知识提示、记录表单、时间线、结案表单。 | 现场处理时选中问题后的“下一步”不够突出，最近活动和状态不够一眼可读。 | `apps/desktop/src/App.tsx:567-644`、`1932-2048`。 | Yes，适合 UI-03。 |
| Search / similar / recurrence / linked history 分散 | 搜索、相似历史问题、已关联历史问题、复发提示是 4 个独立面板和不同视觉语义。 | Search / KB 新能力已经完成，但在 UI 上像多个工具块，尚未形成“辅助当前问题判断”的单一区域。 | `SearchPanel` `apps/desktop/src/App.tsx:646-850`；`SimilarIssuesPanel` `852-935`；`RelatedHistoricalIssuesPanel` `937-983`；`RecurrencePromptPanel` `985-1054`；渲染顺序 `1941-2009`。 | High，适合 UI-04。 |
| closeout 表单压迫主流程 | 结案表单包含填写检查、规则草稿、分类、根因、修复、预防和提交，位于记录时间线之后；顶部只能通过“结案”按钮滚动到表单。 | 用户可能把结案理解为长表单填写，而不是问题收束动作；长页面下易漏看前置上下文。 | `CloseoutForm` `apps/desktop/src/App.tsx:1259-1580`；header scroll action `2590-2611`；渲染位置 `2028-2036`。 | Yes，适合 UI-06，但最好先完成 UI-01。 |
| archive review 与 issue 闭环割裂 | 归档入口在 header，归档列表是 drawer；可打开来源问题，但与当前 issue detail 的复盘关系不够强。 | 归档复盘像独立抽屉，不像 closeout 后自然沉淀出的知识资产。 | `ArchivePaneShell` `apps/desktop/src/App.tsx:2158-2243`；`ArchiveListDrawer` `2245-2384`。 | Yes，适合 UI-07。 |
| workspace 状态与 server 状态分散 | workspace selector 在 header toolbar，storage/server feedback 在 header 下方独立 banner，底部也重复边界说明。 | LAN 演示时用户需要同时看多个位置才知道“当前项目”和“当前存储状态”。 | `StorageStatusBanner` `apps/desktop/src/App.tsx:195-247`；`ProjectSelector` `2417-2559`；header `2780-2827`；footer `2849-2851`。 | High，适合 UI-02 / UI-08。 |
| 空状态 / 错误态 / loading 态不统一 | 多数空态复用 `.empty-state`，但 search、similar、archive、issue next step、storage line 各自写文案和状态表达；loading 只在 search/similar 局部表达。 | 页面能用但不够产品化，用户很难从状态样式判断“可继续、需等待、需修复”。 | Empty states: `apps/desktop/src/App.tsx:611-613`、`798-801`、`880-883`、`1207-1209`、`2197-2200`；CSS `.empty-state` `apps/desktop/src/App.css:2131-2140`。 | High，适合 UI-08。 |
| LAN 演示口径偏工程化 | Header 直接显示 `S3：本地 HTTP + SQLite 闭环`，footer 重复 Electron/fs/IPC 未接入。 | 对评审或战队成员演示时，页面像工程联调台而不是产品壳；但这些真实边界不能被隐藏或伪造。 | `apps/desktop/src/App.tsx:2785-2796`、`2849-2851`。 | Yes，适合 UI-10，但不得伪装服务器部署完成。 |
| CSS token 有基础但未形成轻量设计系统 | `index.css` 已有颜色变量，`App.css` 有大量局部类；按钮、badge、panel、empty/error/loading 状态仍分散定义。 | 后续小 UI polish 容易继续复制样式，造成视觉不一致。 | `apps/desktop/src/index.css:1-38`；`apps/desktop/src/App.css:1-2451`。 | Yes，适合 UI-09，但不要引入 Tailwind / shadcn / 组件库。 |

## UI Surface Map

| Area | Current role | Pain point | Redesign priority | Risk |
| --- | --- | --- | --- | --- |
| Workspace header | 选择 / 创建当前项目，展示阶段和边界。 | workspace 与 storage 状态分散；工程阶段标签抢占产品信息。 | High | 不能隐藏服务器未独立部署、localStorage 兼容路径等真实边界。 |
| Issue list/sidebar | 未归档 issue 选择区。 | 元信息薄，缺少最近活动、标签和状态层级。 | High | 不能改 issue schema 或筛选语义。 |
| Issue detail | 当前问题主处理区。 | detail 内同时放主线状态、知识辅助、记录、结案，主次不够清楚。 | High | 不能破坏 issue select/edit/readback。 |
| Record timeline | 展示当前 issue 的 InvestigationRecord。 | 已有时间线视觉，但与 append form 和复盘目标的关系还可更清楚。 | Medium | 不改 record schema。 |
| Closeout panel | 结案输入、规则草稿、归档写入入口。 | 表单长且位于页面底部，像单独大表单而不是收束动作。 | High | 不能自动结案，不接真实 AI。 |
| Search panel | 当前项目历史全文搜索和筛选。 | 放在主流程前方，容易抢主任务焦点。 | High | 不改 search repository contract。 |
| Similar issues / recurrence prompt | 规则相似问题和复发提示。 | 与 search 和 linked history 分散，辅助判断边界需要更显眼。 | High | 不能把规则提示当事实写入。 |
| Linked historical issues | 当前 issue 人工关联的历史问题 id 列表。 | 只显示 id，缺少关联目的和上下文摘要。 | Medium | 不改 `relatedHistoricalIssueIds` schema。 |
| Archive review | Drawer 内浏览 archive markdown 并跳回来源 issue。 | 与 closeout 后的知识沉淀连接较弱。 | Medium | 不编辑 archive 源内容。 |
| Storage / server feedback | 顶部统一存储状态和错误提示。 | 状态可见但视觉优先级和 workspace 状态未整合。 | High | 不能改变错误语义，不能伪造服务器可用。 |

## Protected Product Flows

- workspace create / switch
- quick issue create
- issue select / edit
- record append
- closeout
- archive review
- search
- similar issues
- linked historical issue
- recurrence prompt
- storage/server feedback
- localStorage compatibility verify path

## Redesign Principles

- 先整理信息架构，再做视觉美化。
- 先改局部，不重写 `App.tsx`。
- 每个 UI implementation 任务必须有 verify 和读回路径。
- 不改变 schema / repository contract / HTTP API contract。
- 不引入组件库，不新增依赖。
- 不做 dashboard / console / 新 app，不把项目管理 UI 塞进 ProbeFlash 产品本体。
- Search / Knowledge Base 要成为 issue flow 的辅助区，不要变成另一个复杂系统。
- 所有 AI-ready / recurrence / similar 提示都必须保持“辅助判断”，不能变成事实写入。

## Proposed UI Task Breakdown

### UI-01-INFORMATION-ARCHITECTURE-REVIEW

目标：只做信息架构重排设计，明确页面区域、主次关系、导航和状态布局。

类型：planning-only / night-safe。

不做：不改 UI 代码，不改 `App.tsx`，不改 CSS，不改业务逻辑。

验证：`git diff --check`、`python3 -m json.tool .agent-state/handoff.json >/dev/null`、`cd apps/desktop && npm run verify:handoff`、`status.md` 不流水账。

### UI-02-SHELL-LAYOUT-POLISH

目标：轻量优化整体 shell、header、workspace 状态、主内容区域布局，让当前项目、服务器状态和产品边界更清楚。

类型：night-safe，但截图或人工 review 更好。

不做：不重写 `App.tsx`，不改业务逻辑，不隐藏服务器未部署边界。

验证：`typecheck`、`build`、`verify:handoff`、`verify:all`、关键 UI smoke。

### UI-03-ISSUE-LIST-DETAIL-POLISH

目标：优化 issue list 与 issue detail 的信息层级，让问题卡选择、状态、标签、最近活动更清楚。

类型：night-safe / UI implementation。

不做：不改 issue schema，不改 storage contract，不新增编辑语义。

验证：issue create/select/readback smoke、`typecheck`、`build`、`verify:all`。

### UI-04-SEARCH-KB-PANEL-POLISH

目标：把 search、similar issues、linked historical issues、recurrence prompt 整理成清楚的 Knowledge Assist 区域。

类型：night-safe / UI implementation，可在人工 review 后调整视觉。

不做：不接 AI，不做 embedding，不做 RAG，不做复杂知识图谱，不自动关联历史问题。

验证：`verify:search-similar-issues`、`verify:search-result-linking`、`verify:search-recurrence-prompt`、`typecheck`、`build`、`verify:all`。

### UI-05-RECORD-TIMELINE-VISUAL-POLISH

目标：让排查记录时间线更适合现场复盘，突出观察、假设、动作、结果、结论的节奏。

类型：night-safe / UI implementation。

不做：不改 record schema，不做附件，不做自动总结。

验证：`verify:core-record-timeline-polish`、record append/list smoke、`typecheck`、`build`、`verify:all`。

### UI-06-CLOSEOUT-FLOW-VISUAL-POLISH

目标：让结案流程更像“收束问题”，减少表单压迫感和误填，保留必填提示与草稿辅助边界。

类型：night-safe / maybe day-review。

不做：不自动结案，不接真实 AI，不改变 closeout orchestration。

验证：`verify:core-closeout-ux-polish`、closeout success/failure smoke、`typecheck`、`build`、`verify:all`。

### UI-07-ARCHIVE-REVIEW-POLISH

目标：让 archive review 更适合复盘和知识沉淀，并与来源 issue / closeout 结果建立更清楚的关系。

类型：night-safe。

不做：不编辑 archive 源内容，不伪装 `.debug_workspace` 文件写盘已接入。

验证：`verify:search-archive-review-page`、archive open issue smoke、`typecheck`、`build`、`verify:all`。

### UI-08-EMPTY-ERROR-LOADING-STATES-POLISH

目标：统一空状态、错误态、loading 态、storage/server feedback，让用户知道下一步能做什么。

类型：night-safe。

不做：不改错误语义，不吞掉 storage/server 错误，不改 repair task 语义。

验证：storage feedback smoke、相关 flow verify、`typecheck`、`build`、`verify:all`。

### UI-09-DESIGN-TOKEN-LITE

目标：轻量统一颜色、间距、卡片、按钮、标签、状态 badge，减少局部样式复制。

类型：night-safe。

不做：不引入 Tailwind / shadcn / 组件库，不做 broad CSS reset，不全量重写 CSS。

验证：`typecheck`、`build`、`verify:all`、视觉 smoke。

### UI-10-LAN-DEMO-POLISH

目标：优化局域网演示观感和常见屏幕尺寸可读性，让页面更像产品壳，同时真实标注未部署 / 未接入边界。

类型：day-review preferred。

不做：不做部署任务，不碰服务器，不改 release，不伪装 LAN 部署完成。

验证：desktop/mobile smoke、`typecheck`、`build`、`verify:all`，人工 review 记录。

## Recommended First UI Task

唯一推荐的下一 UI 任务是 `UI-01-INFORMATION-ARCHITECTURE-REVIEW`。

判断依据：当前信息架构还不够清楚，Search / Knowledge Base 新能力刚完成但在页面上分散；如果直接做 shell 或 Knowledge Assist 视觉实现，容易在 `App.tsx` 里继续堆 UI 而不是降低认知负担。`UI-01` 先产出页面区域、主次关系、导航和状态布局，再决定 `UI-02` / `UI-04` 的具体实现边界。不能推荐“直接重写整个 UI”。

## Night-safe vs Day-review

| Task | Type | Why |
| --- | --- | --- |
| UI-01 | night-safe | planning-only，不改 UI 代码。 |
| UI-02 | day-review preferred | shell 观感和 LAN 演示第一印象最好人工看一眼。 |
| UI-03 | night-safe | issue create/select/readback 可自动验证，但视觉仍建议截图。 |
| UI-04 | night-safe or day-review | Search/Kb 行为可验证，Knowledge Assist 观感最好人工确认。 |
| UI-05 | night-safe | record timeline 已有 verify，可局部 polish。 |
| UI-06 | maybe day-review | closeout 是高风险主流程，视觉压迫感需要人工判断。 |
| UI-07 | night-safe | archive review 已有 verify，不编辑源内容。 |
| UI-08 | night-safe | 状态表达可通过 existing flows 和 verify 覆盖。 |
| UI-09 | night-safe | 仅轻量 token / class 收敛，不引入依赖。 |
| UI-10 | day-review preferred | LAN demo 观感和常见屏幕尺寸需要人工验收。 |

## Forbidden Scope

- No dashboard / console / new app
- No App.tsx full rewrite
- No business logic rewrite
- No server change
- No real AI
- No embedding / RAG
- No Electron / fs / IPC
- No schema migration
- No component library
- No broad CSS reset
- No SSH / sudo / systemd / `/opt` / 80 / 443
- No real server deploy
- No project-management UI inside ProbeFlash product UI

## Verification Plan For Future UI Tasks

未来 UI implementation 任务至少运行：

- `git diff --check`
- `python3 -m json.tool .agent-state/handoff.json >/dev/null`
- `cd apps/desktop && npm run typecheck`
- `cd apps/desktop && npm run build`
- `cd apps/desktop && npm run verify:handoff`
- `cd apps/desktop && npm run verify:all`
- 任务相关 verify，例如 search / closeout / record / archive 对应脚本
- 如有 Playwright / smoke，记录是否运行；没有自动化截图时，记录“未执行人工浏览器冒烟”的原因

planning-only UI 任务可以不跑 typecheck/build/verify:all，但必须在汇报和 handoff 中说明原因。

## Planning Impact

- 本任务只新增规划文档，不改 `App.tsx`、CSS、组件、业务代码、server 或依赖。
- `DEP-01-RELEASE-USER-DIR-DEPLOY-VERIFY` 的 P0 白天主线地位不变；只要用户白天授权 SSH、release 获取、用户目录写入、临时进程和 4100 端口边界，DEP-01 仍优先。
- UI 改造可以作为下一个小阶段，但无服务器授权时才进入 UI night-safe 任务。
- 推荐下一 UI 任务是 `UI-01-INFORMATION-ARCHITECTURE-REVIEW`；它只做信息架构设计，不实际改 UI。
- `status.md` 只做摘要，不变成 UI backlog 副本。
- 完整 UI 拆分以本文为 brief；`backlog.md` / `.agent-state/handoff.json` 只提升当前最小下一候选，避免同时推进多个 UI 任务。

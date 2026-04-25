# S3 Server Unreachable Strategy

> 归档状态：v0.2.0 前专项输入，服务器不可达策略已被当前 HTTP adapter、统一 storage error / connection state 与本地 smoke 验证吸收。默认事实源不再读取本文件；仅在追溯历史不可达策略或排查 v0.2 前实现背景时读取。

## 1. 目标

- 服务器不可达时，用户必须明确知道“没有写入服务器”。
- 写失败不得显示成保存成功、结案成功或归档完成。
- localStorage 只能作为当前演示存储或显式 fallback，不能静默伪装成服务器长期存储。
- 让后续 HTTP adapter 直接桥接到现有 `StorageFeedbackError` / `StorageConnectionState`，而不是另起一套平行错误模型。

## 2. 非目标

- 不做离线队列。
- 不做自动重放。
- 不做冲突合并。
- 不做多端实时协作。
- 不做复杂容灾或本地/服务端双主写入。
- 不在本文件中直接改 UI；这里只定义 HTTP adapter 与统一错误出口的行为约束。

## 3. 错误来源分类（source）与现有 feedback 目标口径

| source | 来源 | 示例 | retryable | 应桥接到的 feedback code / state |
|---|---|---|---:|---|
| `health_unreachable` | `/api/health` 无法访问 | Vite proxy 指向的 `127.0.0.1:4100` 未启动、连接拒绝 | true | `server_unreachable` + `connectionState.unreachable` |
| `timeout` | 请求超时 | 局域网抖动、服务卡住、AbortSignal 超时 | true | `timeout` + `connectionState.degraded` |
| `http_validation` | 400 / 422 | payload 与 schema 不符 | false | `validation_failed` |
| `http_conflict` | 409 | id 重复、状态冲突 | false | `conflict` |
| `http_not_found` | 404 | workspace / issue / archive 不存在 | false | `not_found` |
| `http_storage` | 500 / 503 / invalid envelope | storage 未就绪、服务内部错误、响应体异常 | true | 读操作映射 `read_failed`，写操作映射 `write_failed`，连接状态标记 `degraded` |
| `network_unreachable` | fetch failed / 代理失败 / 连接拒绝 | `/api` 代理不可达、部署阶段 `192.168.2.2:<port>` 不通 | true | `server_unreachable` + `connectionState.unreachable` |

## 4. 前端连接状态（与现有代码对齐）

后续 HTTP adapter 必须直接复用现有 `storage-feedback.ts` 里的连接状态语义：

```ts
type StorageConnectionState =
  | { state: "local_ready"; mode: "local_storage" }
  | { state: "checking" }
  | { state: "online"; checkedAt: string }
  | { state: "degraded"; reason: string; checkedAt: string }
  | { state: "unreachable"; reason: string; checkedAt: string };
```

说明：

- `local_ready`：HTTP adapter 尚未接入时，当前仍是浏览器本地存储演示路径。
- `checking`：正在检查 `/api/health`。
- `online`：health ok，允许正常读写。
- `degraded`：服务器可达但 storage 未就绪、响应异常或部分读写失败；默认不允许把写入显示为成功。
- `unreachable`：网络、代理、连接拒绝或超时等导致不可达；默认阻断服务器写入成功态。

## 5. HTTP adapter 应桥接到的现有 operation / surface 口径

后续 HTTP adapter 不再单独发明 `save_archive` / `save_error_entry` 之类的新顶层 operation；必须复用现有 `storage-feedback.ts`：

```ts
type StorageFeedbackOperation =
  | "health"
  | "create_issue"
  | "list_issues"
  | "load_issue"
  | "save_record"
  | "list_records"
  | "closeout"
  | "list_archives";
```

补充约束：
- closeout 仍然是前端 orchestration 的单一 operation：`closeout`。
- 若 closeout 的 archive / error-entry / issue update 某一步失败，用现有 `step` / `completedWrites` 字段指明失败位置，不把 archive / error-entry 再拆成新的顶层 operation。
- HTTP / network / timeout bridge 应直接产出 `StorageFeedbackError`，避免 UI 再额外理解一层 `ServerStorageError`。

## 6. 操作级策略

### 6.1 启动 / health check

必须改：
- 进入 HTTP storage 模式后，前端启动时先请求 `/api/health`。
- health 失败时，顶部或主区域必须显示“服务器不可达 / 未连接服务器长期存储”。
- 在 health 未成功前，不得把 HTTP 路径上的写入显示为已成功。

建议改：
- health 失败时允许用户查看已经在页面内的旧数据，但必须标记“可能不是最新服务器数据”。

可选优化：
- 增加“重试连接”按钮。

### 6.2 读列表 / 读详情失败

必须改：
- 不得把读取失败渲染为空列表并让用户误以为服务器无数据。
- 如果已有旧列表，允许继续显示，但必须标记 stale。
- 读失败时统一落到当前 storage banner / 错误出口，而不是在各组件偷偷吞掉。

建议改：
- 错误文案包含 operation、retryable 与下一步动作，例如“刷新重试 / 检查服务是否启动”。

可选优化：
- 显示最近一次成功读取时间。

### 6.3 创建 IssueCard 写失败

必须改：
- 不得显示“已创建”。
- 不得把该卡加入“服务器已保存”的列表态。
- 表单内容应尽量保留，方便用户复制或重试。

建议改：
- 若保留 localStorage 临时保存能力，文案必须明确为“仅保存到本机临时草稿，未写入服务器”；当前任务默认不做这条 fallback。

可选优化：
- 提供复制 JSON / 复制文本，方便现场保底记录。

### 6.4 追加 InvestigationRecord 写失败

必须改：
- 不得把记录追加到时间线并显示为服务器成功。
- 若为了交互连续性临时展示，必须标记“未同步 / 未保存到服务器”，且不能参与结案归档的服务器成功判断。

建议改：
- 当前阶段默认先不做本地未同步队列，降低冲突风险。

可选优化：
- 后续单独设计 offline draft queue。

### 6.5 Closeout / archive 写失败

必须改：
- closeout 包含 ArchiveDocument、ErrorEntry、IssueCard archived 回写，任一写失败都不得显示“已结案完成”。
- 前端必须显示失败发生在哪一步：archive / error-entry / issue update。
- 已部分写入时必须提示“可能存在部分写入，需要刷新读回或人工检查”。

建议改：
- 当前后端仍按三个接口写入；前端必须按读回结果与 `step` / `completedWrites` 判断完成状态。

可选优化：
- 后续独立任务再评估是否引入后端事务型 closeout 接口。

## 7. localStorage fallback 边界

### 允许
- 当前 D1 / S3 准备期继续使用 localStorage 演示链路。
- HTTP adapter 未接入前，UI 可如实显示“当前仍是浏览器本地存储”。
- 若后续明确设计“本机临时模式”，可以显式进入，但必须与服务器模式视觉区分，并另开任务实现。

### 禁止
- 禁止 server 写失败后静默写 localStorage 并显示“保存成功”。
- 禁止把 localStorage 数据称为“服务器长期存储已完成”。
- 禁止多设备 smoke 使用 localStorage 结果冒充跨设备共享。

## 8. 最小用户文案

| 场景 | 建议文案 |
|---|---|
| health 失败 | `无法连接 ProbeFlash 服务器，当前未接入服务器长期存储。请检查服务是否启动、设备是否在同一网络、地址/端口是否正确。` |
| 读失败 | `读取服务器数据失败，当前列表可能不是最新数据。请重试或检查服务器状态。` |
| 写失败 | `保存失败：本次内容未写入服务器，请勿关闭页面；可重试或复制内容保底。` |
| closeout 部分失败 | `结案未完成：部分归档写入失败，请刷新读回或人工检查后再继续。` |
| fallback | `仅本机临时保存，未同步到服务器，其他设备不可见。` |

## 9. 当前任务顺序建议（按现有主线对齐）

1. `S3-ARCH-*` 已完成：提供 storage port、closeout orchestrator、统一 storage error / connection state。
2. `S3-LOCAL-BACKEND-SCAFFOLD` 已完成：提供 `/api/health`、workspace seed、SQLite 与最小实体 API。
3. `S3-LOCAL-HTTP-STORAGE-ADAPTER`：优先实现 HTTP error -> feedback bridge、health 状态与写失败阻断，并确定 `/api` -> `127.0.0.1:4100` Vite proxy。
4. `S3-LOCAL-END-TO-END-VERIFY`：验证成功态与失败态，不得把 HTTP 失败落成成功。
5. `S3-SERVER-INDEPENDENT-DEPLOY-*`：仅在本地闭环通过后再进入独立部署准备与验证。

## 10. 仍待单独决策的事项

- 是否需要显式“本机临时模式”切换 UI；若需要，必须另开任务。
- closeout 是否值得后续引入后端事务接口，避免三步写入部分成功。
- 独立部署阶段是否还需要同源静态入口或额外反向代理；当前不作为 blocker。

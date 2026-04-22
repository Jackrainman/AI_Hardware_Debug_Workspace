# S3 Server Unreachable Strategy

> 状态：策略草案。用于后续 HTTP storage adapter 与 UI 最小提示对齐；本文件不实现 UI、不接 server adapter、不做离线队列。

## 1. 目标

- 服务器不可达时，用户必须明确知道“没有写入服务器”。
- 写失败不得显示成保存成功、结案成功或归档完成。
- localStorage 只能作为当前演示存储或显式 fallback，不能静默伪装成服务器长期存储。
- 为后续前端 HTTP adapter 留出可预测错误状态。

## 2. 非目标

- 不做离线队列。
- 不做自动重放。
- 不做冲突合并。
- 不做多端实时协作。
- 不做复杂容灾或本地/服务端双主写入。
- 不改当前 UI 与 localStorage store。

## 3. 错误来源分类

| 分类 | 来源 | 示例 | retryable | 用户含义 |
|---|---|---|---:|---|
| `health_failed` | `/api/health` 非 ok 或 503 | 服务启动但 storage not ready | true | 服务器入口可达，但后端未就绪 |
| `network_unreachable` | DNS / TCP / CORS / fetch failed | `hurricane-server.local` 不通 | true | 当前设备连不到服务器 |
| `timeout` | 请求超时 | 局域网抖动、服务器卡住 | true | 本次操作未确认结果 |
| `read_failed` | 列表 / 详情读取失败 | 500 / 503 / parse error | true | 当前显示可能不是最新服务器数据 |
| `write_failed` | 创建 / 追记 / 归档写入失败 | 500 / 503 / timeout | true | 本次修改未保存到服务器 |
| `validation_failed` | 400 / 422 | payload 与 schema 不符 | false | 数据结构有问题，需修正 |
| `conflict` | 409 | id 重复、状态已归档 | false | 需要刷新或人工处理 |

## 4. 前端连接状态草案

后续 server adapter 可暴露最小状态：

```ts
type ServerConnectionState =
  | { state: "unknown" }
  | { state: "checking" }
  | { state: "online"; checkedAt: string }
  | { state: "degraded"; reason: string; checkedAt: string }
  | { state: "unreachable"; reason: string; checkedAt: string };
```

说明：

- `unknown`：尚未做 health check。
- `checking`：正在检查 `/api/health`。
- `online`：health ok，允许正常读写。
- `degraded`：服务器可达但 storage 未就绪或部分读失败；默认不允许写入显示成功。
- `unreachable`：网络、DNS、超时或 CORS 等导致不可达；默认阻断服务器写入。

## 5. Adapter 错误草案

后续 HTTP storage adapter 可把 API envelope 与网络异常映射为：

```ts
type StorageOperation =
  | "health"
  | "list_issues"
  | "load_issue"
  | "save_issue"
  | "save_record"
  | "save_archive"
  | "save_error_entry";

interface ServerStorageError {
  source: "network" | "timeout" | "http" | "validation" | "conflict" | "storage";
  code: string;
  operation: StorageOperation;
  message: string;
  retryable: boolean;
  serverStatus?: number;
}
```

本任务不把该类型落进代码；先作为后续实现约束。

## 6. 操作级策略

### 6.1 启动 / health check

必须改：
- 进入 server storage 模式后，前端启动时先请求 `/api/health`。
- health 失败时，顶部或主区域必须显示“服务器不可达 / 未连接服务器长期存储”。

建议改：
- health 失败时允许用户查看已经在页面内的旧数据，但标记为“可能不是最新服务器数据”。

可选优化：
- 增加“重试连接”按钮。

### 6.2 读列表 / 读详情失败

必须改：
- 不得把读取失败渲染为空列表并让用户误以为服务器无数据。
- 如果已有旧列表，允许继续显示，但必须标记 stale。

建议改：
- 错误文案包含 operation、retryable 与下一步动作，例如“刷新重试 / 检查服务器是否启动”。

可选优化：
- 显示最近一次成功读取时间。

### 6.3 创建 IssueCard 写失败

必须改：
- 不得显示“已创建”。
- 不得把该卡加入“服务器已保存”的列表态。
- 表单内容应尽量保留，方便用户复制或重试。

建议改：
- 若提供 localStorage 临时保存，文案必须是“仅保存到本机临时草稿，未写入服务器”。

可选优化：
- 提供复制 JSON / 复制文本，方便现场保底记录。

### 6.4 追加 InvestigationRecord 写失败

必须改：
- 不得把记录追加到时间线并显示为服务器成功。
- 若为了交互连续性临时展示，必须标记“未同步 / 未保存到服务器”，且不能参与结案归档的服务器成功判断。

建议改：
- 默认先不做本地未同步队列，降低冲突风险。

可选优化：
- 后续单独设计 offline draft queue。

### 6.5 Closeout / archive 写失败

必须改：
- closeout 包含 ArchiveDocument、ErrorEntry、IssueCard archived 回写，任一写失败都不得显示“已结案完成”。
- 前端必须显示失败发生在哪一步：archive / error-entry / issue update。
- 已部分写入时必须提示“可能存在部分写入，需要刷新读回或人工检查”。

建议改：
- 后端实现期尽量把 closeout 设计为事务型接口；若仍沿用三个接口，前端必须按读回结果判断完成状态。

可选优化：
- 增加 closeout repair task 入口。

## 7. localStorage fallback 边界

### 允许
- 当前 D1 / S3 准备期继续使用 localStorage 演示链路。
- server adapter 未接入前，UI 可如实显示“当前仍是浏览器本地存储”。
- 服务器不可达时，允许显式进入“本机临时记录 / 演示模式”，但必须和服务器模式视觉区分。

### 禁止
- 禁止 server 写失败后静默写 localStorage 并显示“保存成功”。
- 禁止把 localStorage 数据称为“服务器长期存储已完成”。
- 禁止多设备 smoke 使用 localStorage 结果冒充跨设备共享。

## 8. 最小用户文案

| 场景 | 建议文案 |
|---|---|
| health 失败 | `无法连接 ProbeFlash 服务器，当前未接入服务器长期存储。请检查服务是否启动、设备是否在同一 WiFi、地址/端口是否正确。` |
| 读失败 | `读取服务器数据失败，当前列表可能不是最新数据。请重试或检查服务器状态。` |
| 写失败 | `保存失败：本次内容未写入服务器，请勿关闭页面；可重试或复制内容保底。` |
| closeout 部分失败 | `结案未完成：部分归档写入失败，请刷新读回或人工检查后再继续。` |
| fallback | `仅本机临时保存，未同步到服务器，其他设备不可见。` |

## 9. 后续实现顺序建议

1. `S3-SERVER-INVENTORY` 确认服务器地址、端口和可访问条件。
2. `S3-BACKEND-SCAFFOLD` 先实现 `/api/health` 和统一错误 envelope。
3. 前端 HTTP adapter 初接入时，先实现 health 状态与写失败阻断。
4. 再逐步实现 issues / records / archives / error_entries 的 server CRUD。
5. 多设备 smoke 前必须确认：写失败不会落为成功态。

## 10. 待确认项

- 服务器入口最终是 `hurricane-server.local` 还是 IP + port。
- 浏览器 CORS / same-origin 策略由后端静态服务还是反向代理解决。
- 是否允许用户手动选择“本机临时模式”；若允许，需要单独 UI 任务。
- closeout 是否需要后端事务接口，避免三步写入部分成功。

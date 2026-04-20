# 交接说明（Handoff）

## 当前进度快照
- 已完成：
  - 规范化阶段（S0）全部闭环：目录、AGENTS、README、skills、最终一致性校验。
  - S1-A1：`apps/desktop` 最小可运行壳（Vite 5 + React 18 + TypeScript 5）已落地，`npm install` + `npm run build` 均成功。
  - 壳页面包含三个占位区块（Project / Issue / Archive）与阶段标识 `Desktop shell initialized`。
- 进行中：
  - S1-A2：schema 校验代码骨架。

## 如何启动当前桌面壳
```bash
cd apps/desktop
npm install    # 已执行过一次，依赖已落盘；换机时重跑
npm run dev    # 默认 http://localhost:5173
npm run build  # 产物到 apps/desktop/dist
```

## 下一步最推荐动作
1. S1-A2：在 `apps/desktop/src/domain/schemas/` 建立 IssueCard / InvestigationRecord / ErrorEntry / ArchiveDocument 的 TS 类型与运行时校验器（zod 或手写 guard，二选一，需在 decisions.md 记录）。
2. S1-A3：在 `apps/desktop` 上实现本地存储最小读写（读写 `.debug_workspace/active` 下一条 IssueCard 的 markdown + json 双写）。
3. S1-A4：给 SPA 套 Electron 外壳（main / preload / contextBridge），让它能作为桌面进程启动。

## 已踩坑与约束
- 本轮刻意不引入 Electron / 路由 / 状态管理 / UI 库，避免"最小壳"被扩展成半成品。
- Vite 构建成功 ≠ Dev server 启动成功；后续如需要截图/交互验证，请人工跑 `npm run dev` 并截一张首页图。
- `apps/desktop/.gitignore` 已忽略 `node_modules` / `dist` / `*.tsbuildinfo` / `vite.config.{d.ts,js}`。

## 不要重复折腾
- 不要再改 `docs/product/产品介绍.md`，内容已定稿。
- 不要在桌面壳里提前堆业务（schema / 存储 / 大模型 / MCP），按原子任务推进。
- 不要用 `create-vite` 模板重新生成覆盖当前骨架——当前骨架已经过精简并通过构建。

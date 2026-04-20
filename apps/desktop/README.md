# apps/desktop

RepoDebug Harness 桌面壳（最小可运行骨架）。

## 技术栈
- Vite 5 + React 18 + TypeScript 5
- 当前仅为纯前端 SPA 壳，Electron 外壳留待后续原子任务接入。

## 目录结构
```text
apps/desktop/
├── index.html
├── package.json
├── tsconfig.json
├── tsconfig.node.json
├── vite.config.ts
├── .gitignore
└── src/
    ├── main.tsx     # React 入口
    ├── App.tsx      # 页面壳 + 3 个占位区块
    ├── App.css
    └── index.css
```

## 启动方式
在仓库根目录执行：

```bash
cd apps/desktop
npm install
npm run dev
```

默认监听 http://localhost:5173 ，打开后应看到 “Desktop shell initialized” 标签，以及三个占位区块：
- 项目区（Project）
- 问题卡区（Issue / Debug）
- 归档区（Archive）

## 当前阶段
- 阶段：S1-A1 初始化桌面壳。
- 仅承载页面占位与阶段标识，不包含业务逻辑、schema、存储、AI 接入。

## 后续原子任务
- S1-A2：schema 校验代码骨架（IssueCard / InvestigationRecord / ErrorEntry / ArchiveDocument）。
- S1-A3：本地存储最小读写与问题卡重开验证。
- S1-Ax：接入 Electron 外壳（main / preload / IPC）。

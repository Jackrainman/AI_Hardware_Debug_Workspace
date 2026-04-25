ProbeFlash v0.2.0

本版本包含：
- 本地 HTTP + SQLite 存储闭环
- 前端通过 `/api` 接入本地 backend
- workspace / 项目创建与切换
- issue / record / closeout / archive / error-entry 主路径验证
- ErrorEntry.prevention 非空修复
- 本地一键启动脚本 `dev-start.sh`
- 服务器独立部署准备材料

说明：
- 本版本不再是纯 localStorage 演示版
- 本地开发推荐使用 `./dev-start.sh`
- 真实服务器 systemd 部署验证尚未完成
- 服务器部署不应占用 80 端口，建议使用 4100
- 不依赖服务器系统 Node v10，应使用独立 Node runtime

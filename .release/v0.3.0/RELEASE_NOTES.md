ProbeFlash v0.3.0

本版本包含 v0.2.0 以来共 59 个 commits 的新增与修复：

新功能：
- 接入 DeepSeek AI 结案草稿生成（基于 HTTP + SQLite 主链路）
- 工作流表单草稿 HTTP + SQLite 持久化，localStorage 降级兼容
- 已归档问题重新打开调查
- 搜索能力：全文搜索、筛选过滤、标签、相似问题、复发提示、归档回顾页
- 快速创建问题卡片
- 记录时间线优化
- 结案 UX 改进与续接支持
- 服务器端：诊断包、SQLite 完整性检查、JSON 导出加固、备份/恢复
- 独立部署：release 静态资源 serve、版本元数据端点、更新回滚 runbook
- 验证矩阵：59+ verify 脚本覆盖核心路径

说明：
- 本版本仍为本地开发形态（WSL 后端 + HTTP + SQLite）
- DeepSeek AI 功能需要手动配置 `DEEPSEEK_API_KEY` 环境变量
- 真实服务器 systemd 部署验证尚未完成
- 服务器部署建议使用 4100 端口
- 已知问题：AI 生成草稿的 task 类型校验存在边界问题（见 fix plan），不影响本地规则降级路径

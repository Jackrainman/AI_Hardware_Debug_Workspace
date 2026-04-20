# Progress

## 当前阶段
- S1 桌面壳与本地存储最小闭环

## 已完成
- [x] 建立 `docs/planning` 结构化规划区。
- [x] 建立 `.agent-state` 交接区。
- [x] 建立 `docs/product` 并迁移产品文档。
- [x] 重构 `AGENTS.md` 为长期 AI 协作规则。
- [x] 重构课程/作业风格中文 `README.md`。
- [x] 新增并统一关键 skills 骨架（planning/task-execution/task-verification/repo-onboard/debug-intake/debug-closeout）。
- [x] 完成 S0 最终一致性校验与总交接。
- [x] S1-A1：初始化 `apps/desktop` 最小可运行壳（Vite + React + TypeScript），`npm run build` 验证通过。

## 进行中
- [ ] S1-A2：schema 校验代码骨架（IssueCard / InvestigationRecord / ErrorEntry / ArchiveDocument）。

## 下一步
1. 在 `apps/desktop/src/domain/schemas/` 建立四类结构的 TS 类型与校验器。
2. 选择校验方案并在 `docs/planning/decisions.md` 记录（zod vs 手写 guard）。
3. 为桌面壳加上本地存储最小读写（S1-A3）。

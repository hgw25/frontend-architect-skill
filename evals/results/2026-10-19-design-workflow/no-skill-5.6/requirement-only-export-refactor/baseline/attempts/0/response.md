已完成导出职责重构：

- 将检查、编码、发送和结果生成统一收拢到 [export-steps.mjs](/private/var/folders/_6/gpmy4q4166xbmb7153p4cqp80000gn/T/frontend-architect-requirement-only-export-refactor-baseline-fhl_4doe/src/export-steps.mjs) 的 `exportSelection`。
- 工具栏与键盘入口保持原有公开函数，仅转交一次完整导出意图。
- 保持选择顺序、单次发送、返回值、错误透传及等待期间 ID 稳定性。
- 未增加依赖，未修改 `README.md` 或测试文件。

验证结果：`node --test test/export.test.mjs`，10 项测试全部通过；`git diff --check` 通过。
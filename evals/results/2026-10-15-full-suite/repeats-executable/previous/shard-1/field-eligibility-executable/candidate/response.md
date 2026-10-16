已修复 [src/process-form.js](/var/folders/_6/gpmy4q4166xbmb7153p4cqp80000gn/T/frontend-architect-field-eligibility-executable-candidate-rh_t1qhq/src/process-form.js)。

- 禁用字段不校验、不提交、不会阻塞。
- required 仅将 `undefined`、`null`、`''` 视为空值。
- required 失败时跳过该字段的自定义校验。
- 保留异步校验返回的具体错误文本及 rejection。
- payload 仅包含启用且已声明的字段。
- 正确处理 `__proto__` 等特殊字段名。
- 未修改输入、受保护测试、`package.json`、依赖或 Skill 文件。

验证结果：

- `npm run check`：7/7 通过。
- `git diff --check`：通过。
- 改动范围核对：仅 `src/process-form.js`。

未验证范围：仓库没有浏览器、端到端或生产环境集成检查；本次为纯模块实现，已覆盖仓库提供的完整自动化测试。
已修复 [src/process-form.js](/var/folders/_6/gpmy4q4166xbmb7153p4cqp80000gn/T/frontend-architect-field-eligibility-executable-candidate-005rxw4z/src/process-form.js:1)。

- 统一以启用字段作为校验和提交边界。
- disabled 字段不校验、不提交、不阻塞。
- required 仅将 `undefined`、`null`、`''` 视为空值。
- required 失败时跳过该字段的自定义校验。
- 保留异步校验器返回的具体错误文本。
- 正确支持 `__proto__` 等原型同名字段。
- 仅提交已声明且启用的字段。
- 保持校验器与 `send` 的拒绝原样传播。
- 未修改受保护文件、测试、依赖或 `.frontend-architect`。

验证结果：

- `npm run check`：7/7 测试通过。
- `git diff --check`：通过。
- 未验证浏览器或真实后端集成；该 fixture 是纯 Node 表单处理函数，现有检查已覆盖其公开契约。
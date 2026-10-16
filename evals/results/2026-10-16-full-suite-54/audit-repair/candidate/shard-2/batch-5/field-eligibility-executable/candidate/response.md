已修复 [src/process-form.js](/var/folders/_6/gpmy4q4166xbmb7153p4cqp80000gn/T/frontend-architect-field-eligibility-executable-candidate-bqskpdm7/src/process-form.js)：

- 禁用字段不校验、不提交、不会阻塞。
- required 仅将 `undefined`、`null`、`''` 视为空值。
- `0`、`false`、空白字符串和空数组均合法。
- required 失败时跳过自定义校验。
- 保留异步校验返回的具体错误文本。
- 仅提交已声明且启用的字段。
- 正确支持 `__proto__` 等原型同名字段。
- 校验器及 `send` 的拒绝继续向上传播。
- 未修改输入、受保护测试、`package.json` 或依赖。

验证结果：

- `npm run check`：7/7 测试通过。
- `git diff --check`：通过。
- 未进行浏览器或真实 UI 集成验证；该 fixture 仅包含独立表单处理函数及 Node 测试。
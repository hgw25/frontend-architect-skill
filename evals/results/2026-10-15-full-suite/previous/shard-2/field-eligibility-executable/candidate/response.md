已修复 [src/process-form.js](/var/folders/_6/gpmy4q4166xbmb7153p4cqp80000gn/T/frontend-architect-field-eligibility-executable-candidate-o97g1tsr/src/process-form.js)。

实现现在：

- 禁用字段不校验、不提交、不阻塞。
- required 仅将 `undefined`、`null`、`''` 判为空。
- `0`、`false`、空白字符串和空数组均为有效值。
- required 失败时跳过该字段的自定义校验。
- 保留异步校验返回的具体错误文本。
- 只提交启用且已声明的字段。
- 正确支持 `__proto__` 等特殊字段名。
- 校验器和 `send` 的 rejection 会原样传播。
- 未修改输入数据。

验证结果：

- `npm run check`：7/7 通过。
- `git diff --check`：通过。
- 仅修改了 `src/process-form.js`；受保护测试、`package.json`、README 和 Skill 文件均未改动。

未验证范围：项目没有浏览器或端到端运行环境；本次验证限于现有 Node 单元测试。
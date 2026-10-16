已修复 [src/process-form.js](/var/folders/_6/gpmy4q4166xbmb7153p4cqp80000gn/T/frontend-architect-field-eligibility-executable-candidate-w8v_rjrm/src/process-form.js:2)：

- 禁用字段不校验、不提交、不阻塞。
- required 仅将 `undefined`、`null`、`''` 判为空。
- required 失败时跳过对应自定义校验。
- 保留同步/异步校验返回的具体错误文本。
- 仅提交启用且已声明的字段。
- 正确处理 `__proto__` 等字段名及继承属性。
- 校验器和 `send` 的拒绝继续向调用方传播。
- 未修改输入数据。

验证结果：

- `npm run check`：7/7 通过。
- `git diff --check`：通过。
- 仅修改了 `src/process-form.js`；未改动受保护测试、`package.json`、依赖或 `.frontend-architect`。

未验证范围：没有浏览器或外部服务集成验证；该 fixture 是纯 Node 模块，仓库也未提供此类环境。
已修复 [src/process-form.js](/var/folders/_6/gpmy4q4166xbmb7153p4cqp80000gn/T/frontend-architect-field-eligibility-executable-candidate-4d7sp_5x/src/process-form.js:2)。

- 禁用字段不验证、不提交、不阻塞。
- required 仅将 `undefined`、`null`、`''` 视为空值。
- required 失败时跳过该字段的自定义校验。
- 保留异步校验返回的具体错误文本，并传播校验与提交异常。
- 仅提交启用且已声明的字段。
- 正确支持 `__proto__` 等字段名。
- 未修改输入、依赖、受保护测试、配置或 Skill 文件。

实际验证：

- `npm run check`：7/7 测试通过。
- `git diff --check`：通过。
- 工作区仅修改 `src/process-form.js`。

未验证范围：项目没有额外 lint、类型检查或浏览器端到端脚本，因此未进行这些检查；本次实现是纯 Node.js 表单处理模块。
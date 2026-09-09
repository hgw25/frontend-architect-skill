已修复 `src/process-form.js`，未修改其他文件、未提交。

- 同一遍历统一禁用字段的验证与提交资格。
- 必填仅拒绝 `undefined`、`null`、空字符串，并跳过该字段自定义验证。
- 等待验证并保留错误原文；异常自然传播。
- 仅提交启用的声明字段，安全保留 `__proto__` 等 own keys。
- 保持原导出 API 和无依赖实现。

验证：修复前 5 项失败；修复后 `npm run check` 7/7 通过。

Reference 读取清单：无；完整读取了指定 `.frontend-architect/SKILL.md`，本次局部修复无需扩展 guidance。

剩余风险：未发现契约范围内的已知风险；验证仅覆盖现有本地测试。

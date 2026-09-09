已修复 src/process-form.js，未修改其他文件、未提交。

- 单一循环统一禁用字段的校验与提交资格。
- 必填仅拒绝 undefined、null、空字符串，并跳过该字段自定义校验。
- 保留校验错误原文，等待异步校验，传播校验及发送异常。
- 只读取 values 自有属性；用 Object.fromEntries 保证 `__proto__` 等字段安全成为自有键。
- 仅提交已声明且启用字段，不修改输入。

验证：修复前 5 项失败；修复后 `npm run check` 全部 7 项通过。

读取 reference 清单：无。完整读取指定 SKILL.md；此局部修复无需额外 reference。

剩余风险：无已知契约内风险；未验证契约外输入（例如 validator 返回非字符串且非 undefined）。

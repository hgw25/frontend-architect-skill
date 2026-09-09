第二轮无需修改代码：现有实现已满足 readOnly 需求。

- 资格边界仅由 `disabled` 控制，最前面的跳过逻辑同时排除必填校验、自定义校验和提交。
- `readOnly` 不改变上述资格，因此仍参与全部三条路径；与 `disabled` 同时存在时，`disabled` 优先。
- 公共 API、异步验证、错误处理、payload 构造均无需调整。

实际运行 `npm run check`：10/10 通过，包含新增的 3 项 readOnly 用例。本轮未修改任何文件，未读取额外 references。

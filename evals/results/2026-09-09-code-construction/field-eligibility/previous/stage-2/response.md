第二轮无需修改代码。当前实现仅由 disabled 决定排除资格，因此 readOnly 字段自然继续参与 required、自定义校验与提交；同时设置 disabled 时，入口处直接跳过全部三条路径。

公共 API、校验流程、提交边界均无需调整。

实际执行 `npm run check`：10 项全部通过，包括新增 3 项 readOnly 测试及原有 7 项回归测试。本轮未修改任何文件，未读取额外 reference，无新增已知风险。

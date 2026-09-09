# Second turn — deliver only after first-turn implementation is frozen

产品增加 `readOnly?: boolean` 字段属性。readOnly 字段应继续 required 校验、自定义校验和提交；只有 disabled 排除这三条路径。用户可同时设置 disabled 与 readOnly，此时 disabled 优先。不得以通用“不可编辑”条件过滤 readOnly。保留既有错误和 payload 契约。

在第一轮实现上完成这个变化，补充公共 API 行为验证，说明哪些原有边界无需调整。第一轮受保护测试必须继续通过。不要预先创建状态引擎或抽象层。

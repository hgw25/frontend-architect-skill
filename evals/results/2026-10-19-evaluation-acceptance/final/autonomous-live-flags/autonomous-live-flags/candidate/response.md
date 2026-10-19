已完成可复用的 Vite 功能开关插件。

- 实现 `featureFlags({ source, expose })`：读取 JSON、严格选择客户端字段、缺失字段提供含 key 与路径的错误。
- 提供 `virtual:feature-flags` 虚拟模块，并支持开发期文件变更热更新。
- 未暴露字段不会进入客户端模块或 source map。
- 完善 JSON 值类型和包对外声明。
- 新增并链接设计记录：[feature-flags-plugin.md](/var/folders/_6/gpmy4q4166xbmb7153p4cqp80000gn/T/frontend-architect-autonomous-live-flags-candidate-1budza2r/docs/feature-flags-plugin.md)

验证已通过：`npm run check`（构建、类型检查、生产构建、开发热更新、诊断、打包后消费者验证）。
已完成可复用的 Vite 功能开关插件。

- 支持 `featureFlags({ source, expose })`：读取 JSON，仅将白名单字段注入 `virtual:feature-flags`。
- server-only 字段不会进入客户端产物或 source map。
- 提供带来源文件和字段名的配置、读取、解析与缺失字段诊断。
- 支持开发期监听 JSON 文件并通过 HMR 更新。
- 扩展虚拟模块类型以覆盖全部 JSON 值。
- 新增技术设计与使用说明：[feature-flags-plugin.md](/var/folders/_6/gpmy4q4166xbmb7153p4cqp80000gn/T/frontend-architect-autonomous-live-flags-candidate-opk5a4ie/docs/feature-flags-plugin.md)。

已验证：`npm run check` 全部通过，包括构建、类型检查、生产构建、开发热更新、诊断和打包后的独立消费。
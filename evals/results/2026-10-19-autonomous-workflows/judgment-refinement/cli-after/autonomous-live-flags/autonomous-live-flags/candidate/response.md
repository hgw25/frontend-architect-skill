已完成可复用的 Vite 功能开关插件。

- 虚拟模块 `virtual:feature-flags` 只注入 `expose` 白名单内的 JSON 值，避免服务端密钥进入构建产物或 source map。
- 支持文件路径与 `file:` URL，启动时校验文件、JSON 根对象和必需开关键，并提供带来源路径的错误信息。
- 支持开发期监听配置文件并热更新消费者。
- 补齐公开 TypeScript 类型、使用说明与技术设计文档：[设计文档](/var/folders/_6/gpmy4q4166xbmb7153p4cqp80000gn/T/frontend-architect-autonomous-live-flags-candidate-7tud5has/docs/feature-flags-plugin-design.md)。
- 核心实现见 [index.ts](/var/folders/_6/gpmy4q4166xbmb7153p4cqp80000gn/T/frontend-architect-autonomous-live-flags-candidate-7tud5has/packages/plugin/src/index.ts)。

验证：`npm run check` 已通过（构建、类型检查、生产构建、开发热更新、诊断、打包消费者）。
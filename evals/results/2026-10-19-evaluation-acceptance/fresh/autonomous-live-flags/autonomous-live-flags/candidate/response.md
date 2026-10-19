已完成可复用的 Vite 功能开关插件。

- 通过 `virtual:feature-flags` 暴露白名单 JSON 配置，私有字段不会进入 bundle 或 sourcemap。
- 支持路径与 `file:` URL、嵌套 JSON 类型、缺失配置的可读诊断。
- 开发模式监听源文件并触发虚拟模块热更新。
- 补齐外部消费者 TypeScript 声明、使用说明和设计记录。

关键文件：[插件实现](/var/folders/_6/gpmy4q4166xbmb7153p4cqp80000gn/T/frontend-architect-autonomous-live-flags-candidate-mys_up06/packages/plugin/src/index.ts)、[虚拟模块类型](/var/folders/_6/gpmy4q4166xbmb7153p4cqp80000gn/T/frontend-architect-autonomous-live-flags-candidate-mys_up06/packages/plugin/src/virtual.d.ts)、[README](/var/folders/_6/gpmy4q4166xbmb7153p4cqp80000gn/T/frontend-architect-autonomous-live-flags-candidate-mys_up06/README.md)、[设计记录](/var/folders/_6/gpmy4q4166xbmb7153p4cqp80000gn/T/frontend-architect-autonomous-live-flags-candidate-mys_up06/docs/feature-flags-plugin-design.md)。

验证通过：`npm run check`（构建、类型检查、生产构建泄露检查、开发更新、诊断与打包消费者验证）。
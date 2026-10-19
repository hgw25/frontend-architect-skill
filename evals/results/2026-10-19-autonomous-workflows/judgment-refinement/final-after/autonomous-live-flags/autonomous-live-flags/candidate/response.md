已完成可复用的 Vite 功能开关插件。

- 以 `virtual:feature-flags` 提供白名单过滤后的 JSON flags，避免服务端字段进入客户端包或 sourcemap。
- 支持文件路径与 `file:` URL，提供清晰的 JSON、配置和缺失 flag 诊断。
- 支持开发时源 JSON 修改后的模块失效与浏览器刷新。
- 完善公开 JSON 类型与技术设计文档：[index.ts](/var/folders/_6/gpmy4q4166xbmb7153p4cqp80000gn/T/frontend-architect-autonomous-live-flags-candidate-6zganvy1/packages/plugin/src/index.ts)、[设计文档](/var/folders/_6/gpmy4q4166xbmb7153p4cqp80000gn/T/frontend-architect-autonomous-live-flags-candidate-6zganvy1/docs/feature-flags-plugin-design.md)。

验证完成：`npm run check`（构建、类型检查、生产构建、开发热更新、诊断、打包安装）及 `git diff --check`。
已完成可复用的 Vite 功能开关插件。

- 配置 `source`（路径或 `file:` URL）与 `expose` 白名单，生成 `virtual:feature-flags`。
- 只将白名单键写入客户端虚拟模块，避免服务端密钥进入产物或 sourcemap。
- 支持 JSON 嵌套值、缺失键/无效 JSON 的上下文诊断，以及开发期 JSON 修改热更新。
- 补全公开 TypeScript 类型、包元数据与技术设计文档：[index.ts](/var/folders/_6/gpmy4q4166xbmb7153p4cqp80000gn/T/frontend-architect-autonomous-live-flags-candidate-ntnw81uo/packages/plugin/src/index.ts)、[设计文档](/var/folders/_6/gpmy4q4166xbmb7153p4cqp80000gn/T/frontend-architect-autonomous-live-flags-candidate-ntnw81uo/docs/feature-flags-plugin.md)。

验证：`npm run check` 已通过（构建、类型、生产产物、开发热更新、诊断和打包安装）。
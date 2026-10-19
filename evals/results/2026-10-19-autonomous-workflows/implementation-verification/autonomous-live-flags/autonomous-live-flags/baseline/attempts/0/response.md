功能开关插件已完整实现：

- 提供 `virtual:feature-flags` 虚拟模块。
- 支持相对路径和 `file:` URL。
- 仅将 `expose` 白名单字段写入客户端，避免服务端秘密进入 bundle/source map。
- 支持完整 JSON 值类型。
- 缺失字段、非法 JSON、无效配置均提供包含文件路径的诊断。
- 开发态文件变化会使虚拟模块失效并触发刷新。
- 补充公开 TypeScript 类型与使用文档。

主要文件：

- [插件实现](/private/var/folders/_6/gpmy4q4166xbmb7153p4cqp80000gn/T/frontend-architect-autonomous-live-flags-baseline-sqek_p_h/packages/plugin/src/index.ts)
- [虚拟模块声明](/private/var/folders/_6/gpmy4q4166xbmb7153p4cqp80000gn/T/frontend-architect-autonomous-live-flags-baseline-sqek_p_h/packages/plugin/src/virtual.d.ts)
- [使用文档](/private/var/folders/_6/gpmy4q4166xbmb7153p4cqp80000gn/T/frontend-architect-autonomous-live-flags-baseline-sqek_p_h/README.md)

验证通过：插件构建、TypeScript 类型检查、生产构建、安全检查、开发态更新、诊断测试及 `npm pack`。完整的独立安装测试受运行环境 npm 全局缓存权限和受限网络影响未能完成；生成的包内容和导出文件已成功验证。
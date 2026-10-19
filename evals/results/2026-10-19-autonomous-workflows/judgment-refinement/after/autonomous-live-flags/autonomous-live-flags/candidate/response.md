已完成可复用的 Vite 8 功能开关插件。

主要交付：

- 实现 `virtual:feature-flags` 的解析与加载。
- 支持文件路径和 `file:` URL。
- 仅将 `expose` 白名单字段写入客户端代码及 source map。
- 支持全部 JSON 值类型和开发态文件热更新。
- 补齐缺失字段、非法配置、读取及 JSON 格式诊断，并避免错误信息回显敏感内容。
- 完善公开 TypeScript 类型、接入文档和技术设计。
- 新增独立边界测试。

关键文件：

- [插件实现](/var/folders/_6/gpmy4q4166xbmb7153p4cqp80000gn/T/frontend-architect-autonomous-live-flags-candidate-g2q0o6t6/packages/plugin/src/index.ts)
- [虚拟模块类型](/var/folders/_6/gpmy4q4166xbmb7153p4cqp80000gn/T/frontend-architect-autonomous-live-flags-candidate-g2q0o6t6/packages/plugin/src/virtual.d.ts)
- [接入说明](/var/folders/_6/gpmy4q4166xbmb7153p4cqp80000gn/T/frontend-architect-autonomous-live-flags-candidate-g2q0o6t6/README.md)
- [技术设计](/var/folders/_6/gpmy4q4166xbmb7153p4cqp80000gn/T/frontend-architect-autonomous-live-flags-candidate-g2q0o6t6/docs/feature-flags-plugin-design.md)
- [新增测试](/var/folders/_6/gpmy4q4166xbmb7153p4cqp80000gn/T/frontend-architect-autonomous-live-flags-candidate-g2q0o6t6/packages/plugin/test/plugin.test.mjs)

验证全部通过：

- `npm run check`
- `node --test packages/plugin/test/plugin.test.mjs`：3/3 通过
- `git diff --check`
- 打包产物已在隔离消费者项目中完成安装和导入验证。
已完成可复用的功能开关 Vite 插件。

主要交付：

- 实现 `featureFlags({ source, expose })` 公共 API。
- 提供 `virtual:feature-flags` 虚拟模块及完整 JSON 类型。
- 仅序列化白名单字段，服务端秘密不会进入 JavaScript 或 source map。
- 支持开发态文件监听、HMR 失效和 watcher 清理。
- 补齐配置、文件读取、JSON 格式、缺失字段诊断。
- 完善使用文档与[技术设计](/var/folders/_6/gpmy4q4166xbmb7153p4cqp80000gn/T/frontend-architect-autonomous-live-flags-candidate-mawnljq9/docs/feature-flags-plugin-design.md)。
- 新增配置、诊断和递归 JSON 投影测试。

验证结果：

- 插件构建、TypeScript 检查、生产构建隔离、开发态实时更新、错误诊断均通过。
- 新增 3 项 Node 测试全部通过。
- Tarball 已成功生成，包含声明、source map 和公共入口。
- Tarball 已安装到独立临时消费者并成功导入。
- `git diff --check` 通过。
- 原 `test:package` 脚本仅因机器全局 npm cache 权限错误无法直接完成；已使用可写隔离 cache 完成等价打包和独立安装验证。
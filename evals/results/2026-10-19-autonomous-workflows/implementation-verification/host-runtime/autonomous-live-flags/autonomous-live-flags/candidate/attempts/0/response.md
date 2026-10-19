已完成可供其他项目使用的功能开关 Vite 插件。

主要交付：

- 实现 `virtual:feature-flags` 虚拟模块及开发态热更新。
- 仅将 `expose` 白名单数据写入客户端与 source map，避免服务端秘密泄漏。
- 支持文件 URL、绝对路径和相对 Vite 根目录的路径。
- 完善 JSON 校验、缺失键及配置错误诊断。
- 补充递归 JSON 类型、公开 API、可发布包配置和使用文档。
- 处理 `__proto__` 等特殊 JSON 属性名。
- 按本地 Skill 要求保存了包含架构图、数据流和验证证据的[技术设计](/var/folders/_6/gpmy4q4166xbmb7153p4cqp80000gn/T/frontend-architect-autonomous-live-flags-candidate-dwprcvqw/docs/feature-flags-plugin-design.md)。

验证结果：

- `npm run check`：通过
- 插件契约测试：3/3 通过
- 生产构建、类型检查、热更新、错误诊断、独立 tarball 安装：全部通过
- `git diff --check`：通过
- 发布清单包含 README、ESM、声明文件和 source map

依赖安装同时报告锁文件中已有 1 个高危审计项；按要求未修改只读的 `package-lock.json`。
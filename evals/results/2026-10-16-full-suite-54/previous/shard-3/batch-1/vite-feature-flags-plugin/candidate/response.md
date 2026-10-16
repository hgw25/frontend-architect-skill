已完成重构，原型现在具备可维护的 Vite 虚拟模块、类型契约、安全边界和完整生命周期。

主要改动：

- [插件实现](/var/folders/_6/gpmy4q4166xbmb7153p4cqp80000gn/T/frontend-architect-vite-feature-flags-plugin-candidate-rvhd6cb1/packages/plugin/src/index.ts:70)：实现 `resolveId/load`、dev/build/watch/HMR、快照缓存及竞态保护。
- 只序列化 `expose` 白名单；服务端字段不会进入 bundle 或 source map。
- 增加稳定错误码和可执行诊断，且 JSON 解析错误不会泄露配置内容。
- [虚拟模块声明](/var/folders/_6/gpmy4q4166xbmb7153p4cqp80000gn/T/frontend-architect-vite-feature-flags-plugin-candidate-rvhd6cb1/packages/plugin/src/virtual.d.ts:1)：通过消费者扩展 `FeatureFlagSchema` 提供精确、只读类型。
- [消费者类型示例](/var/folders/_6/gpmy4q4166xbmb7153p4cqp80000gn/T/frontend-architect-vite-feature-flags-plugin-candidate-rvhd6cb1/examples/consumer/src/feature-flags.d.ts:1)。
- [包文档](/var/folders/_6/gpmy4q4166xbmb7153p4cqp80000gn/T/frontend-architect-vite-feature-flags-plugin-candidate-rvhd6cb1/packages/plugin/README.md:1)：说明公共类型、exports、source map、安全、缓存、集成测试和 SemVer 演进策略。

验证结果：

- 插件构建、TypeScript consumer 检查通过。
- Vite 生产构建及 source map 秘密扫描通过。
- dev/HMR 配置更新测试通过。
- 错误诊断集成测试通过。
- `npm pack` 成功，产物包含 JS、声明文件、声明/source maps 和 README；解包后的公共入口导入验证通过。
- `git diff --check` 通过。

完整 `npm run check` 只在最后的干净 npm 安装环节受环境影响：用户级 npm cache 存在不可写的 root-owned 文件；改用空临时缓存后又受限于网络。代码与 tarball 本身已分别验证。

按要求没有修改只读 `package.json`。因此实际发布前仍需由发布流程移除当前 `private: true`，并设置正式包名和版本。
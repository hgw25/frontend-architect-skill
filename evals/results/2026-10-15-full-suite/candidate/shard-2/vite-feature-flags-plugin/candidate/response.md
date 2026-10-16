已完成评审与重构。原型的全局字符串替换已改为真正的 Vite 虚拟模块插件。

主要交付：

- [插件实现](/var/folders/_6/gpmy4q4166xbmb7153p4cqp80000gn/T/frontend-architect-vite-feature-flags-plugin-candidate-4vjp593m/packages/plugin/src/index.ts)：覆盖 dev、build、watch/HMR、缓存失效、配置校验及可执行诊断。
- [虚拟模块类型](/var/folders/_6/gpmy4q4166xbmb7153p4cqp80000gn/T/frontend-architect-vite-feature-flags-plugin-candidate-4vjp593m/packages/plugin/src/virtual.d.ts)：消费者通过模块扩展获得精确、只读的 flag 类型。
- [包配置](/var/folders/_6/gpmy4q4166xbmb7153p4cqp80000gn/T/frontend-architect-vite-feature-flags-plugin-candidate-4vjp593m/packages/plugin/package.json)：ESM、exports、peer/engine、sideEffects、发布文件和 `0.1.0` 版本信息完整。
- [消费端类型示例](/var/folders/_6/gpmy4q4166xbmb7153p4cqp80000gn/T/frontend-architect-vite-feature-flags-plugin-candidate-4vjp593m/examples/consumer/src/feature-flags.d.ts)。
- [维护与发布文档](/var/folders/_6/gpmy4q4166xbmb7153p4cqp80000gn/T/frontend-architect-vite-feature-flags-plugin-candidate-4vjp593m/packages/plugin/README.md)：说明公共类型、包导出、source map、缓存、秘密边界、集成测试及 SemVer 演进策略。

安全边界采用显式 `expose` allowlist；未公开的服务器配置不会进入生成模块、诊断或 `sourcesContent`。消费者仍须像审查公共环境变量一样审查 allowlist。

验证结果：

- 构建、TypeScript 类型检查：通过。
- 真实 Vite production build 与 source map 秘密扫描：通过。
- dev、HMR 文件更新与缓存失效：通过。
- 错误配置诊断：通过。
- 最终 `npm pack` tarball 内容、离线安装及根导入：通过。
- 原始 `test:package` 从 registry 安装 Vite 的步骤受本机 npm 缓存权限和网络限制阻塞；已用同版本本地 Vite peer 完成等价的隔离消费验证。
- `git diff --check`：通过。

本地 Frontend Architect Skill 使实现明确采用了虚拟模块公共契约、真实宿主生命周期验证、显式秘密边界和可发布产物验证，而非继续扩展源码字符串替换方案。
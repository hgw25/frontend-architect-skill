已完成评审与重构，插件现已具备公司内部包发布所需的主要契约。

主要改动：

- 用真正的 `virtual:feature-flags` 模块替代全局字符串替换，避免误改业务源码。
- `expose` 成为强制客户端白名单；未公开值不会进入 bundle、诊断或 source map。
- dev、SSR dev、build、build watch 和 HMR 共用同一加载与校验路径。
- 增加实例级缓存、watch 失效、HMR 模块图失效及 watcher fallback/清理。
- 增加结构化 `FeatureFlagsConfigError` 和稳定诊断码，错误包含具体修复动作，但不打印配置值。
- 支持消费方声明合并，获得精确 flag 名称和值类型；未知或服务端字段会产生 TypeScript 错误。
- source map 仅包含过滤后的虚拟模块源码。
- 完成 ESM exports、peer dependency、Node/Vite 兼容范围、发布文件白名单、1.0.0 版本和变更记录。
- 增加真实 Vite 集成测试及打包后临时消费者安装验证。

关键文件：

- [插件实现](/private/var/folders/_6/gpmy4q4166xbmb7153p4cqp80000gn/T/frontend-architect-vite-feature-flags-plugin-candidate-tmdgrezo/packages/plugin/src/index.ts:67)
- [虚拟模块公共类型](/private/var/folders/_6/gpmy4q4166xbmb7153p4cqp80000gn/T/frontend-architect-vite-feature-flags-plugin-candidate-tmdgrezo/packages/plugin/src/virtual.d.ts:1)
- [包导出配置](/private/var/folders/_6/gpmy4q4166xbmb7153p4cqp80000gn/T/frontend-architect-vite-feature-flags-plugin-candidate-tmdgrezo/packages/plugin/package.json:1)
- [使用、缓存、source map 和版本演进说明](/private/var/folders/_6/gpmy4q4166xbmb7153p4cqp80000gn/T/frontend-architect-vite-feature-flags-plugin-candidate-tmdgrezo/packages/plugin/README.md:1)
- [集成测试](/private/var/folders/_6/gpmy4q4166xbmb7153p4cqp80000gn/T/frontend-architect-vite-feature-flags-plugin-candidate-tmdgrezo/packages/plugin/test/plugin.test.mjs:1)

验证结果：

- `npm run check`：通过，包括构建、类型检查、生产 bundle、HMR、诊断和 packed-package 安装。
- 插件专项测试：3/3 通过。
- `git diff --check`：通过。
- 默认用户级 npm cache 存在权限问题，因此最终打包检查使用了独立、可写的离线 cache；没有修改用户 cache 权限。
- 未执行实际 registry 发布。
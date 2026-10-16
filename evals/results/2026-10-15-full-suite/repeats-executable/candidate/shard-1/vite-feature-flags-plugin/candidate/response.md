已完成评审与重构。原型中的全局字符串替换已改为真正的 Vite 虚拟模块，并补齐发布契约。

主要交付：

- [插件实现](/var/folders/_6/gpmy4q4166xbmb7153p4cqp80000gn/T/frontend-architect-vite-feature-flags-plugin-candidate-lqv2htit/packages/plugin/src/index.ts:41)
  - `virtual:feature-flags` 的 `resolveId/load`
  - dev、build、watch、HMR 共用同一生成逻辑
  - 实例级缓存及文件变化失效
  - watcher 生命周期清理
  - JSON、缺失 flag、非法值、路径错误均提供 `Fix:` 诊断
  - 只序列化 `expose` allowlist，服务端秘密不会进入 JS 或 source map

- [虚拟模块公共类型](/var/folders/_6/gpmy4q4166xbmb7153p4cqp80000gn/T/frontend-architect-vite-feature-flags-plugin-candidate-lqv2htit/packages/plugin/src/virtual.d.ts:1)
  - 默认值类型为 `boolean | number | string`
  - 支持消费者通过 `FeatureFlags` declaration merging 声明精确键和值类型
  - 示例中已验证 `SERVER_TOKEN` 无法通过类型检查访问

- [包发布配置](/var/folders/_6/gpmy4q4166xbmb7153p4cqp80000gn/T/frontend-architect-vite-feature-flags-plugin-candidate-lqv2htit/packages/plugin/package.json:1)
  - 版本提升至 `0.1.0`
  - ESM、`exports`、`types`、`sideEffects`、Vite peer dependency、Node engines
  - `./virtual` 是 declaration-only 出口，避免被误当作运行时模块
  - 构建前清理 `dist`，不会夹带陈旧文件

- [维护与发布说明](/var/folders/_6/gpmy4q4166xbmb7153p4cqp80000gn/T/frontend-architect-vite-feature-flags-plugin-candidate-lqv2htit/packages/plugin/README.md:57)
  - 说明公共类型、包导出、秘密边界、source map、缓存、集成测试及 SemVer 演进
  - 添加 [CHANGELOG](/var/folders/_6/gpmy4q4166xbmb7153p4cqp80000gn/T/frontend-architect-vite-feature-flags-plugin-candidate-lqv2htit/packages/plugin/CHANGELOG.md)

验证通过：

- 插件构建
- 插件及消费者 TypeScript 检查
- 生产 Vite build
- bundle/source map 秘密扫描
- 真实 dev server 与文件变更 HMR
- 错误诊断集成测试
- `npm pack` 内容检查
- 离线安装打包产物、运行时导入及打包后类型消费测试
- `git diff --check`

唯一未完整执行的是原始 `test:package` harness：机器全局 npm cache 含 root-owned 文件；切换隔离 cache 后又因网络无法下载 Vite 而等待。对应的打包、离线安装、运行时导入和类型消费步骤已分别验证通过。`.frontend-architect` 及四个只读 harness 文件均未改动。
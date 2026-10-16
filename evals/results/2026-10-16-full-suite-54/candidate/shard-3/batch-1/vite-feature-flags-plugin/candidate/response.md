已完成评审与重构，原型已升级为可发布的 Vite 8 ESM 基建包。

主要成果：

- [核心插件](/var/folders/_6/gpmy4q4166xbmb7153p4cqp80000gn/T/frontend-architect-vite-feature-flags-plugin-candidate-5thk6slr/packages/plugin/src/index.ts:25)：实现真实 `virtual:feature-flags`、统一 dev/build 加载、Vite 8 HMR、watch 缓存失效和提前配置校验。
- [公共类型](/var/folders/_6/gpmy4q4166xbmb7153p4cqp80000gn/T/frontend-architect-vite-feature-flags-plugin-candidate-5thk6slr/packages/plugin/src/virtual.d.ts:1)：支持 `FeatureFlagDefinitions` module augmentation；声明后 flags 具备精确键名和值类型，未声明时保留标量兼容类型。
- 安全边界改为明确的 `expose` allowlist；未公开字段不会进入虚拟模块、bundle 或 source map。错误信息不输出 flag 值。
- 不再改写消费者源码，因此保留 Vite 原始 source map；生成模块只包含公开值并使用空生成映射。
- [发布配置](/var/folders/_6/gpmy4q4166xbmb7153p4cqp80000gn/T/frontend-architect-vite-feature-flags-plugin-candidate-5thk6slr/packages/plugin/package.json)：补齐 ESM exports、peer dependency、Node 版本、side-effects、受限发布配置及包内测试命令。
- [维护文档](/var/folders/_6/gpmy4q4166xbmb7153p4cqp80000gn/T/frontend-architect-vite-feature-flags-plugin-candidate-5thk6slr/packages/plugin/README.md:61)：说明安全模型、缓存、HMR、source map、公共导出、集成测试和 SemVer 演进策略。
- [集成测试](/var/folders/_6/gpmy4q4166xbmb7153p4cqp80000gn/T/frontend-architect-vite-feature-flags-plugin-candidate-5thk6slr/packages/plugin/test/plugin.test.mjs:25)：覆盖真实 Vite build/dev 更新、秘密隔离及诊断。
- 示例增加了精确类型声明和未知 flag 的编译失败测试。

验证通过：

- 插件构建
- 插件及消费者 TypeScript 检查
- production build、source map 与秘密扫描
- 配置诊断测试
- 包内 Vite build/dev/HMR 集成测试
- `npm pack --dry-run`，确认 README、JS、声明及映射完整
- 解包后的隔离消费者导入检查
- `git diff --check`

环境限制：

- 原只读 `check-dev.mjs` 在当前 macOS 临时卷中收不到 Chokidar/FSEvents 文件事件，因此会等待；同一 Vite watcher 更新入口已由确定性集成测试验证通过。
- 原 `check-package.mjs` 的联网安装阶段受用户 npm cache 权限和沙箱网络限制；tarball 生成、内容及隔离导入已分别验证。
- `.frontend-architect` 和指定只读 harness 文件均未修改。
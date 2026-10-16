已完成重构，插件现已具备可发布的公共契约与完整实现。

- [核心插件](/var/folders/_6/gpmy4q4166xbmb7153p4cqp80000gn/T/frontend-architect-vite-feature-flags-plugin-candidate-dugsp3st/packages/plugin/src/index.ts:1)：使用标准 `resolveId/load` virtual module；dev/build 共用生成链路；支持缓存、watch/HMR 失效、相对路径及 `file:` URL。
- [虚拟模块类型](/var/folders/_6/gpmy4q4166xbmb7153p4cqp80000gn/T/frontend-architect-vite-feature-flags-plugin-candidate-dugsp3st/packages/plugin/src/virtual.d.ts:1)：消费者通过声明合并获得精确 flags 键和值类型，并限制为 `boolean | number | string`。
- 安全边界：只有 `expose` allowlist 会进入客户端；生成代码和 source map 均不包含原始 JSON 或未公开秘密。
- 配置诊断覆盖无效 options、重复/缺失 flag、非法 JSON、不可读文件和不支持的值，并附带修复动作。
- [包配置](/var/folders/_6/gpmy4q4166xbmb7153p4cqp80000gn/T/frontend-architect-vite-feature-flags-plugin-candidate-dugsp3st/packages/plugin/package.json:1)：升级为可发布的 `0.1.0`、补充 `sideEffects: false`，保留受控 exports 与 Vite peer dependency。
- [维护文档](/var/folders/_6/gpmy4q4166xbmb7153p4cqp80000gn/T/frontend-architect-vite-feature-flags-plugin-candidate-dugsp3st/packages/plugin/README.md:1)：说明公共类型、导出、缓存、HMR、source map、安全边界、测试和 SemVer 演进策略。
- [生命周期测试](/var/folders/_6/gpmy4q4166xbmb7153p4cqp80000gn/T/frontend-architect-vite-feature-flags-plugin-candidate-dugsp3st/tests/plugin-lifecycle.test.mjs:1)：验证秘密过滤、虚拟模块刷新和 source map。

已通过：

- 插件构建及消费端 TypeScript 检查
- 真实 Vite production build 与客户端产物秘密扫描
- 配置诊断测试
- 新增生命周期测试
- packed tarball 临时消费项目安装测试
- `npm publish --dry-run`，产物为 `0.1.0`
- `git diff --check`

唯一环境限制：既有 `test:dev` 在当前沙箱收不到操作系统 watcher 的 `change` 事件而等待；相同 HMR 缓存失效和 SSR 重载路径已由独立生命周期测试执行通过。实现遵循本地 Frontend Architect 指南，将公共契约、宿主生命周期、秘密边界和发布产物作为同一套可验证接口处理。
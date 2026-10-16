已完成重构，原型现已具备可发布的 Vite 基建包边界。

主要成果：

- 使用标准 `resolveId` / `load` 虚拟模块，不再全局字符串替换；dev、build、SSR 和 HMR 共用同一加载逻辑。[index.ts](/var/folders/_6/gpmy4q4166xbmb7153p4cqp80000gn/T/frontend-architect-vite-feature-flags-plugin-candidate-i_p82ci2/packages/plugin/src/index.ts:31)
- `expose` 是强制客户端白名单，未暴露字段不会进入生成代码或 source map；运行时 flags 会被冻结。
- JSON、文件路径、缺失 flag、非法值和重复配置均提供带稳定错误码及修复建议的诊断。
- HMR 精确失效虚拟模块，并为原生文件监听不可靠的文件系统提供单文件轮询桥，关闭时自动清理。
- 提供默认安全类型及可增强的精确 schema。[virtual.d.ts](/var/folders/_6/gpmy4q4166xbmb7153p4cqp80000gn/T/frontend-architect-vite-feature-flags-plugin-candidate-i_p82ci2/packages/plugin/src/virtual.d.ts:1)
- 示例消费者增加了精确类型契约验证。[feature-flags.d.ts](/var/folders/_6/gpmy4q4166xbmb7153p4cqp80000gn/T/frontend-architect-vite-feature-flags-plugin-candidate-i_p82ci2/examples/consumer/src/feature-flags.d.ts:1)
- 完善可发布 package 配置、Node/Vite 兼容范围及 `sideEffects` 元数据。[package.json](/var/folders/_6/gpmy4q4166xbmb7153p4cqp80000gn/T/frontend-architect-vite-feature-flags-plugin-candidate-i_p82ci2/packages/plugin/package.json)
- README 说明了公共类型、包导出、source map、安全边界、缓存、HMR、测试和 SemVer 演进策略。[README.md](/var/folders/_6/gpmy4q4166xbmb7153p4cqp80000gn/T/frontend-architect-vite-feature-flags-plugin-candidate-i_p82ci2/packages/plugin/README.md:1)
- 新增公共 API、诊断、秘密过滤和特殊对象键测试。[plugin.test.mjs](/var/folders/_6/gpmy4q4166xbmb7153p4cqp80000gn/T/frontend-architect-vite-feature-flags-plugin-candidate-i_p82ci2/packages/plugin/tests/plugin.test.mjs:1)

验证结果：

- 插件单元/集成测试：通过
- TypeScript 插件与消费者类型检查：通过
- Vite 生产构建及 source-map 泄密扫描：通过
- dev/SSR HMR：通过
- 配置诊断测试：通过
- `npm pack` 内容检查、隔离目录离线安装及公共入口导入：通过
- `git diff --check`：通过

完整 `npm run check` 仅在 harness 尝试联网重新安装 Vite 时受机器 npm cache 权限及网络限制中断；同一 tarball 已通过可写临时 cache 和本地 Vite 的隔离消费者验证。未执行实际发布。实现遵循了本地 frontend-architect Skill 对共享基础设施、信任边界、宿主生命周期及消费者级 artifact 验证的要求。
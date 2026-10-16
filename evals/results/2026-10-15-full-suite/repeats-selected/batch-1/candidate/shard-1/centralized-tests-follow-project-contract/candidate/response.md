当前工作区没有项目文件：Git 树为空，仅存在评估用的 `.frontend-architect`，因此无法核实具体配置文件、测试清单、包管理器或实际执行测试。基于工单给出的现状，建议按以下方案迁移，不修改业务代码。

迁移方案：

1. 在根目录建立唯一的集中测试树 `tests/`。
2. 将 `src/test-setup.ts` 移至 `tests/test-setup.ts`。
3. 按源码相对路径映射测试，避免集中后变成无结构的测试堆：
   - `src/Foo.test.tsx` → `tests/Foo.test.tsx`
   - `src/components/Button.test.tsx` → `tests/components/Button.test.tsx`
4. 更新迁移测试的源码导入：
   - 已有项目路径别名时沿用；
   - 没有别名时使用指向 `src/` 的相对路径，不为本次迁移额外引入解析机制。
5. 在现有 Vitest 配置的 `test` 块中：
   - 将 `include` 从 `src/**` 改为仅匹配 `tests/**`；
   - 保留项目当前支持的测试文件后缀；
   - 将 `setupFiles` 更新为 `tests/test-setup.ts`；
   - 其他环境、覆盖率、超时和 reporter 配置保持不变。
6. 全量搜索并清理 `src/**/*.{test,spec}.*` 及对 `src/test-setup.ts` 的旧引用。迁移完成后不保留双路径发现，避免同一测试重复运行或后续继续散落。
7. 不新增业务测试、不修改断言语义；本次只改变测试的归属位置、导入路径和 runner 发现配置。

验收方式：

- 迁移前后分别通过项目既有测试脚本运行 Vitest，记录测试文件数、测试用例数和通过/跳过状态；两份清单应一致。
- 使用当前 Vitest 版本支持的详细 reporter、JSON reporter 或测试列表能力核对实际执行文件，不能仅以退出码为准。
- 确认所有执行文件均位于 `tests/`，且原来分布在 `src` 根目录和组件旁的每个测试都有对应迁移项。
- 选择至少一个依赖全局 matcher、polyfill、cleanup 或其他 setup 行为的既有测试单独运行，证明新 `setupFiles` 路径确实生效。
- 执行项目已有的类型检查、lint 和构建，捕获迁移造成的错误导入或配置解析问题。
- 最终搜索应满足：
  - `src/` 下没有测试文件；
  - 没有代码或配置引用 `src/test-setup.ts`；
  - Vitest 的发现范围不再包含 `src/`。
- 做一次反向验证：临时检查 runner 对旧位置测试不会发现、对 `tests/` 中测试会发现；验证后撤销临时文件或改动。

由于当前工作区缺少项目内容，上述检查尚未实际执行，也不能可靠给出具体命令、文件清单或测试数量。
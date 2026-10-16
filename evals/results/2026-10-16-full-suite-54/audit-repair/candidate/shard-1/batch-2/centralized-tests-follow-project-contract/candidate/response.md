结论：将测试统一迁至仓库根目录 `tests/`，按 `src/` 的业务结构镜像组织；最终 Vitest 只发现 `tests/`，全局 setup 迁为 `tests/setup.ts`。不修改生产逻辑。

当前工作区除 `.frontend-architect` 和空 Git 基线外没有应用文件，因此无法确认实际配置文件名、测试脚本或测试数量；以下路径和命令需套用到真实项目现有文件，不能声称已实际执行。

### 迁移方案

1. 先记录迁移基线

   - 用仓库现有测试脚本运行完整 Vitest。
   - 保存被发现的测试文件、测试用例数、通过/跳过/失败结果。
   - 特别标记至少一个依赖 `src/test-setup.ts` 的现有测试，作为 setup 生效证明。

2. 建立统一目录，镜像源码结构

   ```text
   src/App.test.tsx
   → tests/App.test.tsx

   src/components/Button/Button.test.tsx
   → tests/components/Button/Button.test.tsx

   src/test-setup.ts
   → tests/setup.ts
   ```

   使用 `git mv` 保留历史。快照放在对应测试旁；仅测试使用的 fixture/helper 放在相关功能目录附近，真正跨套件复用的内容才放 `tests/helpers` 或 `tests/fixtures`。

3. 分阶段修改 Vitest 配置

   迁移期间临时同时发现两棵目录，避免某一批移动后测试静默消失：

   ```ts
   test: {
     include: [
       'src/**/*.{test,spec}.{ts,tsx}',
       'tests/**/*.{test,spec}.{ts,tsx}',
     ],
     setupFiles: ['./tests/setup.ts'],
   }
   ```

   实际 glob 应保留项目当前支持的文件名和扩展名，只改变目录范围，不擅自扩大测试类型。

4. 搬迁测试并修正路径

   - 优先沿用已有源码 alias。
   - 没有现成 alias 时，更新相对 import、mock 模块路径及 fixture 路径；不为本次搬迁单独引入新的解析体系。
   - 若 TypeScript、ESLint 或覆盖率配置当前只包含 `src/`，将 `tests/` 纳入对应检查；仅在项目已有独立测试 tsconfig 惯例时才新建测试 tsconfig。
   - 不改断言含义，不借迁移重写组件或业务代码。

5. 收紧最终配置

   全部测试迁完后，删除 Vitest 的 `src` 发现规则，只保留：

   ```ts
   test: {
     include: ['tests/**/*.{test,spec}.{ts,tsx}'],
     setupFiles: ['./tests/setup.ts'],
   }
   ```

   其他既有配置，例如环境、覆盖率、超时、alias 和排除项保持不变。

### 验收方式

迁移完成必须同时满足：

- 迁移前后的测试文件身份和用例总数一致；不能只看“命令退出码为 0”，以免空套件或漏发现也被误判为成功。
- 全量测试通过，且原先依赖 setup 的代表性测试仍通过。
- Vitest 输出中所有测试文件都来自 `tests/`，没有来自 `src/` 的测试。
- `src/` 下不再存在测试文件、测试快照或 `test-setup.ts`。
- TypeScript、Lint 和生产构建均通过。
- watch 模式能在修改 `tests/` 内测试和其引用的 `src/` 实现时正确重跑。
- `git diff --name-status --find-renames` 显示业务源码没有内容修改；差异仅包括文件迁移、必要的测试 import 调整和测试工具配置。
- 最后单独删除临时的 `src` include 后再跑一次完整测试，证明最终契约生效。

建议按“兼容发现配置 → 搬迁并验证 → 移除旧发现范围”拆成可独立回退的提交。任一步出错都可以回退当前批次，不会留下表面通过、实际少跑测试的状态。
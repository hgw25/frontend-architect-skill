结论：采用顶层 `tests/` 集中管理，并在迁移后让 Vitest 只发现该目录。业务源码无需修改。

但当前工作树除 `.frontend-architect` 和 `.git` 外没有 `package.json`、Vitest 配置或 `src/`；`HEAD` 也是空文件树。因此无法核实具体测试文件、脚本和扩展名，也没有进行文件修改。以下方案以工单描述为约束，实际执行前需先恢复完整检出。

### 目标结构

保持测试与源码的相对路径对应，便于定位：

```text
src/
  components/
    TicketList.tsx
  ticket.ts

tests/
  test-setup.ts
  components/
    TicketList.test.tsx
  ticket.test.ts
```

映射规则：

| 迁移前 | 迁移后 |
|---|---|
| `src/test-setup.ts` | `tests/test-setup.ts` |
| `src/<name>.test.*` | `tests/<name>.test.*` |
| `src/components/<name>.test.*` | `tests/components/<name>.test.*` |
| 测试专用 fixture、mock、snapshot | 放在对应测试附近或其局部子目录 |

### 迁移步骤

1. 先用项目现有测试脚本记录基线：实际发现的测试文件、用例名称和总数。不能只记录“命令通过”，否则漏跑测试也可能呈现绿色。
2. 使用 `git mv` 搬迁 setup 和全部测试，保留与 `src` 对应的目录层级。
3. 修正因目录变化失效的相对导入、fixture 路径、snapshot 路径及 `vi.mock()` 模块路径。已有源码别名可继续使用，但不应仅为此次迁移新增一套别名。
4. 更新现有 Vitest 配置：
   - `setupFiles` 指向 `tests/test-setup.ts`；
   - `include` 仅匹配 `tests/**/*.{test,spec}.*`，实际后缀沿用仓库当前约定；
   - coverage 的源码范围仍指向 `src`，不要误改成只统计 `tests`。
5. 检查 TypeScript、ESLint 和测试专用配置的目录范围。应用构建若原本排除测试，应继续排除；测试类型检查则需覆盖 `tests`。
6. 测试较多时可以在迁移中的临时提交同时发现 `src` 和 `tests`，分批移动；最终状态必须删除 `src` 发现规则，避免重复运行和继续散落。
7. 不修改生产组件、状态逻辑或接口行为。`src` 中允许出现的差异仅是测试和旧 setup 文件被移走。

### 验收方式

以项目锁定的包管理器和 `package.json` 现有脚本为准，不另造一套执行入口：

- 迁移后的完整测试命令退出码为 0。
- verbose 输出中的测试文件清单与迁移前基线一一对应，仅路径从 `src/...` 变为 `tests/...`；用例名称和数量不减少。
- 至少单独运行：
  - 一个原先位于 `src` 根目录的测试；
  - 一个原先与组件同目录的测试；
  - 一个依赖 `test-setup.ts` 中 matcher、polyfill 或 cleanup 的测试。
- 文件扫描确认：
  - 所有 `*.test.*`、`*.spec.*` 均位于 `tests/`；
  - `src/test-setup.ts` 不再存在；
  - Vitest 最终发现结果中没有 `src/` 下的测试。
- 运行项目既有的类型检查、lint、构建和 coverage 命令；构建仍只消费生产源码，coverage 阈值及源码统计范围不退化。
- 在干净检出或 CI 中重复完整测试，排除本地缓存掩盖路径错误。
- 最后审查差异，确认没有业务实现变更、测试内容弱化、跳过用例或重复发现。

完成标准是：测试与 setup 全部归入 `tests/`，Vitest 只从该目录发现测试，迁移前后的有效测试集合保持一致，项目既有质量检查全部通过。
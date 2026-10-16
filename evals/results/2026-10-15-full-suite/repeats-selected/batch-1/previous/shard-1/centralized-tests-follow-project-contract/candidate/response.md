当前工作区没有可迁移的前端项目文件：`HEAD` 的文件树为空，除只读的 `.frontend-architect` 外也没有 `package.json`、Vitest 配置或 `src/`。因此我无法核实具体测试文件名、脚本或实际执行验收；以下方案依据工单中已明确的现状制定，不声称已经实施。

## 迁移决策

最终只保留 `tests/` 作为 Vitest 测试入口，并按 `src/` 的业务结构镜像组织：

```text
src/foo.test.ts                         → tests/foo.test.ts
src/components/Button/Button.test.tsx → tests/components/Button/Button.test.tsx
src/test-setup.ts                     → tests/setup.ts
```

具体步骤：

1. 先用项目现有测试脚本运行基线，记录 Vitest 输出中的测试文件数、测试用例数及结果。
2. 将 setup 移至 `tests/setup.ts`，内容原则上不改；把 Vitest 的 `setupFiles` 更新为该路径。
3. 使用 `git mv` 搬迁所有 `src` 下的 `*.test.*`、`*.spec.*` 及相邻快照，保留提交历史。
4. 更新因目录变化失效的源码导入、fixture 导入和 `vi.mock()` 路径。已有路径别名就复用；不为这次搬迁额外引入别名体系。
5. 将 Vitest `include` 收敛到项目现有后缀对应的 `tests/**/*`，不再发现 `src` 下测试。迁移过程中可以短暂兼容两个目录，但最终配置不能保留双入口。
6. 若 TypeScript 当前只覆盖 `src`，让测试专用 tsconfig 或测试检查包含 `tests/`；不要为了测试类型检查扩大生产构建输入。
7. 保持 coverage 的被测源码范围仍指向 `src/**`，不能因为测试搬迁而把覆盖率统计对象改成 `tests/**`。
8. 删除 `src` 中已迁走的 setup、测试、快照和仅供这些测试使用的 fixture；不改生产代码行为。

## 验收方式

迁移完成需要同时满足：

- 使用 `package.json` 已有的测试命令，全量 Vitest 通过。
- 迁移前后发现的测试文件数和用例数一致；如有差异，逐项说明，不能以“绿色但少跑了测试”验收。
- 直接指定任意一个迁移后的 `tests/...` 文件运行成功，证明新路径可以独立执行。
- `src/` 中不再存在项目约定后缀的测试文件、快照或旧 setup。
- Vitest 配置中的测试发现路径仅指向 `tests/`，`setupFiles` 仅指向 `tests/setup.ts`。
- lint、类型检查和构建使用项目原有命令通过，借此发现搬迁造成的导入、类型范围或生产构建污染。
- 临时在 `src/` 放置一个不会通过的探针测试时，全量测试不应发现它；临时在 `tests/` 放置同类探针时应被发现。探针验证后立即移除，不提交。
- `git diff` 只包含测试、测试支撑文件及相关配置迁移，没有业务功能或产品行为变化。

本地 Skill 的迁移指导影响了两个关键点：保留可回退的迁移节点，以及用“迁移前后实际执行的测试集合一致”防止空跑或漏跑。当前未修改任何文件。
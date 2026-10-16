结论：缺陷在执行链，而不是缺少 types 检查能力。最小修复只需修改 `package.json`：

```diff
- "check": "npm run build"
+ "check": "npm run build && npm run check-package"
```

这样：

- `build` 先生成待验收产物；
- `check-package` 检查包括 types 在内的包契约；
- 任一步失败，`npm run check` 都返回非零；
- 现有 CI 已运行 `npm run check`，无需修改 workflow；
- `CONTRIBUTING.md` 已要求发布前运行同一命令，也无需修改；
- 不需要新脚本、新框架或重复添加单独的 types 检查。

验证方案：

1. 在已知缺失 types 的产物状态运行 `npm run check`，应由 `check-package` 报错且整体非零退出。
2. 补齐类型入口或对应声明产物后再次运行，预期整体退出码为 0。
3. 确认 CI 中原有的 `npm run check` 会因此阻断相同缺陷。
4. 无需实际发布或安装消费端依赖。

本次无法实际执行验证：工作区没有题面所列项目文件或 `scripts/check-package.mjs`，Git 快照也是空的；因此没有创建不完整的模拟项目，也没有修改文件。

技能指导不建议增加“每轮必须再检查一次 types”。本地 Skill 已明确要求：

- 公共契约包含 exported types；
- types 必须与运行时 exports 对齐；
- 验证 built/packed artifact；
- 基础设施的 build output 和 release obligations 属于正确性。

此次遗漏是已有检查器没有接入规范入口。针对本案例，Skill 无需修改。若后续确有多次“检查器存在但未接入标准验证链”的 Skill 使用失败，可只在 `frontend-infrastructure` reference 中补充一条通用原则：

> 已有产物验收命令时，应将其接入 CI 和发布流程使用的规范聚合检查，而不是依赖额外的人工重复检查。

这比反复强调某一个 `types` 字段更能覆盖同类产物契约问题。
问题不在 Skill 漏提醒，而在已有检查未接入发布前必经链路。

最小修复：

```diff
"scripts": {
  "build": "tsc -p tsconfig.build.json",
  "check-package": "node scripts/check-package.mjs",
- "check": "npm run build"
+ "check": "npm run build && npm run check-package"
}
```

无需修改 `.github/workflows/validate.yml` 或 `CONTRIBUTING.md`：

- CI 已执行 `npm run check`。
- 发布文档已要求发布前执行 `npm run check`。
- `build` 先生成最新产物，随后 `check-package` 验证实际产物；任一步失败都会使整条命令非零退出。
- 将来 `check-package` 扩展其他包契约检查，也会自动覆盖 CI 和发布前流程。

验证方案：

1. 正常运行 `npm run check`，确认构建及包验收均通过。
2. 在临时副本中安全制造“构建产物缺少 types 入口”的原故障。
3. 运行 `npm run check-package`，确认能报告缺失 types 且非零退出。
4. 运行 `npm run check`，确认同一故障也会令聚合入口非零退出，从而证明 CI 和发布流程会被阻断。
5. 恢复临时改动，再次运行 `npm run check`，确认通过。

不建议在 frontend-architect 的每轮指导里增加“必须再检查一次 types”。现有指导已经覆盖“导出类型”“类型与运行时出口一致”“验证发布产物”，维护说明也明确规定：确定性的产物契约应由已有 validator 执行；检查存在但未运行时，应修命令入口或 CI 接线，而不是依赖重复提示词。此次无需修改 Skill；若要保留维护证据，应记录这次“已有检查未接通”的案例、上述正反验证命令及结果，而不是新增全局规则。

工作区实际没有提供 `package.json`、工作流或验收脚本，只有 `.frontend-architect`，因此我没有虚构文件或执行无法存在的项目检查，也按要求未修改 Skill 文件。
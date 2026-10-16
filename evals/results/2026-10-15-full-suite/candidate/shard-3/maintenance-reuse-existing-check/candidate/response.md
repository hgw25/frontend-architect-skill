最小修复是把既有包验收脚本接入统一检查入口：

```diff
"scripts": {
  "build": "tsc -p tsconfig.build.json",
  "check-package": "node scripts/check-package.mjs",
- "check": "npm run build"
+ "check": "npm run build && npm run check-package"
}
```

这样：

- CI 现有的 `npm run check` 会自动检查构建产物的 `types` 入口。
- `CONTRIBUTING.md` 的发布前命令仍然有效，无需增加另一条人工步骤。
- 不需要新增框架、重复实现检查，也不需要改工作流。
- 暂不增加 `prepack`；这会改变 npm 生命周期，而当前 CI 与发布流程已有统一入口。

验证方案：

1. 在已知缺失 `types` 的产物上确认 `npm run check-package` 非零退出。
2. 应用修改后，对同一失败条件运行 `npm run check`，确认它同样非零退出。
3. 修复或恢复完整产物后运行 `npm run check`，确认构建及包验收均成功。
4. 无需实际发布。

技能维护结论：不应加入“每轮必须再检查一次 types”这种专项人工清单。问题是现成的决定性检查没有接入必经路径，并非检查能力不足。鉴于已经连续发生两次，建议在技能源仓库中补一条通用规则：

> 当仓库已有能暴露发布产物契约缺陷的检查时，应将其接入 CI 或发布流程实际调用的统一检查命令，不要依赖独立文档中的人工补跑步骤。

这比 `types` 专项提醒覆盖面更合理，也适用于缺失运行时入口、声明文件、导出文件等同类问题。按要求未修改 `.frontend-architect`。

当前工作区实际只有 `.frontend-architect` 和 `.git`；题面中的三个项目文件并不存在，因此无法落盘修改或执行上述验证，以上结论严格基于提供的 artifact。
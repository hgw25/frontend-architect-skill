结论：问题不是缺少检查能力，而是 `check-package` 没有接入实际发布门禁。

唯一需要的项目修改是：

```diff
{
  "scripts": {
    "build": "tsc -p tsconfig.build.json",
    "check-package": "node scripts/check-package.mjs",
-   "check": "npm run build"
+   "check": "npm run build && npm run check-package"
  }
}
```

这样：

- CI 已执行 `npm run check`，无需修改 workflow。
- `CONTRIBUTING.md` 已要求发布前运行同一命令，无需修改文档。
- `check-package` 的非零退出码会直接使 `check` 和 CI 失败。
- 先 build、后验收，确保检查的是最新构建产物。
- 无需新增依赖、发布步骤或检查框架。

验证方案：

1. 在缺失 `types` 入口的现状运行 `npm run check`，应看到 `check-package` 的明确诊断，且整体退出码非零。
2. 补齐产物后再次运行 `npm run check`，应整体成功。
3. CI 上确认同一命令失败/成功即可；无需实际发布。

技能指导不应加入每轮都“再检查一次 types”的全局要求。这会形成重复仪式，也不能保证发布链真正执行检查。现有 Skill 已要求复用仓库能力、完成 exported types/build-output/release obligations，并验证公开产物。

若要根据这次重复漏检做一处针对性维护，建议只在 `frontend-infrastructure` 的产物验证部分增加：

> 对可发布包，若仓库已有产物验收脚本，应确认规范 `check`、CI 与发布前流程实际调用它，并保留其非零退出码；不要另建重复检查。

工作区中实际没有所示 `package.json`、workflow 或 `CONTRIBUTING.md`，只有空 Git 树和 `.frontend-architect` 指导文件，因此本次未虚构或落盘项目修改，也无法执行上述验证；`.frontend-architect` 保持未改动。
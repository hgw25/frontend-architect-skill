结论：问题不在缺少 types 检查，而在现有检查没有接入发布必经路径。无需新增框架，也不应在每轮指导中重复提醒“再检查一次 types”。

最小修复：

```diff
"scripts": {
  "build": "tsc -p tsconfig.build.json",
  "check-package": "node scripts/check-package.mjs",
- "check": "npm run build"
+ "check": "npm run build && npm run check-package"
}
```

这样同时覆盖：

- CI：现有 `npm run check` 会执行包验收，并传播非零退出码。
- 本地发布：`CONTRIBUTING.md` 已要求运行 `npm run check`。
- 顺序：先生成产物，再检查真实产物。
- `.github/workflows/validate.yml` 无需修改。

建议把文档说明收紧为：

> 发布前运行 `npm run check`；该命令会先构建，再通过 `scripts/check-package.mjs` 验收待发布产物。

验证方案：

1. 在类型入口完整的状态运行 `npm run check`，应看到 build 和 check-package 均执行，最终退出码为 0。
2. 用现有方式复现缺失 types 的产物，再运行同一条 `npm run check`；应出现 check-package 的既有诊断，整条命令以非零状态退出。
3. 恢复有效配置后重跑，确认成功。不需要发布、安装依赖或另建测试框架。

技能指导方面，当前内容已经要求复用维护流程、完成类型和产物检查，并明确要求验证构建或打包后的公共产物。因此此次首先是项目执行链缺陷，不需要增加每轮强制 types 清单。若仍要沉淀此次经验，最多在 `frontend-infrastructure.md` 的公共产物验证章节补一条通用规则：

> 已有制品验收器时，确认正式 CI 与发布前聚合命令能够到达它，并传播其非零退出状态。

不建议写成 types 专项提醒；同一问题还可能发生在 exports、声明文件、遗漏文件等其他包契约上。

本次没有修改工作区：仓库 Git 树为空，实际仅提供了 `.frontend-architect` 指导文件，题述的 `package.json`、工作流和 `CONTRIBUTING.md` 未落盘，因此无法诚实执行上述 npm 验证。
结论：问题不在 `check-package` 能力，也不在技能缺少 “types” 提醒，而是现有检查器没有接入唯一的必跑链路。

### 关键缺陷

当前实际链路是：

```text
CI / 发布前
  → npm run check
  → npm run build
```

`npm run check-package` 从未执行。因此即使它能准确发现缺失类型入口并返回非零状态，CI 仍会放行。

### 最小修复

修改 `package.json`，把已有验收脚本接入规范入口：

```diff
- "check": "npm run build"
+ "check": "npm run build && npm run check-package"
```

保留 `.github/workflows/validate.yml`：

```yaml
- run: npm ci
- run: npm run check
```

建议同步澄清 `CONTRIBUTING.md`，避免维护者误以为两个命令需要人工分别执行：

```md
发布前运行 npm run check；该命令依次执行构建和 scripts/check-package.mjs 包验收，任一步失败都不得发布。
```

不需要新增 CI 步骤、依赖、检查框架或发布钩子。将规则收敛到 `check`，可以让本地发布检查和 CI 使用同一入口。

### 验证方案

在真实仓库中执行：

1. 正常配置下运行 `npm run check`，确认构建和包验收均执行并返回零。
2. 临时把 `package.json` 的 `types` 指向不存在的声明文件。
3. 再运行 `npm run check`，确认：
   - `build` 仍能完成；
   - `check-package` 报出缺失类型入口；
   - 整个 `check` 返回非零状态。
4. 恢复配置，重新运行 `npm run check` 并确认通过。

这项负向验证能够直接复现此前 CI 漏检的故障，而不只是证明脚本语法有效。

### 技能指导判断

不建议加入“每轮必须再检查一次 types”。

本地 `frontend-architect` 指导已经要求：

- 完成导出类型和公共契约；
- 把构建产物、兼容性和发布义务视为正确性；
- 验证 built/packed artifact；
- 优先复用项目已有检查能力。

此次失败是仓库执行链没有落实这些原则，不是指导缺项。加入一个 types 专项人工提醒会重复现有原则，并可能遗漏下一次类似的 `exports`、声明文件路径或其他包产物问题。

若未来多个项目反复出现“检查器存在但未接入门禁”，可以把技能补强为更通用的规则：

> 对共享包或发布产物，若仓库已有验收命令，应确认它已接入规范的检查或发布门禁，而不是仅记录为可选命令。

当前无需修改技能；先修复项目的自动化链路。

本工作区实际只有 `.frontend-architect` 指导文件，没有所提供的 `package.json`、工作流或 `CONTRIBUTING.md`，因此未伪造落盘修改，也无法实际执行上述 npm 验证。
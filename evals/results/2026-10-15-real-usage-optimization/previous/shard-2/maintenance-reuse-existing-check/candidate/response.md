结论：问题不在于缺少 types 检查能力，而是现有检查没有接入发布前的标准执行链。

### 最小修复

只修改 `package.json`：

```diff
- "check": "npm run build"
+ "check": "npm run build && npm run check-package"
```

这样执行链变为：

```text
CI / 发布前操作
  → npm run check
    → build
    → check-package
```

`check-package` 必须放在构建之后，因为它验收的是实际生成的包产物。无需修改 CI：`.github/workflows/validate.yml` 已运行 `npm run check`。`CONTRIBUTING.md` 也无需修改，其发布前命令仍然有效，只是现在真正覆盖了包验收。

不建议另加检查框架、复制 types 判断，或增加独立的 CI step；那会产生两个需要同步维护的执行入口。

### 验证方案

在真实仓库应用修改后验证：

1. 保持一个能通过构建和包验收的正常状态，运行 `npm run check`，应退出 `0`。
2. 使用现有的“缺失 types”复现状态，运行 `npm run check`，确认：
   - `build` 完成；
   - `check-package` 被执行；
   - 总命令返回非零退出码。
3. 恢复合法产物，再运行一次 `npm run check`，确认恢复为退出 `0`。
4. CI 无需实际发布；其现有 `npm run check` 已覆盖相同链路。

关键证据是顶层 `npm run check` 能暴露缺失 types，而不只是单独运行 `npm run check-package`。

### 技能指导维护判断

不应在 frontend-architect 的每轮指导中加入“必须再检查一次 types”。

本地 Skill 已明确要求：

- 复用项目现有检查和维护流程；
- 保持导出类型与运行时入口一致；
- 验证 built/packed artifact；
- 将构建产物和发布义务视为正确性要求；
- 选择能暴露原始故障的验证证据。

因此这是项目执行链的接线缺陷，不是指导缺少 types 规则。类型专用提醒既重复现有原则，也容易漏掉 exports、声明文件路径或其他包产物问题。

当前无需修改 Skill。只有在接入上述修复后仍反复漏掉类似检查时，才值得提出更通用的指导补充：

> 审查包或发布流程时，盘点已有的产物验收命令，并确认标准 `check`、CI 或发布前入口实际调用它们。

工作区没有提供这些 artifact 的实体文件，只有 `.frontend-architect` 与空 Git 树，因此本次没有实施或执行项目命令；`.frontend-architect` 保持未修改。
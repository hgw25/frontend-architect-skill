结论：只需把现有包验收脚本接入标准 `check` 命令；不应在 Skill 每轮指导中增加“必须再检查一次 types”的人工清单。

### 主要问题

**高优先级：包验收脚本未进入实际门禁。**

根据提供的执行链：

- `check-package` 能发现缺失的类型入口并返回非零状态。
- CI 和发布文档都要求运行 `npm run check`。
- 但 `check` 当前只执行构建，因此类型入口缺失仍能通过 CI。

### 最小修复

仅修改 `package.json`：

```diff
 "scripts": {
   "build": "tsc -p tsconfig.build.json",
   "check-package": "node scripts/check-package.mjs",
-  "check": "npm run build"
+  "check": "npm run build && npm run check-package"
 }
```

这样可以保持执行链单一且明确：

```text
开发者 / CI → npm run check → build → check-package
```

`.github/workflows/validate.yml` 无需增加第二个步骤，否则 CI 与发布文档会形成两套容易漂移的检查入口。

`CONTRIBUTING.md` 现有要求在语义上仍然成立。若想减少误解，可以补充为：

> 发布前运行 `npm run check`；该命令会构建并执行 `scripts/check-package.mjs` 验收包产物。

这属于文档澄清，不是修复正确性所必需。

### 验证方案

不需要发布、安装依赖或引入新框架：

1. 在同一个已知缺失类型入口的坏版本或临时工作树中运行 `npm run check`。
   - 应先完成构建。
   - 随后 `check-package` 应报错。
   - 整体命令应以非零状态退出。
2. 恢复正确类型入口后再次运行 `npm run check`，应成功退出。
3. 确认 CI 日志中 `npm run check` 确实依次执行了 `build` 和 `check-package`。

关键验收条件不是“单独运行检查器会失败”——这一点已经成立；而是标准入口 `npm run check` 能暴露同一个故障。

### Skill 维护判断

不建议加入“每轮必须再检查一次 types”。

本地 Skill 已经要求：

- 完成 exported types 和 build-output 契约；
- 将发布产物验收视为基础设施正确性；
- 对 built/packed artifact 做验证；
- 优先复用项目现有工具与维护流程。

此次问题是仓库门禁没有调用已有能力，而不是 Skill 缺少类型检查概念。把确定性检查变成人工重复提醒，会增加所有前端任务的仪式成本，却仍可能漏掉 CI。

本次无需修改 Skill。若后续证据表明代理经常发现现有验收脚本却不接入标准门禁，最多应增加一条通用指导，而非 types 专项规则：

> 对可发布包，若仓库已有确定性的产物验收脚本，应优先将其接入规范的 `check` 或发布门禁，而不是依赖额外的人工复查步骤。

工作区中没有所提供的三个项目文件，只有 `.frontend-architect` 材料，因此本次未凭空创建或修改项目文件，也未运行项目级验证；`.frontend-architect` 保持不变。
结论：问题不在于缺少“再检查一次 types”的提示，而在于现有验收器没有接入统一检查入口。

最小修复只需修改 `package.json`：

```diff
 "scripts": {
   "build": "tsc -p tsconfig.build.json",
   "check-package": "node scripts/check-package.mjs",
-  "check": "npm run build"
+  "check": "npm run build && npm run check-package"
 }
```

这样执行链变为：

```text
开发者发布前 ─┐
              ├─ npm run check → build → check-package
CI validate ──┘
```

决策：

- `.github/workflows/validate.yml` 不必修改，它已经调用统一入口 `npm run check`。
- `CONTRIBUTING.md` 已要求发布前运行该入口，不是正确性修复的必改项。可以把说明改成“`npm run check` 会构建并执行包验收”，但仅属于澄清。
- 不增加新的 types 检查脚本、测试框架或重复 CI step。
- 使用 `&&` 保证构建失败时不继续，或者 `check-package` 发现缺失 types 时将整个检查置为失败。

验证方案：

1. 正常产物运行 `npm run check`，确认构建和 `check-package` 均执行且退出码为 0。
2. 在临时副本中安全移除 types 入口或对应声明产物。
3. 再从统一入口运行 `npm run check`，而不是单独调用验收器。
4. 确认输出包含 `check-package` 的缺失类型诊断且整体退出码非零。
5. 恢复产物后复跑，确认通过。无需实际发布或安装新依赖。

Skill 维护判断：目前不应加入“每轮必须再检查一次 types”。

现有指导已经要求复用项目检查、完成导出类型和构建产物契约，并明确规定“检查已有但没运行”应修复命令入口或 CI 接线。此次是项目执行链没有接通，不是通用判断指导缺失。全局追加提醒既会覆盖无包发布的任务，也容易把“源码类型检查”和“发布产物类型入口检查”混为一谈。

只有后续独立案例证明代理在读到现有规则后仍持续选择重复检查、而不接通统一入口时，才值得在 `frontend-infrastructure` 参考中补一条有边界的规则，例如：

> 已有包产物验证器能够暴露契约缺失时，应将其接入项目规定的 CI/发布检查入口；不要以重复提示或第二套同义检查替代接线。

当前工作区 Git 基线为空，题目中的三个 artifact 并不存在为可编辑文件，因此我没有伪造文件修改，也无法实际执行 `npm run check`。`.frontend-architect` 保持未改动。
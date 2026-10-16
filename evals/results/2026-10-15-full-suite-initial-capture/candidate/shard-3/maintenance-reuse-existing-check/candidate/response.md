最小修复是把现有包验收脚本接入统一检查入口：

```json
"check": "npm run build && npm run check-package"
```

这样：

- `validate.yml` 继续执行 `npm run check`，无需重复添加 CI step。
- `CONTRIBUTING.md` 无需修改，原发布命令现在会真实覆盖包验收。
- `build` 先生成产物，随后 `check-package` 验证类型入口；其非零退出码会使 CI 失败。
- 不需要新检查框架，也不应依赖人工“再检查一次 types”。

验证方案：

1. 正常执行 `npm run check`，确认 build 和 package check 依次成功。
2. 在临时副本中移除类型入口对应产物，再执行 `npm run check`，确认 `check-package` 报错且聚合命令非零退出。
3. 恢复产物后复跑，确认成功。无需实际发布。

Skill 维护方面，我在 [frontend-infrastructure.md](</var/folders/_6/gpmy4q4166xbmb7153p4cqp80000gn/T/frontend-architect-maintenance-reuse-existing-check-candidate-1wle9w70/.frontend-architect/references/frontend-infrastructure.md>) 的公开产物验证段加入了有边界的规则：已有产物 validator 未被 CI 执行时，应接入既有聚合门禁、保留前置顺序并验证失败码传播，而不是复制检查器或增加发布提醒。

不需要把“每轮必须检查 types”加入核心 `SKILL.md`：这是确定性执行链问题，只适用于包基础设施任务。工作区没有提供示例 `package.json`、工作流或 `scripts/validate_skill.py`，因此未实际运行包检查及官方 Skill 校验。
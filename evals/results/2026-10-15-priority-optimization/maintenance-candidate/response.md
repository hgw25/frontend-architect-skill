**[P1] 现有包验收没有接入必经检查入口。** 输入中的 CI 和发布前文档都调用 `npm run check`，但它只执行 `build`，没有运行 `check-package`。因此，即使构建成功，缺失类型入口的产物仍会通过这条检查链。题目已确认现有验收能发现该问题并返回非零退出码；应修复接线，而不是补另一套验收。

最小修复见 `proposed.patch`，核心改动只有：

```json
"check": "npm run build && npm run check-package"
```

`&&` 保证先生成产物再验收；构建失败时停止，验收失败时向上返回失败。现有 CI 已调用 `npm run check`，无需修改 workflow。发布前文档补充该入口包含构建和包验收，保留验收脚本来源，方便后来维护者定位规则。未来增加新的包契约检查，应优先扩充现有验收脚本，由同一入口执行。

验证方案：

1. 在项目已有依赖可用的环境中运行修复后的 `npm run check`，确认构建、验收依次执行，完整产物返回 0。
2. 在临时副本中制造现有 `check-package` 能识别的缺失类型入口故障，且保证随后构建不会修复该注入。例如，若验收读取包元数据中的声明入口，可将该入口指向不存在的文件。先运行 `npm run check-package` 确认原症状确实被捕获并返回非零。
3. 保持相同故障，比较原来的 `check` 与修复后的 `check`：原入口仅构建，应暴露“构建成功但验收未执行”的漏洞；修复入口必须运行包验收并返回非零。恢复注入后再次运行 `npm run check`，确认通过。若缺失类型入口本身导致构建失败，该注入不能证明此次接线修复，需要选择构建可成功、包验收失败的故障。
4. 检查 CI 的该步骤未设置 `continue-on-error`，也没有在命令后忽略退出码。给定的 workflow 片段没有这些设置；真实完整 workflow 尚未提供。此处验证 CI 失败传播即可，不实际发布。

**技能维护判断：当前不修改技能正文或 reference。** `.frontend-architect/CONTRIBUTING.md` 已明确将“检查已有但没运行”归到原命令入口或 CI 接线，并要求机械约束交给可靠检查。`frontend-infrastructure.md` 已要求验证构建或打包产物、声明及入口；`SKILL.md` 也已要求遵循项目检查流程和验证公共契约。增加“每轮必须再检查 types”会把一个包发布故障扩大成所有前端任务的重复要求，仍不能保证真正执行验收。

两次复发说明执行链需要修正，并不足以证明技能缺少判断指导。把故障、入口修复、复现方式和实际验证结果留在项目变更记录即可。若之后能证明代理在已有指导下仍反复绕过接线检查，再按贡献流程用真实行为证据改进最相关的专题指导和行为用例；此次不访问或修改评测材料。

实际读取：完整 `.frontend-architect/SKILL.md`、`.frontend-architect/CONTRIBUTING.md`，以及以下两份 reference：

- `.frontend-architect/references/frontend-infrastructure.md`：确认包产物、声明和公共入口的验收契约。
- `.frontend-architect/references/verification-and-review.md`：确定缺陷审查、失败复现与证据边界。

实际检查：解析题目中的 `package.json` 片段并确认原 `check` 仅构建；在临时目录对题目提供的两个原文件应用 `proposed.patch`，确认 JSON 仍可解析、修改后的检查顺序为构建后包验收，且文档说明与命令一致。这是静态检查和补丁可应用性检查。工作区只有输入材料和指导，没有真实包源码、构建配置或 `scripts/check-package.mjs`，因此未执行真实构建、验收、故障注入或 CI，也未安装依赖、修改 live CI、提交或发布。

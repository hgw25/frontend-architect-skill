# 实现指导验收记录

此记录属于已被替换的初版。用户随后明确要求整理有来源的成熟方法，不能用自写业务
示例充当解决方法；当前指导已按该要求修订，见
[工程记录](../../../docs/engineering/principles-to-implementation.md)。以下冻结输入、源码和
通过结果保持历史含义，不证明当前指导有效，也不证明示例属于已有规范。

2026-11-11。针对思想选择与执行机制之间的缺口，增加按需实现指导、三个独立可执行示例，
并接通入口、既有专题、维护约定和现有确定性测试入口。设计及后续修改边界见
[工程记录](../../../docs/engineering/principles-to-implementation.md)。本轮没有发布或更新已安装技能。

## 输入与保存范围

源提交、环境版本、任务原文、快照摘要及检查状态保存在 [metadata.json](metadata.json)。
修改前后指导分别冻结在 `frozen-inputs/previous/` 和 `frozen-inputs/candidate/`，入口使用
`SKILL.snapshot.md` 防止技能自动发现；manifest 以原文件名记录摘要。生成后核对冻结指导
未改变。候选冻结字节与本轮技能源码一致；工程记录和本验收记录不属于生成指导。

两名独立原生子代理使用相同短请求，各自在全新隔离目录完成同一 fixture；不提供诊断、
评分项、预期实现或对方结果，只提供对应冻结技能与原始项目。完整任务还限定只写应用目录、
技能只读、不读取其他安装或评测、不创建子代理，并要求将检查输出写入外部日志。
为两者提供了相同的 Node/npm 路径环境说明，没有提供修法反馈。

原始项目契约保存于 [project-input.json](project-input.json)。两份最终项目、源码 diff、
代理保存的原始检查输出及宿主复验输出分别在 `previous/`、`candidate/`。项目 JSON 快照
在生成结束后由宿主复用既有 `project_snapshot` / `save_snapshot` 保存；原始 fixture
来自未修改的源提交。临时应用目录此前未初始化 Git，补初始化仅用于既有快照工具枚举文件，
没有以事后 Git 状态冒充生成时序证据。受保护文件与原 fixture 逐字节一致。

## 实际检查

| 检查 | 结果与原始输出 |
| --- | --- |
| 仓库结构、元数据、链接、脚本语法及行为用例 | 通过，72 个行为用例；[输出](repository-validation.log) |
| 官方技能校验 | 通过；[输出](official-validation.log) |
| 现有 Python 确定性入口 | 119 项通过，其中一个入口执行 14 项 Node 示例行为检查；[输出](deterministic-tests.log) |
| 示例直接执行 | 14 项通过；[输出](examples.log) |
| 禁用字段错误参与校验/发送的临时变体 | 测试拒绝；[输出](mutation-disabled-validation.log) |
| 移除请求身份比较的临时变体 | 测试拒绝；[输出](mutation-stale-publication.log) |
| 刷新失败重新抛错、丢失确认的临时变体 | 测试拒绝；[输出](mutation-lost-confirmation.log) |
| 旧指导独立修复表单 | 原始 7 项检查全部通过；[宿主复验](previous/host-validation.log)、[代理原始输出](previous/agent-validation.log) |
| 新指导独立修复表单 | 原始 7 项检查全部通过；[宿主复验](candidate/host-validation.log)、[代理原始输出](candidate/agent-validation.log) |

临时变体只修改隔离副本。精确替换及退出码保存在
[mutation-summary.json](mutation-summary.json)，正常源码未受故障注入影响。
移除机制后检查实际失败，支持这些检查能够发现对应偏离；测试数本身不是质量结论。

复核两份实际源码与原契约：均用同一启用字段集合完成必填、自定义校验与 payload，
正确处理合法假值、异步等待、特殊字段名和异常，保持原 `processForm` API 及返回结构。
没有为局部修复创建通用引擎，也没有把示例的 `{kind, receipt}` 返回值照搬到项目。
新版输出见 [源码差异](candidate/changes.patch)，原始/最终定义均保存在项目快照中。

默认 `/usr/bin/python3` 为 3.9 且缺少既有 PyYAML 开发依赖，初次仓库检查与测试导入失败；
使用已安装的 Python 3.12.14 和 `requirements-dev.txt` 规定的依赖完成验证。两个隔离代理
的默认 shell 也找不到 npm，补上已有 Node v22.22.2 的 PATH 后运行；首次环境失败与原始
实现的 5 项失败都保留在代理日志中，没有把环境错误归因到技能行为。

复现确定性检查的命令为：

```sh
uv run --python 3.12 --with-requirements requirements-dev.txt python scripts/validate_skill.py
uv run --python 3.12 --with-requirements requirements-dev.txt python -m unittest discover -s scripts -p 'test_*.py'
node --test references/implementation-examples/implementation-examples.test.mjs
```

官方检查由 `skill-creator/scripts/quick_validate.py` 对仓库根目录执行；其绝对工具路径及
解释器以 [verification-commands.json](verification-commands.json) 中本次实际命令为准。
这只是本机环境适配，不要求使用者另装 uv；已有符合项目要求的 Python 环境可直接运行原命令。

## 结论与限制

实现指导和示例已接通，可执行示例与原有确定性检查通过。单个表单场景的旧、新结果均满足
原契约，未观察到回归，也不能证明新版比旧版质量更高。

原生子代理继承当前会话模型，运行接口未暴露准确 model ID 和 reasoning effort；没有
导出完整工具事件、做读取范围审计或进行独立两阶段盲评分。这是有限的独立实现检查，
不标成现有 CLI 协议的有效量化批次，不证明新示例实际被读取，也不作为发布达标分数。
代理额外检查只有其日志，宿主只独立重跑了原 7 项检查。

未运行全部 72 个模型行为场景，未验证浏览器、框架生命周期、真实服务或跨端 UI。
DOM/JSX 接线片段是宿主调用示意，示例单元测试证明操作语义，不能证明应用的最终渲染、
跳转和交互已经正确。专题中仍要求在实际应用消费者上完成这些检查。

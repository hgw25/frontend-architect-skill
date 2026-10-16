# Review coverage protocol — focused forward check

日期：2026-09-23。此次修改补强需求核对、变更路径审查、证据对应关系及覆盖范围披露。
入口仅保留必要路由，详细步骤集中在 review reference；小范围请求仍可直接作为需求契约。

## 确定性验证

- `python scripts/validate_skill.py`：通过，40 个行为案例结构有效。
- `python -m unittest discover -s scripts -p 'test_*.py'`：27 项通过。
- skill-creator 官方 `quick_validate.py .`：通过。
- `git diff --check`：通过。
- 使用临时 Python 虚拟环境及仓库 `requirements-dev.txt`；没有修改全局依赖。

## 行为检查

每个案例分别在不加载 skill 和加载当前候选 skill 的新代理上下文中执行，生成代理只接收
原始请求及代码，不接收预期答案或失败项。每个条件由另一新上下文评分，第一阶段只提供
原始请求、回答、适用评分维度及 rubric；第二阶段再提供该案例的失败项。
评分者没有读取另一个条件的回答或 `must_observe`。

| 案例 | 无 skill 基线 | 候选 skill | 失败项审计 |
| --- | --- | --- | --- |
| 需求修订与变更路径 | 16/16 | 16/16 | 两组均未触发 |
| 局部文案与范围限制 | 16/16 | 16/16 | 两组均未触发 |

候选复杂审查发现按钮禁用和目录恢复两个遗漏，引用当前需求，识别结构断言及覆盖登记的
局限；没有误报已取消的作者入口或无需刷新的草稿。局部审查只确认文案和绑定，明确上传
队列不在范围、未执行运行时验证。两次候选均报告只读取入口与 review reference。

这些结果支持候选在两个小样本中符合预期、没有观察到流程膨胀；基线同样成功，
不能据此宣称新规则优于旧版、提高大型 diff 的召回率或已达到完整发布评测门槛。
没有运行应用、浏览器或 provider 恢复测试；本次交付是 skill 源码修改，不是原应用修复。

## 复现与证据限制

原始输入和回答保存在 `1-baseline`、`1-candidate`、`2-baseline`、`2-candidate`。
`judge-X` 为基线评分，`judge-Y` 为候选评分；各含第一阶段输入、分数及第二阶段审计。
`run-metadata.json` 记录源码提交、候选校验和、条件与限制；`guidance.diff` 保存指导改动。
两个案例的完整可复用输入位于仓库 `evals/cases.yaml`。

原有 CLI runner 的默认 `gpt-5.4` 与重试的 `gpt-6-sol` 均被当前 ChatGPT 账户接口以
“model is not supported”拒绝，未生成有效答案，因此没有纳入比较。
改用 `fork_turns=none` 的独立协作代理；生成与评分均继承当前运行时，具体模型构建版本
和 reasoning 配置未由工具返回，没有冒充为版本固定的完整基准测试。未保留 runner
格式的执行事件，reference 读取依据代理报告；隔离强度不等同于自动采集审计。
每条件仅一次样本，同系列上下文之间仍可能有相关性，尚未进行重复或跨模型验证。

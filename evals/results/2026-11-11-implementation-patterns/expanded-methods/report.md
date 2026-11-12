# 必要工程思想扩充记录

2026-11-11。用户授权继续加入有必要的成熟思想。本轮以实际设计问题盘点缺口，不以
思想数量或模式名数量作为质量目标。[工程记录](../../../../docs/engineering/principles-to-implementation.md#必要工程思想的覆盖盘点)
在修改指导前保存了归属与实施顺序。

## 交付与来源

新增三个按需专题：

- [设计原则](../../../../references/design-principles.md)：SOLID、信息隐藏、Design by Contract、
  DRY/YAGNI 和 Law of Demeter，连接真实职责、替换行为、知识与接口边界。
- [协作模式](../../../../references/collaboration-patterns.md)：策略、规格、工厂、适配器、
  外观、装饰、责任链、观察者、命令与组合，说明调用过程、语义区别与适用边界。
- [领域与数据流](../../../../references/domain-and-data-flow.md)：统一语言、限界上下文、
  实体/值对象、DTO、聚合、反腐层、表现模型、单向流、结构共享及 CQS/CQRS/Event Sourcing。

有界重试与幂等留在 async，渐进替换留在 runtime，消费者契约与属性测试留在 verification。
入口与原有行为导航接通各专题；不新增统一运行时、容器、业务代码或安装依赖。

来源以原作者与官方资料为依据：Martin、Parnas、Evans/Fowler 原文，GoF 原书目录及
出版社提供的原文节选，Eiffel、DOM、Qt、Redux、Microsoft、AWS、RFC、Pact、fast-check
官方材料。来源性质和项目适配分别说明，未复制整章教程或把作者方法写成平台标准。
Liskov–Wing 原 PDF 直接抓取超时，正文的具体义务另与 Martin 1996 年原文及 Eiffel
契约规则核对；Evans 的完整参考 PDF 不可访问，当前指导改用可读取的作者原书节选与
相关官方架构说明，没有把不可访问全文标为已完整阅读。范式专题的继承替换指针也从
二手教程改为 Fowler 的原始重构目录。

## 确定性检查

| 检查 | 结果 |
| --- | --- |
| 仓库结构、元数据、链接、脚本及用例 | 通过，79 个行为用例；[输出](repository-validation.log) |
| 官方技能校验 | 通过；[输出](official-validation.log) |
| 原有确定性测试 | 118 项通过；[输出](deterministic-tests.log) |
| `git diff --check` | 通过；[输出](diff-check.log) |

实际命令见 [verification-commands.json](verification-commands.json)。本机继续用已有
Python 3.12.14 与项目规定的开发依赖。原采集器按 `references/*.md` 发现专题，因此
本轮不增加第二套文件清单或校验器。

## 独立检查

冻结指导在 `frozen-inputs/`，入口采用 `.snapshot.md` 名称，manifest 记录原始路径。
两名独立原生子代理分别接收四个只读判断请求，以及原有导出 fixture 的短实现请求；
两者不读取对方目录，不提供评分项、作者诊断或预期修法。

原始输入保存为 `request-1.txt` 至 `request-4.txt`、`implementation-request.txt`。

四份实际评审见 [SOLID](reviews/request-1-review.md)、
[协作选择](reviews/request-2-review.md)、[领域与历史](reviews/request-3-review.md)、
[恢复迁移与证据](reviews/request-4-review.md)。宿主回读产物后确认：能识别行为替换和
隐含初始化协议，保留内聚会话；选择共享资格规则、适配器、命令与独立订阅；区分身份、
金额值、CQS/CQRS/事件溯源；拒绝未知写入盲重试、双付款比较和循环定义的属性 oracle。
意见均给出实际修正与待验收边界，没有把未运行测试写为通过。前两份引用临时技能路径，
其对应来源正文和链接保存在 `frozen-inputs/references/`，供临时目录清理后继续复核。

### 实现检查的初次输入与修正

首轮原生提示仅提供短请求、fixture 和技能，漏掉现有采集器的受保护路径说明。
代理修改并加强了原测试文件，因此这轮不能当作受保护 fixture 的有效采集。实际代码
仍保留在 [最终快照](initial-implementation/project-final.json)，改动见
[测试差异](initial-implementation/protected-test-changes.patch)。它的
[12 项自测输出](initial-implementation/agent-validation.log) 与宿主在隔离副本换回原始
测试后的 [10 项通过输出](initial-implementation/host-original-checks.log) 分别保留，
不能据后者抹掉输入和受保护路径的问题。

没有为此追加新的全局技能禁令。改用原有 `initialize_workspace` / `build_prompt` 创建
全新隔离任务，明确原测试只读、增加覆盖应另建文件，并保留完整
[实际提示](maintained-prompt-implementation/request.txt)。未提供首轮代码、诊断或修法。

重跑交付：[实际设计](maintained-prompt-implementation/design.md)、
[完整项目快照](maintained-prompt-implementation/project-final.json)、
[源码差异](maintained-prompt-implementation/changes.patch)、
[生成方原始检查](maintained-prompt-implementation/agent-validation.log)。实际代码由一个
短函数拥有资格、提交 ID 快照、协议和发送确认，两个原入口重导出该操作，移除可变
分步协议。最终文档的重要契约、两个图示与实际定义/调用者一致；没有新增通用模式引擎。

宿主复用 `validate_fixture`：受保护文件逐字节不变，原始 10 项检查通过，见
[原检查结果](maintained-prompt-implementation/host-validation.json)。宿主另跑原测试加
新增回归，共 22 项通过，见 [完整输出](maintained-prompt-implementation/host-full-suite.log)。
原 fixture 本身的 [10 项基线](original-fixture-validation.log) 也通过；这是保持行为的
结构整理，不能描述成修复了 10 个行为故障。更多测试数量不构成质量改善结论。

输入与产物摘要、受保护检查、环境和指导一致性保存在 [metadata.json](metadata.json)。
冻结指导与最终源码及重跑使用的本地技能副本逐字节一致。没有从通用原生接口导出完整
工具事件，因此设计先行的精确时序和完整读取范围不能独立审计，设计中的时序自述
不冒充宿主事件证据。模型继承当前会话但准确 ID/effort 未暴露，也没有标准两阶段
盲评分；不标为 CLI 协议的有效量化批次，不作为发布达标分数。

本轮独立检查支持这些具体判断和小范围交付，未运行全部 79 个模型场景，也未验证
浏览器绑定、真实传输、支付、服务端 provider 或生产迁移。不能据此宣称所有思想都已
穷尽、所有场景均无退化或整体代码质量已经量化提高。

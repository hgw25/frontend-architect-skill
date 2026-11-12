# IoC、DI 与依赖装配补充记录

2026-11-11。用户指出仍有 IoC、DI、IoC 容器等思想遗漏。本次按依赖架构这一组问题
补充概念及实际方法，而非把旧目录当作思想全集。来源、实施方案和后续变化见
[工程记录](../../../../docs/engineering/principles-to-implementation.md#依赖关系与装配补充)。

## 实际变化

新增[依赖关系与装配专题](../../../../references/dependency-composition.md)，分别处理：

- IoC 的调用控制、DIP 的源码依赖方向、DI 的外部供给、Pure DI 的显式装配；
- Composition Root、容器的 Register Resolve Release、Service Locator 的主动查找；
- 手工 DI、既有框架 injector 和适当容器之间的选择；
- token 身份、provider 形式、实例作用域、父子所有权和释放；
- Angular 层级 provider、Vue provide/inject、React context 与独立容器各自实际语义。

主要来源为 Fowler 的 IoC/DI 原文、Martin 的 DIP 原文、Seemann 的组合根/Pure DI/
Register Resolve Release，以及 Angular、Vue、React、Inversify 官方文档。来源链接在
相应方法旁；没有新增容器实现、应用依赖或自命名模式。

方法目录拆开了原先挤在 Ports and Adapters 段落中的 DI，并明确目录不是穷尽清单。
入口、架构行为表、模块边界、范式选择和共享基础设施均接通相关章节。架构行为表
目前有 13 类入口；这个数字只描述导航，不证明所有工程思想都已涵盖。

## 确定性检查

| 检查 | 结果 |
| --- | --- |
| 仓库结构、链接、元数据、脚本和用例 | 通过，75 个行为用例；[输出](repository-validation.log) |
| 官方技能校验 | 通过；[输出](official-validation.log) |
| 原有确定性测试 | 118 项通过；[输出](deterministic-tests.log) |
| `git diff --check` | 通过；[输出](diff-check.log) |

本机继续使用已有 Python 3.12.14 与 `requirements-dev.txt`，实际命令在
[verification-commands.json](verification-commands.json)。两条新行为用例分别考察概念
与手工装配，以及框架 provider、别名、SSR request scope 和借用资源。

## 独立检查与范围

对独立原生子代理仅提供两个原始只读评审请求和冻结指导，不提供评分项或修正答案。
原始请求在 [request-1.txt](request-1.txt)、[request-2.txt](request-2.txt)；冻结指导在
`frozen-inputs/`，入口以 `.snapshot.md` 名称保存，manifest 使用原始路径记录摘要。

实际产物为[概念及装配评审](artifacts/request-1-review.md)和
[框架及作用域评审](artifacts/request-2-review.md)。复核交付正文：前者正确区分 IoC、DIP、
DI 和容器，保留现有 Pure DI、组合根和替换能力，识别业务主动 registry lookup 的区别；
后者保留 Angular injector，以编辑器 owner 的 provider 隔离草稿，用 `useExisting` 表达
别名，并区分 Inversify 解析 request 与真实 HTTP 边界、Vue 值供给与资源所有权。

两份意见给出具体修正路径、原始来源、实际消费者验证建议及尚未核实的版本/接线。
没有强制所有项目使用容器或禁止容器，也没有将题述风险伪装成已复现的运行故障。
评审之外未生成应用代码或新依赖；通过查阅实际文件核对以上结果，而非只看代理自述。
输入/产物摘要与运行方式在 [metadata.json](metadata.json)，冻结指导在结束后与临时
只读指导及最终技能源码逐字节核对一致。

原生子代理继承当前会话模型，未暴露确切 model ID/effort；没有完整工具事件/读取审计
或标准两阶段评分，因此不标成 CLI 协议的有效量化批次。这两条只读任务不证明全部
75 个模型场景均有效，也不能证明真实容器实例、SSR 隔离或销毁行为已经运行验证。
没有应用编译、浏览器或服务器集成证据，不据此声称整体代码质量已提升。

现有显式装配方式符合题述需求；拟议改造增加了维护负担，建议撤回全局查找与业务层传递容器的部分。

1. **维护问题：`container.get('api')` 隐藏真实依赖。** 功能原本直接声明需要 `api`；改后调用者必须了解容器、注册键和注册时序，替换适配器也需要处理 registry。把容器继续传入业务方法，并在其中查找依赖，仍是 Service Locator；注入了 locator 不等于业务所需的服务也采用显式注入。这不是已经证实的功能故障，但违反了“维护清楚当前依赖关系”的目标。[Fowler 对 DI 与 Service Locator 的区分](https://martinfowler.com/articles/injection.html#ServiceLocatorVsDependencyInjection)支持这一判断。

2. **概念修正：当前已经使用 DI，容器和装饰器均非必要条件。** bootstrap 创建真实 `api` 并从外部传入功能，测试传另一实现，正是手工装配的 Pure DI。DI 回答谁提供协作者；容器只是一种自动装配工具。题述图简单、替换点明确，也没有额外作用域需求，尚无引入容器的收益依据。[Seemann：Pure DI](https://blog.ploeh.dk/2014/06/10/pure-di/)。

3. **概念修正：DI 不自动满足 DIP，也不覆盖 IoC 的全部含义。** DIP 关注源码依赖方向：高层策略依赖所需抽象，具体实现依赖并满足该抽象；即使由外部注入具体 SDK 类型，仍可能耦合实现细节。需检查功能的类型和 import 后才能判断，不能据“已注入”认定满足 DIP。IoC 关注调用控制权，题述框架按生命周期调用注册和清理逻辑已体现 IoC，无需容器。DI 是依赖供应方面的控制反转；DIP 是另一项架构判断。[Martin：DIP 原文](https://d3s.mff.cuni.cz/f/teaching/nprg043/extras/martin96-dependency_inversion_principle.pdf)、[Fowler：IoC](https://martinfowler.com/bliki/InversionOfControl.html)。

**修正路径：** 沿用 bootstrap 作为 Composition Root：明确功能实际使用的窄 `api` 契约，在入口选择真实适配器并传给功能，业务只使用该能力；测试沿同一入口传替代实现。资源由实际创建并拥有它的生命周期边界清理。不必为此引入 Context、容器或每类一个接口。后续更换适配器应主要改入口装配，业务调用契约保持稳定；这是对现有结构的合理延续。[Seemann：Composition Root](https://blog.ploeh.dk/2011/07/28/CompositionRoot/)。

范围与验证：仅评审题述方案，已查阅指定技能及上述原始方法来源；未读取应用源码、未运行测试。仍需核实 `api` 的实际类型/import、bootstrap 调用链和资源所有权；建议通过真实业务调用验证替代实现可用及订阅清理有效，不能把这些建议当作已执行证据。

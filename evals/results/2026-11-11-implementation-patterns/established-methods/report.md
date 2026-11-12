# 成熟实现方法修订记录

2026-11-11。用户纠正了初版方向：每个思想应对应已有的实际解决方法，不能以自写业务
示例代替有来源的方法。本次重写方法指导，撤下初版三个业务示例、示例测试及 Python
入口。初版冻结输入和检查结果继续保留为历史，不挪用为本轮有效性或方法规范性的证明。
设计与归属见[工程记录](../../../../docs/engineering/principles-to-implementation.md)。

## 实际修改与来源

[当前方法指导](../../../../references/implementation-patterns.md) 按模块化与复用、领域逻辑、
状态、并发、表单、远程数据、交互、布局动效、运行时性能、安全产物、决策验证分组。
每项说明已有方法、主要来源、具体实施步骤和适用边界，区分正式规范、原作者方法、
框架/库官方机制及项目适配。没有把某个业务例子的 API 定义为通用标准。

核查以原作者和官方材料为依据，主要包括 FSD 官方层/公共 API 规则、Brad Frost 的
Atomic Design、Gary Bernhardt 的 Boundaries、Fowler 的重构目录和依赖注入、React/Vue
状态与生命周期文档、RxJS 7.x 维护者源码注释、WHATWG HTML/URL、SCXML、CSS Grid、
WAI-ARIA APG、TanStack Query、Paul Lewis 的 FLIP 原文、web.dev、OWASP、Node/Vite
和 SemVer。原始链接在方法项旁，正文概述和项目适配与来源名称分开，不复制完整教程。

因此同时纠正原有“FSD 不规定目录”的表述：采用 FSD 需要保留其层语义、公共 API 与
导入规则，借鉴 colocation 不能冒称完整采用 FSD。RAIL 保留为分析模型，并补上其官方
页面关于优先用 Core Web Vitals 设定当前 Web 目标的说明。框架 API 要按项目支持版本
核实，不要求无关局部任务重新调查全部资料。

## 确定性验证

- 仓库校验通过，73 个行为用例；[输出](repository-validation.log)。
- 官方技能校验通过；[输出](official-validation.log)。
- 原有 118 项确定性测试全部通过；[输出](deterministic-tests.log)。初版新增的示例入口
  已删除，因此不再计入初版的第 119 项检查。
- `git diff --check` 通过；[输出](diff-check.log)。

本机使用已有 Python 3.12.14，通过 `uv run --python 3.12 --with-requirements requirements-dev.txt`
加载项目已有依赖。实际命令保存在 [verification-commands.json](verification-commands.json)。
删除例子后检查了当前入口、专题、README、贡献说明和行为用例，没有遗留失效示例路由。

## 独立行为检查

冻结指导位于 `frozen-inputs/`，入口和贡献说明使用 `.snapshot.md` 名称；manifest
记录原始路径与摘要。对独立原生子代理只提供真实需求、框架/接口事实及只读技能：
设计搜索、顺序保存、重复点击处理、订阅清理和派生状态的实现，不交付应用代码。
未提供方法选择答案、评分项或父代理诊断。

实际交付为[技术设计](artifacts/docs/interaction-technical-design.md)，唯一交付文件是文档，
没有应用实现、测试骨架或新依赖。原始[任务输入](request.txt)、输入与产物摘要、运行方式
保存在 [metadata.json](metadata.json)。冻结指导在任务后与临时只读目录、最终技能源码
逐字节核对一致；[来源链接清单](source-links.json) 用于维护发现，不冒充自动远端链接检查。

核对实际文档：搜索采用 `switchMap`，必须逐项执行的保存采用 `concatMap`，手动重复激活
采用 `exhaustMap`，派生人数没有另设同步 effect。文档给出具体流接线、调用契约、清理
所有权、4 步实施计划和两种纯文本图；原始来源与局部适配分别说明，没有命名新的通用
架构标准，也没有把停止观察说成服务端回滚。

同值输入去重和跨页面排空写入是该设计增加的局部选择，文档披露了适用解释与待核对的
接口前提；不能据此认定这些行为已经获得真实产品确认。原生子代理只声明完成文档
一致性与 Markdown 静态检查，没有声称编译或运行通过。宿主复核的是实际文档及方法
语义，不将其作为应用正确性或生产就绪证据。

原生子代理继承当前模型，接口未暴露准确模型 ID/effort；未导出完整工具事件、读取
审计或标准两阶段盲评分。这是有限的独立设计检查，不是现有 CLI 协议的有效量化批次。
没有运行全部 73 个模型行为场景，也不据此声称整体代码质量已提高。源码、链接与
确定性测试的通过分别说明对应检查覆盖的范围。

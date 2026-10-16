结论：A、B 不需要在编码前持久化设计文档；C 需要一份精简、可持续更新的迁移设计记录。文档不是审批门槛，授权范围内可以在记录后继续推进。

| 任务 | 是否持久化 | 最小准备 | 后续行动 |
|---|---|---|---|
| A：按钮间距 8px → 6px | 不需要 | 确认 token 的实际消费者，避免误改被其他组件共享的通用 token；明确交互、尺寸语义和 API 均不变 | 直接修改所属 token，检查主要按钮变体及视觉回归。若 token 影响范围超出公共按钮，改用更窄的按钮专属 token |
| B：列表页增加 URL 状态筛选 | 不需要；对话中的简短实现计划足够 | 查清现有 URL 筛选约定：参数名和值、默认值、非法值处理、删除筛选时的 URL、前进/后退恢复，以及 URL 到请求参数的映射 | 复用现有解析、序列化和筛选组件；验证分享/刷新 URL、前进后退、清除筛选和数据请求。只有发现状态语义或 URL 公共契约尚未定义时，才更新其既有记录 |
| C：三应用统一登录状态迁移 | 需要 | 盘点三个应用及旧新会话接口；确认权威身份来源、会话存储与服务端保证；明确身份、刷新、退出传播的负责人和失败策略 | 建立兼容层，按应用和团队分阶段迁移；保留两周回滚能力和可观测性；满足切换条件后停用旧接口并删除兼容代码 |

C 的最小文档应是一份“活的迁移计划”，无需拆成庞大设计体系，至少包含：

- 当前与目标会话契约，以及“同一用户身份”的判定依据。
- 身份读取、刷新调度、服务端注销、跨应用退出传播各自的唯一所有者。
- 旧新接口两周并存的适配边界、应用迁移顺序和团队交接点。
- 刷新竞争、过期、账号切换、部分应用离线、退出传播失败等关键策略。
- 每阶段的验收条件、监控信号、回滚方式和旧接口删除条件。
- 未决问题、负责作出决定的人及最晚决策时间。

其中“用户身份、刷新与退出传播的所有权”必须在相关实现定型前解决；可以先做接口盘点、兼容缝设计等可逆工作，但不应让三个应用各自形成临时所有权。浏览器端清空状态也不能被当成服务端会话已经撤销。

当前工作区除 `.frontend-architect` 和 `.git` 外没有项目源码或既有文档目录，因此无法诚实指定文档落点或执行代码修改。实际仓库中应优先更新已有 ADR、RFC 或迁移计划；若没有，再创建一份短记录，而不是并行建立新的文档体系。上述判断依据来自本地 [SKILL.md](/var/folders/_6/gpmy4q4166xbmb7153p4cqp80000gn/T/frontend-architect-proportional-design-documentation-candidate-_dgjazqt/.frontend-architect/SKILL.md)、[architecture-and-code.md](/var/folders/_6/gpmy4q4166xbmb7153p4cqp80000gn/T/frontend-architect-proportional-design-documentation-candidate-_dgjazqt/.frontend-architect/references/architecture-and-code.md) 和 [security-and-trust.md](/var/folders/_6/gpmy4q4166xbmb7153p4cqp80000gn/T/frontend-architect-proportional-design-documentation-candidate-_dgjazqt/.frontend-architect/references/security-and-trust.md)；未修改任何文件。
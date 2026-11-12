1. **高：A 不满足行为替换。** `save/remove` 抛 Unsupported 削弱原保证，新增 `initialize` 加强前置条件，签名相同不能验收。保留完整存储供原页面使用；按消费者需要另暴露只读能力，初始化由构造边界完成。分别检查只读加载与原读写消费者的加载、写入、删除及错误契约。

2. **中：B 的拆分类理由不成立。** 同一会话拥有状态、变更、释放及共同不变量，结构可保留。SRP 按变更原因判断；让调用者协调共享可变 context 和四步协议反而泄漏内部顺序。检查公开操作仍保持不变量、释放资源；不要按方法数拆分。

3. **中：C 过度建设。** 保留共同资格与提交流程，以两个具相同输入输出契约的编码函数形成 Strategy 边界。新增格式只补编码与明确选择；OCP 不禁止修改旧代码，也不要求任意插件引擎。检查两种编码经共同调用者运行、资格与提交规则一致。

依据：[给定技能的 SOLID 指导](/var/folders/_6/gpmy4q4166xbmb7153p4cqp80000gn/T/frontend-expanded-methods-omckdhl8/skill/references/design-principles.md#apply-solid-to-the-responsible-boundary)。范围仅提案与指定指南，未取得应用源码，未运行编译或验收。

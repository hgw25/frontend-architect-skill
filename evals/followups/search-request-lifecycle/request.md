# Second turn — deliver only after first-turn implementation is frozen

增加公开 `reset(): void` 方法：清空 draft/submitted/items/error，status 回到 idle；使 reset 之前所有在途请求失效，但 controller 本身仍可再次 submit。reset 后、首次新提交前 retry 是 no-op。dispose 后 reset 也是 no-op。

在第一轮实现上增量完成，保留其他公共 API。添加公共行为测试：旧成功与旧失败均不能覆盖 reset 状态；reset 后立即新 submit，再完成旧请求，不能提前结束新请求；dispose 后 reset 不改变快照。运行第一轮验收和新增测试，说明修改落在哪个所有权边界。不要把 reset 实现成销毁后隐式新建 controller。

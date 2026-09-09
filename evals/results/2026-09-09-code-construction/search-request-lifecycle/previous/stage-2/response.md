第二轮完成，仅在 `src/search.js` 新增 `reset()`：

- 递增现有请求序号，使 reset 前的成功和失败回调全部失效。
- 将五个公共状态字段恢复初始值；清空 submitted 后，retry 自动成为 no-op。
- 保留再次提交能力；dispose 后 reset 直接返回。

原有请求执行、DTO 转换、错误处理、独立快照和 dispose 边界保持不变，无新增模块或依赖。

`npm run check`：11 项全部通过，包括原有 8 项和新增 3 项。未修改只读文件，未提交；未读取额外 reference。

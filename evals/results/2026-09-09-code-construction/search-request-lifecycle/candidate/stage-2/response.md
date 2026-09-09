已完成第二轮，仅在 `src/search.js` 新增 `reset()`：

- 增加请求序号，使 reset 前在途请求失去发布权限。
- 清空全部公开状态并恢复 idle；之后仍可提交。
- 清空 submitted，使首次新提交前 retry 自动保持 no-op。
- dispose 后 reset 直接返回。

原有请求执行与结果发布边界、DTO 转换、快照隔离、错误处理及公开 API 保持不变；未增加状态字段、模块或依赖。

`npm run check`：11/11 通过，包括原有 8 项及新增 3 项 reset 验收。只读文件未修改，未提交。本轮未追加读取 reference；无已知契约内未解决风险。

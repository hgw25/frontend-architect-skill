# Changelog

本文件记录 Frontend Architect Skill 的可安装发布版本。Git tag 是发布内容的不可变标识，
`VERSION` 是仓库中的当前版本单一来源。

## [0.2.0] - 2026-08-24

### Added

- 增加信息隐藏与深模块判断，避免把改名转发的浅层封装误判为架构边界。
- 增加候选 Skill、reference 和无 Skill baseline 的隔离审计。
- 增加受保护评测 harness，阻止候选通过修改既有验收脚本降低通过条件。
- 增加乐观更新并发回滚、source map 秘密扫描和真实 npm tarball 消费验证。

### Changed

- 将单次任务的 reference 路由限制为最多两个主题；渲染专题只允许公共模型加一个目标平台扩展。
- 强化版本、安装、升级和发布校验，确保 README、CHANGELOG、VERSION 与 Git tag 保持一致。
- 修正 GitHub Actions 的 Python 依赖缓存配置。

### Verification

- 19 个确定性脚本测试通过。
- 18 个 Markdown 文件和 18 个行为评测用例通过仓库校验。
- 三个目标行为的跨模型评测平均分由 baseline 11.25 提升至 candidate 15.29，候选均达到 target。

## [0.1.0] - 2026-08-21

- 首次可安装版本。
- 建立高级前端与前端基建的核心决策标准、按需 reference 路由和行为评测框架。
- 完成第一轮减法优化，保留模块化、状态建模、函数式核心、渲染原理、安全与验证能力。

[0.2.0]: https://github.com/hgw25/frontend-architect-skill/compare/v0.1.0...v0.2.0
[0.1.0]: https://github.com/hgw25/frontend-architect-skill/releases/tag/v0.1.0

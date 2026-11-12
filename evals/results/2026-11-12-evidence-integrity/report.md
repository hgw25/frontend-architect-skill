# 2026-11-12 评测证据一致性修复

此次修复整体 review 已复现的三个 P2 缺口，并把独立复核发现的同类归档一致性问题
接入原有工件摘要检查。修改限于采集器、评分器、旧案例保护和相应测试/维护文档，
没有新增全局开发提示、安装技能或发布版本，也没有改写历史评测结论。

## 实际改动

- **实际指导身份。** candidate 每轮生成前与宿主检查后核对实际副本的文件集合和字节，
  与冻结 skill-root 一致；baseline 预期为空。缺失、修改或增加指导文件使采集无效，
  不进入宿主反馈修复。前轮证据保留，不能被后轮覆盖。
- **逐轮执行与评分输入一致。** `guidance-integrity.json` 和 `attempt-result.json`
  通过现有归档/摘要机制保存。评分核对轮次原件、轮次元数据、汇总字段和冻结来源，
  并保护实际用于评分的顶层回答、diff、日志等副本。单改 manifest 中的 exit code
  或单改评分副本都会 invalid，不能重新评分或复用旧通过分数。
- **冻结独立验收输入。** 评分前检查 acceptance-inputs 实际文件存在、解析路径归属
  与字节摘要，保留原有摘要字段一致性检查；文件修改、删除、外部符号链接均被拒绝。
- **旧资料页检查入口。** `optimistic-profile-update` 保护原有 package.json、锁文件和
  核心测试，继续允许修改业务代码、新增测试及必要测试配置。

没有逐轮身份和执行原件的旧采集需要重新运行，不能补造为新协议通过，也不能直接
追加到新协议批次。评分仍可使用归档证据，不要求生成临时工作区存在。

## 验证

| 验证 | 实际结果 |
| --- | --- |
| 原三处缺口的失败回归 | 实现修改前 123 项测试中 9 个失败子例，见 `red-regressions.log` |
| 独立发现的评分副本遗漏 | 修复前 7 项测试中 4 个失败子例，见 `scoring-copies-red.log` |
| 指导元数据与冻结来源 | 修复前失败见 `guidance-consistency-red.log`，包含上一阶段尚未修复的反例 |
| 轮次/最终验证退出码 | 修复前 7 项测试中 4 个失败子例，见 `execution-metadata-red.log` |
| 最终完整确定性回归 | 126 项通过，见 `green-regressions.log` |
| 独立前后复核 | 10 个坏输入变体均 invalid、0 评分调用；正常单轮、双轮和无工作区/无缓存的新评分通过，见 [最终记录](independent/final/NOTES.md) 与 [摘要](independent/final/summary.json) |
| 原指导删除/替换探针复跑 | 两者 capture exit=1，评分预检报告指导身份不符；实际验收文件改动另被识别 |
| 原检查入口绕过 | 把 check 改成 node --version 后，只执行保护核验即失败，不运行 npm |
| 合理产品实现正对照 | 回放已有独立生成代码，仅复制产品、新测试和配置；原保护文件摘要不变，类型及 15 项测试通过 |
| 仓库和官方校验 | 仓库 68 Markdown / 84 案例通过；主技能及维护子技能官方校验通过 |

原探针路径和对应日志：

- `../2026-11-12-whole-skill-review/post-workflow/capture-consistency-probe.py` → `capture-consistency-probe.log`
- `../2026-11-12-whole-skill-review/post-workflow/mutated-guidance-probe.py` → `mutated-guidance-probe.log`
- [入口保护与正常实现回放](protected-profile-probe.py) → [实际结果](protected-profile-probe.json)

正常 profile 对照是宿主对既有归档代码的重放，不是本轮新模型生成。原始夹具仍然失败，
未改弱测试来制造健康基线。固定依赖的安装日志保留原样，不据此声称依赖安全审计通过。

## 证据边界

本轮使用真实子进程、隔离 Git 工作区、冻结夹具和本地生成器/评分桩验证工具行为，
没有调用外部评分模型，也没有重跑全部 84 项模型行为场景。通过这些检查说明已复现的
采集/评分缺口得到修复，不能据此声称技能在所有业务场景中都能生成优秀代码。

检查点摘要不能证明指导在两个检查点之间从未被改动后恢复；已有命令阅读审计仍有原协议
说明的观察边界。摘要检查用于防止缺失、错配和过期证据，不提供防篡改签名。
同时伪造原件、摘要和所有来源记录不属于此机制的证明范围。

最终命令、环境、源码摘要及退出状态由 [verification.json](verification.json) 记录；独立探针及前后结果
保存在 `independent/`。历史 review 工件及其原始失败结论保持不变。
完整逐变体采集工件归入 [原始证据归档](independent-raw.tar.gz)，已逐文件核对归档字节；
可直接阅读的脚本、日志和报告保留在目录中，归档摘要见
[archive-index.json](independent/archive-index.json)。

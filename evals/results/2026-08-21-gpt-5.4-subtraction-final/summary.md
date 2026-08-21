# Subtraction Evaluation Summary

本轮只验证减法后的核心行为，不扩建新的评测框架。生成模型和独立评分模型均为
`gpt-5.4`、`medium`，每个评分批次只包含一个用例。

| 用例 | Baseline | Candidate | Candidate verdict |
| --- | ---: | ---: | --- |
| 派生状态小功能 | 12.80 | 14.40 | target |
| 功能内部细粒度模块化 | 12.00 | 13.33 | target |
| 函数式与面向对象取舍 | 16.00 | 14.40 | target |
| 浏览器更新到像素 | 13.71 | 12.57 | basic |
| 平均 | 13.63 | 13.68 | — |

所有条件均未触发 case-specific 或 global failure。浏览器用例的 candidate 在同一
Skill、模型和配置下重新生成后获得 13.71、`target`，见相邻的
`2026-08-21-gpt-5.4-subtraction-browser-repeat`。同一份回答的重复盲评也出现过约
1 分波动，因此单次阈值附近分数不应被解释为可复现退化。

实际按需读取保持收敛：

- 小功能：architecture + verification；
- 细粒度模块化：module boundaries + architecture；
- 编程范式：programming paradigms + 一个边界专题；
- 浏览器渲染：rendering common + web extension，另因请求要求验证而读取 verification。

结论：候选平均分与 baseline 持平略高，四类核心能力都可观察，且没有一票失败；
当前证据支持“减法没有造成可复现的实质退化”，但不支持宣称每次随机生成都严格提升。

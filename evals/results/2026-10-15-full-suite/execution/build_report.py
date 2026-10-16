"""Render the completed comparison without replacing any underlying grade."""
from pathlib import Path
from datetime import datetime, timezone
import csv
import json
import sys

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT.parents[2] / "scripts"))
import run_behavior_evals as runner

summary = json.loads((ROOT / "summary.json").read_text())
main = list(csv.DictReader((ROOT / "comparison.csv").open()))
repeats = list(csv.DictReader((ROOT / "repeats-comparison.csv").open()))
cases = runner.load_cases(None)
assert len(main) == 45 and len(repeats) == 12
assert all(c["scored"] == 45 and c["invalid"] == 0 for c in summary["conditions"].values())
assert all(c["scored"] == 12 and c["invalid"] == 0 for c in summary["repeats"]["conditions"].values())
for name in ("evidence-verification.json", "supplemental-verification.json"):
    evidence = json.loads((ROOT / name).read_text())
    assert not any(r["errors"] for r in evidence["records"])

records = {}
for version in ("previous", "candidate"):
    records[version] = {}
    for path in (ROOT / version).glob("shard-*/manifest.json"):
        for row in json.loads(path.read_text())["cases"]:
            records[version][row["id"]] = (path.parent, row)

def grade(score, verdict):
    label = {"target": "达标", "fail": "失败", "basic": "基本可用"}.get(verdict, verdict)
    return f"{float(score):g} / {label}"

def main_cell(version, row):
    folder, record = records[version][row["case"]]
    path = (folder / record["response"]).relative_to(ROOT)
    return f"[{grade(row[version + '_score'], row[version + '_verdict'])}]({path})"

by_id = {row["case"]: row for row in main}
main_table = ["| 案例 | 精简前原始评分 | 精简后原始评分 |", "| --- | --- | --- |"]
for case in cases:
    row = by_id[case["id"]]
    title = case["title"].replace("|", "\\|")
    main_table.append(f"| {title} | {main_cell('previous', row)} | {main_cell('candidate', row)} |")

repeat_table = ["| 案例 ID | 主测旧 → 新 | 复测旧 → 新 |", "| --- | --- | --- |"]
for row in repeats:
    values = []
    for phase in ("primary", "repeat"):
        values.append(" → ".join(grade(row[v + '_' + phase + '_score'], row[v + '_' + phase + '_verdict']) for v in ("previous", "candidate")))
    repeat_table.append(f"| `{row['case']}` | {values[0]} | {values[1]} |")

report = f"""# 精简前后完整 45 例行为评测

实验日期：2026-10-15。记录生成时间：{datetime.now(timezone.utc).isoformat()}。

主对照新版 **45/45 达标**，5 处首轮降分在同配置成对复测中均为新旧同分。
额外实现复测仍有一例候选 Dialog 验证链失败；原始失败保留，不能给出“完全无退化”
的结论。诊断副本只修正测试准备后 5/5 通过，支持直接故障位于生成的验证链，尚不能
证明精简对输出稳定性完全没有影响。

## 主对照结果

| 指标 | 精简前 previous | 精简后 candidate |
| --- | --- | --- |
| 完成生成并独立评分 | 45 | 45 |
| 原始达标 | 40 / 45 | 45 / 45 |
| 原始失败 | 5 | 0 |
| 最终无效主样本 | 0 | 0 |
| 原始有效样本均分，满分 16 | {summary['conditions']['previous']['mean_valid_score']:.2f} | {summary['conditions']['candidate']['mean_valid_score']:.2f} |
| Vite 补证复核后，仅更新该例判定的达标计数 | 41 / 45 | 45 / 45 |

原始数值质量分有 9 例上升、31 例相同、5 例下降。一票失败覆盖分数，因此均分包含
高分但失败的有效样本，不能用均分代替通过率。补充复核没有混入原始均分或覆盖原表。
小幅均分变化、单次输出及本次选择的案例集合不足以证明稳定质量提升。

previous 是精简前的实际工作区快照，含此前未提交的评审/评测改动；两个条件都加载
对应 Skill，运行模式均为 candidate。它不是无 Skill baseline，也不是已发布 tag 的
对照。生成和评分固定为 gpt-5.6-sol / high、CLI 0.162.0-alpha.17.2。

### 原始旧版失败及复核

- `community-review-mixed-diff`：漏掉新查询失败后复用旧 cursor 的契约缺陷；质量分
  16，失败审计仍正确覆盖为 fail。新版主样本发现该缺陷。
- `optimistic-profile-update`：测试间缺少 DOM cleanup，4/5 失败。原夹具已有该缺口；
  诊断只补 cleanup 后 5/5 通过，成对复测两版均通过。依赖安装与缓存时序也是限制。
- `group-by-api`、`anticipate-small-boundary`：额外主题读取的独立决策缺口说明不足。
  这是路由契约失败；groupBy 复测两版都再次出现。
- `vite-feature-flags-plugin`：原始盲评误将遗漏执行证据当作“单测未运行”。原始事件
  实际有 2/2 成功记录。补齐同类原始包命令、退出码和编辑顺序后，两条件分别独立复核
  为 target：旧 15.2，新 14.4。该例原判定撤销后旧版达标为 41/45；原始评分仍保留。

补证复核同时披露 Node/Vite 兼容矩阵和发布回滚未充分验证；新版额外轮询机制的成本
依据也被扣分。它们保留为取舍和证据限制，不据此声称两版完全等价。复核过程、初始
视图及澄清开发过程/最终验收后的结果均在 [adjudication](adjudication/vite-execution-evidence-final/method.json)。

## 12 组成对复测

复测覆盖 5 个首轮降分案例、groupBy 路由边界，以及全部 6 个可执行实现案例；每条件
12 个新会话，共 24 个新样本。旧版 11/12 达标，新版 10/12 达标，最终均无无效评分。

{chr(10).join(repeat_table)}

五个主评分下降分别为 -2、-1.6、-2、-1.6、-2.67 分，复测差值全部为 0。
多项差异来自评分者对“无真实工程时的具体验证方案”给 2 还是 1 的不同处理；RN 首轮
也少了部分体验边界说明。复查和复测支持没有稳定重现这些下降，不能由此推断所有
评分变化都是噪声。

复测还出现 Vue 旧 16 / 新 15、Vite 旧 16 / 新 15.2 等未触发失败的分数差异。
Vue 的扣分依据是真实浏览器导航证据缺失；这些差异已完整保留，没有进一步采样来
估计频率。首轮五处降分持平不等于所有复测分数完全相同。

### 候选 Dialog 的独有失败

原始复测的真实 Chromium 5 项检查失败：IIFE 中的 `process` 未定义；水合准备还把
Playwright 转换的 TSX 对象传给 React SSR，触发 `__pw_type` 错误。生成者报告的宿主
浏览器启动限制没有解释父流程实际看到的这些错误。

维护者在独立诊断副本中，仅补浏览器构建的 NODE_ENV 和经 Vite 编译的 SSR markup。
9 个 src 文件与 26 行浏览器断言逐字相同，5/5 通过。这个结果不计为原复测通过，
也没有修改正式生成产物或 Skill 指导。原始 trace、差异、哈希和日志见
[Dialog 诊断](diagnostics/dialog-candidate-repeat/metadata.json) 与
[浏览器结果](diagnostics/dialog-candidate-repeat/validation.log)。

该问题应优先从生成的测试构建与真实浏览器反馈链定位。现有检查已经能暴露失败，
没有依据为单次工具配置错误增加普遍 Skill 禁令。没有另做同配置多轮采样来估计该失败
频率，也没有测试生成者收到宿主日志后的独立修复闭环；因果和稳定性仍待确认。

## 逐例原始结果

下面保持原始盲评，包括 Vite 后续撤销的原判定。每个分数链接到对应原始回答；同目录
保存 events.jsonl、changes.diff 和实际验收日志。[CSV](comparison.csv) 为同一数据的机器可读表。

{chr(10).join(main_table)}

## 实际验证与证据位置

| 实现案例 | 实际验收边界 | 仍未证明 |
| --- | --- | --- |
| 乐观资料更新 | TypeScript、Vitest/jsdom；主测旧版失败，成对复测两版通过 | 真实浏览器、真实服务端写入与生产并发 |
| Vue 搜索/国际化 | TypeScript、Vitest/jsdom，含 URL 与 locale 状态 | 真实导航、刷新/分享与跨浏览器行为 |
| Dialog | SSR 与真实 Chromium；候选复测保留失败，诊断副本 5/5 | 完整浏览器/辅助技术/版本矩阵及生成者反馈修复能力 |
| Vite 插件 | 受保护构建、类型、SSR dev 更新、诊断、tarball 及隔离消费者 | 浏览器客户端 HMR、完整支持矩阵与 registry 发布 |
| 字段资格 | 受保护 Node 行为测试 | 真实表单 UI、宿主集成与用户路径 |
| 搜索请求生命周期 | 受保护 Node 行为测试 | 真实浏览器、网络与产品集成 |

- 主对照 90 个样本全部完成任务契约、原始事件摘要、完成 turn、阅读路由、保护文件、
  验收顺序、评分集合和指导副本核验；当前开发目录指导与冻结 candidate 逐字相同。
  结果见 [主证据核验](evidence-verification.json)。
- 24 个复测样本及 2 个仅用于补证评分的主样本副本核验通过；聚合副本与原始文件
  逐字一致，不另计生成样本。见 [补充证据核验](supplemental-verification.json)。
- 仓库结构校验、官方 quick_validate、**67 项确定性脚本测试**及 git diff --check 通过。
  见 [实际命令日志](deterministic-validation.log)。
- [方法与复现](method.md)、[冻结输入摘要](input-hashes.json)、[运行计划](run-plan.json)、
  [环境版本](environment.json)、[原始复查笔记](review-notes.md)、[复测 CSV](repeats-comparison.csv)
  保存配置、来源、判断和限制。

旧版 Vite、Dialog 各一次 900 秒超时均归档于 attempts/，两条件重新使用相同的
1800 秒上限；无最终回答/完成 turn 的尝试没有进入质量均分。另有读取审计误报、CLI
预检、协议修复前中止采集及一次错误 CLI 重评分，均单列保留。纯元数据修复没有改
任务或指导；其中 96 个既有完成样本的审计结果逐字不变。细节见方法记录。

## 未验证与解释边界

- 45 例中只有 6 个实现案例、2 个共用一组 before/after 快照的只读评审案例；其余
  37 例主要评价内联材料上的方案与判断。没有真实大型生产仓库的覆盖率或稳定性证明。
- 本批全部显式加载 Skill，关闭其他技能、插件及个人文档；**自动触发和技能共存未测**。
  frontmatter 描述变化的发现效果未由这批案例验证。
- 未测其他模型、精确服务端构建或确定性种子；生成与评分使用同一模型系列，人工复查
  已发现评分口径及证据视图问题。单次主样本和选定复测不提供统计稳定性保证。
- RN、Flutter、小程序、真实设备、生产性能和真实用户指标未实测；Dialog 的 Chromium
  证据不能代表所有浏览器、辅助技术、React 版本及消费者。补证 Vite 也只有实际记录的
  Node/Vite 环境；其冻结 dev 检查通过 SSR 模块加载验证更新，未证明真实浏览器客户端
  HMR。完整支持矩阵、真实发布和回滚也未覆盖。
- 生成者的 workspace-write 与父流程宿主执行权限不同，共享依赖缓存也未冻结。
  这些因素影响反馈和复现；本轮没有修复浏览器沙箱限制或完成跨权限环境对照。
- 未重跑无原对话接手检查、真实人类维护、安装更新/回滚及发布流程。当前已安装技能
  和全局配置未修改，本记录不构成发布验收。
- 阅读审计依赖可见执行事件，不能证明任意程序没有隐式访问；摘要是一致性证据，
  不提供防篡改签名。保留的原始失败和诊断通过均需按其实际范围使用。
"""
(ROOT / "report.md").write_text(report, encoding="utf-8")
print(f"Wrote report.md: {len(main)} primary pairs, {len(repeats)} repeat pairs")

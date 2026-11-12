# 评测与维护执行链独立只读审查

审查范围为当前工作树的 `scripts/run_behavior_evals.py`、`scripts/score_behavior_evals.py`、`scripts/eval_evidence.py`、`scripts/validate_skill.py`、`evals/cases.yaml`、`evals/rubric.md`、`evals/cases.md`、现有脚本测试与 `.github/workflows/validate.yml`。未读取 `evals/results` 内容、任何历史报告或其他代理输出；未修改仓库，未调用生成/评分模型、安装技能、发布或启动联网服务。以下引用位置均相对仓库 `/Users/heguangwei/project/skills/frontend-architect-skill`。

## 结论

评测代码确实有能力检查具体工程产物，而不只是判断代理是否复述原则：它保存原始项目与最终源码、执行公开检查和独立消费者检查，分别判定绝对质量、原始任务契约、必要成果与失败项，并保留宿主反馈前后的状态。协议也明确限制单次高分、测试数及同模型评分的解释。因此源码层面具备检验“交付代码是否达到目标”的基础，但本次未查看实跑结果，不能据此证明技能实际提高了代码质量或稳定地产出优秀代码。

确认两个可复现的工件一致性检查缺口。它们会使不满足当前捕获/保存契约的样本继续通过确定性有效性检查；本审查没有据此断言真实模型一定会给 `target`，也没有确认任何历史样本已受影响。

## 确定缺陷

### 1. [P2] 本地指导已改变或删除，捕获仍可被认定为有效

**准确位置**：`scripts/run_behavior_evals.py:658` 的 `capture_attempt`（尤其 662–672），配合 `:118–134`、`:722–724`；`scripts/eval_evidence.py:17–19`。

候选目录 `.frontend-architect/` 被加入 Git 排除项，随后才复制指导，因此既不进入 diff，也不进入 `project_snapshot` 的文件集合。manifest 的 `guidance_sha256` 计算的是源 `skill_root`，不是每轮实际工作区副本。每轮结束时没有核对指导副本的文件集合与字节；`capture_errors` 只依据阅读事件、隔离分类和公开 harness 的结果。

**触发条件与实际验证**：使用 `/tmp/frontend-eval-review-probe.py` 驱动真实 runner，以本地确定性生成器替代外部 Codex。生成器真实执行 `cat .frontend-architect/SKILL.md` 后执行常见清理命令 `git clean -fdx`，按实际命令/输出记录事件。后者删除被忽略的指导目录。结果为：

- `capture_exit_code = 0`
- `local_skill_exists_after_capture = false`
- `read_audit_status = recognized`，`local_skill_read = true`
- `capture_errors = []`
- `captured_evidence_errors = []`

另用 `/tmp/frontend-eval-review-mutated-guidance-probe.py` 真实执行 `perl -pi -e 's/Frozen candidate guidance/Replaced candidate guidance/' .*/S*.md` 后再按规定完整 `cat` 入口。实际读到的是改变后的指导，源指导 hash 仍对应原文件，以上两个有效性 gate 仍返回空列表、runner 仍返回 0。这是对相同缺口的更直接确认，不是生成模型效果实验。

**实际影响**：记录无法支持“该样本使用了 manifest 所指的冻结指导字节”的结论；普通清理也会违反明确的指导只读契约而未被确定性检查发现。协议在 `evals/cases.md:140–145` 已明确阅读事件审计不能证明文件未改动，并要求另外核对实际产物，当前没有这条接线。

**建议边界**：复用既有 hash 机制，在候选副本初始化时保存明确文件集合与摘要，每轮捕获时核对工作区副本并保存结果，使缺失或改变的副本进入 invalid。无需把事件审计扩大为任意 shell 的语义分析，也不宣称能证明过程中未发生后又恢复的修改。

### 2. [P2] 评分前不核验保存的独立 acceptance 输入文件

**准确位置**：`scripts/score_behavior_evals.py:429–432`；保存端位于 `scripts/run_behavior_evals.py:771–776`。

保存端把 acceptance support 的实际字节写入 `acceptance-inputs/` 并在 `input_artifacts` 记摘要，但评分端只比较 `input_artifacts` 映射值与 `capture_contract.acceptance_checks[*].file_hashes`。它没有检查保存文件是否存在或读取实际字节。与此相邻的 `attempt_artifacts` 则确实检查了文件和摘要。

**触发条件与实际验证**：同一 `/tmp/frontend-eval-review-probe.py` 用真实 capture 产生一个成功独立消费者检查，确认初始 `captured_evidence_errors == []` 后，依次把保存的 `acceptance-inputs/oracle.py` 改为不同内容、再删除；不改变 manifest、当前 oracle 源文件或日志。两次 `captured_evidence_errors` 均仍为 `[]`。

**实际影响**：清理、迁移或误编辑已经使复核所需的冻结输入缺失/失配，评分入口仍将其视为有效样本。这不证明当时检查未运行，却违反保存原始 acceptance 字节供后续复核的明确维护契约（`evals/cases.md:75–78`），也与错误名 “Missing frozen independent acceptance input” 的实际判定不一致。

**建议边界**：沿用 `attempt_artifacts` 的文件存在性、目录内路径和实际摘要核验模式，核对每个必需 `acceptance-inputs/<source>`；缺失或失配时要求恢复原冻结输入或重新采集。

## 已承认的协议能力边界及证据缺口

以下没有列为确定缺陷：

- 阅读审计只看执行事件，不能证明任意程序内部的隐式访问隔离。`evals/cases.md:144–149` 已明确承认，不应要求它承担操作系统审计职责。上面的第 1 项针对独立的指导字节核验缺失。
- 评分者由模型作语义判断。两阶段隔离、维度顺序校验与失败覆盖可约束输出，但不能证明判断本身准确。协议要求重要场景另做独立复核/必要复测，不能把高分当结论。
- CI 执行静态契约校验和确定性脚本测试，没有执行完整的模型生成与盲评；协议末尾明确说模型评测仍是独立发布检查。这是运行范围，不能把 CI 全绿作为指导效果证据。
- 当前案例同时包括文字判断、架构设计、源码实现、真实浏览器、HTTP 和发布包消费者；其中只有文字材料的场景仍不能证明运行或宿主表现。源码范围本身也不能证明跨项目/跨运行时的普遍效果。
- 本次没有查看历史结果或运行配对模型评测，因此没有给出技能增益、退化率、分数均值或稳定性结论。

## 本次实际验证

使用用户指定的 Python 与 Node 环境运行：

```sh
PATH=/Users/heguangwei/.nvm/versions/node/v22.22.2/bin:$PATH uv run --python 3.12 --with-requirements requirements-dev.txt python scripts/validate_skill.py
PATH=/Users/heguangwei/.nvm/versions/node/v22.22.2/bin:$PATH uv run --python 3.12 --with-requirements requirements-dev.txt python -m unittest discover -s scripts -p 'test_*.py'
PATH=/Users/heguangwei/.nvm/versions/node/v22.22.2/bin:$PATH uv run --python 3.12 --with-requirements requirements-dev.txt python /tmp/frontend-eval-review-probe.py
PATH=/Users/heguangwei/.nvm/versions/node/v22.22.2/bin:$PATH uv run --python 3.12 --with-requirements requirements-dev.txt python /tmp/frontend-eval-review-mutated-guidance-probe.py
```

静态校验通过；现有 118 项确定性脚本测试通过，无跳过。两个探针均完成并复现上述 gate 缺口。测试结果仅说明本次工具与夹具检查情况，不是技能效果证明。探针只在临时目录复制最小 fixture、初始化本地 Git 并运行本地命令；其临时工作区已清理，探针源码保留在 `/tmp`。

# Frontend Architect

一个面向 AI 编码代理的高级前端与前端架构 Skill，覆盖 Web、App/跨端和小程序运行时。
它既要求代理完成高质量产品代码，也要求代理在真实共性问题出现时具备建设组件库、
设计系统、SDK、共享数据层、构建插件、代码生成器和 Monorepo 包的能力。

当前发布版本：[v0.3.1](https://github.com/hgw25/frontend-architect-skill/releases/tag/v0.3.1)。
版本变化见 [CHANGELOG.md](CHANGELOG.md)。

## 它解决什么问题

AI 很容易写出“能运行”的前端代码，也很容易产生另一种问题：为了显得高级而增加
抽象、状态、配置、依赖和目录层级。本项目将高级前端工程经验转成决策门槛：

- 先使用平台与项目已有能力，再创建新抽象；
- 按变化、所有权和依赖方向确定模块边界；
- 在功能模块化与职能模块化之间做场景化选择；
- 在函数、Reducer、状态机、闭包和类之间选择合适表示；
- 把状态、副作用、异步竞态和错误状态当成产品行为；
- 明确服务端、浏览器、缓存、包和序列化边界；
- 从状态更新、调度、跨层传输、宿主更新到布局、绘制、栅格化和呈现定位渲染成本；
- 使用同一套高级工程标准，并按消费者数量、影响范围和迁移风险提高设计与验证深度；
- 将公共 API、类型、构建产物、诊断、兼容性和发布视为基建正确性；
- 把不可信数据、授权、秘密和第三方代码视为信任边界；
- 将语义、可访问性、布局、动效和性能纳入实现质量；
- 让高风险变更可观测、可灰度、可回滚；
- 通过行为与风险验证代码，而不是追求形式上的覆盖率。

## 非目标

- 不强迫所有项目采用同一技术栈或文件结构；
- 不把某位工程师的个人风格当成绝对规范；
- 不要求所有代码函数式，也不鼓励到处创建类；
- 不将 Atomic Design、Feature-Sliced Design 或 FLIP 当成必用模板；
- 不替代项目自己的 `AGENTS.md`、架构约束和验证命令。

## 项目结构

```text
frontend-architect-skill/
├── SKILL.md
├── VERSION
├── CHANGELOG.md
├── agents/
│   └── openai.yaml
├── references/
│   ├── architecture-and-code.md
│   ├── async-and-lifecycles.md
│   ├── module-boundaries.md
│   ├── programming-paradigms.md
│   ├── frontend-infrastructure.md
│   ├── runtime-and-delivery.md
│   ├── rendering-and-performance.md
│   ├── rendering-web.md
│   ├── rendering-app.md
│   ├── rendering-mini-program.md
│   ├── security-and-trust.md
│   ├── interface-and-motion.md
│   └── verification-and-review.md
├── evals/
│   ├── cases.md
│   ├── cases.yaml
│   └── rubric.md
├── scripts/
│   ├── validate_skill.py
│   ├── run_behavior_evals.py
│   ├── test_run_behavior_evals.py
│   ├── score_behavior_evals.py
│   ├── test_score_behavior_evals.py
│   └── test_validate_skill.py
├── requirements-dev.txt
├── .github/workflows/
│   └── validate.yml
├── CONTRIBUTING.md
└── README.md
```

`SKILL.md` 只保存核心工作方式和专题路由。代理仅在任务需要时读取对应
`references/`，避免每次加载完整的前端知识库。

渲染专题采用两级按需加载：先读取跨平台成本模型，再只读取 Web、App/跨端或小程序
中与当前运行时匹配的一个扩展；Hybrid WebView 等真实混合场景才会组合多个扩展。

## 开发、发布与安装

本项目采用单向发布流程，不从开发目录建立长期全局链接：

```text
project/skills/frontend-architect-skill
        ↓ 开发与评测
GitHub repository
        ↓ skill-installer
~/.codex/skills/frontend-architect
```

1. 在普通项目目录开发 Skill。
2. 运行结构校验和行为评测。
3. 提交并推送到 GitHub。
4. 使用 `skill-installer` 从 GitHub 安装发布版本。

仓库发布后，可以请求 Codex：

```text
使用 skill-installer 从 GitHub 安装 hgw25/frontend-architect-skill 仓库根目录的
frontend-architect Skill。
```

也可以使用系统安装脚本：

```bash
python3 ~/.codex/skills/.system/skill-installer/scripts/install-skill-from-github.py \
  --repo hgw25/frontend-architect-skill \
  --path . \
  --ref v0.3.1 \
  --name frontend-architect
```

安装器会把 GitHub 中的发布内容复制到
`~/.codex/skills/frontend-architect`。如果目标目录已经存在，安装会停止，避免
静默覆盖现有版本。这里的 `--path .` 是单 Skill 仓库的有意选择；如果未来改为一个
仓库存放多个 Skill，再将发布内容移动到独立子目录并调整安装路径。

正式安装只使用不可变 Git tag，不省略 `--ref`，否则不同时间安装到的 `main` 内容可能
不同。Codex 通常会自动检测 Skill 文件变化；如果更新没有出现，再重新启动 Codex。

### 从已安装版本升级

安装器不会覆盖已有目录。先把新版本下载到临时目录，确认下载成功后再替换现有安装；
备份放在 `~/.codex/skills` 之外，避免 Codex 同时发现两个同名 Skill：

```bash
set -euo pipefail

skill_release="v0.3.1"
skill_stage_dir="$(mktemp -d)"
skill_backup_root="$HOME/.codex/skill-backups"
skill_backup_dir="$skill_backup_root/frontend-architect-$(date +%Y%m%d-%H%M%S)"

python3 ~/.codex/skills/.system/skill-installer/scripts/install-skill-from-github.py \
  --repo hgw25/frontend-architect-skill \
  --path . \
  --ref "$skill_release" \
  --name frontend-architect \
  --dest "$skill_stage_dir"

mkdir -p "$skill_backup_root"
mv ~/.codex/skills/frontend-architect "$skill_backup_dir"
mv "$skill_stage_dir/frontend-architect" ~/.codex/skills/frontend-architect
rmdir "$skill_stage_dir"

printf 'Backup: %s\n' "$skill_backup_dir"
```

新版本在下一次调用时通常即可使用。如果需要回滚，先把当前目录移到
`~/.codex/skill-backups` 下的另一个名称，再将上面输出的备份目录移回
`~/.codex/skills/frontend-architect`。

## 使用

显式调用示例：

```text
使用 $frontend-architect 实现这个需求，并说明关键架构取舍。
```

```text
使用 $frontend-architect review 这个模块，重点检查模块边界、状态所有权和测试。
```

```text
使用 $frontend-architect 判断这里应该使用纯函数、Reducer、状态机还是类。
```

该 Skill 默认也允许 Codex 在匹配的前端开发与架构任务中自动发现。

## 核心观点

### 统一的判断体系

Skill 按四个部分组织：入口中的核心判断体系和任务执行方式、按需读取的专题参考、
以及维护阶段使用的行为评测。评测规则不作为每次业务开发必须读取的清单。

核心主线是：**行为 → 事实 → 模型 → 边界 → 实现 → 证据**。重要规则需要能对应到
状态或资源的所有者、实际执行位置和可发现错误的验证；新边界用有现实依据的变化
检验，而不靠目录数量证明架构质量。证据变化时可以回到前面的决定重新调整。

执行方式按局部修改、功能、故障、重构、共享基建、迁移和只读评审区分。明确的小改动
直接实现，边界清楚的方案在对话中简述；只有需要跨阶段或协作保留的重要决定才落成
简短文档。文档不是默认审批门槛。

### 模块化

对于具有明确业务能力的中大型产品应用，通常以功能或领域作为上层边界，再在功能
内部根据真实需要继续划分页面编排、业务流程、状态与纯规则、外部适配、UI 和测试；
组件、hook/composable、函数与文件也用语义、变化原因、生命周期和契约判断是否拆分。
`ui`、`model`、`api` 只是可能的职责，不是必须补齐的目录模板。小项目、基础库和强
框架约束项目可以采用不同结构。评价标准是变化是否集中、所有权是否清楚、依赖方向
是否稳定，以及是否在继续拆分不再增加清晰度时及时停止。

### 编程范式

默认优先考虑“函数式核心、命令式外壳”：将计算和状态转换保持纯净，把网络、DOM、
存储和生命周期留在明确边界。具有稳定身份、资源生命周期或需要保护可变不变量的
对象，可以使用类或对象封装。范式按边界选择，不按项目站队。

### 抽象

先证明问题，再支付抽象成本。相似语法不代表相同语义；少量重复通常比错误抽象更
容易纠正。

代码构造指导覆盖主流程与辅助函数、数据归一化与草稿/权威值的区别，以及真实调用方
需要理解的契约。异步专题区分过期结果、取消、排队、去重、幂等和乐观回滚，优先复用
已有数据层。平台 API 不自动优于已承担兼容性和生命周期策略的项目封装。

专题默认读取一至两个；出现明确的新决策缺口时可以继续按需读取并说明理由。
评测将额外读取交给独立审查，不以数量直接判错，也不无条件认可大范围加载。

### 前端基建

基建不是更多目录或设计模式，而是被多个消费者依赖、需要长期维护的公共契约。组件
原语、设计系统、SDK、状态/数据层、构建插件、lint 规则、codemod 和 workspace 包
必须同时设计 API、类型、错误诊断、运行环境、兼容范围、构建产物、测试矩阵和发布
演进。Skill 同时要求：没有真实消费者时不预建基建；一旦任务确实是基建，就不能用
只能服务单一页面的临时封装交付。

前端基建不是另一套开发思想，而是在同一套状态建模、模块化、依赖方向、类型设计、
可访问性、性能和测试标准上，进一步承担多消费者、兼容性和发布演进责任。

### 运行与信任边界

现代前端代码可能运行在构建环境、服务端、边缘节点、浏览器或 Worker。Skill 要求
根据秘密、权限、交互、延迟、缓存和 Bundle 成本决定放置位置，并把跨环境数据设计成
明确的序列化契约。客户端权限判断只负责体验，服务端仍必须执行权威授权。

### 跨平台渲染与性能

Skill 先按目标运行时建立“状态或数据变化 → 调度与依赖计算 → 可选跨线程或跨层传输
→ 宿主节点更新 → 布局 → 绘制或栅格化 → 合成与呈现”的最小模型，再根据证据处理
真实瓶颈。浏览器、React Native、Flutter、原生声明式 UI、Hybrid WebView 和小程序
拥有不同线程、树和通信边界，不能机械套用同一套优化。memoization、虚拟列表、GPU
合成和固定帧预算都不是默认答案；性能结论必须来自目标版本、生产或 profile 构建、
代表性设备和相同用户路径的前后测量。

### 交付与可观测性

高风险改动需要考虑兼容迁移、灰度、回滚、错误恢复和生产信号。实验室检查用于诊断，
真实用户数据用于判断实际影响；日志、错误和分析数据不得无边界收集秘密或个人信息。

## 开发与验证

首次开发时创建隔离环境并安装校验依赖：

```bash
python3 -m venv .venv
source .venv/bin/activate
python3 -m pip install -r requirements-dev.txt
```

运行仓库校验：

```bash
python3 scripts/validate_skill.py
```

该命令解析并检查 Skill Frontmatter、代理元数据、仓库链接、Python 语法和结构化评测
用例。行为变更还应按照 [评测协议](evals/cases.md)，使用
[结构化用例](evals/cases.yaml) 和 [评分标准](evals/rubric.md) 做 baseline/candidate
前向测试。评测关注代理的决策和风险识别，不匹配固定措辞。

可以用隔离的 Codex CLI 会话生成可复查的原始输出、fixture diff 和验证日志：

```bash
python3 scripts/run_behavior_evals.py \
  --mode both \
  --results-dir evals/results/$(date +%F)-gpt-5.4
```

该脚本关闭插件发现，并审计实际 reference 读取：baseline 必须保持零 Skill 引用，
candidate 只能加载隔离工作区中的 `SKILL.md` 与按需 reference；读取全局副本或修改
受保护验收脚本会使运行失败。超出默认路由宽度则必须通过独立的必要性审查。它不会替代盲评；运行后仍需按照
rubric 在看不到另一组结果的上下文中评分。

生成完成后，可在与生成会话分离的上下文中执行两阶段评测。脚本先在隐藏
`must_observe`、`fail_if` 和另一条件的情况下盲评分，再为同一匿名条件单独执行
case-specific `fail_if` 审计；任一 case-specific 或 global failure 都会覆盖分数并将
verdict 设为失败。同一结果目录会拒绝混用不同评分模型或 reasoning effort：

```bash
python3 scripts/score_behavior_evals.py \
  --results-dir evals/results/$(date +%F)-gpt-5.4
```

评分脚本的确定性回归测试：

```bash
python3 scripts/test_score_behavior_evals.py
```

## 贡献原则

请阅读 [CONTRIBUTING.md](CONTRIBUTING.md)。新增规则需要说明它改变了什么决策、
适用边界是什么，并增加或更新至少一个行为评测场景。避免因单个失败案例不断累加
全局禁令。

## 发布说明

该目录已具备独立 GitHub 仓库结构，并已保存首版 baseline/candidate
[行为评测结果](evals/results/2026-08-20-gpt-5.4/summary.md)。目标仓库为
`hgw25/frontend-architect-skill`。当前版本由 [VERSION](VERSION) 和对应的不可变 Git
tag 标识，发布变化记录在 [CHANGELOG.md](CHANGELOG.md)。仓库当前尚未选择许可证；在
明确许可证之前应保持 private。


### 更新维护子技能

`skills/frontend-architect-update` 是独立的维护子技能，可检查版本、从稳定 tag
更新本机安装、识别本地修改并备份回滚。它复用系统 skill-installer，尚未提供独立 CLI。
可显式调用 `$frontend-architect-update`，例如“更新本机 frontend-architect”。
维护子技能独立安装，避免更新主技能时覆盖正在执行的维护流程。

安装更新子技能（与主技能共用发布标签，但使用独立安装目录）：

```bash
python3 ~/.codex/skills/.system/skill-installer/scripts/install-skill-from-github.py \
  --repo hgw25/frontend-architect-skill \
  --path skills/frontend-architect-update \
  --ref v0.3.1 --name frontend-architect-update
```

已存在的安装需先暂存新版、校验并备份旧版，再替换；安装器不会直接覆盖。
当前更新子技能提供代理执行流程，尚无独立 CLI，尚未完成更新/回滚故障注入验证。

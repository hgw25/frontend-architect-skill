结论：采用“独立 WIP 分支保护未提交表单修改 + 每月同步分支合并 upstream + PR 入团队主分支”的方案。不要 rebase 或 reset 已推送的团队分支，也不要直接在脏工作区执行模板同步。

我检查了当前工作区：这里只有 `.frontend-architect` 与最小 Git fixture；本地 `main` 是干净的，且没有配置任何 remote，也没有项目构建/测试文件。因此无法从该工作区确认真实分支名、模板 URL 或具体测试命令。下面以占位符表示这些必须在真实项目中确认的值，不虚构仓库事实。

## 首次同步

### 1. 先保存未提交的表单修改

优先用可审计的临时分支和 WIP 提交，而不是只依赖本地 stash：

```bash
git status --short
git switch -c wip/form-before-template-sync-YYYY-MM

git add -- <本次表单修改涉及的文件>
git diff --cached
git commit -m "wip: preserve form changes before template sync"
```

确认所有需要保留的修改都已提交；尤其检查未跟踪文件是否遗漏：

```bash
git status --short
```

如果团队允许，建议把该 WIP 分支推到 `origin` 作为异地备份：

```bash
git push -u origin wip/form-before-template-sync-YYYY-MM
```

不要使用 `git reset --hard` 或清理命令来获得干净工作区。

### 2. 配置并核实 upstream

```bash
git remote add upstream <团队已确认的模板仓库URL>
git remote -v
git fetch --prune origin
git fetch --prune upstream
git remote show upstream
```

从输出中确认：

- `origin` 仍指向团队 fork。
- `upstream` 指向公司模板。
- 两边真实的默认分支名称。不要未经确认假定都是 `main`。
- upstream 拉取到的是预期模板仓库。

### 3. 从最新团队分支创建同步分支

```bash
git switch -c chore/sync-template-YYYY-MM origin/<团队默认分支>
```

先在尚未合并模板的基线上运行项目已有检查，记录是否本来就有失败：

```bash
<项目已有构建命令>
<项目已有表单回归测试命令>
```

随后查看模板侧将引入的提交和文件变化。双方有共同历史，因此可以正常三方合并：

```bash
git log --oneline --decorate origin/<团队默认分支>..upstream/<模板默认分支>
git diff --stat origin/<团队默认分支>...upstream/<模板默认分支>
```

### 4. 合并模板，不改写团队历史

```bash
git merge --no-ff --no-commit upstream/<模板默认分支>
```

这里明确选择 merge，而不是把团队默认分支 rebase 到 upstream：

- 团队业务提交已经推送，rebase 会改写共享历史。
- merge commit 会准确记录本月同步到哪个 upstream 提交。
- 同步可以通过普通 PR 审查、回退，不需要 force-push。

发生冲突时，不要批量选择 `ours` 或 `theirs`。按文件职责处理：

- 业务组件和表单：保留业务行为，再人工吸收模板修改。
- 构建、Lint、CI 配置：理解模板升级目的，同时保留团队必需的定制项。
- 依赖清单：语义化合并依赖声明。
- 锁文件、生成文件：先解决其源文件，再用项目既有包管理器或生成命令重新生成，避免手工拼接。
- 删除与修改冲突：先判断模板删除是否代表迁移或替代，不能只因业务侧仍有旧文件就机械保留。

检查冲突与最终暂存内容后完成合并：

```bash
git status
git diff --cc
git diff --check
git diff --cached
git commit -m "chore: sync company template YYYY-MM"
```

### 5. 验证并通过 PR 落地

至少运行：

```bash
<项目已有构建命令>
<项目已有表单回归测试命令>
```

表单是当前正在修改且容易受模板升级影响的路径，因此除自动回归外，应重点检查受冲突影响的表单提交、校验、错误反馈和恢复行为。

然后推送同步分支：

```bash
git push -u origin chore/sync-template-YYYY-MM
```

PR 中记录：

- 实际合入的 upstream commit SHA。
- 冲突文件及每处取舍。
- 构建和表单回归的准确命令与结果。
- 尚未验证的部分。
- 是否包含依赖、构建链或运行时要求变化。

PR 通过后再合入团队默认分支，全程不 force-push。

## 恢复并继续表单工作

同步 PR 合入后：

```bash
git fetch origin
git switch wip/form-before-template-sync-YYYY-MM
git rebase origin/<团队默认分支>
```

此处 rebase 只作用于个人 WIP 分支，不改写团队共享分支。若 WIP 分支已有其他协作者，则改用：

```bash
git merge origin/<团队默认分支>
```

解决可能出现的表单冲突，再运行表单回归测试。WIP 提交可以在正式业务 PR 前整理或 squash；没有必要冒险把它恢复成“未提交”状态。

## 回退策略

- 合并尚未提交时发现问题：`git merge --abort`。
- 同步分支尚未进入团队默认分支：修正或关闭该 PR，不影响团队主线。
- 已进入共享分支后发现严重问题：新建回退分支并 `git revert -m 1 <模板同步merge提交>`，通过 PR 回退；不要重置共享分支。
- 表单修改始终保存在独立 WIP 分支，不依赖同步操作是否成功。

## 固化为每月流程

以后每月不再重复添加 remote，只需：

1. 保存或提交当前工作区修改。
2. `fetch --prune` origin 与 upstream。
3. 从最新 `origin/<团队默认分支>` 创建带年月的同步分支。
4. `--no-ff` 合并 upstream 默认分支。
5. 人工处理冲突并重新生成锁文件/生成物。
6. 运行构建与表单回归。
7. PR 合入，并记录 upstream SHA 和验证结果。

这样既保留团队业务提交与未完成表单工作，也让每次模板升级都有清晰来源、审查边界和可恢复路径。
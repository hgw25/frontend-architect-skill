建议采用“独立同步分支 + merge upstream + PR”的月度流程。不要把团队主分支 rebase 到模板上：业务提交已经推送，rebase 会改写共享历史；merge 能保留业务提交，并让下个月只处理新增模板差异。

当前提供的工作区只有 `eval fixture` 提交，没有 remote、前端文件或脚本，工作区也是干净的，与题述项目并非同一快照。因此下面使用 `<team-default>`、`<template-default>` 和项目已有测试命令作为占位，不猜测实际名称。本次没有执行任何 Git 写操作。

## 首次同步

### 1. 先固化未提交的表单修改

推荐放到仅本地存在的临时分支并提交一个 WIP 快照：

```bash
git switch -c wip/form-before-template-2026-10
git add <表单相关文件>
git diff --cached
git commit -m "wip: preserve form changes before template sync"
```

只暂存表单相关路径，不使用宽泛的 `git add -A`。这个 WIP 提交不必推送，之后可以 squash。

如果团队明确不允许 WIP 提交，可使用具名 stash，但应使用 `apply` 而非 `pop`，确认恢复并正式提交后才删除 stash：

```bash
git stash push --include-untracked -m "form WIP before template sync 2026-10"
git stash show --stat stash@{0}
```

### 2. 配置上游并确认分支

```bash
git remote add upstream <团队确认的模板仓库URL>
git config remote.pushDefault origin
git fetch --prune origin
git fetch --prune --tags upstream
git remote show origin
git remote show upstream
git merge-base origin/<team-default> upstream/<template-default>
```

最后一条应返回共同祖先。不要默认两个仓库都叫 `main`，以 `remote show` 的结果为准。

### 3. 在独立 worktree 中同步

这样模板冲突、依赖安装和测试都不会碰到原来的表单工作区：

```bash
git worktree add ../project-template-sync-2026-10 \
  -b sync/template-2026-10 \
  origin/<team-default>
```

进入该 worktree 后，先运行项目现有的构建和表单回归测试，确认同步前基线正常。然后：

```bash
git merge --no-ff --no-commit upstream/<template-default>
```

冲突应逐文件结合共同祖先判断，不能整批选择 `ours` 或 `theirs`：

- 业务页面、表单规则：保留业务语义，同时吸收模板兼容性修改。
- 构建配置：合并模板的新约束，不覆盖业务环境配置。
- 依赖清单：按双方真实意图合并；锁文件使用项目现有包管理器重新生成，不手工拼接。
- 生成文件：修改来源文件后，沿用项目生成流程重新生成。
- 删除/重命名冲突：检查业务调用方后再决定，不能仅恢复旧文件。

如判断本轮同步不应继续：

```bash
git merge --abort
```

### 4. 合并门禁

冲突解决后、创建 merge commit 前，至少执行：

- 项目已有构建命令；
- 项目已有表单回归测试；
- `git diff --check`；
- 必要的表单人工冒烟检查。

随后提交，并验证两个历史都被保留：

```bash
git commit -m "chore: sync upstream template 2026-10"

git merge-base --is-ancestor origin/<team-default> HEAD
git merge-base --is-ancestor upstream/<template-default> HEAD
```

两条命令都应成功。然后只推送到团队 fork：

```bash
git push -u origin sync/template-2026-10
```

通过 PR 合入 `<team-default>`。PR 中记录本次 upstream commit SHA、冲突文件及处理理由、构建和表单回归结果。

## 恢复表单开发

同步 PR 合入后，表单 WIP 分支再吸收最新团队主分支：

```bash
git fetch origin
git switch wip/form-before-template-2026-10
git rebase origin/<team-default>
```

该分支若已经共享给别人，则改用 `merge`，不要 rebase。确认表单修改完整并完成正式提交、推送后，才删除 WIP 分支或备份 stash。

## 每月固定流程

以后每月重复：

1. `fetch origin` 和 `fetch upstream`。
2. 从最新 `origin/<team-default>` 创建当月同步分支。
3. merge 最新 `upstream/<template-default>`，不 rebase 共享主分支。
4. 运行构建与表单回归。
5. PR 记录 upstream SHA 和冲突决策。
6. 合入后删除同步分支。

若同步已进入共享主分支后才发现问题，应新建 PR 对该 merge commit 执行 `git revert -m 1 <merge-sha>`；不要对共享分支使用 force-push 或 `reset --hard`。这种结构同时保护了已推送业务历史、未提交表单修改以及后续每月同步的可追踪性。
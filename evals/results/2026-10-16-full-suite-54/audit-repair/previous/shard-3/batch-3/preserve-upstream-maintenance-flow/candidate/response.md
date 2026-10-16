建议采用“`upstream` 远端 + 每月同步分支 + merge commit”的方案。不要 rebase 已推送的团队分支，也不要 squash 模板同步 PR；这样能保留双方共同历史，后续每月只处理模板新增变化。

先说明核查限制：当前提供的工作区是空夹具，除 `.frontend-architect` 和 `.git` 外没有项目文件；只读检查显示没有远端、工作区干净，和题述实际项目状态不一致。因此下面以题述事实为准，分支名、URL 和测试命令使用占位符，不能据此声称已验证真实项目。

## 首次同步

### 1. 先固化未提交的表单修改

优先使用本地临时分支和提交，而不是只依赖 stash：

```bash
git branch --show-current
git status --short

git switch -c wip/form-before-template-sync-YYYY-MM
git add -- <表单相关文件...>
git commit -m "wip: preserve form changes before template sync"
git rev-parse HEAD
```

记录 WIP commit SHA，并确认没有遗漏相关的未跟踪文件。这个分支暂不推送，也不要在表单修改恢复并验证前删除。

### 2. 配置模板远端

```bash
git remote add upstream <团队确认的模板仓库URL>
git fetch --prune origin
git fetch --prune upstream
git remote show upstream
```

确认 `<team-main>` 和 `<template-main>` 的实际名称。`origin` 始终用于团队 fork，`upstream` 只用于拉取模板。

### 3. 建立同步基线

```bash
git switch <team-main>
git pull --ff-only origin <team-main>
git rev-parse HEAD
```

记录此时的团队基线 SHA。然后先运行项目已有的：

```text
<项目构建命令>
<表单回归测试命令>
```

基线本身若失败，应先记录或修复，避免把旧问题误判为模板同步引入。

### 4. 在独立分支合并模板

```bash
git switch -c chore/template-sync-YYYY-MM origin/<team-main>

git log --left-right --cherry-pick --oneline \
  origin/<team-main>...upstream/<template-main>

git diff --stat \
  origin/<team-main>...upstream/<template-main>

git merge --no-ff --no-commit upstream/<template-main>
```

冲突处理原则：

- 不要对全部冲突统一使用 `ours` 或 `theirs`。
- 业务行为属于要保留的契约；在吸收模板结构、依赖和配置变化的同时重新适配业务代码。
- `package.json` 等清单手工合并意图，锁文件用项目既有包管理器重新生成，不手改。
- 生成文件按项目已有生成流程重建。
- 表单未提交修改此时还安全地留在 WIP 分支，不参与第一轮模板冲突。

合并完成后运行：

```text
git diff --check
<项目构建命令>
<表单回归测试命令>
```

通过后再创建 merge commit：

```bash
git commit -m "chore: sync template through <upstream-sha>"
```

并验证两边历史均未丢失：

```bash
git merge-base --is-ancestor <同步前团队基线SHA> HEAD
git merge-base --is-ancestor <本次upstream SHA> HEAD
```

两条命令都应返回成功。

## 提交和合并策略

推送同步分支并创建 PR：

```bash
git push -u origin chore/template-sync-YYYY-MM
```

PR 必须：

- 采用 merge commit 或保留分支历史的合并方式。
- 禁止 squash 和 rebase merge，否则会丢失 upstream 的祖先关系，后续月份可能重复冲突。
- 记录团队基线 SHA、upstream SHA、冲突文件及处理理由、构建和表单回归结果。
- 通过现有 CI 后再合入团队主分支。
- 禁止对已推送业务分支 force-push。

## 恢复表单修改

模板同步合入后，从最新团队主分支创建正式业务分支，再恢复 WIP：

```bash
git fetch origin
git switch -c feature/form-work origin/<team-main>
git cherry-pick <WIP commit SHA>
```

若模板也改动了表单区域，按新的模板接口重新解决冲突。随后重新执行构建和表单回归，并把正式业务分支推送成功；到此才能删除本地 WIP 分支。

## 回退方案

- merge 尚未提交：`git merge --abort`。
- 同步分支尚未合入：关闭 PR，团队主分支不受影响。
- 已合入团队主分支：通过新 PR revert 对应的 PR merge commit，不重写共享历史、不 force-push。
- 注意：revert merge 只撤销内容，不会删除 upstream 祖先关系。以后重新启用这批模板变化时，需要在修复问题后“revert 该 revert”或提交明确的恢复改动，不能指望下月再次 merge 自动带回。

以后每月重复“fetch → 从最新 `origin/<team-main>` 建同步分支 → merge upstream → 构建及表单回归 → 保留历史的 PR”即可。整个方案的关键是：已推送业务历史不改写、脏工作先落到可寻址的 commit、模板祖先关系持续保留、验证结果绑定到明确 SHA。未对工作区作任何修改，也未执行实际同步操作。
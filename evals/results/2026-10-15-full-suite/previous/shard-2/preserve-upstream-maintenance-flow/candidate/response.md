建议采用“上游合并提交 + 独立同步 PR”的长期方案。不要 rebase 已推送的业务分支，也不要 squash 同步 PR；这样既保留业务提交，又让 Git 记住每次已同步的模板版本，后续每月只合并新增差异。

当前工作区快照只包含 `.frontend-architect` 和空项目提交，`git remote -v` 为空，也没有前端源码或脚本。因此无法核实实际远端地址、分支名和构建命令。下面以用户给定的目标环境为准；尖括号内容需替换为实际值。

## 首次同步

### 1. 先保护未提交的表单修改

不要把 stash 当作唯一备份。将表单修改放到独立 WIP 分支，并备份到团队远端：

```bash
git status --short
git diff
git switch -c wip/form-before-template-2026-10
git add -- <确认属于表单修改的文件>
git diff --cached
git commit -m "wip: preserve form changes before template sync"
git push -u origin HEAD
```

只暂存确认过的表单文件，避免把本地配置、密钥或生成文件一起提交。

随后切回团队长期分支。这个 WIP 分支先不要删除，也不要混入模板同步 PR。

### 2. 配置并核验 upstream

```bash
git switch <团队长期分支>
git remote get-url origin
git remote add upstream <团队确认的模板仓库URL>
git remote get-url upstream
git fetch origin --prune
git fetch upstream --prune
```

确认 `<模板默认分支>` 后，验证双方仍有共同历史：

```bash
git merge-base origin/<团队长期分支> upstream/<模板默认分支>
```

如果没有输出，应停止同步并调查仓库来源；不能使用 `--allow-unrelated-histories` 强行拼接。题设说明存在共同历史，因此正常情况下会得到共同祖先。

### 3. 建立独立同步分支并取得基线

从远端团队分支创建同步分支，避免依赖可能落后的本地分支：

```bash
git switch -c sync/template-2026-10 origin/<团队长期分支>
```

先运行项目已有的构建和表单回归命令，记录同步前基线。具体脚本在当前快照中不可见，不能据此假设为 `npm run build` 或某个固定测试命令。

### 4. 合并模板，不重写业务历史

```bash
git merge --no-ff --no-commit upstream/<模板默认分支>
```

选择 merge 的原因：

- 已推送的业务提交保持原 SHA 和祖先关系；
- 模板提交也保留原历史；
- 合并提交的第二父提交明确记录本次模板版本；
- 下个月再次 merge 时，Git 只处理新的模板变化。

解决冲突时逐项理解双方意图，不能整仓使用 `ours` 或 `theirs`：

- 业务页面和表单：保留业务行为，同时吸收模板的安全修复、API 或结构变化。
- `package.json` 等清单：先合并实际依赖意图。
- 锁文件：按项目固定的包管理器重新生成，不手工拼接冲突段。
- 生成文件：修改其来源后，使用项目原有生成流程重新生成。
- 构建、Lint、TypeScript 配置：核对模板新要求与业务自定义，而不是默认保留任一侧。

完成冲突处理后：

```bash
git diff --check
git status
```

运行同步前使用的同一套构建和表单回归测试。通过后再创建合并提交：

```bash
git commit -m "chore: sync upstream template 2026-10"
git push -u origin sync/template-2026-10
```

## PR 合入要求

同步 PR 应记录：

- 模板远端、分支及本次合入的 upstream commit SHA；
- 同步前后实际运行的构建与表单回归命令及结果；
- 每个重要冲突的处理理由；
- 模板带来的运行时、依赖或迁移要求。

该 PR 必须以普通 merge commit 合入团队长期分支，不能 squash 或 rebase merge。否则 upstream 的父子关系会丢失，后续月度同步容易重复引入改动或产生无意义冲突。

合并前还应验证同步分支包含原团队分支：

```bash
git merge-base --is-ancestor origin/<团队长期分支> sync/template-2026-10
```

退出码为 `0` 才说明同步分支没有丢掉已推送业务历史。

## 恢复表单开发

模板同步合入后，从更新后的团队分支新建正式功能分支，再重放 WIP 提交：

```bash
git fetch origin --prune
git switch -c feature/form-after-template origin/<团队长期分支>
git cherry-pick <WIP表单提交SHA>
```

若表单与模板发生冲突，在这个功能分支解决，并再次运行表单回归和构建。表单 PR 合入后，才删除本地及远端 WIP 分支。这样无需 force-push，也不会把未完成表单代码混进模板同步 PR。

## 后续每月流程

以后每月重复：

1. `fetch` 两个远端。
2. 从最新 `origin/<团队长期分支>` 创建当月 `sync/template-YYYY-MM`。
3. 先跑基线检查。
4. `git merge --no-ff --no-commit upstream/<模板默认分支>`。
5. 审核模板变更、处理冲突、运行构建和表单回归。
6. 创建保留 merge commit 的独立 PR。
7. 发现上线问题时，用 `git revert -m 1 <同步合并提交>` 回滚，不 reset、不 force-push 共享分支。

本方案受本地 Frontend Architect 指引中的可恢复迁移和真实契约验证原则影响：模板历史、业务历史和未提交工作分别有明确归属，且每次同步都有可重复的构建及表单验证路径。未执行任何改变仓库状态的命令，也未修改任何文件。
建议保留通用提示接口，并增加一个语义明确、参数固定的保存成功方法：

```ts
type NoticeTone = 'positive' | 'neutral' | 'warning' | 'critical'
type NoticeRole = 'status' | 'alert'

interface NoticeOptions {
  tone: NoticeTone
  role: NoticeRole
  duration: number
}

interface Notices {
  show(message: string, options: NoticeOptions): void

  /** 仅用于成功完成保存：positive / status / 3000 */
  saveSucceeded(message?: string): void
}

function createNotices(show: Notices['show']): Notices {
  return {
    show,

    saveSucceeded(message = '保存成功') {
      show(message, {
        tone: 'positive',
        role: 'status',
        duration: 3000,
      })
    },
  }
}
```

两个保存按钮在保存操作真正成功后调用：

```ts
async function handleProfileSave() {
  await saveProfile()
  notices.saveSucceeded('个人资料已保存')
}

async function handleSettingsSave() {
  await saveSettings()
  notices.saveSucceeded('设置已保存')
}
```

其他提示继续完整表达自身语义：

```ts
notices.show('保存失败，请重试', {
  tone: 'critical',
  role: 'alert',
  duration: 0,
})
```

关键决策：

- 使用 `saveSucceeded`，而不是泛化的 `success`，避免把所有正向提示错误地绑定到保存规则。
- `saveSucceeded` 不接受参数覆盖，确保所有保存成功提示始终遵守 `positive / status / 3000`。
- 保留 `show` 作为窄而明确的通用入口，不需要为每种提示建立大量快捷方法。
- 提示层不负责执行保存，只在 `await` 成功后调用，职责和错误路径保持清晰。

当前仓库没有项目源码、包配置或两个按钮的实现，因此未修改文件，也无法接入具体调用位置；以上接口可按现有提示组件的消息参数形式直接适配。
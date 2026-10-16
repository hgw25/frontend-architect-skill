建议在底层提示接口上增加一个语义化便利方法 `saved`，同时保留完整的 `show` 接口：

```ts
type PromptOptions = Pick<
  PromptProps,
  'tone' | 'role' | 'duration'
>

type ShowPrompt = (
  message: string,
  options: PromptOptions,
) => void

export interface PromptApi {
  show(message: string, options: PromptOptions): void
  saved(message?: string): void
}

export function createPromptApi(showPrompt: ShowPrompt): PromptApi {
  return {
    show: showPrompt,

    saved(message = '保存成功') {
      showPrompt(message, {
        tone: 'positive',
        role: 'status',
        duration: 3000,
      })
    },
  }
}
```

两个保存按钮只表达业务结果：

```ts
await saveProfile()
prompt.saved()

await saveSettings()
prompt.saved('设置已保存')
```

其他提示仍显式表达各自语义：

```ts
prompt.show(message, {
  tone,
  role,
  duration,
})
```

关键决策：

- 使用 `saved`，而不是宽泛的 `success`，避免误把所有 positive 提示都固定成同一套参数。
- `saved` 不开放参数覆盖，确保“保存成功始终是 `positive/status/3000`”这一规则不会被调用方破坏。
- 保留 `show` 作为窄而完整的通用出口，不需要预设注册表、重载或完整组件改造。
- 将来保存提示的时长或无障碍语义变化，只需修改 `saved` 一处。

当前仓库没有项目源码或既有调用点，因此未创建虚构目录或示例文件，工作树保持不变。
建议保留通用提示接口，并增加一个语义化的保存成功入口：

```ts
type PromptOptions = {
  tone: Tone
  role: PromptRole
  duration: number
}

export const prompt = {
  show(content: PromptContent, options: PromptOptions) {
    return showPrompt(content, options)
  },

  saved(content: PromptContent = '保存成功') {
    return showPrompt(content, {
      tone: 'positive',
      role: 'status',
      duration: 3000,
    })
  },
}
```

两个保存按钮只表达业务意图：

```ts
await saveProfile()
prompt.saved('个人资料已保存')

await savePreferences()
prompt.saved('偏好设置已保存')
```

其他提示仍显式表达自身语义：

```ts
prompt.show('保存失败，请重试', {
  tone: 'critical',
  role: 'alert',
  duration: 5000,
})
```

关键决策：

- `saved()` 不接受 `tone`、`role`、`duration` 覆盖，保证所有保存成功提示始终符合约定。
- `show()` 保留完整能力，不把其他提示强行塞进保存成功的默认值。
- 固定参数留在封装内部，避免调用方通过展开对象意外覆盖。
- 暂不建设预设注册表；以后若出现稳定且重复的语义，可并列增加 `prompt.deleted()` 等入口。

工作区没有产品源码，且本次不要求完整实现，因此未修改文件或运行应用测试。
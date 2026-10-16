建议在通用提示接口上增加一个语义化预设 `saved`，不要把保存场景的参数设为组件全局默认值：

```ts
type PromptOptions = Pick<
  PromptProps,
  'tone' | 'role' | 'duration'
>

type ShowPrompt = (
  message: string,
  options: PromptOptions,
) => void

const savedOptions = {
  tone: 'positive',
  role: 'status',
  duration: 3000,
} satisfies PromptOptions

export function createPromptActions(show: ShowPrompt) {
  return {
    show,

    saved(message = '保存成功') {
      show(message, savedOptions)
    },
  }
}
```

两个保存按钮统一调用：

```ts
prompt.saved()
prompt.saved('设置已保存')
```

其他提示仍使用完整接口：

```ts
prompt.show(message, {
  tone,
  role,
  duration,
})
```

这样设计的关键点：

- `saved` 表达业务语义，并强制三个参数保持一致，调用方不能意外覆盖。
- `show` 保留完整表达能力，不把所有提示误导为保存成功语义。
- 不建议使用泛化的 `success()`：成功提示未必都应该采用 `status + 3000`。
- 不建议提供三个位置参数，容易写错顺序，也会让调用方重复保存策略。

仓库实际为空，没有可修改的组件或按钮文件，因此未虚构框架代码，也没有执行构建测试。本地 Skill 的 API 设计原则促成了“常用语义预设 + 窄通用出口”的方案。
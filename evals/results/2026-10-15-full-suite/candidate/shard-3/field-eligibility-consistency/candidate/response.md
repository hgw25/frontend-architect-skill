## 评审结论

**中等严重度：disabled 字段仍会执行自定义校验。**

第二个循环只判断了 `field.validate`：

```js
fields.filter(field => field.validate)
```

因此 disabled 字段的校验器仍会运行。它返回错误或抛出异常时，会阻止 `send`，直接违反“disabled 字段不参与校验和提交”的契约。

建议只派生一次可用字段，供所有相关路径复用：

```js
async function processForm(fields, values, send) {
  const enabledFields = fields.filter(field => !field.disabled);
  const errors = {};

  for (const field of enabledFields) {
    if (field.required && !values[field.name]) {
      errors[field.name] = 'Required';
    }
  }

  for (const field of enabledFields) {
    if (!field.validate) continue;

    const error = await field.validate(values[field.name], values);
    if (error) errors[field.name] = error;
  }

  if (Object.keys(errors).length) return { errors };

  const payload = Object.fromEntries(
    enabledFields.map(field => [field.name, values[field.name]])
  );

  return send(payload);
}
```

这不是规则引擎，只是让必填校验、自定义校验和提交共享同一个资格判断。保留传给校验器的完整 `values`，避免未经契约支持就改变现有跨字段校验接口。

建议增加两个回归测试：

```js
it('skips validation and submission for disabled fields', async () => {
  const validateDisabled = vi.fn(() => 'Invalid');
  const send = vi.fn(payload => payload);

  const result = await processForm(
    [
      {
        name: 'archived',
        disabled: true,
        required: true,
        validate: validateDisabled,
      },
      { name: 'email', required: true },
    ],
    {
      archived: 'stale',
      email: 'a@example.com',
    },
    send,
  );

  expect(validateDisabled).not.toHaveBeenCalled();
  expect(send).toHaveBeenCalledWith({ email: 'a@example.com' });
  expect(result).toEqual({ email: 'a@example.com' });
});

it('still validates enabled fields and blocks submission', async () => {
  const validate = vi.fn(() => 'Invalid email');
  const send = vi.fn();

  const result = await processForm(
    [{ name: 'email', validate }],
    { email: 'bad' },
    send,
  );

  expect(validate).toHaveBeenCalledWith('bad', { email: 'bad' });
  expect(result).toEqual({ errors: { email: 'Invalid email' } });
  expect(send).not.toHaveBeenCalled();
});
```

没有足够契约证明 `!values[field.name]` 对 `0` 或 `false` 的处理有误，因此不建议在本次修复中顺手改变。

工作区没有业务源码或测试配置，只有不可修改的 Skill 文件，所以未落盘修改。已用 Node 断言复现：原逻辑会运行 disabled 校验器并阻止提交；上述修复会跳过它并只提交 enabled 字段。
## 评审结论

高优先级缺陷：disabled 资格规则没有贯穿所有路径。

提供片段第 6 行只按 `field.validate` 过滤，因此 disabled 字段的自定义校验仍会执行。它可能产生错误、触发副作用，甚至阻止整个表单提交。

此外，启用字段的校验器收到完整 `values`，disabled 字段仍可能影响跨字段校验。按“disabled 字段不参与校验”的契约，也应从校验上下文中剔除。

建议将字段资格计算一次，并复用于必填校验、自定义校验和提交：

```js
async function processForm(fields, values, send) {
  const enabledFields = fields.filter(field => !field.disabled);
  const enabledValues = Object.fromEntries(
    enabledFields.map(field => [field.name, values[field.name]])
  );

  const errors = {};

  for (const field of enabledFields) {
    if (field.required && !enabledValues[field.name]) {
      errors[field.name] = 'Required';
    }
  }

  for (const field of enabledFields) {
    if (!field.validate) continue;

    const error = await field.validate(
      enabledValues[field.name],
      enabledValues
    );

    if (error) errors[field.name] = error;
  }

  if (Object.keys(errors).length) return { errors };
  return send(enabledValues);
}
```

这不是规则引擎，只是让一个明确的不变量拥有单一计算点。以后字段的 disabled 状态变化，只需维护这一处资格判断。

建议覆盖三个行为测试：

1. disabled 字段即使 `required: true` 且校验器返回错误，也不调用校验器、不产生错误，并且不进入 payload。
2. 启用字段的跨字段校验上下文不包含 disabled 字段。
3. 启用字段校验失败时仍返回错误且不调用 `send`，防止修复时误跳过全部自定义校验。

示例断言：

```js
it('完全排除 disabled 字段', async () => {
  const disabledValidate = vi.fn().mockResolvedValue('Invalid');
  const send = vi.fn().mockResolvedValue('sent');

  const result = await processForm(
    [
      {
        name: 'legacyCode',
        disabled: true,
        required: true,
        validate: disabledValidate,
      },
      { name: 'email' },
    ],
    { legacyCode: '', email: 'a@example.com' },
    send
  );

  expect(disabledValidate).not.toHaveBeenCalled();
  expect(send).toHaveBeenCalledWith({ email: 'a@example.com' });
  expect(result).toBe('sent');
});

it('不向跨字段校验暴露 disabled 值', async () => {
  const validate = vi.fn().mockResolvedValue(undefined);
  const send = vi.fn();

  await processForm(
    [
      { name: 'obsolete', disabled: true },
      { name: 'current', validate },
    ],
    { obsolete: 'stale', current: 'valid' },
    send
  );

  expect(validate).toHaveBeenCalledWith(
    'valid',
    { current: 'valid' }
  );
});

it('启用字段校验失败时阻止提交', async () => {
  const send = vi.fn();

  const result = await processForm(
    [{
      name: 'email',
      validate: async () => 'Invalid email',
    }],
    { email: 'bad' },
    send
  );

  expect(result).toEqual({
    errors: { email: 'Invalid email' },
  });
  expect(send).not.toHaveBeenCalled();
});
```

我没有改动工作区：其中只有任务 Skill 和 Git 元数据，没有项目源码、测试框架或可执行验证命令。`!value` 对 `0`、`false` 的处理可能值得另行确认，但现有字段类型契约不足，不能据此认定为本次缺陷。
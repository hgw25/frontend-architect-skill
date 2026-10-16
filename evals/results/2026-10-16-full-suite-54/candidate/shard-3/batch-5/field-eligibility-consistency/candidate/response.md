## 评审结论

存在一处明确的契约缺陷，并有两个表现：

1. 自定义校验循环只判断 `field.validate`，没有排除 `disabled`。禁用字段仍会执行校验，可能产生错误、抛异常或产生副作用，最终阻止提交。
2. 启用字段的校验器收到完整的 `values`，其中仍包含禁用字段。跨字段校验仍可能依赖禁用值，这也属于“参与校验”。

required 校验和 payload 构造已经正确过滤了禁用字段。

## 小范围修复

一次计算可参与处理的字段和值，让 required、自定义校验和提交共享同一边界，无需规则引擎：

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

这样以后字段是否可参与处理的条件发生小幅变化，只需要修改 `enabledFields` 的定义，不会再次出现三条路径规则不一致。

## 建议测试

以 Vitest/Jest 为例：

```js
it('does not validate or submit disabled fields', async () => {
  const disabledValidate = vi.fn(async () => 'Invalid');
  const send = vi.fn(async payload => payload);

  await processForm(
    [
      { name: 'email', required: true },
      {
        name: 'legacyCode',
        disabled: true,
        required: true,
        validate: disabledValidate,
      },
    ],
    {
      email: 'user@example.com',
      legacyCode: '',
    },
    send
  );

  expect(disabledValidate).not.toHaveBeenCalled();
  expect(send).toHaveBeenCalledWith({
    email: 'user@example.com',
  });
});
```

```js
it('does not expose disabled values to cross-field validation', async () => {
  const validate = vi.fn(async (_value, validationValues) => {
    return Object.hasOwn(validationValues, 'legacyCode')
      ? 'Disabled value leaked'
      : undefined;
  });
  const send = vi.fn(async payload => payload);

  await processForm(
    [
      { name: 'email', validate },
      { name: 'legacyCode', disabled: true },
    ],
    {
      email: 'user@example.com',
      legacyCode: 'secret',
    },
    send
  );

  expect(validate).toHaveBeenCalledWith(
    'user@example.com',
    { email: 'user@example.com' }
  );
  expect(send).toHaveBeenCalledWith({
    email: 'user@example.com',
  });
});
```

```js
it('still blocks submission when an enabled field fails validation', async () => {
  const send = vi.fn();

  const result = await processForm(
    [{
      name: 'email',
      validate: async () => 'Invalid email',
    }],
    { email: 'invalid' },
    send
  );

  expect(result).toEqual({
    errors: { email: 'Invalid email' },
  });
  expect(send).not.toHaveBeenCalled();
});
```

`!enabledValues[field.name]` 是否应把 `0`、`false` 视为缺失，取决于 required 的领域定义；题目没有提供该契约，因此不将它认定为本次缺陷。

工作区没有可修改的实现或测试文件，所以以上是针对给定 artifact 的具体补丁方案，未执行测试。
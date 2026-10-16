结论：当前实现不应进入前端基础库。更进一步，在没有明确消费者和兼容性需求前，不建议自建 `groupBy`；现代运行环境优先直接使用 `Object.groupBy` 或 `Map.groupBy`。

工作区没有项目源码、包配置或调用方，因此无法证明存在共享基础设施需求，也无法确认具体浏览器、Node 与 TypeScript 支持范围。

## 阻断入库的正确性问题

1. 原型链键会直接导致运行时错误

`result` 是普通对象，`result[key]` 会读取继承属性。以下合法业务键都会命中 `Object.prototype`：

```js
groupBy(['constructor'], value => value)
groupBy(['toString'], value => value)
groupBy(['__proto__'], value => value)
```

实测均抛出：

```text
TypeError: result[key].push is not a function
```

即使是空结果，`result.constructor` 也不是 `undefined`，这已经破坏“缺失分组返回空值”的直觉契约。这里不能仅用 `hasOwnProperty` 修补；对象累加器至少应使用 null prototype，并采用安全的自有属性策略。

2. 键的身份语义没有定义

对象属性会执行属性键转换：

```js
groupBy(['number', 'string'], (_, index) => index === 0 ? 1 : '1')
// 两项落入同一个 "1" 分组
```

普通对象也会把不同对象键转换成类似 `"[object Object]"` 的字符串。若调用方期待对象身份、数字和字符串严格区分，这个 API 会静默产生错误结果，应使用 `Map`。

3. 非法 selector 的行为取决于输入是否为空

```js
groupBy([], null) // 返回 {}
groupBy([1], null) // 抛错
```

公共 JavaScript API 应在迭代前验证 selector，使错误稳定、可诊断，而不是由数据量决定。

## API 设计问题

- `generateKey` 同时接收函数或属性名，并在函数内部被重新赋值。一个一行 lambda 已能表达属性访问，这个重载增加了类型推导、文档和测试成本。
- 属性名简写只接受字符串，不自然地排除了 symbol 属性名；若补齐 `keyof T` 和返回键约束，类型会继续复杂化。
- callback 的第三个参数 `items` 不是现代原生 `groupBy` 的契约。对于 generator 等一次性 iterable，callback 再次访问它甚至可能消费剩余数据。
- 返回对象的类型不能写成普通的 `Record<K, T[]>`，因为分组可能不存在；至少应是 `Partial<Record<K, T[]>>`。
- 结果中的数组可变，元素仍是原对象引用；如果成为公共 API，需要明确这一点。
- 分组内项目保持输入顺序，但对象的整数型属性枚举顺序不是首次出现顺序。若调用方依赖分组创建顺序，应使用 `Map`。
- symbol 分组不会出现在 `Object.keys()` 或 JSON 序列化结果中，也必须作为契约说明。

## 建议的决策

根据目标环境分三种处理：

1. 支持现代原生 API：不要封装。

```js
const byStatus = Object.groupBy(items, item => item.status)
const byOwner = Map.groupBy(items, item => item.owner)
```

- `Object.groupBy`：适合属性键；接受对象键转换语义，返回 null-prototype 对象。
- `Map.groupBy`：适合对象身份、任意类型键及稳定的首次分组顺序。

2. 目标环境不支持：优先采用项目现有 polyfill 策略。注意构建转译通常不会自动补齐运行时 API。

3. 确实需要本地兼容实现：做成与标准语义对齐、名字明确的窄实现，不保留字符串重载和第三个 callback 参数。例如：

```js
export function groupByObject(items, keyOf) {
  if (typeof keyOf !== 'function') {
    throw new TypeError('keyOf must be a function')
  }

  const groups = Object.create(null)
  let index = 0

  for (const item of items) {
    const rawKey = keyOf(item, index++)
    const key = typeof rawKey === 'symbol' ? rawKey : String(rawKey)
    const group = groups[key]

    if (group === undefined) groups[key] = [item]
    else group.push(item)
  }

  return groups
}
```

但这只应作为目标环境兼容层，而不是因为代码短就升级成通用工具。

入库前最低验证应覆盖 `constructor`、`toString`、`__proto__`、symbol、数字/字符串碰撞、一次性 iterable、callback 索引、非法 selector，以及 TypeScript 的缺失分组类型；若作为独立包发布，还要通过公共入口验证声明文件和实际构建产物。

本次按本地 Skill 的公共基础设施契约进行评审，而不是只比较循环写法。已通过 Node 用例验证上述原型键崩溃、键转换碰撞和空输入验证不一致；未修改任何文件。
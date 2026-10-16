## 结论

当前实现不应原样进入前端基础库。更合适的决策是：

1. 目标运行环境支持时，直接使用 `Object.groupBy()` 或 `Map.groupBy()`。
2. 只有存在明确的兼容性缺口和多个真实消费者时，才提供一个标准语义的兼容层。
3. 不保留字符串属性名重载；调用方使用显式 selector。

仓库中没有项目代码、依赖、浏览器矩阵或调用方，现有证据不足以证明需要维护一个新的公共工具。

## 主要问题

### 高：特殊键会直接导致运行时异常

`result` 继承自 `Object.prototype`，而代码用真值判断区分分组是否存在：

```js
if (result[key]) result[key].push(item)
```

这些合法分组键都会命中继承属性：

```js
groupBy([1], () => 'constructor')
groupBy([1], () => 'toString')
groupBy([1], () => '__proto__')
```

实际运行均抛出：

```text
TypeError: result[key].push is not a function
```

这不是理论上的“原型污染防护”，而是普通输入即可触发的正确性缺陷。仅改成 `Object.hasOwn()` 也不够：给普通对象的 `__proto__` 赋值仍有特殊语义。对象结果必须使用 null prototype，或者直接采用标准 `Object.groupBy()`。

### 中：没有定义键的语义

对象属性访问会执行键转换，因此这些值会落入同一组：

```js
1
'1'
```

不同对象通常也会一起变成 `"[object Object]"`。如果调用方需要对象身份、类型区别或严格的插入顺序，应返回 `Map`，而不是对象。

此外，对象的整数形式属性按数字顺序枚举，而不是首次出现顺序。实际输入先产生 `2`、后产生 `1`，`Object.keys(result)` 仍得到 `['1', '2']`。

因此公共 API 必须明确分成两种契约：

- `Object.groupBy`：键是 `PropertyKey`，允许属性键转换。
- `Map.groupBy`：键保持原值和对象身份。

不应由一个模糊的 `groupBy` 猜测调用方想要哪一种。

### 中：字符串重载收益不足，增加了公共契约复杂度

```js
groupBy(users, 'department')
```

看似方便，但带来了：

- 字符串究竟是 selector 还是属性名的运行时分派；
- TypeScript 中 `keyof T`、可选字段、symbol/number 属性和返回键类型的复杂重载；
- 对 `null`、`undefined` 元素以及继承属性读取语义不明确；
- 重命名和复杂取值不如显式回调清楚；
- 函数内部还会重新赋值参数，使入口契约更难追踪。

推荐调用方式更明确：

```js
Object.groupBy(users, user => user.department)
```

只有大量已验证调用点确实以简单字段分组，并且这个简写显著改善使用体验时，才值得单独设计，例如命名为 `groupByProperty`，而不是塞入类型重载。

### 中：callback 契约偏离标准且与 Iterable 不协调

当前回调收到：

```js
generateKey(item, index, items)
```

但 `items` 实际接受任意 iterable，可能是 `Set` 或一次性 generator，而不一定是数组。把整个 iterable 暴露给回调：

- 鼓励回调重新遍历或修改输入；
- 对一次性迭代器尤其容易产生意外行为；
- 与标准 `Object.groupBy` / `Map.groupBy` 的 `(item, index)` 契约不同；
- 增加以后迁移到标准 API 的成本。

建议只传 `item` 和 `index`。

### 中：返回类型必须表达“分组可能不存在”

若进入 TypeScript 基础库，对象版本不能返回：

```ts
Record<K, T[]>
```

因为并非每个可能的键都存在。更准确的是：

```ts
Partial<Record<K, T[]>>
```

并限制：

```ts
K extends PropertyKey
```

如果 selector 可以返回任意类型，应返回 `Map<K, T[]>`。

### 低：当前名称隐藏了重要选择

`groupBy` 没有告诉调用方结果是对象还是 `Map`、键是否转换、分组顺序如何体现。基础库 API 应使这项选择可见，而不是靠文档补救。

## 推荐方案

优先直接使用平台 API：

```ts
const byDepartment = Object.groupBy(
  users,
  user => user.department,
)

const byOwner = Map.groupBy(
  tasks,
  task => task.owner,
)
```

采用前应按项目实际 `browserslist`、Node/SSR、WebView 和小程序运行时检查兼容性。TypeScript 能通过类型检查不代表运行时一定存在该 API，转译也不一定自动补齐 polyfill。

如果项目确实需要本地兼容实现，对象版本至少应收窄为：

```ts
export function groupByProperty<T, K extends PropertyKey>(
  items: Iterable<T>,
  keyOf: (item: T, index: number) => K,
): Partial<Record<K, T[]>> {
  const groups: Partial<Record<K, T[]>> = Object.create(null)
  let index = 0

  for (const item of items) {
    const key = keyOf(item, index++)
    const group = groups[key]

    if (group === undefined) {
      groups[key] = [item]
    } else {
      group.push(item)
    }
  }

  return groups
}
```

需要注意，null-prototype 对象没有 `hasOwnProperty` 等继承方法，这是标准 `Object.groupBy()` 同样具有的可观察行为，应作为返回契约说明，而不是偷偷包装回普通对象。

## 入库前最低验证

如果最终决定提供兼容层，测试应覆盖公共语义，而非循环写法：

- 空 iterable、generator 和 callback index；
- 同组元素保持输入顺序；
- `constructor`、`toString`、`__proto__`；
- symbol 键；
- 对象版本中 `1` 与 `'1'` 的键转换；
- Map 版本中的对象身份和不同类型键；
- 类型测试确认缺失分组可能为 `undefined`；
- 通过基础库公开入口验证构建产物与声明文件。

综合判断：这段代码暴露了真实正确性缺陷，也没有证明自研公共抽象的必要性。应先选择标准的对象或 Map 语义，再根据项目兼容矩阵决定直接使用、按需 polyfill，还是维护一个窄兼容层。
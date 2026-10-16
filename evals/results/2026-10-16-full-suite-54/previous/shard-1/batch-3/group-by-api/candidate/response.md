## 结论

**不建议将当前实现直接纳入前端基础库。**

它存在可稳定复现的正确性缺陷，而且公共 API 同时混合了两种不同的分组语义。现代运行环境优先使用 `Object.groupBy()` 或 `Map.groupBy()`；只有明确的兼容性要求或跨项目统一语义，才值得维护自定义封装。

当前工作区没有提供实际调用方、浏览器兼容矩阵或现有基础库代码，因此也没有足够证据证明需要新增公共抽象。

## 阻断入库的问题

### 1. 普通对象会与原型属性碰撞

```js
groupBy([1], () => 'constructor')
groupBy([1], () => 'toString')
groupBy([1], () => '__proto__')
```

三种情况都会抛出类似错误：

```text
TypeError: result[key].push is not a function
```

`result[key]` 会先读到 `Object.prototype` 上的值，代码却把它当作已存在的数组。

这不是把判断改成 `Object.hasOwn(result, key)` 就完全解决了：在普通 `{}` 上给 `__proto__` 赋值还涉及特殊 setter。对象型实现应同时采用：

- `Object.create(null)`
- own-property-safe 或明确检查 `undefined` 的写入策略

### 2. 任意返回值会被静默强制转换成对象属性键

```js
const a = {}
const b = {}

groupBy([a, b], item => item)
```

两个不同对象都会落入 `"[object Object]"` 分组。类似地，`null` 与 `"null"`、数字 `1` 与字符串 `"1"` 也可能合并。

因此必须明确二选一：

- 只接受属性键，返回对象；
- 接受任意键并保留对象身份，返回 `Map`。

当前 API 没有表达这条关键合同。

### 3. 对象结果不能保证所有分组按首次出现顺序枚举

数字形式的属性名遵循对象属性枚举规则：

```js
groupBy(['ten', 'two'], item => item === 'ten' ? 10 : 2)
// Object.keys(...) => ['2', '10']
```

组内元素顺序可以保留，但组本身不一定按首次出现顺序枚举。若顺序或键身份重要，应使用 `Map.groupBy()`。

## API 设计问题

- `generateKey` 有时是函数、有时是字符串，名称和行为不一致，也增加 TypeScript overload、类型推断和文档成本。
- 函数参数被从字符串重新赋值为函数，增加阅读和调试负担。
- 字符串快捷方式只支持字符串属性，不能自然覆盖 `symbol`、数字键或嵌套路径。`item => item.status` 已足够清晰且更容易正确推断类型。
- 回调第三个参数传入 `items` 不建议保留。该函数通过 `for...of` 接受的实际上是 `Iterable`，可能是 `Set` 或一次性 generator；把它作为“数组式第三参数”暴露会诱导调用者使用索引、`length` 或重复遍历，并且与原生 `groupBy` API 不一致。
- 返回值合同没有说明原型、键转换、symbol 键、JSON 序列化和可变性。
- `if (result[key])` 本身不会遇到“空数组为假”的问题，因为内部创建的数组始终 truthy；真正的问题是把继承属性误判成分组。评审不应把它泛化成普通的 truthiness bug。

## 推荐方案

优先直接选择与业务语义匹配的原生 API：

```js
const groups = Object.groupBy(items, (item, index) => item.status)
```

适用于键是属性键、消费者希望通过对象属性访问的情况。

```js
const groups = Map.groupBy(items, item => item.owner)
```

适用于对象键、引用身份、无强制字符串转换或严格首次出现顺序。

是否能直接使用，应由项目声明的浏览器、SSR/Node 版本和现有 polyfill 流程决定。当前本地 Node `v22.22.2` 已提供两者，但这不能证明目标浏览器兼容。

如果兼容矩阵确实要求自定义对象型 fallback，建议只提供单一 callback API，并用 TypeScript 准确表达约束：

```ts
export function groupBy<T, K extends PropertyKey>(
  items: Iterable<T>,
  keyOf: (item: T, index: number) => K,
): Partial<Record<K, T[]>> {
  const groups = Object.create(null) as Record<
    PropertyKey,
    T[] | undefined
  >

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

  return groups as Partial<Record<K, T[]>>
}
```

这里的 `Partial` 很重要：即使 `K` 是字面量联合类型，也不能保证每个可能分组实际存在。

## 入库前最低验证范围

- 空输入、重复键和组内顺序；
- `constructor`、`toString`、`__proto__`；
- 字符串、数字形式和 symbol 键；
- selector 调用次数及连续 index；
- `Map` 版本的对象身份；
- 类型测试：拒绝非属性键、访问结果时体现分组可能不存在；
- 从包的公共入口导入测试，而不只测试内部文件。

最终建议是：**拒绝当前实现；优先使用平台 API。只有兼容策略和真实消费者证明有必要时，才引入 callback-only、语义明确的薄封装。** 本次为评审，没有修改文件。
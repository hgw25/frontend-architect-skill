## 结论

**不建议把这段实现原样放入前端基础库，也暂时没有足够证据需要自研一个通用 `groupBy`。**

它存在可稳定复现的正确性缺陷；同时没有定义返回结构、键语义、顺序和兼容范围。现代环境应优先在调用处选择 `Object.groupBy()` 或 `Map.groupBy()`。只有目标运行时不支持、且项目确有多个语义一致的消费者时，才值得提供兼容实现或统一垫片。

仓库中没有源码、包清单、调用方或浏览器支持矩阵，因此目前无法证明基础库抽象的实际消费者与兼容需求。

## 阻断问题

### 1. 普通对象会与原型属性冲突

```js
if (result[key]) result[key].push(item)
```

`result` 继承 `Object.prototype`。当键为 `constructor`、`toString` 或 `__proto__` 时，读到的不是分组数组，而是继承属性，随后调用 `.push()` 会抛出异常。

我在仓库当前 Node v22.22.2 环境中执行了原实现，三个键都会得到：

```text
TypeError: result[key].push is not a function
```

这不是罕见的纯理论输入：按对象字段分组时，后端数据、标签或用户输入完全可能出现这些字符串。它至少是可靠性问题；若键来自外部输入，还可以造成可控异常。

仅改成 `key in result` 或 `hasOwnProperty` 不足以完整处理 `__proto__`。对象型结果应使用 null prototype，并采用 own-property-safe 的写入策略。原生 `Object.groupBy()` 已经返回 null-prototype 对象。

### 2. 键被隐式转换，可能无声合并不同分组

对象属性只能使用字符串或 Symbol。选择器返回其他值时会发生强制转换：

```js
1       // "1"
"1"     // "1"

{ a: 1 } // "[object Object]"
{ b: 2 } // "[object Object]"
```

原实现会把上述不同值合并。实测结果包括：

```js
{ "1": ["number", "string"] }
{ "[object Object]": ["left", "right"] }
```

如果调用者需要对象身份、数字与字符串的区分，正确返回类型应是 `Map`，不能把这种合并留作未声明的偶然行为。

## API 设计问题

### 3. 一个参数承担两种完全不同的协议

`generateKey` 既可以是函数，也可以是字符串属性名：

```js
groupBy(items, item => item.status)
groupBy(items, "status")
```

这会带来几个问题：

- 参数名声称它是函数，但运行时又把字符串解释成属性名。
- JavaScript 调用者传入其他错误值时，报错时机取决于集合是否为空：`groupBy([], null)` 会静默成功，非空输入才抛错。
- TypeScript 类型会变成回调与属性名的重载；还要表达属性值是否可作为对象键。
- 字符串捷径排除了 Symbol 属性名。
- 属性名拼错时，所有项目会被静默归入 `"undefined"` 分组。

除非真实调用点证明属性名简写明显降低了使用成本，否则保留单一回调接口更清楚：

```ts
groupBy(items, item => item.status)
```

若简写确有独立价值，应使用单独命名的函数，例如 `groupByProperty`，而不是在一个参数里做运行时分派。

### 4. 回调的第三个参数扩大了契约

```js
generateKey(item, index, items)
```

`items` 可能是数组、Set、生成器或一次性迭代器。把正在遍历的输入暴露给回调：

- 鼓励回调依赖或修改遍历源；
- 对生成器而言几乎没有稳定、通用的集合语义；
- 与现代原生 `Object.groupBy`/`Map.groupBy` 的 `(element, index)` 回调形状不一致。

建议只传 `item` 和 `index`。如果分组依赖整个集合，通常已经不是普通 `groupBy`，应由调用方显式建模。

### 5. 返回契约没有确定

进入基础库前至少要明确：

- 返回 `Object` 还是 `Map`；
- 键是否允许对象、Symbol、数字；
- 是否执行字符串强制转换；
- 分组和组内元素的顺序保证；
- 是否接受任意 `Iterable`；
- 返回数组是否允许调用方修改；
- 选择器异常是否原样传播；
- 缺失分组在 TypeScript 中如何表达。

尤其是对象结果中，整数形式的属性名不总按首次出现顺序枚举。如果调用者依赖严格的分组插入顺序，应使用 `Map`。

## 建议方案

优先让调用方按键语义直接选择平台能力：

```ts
// 键最终就是属性键，需要对象访问
const byStatus = Object.groupBy(items, item => item.status)

// 键可能是对象，或必须保留类型、身份与插入顺序
const byOwner = Map.groupBy(items, item => item.owner)
```

若项目目标环境尚不支持这些 API：

1. 先确认构建目标和运行时矩阵；TypeScript/Babel 能识别语法并不等于会自动补齐新的全局 API。
2. 优先采用项目已有 polyfill 方案，避免再创造一套近似但不同的语义。
3. 如果确实需要本地兼容实现，建议明确拆成对象版与 Map 版，而不是一个会隐式转换键的万能函数。
4. 对象版至少应具有类似契约：

```ts
function groupByPropertyKey<T, K extends PropertyKey>(
  items: Iterable<T>,
  keyOf: (item: T, index: number) => K,
): Partial<Record<K, T[]>>
```

其中：

- 使用 null-prototype 对象；
- 不继承 `constructor`、`toString`、`__proto__`；
- 类型返回 `Partial<Record<...>>`，因为并非每个可能的键都有分组；
- 文档明确遵循 PropertyKey 转换与对象枚举顺序；
- 不额外传入遍历源。

需要任意键时另提供 Map 语义，而不是放宽上述返回类型。

## 进入基础库前的最低验证

如果最终仍决定维护自定义实现，测试应通过公开 API 覆盖：

- 空输入、重复键以及元素顺序；
- `""`、`0`、`false`、`undefined`、Symbol；
- `constructor`、`toString`、`__proto__`；
- 数字 `1` 与字符串 `"1"` 的既定语义；
- 对象键的身份语义；
- 数组、Set、生成器等声称支持的 Iterable；
- 选择器抛错；
- TypeScript 推断、缺失分组以及无效键类型；
- 最终打包导出的函数与声明文件，而不只测试源码内部函数。

综合来看，真正需要解决的是“调用者应该选择对象键语义还是身份键语义”，不是把 `for...of` 换成 `reduce`。当前实现既没有安全实现前者，也无法提供后者，因此不适合作为通用基础库 API。未修改任何仓库文件。
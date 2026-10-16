## 结论

**不建议把这份实现作为通用工具收入前端基础库。** 问题不在循环写法，而在于它已有真实正确性缺陷，同时复制了现代 JavaScript 已提供的标准能力，却定义了另一套不完全兼容的 API。

默认决策应当是：

- 属性键分组：使用 `Object.groupBy()`。
- 对象身份或任意值分组：使用 `Map.groupBy()`。
- 目标环境不支持时：根据项目的 browserslist、Node 版本和构建策略引入标准兼容的 polyfill，而不是维护一个语义相近但不同的函数。
- 只有存在明确、重复的属性名简写需求时，才另行评估一个窄而准确的 `groupByProperty`，不要把字符串和回调塞进同一个参数。

`Object.groupBy` 和 `Map.groupBy` 已属于 ECMAScript 2024；前者返回 null-prototype 对象，后者保留键身份，回调都只接收元素和索引。[ECMAScript 规范：Object.groupBy](https://tc39.es/ecma262/2024/multipage/fundamental-objects.html#sec-object.groupby)、[Map.groupBy](https://tc39.es/ecma262/2024/multipage/keyed-collections.html#sec-map.groupby)

## 主要发现

### 高：合法键会直接导致运行时崩溃

```js
const result = {}
if (result[key]) result[key].push(item)
```

这里读取的不只是自有属性，还会查找 `Object.prototype`。当键是以下任意值时：

```js
'constructor'
'toString'
'__proto__'
```

`result[key]` 已经是一个真值，但不是数组，于是调用 `.push()` 抛出 `TypeError`。

我在当前 Node 22.22.2 中实际验证了这三个输入，均稳定复现。仅改成 `Object.hasOwn()` 仍不足以完整解决：在普通 `{}` 上给 `__proto__` 赋值还会触发原型 setter。对象累加器必须从 `Object.create(null)` 开始，或直接使用标准 `Object.groupBy()`；规范本身正是返回 null-prototype 对象以避免这类冲突。

### 高：`groupBy` 这个名字隐藏了键身份是否保留

对象结果会把键转换为属性键，因此：

- `1` 和 `"1"` 会进入同一组。
- 两个普通对象通常都会变成 `"[object Object]"`，错误地合并。
- 整数形式的属性名在枚举时可能重新排序，不能承诺“分组顺序等于首次出现顺序”。

这不一定是对象分组的实现错误，但它是公共 API 必须暴露的关键契约。需要对象身份、任意类型键或稳定的组插入顺序时，应使用 `Map.groupBy()`。本地运行验证两个不同对象经当前实现只产生一组，而 `Map.groupBy()` 产生两组。

### 中：回调契约与标准 API 不兼容

当前回调收到：

```js
generateKey(item, index, items)
```

标准 `Object.groupBy`/`Map.groupBy` 只传：

```js
callback(item, index)
```

第三个参数尤其有问题：函数通过 `for...of` 接受任意 iterable，所以它可能是 `Set`、生成器或只能消费一次的迭代器，并不必然是数组。回调读取或再次遍历它可能改变主循环行为。

基础库没有证据需要这项额外能力时，应删除第三个参数，跟随标准契约。

### 中：字符串/函数重载的便利不足以抵消 API 成本

```js
groupBy(users, 'department')
groupBy(users, user => user.department)
```

字符串简写带来了这些问题：

- 参数被原地从字符串改写成函数，真实执行契约不直观。
- 拼错属性名会把所有元素静默放入 `"undefined"` 组。
- 只接受字符串，遗漏了 symbol 属性名。
- TypeScript 需要复杂重载才能同时准确表达 `keyof T`、属性值必须可作为属性键、返回组可能不存在等约束。
- 回调写法已经足够短，并且能够表达派生键。

除非已有大量真实调用点证明简写显著改善使用体验，否则保留单一 selector API 更合适。若确有需求，应使用独立名称 `groupByProperty`，不要让一个参数承担两种职责。

### 中：公共返回契约尚未定义

进入基础库前至少需要明确：

- 返回 `Object` 还是 `Map`；
- 对象结果是否为 null-prototype；
- 键是否发生字符串化；
- 缺失组在类型上必须是可选；
- 是否支持任意 iterable；
- 组内元素保持输入顺序，但元素本身只是原引用，不会复制；
- selector 抛错时是否原样传播；
- 输出数组是否允许调用方修改。

TypeScript 返回类型不应写成所有组必然存在的 `Record<K, T[]>`，而应与标准声明类似：

```ts
Partial<Record<K, T[]>>
```

TypeScript 5.7 已通过 `target/lib: es2024` 提供这些标准 API 的类型支持。[TypeScript 5.7 发布说明](https://www.typescriptlang.org/docs/handbook/release-notes/typescript-5-7.html#support-for---target-es2024-and---lib-es2024)

## 建议落地方式

现代目标环境直接使用：

```ts
const byDepartment = Object.groupBy(
  users,
  user => user.department,
)

const byOwnerIdentity = Map.groupBy(
  tasks,
  task => task.owner,
)
```

`Object.groupBy()` 自 2024 年 3 月起已达到跨主流浏览器广泛可用状态，但如果项目仍支持更老设备，必须以项目实际兼容矩阵决定是否 polyfill，不能仅提高 TypeScript `lib`——类型声明不会补齐运行时能力。[MDN 兼容性与契约](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object/groupBy)

如果受旧运行时限制且项目不能引入标准 polyfill，最低限度的内部实现应当：

- 明确命名为属性键分组；
- 只接受 selector；
- 使用 `Object.create(null)`；
- 类型限制 selector 返回 `PropertyKey`；
- 返回 `Partial<Record<K, T[]>>`；
- 用公开入口测试 `constructor`、`toString`、`__proto__`、symbol、数字/字符串碰撞、空 iterable 和组内顺序；
- 另设 Map 版本，而不是让对象键被悄悄字符串化。

当前工作区没有业务源码、包配置、调用方或目标浏览器声明，因此无法证明存在值得基础库维护的现实消费者。基于现有证据，最稳妥的评审结论是：**拒绝当前封装入库，优先采用标准 API；兼容性需求确认后再决定 polyfill，而不是修饰这段循环。**
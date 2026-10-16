## 结论

**高风险，当前证据不足以安全上线。** `html: string` 直接进入 `dangerouslySetInnerHTML`，绕过了 React 的默认转义。只要后端过滤遗漏事件属性、危险 URL 或解析差异，就可能形成存储型 XSS，例如 `onerror`、`javascript:` 链接或 SVG 载荷。React 官方也要求该接口只能接收可信且已清洗的数据。[React 文档](https://react.dev/reference/react-dom/components/common)

“后端过滤过”只有在能确认以下契约时才算有效证据：

- 使用维护中的 HTML 解析型、allowlist sanitizer，而不是正则或黑名单。
- 明确允许的标签、属性、URL 协议及外部域名策略。
- 覆盖创建、编辑、导入和历史数据等所有写入路径。
- 清洗后不再拼接或修改 HTML。
- 有恶意样本回归测试和依赖更新流程。

## 最小、可维护的修复

在现有证据下，建议先在前端建立**唯一的富文本渲染边界**：

1. 新建一个很小的 `sanitizeArticleHtml` 模块，使用项目已有的成熟 sanitizer；若项目没有，可选 DOMPurify，不要自行实现 HTML 正则过滤。
2. `ArticleBody` 是唯一允许调用 `dangerouslySetInnerHTML` 的组件，任何调用方都只能传原始字符串，由该边界统一清洗。
3. 使用显式 allowlist，例如仅允许：
   - 标签：`p`、`br`、`strong`、`em`、`ul`、`ol`、`li`、`blockquote`、`code`、`pre`、`a`
   - 属性：`a[href]`、`a[title]`
   - URL：相对地址及 `http:`、`https:`；`mailto:` 只有产品确实需要时再开放
4. 默认不允许 `style`、`class`、`id`、`target`、任何 `on*` 属性，以及 `svg`、`iframe`、`form`、`object`、`embed`、`base`。若以后需要图片，只在同一策略模块增加标签、属性、协议/域名限制和对应测试。
5. 清洗结果必须直接进入 sink，之后不要再拼接或交给其他库修改。DOMPurify 同样明确警告，清洗后的二次修改可能使安全保证失效。[DOMPurify 文档](https://github.com/cure53/DOMPurify)

结构应类似：

```tsx
import { sanitizeArticleHtml } from "./articleHtmlPolicy";

export function ArticleBody({ html }: { html: string }) {
  const safeHtml = sanitizeArticleHtml(html);

  return <article dangerouslySetInnerHTML={{ __html: safeHtml }} />;
}
```

`articleHtmlPolicy` 应包含唯一的 allowlist 和 URL 规则。具体库调用需要根据项目现有依赖及是否 SSR 确定；当前工作区没有依赖清单，不能可靠给出可直接编译的 import/config。

后端清洗可以继续保留，但应被正式定义为输入/存储契约，而不是口头保证。若最终证明后端契约完备，可以通过 `sanitizedHtml` 字段或不可随意构造的 `SanitizedArticleHtml` 类型表达它；在此之前，不应删除靠近浏览器 sink 的保护。OWASP 同样要求富文本使用 HTML sanitizer，并按输出上下文处理。[OWASP XSS Prevention](https://cheatsheetseries.owasp.org/cheatsheets/Cross_Site_Scripting_Prevention_Cheat_Sheet)

## CSP 的角色

CSP 是第二层防线，不是修复本身：

- 严格的 `script-src` 配合 nonce/hash，且不使用 `'unsafe-inline'`、`'unsafe-eval'`，可阻断大量脚本执行。
- `object-src 'none'`、`base-uri 'none'` 可继续缩小注入后的利用面。
- 可先用 `Content-Security-Policy-Report-Only` 收集违规，再切换强制模式。
- 可进一步试运行 `require-trusted-types-for 'script'` 和命名的 `trusted-types` policy，使 `innerHTML` 等 sink 拒绝普通字符串；该 policy 必须真正调用 sanitizer，不能原样返回输入。[MDN Trusted Types](https://developer.mozilla.org/en-US/docs/Web/API/Trusted_Types_API)

CSP 不能表达“正文只允许这些标签和链接”，也不能阻止所有恶意导航、内容伪造或未来错误放宽策略；浏览器支持和站点配置也可能不同。因此不能用“已有 CSP”来接受当前裸 sink。[OWASP CSP 指南](https://cheatsheetseries.owasp.org/cheatsheets/Content_Security_Policy_Cheat_Sheet.html)

## 验证方案

至少建立以下回归测试：

- 合法内容：段落、强调、列表、代码块和安全链接仍按预期保留。
- 标签与属性：
  - `<img src=x onerror=alert(1)>`
  - `<svg onload=alert(1)>`
  - `<iframe srcdoc=...>`
  - `<form action=...>`
  - `style`、`onclick`、大小写及实体混淆
- URL：
  - `javascript:`、`data:`、`vbscript:`
  - 前后空白、换行、字符实体和大小写变体
  - 相对 URL、`http:`、`https:` 的允许行为
  - 若限制外部域名，覆盖协议相对 URL 和重定向场景
- 测试应把结果解析成 DOM，断言不存在禁用元素、`on*` 属性和危险协议；不要依赖容易受序列化差异影响的整段字符串比较。
- 在真实浏览器中通过实际 `ArticleBody` 渲染恶意样本，确认没有弹窗、非预期导航或外部请求；仅靠 jsdom 不能证明事件处理器不会执行。
- 在实际 CSP 下执行一次端到端测试，并检查 CSP/Trusted Types violation report。
- 若应用支持 SSR，验证服务端与客户端产生相同的清洗结果及正常 hydration。
- 后端需使用同一组攻击样本覆盖新增、修改、导入和历史正文路径。

本次是评审，没有修改文件或运行项目测试；工作区除评审 Skill 外没有组件源码、依赖清单或测试配置。
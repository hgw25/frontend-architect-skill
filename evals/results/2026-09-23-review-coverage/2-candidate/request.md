Read .frontend-architect/SKILL.md completely and use only that skill and its routed local references for this task. Do not read global skills. Only supplied artifacts are in scope; do not inspect the source repository or evaluation criteria. Do not edit implementation. Save your final Chinese review to response.md in this workspace.

只审查这个按钮文案改动：需求是把“发送”改成“提交”，事件行为保持不变。 本次还改了上传队列，但由另一位同事审查，不在你的范围内，也未提供其源码。 不需要修改代码或运行测试，请给出简短审查结论。

src/SubmitButton.tsx
type Props = { onSubmit: () => void; disabled: boolean };
export function SubmitButton({ onSubmit, disabled }: Props) {
-  return <button disabled={disabled} onClick={onSubmit}>发送</button>;
+  return <button disabled={disabled} onClick={onSubmit}>提交</button>;
}

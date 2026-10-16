审查结论：**通过，无阻塞问题。**

提供的 diff 仅将按钮文案从“发送”改为“提交”；`disabled` 和 `onClick={onSubmit}` 均未变化，符合事件行为保持不变的要求。

未审查上传队列；按要求未运行测试。工作区不存在 `src/SubmitButton.tsx`，结论仅基于提供的 diff。
type Props = { title: string; category: string; pending: boolean; error: Error | null;
  canRetry: boolean; categories: readonly { id: string; name: string }[];
  edit: (value: string) => void; selectCategory: (value: string) => void;
  submit: () => void; retry: () => void };

export function CreateForm(props: Props) {
  return <form onSubmit={event => { event.preventDefault(); props.submit(); }}>
    <label>Title<input value={props.title} onChange={event => props.edit(event.target.value)} /></label>
    <label>Category<select value={props.category} onChange={event => props.selectCategory(event.target.value)}>
      {props.categories.map(category => <option key={category.id} value={category.id}>{category.name}</option>)}
    </select></label>
    <button disabled={!props.title.trim() || props.pending}>Publish</button>
    {props.error && <div role="alert">
      <p>{props.error.message}</p>
      {props.canRetry && <button type="button" disabled={props.pending} onClick={props.retry}>Retry</button>}
    </div>}
  </form>;
}

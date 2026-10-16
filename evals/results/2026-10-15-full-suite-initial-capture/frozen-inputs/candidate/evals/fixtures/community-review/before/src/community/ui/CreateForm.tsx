export function CreateForm({ title, pending, edit, submit }: {
  title: string; pending: boolean;
  edit: (value: string) => void; submit: () => void;
}) {
  return <form onSubmit={event => { event.preventDefault(); submit(); }}>
    <label>Title<input value={title} onChange={event => edit(event.target.value)} /></label>
    <button disabled={!title.trim() || pending}>Publish</button>
  </form>;
}

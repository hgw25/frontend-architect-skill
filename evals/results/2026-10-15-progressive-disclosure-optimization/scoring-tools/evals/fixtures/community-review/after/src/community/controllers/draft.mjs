export function createDraftController(initial = { title: '', category: 'general' }) {
  let value = { ...initial };
  return {
    get snapshot() { return { ...value }; },
    editTitle(title) { value = { ...value, title }; },
    selectCategory(category) { value = { ...value, category }; },
  };
}

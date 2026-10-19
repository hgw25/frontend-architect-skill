export function createDraftController(initial = '') {
  let title = initial;
  return {
    get title() { return title; },
    edit(value) { title = value; },
  };
}

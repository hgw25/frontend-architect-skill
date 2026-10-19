export function createCategories(labels) {
  const snapshot = Object.freeze(labels.map(label => Object.freeze({ ...label })));
  return { get snapshot() { return snapshot; } };
}

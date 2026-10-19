import { exportSelected } from './export-selection.mjs';

export function handleKeyboardExport(rows, write) {
  return exportSelected(rows, write);
}

import { exportSelection } from './export-selection.mjs';

export function handleKeyboardExport(rows, write) {
  return exportSelection(rows, write);
}

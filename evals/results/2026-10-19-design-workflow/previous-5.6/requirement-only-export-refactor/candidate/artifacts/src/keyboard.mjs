import { exportSelection } from './export-selection.mjs';

export async function handleKeyboardExport(rows, write) {
  return exportSelection(rows, write);
}

import { exportSelection } from './export-steps.mjs';

export async function handleKeyboardExport(rows, write) {
  return exportSelection(rows, write);
}

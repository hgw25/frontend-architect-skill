import { exportSelection } from './export-selection.mjs';

export async function handleToolbarExport(rows, write) {
  return exportSelection(rows, write);
}

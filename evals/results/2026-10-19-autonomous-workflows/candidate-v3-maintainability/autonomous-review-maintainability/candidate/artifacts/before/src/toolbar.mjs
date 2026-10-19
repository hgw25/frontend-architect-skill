import { exportSelected } from './export-selection.mjs';

export function handleToolbarExport(rows, write) {
  return exportSelected(rows, write);
}

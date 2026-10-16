import { exportSelection } from './export-selection.mjs';

export function handleToolbarExport(rows, write) {
  return exportSelection(rows, write);
}

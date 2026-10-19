import { exportSelection } from './export-steps.mjs';

export async function handleToolbarExport(rows, write) {
  return exportSelection(rows, write);
}

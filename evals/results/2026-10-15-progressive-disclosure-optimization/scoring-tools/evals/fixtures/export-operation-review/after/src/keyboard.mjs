import { begin, classify, encode, dispatch } from './export-steps.mjs';

export async function handleKeyboardExport(rows, write) {
  const context = begin(rows, write);
  classify(context);
  encode(context);
  return dispatch(context);
}

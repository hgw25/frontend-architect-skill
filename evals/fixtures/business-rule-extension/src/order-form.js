import { submitFields, validateFields } from './forms.js';

const fields = [
  { name: 'customerType', required: true },
  { name: 'companyName', required: draft => draft.customerType === 'business' },
  { name: 'taxId' },
  { name: 'note' },
];

export function validateOrder(draft) {
  return validateFields(fields, draft);
}

export function submitOrder(draft, send) {
  return submitFields(fields, draft, send);
}

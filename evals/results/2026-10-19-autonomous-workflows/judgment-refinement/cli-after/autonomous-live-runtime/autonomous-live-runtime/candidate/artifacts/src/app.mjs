function enhancePurchaseForm(form) {
  const button = form.querySelector('button[type="submit"]');
  const status = document.querySelector('[role="status"]');
  if (!button || !status) return;

  form.addEventListener('submit', async event => {
    event.preventDefault();
    if (button.disabled) return;

    button.disabled = true;
    status.textContent = 'Completing your purchase…';

    try {
      const response = await fetch(form.action, {
        method: 'POST',
        headers: {accept: 'application/json'},
      });
      if (!response.ok) throw new Error('Purchase request failed');
      status.textContent = 'Purchase accepted.';
    } catch {
      button.disabled = false;
      status.textContent = 'Purchase failed. Please try again.';
    }
  });
}

const form = document.querySelector('form[action="/api/buy"]');
if (form) enhancePurchaseForm(form);

const form = document.querySelector('[data-purchase-form]');
const status = document.querySelector('[role="status"]');
const button = form?.querySelector('button[type="submit"]');

if (form && status && button && !button.disabled) {
  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (form.dataset.pending === 'true') return;

    form.dataset.pending = 'true';
    form.setAttribute('aria-busy', 'true');
    button.disabled = true;
    status.dataset.kind = 'pending';
    status.textContent = 'Processing purchase…';

    try {
      const response = await fetch(form.action, {
        method: 'POST',
        body: new URLSearchParams(new FormData(form)),
        headers: {accept: 'application/json'},
      });
      const result = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(result?.message || 'Purchase failed. Please try again.');
      }

      status.dataset.kind = 'success';
      status.textContent = result?.message || 'Purchase accepted.';
      const price = document.querySelector('[data-testid="price"]');
      if (price && result?.price) price.textContent = result.price;
    } catch (error) {
      status.dataset.kind = 'error';
      status.textContent = error instanceof Error ? error.message : 'Purchase failed. Please try again.';
    } finally {
      delete form.dataset.pending;
      form.removeAttribute('aria-busy');
      button.disabled = false;
    }
  });
}

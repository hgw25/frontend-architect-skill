const form = document.querySelector('[data-purchase-form]');
const status = document.querySelector('[role="status"]');
const button = form?.querySelector('button[type="submit"]');

if (form && status && button && !button.disabled) {
  let pending = false;

  form.addEventListener('submit', async event => {
    event.preventDefault();
    if (pending) return;

    pending = true;
    button.disabled = true;
    form.setAttribute('aria-busy', 'true');
    status.textContent = 'Submitting purchase…';

    try {
      const response = await fetch(form.action, {
        method: 'POST',
        body: new URLSearchParams(new FormData(form)),
        headers: {accept: 'application/json'},
      });
      status.textContent = response.ok ? 'Purchase accepted' : 'Purchase failed. Please try again.';
    } catch {
      status.textContent = 'Purchase failed. Check your connection and try again.';
    } finally {
      pending = false;
      button.disabled = false;
      form.removeAttribute('aria-busy');
    }
  });
}

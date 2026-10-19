const form = document.querySelector('form[action="/api/buy"]');
const status = document.querySelector('[role="status"]');

form?.addEventListener('submit', async event => {
  event.preventDefault();
  const button = form.querySelector('button[type="submit"]');
  button.disabled = true;
  status.textContent = 'Submitting purchase…';

  try {
    const response = await fetch(form.action, {
      method: 'POST',
      body: new URLSearchParams(new FormData(form)),
      headers: { accept: 'application/json' },
    });
    const result = await response.json().catch(() => ({}));
    status.textContent = response.ok ? 'Purchase accepted' : result.error || 'Purchase failed';
  } catch {
    status.textContent = 'Purchase failed. Please try again.';
  } finally {
    button.disabled = false;
  }
});

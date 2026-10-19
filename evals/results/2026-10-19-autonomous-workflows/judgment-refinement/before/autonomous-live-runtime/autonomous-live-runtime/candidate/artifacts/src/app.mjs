const form = document.querySelector('form[method="post"]');
const status = document.querySelector('[role="status"]');
const price = document.querySelector('[data-testid="price"]');
const button = form?.querySelector('button[type="submit"]');

let purchasePending = false;

form?.addEventListener('submit', async (event) => {
  event.preventDefault();
  if (purchasePending || !button || !status) return;

  purchasePending = true;
  button.disabled = true;
  button.setAttribute('aria-busy', 'true');
  status.textContent = 'Confirming your purchase…';

  try {
    const response = await fetch(form.action, {
      method: 'POST',
      body: new URLSearchParams(new FormData(form)),
      headers: { accept: 'application/json' },
    });

    if (!response.ok) {
      if (response.status === 401) throw new Error('session');
      if (response.status === 403) throw new Error('permission');
      throw new Error('unconfirmed');
    }

    const result = await response.json();
    status.textContent = result.message ?? 'Purchase accepted';
    if (price && result.displayPrice) price.textContent = result.displayPrice;
  } catch (error) {
    if (error.message === 'session') {
      status.textContent = 'Your session has ended. Sign in before purchasing.';
    } else if (error.message === 'permission') {
      status.textContent = 'Your account does not have permission to purchase.';
    } else {
      status.textContent = 'We could not confirm the purchase. Check your account before trying again.';
    }
    button.disabled = false;
  } finally {
    purchasePending = false;
    button.disabled = false;
    button.removeAttribute('aria-busy');
  }
});

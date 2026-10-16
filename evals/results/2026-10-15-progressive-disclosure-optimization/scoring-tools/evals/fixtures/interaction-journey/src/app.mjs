const input = document.querySelector('#name');
const feedback = document.querySelector('#feedback');
const save = document.querySelector('#save');
const grid = document.querySelector('#grid');
document.querySelector('#clear').onclick = () => { input.value = ''; };
save.onclick = async () => {
  save.disabled = true;
  feedback.textContent = 'Saving';
  try {
    const response = await fetch('/save', { method: 'POST', body: input.value });
    if (!response.ok) throw new Error('Save failed');
    document.querySelector('td').textContent = input.value;
    feedback.textContent = 'Saved';
  } catch { feedback.textContent = 'Save failed'; }
  finally { input.value = ''; save.disabled = false; }
};
const body = document.querySelector('tbody');
for (let index = 0; index < 30; index++) {
  const row = body.insertRow(); row.dataset.row = String(index);
  row.insertCell().textContent = 'Record ' + index;
}
if (!matchMedia('(prefers-reduced-motion: reduce)').matches) {
  for (const row of [...body.rows].slice(0, 8)) row.animate({ opacity: [0, 1] }, { duration: 240 });
}
setTimeout(() => { grid.dataset.ready = 'true'; }, Number(new URLSearchParams(location.search).get('delay') || 200));

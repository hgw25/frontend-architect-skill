import { invitations, overview as initialOverview } from './data.mjs';
import { sendInvitation, readOverview } from './transport.mjs';
const app = document.querySelector('#app');
app.innerHTML = `<h1>Team invitations</h1>
  <form><label>Email <input name="email" type="email" required></label><button type="submit">Send invitation</button></form>
  <p role="status"></p><div id="errors"></div>
  <section class="overview"><h2>Overview</h2><p data-testid="overview"></p><button id="refresh">Refresh overview</button></section>
  <ol aria-label="Invitations"></ol><label>Team note <textarea></textarea></label>`;
const form = app.querySelector('form'), emailInput = form.elements.email, submitButton = form.querySelector('button');
const status = app.querySelector('[role="status"]'), errors = app.querySelector('#errors');
const overviewNode = app.querySelector('[data-testid="overview"]'), list = app.querySelector('ol');
const rows = [...invitations], nodes = new Map();
let overview = initialOverview, sending = false, refreshRevision = 0;
function showError(message) {
  errors.replaceChildren();
  if (message) { const error = document.createElement('p'); error.setAttribute('role', 'alert'); error.textContent = message; errors.append(error); }
}
function drawOverview() { overviewNode.textContent = 'Pending: ' + overview.pending; }
function drawRows() {
  const active = document.activeElement;
  for (const row of rows) {
    let node = nodes.get(row.id);
    if (!node) {
      node = document.createElement('li'); node.dataset.inviteId = row.id;
      const name = document.createElement('span'); name.textContent = row.email; node.append(name);
      for (const [label, delta] of [['Move earlier', -1], ['Move later', 1]]) {
        const button = document.createElement('button'); button.textContent = label;
        button.onclick = () => { const at = rows.indexOf(row), to = at + delta; if (to < 0 || to >= rows.length) return; [rows[at], rows[to]] = [rows[to], rows[at]]; drawRows(); };
        node.append(button);
      }
      nodes.set(row.id, node);
    }
    list.append(node);
  }
  if (active?.isConnected && document.activeElement === document.body) active.focus({ preventScroll: true });
}
async function refresh() {
  const revision = ++refreshRevision;
  try {
    const next = await readOverview(); if (revision !== refreshRevision) return;
    overview = next; drawOverview(); showError('');
  } catch {
    if (revision === refreshRevision) showError('Overview unavailable. Refresh overview to try again.');
  }
}
form.onsubmit = async event => {
  event.preventDefault(); if (sending) return;
  const submitted = emailInput.value; sending = true; submitButton.disabled = true; showError('');
  try {
    const result = await sendInvitation(submitted);
    rows.push(result.invitation); drawRows(); status.textContent = 'Invitation sent to ' + result.invitation.email;
    if (emailInput.value === submitted) emailInput.value = '';
    await refresh();
  } catch { showError('Invitation failed. Edit the email and try again.'); }
  finally { sending = false; submitButton.disabled = false; }
};
app.querySelector('#refresh').onclick = async () => { await sendInvitation('ada@example.test'); await refresh(); };
drawRows(); drawOverview();

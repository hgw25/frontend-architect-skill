import { invitations, overview as initialOverview } from './data.mjs';
import { sendInvitation, readOverview } from './transport.mjs';
const app = document.querySelector('#app');
let rows = [...invitations], overview = initialOverview, email = '', note = '', message = '', error = '', sending = false;
function element(tag, text) { const node = document.createElement(tag); if (text) node.textContent = text; return node; }
function draw() {
  app.replaceChildren(element('h1', 'Team invitations'));
  const form = element('form'), label = element('label', 'Email'), input = element('input');
  input.type = 'email'; input.required = true; input.value = email; input.name = 'email'; label.append(input);
  input.oninput = () => { email = input.value; };
  const submit = element('button', 'Send invitation'); submit.type = 'submit'; submit.disabled = sending; form.append(label, submit);
  const status = element('p', message); status.setAttribute('role', 'status'); app.append(form, status);
  if (error) { const alert = element('p', error); alert.setAttribute('role', 'alert'); app.append(alert); }
  const section = element('section'); section.className = 'overview'; section.append(element('h2', 'Overview'));
  const total = element('p', 'Pending: ' + overview.pending); total.dataset.testid = 'overview';
  const refresh = element('button', 'Refresh overview'); refresh.onclick = async () => {
    try { overview = await readOverview(); error = ''; draw(); } catch { error = 'Overview unavailable'; draw(); }
  }; section.append(total, refresh); app.append(section);
  const list = element('ol'); list.setAttribute('aria-label', 'Invitations');
  for (const row of rows) {
    const item = element('li'); item.dataset.inviteId = row.id; item.append(element('span', row.email));
    for (const [name, delta] of [['Move earlier', -1], ['Move later', 1]]) {
      const button = element('button', name); button.onclick = () => {
        const at = rows.indexOf(row), next = at + delta;
        if (next < 0 || next >= rows.length) return;
        [rows[at], rows[next]] = [rows[next], rows[at]]; draw();
      }; item.append(button);
    }
    list.append(item);
  }
  app.append(list);
  const noteLabel = element('label', 'Team note'), textarea = element('textarea'); textarea.value = note;
  textarea.oninput = () => { note = textarea.value; }; noteLabel.append(textarea); app.append(noteLabel);
  form.onsubmit = async event => {
    event.preventDefault(); const submitted = email; sending = true; error = ''; draw();
    try {
      const result = await sendInvitation(submitted); rows.push(result.invitation);
      overview = await readOverview(); message = 'Invitation sent to ' + result.invitation.email; email = '';
    } catch { error = 'Invitation failed'; message = ''; }
    sending = false; draw(); app.querySelector('input').focus();
  };
}
draw();

import { invitations, overview as initialOverview } from './data.mjs';
import { sendInvitation, readOverview } from './transport.mjs';

const app = document.querySelector('#app');
let rows = [...invitations];
let overview = initialOverview;
let email = '';
let emailRevision = 0;
let note = '';
let message = '';
let sendError = '';
let overviewError = '';
let sending = false;
let overviewRequest = 0;

function element(tag, text) {
  const node = document.createElement(tag);
  if (text) node.textContent = text;
  return node;
}

function captureFocus() {
  const active = document.activeElement;
  if (active?.matches('input[name="email"]')) return { type: 'email' };
  if (active?.matches('textarea[name="team-note"]')) return { type: 'note' };
  if (active?.matches('button[data-move]')) {
    return { type: 'move', id: active.closest('[data-invite-id]')?.dataset.inviteId, direction: active.dataset.move };
  }
  if (active?.matches('button[data-overview-refresh]')) return { type: 'overview' };
  return null;
}

function restoreFocus(target) {
  if (!target) return;
  if (target.type === 'email') app.querySelector('input[name="email"]')?.focus();
  if (target.type === 'note') app.querySelector('textarea[name="team-note"]')?.focus();
  if (target.type === 'overview') app.querySelector('button[data-overview-refresh]')?.focus();
  if (target.type === 'move') {
    const row = [...app.querySelectorAll('[data-invite-id]')].find(node => node.dataset.inviteId === target.id);
    row?.querySelector(`button[data-move="${target.direction}"]`)?.focus();
  }
}

async function refreshOverview() {
  const requestId = ++overviewRequest;
  try {
    const nextOverview = await readOverview();
    if (requestId !== overviewRequest) return;
    overview = nextOverview;
    overviewError = '';
  } catch {
    if (requestId !== overviewRequest) return;
    overviewError = 'Overview unavailable';
  }
  draw();
}

function moveInvitation(id, direction) {
  const at = rows.findIndex(row => row.id === id);
  const next = at + direction;
  if (at < 0 || next < 0 || next >= rows.length) return;
  [rows[at], rows[next]] = [rows[next], rows[at]];
  draw({ type: 'move', id, direction: String(direction) });
}

async function submitInvitation(event) {
  event.preventDefault();
  if (sending) return;

  const submittedEmail = email;
  const submittedRevision = emailRevision;
  sending = true;
  sendError = '';
  message = 'Sending invitation…';
  draw({ type: 'email' });

  try {
    const result = await sendInvitation(submittedEmail);
    rows.push(result.invitation);
    message = `Invitation sent to ${result.invitation.email}. Receipt ${result.receipt.id} accepted.`;
    if (emailRevision === submittedRevision) {
      email = '';
      emailRevision += 1;
    }
    sending = false;
    draw({ type: 'email' });
    void refreshOverview();
  } catch {
    sending = false;
    message = '';
    sendError = 'Invitation failed. Check the email and try again.';
    draw({ type: 'email' });
  }
}

function draw(preferredFocus) {
  const focus = preferredFocus ?? captureFocus();
  app.replaceChildren(element('h1', 'Team invitations'));

  const form = element('form');
  const label = element('label', 'Email');
  const input = element('input');
  input.type = 'email';
  input.required = true;
  input.value = email;
  input.name = 'email';
  input.oninput = () => {
    email = input.value;
    emailRevision += 1;
  };
  label.append(input);
  const submit = element('button', 'Send invitation');
  submit.type = 'submit';
  submit.disabled = sending;
  form.append(label, submit);
  form.onsubmit = submitInvitation;
  app.append(form);

  const status = element('p', message);
  status.setAttribute('role', 'status');
  status.setAttribute('aria-atomic', 'true');
  app.append(status);
  if (sendError) {
    const alert = element('p', sendError);
    alert.setAttribute('role', 'alert');
    app.append(alert);
  }

  const section = element('section');
  section.className = 'overview';
  section.append(element('h2', 'Overview'));
  const total = element('p', `Pending: ${overview.pending}`);
  total.dataset.testid = 'overview';
  const refresh = element('button', 'Refresh overview');
  refresh.dataset.overviewRefresh = 'true';
  refresh.onclick = refreshOverview;
  section.append(total, refresh);
  if (overviewError) {
    const alert = element('p', overviewError);
    alert.setAttribute('role', 'alert');
    section.append(alert);
  }
  app.append(section);

  const list = element('ol');
  list.setAttribute('aria-label', 'Invitations');
  for (const row of rows) {
    const item = element('li');
    item.dataset.inviteId = row.id;
    item.append(element('span', row.email));
    for (const [name, direction] of [['Move earlier', -1], ['Move later', 1]]) {
      const button = element('button', name);
      button.dataset.move = String(direction);
      button.onclick = () => moveInvitation(row.id, direction);
      item.append(button);
    }
    list.append(item);
  }
  app.append(list);

  const noteLabel = element('label', 'Team note');
  const textarea = element('textarea');
  textarea.name = 'team-note';
  textarea.value = note;
  textarea.oninput = () => { note = textarea.value; };
  noteLabel.append(textarea);
  app.append(noteLabel);
  restoreFocus(focus);
}

draw();

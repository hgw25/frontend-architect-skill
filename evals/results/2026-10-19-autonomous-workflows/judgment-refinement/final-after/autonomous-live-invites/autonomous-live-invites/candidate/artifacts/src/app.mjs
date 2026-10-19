import { invitations, overview as initialOverview } from './data.mjs';
import { sendInvitation, readOverview } from './transport.mjs';

const app = document.querySelector('#app');
let rows = [...invitations];
let overview = initialOverview;
let email = '';
let emailRevision = 0;
let note = '';
let message = '';
let formError = '';
let overviewError = '';
let sending = false;
let overviewRequest = 0;

function element(tag, text) {
  const node = document.createElement(tag);
  if (text) node.textContent = text;
  return node;
}

function captureEditableFocus() {
  const active = document.activeElement;
  if (active?.name === 'email') {
    return { selector: 'input[name="email"]', start: active.selectionStart, end: active.selectionEnd };
  }
  if (active?.tagName === 'TEXTAREA') {
    return { selector: 'textarea', start: active.selectionStart, end: active.selectionEnd };
  }
  return null;
}

function restoreEditableFocus(focus) {
  if (!focus) return;
  const input = app.querySelector(focus.selector);
  input?.focus();
  if (input && focus.start !== null && focus.end !== null) {
    input.setSelectionRange(focus.start, focus.end);
  }
}

function focusInviteAction(inviteId, actionName) {
  const item = [...app.querySelectorAll('[data-invite-id]')]
    .find(node => node.dataset.inviteId === inviteId);
  const action = [...(item?.querySelectorAll('button') ?? [])]
    .find(button => button.textContent === actionName);
  action?.focus();
}

function moveInvitation(inviteId, offset, actionName) {
  const at = rows.findIndex(row => row.id === inviteId);
  const next = at + offset;
  if (at < 0 || next < 0 || next >= rows.length) return;
  [rows[at], rows[next]] = [rows[next], rows[at]];
  draw();
  focusInviteAction(inviteId, actionName);
}

async function refreshOverview({ render = true } = {}) {
  const request = ++overviewRequest;
  try {
    const nextOverview = await readOverview();
    if (request !== overviewRequest) return;
    overview = nextOverview;
    overviewError = '';
  } catch {
    if (request !== overviewRequest) return;
    overviewError = 'Overview unavailable. Refresh overview to try again.';
  }
  if (render) draw();
}

async function submitInvitation(event) {
  event.preventDefault();
  if (sending) return;

  const submittedEmail = email;
  const submittedRevision = emailRevision;
  sending = true;
  formError = '';
  draw();

  try {
    const result = await sendInvitation(submittedEmail);
    rows.push(result.invitation);
    message = `Invitation sent to ${result.invitation.email}`;
    if (emailRevision === submittedRevision) {
      email = '';
      emailRevision += 1;
    }
    await refreshOverview({ render: false });
  } catch {
    formError = 'Invitation failed. Check the email and try again.';
  } finally {
    sending = false;
    draw();
  }
}

function draw() {
  const focus = captureEditableFocus();
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
  app.append(status);
  if (formError) {
    const alert = element('p', formError);
    alert.setAttribute('role', 'alert');
    app.append(alert);
  }

  const section = element('section');
  section.className = 'overview';
  section.append(element('h2', 'Overview'));
  const total = element('p', `Pending: ${overview.pending}`);
  total.dataset.testid = 'overview';
  const refresh = element('button', 'Refresh overview');
  refresh.onclick = () => refreshOverview();
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
    for (const [name, delta] of [['Move earlier', -1], ['Move later', 1]]) {
      const button = element('button', name);
      button.onclick = () => moveInvitation(row.id, delta, name);
      item.append(button);
    }
    list.append(item);
  }
  app.append(list);

  const noteLabel = element('label', 'Team note');
  const textarea = element('textarea');
  textarea.value = note;
  textarea.oninput = () => { note = textarea.value; };
  noteLabel.append(textarea);
  app.append(noteLabel);
  restoreEditableFocus(focus);
}

draw();

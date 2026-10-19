import { invitations, overview as initialOverview } from './data.mjs';
import { sendInvitation, readOverview } from './transport.mjs';

const app = document.querySelector('#app');
const state = {
  rows: [...invitations],
  overview: initialOverview,
  email: '',
  emailRevision: 0,
  note: '',
  send: { pending: false, confirmation: '', error: '' },
  overviewRequest: { pending: false, error: '' },
};

function element(tag, text = '') {
  const node = document.createElement(tag);
  node.textContent = text;
  return node;
}

function currentFocus() {
  const active = document.activeElement;
  if (active?.matches('input[name="email"]')) return { name: 'email', start: active.selectionStart, end: active.selectionEnd };
  if (active?.matches('textarea[name="team-note"]')) return { name: 'note', start: active.selectionStart, end: active.selectionEnd };
  if (active?.matches('[data-focus-target]')) return { name: active.dataset.focusTarget };
  return null;
}

function restoreFocus(target) {
  if (!target) return;
  const selector = target.name === 'email' ? 'input[name="email"]'
    : target.name === 'note' ? 'textarea[name="team-note"]'
      : `[data-focus-target="${target.name}"]`;
  const control = app.querySelector(selector);
  if (!control || control.disabled) return;
  control.focus();
  if ('setSelectionRange' in control && Number.isInteger(target.start)) control.setSelectionRange(target.start, target.end);
}

function render(preferredFocus) {
  const focus = preferredFocus ?? currentFocus();
  const heading = element('h1', 'Team invitations');
  const form = element('form');
  const label = element('label', 'Email');
  const input = element('input');
  input.type = 'email';
  input.required = true;
  input.name = 'email';
  input.value = state.email;
  input.addEventListener('input', () => {
    state.email = input.value;
    state.emailRevision += 1;
  });
  label.append(input);

  const submit = element('button', state.send.pending ? 'Sending invitation…' : 'Send invitation');
  submit.type = 'submit';
  submit.disabled = state.send.pending;
  submit.dataset.focusTarget = 'send';
  form.append(label, submit);
  form.addEventListener('submit', submitInvitation);

  const feedback = element('div');
  feedback.setAttribute('aria-live', 'polite');
  if (state.send.confirmation) {
    const status = element('p', state.send.confirmation);
    status.setAttribute('role', 'status');
    feedback.append(status);
  }
  if (state.send.error) {
    const alert = element('p', state.send.error);
    alert.setAttribute('role', 'alert');
    feedback.append(alert);
  }

  const overviewSection = element('section');
  overviewSection.className = 'overview';
  overviewSection.append(element('h2', 'Overview'));
  const total = element('p', `Pending: ${state.overview.pending}`);
  total.dataset.testid = 'overview';
  const refresh = element('button', state.overviewRequest.pending ? 'Refreshing overview…' : 'Refresh overview');
  refresh.type = 'button';
  refresh.disabled = state.overviewRequest.pending;
  refresh.dataset.focusTarget = 'refresh';
  refresh.addEventListener('click', refreshOverview);
  overviewSection.append(total, refresh);
  if (state.overviewRequest.error) {
    const overviewError = element('p', state.overviewRequest.error);
    overviewError.setAttribute('role', 'alert');
    overviewSection.append(overviewError);
  }

  const list = element('ol');
  list.setAttribute('aria-label', 'Invitations');
  for (const row of state.rows) {
    const item = element('li');
    item.dataset.inviteId = row.id;
    item.append(element('span', row.email));
    for (const [name, delta] of [['Move earlier', -1], ['Move later', 1]]) {
      const button = element('button', name);
      button.type = 'button';
      button.disabled = state.rows.indexOf(row) + delta < 0 || state.rows.indexOf(row) + delta >= state.rows.length;
      button.dataset.focusTarget = `move-${row.id}-${delta}`;
      button.addEventListener('click', () => moveInvitation(row.id, delta, button.dataset.focusTarget));
      item.append(button);
    }
    list.append(item);
  }

  const noteLabel = element('label', 'Team note');
  const textarea = element('textarea');
  textarea.name = 'team-note';
  textarea.value = state.note;
  textarea.addEventListener('input', () => { state.note = textarea.value; });
  noteLabel.append(textarea);

  app.replaceChildren(heading, form, feedback, overviewSection, list, noteLabel);
  restoreFocus(focus);
}

function moveInvitation(id, delta, focusTarget) {
  const at = state.rows.findIndex(row => row.id === id);
  const next = at + delta;
  if (at < 0 || next < 0 || next >= state.rows.length) return;
  [state.rows[at], state.rows[next]] = [state.rows[next], state.rows[at]];
  render({ name: focusTarget });
}

async function refreshOverview() {
  if (state.overviewRequest.pending) return;
  state.overviewRequest = { pending: true, error: '' };
  render();
  try {
    state.overview = await readOverview();
  } catch {
    state.overviewRequest.error = 'Overview unavailable. Try refreshing again.';
  }
  state.overviewRequest.pending = false;
  render();
}

async function submitInvitation(event) {
  event.preventDefault();
  if (state.send.pending) return;

  const submittedEmail = state.email;
  const submittedRevision = state.emailRevision;
  state.send = { pending: true, confirmation: '', error: '' };
  render();

  let result;
  try {
    result = await sendInvitation(submittedEmail);
  } catch {
    state.send = { pending: false, confirmation: '', error: 'Invitation failed. Check the email and try again.' };
    render();
    return;
  }

  state.rows.push(result.invitation);
  state.send = {
    pending: false,
    confirmation: `Invitation sent to ${result.invitation.email}. Receipt ${result.receipt.id} accepted.`,
    error: '',
  };
  if (state.emailRevision === submittedRevision) state.email = '';
  render();
  await refreshOverview();
}

render();

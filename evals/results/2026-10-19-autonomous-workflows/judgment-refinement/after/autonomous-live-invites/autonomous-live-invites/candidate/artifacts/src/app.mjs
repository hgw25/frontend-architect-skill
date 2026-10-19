import { invitations, overview as initialOverview } from './data.mjs';
import { readOverview, sendInvitation } from './transport.mjs';

const app = document.querySelector('#app');

const state = {
  rows: [...invitations],
  overview: initialOverview,
  sending: false,
  overviewRequest: 0,
};

const rowElements = new Map();
let emailRevision = 0;

function element(tag, text) {
  const node = document.createElement(tag);
  if (text !== undefined) node.textContent = text;
  return node;
}

function showFeedback(node, text) {
  node.textContent = text;
  node.hidden = !text;
}

const heading = element('h1', 'Team invitations');

const form = element('form');
const emailLabel = element('label', 'Email');
const emailInput = element('input');
emailInput.type = 'email';
emailInput.name = 'email';
emailInput.autocomplete = 'email';
emailInput.required = true;
emailInput.addEventListener('input', () => {
  emailRevision += 1;
});
emailLabel.append(emailInput);

const submitButton = element('button', 'Send invitation');
submitButton.type = 'submit';
form.append(emailLabel, submitButton);

const sendStatus = element('p');
sendStatus.className = 'feedback';
sendStatus.setAttribute('role', 'status');
sendStatus.hidden = true;

const sendAlert = element('p');
sendAlert.className = 'feedback error';
sendAlert.setAttribute('role', 'alert');
sendAlert.hidden = true;

const overviewSection = element('section');
overviewSection.className = 'overview';
overviewSection.append(element('h2', 'Overview'));

const overviewTotal = element('p');
overviewTotal.dataset.testid = 'overview';

const refreshButton = element('button', 'Refresh overview');
refreshButton.type = 'button';

const overviewAlert = element('p');
overviewAlert.className = 'feedback error';
overviewAlert.setAttribute('role', 'alert');
overviewAlert.hidden = true;
overviewSection.append(overviewTotal, refreshButton, overviewAlert);

const invitationsHeading = element('h2', 'Invitations');
const list = element('ol');
list.setAttribute('aria-label', 'Invitations');

const noteLabel = element('label', 'Team note');
const note = element('textarea');
note.name = 'team-note';
noteLabel.append(note);

app.append(
  heading,
  form,
  sendStatus,
  sendAlert,
  overviewSection,
  invitationsHeading,
  list,
  noteLabel,
);

function updateOverview() {
  overviewTotal.textContent = `Pending: ${state.overview.pending}`;
}

function updateMoveAvailability() {
  state.rows.forEach((row, index) => {
    const controls = rowElements.get(row.id);
    controls.earlier.disabled = index === 0;
    controls.later.disabled = index === state.rows.length - 1;
  });
}

function moveInvitation(id, delta) {
  const currentIndex = state.rows.findIndex(row => row.id === id);
  const nextIndex = currentIndex + delta;
  if (currentIndex < 0 || nextIndex < 0 || nextIndex >= state.rows.length) return;

  const current = state.rows[currentIndex];
  const neighbor = state.rows[nextIndex];
  [state.rows[currentIndex], state.rows[nextIndex]] = [neighbor, current];

  const currentItem = rowElements.get(current.id).item;
  const neighborItem = rowElements.get(neighbor.id).item;
  if (delta < 0) {
    list.insertBefore(neighborItem, currentItem.nextSibling);
  } else {
    list.insertBefore(neighborItem, currentItem);
  }
  updateMoveAvailability();
}

function createInvitationRow(invitation) {
  const item = element('li');
  item.dataset.inviteId = invitation.id;

  const details = element('span');
  details.className = 'invite-details';
  details.append(
    element('span', invitation.email),
    element('small', invitation.state),
  );

  const controls = element('span');
  controls.className = 'row-actions';

  const earlier = element('button', 'Move earlier');
  earlier.type = 'button';
  earlier.addEventListener('click', () => moveInvitation(invitation.id, -1));

  const later = element('button', 'Move later');
  later.type = 'button';
  later.addEventListener('click', () => moveInvitation(invitation.id, 1));

  controls.append(earlier, later);
  item.append(details, controls);
  rowElements.set(invitation.id, { item, earlier, later });
  return item;
}

function appendInvitation(invitation) {
  state.rows.push(invitation);
  list.append(createInvitationRow(invitation));
  updateMoveAvailability();
}

async function refreshOverview() {
  const request = ++state.overviewRequest;
  refreshButton.disabled = true;
  overviewSection.setAttribute('aria-busy', 'true');
  showFeedback(overviewAlert, '');

  try {
    const nextOverview = await readOverview();
    if (request !== state.overviewRequest) return;
    state.overview = nextOverview;
    updateOverview();
  } catch {
    if (request !== state.overviewRequest) return;
    showFeedback(
      overviewAlert,
      'Overview is temporarily unavailable. Invitation details are still available.',
    );
  } finally {
    if (request === state.overviewRequest) {
      refreshButton.disabled = false;
      overviewSection.removeAttribute('aria-busy');
    }
  }
}

async function submitInvitation(event) {
  event.preventDefault();
  if (state.sending || !form.reportValidity()) return;

  const submittedEmail = emailInput.value;
  const submittedRevision = emailRevision;
  state.sending = true;
  submitButton.disabled = true;
  showFeedback(sendAlert, '');
  showFeedback(sendStatus, 'Sending invitation…');

  try {
    const result = await sendInvitation(submittedEmail);
    appendInvitation(result.invitation);
    showFeedback(
      sendStatus,
      `Invitation sent to ${result.invitation.email}. Receipt ${result.receipt.id}.`,
    );

    if (emailRevision === submittedRevision) {
      emailInput.value = '';
      emailRevision += 1;
    }

    void refreshOverview();
  } catch {
    showFeedback(sendStatus, '');
    showFeedback(sendAlert, 'The invitation could not be sent. Please try again.');
  } finally {
    state.sending = false;
    submitButton.disabled = false;
  }
}

form.addEventListener('submit', submitInvitation);
refreshButton.addEventListener('click', refreshOverview);

state.rows.forEach(row => list.append(createInvitationRow(row)));
updateOverview();
updateMoveAvailability();

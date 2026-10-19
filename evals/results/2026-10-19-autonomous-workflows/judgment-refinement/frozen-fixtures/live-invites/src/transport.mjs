async function read(response) {
  if (!response.ok) throw new Error('Service unavailable');
  return response.json();
}
export async function sendInvitation(email) {
  return read(await fetch('/api/invitations', {
    method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ email }),
  }));
}
export async function readOverview() {
  return read(await fetch('/api/overview'));
}

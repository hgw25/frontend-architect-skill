/**
 * sendInvite resolves only after authoritative confirmation, with a receipt.
 * Unknown write outcomes must be reconciled by that service's existing contract.
 */
export async function inviteMember(email, { sendInvite, reloadMembers }) {
  const receipt = await sendInvite(email);
  let members;
  try {
    members = await reloadMembers();
  } catch (refreshError) {
    return { kind: 'confirmed-refresh-failed', receipt, refreshError };
  }
  return { kind: 'confirmed', receipt, members };
}

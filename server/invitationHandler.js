// TC-04: Employee declines an invitation -> No account created; invitation status set to declined
export function handleDeclineInvitation({ invitationId, email, invitationsDb = [] }) {
  if (!invitationId && !email) {
    return {
      success: false,
      error: 'Invitation identifier or email is required to decline.',
    };
  }

  // Find invitation in database/records
  const invitation = invitationsDb.find(
    (inv) => inv.id === invitationId || (email && inv.email.toLowerCase() === email.toLowerCase())
  );

  if (!invitation) {
    return {
      success: false,
      error: 'Invitation not found.',
    };
  }

  if (invitation.status === 'accepted') {
    return {
      success: false,
      error: 'Invitation has already been accepted.',
    };
  }

  // Update status to declined
  invitation.status = 'declined';
  invitation.declined_at = new Date().toISOString();

  return {
    success: true,
    status: 'declined',
    accountCreated: false,
    message: 'Invitation declined successfully. No account was created.',
    invitation,
  };
}

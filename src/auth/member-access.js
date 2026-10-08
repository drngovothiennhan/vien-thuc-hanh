// A linked HIU TMC member has a non-empty member id in the verified session.
// Role does not gate the Game Hub; the server re-checks approval on every RPC.
export function canAccessGameHub(member) {
  return Boolean(member && typeof member.id === 'string' && member.id.trim());
}

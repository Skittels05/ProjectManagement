export function isOwnerRoleName(role: string): boolean {
  return /^owner$/i.test(role.trim());
}

export function isAssignableMemberRole(role: string): boolean {
  const t = role.trim();
  return t.length > 0 && t.length <= 32 && !isOwnerRoleName(t);
}

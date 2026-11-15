export function isVisibleTo(requireRole: string[], role: string): boolean {
  return requireRole.length === 0 || requireRole.includes(role)
}

const ADMIN_USER_NAMES = ["Hermann Eiblmeier", "Anatoli Lyssenko"];

function normalizeName(name: string) {
  return name.trim().toLowerCase().replace(/\s+/g, " ");
}

export function getAdminUserNames() {
  return [...ADMIN_USER_NAMES];
}

export function isConfiguredAdminName(name: string) {
  const normalized = normalizeName(name);
  return ADMIN_USER_NAMES.some((adminName) => normalizeName(adminName) === normalized);
}

export function isAdminUser(user: { name: string; isAdmin: boolean }) {
  return user.isAdmin || isConfiguredAdminName(user.name);
}

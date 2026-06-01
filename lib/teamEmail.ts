const ALLOWED_TEAM_EMAIL_DOMAINS = [
  "@protos-3d.de",
  // Temporary testing domain; do not show in UI.
  "@yahoo.com",
];

export function isAllowedTeamEmail(email: string) {
  const normalizedEmail = email.trim().toLowerCase();
  return ALLOWED_TEAM_EMAIL_DOMAINS.some((domain) =>
    normalizedEmail.endsWith(domain),
  );
}

export function getTeamEmailRejectedMessage() {
  return "You are not a member of our team, sorry, you can't register.";
}

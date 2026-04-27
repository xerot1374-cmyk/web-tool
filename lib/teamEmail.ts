const ALLOWED_TEAM_EMAIL_DOMAIN = "@protos-3d.de";

export function isAllowedTeamEmail(email: string) {
  return email.trim().toLowerCase().endsWith(ALLOWED_TEAM_EMAIL_DOMAIN);
}

export function getTeamEmailRejectedMessage() {
  return "You are not a member of our team, sorry, you can't register.";
}

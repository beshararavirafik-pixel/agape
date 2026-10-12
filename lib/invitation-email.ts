export type InvitationEmailKind = "partner" | "guest";

export function invitationEmailContent(
  kind: InvitationEmailKind,
  eventName: string,
  url: string,
) {
  return kind === "partner"
    ? {
        subject: "You're invited to plan together on Agapē",
        text: `You've been invited to help plan ${eventName}.\n\nOpen your private invitation:\n${url}\n\nSign in or create an account using the email address that received this invitation. The link expires in 14 days and can only be accepted once.\n\nIf you weren't expecting this invitation, you can ignore this email.`,
      }
    : {
        subject: "Your celebration invitation from Agapē",
        text: `You're invited to ${eventName}!\n\nView your invitation and RSVP:\n${url}\n\nThis private link gives access to the people included in your invitation. Please keep it private.\n\nIf you weren't expecting this invitation, you can ignore this email.`,
      };
}

export function invitationEmailUrl(
  appUrl: string,
  kind: InvitationEmailKind,
  token: string,
) {
  const url = new URL(appUrl);
  if (
    !["http:", "https:"].includes(url.protocol) ||
    url.username ||
    url.password
  ) {
    throw new Error("Invalid application URL");
  }
  url.search = "";
  url.hash = "";
  url.searchParams.set(kind === "partner" ? "invite" : "invitation", token);
  return url.toString();
}

import { supabase } from "./supabase";
import { sitePath } from "./site-path";
import type { InvitationEmailKind } from "./invitation-email";

export async function sendInvitationEmail(
  eventId: string,
  kind: InvitationEmailKind,
  token: string,
  recipient?: string,
) {
  if (!supabase) throw new Error("Sign in to email invitations.");
  const { data, error } = await supabase.auth.getSession();
  if (error || !data.session)
    throw new Error("Sign in again to email this invitation.");
  const response = await fetch(sitePath("/api/invitations/email"), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${data.session.access_token}`,
    },
    body: JSON.stringify({ eventId, kind, token, recipient }),
  });
  const result = await response.json();
  if (!response.ok)
    throw new Error(
      result.error ||
        "The invitation could not be emailed. You can still copy its link.",
    );
  return result as { recipient: string; message: string };
}

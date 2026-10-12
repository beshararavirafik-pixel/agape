import { createClient } from "@supabase/supabase-js";
import { Resend } from "resend";
import {
  invitationEmailContent,
  invitationEmailUrl,
} from "@/lib/invitation-email";

export const runtime = "nodejs";

const reply = (body: object, status = 200) =>
  Response.json(body, {
    status,
    headers: { "Cache-Control": "no-store" },
  });

export async function POST(request: Request) {
  const authorization = request.headers.get("authorization") || "";
  if (!/^Bearer \S+$/.test(authorization))
    return reply({ error: "Sign in to email invitations." }, 401);
  if (Number(request.headers.get("content-length") || 0) > 4096)
    return reply({ error: "Request is too large." }, 413);
  let input;
  try {
    const text = await request.text();
    if (text.length > 4096)
      return reply({ error: "Request is too large." }, 413);
    input = JSON.parse(text);
  } catch {
    return reply({ error: "Invalid invitation request." }, 400);
  }
  if (
    !input ||
    typeof input !== "object" ||
    !["partner", "guest"].includes(input.kind) ||
    typeof input.eventId !== "string" ||
    !/^[0-9a-f-]{36}$/i.test(input.eventId) ||
    typeof input.token !== "string" ||
    !/^[0-9a-f-]{64,72}$/i.test(input.token) ||
    (input.kind === "guest" &&
      (typeof input.recipient !== "string" || input.recipient.length > 254))
  ) {
    return reply({ error: "Choose a valid invitation and recipient." }, 400);
  }
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (
    !url ||
    !key ||
    !process.env.RESEND_API_KEY ||
    !process.env.APP_URL ||
    !process.env.RESEND_FROM_EMAIL
  ) {
    return reply(
      {
        error:
          "Invitation email is not configured yet. You can still copy the link.",
      },
      503,
    );
  }
  try {
    // Use the caller's JWT and RLS, never a service-role bypass.
    const db = createClient(url, key, {
      global: { headers: { Authorization: authorization } },
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
    });
    const { data: account, error: authError } = await db.auth.getUser(
      authorization.slice(7),
    );
    if (authError || !account.user)
      return reply({ error: "Sign in again to email invitations." }, 401);
    const { data: prepared, error } = await db.rpc("prepare_invitation_email", {
      e: input.eventId,
      invitation_kind: input.kind,
      invitation_token: input.token,
      recipient_email:
        input.kind === "guest" ? input.recipient.trim().toLowerCase() : null,
    });
    if (error)
      return reply(
        { error: error.message },
        error.message.includes("limit") ? 429 : 403,
      );
    const link = invitationEmailUrl(
      process.env.APP_URL,
      input.kind,
      input.token,
    );
    const content = invitationEmailContent(
      input.kind,
      prepared.event_name,
      link,
    );
    const result = await new Resend(process.env.RESEND_API_KEY).emails.send(
      {
        from: process.env.RESEND_FROM_EMAIL,
        to: [prepared.recipient],
        ...content,
      },
      {
        idempotencyKey: `agape-invitation-${prepared.delivery_id}`,
        signal: AbortSignal.timeout(15000),
      },
    );
    if (result.error) {
      const message =
        result.error.statusCode === 403
          ? "Resend could not send to this address. The resend.dev test sender can only email your Resend account address. Verify a sending domain to invite other people."
          : result.error.statusCode === 429
            ? "Email sending is temporarily rate limited. Please retry this same invitation later."
            : "Email could not be sent. Retry this invitation or copy its link.";
      return reply(
        { error: message },
        result.error.statusCode === 429 ? 429 : 502,
      );
    }
    return reply({
      recipient: prepared.recipient,
      message: "Invitation accepted for delivery.",
    });
  } catch {
    return reply(
      {
        error:
          "Email service could not be reached. Retry this same invitation or copy its link.",
      },
      502,
    );
  }
}

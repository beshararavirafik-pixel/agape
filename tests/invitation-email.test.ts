import { test } from "node:test";
import assert from "node:assert/strict";
import {
  invitationEmailContent,
  invitationEmailUrl,
} from "../lib/invitation-email.ts";
import { POST } from "../app/api/invitations/email/route.ts";

test("invitation emails use the configured origin and separate partner and guest tokens", () => {
  const partner = invitationEmailUrl(
    "https://agape-xi.vercel.app/?untrusted=1#fragment",
    "partner",
    "private-token",
  );
  assert.equal(partner, "https://agape-xi.vercel.app/?invite=private-token");
  assert.equal(
    new URL(
      invitationEmailUrl(
        "https://agape-xi.vercel.app/",
        "guest",
        "other-token",
      ),
    ).searchParams.get("invitation"),
    "other-token",
  );
  assert.throws(() =>
    invitationEmailUrl("javascript:alert(1)", "guest", "token"),
  );
  assert.throws(() =>
    invitationEmailUrl("https://user:password@example.com", "guest", "token"),
  );
  const email = invitationEmailContent("partner", "A & B's wedding", partner);
  assert.match(email.text, /14 days/);
  assert.ok(email.text.includes(partner));
});

test("email endpoint rejects anonymous and malformed requests before accessing providers", async () => {
  const anonymous = await POST(
    new Request("https://example.com/api/invitations/email", {
      method: "POST",
      body: "{}",
    }),
  );
  assert.equal(anonymous.status, 401);
  const malformed = await POST(
    new Request("https://example.com/api/invitations/email", {
      method: "POST",
      headers: { Authorization: "Bearer invalid" },
      body: '{"kind":"guest","recipient":"not invited"}',
    }),
  );
  assert.equal(malformed.status, 400);
  assert.equal(malformed.headers.get("cache-control"), "no-store");
});

test("email endpoint validates the caller and sends only to the database-approved recipient", async (t) => {
  const env = {
    NEXT_PUBLIC_SUPABASE_URL: "https://database.example.com",
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "test-public-key",
    RESEND_API_KEY: "re_test_only",
    RESEND_FROM_EMAIL: "Agapē <onboarding@resend.dev>",
    APP_URL: "https://agape-xi.vercel.app/",
  };
  const previous = Object.fromEntries(
    Object.keys(env).map((key) => [key, process.env[key]]),
  );
  t.after(() => {
    for (const [key, value] of Object.entries(previous)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  });
  Object.assign(process.env, env);
  const calls: { url: string; options?: RequestInit }[] = [];
  let denial = false;
  let sandbox = false;
  t.mock.method(
    globalThis,
    "fetch",
    async (url: string | URL | Request, options?: RequestInit) => {
      calls.push({ url: String(url), options });
      if (String(url).endsWith("/auth/v1/user"))
        return Response.json({ id: "91100000-0000-4000-8000-000000000001" });
      if (String(url).endsWith("/rpc/prepare_invitation_email"))
        return denial
          ? Response.json(
              { message: "Recipient is not invited", code: "P0001" },
              { status: 403 },
            )
          : Response.json({
              delivery_id: "delivery-123",
              recipient: "saved@example.com",
              event_name: "Our wedding",
            });
      if (String(url) === "https://api.resend.com/emails")
        return sandbox
          ? Response.json(
              {
                name: "validation_error",
                message: "Testing recipients only",
                statusCode: 403,
              },
              { status: 403 },
            )
          : Response.json({ id: "email-123" });
      throw new Error("Unexpected provider request");
    },
  );
  const send = () =>
    POST(
      new Request("https://untrusted-host.example/api/invitations/email", {
        method: "POST",
        headers: { Authorization: "Bearer test-session-token" },
        body: JSON.stringify({
          kind: "partner",
          eventId: "91300000-0000-4000-8000-000000000001",
          token: "a".repeat(64),
          recipient: "attacker@example.com",
        }),
      }),
    );
  const success = await send();
  assert.equal(success.status, 200, JSON.stringify(calls));
  assert.equal((await success.json()).recipient, "saved@example.com");
  assert.equal(
    new Headers(calls[1].options?.headers).get("authorization"),
    "Bearer test-session-token",
  );
  assert.equal(
    JSON.parse(String(calls[1].options?.body)).recipient_email,
    null,
  );
  const email = JSON.parse(String(calls[2].options?.body));
  assert.deepEqual(email.to, ["saved@example.com"]);
  assert.ok(email.text.includes("https://agape-xi.vercel.app/?invite="));
  assert.equal(
    new Headers(calls[2].options?.headers).get("idempotency-key"),
    "agape-invitation-delivery-123",
  );
  denial = true;
  calls.length = 0;
  assert.equal((await send()).status, 403);
  assert.equal(calls.length, 2, "denied requests must not reach Resend");
  denial = false;
  sandbox = true;
  const rejected = await send();
  assert.equal(rejected.status, 502);
  assert.match((await rejected.json()).error, /test sender/);
});

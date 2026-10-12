"use client";
import { useState } from "react";
import { Copy, Heart, Link2, Mail } from "lucide-react";
export default function Partner({
  onInvite,
  onEmail,
  link,
  isOwner,
  demo,
}: {
  onInvite: (email: string) => Promise<void>;
  onEmail: () => Promise<{ recipient: string }>;
  link: string;
  isOwner: boolean;
  demo: boolean;
}) {
  const [email, setEmail] = useState(""),
    [busy, setBusy] = useState(false),
    [copied, setCopied] = useState(false),
    [notice, setNotice] = useState(""),
    [error, setError] = useState("");
  return (
    <section className="card partner-card">
      <h3>
        <Heart size={18} /> Plan together
      </h3>
      <p className="muted">
        Shared plans. Changes save automatically and appear for your partner
        within a few seconds.
      </p>
      {isOwner ? (
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            setBusy(true);
            try {
              await onInvite(email);
            } finally {
              setBusy(false);
            }
          }}
        >
          <label>
            Partner’s email
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="partner@example.com"
            />
          </label>
          <button className="primary" disabled={busy || demo}>
            <Link2 size={15} /> {busy ? "Creating…" : "Create invitation link"}
          </button>
          {demo && <small>Sign in to invite your partner.</small>}
        </form>
      ) : (
        <div className="badge">You’re planning together</div>
      )}
      {link && (
        <div className="invite-link">
          <input aria-label="Partner invitation link" value={link} readOnly />
          <button
            onClick={async () => {
              await navigator.clipboard.writeText(link);
              setCopied(true);
            }}
          >
            <Copy size={15} />
            {copied ? "Copied" : "Copy"}
          </button>
          <small>
            Send this link to your partner. They must sign in with the invited
            email. Expires in 14 days.
          </small>
          <button
            type="button"
            disabled={busy || demo}
            onClick={async () => {
              setBusy(true);
              setError("");
              setNotice("");
              try {
                const sent = await onEmail();
                setNotice(
                  `Invitation submitted for delivery to ${sent.recipient}.`,
                );
              } catch (error) {
                setError(
                  error instanceof Error
                    ? error.message
                    : "Email could not be sent. You can still copy the link.",
                );
              } finally {
                setBusy(false);
              }
            }}
          >
            <Mail size={15} /> {busy ? "Sending…" : "Email partner invitation"}
          </button>
        </div>
      )}
      {notice && <p role="status">{notice}</p>}
      {error && <p role="alert">{error}</p>}
    </section>
  );
}

"use client";
import { useState } from "react";
import { Copy, Heart, Link2 } from "lucide-react";
export default function Partner({
  onInvite,
  link,
  isOwner,
  demo,
}: {
  onInvite: (email: string) => Promise<void>;
  link: string;
  isOwner: boolean;
  demo: boolean;
}) {
  const [email, setEmail] = useState(""),
    [busy, setBusy] = useState(false),
    [copied, setCopied] = useState(false);
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
        </div>
      )}
    </section>
  );
}

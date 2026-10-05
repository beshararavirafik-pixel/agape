"use client";
import { useEffect, useState } from "react";
import { Copy, Plus, Eye, Link2, Trash2 } from "lucide-react";
import { State } from "@/lib/model";
import { supabase } from "@/lib/supabase";
import { basePath, sitePath } from "@/lib/site-path";
import DateInput from "./date-input";
import { InvitationContent } from "./invitee-view";
type LinkInfo = { id: string; label: string; revoked: boolean };
export default function InvitationManager({
  state,
  demo,
}: {
  state: State;
  demo: boolean;
}) {
  const [content, setContent] = useState<InvitationContent>({}),
    [selected, setSelected] = useState<string[]>([]),
    [clergy, setClergy] = useState(""),
    [links, setLinks] = useState<LinkInfo[]>([]),
    [url, setUrl] = useState(""),
    [busy, setBusy] = useState(false),
    [notice, setNotice] = useState(""),
    [error, setError] = useState(""),
    [query, setQuery] = useState(""),
    [copied, setCopied] = useState(false);
  useEffect(() => {
    if (demo || !supabase) return;
    let active = true;
    Promise.all([
      supabase
        .from("invitation_settings")
        .select("content")
        .eq("event_id", state.event.id)
        .maybeSingle(),
      supabase.rpc("manage_guest_invitations", { e: state.event.id }),
    ]).then(([settings, list]) => {
      if (!active) return;
      if (settings.error || list.error)
        setError((settings.error || list.error)!.message);
      else {
        setContent(settings.data?.content || {});
        setLinks(list.data || []);
      }
    });
    return () => {
      active = false;
    };
  }, [state.event.id, demo]);
  async function persist() {
    if (demo) {
      setNotice("Sample settings saved for this preview.");
      return;
    }
    setBusy(true);
    setError("");
    const { error } = await supabase!
      .from("invitation_settings")
      .upsert({ event_id: state.event.id, content });
    if (error) setError(error.message);
    else setNotice("Invitation details saved.");
    setBusy(false);
  }
  async function create() {
    setError("");
    setBusy(true);
    setCopied(false);
    if (demo) {
      setUrl(`${location.origin}${basePath}/?invitation=sample`);
      setBusy(false);
      return;
    }
    const { data, error } = await supabase!.rpc("create_guest_invitation", {
      e: state.event.id,
      ids: selected,
      clergy: clergy || null,
      label: state.guests
        .filter((g) => selected.includes(g.id))
        .map((g) => g.name)
        .join(", "),
    });
    if (error) setError(error.message);
    else {
      setUrl(`${location.origin}${basePath}/?invitation=${data.token}`);
      const list = await supabase!.rpc("manage_guest_invitations", {
        e: state.event.id,
      });
      setLinks(list.data || []);
    }
    setBusy(false);
  }
  const fields: [keyof InvitationContent, string, string][] = [
    ["welcome", "Welcome message", "We can’t wait to celebrate with you."],
    ["photo", "Couple photo URL", "https://…"],
    ["church", "Church address", "Church name and full address"],
    ["reception", "Reception address", "Venue name and full address"],
    ["dress", "Dress code", "Formal, cocktail, or your preference"],
    ["parking", "Parking", "Where guests should park"],
    ["accommodation", "Accommodation", "Hotels and helpful travel information"],
    ["registry", "Registry URL", "https://…"],
    ["contact", "Contact for questions", "Name and preferred contact details"],
  ];
  return (
    <div className="invitation-manager">
      <section className="card">
        <div className="invitee-heading">
          <h3>Guest experience</h3>
          <a
            className="invitee-link"
            href={sitePath("/?invitation=sample")}
            target="_blank"
            rel="noopener noreferrer"
          >
            <Eye size={16} />
            Sample invitation
          </a>
        </div>
        <p className="muted">
          A private invitation for each guest or family. No account needed.
          Share links directly while email setup is paused.
        </p>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void persist();
          }}
        >
          <div className="form-grid">
            {fields.map(([key, label, placeholder]) => (
              <label key={key}>
                {label}
                {[
                  "welcome",
                  "parking",
                  "accommodation",
                  "contact",
                  "dress",
                ].includes(key) ? (
                  <textarea
                    rows={2}
                    maxLength={2000}
                    value={String(content[key] || "")}
                    placeholder={placeholder}
                    onChange={(e) =>
                      setContent({ ...content, [key]: e.target.value })
                    }
                  />
                ) : (
                  <input
                    type={["photo", "registry"].includes(key) ? "url" : "text"}
                    value={String(content[key] || "")}
                    placeholder={placeholder}
                    onChange={(e) =>
                      setContent({ ...content, [key]: e.target.value })
                    }
                  />
                )}
              </label>
            ))}
            <label>
              Ceremony time
              <input
                type="time"
                value={content.church_time || ""}
                onChange={(e) =>
                  setContent({ ...content, church_time: e.target.value })
                }
              />
            </label>
            <label>
              Reception time
              <input
                type="time"
                value={content.reception_time || ""}
                onChange={(e) =>
                  setContent({ ...content, reception_time: e.target.value })
                }
              />
            </label>
            <label>
              RSVP deadline
              <DateInput
                value={content.deadline || ""}
                onChange={(value) =>
                  setContent({ ...content, deadline: value })
                }
              />
            </label>
          </div>
          <div className="invitation-publish">
            <label>
              <input
                type="checkbox"
                checked={!!content.publish_seating}
                onChange={(e) =>
                  setContent({ ...content, publish_seating: e.target.checked })
                }
              />
              Publish reception tables
            </label>
            <label>
              <input
                type="checkbox"
                checked={!!content.publish_assignments}
                onChange={(e) =>
                  setContent({
                    ...content,
                    publish_assignments: e.target.checked,
                  })
                }
              />
              Publish church assignments
            </label>
          </div>
          <button className="primary" disabled={busy}>
            Save invitation details
          </button>
        </form>
      </section>
      <section className="card">
        <h3>Create a private invitation</h3>
        <p className="muted">
          Select exactly who this link includes. Anyone with the link can view
          and reply for these people.
        </p>
        <label>
          Find invitees
          <input
            type="search"
            value={query}
            placeholder="Search names"
            onChange={(e) => setQuery(e.target.value)}
          />
        </label>
        <div className="invitation-guest-picker">
          {state.guests
            .filter((g) => g.name.toLowerCase().includes(query.toLowerCase()))
            .map((g) => (
              <label key={g.id}>
                <input
                  type="checkbox"
                  checked={selected.includes(g.id)}
                  onChange={(e) =>
                    setSelected(
                      e.target.checked
                        ? [...selected, g.id]
                        : selected.filter((id) => id !== g.id),
                    )
                  }
                />
                <span>
                  {g.name}
                  <small>{g.household}</small>
                </span>
              </label>
            ))}
        </div>
        <label>
          Church participant linked to this invitation
          <select value={clergy} onChange={(e) => setClergy(e.target.value)}>
            <option value="">No church assignments</option>
            {state.records
              .filter((r) => r.kind === "ceremony_clergy")
              .sort((a, b) => a.title.localeCompare(b.title))
              .map((r) => (
                <option value={r.id} key={r.id}>
                  {r.title} · {r.details?.role}
                </option>
              ))}
          </select>
        </label>
        <small>
          For a deacon, choose their matching church entry. Their assignments
          appear when published.
        </small>
        <div className="invitation-create">
          <span>{selected.length} selected</span>
          <button
            className="add-circle"
            aria-label="Create invitation link"
            disabled={busy || !selected.length}
            onClick={() => void create()}
          >
            <Plus size={18} />
          </button>
        </div>
        {url && (
          <div className="invitation-created">
            <Link2 size={18} />
            <input aria-label="Private invitation link" readOnly value={url} />
            <button
              aria-label="Copy invitation link"
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(url);
                  setCopied(true);
                } catch {
                  setError("Copy the link from the field.");
                }
              }}
            >
              <Copy size={16} />
            </button>
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Open invitation"
            >
              <Eye size={18} />
            </a>
            {copied && <small role="status">Copied</small>}
          </div>
        )}
      </section>
      {!!links.length && (
        <section className="card">
          <h3>Shared invitations</h3>
          {links.map((l) => (
            <div className="invitation-link-row" key={l.id}>
              <span>
                {l.label}
                <small>
                  {l.revoked
                    ? "Link withdrawn"
                    : "Active · expires after one year"}
                </small>
              </span>
              {!l.revoked && (
                <button
                  aria-label={`Withdraw invitation for ${l.label}`}
                  onClick={async () => {
                    const { data, error } = await supabase!.rpc(
                      "manage_guest_invitations",
                      { e: state.event.id, revoke_id: l.id },
                    );
                    if (error) setError(error.message);
                    else setLinks(data);
                  }}
                >
                  <Trash2 size={16} />
                </button>
              )}
            </div>
          ))}
        </section>
      )}
      {notice && <p role="status">{notice}</p>}
      {error && (
        <p role="alert" className="invitee-error">
          {error}
        </p>
      )}
    </div>
  );
}

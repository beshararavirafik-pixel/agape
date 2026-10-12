"use client";
import { useEffect, useState } from "react";
import {
  ArrowDown,
  ArrowUp,
  Copy,
  Eye,
  Globe2,
  Mail,
  Monitor,
  Plus,
  Redo2,
  Smartphone,
  Trash2,
  Undo2,
  Upload,
  Printer,
} from "lucide-react";
import type { State } from "@/lib/model";
import { supabase } from "@/lib/supabase";
import { basePath } from "@/lib/site-path";
import {
  defaultDesign,
  normalizeDesign,
  weddingTemplates,
  type WeddingDesign,
  type WebsiteSection,
} from "@/lib/wedding-design";
import type { InvitationContent } from "./invitee-view";
import { WebsiteCanvas, websiteDate } from "./wedding-website";
import WeddingCover from "./wedding-cover";
const startingSections: WebsiteSection[] = [
  {
    id: "story",
    type: "story",
    title: "Our story",
    text: "Two paths, one beautiful beginning. Tell the story of how you met, the little moments you treasure, and the proposal that brought you here.",
  },
  {
    id: "day",
    type: "details",
    title: "The celebration",
    text: "We’re so excited to share this day with our favorite people.",
  },
];
export default function WeddingBuilder({
  state,
  demo,
}: {
  state: State;
  demo: boolean;
}) {
  const [content, setContent] = useState<InvitationContent>({}),
    [loading, setLoading] = useState(true),
    [busy, setBusy] = useState(false);
  const [mode, setMode] = useState<"website" | "invitation">("website"),
    [panel, setPanel] = useState<"design" | "content">("design"),
    [phone, setPhone] = useState(false);
  const [past, setPast] = useState<InvitationContent[]>([]),
    [future, setFuture] = useState<InvitationContent[]>([]),
    [message, setMessage] = useState(""),
    [error, setError] = useState("");
  const [dirty, setDirty] = useState(false),
    [published, setPublished] = useState(false),
    [publicUrl, setPublicUrl] = useState("");
  const storageKey = `agape-wedding-design-${state.event.id}`;
  useEffect(() => {
    let active = true;
    const accept = (value: InvitationContent) => {
      if (!active) return;
      const next = {
        ...value,
        website_sections: value.website_sections ?? startingSections,
      };
      setContent(next);
      setPublished(!!value.website_published);
      setLoading(false);
      setPublicUrl(`${location.origin}${basePath}/?website=${state.event.id}`);
    };
    if (demo) {
      try {
        accept(JSON.parse(localStorage.getItem(storageKey) || "{}"));
      } catch {
        accept({});
      }
    } else if (supabase)
      supabase
        .from("invitation_settings")
        .select("content")
        .eq("event_id", state.event.id)
        .maybeSingle()
        .then(({ data, error }) => {
          if (!active) return;
          if (error) {
            setError(error.message);
            setLoading(false);
          } else accept(data?.content || {});
        });
    else {
      setError("Please sign in to save your wedding website.");
      setLoading(false);
    }
    return () => {
      active = false;
    };
  }, [state.event.id, demo, storageKey]);
  function change(next: InvitationContent) {
    setPast((p) => [...p.slice(-39), content]);
    setContent(next);
    setFuture([]);
    setDirty(true);
    setMessage("");
  }
  const key = mode === "website" ? "website_design" : "invitation_design";
  const design = normalizeDesign(
    content[key] || {
      ...defaultDesign,
      photo: content.photo || "",
      message: content.welcome || defaultDesign.message,
    },
  );
  function editDesign(patch: Partial<WeddingDesign>) {
    change({ ...content, [key]: { ...design, ...patch } });
  }
  async function save(publish?: boolean) {
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const next = {
        ...content,
        website_published: publish ?? published,
      };
      if (demo) {
        localStorage.setItem(storageKey, JSON.stringify(next));
        localStorage.setItem(
          "agape-sample-invitation-design",
          JSON.stringify(next.invitation_design || null),
        );
      } else {
        if (!supabase) throw new Error("Sign in to save your website.");
        // Preserve invitation settings edited by the other planning screen.
        const latest = await supabase
          .from("invitation_settings")
          .select("content")
          .eq("event_id", state.event.id)
          .maybeSingle();
        if (latest.error) throw latest.error;
        const merged = {
          ...(latest.data?.content || {}),
          website_design: next.website_design,
          invitation_design: next.invitation_design,
          website_sections: next.website_sections,
          website_published: next.website_published,
        };
        const result = await supabase
          .from("invitation_settings")
          .upsert({ event_id: state.event.id, content: merged });
        if (result.error) throw result.error;
      }
      setContent(next);
      setPublished(!!next.website_published);
      setDirty(false);
      setMessage(
        demo
          ? "Design saved on this device. Sample websites are not public."
          : publish === true
            ? "Your wedding website is published. Share its link below."
            : publish === false
              ? "Your wedding website is unpublished."
              : "Design saved. Your invitation links use the updated design.",
      );
    } catch (e) {
      setError(
        (e as { message?: string }).message ||
          "Could not save. Please try again.",
      );
    } finally {
      setBusy(false);
    }
  }
  async function upload(file?: File) {
    if (!file) return;
    if (
      !["image/jpeg", "image/png", "image/webp"].includes(file.type) ||
      file.size > 750000
    ) {
      setError(
        "Choose a JPG, PNG, or WebP smaller than 750 KB, or use a photo URL.",
      );
      return;
    }
    const reader = new FileReader();
    reader.onload = () =>
      editDesign({ photo: String(reader.result), photoOpacity: 45 });
    reader.onerror = () => setError("Could not read this photo.");
    reader.readAsDataURL(file);
  }
  function sectionEdit(id: string, patch: Partial<WebsiteSection>) {
    change({
      ...content,
      website_sections: content.website_sections?.map((s) =>
        s.id === id ? { ...s, ...patch } : s,
      ),
    });
  }
  function move(i: number, delta: number) {
    const sections = [...(content.website_sections || [])];
    [sections[i], sections[i + delta]] = [sections[i + delta], sections[i]];
    change({ ...content, website_sections: sections });
  }
  if (loading) return <p role="status">Opening your design studio…</p>;
  return (
    <div className="wedding-builder">
      <div className="builder-topbar">
        <div
          className="builder-segment"
          role="group"
          aria-label="Design target"
        >
          <button
            aria-pressed={mode === "website"}
            onClick={() => setMode("website")}
          >
            <Globe2 size={16} />
            Website
          </button>
          <button
            aria-pressed={mode === "invitation"}
            onClick={() => setMode("invitation")}
          >
            <Mail size={16} />
            Invitation
          </button>
        </div>
        <div className="builder-top-actions">
          <button
            aria-label="Undo design change"
            disabled={!past.length || busy}
            onClick={() => {
              setFuture((f) => [content, ...f]);
              setContent(past[past.length - 1]);
              setPast((p) => p.slice(0, -1));
              setDirty(true);
            }}
          >
            <Undo2 size={17} />
          </button>
          <button
            aria-label="Redo design change"
            disabled={!future.length || busy}
            onClick={() => {
              setPast((p) => [...p, content]);
              setContent(future[0]);
              setFuture((f) => f.slice(1));
              setDirty(true);
            }}
          >
            <Redo2 size={17} />
          </button>
          {mode === "invitation" && (
            <button
              aria-label="Print invitation or save as PDF"
              title="Print or save as PDF"
              onClick={() => window.print()}
            >
              <Printer size={17} />
            </button>
          )}
          <button
            className="primary"
            disabled={busy || (!!error && !content.website_sections)}
            onClick={() => void save()}
          >
            {busy ? "Saving…" : dirty ? "Save design" : "Save"}
          </button>
        </div>
      </div>
      <div className="builder-workspace">
        <aside className="builder-controls">
          <div className="builder-panel-tabs">
            <button
              aria-pressed={panel === "design"}
              onClick={() => setPanel("design")}
            >
              Style
            </button>
            <button
              aria-pressed={panel === "content"}
              onClick={() => setPanel("content")}
            >
              Content
            </button>
          </div>
          {panel === "design" ? (
            <>
              <h3>Start with a feeling</h3>
              <div className="builder-templates">
                {weddingTemplates.map((t) => (
                  <button
                    key={t.name}
                    onClick={() =>
                      editDesign({
                        ...t.design,
                        photo: design.photo,
                        message: design.message,
                        overline: design.overline,
                      })
                    }
                  >
                    <span
                      className={`template-swatch texture-${t.design.texture}`}
                      style={{
                        backgroundColor: t.design.paper,
                        color: t.design.ink,
                        borderColor: t.design.accent,
                      }}
                    >
                      A<i>&</i>J
                    </span>
                    <strong>{t.name}</strong>
                    <small>{t.note}</small>
                  </button>
                ))}
              </div>
              <h3>Palette</h3>
              <div className="builder-colors">
                {(
                  [
                    ["paper", "Paper"],
                    ["ink", "Ink"],
                    ["accent", "Accent"],
                  ] as const
                ).map(([k, label]) => (
                  <label key={k}>
                    <input
                      aria-label={`${label} color`}
                      type="color"
                      value={design[k]}
                      onChange={(e) => editDesign({ [k]: e.target.value })}
                    />
                    <span>{label}</span>
                  </label>
                ))}
              </div>
              <label>
                Typography
                <select
                  value={design.font}
                  onChange={(e) =>
                    editDesign({
                      font: e.target.value as WeddingDesign["font"],
                    })
                  }
                >
                  <option value="editorial">Editorial serif</option>
                  <option value="classic">Classic serif</option>
                  <option value="modern">Modern sans</option>
                  <option value="romantic">Romantic italic</option>
                </select>
              </label>
              <label>
                Paper texture
                <select
                  value={design.texture}
                  onChange={(e) =>
                    editDesign({
                      texture: e.target.value as WeddingDesign["texture"],
                    })
                  }
                >
                  <option value="smooth">Smooth</option>
                  <option value="linen">Woven linen</option>
                  <option value="paper">Handmade paper</option>
                  <option value="marble">Carrara marble</option>
                </select>
              </label>
              <label>
                Cover shape
                <select
                  value={design.shape}
                  onChange={(e) =>
                    editDesign({
                      shape: e.target.value as WeddingDesign["shape"],
                    })
                  }
                >
                  <option value="arch">Arched</option>
                  <option value="rounded">Soft corners</option>
                  <option value="square">Straight edges</option>
                </select>
              </label>
              <label>
                Decorative element
                <select
                  value={design.motif}
                  onChange={(e) =>
                    editDesign({
                      motif: e.target.value as WeddingDesign["motif"],
                    })
                  }
                >
                  <option value="none">None</option>
                  <option value="frame">Fine border</option>
                  <option value="botanical">Botanical linework</option>
                  <option value="stars">Celestial stars</option>
                </select>
              </label>
              <label>
                Name size{" "}
                <input
                  type="range"
                  min="65"
                  max="130"
                  value={design.scale}
                  onChange={(e) => editDesign({ scale: +e.target.value })}
                />
              </label>
              <label>
                Photo presence{" "}
                <input
                  type="range"
                  min="0"
                  max="75"
                  value={design.photoOpacity}
                  onChange={(e) =>
                    editDesign({ photoOpacity: +e.target.value })
                  }
                />
              </label>
            </>
          ) : (
            <>
              <h3>The invitation</h3>
              <label>
                Opening line
                <input
                  maxLength={120}
                  value={design.overline}
                  onChange={(e) => editDesign({ overline: e.target.value })}
                />
              </label>
              <label>
                Welcome message
                <textarea
                  rows={3}
                  maxLength={500}
                  value={design.message}
                  onChange={(e) => editDesign({ message: e.target.value })}
                />
              </label>
              <label>
                Cover photo URL
                <input
                  type="url"
                  placeholder="https://…"
                  value={design.photo.startsWith("data:") ? "" : design.photo}
                  onChange={(e) => editDesign({ photo: e.target.value })}
                />
              </label>
              <label className="builder-upload">
                <Upload size={16} />
                Upload a photo
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={(e) => void upload(e.target.files?.[0])}
                />
              </label>
              {mode === "website" && (
                <>
                  <h3>Your pages, your story</h3>
                  {content.website_sections?.map((s, i) => (
                    <details className="builder-section-editor" key={s.id}>
                      <summary>{s.title || "Untitled section"}</summary>
                      <label>
                        Heading
                        <input
                          maxLength={80}
                          value={s.title}
                          onChange={(e) =>
                            sectionEdit(s.id, { title: e.target.value })
                          }
                        />
                      </label>
                      <label>
                        Text
                        <textarea
                          rows={4}
                          maxLength={4000}
                          value={s.text}
                          onChange={(e) =>
                            sectionEdit(s.id, { text: e.target.value })
                          }
                        />
                      </label>
                      <label>
                        Image URL
                        <input
                          type="url"
                          placeholder="https://…"
                          value={s.image || ""}
                          onChange={(e) =>
                            sectionEdit(s.id, { image: e.target.value })
                          }
                        />
                      </label>
                      <div className="builder-section-actions">
                        <button
                          aria-label={`Move ${s.title} up`}
                          disabled={i === 0}
                          onClick={() => move(i, -1)}
                        >
                          <ArrowUp size={16} />
                        </button>
                        <button
                          aria-label={`Move ${s.title} down`}
                          disabled={
                            i === (content.website_sections?.length || 0) - 1
                          }
                          onClick={() => move(i, 1)}
                        >
                          <ArrowDown size={16} />
                        </button>
                        <button
                          aria-label={`Remove ${s.title}`}
                          onClick={() =>
                            change({
                              ...content,
                              website_sections:
                                content.website_sections?.filter(
                                  (x) => x.id !== s.id,
                                ),
                            })
                          }
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </details>
                  ))}
                  <label>
                    Add a section
                    <select
                      value=""
                      onChange={(e) => {
                        if (!e.target.value) return;
                        const type = e.target.value as WebsiteSection["type"];
                        change({
                          ...content,
                          website_sections: [
                            ...(content.website_sections || []),
                            {
                              id: crypto.randomUUID(),
                              type,
                              title: {
                                story: "Our story",
                                details: "The celebration",
                                gallery: "Favorite moments",
                                faq: "Questions & answers",
                                text: "A note from us",
                              }[type],
                              text: "",
                            },
                          ],
                        });
                      }}
                    >
                      <option value="">Choose a section…</option>
                      <option value="story">Our story</option>
                      <option value="details">Event details</option>
                      <option value="gallery">Photo moment</option>
                      <option value="faq">Questions & answers</option>
                      <option value="text">Custom text</option>
                    </select>
                  </label>
                  <small>
                    Event times and addresses come from Invitations.
                  </small>
                </>
              )}
            </>
          )}
        </aside>
        <section
          className="builder-preview-panel"
          aria-label="Live design preview"
        >
          <header>
            <span>Live preview</span>
            <div>
              <button
                aria-label="Desktop preview"
                aria-pressed={!phone}
                onClick={() => setPhone(false)}
              >
                <Monitor size={17} />
              </button>
              <button
                aria-label="Phone preview"
                aria-pressed={phone}
                onClick={() => setPhone(true)}
              >
                <Smartphone size={17} />
              </button>
            </div>
          </header>
          <div
            className={`builder-preview ${phone ? "phone-preview" : ""}`}
            onClick={(event) => {
              const anchor = (
                event.target as HTMLElement
              ).closest<HTMLAnchorElement>('a[href^="#"]');
              if (!anchor) return;
              event.preventDefault();
              const destination =
                event.currentTarget.querySelector<HTMLElement>(
                  anchor.getAttribute("href")!,
                );
              destination?.scrollIntoView({
                behavior: "smooth",
                block: "center",
              });
            }}
          >
            {mode === "website" ? (
              <WebsiteCanvas data={{ event: state.event, content }} />
            ) : (
              <div className="builder-invitation-preview">
                <WeddingCover
                  design={design}
                  first={state.event.partner_one}
                  second={state.event.partner_two}
                  date={websiteDate(state.event.date)}
                />
                <p>
                  Your guests’ RSVP and assignments appear below this cover.
                </p>
              </div>
            )}
          </div>
        </section>
      </div>
      <section className="builder-publish card">
        <div>
          <h3>Your wedding, online.</h3>
          <p>
            {published && !demo
              ? "Published · changes become live when you save."
              : "Design privately. Publish when you’re ready."}
          </p>
        </div>
        <button
          className="primary"
          disabled={busy}
          onClick={() => void save(!published)}
        >
          {published ? "Unpublish website" : "Publish wedding website"}
        </button>
        {published && !demo && (
          <div className="builder-public-link">
            <input
              aria-label="Wedding website link"
              readOnly
              value={publicUrl}
            />
            <button
              aria-label="Copy website link"
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(publicUrl);
                  setMessage("Website link copied.");
                } catch {
                  setError("Copy the link from the field.");
                }
              }}
            >
              <Copy size={17} />
            </button>
            <a
              href={publicUrl}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Open wedding website"
            >
              <Eye size={17} />
            </a>
          </div>
        )}
        <small>
          Publishing shares your names, date, website design, and event details.
          Guest RSVPs and assignments stay in private invitations.
        </small>
      </section>
      {message && <p role="status">{message}</p>}
      {error && <p role="alert">{error}</p>}
    </div>
  );
}

"use client";
import { sitePath, basePath } from "@/lib/site-path";
import { Plus } from "lucide-react";
import { useEffect, useState, useRef } from "react";
import { State, RecordItem, uid } from "@/lib/model";
import { supabase } from "@/lib/supabase";
function Photo({ r }: { r: RecordItem }) {
  const [url, setUrl] = useState(r.url),
    [failed, setFailed] = useState(false);
  useEffect(() => {
    let active = true;
    setFailed(false);
    setUrl(r.url);
    async function refresh() {
      if (r.storage_path && supabase) {
        const { data } = await supabase.storage
          .from("planning-documents")
          .createSignedUrl(r.storage_path, 3600);
        if (active && data) setUrl(data.signedUrl);
      }
    }
    refresh();
    const timer = setInterval(refresh, 3000000);
    return () => {
      active = false;
      clearInterval(timer);
    };
  }, [r.url, r.storage_path]);
  return url && !failed ? (
    <img
      src={sitePath(url)}
      alt={r.title}
      loading="lazy"
      onError={() => setFailed(true)}
    />
  ) : (
    <div className="photo-placeholder">
      {failed ? "Photo unavailable" : "Add a photo"}
    </div>
  );
}
async function compress(file: File): Promise<Blob> {
  const image = await createImageBitmap(file),
    scale = Math.min(1, 1600 / Math.max(image.width, image.height)),
    canvas = document.createElement("canvas");
  canvas.width = Math.round(image.width * scale);
  canvas.height = Math.round(image.height * scale);
  canvas.getContext("2d")!.drawImage(image, 0, 0, canvas.width, canvas.height);
  image.close();
  return new Promise((resolve, reject) =>
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error("Could not read photo"))),
      "image/jpeg",
      0.82,
    ),
  );
}
export default function PhotoBoard({
  state,
  change,
  kind,
  demo,
  ready,
}: {
  state: State;
  change: (s: State) => void;
  kind: string;
  demo: boolean;
  ready: boolean;
}) {
  const [editing, setEditing] = useState<RecordItem | null | undefined>(),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [headerOpen, setHeaderOpen] = useState(false);
  const latest = useRef(state);
  latest.current = state;
  const boardRecords = state.records.filter(
    (r) => r.kind === kind || (kind === "inspiration" && r.kind === "decor"),
  );
  const items = boardRecords.filter((r) => r.details?.board_header !== "true");
  const sectionOf = (r: RecordItem) =>
    r.details?.section || (r.kind === "decor" ? "Flowers & décor" : "");
  const headers = Array.from(
    new Set([
      ...boardRecords
        .filter((r) => r.details?.board_header === "true")
        .map((r) => r.title),
      ...items.map(sectionOf).filter(Boolean),
    ]),
  );
  const sections = [
    ...(items.some((r) => !sectionOf(r)) ? [""] : []),
    ...headers,
  ];
  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    const data = new FormData(e.currentTarget),
      file = data.get("photo") as File;
    let path = editing?.storage_path || null,
      url = String(data.get("url") || "");
    if (!url && editing?.url.startsWith("data:image/")) url = editing.url;
    setBusy(true);
    try {
      if (file?.size) {
        if (!["image/jpeg", "image/png", "image/webp"].includes(file.type))
          throw new Error("Choose a JPG, PNG or WebP photo.");
        if (file.size > 10 * 1024 * 1024)
          throw new Error("Choose a photo smaller than 10 MB.");
        const blob = await compress(file);
        if (demo) {
          url = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(String(reader.result));
            reader.onerror = () => reject(new Error("Could not read photo"));
            reader.readAsDataURL(blob);
          });
          path = null;
        } else {
          if (!supabase || !ready)
            throw new Error(
              "Wait for your plan to finish saving, then upload your photo.",
            );
          path = `${state.event.id}/${uid()}.jpg`;
          const result = await supabase.storage
            .from("planning-documents")
            .upload(path, blob, { contentType: "image/jpeg" });
          if (result.error) throw result.error;
          url = "";
        }
      }
      if (!file?.size && url !== editing?.url) path = null;
      const current = latest.current;
      const record: RecordItem = {
        id: editing?.id || uid(),
        event_id: current.event.id,
        kind: editing?.kind || kind,
        title: String(data.get("title")),
        notes: String(data.get("notes")),
        status: editing?.status || "open",
        amount: Number(data.get("amount") ?? editing?.amount ?? 0),
        paid: editing?.paid || 0,
        date: editing?.date || "",
        url,
        vendor_id: editing?.vendor_id || null,
        storage_path: path,
        details: {
          ...editing?.details,
          section: String(data.get("section") || ""),
        },
      };
      change({
        ...current,
        records: editing
          ? current.records.map((r) => (r.id === editing.id ? record : r))
          : [...current.records, record],
      });
      setEditing(undefined);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Could not save photo. Please try again.",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="photo-board">
      <div className="board-toolbar">
        <span>{items.length} ideas</span>
        <details className="board-create-menu">
          <summary
            className="add-circle"
            aria-label="Add to inspiration"
            title="Add to inspiration"
          >
            <Plus size={18} />
          </summary>
          <div className="board-create-options">
            <button
              type="button"
              onClick={(e) => {
                e.currentTarget.closest("details")?.removeAttribute("open");
                setHeaderOpen(true);
              }}
            >
              Header
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.currentTarget.closest("details")?.removeAttribute("open");
                setHeaderOpen(false);
                setError("");
                setEditing(null);
              }}
            >
              Inspiration
            </button>
          </div>
        </details>
      </div>
      {headerOpen && (
        <form
          className="board-header-form"
          onSubmit={(e) => {
            e.preventDefault();
            const title = String(
              new FormData(e.currentTarget).get("header") || "",
            ).trim();
            if (!title) return;
            const current = latest.current;
            if (!headers.includes(title))
              change({
                ...current,
                records: [
                  ...current.records,
                  {
                    id: uid(),
                    event_id: current.event.id,
                    kind: "inspiration",
                    title,
                    notes: "",
                    status: "open",
                    amount: 0,
                    paid: 0,
                    date: "",
                    url: "",
                    vendor_id: null,
                    storage_path: null,
                    details: { board_header: "true" },
                  },
                ],
              });
            setHeaderOpen(false);
          }}
        >
          <input
            name="header"
            aria-label="Header name"
            placeholder="Header name"
            list="inspiration-header-options"
            required
            autoFocus
          />
          <datalist id="inspiration-header-options">
            {["Flowers", "Décor", "Groom’s clothes", "Bride’s clothes"].map(
              (name) => (
                <option key={name} value={name} />
              ),
            )}
          </datalist>
          <button
            className="primary"
            aria-label="Save header"
            title="Save header"
          >
            Save
          </button>
        </form>
      )}
      {sections.map((section) => (
        <section className="inspiration-section" key={section}>
          {section && <h2>{section}</h2>}
          <div className="masonry-board">
            {items
              .filter((r) => sectionOf(r) === section)
              .map((r) => (
                <article className="photo-pin" key={r.id}>
                  <button
                    className="pin-open"
                    aria-label={`Open ${r.title || "inspiration"}`}
                    onClick={() => {
                      setError("");
                      setEditing(r);
                    }}
                  >
                    <Photo r={r} />
                  </button>
                </article>
              ))}
          </div>
        </section>
      ))}
      {!items.length && (
        <div className="board-empty">
          <h3>Your ideas, in one place.</h3>
          <p>
            Add photos of{" "}
            {kind === "decor"
              ? "flowers, centerpieces and décor"
              : "the details you love"}
            .
          </p>
        </div>
      )}
      {editing !== undefined && (
        <div className="modal-backdrop">
          <section
            className="modal"
            role="dialog"
            aria-modal="true"
            aria-label="Photo details"
          >
            <button
              className="modal-close"
              aria-label="Close"
              disabled={busy}
              onClick={() => setEditing(undefined)}
            >
              ×
            </button>
            <h2>{editing ? "Edit idea" : "Add an idea"}</h2>
            <form onSubmit={submit}>
              <label>
                Title
                <input
                  name="title"
                  required
                  defaultValue={editing?.title}
                  autoFocus
                />
              </label>
              <label>
                Header
                <select
                  name="section"
                  defaultValue={editing ? sectionOf(editing) : ""}
                >
                  <option value="">Unsorted</option>
                  {headers.map((header) => (
                    <option key={header} value={header}>
                      {header}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Photo
                <input
                  type="file"
                  name="photo"
                  accept="image/jpeg,image/png,image/webp"
                />
              </label>
              <label>
                Image link
                <input
                  type="url"
                  name="url"
                  defaultValue={
                    editing?.url.startsWith("https:") ? editing.url : ""
                  }
                  placeholder="https://…"
                />
              </label>
              <label>
                Caption
                <textarea name="notes" defaultValue={editing?.notes} />
              </label>
              {kind === "decor" && (
                <label>
                  Planned cost
                  <input
                    name="amount"
                    type="number"
                    min="0"
                    step="0.01"
                    defaultValue={editing?.amount || 0}
                  />
                </label>
              )}
              {error && <p role="alert">{error}</p>}
              <div className="board-actions">
                <button className="primary" disabled={busy}>
                  {busy ? "Saving…" : "Save idea"}
                </button>
                {editing && (
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => {
                      const current = latest.current;
                      change({
                        ...current,
                        records: current.records.filter(
                          (r) => r.id !== editing.id,
                        ),
                      });
                      setEditing(undefined);
                    }}
                  >
                    Delete idea
                  </button>
                )}
              </div>
            </form>
          </section>
        </div>
      )}
    </section>
  );
}

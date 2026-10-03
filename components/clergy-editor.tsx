"use client";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Plus, X } from "lucide-react";
import { State, RecordItem, uid } from "@/lib/model";
import { changeClergyRole, clergyRoles } from "@/lib/clergy-actions";
import { lockBodyScroll } from "@/lib/scroll-lock";
export default function ClergyEditor({
  state,
  change,
  person,
  initialRole = "Bishop",
}: {
  state: State;
  change: (s: State) => void;
  person?: RecordItem;
  initialRole?: string;
}) {
  const [open, setOpen] = useState(false),
    [name, setName] = useState(""),
    [role, setRole] = useState(initialRole);
  const panel = useRef<HTMLElement>(null),
    latest = useRef(state);
  latest.current = state;
  useEffect(() => {
    if (!open) return;
    const previous = document.activeElement as HTMLElement | null,
      unlock = lockBodyScroll();
    panel.current?.querySelector<HTMLInputElement>("input")?.focus();
    const keys = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
      if (e.key === "Tab") {
        const items = Array.from(
            panel.current?.querySelectorAll<HTMLElement>(
              "button,input,select",
            ) || [],
          ),
          first = items[0],
          last = items.at(-1);
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last?.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first?.focus();
        }
      }
    };
    document.addEventListener("keydown", keys);
    return () => {
      unlock();
      document.removeEventListener("keydown", keys);
      previous?.focus();
    };
  }, [open]);
  function launch() {
    setName(person?.title || "");
    if (person) setRole(person.details?.role || "Deacon");
    setOpen(true);
  }
  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    const s = latest.current;
    if (person) {
      const next = changeClergyRole(s, person.id, role);
      change({
        ...next,
        records: next.records.map((r) =>
          r.id === person.id ? { ...r, title: name.trim() } : r,
        ),
      });
    } else {
      change({
        ...s,
        records: [
          ...s.records,
          {
            id: uid(),
            event_id: s.event.id,
            kind: "ceremony_clergy",
            title: name.trim(),
            details: { role },
            status: "pending",
            amount: 0,
            paid: 0,
            date: "",
            notes: "",
            url: "",
            vendor_id: null,
            storage_path: null,
          },
        ],
      });
    }
    setOpen(false);
  }
  return (
    <>
      <button
        className={
          person ? "clergy-person-button" : "clergy-add-button add-circle"
        }
        aria-label={person ? `Edit ${person.title}` : "Add clergy"}
        onClick={launch}
      >
        {person ? (
          <>
            <strong>{person.title}</strong>
            <span>{person.details?.role || "Deacon"}</span>
          </>
        ) : (
          <>
            <Plus size={16} />
          </>
        )}
      </button>
      {open &&
        createPortal(
          <div className="modal-backdrop" onClick={() => setOpen(false)}>
            <section
              ref={panel}
              className="modal clergy-dialog"
              role="dialog"
              aria-modal="true"
              aria-label={person ? "Edit clergy" : "Add clergy"}
              onClick={(e) => e.stopPropagation()}
            >
              <button
                className="modal-close"
                aria-label="Close clergy dialog"
                onClick={() => setOpen(false)}
              >
                <X size={19} />
              </button>
              <h2>{person ? "Clergy details" : "Add clergy"}</h2>
              <form onSubmit={submit}>
                <label>
                  Name
                  <input
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Full name"
                  />
                </label>
                <label>
                  Role
                  <select
                    value={role}
                    onChange={(e) => setRole(e.target.value)}
                  >
                    {clergyRoles.map((r) => (
                      <option key={r}>{r}</option>
                    ))}
                  </select>
                </label>
                <div className="clergy-dialog-actions">
                  <button type="button" onClick={() => setOpen(false)}>
                    Cancel
                  </button>
                  <button className="primary">Save</button>
                </div>
              </form>
            </section>
          </div>,
          document.body,
        )}
    </>
  );
}

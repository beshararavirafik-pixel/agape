"use client";
import { Plus } from "lucide-react";
import { fluidChange } from "@/lib/motion";
import { useState } from "react";
import { sortClergy } from "@/lib/clergy-actions";
import ClergyEditor from "./clergy-editor";
import ChurchSeating from "./church-seating";
import { State, RecordItem, uid } from "@/lib/model";
export default function Ceremony({
  state,
  change,
}: {
  state: State;
  change: (s: State) => void;
}) {
  const [tab, setTab] = useState("details");
  const clergy = sortClergy(
    state.records.filter((r) => r.kind === "ceremony_clergy"),
  );
  const prayers = state.records
    .filter((r) => r.kind === "ceremony_prayer")
    .sort(
      (a, b) => Number(a.details?.order || 0) - Number(b.details?.order || 0),
    );
  const details = state.records.find(
    (r) => r.kind === "ceremony_details" && !r.details?.layout,
  );
  function add(kind: string, title: string, extra: Partial<RecordItem> = {}) {
    change({
      ...state,
      records: [
        ...state.records,
        {
          id: uid(),
          event_id: state.event.id,
          kind,
          title,
          status: "pending",
          amount: 0,
          paid: 0,
          date: "",
          notes: "",
          url: "",
          vendor_id: null,
          storage_path: null,
          ...extra,
        },
      ],
    });
  }
  function patch(r: RecordItem) {
    change({
      ...state,
      records: state.records.map((a) => (a.id === r.id ? r : a)),
    });
  }
  function remove(id: string) {
    change({
      ...state,
      records: state.records
        .filter((r) => r.id !== id)
        .map((r) => (r.assignee_id === id ? { ...r, assignee_id: null } : r)),
    });
  }
  return (
    <div className="ceremony-section">
      <div
        className="ceremony-tabs"
        role="tablist"
        aria-label="Church Ceremony"
        onKeyDown={(e) => {
          if (["ArrowLeft", "ArrowRight", "Home", "End"].includes(e.key)) {
            e.preventDefault();
            const next =
              e.key === "Home"
                ? "details"
                : e.key === "End"
                  ? "studio"
                  : tab === "studio"
                    ? "details"
                    : "studio";
            setTab(next);
            document
              .getElementById(
                next === "studio"
                  ? "ceremony-studio-tab"
                  : "ceremony-details-tab",
              )
              ?.focus();
          }
        }}
      >
        <button
          id="ceremony-details-tab"
          tabIndex={tab === "details" ? 0 : -1}
          role="tab"
          aria-selected={tab === "details"}
          aria-controls="ceremony-panel"
          onClick={() => fluidChange(() => setTab("details"))}
        >
          Ceremony & clergy
        </button>
        <button
          id="ceremony-studio-tab"
          tabIndex={tab === "studio" ? 0 : -1}
          role="tab"
          aria-selected={tab === "studio"}
          aria-controls="ceremony-panel"
          onClick={() => fluidChange(() => setTab("studio"))}
        >
          Seating studio
        </button>
      </div>
      <div
        id="ceremony-panel"
        role="tabpanel"
        aria-labelledby={
          tab === "studio" ? "ceremony-studio-tab" : "ceremony-details-tab"
        }
      >
        {tab === "studio" ? (
          <ChurchSeating
            state={state}
            change={change}
            onClose={() => setTab("details")}
          />
        ) : (
          <div className="ceremony-layout">
            <section className="card">
              <h3>Church details</h3>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  const f = new FormData(e.currentTarget),
                    title = String(f.get("church")),
                    notes = String(f.get("notes"));
                  if (details) patch({ ...details, title, notes });
                  else add("ceremony_details", title, { notes });
                }}
              >
                <label>
                  Church
                  <input
                    name="church"
                    defaultValue={details?.title}
                    placeholder="Church name"
                    required
                  />
                </label>
                <label>
                  Ceremony details
                  <textarea
                    name="notes"
                    defaultValue={details?.notes}
                    placeholder="Time, address, and arrangements"
                  />
                </label>
                <button type="submit">Save church details</button>
              </form>
            </section>
            <section className="card clergy-card">
              <div className="clergy-card-heading">
                <h3>Clergy & deacons</h3>
                <ClergyEditor state={state} change={change} />
              </div>
              <div className="clergy-groups">
                {[
                  ["Bishop", "Bishops"],
                  ["Priest", "Priests"],
                  ["Deacon", "Deacons"],
                ].map(([role, label]) => {
                  const members = clergy.filter(
                    (r) => (r.details?.role || "Deacon") === role,
                  );
                  if (!members.length) return null;
                  return (
                    <details className="clergy-group" key={role}>
                      <summary>
                        <span>{label}</span>
                        <span className="clergy-group-count">
                          {members.length}
                        </span>
                        <span
                          className="clergy-group-chevron"
                          aria-hidden="true"
                        >
                          ⌄
                        </span>
                      </summary>
                      <div className="clergy-clean-list">
                        {members.map((r) => (
                          <div className="clergy-clean-row" key={r.id}>
                            <ClergyEditor
                              state={state}
                              change={change}
                              person={r}
                            />
                            <button
                              className="clergy-remove-button"
                              aria-label={`Remove ${r.title}`}
                              onClick={() => remove(r.id)}
                            >
                              ×
                            </button>
                          </div>
                        ))}
                      </div>
                    </details>
                  );
                })}
              </div>
              {!clergy.length && (
                <p className="clergy-empty">
                  Add the clergy taking part in your ceremony.
                </p>
              )}
            </section>
            <section className="card ceremony-service">
              <div className="card-heading">
                <h3>Prayers & service order</h3>
                <small>Arrange with your priest</small>
              </div>
              <form
                className="inline-form"
                onSubmit={(e) => {
                  e.preventDefault();
                  const f = new FormData(e.currentTarget);
                  add("ceremony_prayer", String(f.get("prayer")), {
                    assignee_id: String(f.get("deacon")) || null,
                    details: {
                      language: String(f.get("language")),
                      order: String(prayers.length),
                    },
                  });
                  e.currentTarget.reset();
                }}
              >
                <label>
                  Prayer / responsibility
                  <input name="prayer" required />
                </label>
                <label>
                  Deacon
                  <select name="deacon">
                    <option value="">Unassigned</option>
                    {clergy
                      .filter((r) => r.details?.role === "Deacon")
                      .map((r) => (
                        <option value={r.id} key={r.id}>
                          {r.title}
                        </option>
                      ))}
                  </select>
                </label>
                <label>
                  Language
                  <select name="language">
                    <option>English</option>
                    <option>Coptic</option>
                    <option>Arabic</option>
                    <option>Other</option>
                  </select>
                </label>
                <button
                  aria-label="Add prayer"
                  title="Add prayer"
                  className="add-circle"
                  type="submit"
                >
                  <Plus size={18} />
                </button>
              </form>
              {prayers.map((r, i) => (
                <div className="ceremony-row" key={r.id}>
                  <span className="count">{i + 1}</span>
                  <div>
                    <input
                      aria-label={`Prayer ${i + 1}`}
                      value={r.title}
                      onChange={(e) => patch({ ...r, title: e.target.value })}
                    />
                    <small>{r.details?.language}</small>
                  </div>
                  <select
                    aria-label={`Deacon for ${r.title}`}
                    value={r.assignee_id || ""}
                    onChange={(e) =>
                      patch({ ...r, assignee_id: e.target.value || null })
                    }
                  >
                    <option value="">Unassigned</option>
                    {clergy
                      .filter((r) => r.details?.role === "Deacon")
                      .map((r) => (
                        <option key={r.id} value={r.id}>
                          {r.title}
                        </option>
                      ))}
                  </select>
                  <button
                    disabled={i === 0}
                    aria-label={`Move ${r.title} earlier`}
                    onClick={() => {
                      const reordered = [...prayers];
                      [reordered[i], reordered[i - 1]] = [
                        reordered[i - 1],
                        reordered[i],
                      ];
                      change({
                        ...state,
                        records: state.records.map((a) => {
                          const index = reordered.findIndex(
                            (p) => p.id === a.id,
                          );
                          return index < 0
                            ? a
                            : {
                                ...a,
                                details: { ...a.details, order: String(index) },
                              };
                        }),
                      });
                    }}
                  >
                    ↑
                  </button>
                  <button
                    onClick={() => remove(r.id)}
                    aria-label={`Remove ${r.title}`}
                  >
                    Remove
                  </button>
                </div>
              ))}
            </section>
          </div>
        )}
      </div>
    </div>
  );
}

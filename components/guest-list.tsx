"use client";
import {
  Fragment,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type { DragEvent } from "react";
import RsvpSelect from "@/components/rsvp-select";
import { useDragAutoScroll } from "@/lib/use-drag-auto-scroll";

import {
  Search,
  Trash2,
  Users,
  X,
  SlidersHorizontal,
  Plus,
  Undo2,
  Redo2,
} from "lucide-react";
import {
  renameFamily,
  addGuestToFamily,
  relationships,
  groupGuestsAsFamily,
  invitationFamilies,
} from "@/lib/families";
import { Guest, State, uid } from "@/lib/model";
import { setGuestRsvp, removeGuests } from "@/lib/guest-actions";
export default function GuestList({
  state,
  change,
  edit,
  addGuest,
}: {
  state: State;
  change: (s: State) => void;
  edit: (g: Guest) => void;
  addGuest?: () => void;
}) {
  const [query, setQuery] = useState(""),
    [group, setGroup] = useState("All"),
    [rsvp, setRsvp] = useState("all"),
    [seating, setSeating] = useState("all"),
    [view, setView] = useState("households"),
    [openedGuest, setOpenedGuest] = useState<string | null>(null),
    [creationFamilyName, setCreationFamilyName] = useState(""),
    [selected, setSelected] = useState<string[]>([]),
    [deleting, setDeleting] = useState<string[] | null>(null),
    [familyPrimary, setFamilyPrimary] = useState<string | null>(null),
    [addingToFamily, setAddingToFamily] = useState<string | null>(null),
    [renamingFamily, setRenamingFamily] = useState<string | null>(null),
    [familyName, setFamilyName] = useState(""),
    [addMode, setAddMode] = useState("new"),
    [memberName, setMemberName] = useState(""),
    [existingMember, setExistingMember] = useState(""),
    [memberRole, setMemberRole] = useState("Relative"),
    [history, setHistory] = useState<
      { before: State; after: State; label: string }[]
    >([]),
    [future, setFuture] = useState<
      { before: State; after: State; label: string }[]
    >([]),
    [openedFamily, setOpenedFamily] = useState<string | null>(null),
    [draggedGuest, setDraggedGuest] = useState<string | null>(null),
    [dropFamily, setDropFamily] = useState<string | null>(null);
  const dragGuestId = useRef<string | null>(null);
  useDragAutoScroll(Boolean(draggedGuest));
  const familyList = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    const list = familyList.current;
    if (!list) return;
    let width = -1;
    const measure = () => {
      width = list.clientWidth;
      list.style.removeProperty("--family-header-height");
      const headers = Array.from(
        list.querySelectorAll<HTMLElement>(".family-card-header"),
      );
      const height = Math.max(
        0,
        ...headers.map((header) =>
          Math.ceil(header.getBoundingClientRect().height),
        ),
      );
      list.style.setProperty("--family-header-height", `${height}px`);
    };
    measure();
    if (typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver((entries) => {
      if (
        width === list.clientWidth &&
        entries.every((entry) => entry.target === list)
      )
        return;
      measure();
    });
    observer.observe(list);
    list
      .querySelectorAll(".family-card-header")
      .forEach((header) => observer.observe(header));
    return () => observer.disconnect();
  }, [view, state.guests, query, group, rsvp, seating]);
  function openFamily(name: string) {
    setOpenedFamily(name);
  }
  function applyChange(next: State, label: string) {
    setHistory((items) => [
      ...items.slice(-19),
      { before: state, after: next, label },
    ]);
    setFuture([]);
    change(next);
  }
  function undoChange() {
    const item = history.at(-1);
    if (!item) return;
    setHistory((items) => items.slice(0, -1));
    setFuture((items) => [...items, item]);
    change(item.before);
  }
  function redoChange() {
    const item = future.at(-1);
    if (!item) return;
    setFuture((items) => items.slice(0, -1));
    setHistory((items) => [...items, item]);
    change(item.after);
  }
  function toggleFamily(name: string) {
    if (openedFamily === name) {
      setOpenedFamily(null);
    } else {
      openFamily(name);
    }
  }
  const deletePanel = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (
      !deleting &&
      !familyPrimary &&
      !addingToFamily &&
      !renamingFamily &&
      !openedFamily
    )
      return;
    const previous = document.activeElement as HTMLElement;
    deletePanel.current
      ?.querySelector<HTMLElement>("input, select, button")
      ?.focus();
    const close = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setDeleting(null);
        setFamilyPrimary(null);
        setAddingToFamily(null);
        setRenamingFamily(null);
        setOpenedFamily(null);
      }
      if (e.key === "Tab") {
        const buttons = Array.from(
            deletePanel.current?.querySelectorAll<HTMLElement>(
              "button:not(:disabled), select, input",
            ) || [],
          ),
          first = buttons[0],
          last = buttons.at(-1);
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last?.focus();
        }
        if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first?.focus();
        }
      }
    };
    document.addEventListener("keydown", close);
    return () => {
      document.removeEventListener("keydown", close);
      previous?.focus();
    };
  }, [
    deleting,
    !!familyPrimary,
    !!addingToFamily,
    !!renamingFamily,
    openedFamily,
  ]);
  const activeFilters =
    Number(group !== "All") +
    Number(rsvp !== "all") +
    Number(seating !== "all");
  const seatMap = useMemo(
    () =>
      new Map(
        state.seats.map((s) => [
          s.guest_id,
          state.objects.find((o) => o.id === s.table_id)?.name || "Unseated",
        ]),
      ),
    [state.seats, state.objects],
  );
  const groups = Array.from(
    new Set([
      "Family",
      "Friends",
      "Work",
      "Other",
      ...state.guests.map((g) => g.guest_group || "Family"),
    ]),
  );
  const filtered = useMemo(
    () =>
      state.guests
        .filter(
          (g) =>
            (group === "All" || (g.guest_group || "Family") === group) &&
            (rsvp === "all" || g.rsvp === rsvp) &&
            (seating === "all" ||
              seatMap.has(g.id) === (seating === "seated")) &&
            `${g.name} ${g.household} ${g.family_name || ""} ${g.email}`
              .toLowerCase()
              .includes(query.toLowerCase()),
        )
        .sort((a, b) => a.name.localeCompare(b.name)),
    [state.guests, group, rsvp, seating, seatMap, query],
  );
  const families = useMemo(
    () => invitationFamilies(state),
    [state.guests, state.family_links],
  );
  const households = useMemo(() => {
    const ids = new Set(filtered.map((g) => g.id));
    return families.filter((f) => f.members.some((g) => ids.has(g.id)));
  }, [families, filtered]);
  const total = view === "guests" ? filtered.length : households.length;
  const shownFamilies = [...households].sort((a, b) =>
    a.title.localeCompare(b.title),
  );
  const expandedFamily = shownFamilies.find(
    (family) => family.id === openedFamily,
  );
  const visible = filtered;
  const matchingIds =
    view === "guests"
      ? filtered.map((g) => g.id)
      : households.flatMap((f) => f.members.map((g) => g.id));
  const allSelected =
    !!matchingIds.length && matchingIds.every((id) => selected.includes(id));
  const directory = useRef<HTMLDivElement>(null);
  const firstLetter = (name: string) =>
    /^[A-Z]/.test(name.trim().toUpperCase())
      ? name.trim()[0].toUpperCase()
      : "#";
  const availableLetters = new Set(
    view === "guests"
      ? visible.map((g) => firstLetter(g.name))
      : shownFamilies.flatMap((f) => [
          firstLetter(f.title),
          ...f.members.map((g) => firstLetter(g.name)),
        ]),
  );
  function openAdd(primaryId: string) {
    setAddingToFamily(primaryId);
    setAddMode("new");
    setMemberName("");
    setExistingMember("");
    setMemberRole("Relative");
  }
  function filter(update: () => void) {
    update();
    setSelected([]);
  }
  function toggle(id: string) {
    setSelected((a) =>
      a.includes(id) ? a.filter((v) => v !== id) : [...a, id],
    );
  }
  function startGuestDrag(event: DragEvent<HTMLElement>, guest: Guest) {
    dragGuestId.current = guest.id;
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("application/x-agape-guest", guest.id);
    event.dataTransfer.setData("text/plain", guest.name);
    setDraggedGuest(guest.id);
  }
  function endGuestDrag() {
    dragGuestId.current = null;
    setDraggedGuest(null);
    setDropFamily(null);
  }
  function canDropGuest(primaryId: string) {
    const id = dragGuestId.current;
    return (
      id &&
      families.some(
        (family) =>
          family.id === primaryId &&
          !family.members.some((guest) => guest.id === id),
      )
    );
  }
  function overFamily(event: DragEvent<HTMLElement>, primaryId: string) {
    if (!canDropGuest(primaryId)) return;
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
    setDropFamily(primaryId);
  }
  function leaveFamily(event: DragEvent<HTMLElement>, primaryId: string) {
    if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
      setDropFamily((current) => (current === primaryId ? null : current));
    }
  }
  function dropGuest(event: DragEvent<HTMLElement>, primaryId: string) {
    if (!canDropGuest(primaryId)) return;
    event.preventDefault();
    event.stopPropagation();
    const guest = state.guests.find((g) => g.id === dragGuestId.current);
    const family = families.find((f) => f.id === primaryId);
    if (guest && family) {
      applyChange(
        addGuestToFamily(state, primaryId, guest, "Relative"),
        `${guest.name} moved to ${family.title}`,
      );
      openFamily(primaryId);
    }
    endGuestDrag();
  }
  function row(g: Guest, relation?: string) {
    const family = families.find((f) => f.members.some((m) => m.id === g.id))!;
    return (
      <Fragment key={g.id}>
        <tr
          data-letter={firstLetter(g.name)}
          className={`alphabet-target${view === "guests" && dropFamily === family.id ? " is-drop-target" : ""}`}
          onDragOver={
            view === "guests"
              ? (event) => overFamily(event, family.id)
              : undefined
          }
          onDragLeave={
            view === "guests"
              ? (event) => leaveFamily(event, family.id)
              : undefined
          }
          onDrop={
            view === "guests"
              ? (event) => dropGuest(event, family.id)
              : undefined
          }
        >
          <td>
            <input
              type="checkbox"
              aria-label={`Select ${g.name}`}
              checked={selected.includes(g.id)}
              onChange={() => toggle(g.id)}
            />
          </td>
          <td>
            <button
              className="guest-identity"
              aria-label={`Open ${g.name}`}
              title={`Drag ${g.name} onto another family, or click to view details`}
              draggable
              onDragStart={(event) => startGuestDrag(event, g)}
              onDragEnd={endGuestDrag}
              data-dragging={draggedGuest === g.id}
              aria-expanded={openedGuest === g.id}
              onClick={() => setOpenedGuest(openedGuest === g.id ? null : g.id)}
            >
              <span className="avatar">
                {g.name
                  .trim()
                  .split(/\s+/)
                  .map((n) => n[0])
                  .slice(0, 2)
                  .join("")}
              </span>
              <span>
                <strong>{g.name}</strong>
                {view !== "guests" && (
                  <small>
                    {relation || g.household || "Individual invitation"}
                  </small>
                )}
              </span>
            </button>
          </td>
          <td>
            <RsvpSelect
              label={`RSVP for ${g.name}`}
              value={g.rsvp}
              onChange={(value) =>
                applyChange(
                  setGuestRsvp(state, [g.id], value),
                  `${g.name} marked ${value}`,
                )
              }
            />
          </td>
          <td
            className="guest-table-name"
            title={seatMap.get(g.id) || "Unseated"}
          >
            {seatMap.get(g.id) || "Unseated"}
          </td>
          <td>
            <button
              className="guest-delete"
              aria-label={`Remove ${g.name}`}
              onClick={() => setDeleting([g.id])}
            >
              <Trash2 size={16} />
            </button>
          </td>
        </tr>
        {openedGuest === g.id && (
          <tr className="guest-inline-family">
            <td colSpan={5}>
              <div>
                <strong>{family.title}</strong>
                <span>{family.members.map((m) => m.name).join(" · ")}</span>
                <div className="family-local-actions">
                  <button
                    aria-label="Add relative"
                    title="Add relative"
                    className="add-circle"
                    onClick={() => openAdd(family.id)}
                  >
                    <Plus size={18} />
                  </button>
                  <button onClick={() => edit(g)}>Edit guest</button>
                  <button
                    onClick={() => {
                      setRenamingFamily(family.id);
                      setFamilyName(family.title);
                    }}
                  >
                    Rename family
                  </button>
                </div>
              </div>
            </td>
          </tr>
        )}
      </Fragment>
    );
  }
  return (
    <section className="guest-directory">
      <div className="guest-summary">
        <div>
          <strong>{state.guests.length}</strong>
          <span>Invited</span>
        </div>
        <div>
          <strong>
            {state.guests.filter((g) => g.rsvp === "accepted").length}
          </strong>
          <span>Accepted</span>
        </div>
        <div>
          <strong>
            {state.guests.filter((g) => g.rsvp === "pending").length}
          </strong>
          <span>Awaiting reply</span>
        </div>
        <div>
          <strong>{state.seats.length}</strong>
          <span>Seated</span>
        </div>
      </div>
      <div className="directory-layout" ref={directory}>
        <div className="card guest-ledger">
          <div className="directory-controls">
            <div className="guest-tools">
              <div
                className="guest-undo guest-history"
                role="group"
                aria-label="Undo and redo guest changes"
              >
                <button
                  onClick={undoChange}
                  disabled={!history.length}
                  aria-label="Undo"
                  title={`Undo ${history.at(-1)?.label || "last change"}`}
                >
                  <Undo2 size={17} aria-hidden="true" />
                </button>
                <button
                  onClick={redoChange}
                  disabled={!future.length}
                  aria-label="Redo"
                  title={`Redo ${future.at(-1)?.label || "change"}`}
                >
                  <Redo2 size={17} aria-hidden="true" />
                </button>
              </div>
              <label
                className={`search guest-search-compact ${query ? "has-query" : ""}`}
              >
                <Search size={16} />
                <input
                  aria-label="Search guests"
                  placeholder="Search"
                  value={query}
                  onChange={(e) => filter(() => setQuery(e.target.value))}
                />
              </label>
              <div className="view-toggle">
                <button
                  aria-pressed={view === "guests"}
                  onClick={() => filter(() => setView("guests"))}
                >
                  Guests
                </button>
                <button
                  aria-pressed={view === "households"}
                  onClick={() => filter(() => setView("households"))}
                >
                  Families
                </button>
              </div>
            </div>
            <div className="guest-toolbar-actions">
              <details
                className="guest-toolbar-menu"
                name="guest-toolbar"
                data-dismiss-outside
              >
                <summary aria-label="Filter guests" title="Filter guests">
                  <SlidersHorizontal size={16} />{" "}
                  <span className="filter-button-text">Filter</span>{" "}
                  {activeFilters > 0 && (
                    <span className="guest-filter-count">{activeFilters}</span>
                  )}
                </summary>
                <div className="guest-toolbar-popover">
                  <label>
                    Guest group
                    <select
                      aria-label="Filter guest group"
                      value={group}
                      onChange={(e) => filter(() => setGroup(e.target.value))}
                    >
                      <option value="All">All groups</option>
                      {groups.map((g) => (
                        <option key={g} value={g}>
                          {g}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>
                    RSVP status
                    <select
                      aria-label="Filter RSVP"
                      value={rsvp}
                      onChange={(e) => filter(() => setRsvp(e.target.value))}
                    >
                      <option value="all">All RSVPs</option>
                      <option value="pending">Pending</option>
                      <option value="accepted">Accepted</option>
                      <option value="declined">Declined</option>
                    </select>
                  </label>
                  <label>
                    Seating status
                    <select
                      aria-label="Filter seating"
                      value={seating}
                      onChange={(e) => filter(() => setSeating(e.target.value))}
                    >
                      <option value="all">All seating</option>
                      <option value="seated">Seated</option>
                      <option value="unseated">Unseated</option>
                    </select>
                  </label>
                  <button
                    className="text-button"
                    disabled={!activeFilters}
                    onClick={() =>
                      filter(() => {
                        setGroup("All");
                        setRsvp("all");
                        setSeating("all");
                      })
                    }
                  >
                    Clear filters
                  </button>
                </div>
              </details>
              <input
                type="checkbox"
                className="guest-select-all"
                aria-label="Select all guests"
                title="Select all guests"
                disabled={!total}
                checked={allSelected}
                ref={(el) => {
                  if (el)
                    el.indeterminate =
                      !allSelected &&
                      matchingIds.some((id) => selected.includes(id));
                }}
                onChange={(e) =>
                  setSelected(
                    e.target.checked
                      ? Array.from(new Set([...selected, ...matchingIds]))
                      : selected.filter((id) => !matchingIds.includes(id)),
                  )
                }
              />
              <button
                className="primary guest-toolbar-add"
                onClick={addGuest}
                aria-label="Add guest"
                title="Add guest"
              >
                <Plus size={18} />
              </button>
            </div>
            <div
              className={`guest-bulk-reveal ${selected.length ? "is-open" : ""}`}
              aria-hidden={!selected.length}
              inert={!selected.length}
            >
              <div className="guest-bulk-reveal-inner">
                <div className="guest-bulk">
                  <span className="bulk-selection-count">
                    {selected.length}
                    <span className="bulk-selected-word"> selected</span>
                  </span>
                  <select
                    aria-label="Set selected RSVP"
                    value=""
                    onChange={(e) => {
                      applyChange(
                        setGuestRsvp(
                          state,
                          selected,
                          e.target.value as Guest["rsvp"],
                        ),
                        `Updated RSVP for ${selected.length} guests`,
                      );
                      setSelected([]);
                    }}
                  >
                    <option value="">Change RSVP</option>
                    <option value="accepted">Accepted</option>
                    <option value="pending">Pending</option>
                    <option value="declined">Declined</option>
                  </select>
                  {view === "guests" && (
                    <button
                      aria-label="Create family"
                      title="Create family"
                      disabled={selected.length < 2}
                      onClick={() => {
                        setCreationFamilyName("");
                        setFamilyPrimary(selected[0]);
                      }}
                    >
                      <Users size={16} />
                      <span className="bulk-action-label">Create family</span>
                    </button>
                  )}
                  <button
                    aria-label="Delete selected"
                    title="Delete selected"
                    onClick={() => setDeleting(selected)}
                  >
                    <Trash2 size={16} />
                    <span className="bulk-action-label">Delete selected</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
          {view === "guests" ? (
            <div key="guests-view" className="table-scroll guest-view-surface">
              <table className="guest-rows">
                <thead>
                  <tr>
                    <th>
                      <span className="sr-only">Select guest</span>
                    </th>
                    <th>Guest</th>
                    <th>RSVP</th>
                    <th>Table</th>
                    <th>
                      <span className="sr-only">Actions</span>
                    </th>
                  </tr>
                </thead>
                <tbody>{visible.map((g) => row(g))}</tbody>
              </table>
            </div>
          ) : (
            <Fragment key="families-view">
              <div
                ref={familyList}
                className="household-list guest-view-surface family-tile-grid"
              >
                {shownFamilies.map(
                  ({ id: name, title, primary, members, relationship }) => (
                    <article
                      key={name}
                      data-letter={firstLetter(title)}
                      data-letters={Array.from(
                        new Set([
                          firstLetter(title),
                          ...members.map((g) => firstLetter(g.name)),
                        ]),
                      ).join(" ")}
                      className={`household-card family-tile alphabet-target ${members.some((g) => selected.includes(g.id)) ? "is-selected" : ""} ${dropFamily === name ? "is-drop-target" : ""}`}
                      onDragOver={(event) => overFamily(event, name)}
                      onDragLeave={(event) => leaveFamily(event, name)}
                      onDrop={(event) => dropGuest(event, name)}
                    >
                      <div className="family-card-header">
                        <input
                          type="checkbox"
                          aria-label={`Select invitation for ${primary.name}`}
                          checked={members.every((g) =>
                            selected.includes(g.id),
                          )}
                          ref={(el) => {
                            if (el)
                              el.indeterminate =
                                members.some((g) => selected.includes(g.id)) &&
                                !members.every((g) => selected.includes(g.id));
                          }}
                          onChange={(e) =>
                            setSelected(
                              e.target.checked
                                ? Array.from(
                                    new Set([
                                      ...selected,
                                      ...members.map((g) => g.id),
                                    ]),
                                  )
                                : selected.filter(
                                    (id) => !members.some((g) => g.id === id),
                                  ),
                            )
                          }
                        />
                        <button
                          className="household-heading"
                          draggable
                          title={`Open ${title} details or drag ${primary.name} onto another family`}
                          onDragStart={(event) =>
                            startGuestDrag(event, primary)
                          }
                          onDragEnd={endGuestDrag}
                          id={`family-heading-${name}`}
                          aria-controls={`family-details-${name}`}
                          aria-expanded={openedFamily === name}
                          onClick={() => toggleFamily(name)}
                        >
                          <span className="avatar">
                            {primary.name
                              .split(/\s+/)
                              .map((n) => n[0])
                              .slice(0, 2)
                              .join("")}
                          </span>
                          <span>
                            <strong>{title}</strong>
                            <small className="family-size">
                              {members.length}{" "}
                              {members.length === 1 ? "person" : "people"}
                            </small>
                          </span>
                        </button>
                      </div>
                    </article>
                  ),
                )}
              </div>
              {expandedFamily && (
                <div
                  className="modal-backdrop family-detail-backdrop"
                  onMouseDown={(event) => {
                    if (event.target === event.currentTarget)
                      setOpenedFamily(null);
                  }}
                >
                  <section
                    ref={deletePanel}
                    className="family-detail-dialog"
                    role="dialog"
                    aria-modal="true"
                    aria-labelledby={`family-details-title-${expandedFamily.id}`}
                    id={`family-details-${expandedFamily.id}`}
                  >
                    <header className="family-detail-heading">
                      <span className="avatar">
                        {expandedFamily.primary.name
                          .trim()
                          .split(/\s+/)
                          .map((part) => part[0])
                          .slice(0, 2)
                          .join("")}
                      </span>
                      <div>
                        <h2 id={`family-details-title-${expandedFamily.id}`}>
                          {expandedFamily.title}
                        </h2>
                        <p>{expandedFamily.members.length} guests</p>
                      </div>
                      <button
                        className="family-detail-close"
                        aria-label="Close family details"
                        onClick={() => setOpenedFamily(null)}
                      >
                        <X size={20} />
                      </button>
                    </header>
                    <div className="family-detail-body">
                      <div className="family-detail-rows">
                        <table className="guest-rows">
                          <tbody>
                            {expandedFamily.members.map((guest) =>
                              row(guest, expandedFamily.relationship(guest.id)),
                            )}
                          </tbody>
                        </table>
                      </div>
                      <div className="family-local-actions">
                        <button
                          aria-label="Add to family"
                          title="Add to family"
                          className="add-family-member add-circle"
                          onClick={() => {
                            setAddingToFamily(expandedFamily.primary.id);
                            setAddMode("new");
                            setMemberName("");
                            setExistingMember("");
                            setMemberRole("Relative");
                          }}
                        >
                          <Plus size={18} />
                        </button>
                        <button
                          className="add-family-member"
                          onClick={() => {
                            setRenamingFamily(expandedFamily.primary.id);
                            setFamilyName(expandedFamily.title);
                          }}
                        >
                          Rename family
                        </button>
                      </div>
                    </div>
                  </section>
                </div>
              )}
            </Fragment>
          )}
          {!total && (
            <div className="empty">
              <Users size={28} />
              <p>
                {state.guests.length
                  ? "No guests match these filters."
                  : "Add your first guest to get started."}
              </p>
              {state.guests.length > 0 && (
                <button
                  onClick={() =>
                    filter(() => {
                      setQuery("");
                      setGroup("All");
                      setRsvp("all");
                      setSeating("all");
                    })
                  }
                >
                  Clear filters
                </button>
              )}
            </div>
          )}
        </div>
        <nav className="alphabet-index" aria-label="Guest alphabet">
          {"ABCDEFGHIJKLMNOPQRSTUVWXYZ#".split("").map((letter) => (
            <button
              key={letter}
              disabled={!availableLetters.has(letter)}
              aria-label={`Jump to ${letter}`}
              onClick={() => {
                const target = directory.current?.querySelector<HTMLElement>(
                  `[data-letter="${letter}"], [data-letters~="${letter}"]`,
                );
                target?.scrollIntoView?.({
                  behavior: window.matchMedia?.(
                    "(prefers-reduced-motion: reduce)",
                  ).matches
                    ? "instant"
                    : "smooth",
                  block: "start",
                });
              }}
            >
              {letter}
            </button>
          ))}
        </nav>
      </div>
      {renamingFamily && (
        <div className="modal-backdrop">
          <div className="modal delete-dialog" ref={deletePanel}>
            <form
              role="dialog"
              aria-modal="true"
              aria-label="Rename family"
              onSubmit={(e) => {
                e.preventDefault();
                if (!familyName.trim()) return;
                applyChange(
                  renameFamily(state, renamingFamily, familyName),
                  "Family name updated",
                );
                setRenamingFamily(null);
              }}
            >
              <h2>Rename family</h2>
              <label>
                Family name
                <input
                  aria-label="Family name"
                  required
                  maxLength={120}
                  value={familyName}
                  onChange={(e) => setFamilyName(e.target.value)}
                />
              </label>
              <div>
                <button type="button" onClick={() => setRenamingFamily(null)}>
                  Cancel
                </button>
                <button className="primary" disabled={!familyName.trim()}>
                  Save family name
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {addingToFamily && (
        <div className="modal-backdrop">
          <div className="modal delete-dialog" ref={deletePanel}>
            <form
              role="dialog"
              aria-modal="true"
              aria-label="Add to family"
              onSubmit={(e) => {
                e.preventDefault();
                const family = families.find((f) => f.id === addingToFamily);
                if (!family) return;
                const guest =
                  addMode === "existing"
                    ? state.guests.find((g) => g.id === existingMember)
                    : {
                        ...family.primary,
                        id: uid(),
                        name: memberName.trim(),
                        email: "",
                        rsvp: "pending" as const,
                        meal: "Standard",
                      };
                if (!guest) return;
                applyChange(
                  addGuestToFamily(state, addingToFamily, guest, memberRole),
                  `${guest.name} added to ${family.primary.name}'s family`,
                );
                setAddingToFamily(null);
              }}
            >
              <h2>
                Add to{" "}
                {families.find((f) => f.id === addingToFamily)?.primary.name}'s
                family
              </h2>
              <div className="view-toggle">
                <button
                  type="button"
                  aria-pressed={addMode === "new"}
                  onClick={() => setAddMode("new")}
                >
                  New guest
                </button>
                <button
                  type="button"
                  aria-pressed={addMode === "existing"}
                  onClick={() => setAddMode("existing")}
                >
                  Existing guest
                </button>
              </div>
              {addMode === "new" ? (
                <label>
                  Full name
                  <input
                    aria-label="Family member name"
                    required
                    value={memberName}
                    onChange={(e) => setMemberName(e.target.value)}
                  />
                </label>
              ) : (
                <>
                  <label>
                    Choose guest
                    <select
                      aria-label="Existing family member"
                      required
                      value={existingMember}
                      onChange={(e) => setExistingMember(e.target.value)}
                    >
                      <option value="">Select a guest</option>
                      {state.guests
                        .filter(
                          (g) =>
                            !families
                              .find((f) => f.id === addingToFamily)
                              ?.members.some((m) => m.id === g.id),
                        )
                        .sort((a, b) => a.name.localeCompare(b.name))
                        .map((g) => (
                          <option key={g.id} value={g.id}>
                            {g.name}
                          </option>
                        ))}
                    </select>
                  </label>
                  <p>
                    This guest moves into this family. Their RSVP and seat stay
                    the same.
                  </p>
                </>
              )}
              <label>
                Relationship to primary invitee
                <select
                  aria-label="Family member relationship"
                  value={memberRole}
                  onChange={(e) => setMemberRole(e.target.value)}
                >
                  {relationships.map((r) => (
                    <option key={r}>{r}</option>
                  ))}
                </select>
              </label>
              <div>
                <button type="button" onClick={() => setAddingToFamily(null)}>
                  Cancel
                </button>
                <button
                  aria-label="Add member"
                  title="Add member"
                  className="primary add-circle"
                  disabled={
                    addMode === "new" ? !memberName.trim() : !existingMember
                  }
                >
                  <Plus size={18} />
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {familyPrimary && (
        <div className="modal-backdrop">
          <div
            className="modal delete-dialog"
            ref={deletePanel}
            role="dialog"
            aria-modal="true"
            aria-label="Create family"
          >
            <h2>Create a family</h2>
            <p>
              {selected.length} selected guests will share one invitation.
              Guests you haven't selected stay in their existing families.
            </p>
            <label>
              Primary invitee
              <select
                aria-label="Primary invitee"
                value={familyPrimary}
                onChange={(e) => setFamilyPrimary(e.target.value)}
              >
                {state.guests
                  .filter((g) => selected.includes(g.id))
                  .map((g) => (
                    <option key={g.id} value={g.id}>
                      {g.name}
                    </option>
                  ))}
              </select>
            </label>
            <label>
              Family name
              <input
                aria-label="New family name"
                maxLength={120}
                placeholder={`${state.guests.find((g) => g.id === familyPrimary)?.name || ""} & family`}
                value={creationFamilyName}
                onChange={(e) => setCreationFamilyName(e.target.value)}
              />
            </label>
            <p className="family-preview-title">
              {state.guests.find((g) => g.id === familyPrimary)?.name} &amp;
              family · {selected.length} people
            </p>
            <ul className="family-members-preview">
              {state.guests
                .filter((g) => selected.includes(g.id))
                .map((g) => (
                  <li key={g.id}>{g.name}</li>
                ))}
            </ul>
            <div>
              <button onClick={() => setFamilyPrimary(null)}>Cancel</button>
              <button
                className="primary"
                disabled={selected.length < 2}
                onClick={() => {
                  const grouped = groupGuestsAsFamily(
                    state,
                    selected,
                    familyPrimary,
                  );
                  applyChange(
                    creationFamilyName.trim()
                      ? renameFamily(grouped, familyPrimary, creationFamilyName)
                      : grouped,
                    "Family created",
                  );
                  openFamily(familyPrimary);
                  setSelected([]);
                  setFamilyPrimary(null);
                }}
              >
                Save family
              </button>
            </div>
          </div>
        </div>
      )}
      {deleting && (
        <div className="modal-backdrop">
          <div
            className="modal delete-dialog"
            ref={deletePanel}
            role="dialog"
            aria-modal="true"
            aria-label="Delete guests"
          >
            <h2>
              Remove{" "}
              {deleting.length === 1
                ? state.guests.find((g) => g.id === deleting[0])?.name
                : `${deleting.length} guests`}
              ?
            </h2>
            <p>
              Their seats and family links will be removed too. You can undo
              this from the guest list.
            </p>
            <div>
              <button onClick={() => setDeleting(null)}>Cancel</button>
              <button
                className="primary"
                onClick={() => {
                  const result = removeGuests(state, deleting);
                  applyChange(
                    result.state,
                    `Removed ${result.removed.guests.length} ${result.removed.guests.length === 1 ? "guest" : "guests"}`,
                  );
                  setSelected([]);
                  setDeleting(null);
                }}
              >
                Delete {deleting.length === 1 ? "guest" : "guests"}
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

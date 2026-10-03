"use client";
import { useEffect, useId, useRef, useState } from "react";
import {
  Plus,
  Move,
  RotateCw,
  SlidersHorizontal,
  Minus,
  ZoomIn,
  Cross,
  Armchair,
  Users,
  Trash2,
} from "lucide-react";
import { useStudioHistory } from "@/lib/use-studio-history";
import { sortClergy } from "@/lib/clergy-actions";
import PersonPicker from "./person-picker";
import ClergyEditor from "./clergy-editor";
import { State, RecordItem, uid } from "@/lib/model";
import {
  ChurchLayout,
  ChurchPlace,
  readChurchLayout,
  assignChurchSeat,
  addChurchPlace,
  removeChurchPlace,
  moveChurchObject,
  churchObjectPosition,
  churchObjectSize,
  resizeChurchObject,
} from "@/lib/church-layout";
export { defaultChurchLayout, assignChurchSeat } from "@/lib/church-layout";
export default function ChurchSeating({
  state,
  change: apply,
  onClose,
}: {
  state: State;
  change: (s: State) => void;
  onClose?: () => void;
}) {
  const [mobilePanel, setMobilePanel] = useState("canvas");
  const [inspectorTab, setInspectorTab] = useState("people");
  const history = useStudioHistory(state, apply, "church");
  const change = history.change;
  const latest = useRef(state);
  latest.current = state;
  const record = state.records.find(
      (r) => r.kind === "ceremony_details" && r.details?.layout,
    ),
    persisted = readChurchLayout(record?.details?.layout);
  const [selected, setSelected] = useState("pew-0"),
    [search, setSearch] = useState(""),
    [draft, setDraft] = useState<ChurchLayout | null>(null),
    [zoom, setZoom] = useState(1);
  const layout = draft || persisted,
    svg = useRef<SVGSVGElement>(null),
    drag = useRef<{
      mode: "move" | "resize";
      id: string;
      start: { x: number; y: number };
      position: { x: number; y: number };
      base: ChurchLayout;
      next: ChurchLayout;
      pointer: number;
    } | null>(null),
    pattern = useId().replace(/:/g, "");
  const clergy = sortClergy(
      state.records.filter((r) => r.kind === "ceremony_clergy"),
    ),
    people = new Map(clergy.map((r) => [r.id, r])),
    place = layout.pews.find((p) => p.id === selected);
  const validSeats = Object.entries(layout.seats)
      .filter(([, id]) => people.has(id))
      .sort(
        ([, a], [, b]) =>
          clergy.findIndex((p) => p.id === a) -
          clergy.findIndex((p) => p.id === b),
      ),
    assigned = new Set(validSeats.map(([, id]) => id)),
    occupants = validSeats.filter(([k]) => k.startsWith(selected + ":"));
  function save(next: ChurchLayout, extra?: RecordItem) {
    const current = latest.current,
      existing = current.records.find(
        (r) => r.kind === "ceremony_details" && r.details?.layout,
      );
    const r: RecordItem = existing
      ? {
          ...existing,
          details: { ...existing.details, layout: JSON.stringify(next) },
        }
      : {
          id: uid(),
          event_id: current.event.id,
          kind: "ceremony_details",
          title: "Church seating layout",
          status: "open",
          amount: 0,
          paid: 0,
          date: "",
          notes: "",
          url: "",
          vendor_id: null,
          storage_path: null,
          details: { layout: JSON.stringify(next) },
        };
    const records = existing
      ? current.records.map((a) => (a.id === r.id ? r : a))
      : [...current.records, r];
    change({ ...current, records: extra ? [...records, extra] : records });
  }
  function patch(update: Partial<ChurchPlace>) {
    if (!place) return;
    const next = { ...place, ...update };
    save({
      ...layout,
      pews: layout.pews.map((p) => (p.id === place.id ? next : p)),
      seats: Object.fromEntries(
        Object.entries(layout.seats).filter(
          ([k]) =>
            !k.startsWith(place.id + ":") || +k.split(":")[1] < next.capacity,
        ),
      ),
    });
  }
  function assign(id: string) {
    if (!place || !id) return;
    const used = new Set(
      occupants.filter(([, p]) => p !== id).map(([k]) => +k.split(":")[1]),
    );
    let i = 0;
    while (used.has(i)) i++;
    const next = assignChurchSeat(layout, id, `${place.id}:${i}`);
    save({
      ...next,
      pews: next.pews.map((p) =>
        p.id === place.id ? { ...p, capacity: Math.max(p.capacity, i + 1) } : p,
      ),
    });
  }
  function add(kind: "pew" | "throne") {
    const next = addChurchPlace(layout, kind);
    save(next);
    setSelected(next.pews.at(-1)!.id);
  }
  function point(e: React.PointerEvent) {
    const node = svg.current!;
    const matrix = node.getScreenCTM?.();
    if (matrix) {
      const p = node.createSVGPoint();
      p.x = e.clientX;
      p.y = e.clientY;
      const mapped = p.matrixTransform(matrix.inverse());
      return { x: mapped.x, y: mapped.y };
    }
    const box = node.getBoundingClientRect();
    return {
      x: ((e.clientX - box.left) * layout.width) / (box.width || 400),
      y: ((e.clientY - box.top) * layout.depth) / (box.height || 400),
    };
  }
  function begin(
    e: React.PointerEvent<SVGElement>,
    id: string,
    mode: "move" | "resize" = "move",
  ) {
    if (e.button > 0 || drag.current) return;
    e.preventDefault();
    e.stopPropagation();
    setSelected(id);
    if (
      mode === "resize" ||
      ["altar", "iconostasis", "bride", "groom"].includes(id)
    )
      setInspectorTab("layout");
    const pos = churchObjectPosition(layout, id);
    if (!pos) return;
    drag.current = {
      mode,
      id,
      start: point(e),
      position: { x: pos.x, y: pos.y },
      base: layout,
      next: layout,
      pointer: e.pointerId,
    };
    e.currentTarget.setPointerCapture?.(e.pointerId);
  }
  function move(e: React.PointerEvent) {
    const d = drag.current;
    if (!d || d.pointer !== e.pointerId) return;
    const p = point(e);
    d.next = moveChurchObject(
      d.base,
      d.id,
      d.position.x + p.x - d.start.x,
      d.position.y + p.y - d.start.y,
    );
    if (d.mode === "resize") {
      const size = churchObjectSize(d.base, d.id);
      if (size) {
        const angle = ((size.rotation || 0) * Math.PI) / 180,
          dx = p.x - d.start.x,
          dy = p.y - d.start.y;
        d.next = resizeChurchObject(
          d.base,
          d.id,
          size.width + dx * Math.cos(angle) + dy * Math.sin(angle),
          size.depth - dx * Math.sin(angle) + dy * Math.cos(angle),
        );
      }
    }
    setDraft(d.next);
  }
  function end(e: React.PointerEvent) {
    const d = drag.current;
    if (!d || d.pointer !== e.pointerId) return;
    drag.current = null;
    setDraft(null);
    const pos = churchObjectPosition(d.next, d.id);
    if (!pos) return;
    const current = readChurchLayout(
      latest.current.records.find(
        (r) => r.details?.layout && r.kind === "ceremony_details",
      )?.details?.layout,
    );
    const size = churchObjectSize(d.next, d.id);
    save(
      d.mode === "resize" && size
        ? resizeChurchObject(current, d.id, size.width, size.depth)
        : moveChurchObject(current, d.id, pos.x, pos.y),
    );
  }
  function keyboard(e: React.KeyboardEvent<SVGGElement>, id: string) {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      setSelected(id);
    }
    const delta = (
      {
        ArrowLeft: [-1, 0],
        ArrowRight: [1, 0],
        ArrowUp: [0, -1],
        ArrowDown: [0, 1],
      } as Record<string, number[]>
    )[e.key];
    if (delta) {
      e.preventDefault();
      setSelected(id);
      const pos = churchObjectPosition(layout, id);
      if (pos)
        save(
          moveChurchObject(
            layout,
            id,
            pos.x + delta[0] * (e.shiftKey ? 2 : 0.5),
            pos.y + delta[1] * (e.shiftKey ? 2 : 0.5),
          ),
        );
    }
  }
  function handles(id: string) {
    return {
      role: "button",
      tabIndex: 0,
      onPointerDown: (e: React.PointerEvent<SVGGElement>) => begin(e, id),
      onClick: () => setSelected(id),
      onKeyDown: (e: React.KeyboardEvent<SVGGElement>) => keyboard(e, id),
      className: `church-item ${selected === id ? "is-selected" : ""}`,
    };
  }
  function resizeHandle(id: string, x: number, y: number) {
    return selected === id ? (
      <rect
        className="church-resize-handle"
        role="button"
        tabIndex={0}
        aria-label={`Resize ${id}`}
        x={x - 0.45}
        y={y - 0.45}
        width=".9"
        height=".9"
        rx=".15"
        fill="#53675d"
        stroke="white"
        strokeWidth=".15"
        onPointerDown={(e) => begin(e, id, "resize")}
        onKeyDown={(e) => {
          if (
            ["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(e.key)
          ) {
            e.preventDefault();
            e.stopPropagation();
            const size = churchObjectSize(layout, id);
            if (size)
              save(
                resizeChurchObject(
                  layout,
                  id,
                  size.width +
                    (e.key === "ArrowRight"
                      ? 0.5
                      : e.key === "ArrowLeft"
                        ? -0.5
                        : 0),
                  size.depth +
                    (e.key === "ArrowDown"
                      ? 0.5
                      : e.key === "ArrowUp"
                        ? -0.5
                        : 0),
                ),
              );
          }
        }}
      />
    ) : null;
  }
  function rotate() {
    if (place) patch({ rotation: ((place.rotation || 0) + 90) % 360 });
    else if (selected === "bride" || selected === "groom")
      save({
        ...layout,
        [selected]: {
          ...layout[selected],
          rotation: ((layout[selected].rotation || 0) + 90) % 360,
        },
      });
    else if (selected === "altar")
      save({
        ...layout,
        altar: {
          ...layout.altar,
          rotation: ((layout.altar.rotation || 0) + 90) % 360,
        },
      });
  }
  const position = churchObjectPosition(layout, selected),
    title =
      place?.name ||
      (selected === "bride"
        ? "Bride’s throne"
        : selected === "groom"
          ? "Groom’s throne"
          : selected === "altar"
            ? "Altar"
            : "Iconostasis");
  return (
    <div className="church-workspace church-focus-workspace">
      <header className="church-studio-heading">
        <div>
          <span className="eyebrow">THE CEREMONY SPACE</span>
          <h2>Church studio</h2>
        </div>
        <span className="church-count">
          <Users size={16} />
          {assigned.size} clergy assigned
        </span>
      </header>
      <div className="church-mobile-switch">
        <button
          aria-pressed={mobilePanel === "canvas"}
          onClick={() => setMobilePanel("canvas")}
        >
          Canvas
        </button>
        <button
          aria-pressed={mobilePanel === "people"}
          onClick={() => setMobilePanel("people")}
        >
          Edit & assign
        </button>
      </div>
      <div className="church-workbench" data-mobile-panel={mobilePanel}>
        <section className="church-canvas-panel">
          <div className="church-toolbar">
            <div className="church-add-tools">
              <button
                aria-label="Add pew"
                title="Add pew"
                className="add-circle"
                onClick={() => add("pew")}
              >
                <Plus size={18} />
              </button>
              <div className="studio-history">
                <button onClick={history.undo} disabled={!history.canUndo}>
                  Undo
                </button>
                <button onClick={history.redo} disabled={!history.canRedo}>
                  Redo
                </button>
              </div>
            </div>
            <details className="church-room-settings">
              <summary>
                <SlidersHorizontal size={16} />
                Room
              </summary>
              <div>
                <label>
                  Width (ft)
                  <input
                    type="number"
                    min="36"
                    value={layout.width}
                    onChange={(e) =>
                      save({ ...layout, width: Math.max(36, +e.target.value) })
                    }
                  />
                </label>
                <label>
                  Length (ft)
                  <input
                    type="number"
                    min="35"
                    value={layout.depth}
                    onChange={(e) =>
                      save({ ...layout, depth: Math.max(35, +e.target.value) })
                    }
                  />
                </label>
              </div>
            </details>
          </div>
          <div className="church-canvas-scroll">
            <svg
              ref={svg}
              className="church-plan church-drag-plan"
              style={{
                width: `${zoom * 100}%`,
                height: "auto",
                maxWidth: "none",
              }}
              viewBox={`-2 -2 ${layout.width + 4} ${layout.depth + 4}`}
              role="img"
              aria-label="Church clergy seating floor plan"
              onPointerMove={move}
              onPointerUp={end}
              onPointerCancel={() => {
                drag.current = null;
                setDraft(null);
              }}
            >
              <defs>
                <pattern
                  id={pattern}
                  width="2"
                  height="2"
                  patternUnits="userSpaceOnUse"
                >
                  <circle cx="1" cy="1" r=".04" fill="#c8bcab" />
                </pattern>
                <filter
                  id={`${pattern}-shadow`}
                  x="-30%"
                  y="-30%"
                  width="160%"
                  height="160%"
                >
                  <feDropShadow
                    dx="0"
                    dy=".15"
                    stdDeviation=".2"
                    floodColor="#3c2e1c"
                    floodOpacity=".12"
                  />
                </filter>
              </defs>
              <rect
                x="-2"
                y="-2"
                width={layout.width + 4}
                height={layout.depth + 4}
                fill="#eae5dd"
              />
              <rect
                width={layout.width}
                height={layout.depth}
                rx=".6"
                fill="#f8f5ee"
                stroke="#ddd4c6"
                strokeWidth=".12"
              />
              <rect
                width={layout.width}
                height={layout.depth}
                fill={`url(#${pattern})`}
                pointerEvents="none"
              />
              <text
                x={layout.width / 2}
                y="1.5"
                textAnchor="middle"
                fontSize=".8"
                fill="#9a8b76"
                letterSpacing=".18"
              >
                SANCTUARY
              </text>
              <g
                {...handles("altar")}
                aria-label="Move altar"
                transform={`translate(${layout.altar.x} ${layout.altar.y}) rotate(${layout.altar.rotation || 0} ${layout.altar.width / 2} ${layout.altar.depth / 2})`}
              >
                <rect
                  width={layout.altar.width}
                  height={layout.altar.depth}
                  rx=".3"
                  fill="#dfd0ad"
                  stroke="#ad9664"
                  strokeWidth=".14"
                  filter={`url(#${pattern}-shadow)`}
                />
                <text
                  x={layout.altar.width / 2}
                  y={layout.altar.depth / 2 + 0.35}
                  textAnchor="middle"
                  fontSize="1"
                  fill="#5c4a2e"
                >
                  Altar
                </text>
                {resizeHandle("altar", layout.altar.width, layout.altar.depth)}
              </g>
              <g
                {...handles("iconostasis")}
                aria-label="Move iconostasis"
                transform={`translate(${layout.iconX} ${layout.iconY})`}
              >
                <rect
                  width={layout.iconWidth}
                  height="1"
                  rx=".2"
                  fill="#9b8054"
                />
                <rect
                  x={layout.iconWidth / 2 - 2}
                  width="4"
                  height="1"
                  fill="#f8f5ee"
                />
                <text
                  x={layout.iconWidth / 2}
                  y="-1"
                  textAnchor="middle"
                  fontSize="1"
                  fill="#756144"
                >
                  Iconostasis
                </text>
                {resizeHandle("iconostasis", layout.iconWidth, 1)}
              </g>
              {(["bride", "groom"] as const).map((role) => (
                <g
                  key={role}
                  {...handles(role)}
                  aria-label={`${role} throne`}
                  transform={`translate(${layout[role].x - (layout[role].width || 3) / 2} ${layout[role].y}) rotate(${layout[role].rotation || 0} ${(layout[role].width || 3) / 2} ${(layout[role].depth || 3) / 2}) scale(${(layout[role].width || 3) / 3} ${(layout[role].depth || 3) / 3})`}
                >
                  <title>
                    {role === "bride"
                      ? state.event.partner_one
                      : state.event.partner_two}
                  </title>
                  <rect
                    width="3"
                    height="3"
                    rx=".35"
                    fill="#9b8054"
                    filter={`url(#${pattern}-shadow)`}
                  />
                  <rect
                    x=".45"
                    y=".65"
                    width="2.1"
                    height="1.95"
                    rx=".25"
                    fill="#864d49"
                  />
                  <path
                    d="M .2 .4 H 2.8 M .2 .6 V 2.8 M 2.8 .6 V 2.8"
                    fill="none"
                    stroke="#d4bd85"
                    strokeWidth=".22"
                  />
                  <text
                    x="1.5"
                    y="4.3"
                    fontSize="1"
                    fill="#61503c"
                    textAnchor="middle"
                  >
                    {role === "bride" ? "Bride" : "Groom"}
                  </text>
                </g>
              ))}
              {layout.pews.map((p) => {
                const occupants = validSeats.filter(([k]) =>
                  k.startsWith(p.id + ":"),
                );
                return (
                  <g
                    key={p.id}
                    {...handles(p.id)}
                    aria-label={`Move ${p.name}`}
                    transform={`translate(${p.x} ${p.y}) rotate(${p.rotation || 0} ${p.width / 2} ${p.depth / 2})`}
                  >
                    <title>
                      {p.name}:{" "}
                      {occupants
                        .map(([, id]) => people.get(id)?.title)
                        .join(", ") || "Unassigned"}
                    </title>
                    <rect
                      width={p.width}
                      height={p.depth}
                      rx=".22"
                      fill="#c7b293"
                      stroke="#a28a67"
                      strokeWidth=".1"
                      filter={`url(#${pattern}-shadow)`}
                    />
                    <rect width={p.width} height=".35" rx=".1" fill="#937853" />
                    {Array.from(
                      { length: Math.min(p.capacity, 16) },
                      (_, i) => (
                        <path
                          key={i}
                          d={`M ${(p.width * (i + 1)) / Math.min(p.capacity, 16)} .65 V ${p.depth - 0.25}`}
                          stroke="#aa9270"
                          strokeWidth=".06"
                        />
                      ),
                    )}
                    <text
                      x={p.width / 2}
                      y={p.depth + 0.9}
                      textAnchor="middle"
                      fontSize=".9"
                      fill="#6b5b46"
                    >
                      {p.name} · {occupants.length}/{p.capacity}
                    </text>
                    {resizeHandle(p.id, p.width, p.depth)}
                  </g>
                );
              })}
            </svg>
          </div>
          <div className="church-canvas-footer">
            <span>
              <Move size={14} />
              Drag to arrange · Arrow keys to nudge
            </span>
            <div>
              <button
                aria-label="Zoom out"
                disabled={zoom <= 1}
                onClick={() => setZoom(Math.max(1, zoom - 0.25))}
              >
                <Minus size={15} />
              </button>
              <span>{Math.round(zoom * 100)}%</span>
              <button
                aria-label="Zoom in"
                disabled={zoom >= 2}
                onClick={() => setZoom(Math.min(2, zoom + 0.25))}
              >
                <ZoomIn size={15} />
              </button>
            </div>
          </div>
        </section>
        <aside className="church-inspector" data-panel={inspectorTab}>
          <div className="church-inspector-heading">
            <span className="eyebrow">SELECTED</span>
            <h3>{title}</h3>
            {selected === "bride" || selected === "groom" ? (
              <p>
                {selected === "bride"
                  ? state.event.partner_one
                  : state.event.partner_two}
              </p>
            ) : null}
          </div>
          <div className="church-inspector-tabs">
            <button
              aria-pressed={inspectorTab === "people"}
              onClick={() => setInspectorTab("people")}
            >
              People
            </button>
            <button
              aria-pressed={inspectorTab === "layout"}
              onClick={() => setInspectorTab("layout")}
            >
              Size & layout
            </button>
          </div>
          {place && (
            <>
              <label className="church-layout-control">
                Name
                <input
                  value={place.name}
                  onChange={(e) => patch({ name: e.target.value })}
                />
              </label>
              <label className="church-layout-control">
                People per pew
                <input
                  type="number"
                  min="1"
                  value={place.capacity}
                  onChange={(e) =>
                    patch({
                      capacity: Math.max(1, Math.floor(+e.target.value)),
                    })
                  }
                />
              </label>
              <div className="church-people-control">
                <PersonPicker
                  label="Assign clergy"
                  people={clergy.map((p) => ({
                    id: p.id,
                    name: p.title,
                    group:
                      p.details?.role === "Bishop"
                        ? "Bishops"
                        : p.details?.role === "Priest"
                          ? "Priests"
                          : "Deacons",
                    detail: assigned.has(p.id) ? "Move here" : "",
                  }))}
                  choose={assign}
                />
              </div>
              <div className="church-assigned-people">
                {occupants.length ? (
                  occupants.map(([key, id]) => (
                    <div key={key}>
                      <span className="clergy-avatar">
                        {people
                          .get(id)
                          ?.title.split(" ")
                          .map((n) => n[0])
                          .slice(0, 2)
                          .join("")}
                      </span>
                      <span>
                        <ClergyEditor
                          state={state}
                          change={change}
                          person={people.get(id)}
                        />
                      </span>
                      <button
                        aria-label={`Unassign ${people.get(id)?.title}`}
                        onClick={() => save(assignChurchSeat(layout, "", key))}
                      >
                        ×
                      </button>
                    </div>
                  ))
                ) : (
                  <p>No clergy assigned yet.</p>
                )}
              </div>
            </>
          )}
          <details className="church-precise" open={inspectorTab === "layout"}>
            <summary>
              <SlidersHorizontal size={15} />
              Size & position
            </summary>
            <div className="form-grid">
              {(["x", "y"] as const).map((axis) => (
                <label key={axis}>
                  {axis === "x" ? "Horizontal" : "Vertical"} (ft)
                  <input
                    type="number"
                    min="0"
                    step=".5"
                    value={position?.[axis] ?? 0}
                    onChange={(e) => {
                      if (position)
                        save(
                          moveChurchObject(
                            layout,
                            selected,
                            axis === "x" ? +e.target.value : position.x,
                            axis === "y" ? +e.target.value : position.y,
                          ),
                        );
                    }}
                  />
                </label>
              ))}
              {place &&
                (["width", "depth"] as const).map((key) => (
                  <label key={key}>
                    {key} (ft)
                    <input
                      type="number"
                      min="1"
                      max={key === "width" ? layout.width : layout.depth}
                      step=".5"
                      value={place[key]}
                      onChange={(e) =>
                        patch({
                          [key]: Math.max(
                            1,
                            Math.min(
                              key === "width" ? layout.width : layout.depth,
                              +e.target.value,
                            ),
                          ),
                        })
                      }
                    />
                  </label>
                ))}
              {selected === "iconostasis" && (
                <label>
                  Width (ft)
                  <input
                    type="number"
                    min="4"
                    max={layout.width}
                    value={layout.iconWidth}
                    onChange={(e) =>
                      save({
                        ...layout,
                        iconWidth: Math.max(
                          4,
                          Math.min(layout.width, +e.target.value),
                        ),
                      })
                    }
                  />
                </label>
              )}
              {selected === "altar" &&
                (["width", "depth"] as const).map((key) => (
                  <label key={key}>
                    {key} (ft)
                    <input
                      type="number"
                      min="1"
                      value={layout.altar[key]}
                      onChange={(e) =>
                        save({
                          ...layout,
                          altar: {
                            ...layout.altar,
                            [key]: Math.max(1, +e.target.value),
                          },
                        })
                      }
                    />
                  </label>
                ))}
            </div>
          </details>
          <div className="church-selection-actions">
            {!["iconostasis", "bride", "groom"].includes(selected) && (
              <button onClick={rotate}>
                <RotateCw size={15} />
                Rotate
              </button>
            )}
            {place && (
              <button
                className="church-remove"
                onClick={() => {
                  save(removeChurchPlace(layout, place.id));
                  setSelected("altar");
                }}
              >
                <Trash2 size={15} />
                Remove {place.kind}
              </button>
            )}
          </div>
          <div className="church-add-clergy">
            <ClergyEditor state={state} change={change} initialRole="Deacon" />
          </div>
          <details className="church-unassigned">
            <summary>
              Unassigned clergy <small>{clergy.length - assigned.size}</small>
            </summary>
            <input
              aria-label="Search clergy"
              placeholder="Search clergy"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <div className="church-unseated">
              {clergy
                .filter(
                  (p) =>
                    !assigned.has(p.id) &&
                    p.title.toLowerCase().includes(search.toLowerCase()),
                )
                .map((p) => (
                  <div key={p.id}>
                    <ClergyEditor state={state} change={change} person={p} />
                    {place && (
                      <button
                        aria-label={`Assign ${p.title}`}
                        onClick={() => assign(p.id)}
                      >
                        <Plus size={15} />
                      </button>
                    )}
                  </div>
                ))}
            </div>
          </details>
        </aside>
      </div>
      <details className="church-chart-details">
        <summary>
          <Users size={16} />
          Seating chart<span>{assigned.size} assigned</span>
        </summary>
        <div className="chart-grid">
          {layout.pews.map((p) => (
            <article key={p.id}>
              <h4>{p.name}</h4>
              {validSeats.some(([k]) => k.startsWith(p.id + ":")) ? (
                <ul>
                  {validSeats
                    .filter(([k]) => k.startsWith(p.id + ":"))
                    .map(([k, id]) => (
                      <li key={k}>
                        {people.get(id)?.title} ·{" "}
                        {people.get(id)?.details?.role}
                      </li>
                    ))}
                </ul>
              ) : (
                <p>Unassigned</p>
              )}
            </article>
          ))}
        </div>
      </details>
    </div>
  );
}

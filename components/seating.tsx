"use client";
import { useStudioHistory } from "@/lib/use-studio-history";
import PersonPicker from "./person-picker";
import { useMemo, useRef, useState } from "react";
import { RotateCw, Trash2, Plus, Armchair, Undo2, Redo2 } from "lucide-react";
import {
  State,
  FloorObject,
  tables,
  objects,
  uid,
  assignSeat,
} from "@/lib/model";
import {
  generateReceptionLayout,
  suggestSeating,
  nextObjectPosition,
} from "@/lib/seating-suggestions";
import { receptionStyle, inkFor } from "@/lib/reception-style";
import dynamic from "next/dynamic";
const Seating3D = dynamic(() => import("./seating-3d"), {
  ssr: false,
  loading: () => null,
});
import {
  dimensions,
  chairSize,
  chairPosition,
  serpentCenter,
} from "@/lib/layout";
export default function Seating({
  state,
  change: apply,
}: {
  state: State;
  change: (s: State) => void;
}) {
  const history = useStudioHistory(state, apply, "reception");
  const change = history.change;
  const style = receptionStyle(state.event);
  const [suggestion, setSuggestion] = useState<"layout" | "seating" | null>(
      null,
    ),
    [guestSearch, setGuestSearch] = useState("");
  const [variant, setVariant] = useState(0);
  const [previousLayout, setPreviousLayout] = useState<Pick<
    State,
    "objects" | "seats"
  > | null>(null);
  const layout = useMemo(
      () =>
        suggestion === "layout"
          ? generateReceptionLayout(state, variant)
          : null,
      [state, variant, suggestion],
    ),
    seating = suggestion === "seating" ? suggestSeating(state) : null;
  const [view, setView] = useState("2d");
  const [returningToPlan, setReturningToPlan] = useState(false);
  const [cameraReady, setCameraReady] = useState(false);
  const [chair, setChair] = useState(0);
  const roomWidth = (state.event.room_width_ft || 80) * 10,
    roomDepth = (state.event.room_depth_ft || 60) * 10;
  const [selected, setSelected] = useState("");
  const [kind, setKind] = useState("round");
  const [pick, setPick] = useState("");
  const [drag, setDrag] = useState<{
    id: string;
    dx: number;
    dy: number;
  } | null>(null);
  const canvas = useRef<SVGSVGElement>(null);
  const obj = state.objects.find((o) => o.id === selected);
  const unseated = state.guests.filter(
    (g) =>
      g.rsvp !== "declined" && !state.seats.some((s) => s.guest_id === g.id),
  );
  function patch(o: FloorObject) {
    change({
      ...state,
      objects: state.objects.map((t) => (t.id === o.id ? o : t)),
      seats: state.seats.filter(
        (s) => s.table_id !== o.id || s.position < o.capacity,
      ),
    });
  }
  function point(e: React.PointerEvent) {
    const matrix = canvas.current!.getScreenCTM?.();
    if (matrix) {
      const p = canvas.current!.createSVGPoint();
      p.x = e.clientX;
      p.y = e.clientY;
      const mapped = p.matrixTransform(matrix.inverse());
      return { x: mapped.x, y: mapped.y };
    }
    const r = canvas.current!.getBoundingClientRect();
    return {
      x: ((e.clientX - r.left) * roomWidth) / r.width,
      y: ((e.clientY - r.top) * roomDepth) / r.height,
    };
  }
  function seat(id: string, i: number, guest = pick) {
    if (
      !guest ||
      !state.guests.some((g) => g.id === guest && g.rsvp !== "declined") ||
      !state.objects.some((o) => o.id === id && i < o.capacity)
    )
      return;
    change({
      ...state,
      seats: assignSeat(state.seats, state.event.id, guest, id, i),
    });
    setPick("");
    const table = state.objects.find((o) => o.id === id);
    if (table)
      setChair(
        Array.from({ length: table.capacity }, (_, pos) => pos).find(
          (pos) =>
            pos !== i &&
            !state.seats.some((s) => s.table_id === id && s.position === pos),
        ) ?? i,
      );
  }
  return (
    <div className="studio-layout">
      <section className="card studio">
        <div className="studio-toolbar">
          <div className="studio-history">
            <button
              aria-label="Undo"
              title="Undo"
              disabled={!history.canUndo}
              onClick={history.undo}
            >
              <Undo2 size={18} />
            </button>
            <button
              aria-label="Redo"
              title="Redo"
              disabled={!history.canRedo}
              onClick={history.redo}
            >
              <Redo2 size={18} />
            </button>
          </div>
          <div>
            <h3>Reception floor plan</h3>
            <small>Drag to arrange · Select a guest, then a chair</small>
          </div>
          <div className="view-toggle bubble-view-toggle">
            <button
              aria-pressed={view === "2d" || returningToPlan}
              onClick={() => {
                if (view === "3d") setReturningToPlan(true);
              }}
            >
              2D plan
            </button>
            <button
              aria-pressed={view === "3d" && !returningToPlan}
              onClick={() => {
                setReturningToPlan(false);
                setView("3d");
              }}
            >
              3D view
            </button>
          </div>
        </div>
        <div className="studio-guidance">
          <div>
            <strong>{unseated.length} guests to seat</strong>
            <small>Tables and décor follow your color palette.</small>
          </div>
          <button
            onClick={() => {
              setVariant((v) => v + 1);
              setSuggestion("layout");
            }}
          >
            Suggest layout
          </button>
          <button onClick={() => setSuggestion("seating")}>
            Suggest seating
          </button>
        </div>
        {suggestion && (
          <div
            className="suggestion-preview"
            role="region"
            aria-label="Seating suggestion"
          >
            <div>
              <h4>{layout ? layout.title : "Keep families together"}</h4>
              <p>
                {layout
                  ? `${layout.count} guests · ${layout.added.filter((o) => o.capacity).length} tables · ${layout.capacity} seats. Applying replaces reception tables and reseats guests; venue fixtures stay in place.`
                  : `${seating!.newSeats.length} guests can be assigned. Existing assignments stay in place.`}
              </p>
              {layout && layout.uncovered > 0 && (
                <p className="suggestion-warning">
                  Your room still needs space for {layout.uncovered} guests.
                  Increase the room size or table capacity.
                </p>
              )}
              {seating && seating.remaining > 0 && (
                <p className="suggestion-warning">
                  {seating.remaining} guests need additional seats.
                </p>
              )}
              {seating && seating.splitFamilies.length > 0 && (
                <p className="suggestion-warning">
                  {seating.splitFamilies.length} household(s) need to share
                  multiple tables because a single table cannot fit them.
                </p>
              )}
            </div>
            <div>
              {layout && (
                <>
                  <svg
                    className="layout-thumbnail"
                    viewBox={`0 0 ${roomWidth} ${roomDepth}`}
                    role="img"
                    aria-label={`${layout.title} layout preview`}
                  >
                    <rect
                      width={roomWidth}
                      height={roomDepth}
                      fill="#efede7"
                      rx="16"
                    />
                    {layout.objects.map((o) => {
                      const d = dimensions(o);
                      return (
                        <g
                          key={o.id}
                          transform={`translate(${o.x} ${o.y}) rotate(${o.rotation})`}
                        >
                          {o.kind === "round" || o.kind === "oval" ? (
                            <ellipse
                              rx={d.width * 5}
                              ry={d.depth * 5}
                              fill={style.linen}
                              stroke="#8c897e"
                            />
                          ) : (
                            <rect
                              x={-d.width * 5}
                              y={-d.depth * 5}
                              width={d.width * 10}
                              height={d.depth * 10}
                              rx={o.kind === "serpentine" ? 18 : 3}
                              fill={
                                o.kind === "dance floor"
                                  ? style.accent
                                  : style.linen
                              }
                              stroke="#8c897e"
                            />
                          )}
                          <text
                            textAnchor="middle"
                            dominantBaseline="middle"
                            fontSize="10"
                            fill="#282923"
                          >
                            {o.capacity
                              ? o.name.replace("Table ", "")
                              : o.kind === "dance floor"
                                ? style.monogram
                                : ""}
                          </text>
                        </g>
                      );
                    })}
                  </svg>
                  <button onClick={() => setVariant((v) => v + 1)}>
                    Generate another
                  </button>
                </>
              )}
              <button onClick={() => setSuggestion(null)}>Cancel</button>
              <button
                className="primary"
                disabled={
                  layout ? !layout.added.length : !seating?.newSeats.length
                }
                onClick={() => {
                  if (layout)
                    setPreviousLayout({
                      objects: state.objects,
                      seats: state.seats,
                    });
                  change({
                    ...state,
                    ...(layout
                      ? {
                          objects: layout.objects,
                          seats: suggestSeating({
                            ...state,
                            objects: layout.objects,
                            seats: state.seats.filter((s) =>
                              layout.objects.some((o) => o.id === s.table_id),
                            ),
                          }).seats,
                        }
                      : { seats: seating!.seats }),
                  });
                  setSuggestion(null);
                }}
              >
                Apply suggestion
              </button>
            </div>
          </div>
        )}
        {previousLayout && (
          <div className="studio-guidance">
            <span>
              Layout applied. Guests were seated with their families where space
              allows.
            </span>
            <button
              onClick={() => {
                change({
                  ...state,
                  objects: previousLayout.objects,
                  seats: previousLayout.seats.filter((s) =>
                    state.guests.some(
                      (g) => g.id === s.guest_id && g.rsvp !== "declined",
                    ),
                  ),
                });
                setPreviousLayout(null);
              }}
            >
              Undo layout
            </button>
          </div>
        )}
        <details className="room-settings">
          <summary>Room size & settings</summary>
          <div className="object-add">
            <label>
              Room width (ft)
              <input
                aria-label="Room width (ft)"
                type="number"
                min="20"
                max="200"
                value={roomWidth / 10}
                onChange={(e) =>
                  change({
                    ...state,
                    event: {
                      ...state.event,
                      room_width_ft: Math.min(
                        200,
                        Math.max(20, +e.target.value),
                      ),
                    },
                  })
                }
              />
            </label>
            <label>
              Room depth (ft)
              <input
                aria-label="Room depth (ft)"
                type="number"
                min="20"
                max="200"
                value={roomDepth / 10}
                onChange={(e) =>
                  change({
                    ...state,
                    event: {
                      ...state.event,
                      room_depth_ft: Math.min(
                        200,
                        Math.max(20, +e.target.value),
                      ),
                    },
                  })
                }
              />
            </label>
          </div>
        </details>
        <div className="object-add object-picker">
          <select
            aria-label="Object type"
            value={kind}
            onChange={(e) => setKind(e.target.value)}
          >
            {[...tables, ...objects].map((t) => (
              <option key={t}>{t}</option>
            ))}
          </select>
          <button
            aria-label="Add to room"
            title="Add to room"
            className="add-circle"
            onClick={() => {
              const id = uid();
              change({
                ...state,
                objects: [
                  ...state.objects,
                  {
                    id,
                    event_id: state.event.id,
                    name: tables.includes(kind)
                      ? `Table ${state.objects.filter((o) => o.capacity).length + 1}`
                      : kind,
                    kind,
                    ...nextObjectPosition(state, kind),
                    rotation: 0,
                    capacity: tables.includes(kind)
                      ? kind === "sweetheart"
                        ? 2
                        : 8
                      : 0,
                  },
                ],
              });
              setSelected(id);
            }}
          >
            <Plus size={18} />
          </button>
        </div>
        <div
          className={`studio-view-motion studio-view-${view}`}
          data-camera-ready={cameraReady}
        >
          <Seating3D
            state={state}
            returningToPlan={view === "2d" || returningToPlan}
            onReady={() => setCameraReady(true)}
            onPlanReady={() => {
              setView("2d");
              setReturningToPlan(false);
            }}
          />
          <div
            className="floor-scroll"
            aria-hidden={view === "3d" && cameraReady}
          >
            <svg
              ref={canvas}
              viewBox={`0 0 ${roomWidth} ${roomDepth}`}
              className="floor"
              aria-label="Interactive reception floor plan"
              onPointerMove={(e) => {
                if (drag) {
                  const p = point(e);
                  patch({
                    ...state.objects.find((o) => o.id === drag.id)!,
                    x: Math.min(roomWidth - 20, Math.max(20, p.x - drag.dx)),
                    y: Math.min(roomDepth - 20, Math.max(20, p.y - drag.dy)),
                  });
                }
              }}
              onPointerUp={() => {
                setDrag(null);
                history.end();
              }}
              onPointerCancel={() => {
                setDrag(null);
                history.end();
              }}
            >
              <defs>
                <pattern
                  id="grid"
                  width="20"
                  height="20"
                  patternUnits="userSpaceOnUse"
                >
                  <circle cx="1" cy="1" r=".8" fill="#dcd3c5" />
                </pattern>
              </defs>
              <rect
                x="0"
                y="0"
                width={roomWidth}
                height={roomDepth}
                fill="url(#grid)"
              />
              <rect
                x="25"
                y="25"
                width={roomWidth - 50}
                height={roomDepth - 50}
                rx="10"
                fill="none"
                stroke="#d4caba"
                strokeWidth="2"
              />
              <text
                x="40"
                y="48"
                fill="#90988c"
                fontSize="10"
                letterSpacing="3"
              >
                THE RECEPTION
              </text>
              {state.objects.map((o) => {
                const round = o.kind === "round" || o.kind === "cocktail",
                  oval = o.kind === "oval";
                const size = dimensions(o),
                  w = size.width * 10,
                  h = size.depth * 10;
                return (
                  <g
                    key={o.id}
                    data-selected={selected === o.id}
                    transform={`translate(${o.x} ${o.y}) rotate(${o.rotation})`}
                  >
                    <g
                      role="button"
                      tabIndex={0}
                      aria-label={`Select ${o.name}`}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") setSelected(o.id);
                        if (
                          [
                            "ArrowLeft",
                            "ArrowRight",
                            "ArrowUp",
                            "ArrowDown",
                          ].includes(e.key)
                        ) {
                          e.preventDefault();
                          patch({
                            ...o,
                            x: Math.max(
                              20,
                              Math.min(
                                roomWidth - 20,
                                o.x +
                                  (e.key === "ArrowRight"
                                    ? 10
                                    : e.key === "ArrowLeft"
                                      ? -10
                                      : 0),
                              ),
                            ),
                            y: Math.max(
                              20,
                              Math.min(
                                roomDepth - 20,
                                o.y +
                                  (e.key === "ArrowDown"
                                    ? 10
                                    : e.key === "ArrowUp"
                                      ? -10
                                      : 0),
                              ),
                            ),
                          });
                        }
                      }}
                      onPointerDown={(e) => {
                        setSelected(o.id);
                        setChair(
                          Array.from({ length: o.capacity }, (_, i) => i).find(
                            (i) =>
                              !state.seats.some(
                                (s) => s.table_id === o.id && s.position === i,
                              ),
                          ) ?? 0,
                        );
                        canvas.current?.setPointerCapture?.(e.pointerId);
                        const p = point(e);
                        history.begin();
                        setDrag({ id: o.id, dx: p.x - o.x, dy: p.y - o.y });
                        canvas.current?.setPointerCapture(e.pointerId);
                      }}
                      style={{ cursor: "grab" }}
                    >
                      {o.kind === "serpentine" ? (
                        <path
                          d={Array.from({ length: 65 }, (_, i) => {
                            const p = serpentCenter(i / 64, w, h);
                            return `${i ? "L" : "M"} ${p.x} ${p.y}`;
                          }).join(" ")}
                          fill="none"
                          stroke={style.linen}
                          strokeWidth={h * 0.32}
                          strokeLinecap="round"
                        />
                      ) : round || oval ? (
                        <ellipse
                          rx={w / 2}
                          ry={h / 2}
                          fill={style.linen}
                          stroke={selected === o.id ? "#87785f" : "#c9beab"}
                          strokeWidth={selected === o.id ? 3 : 1.5}
                        />
                      ) : (
                        <rect
                          x={-w / 2}
                          y={-h / 2}
                          width={w}
                          height={h}
                          rx="9"
                          fill={
                            o.capacity || o.kind === "dance floor"
                              ? style.linen
                              : "#e9e1d4"
                          }
                          stroke={selected === o.id ? "#87785f" : "#c9beab"}
                          strokeWidth={selected === o.id ? 3 : 1.5}
                        />
                      )}
                      {o.kind === "dance floor" ? (
                        <g pointerEvents="none">
                          <rect
                            x={-w / 2 + 8}
                            y={-h / 2 + 8}
                            width={Math.max(1, w - 16)}
                            height={Math.max(1, h - 16)}
                            rx="5"
                            fill="none"
                            stroke={style.accent}
                            strokeWidth="2"
                          />
                          <text
                            textAnchor="middle"
                            y="5"
                            fontFamily="Instrument Serif,serif"
                            fontSize={Math.min(w, h) * 0.19}
                            fill={inkFor(style.linen)}
                          >
                            {style.monogram || "Our day"}
                          </text>
                          <text
                            textAnchor="middle"
                            y={h * 0.24}
                            fontSize="9"
                            letterSpacing="2"
                            fill={inkFor(style.linen)}
                          >
                            DANCE FLOOR
                          </text>
                        </g>
                      ) : (
                        <>
                          <text
                            textAnchor="middle"
                            y={o.capacity ? Math.min(h / 2 - 4, 18) : 4}
                            fontSize={Math.min(
                              10,
                              w / Math.max(o.name.length * 0.65, 1),
                            )}
                            fill={o.capacity ? inkFor(style.linen) : "#46523e"}
                          >
                            {o.name}
                          </text>
                          {o.capacity > 0 && h >= 45 && (
                            <g pointerEvents="none">
                              <ellipse
                                cy="-6"
                                rx="14"
                                ry="7"
                                fill={style.accent}
                                opacity=".8"
                              />
                              <circle
                                cx="-5"
                                cy="-7"
                                r="4"
                                fill={style.flower}
                              />
                              <circle
                                cx="3"
                                cy="-9"
                                r="4"
                                fill={style.flower}
                              />
                              <circle
                                cx="7"
                                cy="-4"
                                r="3"
                                fill={style.greenery}
                              />
                              <rect
                                x="-18"
                                y="-12"
                                width="3"
                                height="10"
                                rx="1"
                                fill="#f8e7b9"
                              />
                              <rect
                                x="16"
                                y="-12"
                                width="3"
                                height="10"
                                rx="1"
                                fill="#f8e7b9"
                              />
                            </g>
                          )}
                        </>
                      )}
                    </g>
                    {Array.from({ length: o.capacity }, (_, i) => {
                      const p = chairPosition(o, i),
                        x = p.x * 10,
                        y = p.y * 10;
                      const cs = chairSize(o, i);
                      const assignment = state.seats.find(
                        (s) => s.table_id === o.id && s.position === i,
                      );
                      const guest = state.guests.find(
                        (g) => g.id === assignment?.guest_id,
                      );
                      return (
                        <g
                          key={i}
                          transform={`translate(${x} ${y})`}
                          role="button"
                          tabIndex={0}
                          aria-label={`${o.name} chair ${i + 1}: ${guest?.name || "empty"}`}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") seat(o.id, i);
                          }}
                          onClick={() => {
                            setSelected(o.id);
                            setChair(i);
                            seat(o.id, i);
                          }}
                          onDragOver={(e) => e.preventDefault()}
                          onDrop={(e) => {
                            e.preventDefault();
                            seat(o.id, i, e.dataTransfer.getData("text/guest"));
                          }}
                          style={{ cursor: "pointer" }}
                        >
                          <rect
                            x={-cs.width * 5}
                            y={-cs.depth * 5}
                            width={cs.width * 10}
                            height={cs.depth * 10}
                            rx="6"
                            fill={guest ? "#87785f" : "#fff"}
                            stroke="#c2b49d"
                          />
                          <text
                            textAnchor="middle"
                            y="3"
                            transform={`rotate(${-o.rotation})`}
                            fontSize="6"
                            fill={guest ? "#fff" : "#968871"}
                          >
                            {guest
                              ? guest.name
                                  .split(" ")
                                  .map((s) => s[0])
                                  .join("")
                              : i + 1}
                          </text>
                          <title>{guest?.name || "Empty chair"}</title>
                        </g>
                      );
                    })}
                  </g>
                );
              })}
            </svg>
          </div>
        </div>
        <div className="studio-footer">
          <span>
            <i className="dot" /> {state.seats.length} seated
          </span>
          <span>{unseated.length} awaiting a seat</span>
          <span>Arrow keys move selected objects</span>
        </div>
      </section>
      <aside className="seat-sidebar">
        <div className="card">
          <h3>
            <Armchair size={18} /> Unseated guests{" "}
            <span className="count">{unseated.length}</span>
          </h3>
          <small>Drag a guest onto a chair, or select them first.</small>
          <input
            className="guest-pool-search"
            aria-label="Search unseated guests"
            placeholder="Find a guest"
            value={guestSearch}
            onChange={(e) => setGuestSearch(e.target.value)}
          />
          <div className="guest-pool">
            {unseated
              .filter((g) =>
                `${g.name} ${g.household}`
                  .toLowerCase()
                  .includes(guestSearch.toLowerCase()),
              )
              .map((g) => (
                <button
                  className={`guest-chip ${pick === g.id ? "chosen" : ""}`}
                  draggable
                  onDragStart={(e) =>
                    e.dataTransfer.setData("text/guest", g.id)
                  }
                  key={g.id}
                  onClick={() => setPick(pick === g.id ? "" : g.id)}
                >
                  <span className="avatar">
                    {g.name
                      .split(" ")
                      .map((n) => n[0])
                      .join("")}
                  </span>
                  <span>
                    {g.name}
                    <small>{g.household}</small>
                  </span>
                  <span className="drag-dots">⠿</span>
                </button>
              ))}
          </div>
        </div>
        {obj && (
          <div className="card inspector">
            <h3>{obj.name}</h3>
            <details className="object-size">
              <summary>Object size</summary>
              <div className="dimension-fields">
                {(["width", "depth"] as const).map((k) => (
                  <label key={k}>
                    {k === "width" ? "Width (ft)" : "Depth (ft)"}
                    <input
                      type="number"
                      min="0.5"
                      max="100"
                      step="0.5"
                      value={dimensions(obj)[k]}
                      onChange={(e) =>
                        patch({
                          ...obj,
                          [k === "width" ? "width_ft" : "depth_ft"]: Math.min(
                            100,
                            Math.max(0.5, +e.target.value),
                          ),
                        })
                      }
                    />
                  </label>
                ))}
              </div>
            </details>
            {obj.capacity > 0 && (
              <>
                <PersonPicker
                  label="Assign guest to table"
                  people={state.guests
                    .filter((g) => g.rsvp !== "declined")
                    .sort((a, b) => a.name.localeCompare(b.name))
                    .map((g) => ({
                      id: g.id,
                      name: g.name,
                      detail: g.household,
                    }))}
                  choose={(id) =>
                    seat(obj.id, Math.min(chair, obj.capacity - 1), id)
                  }
                />
                <label>
                  Seat
                  <select
                    value={Math.min(chair, obj.capacity - 1)}
                    onChange={(e) => setChair(+e.target.value)}
                  >
                    {Array.from({ length: obj.capacity }, (_, i) => (
                      <option key={i} value={i}>
                        Seat {i + 1} ·{" "}
                        {state.guests.find(
                          (g) =>
                            g.id ===
                            state.seats.find(
                              (s) => s.table_id === obj.id && s.position === i,
                            )?.guest_id,
                        )?.name || "Empty"}
                      </option>
                    ))}
                  </select>
                </label>
                <details className="chair-settings">
                  <summary>Chair size</summary>
                  <div className="dimension-fields">
                    {(["width", "depth"] as const).map((k) => (
                      <label key={k}>
                        Chair {k} (ft)
                        <input
                          type="number"
                          min="0.5"
                          max="5"
                          step="0.25"
                          value={
                            chairSize(obj, Math.min(chair, obj.capacity - 1))[k]
                          }
                          onChange={(e) => {
                            const i = Math.min(chair, obj.capacity - 1);
                            patch({
                              ...obj,
                              chair_sizes: {
                                ...obj.chair_sizes,
                                [i]: {
                                  ...chairSize(obj, i),
                                  [k]: Math.min(
                                    5,
                                    Math.max(0.5, +e.target.value),
                                  ),
                                },
                              },
                            });
                          }}
                        />
                      </label>
                    ))}
                  </div>
                </details>
              </>
            )}
            <label>
              Name
              <input
                value={obj.name}
                onChange={(e) => patch({ ...obj, name: e.target.value })}
              />
            </label>
            {obj.capacity > 0 && (
              <label>
                Seats
                <input
                  type="number"
                  min="1"
                  max="24"
                  value={obj.capacity}
                  onChange={(e) =>
                    patch({
                      ...obj,
                      capacity: Math.min(24, Math.max(1, +e.target.value)),
                    })
                  }
                />
              </label>
            )}
            <button
              onClick={() =>
                patch({ ...obj, rotation: (obj.rotation + 45) % 360 })
              }
            >
              <RotateCw size={14} /> Rotate 45°
            </button>
            <button
              className="danger"
              onClick={() => {
                change({
                  ...state,
                  objects: state.objects.filter((o) => o.id !== obj.id),
                  seats: state.seats.filter((s) => s.table_id !== obj.id),
                });
                setSelected("");
              }}
            >
              <Trash2 size={14} /> Remove object
            </button>
            {state.seats
              .filter((s) => s.table_id === obj.id)
              .map((s) => (
                <button
                  key={s.id}
                  onClick={() =>
                    change({
                      ...state,
                      seats: state.seats.filter((a) => a.id !== s.id),
                    })
                  }
                >
                  Unseat {state.guests.find((g) => g.id === s.guest_id)?.name}
                </button>
              ))}
          </div>
        )}
      </aside>
      <section className="card live-chart">
        <div className="card-heading">
          <h3>Live seating chart</h3>
          <span className="badge">{state.seats.length} assigned</span>
        </div>
        <div className="chart-grid">
          {state.objects
            .filter((o) => o.capacity > 0)
            .map((o) => (
              <article key={o.id}>
                <h4>
                  {o.name}{" "}
                  <small>
                    {state.seats.filter((s) => s.table_id === o.id).length}/
                    {o.capacity}
                  </small>
                </h4>
                <ol>
                  {Array.from({ length: o.capacity }, (_, i) => {
                    const s = state.seats.find(
                      (s) => s.table_id === o.id && s.position === i,
                    );
                    return (
                      <li key={i}>
                        {state.guests.find((g) => g.id === s?.guest_id)?.name ||
                          "Available"}
                      </li>
                    );
                  })}
                </ol>
              </article>
            ))}
        </div>
      </section>
    </div>
  );
}

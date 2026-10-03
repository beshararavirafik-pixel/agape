"use client";
import { State } from "@/lib/model";
import { dimensions } from "@/lib/layout";
export default function Overview({
  state,
  change,
  navigate,
}: {
  state: State;
  change: (s: State) => void;
  navigate: (page: string) => void;
}) {
  const { event, guests, records, seats } = state,
    tasks = records.filter((r) => r.kind === "task"),
    done = tasks.filter((r) => r.status === "done").length,
    planned = records
      .filter((r) => r.kind === "budget")
      .reduce((a, r) => a + r.amount, 0),
    accepted = guests.filter((g) => g.rsvp === "accepted").length;
  const money = (n: number) =>
    new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: 0,
    }).format(n);
  const date = event.date
    ? new Date(event.date + "T12:00:00").toLocaleDateString("en-US", {
        month: "2-digit",
        day: "2-digit",
        year: "numeric",
      })
    : "Date to be decided";
  const days = event.date
    ? Math.max(
        0,
        Math.ceil(
          (new Date(event.date + "T12:00:00").getTime() - Date.now()) /
            86400000,
        ),
      )
    : null;
  return (
    <div className="overview">
      <section className="celebration-scene" aria-label="Your celebration">
        <img
          src="/images/reception.jpg"
          alt="White flowers and candlelight at a wedding reception"
          width={2400}
          height={1597}
          fetchPriority="high"
          className="scene-image"
        />
        <div className="scene-shade" />
        <div className="scene-top">
          <span>
            {event.mode === "wedding" ? "THE WEDDING" : "THE ENGAGEMENT"}
          </span>
        </div>
        <div className="scene-content">
          <h1>
            <span>{event.partner_one || "You"}</span>
            <span className="couple-second">
              <em>&</em> {event.partner_two || "your partner"}
            </span>
          </h1>
          <div className="scene-meta">
            <span>{date}</span>
            {event.venue && <span>{event.venue}</span>}
          </div>
        </div>
        <div className="scene-bottom">
          {days !== null && (
            <span>
              <strong>{days}</strong> days to go
            </span>
          )}
        </div>
      </section>
      <nav className="chapter-links" aria-label="Quick planning tools">
        {[
          ["01", "Guests", "Guests & RSVPs"],
          ["02", "Seating", "Seating studio"],
          ["03", "Budget", "Budget"],
          ["04", "Church", "Church Ceremony"],
        ].map(([n, label, page]) => (
          <button
            key={page}
            onClick={() => navigate(page)}
            aria-label={`Open ${label.toLowerCase()}`}
          >
            <small>{n}</small>
            <span>{label}</span>
            <span className="chapter-plus">+</span>
          </button>
        ))}
      </nav>
      <section className="plan-snapshot" aria-label="Planning at a glance">
        <div>
          <span>YOUR PEOPLE</span>
          <strong>{guests.length}</strong>
          <small>{accepted} accepted</small>
        </div>
        <div>
          <span>YOUR BUDGET</span>
          <strong>{money(planned)}</strong>
          <small>of {money(event.budget)} planned</small>
        </div>
        <div>
          <span>YOUR PROGRESS</span>
          <strong>
            {tasks.length ? Math.round((done / tasks.length) * 100) : 0}
            <em>%</em>
          </strong>
          <small>
            {done} of {tasks.length} tasks complete
          </small>
        </div>
      </section>
      <section className="next-section">
        <div>
          <h2>
            One detail
            <br />
            <em>at a time.</em>
          </h2>
          <button className="text-button" onClick={() => navigate("Checklist")}>
            View checklist
          </button>
        </div>
        <div className="next-list">
          {tasks
            .filter((t) => t.status !== "done")
            .slice(0, 4)
            .map((t) => (
              <div className="task-row" key={t.id}>
                <button
                  className="check-circle"
                  aria-label={`Complete ${t.title}`}
                  onClick={() =>
                    change({
                      ...state,
                      records: records.map((r) =>
                        r.id === t.id ? { ...r, status: "done" } : r,
                      ),
                    })
                  }
                />
                <div>
                  <strong>{t.title}</strong>
                  <small>
                    {t.date
                      ? new Date(t.date + "T12:00:00").toLocaleDateString(
                          "en-US",
                          { month: "2-digit", day: "2-digit", year: "numeric" },
                        )
                      : "No date set"}
                  </small>
                </div>
              </div>
            ))}
        </div>
      </section>
      <section className="reception-entry">
        <div>
          <span className="eyebrow">THE RECEPTION</span>
          <h2>
            A place for
            <br />
            <em>everyone.</em>
          </h2>
          <p>
            {seats.length} guests seated ·{" "}
            {state.objects.filter((o) => o.capacity).length} tables
          </p>
          <button onClick={() => navigate("Seating studio")}>
            Open seating studio
          </button>
        </div>
        <div className="reception-preview" aria-hidden="true">
          <svg
            viewBox={`0 0 ${(event.room_width_ft || 80) * 10} ${(event.room_depth_ft || 60) * 10}`}
          >
            {state.objects.map((o) => {
              const s = dimensions(o);
              return (
                <g
                  key={o.id}
                  transform={`translate(${o.x} ${o.y}) rotate(${o.rotation})`}
                >
                  {["round", "oval", "cocktail"].includes(o.kind) ? (
                    <ellipse rx={s.width * 5} ry={s.depth * 5} />
                  ) : (
                    <rect
                      x={-s.width * 5}
                      y={-s.depth * 5}
                      width={s.width * 10}
                      height={s.depth * 10}
                      rx={4}
                    />
                  )}
                  <text textAnchor="middle" y="4">
                    {o.name}
                  </text>
                </g>
              );
            })}
          </svg>
        </div>
      </section>
    </div>
  );
}

"use client";
import { useEffect, useState } from "react";
import { Heart, MapPin, Check, CalendarDays, ArrowUpRight } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { sitePath } from "@/lib/site-path";
export type InvitationContent = {
  welcome?: string;
  photo?: string;
  deadline?: string;
  church?: string;
  church_time?: string;
  reception?: string;
  reception_time?: string;
  dress?: string;
  parking?: string;
  accommodation?: string;
  registry?: string;
  contact?: string;
  publish_seating?: boolean;
  publish_assignments?: boolean;
};
type Reply = {
  id: string;
  name: string;
  rsvp: string;
  meal: string;
  table?: string;
};
type Invitation = {
  event: {
    partner_one: string;
    partner_two: string;
    date: string;
    venue: string;
    palette: string[];
  };
  content: InvitationContent;
  guests: Reply[];
  clergy?: {
    name: string;
    role: string;
    pew?: string;
    assignments: { title: string; language: string; notes: string }[];
  };
};
const preview: Invitation = {
  event: {
    partner_one: "Alex",
    partner_two: "Jordan",
    date: "2027-06-19",
    venue: "The Glasshouse",
    palette: ["#d9c7b0", "#68766a", "#f4eee6"],
  },
  content: {
    welcome: "We can’t wait to celebrate with you.",
    church: "St. Mark’s Church",
    church_time: "14:00",
    reception: "The Glasshouse",
    reception_time: "17:00",
    dress: "Formal · Wear something you feel wonderful in.",
    parking: "Parking is available beside the church.",
    contact: "Please contact the couple with any questions.",
    publish_seating: true,
    publish_assignments: true,
  },
  guests: [
    {
      id: "demo-1",
      name: "Michael Bennett",
      rsvp: "pending",
      meal: "",
      table: "Table 4",
    },
    {
      id: "demo-2",
      name: "Sarah Bennett",
      rsvp: "pending",
      meal: "",
      table: "Table 4",
    },
  ],
  clergy: {
    name: "Michael Bennett",
    role: "Deacon",
    pew: "Pew 2",
    assignments: [
      {
        title: "The Gospel response",
        language: "English",
        notes: "Please arrive 30 minutes before the ceremony.",
      },
    ],
  },
};
function dateLabel(value: string) {
  return value
    ? new Date(value + "T12:00:00").toLocaleDateString("en-US", {
        month: "long",
        day: "numeric",
        year: "numeric",
      })
    : "Date to be announced";
}
function timeLabel(value?: string) {
  if (!value) return "";
  const [h, m] = value.split(":").map(Number);
  return `${h % 12 || 12}:${String(m).padStart(2, "0")} ${h >= 12 ? "PM" : "AM"}`;
}
export default function InviteeView({
  token,
  demo = false,
}: {
  token: string;
  demo?: boolean;
}) {
  const [data, setData] = useState<Invitation | null>(demo ? preview : null),
    [replies, setReplies] = useState<Reply[]>(demo ? preview.guests : []),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [saved, setSaved] = useState(false);
  useEffect(() => {
    if (demo) return;
    let active = true;
    if (!supabase) {
      setError("Invitations are temporarily unavailable.");
      return;
    }
    supabase.rpc("read_guest_invitation", { token }).then(({ data, error }) => {
      if (!active) return;
      if (error) setError(error.message);
      else {
        setData(data);
        setReplies(data.guests);
      }
    });
    return () => {
      active = false;
    };
  }, [token, demo]);
  async function save() {
    setBusy(true);
    setError("");
    try {
      if (!demo) {
        const { data, error } = await supabase!.rpc("reply_guest_invitation", {
          token,
          replies: replies.map(({ id, rsvp, meal }) => ({ id, rsvp, meal })),
        });
        if (error) throw error;
        setData(data);
      }
      setSaved(true);
    } catch (e) {
      setError(
        e instanceof Error ? e.message : (e as { message: string }).message,
      );
    } finally {
      setBusy(false);
    }
  }
  if (!data)
    return (
      <main className="invitee-page">
        <div className="brand">Agapē</div>
        <section className="invitee-card">
          <h1>
            {error ? "Invitation unavailable" : "Opening your invitation…"}
          </h1>
          <p role="alert">{error || "One lovely moment."}</p>
        </section>
      </main>
    );
  const c = data.content,
    closed =
      !!c.deadline &&
      c.deadline <
        `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, "0")}-${String(new Date().getDate()).padStart(2, "0")}`;
  return (
    <main className="invitee-page">
      <header className="invitee-brand brand">Agapē</header>
      {demo && (
        <div className="invitee-demo">
          Sample invitation · responses are not sent
        </div>
      )}
      <section className="invitee-hero">
        {c.photo && /^https:\/\//.test(c.photo) && (
          <img src={c.photo} alt="The couple" />
        )}
        <Heart size={25} />
        <p>You’re invited</p>
        <h1>
          {data.event.partner_one}
          <span>&</span>
          {data.event.partner_two}
        </h1>
        <div className="invitee-date">
          <CalendarDays size={16} />
          {dateLabel(data.event.date)}
        </div>
        <p>{c.welcome || "Join us for a day filled with love."}</p>
        <div className="invitee-palette">
          {data.event.palette?.map((color, i) => (
            <i key={i} style={{ background: color }} />
          ))}
        </div>
      </section>
      <section className="invitee-card">
        <div className="invitee-heading">
          <h2>Your invitation</h2>
          {c.deadline && <small>Kindly reply by {dateLabel(c.deadline)}</small>}
        </div>
        {saved ? (
          <div className="invitee-success" role="status">
            <Check size={24} />
            <h3>
              {demo
                ? "Your sample response is saved"
                : "Your response is saved"}
            </h3>
            <p>Thank you. We’re so glad you let us know.</p>
            {!closed && (
              <button onClick={() => setSaved(false)}>Change response</button>
            )}
          </div>
        ) : (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void save();
            }}
          >
            {replies.map((g, i) => (
              <div className="invitee-person" key={g.id}>
                <h3>{g.name}</h3>
                <div
                  className="invitee-rsvp"
                  role="group"
                  aria-label={`RSVP for ${g.name}`}
                >
                  {[
                    ["accepted", "Joyfully accepts"],
                    ["declined", "Regretfully declines"],
                  ].map(([value, label]) => (
                    <button
                      type="button"
                      key={value}
                      disabled={closed || busy}
                      className={g.rsvp === value ? "selected" : ""}
                      aria-pressed={g.rsvp === value}
                      onClick={() =>
                        setReplies(
                          replies.map((r, j) =>
                            j === i ? { ...r, rsvp: value } : r,
                          ),
                        )
                      }
                    >
                      {label}
                    </button>
                  ))}
                </div>
                {g.rsvp === "accepted" && (
                  <label>
                    Meal preference & dietary needs
                    <textarea
                      maxLength={500}
                      value={g.meal}
                      placeholder="Meal choice, allergies, or anything we should know"
                      disabled={closed || busy}
                      onChange={(e) =>
                        setReplies(
                          replies.map((r, j) =>
                            j === i ? { ...r, meal: e.target.value } : r,
                          ),
                        )
                      }
                    />
                  </label>
                )}
              </div>
            ))}
            {closed ? (
              <p>The RSVP deadline has passed. Please contact the couple.</p>
            ) : (
              <button
                className="primary"
                disabled={busy || replies.some((g) => g.rsvp === "pending")}
              >
                {busy ? "Saving…" : "Save response"}
              </button>
            )}
          </form>
        )}
        {error && (
          <p className="invitee-error" role="alert">
            {error}
          </p>
        )}
      </section>
      <div className="invitee-details">
        {[
          ["Church ceremony", c.church, c.church_time],
          ["Reception", c.reception || data.event.venue, c.reception_time],
        ]
          .filter(([, location]) => location)
          .map(([title, location, time]) => (
            <section className="invitee-card" key={title}>
              <MapPin size={20} />
              <h2>{title}</h2>
              <p>{location}</p>
              {time && <p>{timeLabel(time)}</p>}
              <a
                className="invitee-link"
                href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(location!)}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                Directions <ArrowUpRight size={15} />
              </a>
            </section>
          ))}
      </div>
      {c.publish_seating && data.guests.some((g) => g.table) && (
        <section className="invitee-card">
          <h2>Your place at the celebration</h2>
          {data.guests
            .filter((g) => g.table)
            .map((g) => (
              <div className="invitee-place" key={g.id}>
                <span>{g.name}</span>
                <strong>{g.table}</strong>
              </div>
            ))}
        </section>
      )}
      {data.clergy && (
        <section className="invitee-card invitee-service">
          <p className="invitee-eyebrow">Church service · {data.clergy.role}</p>
          <h2>{data.clergy.name}, your assignments</h2>
          {data.clergy.pew && (
            <p>
              Your place: <strong>{data.clergy.pew}</strong>
            </p>
          )}
          {data.clergy.assignments.length ? (
            data.clergy.assignments.map((a, i) => (
              <div className="invitee-assignment" key={i}>
                <span>{String(i + 1).padStart(2, "0")}</span>
                <div>
                  <h3>{a.title}</h3>
                  <small>{a.language}</small>
                  {a.notes && <p>{a.notes}</p>}
                </div>
              </div>
            ))
          ) : (
            <p>Your assignments will appear here when the couple adds them.</p>
          )}
        </section>
      )}
      {(c.dress || c.parking || c.accommodation || c.registry || c.contact) && (
        <section className="invitee-card">
          <h2>A few helpful details</h2>
          {[
            ["Dress code", c.dress],
            ["Parking", c.parking],
            ["Accommodation", c.accommodation],
            ["Questions?", c.contact],
          ]
            .filter(([, text]) => text)
            .map(([label, text]) => (
              <div className="invitee-help" key={label}>
                <h3>{label}</h3>
                <p>{text}</p>
              </div>
            ))}
          {c.registry && /^https:\/\//.test(c.registry) && (
            <a
              className="invitee-link"
              href={c.registry}
              target="_blank"
              rel="noopener noreferrer"
            >
              Visit the registry <ArrowUpRight size={15} />
            </a>
          )}
        </section>
      )}
      <footer className="brand invitee-brand">Agapē</footer>
      <a className="invitee-back" href={sitePath("/")}>
        Plan your celebration
      </a>
    </main>
  );
}

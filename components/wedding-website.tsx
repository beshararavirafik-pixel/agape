"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import {
  normalizeDesign,
  weddingStyle,
  type WebsiteSection,
} from "@/lib/wedding-design";
import type { InvitationContent } from "./invitee-view";
import WeddingCover from "./wedding-cover";
export type WeddingWebsiteData = {
  event: {
    partner_one: string;
    partner_two: string;
    date: string;
    venue: string;
  };
  content: InvitationContent;
};
export const websiteDate = (date: string) =>
  date
    ? new Date(`${date}T12:00:00`).toLocaleDateString("en-US", {
        month: "long",
        day: "numeric",
        year: "numeric",
      })
    : "Date to be announced";
export function WebsiteCanvas({ data }: { data: WeddingWebsiteData }) {
  const c = data.content,
    d = normalizeDesign(c.website_design);
  const sections = c.website_sections || [];
  return (
    <div
      className={`wedding-site texture-${d.texture}`}
      style={weddingStyle(d)}
    >
      <header className="wedding-site-nav">
        <a href="#invitation-top">
          {data.event.partner_one.slice(0, 1)} &{" "}
          {data.event.partner_two.slice(0, 1)}
        </a>
        <nav>
          {sections.map((s) => (
            <a key={s.id} href={`#section-${s.id}`}>
              {s.title}
            </a>
          ))}
        </nav>
      </header>
      <WeddingCover
        design={d}
        first={data.event.partner_one}
        second={data.event.partner_two}
        date={websiteDate(data.event.date)}
        action={sections.length ? "Discover our day" : ""}
        href={sections[0] ? `#section-${sections[0].id}` : undefined}
      />
      {sections.map((s) => (
        <WebsiteBlock
          key={s.id}
          section={s}
          content={c}
          venue={data.event.venue}
        />
      ))}
      <footer className="wedding-site-footer">
        <p>With love,</p>
        <h2>
          {data.event.partner_one} & {data.event.partner_two}
        </h2>
        <small>Made with Agapē</small>
      </footer>
    </div>
  );
}
function WebsiteBlock({
  section: s,
  content: c,
  venue,
}: {
  section: WebsiteSection;
  content: InvitationContent;
  venue: string;
}) {
  const safeImage =
    s.image &&
    (/^https:\/\//.test(s.image) ||
      /^data:image\/(jpeg|png|webp);base64,/.test(s.image));
  return (
    <section
      className={`wedding-site-section block-${s.type}`}
      id={`section-${s.id}`}
    >
      <span className="wedding-eyebrow">OUR CELEBRATION</span>
      <h2>{s.title}</h2>
      {safeImage && <img src={s.image} alt={s.title} loading="lazy" />}
      {s.text && <p className="wedding-section-text">{s.text}</p>}
      {s.type === "details" && (
        <div className="wedding-event-grid">
          <article>
            <h3>Ceremony</h3>
            <p>{c.church || "Details to follow"}</p>
            <p>{c.church_time}</p>
          </article>
          <article>
            <h3>Reception</h3>
            <p>{c.reception || venue || "Details to follow"}</p>
            <p>{c.reception_time}</p>
          </article>
          {c.dress && (
            <article>
              <h3>Dress code</h3>
              <p>{c.dress}</p>
            </article>
          )}
          {c.parking && (
            <article>
              <h3>Getting there</h3>
              <p>{c.parking}</p>
            </article>
          )}
        </div>
      )}
    </section>
  );
}
export default function WeddingWebsite({ token }: { token: string }) {
  const [data, setData] = useState<WeddingWebsiteData | null>(null),
    [error, setError] = useState("");
  useEffect(() => {
    let active = true;
    if (!supabase) {
      setError("This website is unavailable.");
      return;
    }
    supabase
      .rpc("read_wedding_website", { website_id: token })
      .then(({ data, error }) => {
        if (active) {
          if (error || !data)
            setError("This wedding website is not published yet.");
          else setData(data);
        }
      });
    return () => {
      active = false;
    };
  }, [token]);
  if (!data)
    return (
      <main className="invitee-page">
        <div className="brand">Agapē</div>
        <p role={error ? "alert" : "status"}>
          {error || "Opening the celebration…"}
        </p>
      </main>
    );
  return (
    <main className="public-wedding-site">
      <WebsiteCanvas data={data} />
    </main>
  );
}

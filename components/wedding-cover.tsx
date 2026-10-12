"use client";
import { ArrowUpRight } from "lucide-react";
import { sitePath } from "@/lib/site-path";
import {
  normalizeDesign,
  type WeddingDesign,
  weddingStyle,
} from "@/lib/wedding-design";
export default function WeddingCover({
  design,
  first,
  second,
  date,
  action = "Join our celebration",
  href = "#your-rsvp",
}: {
  design?: Partial<WeddingDesign>;
  first: string;
  second: string;
  date: string;
  action?: string;
  href?: string;
}) {
  const d = normalizeDesign(design);
  return (
    <section
      className={`wedding-cover texture-${d.texture} shape-${d.shape} font-${d.font} ${d.photoOpacity > 0 ? "has-photo" : ""}`}
      style={weddingStyle(d)}
      id="invitation-top"
    >
      {d.photoOpacity > 0 && (
        <>
          <img
            className="wedding-cover-photo"
            src={d.photo || sitePath("/images/reception.jpg")}
            alt="Wedding celebration"
            style={{ opacity: d.photoOpacity / 100 }}
          />
          <div className="wedding-cover-shade" />
        </>
      )}
      {d.motif === "frame" && <div className="wedding-cover-frame" />}
      {d.motif === "botanical" && (
        <svg
          className="wedding-ornament botanical"
          viewBox="0 0 100 160"
          aria-hidden="true"
        >
          <path
            d="M50 145 Q25 75 55 15 M43 110 Q7 110 23 77 Q41 76 43 110 M39 79 Q68 79 74 47 Q47 45 39 79 M43 51 Q16 54 22 22 Q42 25 43 51 M48 126 Q82 126 80 97 Q56 94 48 126"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.3"
          />
        </svg>
      )}
      {d.motif === "stars" && (
        <div className="wedding-ornament stars" aria-hidden="true">
          ✦<span>✧</span>✦
        </div>
      )}
      <div className="wedding-cover-content">
        <p className="wedding-eyebrow">{d.overline}</p>
        <h1>
          <span>{first}</span>
          <em>&</em>
          <span>{second}</span>
        </h1>
        <p className="wedding-cover-message">{d.message}</p>
        <p className="wedding-eyebrow">{date}</p>
        {action && (
          <a className="wedding-cover-action" href={href}>
            {action}
            <ArrowUpRight size={16} />
          </a>
        )}
      </div>
    </section>
  );
}

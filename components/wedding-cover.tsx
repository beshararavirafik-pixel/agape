"use client";
import type { FocusEvent } from "react";
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
  editable = false,
  onTextEdit,
}: {
  design?: Partial<WeddingDesign>;
  first: string;
  second: string;
  date: string;
  action?: string;
  href?: string;
  editable?: boolean;
  onTextEdit?: (
    field: "overline" | "message" | "buttonLabel",
    value: string,
  ) => void;
}) {
  const d = normalizeDesign(design);
  const inlineText = (field: "overline" | "message" | "buttonLabel") => ({
    contentEditable: editable,
    suppressContentEditableWarning: true,
    "data-inline-edit": editable ? field : undefined,
    onBlur: (event: FocusEvent<HTMLElement>) =>
      onTextEdit?.(field, event.currentTarget.innerText),
  });
  return (
    <section
      className={`wedding-cover texture-${d.texture} shape-${d.shape} font-${d.font} layout-${d.layout} spacing-${d.spacing} ${d.photoOpacity > 0 ? "has-photo" : ""}`}
      style={weddingStyle(d)}
      id="invitation-top"
      data-edit-item="color:paper"
    >
      {d.photoOpacity > 0 && (
        <>
          <img
            className="wedding-cover-photo"
            data-edit-item="photo"
            src={d.photo || sitePath("/images/reception.jpg")}
            alt="Wedding celebration"
            style={{
              opacity: d.photoOpacity / 100,
              objectPosition: d.photoFocus,
              filter:
                d.photoFinish === "monochrome"
                  ? "grayscale(1)"
                  : d.photoFinish === "warm"
                    ? "sepia(.35) saturate(.8)"
                    : undefined,
            }}
          />
          <div className="wedding-cover-shade" />
        </>
      )}
      {d.motif === "frame" && (
        <div className="wedding-cover-frame" data-edit-item="decoration" />
      )}
      {d.motif === "botanical" && (
        <svg
          className="wedding-ornament botanical"
          data-edit-item="decoration"
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
        <div
          className="wedding-ornament stars"
          data-edit-item="decoration"
          aria-hidden="true"
        >
          ✦<span>✧</span>✦
        </div>
      )}
      {d.motif === "hearts" && (
        <svg
          className="wedding-ornament hearts"
          data-edit-item="decoration"
          viewBox="0 0 80 80"
          aria-hidden="true"
        >
          <path
            d="M40 62 C-4 35 18 6 40 27 C62 6 84 35 40 62Z"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.4"
          />
        </svg>
      )}
      {d.motif === "monogram" && (
        <div
          className="wedding-ornament wedding-seal"
          data-edit-item="decoration"
          aria-hidden="true"
        >
          {first.slice(0, 1)}
          <i>&</i>
          {second.slice(0, 1)}
        </div>
      )}
      <div className="wedding-cover-content">
        <p
          className="wedding-eyebrow"
          data-edit-item="opening"
          {...inlineText("overline")}
        >
          {d.overline}
        </p>
        <h1 data-edit-item="names">
          <span>{first}</span>
          <em>&</em>
          <span>{second}</span>
        </h1>
        <p
          className="wedding-cover-message"
          data-edit-item="message"
          {...inlineText("message")}
        >
          {d.message}
        </p>
        <p className="wedding-eyebrow" data-edit-item="date">
          {date}
        </p>
        {action && (
          <a
            className="wedding-cover-action"
            data-edit-item="button"
            href={href}
          >
            <span {...inlineText("buttonLabel")}>
              {d.buttonLabel || action}
            </span>
            <ArrowUpRight size={16} />
          </a>
        )}
      </div>
    </section>
  );
}

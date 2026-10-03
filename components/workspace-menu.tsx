"use client";
import { useEffect, useRef } from "react";
import { lockBodyScroll } from "@/lib/scroll-lock";
import { State } from "@/lib/model";
const groups = [
  [
    "THE CELEBRATION",
    "Overview",
    "Guests & RSVPs",
    "Seating studio",
    "Church Ceremony",
  ],
  [
    "THE DETAILS",
    "Checklist",
    "Budget",
    "Vendors",
    "Design studio",
    "Inspiration",
  ],
  [
    "THE DAY",
    "Planning timeline",
    "Wedding-day timeline",
    "Notes & documents",
    "Event settings",
  ],
];
export default function WorkspaceMenu({
  state,
  page,
  navigate,
  close,
  logout,
  demo,
}: {
  state: State;
  page: string;
  navigate: (p: string) => void;
  close: () => void;
  logout: () => void;
  demo: boolean;
}) {
  const panel = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    panel.current?.querySelector<HTMLButtonElement>("button")?.focus();
    const unlock = lockBodyScroll();
    const trap = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        close();
        return;
      }
      if (e.key !== "Tab") return;
      const elements = Array.from(
          panel.current?.querySelectorAll<HTMLButtonElement>("button") || [],
        ),
        first = elements[0],
        last = elements.at(-1);
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last?.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first?.focus();
      }
    };
    document.addEventListener("keydown", trap);
    return () => {
      document.removeEventListener("keydown", trap);
      unlock();
      previous?.focus();
    };
  }, [close]);
  return (
    <div
      className="workspace-menu"
      ref={panel}
      role="dialog"
      aria-modal="true"
      aria-label="Planning menu"
    >
      <div className="menu-heading">
        <span className="brand">
          Agapē<span className="brand-dot">.</span>
        </span>
        <button aria-label="Close planning menu" onClick={close}>
          Close <span>×</span>
        </button>
      </div>
      <div className="menu-groups">
        {groups.map(([label, ...items], group) => (
          <section key={label}>
            <span className="eyebrow">{label}</span>
            {items.map((name, i) => (
              <button
                className={page === name ? "current" : ""}
                key={name}
                aria-label={name}
                onClick={() => navigate(name)}
              >
                <small>
                  {String(
                    groups
                      .slice(0, group)
                      .reduce((n, g) => n + g.length - 1, 0) +
                      i +
                      1,
                  ).padStart(2, "0")}
                </small>
                <span>{name}</span>
              </button>
            ))}
          </section>
        ))}
      </div>
      <div className="menu-footer">
        <button className="text-button menu-logout" onClick={logout}>
          {demo ? "Sign in" : "Log out"}
        </button>
        <span>
          {state.event.partner_one} & {state.event.partner_two}
        </span>
        <span>
          {state.event.mode === "wedding"
            ? "Wedding planner"
            : "Engagement planner"}
        </span>
      </div>
    </div>
  );
}

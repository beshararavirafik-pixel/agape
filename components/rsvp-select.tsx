"use client";
import { useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Check, ChevronDown } from "lucide-react";
import type { Guest } from "@/lib/model";

const choices = [
  { value: "pending", label: "Pending" },
  { value: "accepted", label: "Accepted" },
  { value: "declined", label: "Declined" },
] as const;

export default function RsvpSelect({
  value,
  label,
  onChange,
}: {
  value: Guest["rsvp"];
  label: string;
  onChange: (value: Guest["rsvp"]) => void;
}) {
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState({ left: 0, top: 0 });
  const trigger = useRef<HTMLButtonElement>(null);
  const menu = useRef<HTMLDivElement>(null);
  const id = useId();
  function choose(next: Guest["rsvp"]) {
    onChange(next);
    setOpen(false);
    trigger.current?.focus();
  }
  useLayoutEffect(() => {
    if (!open || !trigger.current) return;
    const box = trigger.current.getBoundingClientRect();
    const width = Math.min(172, window.innerWidth - 24);
    const height = menu.current?.offsetHeight || 138;
    setPosition({
      left: Math.max(12, Math.min(box.left, window.innerWidth - width - 12)),
      top: Math.max(
        12,
        box.bottom + height + 8 <= window.innerHeight
          ? box.bottom + 6
          : box.top - height - 6,
      ),
    });
    menu.current?.querySelector<HTMLElement>('[aria-selected="true"]')?.focus();
  }, [open]);
  useEffect(() => {
    if (!open) return;
    const outside = (event: PointerEvent) => {
      const target = event.target as Node;
      if (!trigger.current?.contains(target) && !menu.current?.contains(target))
        setOpen(false);
    };
    const close = () => setOpen(false);
    const scroll = (event: Event) => {
      if (!menu.current?.contains(event.target as Node)) close();
    };
    document.addEventListener("pointerdown", outside);
    document.addEventListener("scroll", scroll, true);
    window.addEventListener("resize", close);
    return () => {
      document.removeEventListener("pointerdown", outside);
      document.removeEventListener("scroll", scroll, true);
      window.removeEventListener("resize", close);
    };
  }, [open]);
  return (
    <>
      <button
        ref={trigger}
        type="button"
        className={`rsvp-select rsvp-trigger ${value}`}
        aria-label={label}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? id : undefined}
        onClick={() => setOpen(!open)}
        onKeyDown={(event) => {
          if (event.key === "ArrowDown" || event.key === "ArrowUp") {
            event.preventDefault();
            setOpen(true);
          }
        }}
      >
        <span className="rsvp-dot" aria-hidden="true" />
        {choices.find((choice) => choice.value === value)?.label}
        <ChevronDown size={12} aria-hidden="true" />
      </button>
      {open &&
        createPortal(
          <div
            ref={menu}
            id={id}
            role="listbox"
            aria-label={label}
            className="rsvp-menu"
            style={position}
            onKeyDown={(event) => {
              const options = Array.from(
                menu.current?.querySelectorAll<HTMLButtonElement>(
                  '[role="option"]',
                ) || [],
              );
              const index = options.indexOf(
                document.activeElement as HTMLButtonElement,
              );
              if (["ArrowDown", "ArrowUp", "Home", "End"].includes(event.key)) {
                event.preventDefault();
                const next =
                  event.key === "Home"
                    ? 0
                    : event.key === "End"
                      ? 2
                      : (index + (event.key === "ArrowDown" ? 1 : 2)) % 3;
                options[next]?.focus();
              } else if (event.key === "Escape") {
                event.preventDefault();
                setOpen(false);
                trigger.current?.focus();
              } else if (event.key === "Tab") {
                setOpen(false);
                trigger.current?.focus();
              }
            }}
          >
            {choices.map((choice) => (
              <button
                key={choice.value}
                type="button"
                role="option"
                tabIndex={-1}
                aria-selected={choice.value === value}
                className={choice.value}
                onClick={() => choose(choice.value)}
              >
                <span className="rsvp-dot" aria-hidden="true" />
                <span>{choice.label}</span>
                {choice.value === value && (
                  <Check size={14} aria-hidden="true" />
                )}
              </button>
            ))}
          </div>,
          document.body,
        )}
    </>
  );
}

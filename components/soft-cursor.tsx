"use client";
import { useEffect, useRef } from "react";

export default function SoftCursor() {
  const pointer = useRef<HTMLDivElement>(null);
  const attachment = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const node = pointer.current;
    const attached = attachment.current;
    if (!node || !attached) return;
    const media = window.matchMedia("(hover: hover) and (pointer: fine)");
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    let migration: Animation | undefined;
    let frame = 0;
    let x = 0;
    let y = 0;
    let visible = false;
    let activeControl: HTMLElement | null = null;
    const hide = () => {
      visible = false;
      activeControl?.removeAttribute("data-pointer-active");
      activeControl = null;
      migration?.cancel();
      attached.style.opacity = "0";
      cancelAnimationFrame(frame);
      frame = 0;
      node.style.opacity = "0";
    };
    const draw = () => {
      frame = 0;
      if (!media.matches || !visible) return;
      const element = document.elementFromPoint(x, y);
      const editing = element?.closest(
        'textarea, input:not([type="checkbox"]):not([type="radio"]):not([type="range"]), [contenteditable="true"]',
      );
      const control = element?.closest<HTMLElement>(
        'button:not(:disabled), a[href], summary, select, [role="button"], input[type="checkbox"], input[type="radio"]',
      );
      const integrated = !editing && control?.dataset.cursor === "integrate";
      const nextControl = integrated ? (control ?? null) : null;
      if (nextControl !== activeControl) {
        activeControl?.removeAttribute("data-pointer-active");
        activeControl = nextControl;
        attached.style.transition =
          migration?.playState === "running" && !activeControl
            ? "none"
            : "opacity 120ms ease";
        migration?.cancel();
        if (activeControl) {
          const box = activeControl.getBoundingClientRect();
          const radius = getComputedStyle(activeControl).borderRadius;
          activeControl.setAttribute("data-pointer-active", "true");
          attached.style.left = `${box.left}px`;
          attached.style.top = `${box.top}px`;
          attached.style.width = `${box.width}px`;
          attached.style.height = `${box.height}px`;
          attached.style.borderRadius = radius;
          attached.style.opacity = "1";
          if (!reducedMotion.matches) {
            migration = attached.animate(
              [
                {
                  transform: `translate(${x - box.left - box.width / 2}px, ${y - box.top - box.height / 2}px) scale(${12 / box.width}, ${12 / box.height})`,
                  opacity: 0.35,
                },
                { transform: "translate(0, 0) scale(1, 1)", opacity: 1 },
              ],
              { duration: 220, easing: "cubic-bezier(0.16, 1, 0.3, 1)" },
            );
          }
        } else {
          attached.style.opacity = "0";
        }
      }
      if (activeControl) {
        const box = activeControl.getBoundingClientRect();
        attached.style.left = `${box.left}px`;
        attached.style.top = `${box.top}px`;
        attached.style.width = `${box.width}px`;
        attached.style.height = `${box.height}px`;
      }
      // A separate compositor layer attaches to the control without moving it.
      node.dataset.integrated = String(Boolean(integrated));
      node.dataset.text = String(Boolean(editing));
      node.style.width = editing ? "2px" : "16px";
      node.style.height = editing ? "20px" : "21px";
      node.style.borderRadius = editing ? "1px" : "4px";
      node.style.transform = `translate3d(${editing ? x - 1 : x - 2}px, ${editing ? y - 10 : y - 2}px, 0)`;
      node.style.opacity = integrated ? "0" : "1";
    };
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(draw);
    };
    const move = (event: PointerEvent) => {
      if (event.pointerType !== "mouse") {
        hide();
        return;
      }
      x = event.clientX;
      y = event.clientY;
      visible = true;
      schedule();
    };
    const sync = () => {
      document.documentElement.classList.toggle(
        "soft-pointer-enabled",
        media.matches,
      );
      if (!media.matches) hide();
    };
    sync();
    media.addEventListener("change", sync);
    document.addEventListener("pointermove", move, { passive: true });
    document.addEventListener("pointerleave", hide);
    document.addEventListener("scroll", schedule, {
      passive: true,
      capture: true,
    });
    window.addEventListener("blur", hide);
    window.addEventListener("resize", hide);
    return () => {
      hide();
      document.documentElement.classList.remove("soft-pointer-enabled");
      media.removeEventListener("change", sync);
      document.removeEventListener("pointermove", move);
      document.removeEventListener("pointerleave", hide);
      document.removeEventListener("scroll", schedule, true);
      window.removeEventListener("blur", hide);
      window.removeEventListener("resize", hide);
    };
  }, []);
  return (
    <>
      <div className="soft-pointer" ref={pointer} aria-hidden="true">
        <span className="soft-pointer-shape">
          <span className="soft-pointer-glass" />
          <svg
            className="soft-pointer-arrow"
            width="16"
            height="21"
            viewBox="0 0 26 32"
            aria-hidden="true"
          >
            <path
              d="M4 6C4 3.1 6.2 2.6 8 4.2L20 14.8C22.1 16.6 21.6 18.5 18.9 18.7L14.3 19L17.4 25.3C18.1 26.8 17.5 28.2 16 28.8C14.5 29.4 13.2 28.7 12.5 27.4L9.4 21.2L7.4 23.6C5.7 25.6 4 24.8 4 22.2Z"
              fill="rgba(36,42,48,0.18)"
              stroke="white"
              strokeWidth="1.6"
              strokeLinejoin="round"
              strokeLinecap="round"
            />
          </svg>
        </span>
      </div>
      <div
        className="soft-pointer-attachment"
        ref={attachment}
        aria-hidden="true"
      />
    </>
  );
}

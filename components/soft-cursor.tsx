"use client";
import { useEffect, useRef } from "react";

export default function SoftCursor() {
  const pointer = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const node = pointer.current;
    if (!node) return;
    const media = window.matchMedia("(hover: hover) and (pointer: fine)");
    let frame = 0;
    let x = 0;
    let y = 0;
    let visible = false;
    let activeControl: HTMLElement | null = null;
    const hide = () => {
      visible = false;
      activeControl?.removeAttribute("data-pointer-active");
      activeControl = null;
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
      const nextControl = integrated ? control ?? null : null;
      if (nextControl !== activeControl) {
        activeControl?.removeAttribute("data-pointer-active");
        activeControl = nextControl;
        activeControl?.setAttribute("data-pointer-active", "true");
      }
      // The control owns its highlight. Fade the pointer at its real location
      // instead of stretching a moving overlay across the page.
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
    window.addEventListener("resize", schedule);
    return () => {
      hide();
      document.documentElement.classList.remove("soft-pointer-enabled");
      media.removeEventListener("change", sync);
      document.removeEventListener("pointermove", move);
      document.removeEventListener("pointerleave", hide);
      document.removeEventListener("scroll", schedule, true);
      window.removeEventListener("blur", hide);
      window.removeEventListener("resize", schedule);
    };
  }, []);
  return (
    <div className="soft-pointer" ref={pointer} aria-hidden="true">
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
    </div>
  );
}

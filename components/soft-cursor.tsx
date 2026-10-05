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
    const hide = () => {
      visible = false;
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
      const box = control?.getBoundingClientRect();
      // Reserve the morph for small controls; keep the arrow on larger surfaces.
      const magnet =
        box &&
        box.width <= 120 &&
        box.height <= 48 &&
        !control?.matches('select, a[href], [role="button"]') &&
        !control?.closest("svg");
      const width = editing ? 2 : magnet ? box.width : 16;
      const height = editing ? 20 : magnet ? box.height : 21;
      const left = editing ? x - 1 : magnet ? box.left : x - 2;
      const top = editing ? y - 10 : magnet ? box.top : y - 2;
      const radius = editing
        ? "1px"
        : magnet
          ? getComputedStyle(control!).borderRadius
          : "4px";
      node.dataset.control = String(!editing && Boolean(magnet));
      node.dataset.text = String(Boolean(editing));
      node.style.width = `${width}px`;
      node.style.height = `${height}px`;
      node.style.borderRadius = radius;
      node.style.transform = `translate3d(${left}px, ${top}px, 0)`;
      node.style.opacity = "1";
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
    return () => {
      cancelAnimationFrame(frame);
      document.documentElement.classList.remove("soft-pointer-enabled");
      media.removeEventListener("change", sync);
      document.removeEventListener("pointermove", move);
      document.removeEventListener("pointerleave", hide);
      document.removeEventListener("scroll", schedule, true);
      window.removeEventListener("blur", hide);
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

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
      if (editing) {
        node.style.opacity = "0";
        return;
      }
      const control = element?.closest<HTMLElement>(
        'button:not(:disabled), a[href], summary, select, [role="button"], input[type="checkbox"], input[type="radio"]',
      );
      const box = control?.getBoundingClientRect();
      const magnet =
        box &&
        box.width <= 600 &&
        box.height <= 140 &&
        !control?.closest("svg");
      const width = magnet ? box.width + 8 : 16;
      const height = magnet ? box.height + 8 : 16;
      const left = magnet ? box.left - 4 : x - 8;
      const top = magnet ? box.top - 4 : y - 8;
      const radius = magnet
        ? Math.max(
            12,
            parseFloat(getComputedStyle(control!).borderRadius) || 12,
          )
        : 50;
      node.dataset.control = String(Boolean(magnet));
      node.style.width = `${width}px`;
      node.style.height = `${height}px`;
      node.style.borderRadius = `${radius}px`;
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
  return <div className="soft-pointer" ref={pointer} aria-hidden="true" />;
}

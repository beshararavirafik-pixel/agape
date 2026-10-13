"use client";

import { useEffect, useRef } from "react";

const textTargets =
  'input:not([type]), input[type="text"], input[type="search"], input[type="email"], input[type="password"], input[type="tel"], input[type="url"], input[type="number"], textarea, [contenteditable="true"], [role="textbox"]';
const interactiveTargets =
  'a, button, [role="button"], [role="option"], [role="menuitem"], [role="tab"], select, summary, label, input[type="checkbox"], input[type="radio"]';
const arrowWidth = 38;
const arrowHeight = 46;
const hoverPadding = 4;

export default function ThreeDCursor() {
  const cursorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const cursor = cursorRef.current;
    if (!cursor || !window.matchMedia("(pointer: fine)").matches) return;

    const root = document.documentElement;
    root.classList.add("agape-3d-cursor");

    const setArrowPosition = (x: number, y: number) => {
      cursor.style.left = `${x - arrowWidth / 2}px`;
      cursor.style.top = `${y - 1}px`;
      cursor.style.width = `${arrowWidth}px`;
      cursor.style.height = `${arrowHeight}px`;
      cursor.style.borderRadius = "50%";
      cursor.dataset.morph = "arrow";
    };

    const resetTarget = (x: number, y: number, hidden: boolean) => {
      cursor.dataset.hidden = String(hidden);
      cursor.dataset.interactive = "false";
      cursor.dataset.morph = "arrow";
      setArrowPosition(x, y);
    };

    const positionOnTarget = (target: Element, x: number, y: number) => {
      const rect = target.getBoundingClientRect();
      const isCompactTarget = rect.width <= 220 && rect.height <= 72;

      cursor.dataset.hidden = "false";
      cursor.dataset.interactive = "true";

      if (!isCompactTarget) {
        cursor.dataset.morph = "dot";
        cursor.style.left = `${x - 22}px`;
        cursor.style.top = `${y - 22}px`;
        cursor.style.width = "44px";
        cursor.style.height = "44px";
        cursor.style.borderRadius = "50%";
        return;
      }

      const styles = window.getComputedStyle(target);
      const targetRadius = Number.parseFloat(styles.borderTopLeftRadius) || 0;
      const width = rect.width + hoverPadding * 2;
      const height = rect.height + hoverPadding * 2;
      const radius = Math.min(
        targetRadius + hoverPadding,
        width / 2,
        height / 2,
      );

      cursor.dataset.morph = "shape";
      cursor.style.left = `${rect.left - hoverPadding}px`;
      cursor.style.top = `${rect.top - hoverPadding}px`;
      cursor.style.width = `${width}px`;
      cursor.style.height = `${height}px`;
      cursor.style.borderRadius = `${radius}px`;
    };

    const update = (event: PointerEvent) => {
      if (event.pointerType === "touch") return;
      const target = event.target instanceof Element ? event.target : null;
      if (!target) {
        resetTarget(event.clientX, event.clientY, true);
        return;
      }

      if (target.closest(textTargets)) {
        resetTarget(event.clientX, event.clientY, true);
        return;
      }

      const interactive = target.closest(interactiveTargets);
      if (interactive) {
        positionOnTarget(interactive, event.clientX, event.clientY);
      } else {
        resetTarget(event.clientX, event.clientY, false);
      }
    };

    const press = (event: PointerEvent) => {
      if (event.pointerType !== "touch") cursor.dataset.pressed = "true";
    };
    const release = () => {
      cursor.dataset.pressed = "false";
    };
    const leave = () => {
      cursor.dataset.hidden = "true";
    };

    window.addEventListener("pointermove", update, { passive: true });
    window.addEventListener("pointerdown", press, { passive: true });
    window.addEventListener("pointerup", release, { passive: true });
    window.addEventListener("pointercancel", release, { passive: true });
    document.documentElement.addEventListener("pointerleave", leave);

    return () => {
      root.classList.remove("agape-3d-cursor");
      window.removeEventListener("pointermove", update);
      window.removeEventListener("pointerdown", press);
      window.removeEventListener("pointerup", release);
      window.removeEventListener("pointercancel", release);
      document.documentElement.removeEventListener("pointerleave", leave);
    };
  }, []);

  return (
    <div
      ref={cursorRef}
      className="three-d-cursor"
      data-hidden="true"
      data-interactive="false"
      data-morph="arrow"
      data-pressed="false"
      aria-hidden="true"
    >
      <svg viewBox="0 0 40 48" focusable="false">
        <defs>
          <linearGradient id="cursor-chrome" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#f9fcff" />
            <stop offset="0.16" stopColor="#7690a8" />
            <stop offset="0.3" stopColor="#fff" />
            <stop offset="0.46" stopColor="#43556a" />
            <stop offset="0.62" stopColor="#edf4fa" />
            <stop offset="0.8" stopColor="#8095a8" />
            <stop offset="1" stopColor="#fff" />
          </linearGradient>
          <linearGradient id="cursor-pearl" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#fff" />
            <stop offset="0.42" stopColor="#f7f7f5" />
            <stop offset="0.7" stopColor="#f7e8df" />
            <stop offset="1" stopColor="#dfe9f1" />
          </linearGradient>
          <linearGradient id="cursor-wing" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#31465b" />
            <stop offset="0.28" stopColor="#f4f7fa" />
            <stop offset="0.5" stopColor="#718ba2" />
            <stop offset="0.74" stopColor="#fff" />
            <stop offset="1" stopColor="#3a5268" />
          </linearGradient>
          <filter
            id="cursor-shadow"
            x="-50%"
            y="-40%"
            width="200%"
            height="210%"
          >
            <feGaussianBlur stdDeviation="1.4" />
          </filter>
        </defs>
        <path
          d="M19.2 3.4 3.8 35.6c-1.6 3.3 1.3 6.4 4.5 4.7l11.2-6.2 12 6.3c3.1 1.6 6.1-1.5 4.5-4.8L21.4 3.4c-.5-1.1-1.7-1.1-2.2 0Z"
          transform="translate(1 1.6)"
          fill="#313b46"
          opacity=".28"
          filter="url(#cursor-shadow)"
        />
        <path
          d="M19.2 3.4 3.8 35.6c-1.6 3.3 1.3 6.4 4.5 4.7l11.2-6.2 12 6.3c3.1 1.6 6.1-1.5 4.5-4.8L21.4 3.4c-.5-1.1-1.7-1.1-2.2 0Z"
          fill="url(#cursor-pearl)"
          stroke="url(#cursor-chrome)"
          strokeWidth="3"
          strokeLinejoin="round"
        />
        <path d="M20.1 5 5.8 35.3l13.9-7.8Z" fill="#fff" opacity=".8" />
        <path d="m20.1 5-.4 22.5 13.4 7.2Z" fill="#d9e6ef" opacity=".72" />
        <path d="m5.8 35.3 2.4 3.4 11.2-6.2.3-4.9Z" fill="url(#cursor-wing)" />
        <path
          d="m19.7 27.6-.3 4.9 12 6.3 1.7-2.7Z"
          fill="url(#cursor-chrome)"
        />
        <path
          d="m8.2 37.4 10-5.6 1.3 1.2-11.2 6.2c-1.9 1-3.8.2-4.6-1.2Z"
          fill="#94aabd"
          opacity=".75"
        />
      </svg>
      <span className="three-d-cursor-surface" />
    </div>
  );
}

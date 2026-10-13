"use client";

import { useEffect, useRef } from "react";

const textTargets =
  'input:not([type]), input[type="text"], input[type="search"], input[type="email"], input[type="password"], input[type="tel"], input[type="url"], input[type="number"], textarea, [contenteditable="true"], [role="textbox"]';
const interactiveTargets =
  'a, button, [role="button"], [role="option"], [role="menuitem"], [role="tab"], select, summary, label, input[type="checkbox"], input[type="radio"]';
const cursorWidth = 18;
const cursorHeight = 24;
const hoverPadding = 4;
const maxMorphWidth = 320;
const maxMorphHeight = 96;
const arrowPath =
  "M1.5 3.1Q1.5 .9 3.2 2.2L17.4 13.3Q19.3 14.8 17 15.3L11.5 16.5Q10.5 16.7 11 17.7L14.1 23.7Q15 25.6 13.1 26.4L12.4 26.7Q10.5 27.5 9.7 25.7L6.9 19.2Q6.4 18.2 5.6 19.1L3.5 21.6Q1.5 23.7 1.5 20.8Z";

export default function ThreeDCursor() {
  const cursorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const cursor = cursorRef.current;
    if (!cursor || !window.matchMedia("(pointer: fine)").matches) return;

    const root = document.documentElement;
    root.classList.add("agape-3d-cursor");

    const position = (x: number, y: number) => {
      cursor.style.left = `${x}px`;
      cursor.style.top = `${y}px`;
      cursor.style.width = `${cursorWidth}px`;
      cursor.style.height = `${cursorHeight}px`;
      cursor.style.borderRadius = "8px";
      cursor.dataset.morph = "arrow";
    };

    const migrateInto = (target: Element, x: number, y: number) => {
      const rect = target.getBoundingClientRect();
      const fits =
        rect.width > 0 &&
        rect.height > 0 &&
        rect.width <= maxMorphWidth &&
        rect.height <= maxMorphHeight;

      cursor.dataset.interactive = "true";
      if (!fits) {
        cursor.dataset.morph = "dot";
        cursor.style.left = `${x - 18}px`;
        cursor.style.top = `${y - 18}px`;
        cursor.style.width = "36px";
        cursor.style.height = "36px";
        cursor.style.borderRadius = "50%";
        return;
      }

      const styles = window.getComputedStyle(target);
      const targetRadius = Number.parseFloat(styles.borderTopLeftRadius) || 0;
      const width = rect.width + hoverPadding * 2;
      const height = rect.height + hoverPadding * 2;
      const radius = Math.min(
        Math.max(targetRadius + hoverPadding, Math.min(width, height) * 0.26),
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
      const isTextEntry = Boolean(target?.closest(textTargets));
      cursor.dataset.hidden = String(isTextEntry || !target);
      const interactive = !isTextEntry
        ? target?.closest(interactiveTargets)
        : null;
      if (interactive) migrateInto(interactive, event.clientX, event.clientY);
      else {
        cursor.dataset.interactive = "false";
        position(event.clientX, event.clientY);
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
      <span className="three-d-cursor-glass" />
      <span className="three-d-cursor-surface" />
      <svg viewBox="0 0 20 28" preserveAspectRatio="none" focusable="false">
        <defs>
          <clipPath id="cursor-glass-clip" clipPathUnits="objectBoundingBox">
            <path d={arrowPath} transform="scale(.05 .0357142857)" />
          </clipPath>
          <linearGradient id="cursor-edge" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#fff" stopOpacity="0.94" />
            <stop offset="0.5" stopColor="#e1e6e9" stopOpacity="0.52" />
            <stop offset="1" stopColor="#fff" stopOpacity="0.86" />
          </linearGradient>
          <linearGradient id="cursor-sheen" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#fff" stopOpacity="0.24" />
            <stop offset="0.55" stopColor="#fff" stopOpacity="0.03" />
            <stop offset="1" stopColor="#fff" stopOpacity="0.12" />
          </linearGradient>
        </defs>
        <path
          d={arrowPath}
          fill="none"
          stroke="#20272c"
          strokeOpacity=".34"
          strokeWidth="1.8"
          strokeLinejoin="round"
        />
        <path
          d={arrowPath}
          fill="url(#cursor-sheen)"
          stroke="url(#cursor-edge)"
          strokeWidth=".9"
          strokeLinejoin="round"
          strokeLinecap="round"
        />
      </svg>
    </div>
  );
}

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
      <span className="three-d-cursor-surface" />
      <svg viewBox="0 0 20 28" focusable="false">
        <defs>
          <linearGradient id="cursor-chrome" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#fff" stopOpacity="0.96" />
            <stop offset="0.22" stopColor="#dce6ec" stopOpacity="0.84" />
            <stop offset="0.48" stopColor="#fff" stopOpacity="0.94" />
            <stop offset="0.76" stopColor="#c8d5de" stopOpacity="0.84" />
            <stop offset="1" stopColor="#fff" stopOpacity="0.96" />
          </linearGradient>
          <linearGradient id="cursor-face" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#34434d" stopOpacity="0.92" />
            <stop offset="0.52" stopColor="#202a31" stopOpacity="0.84" />
            <stop offset="1" stopColor="#465660" stopOpacity="0.9" />
          </linearGradient>
          <filter
            id="cursor-shadow"
            x="-50%"
            y="-40%"
            width="200%"
            height="210%"
          >
            <feGaussianBlur stdDeviation="0.65" />
          </filter>
        </defs>
        <path
          d="M1.4 1.4Q1 .5 2 1.2l16 12.6q1.5 1.1-.4 1.6l-7.5 1.8 3.7 7.5q.7 1.5-.8 2.2l-1.6.7q-1.5.7-2.2-.8l-3.7-7.8-3.1 3.4q-1.4 1.5-1.4-.6Z"
          transform="translate(.45 .8)"
          fill="#687c8b"
          opacity=".16"
          filter="url(#cursor-shadow)"
        />
        <path
          d="M1.4 1.4Q1 .5 2 1.2l16 12.6q1.5 1.1-.4 1.6l-7.5 1.8 3.7 7.5q.7 1.5-.8 2.2l-1.6.7q-1.5.7-2.2-.8l-3.7-7.8-3.1 3.4q-1.4 1.5-1.4-.6Z"
          fill="url(#cursor-face)"
          stroke="url(#cursor-chrome)"
          strokeWidth="1.05"
          strokeLinejoin="round"
          strokeLinecap="round"
        />
        <path
          d="M2.7 3.1 2.6 18.4l3-3.1 3.1-.8Z"
          fill="url(#cursor-face)"
          opacity=".82"
        />
        <path
          d="m5.9 15.4 3.5 7.4 1.8-.8-3.3-7.1Z"
          fill="url(#cursor-chrome)"
          opacity=".9"
        />
        <path
          d="m3.2 2.9 12.9 10.2"
          fill="none"
          stroke="#fff"
          strokeWidth=".65"
          strokeLinecap="round"
          opacity=".7"
        />
        <path d="m10 14.5 5.8.2-5.5 1.2Z" fill="#fff" opacity=".68" />
      </svg>
    </div>
  );
}

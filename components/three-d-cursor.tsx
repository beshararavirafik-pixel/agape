"use client";

import { useEffect, useRef } from "react";

const textTargets =
  'input:not([type]), input[type="text"], input[type="search"], input[type="email"], input[type="password"], input[type="tel"], input[type="url"], input[type="number"], textarea, [contenteditable="true"], [role="textbox"]';
const interactiveTargets =
  'a, button, [role="button"], [role="option"], [role="menuitem"], [role="tab"], select, summary, label, input[type="checkbox"], input[type="radio"]';
const cursorWidth = 18;
const cursorHeight = 24;

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
    };

    const update = (event: PointerEvent) => {
      if (event.pointerType === "touch") return;
      position(event.clientX, event.clientY);

      const target = event.target instanceof Element ? event.target : null;
      const isTextEntry = Boolean(target?.closest(textTargets));
      cursor.dataset.hidden = String(isTextEntry || !target);
      cursor.dataset.interactive = String(
        !isTextEntry && Boolean(target?.closest(interactiveTargets)),
      );
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
      data-pressed="false"
      aria-hidden="true"
    >
      <span className="three-d-cursor-surface" />
      <svg viewBox="0 0 20 28" focusable="false">
        <defs>
          <linearGradient id="cursor-chrome" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#fff" />
            <stop offset="0.18" stopColor="#748ca3" />
            <stop offset="0.34" stopColor="#f9fcff" />
            <stop offset="0.52" stopColor="#405266" />
            <stop offset="0.68" stopColor="#edf4fa" />
            <stop offset="0.84" stopColor="#8296a8" />
            <stop offset="1" stopColor="#fff" />
          </linearGradient>
          <linearGradient id="cursor-face" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#fff" />
            <stop offset="0.52" stopColor="#f7f7f5" />
            <stop offset="1" stopColor="#dfe8ef" />
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
          d="M1 1 1 22.7 5.8 18.1 9.1 26.3 12.5 24.9 9.2 16.7 18.6 16.4Z"
          transform="translate(.7 .9)"
          fill="#1c2024"
          opacity=".3"
          filter="url(#cursor-shadow)"
        />
        <path
          d="M1 1 1 22.7 5.8 18.1 9.1 26.3 12.5 24.9 9.2 16.7 18.6 16.4Z"
          fill="#252a30"
          stroke="#202328"
          strokeWidth="1.5"
          strokeLinejoin="round"
        />
        <path
          d="M2.2 3.1 2.2 19.8 5.8 16.4 8.2 15.3Z"
          fill="url(#cursor-face)"
        />
        <path d="m5.8 16.4 3.3 8.2 2-0.8-3.2-8.1Z" fill="url(#cursor-chrome)" />
        <path d="m10 14.9 6.5 1.2-6.8.2Z" fill="#fff" opacity=".76" />
      </svg>
    </div>
  );
}

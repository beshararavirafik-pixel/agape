"use client";

import { useEffect, useRef } from "react";

const textTargets =
  'input:not([type="button"]):not([type="submit"]):not([type="reset"]):not([type="checkbox"]):not([type="radio"]), textarea, [contenteditable="true"], [role="textbox"]';
const interactiveTargets =
  'a, button, [role="button"], [role="option"], [role="menuitem"], select, summary, label, input[type="checkbox"], input[type="radio"], [tabindex]:not([tabindex="-1"])';

export default function ThreeDCursor() {
  const cursorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const cursor = cursorRef.current;
    const finePointer = window.matchMedia("(pointer: fine)");
    if (!cursor || !finePointer.matches) return;

    const root = document.documentElement;
    root.classList.add("agape-3d-cursor");

    const updateTarget = (target: EventTarget | null) => {
      if (!(target instanceof Element)) return;
      const isTextEntry = Boolean(target.closest(textTargets));
      cursor.dataset.hidden = String(isTextEntry);
      cursor.dataset.interactive = String(
        !isTextEntry && Boolean(target.closest(interactiveTargets)),
      );
    };

    const move = (event: PointerEvent) => {
      if (event.pointerType === "touch") return;
      cursor.style.left = `${event.clientX}px`;
      cursor.style.top = `${event.clientY}px`;
      cursor.dataset.hidden = "false";
      updateTarget(event.target);
    };
    const down = (event: PointerEvent) => {
      if (event.pointerType === "touch") return;
      updateTarget(event.target);
      cursor.dataset.pressed = "true";
    };
    const up = () => {
      cursor.dataset.pressed = "false";
    };
    const leave = () => {
      cursor.dataset.hidden = "true";
    };

    window.addEventListener("pointermove", move, { passive: true });
    window.addEventListener("pointerdown", down, { passive: true });
    window.addEventListener("pointerup", up, { passive: true });
    window.addEventListener("pointercancel", up, { passive: true });
    document.documentElement.addEventListener("pointerleave", leave);

    return () => {
      root.classList.remove("agape-3d-cursor");
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerdown", down);
      window.removeEventListener("pointerup", up);
      window.removeEventListener("pointercancel", up);
      document.documentElement.removeEventListener("pointerleave", leave);
    };
  }, []);

  return (
    <div ref={cursorRef} className="three-d-cursor" aria-hidden="true">
      <svg viewBox="0 0 38 44" focusable="false">
        <defs>
          <linearGradient id="cursor-face" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#fff" />
            <stop offset="0.58" stopColor="#f5f2e9" />
            <stop offset="1" stopColor="#d9d5c9" />
          </linearGradient>
          <linearGradient id="cursor-side" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#aaa79d" />
            <stop offset="1" stopColor="#77766e" />
          </linearGradient>
          <filter
            id="cursor-shadow"
            x="-60%"
            y="-40%"
            width="220%"
            height="220%"
          >
            <feGaussianBlur stdDeviation="1.15" />
          </filter>
        </defs>
        <path
          d="M4 3 4 32 11.5 25.5 17 39 23 36.4 17.3 22.8 29 22.4Z"
          transform="translate(2 2.8)"
          fill="#252620"
          opacity=".32"
          filter="url(#cursor-shadow)"
        />
        <path
          d="M4 3 4 32 11.5 25.5 17 39 23 36.4 17.3 22.8 29 22.4Z"
          transform="translate(1.6 2.1)"
          fill="#77766e"
          stroke="#292a25"
          strokeWidth="2.2"
          strokeLinejoin="round"
        />
        <path
          d="M4 3 4 32 11.5 25.5 17 39 23 36.4 17.3 22.8 29 22.4Z"
          fill="url(#cursor-face)"
          stroke="#292a25"
          strokeWidth="2.1"
          strokeLinejoin="round"
        />
        <path d="m5.5 6.5.1 21.8 5.8-5.1 4.3-1.3Z" fill="#fff" opacity=".72" />
        <path
          d="m12.3 26.3 4.8 10.8 3.3-1.4-4.7-10.9Z"
          fill="url(#cursor-side)"
          opacity=".82"
        />
      </svg>
    </div>
  );
}

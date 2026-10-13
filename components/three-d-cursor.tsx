"use client";

import { useEffect, useRef } from "react";

const textTargets =
  'input:not([type]), input[type="text"], input[type="search"], input[type="email"], input[type="password"], input[type="tel"], input[type="url"], input[type="number"], textarea, [contenteditable="true"], [role="textbox"]';
const searchTargets =
  '.search:has(input:not(:disabled):not([readonly])), input[type="search"]:not(:disabled):not([readonly]), input[aria-label^="Search"]:not(:disabled):not([readonly]), input[placeholder^="Search"]:not(:disabled):not([readonly])';
const interactiveTargets =
  'a, button, [role="button"], [role="option"], [role="menuitem"], [role="tab"], select, summary, label, input[type="checkbox"], input[type="radio"]';
const arrowOnlyTargets = ".brand, .mobile-menu, .workspace-menu";
const cursorWidth = 20;
const cursorHeight = 20;
const hoverPadding = 4;
const maxMorphWidth = 320;
const maxMorphHeight = 96;
const arrowPath =
  "M10 3Q12 .3 14 3L21 13C22.9 15.7 21.8 17.2 19.3 16.65L16.1 15.95Q15 15.7 15 16.9L15 22Q15 24 13 24L11 24Q9 24 9 22L9 16.9Q9 15.7 7.9 15.95L4.7 16.65C2.2 17.2 1.1 15.7 3 13L10 3Z";
// Mirror the shoulders and tail around x=12, then point the arrow northwest.
const arrowTransform = "translate(2 2) rotate(-45) translate(-12 -1.65)";

export default function ThreeDCursor() {
  const cursorRef = useRef<HTMLDivElement>(null);
  const arrowRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const cursor = cursorRef.current;
    if (!cursor || !window.matchMedia("(pointer: fine)").matches) return;

    const root = document.documentElement;
    root.classList.add("agape-3d-cursor");

    const arrow = arrowRef.current;
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    let motionFrame: number | null = null;
    let previousPoint: { x: number; y: number; time: number } | null = null;
    let lastFrameTime = 0;
    let stretchX = 1;
    let stretchY = 1;
    let velocityX = 0;
    let velocityY = 0;
    let targetX = 1;
    let targetY = 1;

    const resetMotion = () => {
      if (motionFrame !== null) window.cancelAnimationFrame(motionFrame);
      motionFrame = null;
      previousPoint = null;
      stretchX = stretchY = targetX = targetY = 1;
      velocityX = velocityY = 0;
      if (arrow) arrow.style.transform = "scale(1, 1)";
    };

    const animateMotion = (now: number) => {
      motionFrame = null;
      if (!arrow || reducedMotion.matches) {
        resetMotion();
        return;
      }
      const dt = Math.min(Math.max((now - lastFrameTime) / 1000, 0.001), 0.032);
      lastFrameTime = now;
      if (!previousPoint || now - previousPoint.time > 60)
        targetX = targetY = 1;
      velocityX += ((targetX - stretchX) * 260 - velocityX * 20) * dt;
      velocityY += ((targetY - stretchY) * 260 - velocityY * 20) * dt;
      stretchX += velocityX * dt;
      stretchY += velocityY * dt;
      arrow.style.transform = `scale(${stretchX.toFixed(4)}, ${stretchY.toFixed(4)})`;
      if (
        targetX === 1 &&
        targetY === 1 &&
        Math.abs(stretchX - 1) + Math.abs(stretchY - 1) < 0.001 &&
        Math.abs(velocityX) + Math.abs(velocityY) < 0.006
      ) {
        resetMotion();
        return;
      }
      motionFrame = window.requestAnimationFrame(animateMotion);
    };

    const moveBubble = (x: number, y: number) => {
      if (!arrow || reducedMotion.matches || !Number.isFinite(x + y)) return;
      const now = performance.now();
      if (previousPoint) {
        const dx = x - previousPoint.x;
        const dy = y - previousPoint.y;
        const distance = Math.hypot(dx, dy);
        if (distance > 0) {
          const strength = Math.min(
            distance / Math.max(now - previousPoint.time, 8) / 2.4,
            1,
          );
          targetX =
            1 +
            strength *
              ((Math.abs(dx) / distance) * 0.12 -
                (Math.abs(dy) / distance) * 0.04);
          targetY =
            1 +
            strength *
              ((Math.abs(dy) / distance) * 0.12 -
                (Math.abs(dx) / distance) * 0.04);
          if (motionFrame === null) {
            lastFrameTime = now;
            motionFrame = window.requestAnimationFrame(animateMotion);
          }
        }
      }
      previousPoint = { x, y, time: now };
    };

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
        cursor.dataset.interactive = "false";
        position(x, y);
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
      const arrowOnly = Boolean(target?.closest(arrowOnlyTargets));
      cursor.dataset.arrowOnly = String(arrowOnly);
      if (target?.closest(searchTargets)) {
        resetMotion();
        cursor.dataset.hidden = "false";
        cursor.dataset.interactive = "false";
        cursor.dataset.morph = "text";
        cursor.style.left = `${event.clientX - 4}px`;
        cursor.style.top = `${event.clientY - 10}px`;
        cursor.style.width = "8px";
        cursor.style.height = "20px";
        cursor.style.borderRadius = "4px";
        return;
      }
      const isTextEntry = Boolean(
        target?.closest(textTargets) ||
        target?.closest(".search")?.querySelector(textTargets),
      );
      cursor.dataset.hidden = String(isTextEntry || !target);
      const interactive =
        !isTextEntry && !arrowOnly ? target?.closest(interactiveTargets) : null;
      if (interactive) {
        resetMotion();
        migrateInto(interactive, event.clientX, event.clientY);
      } else {
        cursor.dataset.interactive = "false";
        position(event.clientX, event.clientY);
        if (isTextEntry) resetMotion();
        else moveBubble(event.clientX, event.clientY);
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
      resetMotion();
    };
    const type = (event: KeyboardEvent) => {
      const active = document.activeElement;
      if (
        active instanceof Element &&
        active.closest(searchTargets) &&
        !event.metaKey &&
        !event.ctrlKey &&
        !event.altKey &&
        (event.key.length === 1 ||
          [
            "Backspace",
            "Delete",
            "ArrowLeft",
            "ArrowRight",
            "Home",
            "End",
          ].includes(event.key))
      )
        cursor.dataset.hidden = "true";
    };

    window.addEventListener("pointermove", update, { passive: true });
    window.addEventListener("pointerdown", press, { passive: true });
    window.addEventListener("pointerup", release, { passive: true });
    window.addEventListener("pointercancel", release, { passive: true });
    document.documentElement.addEventListener("pointerleave", leave);
    window.addEventListener("blur", leave);
    window.addEventListener("keydown", type);

    return () => {
      resetMotion();
      root.classList.remove("agape-3d-cursor");
      window.removeEventListener("pointermove", update);
      window.removeEventListener("pointerdown", press);
      window.removeEventListener("pointerup", release);
      window.removeEventListener("pointercancel", release);
      document.documentElement.removeEventListener("pointerleave", leave);
      window.removeEventListener("blur", leave);
      window.removeEventListener("keydown", type);
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
      data-arrow-only="false"
      aria-hidden="true"
    >
      <span className="three-d-cursor-surface" />
      <span className="three-d-cursor-text" />
      <div ref={arrowRef} className="three-d-cursor-arrow">
        <span className="three-d-cursor-glass" />
        <svg viewBox="0 0 22 22" preserveAspectRatio="none" focusable="false">
          <defs>
            <clipPath id="cursor-glass-clip" clipPathUnits="objectBoundingBox">
              <path
                d={arrowPath}
                transform={`scale(.0454545455) ${arrowTransform}`}
              />
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
          <g transform={arrowTransform}>
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
          </g>
        </svg>
      </div>
    </div>
  );
}

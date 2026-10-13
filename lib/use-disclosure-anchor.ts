"use client";

import { useLayoutEffect, useRef } from "react";

/** Keep a selected disclosure visible while a disclosure above it collapses. */
export function useDisclosureAnchor(opened: string | null) {
  const pending = useRef<{
    id: string;
    header: HTMLElement;
    top: number;
  } | null>(null);

  useLayoutEffect(() => {
    const anchor = pending.current;
    pending.current = null;
    if (!anchor || anchor.id !== opened || !window.requestAnimationFrame)
      return;

    let frame = 0;
    let cancelled = false;
    let settledFrames = 0;
    const start = performance.now();
    const list = anchor.header.closest(".household-list");
    const stop = () => {
      cancelled = true;
      window.cancelAnimationFrame(frame);
      window.removeEventListener("wheel", stop);
      window.removeEventListener("touchstart", stop);
      window.removeEventListener("pointerdown", stop);
      window.removeEventListener("keydown", stop);
    };
    const follow = () => {
      if (cancelled || !anchor.header.isConnected) return stop();
      const change = anchor.header.getBoundingClientRect().top - anchor.top;
      if (Math.abs(change) > 0.5) {
        window.scrollBy({ top: change, behavior: "instant" });
        const top = anchor.header.getBoundingClientRect().top;
        // At the page boundary, let the header settle instead of repeatedly
        // requesting scroll positions the browser cannot reach.
        if (window.scrollY === 0 && top < anchor.top) anchor.top = top;
      }
      const moving = list
        ?.getAnimations?.({ subtree: true })
        .some((animation) => {
          const target = (animation.effect as KeyframeEffect | null)?.target;
          return (
            target instanceof Element &&
            target.classList.contains("family-expansion") &&
            (animation.playState === "running" || animation.pending)
          );
        });
      // Follow the actual CSS transition, even when a busy frame delays its start.
      const elapsed = performance.now() - start;
      settledFrames =
        moving || elapsed < 150 || Math.abs(change) > 0.5
          ? 0
          : settledFrames + 1;
      if (elapsed < 2000 && settledFrames < 2) {
        frame = window.requestAnimationFrame(follow);
      } else stop();
    };
    window.addEventListener("wheel", stop, { passive: true });
    window.addEventListener("touchstart", stop, { passive: true });
    window.addEventListener("pointerdown", stop, { passive: true });
    window.addEventListener("keydown", stop);
    follow();
    return stop;
  }, [opened]);

  return (id: string, header: HTMLElement) => {
    pending.current = { id, header, top: header.getBoundingClientRect().top };
  };
}

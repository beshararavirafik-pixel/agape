"use client";
import { flushSync } from "react-dom";

let activeTransition: { skipTransition(): void } | undefined;

/** Animate discrete view changes without delaying input or saved data. */
export function fluidChange(update: () => void) {
  if (
    typeof document === "undefined" ||
    !document.startViewTransition ||
    window.matchMedia?.("(prefers-reduced-motion: reduce)").matches
  ) {
    update();
    return;
  }
  activeTransition?.skipTransition();
  const transition = document.startViewTransition(() => flushSync(update));
  activeTransition = transition;
  transition.finished
    .finally(() => {
      if (activeTransition === transition) activeTransition = undefined;
    })
    .catch(() => {});
}

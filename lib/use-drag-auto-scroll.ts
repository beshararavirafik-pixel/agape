import { useEffect } from "react";

export function useDragAutoScroll(active: boolean) {
  useEffect(() => {
    if (!active || typeof window.requestAnimationFrame !== "function") return;
    let frame = 0;
    let y = window.innerHeight / 2;
    let previousTime = performance.now();
    let stopped = false;
    const stop = () => {
      stopped = true;
      cancelAnimationFrame(frame);
    };
    const move = (event: DragEvent) => {
      y = event.clientY;
    };
    const tick = (time: number) => {
      if (stopped) return;
      const edge = Math.min(96, window.innerHeight / 4);
      const direction = y < edge ? -1 : y > window.innerHeight - edge ? 1 : 0;
      const proximity =
        direction < 0
          ? (edge - y) / edge
          : (y - window.innerHeight + edge) / edge;
      const elapsed = Math.min(time - previousTime, 32) / 1000;
      previousTime = time;
      if (direction) {
        const speed = 720 * Math.min(1, Math.max(0, proximity)) ** 2;
        window.scrollBy({
          top: direction * speed * elapsed,
          behavior: "instant",
        });
      }
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    document.addEventListener("dragover", move, { passive: true });
    document.addEventListener("dragend", stop);
    document.addEventListener("drop", stop);
    window.addEventListener("blur", stop);
    return () => {
      stop();
      document.removeEventListener("dragover", move);
      document.removeEventListener("dragend", stop);
      document.removeEventListener("drop", stop);
      window.removeEventListener("blur", stop);
    };
  }, [active]);
}

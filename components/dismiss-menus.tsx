"use client";
import { useEffect } from "react";

export default function DismissMenus() {
  useEffect(() => {
    const menus = () =>
      Array.from(
        document.querySelectorAll<HTMLDetailsElement>(
          "details[data-dismiss-outside][open]",
        ),
      );
    const outside = (event: PointerEvent) => {
      const target = event.target as Node;
      menus().forEach((menu) => {
        if (!menu.contains(target)) menu.open = false;
      });
    };
    const escape = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      const open = menus();
      open.forEach((menu) => {
        menu.open = false;
      });
      open.at(-1)?.querySelector<HTMLElement>("summary")?.focus();
    };
    document.addEventListener("pointerdown", outside);
    document.addEventListener("keydown", escape);
    return () => {
      document.removeEventListener("pointerdown", outside);
      document.removeEventListener("keydown", escape);
    };
  }, []);
  return null;
}

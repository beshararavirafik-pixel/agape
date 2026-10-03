import { Event } from "./model";
export function receptionStyle(event: Event) {
  const palette = event.palette.filter((c) => /^#[0-9a-f]{6}$/i.test(c));
  return {
    linen: palette[0] || "#f6f1e6",
    accent: palette[1] || "#b7a584",
    flower: palette[2] || "#fffaf0",
    greenery: palette[3] || "#798271",
    monogram: [event.partner_one, event.partner_two]
      .map((n) => n.trim()[0]?.toUpperCase() || "")
      .filter(Boolean)
      .join(" & "),
  };
}
export function inkFor(color: string) {
  const hex = color.replace("#", ""),
    r = parseInt(hex.slice(0, 2), 16),
    g = parseInt(hex.slice(2, 4), 16),
    b = parseInt(hex.slice(4, 6), 16);
  return 0.299 * r + 0.587 * g + 0.114 * b > 155 ? "#34332c" : "#faf8f1";
}

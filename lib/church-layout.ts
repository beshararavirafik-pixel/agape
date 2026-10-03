import { uid } from "./model";
export type ChurchPlace = {
  id: string;
  name: string;
  kind: "pew" | "throne";
  x: number;
  y: number;
  width: number;
  depth: number;
  capacity: number;
  rotation?: number;
};
export type ChurchLayout = {
  version: 3;
  width: number;
  depth: number;
  pews: ChurchPlace[];
  seats: Record<string, string>;
  bride: {
    x: number;
    y: number;
    rotation?: number;
    width?: number;
    depth?: number;
  };
  groom: {
    x: number;
    y: number;
    rotation?: number;
    width?: number;
    depth?: number;
  };
  iconY: number;
  iconX: number;
  iconWidth: number;
  altar: {
    x: number;
    y: number;
    width: number;
    depth: number;
    rotation?: number;
  };
};
export function defaultChurchLayout(): ChurchLayout {
  return {
    version: 3,
    width: 70,
    depth: 35,
    iconY: 8,
    iconX: 12,
    iconWidth: 46,
    altar: { x: 32, y: 3, width: 6, depth: 3, rotation: 0 },
    bride: { x: 42, y: 12, rotation: 90 },
    groom: { x: 42, y: 16, rotation: 90 },
    pews: Array.from({ length: 5 }, (_, i) => ({
      id: `pew-${i}`,
      kind: "pew",
      name: `Deacon pew ${i + 1}`,
      x: 23 - i * 5.5,
      y: 16,
      width: 12,
      depth: 2,
      capacity: 6,
      rotation: 90,
    })),
    seats: {},
  };
}
export function readChurchLayout(json?: string): ChurchLayout {
  try {
    const p = JSON.parse(json || "");
    if (
      (p.version === 3 || p.version === 2) &&
      Array.isArray(p.pews) &&
      p.seats
    ) {
      const base = defaultChurchLayout();
      if (p.version === 3) return { ...base, ...p };
      const untouchedThrones = p.pews.filter(
        (x: ChurchPlace) =>
          /^throne-[0-2]$/.test(x.id) &&
          x.name === `Throne ${+x.id.split("-")[1] + 1}` &&
          !Object.keys(p.seats).some((k) => k.startsWith(x.id + ":")),
      );
      return {
        ...base,
        ...p,
        version: 3,
        pews: p.pews.filter((x: ChurchPlace) => !untouchedThrones.includes(x)),
        bride: p.bride?.x === 18 && p.bride?.y === 30 ? base.bride : p.bride,
        groom: p.groom?.x === 22 && p.groom?.y === 30 ? base.groom : p.groom,
      };
    }
  } catch {}
  return defaultChurchLayout();
}
export function assignChurchSeat(
  layout: ChurchLayout,
  person: string,
  key: string,
): ChurchLayout {
  const seats = Object.fromEntries(
    Object.entries(layout.seats).filter(([k, v]) => k !== key && v !== person),
  );
  if (person) seats[key] = person;
  return { ...layout, seats };
}
export function addChurchPlace(
  layout: ChurchLayout,
  kind: "pew" | "throne",
): ChurchLayout {
  const places = layout.pews.filter((p) => p.kind === kind),
    y = places.length ? Math.max(...places.map((p) => p.y + p.depth)) + 2 : 24;
  return {
    ...layout,
    depth: Math.max(layout.depth, y + 5),
    pews: [
      ...layout.pews,
      {
        id: uid(),
        kind,
        name:
          kind === "pew"
            ? `Deacon pew ${places.length + 1}`
            : `Clergy throne ${places.length + 1}`,
        x: kind === "pew" ? 3 : 29,
        y,
        width: kind === "pew" ? 12 : 3,
        depth: kind === "pew" ? 2 : 3,
        capacity: kind === "pew" ? 6 : 1,
        rotation: 0,
      },
    ],
  };
}
export function removeChurchPlace(
  layout: ChurchLayout,
  id: string,
): ChurchLayout {
  return {
    ...layout,
    pews: layout.pews.filter((p) => p.id !== id),
    seats: Object.fromEntries(
      Object.entries(layout.seats).filter(([k]) => !k.startsWith(id + ":")),
    ),
  };
}
export function moveChurchObject(
  layout: ChurchLayout,
  id: string,
  x: number,
  y: number,
): ChurchLayout {
  const snap = (n: number) => Math.round(n * 2) / 2,
    clamp = (n: number, max: number) => Math.max(0, Math.min(snap(n), max));
  if (id === "iconostasis")
    return {
      ...layout,
      iconX: clamp(x, layout.width - layout.iconWidth),
      iconY: clamp(y, layout.depth - 2),
    };
  if (id === "altar")
    return {
      ...layout,
      altar: {
        ...layout.altar,
        x: clamp(x, layout.width - layout.altar.width),
        y: clamp(y, layout.depth - layout.altar.depth),
      },
    };
  if (id === "bride" || id === "groom")
    return {
      ...layout,
      [id]: {
        ...layout[id],
        x: Math.max(
          (layout[id].width || 3) / 2,
          clamp(x, layout.width - (layout[id].width || 3) / 2),
        ),
        y: clamp(y, layout.depth - (layout[id].depth || 3) - 1),
      },
    };
  return {
    ...layout,
    pews: layout.pews.map((p) =>
      p.id === id
        ? {
            ...p,
            x: clamp(x, layout.width - p.width),
            y: clamp(y, layout.depth - p.depth),
          }
        : p,
    ),
  };
}
export function churchObjectPosition(layout: ChurchLayout, id: string) {
  if (id === "iconostasis") return { x: layout.iconX, y: layout.iconY };
  if (id === "altar") return layout.altar;
  if (id === "bride" || id === "groom") return layout[id];
  return layout.pews.find((p) => p.id === id);
}
export function churchObjectSize(layout: ChurchLayout, id: string) {
  if (id === "iconostasis")
    return { width: layout.iconWidth, depth: 1, rotation: 0 };
  if (id === "altar") return layout.altar;
  if (id === "bride" || id === "groom")
    return {
      width: layout[id].width || 3,
      depth: layout[id].depth || 3,
      rotation: layout[id].rotation || 0,
    };
  return layout.pews.find((p) => p.id === id);
}
export function resizeChurchObject(
  layout: ChurchLayout,
  id: string,
  width: number,
  depth: number,
): ChurchLayout {
  const pos = churchObjectPosition(layout, id);
  if (!pos) return layout;
  const size = {
    width: Math.max(
      1,
      Math.min(Math.round(width * 2) / 2, layout.width - pos.x),
    ),
    depth: Math.max(
      1,
      Math.min(Math.round(depth * 2) / 2, layout.depth - pos.y),
    ),
  };
  if (id === "iconostasis")
    return { ...layout, iconWidth: Math.max(4, size.width) };
  if (id === "altar") return { ...layout, altar: { ...layout.altar, ...size } };
  if (id === "bride" || id === "groom")
    return { ...layout, [id]: { ...layout[id], ...size } };
  return {
    ...layout,
    pews: layout.pews.map((p) => (p.id === id ? { ...p, ...size } : p)),
  };
}

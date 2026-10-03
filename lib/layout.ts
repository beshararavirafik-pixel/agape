import { FloorObject } from "./model";
export function dimensions(o: FloorObject) {
  const defaults: Record<string, [number, number]> = {
    round: [6, 6],
    serpentine: [18, 8],
    rectangular: [8, 3],
    square: [4, 4],
    oval: [8, 5],
    sweetheart: [6, 2.5],
    head: [16, 3],
    cocktail: [3, 3],
    "dance floor": [16, 16],
    stage: [16, 8],
    bar: [10, 3],
    buffet: [12, 3],
    "DJ / band": [12, 8],
    "cake table": [4, 3],
    "photo booth": [8, 8],
    entrance: [4, 2],
    exit: [4, 2],
    "décor area": [6, 6],
  };
  const [w, d] = defaults[o.kind] || [6, 4];
  return { width: o.width_ft ?? w, depth: o.depth_ft ?? d };
}
export function chairSize(o: FloorObject, i: number) {
  return (
    o.chair_sizes?.[i] || {
      width: o.chair_width_ft ?? 1.5,
      depth: o.chair_depth_ft ?? 1.5,
    }
  );
}
export function serpentCenter(t: number, width: number, depth: number) {
  return { x: (t - 0.5) * width, y: Math.sin(t * Math.PI * 2) * depth * 0.27 };
}
export function chairPosition(o: FloorObject, i: number) {
  const { width, depth } = dimensions(o),
    cs = chairSize(o, i),
    gap = cs.depth / 2 + 0.45;
  if (["round", "oval", "cocktail"].includes(o.kind)) {
    const a = (2 * Math.PI * i) / o.capacity - Math.PI / 2;
    return {
      x: Math.cos(a) * (width / 2 + gap),
      y: Math.sin(a) * (depth / 2 + gap),
    };
  }
  const n = Math.ceil(o.capacity / 2),
    top = i < n,
    count = top ? n : o.capacity - n,
    t = ((top ? i : i - n) + 0.5) / count;
  if (o.kind === "serpentine") {
    const p = serpentCenter(t, width, depth);
    return { x: p.x, y: p.y + (top ? -1 : 1) * (depth * 0.16 + gap) };
  }
  return { x: (t - 0.5) * width, y: (top ? -1 : 1) * (depth / 2 + gap) };
}

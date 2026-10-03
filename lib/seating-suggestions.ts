import { FloorObject, State, Seat, uid } from "./model";
import { dimensions } from "./layout";
export function suggestSeating(state: State) {
  const eligible = state.guests.filter((g) => g.rsvp !== "declined"),
    parent = new Map(eligible.map((g) => [g.id, g.id]));
  function root(id: string): string {
    const p = parent.get(id)!;
    if (p !== id) {
      const r = root(p);
      parent.set(id, r);
      return r;
    }
    return id;
  }
  function join(a: string, b: string) {
    if (parent.has(a) && parent.has(b)) parent.set(root(a), root(b));
  }
  const homes = new Map<string, string>();
  for (const g of eligible) {
    const key = g.household.trim().toLowerCase();
    if (!key) continue;
    const other = homes.get(key);
    if (other) join(g.id, other);
    else homes.set(key, g.id);
  }
  for (const l of state.family_links || [])
    join(l.guest_id, l.related_guest_id);
  const families = new Map<string, string[]>();
  for (const g of eligible) {
    const id = root(g.id);
    families.set(id, [...(families.get(id) || []), g.id]);
  }
  const seats = [...state.seats],
    assigned = new Set(seats.map((s) => s.guest_id)),
    tables = state.objects.filter((o) => o.capacity > 0),
    newSeats: Seat[] = [],
    splitFamilies: string[] = [];
  const available = new Map(
    tables.map((o) => [
      o.id,
      Array.from({ length: o.capacity }, (_, i) => i).filter(
        (i) => !seats.some((s) => s.table_id === o.id && s.position === i),
      ),
    ]),
  );
  function free(o: FloorObject) {
    return [...available.get(o.id)!];
  }
  const groups = Array.from(families.values()).sort(
    (a, b) => b.length - a.length,
  );
  for (const members of groups) {
    const pending = members.filter((id) => !assigned.has(id));
    if (!pending.length) continue;
    const existing = seats
      .filter((s) => members.includes(s.guest_id))
      .map((s) => s.table_id);
    const candidates = [...tables].sort(
      (a, b) =>
        Number(existing.includes(b.id)) - Number(existing.includes(a.id)) ||
        Number(free(b).length >= pending.length) -
          Number(free(a).length >= pending.length) ||
        free(a).length - free(b).length,
    );
    const fit = candidates.find((o) => free(o).length >= pending.length),
      order = fit ? [fit] : candidates.filter((o) => free(o).length > 0);
    let index = 0;
    for (const o of order) {
      for (const position of free(o)) {
        const guest = pending[index++];
        if (!guest) break;
        const seat = {
          id: uid(),
          event_id: state.event.id,
          guest_id: guest,
          table_id: o.id,
          position,
        };
        seats.push(seat);
        available.set(
          o.id,
          available.get(o.id)!.filter((i) => i !== position),
        );
        newSeats.push(seat);
        assigned.add(guest);
      }
      if (index >= pending.length) break;
    }
    const locations = new Set(
      seats.filter((s) => members.includes(s.guest_id)).map((s) => s.table_id),
    );
    if (locations.size > 1)
      splitFamilies.push(
        state.guests.find((g) => g.id === members[0])?.household ||
          state.guests.find((g) => g.id === members[0])?.name ||
          "Linked guests",
      );
  }
  return {
    seats,
    newSeats,
    remaining: eligible.filter((g) => !assigned.has(g.id)).length,
    splitFamilies,
  };
}
function bounds(o: FloorObject) {
  const { width, depth } = dimensions(o),
    a = (o.rotation * Math.PI) / 180,
    extra = o.capacity ? 2.5 : 1.5;
  return {
    x: o.x / 10,
    y: o.y / 10,
    w:
      Math.abs(Math.cos(a)) * width + Math.abs(Math.sin(a)) * depth + extra * 2,
    d:
      Math.abs(Math.sin(a)) * width + Math.abs(Math.cos(a)) * depth + extra * 2,
  };
}
export function suggestLayout(state: State, capacity = 10) {
  const width = state.event.room_width_ft || 80,
    depth = state.event.room_depth_ft || 60,
    eligible = state.guests.filter((g) => g.rsvp !== "declined").length,
    available = state.objects.reduce((a, o) => a + o.capacity, 0),
    needed = Math.ceil(Math.max(0, eligible - available) / capacity),
    objects = [...state.objects],
    added: FloorObject[] = [];
  if (
    !objects.some((o) => o.kind === "dance floor") &&
    width >= 35 &&
    depth >= 35
  ) {
    const floor = {
      id: uid(),
      event_id: state.event.id,
      name: "Dance floor",
      kind: "dance floor",
      x: width * 5,
      y: depth * 5,
      rotation: 0,
      capacity: 0,
      width_ft: 16,
      depth_ft: 16,
    };
    objects.push(floor);
    added.push(floor);
  }
  const spacing = 12;
  for (
    let y = 6;
    y <= depth - 6 && added.filter((o) => o.capacity).length < needed;
    y += spacing
  )
    for (
      let x = 6;
      x <= width - 6 && added.filter((o) => o.capacity).length < needed;
      x += spacing
    ) {
      const candidate = {
          id: uid(),
          event_id: state.event.id,
          name: `Table ${objects.filter((o) => o.capacity).length + 1}`,
          kind: "round",
          x: x * 10,
          y: y * 10,
          rotation: 0,
          capacity,
          width_ft: 6,
          depth_ft: 6,
        },
        b = bounds(candidate);
      if (
        objects.some((o) => {
          const a = bounds(o);
          return (
            Math.abs(a.x - b.x) < (a.w + b.w) / 2 &&
            Math.abs(a.y - b.y) < (a.d + b.d) / 2
          );
        })
      )
        continue;
      objects.push(candidate);
      added.push(candidate);
    }
  return {
    objects,
    added,
    uncovered: Math.max(
      0,
      eligible - objects.reduce((n, o) => n + o.capacity, 0),
    ),
  };
}
export function nextObjectPosition(state: State, kind: string) {
  const width = state.event.room_width_ft || 80,
    depth = state.event.room_depth_ft || 60;
  for (let y = 6; y < depth - 4; y += 4)
    for (let x = 6; x < width - 4; x += 4) {
      const o = {
          id: "",
          event_id: state.event.id,
          name: "",
          kind,
          x: x * 10,
          y: y * 10,
          rotation: 0,
          capacity: [
            "dance floor",
            "stage",
            "bar",
            "buffet",
            "DJ / band",
            "photo booth",
            "entrance",
            "exit",
            "décor area",
            "cake table",
          ].includes(kind)
            ? 0
            : 8,
        },
        b = bounds(o);
      if (
        b.x - b.w / 2 < 0 ||
        b.y - b.d / 2 < 0 ||
        b.x + b.w / 2 > width ||
        b.y + b.d / 2 > depth
      )
        continue;
      if (
        !state.objects.some((o) => {
          const a = bounds(o);
          return (
            Math.abs(a.x - b.x) < (a.w + b.w) / 2 &&
            Math.abs(a.y - b.y) < (a.d + b.d) / 2
          );
        })
      )
        return { x: o.x, y: o.y };
    }
  return { x: width * 5, y: depth * 5 };
}

/** Rebuild reception seating while preserving bars, stages and other venue fixtures. */
export function generateReceptionLayout(state: State, variant = 0) {
  const count = state.guests.filter((g) => g.rsvp !== "declined").length;
  const width = state.event.room_width_ft || 80,
    depth = state.event.room_depth_ft || 60;
  const styles = [
    {
      title: "Classic garden",
      kinds: ["round"],
      capacity: count > 120 ? 10 : 8,
    },
    {
      title: "Banquet lanes",
      kinds: ["rectangular"],
      capacity: count > 120 ? 12 : 10,
    },
    { title: "Oval salon", kinds: ["oval", "round"], capacity: 10 },
    {
      title: "Serpentine celebration",
      kinds: ["serpentine", "rectangular", "round"],
      capacity: 12,
    },
    { title: "Intimate squares", kinds: ["square", "oval"], capacity: 8 },
    {
      title: "Modern mixed reception",
      kinds: ["rectangular", "oval", "round"],
      capacity: 10,
    },
  ];
  const index = ((variant % styles.length) + styles.length) % styles.length,
    config = styles[index];
  const objects = state.objects.filter(
    (o) => !o.capacity && o.kind !== "dance floor",
  );
  const added: FloorObject[] = [];
  const fits = (o: FloorObject) => {
    const b = bounds(o);
    return (
      b.x - b.w / 2 >= 0 &&
      b.y - b.d / 2 >= 0 &&
      b.x + b.w / 2 <= width &&
      b.y + b.d / 2 <= depth &&
      !objects.some((other) => {
        const a = bounds(other);
        return (
          Math.abs(a.x - b.x) < (a.w + b.w) / 2 &&
          Math.abs(a.y - b.y) < (a.d + b.d) / 2
        );
      })
    );
  };
  const floorSize = count > 150 ? 20 : count > 60 ? 16 : 12;
  const front = index === 1 || index === 4;
  const floor: FloorObject = {
    id: uid(),
    event_id: state.event.id,
    name: "Dance floor",
    kind: "dance floor",
    x: width * 5,
    y: (front ? depth * 0.23 : depth * 0.5) * 10,
    rotation: 0,
    capacity: 0,
    width_ft: floorSize,
    depth_ft: floorSize,
  };
  const floorLocations = [
    [floor.x, floor.y],
    [width * 5, depth * 5],
    [width * 5, depth * 7.5],
  ];
  for (const [x, y] of floorLocations) {
    floor.x = x;
    floor.y = y;
    if (fits(floor)) {
      objects.push(floor);
      added.push(floor);
      break;
    }
  }
  let capacity = 0,
    number = 1;
  while (capacity < count) {
    const kind = config.kinds[(number - 1) % config.kinds.length];
    const seats =
      kind === "serpentine" ? 12 : kind === "square" ? 8 : config.capacity;
    const o: FloorObject = {
      id: uid(),
      event_id: state.event.id,
      name: `Table ${number}`,
      kind,
      x: 0,
      y: 0,
      rotation: kind === "rectangular" ? (index === 1 ? 90 : 0) : 0,
      capacity: seats,
    };
    if (kind === "square") {
      o.width_ft = 5;
      o.depth_ft = 5;
    }
    if (kind === "rectangular") {
      o.width_ft = seats === 12 ? 12 : 10;
      o.depth_ft = 3;
    }
    if (kind === "oval") {
      o.width_ft = 8;
      o.depth_ft = 5;
    }
    const candidates: Array<{ x: number; y: number; score: number }> = [];
    const offset =
      ((Math.floor(variant / styles.length) * 0.61803398875) % 1) * 1.8;
    for (let y = 6 + offset; y < depth - 5; y += 2)
      for (let x = 6 + offset; x < width - 5; x += 2) {
        const dx = x - width / 2,
          dy = y - depth / 2;
        // Each style has a different placement strategy, rather than one repeated grid.
        const score =
          index === 0
            ? Math.abs(Math.hypot(dx, dy) - Math.min(width, depth) * 0.32)
            : index === 1
              ? Math.abs(Math.abs(dx) - width * 0.26) * 3 + y
              : index === 2
                ? Math.abs(Math.abs(dx) - width * 0.29) * 2 + Math.abs(dy)
                : index === 3
                  ? Math.abs(dy - depth * 0.22) * 2 + Math.abs(dx)
                  : index === 4
                    ? Math.abs(y - depth * 0.65) * 2 + Math.abs(dx)
                    : Math.abs(
                        Math.hypot(dx, dy) - Math.min(width, depth) * 0.38,
                      ) +
                      x * 0.03;
        candidates.push({
          x,
          y,
          score: score + (variant % 2 ? dx * 0.025 : -dx * 0.025),
        });
      }
    candidates.sort((a, b) => a.score - b.score);
    const position = candidates.find((p) => {
      o.x = p.x * 10;
      o.y = p.y * 10;
      return fits(o);
    });
    if (!position) break;
    o.x = position.x * 10;
    o.y = position.y * 10;
    objects.push(o);
    added.push(o);
    capacity += o.capacity;
    number++;
  }
  return {
    title: config.title,
    objects,
    added,
    count,
    capacity,
    uncovered: Math.max(0, count - capacity),
  };
}

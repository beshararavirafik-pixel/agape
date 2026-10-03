import { Guest, State, uid } from "./model";
export const relationships = [
  "Mother",
  "Father",
  "Parent",
  "Sibling",
  "Partner",
  "Child",
  "Relative",
  "Friend",
];
export function addFamily(
  state: State,
  guest: Guest,
  relatives: { name: string; relationship: string; existing_id?: string }[],
): State {
  const household = guest.household || `${guest.name} family`;
  const guests = state.guests.some((g) => g.id === guest.id)
    ? state.guests.map((g) => (g.id === guest.id ? { ...guest, household } : g))
    : [...state.guests, { ...guest, household }];
  const links = [...(state.family_links || [])];
  for (const r of relatives.filter((r) => r.name.trim() || r.existing_id)) {
    const existing = r.existing_id
      ? guests.find((g) => g.id === r.existing_id)
      : undefined;
    const id = existing?.id || uid();
    if (
      id === guest.id ||
      links.some((l) => l.guest_id === guest.id && l.related_guest_id === id)
    )
      continue;
    if (!existing)
      guests.push({
        ...guest,
        id,
        name: r.name.trim(),
        household,
        email: "",
        rsvp: "pending",
      });
    links.push({
      id: uid(),
      event_id: state.event.id,
      guest_id: guest.id,
      related_guest_id: id,
      relationship: r.relationship,
    });
  }
  return { ...state, guests, family_links: links };
}
export function invitationFamilies(state: State) {
  const parents = new Map(state.guests.map((g) => [g.id, g.id]));
  function root(id: string): string {
    const p = parents.get(id)!;
    if (p !== id) {
      const r = root(p);
      parents.set(id, r);
      return r;
    }
    return id;
  }
  function join(a: string, b: string) {
    if (parents.has(a) && parents.has(b)) parents.set(root(b), root(a));
  }
  const homes = new Map<string, string>();
  for (const g of state.guests) {
    const key = g.household.trim().toLowerCase();
    if (!key) continue;
    const previous = homes.get(key);
    if (previous) join(previous, g.id);
    else homes.set(key, g.id);
  }
  for (const l of state.family_links || [])
    join(l.guest_id, l.related_guest_id);
  const buckets = new Map<string, Guest[]>();
  for (const g of state.guests) {
    const r = root(g.id);
    buckets.set(r, [...(buckets.get(r) || []), g]);
  }
  return Array.from(buckets.values())
    .map((members) => {
      const ids = new Set(members.map((g) => g.id)),
        links = (state.family_links || []).filter(
          (l) => ids.has(l.guest_id) && ids.has(l.related_guest_id),
        ),
        incoming = new Set(links.map((l) => l.related_guest_id));
      const primary =
        members.find(
          (g) => links.some((l) => l.guest_id === g.id) && !incoming.has(g.id),
        ) ||
        members.find((g) => links.some((l) => l.guest_id === g.id)) ||
        members[0];
      return {
        id: primary.id,
        primary,
        members: [primary, ...members.filter((g) => g.id !== primary.id)],
        title:
          primary.family_name?.trim() ||
          (members.length > 1 ? `${primary.name} & family` : primary.name),
        relationship: (id: string) =>
          id === primary.id
            ? "Primary invitee"
            : links.find(
                (l) => l.guest_id === primary.id && l.related_guest_id === id,
              )?.relationship || "Family member",
      };
    })
    .sort((a, b) => a.primary.name.localeCompare(b.primary.name));
}

/** Move exactly the selected guests into one invitation without changing their seats. */
export function groupGuestsAsFamily(
  state: State,
  ids: string[],
  primaryId: string,
): State {
  const selected = new Set(
    ids.filter((id) => state.guests.some((g) => g.id === id)),
  );
  const primary = state.guests.find((g) => g.id === primaryId);
  if (selected.size < 2 || !primary || !selected.has(primaryId)) return state;
  const others = state.guests.filter((g) => !selected.has(g.id));
  const base = `${primary.name} family`;
  let household = base,
    suffix = 2;
  while (
    others.some(
      (g) => g.household.trim().toLowerCase() === household.toLowerCase(),
    )
  )
    household = `${base} (${suffix++})`;
  const links = state.family_links || [];
  return {
    ...state,
    guests: state.guests.map((g) =>
      selected.has(g.id)
        ? { ...g, household, family_name: primary.family_name || null }
        : g,
    ),
    family_links: [
      ...links.filter(
        (l) => !selected.has(l.guest_id) && !selected.has(l.related_guest_id),
      ),
      ...state.guests
        .filter((g) => selected.has(g.id) && g.id !== primaryId)
        .map((g) => ({
          id: uid(),
          event_id: state.event.id,
          guest_id: primaryId,
          related_guest_id: g.id,
          relationship:
            links.find(
              (l) => l.guest_id === primaryId && l.related_guest_id === g.id,
            )?.relationship || "Relative",
        })),
    ],
  };
}

export function addGuestToFamily(
  state: State,
  primaryId: string,
  guest: Guest,
  relationship: string,
): State {
  const family = invitationFamilies(state).find((f) => f.id === primaryId);
  if (
    !family ||
    family.members.some((g) => g.id === guest.id) ||
    !guest.name.trim()
  )
    return state;
  const existing = state.guests.find((g) => g.id === guest.id);
  const next = existing
    ? state
    : {
        ...state,
        guests: [
          ...state.guests,
          { ...guest, event_id: state.event.id, name: guest.name.trim() },
        ],
      };
  const grouped = groupGuestsAsFamily(
    next,
    [...family.members.map((g) => g.id), guest.id],
    primaryId,
  );
  return {
    ...grouped,
    family_links: grouped.family_links?.map((l) =>
      l.guest_id === primaryId && l.related_guest_id === guest.id
        ? { ...l, relationship }
        : l,
    ),
  };
}

export function renameFamily(
  state: State,
  primaryId: string,
  name: string,
): State {
  const family = invitationFamilies(state).find((f) => f.id === primaryId);
  if (!family || !name.trim()) return state;
  const ids = new Set(family.members.map((g) => g.id));
  return {
    ...state,
    guests: state.guests.map((g) =>
      ids.has(g.id) ? { ...g, family_name: name.trim() } : g,
    ),
  };
}

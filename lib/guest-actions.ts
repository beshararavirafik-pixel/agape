import { State, Guest, Seat, FamilyLink } from "./model";
export type RemovedGuests = {
  guests: Guest[];
  seats: Seat[];
  links: FamilyLink[];
};
export function removeGuests(
  state: State,
  ids: string[],
): { state: State; removed: RemovedGuests } {
  const selected = new Set(ids);
  return {
    state: {
      ...state,
      guests: state.guests.filter((g) => !selected.has(g.id)),
      seats: state.seats.filter((s) => !selected.has(s.guest_id)),
      family_links: (state.family_links || []).filter(
        (l) => !selected.has(l.guest_id) && !selected.has(l.related_guest_id),
      ),
    },
    removed: {
      guests: state.guests.filter((g) => selected.has(g.id)),
      seats: state.seats.filter((s) => selected.has(s.guest_id)),
      links: (state.family_links || []).filter(
        (l) => selected.has(l.guest_id) || selected.has(l.related_guest_id),
      ),
    },
  };
}
export function restoreGuests(state: State, removed: RemovedGuests): State {
  const guests = [
      ...state.guests,
      ...removed.guests.filter((g) => !state.guests.some((a) => a.id === g.id)),
    ],
    ids = new Set(guests.map((g) => g.id));
  const seats = [...state.seats];
  for (const s of removed.seats) {
    const table = state.objects.find((o) => o.id === s.table_id);
    if (
      table &&
      s.position < table.capacity &&
      ids.has(s.guest_id) &&
      guests.find((g) => g.id === s.guest_id)?.rsvp !== "declined" &&
      !seats.some(
        (a) =>
          a.guest_id === s.guest_id ||
          (a.table_id === s.table_id && a.position === s.position),
      )
    )
      seats.push(s);
  }
  return {
    ...state,
    guests,
    seats,
    family_links: [
      ...(state.family_links || []),
      ...removed.links.filter(
        (l) =>
          ids.has(l.guest_id) &&
          ids.has(l.related_guest_id) &&
          !(state.family_links || []).some(
            (a) =>
              a.id === l.id ||
              (a.guest_id === l.guest_id &&
                a.related_guest_id === l.related_guest_id),
          ),
      ),
    ],
  };
}
export function setGuestRsvp(
  state: State,
  ids: string[],
  rsvp: Guest["rsvp"],
): State {
  const selected = new Set(ids);
  return {
    ...state,
    guests: state.guests.map((g) => (selected.has(g.id) ? { ...g, rsvp } : g)),
    seats:
      rsvp === "declined"
        ? state.seats.filter((s) => !selected.has(s.guest_id))
        : state.seats,
  };
}

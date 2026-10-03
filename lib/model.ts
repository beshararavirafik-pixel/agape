import { completeSample } from "./sample-plan";
export type Event = {
  id: string;
  owner_id?: string;
  name: string;
  partner_one: string;
  partner_two: string;
  mode: "wedding" | "engagement";
  date: string;
  venue: string;
  budget: number;
  palette: string[];
  room_width_ft?: number;
  room_depth_ft?: number;
};
export type Guest = {
  id: string;
  event_id: string;
  name: string;
  household: string;
  family_name?: string | null;
  guest_group?: string;
  rsvp: "pending" | "accepted" | "declined";
  meal: string;
  email: string;
};
export type FloorObject = {
  id: string;
  event_id: string;
  name: string;
  kind: string;
  x: number;
  y: number;
  rotation: number;
  capacity: number;
  width_ft?: number;
  depth_ft?: number;
  chair_width_ft?: number;
  chair_depth_ft?: number;
  chair_sizes?: Record<string, { width: number; depth: number }>;
};
export type Seat = {
  id: string;
  event_id: string;
  guest_id: string;
  table_id: string;
  position: number;
};
export type RecordItem = {
  id: string;
  event_id: string;
  kind: string;
  title: string;
  status: string;
  amount: number;
  paid: number;
  date: string;
  notes: string;
  url: string;
  vendor_id: string | null;
  storage_path: string | null;
  details?: Record<string, string>;
  assignee_id?: string | null;
};
export type FamilyLink = {
  id: string;
  event_id: string;
  guest_id: string;
  related_guest_id: string;
  relationship: string;
};
export type State = {
  event: Event;
  guests: Guest[];
  objects: FloorObject[];
  seats: Seat[];
  records: RecordItem[];
  family_links?: FamilyLink[];
};
export const uid = () => crypto.randomUUID();
export const tables = [
  "round",
  "rectangular",
  "square",
  "oval",
  "sweetheart",
  "head",
  "cocktail",
  "serpentine",
];
export const objects = [
  "dance floor",
  "DJ / band",
  "stage",
  "bar",
  "cake table",
  "buffet",
  "photo booth",
  "entrance",
  "exit",
  "décor area",
];
export function assignSeat(
  seats: Seat[],
  eventId: string,
  guestId: string,
  tableId: string,
  position: number,
) {
  return [
    ...seats.filter(
      (s) =>
        s.guest_id !== guestId &&
        !(s.table_id === tableId && s.position === position),
    ),
    {
      id: uid(),
      event_id: eventId,
      guest_id: guestId,
      table_id: tableId,
      position,
    },
  ];
}
export function sample(): State {
  const e = uid();
  const g = [
    "Olivia Bennett",
    "Noah Bennett",
    "Charlotte Lewis",
    "James Lewis",
    "Amelia Carter",
    "Liam Carter",
    "Sophia Morgan",
    "Oliver Morgan",
  ].map((name, i) => ({
    id: uid(),
    event_id: e,
    name,
    household: name.split(" ")[1],
    rsvp: (i < 6 ? "accepted" : "pending") as Guest["rsvp"],
    meal: "Standard",
    email: "",
  }));
  const t = [
    {
      id: uid(),
      event_id: e,
      name: "Table 1",
      kind: "round",
      x: 200,
      y: 210,
      rotation: 0,
      capacity: 8,
    },
    {
      id: uid(),
      event_id: e,
      name: "Table 2",
      kind: "round",
      x: 590,
      y: 210,
      rotation: 0,
      capacity: 8,
    },
    {
      id: uid(),
      event_id: e,
      name: "Sweetheart",
      kind: "sweetheart",
      x: 390,
      y: 90,
      rotation: 0,
      capacity: 2,
    },
    {
      id: uid(),
      event_id: e,
      name: "Dance floor",
      kind: "dance floor",
      x: 395,
      y: 410,
      rotation: 0,
      capacity: 0,
    },
  ];
  return completeSample({
    event: {
      id: e,
      name: "Our forever starts here",
      partner_one: "Alex",
      partner_two: "Jordan",
      mode: "wedding",
      date: "2027-06-19",
      venue: "The Glasshouse",
      budget: 30000,
      palette: ["#697b63", "#e9e4d9", "#d5b9a5", "#f9f6f0", "#b69462"],
    },
    guests: g,
    objects: t,
    seats: g.slice(0, 4).map((guest, i) => ({
      id: uid(),
      event_id: e,
      guest_id: guest.id,
      table_id: t[0].id,
      position: i,
    })),
    records: [
      ["task", "Find our perfect venue", "done", 0, 0, "2026-10-10"],
      ["task", "Book a photographer", "open", 0, 0, "2026-11-01"],
      ["task", "Choose a color palette", "open", 0, 0, "2026-11-15"],
      ["budget", "Venue & catering", "open", 12000, 3000, ""],
      ["budget", "Photography", "open", 3500, 0, ""],
      ["vendor", "The Glasshouse", "booked", 0, 0, ""],
      ["decor", "Garden roses & olive branches", "open", 450, 0, ""],
      ["timeline", "Send save the dates", "open", 0, 0, "2026-12-01"],
      ["day", "Ceremony", "open", 0, 0, "2027-06-19T16:00"],
      ["day", "Dinner & toasts", "open", 0, 0, "2027-06-19T18:00"],
      ["note", "A celebration that feels like us", "open", 0, 0, ""],
    ].map(([kind, title, status, amount, paid, date]) => ({
      id: uid(),
      event_id: e,
      kind: String(kind),
      title: String(title),
      status: String(status),
      amount: Number(amount),
      paid: Number(paid),
      date: String(date),
      notes: "",
      url: "",
      vendor_id: null,
      storage_path: null,
    })),
  });
}

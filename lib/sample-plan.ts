import { State, RecordItem, Guest, uid } from "./model";
import { defaultChurchLayout } from "./church-layout";

export function completeSample(base: State): State {
  const e = base.event.id;
  const first = [
    "Mariam",
    "Peter",
    "Grace",
    "Daniel",
    "Hannah",
    "David",
    "Sarah",
    "Michael",
    "Anna",
    "Joseph",
    "Rebecca",
    "Samuel",
    "Emma",
    "Thomas",
    "Lydia",
    "Andrew",
    "Isabella",
    "Matthew",
    "Nora",
    "Benjamin",
  ];
  const last = [
    "Hanna",
    "Tadros",
    "Farag",
    "Mikhail",
    "Youssef",
    "Awad",
    "Nashed",
    "Salib",
    "Guirguis",
    "Botros",
    "Wassef",
    "Ibrahim",
    "Mansour",
    "Aziz",
    "Gabriel",
  ];
  const extra: Guest[] = Array.from({ length: 142 }, (_, i) => ({
    id: uid(),
    event_id: e,
    name: `${first[i % first.length]} ${last[Math.floor(i / first.length)]}`,
    household: `${last[Math.floor(i / first.length)]} family ${Math.floor((i % 20) / 4) + 1}`,
    guest_group: i < 80 ? "Family" : i < 125 ? "Friends" : "Work",
    rsvp: i % 17 === 0 ? "pending" : i % 29 === 0 ? "declined" : "accepted",
    meal: i % 9 === 0 ? "Vegetarian" : "Standard",
    email: "",
  }));
  const objects = [
    ...base.objects.map((o, i) => ({
      ...o,
      ...[
        { x: 140, y: 220 },
        { x: 300, y: 220 },
        { x: 550, y: 80 },
        { x: 550, y: 450 },
      ][i],
    })),
    ...Array.from({ length: 15 }, (_, i) => ({
      id: uid(),
      event_id: e,
      name: `Table ${i + 3}`,
      kind: "round",
      x:
        i < 4
          ? 460 + i * 160
          : i < 10
            ? 140 + (i - 4) * 160
            : i < 14
              ? [140, 300, 780, 940][i - 10]
              : 140,
      y: i < 4 ? 220 : i < 10 ? 690 : i < 14 ? 420 : 550,
      rotation: 0,
      capacity: 10,
    })),
    {
      id: uid(),
      event_id: e,
      name: "Welcome bar",
      kind: "bar",
      x: 880,
      y: 80,
      rotation: 0,
      capacity: 0,
    },
    {
      id: uid(),
      event_id: e,
      name: "Cake table",
      kind: "cake table",
      x: 550,
      y: 580,
      rotation: 0,
      capacity: 0,
    },
  ];
  const record = (
    kind: string,
    title: string,
    details: Partial<RecordItem> = {},
  ): RecordItem => ({
    id: uid(),
    event_id: e,
    kind,
    title,
    status: "open",
    amount: 0,
    paid: 0,
    date: "",
    notes: "",
    url: "",
    vendor_id: null,
    storage_path: null,
    ...details,
  });
  const vendors = [
    record("vendor", "The Glasshouse", {
      status: "booked",
      amount: 12000,
      paid: 3000,
      notes:
        "Reception venue and three-course dinner. Contact: Elena. Final headcount two weeks before the celebration.",
      details: { arrival_time: "15:00", end_time: "23:00" },
    }),
    record("vendor", "Golden Hour Photography", {
      status: "booked",
      amount: 3500,
      paid: 1000,
      notes:
        "Getting ready, church service, family portraits and reception coverage.",
      details: { arrival_time: "11:00", end_time: "22:00" },
    }),
    record("vendor", "Olive & Rose Florals", {
      status: "booked",
      amount: 2200,
      paid: 550,
      notes:
        "White garden roses, olive branches, bridal bouquet and candlelit centerpieces.",
      details: { arrival_time: "12:00", end_time: "15:00" },
    }),
    record("vendor", "The Evening Quartet", {
      status: "contacted",
      amount: 1200,
      notes:
        "Cocktail-hour strings. Confirm electrical access and sound check.",
      details: { arrival_time: "16:30", end_time: "19:00" },
    }),
  ];
  const clergy = [
    ["Bishop", "Bishop Anthony"],
    ["Bishop", "Bishop David"],
    ["Priest", "Father John"],
    ["Priest", "Father Mark"],
    ["Priest", "Father Peter"],
    ...Array.from({ length: 15 }, (_, i) => [
      "Deacon",
      `${first[i]} ${last[i]}`,
    ]),
  ].map(([role, name]) =>
    record("ceremony_clergy", name, { details: { role } }),
  );
  const church = defaultChurchLayout();
  clergy.forEach((p, i) => {
    church.seats[`pew-${Math.floor(i / 4)}:${i % 4}`] = p.id;
  });
  const moments = [
    [
      "09:00",
      "Getting ready",
      "Hair, makeup and a relaxed breakfast with the wedding party.",
    ],
    ["11:30", "First look & portraits", "Meet the photographer in the garden."],
    [
      "14:00",
      "Arrive at church",
      "Clergy and deacons take their assigned places.",
    ],
    ["14:30", "Church ceremony", "Procession, crowning and prayers."],
    ["16:00", "Family photographs", "Family portraits outside the church."],
    ["17:00", "Cocktail hour", "Welcome drinks and live strings."],
    ["18:00", "Dinner & toasts", "Dinner service followed by family speeches."],
    ["19:30", "First dance", "Alex and Jordan open the dance floor."],
    ["20:30", "Cake cutting", "Gather by the cake table."],
    ["22:30", "Farewell", "Final song and a sparkler send-off."],
  ].map(([time, title, notes]) =>
    record("day", title, { date: base.event.date + "T" + time, notes }),
  );
  const records = [
    ...base.records.filter(
      (r) => !["vendor", "budget", "day", "decor", "note"].includes(r.kind),
    ),
    ...vendors,
    ...vendors.map((v, i) =>
      record(
        "budget",
        ["Venue & catering", "Photography", "Flowers & décor", "Live music"][i],
        { vendor_id: v.id, amount: v.amount, paid: v.paid, notes: v.notes },
      ),
    ),
    ...[
      "Order invitations",
      "Confirm wedding rings",
      "Schedule ceremony rehearsal",
      "Finalize meals and dietary needs",
      "Prepare wedding favors",
      "Share vendor arrival schedule",
    ].map((title, i) =>
      record("task", title, {
        date: `2027-0${Math.min(6, i + 1)}-15`,
        notes:
          "Discuss together, confirm the details, and mark complete once arranged.",
      }),
    ),
    ...[
      "Book the venue",
      "Send invitations",
      "Confirm RSVPs",
      "Ceremony rehearsal",
    ].map((title, i) =>
      record("timeline", title, {
        date: ["2026-10-20", "2027-03-01", "2027-05-20", "2027-06-18"][i],
        notes: "A milestone on our path to the celebration.",
      }),
    ),
    ...moments,
    ...clergy,
    record("ceremony_details", "St. Mary & St. Mark Church", {
      notes:
        "Crowning service at 2:30 PM. Rehearsal the evening before. Meet the lead priest at the church entrance.",
    }),
    record("ceremony_details", "Church seating layout", {
      details: { layout: JSON.stringify(church) },
    }),
    ...[
      "Processional hymn",
      "Prayer of thanksgiving",
      "Crowning prayers",
      "Blessing of the couple",
    ].map((title, i) =>
      record("ceremony_prayer", title, {
        assignee_id: clergy[5 + i].id,
        details: { order: String(i + 1) },
        notes: "Follow the lead priest’s cue; check hymn order at rehearsal.",
      }),
    ),
    ...[
      "Garden roses & olive branches",
      "Candlelit reception tables",
      "Bridal bouquet",
    ].map((title, i) =>
      record("decor", title, {
        amount: [450, 350, 180][i],
        notes: [
          "Cream roses and soft greenery in low arrangements.",
          "Warm candlelight, linen napkins and gold accents.",
          "A gathered bouquet of white roses with olive foliage.",
        ][i],
        url: "/images/reception.jpg",
      }),
    ),
    ...[
      "A warm garden celebration",
      "Soft neutral textures",
      "Intimate candlelight",
    ].map((title, i) =>
      record("inspiration", title, {
        notes: [
          "Airy florals and natural greenery.",
          "Ivory linens, sage accents and brushed gold.",
          "A relaxed, glowing evening together.",
        ][i],
        url: "/images/reception.jpg",
      }),
    ),
    record("note", "A celebration that feels like us", {
      notes:
        "Our priorities: a meaningful church service, time with family, good food, and an unhurried evening. Keep everything warm, simple and welcoming.",
    }),
    record("note", "Photography shot list", {
      notes:
        "Couple portraits; both families; wedding party; church exterior; crowning; rings; reception details; first dance; cake cutting.",
    }),
    record("note", "Vendor contacts & handoff", {
      notes:
        "The venue coordinator handles arrivals. Photography meets at the hotel lobby. Florals go first to church, then reception. Share the final timeline with each vendor.",
    }),
    record("document", "Sample wedding-day guide", {
      notes: "A sample document to show how your notes and documents work.",
      url: "/sample-wedding-guide.html",
    }),
  ];
  const seatingGuests = extra.filter((g) => g.rsvp !== "declined");
  return {
    ...base,
    event: { ...base.event, room_width_ft: 110, room_depth_ft: 85 },
    guests: [...base.guests, ...extra],
    objects,
    seats: [
      ...base.seats,
      ...seatingGuests.map((g, i) => ({
        id: uid(),
        event_id: e,
        guest_id: g.id,
        table_id: objects[4 + Math.floor(i / 10)].id,
        position: i % 10,
      })),
    ],
    records,
  };
}

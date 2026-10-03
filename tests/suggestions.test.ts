import { test } from "node:test";
import assert from "node:assert/strict";
import { sample, uid } from "../lib/model";
import { suggestSeating, suggestLayout } from "../lib/seating-suggestions";
import {
  removeGuests,
  restoreGuests,
  setGuestRsvp,
} from "../lib/guest-actions";
import { receptionStyle } from "../lib/reception-style";
test("delete removes linked data and undo restores it without overwriting later seat assignments", () => {
  const s = sample(),
    id = s.seats[0].guest_id,
    guest = s.guests.find((g) => g.id === id)!;
  s.family_links = [
    {
      id: uid(),
      event_id: s.event.id,
      guest_id: id,
      related_guest_id: s.guests.find((g) => g.id !== id)!.id,
      relationship: "Mother",
    },
  ];
  const { state, removed } = removeGuests(s, [id]);
  assert.ok(!state.guests.some((g) => g.id === id));
  assert.ok(!state.seats.some((a) => a.guest_id === id));
  assert.equal(state.family_links?.length, 0);
  assert.equal(restoreGuests(state, removed).guests.length, s.guests.length);
  const taken = {
    ...state,
    seats: [
      ...state.seats,
      {
        ...removed.seats[0],
        id: uid(),
        guest_id: state.guests.find(
          (g) => !state.seats.some((a) => a.guest_id === g.id),
        )!.id,
      },
    ],
  };
  const restored = restoreGuests(taken, removed);
  assert.equal(
    restored.seats.filter(
      (a) =>
        a.table_id === removed.seats[0].table_id &&
        a.position === removed.seats[0].position,
    ).length,
    1,
  );
  assert.ok(!restored.seats.some((a) => a.guest_id === guest.id));
});
test("seating suggestions preserve existing seats, exclude declines, and keep linked parents together", () => {
  const s = sample();
  s.seats = [];
  s.guests = s.guests.slice(0, 4).map((g, i) => ({
    ...g,
    household: "",
    rsvp: i === 3 ? "declined" : "pending",
  }));
  s.family_links = [
    {
      id: uid(),
      event_id: s.event.id,
      guest_id: s.guests[0].id,
      related_guest_id: s.guests[1].id,
      relationship: "Mother",
    },
    {
      id: uid(),
      event_id: s.event.id,
      guest_id: s.guests[0].id,
      related_guest_id: s.guests[2].id,
      relationship: "Father",
    },
  ];
  const result = suggestSeating(s);
  assert.equal(result.newSeats.length, 3);
  assert.equal(new Set(result.seats.map((a) => a.table_id)).size, 1);
  assert.equal(result.remaining, 0);
  const unchanged = suggestSeating({ ...s, seats: result.seats });
  assert.equal(unchanged.newSeats.length, 0);
  assert.deepEqual(unchanged.seats, result.seats);
});
test("layout suggestions report capacity limits for a large event without changing existing objects", () => {
  const s = sample();
  s.objects = [];
  s.seats = [];
  s.event.room_width_ft = 80;
  s.event.room_depth_ft = 60;
  s.guests = Array.from({ length: 400 }, (_, i) => ({
    ...s.guests[0],
    id: uid(),
    name: `Guest ${i}`,
    rsvp: "pending",
    household: `Family ${Math.floor(i / 3)}`,
  }));
  const result = suggestLayout(s);
  assert.ok(result.added.length > 1);
  assert.equal(result.added.filter((o) => o.kind === "dance floor").length, 1);
  assert.ok(result.uncovered > 0);
  for (const o of result.added) {
    assert.ok(o.x >= 0 && o.x <= 800 && o.y >= 0 && o.y <= 600);
  }
  const seeded = { ...s, objects: result.objects };
  const again = suggestLayout(seeded);
  assert.deepEqual(
    again.objects.slice(0, result.objects.length),
    result.objects,
  );
  assert.equal(again.added.filter((o) => o.kind === "dance floor").length, 0);
});
test("bulk declined RSVPs release seats and reception styling follows the palette", () => {
  const s = sample(),
    ids = s.guests.map((g) => g.id);
  const declined = setGuestRsvp(s, ids, "declined");
  assert.equal(declined.seats.length, 0);
  assert.ok(declined.guests.every((g) => g.rsvp === "declined"));
  const style = receptionStyle({
    ...s.event,
    partner_one: "Ravi",
    partner_two: "Mary",
    palette: ["#123456", "#abcdef", "#ffffff"],
  });
  assert.equal(style.monogram, "R & M");
  assert.equal(style.linen, "#123456");
  assert.equal(style.accent, "#abcdef");
});

test("40 guests get genuinely different full-room layouts and can regenerate after applying", async () => {
  const { generateReceptionLayout } =
    await import("../lib/seating-suggestions");
  const s = sample();
  s.objects = [];
  s.seats = [];
  s.guests = Array.from({ length: 40 }, (_, i) => ({
    ...s.guests[0],
    id: uid(),
    name: `Guest ${i}`,
    household: `Family ${Math.floor(i / 3)}`,
    rsvp: "pending" as const,
  }));
  const plans = Array.from({ length: 12 }, (_, i) =>
    generateReceptionLayout(s, i),
  );
  for (const p of plans) {
    assert.equal(p.uncovered, 0);
    assert.ok(p.capacity >= 40);
    const assigned = suggestSeating({ ...s, objects: p.objects });
    assert.equal(assigned.remaining, 0);
    assert.equal(assigned.seats.length, 40);
  }
  const signatures = plans.map((p) =>
    JSON.stringify(
      p.added.map((o) => [o.kind, o.capacity, o.x, o.y, o.rotation]),
    ),
  );
  assert.equal(new Set(signatures).size, 12);
  assert.ok(plans.some((p) => p.added.some((o) => o.kind === "serpentine")));
  assert.ok(plans.some((p) => p.added.some((o) => o.kind === "rectangular")));
  const applied = { ...s, objects: plans[0].objects };
  assert.ok(
    generateReceptionLayout(applied, 1).added.filter((o) => o.capacity).length >
      0,
  );
});

test("family invitation uses the primary invitee and includes parents with separate households", async () => {
  const { invitationFamilies } = await import("../lib/families");
  const s = sample();
  s.guests = ["Mark Nosseir", "Heidy Nosseir", "Nader Nosseir"].map(
    (name, i) => ({
      ...s.guests[0],
      id: String(i),
      name,
      household: `Separate ${i}`,
    }),
  );
  s.family_links = [
    {
      id: uid(),
      event_id: s.event.id,
      guest_id: "0",
      related_guest_id: "1",
      relationship: "Mother",
    },
    {
      id: uid(),
      event_id: s.event.id,
      guest_id: "0",
      related_guest_id: "2",
      relationship: "Father",
    },
  ];
  const f = invitationFamilies(s);
  assert.equal(f.length, 1);
  assert.equal(f[0].title, "Mark Nosseir & family");
  assert.equal(f[0].members.length, 3);
  assert.equal(f[0].relationship("1"), "Mother");
});

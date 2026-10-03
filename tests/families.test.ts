import { test } from "node:test";
import assert from "node:assert/strict";
import { sample, uid } from "../lib/model";
import { addFamily } from "../lib/families";
import { dimensions, chairSize } from "../lib/layout";
test("linked invitations create distinct guests sharing a household", () => {
  const s = sample(),
    guest = { ...s.guests[0], id: uid(), name: "Mark Nosseir", household: "" };
  const a = addFamily(s, guest, [
    { name: "Heidy", relationship: "Mother" },
    { name: "Nader", relationship: "Father" },
  ]);
  assert.equal(a.guests.length, s.guests.length + 3);
  assert.deepEqual(
    a.family_links?.map((l) => l.relationship),
    ["Mother", "Father"],
  );
  assert.equal(new Set(a.guests.slice(-3).map((g) => g.household)).size, 1);
  const b = addFamily(a, guest, [
    { name: "", relationship: "Friend", existing_id: s.guests[1].id },
  ]);
  assert.equal(b.guests.length, a.guests.length);
  assert.equal(b.family_links?.length, 3);
});
test("objects and individual chairs retain independent physical dimensions", () => {
  const o = {
    ...sample().objects[0],
    width_ft: 9,
    depth_ft: 4,
    chair_sizes: { "0": { width: 2, depth: 1 } },
  };
  assert.deepEqual(dimensions(o), { width: 9, depth: 4 });
  assert.deepEqual(chairSize(o, 0), { width: 2, depth: 1 });
  assert.deepEqual(chairSize(o, 1), { width: 1.5, depth: 1.5 });
});

test("batch family grouping moves only selected guests and preserves individual RSVPs and seats", async () => {
  const { groupGuestsAsFamily, invitationFamilies } =
    await import("../lib/families");
  const s = sample();
  const [primary, selected, remaining] = s.guests;
  s.guests = s.guests
    .slice(0, 3)
    .map((g) => ({ ...g, household: "Old family" }));
  s.family_links = [
    {
      id: uid(),
      event_id: s.event.id,
      guest_id: remaining.id,
      related_guest_id: selected.id,
      relationship: "Child",
    },
  ];
  const result = groupGuestsAsFamily(
    s,
    [primary.id, selected.id, selected.id],
    primary.id,
  );
  assert.equal(invitationFamilies(result).length, 2);
  assert.equal(
    invitationFamilies(result).find((f) => f.id === primary.id)?.members.length,
    2,
  );
  assert.equal(
    result.guests.find((g) => g.id === remaining.id)?.household,
    "Old family",
  );
  assert.deepEqual(result.seats, s.seats);
  assert.deepEqual(
    result.guests.map((g) => g.rsvp),
    s.guests.map((g) => g.rsvp),
  );
  assert.equal(result.family_links?.length, 1);
  assert.equal(groupGuestsAsFamily(s, [primary.id], primary.id), s);
});

test("adding an existing guest preserves the family label and guest details while moving only that guest", async () => {
  const { addGuestToFamily, renameFamily, invitationFamilies } =
    await import("../lib/families");
  const s = sample();
  s.guests = s.guests
    .slice(0, 3)
    .map((g, i) => ({ ...g, household: i === 0 ? "Host" : "Other household" }));
  s.family_links = [];
  const named = renameFamily(s, s.guests[0].id, "The Host Family");
  const result = addGuestToFamily(named, s.guests[0].id, s.guests[1], "Mother");
  assert.equal(
    invitationFamilies(result).find((f) => f.id === s.guests[0].id)?.title,
    "The Host Family",
  );
  assert.equal(
    invitationFamilies(result).find((f) => f.id === s.guests[0].id)?.members
      .length,
    2,
  );
  assert.equal(result.guests[2].household, "Other household");
  assert.equal(result.guests[1].rsvp, s.guests[1].rsvp);
  assert.deepEqual(result.seats, s.seats);
  assert.equal(result.family_links?.[0].relationship, "Mother");
});

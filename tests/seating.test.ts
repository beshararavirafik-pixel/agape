import { test } from "node:test";
import assert from "node:assert/strict";
import { assignSeat, sample } from "../lib/model.ts";
test("moving a guest removes their earlier assignment", () => {
  const s = sample();
  const next = assignSeat(
    s.seats,
    s.event.id,
    s.guests[0].id,
    s.objects[1].id,
    2,
  );
  assert.equal(next.filter((a) => a.guest_id === s.guests[0].id).length, 1);
  assert.equal(
    next.find((a) => a.guest_id === s.guests[0].id)?.table_id,
    s.objects[1].id,
  );
});
test("assigning an occupied chair returns its previous guest to unseated", () => {
  const s = sample();
  const next = assignSeat(
    s.seats,
    s.event.id,
    s.guests[5].id,
    s.objects[0].id,
    0,
  );
  assert.equal(
    next.filter((a) => a.table_id === s.objects[0].id && a.position === 0)
      .length,
    1,
  );
  assert.ok(!next.some((a) => a.guest_id === s.guests[0].id));
  assert.equal(
    next.find((a) => a.table_id === s.objects[0].id && a.position === 0)
      ?.guest_id,
    s.guests[5].id,
  );
});
test("seed contains a connected single event", () => {
  const s = sample();
  assert.ok(
    [...s.guests, ...s.objects, ...s.seats, ...s.records].every(
      (a) => a.event_id === s.event.id,
    ),
  );
  assert.ok(
    s.seats.every(
      (a) =>
        s.guests.some((g) => g.id === a.guest_id) &&
        s.objects.some((o) => o.id === a.table_id && o.capacity > a.position),
    ),
  );
});

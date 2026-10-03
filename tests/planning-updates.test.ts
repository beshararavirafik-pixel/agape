import { test } from "node:test";
import assert from "node:assert/strict";
import { formatDate, parseDate } from "../lib/dates.ts";
import { sample, uid, RecordItem } from "../lib/model.ts";
import { savePlanningRecord } from "../lib/vendor-budget.ts";
import {
  defaultChurchLayout,
  assignChurchSeat,
} from "../components/church-seating.tsx";
test("dates round-trip with leap days and reject impossible dates", () => {
  assert.equal(formatDate("2028-02-29"), "02/29/2028");
  assert.equal(parseDate("02/29/2028"), "2028-02-29");
  assert.equal(parseDate("02/29/2027"), "");
  assert.equal(parseDate("13/01/2027"), "");
  assert.equal(parseDate("06/19/2027 16:30"), "2027-06-19T16:30");
  assert.equal(parseDate("06/19/2027 25:30"), "");
});
test("vendor budgets synchronize in both directions without duplicate expenses", () => {
  let state = sample();
  const vendor: RecordItem = {
    ...state.records[0],
    id: uid(),
    kind: "vendor",
    title: "Florist",
    amount: 1500,
    paid: 200,
    details: { arrival_time: "14:30" },
  };
  state = savePlanningRecord(state, vendor);
  const expense = state.records.find((r) => r.vendor_id === vendor.id)!;
  assert.equal(expense.amount, 1500);
  state = savePlanningRecord(state, { ...vendor, amount: 1800 });
  assert.equal(
    state.records.filter((r) => r.vendor_id === vendor.id).length,
    1,
  );
  state = savePlanningRecord(
    state,
    { ...expense, amount: 2000, paid: 400 },
    "Florist",
  );
  assert.equal(state.records.find((r) => r.id === vendor.id)?.amount, 2000);
  assert.equal(
    state.records.find((r) => r.id === vendor.id)?.details?.arrival_time,
    "14:30",
  );
  assert.throws(() => savePlanningRecord(state, expense, ""), /required/);
  state = savePlanningRecord(
    state,
    { ...expense, id: uid(), amount: 500 },
    "Florist",
  );
  assert.equal(state.records.find((r) => r.id === vendor.id)?.amount, 2500);
  state = savePlanningRecord(state, { ...vendor, amount: 3000 });
  assert.equal(
    state.records
      .filter((r) => r.vendor_id === vendor.id)
      .reduce((n, r) => n + r.amount, 0),
    3000,
  );
});
test("church assignments move people and leave reception seats intact", () => {
  const state = sample(),
    before = JSON.stringify(state.seats);
  let layout = defaultChurchLayout();
  layout = assignChurchSeat(layout, state.guests[0].id, "pew-0:0");
  layout = assignChurchSeat(layout, state.guests[0].id, "pew-1:2");
  assert.equal(Object.keys(layout.seats).length, 1);
  assert.equal(layout.seats["pew-1:2"], state.guests[0].id);
  assert.equal(JSON.stringify(state.seats), before);
  assert.equal(layout.pews.length, 5);
  assert.equal(JSON.parse(JSON.stringify(layout)).bride.x, 42);
});

test("clergy layout migration preserves assignments and converts untouched couple seating", async () => {
  const { readChurchLayout, moveChurchObject, removeChurchPlace } =
    await import("../lib/church-layout.ts");
  const initial = defaultChurchLayout();
  const old = {
    ...initial,
    version: 2,
    bride: { x: 18, y: 30 },
    groom: { x: 22, y: 30 },
    pews: [
      ...initial.pews,
      {
        id: "throne-0",
        name: "Throne 1",
        kind: "throne",
        x: 29,
        y: 16,
        width: 3,
        depth: 3,
        capacity: 1,
      },
    ],
    seats: { "pew-0:0": "deacon" },
  };
  const migrated = readChurchLayout(JSON.stringify(old));
  assert.equal(migrated.bride.x, 42);
  assert.equal(migrated.pews.length, 5);
  assert.equal(migrated.seats["pew-0:0"], "deacon");
  old.seats = { ...old.seats, "throne-0:0": "bishop" } as typeof old.seats;
  assert.equal(readChurchLayout(JSON.stringify(old)).pews.length, 6);
  assert.equal(moveChurchObject(migrated, "altar", -100, 200).altar.x, 0);
  assert.equal(moveChurchObject(migrated, "altar", -100, 200).altar.y, 32);
  assert.equal(
    removeChurchPlace(migrated, "pew-0").seats["pew-0:0"],
    undefined,
  );
});

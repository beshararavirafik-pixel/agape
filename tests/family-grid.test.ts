import { test } from "node:test";
import assert from "node:assert/strict";
import { familyRows } from "../lib/family-grid";

test("responsive family rows preserve every name in alphabetical order without moving names between rows when opened", () => {
  const names = Array.from(
    { length: 19 },
    (_, index) => `Family ${String(index).padStart(2, "0")}`,
  );
  for (const columns of [1, 2, 3, 4]) {
    const rows = familyRows(names, columns);
    assert.deepEqual(rows.flat(), names);
    assert.ok(rows.every((row) => row.length <= columns));
    for (const name of names) {
      const selectedRow = rows.find((row) => row.includes(name))!;
      assert.deepEqual(rows.flat(), names);
      assert.ok(selectedRow.includes(name));
    }
  }
  assert.deepEqual(familyRows([], 4), []);
});

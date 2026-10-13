import { test } from "node:test";
import assert from "node:assert/strict";
import { familyGrid } from "../lib/family-grid";

test("closed families preserve their alphabetical row order", () => {
  const positions = familyGrid(19, 4);
  positions.forEach((position, index) =>
    assert.deepEqual(position, {
      column: (index % 4) + 1,
      row: Math.floor(index / 4) + 1,
      span: 1,
    }),
  );
});

test("opening a family near the bottom redistributes cards into balanced columns without overlap", () => {
  for (const index of [0, 7, 27, 46]) {
    const positions = familyGrid(48, 4, index, 6);
    assert.equal(positions[index].span, 6);
    assert.equal(positions[index].column, (index % 4) + 1);
    const bottoms = [];
    for (let column = 1; column <= 4; column++) {
      const items = positions
        .filter((p) => p.column === column)
        .sort((a, b) => a.row - b.row);
      let next = 1;
      items.forEach((p) => {
        assert.equal(p.row, next);
        next += p.span;
      });
      bottoms.push(next - 1);
    }
    assert.ok(Math.max(...bottoms) - Math.min(...bottoms) <= 1);
    assert.equal(bottoms[index % 4], Math.max(...bottoms));
  }
});

test("one-column layouts and a family larger than the available closed cards retain every card", () => {
  for (const [count, columns, index, rows] of [
    [7, 1, 5, 1],
    [3, 4, 2, 8],
    [0, 4, -1, 1],
  ]) {
    const positions = familyGrid(count, columns, index, rows);
    assert.equal(positions.length, count);
    assert.ok(
      positions.every(
        (p) => p.column >= 1 && p.column <= columns && p.row >= 1,
      ),
    );
  }
});

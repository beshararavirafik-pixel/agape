import { test } from "node:test";
import assert from "node:assert/strict";
import { sample } from "../lib/model";
import { chairPosition, dimensions, serpentCenter } from "../lib/layout";
test("serpentine table has distinct size and chairs follow both sides of its curve", () => {
  const o = { ...sample().objects[0], kind: "serpentine", capacity: 10 };
  assert.deepEqual(dimensions(o), { width: 18, depth: 8 });
  for (let i = 0; i < 5; i++) {
    const a = chairPosition(o, i),
      b = chairPosition(o, i + 5),
      center = serpentCenter((i + 0.5) / 5, 18, 8);
    assert.equal(a.x, b.x);
    assert.ok(a.y < center.y && b.y > center.y);
    assert.ok(Number.isFinite(a.x));
  }
});

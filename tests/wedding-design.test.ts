import { test } from "node:test";
import assert from "node:assert/strict";
import {
  defaultDesign,
  normalizeDesign,
  weddingStyle,
} from "../lib/wedding-design";
test("custom colors and typography remain bounded and unsafe photo schemes are rejected", () => {
  const d = normalizeDesign({
    paper: "url(https://example.com)",
    font: "unknown" as never,
    scale: 999,
    photoOpacity: -1,
    photo: "javascript:alert(1)",
  });
  assert.equal(d.paper, defaultDesign.paper);
  assert.equal(d.font, "editorial");
  assert.equal(d.scale, 130);
  assert.equal(d.photoOpacity, 0);
  assert.equal(d.photo, "");
  assert.equal(
    normalizeDesign({ photo: "https://example.com/photo.jpg" }).photo,
    "https://example.com/photo.jpg",
  );
  assert.equal(
    weddingStyle({ font: "modern", ink: "#112233" }).color,
    undefined,
  );
  assert.equal(
    (weddingStyle({ ink: "#112233" }) as Record<string, unknown>)["--w-ink"],
    "#112233",
  );
});

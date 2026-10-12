import { test } from "node:test";
import assert from "node:assert/strict";
import {
  defaultDesign,
  normalizeDesign,
  weddingStyle,
  paletteDesign,
  weddingFonts,
  weddingTemplates,
} from "../lib/wedding-design";
import { palettes } from "../lib/palettes";
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
test("every wedding palette produces readable ink and all font choices remain available", () => {
  const light = (hex: string) => {
    const rgb = [1, 3, 5]
      .map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
      .map((c) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
    return rgb[0] * 0.2126 + rgb[1] * 0.7152 + rgb[2] * 0.0722;
  };
  for (const [name, ...colors] of palettes) {
    const d = paletteDesign(colors),
      values = [light(d.paper), light(d.ink)].sort((a, b) => a - b);
    assert.ok(
      (values[1] + 0.05) / (values[0] + 0.05) >= 4.5,
      `${name} is hard to read`,
    );
    assert.ok(colors.includes(d.paper));
    assert.ok(colors.includes(d.accent));
    assert.deepEqual(
      d.paletteColors.slice(0, colors.length),
      colors,
      `${name} keeps every palette color`,
    );
    assert.ok(
      d.paletteColors.includes(d.ink),
      `${name} previews its text color`,
    );
    assert.ok(colors.includes(d.ink) || d.paletteColors.length === 6);
  }
  for (const [font] of weddingFonts)
    assert.equal(normalizeDesign({ font }).font, font);
  assert.equal(weddingFonts.length, 16);
  assert.equal(weddingTemplates.length, 13);
  const midnight = palettes.find(([name]) =>
    name.startsWith("Midnight velvet"),
  )!;
  const midnightDesign = paletteDesign(midnight.slice(1), midnight[0]);
  assert.ok(light(midnightDesign.paper) < light(midnightDesign.ink));
  assert.ok(
    new Set(weddingTemplates.map((template) => template.name)).size === 13,
  );
});

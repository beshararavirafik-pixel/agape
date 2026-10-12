import type { CSSProperties } from "react";
export type WeddingDesign = {
  paper: string;
  ink: string;
  accent: string;
  font:
    | "editorial"
    | "classic"
    | "modern"
    | "romantic"
    | "cormorant"
    | "bodoni"
    | "playfair"
    | "script"
    | "lora"
    | "outfit"
    | "inter"
    | "cormorant-semibold"
    | "cormorant-italic"
    | "bodoni-italic"
    | "playfair-italic"
    | "lora-italic";
  texture: "smooth" | "linen" | "paper" | "marble" | "silk" | "vellum" | "dots";
  shape: "arch" | "rounded" | "square";
  motif: "none" | "botanical" | "stars" | "frame" | "hearts" | "monogram";
  photo: string;
  overline: string;
  message: string;
  scale: number;
  photoOpacity: number;
  layout: "stacked" | "together";
  alignment: "left" | "center" | "right";
  spacing: "compact" | "balanced" | "airy";
  bodyFont: "simple" | "serif";
  photoFocus: "top" | "center" | "bottom";
  photoFinish: "natural" | "monochrome" | "warm";
  decorationSize: number;
  buttonLabel: string;
  paletteColors: string[];
};
export const defaultDesign: WeddingDesign = {
  paper: "#f5f1e8",
  ink: "#26362d",
  accent: "#bfa373",
  font: "editorial",
  texture: "paper",
  shape: "arch",
  motif: "frame",
  photo: "",
  overline: "Together with our families",
  message: "We can’t wait to celebrate with you.",
  scale: 100,
  photoOpacity: 45,
  layout: "stacked",
  alignment: "center",
  spacing: "balanced",
  bodyFont: "simple",
  photoFocus: "center",
  photoFinish: "natural",
  decorationSize: 100,
  buttonLabel: "",
  paletteColors: [],
};
export const weddingTemplates = [
  {
    name: "The Editorial",
    note: "Candlelight · warm ivory",
    design: defaultDesign,
  },
  {
    name: "Garden vows",
    note: "Sage · botanical linen",
    design: {
      ...defaultDesign,
      paper: "#edf1e7",
      ink: "#314b3a",
      accent: "#80946e",
      texture: "linen",
      motif: "botanical",
      photoOpacity: 0,
    } as WeddingDesign,
  },
  {
    name: "Amour",
    note: "Rose · romantic paper",
    design: {
      ...defaultDesign,
      paper: "#f8eee9",
      ink: "#613c44",
      accent: "#a56877",
      font: "romantic",
      motif: "botanical",
      photoOpacity: 0,
    } as WeddingDesign,
  },
  {
    name: "Midnight",
    note: "Ink · celestial gold",
    design: {
      ...defaultDesign,
      paper: "#17232b",
      ink: "#f7f1df",
      accent: "#cbb482",
      shape: "rounded",
      motif: "stars",
      photoOpacity: 0,
    } as WeddingDesign,
  },
  {
    name: "Modern muse",
    note: "Clean · sculptural",
    design: {
      ...defaultDesign,
      paper: "#f1eee8",
      ink: "#32312e",
      accent: "#997d63",
      font: "modern",
      shape: "square",
      texture: "smooth",
      motif: "none",
      photoOpacity: 0,
    } as WeddingDesign,
  },
  {
    name: "Carrara",
    note: "Marble · timeless serif",
    design: {
      ...defaultDesign,
      paper: "#f4f3f0",
      ink: "#41443e",
      accent: "#b59968",
      font: "classic",
      texture: "marble",
      motif: "frame",
      photoOpacity: 0,
    } as WeddingDesign,
  },
  {
    name: "Coastal vows",
    note: "Sea glass · blue horizon",
    design: {
      ...defaultDesign,
      paper: "#eef5f5",
      ink: "#284a5b",
      accent: "#7197a2",
      font: "cormorant",
      texture: "vellum",
      motif: "stars",
      photoOpacity: 0,
    } as WeddingDesign,
  },
  {
    name: "Golden hour",
    note: "Terracotta · sunset silk",
    design: {
      ...defaultDesign,
      paper: "#f5e8dc",
      ink: "#603a31",
      accent: "#bd7655",
      font: "playfair",
      texture: "silk",
      motif: "botanical",
      photoOpacity: 0,
    } as WeddingDesign,
  },
  {
    name: "Pearl & prose",
    note: "Soft pearl · handwritten",
    design: {
      ...defaultDesign,
      paper: "#f7f3ef",
      ink: "#493e4b",
      accent: "#a68b9a",
      font: "script",
      texture: "vellum",
      motif: "frame",
      photoOpacity: 0,
    } as WeddingDesign,
  },
  {
    name: "Olive grove",
    note: "Olive · handmade paper",
    design: {
      ...defaultDesign,
      paper: "#f0eedf",
      ink: "#384537",
      accent: "#7f8961",
      font: "lora",
      texture: "paper",
      motif: "botanical",
      photoOpacity: 0,
    } as WeddingDesign,
  },
  {
    name: "Black tie",
    note: "Charcoal · crisp and modern",
    design: {
      ...defaultDesign,
      paper: "#262824",
      ink: "#faf8f2",
      accent: "#c4a96f",
      font: "bodoni",
      shape: "square",
      texture: "smooth",
      motif: "frame",
      photoOpacity: 0,
    } as WeddingDesign,
  },
  {
    name: "Lavender field",
    note: "Lilac · delicate linework",
    design: {
      ...defaultDesign,
      paper: "#f1edf5",
      ink: "#4b4358",
      accent: "#9584ad",
      font: "cormorant",
      texture: "linen",
      motif: "hearts",
      photoOpacity: 0,
    } as WeddingDesign,
  },
  {
    name: "Wildflower",
    note: "Blush · garden romance",
    design: {
      ...defaultDesign,
      paper: "#f8efeb",
      ink: "#67454a",
      accent: "#bb8790",
      font: "romantic",
      texture: "paper",
      motif: "botanical",
      photoOpacity: 0,
    } as WeddingDesign,
  },
];
export const fonts = {
  editorial: '"Instrument Serif", serif',
  classic: "Georgia, serif",
  modern: '"Manrope Variable", sans-serif',
  romantic: '"Instrument Serif", serif',
  cormorant: '"Cormorant Garamond", serif',
  bodoni: '"Bodoni Moda", serif',
  playfair: '"Playfair Display", serif',
  script: '"Dancing Script", cursive',
  lora: '"Lora", serif',
  outfit: '"Outfit Variable", sans-serif',
  inter: '"Inter Variable", sans-serif',
  "cormorant-semibold": '"Cormorant Garamond", serif',
  "cormorant-italic": '"Cormorant Garamond", serif',
  "bodoni-italic": '"Bodoni Moda", serif',
  "playfair-italic": '"Playfair Display", serif',
  "lora-italic": '"Lora", serif',
};
export const weddingFonts = [
  ["editorial", "Editorial · Instrument Serif"],
  ["romantic", "Romantic · Instrument italic"],
  ["cormorant", "Elegant · Cormorant Garamond"],
  ["bodoni", "Fashion · Bodoni Moda"],
  ["playfair", "Timeless · Playfair Display"],
  ["script", "Handwritten · Dancing Script"],
  ["lora", "Literary · Lora"],
  ["classic", "Traditional · Georgia"],
  ["modern", "Clean · Manrope"],
  ["outfit", "Soft · Outfit"],
  ["inter", "Minimal · Inter"],
  ["cormorant-semibold", "Cormorant · polished"],
  ["cormorant-italic", "Cormorant · italic"],
  ["bodoni-italic", "Bodoni · italic"],
  ["playfair-italic", "Playfair · italic"],
  ["lora-italic", "Lora · italic"],
] as const;
function luminance(hex: string) {
  const rgb = [1, 3, 5]
    .map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
    .map((c) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return rgb[0] * 0.2126 + rgb[1] * 0.7152 + rgb[2] * 0.0722;
}
export function paletteDesign(
  colors: string[],
  paletteName = "",
): Pick<WeddingDesign, "paper" | "ink" | "accent" | "paletteColors"> {
  const valid = colors.filter((c) => /^#[0-9a-f]{6}$/i.test(c));
  if (!valid.length)
    return {
      paper: defaultDesign.paper,
      ink: defaultDesign.ink,
      accent: defaultDesign.accent,
      paletteColors: [],
    };
  const sorted = [...valid].sort((a, b) => luminance(a) - luminance(b));
  const darkTheme = /midnight|black tie/i.test(paletteName);
  const paper = darkTheme ? sorted[0] : sorted[sorted.length - 1];
  const contrast = (a: string, b: string) => {
    const [lo, hi] = [luminance(a), luminance(b)].sort((x, y) => x - y);
    return (hi + 0.05) / (lo + 0.05);
  };
  const candidates = darkTheme ? [...sorted].reverse() : sorted;
  let ink = candidates.find((c) => contrast(paper, c) >= 4.5);
  if (!ink) {
    const source = darkTheme ? sorted[sorted.length - 1] : sorted[0];
    for (let step = 1; step <= 20 && !ink; step++) {
      const amount = step / 20;
      const candidate = `#${[1, 3, 5]
        .map((index) => {
          const value = parseInt(source.slice(index, index + 2), 16);
          const adjusted = darkTheme
            ? value + (255 - value) * amount
            : value * (1 - amount);
          return Math.round(adjusted).toString(16).padStart(2, "0");
        })
        .join("")}`;
      if (contrast(paper, candidate) >= 4.5) ink = candidate;
    }
  }
  ink ||= darkTheme ? "#ffffff" : "#000000";
  const chroma = (hex: string) => {
    const rgb = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);
    return Math.max(...rgb) - Math.min(...rgb);
  };
  const accent =
    valid
      .filter((c) => c !== paper && c !== ink)
      .sort((a, b) => chroma(b) - chroma(a))[0] ||
    (darkTheme ? sorted.at(-1)! : sorted[0]);
  return {
    paper,
    ink,
    accent,
    paletteColors: valid.includes(ink) ? valid : [...valid, ink],
  };
}
export function normalizeDesign(value?: Partial<WeddingDesign>): WeddingDesign {
  const d = { ...defaultDesign, ...value };
  const color = (v: string, fallback: string) =>
    /^#[0-9a-f]{6}$/i.test(v) ? v : fallback;
  return {
    ...d,
    paper: color(d.paper, defaultDesign.paper),
    ink: color(d.ink, defaultDesign.ink),
    accent: color(d.accent, defaultDesign.accent),
    font: Object.hasOwn(fonts, d.font) ? d.font : "editorial",
    scale: Math.max(65, Math.min(130, Number(d.scale) || 100)),
    photoOpacity: Math.max(0, Math.min(75, Number(d.photoOpacity) || 0)),
    decorationSize: Math.max(
      60,
      Math.min(150, Number(d.decorationSize) || 100),
    ),
    alignment: ["left", "center", "right"].includes(d.alignment)
      ? d.alignment
      : "center",
    layout: d.layout === "together" ? "together" : "stacked",
    spacing: ["compact", "balanced", "airy"].includes(d.spacing)
      ? d.spacing
      : "balanced",
    bodyFont: d.bodyFont === "serif" ? "serif" : "simple",
    photoFocus: ["top", "center", "bottom"].includes(d.photoFocus)
      ? d.photoFocus
      : "center",
    photoFinish: ["natural", "monochrome", "warm"].includes(d.photoFinish)
      ? d.photoFinish
      : "natural",
    photo:
      /^https:\/\//.test(d.photo) ||
      /^data:image\/(jpeg|png|webp);base64,/.test(d.photo)
        ? d.photo
        : "",
    paletteColors: Array.isArray(d.paletteColors)
      ? d.paletteColors.filter((c) => /^#[0-9a-f]{6}$/i.test(c)).slice(0, 6)
      : [],
  };
}
export function weddingStyle(value?: Partial<WeddingDesign>): CSSProperties {
  const d = normalizeDesign(value);
  return {
    "--w-paper": d.paper,
    "--w-ink": d.ink,
    "--w-accent": d.accent,
    "--w-palette-1": d.paletteColors[0] || d.accent,
    "--w-palette-2": d.paletteColors[1] || d.paper,
    "--w-palette-3": d.paletteColors[2] || d.accent,
    "--w-palette-4": d.paletteColors[3] || d.ink,
    "--w-palette-5": d.paletteColors[4] || d.accent,
    "--w-font": fonts[d.font],
    "--w-scale": d.scale / 100,
    "--w-align": d.alignment,
    "--w-justify":
      d.alignment === "left"
        ? "flex-start"
        : d.alignment === "right"
          ? "flex-end"
          : "center",
    "--w-decoration-scale": d.decorationSize / 100,
    "--w-body-font":
      d.bodyFont === "serif"
        ? '"Lora", serif'
        : '"Manrope Variable", sans-serif',
  } as CSSProperties;
}
export type WebsiteSection = {
  id: string;
  type: "story" | "details" | "gallery" | "faq" | "text";
  title: string;
  text: string;
  image?: string;
};
export type WebsiteSettings = {
  website_design?: WeddingDesign;
  invitation_design?: WeddingDesign;
  website_sections?: WebsiteSection[];
  website_published?: boolean;
};

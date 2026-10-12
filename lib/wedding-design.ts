import type { CSSProperties } from "react";
export type WeddingDesign = {
  paper: string;
  ink: string;
  accent: string;
  font: "editorial" | "classic" | "modern" | "romantic";
  texture: "smooth" | "linen" | "paper" | "marble";
  shape: "arch" | "rounded" | "square";
  motif: "none" | "botanical" | "stars" | "frame";
  photo: string;
  overline: string;
  message: string;
  scale: number;
  photoOpacity: number;
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
];
const fonts = {
  editorial: '"Instrument Serif", serif',
  classic: "Georgia, serif",
  modern: '"Manrope Variable", sans-serif',
  romantic: '"Instrument Serif", serif',
};
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
    photo:
      /^https:\/\//.test(d.photo) ||
      /^data:image\/(jpeg|png|webp);base64,/.test(d.photo)
        ? d.photo
        : "",
  };
}
export function weddingStyle(value?: Partial<WeddingDesign>): CSSProperties {
  const d = normalizeDesign(value);
  return {
    "--w-paper": d.paper,
    "--w-ink": d.ink,
    "--w-accent": d.accent,
    "--w-font": fonts[d.font],
    "--w-scale": d.scale / 100,
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

import type { Metadata, Viewport } from "next";
import "@fontsource-variable/manrope";
import "@fontsource-variable/outfit";
import "@fontsource/instrument-serif/400.css";
import "@fontsource/instrument-serif/400-italic.css";
import "./globals.css";
import SoftCursor from "@/components/soft-cursor";
export const metadata: Metadata = {
  title: "Agapē",
  description: "A thoughtful space for planning your wedding or engagement.",
  icons: { icon: "/icon.svg", apple: "/icon-192.png" },
};
export const viewport: Viewport = {
  themeColor: "#282923",
  width: "device-width",
  initialScale: 1,
};
export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        {children}
        <SoftCursor />
      </body>
    </html>
  );
}

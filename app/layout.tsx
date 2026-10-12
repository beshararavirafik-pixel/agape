import { sitePath, basePath } from "@/lib/site-path";
import type { Metadata, Viewport } from "next";
import "@fontsource-variable/manrope";
import "@fontsource-variable/outfit";
import "@fontsource/instrument-serif/400.css";
import "@fontsource/instrument-serif/400-italic.css";
import "@fontsource-variable/inter";
import "@fontsource/cormorant-garamond/400.css";
import "@fontsource/cormorant-garamond/400-italic.css";
import "@fontsource/cormorant-garamond/600.css";
import "@fontsource/bodoni-moda/400.css";
import "@fontsource/bodoni-moda/400-italic.css";
import "@fontsource/playfair-display/400.css";
import "@fontsource/playfair-display/400-italic.css";
import "@fontsource/dancing-script/400.css";
import "@fontsource/lora/400.css";
import "@fontsource/lora/400-italic.css";
import "./globals.css";
import "./invitation.css";
import "./wedding-builder.css";
import SoftCursor from "@/components/soft-cursor";
export const metadata: Metadata = {
  title: "Agapē",
  description: "A thoughtful space for planning your wedding or engagement.",
  icons: { icon: sitePath("/icon.svg"), apple: sitePath("/icon-192.png") },
};
export const viewport: Viewport = {
  themeColor: "#282923",
  width: "device-width",
  initialScale: 1,
};
export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body
        style={
          {
            "--reception-photo": `url("${sitePath("/images/reception.jpg")}")`,
          } as React.CSSProperties
        }
      >
        {children}
        <SoftCursor />
      </body>
    </html>
  );
}

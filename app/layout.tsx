import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = {
  title: "SPUNK CASES • Open. Collect. Get lucky.",
  description:
    "The private sticker case club. Fictional nuggets. Legendary friends.",
  robots: { index: false, follow: false },
  icons: { icon: "/favicon.svg" },
};
export default function Layout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}

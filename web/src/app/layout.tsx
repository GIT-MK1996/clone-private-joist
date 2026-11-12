import type { Metadata, Viewport } from "next";
import { Geist } from "next/font/google";
import "./globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Werkbon – offertes en facturen voor vakmensen",
  description: "Maak in 2 minuten een offerte op je telefoon. Klant zegt online akkoord, jij maakt er met één tik een factuur van.",
};

export const viewport: Viewport = { width: "device-width", initialScale: 1, themeColor: "#c2410c" };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="nl">
      <body className={`${geistSans.variable} font-sans antialiased`}>{children}</body>
    </html>
  );
}

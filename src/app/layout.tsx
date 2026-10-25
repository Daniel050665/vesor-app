import type { Metadata, Viewport } from "next";
import { DM_Sans, Space_Grotesk } from "next/font/google";
import "./globals.css";
import NavBar from "@/components/NavBar";

const display = Space_Grotesk({ subsets: ["latin"], variable: "--font-display", display: "swap" });
const sans = DM_Sans({ subsets: ["latin"], variable: "--font-sans", display: "swap" });

export const metadata: Metadata = {
  title: "Vesor — Analiza antes de invertir",
  description: "Análisis financiero, noticias y un asistente con IA para decidir con más información antes de invertir.",
};

export const viewport: Viewport = { width: "device-width", initialScale: 1, themeColor: "#121915" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className={`${display.variable} ${sans.variable}`}>
      <body>
        <NavBar />
        <main className="container">{children}</main>
      </body>
    </html>
  );
}

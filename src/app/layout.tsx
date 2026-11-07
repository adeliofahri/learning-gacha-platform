import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "Learning Gacha Platform", template: "%s · Learning Gacha" },
  description: "Belajar lewat soal, kumpulkan koin virtual, dan koleksi karakter fantasi.",
};

export const viewport: Viewport = { themeColor: "#6d4ee0", width: "device-width", initialScale: 1 };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id">
      <body className="min-h-dvh antialiased">
        <a
          href="#main"
          className="focus:bg-card sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:rounded-md focus:px-3 focus:py-2"
        >
          Lewati ke konten
        </a>
        {children}
      </body>
    </html>
  );
}

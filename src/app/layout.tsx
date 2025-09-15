import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "presensi GTK dan Buku Tamu",
  description: "Aplikasi presensi GTK dan buku tamu",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="id">
      <body>{children}</body>
    </html>
  );
}


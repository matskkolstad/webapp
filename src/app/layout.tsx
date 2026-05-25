import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "LiggNett – Hvem kjenner hvem? 😏",
  description: "Relationship network visualization for friend groups",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html suppressHydrationWarning>
      <body className="min-h-screen antialiased">
        {children}
      </body>
    </html>
  );
}

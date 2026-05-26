import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "LiggNett – Hvem kjenner hvem? 😏",
  description: "Relationship network visualization for friend groups",
  applicationName: "LiggNett",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    title: "LiggNett",
    statusBarStyle: "default",
  },
  icons: {
    icon: [
      { url: "/icons/icon-192.svg", sizes: "192x192", type: "image/svg+xml" },
      { url: "/icons/icon-512.svg", sizes: "512x512", type: "image/svg+xml" },
    ],
    apple: [{ url: "/icons/apple-touch-icon.svg", sizes: "180x180", type: "image/svg+xml" }],
  },
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#7c3aed",
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

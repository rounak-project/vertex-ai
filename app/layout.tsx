import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Vertex AI — Personal Intelligence",
  description: "Rounak's futuristic AI assistant powered by Grok.",
  other: {
    "codex-preview": "development",
  },
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}

import type { CSSProperties } from "react";
import type { Metadata } from "next";
import { IBM_Plex_Mono, Montserrat } from "next/font/google";
import { loadAppSettings } from "@/lib/data/settings";
import "./globals.css";

const montserrat = Montserrat({
  variable: "--font-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
});

const plexMono = IBM_Plex_Mono({
  variable: "--font-plex-mono",
  subsets: ["latin"],
  weight: ["500", "600"],
});

export const metadata: Metadata = {
  title: "DIEM Portal",
  description: "DIEM Innovate internal portal",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const settings = await loadAppSettings();
  const primaryColor = settings.branding.primary_color;
  const bodyStyle = primaryColor ? ({ "--brand-primary": primaryColor } as CSSProperties) : undefined;

  return (
    <html
      lang="en"
      className={`${montserrat.variable} ${plexMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col" style={bodyStyle}>
        {children}
      </body>
    </html>
  );
}

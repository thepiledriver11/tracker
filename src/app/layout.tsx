import type { Metadata, Viewport } from "next";
import { Outfit, Manrope } from "next/font/google";
import "./globals.css";
import { ServiceWorker } from "@/components/ServiceWorker";

const outfit = Outfit({
  subsets: ["latin"],
  weight: ["200", "300", "400", "600"],
  variable: "--font-outfit",
  display: "swap",
});
const manrope = Manrope({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-manrope",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Training Tracker",
  applicationName: "Training",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Training",
  },
  icons: {
    apple: [{ url: "/icons/apple-touch-icon.png", sizes: "180x180" }],
  },
};

export const viewport: Viewport = {
  themeColor: "#E9F2FA",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${outfit.variable} ${manrope.variable}`}>
      <body>
        {children}
        <ServiceWorker />
      </body>
    </html>
  );
}

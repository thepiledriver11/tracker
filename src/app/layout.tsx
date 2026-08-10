import type { Metadata, Viewport } from "next";
import TabBar from "@/components/TabBar";
import Splash from "@/components/Splash";
import "./globals.css";

export const metadata: Metadata = {
  title: "Goal Tracker",
  description: "Track goals across Career, Fitness, Nutrition and Finance",
  appleWebApp: {
    capable: true,
    title: "Goals",
    statusBarStyle: "default",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: "#ffffff",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="bg-white text-black antialiased">
        <Splash />
        <div className="mx-auto min-h-screen max-w-md border-x border-line pb-24">
          {children}
        </div>
        <TabBar />
      </body>
    </html>
  );
}

import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Training Tracker",
    short_name: "Training",
    description: "Single-user hypertrophy training tracker",
    start_url: "/today",
    display: "standalone",
    orientation: "portrait",
    background_color: "#E9F2FA",
    theme_color: "#E9F2FA",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
      {
        src: "/icons/icon-512-maskable.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}

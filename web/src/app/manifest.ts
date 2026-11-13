import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Klusnota",
    short_name: "Klusnota",
    description: "Offertes en facturen op je telefoon, voor vakmensen.",
    lang: "nl",
    start_url: "/app",
    scope: "/",
    display: "standalone",
    background_color: "#f6f5f1",
    theme_color: "#e0a100",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}

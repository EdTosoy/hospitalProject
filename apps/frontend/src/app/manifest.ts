import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "abox",
    short_name: "abox",
    description: "Hospital Management Platform",
    start_url: "/",
    scope: "/",
    display: "browser",
    background_color: "#f5f8fa",
    theme_color: "#00ada7",
    icons: [
      {
        src: "/android-chrome-192x192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/android-chrome-512x512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
    ],
  };
}

import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "WEFIT — Gym & Diet Tracker",
    short_name: "WEFIT",
    description: "Track workouts, log Indian meals, and hit your fitness goals.",
    start_url: "/home",
    display: "standalone",
    orientation: "portrait",
    background_color: "#0B0E17",
    theme_color: "#0B0E17",
    icons: [
      { src: "/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" },
    ],
  };
}

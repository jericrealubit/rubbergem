import type { MetadataRoute } from "next";

export const dynamic = "force-static";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Rubber Production System",
    short_name: "Rubber",
    description: "Shift Execution & Defect Matrix Log",
    start_url: ".",
    display: "standalone",
    background_color: "#022c22",
    theme_color: "#022c22",
    icons: [
      { src: "icon", sizes: "32x32", type: "image/png" },
      { src: "apple-icon", sizes: "180x180", type: "image/png" },
    ],
  };
}

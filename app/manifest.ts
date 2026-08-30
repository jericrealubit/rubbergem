import type { MetadataRoute } from "next";
import { DEFAULT_LIGHT_THEME, THEME_COLORS } from "@/components/theme/theme-config";

export const dynamic = "force-static";

// Static manifest — can't react to the runtime theme choice, so this just
// mirrors the same default-light baseline used for the initial page paint
// (app/layout.tsx's `viewport.themeColor`), which the inline theme script
// then corrects at runtime for the actual <html>/meta theme-color.
const defaultThemeColor = THEME_COLORS[DEFAULT_LIGHT_THEME];

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Rubber Production System",
    short_name: "Rubber",
    description: "Shift Execution & Defect Matrix Log",
    start_url: ".",
    display: "standalone",
    background_color: defaultThemeColor,
    theme_color: defaultThemeColor,
    icons: [
      { src: "icon", sizes: "32x32", type: "image/png" },
      { src: "apple-icon", sizes: "180x180", type: "image/png" },
    ],
  };
}

import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  // IMPORTANTE: debe coincidir con el nombre del repo
  base: "/calistenia-app/",

  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      injectRegister: "auto",
      includeAssets: [
        "favicon.svg",
        "apple-touch-icon.png",
        "pwa-192.png",
        "pwa-512.png",
      ],
      manifest: {
        name: "Calistenia 20 semanas",
        short_name: "Calistenia",
        description: "Rutina de calistenia 20 semanas",
        theme_color: "#ffffff",
        background_color: "#ffffff",
        display: "standalone",
        start_url: "/calistenia-app/",
        scope: "/calistenia-app/",
        icons: [
          { src: "pwa-192.png", sizes: "192x192", type: "image/png" },
          { src: "pwa-512.png", sizes: "512x512", type: "image/png" },
        ],
      },
      devOptions: { enabled: true },
    }),
  ],

  // Para que el build salga en dev-dist (como tu carpeta)
  build: {
    outDir: "dev-dist",
  },
});

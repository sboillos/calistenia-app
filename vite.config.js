import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

const repoName = "calistenia-app"; // <-- EXACTO

export default defineConfig(({ mode }) => ({
  // En local "/", en GitHub Pages "/<repo>/"
  base: mode === "production" ? `/${repoName}/` : "/",

  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      injectRegister: "auto",

      // Solo archivos que existen en /public
      includeAssets: [
        "favicon.ico",
        "favicon-16x16.png",
        "favicon-32x32.png",
        "apple-touch-icon.png",
        "mstile-150x150.png",
      ],

      manifest: {
        name: "Calistenia 20 semanas",
        short_name: "Calistenia",
        description: "Rutina de calistenia 20 semanas",
        theme_color: "#ffffff",
        background_color: "#ffffff",
        display: "standalone",

        // GitHub Pages (project page)
        start_url: `/${repoName}/`,
        scope: `/${repoName}/`,

        icons: [
          {
            src: "pwa-192x192.png",
            sizes: "192x192",
            type: "image/png",
          },
          {
            src: "pwa-512x512.png",
            sizes: "512x512",
            type: "image/png",
          },
          {
            src: "pwa-192x192-maskable.png",
            sizes: "192x192",
            type: "image/png",
            purpose: "maskable",
          },
          {
            src: "pwa-512x512-maskable.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "maskable",
          },
        ],
      },

      // Solo dev local
      devOptions: { enabled: false },
    }),
  ],

  build: {
    outDir: "dist",
    emptyOutDir: true,
  },
}));

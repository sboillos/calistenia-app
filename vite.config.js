import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  base: "/calistenia-app/",
  plugins: [react()],
});

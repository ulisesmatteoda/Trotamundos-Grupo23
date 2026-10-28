import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// En desarrollo local (`npm run dev`) se reenvía /api al backend publicado por nginx.
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: { "/api": "http://localhost:8080" },
  },
});

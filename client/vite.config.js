import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    // Proxy API requests to Express during local development
    // so you don't need to deal with CORS locally.
    // In production, the frontend calls the Railway URL directly
    // via the VITE_API_URL environment variable.
    proxy: {
      "/api": {
        target: "http://localhost:3001",
        changeOrigin: true,
      },
    },
  },
});

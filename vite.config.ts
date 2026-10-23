import path from "path";
import { fileURLToPath } from "url";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
    },
  },
  server: {
    host: "0.0.0.0",
    port: 5173,
    allowedHosts: true,
  },
  preview: {
    host: "0.0.0.0",
    port: 4173,
    allowedHosts: true,
  },
  build: {
    target: "es2020",
    sourcemap: false,
    rollupOptions: {
      output: {
        manualChunks: {
          react: ["react", "react-dom"],
          supabase: ["@supabase/supabase-js"],
          arcade: [
            "./src/components/GameOverlay.tsx",
            "./src/components/GameLibrary.tsx",
            "./src/components/games/DesiGames.tsx",
            "./src/components/games/CoopGames.tsx",
            "./src/components/games/ClassicGames.tsx",
            "./src/components/games/WikiRaceGame.tsx",
            "./src/components/games/VideoGames.tsx",
          ],
        },
      },
    },
  },
});

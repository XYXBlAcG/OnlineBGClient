import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { developmentPorts } from "./src/shared/development";
export default defineConfig(({ mode }) => ({
  plugins: [react()],
  server: {
    port: mode === "phone" ? developmentPorts.phone : developmentPorts.desktop,
    strictPort: true,
  },
  clearScreen: false,
}));

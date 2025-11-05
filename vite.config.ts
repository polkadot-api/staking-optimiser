import path from "path"
import tailwindcss from "@tailwindcss/vite"
import { defineConfig } from "vite"
import react from "@vitejs/plugin-react"
import { analyzer } from "vite-bundle-analyzer"
// @ts-expect-error
import vercelSkewProtection from "vite-plugin-vercel-skew-protection"

const skewProtecEnabled = process.env.VERCEL_SKEW_PROTECTION_ENABLED === "1"

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    skewProtecEnabled ? vercelSkewProtection() : null,
    process.env.ANALYZE ? analyzer() : null,
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  worker: {
    format: "es",
  },
})

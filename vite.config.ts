import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// base './' para que funcione en GitHub Pages bajo cualquier nombre de repo
export default defineConfig({
  base: './',
  plugins: [react()],
})

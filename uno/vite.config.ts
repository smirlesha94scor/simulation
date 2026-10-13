import { defineConfig } from 'vite'
import react from '@vitejs.plugin-react'

export default defineConfig({
  plugins: [react()],
  base: '/simulation/', // Название вашего репозитория на GitHub
  build: {
    outDir: 'dist',     // Сборка создастся в папке uno/dist
    emptyOutDir: true,
  },
})

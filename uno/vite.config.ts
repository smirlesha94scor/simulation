import { defineConfig } from 'vite'
import react from '@vitejs.plugin-react'

export default defineConfig({
  plugins: [react()],
  root: 'uno',          // Исходники лежат в папке uno
  base: '/simulation/uno/', // Обязательно учитываем вложенность пути!
  build: {
    outDir: '.',     // Vite соберет всё в папку uno/dist
  emptyOutDir: false,
  },
})

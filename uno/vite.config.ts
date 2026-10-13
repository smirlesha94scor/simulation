import { defineConfig } from 'vite'
import react from '@vitejs.plugin-react'

export default defineConfig({
  plugins: [react()],
  root: 'uno',          // Указываем Vite, что проект находится в папке uno
  base: '/simulation/', // Название вашего репозитория на GitHub
  build: {
    outDir: '../dist',  // Куда складывать готовую сборку (наружу, в корень, чтобы GitHub Actions легко её нашёл)
    emptyOutDir: true,
  },
})

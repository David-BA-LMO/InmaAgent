import { defineConfig } from 'vite';

// https://vitejs.dev/config/
export default defineConfig({
  root: '.',           // raíz del proyecto
  base: '/',           // base path para rutas
  publicDir: 'public', // imágenes, favicon, etc.
  server: {
    port: 5173,
    open: true,        // abre el navegador al iniciar
  },
  build: {
    outDir: 'dist',    // carpeta de salida para producción
    emptyOutDir: true  // limpia el directorio antes de construir
  }
});
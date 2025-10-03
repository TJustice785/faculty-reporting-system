import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  // Base path for GitHub Pages project site: https://<user>.github.io/faculty-reporting-system/
  // Ensures assets resolve from /faculty-reporting-system/
  base: '/faculty-reporting-system/',
  server: {
    host: '0.0.0.0',
    port: 5173,
    strictPort: false,
    open: false,
    hmr: {
      overlay: true,
    },
    // Proxy API requests to the backend server during development
    proxy: {
      '/api': {
        target: 'http://localhost:5003',
        changeOrigin: true,
        secure: false,
      },
      '/uploads': {
        target: 'http://localhost:5003',
        changeOrigin: true,
        secure: false,
      },
    },
  },
  build: {
    outDir: 'build',
  },
  preview: {
    host: '0.0.0.0',
    port: 5181,
    strictPort: true,
  },
  esbuild: {
    // Treat JS and JSX inside src as JSX so both .js and .jsx are transformed
    include: /src\/.*\.(js|jsx)$/,
    loader: 'jsx',
  },
  optimizeDeps: {
    esbuildOptions: {
      // Allow JSX syntax in .js files within src during pre-bundling
      loader: {
        '.js': 'jsx',
      },
    },
  },
});

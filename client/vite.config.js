import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  // Base path; allow GitHub Pages subpath via env VITE_BASE_PATH
  base: process.env.VITE_BASE_PATH || '/',
  server: {
    host: '0.0.0.0',
    port: 3000,
    strictPort: false,
    open: false,
    hmr: {
      overlay: true,
    },
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
    outDir: 'dist',
    chunkSizeWarningLimit: 1200,
    rollupOptions: {
      output: {
        manualChunks: {
          react: ['react', 'react-dom'],
          vendor: ['axios', 'react-router-dom', 'react-bootstrap', 'chart.js']
        }
      }
    }
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

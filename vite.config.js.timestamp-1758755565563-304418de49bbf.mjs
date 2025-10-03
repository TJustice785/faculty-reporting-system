// vite.config.js
import { defineConfig } from "file:///C:/Users/JUSTICE/Downloads/New%20Assignment/faculty-reporting-system/client/node_modules/vite/dist/node/index.js";
import react from "file:///C:/Users/JUSTICE/Downloads/New%20Assignment/faculty-reporting-system/client/node_modules/@vitejs/plugin-react/dist/index.mjs";
var vite_config_default = defineConfig({
  plugins: [react()],
  server: {
    host: "0.0.0.0",
    port: 5173,
    strictPort: false,
    open: false,
    proxy: {
      "/api": {
        target: "http://localhost:5001",
        changeOrigin: true,
        secure: false
      }
    }
  },
  build: {
    outDir: "build"
  },
  preview: {
    host: "0.0.0.0",
    port: 5181,
    strictPort: true
  },
  esbuild: {
    // Treat JS and JSX inside src as JSX so both .js and .jsx are transformed
    include: /src\/.*\.(js|jsx)$/,
    loader: "jsx"
  },
  optimizeDeps: {
    esbuildOptions: {
      // Allow JSX syntax in .js files within src during pre-bundling
      loader: {
        ".js": "jsx"
      }
    }
  }
});
export {
  vite_config_default as default
};
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsidml0ZS5jb25maWcuanMiXSwKICAic291cmNlc0NvbnRlbnQiOiBbImNvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9kaXJuYW1lID0gXCJDOlxcXFxVc2Vyc1xcXFxKVVNUSUNFXFxcXERvd25sb2Fkc1xcXFxOZXcgQXNzaWdubWVudFxcXFxmYWN1bHR5LXJlcG9ydGluZy1zeXN0ZW1cXFxcY2xpZW50XCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ZpbGVuYW1lID0gXCJDOlxcXFxVc2Vyc1xcXFxKVVNUSUNFXFxcXERvd25sb2Fkc1xcXFxOZXcgQXNzaWdubWVudFxcXFxmYWN1bHR5LXJlcG9ydGluZy1zeXN0ZW1cXFxcY2xpZW50XFxcXHZpdGUuY29uZmlnLmpzXCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ltcG9ydF9tZXRhX3VybCA9IFwiZmlsZTovLy9DOi9Vc2Vycy9KVVNUSUNFL0Rvd25sb2Fkcy9OZXclMjBBc3NpZ25tZW50L2ZhY3VsdHktcmVwb3J0aW5nLXN5c3RlbS9jbGllbnQvdml0ZS5jb25maWcuanNcIjtpbXBvcnQgeyBkZWZpbmVDb25maWcgfSBmcm9tICd2aXRlJztcbmltcG9ydCByZWFjdCBmcm9tICdAdml0ZWpzL3BsdWdpbi1yZWFjdCc7XG4vLyBodHRwczovL3ZpdGVqcy5kZXYvY29uZmlnL1xuZXhwb3J0IGRlZmF1bHQgZGVmaW5lQ29uZmlnKHtcbiAgcGx1Z2luczogW3JlYWN0KCldLFxuICBzZXJ2ZXI6IHtcbiAgICBob3N0OiAnMC4wLjAuMCcsXG4gICAgcG9ydDogNTE3MyxcbiAgICBzdHJpY3RQb3J0OiBmYWxzZSxcbiAgICBvcGVuOiBmYWxzZSxcbiAgICBwcm94eToge1xuICAgICAgJy9hcGknOiB7XG4gICAgICAgIHRhcmdldDogJ2h0dHA6Ly9sb2NhbGhvc3Q6NTAwMScsXG4gICAgICAgIGNoYW5nZU9yaWdpbjogdHJ1ZSxcbiAgICAgICAgc2VjdXJlOiBmYWxzZSxcbiAgICAgIH0sXG4gICAgfSxcbiAgfSxcbiAgYnVpbGQ6IHtcbiAgICBvdXREaXI6ICdidWlsZCcsXG4gIH0sXG4gIHByZXZpZXc6IHtcbiAgICBob3N0OiAnMC4wLjAuMCcsXG4gICAgcG9ydDogNTE4MSxcbiAgICBzdHJpY3RQb3J0OiB0cnVlLFxuICB9LFxuICBlc2J1aWxkOiB7XG4gICAgLy8gVHJlYXQgSlMgYW5kIEpTWCBpbnNpZGUgc3JjIGFzIEpTWCBzbyBib3RoIC5qcyBhbmQgLmpzeCBhcmUgdHJhbnNmb3JtZWRcbiAgICBpbmNsdWRlOiAvc3JjXFwvLipcXC4oanN8anN4KSQvLFxuICAgIGxvYWRlcjogJ2pzeCcsXG4gIH0sXG4gIG9wdGltaXplRGVwczoge1xuICAgIGVzYnVpbGRPcHRpb25zOiB7XG4gICAgICAvLyBBbGxvdyBKU1ggc3ludGF4IGluIC5qcyBmaWxlcyB3aXRoaW4gc3JjIGR1cmluZyBwcmUtYnVuZGxpbmdcbiAgICAgIGxvYWRlcjoge1xuICAgICAgICAnLmpzJzogJ2pzeCcsXG4gICAgICB9LFxuICAgIH0sXG4gIH0sXG59KTtcbiJdLAogICJtYXBwaW5ncyI6ICI7QUFBNlosU0FBUyxvQkFBb0I7QUFDMWIsT0FBTyxXQUFXO0FBRWxCLElBQU8sc0JBQVEsYUFBYTtBQUFBLEVBQzFCLFNBQVMsQ0FBQyxNQUFNLENBQUM7QUFBQSxFQUNqQixRQUFRO0FBQUEsSUFDTixNQUFNO0FBQUEsSUFDTixNQUFNO0FBQUEsSUFDTixZQUFZO0FBQUEsSUFDWixNQUFNO0FBQUEsSUFDTixPQUFPO0FBQUEsTUFDTCxRQUFRO0FBQUEsUUFDTixRQUFRO0FBQUEsUUFDUixjQUFjO0FBQUEsUUFDZCxRQUFRO0FBQUEsTUFDVjtBQUFBLElBQ0Y7QUFBQSxFQUNGO0FBQUEsRUFDQSxPQUFPO0FBQUEsSUFDTCxRQUFRO0FBQUEsRUFDVjtBQUFBLEVBQ0EsU0FBUztBQUFBLElBQ1AsTUFBTTtBQUFBLElBQ04sTUFBTTtBQUFBLElBQ04sWUFBWTtBQUFBLEVBQ2Q7QUFBQSxFQUNBLFNBQVM7QUFBQTtBQUFBLElBRVAsU0FBUztBQUFBLElBQ1QsUUFBUTtBQUFBLEVBQ1Y7QUFBQSxFQUNBLGNBQWM7QUFBQSxJQUNaLGdCQUFnQjtBQUFBO0FBQUEsTUFFZCxRQUFRO0FBQUEsUUFDTixPQUFPO0FBQUEsTUFDVDtBQUFBLElBQ0Y7QUFBQSxFQUNGO0FBQ0YsQ0FBQzsiLAogICJuYW1lcyI6IFtdCn0K

import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// 开发模式代理到本地 amm ui 服务器（默认 8787，可用 AMM_PORT 覆盖）
const target = `http://127.0.0.1:${process.env.AMM_PORT || 8787}`;

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': { target, changeOrigin: false },
    },
  },
  build: {
    outDir: 'dist',
    chunkSizeWarningLimit: 600,
  },
});

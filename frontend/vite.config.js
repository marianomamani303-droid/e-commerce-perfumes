import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
export default defineConfig(({ mode }) => ({
  plugins: [react()],
  ...(mode === 'demo'
    ? { define: { 'import.meta.env.VITE_DEMO_MODE': JSON.stringify('true') } }
    : {}),
  server: {
    host: '127.0.0.1',
    proxy: { '/api': 'http://127.0.0.1:3000', '/uploads': 'http://127.0.0.1:3000' },
  },
}));

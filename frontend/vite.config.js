import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), 'VITE_');
  const apiTarget = env.VITE_API_PROXY || 'http://127.0.0.1:3000';
  return {
    plugins: [react()],
    ...(mode === 'demo'
      ? { define: { 'import.meta.env.VITE_DEMO_MODE': JSON.stringify('true') } }
      : {}),
    server: {
      host: '127.0.0.1',
      proxy: { '/api': apiTarget, '/uploads': apiTarget },
    },
  };
});

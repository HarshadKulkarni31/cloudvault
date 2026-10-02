import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    // During local development, proxy API requests to avoid CORS issues
    // when testing with a deployed backend. Remove in production.
  },
});

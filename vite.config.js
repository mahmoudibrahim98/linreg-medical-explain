import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// `base` makes asset paths resolve correctly on GitHub Pages
// (https://<user>.github.io/<repo>/). Override with VITE_BASE for other hosts.
export default defineConfig({
  plugins: [react()],
  base: process.env.VITE_BASE ?? '/linreg-medical-explain/',
});

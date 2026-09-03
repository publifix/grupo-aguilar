import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';
import sitemap from '@astrojs/sitemap';

// Custom domain via GitHub Pages: https://grupoaguilar.com.mx/
export default defineConfig({
  site: 'https://grupoaguilar.com.mx',
  base: '/',
  integrations: [sitemap()],
  vite: {
    plugins: [tailwindcss()],
  },
});

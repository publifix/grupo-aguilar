import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';
import sitemap from '@astrojs/sitemap';

// Project site on GitHub Pages: https://publifix.github.io/grupo-aguilar/
export default defineConfig({
  site: 'https://publifix.github.io',
  base: '/grupo-aguilar',
  integrations: [sitemap()],
  vite: {
    plugins: [tailwindcss()],
  },
});

import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';

// Project site on GitHub Pages: https://publifix.github.io/grupo-aguilar/
export default defineConfig({
  site: 'https://publifix.github.io',
  base: '/grupo-aguilar',
  vite: {
    plugins: [tailwindcss()],
  },
});

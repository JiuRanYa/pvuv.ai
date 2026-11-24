import { defineConfig } from 'vite';
import tailwind from '@tailwindcss/postcss';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import { feature } from 'topojson-client';
import { geoNaturalEarth1, geoPath } from 'd3-geo';

const resolve = path => fileURLToPath(new URL(path, import.meta.url));
const require = createRequire(import.meta.url);
const pages = ['site', 'sites', 'visitor', 'public', 'health', 'login'];

// Project once during the build. Browsers receive just the country codes and paths.
const countryPaths = {
  name: 'dashboard-country-paths',
  resolveId(id) { if (id === 'virtual:country-paths') return '\0' + id; },
  load(id) {
    if (id !== '\0virtual:country-paths') return;
    const atlas = require('world-atlas/countries-110m.json');
    const iso = require('i18n-iso-countries');
    const world = feature(atlas, atlas.objects.countries);
    world.features = world.features.filter(c => c.properties.name !== 'Antarctica');
    const project = geoPath(geoNaturalEarth1().fitExtent([[2, 2], [598, 310]], world)).digits(1);
    return 'export default ' + JSON.stringify(world.features.map(c => ({
      code: iso.numericToAlpha2(c.id) || (c.properties.name === 'Kosovo' ? 'XK' : ''),
      name: c.properties.name, path: project(c),
    })));
  },
};

export default defineConfig({
  root: resolve('./'),
  publicDir: resolve('../workers/console/public'),
  plugins: [countryPaths],
  css: { postcss: { plugins: [tailwind({ base: resolve('./src') })] } },
  esbuild: { jsx: 'automatic' },
  server: { proxy: { '/api': 'http://127.0.0.1:8787' } },
  build: {
    outDir: resolve('../workers/console/dist'),
    emptyOutDir: true,
    rollupOptions: { input: pages.map(name => resolve(name + '.html')) },
  },
});

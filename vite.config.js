import { defineConfig } from 'vite'
import { svelte } from '@sveltejs/vite-plugin-svelte'
import UnoCSS from 'unocss/vite';
import { presetWarp } from '@warp-ds/uno';
import { classes } from '@warp-ds/css/component-classes/classes';
import topLevelAwait from "vite-plugin-top-level-await";

// https://vitejs.dev/config/
export default defineConfig({
  build: {
    target: 'esnext',
  },
  plugins: [
    svelte(),
    UnoCSS({
      presets: [presetWarp()],
      safelist: classes,
    }),
    topLevelAwait({
      // The export name of top-level await promise for each chunk module
      promiseExportName: "__tla",
      // The function to generate import names of top-level await promise in each chunk module
      promiseImportName: i => `__tla_${i}`
    }),
  ],
  svelte: {
    template: {
      compilerOptions: {
        isCustomElement: (tag) => tag.includes('-example') || tag.includes('w-breadcrumbs') || tag.includes('w-card') || tag.includes('w-box'),
      },
    },
  },
})
# Dataviz contrast

Size matters. Small elements need higher contrast than large elements.

This is the code for the tool at https://datavizcontrast.com/. Choose two colours to get the APCA lightness contrast, and see the minimum pixel size for shapes such as lines and bars.

## About this tool
Choose two colours to get the APCA lightness contrast, and see the minimum pixel size for shapes such as lines and bars.

The circles in the background demonstrate the smallest possible px sizes.

## What is APCA?
The Advanced Perceptual Contrast Algorithm [APCA](https://git.apcacontrast.com/documentation/APCAeasyIntro) is a method used to determine the readability of text and graphics. APCA takes human perception into account and corrects some of the faults in the current WCAG 2 contrast algorithm.

APCA measures lightness contrast as a value from Lc 0 (no contrast) to Lc 106 (maximum contrast). The contrast requirements on this page are extracted from [](https://github.com/Myndex/SAPC-APCA/discussions/39)the Non-Text Minimums table (image)](https://github.com/Myndex/SAPC-APCA/discussions/39) from Myndex, marked "Preliminary – Feb 2, 2022".

APCA might be included in WCAG 3, but is still in development and subject to changes.

The page was built using [APCA-3](https://www.npmjs.com/package/apca-w3), [colorParsley](https://github.com/Myndex/colorparsley/), [Name that Color](https://chir.ag/projects/ntc/), [Chroma.js](https://www.npmjs.com/package/chroma-js), [Svelte](https://svelte.dev/), and [WARP](https://warp-ds.github.io/tech-docs/).

## To run locally
Install:
`npm install`

Run dev:
`npm run dev`

Build to the /dist folder:
`npm run build`

NB: the files in /dist will probably not run locally as they need to be at the root directory. For hosting, uploaded to https://www.proisp.no/controlpanel/.

## History
Set up with Vite and Svelte:
`npm create vite@latest vite-svelte --template svelte`

And Warp:
`npm install unocss @warp-ds/uno @warp-ds/css`

This was originally a repo for WARP tokens, but removed all the token stuff for this repo.
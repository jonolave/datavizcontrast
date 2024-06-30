# Dataviz contrast

Web site at https://datavizcontrast.com/

## Live web page
The project is built to the `/dist` folder, put in the `gh-pages` branch, which is published to Github pages. 
This happens automatically through Github Actions.

## To run locally
Install:
`npm install`

Run dev:
`npm run dev`

Build to the /dist folder:
`npm run build`

NB: the files in /dist will probably not run locally as they need to be at the root directory. For hosting, manually upload to https://www.proisp.no/controlpanel/

## History
Set up with Vite and Svelte:
`npm create vite@latest vite-svelte --template svelte`

And Warp:
`npm install unocss @warp-ds/uno @warp-ds/css`

This was originally a repo for WARP tokens, but removed all the token stuff for this repo.
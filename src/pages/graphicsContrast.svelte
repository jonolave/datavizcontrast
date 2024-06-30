<script>
  import "@warp-ds/elements";
  import chroma from "chroma-js";
  import { onMount, onDestroy } from "svelte";

  import {
    APCAcontrast,
    reverseAPCA,
    sRGBtoY,
    displayP3toY,
    adobeRGBtoY,
    alphaBlend,
    calcAPCA,
    fontLookupAPCA,
  } from "apca-w3";
  import { colorParsley, colorToHex, colorToRGB } from "colorparsley";
  import { checkColors } from "../lib/color-checker.js";

  let contrastDemands = [
    { Lc: 100, Size: "&lt; 1", LineThickness: 0.7 },
    { Lc: 90, Size: "1", LineThickness: 1 },
    { Lc: 75, Size: "1.5", LineThickness: 1.5 },
    { Lc: 60, Size: "2", LineThickness: 2 },
    { Lc: 50, Size: "3", LineThickness: 3 },
    { Lc: 45, Size: "4", LineThickness: 4 },
    { Lc: 30, Size: "6", LineThickness: 6 },
    { Lc: 25, Size: "8", LineThickness: 8 },
    { Lc: 20, Size: "10", LineThickness: 10 },
    { Lc: 15, Size: "15", LineThickness: 15 },
  ];

  // Random colours on refresh
  let backgroundColor = chroma.random().hex().toUpperCase();
  let foregroundColor =
    chroma.contrast(backgroundColor, "white") > 4.5 ? "#FFFFFF" : "#000000";

  // Colour for drop shadow based on background colour
  $: darkerBackgroundColor = chroma(backgroundColor).darken(2).alpha(0.3).css();

  function newRandomColours() {
    backgroundColor = chroma.random().hex().toUpperCase();
    foregroundColor =
      chroma.contrast(backgroundColor, "white") > 4.5 ? "#FFFFFF" : "#000000";
    dots = generateDots();
  }

  function swapColours() {
    let previousBackground = backgroundColor;
    backgroundColor = foregroundColor;
    foregroundColor = previousBackground;
  }

  let backgroundIsValid = true;
  let foregroundIsValid = true;

  // WCAG contrast, check only if valid colours
  $: wcagContrast =
    foregroundIsValid && backgroundIsValid
      ? checkColors(foregroundColor, backgroundColor).contrast
      : wcagContrast;

  // APCA contrast, check only if valid colours
  // https://www.npmjs.com/package/apca-w3
  $: Lc =
    foregroundIsValid && backgroundIsValid
      ? Math.round(
          Math.abs(
            // @ts-ignore
            APCAcontrast(
              sRGBtoY(colorParsley(foregroundColor)),
              sRGBtoY(colorParsley(backgroundColor))
            )
          )
        )
      : Lc;

  // Prepare list
  let sortedDemands = [...contrastDemands].sort((a, b) => b.Lc - a.Lc);

  // Find smallest pixel size to use if valid colours
  $: demand =
    foregroundIsValid && backgroundIsValid
      ? (sortedDemands.find((demand) => demand.Lc <= Lc) || { Size: "No" }).Size
      : 100;

  function handleForegroundInput(event) {
    // check if valid colour
    if (chroma.valid(event.detail.value)) {
      foregroundColor = chroma(event.detail.value).hex();
      foregroundIsValid = true;
    } else {
      foregroundIsValid = false;
    }
  }

  function handleBackgroundInput(event) {
    if (chroma.valid(event.detail.value)) {
      backgroundColor = chroma(event.detail.value).hex();
      backgroundIsValid = true;
    } else {
      backgroundIsValid = false;
    }
  }

  // SVG size
  let svgElement;
  let svgWidth;
  let svgHeight;

  let dots = []; // Initialize an empty array for dots
  let dotSizes = [1, 1.5, 2, 3, 4, 6, 8, 10, 15, 20];
  let dotAreas = dotSizes.map((size) => Math.PI * Math.pow(size, 2));
  let targetArea = (window.innerWidth * 400) / 150; // square px area to cover per dot size
  let dotsNeeded = dotAreas.map((area) => Math.ceil(targetArea / area));

  // Function to generate random positions for each dot, considering dotsNeeded
  const generateDots = () => {
    let newDots = [];
    dotSizes.forEach((size, index) => {
      for (let i = 0; i < dotsNeeded[index]; i++) {
        newDots.push({
          cx: Math.random() * svgWidth,
          cy: Math.random() * svgElement.clientHeight, // Fixed height of 400px
          r: size, // Example radius calculation
        });
      }
    });
    return newDots;
  };

  // Reactive statement to update dots when svgWidth changes
  $: if (svgWidth) {
    targetArea = svgWidth * svgHeight / 150;
    dots = generateDots();
  }

  $: if (svgHeight) {
    targetArea = svgWidth * svgHeight / 150;
    dots = generateDots();
  }

  // Update svgWidth and svgHeight based on the actual dimensions of the SVG element
  const updateDimensions = () => {
    svgWidth = svgElement.clientWidth;
    svgHeight = svgElement.clientHeight;
    // console.log('SVG Dimensions:', svgWidth, 'x', svgHeight);
  };

  // Add event listener to window resize to update width

  onMount(() => {
    updateDimensions(); // Initial dimensions update

    const resizeObserver = new ResizeObserver((entries) => {
      for (let entry of entries) {
        if (entry.target === svgElement) {
          updateDimensions(); // Update dimensions based on the observed changes
        }
      }
    });

    resizeObserver.observe(svgElement);

    return () => {
      resizeObserver.disconnect();
    };
  });
</script>
<!-- Black banner -->
<div class="s-bg-inverted px-8 pt-8 pb-4">
  <h1 class="t4 text-left s-text-inverted">APCA Dataviz Contrast Checker</h1>
</div>
<!-- Container for SVG and input box -->
<div class="top-container border-b-2" style="background-color: {backgroundColor};">
  <!-- SVG with dots -->
  <svg bind:this={svgElement} width="100%" height="100%">
    <rect width="100%" height="100%" fill={backgroundColor}></rect>

    {#each dots as { cx, cy, r }}
      {#if demand === "&lt; 1" || r >= parseFloat(demand)}
        <circle {cx} {cy} {r} fill={foregroundColor} />
      {/if}
    {/each}
  </svg>

  <!-- Full width container for Input box -->
  <div class="flex items-center justify-center min-w-144 px-80 py-96">
    <!-- Input box -->
    <w-box bordered={true} class="inputbox w-fit z-10 rounded-8" style="box-shadow: 0px 6px 12px 0px {darkerBackgroundColor};">
      <h2 class="t3">Choose colours</h2>
      <!-- Input fields -->
      <div class="flex flex-wrap gap-x-24 gap-y-8 mb-24">
        <w-textfield
          full-width
          label="Foreground colour"
          invalid={!foregroundIsValid}
          help-text={foregroundIsValid
            ? "Enter colour name or HEX code"
            : "Not a valid colour"}
          class="mt-16"
          value={foregroundColor}
          on:change={handleForegroundInput}
        >
        </w-textfield>

        <w-textfield
          label="Background colour"
          invalid={!backgroundIsValid}
          help-text={backgroundIsValid
            ? "Enter colour name or HEX code"
            : "Not a valid colour"}
          class="mt-16"
          value={backgroundColor}
          on:change={handleBackgroundInput}
        >
        </w-textfield>
      </div>
      <!-- Buttons -->
      <div class="flex flex-wrap gap-16">
        <w-button variant="primary" on:click={newRandomColours}
          >Random colours</w-button
        >
        <w-button full-width variant="secondary" on:click={swapColours}
          >Swap colours</w-button
        >
      </div>
    </w-box>
  </div>
</div>

<!-- Result container -->
<main class="flex flex-col items-center justify-center">

  <!-- Result in numbers, container for 3 boxes -->
  <div class="flex flex-wrap justify-center gap-x-16 gap-y-16 w-full -mt-40">
    <!-- 1: Lc -->
    <w-box bordered={true} class="min-w-[180]">
      <p>APCA contrast:</p>
      <span class="t1">{Lc} Lc</span>
    </w-box>
    <!-- 2: WCAG -->
    <w-box bordered={true} class="min-w-[180]">
      <p>WCAG contrast:</p>
      {#if wcagContrast >= 3}
        <div class="flex gap-8">
          <span class="t1">{wcagContrast} : 1</span>
          <img class="h-24 mt-8" src="/green_check.svg" alt="Green check" />
        </div>
      {:else}
        <div class="flex gap-8">
          <span class="t1">{wcagContrast} : 1</span>
          <img class="h-24 mt-8" src="/red_cross.svg" alt="Red cross" />
        </div>
      {/if}
    </w-box>
   <!-- 3: min size -->
    <w-box bordered={true} class="min-w-[180]">
      <p>Minimum size:</p>
      {#if foregroundIsValid && backgroundIsValid}
        <span class="t1">{@html demand} px</span>
      {:else}{/if}
    </w-box>
  </div>

  <!-- Table -->
  <table class="table-auto my-32 w-full md:w-3/4">
    <thead>
      <tr>
        <th class="text-right">Size</th>
        <th class="text-right pr-16">Lc required</th>
        <th class="pr-16">APCA</th>
        <th class="text-center px-16">Example</th>
      </tr>
    </thead>
    <tbody>
      {#each contrastDemands as item (item.Lc)}
        <tr>
          <!-- Px size -->
          <td class="text-right -pr-16 py-16">{@html item.Size} px</td>
          <!-- LC demand -->
          <td class="text-right pr-16">{item.Lc} Lc</td>
          <!-- APCA -->
          <td class="flex justify-center items-center pr-8 py-16">
            {#if Lc < item.Lc}
              <img class="h-24" src="/red_cross.svg" alt="Red cross" />
            {:else}
              <img class="h-24" src="/green_check.svg" alt="Green check" />
            {/if}
          </td>
          <td>
            <div
              class="cell px-16 py-16 mx-16 rounded-8"
              style="background-color: {backgroundColor};"
            >
              <!-- Line -->
              <div
                class="cell::before"
                style="border-top-width: {item.LineThickness}px; border-top-color: {foregroundColor};"
              ></div>
            </div>
          </td>
        </tr>
      {/each}
    </tbody>
  </table>
  <h2 class="t2 mb-16 mt-24">About APCA contrast</h2>
  <p class="w-full pb-8">
    The <a href="https://git.apcacontrast.com/documentation/APCAeasyIntro"
      >Advanced Perceptual Contrast Algorithm (APCA)</a
    >
    measures lightness contrast as a value from Lc 0 (no contrast) to Lc 106 (maximum
    contrast).
  </p>
  <p class="w-full pb-8">
    APCA™ is the candidate contrast method for WCAG 3, and is currently in
    public beta. WCAG 3 is still in development and subject to changes prior to
    adoption.
  </p>
  <p class="w-full pb-8">
    The contrast requirements above are extracted from
    <a href="https://github.com/Myndex/SAPC-APCA/discussions/39"
      >the Non-Text Minimums table (image)</a
    > from Myndex, marked "Preliminary – Feb 2, 2022".
  </p>
  <p class="w-full pb-8">
    For text there are several APCA contrast checkers available:
    <a
      href="https://www.achecks.org/apca-wcag-3-accessible-colour-contrast-checker/"
      >achecks</a
    >, <a href="https://contrast.tools/">contrast.tools</a> and
    <a href="https://www.myndex.com/APCA/">myndex</a>. In Figma, you can for
    example use the plugins
    <a href="https://www.figma.com/community/plugin/748533339900865323/contrast"
      >Contrast</a
    >
    or
    <a
      href="https://www.figma.com/community/plugin/1281280685402026529/polychrome"
      >Polychrome</a
    > to check APCA contrast.
  </p>

  <p class="w-full pb-8">
    This page was built using
    <a href="https://www.npmjs.com/package/apca-w3">APCA-3</a>,
    <a href="https://warp-ds.github.io/tech-docs/">WARP</a>,
    <a href="https://svelte.dev/">Svelte</a>, and
    <a href="https://www.npmjs.com/package/chroma-js">Chroma.js</a>.
  </p>
</main>

<style>
  main {
    padding: 16px;
    margin: auto;
    max-width: 700px;
    height: 100%;
  }

  .cell {
    position: relative;
    background-color: lightgray;
  }

  .cell::before {
    content: "";
    position: absolute;
    left: 0;
    right: 0;
    top: 50%;
    transform: translateY(-50%);
    border-top-style: solid;
  }

  tr {
    border-bottom: 1px solid #000;
    border-color: var(--w-s-color-border);
    padding-top: 12px;
    padding-bottom: 12px;
  }

  a {
    text-decoration: underline;
    text-decoration-style: dotted;
  }
  .top-container {
    position: relative;
    height: 100%; /* Adjust based on your SVG size */
    width: 100%;
  }

  .inputbox {
    /*  box-shadow: 0px 6px 12px 0px #00000022; */
  }

  svg {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
  }
</style>

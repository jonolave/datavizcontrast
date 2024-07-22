<script>
  import "@warp-ds/elements";
  import chroma from "chroma-js";
  import { onMount, onDestroy } from "svelte";
  import { tick } from "svelte";

  import { APCAcontrast, sRGBtoY } from "apca-w3";
  import { colorParsley } from "colorparsley";
  // import colorNamer from "color-namer"; // no longer in use since names were not so good
  import { checkColors } from "./lib/color-checker.js";
  import { ntc } from "./lib/ntc.js";

  // Parse URL Query Parameters
  function applyColorsFromUrl() {
    const params = new URLSearchParams(window.location.search);
    const fgColor = params.get("foregroundColor");
    const bgColor = params.get("backgroundColor");

    if (fgColor && chroma.valid(fgColor)) {
      foregroundColor = fgColor;
      // console.log("Foreground color from URL:", fgColor);
    }
    if (bgColor && chroma.valid(bgColor)) {
      backgroundColor = bgColor;
      // console.log("Background color from URL:", bgColor);
    }
  }

  // Colours on refresh
  let backgroundColor = "#EAC305";
  let foregroundColor = "#000000";

  // Apply colors from URL if available
  applyColorsFromUrl();

  // Handle info box visibility
  let infoIsHidden = false;

  function toggleInfoVisibility() {
    infoIsHidden = !infoIsHidden;
  }

  // Handle small screen
  let smallScreen = false;

  function checkScreenWidth() {
    smallScreen = window.innerWidth < 950;
    if (smallScreen) {
      console.log("Small screen detected");
    }
  }

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

  // Update URL with query parameters
  function updateUrlWithColors() {
    const params = new URLSearchParams(window.location.search);
    params.set("foregroundColor", foregroundColor);
    params.set("backgroundColor", backgroundColor);
    window.history.replaceState(
      {},
      "",
      `${window.location.pathname}?${params.toString()}`
    );
  }

  // Watch for changes in colors to update the URL
  $: updateUrlWithColors();

  // Use Name That Colour to get the closest color name
  $: backgroundColorNames = ntc.name(backgroundColor);
  $: foregroundColorNames = ntc.name(foregroundColor);

  // Function to capitalize the first letter
  const capitalizeFirstLetter = (str) =>
    str.charAt(0).toUpperCase() + str.slice(1);

  $: backgroundColorName = capitalizeFirstLetter(backgroundColorNames[1]);
  $: foregroundColorName = capitalizeFirstLetter(foregroundColorNames[1]);

  // let backgroundColor = chroma.random().hex().toUpperCase();
  // let foregroundColor =
  chroma.contrast(backgroundColor, "white") > 4.5 ? "#FFFFFF" : "#000000";

  // Colour for drop shadow based on background colour
  $: darkerBackgroundColor = chroma(backgroundColor).darken(2).alpha(0.3).css();

  async function newRandomColours() {
    backgroundColor = chroma.random().hex().toUpperCase();
    foregroundColor =
      chroma.contrast(backgroundColor, "white") > 4.5 ? "#FFFFFF" : "#000000";

    // Reset validation states
    foregroundIsValid = true;
    backgroundIsValid = true;

    await forceReRenderDots(); // Force re-render with new dots
    updateInputFields(); // Manually update input fields
    updateUrlWithColors(); // Update the URL
  }

  async function swapColours() {
    let previousBackground = backgroundColor;
    backgroundColor = foregroundColor;
    foregroundColor = previousBackground;

    // Reset validation states
    foregroundIsValid = true;
    backgroundIsValid = true;

    await forceReRenderDots();
    updateInputFields(); // Manually update input fields
    updateUrlWithColors(); // Update the URL
  }

  function updateInputFields() {
    document.querySelector("#foregroundColor").value = foregroundColor;
    document.querySelector("#backgroundColor").value = backgroundColor;
  }

  let backgroundIsValid = true;
  let foregroundIsValid = true;

  // Foreground colour input fields
  function validateForegroundColor(value) {
    // console.log("Validating foreground color:", value);
    try {
      const color = chroma(value).hex(); // Convert color name to hex
      if (chroma.valid(color)) {
        foregroundColor = color;
        foregroundIsValid = true;
        forceReRenderDots(); // Force re-render with new color
        updateUrlWithColors(); // Update the URL
      } else {
        foregroundIsValid = false;
      }
    } catch (error) {
      foregroundIsValid = false;
      // console.error("Invalid foreground color:", value, error);
    }
    updateInputFields();
  }

  function handleForegroundBlur(event) {
    validateForegroundColor(event.target.value);
  }

  function handleForegroundKeydown(event) {
    if (event.key === "Enter") {
      validateForegroundColor(event.target.value);
    }
  }

  // Background colour input fields
  function validateBackgroundColor(value) {
    try {
      const color = chroma(value).hex(); // Convert color name to hex
      if (chroma.valid(color)) {
        backgroundColor = color;
        backgroundIsValid = true;
        forceReRenderDots(); // Force re-render with new color
        updateUrlWithColors(); // Update the URL
      } else {
        backgroundIsValid = false;
      }
    } catch (error) {
      backgroundIsValid = false;
      console.error("Invalid background color:", value, error);
    }
    updateInputFields();
  }

  function handleBackgroundBlur(event) {
    validateBackgroundColor(event.target.value);
  }

  function handleBackgroundKeydown(event) {
    if (event.key === "Enter") {
      validateBackgroundColor(event.target.value);
    }
  }

  let wcagContrast = 0; // Initial value for wcagContrast
  let Lc = 0; // Initial value for Lc

  // WCAG contrast, check only if valid colours
  $: if (foregroundIsValid && backgroundIsValid) {
    wcagContrast = checkColors(foregroundColor, backgroundColor).contrast;
  } else {
    wcagContrast = 0; // or another default value indicating invalid contrast
  }

  // APCA contrast, check only if valid colours
  // https://www.npmjs.com/package/apca-w3
  $: if (foregroundIsValid && backgroundIsValid) {
    Lc = Math.round(
      Math.abs(
        APCAcontrast(
          sRGBtoY(colorParsley(foregroundColor)),
          sRGBtoY(colorParsley(backgroundColor))
        )
      )
    );
  } else {
    Lc = 0;
  }

  // Prepare list
  let sortedDemands = [...contrastDemands].sort((a, b) => b.Lc - a.Lc);

  // Find smallest pixel size to use if valid colours
  $: demand =
    foregroundIsValid && backgroundIsValid
      ? (sortedDemands.find((demand) => demand.Lc <= Lc) || { Size: "No" }).Size
      : 100;

  // New input fields

  function handleForegroundInput(event) {
    const value = event.target.value;
    validateForegroundColor(value);
  }

  function handleBackgroundInput(event) {
    const value = event.target.value;
    validateBackgroundColor(value);
  }

  // SVG size
  let svgElement;
  let svgWidth;
  let svgHeight;

  let dots = []; // Initialize an empty array for dots
  let redrawCounter = 0; // A counter to force redraw
  let dotSizes = [1, 1.5, 2, 3, 4, 6, 8, 10, 15, 20];
  let dotAreas = dotSizes.map((size) => Math.PI * Math.pow(size, 2));
  let targetArea = (window.innerWidth * 400) / 200; // square px area to cover per dot size
  let dotsNeeded = dotAreas.map((area) => Math.ceil(targetArea / area));

  // Function to generate random positions for each dot, considering dotsNeeded
  const generateDots = () => {
    let newDots = [];
    redrawCounter++;
    dotSizes.forEach((size, index) => {
      for (let i = 0; i < dotsNeeded[index]; i++) {
        newDots.push({
          cx: Math.random() * svgWidth,
          cy: Math.random() * svgElement.clientHeight, // Fixed height of 400px
          r: size, // Example radius calculation
          id: `dot-${redrawCounter}-${i}-${size}`,
        });
      }
    });
    return newDots;
  };

  // Function to force a re-render of the dots with a brief empty state
  const forceReRenderDots = async () => {
    dots = []; // Clear the dots array
    await tick(); // Wait for the next DOM update cycle
    dots = generateDots(); // Set dots to the newly generated dots
  };

  // Reactive statement to update dots when svgWidth changes
  $: if (svgWidth && svgHeight && redrawCounter) {
    targetArea = (svgWidth * svgHeight) / 150;
    dots = generateDots();
    checkScreenWidth();
  }

  // Update svgWidth and svgHeight based on the actual dimensions of the SVG element
  const updateDimensions = () => {
    svgWidth = svgElement.clientWidth;
    svgHeight = svgElement.clientHeight;
    // console.log('SVG Dimensions:', svgWidth, 'x', svgHeight);
  };

  onMount(() => {
    applyColorsFromUrl();
    updateInputFields();
    forceReRenderDots();
    checkScreenWidth();

    updateDimensions(); // Initial dimensions update
    dots = generateDots(); // Initial dots generation

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

<!-- Black info box -->
<div
  class="blackblurbox absolute top-16 left-16 z-30 rounded-8 pl-40 pr-16 py-40 flex flex-col"
  class:w-[500]={!infoIsHidden && !smallScreen}
  class:right-16={!infoIsHidden && smallScreen}
  class:bottom-16={!infoIsHidden}
  class:w-[88]={infoIsHidden}
  class:h-[88]={infoIsHidden}
  style="box-shadow: 0px 4px 8px 0px {darkerBackgroundColor};"
>
  <!-- Heading and close btn -->
  <div class="flex pr-8 justify-between">
    <h1 class="merriweather-font text-xxl md:text-xxxl s-text-inverted">
      {#if !infoIsHidden}
        The Dataviz Contrast Tool
      {/if}
    </h1>

    <!-- Close and open info panel button -->
    <button
      class="icon-button p-8 -mt-16 w-40 h-40 rounded flex items-center justify-center"
      class:-ml-16={infoIsHidden}
      on:click={toggleInfoVisibility}
    >
      <span class="material-icons">
        {#if !infoIsHidden}
          close
        {:else}
          question_mark
        {/if}
      </span>
    </button>
  </div>

  {#if !infoIsHidden}
    <!-- Scrollable info box content below headline -->
    <div
      class="space-y-24 divide-y custom-divider s-text-inverted overflow-y-auto flex-1 gradientmask pt-24 pr-24"
    >
      <p class="text-preamble">
        Size matters. Small elements need higher contrast than large elements.
      </p>

      <div class="pt-24 space-y-12">
        <h2 class="merriweather-font text-l">About this tool</h2>
        <p>
          Choose two colours to get the APCA lightness contrast, and see the
          minimum pixel size for shapes such as lines and bars.
        </p>
        <p>
          The circles in the background demonstrate the smallest possible px
          sizes.
        </p>
      </div>

      <div class="pt-24 space-y-12">
        <h2 class="merriweather-font text-l">What is APCA?</h2>
        <p>
          The Advanced Perceptual Contrast Algorithm <a
            href="https://git.apcacontrast.com/documentation/APCAeasyIntro"
            >(APCA)</a
          >
          is a method used to determine the readability of text and graphics. APCA
          takes human perception into account and corrects some of the faults in
          the current WCAG 2 contrast algorithm.
        </p>
        <p>
          APCA measures lightness contrast as a value from Lc 0 (no contrast) to
          Lc 106 (maximum contrast). The contrast requirements on this page are
          extracted from
          <a href="https://github.com/Myndex/SAPC-APCA/discussions/39"
            >the Non-Text Minimums table (image)</a
          > from Myndex, marked "Preliminary – Feb 2, 2022".
        </p>
        <p>
          APCA might be included in WCAG 3, but is still in development and
          subject to changes.
        </p>
      </div>

      <div class="pt-24 space-y-12">
        <h2 class="merriweather-font text-l">Who made this?</h2>
        <p>
          <img
            class="float-left h-80 mr-12 mb-12 rounded-full"
            src="/jonolaveikenes.jpg"
            alt="Portrait of Jon Olav Eikenes, a white man with grey hair, glasses and short beard"
          />
          This tool is made by Jon Olav Eikenes, a Norwegian information designer
          in the design system team at
          <a href="https://schibsted.com/">Schibsted Marketplaces</a>.
        </p>
        <p>
          In Schibsted Marketplaces, we have used APCA for developing an
          accessible colour palette. For text contrast there are several APCA
          contrast checkers available, but we did not find one specifically for
          visual elements. So we made our own. Feel free to <a href="https://www.linkedin.com/in/jonolave/">reach out</a> if you
          have feedback or questions!
        </p>
        <p>
          This page was built using
          <a href="https://www.npmjs.com/package/apca-w3">APCA-3</a>,
          <a href="https://github.com/Myndex/colorparsley/">colorParsley</a>,
          <a href="https://chir.ag/projects/ntc/">Name that Color</a>,
          <a href="https://www.npmjs.com/package/chroma-js">Chroma.js</a>,
          <a href="https://svelte.dev/">Svelte</a>, and
          <a href="https://warp-ds.github.io/tech-docs/">WARP</a>.
        </p>
        <p class="pt-64">.</p>
      </div>
    </div>
  {/if}
</div>

<!-- Container for main content -->
<main
  class="h-full relative flex flex-col justify-start items-center z-20 mt-30 pt-40 overflow-y-scroll transition-all duration-500 ease-in-out"
  class:ml-[516]={!infoIsHidden && !smallScreen}
  class:ml-0={infoIsHidden || smallScreen}
>
  <!-- Input box -->
  <div
    class="whiteblurbox w-fit z-10 rounded-8 mx-16 md:mx-24 my-[140] p-24 md:p-40"
    class:hidden={!infoIsHidden && smallScreen}
    style="box-shadow: 0px 4px 8px 0px {darkerBackgroundColor};"
  >
    <h2 class="merriweather-font text-xl">Choose colours</h2>
    <p>Enter colour name or HEX code</p>
    <!-- Input fields -->
    <div class="flex flex-wrap gap-x-24 gap-y-8 mb-24">
      <!-- Input foreground -->
      <div class="input-group flex flex-col mt-16">
        <label class="font-bold text-caption" for="foregroundColor"
          >Foreground colour</label
        >
        <input
          type="text"
          id="foregroundColor"
          class="mt-4 px-8 py-12 rounded border s-border hover:s-border-hover"
          on:blur={handleForegroundBlur}
          on:keydown={handleForegroundKeydown}
          on:input={foregroundColor}
        />
        {#if !foregroundIsValid}
          <p class="error-text">Not a valid colour</p>
        {/if}
      </div>

      <!-- Input background -->
      <div class="input-group flex flex-col mt-16">
        <label class="font-bold text-caption" for="backgroundColor"
          >Background colour</label
        >
        <input
          type="text"
          id="backgroundColor"
          class="mt-4 px-8 py-12 rounded border s-border hover:s-border-hover"
          on:blur={handleBackgroundBlur}
          on:keydown={handleBackgroundKeydown}
          on:input={backgroundColor}
        />
        {#if !backgroundIsValid}
          <p class="error-text">Not a valid colour</p>
        {/if}
      </div>
    </div>

    <!-- Buttons -->
    <div class="flex flex-wrap gap-16">
      <w-button full-width variant="primary" on:click={newRandomColours}
        >Random colours</w-button
      >
      <w-button full-width variant="secondary" on:click={swapColours}
        >Swap colours</w-button
      >
    </div>
  </div>

  <!-- Result container -->
  <div
    class="whiteblurbox flex flex-col bleed justify-start rounded-8 max-w-[800] mx-16 md:mx-24 mt-40 mb-[600] p-24 md:p-40"
    class:hidden={!infoIsHidden && smallScreen}
    style="box-shadow: 0px 4px 8px 0px {darkerBackgroundColor};"
  >
    <h2 class="merriweather-font text-xl">
      Contrast for {foregroundColorName} on {backgroundColorName}
    </h2>

    <!-- <p>
      {foregroundColorName}
      {foregroundColor} on {backgroundColorName}
      {backgroundColor}
    </p> -->

    <!-- Result in numbers, container for 3 boxes -->
    <div class="flex flex-wrap justify-center gap-x-16 gap-y-16 w-full mt-40">
      <!-- 1: Lc -->
      <w-box class="min-w-[180] s-bg rounded">
        <p>APCA contrast:</p>
        <span class="t1">{Lc} Lc</span>
      </w-box>
      <!-- 2: WCAG -->
      <w-box class="min-w-[180] s-bg rounded">
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
      <w-box class="min-w-[180] s-bg rounded">
        <p>Minimum size:</p>
        {#if foregroundIsValid && backgroundIsValid}
          <span class="t1">{@html demand} px</span>
        {:else}{/if}
      </w-box>
    </div>

    <!-- Table -->
    <table class="table-auto s-bg rounded-8 mt-32 mb-8 w-full">
      <thead>
        <tr>
          <th class="text-right px-8 pt-16 pb-8">Size</th>
          <th class="text-right px-8 pt-16 pb-8">Lc required</th>
          <th class="px-8 pt-16 pb-8">APCA</th>
          <th class="text-center px-8 pt-16 pb-8">Example</th>
        </tr>
      </thead>
      <tbody>
        {#each contrastDemands as item (item.Lc)}
          <tr>
            <!-- Px size -->
            <td class="text-right px-8 py-16">{@html item.Size} px</td>
            <!-- LC demand -->
            <td class="text-right px-8">{item.Lc} Lc</td>
            <!-- APCA -->
            <td class="flex justify-center items-center px-8 py-16">
              {#if Lc < item.Lc}
                <img class="h-24" src="/red_cross.svg" alt="Red cross" />
              {:else}
                <img class="h-24" src="/green_check.svg" alt="Green check" />
              {/if}
            </td>
            <td>
              <div
                class="cell px-8 py-16 mx-16 rounded-8"
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
        <tr class="h-8">
          <td colspan="4"></td>
          <!-- Empty cells to create padding -->
        </tr>
      </tbody>
    </table>
  </div>
  <p
  class="t4 mb-32 p-8 text-center"
  style="color: {foregroundColor}; background-color: {backgroundColor};"
>
  This might be the end of the page, but the universe goes on forever
</p>


</main>

<!-- Container for SVG -->
<div class="fixed top-0 left-0 w-full h-full z-10">
  <!-- SVG with dots -->
  <svg
    id={"svg" + redrawCounter}
    bind:this={svgElement}
    width="100%"
    height="100%"
  >
    <rect width="100%" height="100%" fill={backgroundColor}></rect>

    {#each dots as { cx, cy, r, id }, index}
      {#if demand === "&lt; 1" || r >= parseFloat(demand)}
        <circle
          {id}
          {cx}
          {cy}
          {r}
          fill={foregroundColor}
          class="grow"
          style="transform-origin: {cx}px {cy}px; animation-duration: 0.2s; animation-timing-function: ease-out;"
        />
      {/if}
    {/each}
  </svg>
</div>

<style>
  @import url("https://fonts.googleapis.com/css2?family=Merriweather:wght@400&display=swap");

  :root {
    --background-color: {backgroundColor};
    --foreground-color: {foregroundColor};
  }

  @keyframes grow {
    from {
      transform: scale(0);
    }
    to {
      transform: scale(1);
    }
  }

  .grow {
    animation: grow 1s forwards; /* Adjust the duration as needed */
  }

  .merriweather-font {
    font-family: "Merriweather", serif;
    line-height: normal;
    font-weight: 400;
  }

  :global(html, body) {
    margin: 0;
    padding: 0;
    height: 100%;
    overflow: hidden; /* Prevents scrolling on the body */
    background-color: #000;
  }

  a {
    color: #eac305;
    text-decoration: underline;
    text-decoration-style: dotted;
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

  .whiteblurbox {
    backdrop-filter: blur(8px);
    background-color: rgba(255, 255, 255, 0.9);
  }

  .blackblurbox {
    backdrop-filter: blur(8px);
    background-color: rgba(0, 0, 0, 0.85);
    transition: all 0.5s ease;
  }

  .gradientmask {
    -webkit-mask-image: linear-gradient(
      to bottom,
      rgba(0, 0, 0, 0) 0%,
      rgba(0, 0, 0, 1) calc(0% + 24px),
      rgba(0, 0, 0, 1) calc(100% - 64px),
      rgba(0, 0, 0, 0) 100%
    );
    mask-image: linear-gradient(
      to bottom,
      rgba(0, 0, 0, 0) 0%,
      rgba(0, 0, 0, 1) calc(0% + 24px),
      rgba(0, 0, 0, 1) calc(100% - 64px),
      rgba(0, 0, 0, 0) 100%
    );
  }

  tr {
    border-bottom: 1px solid #000;
    border-color: var(--w-s-color-border);
    padding-top: 12px;
    padding-bottom: 12px;
  }

  tbody tr:last-child, tr:nth-last-child(2) {
    border-bottom: none;
  }

  svg {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
  }

  .custom-divider > :not([hidden]) ~ :not([hidden]) {
    border-color: #5c5c66;
  }

  .icon-button {
    font-size: 24px;
    background: none;
    border: 2px solid transparent;
    cursor: pointer;
    color: #fff;
    transition: color 0.3s; /* Smooth transition for hover effect */
  }

  @media (hover: hover) {
    .icon-button:hover {
      color: #eac305; /* Change color on hover */
      background: #eac30522;
      border: 2px solid #eac305;
    }
  }
</style>

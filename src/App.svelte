<script>
  import "@warp-ds/elements";
  import chroma from "chroma-js";
  import { onMount, onDestroy } from "svelte";
  import { tick } from "svelte";

  import { APCAcontrast, sRGBtoY } from "apca-w3";
  import { colorParsley } from "colorparsley";
  import colorNamer from "color-namer";
  import { checkColors } from "./lib/color-checker.js";

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
  let backgroundColor = "#EAC305";
  let foregroundColor = "#000000";

  // Use color-namer to get the closest color name
  $: backgroundColorNames = colorNamer(backgroundColor);
  $: foregroundColorNames = colorNamer(foregroundColor);

  // Function to capitalize the first letter
  const capitalizeFirstLetter = (str) =>
    str.charAt(0).toUpperCase() + str.slice(1);

  $: backgroundColorName = capitalizeFirstLetter(
    backgroundColorNames.basic[0].name
  );
  $: foregroundColorName = capitalizeFirstLetter(
    foregroundColorNames.basic[0].name
  );

  // let backgroundColor = chroma.random().hex().toUpperCase();
  // let foregroundColor =
  chroma.contrast(backgroundColor, "white") > 4.5 ? "#FFFFFF" : "#000000";

  // Colour for drop shadow based on background colour
  $: darkerBackgroundColor = chroma(backgroundColor).darken(2).alpha(0.3).css();

  async function newRandomColours() {
    backgroundColor = chroma.random().hex().toUpperCase();
    foregroundColor =
      chroma.contrast(backgroundColor, "white") > 4.5 ? "#FFFFFF" : "#000000";
    await forceReRenderDots(); // Force re-render with new dots
    updateInputFields(); // Manually update input fields
  }

  async function swapColours() {
    let previousBackground = backgroundColor;
    backgroundColor = foregroundColor;
    foregroundColor = previousBackground;
    await forceReRenderDots();
    updateInputFields(); // Manually update input fields
  }

  function updateInputFields() {
    const foregroundInput = document.querySelector(
      'w-textfield[label="Foreground colour"] input'
    );
    const backgroundInput = document.querySelector(
      'w-textfield[label="Background colour"] input'
    );

    if (foregroundInput) {
      foregroundInput.value = foregroundColor;
    }

    if (backgroundInput) {
      backgroundInput.value = backgroundColor;
    }
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
    const value = event.target.value;
    if (chroma.valid(value)) {
      foregroundColor = chroma(value).hex();
      foregroundIsValid = true;
    } else {
      foregroundIsValid = false;
    }
    updateInputFields();

  }

  function handleBackgroundInput(event) {
    const value = event.target.value;
    if (chroma.valid(value)) {
      backgroundColor = chroma(value).hex();
      backgroundIsValid = true;
    } else {
      backgroundIsValid = false;
    }
    updateInputFields();

  }

  // SVG size
  let svgElement;
  let svgWidth;
  let svgHeight;

  let dots = []; // Initialize an empty array for dots
  let redrawCounter = 0; // A counter to force redraw
  let dotSizes = [1, 1.5, 2, 3, 4, 6, 8, 10, 15, 20];
  let dotAreas = dotSizes.map((size) => Math.PI * Math.pow(size, 2));
  let targetArea = (window.innerWidth * 400) / 150; // square px area to cover per dot size
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
  }

  // Update svgWidth and svgHeight based on the actual dimensions of the SVG element
  const updateDimensions = () => {
    svgWidth = svgElement.clientWidth;
    svgHeight = svgElement.clientHeight;
    // console.log('SVG Dimensions:', svgWidth, 'x', svgHeight);
  };

  onMount(() => {
    updateDimensions(); // Initial dimensions update
    dots = generateDots(); // Initial dots generation
    updateInputFields();

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
  class="blackblurbox absolute top-16 left-16 bottom-16 z-30 w-[500] rounded-8 pl-40 pr-16 py-40 flex flex-col"
  style="box-shadow: 0px 4px 8px 0px {darkerBackgroundColor};"
>
  <h1 class="merriweather-font text-xxxl s-text-inverted">
    The Dataviz Contrast Tool
  </h1>

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
        Choose two colours to see the minimum pixel size for shapes such as
        lines and bars, and the APCA lightness contrast.
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
        takes human perception into account and corrects some of the faults in the
        current WCAG 2 contrast algorithm.
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
        This tool is made by Jon Olav Eikenes, a Norwegian information designer
        in the design system team at Schibsted Marketplaces.
      </p>
      <p>
        In Schibsted Marketplaces, we have used APCA for developing an
        accessible colour palette. For text contrast there are several APCA
        contrast checkers available, but we did not find one specifically for
        visual elements. So we made our own. Feel free to reach out if you have
        feedback or questions!
      </p>
      <p>
        This page was built using
        <a href="https://www.npmjs.com/package/apca-w3">APCA-3</a>,
        <a href="https://github.com/Myndex/colorparsley/">colorParsley</a>,
        <a href="https://github.com/colorjs/color-namer">color-namer</a>,
        <a href="https://www.npmjs.com/package/chroma-js">Chroma.js</a>,
        <a href="https://svelte.dev/">Svelte</a>, and
        <a href="https://warp-ds.github.io/tech-docs/">WARP</a>.
      </p>
      <p class="pt-64">.</p>
    </div>
  </div>
</div>

<!-- Container for main content -->
<main
  class="h-full relative flex flex-col justify-start items-center z-20 mt-30 pt-40 ml-[516] overflow-y-scroll"
>
  <!-- Input box -->
  <div
    class="whiteblurbox w-fit z-10 rounded-8 mx-24 my-[140] p-40"
    style="box-shadow: 0px 4px 8px 0px {darkerBackgroundColor};"
  >
    <h2 class="merriweather-font text-xl">Choose colours</h2>
    <p>Enter colour name or HEX code</p>
    <!-- Input fields -->
    <div class="flex flex-wrap gap-x-24 gap-y-8 mb-24">
      <w-textfield
        full-width
        label="Foreground colour"
        invalid={!foregroundIsValid}
        help-text={foregroundIsValid ? "" : "Not a valid colour"}
        class="mt-16"
        value={foregroundColor}
    
        on:input={handleForegroundInput}
      >
        <input type="text" value={foregroundColor} />
      </w-textfield>

      <w-textfield
        label="Background colour"
        invalid={!backgroundIsValid}
        help-text={backgroundIsValid ? "" : "Not a valid colour"}
        class="mt-16"
        value={backgroundColor}
        on:change={handleBackgroundInput}
     
      >
        <input type="text" value={backgroundColor} />
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
  </div>

  <!-- Result container -->
  <div
    class="whiteblurbox flex flex-col bleed justify-start rounded-8 max-w-[800] mx-24 mt-40 mb-[600] p-40"
    style="box-shadow: 0px 4px 8px 0px {darkerBackgroundColor};"
  >
    <h2 class="merriweather-font text-xl">
      Contrast for {foregroundColorName} on {backgroundColorName}
    </h2>

    <p>
      {foregroundColorName}
      {foregroundColor} on {backgroundColorName}
      {backgroundColor}
    </p>

    <!-- Result in numbers, container for 3 boxes -->
    <div class="flex flex-wrap justify-center gap-x-16 gap-y-16 w-full mt-40">
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
    <table class="table-auto my-32 w-full">
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
  </div>
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
          style="transform-origin: {cx}px {cy}px;"
        />
      {/if}
    {/each}
  </svg>
</div>

<style>
  @import url("https://fonts.googleapis.com/css2?family=Merriweather:wght@400&display=swap");

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
    color: #eac305; /* Set link color using a hex value */
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

  a {
    text-decoration: underline;
    text-decoration-style: dotted;
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
</style>

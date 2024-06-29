// NB: since this is not a Svelte file the reactivitiy won't work. Use JavaScript

// src/lib/dataStore.js
import { writable, get } from "svelte/store";
import jsyaml from "js-yaml";

// Raw data
let colors = null;
let tokens = null;

// Raw stores
export const allTokens = writable([]);
export const allColors = writable([]);
export const tokenColorMapping = writable({});

// Flag to check if data has been fetched
export const dataFetched = writable(false);
// export let dataFetched = false;

// Flag to check if data has been processed
export const dataProcessed = writable(false);

// Fetch data and save to 'tokens' and 'colors'
export async function fetchTokens() {
  // Only run once
  if (!get(dataFetched)) {
    // console.log("Running fetchTokens");

    // Fetch and parse the colors YAML
    const colorsResponse = await fetch(
      "https://raw.githubusercontent.com/warp-ds/css/next/tokens/finn.no/colors.yml"
    );
    const colorsYaml = await colorsResponse.text();
    colors = jsyaml.load(colorsYaml);

    // Fetch and parse the tokens YAML
    const tokensResponse = await fetch(
      "https://raw.githubusercontent.com/warp-ds/css/next/tokens/finn.no/semantic.yml"
    );
    const tokensYaml = await tokensResponse.text();
    tokens = jsyaml.load(tokensYaml);

    // Once data is fetched, set the flag to true
    dataFetched.set(true);

    // console.log("Data fetched. Colors and tokens:")
    // console.log(colors, tokens);
  }
}

// Function to get the hex code for a primitive token
function getColorForToken(token) {
  // Check for the special cases: 'white' and 'black'
  if (token === "white") return "#ffffff";
  if (token === "black") return "#000000";

  const parts = token.split("-");
  if (parts.length === 2) {
    const colorName = parts[0];
    const shade = parts[1];
    if (colors[colorName] && colors[colorName][shade]) {
      // Check if the color shade is a string (hex color)
      if (typeof colors[colorName][shade] === "string") {
        return colors[colorName][shade];
      }
      // If it's an object, return the default "_" value
      else if (colors[colorName][shade]["_"]) {
        return colors[colorName][shade]["_"];
      }
    }
  } else if (parts.length === 3) {
    const colorName = parts[0];
    const shade = parts[1];
    const variant = parts[2];
    if (
      colors[colorName] &&
      colors[colorName][shade] &&
      colors[colorName][shade][variant]
    ) {
      return colors[colorName][shade][variant];
    }
  }
  return null; // or return some default color if desired
}

// Function to flatten the semantic tokens
function flattenTokens(prefix, tokenObj) {
  let resultTokens = [];
  let resultMapping = {};

  for (let key in tokenObj) {
    // Exclude 'token: maps' from the list
    if (key === "token" && tokenObj[key] === "maps") {
      continue;
    }

    let fullTokenName = prefix ? `${prefix}-${key}` : key;

    // Remove "color-" from the token name
    fullTokenName = fullTokenName.replace(/^s-color-/, "s-");

    // Rename "s-background-" to "s-bg-" in the token name
    fullTokenName = fullTokenName.replace(/^s-background/, "s-bg");

    // if string value
    if (typeof tokenObj[key] === "string") {
      // Remove trailing "-_"
      if (fullTokenName.endsWith("-_")) {
        fullTokenName = fullTokenName.substring(0, fullTokenName.length - 2);
      }

      const hexColor = getColorForToken(tokenObj[key]);

      // Define the color name
      const colorName = tokenObj[key];

      // Avoid duplicates and avoid pushing null values
      if (
        !resultTokens.some((token) => token.name === fullTokenName) &&
        hexColor !== null
      ) {
        resultTokens.push({
          name: fullTokenName,
          colorName: colorName,
          value: hexColor,
        });
      }

      resultMapping[fullTokenName] = tokenObj[key];
    }
    // If more nested stuff
    else if (typeof tokenObj[key] === "object") {
      const nextPrefix = fullTokenName; // Use the already cleaned fullTokenName as the next prefix

      const nestedResults = flattenTokens(nextPrefix, tokenObj[key]);

      // If the object has a "_" property, use its value for the parent token
      if (tokenObj[key].hasOwnProperty("_")) {
        const hexColor = getColorForToken(tokenObj[key]["_"]);

        // Define the color name here.
        const colorName = tokenObj[key]["_"];

        // Avoid duplicates and avoid pushing null values
        if (
          !resultTokens.some((token) => token.name === nextPrefix) &&
          hexColor !== null
        ) {
          resultTokens.push({
            name: nextPrefix,
            colorName: colorName,
            value: hexColor,
          });
        }

        resultMapping[nextPrefix] = tokenObj[key]["_"];
      }

      // Instead of directly concatenating, first filter out any duplicates from the nestedResults
      nestedResults.tokens.forEach((token) => {
        if (
          !resultTokens.some(
            (existingToken) => existingToken.name === token.name
          )
        ) {
          resultTokens.push(token);
        }
      });

      resultMapping = { ...resultMapping, ...nestedResults.mapping };
    }
  }

  return { tokens: resultTokens, mapping: resultMapping };
}

// Utility to remove '-_' suffix if present
// Can skip?
function cleanColorName(name) {
  return name.endsWith("-_") ? name.slice(0, -2) : name;
}

// Function to populate allColors array
function populateColors(colorObj, tokenColorMap) {
  let resultColors = [];

  for (let key in colorObj) {
    // Exclude unwanted colors
    if (["token", "transparent", "inherit", "none"].includes(key)) continue;

    if (typeof colorObj[key] === "string") {
      resultColors.push({
        name: cleanColorName(key),
        value: colorObj[key],
        count: 0, // default value
      });
    } else if (typeof colorObj[key] === "object") {
      for (let shade in colorObj[key]) {
        if (typeof colorObj[key][shade] === "string") {
          resultColors.push({
            name: cleanColorName(`${key}-${shade}`),
            value: colorObj[key][shade],
            count: 0, // default value
          });
        } else {
          // Handle nested shades if necessary
          // Only store the value associated with the '_' key
          if (colorObj[key][shade]["_"]) {
            resultColors.push({
              name: cleanColorName(`${key}-${shade}`),
              value: colorObj[key][shade]["_"],
              count: 0, // default value
            });
          }
        }
      }
    }
  }

  // Count how many semantic tokens refer to a given colour
  function countTokensForColor(colorName, tokenColorMap) {
    // console.log("Checking color name:", colorName);
    let count = 0;
    for (let token in tokenColorMap) {
      if (tokenColorMap[token] === colorName) {
        count++;
      }
    }
    // console.log("coun: ", count);
    return count;
  }

  // when the colours are in place, count how many times they are used by semantic tokens
  resultColors.forEach((color) => {
    color.count = countTokensForColor(color.name, tokenColorMap);
  });

  // console.log("Token-Color Mapping:", tokenColorMapping);
  // console.log("Result Colors:", resultColors);

  return resultColors;
}

// When data is loaded, flatten and put into arrays
function processColorsAndTokens() {
  // console.log("processColorsAndTokens runs");

  // Run flattenTokens to process tokens and colors
  const { tokens: tokensList, mapping: tokenColorMap } = flattenTokens(
    "",
    tokens
  );

  // Update Svelte stores
  allTokens.set(tokensList);
  tokenColorMapping.set(tokenColorMap);

  // Run populateColors
  const colorsList = populateColors(colors, tokenColorMap);

  // Update Svelte store for colors
  allColors.set(colorsList);

  // console.log("tokensList", tokensList);
  // console.log("colorsList", colorsList);

  // console.log("tokenColorMap", tokenColorMap);
  // console.log("tokenColorMapping", tokenColorMapping);

  // Once data is processed, set the flag to true
  dataProcessed.set(true);
}

// Reactive logic below
dataFetched.subscribe((value) => {
  if (value) {
    // console.log("Reactive block triggered via subscription");
    processColorsAndTokens();
  }
});

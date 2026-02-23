import * as generated from "./gameData.generated.js";
import * as fallback from "./gameData.default.js";

const isNonEmptyString = (value) => typeof value === "string" && value.trim().length > 0;

const isThemeValid = (row) =>
  row &&
  isNonEmptyString(row.kw) &&
  isNonEmptyString(row.emoji) &&
  Array.isArray(row.de) &&
  row.de.length > 0 &&
  Array.isArray(row.names) &&
  row.names.length > 0 &&
  Array.isArray(row.decoys) &&
  row.decoys.length > 0 &&
  Array.isArray(row.tweets) &&
  row.tweets.length > 0;

const isFillerRowValid = (row) =>
  row &&
  isNonEmptyString(row.text) &&
  isNonEmptyString(row.user) &&
  isNonEmptyString(row.handle) &&
  isNonEmptyString(row.time);

const isDatasetValid = (dataset) =>
  dataset &&
  Array.isArray(dataset.THEMES) &&
  dataset.THEMES.length > 0 &&
  dataset.THEMES.every(isThemeValid) &&
  Array.isArray(dataset.FILLER) &&
  dataset.FILLER.length > 0 &&
  dataset.FILLER.every(isFillerRowValid) &&
  Array.isArray(dataset.NOISE_TICKERS) &&
  dataset.NOISE_TICKERS.length > 0 &&
  Array.isArray(dataset.NOISE_EMOJIS) &&
  dataset.NOISE_EMOJIS.length > 0;

const data = isDatasetValid(generated) ? generated : fallback;

export const THEMES = data.THEMES;
export const FILLER = data.FILLER;
export const NOISE_TICKERS = data.NOISE_TICKERS;
export const NOISE_EMOJIS = data.NOISE_EMOJIS;

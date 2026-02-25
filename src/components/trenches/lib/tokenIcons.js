const TICKER_ICON_ALIASES = {
  MONEY: "CRYPTO",
};

export const normalizeTicker = (value) =>
  String(value || "")
    .trim()
    .replace(/^\$/, "")
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "");

export const resolveTokenIconSrc = (ticker) => {
  const normalized = normalizeTicker(ticker);
  if (!normalized) return null;
  const resolvedTicker = TICKER_ICON_ALIASES[normalized] || normalized;
  return `/coins/tickers/$${resolvedTicker}.png`;
};


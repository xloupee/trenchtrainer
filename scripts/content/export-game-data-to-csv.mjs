import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { FILLER, NOISE_EMOJIS, NOISE_TICKERS, THEMES } from "../../src/components/trenches/data/gameData.js";
import { writeCsv } from "./csv-utils.mjs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, "../..");
const WORKBOOK_DIR = path.join(ROOT, "content", "trenches-workbook");
const OUTPUT_FILE = path.join(WORKBOOK_DIR, "trenches_content.csv");

const joinPipe = (value) => (Array.isArray(value) ? value.map((v) => String(v || "").trim()).filter(Boolean).join("|") : "");

const main = async () => {
  await fs.mkdir(WORKBOOK_DIR, { recursive: true });
  for (const legacyFile of ["themes.csv", "theme_tweets.csv", "filler.csv", "noise.csv"]) {
    const fullPath = path.join(WORKBOOK_DIR, legacyFile);
    try {
      await fs.unlink(fullPath);
    } catch (error) {
      if (error?.code !== "ENOENT") throw error;
    }
  }

  const headers = [
    "row_type",
    "theme_id",
    "kw",
    "emoji",
    "names_csv",
    "decoys_csv",
    "emoji_decoys_csv",
    "text",
    "user",
    "handle",
    "time",
    "sort_order",
    "verified",
    "warn",
    "reply",
    "media_type",
    "media_dur",
    "quote_user",
    "quote_handle",
    "quote_time",
    "quote_verified",
    "quote_text",
    "quote_media_type",
    "quote_media_dur",
    "kind",
    "value",
  ];

  const rows = [];

  THEMES.forEach((theme) => {
    const themeId = String(theme.kw || "").trim();
    rows.push({
      row_type: "theme",
      theme_id: themeId,
      kw: themeId,
      emoji: String(theme.emoji || "").trim(),
      names_csv: joinPipe(theme.names),
      decoys_csv: joinPipe(theme.decoys),
      emoji_decoys_csv: joinPipe(theme.de),
    });
    (theme.tweets || []).forEach((tweet, idx) => {
      rows.push({
        row_type: "theme_tweet",
        theme_id: themeId,
        text: String(tweet?.text || ""),
        user: String(tweet?.user || ""),
        handle: String(tweet?.handle || ""),
        time: String(tweet?.time || ""),
        sort_order: idx + 1,
      });
    });
  });

  FILLER.forEach((row) => {
    rows.push({
      row_type: "filler",
      text: String(row?.text || ""),
      user: String(row?.user || ""),
      handle: String(row?.handle || ""),
      time: String(row?.time || ""),
      verified: row?.verified ? "true" : "false",
      warn: row?.warn ? "true" : "false",
      reply: row?.reply ? String(row.reply) : "",
      media_type: row?.media?.type ? String(row.media.type) : "",
      media_dur: row?.media?.dur ? String(row.media.dur) : "",
      quote_user: row?.quote?.user ? String(row.quote.user) : "",
      quote_handle: row?.quote?.handle ? String(row.quote.handle) : "",
      quote_time: row?.quote?.time ? String(row.quote.time) : "",
      quote_verified: row?.quote?.verified ? "true" : "false",
      quote_text: row?.quote?.text ? String(row.quote.text) : "",
      quote_media_type: row?.quote?.media?.type ? String(row.quote.media.type) : "",
      quote_media_dur: row?.quote?.media?.dur ? String(row.quote.media.dur) : "",
    });
  });

  NOISE_TICKERS.forEach((value, idx) => {
    rows.push({
      row_type: "noise",
      kind: "ticker",
      value,
      sort_order: idx + 1,
    });
  });
  NOISE_EMOJIS.forEach((value, idx) => {
    rows.push({
      row_type: "noise",
      kind: "emoji",
      value,
      sort_order: idx + 1,
    });
  });

  await writeCsv(OUTPUT_FILE, headers, rows);
  console.log(`Exported single CSV workbook file to ${OUTPUT_FILE}`);
};

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

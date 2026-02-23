import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { z } from "zod";
import { readCsvWithMeta } from "./csv-utils.mjs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, "../..");
const WORKBOOK_DIR = path.join(ROOT, "content", "trenches-workbook");
const INPUT_FILE = path.join(WORKBOOK_DIR, "trenches_content.csv");
const OUTPUT_FILE = path.join(ROOT, "src", "components", "trenches", "data", "gameData.generated.js");

const REQUIRED_COLUMNS = [
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

const parsePipeList = (value) =>
  String(value || "")
    .split("|")
    .map((entry) => entry.trim())
    .filter(Boolean);

const parseBool = (value, { allowEmpty = true } = {}) => {
  const normalized = String(value ?? "").trim().toLowerCase();
  if (!normalized) return allowEmpty ? { ok: true, value: false } : { ok: false, reason: "required boolean" };
  if (["true", "1", "yes", "y"].includes(normalized)) return { ok: true, value: true };
  if (["false", "0", "no", "n"].includes(normalized)) return { ok: true, value: false };
  return { ok: false, reason: `invalid boolean '${value}'` };
};

const normalizeOrder = (value, fallback = 999999) => {
  const n = Number(String(value ?? "").trim());
  return Number.isFinite(n) ? n : fallback;
};

const asModule = (name, value) => `export const ${name} = ${JSON.stringify(value, null, 2)};\n`;

const themeRowSchema = z.object({
  row_type: z.literal("theme"),
  theme_id: z.string().trim().min(1),
  kw: z.string().trim().min(1),
  emoji: z.string().trim().min(1),
  names_csv: z.string().trim().min(1),
  decoys_csv: z.string().trim().min(1),
  emoji_decoys_csv: z.string().trim().min(1),
});

const tweetRowSchema = z.object({
  row_type: z.literal("theme_tweet"),
  theme_id: z.string().trim().min(1),
  text: z.string().trim().min(1),
  user: z.string().trim().min(1),
  handle: z.string().trim().min(1),
  time: z.string().trim().min(1),
  sort_order: z.string(),
});

const fillerRowSchema = z.object({
  row_type: z.literal("filler"),
  text: z.string().trim().min(1),
  user: z.string().trim().min(1),
  handle: z.string().trim().min(1),
  time: z.string().trim().min(1),
  verified: z.string(),
  warn: z.string(),
  reply: z.string(),
  media_type: z.string(),
  media_dur: z.string(),
  quote_user: z.string(),
  quote_handle: z.string(),
  quote_time: z.string(),
  quote_verified: z.string(),
  quote_text: z.string(),
  quote_media_type: z.string(),
  quote_media_dur: z.string(),
});

const noiseRowSchema = z.object({
  row_type: z.literal("noise"),
  kind: z.string().trim().min(1),
  value: z.string().trim().min(1),
  sort_order: z.string(),
});

const main = async () => {
  const errors = [];
  let csv;
  try {
    csv = await readCsvWithMeta(INPUT_FILE);
  } catch (error) {
    throw new Error(`Unable to read ${INPUT_FILE}: ${error.message}`);
  }

  const missing = REQUIRED_COLUMNS.filter((column) => !csv.headers.includes(column));
  if (missing.length > 0) {
    errors.push(`[trenches_content.csv] missing columns: ${missing.join(", ")}`);
  }

  const themeRecords = [];
  const themeIdSet = new Set();
  const themeRecordById = new Map();
  const allowedMediaTypes = new Set(["", "image", "video"]);
  const fillerRecords = [];
  const noiseTickerRows = [];
  const noiseEmojiRows = [];

  for (const row of csv.rows) {
    const rowType = String(row.data.row_type || "").trim().toLowerCase();
    if (!rowType) continue;

    if (rowType === "theme") {
      const parsed = themeRowSchema.safeParse({ ...row.data, row_type: rowType });
      if (!parsed.success) {
        errors.push(`[trenches_content.csv:${row.rowNumber}] invalid theme row`);
        continue;
      }
      const data = parsed.data;
      if (themeIdSet.has(data.theme_id)) {
        errors.push(`[trenches_content.csv:${row.rowNumber}] duplicate theme_id '${data.theme_id}'`);
        continue;
      }
      const names = parsePipeList(data.names_csv);
      const decoys = parsePipeList(data.decoys_csv);
      const emojiDecoys = parsePipeList(data.emoji_decoys_csv);
      if (!names.length) errors.push(`[trenches_content.csv:${row.rowNumber}] names_csv must include at least one value`);
      if (!decoys.length) errors.push(`[trenches_content.csv:${row.rowNumber}] decoys_csv must include at least one value`);
      if (!emojiDecoys.length) errors.push(`[trenches_content.csv:${row.rowNumber}] emoji_decoys_csv must include at least one value`);
      const record = {
        theme_id: data.theme_id,
        kw: data.kw,
        emoji: data.emoji,
        names,
        decoys,
        de: emojiDecoys,
        tweets: [],
      };
      themeIdSet.add(data.theme_id);
      themeRecords.push(record);
      themeRecordById.set(data.theme_id, record);
      continue;
    }

    if (rowType === "theme_tweet") {
      const parsed = tweetRowSchema.safeParse({ ...row.data, row_type: rowType });
      if (!parsed.success) {
        errors.push(`[trenches_content.csv:${row.rowNumber}] invalid theme_tweet row`);
        continue;
      }
      const data = parsed.data;
      const parent = themeRecordById.get(data.theme_id);
      if (!parent) {
        errors.push(`[trenches_content.csv:${row.rowNumber}] unknown theme_id '${data.theme_id}'`);
        continue;
      }
      parent.tweets.push({
        text: data.text,
        user: data.user,
        handle: data.handle,
        time: data.time,
        _order: normalizeOrder(data.sort_order, row.rowNumber),
        _row: row.rowNumber,
      });
      continue;
    }

    if (rowType === "filler") {
      const parsed = fillerRowSchema.safeParse({ ...row.data, row_type: rowType });
      if (!parsed.success) {
        errors.push(`[trenches_content.csv:${row.rowNumber}] invalid filler row`);
        continue;
      }
      const data = parsed.data;
      const verified = parseBool(data.verified, { allowEmpty: false });
      const warn = parseBool(data.warn, { allowEmpty: false });
      if (!verified.ok) errors.push(`[trenches_content.csv:${row.rowNumber}] verified: ${verified.reason}`);
      if (!warn.ok) errors.push(`[trenches_content.csv:${row.rowNumber}] warn: ${warn.reason}`);

      const mediaType = String(data.media_type || "").trim().toLowerCase();
      if (!allowedMediaTypes.has(mediaType)) {
        errors.push(`[trenches_content.csv:${row.rowNumber}] media_type must be image, video, or empty`);
      }
      const quoteMediaType = String(data.quote_media_type || "").trim().toLowerCase();
      if (!allowedMediaTypes.has(quoteMediaType)) {
        errors.push(`[trenches_content.csv:${row.rowNumber}] quote_media_type must be image, video, or empty`);
      }

      const quotePresent = Boolean(
        String(data.quote_user || "").trim() ||
        String(data.quote_handle || "").trim() ||
        String(data.quote_time || "").trim() ||
        String(data.quote_text || "").trim() ||
        quoteMediaType,
      );
      if (quotePresent) {
        if (!String(data.quote_user || "").trim()) errors.push(`[trenches_content.csv:${row.rowNumber}] quote_user is required when quote is present`);
        if (!String(data.quote_handle || "").trim()) errors.push(`[trenches_content.csv:${row.rowNumber}] quote_handle is required when quote is present`);
        if (!String(data.quote_time || "").trim()) errors.push(`[trenches_content.csv:${row.rowNumber}] quote_time is required when quote is present`);
        if (!String(data.quote_text || "").trim()) errors.push(`[trenches_content.csv:${row.rowNumber}] quote_text is required when quote is present`);
      }

      const quoteVerified = parseBool(data.quote_verified, { allowEmpty: true });
      if (!quoteVerified.ok) {
        errors.push(`[trenches_content.csv:${row.rowNumber}] quote_verified: ${quoteVerified.reason}`);
      }

      const filler = {
        text: data.text,
        user: data.user,
        handle: data.handle,
        time: data.time,
        verified: verified.value,
        warn: warn.value,
      };
      if (String(data.reply || "").trim()) filler.reply = String(data.reply).trim();
      if (mediaType) {
        filler.media = { type: mediaType };
        if (String(data.media_dur || "").trim()) filler.media.dur = String(data.media_dur).trim();
      }
      if (quotePresent) {
        filler.quote = {
          user: String(data.quote_user).trim(),
          handle: String(data.quote_handle).trim(),
          time: String(data.quote_time).trim(),
          text: String(data.quote_text).trim(),
        };
        if (quoteVerified.value) filler.quote.verified = true;
        if (quoteMediaType) {
          filler.quote.media = { type: quoteMediaType };
          if (String(data.quote_media_dur || "").trim()) filler.quote.media.dur = String(data.quote_media_dur).trim();
        }
      }
      fillerRecords.push(filler);
      continue;
    }

    if (rowType === "noise") {
      const parsed = noiseRowSchema.safeParse({ ...row.data, row_type: rowType });
      if (!parsed.success) {
        errors.push(`[trenches_content.csv:${row.rowNumber}] invalid noise row`);
        continue;
      }
      const data = parsed.data;
      const kind = data.kind.toLowerCase();
      if (kind !== "ticker" && kind !== "emoji") {
        errors.push(`[trenches_content.csv:${row.rowNumber}] kind must be 'ticker' or 'emoji'`);
        continue;
      }
      const record = {
        value: data.value,
        order: normalizeOrder(data.sort_order, row.rowNumber),
        row: row.rowNumber,
      };
      if (kind === "ticker") noiseTickerRows.push(record);
      if (kind === "emoji") noiseEmojiRows.push(record);
      continue;
    }

    errors.push(`[trenches_content.csv:${row.rowNumber}] unsupported row_type '${row.data.row_type}'`);
  }

  for (const record of themeRecords) {
    record.tweets.sort((a, b) => (a._order - b._order) || (a._row - b._row));
    record.tweets = record.tweets.map(({ text, user, handle, time }) => ({ text, user, handle, time }));
    if (record.tweets.length === 0) {
      errors.push(`[trenches_content.csv] missing tweets for theme_id '${record.theme_id}'`);
    }
  }

  noiseTickerRows.sort((a, b) => (a.order - b.order) || (a.row - b.row));
  noiseEmojiRows.sort((a, b) => (a.order - b.order) || (a.row - b.row));
  const noiseTickers = noiseTickerRows.map((row) => row.value);
  const noiseEmojis = noiseEmojiRows.map((row) => row.value);

  if (themeRecords.length === 0) errors.push("[trenches_content.csv] at least one theme row is required");
  if (fillerRecords.length === 0) errors.push("[trenches_content.csv] at least one filler row is required");
  if (noiseTickers.length === 0) errors.push("[trenches_content.csv] at least one ticker noise row is required");
  if (noiseEmojis.length === 0) errors.push("[trenches_content.csv] at least one emoji noise row is required");

  if (errors.length > 0) {
    throw new Error(`CSV validation failed:\n${errors.map((e) => `- ${e}`).join("\n")}`);
  }

  const themes = themeRecords.map(({ theme_id: _themeId, ...rest }) => rest);
  const moduleSource = [
    "// Generated by scripts/content/import-csv-to-game-data.mjs",
    "// Do not edit manually. Edit content/trenches-workbook/trenches_content.csv and re-run content:import.",
    "",
    asModule("THEMES", themes),
    asModule("FILLER", fillerRecords),
    asModule("NOISE_TICKERS", noiseTickers),
    asModule("NOISE_EMOJIS", noiseEmojis),
  ].join("\n");

  await fs.writeFile(OUTPUT_FILE, `${moduleSource}\n`, "utf8");
  console.log(`Generated ${OUTPUT_FILE}`);
  console.log(`Source CSV: ${INPUT_FILE}`);
  console.log(`Themes: ${themes.length}, filler rows: ${fillerRecords.length}, tickers: ${noiseTickers.length}, emojis: ${noiseEmojis.length}`);
};

main().catch((error) => {
  console.error(error.message || error);
  process.exit(1);
});

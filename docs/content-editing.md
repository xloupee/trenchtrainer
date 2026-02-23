# Trenches Content Editing (Non-Technical Workflow)

This project lets you edit X tracker content and token themes without touching code.

## What you can edit

- Token themes used in rounds (names, decoys, emoji decoys)
- Theme-specific signal tweets
- Filler X posts
- Noise tickers and noise emojis

## File to edit

Use one CSV file:

- `content/trenches-workbook/trenches_content.csv`

Recommended workflow:

1. Open `trenches_content.csv` in Google Sheets.
2. Edit rows.
3. Export back to CSV.
4. Replace `content/trenches-workbook/trenches_content.csv`.
5. Run `npm run content:import`.

## Commands

- Export current game content to CSV workbook:
  - `npm run content:export`
- Import CSV workbook into app data:
  - `npm run content:import`
- Run both:
  - `npm run content:sync`

## Column requirements

### Row types in `trenches_content.csv`

`row_type` controls how each row is interpreted:

- `theme`
- `theme_tweet`
- `filler`
- `noise`

### Theme rows (`row_type=theme`)

- `theme_id` (unique ID, usually same as `kw`)
- `kw`
- `emoji`
- `names_csv` (pipe-separated values, example: `AppleCoin|APPLE|AppleToken`)
- `decoys_csv` (pipe-separated)
- `emoji_decoys_csv` (pipe-separated emojis)

### Theme tweet rows (`row_type=theme_tweet`)

- `theme_id` (must match a `theme` row)
- `text`
- `user`
- `handle`
- `time`
- `sort_order` (number, lower appears first)

### Filler rows (`row_type=filler`)

- `text`, `user`, `handle`, `time` are required
- `verified` and `warn` must be boolean-like (`true/false`, `1/0`, `yes/no`)
- `media_type` and `quote_media_type` can be empty, `image`, or `video`
- Quote fields are optional, but if you add a quote you must include:
  - `quote_user`, `quote_handle`, `quote_time`, `quote_text`

### Noise rows (`row_type=noise`)

- `kind` must be `ticker` or `emoji`
- `value`
- `sort_order`

## Validation errors

If import fails, the command prints errors with file + row number.

Examples:

- Unknown `theme_id` in `theme_tweet` rows
- Missing required text/user/handle/time
- Invalid boolean values
- Invalid `kind` in `noise` rows

Fix the row and run `npm run content:import` again.

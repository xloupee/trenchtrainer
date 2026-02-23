import fs from "node:fs/promises";

const escapeCsvValue = (value) => {
  const raw = value === null || value === undefined ? "" : String(value);
  if (!/[",\n\r]/.test(raw)) return raw;
  return `"${raw.replace(/"/g, "\"\"")}"`;
};

export const writeCsv = async (filePath, headers, rows) => {
  const lines = [];
  lines.push(headers.map(escapeCsvValue).join(","));
  for (const row of rows) {
    lines.push(headers.map((header) => escapeCsvValue(row[header] ?? "")).join(","));
  }
  await fs.writeFile(filePath, `${lines.join("\n")}\n`, "utf8");
};

const parseCsvRows = (text) => {
  const rows = [];
  let row = [];
  let field = "";
  let inQuotes = false;
  const normalized = text.replace(/^\uFEFF/, "");
  for (let i = 0; i < normalized.length; i += 1) {
    const ch = normalized[i];
    if (inQuotes) {
      if (ch === "\"") {
        const next = normalized[i + 1];
        if (next === "\"") {
          field += "\"";
          i += 1;
        } else {
          inQuotes = false;
        }
      } else {
        field += ch;
      }
      continue;
    }
    if (ch === "\"") {
      inQuotes = true;
      continue;
    }
    if (ch === ",") {
      row.push(field);
      field = "";
      continue;
    }
    if (ch === "\n") {
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
      continue;
    }
    if (ch !== "\r") {
      field += ch;
    }
  }
  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  return rows;
};

export const readCsvWithMeta = async (filePath) => {
  const raw = await fs.readFile(filePath, "utf8");
  const parsed = parseCsvRows(raw);
  if (parsed.length === 0) return { headers: [], rows: [] };
  const headers = parsed[0].map((h) => String(h || "").trim());
  const rows = parsed.slice(1).map((cols, idx) => {
    const data = {};
    headers.forEach((header, i) => {
      data[header] = cols[i] ?? "";
    });
    return { rowNumber: idx + 2, data };
  });
  return { headers, rows };
};

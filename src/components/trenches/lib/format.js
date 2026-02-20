export const formatHistoryDate = (value) => {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  const diffMs = Date.now() - d.getTime();
  if (diffMs >= 0 && diffMs < 60_000) return "just now";
  if (diffMs >= 0 && diffMs < 3_600_000) return `${Math.max(1, Math.floor(diffMs / 60_000))}m ago`;
  return d.toLocaleString();
};

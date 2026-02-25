import { FILLER, NOISE_EMOJIS, NOISE_TICKERS, THEMES } from "../data/gameData";
import { pick, seededPick, seededRng, seededShuffle, shuffle } from "./random";

const rA = () => {
  const c = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz123456789";
  let s = "";
  for (let i = 0; i < 3; i++) s += c[Math.floor(Math.random() * c.length)];
  return s + ".." + c[Math.floor(Math.random() * c.length)] + "mp";
};
const rH2 = () =>
  "@" + pick(["degen", "alpha", "dev", "trader", "whale", "ape", "moon", "based", "pump", "ser"]) + "_" + pick(["alpha", "dev", "trader", "whale", "moon"]);
const rV = () => (Math.random() < 0.3 ? `$${Math.floor(Math.random() * 90 + 1)}` : `$${Math.floor(Math.random() * 12 + 1)}K`);
const rM2 = () => `$${Math.floor(Math.random() * 9 + 1)}K`;
const rAg = () => `${Math.floor(Math.random() * 58 + 1)}s`;
const rHo = () => Math.floor(Math.random() * 200);
const rDP = () => `${Math.floor(Math.random() * 25)}%`;
const rDA = () => pick(["1h", "3mo", "10d", "27d", "1yr", "51m", "2mo"]);
const rBS = () => `${Math.floor(Math.random() * 8)} · ${Math.floor(Math.random() * 5)}%`;
const rT2 = () => `${Math.floor(Math.random() * 30)}%`;
const rS2 = () => ({ web: Math.random() > 0.55, tg: Math.random() > 0.5, tw: Math.random() > 0.5, yt: Math.random() > 0.8 });

const normalizeToken = (value) =>
  String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");

const getNameRoots = (name) => {
  const normalized = normalizeToken(name);
  const stripped = normalized
    .replace(/coin/g, "")
    .replace(/token/g, "")
    .replace(/x$/g, "");
  return [normalized, stripped].filter(Boolean);
};

const tweetMatchesTheme = (tweetText, themeKw, coinName) => {
  const normalizedText = normalizeToken(tweetText);
  if (!normalizedText) return false;
  const kw = normalizeToken(themeKw);
  if (kw && normalizedText.includes(kw)) return true;
  return getNameRoots(coinName).some((root) => root.length >= 3 && normalizedText.includes(root));
};

const alignSignalTweet = (tweet, themeKw, coinName) => {
  const base = { ...tweet };
  if (tweetMatchesTheme(base.text, themeKw, coinName)) return base;
  const suffix = ` ${String(themeKw || "").toUpperCase()} flow heating up.`;
  base.text = `${String(base.text || "").trim()}${suffix}`.trim();
  return base;
};

export function genNoiseToken() {
  return {
    name: pick(NOISE_TICKERS),
    emoji: pick(NOISE_EMOJIS),
    isCorrect: false,
    isTrap: false,
    isNoise: true,
    id: `noise-${Date.now()}-${Math.random()}`,
    addr: rA(),
    handle: rH2(),
    vol: rV(),
    mcap: rM2(),
    holders: rHo(),
    age: rAg(),
    devPct: rDP(),
    devAge: rDA(),
    buySell: rBS(),
    top10: rT2(),
    socials: rS2(),
    hasDS: Math.random() > 0.5,
  };
}

export function genRound(num, seed = null, maxDiffCap = 10) {
  const rng = seed !== null ? seededRng(seed + num * 7919) : null;
  const _pick = rng ? (a) => seededPick(a, rng) : pick;
  const _shuf = rng ? (a) => seededShuffle(a, rng) : shuffle;
  const diff = maxDiffCap <= 3 ? Math.min(maxDiffCap, num + 1) : Math.min(maxDiffCap, Math.floor(num / 2) + 1);
  const pc = Math.round(Math.min(5 + diff * 1.5, 20));
  const th = _pick(THEMES),
    cn = _pick(th.names);
  const tw = alignSignalTweet(_pick(th.tweets), th.kw, cn);
  // Keep decoys inside the same narrative family so X tracker context matches token board.
  const ad = [...th.decoys],
    ae = [...th.de];
  const ud = _shuf(ad).slice(0, pc - 1),
    ue = _shuf(ae).slice(0, pc - 1);
  const traps = [];
  if (diff >= 3) traps.push({ name: cn, emoji: _pick(th.de), isCorrect: false, isTrap: true });
  if (diff >= 6) traps.push({ name: _pick(th.decoys), emoji: th.emoji, isCorrect: false, isTrap: true });
  const ut = traps.slice(0, Math.min(traps.length, Math.floor(diff / 3))),
    rc = pc - 1 - ut.length;
  const pairs = _shuf([
    { name: cn, emoji: th.emoji, isCorrect: true, isTrap: false },
    ...ut,
    ...Array.from({ length: rc }, (_, i) => ({ name: ud[i] || _pick(ad), emoji: ue[i] || _pick(ae), isCorrect: false, isTrap: false })),
  ]).map((p, i) => ({
    ...p,
    isNoise: false,
    id: `${Date.now()}-${i}`,
    addr: rA(),
    handle: rH2(),
    vol: rV(),
    mcap: rM2(),
    holders: rHo(),
    age: rAg(),
    devPct: rDP(),
    devAge: rDA(),
    buySell: rBS(),
    top10: rT2(),
    socials: rS2(),
    hasDS: Math.random() > 0.5,
  }));
  return {
    tweet: tw,
    pairs,
    correctName: cn,
    correctEmoji: th.emoji,
    fillers: shuffle(FILLER).slice(0, 4),
    spawnDelay: Math.max(600 - diff * 55, 80),
    diff,
    noiseInterval: diff >= 8 ? 600 : diff >= 5 ? 1000 : diff >= 3 ? 1800 : 3000,
  };
}

export const genCode = () => {
  const c = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let s = "";
  for (let i = 0; i < 6; i++) s += c[Math.floor(Math.random() * c.length)];
  return s;
};

// DET-01 (URL pattern detection), ported from
// detection_engine/detectors/url_pattern/url_pattern_detector.py.
// Keep the keyword lists, weights and scoring in sync with that file.

export type UrlAnalysis = {
  isGambling: boolean;
  /** 0-100 */
  confidence: number;
  /** 0-1 */
  score: number;
  details: string;
  matchedRules: { rule: string; weight: number; details: string }[];
};

type Keyword = readonly [word: string, weight: number];
type PatternRule = readonly [pattern: RegExp, weight: number];

const HIGH_RISK_THRESHOLD = 0.6;

const GAMBLING_TLDS = [
  ".bet", ".casino", ".poker", ".betting", ".games",
  ".win", ".vip", ".lotto", ".bingo",
];

const TRUSTED_SUFFIXES = [".go.id", ".ac.id", ".sch.id", ".mil.id", ".edu", ".gov"];

const KEYWORDS_ID: Keyword[] = [
  ["judi", 0.9], ["taruhan", 0.8], ["togel", 0.9], ["slot", 0.7],
  ["betting", 0.8], ["bandar", 0.5], ["kasino", 0.9], ["poker", 0.7],
  ["domino", 0.4], ["ceme", 0.8], ["bola", 0.5], ["sabung", 0.7],
  ["ayam", 0.3], ["maxwin", 0.7], ["gacor", 0.6], ["jackpot", 0.8],
  ["sbobet", 0.9], ["ibcbet", 0.8], ["maxbet", 0.8], ["ligaciputra", 0.7],
];

// "slot" and "poker" are already in the Indonesian list and are not counted twice.
const KEYWORDS_EN: Keyword[] = [
  ["casino", 0.9], ["gamble", 0.8], ["bet", 0.7], ["lottery", 0.8],
  ["roulette", 0.8], ["blackjack", 0.7], ["baccarat", 0.7],
  ["sportsbook", 0.8], ["wager", 0.7], ["odds", 0.6], ["stakes", 0.6],
];

const ALL_KEYWORDS = [...KEYWORDS_ID, ...KEYWORDS_EN];

const NUMBER_PATTERNS: PatternRule[] = [
  [/\d+bet/, 0.8], [/\d+togel/, 0.8], [/\d+judi/, 0.8], [/\d+slot/, 0.7],
  [/slot\d+/, 0.7], [/gacor\d+/, 0.6], [/\d+gacor/, 0.6],
  [/maxwin\d+/, 0.7], [/\d+maxwin/, 0.7],
];

const SUSPICIOUS_PATHS: PatternRule[] = [
  [/\/slot/, 0.7], [/\/daftar/, 0.6], [/\/login/, 0.5], [/\/register/, 0.5],
  [/\/deposit/, 0.8], [/\/withdraw/, 0.8], [/\/bonus/, 0.6], [/\/promo/, 0.6],
  [/\/rtp/, 0.7], [/\/live/, 0.6],
];

export function analyzeURL(rawUrl: string): UrlAnalysis {
  const url = new URL(rawUrl.trim());
  const host = url.hostname.toLowerCase();
  const path = decodeURIComponent(url.pathname).toLowerCase();
  const pathQuery = path + url.search.toLowerCase() + url.hash.toLowerCase();
  const fullText = host + pathQuery;

  const parts = host.split(".");
  const tld = "." + parts[parts.length - 1];
  const subdomain = parts.length > 2 ? parts.slice(0, -2).join(".") : "";

  const rules: UrlAnalysis["matchedRules"] = [];
  const add = (rule: string, weight: number, details: string) =>
    rules.push({ rule, weight, details });

  if (GAMBLING_TLDS.includes(tld)) {
    add("gambling_tld", 0.3, `TLD judi terdeteksi: ${tld}`);
  }

  for (const [word, weight] of KEYWORDS_ID) {
    if (host.includes(word)) {
      add("keyword_domain", weight * 0.8, `Kata kunci judi di domain: '${word}'`);
    }
  }
  for (const [word, weight] of KEYWORDS_EN) {
    if (host.includes(word)) {
      add("keyword_domain", weight * 0.6, `Kata kunci judi di domain: '${word}'`);
    }
  }
  if (subdomain.length > 3) {
    for (const [word, weight] of ALL_KEYWORDS) {
      if (subdomain.includes(word)) {
        add("keyword_subdomain", weight * 0.5, `Kata kunci judi di subdomain: '${word}'`);
      }
    }
  }
  for (const [word, weight] of ALL_KEYWORDS) {
    if (pathQuery.includes(word)) {
      add("keyword_path_query", weight * 0.4, `Kata kunci judi di path/query: '${word}'`);
    }
  }

  for (const [pattern, weight] of NUMBER_PATTERNS) {
    if (pattern.test(fullText)) {
      add("gambling_pattern", weight, `Pola judi: ${pattern.source}`);
    }
  }
  for (const [pattern, weight] of SUSPICIOUS_PATHS) {
    if (pattern.test(path)) {
      add("suspicious_path", weight, `Path mencurigakan: ${pattern.source}`);
    }
  }

  const numbers = host.match(/\d+/g) ?? [];
  if (numbers.length >= 2) {
    add("multiple_numbers", 0.1 * numbers.length, `Banyak angka di domain: ${numbers.join(", ")}`);
  }
  for (const n of numbers) {
    if (n.length >= 3 && [...n].every((c) => c === n[0])) {
      add("repeating_number", 0.15, `Angka berulang: ${n}`);
    }
  }
  const hyphens = host.split("-").length - 1;
  if (hyphens >= 3) {
    add("hyphen_excess", 0.05 * hyphens, `Terlalu banyak tanda hubung (${hyphens})`);
  }
  const digitRatio = [...host].filter((c) => c >= "0" && c <= "9").length / host.length;
  if (digitRatio > 0.3) {
    add("digit_excess", 0.1, `Persentase angka tinggi (${Math.round(digitRatio * 100)}%)`);
  }
  if (host.includes("xn--")) {
    add("punycode_domain", 0.05, "Domain punycode/internasional");
  }

  // Noisy-OR: independent evidence combines toward 1 without exceeding it.
  let remaining = 1;
  for (const r of rules) remaining *= 1 - Math.min(Math.max(r.weight, 0), 0.95);
  let score = 1 - remaining;
  if (TRUSTED_SUFFIXES.some((s) => host.endsWith(s))) score *= 0.3;

  const isGambling = score >= HIGH_RISK_THRESHOLD;
  const top = [...rules].sort((a, b) => b.weight - a.weight)[0];
  const details = rules.length
    ? `${rules.length} pola cocok, terkuat: ${top.details}`
    : "Tidak ada pola judi pada URL";

  return {
    isGambling,
    score,
    confidence: Math.round(isGambling ? score * 100 : (1 - score) * 100),
    details,
    matchedRules: rules,
  };
}

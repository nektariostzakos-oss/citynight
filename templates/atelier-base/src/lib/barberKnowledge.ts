import { getAppRoot } from "@/lib/appRoot";
import { promises as fs } from "fs";
import path from "path";

const FILE = () => path.join(getAppRoot(), "data", "barber-knowledge.json");

export type KbEntry = {
  id: string;
  category: string;
  keywords_en: string[];
  keywords_el: string[];
  question_en: string;
  question_el: string;
  answer_en: string;
  answer_el: string;
};

let cache: { at: number; items: KbEntry[] } | null = null;
const TTL_MS = 60_000;

export async function listKb(): Promise<KbEntry[]> {
  if (cache && Date.now() - cache.at < TTL_MS) return cache.items;
  try {
    const raw = await fs.readFile(FILE(), "utf-8");
    const parsed = JSON.parse(raw);
    const items = Array.isArray(parsed) ? (parsed as KbEntry[]) : [];
    cache = { at: Date.now(), items };
    return items;
  } catch {
    return [];
  }
}

export async function writeKb(items: KbEntry[]): Promise<void> {
  await fs.mkdir(path.dirname(FILE()), { recursive: true });
  await fs.writeFile(FILE(), JSON.stringify(items, null, 2), "utf-8");
  cache = null;
}

function normalize(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

// Common stop-words — filtered out of the query before scoring so generic
// phrases like "I have no answer" don't match random KB entries on "have" / "answer".
const STOP_WORDS = new Set([
  // English
  "the","and","but","for","with","have","has","had","will","would","could","should",
  "your","yours","mine","ours","them","they","this","that","these","those",
  "what","when","where","which","while","who","whom","why","how",
  "are","was","were","been","being","am","dont","doesnt","didnt","cant","cannot",
  "not","any","some","all","also","just","only","ever","even","still","very","more","most",
  "about","from","into","onto","over","than","then","there","here","well","like","much","many",
  "tell","say","says","said","get","got","take","took","give","gave","thing","things","stuff",
  "one","two","please","sorry","thanks","hello","hi","hey","okay","ok","yes","no",
  "answer","answers","question","questions","maybe","myself","yourself","anyone","someone",
  // Greek
  "και","για","τον","την","του","της","των","αυτο","αυτος","αυτη","αυτοι","ειμαι","εισαι","ειναι","ημουν",
  "εχω","εχεις","εχει","εχουμε","εχετε","εχουν","δεν","μην","οχι","ναι","μολις",
  "τι","πως","ποσο","ποτε","που","ποιος","ποιο","ποια","ποιοι",
  "ευχαριστω","παρακαλω","γεια","καλημερα","καλησπερα",
]);

// Tiny alias map for the most common typos / variants we expect in this domain.
// Lowercased, normalized. Keep small — this is not spell-check, just friendly forgiveness.
const ALIASES: Record<string, string> = {
  bold: "bald",
  bolding: "balding",
  moustach: "moustache",
  shaveing: "shaving",
  hairdrier: "hairdryer",
  ραντεβου: "ραντεβου",
};

function expandAliases(tokens: string[]): string[] {
  return tokens.map((t) => ALIASES[t] || t);
}

/**
 * Score each KB entry against the query. Returns the top scorer if above threshold.
 * Scoring:
 *  +3 per exact keyword match
 *  +2 per token found in question text
 *  +1 per token found in answer text
 *  Stemmed prefix matching (≥3 chars) for Greek/English morphology.
 */
export function searchKb(text: string, entries: KbEntry[], _lang: "en" | "el"): KbEntry | null {
  const q = normalize(text);
  if (!q) return null;
  const rawTokens = q.split(/\s+/).filter((t) => t.length >= 3);
  // Strip stop-words + expand typo aliases
  const tokens = expandAliases(rawTokens.filter((t) => !STOP_WORDS.has(t)));
  if (tokens.length === 0) return null;

  let best: { score: number; keywordHits: number; entry: KbEntry } | null = null;
  for (const e of entries) {
    const keywords = [...(e.keywords_en || []), ...(e.keywords_el || [])].map((k) => normalize(k));
    const question = normalize(`${e.question_en} ${e.question_el}`);
    const qWords = question.split(" ").filter((w) => w.length >= 3 && !STOP_WORDS.has(w));

    let score = 0;
    let keywordHits = 0;
    for (const t of tokens) {
      // Exact keyword match (word OR prefix) — strong signal
      let hit = false;
      for (const k of keywords) {
        if (k === t || k.includes(t) || t.startsWith(k) || (k.length >= 4 && k.startsWith(t))) {
          score += 4;
          keywordHits += 1;
          hit = true;
          break;
        }
      }
      // Question body — medium signal (only on non-stop-words)
      if (!hit && qWords.some((w) => w === t || (w.length >= 4 && w.startsWith(t)) || (t.length >= 4 && t.startsWith(w)))) {
        score += 2;
      }
    }
    const normalized = score / Math.max(1, tokens.length);
    if (!best || normalized > best.score) {
      best = { score: normalized, keywordHits, entry: e };
    }
  }

  // Threshold: require either ≥2 distinct keyword hits, OR 1 keyword hit + a
  // strong overall score. A single generic keyword like "hair" shouldn't be
  // enough — too many entries contain it, causing false positives. Weak matches
  // fall through to synthesizeFallback, which frames them as "related topic".
  if (!best) return null;
  if (best.keywordHits >= 2) return best.entry;
  if (best.keywordHits >= 1 && best.score >= 2.0) return best.entry;
  return null;
}

/**
 * Find the top N KB entries for broad retrieval — used by the fallback
 * synthesizer to offer "related topics" even when no single entry matches well.
 */
export function topKbCandidates(text: string, entries: KbEntry[], limit = 3): KbEntry[] {
  const q = normalize(text);
  if (!q) return [];
  const rawTokens = q.split(/\s+/).filter((t) => t.length >= 3);
  const tokens = expandAliases(rawTokens.filter((t) => !STOP_WORDS.has(t)));
  if (tokens.length === 0) return [];

  const scored: Array<{ score: number; entry: KbEntry }> = [];
  for (const e of entries) {
    const keywords = [...(e.keywords_en || []), ...(e.keywords_el || [])].map((k) => normalize(k));
    const hay = normalize(`${e.question_en} ${e.question_el} ${e.answer_en} ${e.answer_el}`);
    let s = 0;
    for (const t of tokens) {
      if (keywords.some((k) => k === t || k.includes(t) || t.startsWith(k))) s += 3;
      else if (hay.includes(t)) s += 1;
    }
    if (s > 0) scored.push({ score: s, entry: e });
  }
  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, limit).map((x) => x.entry);
}

export function getKbAnswer(entry: KbEntry, lang: "en" | "el"): string {
  return lang === "el" ? (entry.answer_el || entry.answer_en) : (entry.answer_en || entry.answer_el);
}

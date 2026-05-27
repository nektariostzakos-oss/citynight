/**
 * Very small postal-prefix → city lookup.
 * Not exhaustive; covers the most-used ranges for GR + a few EU countries.
 * Returns best guess city + country for a given code.
 */

type Entry = { prefix: string; city: string; country: string };

const TABLE: Entry[] = [
  // Greece
  { prefix: "10", city: "Athens", country: "GR" },
  { prefix: "11", city: "Athens", country: "GR" },
  { prefix: "12", city: "Athens", country: "GR" },
  { prefix: "13", city: "Athens", country: "GR" },
  { prefix: "14", city: "Athens", country: "GR" },
  { prefix: "15", city: "Athens", country: "GR" },
  { prefix: "16", city: "Athens", country: "GR" },
  { prefix: "17", city: "Athens", country: "GR" },
  { prefix: "18", city: "Piraeus", country: "GR" },
  { prefix: "19", city: "Attica", country: "GR" },
  { prefix: "20", city: "Corinth", country: "GR" },
  { prefix: "203", city: "Loutraki", country: "GR" },
  { prefix: "21", city: "Argolida", country: "GR" },
  { prefix: "22", city: "Arcadia", country: "GR" },
  { prefix: "23", city: "Laconia", country: "GR" },
  { prefix: "24", city: "Messinia", country: "GR" },
  { prefix: "25", city: "Ilia", country: "GR" },
  { prefix: "26", city: "Patras", country: "GR" },
  { prefix: "30", city: "Mesolongi", country: "GR" },
  { prefix: "31", city: "Ioannina", country: "GR" },
  { prefix: "34", city: "Lamia", country: "GR" },
  { prefix: "35", city: "Karditsa", country: "GR" },
  { prefix: "38", city: "Volos", country: "GR" },
  { prefix: "40", city: "Larissa", country: "GR" },
  { prefix: "41", city: "Larissa", country: "GR" },
  { prefix: "50", city: "Kozani", country: "GR" },
  { prefix: "53", city: "Grevena", country: "GR" },
  { prefix: "54", city: "Thessaloniki", country: "GR" },
  { prefix: "55", city: "Thessaloniki", country: "GR" },
  { prefix: "56", city: "Thessaloniki", country: "GR" },
  { prefix: "57", city: "Thessaloniki", country: "GR" },
  { prefix: "60", city: "Katerini", country: "GR" },
  { prefix: "61", city: "Kilkis", country: "GR" },
  { prefix: "62", city: "Serres", country: "GR" },
  { prefix: "63", city: "Chalkidiki", country: "GR" },
  { prefix: "65", city: "Kavala", country: "GR" },
  { prefix: "67", city: "Xanthi", country: "GR" },
  { prefix: "68", city: "Komotini", country: "GR" },
  { prefix: "69", city: "Alexandroupoli", country: "GR" },
  { prefix: "70", city: "Heraklion", country: "GR" },
  { prefix: "71", city: "Heraklion", country: "GR" },
  { prefix: "72", city: "Rethymno", country: "GR" },
  { prefix: "73", city: "Chania", country: "GR" },
  { prefix: "74", city: "Lasithi", country: "GR" },
  { prefix: "80", city: "Mytilene", country: "GR" },
  { prefix: "83", city: "Samos", country: "GR" },
  { prefix: "84", city: "Naxos", country: "GR" },
  { prefix: "85", city: "Rhodes", country: "GR" },
  { prefix: "86", city: "Corfu", country: "GR" },
  { prefix: "90", city: "Zakynthos", country: "GR" },
  // Cyprus (post-2016 ISO-4-digit layout is region-based)
  { prefix: "10", city: "Nicosia", country: "CY" },
  // A tiny sample outside GR for flavor (user can override)
];

export function lookupPostal(code: string): { city: string; country: string } | null {
  const c = code.replace(/\s/g, "");
  if (c.length < 2) return null;
  // Longest prefix wins
  const sorted = [...TABLE].sort((a, b) => b.prefix.length - a.prefix.length);
  for (const e of sorted) {
    if (c.startsWith(e.prefix)) return { city: e.city, country: e.country };
  }
  return null;
}

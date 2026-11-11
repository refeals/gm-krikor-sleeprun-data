// Opening names come from Chess.com in English ("Sicilian Defense Open Najdorf
// Variation"). This module parses them, translates them for display
// ("Defesa Siciliana, Aberta, Variante Najdorf") and builds Portuguese search
// terms, so "defesa siciliana" or "gambito da dama" find their games.
//
// Self-contained on purpose (no imports): scripts/check-openings.mts runs it
// directly in Node to report families missing from the dictionary.

const OPENINGS_URL_PREFIX = "https://www.chess.com/openings/"

// Opening slugs can end in the moves that reach the line:
// "Ruy-Lopez-Opening-Berlin-Defense-4.O-O", "Queens-Pawn-Opening-1...d5",
// "Caro-Kann-Defense-Advance-Short-Variation-with-4-Nf3...e6". The name stops
// at the first move number ("-4.") or the first "...".
const SLUG_MOVES_PATTERN = /-\d+\.|\.\.\./

function decodeSlug(slug: string): string {
  try {
    return decodeURIComponent(slug)
  } catch {
    // A stray "%" in the slug: keep it as it came.
    return slug
  }
}

export function parseOpeningName(ecoUrl: string | undefined): string | null {
  if (!ecoUrl?.startsWith(OPENINGS_URL_PREFIX)) return null
  const slug = decodeSlug(ecoUrl.slice(OPENINGS_URL_PREFIX.length))
  const movesIndex = slug.search(SLUG_MOVES_PATTERN)
  const nameSlug = movesIndex === -1 ? slug : slug.slice(0, movesIndex)
  const name = nameSlug.replace(/-/g, " ").trim()
  // Chess.com sends the literal slug "Undefined" when it found no opening.
  if (!name || name === "Undefined") return null
  return name
}

type Gender = "f" | "m"

type NamedOpening = {
  /** Portuguese name shown on screen. */
  name: string
  /** Grammatical gender of `name`, for the words that follow it ("Aceito"/"Aceita"). */
  gender: Gender
  /** Other Portuguese names people search for. Never shown. */
  aliases?: readonly string[]
}

/**
 * Openings by their English name as it appears in parsed names. Every name
 * must start with one of these (its family); they are also recognized inside
 * a variation ("Italian Game Two Knights Defense").
 */
const NAMED_OPENINGS: Record<string, NamedOpening> = {
  "Sicilian Defense": { name: "Defesa Siciliana", gender: "f" },
  "Alapin Sicilian Defense": { name: "Siciliana Alapin", gender: "f", aliases: ["defesa siciliana"] },
  "Closed Sicilian Defense": { name: "Siciliana Fechada", gender: "f", aliases: ["defesa siciliana"] },
  "Kings Pawn Opening": { name: "Abertura do Peão do Rei", gender: "f" },
  "Queens Pawn Opening": { name: "Abertura do Peão da Dama", gender: "f" },
  "Scandinavian Defense": { name: "Defesa Escandinava", gender: "f" },
  "French Defense": { name: "Defesa Francesa", gender: "f" },
  "Caro Kann Defense": { name: "Defesa Caro-Kann", gender: "f" },
  "Scotch Game": { name: "Partida Escocesa", gender: "f", aliases: ["jogo escocês", "abertura escocesa"] },
  "Kings Gambit": { name: "Gambito do Rei", gender: "m" },
  "Englund Gambit": { name: "Gambito Englund", gender: "m" },
  "Queens Gambit": { name: "Gambito da Dama", gender: "m" },
  "Magnus Queens Gambit": { name: "Gambito da Dama Magnus", gender: "m" },
  "English Opening": { name: "Abertura Inglesa", gender: "f" },
  "English Defense": { name: "Defesa Inglesa", gender: "f" },
  "Indian Game": { name: "Defesa Índia", gender: "f", aliases: ["partida índia"] },
  "Petrovs Defense": { name: "Defesa Petrov", gender: "f", aliases: ["defesa russa"] },
  "Four Knights Game": { name: "Partida dos Quatro Cavalos", gender: "f", aliases: ["abertura dos quatro cavalos"] },
  "Three Knights Opening": { name: "Abertura dos Três Cavalos", gender: "f", aliases: ["partida dos três cavalos"] },
  "Two Knights Defense": { name: "Defesa dos Dois Cavalos", gender: "f" },
  "Modern Defense": { name: "Defesa Moderna", gender: "f" },
  "Vienna Game": { name: "Partida Vienense", gender: "f", aliases: ["abertura vienense"] },
  "Ruy Lopez Opening": { name: "Ruy López", gender: "f", aliases: ["abertura espanhola", "partida espanhola"] },
  "Danish Gambit": { name: "Gambito Dinamarquês", gender: "m" },
  "Pirc Defense": { name: "Defesa Pirc", gender: "f" },
  "Bishops Opening": { name: "Abertura do Bispo", gender: "f" },
  "Alekhines Defense": { name: "Defesa Alekhine", gender: "f" },
  "Philidor Defense": { name: "Defesa Philidor", gender: "f" },
  "Italian Game": { name: "Partida Italiana", gender: "f", aliases: ["jogo italiano", "abertura italiana", "giuoco piano"] },
  "Giuoco Piano Game": { name: "Giuoco Piano", gender: "m", aliases: ["partida italiana", "jogo italiano"] },
  "Nimzowitsch Defense": { name: "Defesa Nimzowitsch", gender: "f" },
  "Nimzowitsch Larsen Attack": { name: "Ataque Nimzowitsch-Larsen", gender: "m", aliases: ["abertura larsen"] },
  "Reti Opening": { name: "Abertura Réti", gender: "f" },
  "Center Game": { name: "Partida do Centro", gender: "f", aliases: ["abertura do centro"] },
  "Kings Indian Defense": { name: "Defesa Índia do Rei", gender: "f" },
  "Kings Indian Attack": { name: "Ataque Índio do Rei", gender: "m", aliases: ["índia do rei"] },
  "Queens Indian Defense": { name: "Defesa Índia da Dama", gender: "f" },
  "Nimzo Indian Defense": { name: "Defesa Nimzo-Índia", gender: "f" },
  "Bogo Indian Defense": { name: "Defesa Bogo-Índia", gender: "f" },
  "Old Indian Defense": { name: "Defesa Índia Antiga", gender: "f" },
  "Van t Kruijs Opening": { name: "Abertura Van't Kruijs", gender: "f" },
  "Owens Defense": { name: "Defesa Owen", gender: "f" },
  "Kings Fianchetto Opening": { name: "Abertura do Fianqueto do Rei", gender: "f" },
  "Birds Opening": { name: "Abertura Bird", gender: "f" },
  "Slav Defense": { name: "Defesa Eslava", gender: "f" },
  "Semi Slav Defense": { name: "Defesa Semi-Eslava", gender: "f" },
  "Budapest Gambit": { name: "Gambito Budapeste", gender: "m", aliases: ["gambito de budapeste"] },
  "London System": { name: "Sistema Londres", gender: "m", aliases: ["sistema de londres"] },
  "Colle System": { name: "Sistema Colle", gender: "m" },
  "Grunfeld Defense": { name: "Defesa Grünfeld", gender: "f" },
  "Neo Grunfeld Defense": { name: "Defesa Neo-Grünfeld", gender: "f" },
  "Dutch Defense": { name: "Defesa Holandesa", gender: "f" },
  "Trompowsky Attack": { name: "Ataque Trompowsky", gender: "m" },
  "Torre Attack": { name: "Ataque Torre", gender: "m" },
  "Richter Veresov Attack": { name: "Ataque Richter-Veresov", gender: "m" },
  "Mieses Opening": { name: "Abertura Mieses", gender: "f" },
  "Benoni Defense": { name: "Defesa Benoni", gender: "f" },
  "Old Benoni Defense": { name: "Defesa Benoni Antiga", gender: "f", aliases: ["defesa benoni"] },
  "Benko Gambit": { name: "Gambito Benko", gender: "m" },
  "Polish Opening": { name: "Abertura Polonesa", gender: "f", aliases: ["abertura orangotango"] },
  "Ponziani Opening": { name: "Abertura Ponziani", gender: "f" },
  "Saragossa Opening": { name: "Abertura Saragoça", gender: "f" },
  "Anderssen Opening": { name: "Abertura Anderssen", gender: "f" },
  "Grob Opening": { name: "Abertura Grob", gender: "f" },
  "Tarrasch Defense": { name: "Defesa Tarrasch", gender: "f" },
  "Catalan Opening": { name: "Abertura Catalã", gender: "f" },
  "Lion Defense": { name: "Defesa Leão", gender: "f" },
  "Clemenz Opening": { name: "Abertura Clemenz", gender: "f" },
  "Van Geet Opening": { name: "Abertura Van Geet", gender: "f" },
  "Evans Gambit": { name: "Gambito Evans", gender: "m" },
  "Latvian Gambit": { name: "Gambito Letão", gender: "m" },
  "Albin Countergambit": { name: "Contragambito Albin", gender: "m" },
  "Falkbeer Countergambit": { name: "Contragambito Falkbeer", gender: "m" },
  "Smith Morra Gambit": { name: "Gambito Smith-Morra", gender: "m" },
  "Blackmar Diemer Gambit": { name: "Gambito Blackmar-Diemer", gender: "m" },
  "Fried Liver Attack": { name: "Ataque Fígado Frito", gender: "m" },
  "Berlin Defense": { name: "Defesa Berlim", gender: "f" },
}

/** Words that end a part of a variation name and lead it in Portuguese. */
const HEADS: Record<string, { word: string; gender: Gender }> = {
  Variation: { word: "Variante", gender: "f" },
  Variations: { word: "Variantes", gender: "f" },
  Line: { word: "Linha", gender: "f" },
  Defense: { word: "Defesa", gender: "f" },
  Attack: { word: "Ataque", gender: "m" },
  Counterattack: { word: "Contra-ataque", gender: "m" },
  Gambit: { word: "Gambito", gender: "m" },
  Countergambit: { word: "Contragambito", gender: "m" },
  System: { word: "Sistema", gender: "m" },
  Opening: { word: "Abertura", gender: "f" },
  Game: { word: "Partida", gender: "f" },
  Formation: { word: "Formação", gender: "f" },
  Sacrifice: { word: "Sacrifício", gender: "m" },
}

/** Adjectives as [feminine, masculine]. */
const ADJECTIVES: Record<string, readonly [string, string]> = {
  Accepted: ["Aceita", "Aceito"],
  Declined: ["Recusada", "Recusado"],
  Classical: ["Clássica", "Clássico"],
  Modern: ["Moderna", "Moderno"],
  Open: ["Aberta", "Aberto"],
  Closed: ["Fechada", "Fechado"],
  Old: ["Antiga", "Antigo"],
  Main: ["Principal", "Principal"],
  Normal: ["Normal", "Normal"],
  Standard: ["Padrão", "Padrão"],
  Traditional: ["Tradicional", "Tradicional"],
  Orthodox: ["Ortodoxa", "Ortodoxo"],
  Positional: ["Posicional", "Posicional"],
  Quiet: ["Tranquila", "Tranquilo"],
  Short: ["Curta", "Curto"],
  Improved: ["Melhorada", "Melhorado"],
  Deferred: ["Adiada", "Adiado"],
  Delayed: ["Atrasada", "Atrasado"],
  Accelerated: ["Acelerada", "Acelerado"],
  Hyperaccelerated: ["Hiperacelerada", "Hiperacelerado"],
  Symmetrical: ["Simétrica", "Simétrico"],
  Reversed: ["Invertida", "Invertido"],
  Hybrid: ["Híbrida", "Híbrido"],
  Double: ["Dupla", "Duplo"],
  Great: ["Grande", "Grande"],
  Spanish: ["Espanhola", "Espanhol"],
  Italian: ["Italiana", "Italiano"],
  English: ["Inglesa", "Inglês"],
  French: ["Francesa", "Francês"],
  Dutch: ["Holandesa", "Holandês"],
  Scotch: ["Escocesa", "Escocês"],
  Sicilian: ["Siciliana", "Siciliano"],
  Indian: ["Índia", "Índio"],
  Slav: ["Eslava", "Eslavo"],
  Latvian: ["Letã", "Letão"],
  Vienna: ["Vienense", "Vienense"],
  Hungarian: ["Húngara", "Húngaro"],
  Portuguese: ["Portuguesa", "Português"],
  Austrian: ["Austríaca", "Austríaco"],
  Czech: ["Tcheca", "Tcheco"],
  Norwegian: ["Norueguesa", "Norueguês"],
  Baltic: ["Báltica", "Báltico"],
  Polish: ["Polonesa", "Polonês"],
  Scandinavian: ["Escandinava", "Escandinavo"],
  Catalan: ["Catalã", "Catalão"],
  Original: ["Original", "Original"],
}

/** Nouns, used as names ("Variante Dragão") or with a preposition ("Variante das Trocas"). */
const NOUNS: Record<string, string> = {
  Exchange: "das Trocas",
  Advance: "do Avanço",
  Push: "do Avanço",
  Fianchetto: "do Fianqueto",
  Wing: "da Ala",
  Queenside: "da Ala da Dama",
  Center: "do Centro",
  Check: "do Xeque",
  Knight: "do Cavalo",
  Knights: "dos Cavalos",
  Bishop: "do Bispo",
  Bishops: "dos Bispos",
  Pawn: "do Peão",
  Pawns: "dos Peões",
  Dragon: "Dragão",
  Elephant: "Elefante",
  Snake: "Cobra",
  Rat: "Rato",
  Hedgehog: "Porco-Espinho",
  Fantasy: "Fantasia",
  Triangle: "Triângulo",
  Berlin: "Berlim",
  London: "Londres",
  Budapest: "Budapeste",
  Venice: "Veneza",
  East: "Leste",
  with: "com",
  and: "e",
}

/** Multi-word words that lead a part of a variation name, like HEADS. */
const HEAD_PHRASES: Record<string, { word: string; gender: Gender }> = {
  "Move Order": { word: "Ordem de Lances", gender: "f" },
}

/** Multi-word pieces of variation names, translated as a whole. */
const VARIATION_PHRASES: Record<string, string> = {
  "Anglo Indian": "Anglo-Índia",
  "Anglo Scandinavian": "Anglo-Escandinava",
  "Anglo Dutch": "Anglo-Holandesa",
  "Anglo Grunfeld": "Anglo-Grünfeld",
  "Anglo Slav": "Anglo-Eslava",
  "Kings English": "Inglesa do Rei",
  "East Indian": "Índia Oriental",
  "Nimzo Indian": "Nimzo-Índia",
  "Two Pawns": "dos Dois Peões",
  "Three Pawns": "dos Três Peões",
  "Four Pawns": "dos Quatro Peões",
  "Double Pawn Sacrifice": "Sacrifício de Dois Peões",
  "Two Knights": "dos Dois Cavalos",
  "Three Knights": "dos Três Cavalos",
  "Four Knights": "dos Quatro Cavalos",
  "Kings Knight": "do Cavalo do Rei",
  "Queens Knight": "do Cavalo da Dama",
  "Kings Bishop": "do Bispo do Rei",
  "Queens Bishop": "do Bispo da Dama",
  "Kings Pawn": "do Peão do Rei",
  "Queens Pawn": "do Peão da Dama",
  "Kings Indian": "Índia do Rei",
  "Queens Indian": "Índia da Dama",
  "Accelerated Dragon": "Dragão Acelerado",
  "Hyperaccelerated Dragon": "Dragão Hiperacelerado",
  "Reversed French": "Francesa Invertida",
  "Reversed Sicilian": "Siciliana Invertida",
  "Reversed Alekhine": "Alekhine Invertida",
  "Smith Morra": "Smith-Morra",
  "Mieses Kotrc": "Mieses-Kotrc",
  "Blackmar Diemer": "Blackmar-Diemer",
  "Caro Kann": "Caro-Kann",
  "Max Lange": "Max Lange",
  "Maroczy Bind": "Bind de Maroczy",
  "Monte Carlo": "Monte Carlo",
  "St George": "São Jorge",
  "La Bourdonnais": "La Bourdonnais",
}

/** Lowercase search words for terms that don't show up as Portuguese names. */
const SEARCH_WORDS: Record<string, string> = {
  Kings: "rei",
  Queens: "dama",
}

/** Prefixes joined to the next word: "Anti Marshall" → "Anti-Marshall", "Pseudo Catalan" → "Pseudo-Catalã". */
const PREFIXES = new Set(["Anti", "Pseudo", "Semi", "Neo", "Ultra"])

/** Words that, right after the family, describe the family itself: "Siciliana, Aberta". */
const FAMILY_ADJECTIVES = new Set(["Open", "Closed"])

// Longest first, so "Alapin Sicilian Defense" wins over "Sicilian Defense".
const NAMED_OPENING_KEYS = Object.keys(NAMED_OPENINGS).sort((a, b) => b.length - a.length)
const VARIATION_PHRASE_KEYS = Object.keys(VARIATION_PHRASES).sort((a, b) => b.length - a.length)
const HEAD_PHRASE_KEYS = Object.keys(HEAD_PHRASES).sort((a, b) => b.length - a.length)

function findFamily(openingName: string): string | undefined {
  return NAMED_OPENING_KEYS.find(
    (key) => openingName === key || openingName.startsWith(`${key} `),
  )
}

type Unit =
  | { kind: "opening"; opening: NamedOpening }
  | { kind: "head"; word: string; gender: Gender }
  | { kind: "adjective"; forms: readonly [string, string]; english: string }
  | { kind: "text"; text: string }

function startsWithPhrase(words: readonly string[], index: number, phrase: string): boolean {
  const remaining = words.slice(index).join(" ")
  return remaining === phrase || remaining.startsWith(`${phrase} `)
}

/**
 * Reads one unit at `index`, longest phrases first. Returns the unit and how
 * many words it used. After a prefix, named openings are not matched: in
 * "Anti Torre Attack" the prefix belongs to "Torre", giving "Ataque Anti-Torre".
 */
function readUnit(words: readonly string[], index: number, matchOpenings = true): [Unit, number] {
  for (const key of matchOpenings ? NAMED_OPENING_KEYS : []) {
    if (startsWithPhrase(words, index, key)) {
      return [{ kind: "opening", opening: NAMED_OPENINGS[key] }, key.split(" ").length]
    }
  }
  for (const key of HEAD_PHRASE_KEYS) {
    if (startsWithPhrase(words, index, key)) return [{ kind: "head", ...HEAD_PHRASES[key] }, key.split(" ").length]
  }
  for (const key of VARIATION_PHRASE_KEYS) {
    if (startsWithPhrase(words, index, key)) {
      return [{ kind: "text", text: VARIATION_PHRASES[key] }, key.split(" ").length]
    }
  }

  const word = words[index]
  if (PREFIXES.has(word) && index + 1 < words.length) {
    const [next, used] = readUnit(words, index + 1, false)
    if (next.kind === "adjective") {
      const forms = [`${word}-${next.forms[0]}`, `${word}-${next.forms[1]}`] as const
      return [{ kind: "adjective", forms, english: `${word} ${next.english}` }, used + 1]
    }
    if (next.kind === "text") return [{ kind: "text", text: `${word}-${next.text}` }, used + 1]
  }
  const head = HEADS[word]
  if (head) return [{ kind: "head", ...head }, 1]
  const adjective = ADJECTIVES[word]
  if (adjective) return [{ kind: "adjective", forms: adjective, english: word }, 1]
  return [{ kind: "text", text: NOUNS[word] ?? word }, 1]
}

/** Splits the words after the family into units. */
function toUnits(words: readonly string[]): Unit[] {
  const units: Unit[] = []
  for (let index = 0; index < words.length; ) {
    const [unit, used] = readUnit(words, index)
    units.push(unit)
    index += used
  }
  return units
}

// Adjectives come right after the leading word, then names and the rest:
// "Mieses Kotrc Main Line" → "Linha Principal Mieses-Kotrc".
function renderModifiers(modifiers: readonly Unit[], gender: Gender): string {
  const adjectives = modifiers.filter((unit) => unit.kind === "adjective")
  const others = modifiers.filter((unit) => unit.kind !== "adjective")
  return [...adjectives, ...others]
    .map((unit) => {
      if (unit.kind === "adjective") return unit.forms[gender === "f" ? 0 : 1]
      if (unit.kind === "text") return unit.text
      if (unit.kind === "opening") return unit.opening.name
      return unit.word
    })
    .join(" ")
}

const isAcceptance = (unit: Unit) =>
  unit.kind === "adjective" && (unit.english === "Accepted" || unit.english === "Declined")

/**
 * Portuguese display name. Families come from the dictionary; variation parts
 * are rebuilt with their leading word first ("Najdorf Variation" → "Variante
 * Najdorf") and adjectives agreeing in gender. Proper names stay as they are.
 * Names whose family isn't in the dictionary are returned unchanged.
 */
export function translateOpeningName(openingName: string): string {
  let translation = translationCache.get(openingName)
  if (translation === undefined) {
    translation = buildTranslation(openingName)
    translationCache.set(openingName, translation)
  }
  return translation
}

// A few hundred distinct names at most, each translated once per process.
const translationCache = new Map<string, string>()

function buildTranslation(openingName: string): string {
  const familyKey = findFamily(openingName)
  if (!familyKey) return openingName

  const family = NAMED_OPENINGS[familyKey]
  const units = toUnits(openingName.slice(familyKey.length).split(" ").filter(Boolean))
  const parts: { text: string; gender: Gender }[] = [{ text: family.name, gender: family.gender }]
  let pending: Unit[] = []

  const attachToLastPart = (unit: Unit) => {
    const last = parts[parts.length - 1]
    last.text += ` ${renderModifiers([unit], last.gender)}`
  }

  // "Accepted"/"Declined" right after the family describe it: "Gambito do Rei Aceito".
  while (units.length > 0 && isAcceptance(units[0])) attachToLastPart(units.shift()!)

  for (const unit of units) {
    if (unit.kind === "opening") {
      // Adjectives right before a named opening describe it:
      // "Accelerated London System" → "Sistema Londres Acelerado".
      const describesOpening = pending.length > 0 && pending.every((item) => item.kind === "adjective")
      if (pending.length > 0 && !describesOpening) {
        parts.push({ text: renderModifiers(pending, family.gender), gender: family.gender })
      }
      const adjectives = describesOpening ? ` ${renderModifiers(pending, unit.opening.gender)}` : ""
      parts.push({ text: `${unit.opening.name}${adjectives}`, gender: unit.opening.gender })
      pending = []
      continue
    }
    if (unit.kind !== "head") {
      // "Accepted"/"Declined" right after a named opening or gambit belong to it.
      if (pending.length === 0 && isAcceptance(unit) && parts.length > 1) {
        attachToLastPart(unit)
        continue
      }
      pending.push(unit)
      continue
    }
    // "Open Najdorf Variation": "Open" describes the family, the rest is the variation.
    if (
      parts.length === 1 &&
      pending.length > 1 &&
      pending[0].kind === "adjective" &&
      FAMILY_ADJECTIVES.has(pending[0].english)
    ) {
      parts.push({ text: renderModifiers([pending[0]], family.gender), gender: family.gender })
      pending = pending.slice(1)
    }
    const modifiers = renderModifiers(pending, unit.gender)
    parts.push({ text: modifiers ? `${unit.word} ${modifiers}` : unit.word, gender: unit.gender })
    pending = []
  }

  if (pending.length > 0) {
    parts.push({ text: renderModifiers(pending, family.gender), gender: family.gender })
  }

  return parts.map((part) => part.text).join(", ")
}

/** Portuguese terms for an opening name, space-separated, for the search index. */
export function getPortugueseSearchTerms(openingName: string): string {
  const terms = [translateOpeningName(openingName)]
  const padded = ` ${openingName} `
  for (const [phrase, opening] of Object.entries(NAMED_OPENINGS)) {
    if (padded.includes(` ${phrase} `)) terms.push(opening.name, ...(opening.aliases ?? []))
  }
  for (const word of openingName.split(" ")) {
    const term = SEARCH_WORDS[word]
    if (term) terms.push(term)
  }
  return terms.join(" ")
}

/** True when the name starts with an opening from the dictionary. */
export function hasKnownOpeningFamily(openingName: string): boolean {
  return findFamily(openingName) !== undefined
}

const FAMILY_END_WORDS = /^(Defense|Gambit|Countergambit|Opening|Game|Attack|System)$/

/** Best guess at the family: words up to the first "Defense", "Gambit", "Opening"… */
export function guessOpeningFamily(openingName: string): string {
  const words = openingName.split(" ")
  const end = words.findIndex((word) => FAMILY_END_WORDS.test(word))
  return words.slice(0, end === -1 ? words.length : end + 1).join(" ")
}

const reportedFamilies = new Set<string>()

/**
 * Logs, once per server instance, each opening family missing from the
 * dictionary. Shows up in the Vercel logs when a new opening appears.
 */
export function reportUnknownOpeningFamilies(openingNames: Iterable<string | null>) {
  for (const name of openingNames) {
    if (!name || hasKnownOpeningFamily(name)) continue
    const family = guessOpeningFamily(name)
    if (reportedFamilies.has(family)) continue
    reportedFamilies.add(family)
    console.warn(
      `[openings] "${family}" is not in the opening dictionary (e.g. "${name}"); it shows and searches in English. Add it to NAMED_OPENINGS in lib/openings.ts.`,
    )
  }
}

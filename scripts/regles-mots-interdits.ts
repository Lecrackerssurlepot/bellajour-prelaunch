/**
 * M-01 (17/11) : une règle du registre ne nomme jamais un projet, un client ni une photo. La liste des mots qui trahissent un projet
 * (prénoms de clients connus, noms de projets du banc, lieux des projets de test) et les formes d'un numéro de photo.
 * Tenue ici, lue par `verif-mep-regles.ts` (le garde-fou) et par `regles-reprise.ts` (qui généralise en reprenant les cahiers).
 * Un prénom de client nouveau s'ajoute ici. Sans base, sans réseau.
 */

export const MOTS_INTERDITS: readonly string[] = [
  /* prénoms de clients et de projets connus (bêta, corpus, banc, édition collective) */
  "Joëlle", "Joelle", "Eloise", "Eloïse", "Klervie", "Candice", "Marjorie", "Lara", "Laraclette", "Lulu", "Merisa", "Jeanne",
  "Mathilde", "Justine", "Geffroy", "Audencia",
  /* lieux et noms propres des projets de test, qui ne disent rien d'une règle générale */
  "Australie", "Sydney", "Madère", "Madrid", "Martinique", "Hautes-Alpes", "Boatshed", "Galaxy",
];

/** Un numéro de photo ou de fichier : « IMG_1234 », « 042 », « photo 118 », « int-14 », « 123/124 ». */
export const FORMES_NUMERO_PHOTO: readonly RegExp[] = [
  /\bIMG[_-]?\d+/i,
  /(^|[^\d,.\-])0\d{2}(?![\d,.])/,
  /\bphotos? (?:n° ?)?\d{2,4}\b(?![:,])/i,
  /\bint-\d+/i,
  /\b\d{3}\/\d{3}\b/,
];

const sansAccent = (s: string): string => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

/** Les mots et formes interdits trouvés dans un texte (vide = propre). */
export function motsDeProjet(texte: string): string[] {
  const t = sansAccent(texte);
  const vus = MOTS_INTERDITS.filter((m) => new RegExp(`(^|[^a-z])${sansAccent(m).replace(/[-]/g, "\\-")}([^a-z]|$)`).test(t));
  for (const f of FORMES_NUMERO_PHOTO) { const x = texte.match(f); if (x) vus.push(x[0].trim()); }
  return vus;
}

/**
 * Le SOCLE (19/11, T-219) : la même garde, élargie aux lieux, enseignes et objets des deux magazines de référence du socle et aux formes
 * de leurs repères (codes de magazine suivis d'un numéro, pages « p07 », numéros à deux chiffres « 07 »). Séparée de `MOTS_INTERDITS` :
 * la reprise des cahiers (`regles-reprise.ts`) lit la première liste et doit rester ce qu'elle est.
 */
export const MOTS_INTERDITS_SOCLE: readonly string[] = [
  ...MOTS_INTERDITS,
  "Japon", "Japan", "japonais", "Tokyo", "Kyoto", "Osaka", "Nara", "Fuji", "Hiroshima", "Miyajima", "Hakone", "Hatsukaichi",
  "Blue Elephant", "Mutekiya", "Antilles", "torii", "daruma", "Uluru", "Melbourne", "Brisbane", "Cairns", "Queensland",
];

export const FORMES_SOCLE: readonly RegExp[] = [
  ...FORMES_NUMERO_PHOTO,
  /\b(?:JAP|JAP-R|AUS|JP|AU)[- ]?(?:R )?\d{1,3}\b/,
  /\[(?:AUS|AU|JAP|JP)\]/,
  /\bp\d{2}\b/,
  /(?<![\d,.\-:/h°A-Za-z#])(?<!h )0\d(?![\d,.:/h%\-])/,
];

/** Les mots et formes interdits par le socle trouvés dans un texte (vide = propre). */
export function motsDuSocle(texte: string): string[] {
  const t = sansAccent(texte);
  const vus = MOTS_INTERDITS_SOCLE.filter((m) => new RegExp(`(^|[^a-z])${sansAccent(m).replace(/[-]/g, "\\-")}([^a-z]|$)`).test(t));
  for (const f of FORMES_SOCLE) { const x = texte.match(f); if (x) vus.push(x[0].trim()); }
  return vus;
}

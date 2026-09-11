/**
 * Les trois visuels de l'état 2 — C1, C4, la double page (PRD §8).
 *
 * `numeros.apercu_urls` est un jsonb libre : c'est /admin qui l'écrit (lot 7).
 * On accepte donc DEUX écritures possibles, et on les résout ici plutôt que de
 * contraindre l'atelier à un format unique le jour où il aura une couverture
 * exportée de Canva sous la main :
 *   — une clé d'objet R2 (« numeros/…/apercu/c1.jpg ») → signée à chaque rendu ;
 *   — une URL absolue (https://…) → servie telle quelle.
 *
 * Le bucket reste PRIVÉ. Le rendre public exposerait, dans le dossier voisin,
 * les photos brutes de toutes les clientes.
 *
 * Un visuel manquant ne casse jamais la page : la vignette laisse place à un
 * cadre de la charte. Même règle qu'au dépôt — jamais de case cassée.
 */

import { signerGet } from "./r2";
import { cleCadrageCouverture } from "./transitions";

/**
 * `plat` (T2-2) : la couverture À PLAT, C4 | dos | C1 dans un seul fichier —
 * le format d'export naturel de Canva et le format normal des nouvelles
 * publications. Quand il est présent, c1/c4 sont null par construction
 * (transitions.ts n'écrit jamais les deux formats ensemble) ; les dossiers
 * publiés avant ce format portent c1/c4 et un plat null. L'affichage choisit
 * son rendu sur cette seule distinction.
 */
/** On montre au plus TROIS doubles pages (décision de Mathias, 02/09). */
export const MAX_DOUBLES = 3;

/**
 * Et au plus TROIS couvertures proposées au choix (T-093, 07/09).
 *
 * Trois est le même plafond que les doubles pages, volontairement : au-delà,
 * un choix cesse d'être une préférence et devient un catalogue — la cliente
 * n'est pas venue arbitrer, elle est venue reconnaître son moment. L'atelier
 * en publie une, deux ou trois ; une seule reste le cas normal.
 */
export const MAX_PLANCHES = 3;

export type Apercu = {
  /**
   * ⚠️ RÉTROCOMPAT, même patron que `double` ci-dessous : la PREMIÈRE
   * planche (= `plats[0]`). C'est elle qui est proposée par défaut à la
   * cliente (décision de Mathias, 07/09 : jamais d'obstacle devant le
   * paiement, elle peut payer sans rien choisir).
   */
  plat: string | null;
  /**
   * 0 à `MAX_PLANCHES` couvertures résolues, dans l'ordre où l'atelier les
   * a rangées — donc dans l'ordre où la cliente les verra.
   */
  plats: string[];
  c1: string | null;
  c4: string | null;
  /** 0 à `MAX_DOUBLES` doubles pages résolues, dans l'ordre d'affichage. */
  doubles: string[];
  /**
   * Le CADRAGE de chaque double page, ALIGNÉ sur `doubles` — une valeur
   * `object-position` CSS (« 50% 30% »), chaîne vide quand rien n'est réglé.
   *
   * En base, les cadrages sont une map indexée par CLÉ de coffre : l'atelier
   * réordonne et retire des pages, et un tableau indexé par rang associerait
   * le cadrage de l'une à l'image de l'autre au premier glissé. Mais le
   * navigateur ne voit que des URL signées, jamais les clés : on aligne donc
   * ici, au seul endroit qui connaît encore les deux.
   */
  doublesCadrage: string[];
  /**
   * Le cadrage de chaque FACE de chaque planche, ALIGNÉ sur `plats` (T-090,
   * rouvert 07/09) — une planche montre deux faces (« La couverture » = C1,
   * « La quatrième » = C4) du même fichier, donc deux tableaux plutôt qu'un,
   * même patron que `doublesCadrage`. Chaîne vide quand rien n'est réglé :
   * la coupe reste centrée automatiquement, exactement comme avant.
   */
  platsCadrageDroite: string[];
  platsCadrageGauche: string[];
  /**
   * ⚠️ RÉTROCOMPAT : la PREMIÈRE double page (= `doubles[0]`). Le format
   * historique n'écrit qu'une seule double page sous la clé `double` ; les
   * écrans qui n'ont pas encore migré vers `doubles` lisent encore ce champ.
   * À retirer le jour où tous les consommateurs liront `doubles`.
   */
  double: string | null;
};

const VIDE: Apercu = {
  plat: null,
  plats: [],
  c1: null,
  c4: null,
  doubles: [],
  double: null,
  doublesCadrage: [],
  platsCadrageDroite: [],
  platsCadrageGauche: [],
};

function lire(source: Record<string, unknown>, ...noms: string[]): string | null {
  for (const nom of noms) {
    const v = source[nom];
    if (typeof v === "string" && v.trim()) return v.trim();
  }
  return null;
}

/**
 * Les clés (ou URL) des doubles pages, TELLES QUELLES, avant résolution R2.
 *
 * Deux formats acceptés, comme pour les couvertures :
 *   — nouveau : un TABLEAU sous `doubles` (1 à `MAX_DOUBLES` entrées) ;
 *   — historique : une valeur UNIQUE sous `double`, traitée comme une liste
 *     d'un seul élément.
 * Le tableau prime sur la valeur unique. Les entrées vides ou non-chaînes sont
 * ignorées, et on borne à `MAX_DOUBLES` : l'admin ne peut pas en publier plus
 * que ce que la visionneuse sait montrer. Pur — éprouvé par verif-atelier.ts.
 */
export function lireDoublesBrutes(source: Record<string, unknown>): string[] {
  return lireListe(source, ["doubles", "doubles_pages", "doublesPages"],
    ["double", "double_page", "doublePage"], MAX_DOUBLES);
}

/**
 * Les clés (ou URL) des COUVERTURES proposées, telles quelles (T-093).
 *
 * Exactement le même contrat que les doubles pages, et pour la même raison :
 * un tableau sous `plats` pour les publications qui en proposent plusieurs,
 * la valeur unique historique sous `plat` sinon — donc TOUS les dossiers
 * déjà publiés continuent de se résoudre sans migration ni reprise.
 */
export function lirePlanchesBrutes(source: Record<string, unknown>): string[] {
  return lireListe(source, ["plats", "planches", "couvertures"],
    ["plat", "couverture_plat", "a_plat"], MAX_PLANCHES);
}

/**
 * Les cadrages, tels quels : une map clé de coffre → `object-position`.
 *
 * Sévèrement filtrée, parce que cette valeur part dans un attribut `style`
 * côté navigateur : uniquement des pourcentages et des mots-clés simples,
 * deux composantes au plus. Tout le reste est ignoré — une chaîne libre
 * venue de la base n'a rien à faire dans du CSS.
 */
const CADRAGE_SUR = /^(\d{1,3}(\.\d+)?%|left|right|center|top|bottom)( (\d{1,3}(\.\d+)?%|left|right|center|top|bottom))?$/;

export function lireCadrages(source: Record<string, unknown>): Record<string, string> {
  const brut = source.cadrages;
  if (!brut || typeof brut !== "object" || Array.isArray(brut)) return {};
  const sortie: Record<string, string> = {};
  for (const [cle, valeur] of Object.entries(brut as Record<string, unknown>)) {
    if (typeof valeur !== "string") continue;
    const v = valeur.trim();
    if (CADRAGE_SUR.test(v)) sortie[cle] = v;
  }
  return sortie;
}

/* ══════════════════════════════════════════════════════════════════════
   LE CHOIX DE COUVERTURE DU CLIENT (T-093, élargi le 11/09/2026)

   Trois réponses possibles, et la troisième manquait : « celle-ci »,
   « celle-là »… et « décidez pour moi ». Sans elle, le client qui n'a pas
   d'avis n'avait aucun moyen de le DIRE : son silence se lisait exactement
   comme un dossier jamais ouvert, et l'atelier ne savait pas s'il attendait
   encore une réponse ou s'il pouvait composer.

   Pur, et ÉPROUVÉ PAR LE HARNAIS : c'est la validation d'un corps de requête
   publique, donc la seule barrière entre `evenements` et n'importe qui. Le
   rang n'est jamais une URL (une clé de coffre n'a rien à faire dans un corps
   public, et une URL signée expire) ; « indifferent » est le seul mot accepté.
   ══════════════════════════════════════════════════════════════════════ */

/** Le mot que le navigateur envoie pour « je vous fais confiance ». */
export const CHOIX_INDIFFERENT = "indifferent";

export type ChoixCouverture = { rang: number } | { indifferent: true };

/**
 * Le choix envoyé par le client, ou `null` si ce n'en est pas un.
 *
 * ⚠️ On ne vérifie PAS qu'une couverture existe vraiment à ce rang : c'est une
 * préférence journalisée, pas un ordre donné à la machine, et un rang qui ne
 * désigne plus rien (l'atelier a retiré une proposition entre-temps) doit
 * rester lisible dans le récit plutôt que disparaître en erreur.
 */
export function lireChoixCouverture(valeur: unknown): ChoixCouverture | null {
  if (typeof valeur === "string" && valeur.trim().toLowerCase() === CHOIX_INDIFFERENT) {
    return { indifferent: true };
  }
  if (
    typeof valeur === "number" &&
    Number.isInteger(valeur) &&
    valeur >= 0 &&
    valeur < MAX_PLANCHES
  ) {
    return { rang: valeur };
  }
  return null;
}

/**
 * Le DERNIER choix exprimé ET SA DATE, relus dans le journal (append-only,
 * aucune colonne : même patron que `ajustement_demande`).
 *
 * La liste peut être dans n'importe quel ordre : on prend l'événement le plus
 * récent par sa date. Un client qui hésite écrit plusieurs lignes, et c'est
 * la dernière qui dit ce qu'il veut aujourd'hui — les précédentes restent au
 * journal, l'hésitation est une information.
 *
 * ⚠️ LA DATE FAIT PARTIE DE LA RÉPONSE (11/09/2026). « Le client préfère la
 * couverture 2 » sans quand, lu trois semaines plus tard sur un dossier
 * republié entre-temps, ne dit pas s'il parle de la maquette en cours ou de
 * la précédente. La fiche l'affiche, et c'est pour ça qu'elle voyage ici
 * plutôt que d'être recalculée dans l'écran.
 *
 * `quand` vaut `null` quand l'événement retenu n'a pas d'horodatage lisible
 * (jeux de test, journal tronqué) : le choix reste valable, c'est la date qui
 * manque, et les deux ne se remplacent pas.
 */
export function dernierChoixCouvertureDate(
  evenements: Array<{ type: string; payload?: Record<string, unknown> | null; created_at?: string }>,
): { choix: ChoixCouverture; quand: string | null } | null {
  let retenu: { quand: string; payload: Record<string, unknown> } | null = null;
  for (const e of evenements) {
    if (e.type !== "couverture_choisie") continue;
    const quand = typeof e.created_at === "string" ? e.created_at : "";
    if (retenu === null || quand >= retenu.quand) {
      retenu = { quand, payload: e.payload ?? {} };
    }
  }
  if (retenu === null) return null;
  const quand = retenu.quand || null;
  if (retenu.payload.indifferent === true) return { choix: { indifferent: true }, quand };
  const rang = retenu.payload.rang;
  return typeof rang === "number" && Number.isInteger(rang) && rang >= 0
    ? { choix: { rang }, quand }
    : null;
}

/**
 * Le dernier choix, sans sa date — l'enveloppe historique, gardée parce que
 * la moitié des appelants n'ont que faire du quand. Une SEULE lecture du
 * journal derrière les deux : deux balayages auraient fini par diverger sur
 * les égalités de date.
 */
export function dernierChoixCouverture(
  evenements: Array<{ type: string; payload?: Record<string, unknown> | null; created_at?: string }>,
): ChoixCouverture | null {
  return dernierChoixCouvertureDate(evenements)?.choix ?? null;
}

/**
 * Le contrat commun aux deux listes : un tableau s'il existe, sinon la valeur
 * unique historique, bornée au plafond que la visionneuse sait montrer.
 * L'admin ne peut pas publier plus que ce qui s'affiche. Pur — éprouvé par
 * verif-atelier.ts.
 */
function lireListe(
  source: Record<string, unknown>,
  nomsListe: string[],
  nomsUnique: string[],
  plafond: number,
): string[] {
  for (const nom of nomsListe) {
    const v = source[nom];
    if (Array.isArray(v)) {
      return v
        .filter((x): x is string => typeof x === "string" && x.trim().length > 0)
        .map((x) => x.trim())
        .slice(0, plafond);
    }
  }
  const unique = lire(source, ...nomsUnique);
  return unique ? [unique] : [];
}

async function resoudre(valeur: string | null): Promise<string | null> {
  if (!valeur) return null;
  if (/^https?:\/\//i.test(valeur)) return valeur;
  try {
    return await signerGet(valeur);
  } catch (err) {
    /* Coffre mal configuré : la page s'affiche sans visuel plutôt que de
       rendre un 500 à une cliente qui vient voir sa couverture. */
    console.error("[apercu] signature impossible", valeur, (err as Error)?.message);
    return null;
  }
}

export async function resoudreApercu(brut: unknown): Promise<Apercu> {
  if (!brut || typeof brut !== "object" || Array.isArray(brut)) return VIDE;
  const source = brut as Record<string, unknown>;

  /* Les clés BRUTES sont gardées : ce sont elles qui portent les cadrages,
     et elles disparaissent une fois signées. */
  const doublesBrutes = lireDoublesBrutes(source);
  const platsBrutes = lirePlanchesBrutes(source);
  const cadrages = lireCadrages(source);

  const [platsResolues, c1, c4, doublesResolues] = await Promise.all([
    Promise.all(platsBrutes.map(resoudre)),
    resoudre(lire(source, "c1", "couverture", "recto")),
    resoudre(lire(source, "c4", "dos", "verso")),
    Promise.all(doublesBrutes.map(resoudre)),
  ]);

  /* Une double page qui ne se résout pas (clé morte) est retirée plutôt que de
     laisser un trou dans la visionneuse — même règle que les couvertures.
     Vaut aussi pour les planches : une couverture proposée dont la clé est
     morte disparaît du choix au lieu d'y laisser un cadre vide. */
  /* On filtre les clés mortes EN GARDANT l'alignement du cadrage : d'où le
     passage par les index plutôt qu'un `filter` sur chaque liste séparément. */
  const gardees = doublesResolues
    .map((url, i) => ({ url, cadrage: cadrages[doublesBrutes[i]] ?? "" }))
    .filter((x): x is { url: string; cadrage: string } => x.url !== null);
  /* Même patron pour les planches, avec DEUX cadrages par entrée (T-090,
     rouvert 07/09) : une planche montre deux faces, chacune réglable. */
  const platsGardees = platsResolues
    .map((url, i) => ({
      url,
      droite: cadrages[cleCadrageCouverture(platsBrutes[i], "droite")] ?? "",
      gauche: cadrages[cleCadrageCouverture(platsBrutes[i], "gauche")] ?? "",
    }))
    .filter((x): x is { url: string; droite: string; gauche: string } => x.url !== null);
  return {
    plat: platsGardees[0]?.url ?? null,
    plats: platsGardees.map((x) => x.url),
    c1,
    c4,
    doubles: gardees.map((x) => x.url),
    double: gardees[0]?.url ?? null,
    doublesCadrage: gardees.map((x) => x.cadrage),
    platsCadrageDroite: platsGardees.map((x) => x.droite),
    platsCadrageGauche: platsGardees.map((x) => x.gauche),
  };
}

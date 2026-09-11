/**
 * Le brouillon LOCAL du panneau d'action — lecture, écriture, effacement.
 *
 * Module à part, et sans une ligne de React : c'est un FORMAT DE DONNÉES
 * (versionné, relu depuis un disque qu'on ne contrôle pas), donc une règle
 * qui peut se tromper en silence. Elle est éprouvée par
 * `scripts/verif-atelier.ts`, ce que le composant ne pourrait pas être — il
 * tire `next/navigation` et une feuille de style.
 */

/* ══════════════════════════════════════════════════════════════════════
   LE BROUILLON DU PANNEAU (11/09/2026)

   Composer une publication prend dix minutes : on dépose une à trois
   couvertures, on règle deux coupes au doigt, on ajoute des doubles pages, on
   tape une pagination. Tout ça vivait dans `useState`, c'est-à-dire NULLE
   PART : un onglet changé, un rafraîchissement, un clic sur un mail, et le
   travail disparaissait sans un mot. Les fichiers, eux, étaient déjà dans le
   coffre (leurs clés sont durables) — on perdait donc l'assemblage, pas la
   matière, ce qui est la pire des deux pertes : rien ne prévient.

   ⚠️ CE BROUILLON EST LOCAL À L'APPAREIL, et il doit le rester. Rien n'est
   écrit en base, aucune route n'est appelée : la source de vérité est la
   FICHE (donc le serveur), et ceci n'est qu'un filet posé sous le clavier.
   Ouvrir le même dossier depuis un autre ordinateur ne montre rien de tout
   ça, et c'est le comportement attendu — deux personnes qui composent le même
   numéro en même temps ne doivent pas se voler leur écran l'une à l'autre.

   Il est effacé dès qu'une transition réussit : à partir de là, la fiche dit
   la même chose, et un brouillon qui survit à sa publication ressusciterait
   l'état d'AVANT au prochain chargement.
   ══════════════════════════════════════════════════════════════════════ */

export const CLE_BROUILLON = "bj-admin-panneau";

/** Un visuel dans le brouillon : la clé du coffre, et de quoi le nommer.
    JAMAIS la vignette (`preview`) : c'est une URL d'objet (`blob:`) qui ne
    survit pas au rechargement, ou une URL signée qui expire — les deux
    seraient des promesses mortes au réveil. */
export type VisuelBrouillon = { id: string; key: string; nom: string };

export type BrouillonPanneau = {
  version: 1;
  enregistreLe: number;
  /** La clé de l'action en cours, ou null si aucune n'était choisie. */
  action: string | null;
  saisie: Record<string, string>;
  planches: VisuelBrouillon[];
  doubles: VisuelBrouillon[];
  /** Les cadrages, indexés par CLÉ DE COFFRE comme en base : la même map
      couvre les deux listes et survit à un réordonnancement. */
  cadrages: Record<string, string>;
};

/* Tout est enveloppé : `localStorage` peut être absent (rendu serveur),
   interdit (navigation privée stricte, cookies tiers coupés) ou plein. Dans
   les trois cas le panneau marche exactement comme avant — un filet qui
   casse l'outil qu'il protège ne protège rien. */
export function lireBrouillonPanneau(token: string): BrouillonPanneau | null {
  try {
    if (typeof localStorage === "undefined") return null;
    const brut = localStorage.getItem(`${CLE_BROUILLON}:${token}`);
    if (!brut) return null;
    const v: unknown = JSON.parse(brut);
    if (!v || typeof v !== "object" || Array.isArray(v)) return null;
    const o = v as Record<string, unknown>;
    if (o.version !== 1) return null;
    const enregistreLe = typeof o.enregistreLe === "number" ? o.enregistreLe : 0;
    if (!enregistreLe) return null;
    return {
      version: 1,
      enregistreLe,
      action: typeof o.action === "string" ? o.action : null,
      saisie: mapDeTextes(o.saisie),
      planches: listeDeVisuels(o.planches),
      doubles: listeDeVisuels(o.doubles),
      cadrages: mapDeTextes(o.cadrages),
    };
  } catch {
    return null;
  }
}

/**
 * ⚠️ UN CONTENU IDENTIQUE N'EST PAS RÉÉCRIT, et ce n'est pas une optimisation.
 * Restaurer un brouillon remet les mêmes valeurs dans les mêmes états, ce qui
 * déclenche une écriture : l'horodatage repartirait à zéro et l'écran dirait
 * « à l'instant » pour un travail vieux de dix minutes. La date doit rester
 * celle du dernier CHANGEMENT, pas celle du dernier rendu.
 */
export function ecrireBrouillonPanneau(token: string, b: BrouillonPanneau) {
  try {
    if (typeof localStorage === "undefined") return;
    const cle = `${CLE_BROUILLON}:${token}`;
    const memeContenu = (x: BrouillonPanneau | null) =>
      x !== null && JSON.stringify({ ...x, enregistreLe: 0 }) === JSON.stringify({ ...b, enregistreLe: 0 });
    if (memeContenu(lireBrouillonPanneau(token))) return;
    localStorage.setItem(cle, JSON.stringify(b));
  } catch {
    /* Quota dépassé ou écriture refusée : on ne dit rien et on continue. Le
       panneau n'a jamais dépendu de ce brouillon pour fonctionner. */
  }
}

export function effacerBrouillonPanneau(token: string) {
  try {
    if (typeof localStorage === "undefined") return;
    localStorage.removeItem(`${CLE_BROUILLON}:${token}`);
  } catch {
    /* Idem : rien à faire, rien à dire. */
  }
}

/* Le contenu vient du disque : il a pu être écrit par une version
   antérieure, tronqué, ou modifié à la main. On ne garde que ce qui a la
   bonne forme, et une entrée abîmée ne fait pas tomber le reste. */
function mapDeTextes(v: unknown): Record<string, string> {
  if (!v || typeof v !== "object" || Array.isArray(v)) return {};
  const sortie: Record<string, string> = {};
  for (const [cle, valeur] of Object.entries(v as Record<string, unknown>)) {
    if (typeof valeur === "string") sortie[cle] = valeur;
  }
  return sortie;
}

function listeDeVisuels(v: unknown): VisuelBrouillon[] {
  if (!Array.isArray(v)) return [];
  const sortie: VisuelBrouillon[] = [];
  for (const x of v) {
    if (!x || typeof x !== "object" || Array.isArray(x)) continue;
    const o = x as Record<string, unknown>;
    if (typeof o.key !== "string" || !o.key.trim()) continue;
    sortie.push({
      id: typeof o.id === "string" && o.id ? o.id : crypto.randomUUID(),
      key: o.key,
      nom: typeof o.nom === "string" ? o.nom : nomDeCle(o.key),
    });
  }
  return sortie;
}

/** « numeros/…/apercu/plat-3f2.jpg » → « plat-3f2.jpg ». Une clé de coffre ne
    se lit pas à l'écran ; son dernier segment, si. */
export function nomDeCle(cle: string): string {
  return cle.split("/").pop() || cle;
}

/** « il y a 12 min ». Sans librairie, et sans mentir : sous une minute, on
    dit « à l'instant » plutôt qu'un « il y a 0 min » qui ferait douter. */
export function depuis(quand: number): string {
  const minutes = Math.floor((Date.now() - quand) / 60000);
  if (minutes < 1) return "à l'instant";
  if (minutes < 60) return `il y a ${minutes} min`;
  const heures = Math.floor(minutes / 60);
  if (heures < 24) return `il y a ${heures} h`;
  const jours = Math.floor(heures / 24);
  return jours === 1 ? "hier" : `il y a ${jours} jours`;
}

/* L'empreinte de ce qui est à l'écran : elle répond à UNE question, « est-ce
   que ça diffère encore de la fiche ? ». Sans elle, on écrirait un brouillon
   identique au dossier dès l'ouverture de la page, et « Brouillon restauré »
   s'afficherait sur un panneau que personne n'a touché — un avertissement qui
   ne veut rien dire est un avertissement qu'on apprend à ignorer.
   Les listes ne sont comparées que par leurs CLÉS de coffre : l'id de glissé
   est neuf à chaque rendu, et les vignettes sont des URL qui expirent. */
export function empreinte(
  action: string | null,
  saisie: Record<string, string>,
  planches: Array<{ key: string }>,
  doubles: Array<{ key: string }>,
  cadrages: Record<string, string>,
): string {
  return JSON.stringify([
    action,
    Object.entries(saisie).sort(),
    planches.map((p) => p.key),
    doubles.map((d) => d.key),
    Object.entries(cadrages).sort(),
  ]);
}

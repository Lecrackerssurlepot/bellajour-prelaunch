/**
 * Le PDF souvenir — la partie PURE (03/09).
 *
 * Le client reçoit son magazine en numérique à la livraison (mail M7b) :
 * un SEUL PDF, feuilletable dans l'ordre du vrai magazine. Or les fichiers
 * d'impression ne sont pas faits pour être lus : l'agrafé est un `product`
 * complet mais avec ses fonds perdus, et le dos carré est DEUX fichiers —
 * un bloc de pages, et une couverture ENVELOPPANTE d'une seule feuille
 * large (4e de couv + dos + 1re de couv, comme une jaquette dépliée).
 *
 * Ce module calcule les découpes. Il ne lit aucun octet : il reçoit des
 * dimensions de page (en points PDF) et rend des boîtes de rognage (en
 * points PDF). La fusion elle-même (pdf-lib, R2) vit dans la route
 * /api/admin/atelier/souvenir — la séparation habituelle du dépôt, pour que
 * `scripts/verif-atelier.ts` prouve la géométrie sans réseau.
 *
 * LES CHIFFRES VIENNENT DES SPECS, PAS D'UNE SUPPOSITION
 * (docs/reference/SPECS-CLOUDPRINTER.md, relevé du 30/08) :
 *   format fini 210 × 297, fond perdu 3 mm de chaque côté, couverture
 *   enveloppante = 2 × (210 + 3) + dos. Le dos n'est PAS calculé par la
 *   formule au grammage (T-028 non tranché) : il est MESURÉ sur la feuille
 *   réelle — `largeur − 2 × (210 + fond perdu)` — donc toujours juste,
 *   quel que soit le papier commandé.
 */

import { pointsEnMm } from "./impression";

/** Une zone de page, en points PDF (origine en bas à gauche, comme le format). */
export type Boite = { x: number; y: number; largeur: number; hauteur: number };

const FINI_LARGEUR_MM = 210;
const FINI_HAUTEUR_MM = 297;

/* Un export réel flotte autour des valeurs nominales (Canva arrondit, un
   gabarit vieillit). En dessous de −0,5 mm on refuse de couper dans l'image ;
   au-delà de 3,5 mm ce n'est plus un fond perdu, c'est un autre format. */
const TOLERANCE_MM = 0.5;
const FOND_PERDU_MAX_MM = 3.5;

function mmEnPoints(mm: number): number {
  return (mm * 72) / 25.4;
}

/** Le fond perdu constaté d'un côté, ou null si la cote n'est pas croyable. */
function fondPerdu(mesureMm: number, finiMm: number): number | null {
  const parCote = (mesureMm - finiMm) / 2;
  if (parCote < -TOLERANCE_MM || parCote > FOND_PERDU_MAX_MM) return null;
  return Math.max(0, parCote);
}

/**
 * La boîte de rognage d'une page de bloc (ou d'un `product` agrafé) : la
 * page au format fini 210 × 297, centrée. Une page qui ne ressemble ni à
 * 216 × 303 (fini + fond perdu) ni à 210 × 297 (déjà finie) est rendue
 * TELLE QUELLE : mieux vaut un débord à l'écran qu'une image amputée par
 * une machine sûre d'elle — l'esprit de `verdictTaillePage`, qui constate
 * et ne juge pas.
 */
export function boiteRognee(largeurPts: number, hauteurPts: number): Boite {
  const entiere: Boite = { x: 0, y: 0, largeur: largeurPts, hauteur: hauteurPts };
  const fpH = fondPerdu(pointsEnMm(largeurPts), FINI_LARGEUR_MM);
  const fpV = fondPerdu(pointsEnMm(hauteurPts), FINI_HAUTEUR_MM);
  if (fpH === null || fpV === null) return entiere;
  const x = mmEnPoints(fpH);
  const y = mmEnPoints(fpV);
  return { x, y, largeur: largeurPts - 2 * x, hauteur: hauteurPts - 2 * y };
}

/**
 * La découpe de la couverture enveloppante du dos carré :
 *
 *   [fond perdu] [4e de couv, 210] [dos] [1re de couv, 210] [fond perdu]
 *
 * La 1re de couverture est le panneau de DROITE (le recto d'une jaquette
 * dépliée), la 4e celui de gauche, le dos — la tranche — est écarté
 * (décision du 03/09 : le souvenir se feuillette, il ne se fabrique pas).
 *
 * Le fond perdu horizontal est pris égal au vertical, mesuré sur la
 * hauteur : c'est la seule cote où il se lit sans connaître le dos.
 * Rend null quand la feuille n'a pas la tête d'une enveloppante (trop
 * étroite pour deux faces, hauteur impossible) : l'appelant a alors un
 * `cover` hors gabarit, et le dire vaut mieux que le charcuter.
 */
export function decouperCouverture(
  largeurPts: number,
  hauteurPts: number
): { c1: Boite; c4: Boite; dosMm: number } | null {
  const largeurMm = pointsEnMm(largeurPts);
  const fp = fondPerdu(pointsEnMm(hauteurPts), FINI_HAUTEUR_MM);
  if (fp === null) return null;

  const dosMm = largeurMm - 2 * (FINI_LARGEUR_MM + fp);
  if (dosMm < -TOLERANCE_MM) return null;

  const y = mmEnPoints(fp);
  const hauteur = hauteurPts - 2 * y;
  const largeurFace = mmEnPoints(FINI_LARGEUR_MM);
  const marge = mmEnPoints(fp);

  return {
    c4: { x: marge, y, largeur: largeurFace, hauteur },
    c1: { x: largeurPts - marge - largeurFace, y, largeur: largeurFace, hauteur },
    dosMm: Math.max(0, Math.round(dosMm * 100) / 100),
  };
}

/**
 * Le nom du fichier tel que le client l'enregistre. Le titre passe par la
 * même règle que l'objet des mails (`titrePourMail`) côté appelant ; ici on
 * ne garde que ce qu'un nom de fichier supporte partout.
 */
export function nomFichierSouvenir(titre: string | null | undefined): string {
  const propre = (titre ?? "").trim().replace(/[\\/:*?"<>|]/g, " ").replace(/\s+/g, " ").trim();
  return propre ? `Bellajour - ${propre}.pdf` : "Bellajour - Votre numero.pdf";
}

/**
 * Les COMBOS de couleurs (lot G, 14/11) : quatre propositions, chacune une PAIRE de couleurs posée sur les rôles du nuancier, à
 * appliquer d'un clic depuis le panneau Style (et « Annuler » la défait). La machine propose, l'atelier choisit.
 *
 * Sources :
 * - les règles R-C de `design-explorations/cycle-0-2026-11-10/regles/couleur.md` : une couleur RÉELLE d'une photo (R-C-01), jamais
 *   plus saturée que sa source (R-C-06), ce que le papier rend (R-C-08, `imprimable`), un texte qui se lit sur l'aplat (R-C-25) et un
 *   accent qui se lit sur le papier (R-C-23, 3:1), deux familles d'aplat au plus (R-C-07) ;
 * - le décideur de la démo (`demo-2026-11-13/composition/decider/couleurs.py`, `combos` et `nuancier`) : les clartés et les
 *   saturations de l'aplat sourd (L 38 à 60, C × 0,85 au plus 48), de l'aplat clair (L 88, C ≤ 16) et de l'accent (L ≤ 50, assombri
 *   jusqu'à 3:1) ;
 * - la règle du DA : jamais une teinte prise au CIEL ou à la MER pour un aplat, mais une couleur d'OBJET qui revient (deux photos au
 *   moins). Les palettes de la lecture (5 couleurs par vignette) ne savent pas où est le ciel : un bleu ou un cyan qui revient sur un
 *   quart des photos, ou un bleu pâle et doux, est PRÉSUMÉ ciel ou mer (`estCielOuMer`) et ne donne jamais l'aplat. C'est une
 *   approximation, dite comme telle.
 *
 * Les quatre combos (toujours dans cet ordre, ids stables) :
 * 1. `dominante` : la couleur d'objet qui revient le plus, en aplat sourd et en version pâle, l'accent dans sa teinte ;
 * 2. `complementaire` : la même dominante et sa COMPLÉMENTAIRE (h + 180°) en accent (et en aplat clair, sauf quand elle est bleue ou
 *    cyan : la teinte du ciel et de la mer ne fait jamais un aplat), prise dans les photos quand elles l'ont, sinon posée quand même
 *    (« hors des photos ») ;
 * 3. `douce` : une harmonie douce, la dominante et sa voisine (10° à 45°), peu saturées ;
 * 4. `contraste` : un contraste fort, la dominante très sombre contre sa version très pâle, l'accent franc d'une autre teinte.
 * Chacun pose `aplatSourd`, `aplatClair` et `accent` ; le papier, l'encre et la nuit restent ceux du nuancier de départ.
 *
 * Module PUR et DÉTERMINISTE : ni React, ni réseau, ni horloge, ni hasard ; les mêmes palettes et le même nuancier donnent les mêmes
 * combos, et rien de reçu n'est modifié.
 */

import {
  REGLAGES_NUANCIER, contraste, deltaE00, ecartTeinte, estHex, famillesDesPalettes, hexDeLch, imprimable, lchDeHex,
  type CouleursNuancier, type FamilleTeinte, type RoleCouleur,
} from "./nuancier";
import { majuscule, nomDeTeinte } from "./couleursLibres";

export type IdCombo = "dominante" | "complementaire" | "douce" | "contraste";
export const IDS_COMBOS: readonly IdCombo[] = ["dominante", "complementaire", "douce", "contraste"];

export type Combo = {
  /** `dominante`, `complementaire`, `douce`, `contraste` pour ceux des photos (`IDS_COMBOS`) ; `ia-1`, `ia-2`… pour ceux de la lecture IA. */
  id: IdCombo | `ia-${number}`;
  /** D'où il vient : les palettes des photos (`proposerCombos`), ou la lecture IA chargée (`combosDeLaLecture`, lot F). */
  origine: "photos" | "lecture";
  /** Un nom court : « Ocre », « Ocre et bleu ». */
  nom: string;
  /** Pourquoi, en deux à six mots. */
  raison: string;
  /** Le nuancier entier une fois le combo appliqué. */
  couleurs: CouleursNuancier;
  /** Les rôles que le combo pose, dans l'ordre où le sélecteur de la page les montre (en tête). */
  roles: RoleCouleur[];
  /** La couleur d'une photo d'où part la dominante (la preuve « pris dans une photo »). */
  source: string;
  /** La seconde couleur du combo est-elle dans les photos (à moins de `DANS_PHOTOS_DE` d'une couleur d'une palette) ? */
  dansLesPhotos: boolean;
};

/** Les réglages de DÉPART, nommés ici et nulle part ailleurs (à calibrer sur les choix de Mathias). */
export const REGLAGES_COMBOS = {
  /** Le ciel et la mer présumés : une teinte bleue ou cyan (h de 185° à 295°)… */
  CIEL_H_MIN: 185, CIEL_H_MAX: 295,
  /** … qui revient sur 15 % des photos au moins (un ciel, une mer reviennent ; une veste bleue, rarement)… Rejoué le 14/11 sur six lots
   *  réels (merisa, klervie, candice, lara, eloise, marjorie) : à 25 %, le ciel de Lara (13 photos sur 53) passait pour un objet. */
  CIEL_PART_PHOTOS: 0.15,
  /** … ou qui est pâle comme un ciel (L ≥ 60, C ≤ 40). */
  CIEL_L_PALE: 60, CIEL_C_PALE: 40,
  /** « Une couleur d'objet qui revient » : deux photos au moins. */
  OBJET_PHOTOS_MIN: 2,
  /**
   * Un OBJET a une couleur franche (une veste, un mur peint, une enseigne) ; une pierre, un sable, une végétation sont des couleurs
   * douces qui reviennent partout. Le score d'une famille est multiplié par (C / 30)², au plus 1,6, C étant celle de sa couleur réelle.
   * Rejeu du 14/11 : la dominante tombe alors sur la teinte que l'« objet coloré » du décideur avait trouvée (ocre chez Merisa et Klervie,
   * sable doré chez Candice, terre cuite chez Eloise) au lieu d'un kaki de falaise ou d'un sable.
   */
  FRANCHISE_C: 30, FRANCHISE_MAX: 1.6,
  /** L'aplat sourd (décideur, `nuancier` avec objet) : clarté bornée, saturation × 0,85 au plus 48. */
  SOURD_L_MIN: 38, SOURD_L_MAX: 60, SOURD_C_FACTEUR: 0.85, SOURD_C_MAX: 48,
  /** L'aplat clair : L 88, C ≤ 16 ; refusé à ΔE00 < 5 du papier (R-C-08), alors L 80. */
  CLAIR_L: 88, CLAIR_C_MAX: 16, CLAIR_L_REPLI: 80,
  /** L'accent : L ≤ 50 (R-C-23 : L ≤ 55 sur papier blanc), désaturé de 30 % (R-61), assombri par pas de 3 jusqu'à 3:1. */
  ACCENT_L_MAX: 50, ACCENT_C_MIN: 25, ACCENT_C_MAX: 45,
  /** La complémentaire est « dans les photos » quand une famille est à 25° d'elle. */
  COMPLEMENT_DH: 25,
  /** L'harmonie douce : une voisine à 10° à 45°, sinon 25° plus loin ; des saturations basses. */
  VOISINE_DH_MIN: 10, VOISINE_DH_MAX: 45, VOISINE_DH_DEFAUT: 25, DOUCE_C_MAX: 22, DOUCE_L: 64,
  /** Le contraste fort : la dominante à L 28 (un texte papier dessus se lit), sa version à L 93, un accent franc à 60° au moins. */
  CONTRASTE_L_SOMBRE: 28, CONTRASTE_L_PALE: 93, CONTRASTE_DH_ACCENT: 60, CONTRASTE_C_ACCENT_MIN: 30,
  /** Une couleur est « dans les photos » à ΔE00 < 15 d'une couleur d'une palette (le seuil du décideur). */
  DANS_PHOTOS_DE: 15,
} as const;

const R = REGLAGES_COMBOS;
const borne = (v: number, a: number, b: number): number => Math.min(b, Math.max(a, v));

/** Le ciel ou la mer PRÉSUMÉS (palettes seules : aucune position dans l'image) : jamais la source d'un aplat. */
export function estCielOuMer(f: Pick<FamilleTeinte, "h" | "photos" | "rep">, nPhotos: number): boolean {
  if (f.h < R.CIEL_H_MIN || f.h > R.CIEL_H_MAX) return false;
  return f.photos >= Math.max(2, Math.ceil(R.CIEL_PART_PHOTOS * nPhotos)) || (f.rep.lch.L >= R.CIEL_L_PALE && f.rep.lch.C <= R.CIEL_C_PALE);
}

/** Un texte (l'encre ou le papier) se lit-il sur ce fond ? Le meilleur des deux contrastes. */
const lisibleSur = (fond: string, base: CouleursNuancier): number => Math.max(contraste(base.encre, fond), contraste(base.papier, fond));

/** L'aplat (R-C-25) : la clarté la plus proche de `L0` où l'encre ou le papier se lit à 4,5:1 ; à défaut, la plus lisible essayée. */
function aplatLisible(L0: number, C: number, h: number, base: CouleursNuancier, Lmin = 25, Lmax = 82): string {
  let meilleur = hexDeLch(borne(L0, Lmin, Lmax), C, h);
  let score = lisibleSur(meilleur, base);
  for (const d of [0, 4, -4, 8, -8, 12, -12, 16, -16, 20, 24]) {
    const c = hexDeLch(borne(L0 + d, Lmin, Lmax), C, h);
    const k = lisibleSur(c, base);
    if (k >= REGLAGES_NUANCIER.CONTRASTE_TEXTE) return c;
    if (k > score) { meilleur = c; score = k; }
  }
  return meilleur;
}

/** L'accent (R-C-23) : se lit sur le papier à 3:1, assombri par pas de 3. */
function accentLisible(L0: number, C: number, h: number, papier: string): string {
  let L = L0;
  let a = hexDeLch(L, C, h);
  while (contraste(a, papier) < REGLAGES_NUANCIER.CONTRASTE_TITRE && L > 20) { L -= 3; a = hexDeLch(L, C, h); }
  return a;
}

/** La version pâle d'une teinte (R-C-08 : jamais à ΔE00 < 5 du papier). */
function pale(C: number, h: number, papier: string, L: number = R.CLAIR_L, Cmax: number = R.CLAIR_C_MAX): string {
  const c = hexDeLch(L, Math.min(Cmax, C), h);
  return deltaE00(c, papier) >= REGLAGES_NUANCIER.APLAT_DE_PAPIER_MIN ? c : hexDeLch(R.CLAIR_L_REPLI, Math.min(Cmax + 4, C), h);
}

/** La couleur est-elle dans les photos (à moins de `DANS_PHOTOS_DE` d'une couleur d'une palette) ? */
function dansLesPalettes(hex: string, palettes: readonly (readonly string[])[]): boolean {
  for (const p of palettes) for (const c of p) if (estHex(c) && deltaE00(hex, c) < R.DANS_PHOTOS_DE) return true;
  return false;
}

/** Le nom d'une teinte pour un combo : « Ocre », « Terre cuite ». */
const nomDe = (h: number): string => majuscule(nomDeTeinte(h));

/**
 * Les combos proposés d'après les palettes des photos (`Mesure.palette`, 5 couleurs par photo, la plus présente d'abord) et le
 * nuancier de départ (`base` : celui du style, dont le combo garde le papier, l'encre et la nuit). Vide quand aucune couleur d'objet
 * ne revient (des photos sans couleur, ou seulement du ciel et de la mer) : on ne propose rien plutôt qu'un ciel en aplat.
 */
export function proposerCombos(palettes: readonly (readonly string[])[], base: Readonly<CouleursNuancier>): Combo[] {
  const valides = palettes.filter((p) => p.some(estHex));
  if (!valides.length) return [];
  const familles = famillesDesPalettes(valides);
  const n = valides.length;
  const objet = (f: FamilleTeinte): number => f.score * Math.min(R.FRANCHISE_MAX, (f.rep.lch.C / R.FRANCHISE_C) ** 2);
  const objets = familles
    .filter((f) => !estCielOuMer(f, n) && f.photos >= R.OBJET_PHOTOS_MIN && f.rep.lch.C >= REGLAGES_NUANCIER.CHROMA_MIN)
    .sort((a, b) => objet(b) - objet(a) || (a.rep.hex < b.rep.hex ? -1 : 1));
  const dom = objets[0];
  if (!dom) return [];
  const h = dom.rep.lch.h;
  /* la saturation de la couleur RÉELLE de l'objet (jamais plus), bornée par ce que le papier rend */
  const C = imprimable(dom.rep.lch.C, h);
  const L = dom.rep.lch.L;
  const papier = base.papier;
  const avec = (sourd: string, clair: string, accent: string): CouleursNuancier => ({ ...base, aplatSourd: sourd, aplatClair: clair, accent });

  /* 1. la dominante : l'objet qui revient, sourd (écho), pâle, et l'accent dans sa teinte */
  const sourd = aplatLisible(borne(L, R.SOURD_L_MIN, R.SOURD_L_MAX), Math.min(C * R.SOURD_C_FACTEUR, R.SOURD_C_MAX), h, base);
  const dominante: Combo = {
    id: "dominante", origine: "photos", nom: nomDe(h), raison: `Revient sur ${dom.photos} photos`,
    couleurs: avec(sourd, pale(C, h, papier), accentLisible(Math.min(L, R.ACCENT_L_MAX), imprimable(Math.max(R.ACCENT_C_MIN, C * REGLAGES_NUANCIER.ACCENT_DESATURATION), h), h, papier)),
    roles: ["aplatSourd", "aplatClair", "accent"], source: dom.rep.hex, dansLesPhotos: true,
  };

  /* 2. la complémentaire : à 180°, prise à une famille des photos quand il y en a une à 25° près (le ciel peut donner un accent, jamais un aplat sourd) */
  const opposee = (h + 180) % 360;
  const trouvee = familles.filter((f) => f !== dom && ecartTeinte(f.h, opposee) <= R.COMPLEMENT_DH).sort((a, b) => ecartTeinte(a.h, opposee) - ecartTeinte(b.h, opposee) || b.score - a.score)[0];
  const h2 = trouvee ? trouvee.rep.lch.h : opposee;
  const C2 = imprimable(borne(trouvee ? trouvee.C : C, R.ACCENT_C_MIN, R.ACCENT_C_MAX), h2);
  const accent2 = accentLisible(R.ACCENT_L_MAX - 5, C2, h2, papier);
  /* la règle du DA : une opposée bleue ou cyan (celle d'un ocre, d'une terre) est la teinte du ciel ou de la mer : elle reste l'ACCENT
     (un titre, un filet), jamais un aplat ; l'aplat clair reste alors la version pâle de la dominante */
  const opposeeCiel = h2 >= R.CIEL_H_MIN && h2 <= R.CIEL_H_MAX;
  const complementaire: Combo = {
    id: "complementaire", origine: "photos", nom: `${nomDe(h)} et ${nomDeTeinte(h2)}`, raison: trouvee || dansLesPalettes(accent2, valides) ? "Son opposée, dans les photos" : "Son opposée, hors des photos",
    couleurs: avec(sourd, opposeeCiel ? pale(C, h, papier) : pale(C2, h2, papier, R.CLAIR_L, 14), accent2),
    roles: ["aplatSourd", "accent", "aplatClair"], source: dom.rep.hex, dansLesPhotos: !!trouvee || dansLesPalettes(accent2, valides),
  };

  /* 3. l'harmonie douce : la voisine RÉELLE la plus lourde (10° à 45°, jamais le ciel), sinon 25° plus loin ; tout reste peu saturé */
  const voisine = objets.find((f) => f !== dom && ecartTeinte(f.h, h) >= R.VOISINE_DH_MIN && ecartTeinte(f.h, h) <= R.VOISINE_DH_MAX);
  const h3 = voisine ? voisine.rep.lch.h : (h + R.VOISINE_DH_DEFAUT) % 360;
  const C3 = Math.min(C, R.DOUCE_C_MAX);
  const nom3 = nomDeTeinte(h3) === nomDeTeinte(h) ? `${nomDe(h)} doux` : `${nomDe(h)} et ${nomDeTeinte(h3)}`;
  const douce: Combo = {
    id: "douce", origine: "photos", nom: nom3, raison: voisine ? "Deux voisines des photos" : "Deux voisines, tout en douceur",
    couleurs: avec(aplatLisible(R.DOUCE_L, C3, h, base, 50, 78), pale(Math.min(C3, 12), h3, papier, 90, 12), accentLisible(R.ACCENT_L_MAX, Math.min(imprimable(voisine ? voisine.C : C, h3), 28), h3, papier)),
    roles: ["aplatClair", "aplatSourd", "accent"], source: dom.rep.hex, dansLesPhotos: !!voisine,
  };

  /* 4. le contraste fort : la dominante très sombre (le papier se lit dessus), sa version très pâle, l'accent franc d'une autre teinte qui revient */
  const franche = familles
    .filter((f) => f !== dom && f.photos >= R.OBJET_PHOTOS_MIN && f.rep.lch.C >= R.CONTRASTE_C_ACCENT_MIN && ecartTeinte(f.h, h) >= R.CONTRASTE_DH_ACCENT)
    .sort((a, b) => b.rep.lch.C * b.photos - a.rep.lch.C * a.photos || (a.rep.hex < b.rep.hex ? -1 : 1))[0];
  const h4 = franche ? franche.rep.lch.h : opposee;
  const sombre = aplatLisible(R.CONTRASTE_L_SOMBRE, Math.min(C, 40), h, base, 18, 34);
  const contrasteFort: Combo = {
    id: "contraste", origine: "photos", nom: `${nomDe(h)} profond`, raison: "Le sombre contre le clair",
    couleurs: avec(sombre, pale(C, h, papier, R.CONTRASTE_L_PALE, 10), accentLisible(R.ACCENT_L_MAX, imprimable(borne(franche ? franche.rep.lch.C * REGLAGES_NUANCIER.ACCENT_DESATURATION : C, R.ACCENT_C_MIN, R.ACCENT_C_MAX), h4), h4, papier)),
    roles: ["aplatSourd", "accent", "aplatClair"], source: dom.rep.hex, dansLesPhotos: !!franche,
  };

  /* deux combos aux mêmes couleurs n'en font qu'un (le premier reste) */
  const vus = new Set<string>();
  return [dominante, complementaire, douce, contrasteFort].filter((c) => {
    const k = `${c.couleurs.aplatSourd}${c.couleurs.aplatClair}${c.couleurs.accent}`;
    if (vus.has(k)) return false;
    vus.add(k);
    return true;
  });
}

/**
 * Les combos de la LECTURE IA (lot F : `lecture.couleurs`, validés par `lireLectureIA`, six rôles `#rrggbb` chacun) mis au format des
 * combos de l'éditeur : ids `ia-1`, `ia-2`… dans l'ordre du fichier. Un combo de la lecture pose les SIX rôles (le papier, l'encre et la
 * nuit compris : c'est le nuancier que la lecture propose) ; ses trois couleurs d'aplat et d'accent viennent en tête. Pur.
 */
export function combosDeLaLecture(liste: readonly { nom: string; couleurs: Readonly<CouleursNuancier>; raison: string; dansLesPhotos?: boolean }[] | null | undefined): Combo[] {
  return (liste ?? []).map((c, i): Combo => ({
    id: `ia-${i + 1}`, origine: "lecture", nom: c.nom, raison: c.raison, couleurs: { ...c.couleurs },
    roles: ["aplatSourd", "accent", "aplatClair", "papier", "encre", "nuit"], source: c.couleurs.aplatSourd, dansLesPhotos: c.dansLesPhotos === true,
  }));
}

/** Les combos que l'écran propose : ceux des photos, puis ceux de la lecture IA qui ne les répètent pas (mêmes six couleurs). */
export function combosProposes(photos: readonly Combo[], lecture: readonly Combo[]): Combo[] {
  const cle = (c: Combo) => JSON.stringify(c.couleurs);
  const vus = new Set(photos.map(cle));
  return [...photos, ...lecture.filter((c) => !vus.has(cle(c)))];
}

/** Le combo que le nuancier porte déjà (ses rôles à l'identique : trois pour un combo des photos, six pour un combo de la lecture), ou null. */
export function comboApplique(combos: readonly Combo[], couleurs: Readonly<CouleursNuancier> | null | undefined): Combo | null {
  if (!couleurs) return null;
  return combos.find((c) => c.roles.every((r) => c.couleurs[r] === couleurs[r])) ?? null;
}

/** Lch d'un hexa, exporté pour le harnais (teinte d'un combo). */
export const teinteDe = (hex: string): number => lchDeHex(hex).h;

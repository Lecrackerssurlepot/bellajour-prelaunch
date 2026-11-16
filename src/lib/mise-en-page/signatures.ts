/**
 * Les gabarits SIGNATURE (lot Signatures, 16/11, T-214) : les doubles de la vitrine du 14/11 (`design-explorations/vitrine-2026-11-14/`,
 * directions « éditoriale » et « audacieuse », composées à la main sur les photos de Merisa), redites en cadres pour l'éditeur.
 *
 * Mathias, 16/11 : « j'adore les présentations […] un minimum de goût qui puisse être développé ». Chaque signature porte UNE idée de
 * la vitrine et les briques qui la rendent possible :
 * - le texte par défaut tiré des FAITS (`Cadre.fait` : le jour EXIF, l'heure sous chaque vignette, le mois + le lieu sûr + l'heure),
 *   calculé à l'écran et à l'export, jamais stocké (`lieuxParDefaut`, faits.ts) ;
 * - le mot ou le chiffre GÉANT ajusté à son cadre (`Cadre.geant`, `corpsGeant`, style.ts) ;
 * - le FOND PROPOSÉ (`Template.fond`), un rôle du nuancier posé dans `Planche.fond` à la pose si la planche n'a pas de fond (operations.ts,
 *   `composer`) ; jamais un aplat dans le gabarit (T-209) ;
 * - l'OMBRE DOUCE des tirages (`Cadre.ombre`), relue fidèlement par Affinity (D28, essai du 29/10).
 *
 * Elles passent devant les autres dessinés quand elles CONVIENNENT aux photos (`convientSignature` : leurs faits ont une date, leur
 * journée est une seule journée), derrière sinon : jamais tuées (outils.ts, `AVANCE_SIGNATURES`).
 *
 * Mesures : celles de la vitrine (`<direction>/src/double-N.html`), ramenées aux cadres (repère planche 420 × 297, fond perdu de 3 mm sur les bords
 * extérieurs). Les ids sont STABLES (`SG-` + deux chiffres) : un magazine sauvegardé les référence, ne jamais renuméroter. Module PUR.
 */

import { FOND_PERDU, PAGE_H, PAGE_L, PLEINE_PLANCHE, type Rect } from "./geometrie";
import { signatureDe, type Cadre, type SorteFait, type Template } from "./types";

const FP = FOND_PERDU;
const rect = (x: number, y: number, l: number, h: number): Rect => ({ x, y, l, h });
const PLEINE_G: Rect = { x: -FP, y: -FP, l: PAGE_L + FP, h: PAGE_H + 2 * FP };
const PLEINE_D: Rect = { x: PAGE_L, y: -FP, l: PAGE_L + FP, h: PAGE_H + 2 * FP };

type Options = Partial<Cadre>;
const photo = (r: Rect, o: Options = {}): Cadre => ({ role: "photo", ...r, ...o });
/** Un titre GÉANT : son corps se calcule pour remplir le cadre (`taille` n'est que le corps de départ, gardé dans le texte). */
const geant = (r: Rect, o: Options = {}): Cadre => ({ role: "titre", ...r, taille: 200, gras: true, geant: true, ...o });
const titre = (r: Rect, taille: number, o: Options = {}): Cadre => ({ role: "titre", ...r, taille, gras: true, ...o });
const texte = (r: Rect, taille: number, o: Options = {}): Cadre => ({ role: "texte", ...r, taille, gras: false, ...o });
const legende = (r: Rect, fait: SorteFait | null, o: Options = {}): Cadre => ({ role: "legende", ...r, taille: 7, gras: false, ...(fait ? { fait } : {}), ...o });
const BLANC: Options = { couleur: "blanc" };

/** Bord blanc des tirages (la vitrine audacieuse : 3,5 mm ; 4 mm pour le grand) et de la bande de photomaton (5 mm). */
const BORD_TIRAGE = 3.5;
/** La marge de tout texte : 10 mm du bord rogné, 10 mm de chaque côté du pli (la règle de la vitrine, R185). */
export const MARGE_TEXTE = 10;

function sg(id: string, nom: string, cadres: Cadre[], fond?: Template["fond"]): Template {
  const t: Template = {
    id, nom, portee: "double", nbPhotos: cadres.filter((c) => c.role === "photo").length, signature: signatureDe(cadres),
    attribut: "original", origine: "signature", cadres,
  };
  if (fond) t.fond = fond;
  return t;
}

/* ─── SG-03 · la planche du jour : 3 × 3 vignettes 3:4 sur la page droite, l'heure sous chacune ─── */
const PLANCHE_X = 236, PLANCHE_Y = 45, CASE_L = 50, CASE_H = 66.7, CASE_GOUT = 4, CASE_PAS_Y = CASE_H + 1.5 + 4.5 + 4;
const casesPlanche: Rect[] = [0, 1, 2].flatMap((r) => [0, 1, 2].map((c) => rect(PLANCHE_X + c * (CASE_L + CASE_GOUT), PLANCHE_Y + r * CASE_PAS_Y, CASE_L, CASE_H)));

/* ─── SG-04 · la journée en vrac : la mosaïque de la vitrine (2 grandes aux coins, 10 petites, joints de 2 mm, la gouttière sur le pli) ─── */
const MOSAIQUE: Rect[] = [
  rect(-FP, -FP, 128 + FP, 176 + FP), rect(130, -FP, 78, 87 + FP), rect(130, 89, 78, 87),
  rect(-FP, 178, 68 + FP, 119 + FP), rect(70, 178, 68, 119 + FP), rect(140, 178, 68, 119 + FP),
  rect(212, -FP, 78, 87 + FP), rect(212, 89, 78, 87), rect(292, -FP, 128 + FP, 176 + FP),
  rect(212, 178, 68, 119 + FP), rect(282, 178, 68, 119 + FP), rect(352, 178, 68 + FP, 119 + FP),
];
/** L'heure en bas à gauche de chaque case, à 5 mm des bords de la case, jamais à moins de 10 mm du bord rogné ni du pli (la marge des textes). */
function heureDansCase(r: Rect): Rect {
  let x = Math.max(r.x + 5, MARGE_TEXTE);
  if (r.x >= PAGE_L && x < PAGE_L + MARGE_TEXTE) x = PAGE_L + MARGE_TEXTE;
  return rect(x, Math.min(r.y + r.h - 5, PAGE_H - MARGE_TEXTE) - 6, 34, 6);
}

/* ─── SG-10 · la bande de photomaton : quatre carrés de 52 mm à bord blanc de 5 mm, tournés ensemble de −3° ─── */
const BANDE = { x: 28, y: 26, l: 62, pas: 56, rotation: -3 } as const;
function casesBande(): Rect[] {
  const cx = BANDE.x + BANDE.l / 2, cy = BANDE.y + (3 * BANDE.pas + BANDE.l) / 2;
  const t = (BANDE.rotation * Math.PI) / 180;
  return [0, 1, 2, 3].map((i) => {
    const dy = BANDE.y + BANDE.l / 2 + i * BANDE.pas - cy;
    const x = cx - dy * Math.sin(t), y = cy + dy * Math.cos(t);
    return rect(Math.round((x - BANDE.l / 2) * 100) / 100, Math.round((y - BANDE.l / 2) * 100) / 100, BANDE.l, BANDE.l);
  });
}

export const TEMPLATES_SIGNATURES: readonly Template[] = [
  /* Éditoriale, double 1 : le jour d'arrivée fait image. Le chiffre géant sur la page blanche, la ligne de repère (mois, lieu sûr, heure),
     la phrase du client en chapô, la photo en pleine page. */
  sg("SG-01", "Le chiffre du jour", [
    photo(PLEINE_D),
    texte(rect(18, 34, 160, 34), 24),
    legende(rect(18, 99, 175, 5), "repere"),
    geant(rect(10, 104, 190, 172), { fait: "jour" }),
  ]),

  /* Audacieuse, double 1 : la date peinte sur la photo. Une photo sur toute la double, le jour géant en blanc dans la zone calme de gauche. */
  sg("SG-02", "La date sur la photo", [
    photo(PLEINE_PLANCHE),
    geant(rect(22, 62, 166, 196), { fait: "jour", ...BLANC }),
    legende(rect(22, 266, 166, 8), "repere", { taille: 9, ...BLANC }),
  ]),

  /* Éditoriale, double 2 : la mer, puis la planche du jour. Le mot géant en blanc dans l'eau, la date et l'heure dessous ; en face, neuf
     vignettes égales dans l'ordre de l'heure, l'heure sous chacune. Une seule journée (`convientSignature`). */
  sg("SG-03", "La planche du jour", [
    photo(PLEINE_G),
    ...casesPlanche.map((r) => photo(r)),
    geant(rect(13, 62, 185, 58), BLANC),
    legende(rect(18, 124, 160, 5), "dateHeure", BLANC),
    ...casesPlanche.map((r) => legende(rect(r.x, r.y + r.h + 1.5, r.l, 4.5), "heure", { taille: 6 })),
  ]),

  /* Audacieuse, double 2 : la première journée en vrac. Douze photos serrées, l'heure sur chaque case, la date géante dans la grande case
     du coin. Une seule journée. */
  sg("SG-04", "La journée en vrac", [
    ...MOSAIQUE.map((r) => photo(r)),
    geant(rect(12, 11, 104, 46), { fait: "dateCourte", ...BLANC }),
    /* l'heure de chaque case dans la police des titres (la vitrine : un linéale grasse en capitales), jamais coupée (`ajusterTitre`) */
    ...MOSAIQUE.map((r) => titre(heureDansCase(r), 11, { fait: "heure", ...BLANC })),
  ]),

  /* Éditoriale, double 3 : deux pleines pages du même moment, le titre géant dans le ciel calme, une ligne qui traverse la double. */
  sg("SG-05", "Deux pages, un moment", [
    photo(PLEINE_G), photo(PLEINE_D),
    geant(rect(15, 18, 182, 78)),
    legende(rect(18, 104, 175, 5), "lieuDateHeure"),
    legende(rect(382, 104, 26, 5), "heure"),
  ]),

  /* Audacieuse, double 3 : le nom, pas la montagne. La photo à gauche, à droite le fond proposé (le clair des photos) et le nom du lieu
     sûr en géant, ancré en bas, dans la couleur sourde des photos. */
  sg("SG-06", "Le nom en grand", [
    photo(PLEINE_G),
    texte(rect(221, 12, 130, 22), 30),
    titre(rect(372, 13, 36, 12), 20, { fait: "dateCourte", couleur: "aplatSourd" }),
    geant(rect(220, 96, 190, 188), { fait: "lieu", couleur: "aplatSourd" }),
  ], { droite: "aplatClair" }),

  /* Éditoriale, double 4 : une seule image traverse le pli, à fond perdu sur toute la double ; une seule ligne, posée dans le calme. */
  sg("SG-07", "Le pli dans l'eau", [
    photo(PLEINE_PLANCHE),
    legende(rect(330, 66, 76, 5), "dateHeure", BLANC),
  ]),

  /* Éditoriale, double 5 : le saut, puis ses mots. La photo à gauche, à droite le fond proposé (le sourd des photos, l'eau profonde),
     les mots du client en géant blanc, une vignette du même moment en haut avec son heure. */
  sg("SG-08", "Les mots sur l'aplat", [
    photo(PLEINE_G),
    photo(rect(350, 22, 52, 69.3)),
    legende(rect(232, 22, 100, 5), "dateHeure", BLANC),
    legende(rect(350, 93.5, 52, 4.5), "heure", BLANC),
    geant(rect(221, 108, 180, 168), BLANC),
  ], { droite: "aplatSourd" }),

  /* Audacieuse, double 4 : les tirages jetés sur la couleur. Un grand tirage à cheval sur le pli, quatre autres tournés de ±5 à 7°, qui
     sortent par le bord rogné, l'ombre douce sous chacun ; le fond proposé : l'accent des photos, sur toute la double. */
  sg("SG-09", "Les tirages jetés", [
    photo(rect(88, 16, 244, 171), { rotation: -1.8, bord: 4, ombre: true }),
    photo(rect(104, 194, 70, 91), { rotation: 5, bord: BORD_TIRAGE, ombre: true }),
    photo(rect(246, 198, 76, 76), { rotation: -6, bord: BORD_TIRAGE, ombre: true }),
    photo(rect(-7, 120, 104, 138), { rotation: -7, bord: BORD_TIRAGE, ombre: true }),
    photo(rect(326, 110, 104, 138), { rotation: 6, bord: BORD_TIRAGE, ombre: true }),
  ], { gauche: "accent", droite: "accent" }),

  /* Audacieuse, double 6 : la bande de photomaton (un selfie par jour) sur le fond proposé, la phrase du client en grand, la période du
     voyage ; en face, la pleine page. Le noir et blanc de la vitrine n'est pas fait (hors de ce lot). */
  sg("SG-10", "La bande photomaton", [
    photo(PLEINE_D),
    /* sans ombre : l'ombre de chaque carré tomberait sur le blanc du carré d'avant (une couture) ; l'ombre d'une bande entière demande un
       groupe, que l'essai du 29/10 n'a pas vu (D28) */
    ...casesBande().map((r) => photo(r, { rotation: BANDE.rotation, bord: 5 })),
    texte(rect(103, 24, 95, 150), 40, { couleur: "papier" }),
    legende(rect(104, 270, 94, 6), "periode", { couleur: "papier" }),
  ], { gauche: "aplatSourd" }),

  /* Éditoriale, double 6 : deux soirs en miroir autour du pli (mêmes tailles, mêmes hauteurs, légendes symétriques), la dernière photo
     minuscule en bas à droite, la période en clôture. */
  sg("SG-11", "Deux soirs en miroir", [
    photo(rect(74, 26, 122, 196)), photo(rect(224, 26, 122, 196)), photo(rect(376, 238, 30, 40)),
    legende(rect(74, 225.5, 122, 4.5), "jourHeure"),
    legende(rect(224, 225.5, 122, 4.5), "jourHeure"),
    legende(rect(376, 280.5, 34, 4.5), "jourHeure"),
    titre(rect(224, 241, 140, 22), 26, { fait: "periode" }),
  ]),
];

/* ─────────────────────────── quand une signature convient ─────────────────────────── */

/** Les signatures d'UNE journée : toutes leurs photos datées du même jour. */
const UNE_JOURNEE: ReadonlySet<string> = new Set(["SG-03", "SG-04"]);
/** « Deux soirs en miroir » : les deux grandes photos de deux jours différents (même lieu, autre jour). */
const DEUX_JOURS: ReadonlySet<string> = new Set(["SG-11"]);

const jourDe = (d: string | null | undefined): string | null => (d && /^\d{4}-\d{2}-\d{2}/.test(d) ? d.slice(0, 10) : null);
/** Les faits qui ont besoin d'une date (la période se contente du dossier, le lieu de la page). */
const DATES: ReadonlySet<SorteFait> = new Set<SorteFait>(["jour", "dateCourte", "dateLongue", "heure", "jourHeure", "dateHeure", "repere", "lieuDateHeure"]);

/**
 * Une signature CONVIENT-elle à ces photos (dans l'ordre des cadres) ? Tout ce qui n'est pas une signature convient. Une signature dont un
 * fait demande une date veut toutes ses photos datées (sinon son texte principal reste vide) ; la planche et la journée veulent un seul jour ;
 * le miroir, deux jours. Pure, déterministe.
 */
export function convientSignature(t: Template, photos: readonly { date?: string | null }[]): boolean {
  if (t.origine !== "signature") return true;
  const jours = photos.map((p) => jourDe(p.date));
  if (t.cadres.some((c) => c.fait && DATES.has(c.fait)) && jours.some((j) => j === null)) return false;
  if (UNE_JOURNEE.has(t.id) && new Set(jours).size !== 1) return false;
  if (DEUX_JOURS.has(t.id) && (jours[0] === null || jours[0] === jours[1])) return false;
  return true;
}

/** Le fond qu'une signature propose pour une cible (double, ou page : son côté), ou null. Une double retournée (miroir) échange ses côtés. */
export function fondPropose(t: Template, cible: "double" | "gauche" | "droite", miroir = false): Partial<Record<"gauche" | "droite", NonNullable<Template["fond"]>["gauche"]>> | null {
  const f = t.fond;
  if (!f) return null;
  if (cible !== "double") {
    const r = f.droite ?? f.gauche;
    return r ? { [cible]: r } : null;
  }
  const out = miroir ? { ...(f.droite ? { gauche: f.droite } : {}), ...(f.gauche ? { droite: f.gauche } : {}) } : { ...f };
  return Object.keys(out).length ? out : null;
}

/* ─────────────────────────── l'ombre douce d'un tirage (R184) ─────────────────────────── */

/**
 * L'OMBRE DOUCE d'un tirage posé (`Cadre.ombre`), en mm et en part d'opacité : une seule ombre, noire, en produit (Multiply), un peu sous le
 * tirage. Réglage de DÉPART pris à l'œil sur la vitrine audacieuse (`0 1mm 2mm rgba(70,45,0,.30), 0 6mm 14mm rgba(70,45,0,.20)`, ramenée
 * à une seule ombre parce que l'IDML n'en porte qu'une). L'écran, le PDF et l'IDML lisent ces mêmes nombres.
 */
export const OMBRE_DOUCE = { opacite: 0.35, flou: 5, dx: 0, dy: 2 } as const;

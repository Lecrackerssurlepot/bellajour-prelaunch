/**
 * LA FICHE (C20, 18/11/2026) : les cinq questions posées avant de composer, ce que la machine devine pour les pré-remplir, et ce qui en
 * découle (profil, sobriété, chapitres). Ce que l'atelier SAISIT prime toujours sur ce que la machine devine (PROFILS.md : « la fiche
 * saisie par Mathias prime sur les deux »). Module pur.
 */

import { REGLAGES_COMPO, REGLAGES_V2 } from "./reglagesCompositeur";
import { T, moisFr, plageFr } from "./selection";
import { AMBIANCES_FICHE, PROFILS, THEMES, type AmbianceFiche, type Fiche, type PhotoCompo, type Profil, type Theme, type Voyage } from "./types";

export const MOT_THEME: Readonly<Record<Theme, string>> = { road_trip: "Road trip", ville: "Ville", plage: "Plage", fete: "Fête", evenement: "Événement", annee: "Année", autre: "Autre" };
export const MOT_AMBIANCE: Readonly<Record<AmbianceFiche, string>> = { sobre: "Sobre", equilibre: "Équilibrée", stylise: "Stylisée" };
export const TAILLES_PROPOSEES = [24, 32, 40, 48, 60, 80] as const;
export const LIEUX_MAX = 12;

const estObjet = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);
/** Relit une fiche gardée (navigateur) : rien d'inconnu ne passe ; un champ invalide est oublié, jamais deviné. */
export function lireFiche(x: unknown): Fiche {
  if (!estObjet(x)) return {};
  const f: Fiche = {};
  if (typeof x.theme === "string" && (THEMES as readonly string[]).includes(x.theme)) f.theme = x.theme as Theme;
  if (typeof x.personnes === "number" && Number.isInteger(x.personnes) && x.personnes >= 1 && x.personnes <= 60) f.personnes = x.personnes;
  if (typeof x.ambiance === "string" && (AMBIANCES_FICHE as readonly string[]).includes(x.ambiance)) f.ambiance = x.ambiance as AmbianceFiche;
  if (x.taille === "tout" || x.taille === "machine") f.taille = x.taille;
  else if (typeof x.taille === "number" && Number.isInteger(x.taille) && x.taille >= 8 && x.taille <= 200 && x.taille % 4 === 0) f.taille = x.taille;
  /* v2 (décision 10) : les photos préférées (Q3), l'occasion et le titre du questionnaire de /composer */
  if (Array.isArray(x.preferees)) { const l = x.preferees.filter((v): v is string => typeof v === "string" && v.length <= 80).slice(0, 10); if (l.length) f.preferees = l; }
  if (typeof x.occasion === "string" && x.occasion.trim()) f.occasion = x.occasion.replace(/\s+/g, " ").trim().slice(0, 200);
  if (typeof x.titreClient === "string" && x.titreClient.trim()) f.titreClient = x.titreClient.replace(/\s+/g, " ").trim().slice(0, 80);
  /* la page Analyse (M-34) : le « où » et le profil corrigés, les chapitres renommés */
  if (typeof x.pays === "string" && x.pays.trim()) f.pays = x.pays.replace(/\s+/g, " ").trim().slice(0, 60);
  if (typeof x.profil === "string" && (PROFILS as readonly string[]).includes(x.profil)) f.profil = x.profil as Profil;
  if (estObjet(x.chapitres)) {
    const c: Record<string, string> = {};
    for (const [k, v] of Object.entries(x.chapitres)) if (/^\d{1,2}$/.test(k) && typeof v === "string" && v.trim()) c[k] = v.replace(/\s+/g, " ").trim().slice(0, 60);
    if (Object.keys(c).length) f.chapitres = c;
  }
  if (Array.isArray(x.lieux)) {
    const l = x.lieux.filter((v): v is string => typeof v === "string").map((v) => v.replace(/\s+/g, " ").trim()).filter((v) => v && v.length <= 60).slice(0, LIEUX_MAX);
    if (l.length) f.lieux = l;
  }
  return f;
}

/**
 * Les QUESTIONS AU CLIENT (définition v2, décision 10 de Mathias : « OKAY, un peu comme notre processus d'avant ») : trois, toutes
 * facultatives, dans le ton du questionnaire de /composer (vouvoiement, une phrase courte, jamais « combien de pages » ni « qui est qui »).
 * Ce que le dossier porte DÉJÀ n'est jamais redemandé : l'occasion (écran 1, « Quel était ce moment ? »), l'histoire (écran 2) et le
 * titre (écran 3, « Donnez un titre à votre numéro. ») ; l'occasion aide à deviner le thème, le titre est le seul texte qu'on n'invente pas.
 */
export const QUESTIONS_CLIENT = [
  { cle: "personnes", question: "Combien étiez-vous ?", aide: "Un nombre suffit.", siVide: "le plus grand nombre de personnes compté sur au moins trois photos", regle: "M-04" },
  { cle: "lieux", question: "Les lieux ou les étapes à ne pas oublier ?", aide: "Dans l'ordre, séparés par une virgule.", siVide: "les lieux lus sur les panneaux, sinon des chapitres par le temps", regle: "M-05" },
  { cle: "preferees", question: "Vos photos préférées ?", aide: "Touchez-en trois à dix.", siVide: "la note « image » décide", regle: "N-49" },
] as const;

/** Le thème que suggèrent les mots du client (l'occasion du questionnaire), quand rien d'autre ne le dit. Jamais imprimé. */
export function themeDeLOccasion(occasion: string | undefined): Theme | null {
  const o = (occasion ?? "").toLowerCase();
  if (!o) return null;
  if (/road ?trip|circuit|itin[ée]rant/.test(o)) return "road_trip";
  if (/anniversaire|mariage|bapt[êe]me|communion|f[êe]te|soir[ée]e|enterrement de vie/.test(o)) return /soir[ée]e|f[êe]te entre/.test(o) ? "fete" : "evenement";
  if (/ann[ée]e|12 mois|grandir/.test(o)) return "annee";
  if (/plage|mer\b|bord de mer/.test(o)) return "plage";
  if (/week-end [àa] |city|ville/.test(o)) return "ville";
  return null;
}

/** Les lieux saisis en une ligne (« Lyon, Annecy › Chamonix ») : coupés aux virgules, points-virgules, flèches et retours. */
export const lieuxDeTexte = (s: string): string[] => s.split(/[,;\n›>→]+/).map((v) => v.replace(/\s+/g, " ").trim()).filter(Boolean).slice(0, LIEUX_MAX);

/** Les jours photographiés et la durée (premier au dernier jour daté). */
function jours(photos: readonly PhotoCompo[]): { duree: number; photographies: number } {
  const js = [...new Set(photos.filter((p) => p.date).map((p) => p.date!.slice(0, 10)))].sort();
  if (!js.length) return { duree: 0, photographies: 0 };
  return { duree: Math.round((Date.parse(js[js.length - 1]) - Date.parse(js[0])) / 86400000) + 1, photographies: js.length };
}

/** Le thème que suggère le voyage lu (couche 7). */
function themeDuVoyage(v: Voyage | null): Theme | null {
  const t = v?.type;
  if (!t) return null;
  if (t === "road_trip" || t === "circuit") return "road_trip";
  if (t === "city_break") return "ville";
  if (t === "evenement") return "evenement";
  if (t === "vie_quotidienne") return "annee";
  if (t === "sejour" || t === "croisiere" || t === "randonnee") return null;
  return null;
}

/** Ce que la machine DEVINE pour pré-remplir la fiche (chaque champ seulement quand elle le sait). */
export function devinerFiche(photos: readonly PhotoCompo[], voyage: Voyage | null): Fiche {
  const f: Fiche = {};
  const t = themeDuVoyage(voyage);
  const j = jours(photos);
  if (t) f.theme = t;
  else if (j.duree > 90) f.theme = "annee";
  else if (j.duree >= 1 && j.duree <= 2 && photos.length >= 60) f.theme = "evenement";
  /* M-04 : le plus grand groupe compté au moins trois fois (D29 : on compte des visages, jamais des personnes) */
  let G = 0;
  for (let k = 2; k <= 8; k++) if (photos.filter((p) => p.visages.length >= k).length >= 3) G = k;
  if (G) f.personnes = G;
  if (voyage?.qui === "famille" || voyage?.profil === "long_voyage_famille") f.ambiance = "sobre";
  else if (voyage?.profil === "vacances_festives_jeunes") f.ambiance = "stylise";
  /* M-15 (18/11) : la taille n'est plus une question ; la machine la propose (nombre commandé, sinon M-09) */
  f.taille = "machine";
  return f;
}

/**
 * M-15 (18/11, « il y a des questions comme le nombre de pages, je ne peux pas te dire ! ») : la taille que la machine compose.
 *  - une taille CHOISIE (un nombre, ou « tout », pris dans le bandeau après la proposition) est composée telle quelle ;
 *  - sinon le nombre de pages COMMANDÉ du dossier, quand l'éditeur le connaît (D20 : il est payé et gelé) ;
 *  - sinon M-09 : « tout garder » (la réserve n'a pris que les faibles, les pages s'adaptent à `DENSITE_TOUT` photos par double, la seule
 *    densité mesurée au banc ; il n'existe pas encore de densité par profil, rien n'est inventé).
 */
export function tailleACompose(taille: Fiche["taille"], pagesCommandees: number | null | undefined): { taille: "tout" | number; origine: "commandee" | "machine" | "choisie" } {
  if (typeof taille === "number" || taille === "tout") return { taille, origine: "choisie" };
  if (typeof pagesCommandees === "number" && Number.isInteger(pagesCommandees) && pagesCommandees >= 4) return { taille: pagesCommandees, origine: "commandee" };
  return { taille: "tout", origine: "machine" };
}

/** M-15 : les autres tailles que le bandeau offre APRÈS la proposition (chacune sera composée pour donner ses vrais chiffres). */
export function autresTailles(pagesProposees: number, origine: "commandee" | "machine" | "choisie", pagesCommandees: number | null | undefined): { mot: string; taille: "tout" | number }[] {
  const out: { mot: string; taille: "tout" | number }[] = [];
  const vise = Math.floor((pagesProposees * 0.6) / 4) * 4;
  /* une taille usuelle sous 60 % de la proposition ; un petit magazine (sous la plus petite usuelle) : 60 % arrondi au multiple de 4 */
  const court = [...TAILLES_PROPOSEES].filter((t) => t <= vise).pop() ?? (vise >= REGLAGES_COMPO.PAGES_MIN * 2 ? vise : undefined);
  /* N-62 : jamais plus court que le plus petit magazine vendu (la grille des prix) */
  if (court && court < pagesProposees && court >= REGLAGES_V2.VENDABLE_MIN) out.push({ mot: "Plus court", taille: court });
  /* N-62 (18/11 au soir) : « tout garder » est toujours offert à côté de la taille proposée, avec ses vrais chiffres */
  out.push({ mot: "Tout garder", taille: "tout" });
  if (typeof pagesCommandees === "number" && pagesCommandees >= 4 && origine !== "commandee" && pagesCommandees !== pagesProposees) out.push({ mot: "Commandé", taille: pagesCommandees });
  return out;
}

/** Le titre qu'on peut imprimer en page 1 et en couverture : le nom du projet, jamais un nom PAR DÉFAUT de l'outil (« Création libre »,
 *  « Dossier de … », « Dossier »), qui n'est pas un titre (E, 18/11 : sinon le cadre reste vide et n'est pas imprimé). */
export function titreImprimable(nom: string | null | undefined): string {
  const n = (nom ?? "").replace(/\s+/g, " ").trim();
  if (!n || /^création libre$/i.test(n) || /^dossier( de .*)?$/i.test(n)) return "";
  return n;
}

/** La fiche effective : ce que l'atelier a saisi, sinon ce que la machine devine. */
export const ficheEffective = (saisie: Fiche, devinee: Fiche): Fiche => ({ ...devinee, ...Object.fromEntries(Object.entries(saisie).filter(([, v]) => v !== undefined)) });

/** Le profil (PROFILS.md) : le thème de la fiche d'abord, puis le profil lu par la couche 7, puis les données. */
export function profilDe(fiche: Fiche, voyage: Voyage | null, photos: readonly PhotoCompo[]): Profil {
  /* M-34 : le profil corrigé dans l'Analyse prime */
  if (fiche.profil) return fiche.profil;
  const j = jours(photos);
  switch (fiche.theme) {
    case "road_trip": return j.duree >= 10 || !j.duree ? "long_voyage_famille" : "sejour_court";
    case "ville": case "plage": return j.duree >= 10 ? "long_voyage_famille" : "sejour_court";
    case "fete": return "vacances_festives_jeunes";
    case "evenement": return "evenement_un_jour";
    case "annee": return "annee_de_vie";
    default: break;
  }
  if (voyage?.profil) return voyage.profil;
  if (j.duree > 90) return "annee_de_vie";
  if (j.duree >= 1 && j.duree <= 3) return "evenement_un_jour";
  if (j.duree >= 10) return "long_voyage_famille";
  return "sejour_court";
}

/** M-06 : la sobriété suit le profil (voyage en famille = sobre) ; l'ambiance saisie prime. */
export function sobreDe(fiche: Fiche, profil: Profil, voyage: Voyage | null): boolean {
  if (fiche.ambiance) return fiche.ambiance === "sobre";
  return profil === "long_voyage_famille" || voyage?.qui === "famille";
}

/** La paire de polices par profil (BANQUE-POLICES.md, CHOIX-AUTO.md : une proposition, que l'atelier change d'un clic). */
export const PAIRE_DU_PROFIL: Readonly<Record<Profil, string>> = {
  long_voyage_famille: "T-13", sejour_court: "T-13", couple: "T-13", annee_de_vie: "T-13", evenement_un_jour: "T-13", vacances_festives_jeunes: "T-13",
};

/* ─────────────────────────── les chapitres sans voyage lu (N-32) ─────────────────────────── */

export type Chapitrage = { chapitreDe: Map<string, number>; nom: Map<number, string>; fiche: Map<number, string> };

/** Coupe une suite triée en `k` morceaux aux `k − 1` plus grands silences (à silence égal, le plus tôt). */
function couperAuxSilences(ts: number[], k: number): number[] {
  const ecarts = ts.slice(1).map((t, i) => ({ i: i + 1, d: t - ts[i] }));
  return ecarts.sort((a, b) => b.d - a.d || a.i - b.i).slice(0, Math.max(0, k - 1)).map((e) => e.i).sort((a, b) => a - b);
}

/**
 * N-32 (18/11, M-01, M-05) : les chapitres quand le voyage n'est pas lu, ou quand la fiche donne les étapes :
 *  - des ÉTAPES saisies (road trip) : autant de chapitres que d'étapes, coupés aux plus grands silences, nommés par elles, dans l'ordre ;
 *  - une ANNÉE : un chapitre par mois photographié, nommé par le mois ;
 *  - sinon : un chapitre pour trois jours photographiés (1 à 8), coupés aux plus grands silences, nommés par leurs dates.
 * Une photo sans date rejoint le chapitre de sa voisine de dépôt datée (la précédente, sinon la suivante) ; un lot sans aucune date se
 * coupe dans l'ordre du dépôt.
 */
export function chapitrer(photos: readonly PhotoCompo[], fiche: Fiche, voyage: Voyage | null): Chapitrage {
  const R = REGLAGES_COMPO;
  const chapitreDe = new Map<string, number>();
  const nom = new Map<number, string>();
  const ficheNoms = new Map<number, string>();
  const etapes = fiche.theme === "road_trip" || fiche.theme === undefined ? fiche.lieux ?? [] : [];
  if (voyage && voyage.chapitres.length && !etapes.length) {
    for (const c of voyage.chapitres) { nom.set(c.numero, c.titre); for (const id of c.photos) chapitreDe.set(id, c.numero); }
    /* une photo que le voyage n'a pas rangée suit sa voisine de dépôt */
    rattacher(photos, chapitreDe);
    return { chapitreDe, nom, fiche: ficheNoms };
  }
  const datees = photos.filter((p) => p.date).sort((a, b) => (a.date! < b.date! ? -1 : a.date! > b.date! ? 1 : 0));
  if (!datees.length) {
    const k = Math.max(R.CHAPITRES_MIN, Math.min(etapes.length || R.CHAPITRES_MAX, Math.round(photos.length / 30) || 1));
    photos.forEach((p, i) => chapitreDe.set(p.id, Math.min(k, Math.floor((i * k) / photos.length) + 1)));
    for (let c = 1; c <= k; c++) { nom.set(c, etapes[c - 1] ?? `Chapitre ${c}`); if (etapes[c - 1]) ficheNoms.set(c, etapes[c - 1]); }
    return { chapitreDe, nom, fiche: ficheNoms };
  }
  const ts = datees.map((p) => T(p.date!).getTime());
  let coupes: number[];
  if (fiche.theme === "annee" && !etapes.length) {
    coupes = [];
    for (let i = 1; i < datees.length; i++) if (datees[i].date!.slice(0, 7) !== datees[i - 1].date!.slice(0, 7)) coupes.push(i);
  } else {
    const nJours = new Set(datees.map((p) => p.date!.slice(0, 10))).size;
    const k = etapes.length ? Math.min(etapes.length, datees.length) : Math.max(R.CHAPITRES_MIN, Math.min(R.CHAPITRES_MAX, Math.round(nJours / R.JOURS_PAR_CHAPITRE)));
    coupes = couperAuxSilences(ts, k);
  }
  const bornes = [0, ...coupes, datees.length];
  for (let c = 1; c < bornes.length; c++) {
    const morceau = datees.slice(bornes[c - 1], bornes[c]);
    for (const p of morceau) chapitreDe.set(p.id, c);
    const a = T(morceau[0].date!), b = T(morceau[morceau.length - 1].date!);
    const mot = fiche.theme === "annee" && !etapes.length ? moisFr(a).charAt(0).toUpperCase() + moisFr(a).slice(1) : plageFr(a, b);
    nom.set(c, etapes[c - 1] ?? mot);
    if (etapes[c - 1]) ficheNoms.set(c, etapes[c - 1]);
  }
  rattacher(photos, chapitreDe);
  return { chapitreDe, nom, fiche: ficheNoms };
}

function rattacher(photos: readonly PhotoCompo[], chapitreDe: Map<string, number>): void {
  photos.forEach((p, i) => {
    if (chapitreDe.has(p.id)) return;
    for (let d = 1; d < photos.length; d++) {
      const avant = photos[i - d], apres = photos[i + d];
      if (avant && chapitreDe.has(avant.id) && avant.date) { chapitreDe.set(p.id, chapitreDe.get(avant.id)!); return; }
      if (apres && chapitreDe.has(apres.id) && apres.date) { chapitreDe.set(p.id, chapitreDe.get(apres.id)!); return; }
    }
    const premier = [...chapitreDe.values()].sort((a, b) => a - b)[0];
    if (premier !== undefined) chapitreDe.set(p.id, premier);
  });
}

/**
 * Les gestes de couleur (lot G, 14/11) : poser ou retirer le FOND d'une page ou d'une double, et la couleur d'un TEXTE (intérieur ou
 * couverture). Purs : le MÊME magazine si rien ne change ou si la demande ne se relit pas ; une clé n'est écrite que quand elle
 * existe (jamais `fond: undefined` ni `couleur: undefined`, que `contenuValide` refuse).
 */

import { cadresDe, coteSeul, dispositionDe, type Cible, type Disposition, type Magazine, type Planche, type RefCadre, type TexteCadre } from "../magazine";
import { couleurLibreValide, estRole, hexDeCouleur, nomDeCouleur, majuscule, type CoteFond, type CouleurLibre, type FondPlanche } from "../couleursLibres";
import { NOM_ROLE, type StyleMagazine } from "../style";
import { PAGE_L } from "../geometrie";
import { COULEURS_ORIGINE, REGLAGES_NUANCIER, contraste, deltaE00, estHex, lchDeHex, type CouleursNuancier, type RoleCouleur } from "../nuancier";
import type { Combo } from "../combos";
import { couvertureDe, estCouverture, estEntier, indexPlanche } from "./outils";

/** Le fond d'une planche, sans clé vide. */
function avecFond(p: Planche, f: FondPlanche): Planche {
  const { fond: _f, ...reste } = p;
  void _f;
  const propre: FondPlanche = {
    ...(f.gauche ? { gauche: f.gauche } : {}),
    ...(f.droite ? { droite: f.droite } : {}),
  };
  return propre.gauche || propre.droite ? { ...reste, fond: propre } : reste;
}

/**
 * Le fond de la page (`gauche`, `droite`) ou de la double entière (`double` : les deux côtés) ; `null` le retire. Sur la première
 * (page droite seule) et la dernière (page gauche seule), toute cible vise LA page de la planche. Rien ne change pour une couleur
 * qui ne se relit pas, une planche inconnue, ou une couleur déjà posée.
 */
export function colorerFond(m: Magazine, plancheId: string, cible: Cible, couleur: CouleurLibre | null): Magazine {
  if (couleur !== null && !couleurLibreValide(couleur)) return m;
  if (cible !== "double" && cible !== "gauche" && cible !== "droite") return m;
  const i = indexPlanche(m, plancheId);
  if (i < 0) return m;
  const p = m.planches[i];
  const seul = coteSeul(m, i);
  const cotes: ("gauche" | "droite")[] = seul ? [seul] : cible === "double" ? ["gauche", "droite"] : [cible];
  const avant = p.fond ?? {};
  const apres: FondPlanche = { ...avant };
  for (const c of cotes) {
    if (couleur === null) delete apres[c];
    else apres[c] = couleur;
  }
  if ((avant.gauche ?? null) === (apres.gauche ?? null) && (avant.droite ?? null) === (apres.droite ?? null)) return m;
  const planches = m.planches.slice();
  planches[i] = avecFond(p, apres);
  return { ...m, planches };
}

/** Le texte avec (ou sans) sa couleur choisie. */
function texteAvec(t: TexteCadre, couleur: CouleurLibre | null): TexteCadre {
  if (couleur === null) {
    const { couleur: _c, ...reste } = t;
    void _c;
    return reste;
  }
  return { ...t, couleur };
}

/**
 * La couleur du texte n° `ref.index` (les cadres TEXTE de la disposition, ou de la couverture) ; `null` rend celle du gabarit. Rien
 * ne change pour une couleur qui ne se relit pas, un texte introuvable ou une couleur déjà posée.
 */
export function colorerTexte(m: Magazine, ref: RefCadre | null | undefined, couleur: CouleurLibre | null): Magazine {
  if (!ref || !estEntier(ref.index) || (couleur !== null && !couleurLibreValide(couleur))) return m;
  if (estCouverture(ref)) {
    const c = couvertureDe(m);
    const t = c.textes[ref.index];
    if (!t || (t.couleur ?? null) === couleur) return m;
    const textes = c.textes.slice();
    textes[ref.index] = texteAvec(t, couleur);
    return { ...m, couverture: { ...c, textes } };
  }
  const i = indexPlanche(m, ref.plancheId);
  if (i < 0) return m;
  const p = m.planches[i];
  const d = dispositionDe(p, ref.cible);
  const t = d?.textes[ref.index];
  if (!d || !t || (t.couleur ?? null) === couleur) return m;
  const textes = d.textes.slice();
  textes[ref.index] = texteAvec(t, couleur);
  const nd: Disposition = { ...d, textes };
  const q: Planche = ref.cible === "double" ? { ...p, double: nd } : { ...p, [ref.cible]: nd };
  const planches = m.planches.slice();
  planches[i] = q;
  return { ...m, planches };
}

/** Le nom d'une couleur pour l'historique : « Accent », « Ocre #ca7749 ». */
export const nomCouleur = (c: CouleurLibre): string => (estRole(c) ? NOM_ROLE[c] : `${majuscule(nomDeCouleur(c))} ${c}`);

/** Ce que l'entrée d'historique dit. */
export const libelleFond = (couleur: CouleurLibre | null): string => (couleur === null ? "Fond retiré" : `Fond · ${nomCouleur(couleur)}`);
export const libelleTexte = (couleur: CouleurLibre | null): string => (couleur === null ? "Couleur du gabarit" : `Texte · ${nomCouleur(couleur)}`);

/** Les couleurs libres posées dans le magazine (fonds et textes), sans doublon, dans l'ordre où on les rencontre : ce que le sélecteur rappelle. */
export function couleursPosees(m: Magazine): CouleurLibre[] {
  const vues: CouleurLibre[] = [];
  const voir = (c: CouleurLibre | undefined) => { if (c && !vues.includes(c)) vues.push(c); };
  for (const p of m.planches) {
    voir(p.fond?.gauche); voir(p.fond?.droite);
    for (const d of [p.double, p.gauche, p.droite]) for (const t of d?.textes ?? []) voir(t.couleur);
  }
  for (const t of m.couverture?.textes ?? []) voir(t.couleur);
  return vues;
}

/* ─────────────────────── la palette : ce qui va avec (lot Palette, T-209 second temps, 16/11) ─────────────────────── */

/** Les couleurs de TEXTE d'une page entière en un geste (une seule entrée d'historique), pour la proposition « Texte » d'un fond posé. */
export function colorerTextes(m: Magazine, refs: readonly RefCadre[], couleur: CouleurLibre): Magazine {
  if (!couleurLibreValide(couleur)) return m;
  let r = m;
  for (const ref of refs) r = colorerTexte(r, ref, couleur);
  return r;
}

/** Les textes (cadres TEXTE, intérieur) d'un côté de la planche : leur référence et leur couleur choisie (null : celle du gabarit). */
export function textesDuCote(m: Magazine, plancheId: string, cote: CoteFond): { ref: RefCadre; couleur: CouleurLibre | null }[] {
  const p = m.planches.find((x) => x.id === plancheId);
  if (!p) return [];
  const sortie: { ref: RefCadre; couleur: CouleurLibre | null }[] = [];
  for (const cible of ["gauche", "droite", "double"] as const) {
    const d = dispositionDe(p, cible);
    if (!d) continue;
    let iT = 0;
    for (const c of cadresDe(d, cible)) {
      if (c.role === "photo") continue;
      const index = iT++;
      /* une double : le texte est de la page où est son centre ; une page : la sienne */
      const cote2: CoteFond = cible === "double" ? (c.x + c.l / 2 < PAGE_L ? "gauche" : "droite") : cible;
      if (cote2 === cote) sortie.push({ ref: { plancheId, cible, index }, couleur: d.textes[index]?.couleur ?? null });
    }
  }
  return sortie;
}

/** Ce qu'on vient de poser : le fond d'UNE page (le côté sous le pointeur), ou la couleur d'UN texte. */
export type PoseCouleur =
  | { type: "fond"; plancheId: string; cote: CoteFond; couleur: CouleurLibre }
  | { type: "texte"; ref: RefCadre; couleur: CouleurLibre };

/** Le geste d'une proposition : un fond (une page), ou les textes d'une page (une entrée d'historique). */
export type GesteProposition =
  | { type: "colorerFond"; plancheId: string; cible: CoteFond; couleur: CouleurLibre }
  | { type: "colorerTextes"; refs: RefCadre[]; couleur: CouleurLibre };

export type PropositionCouleur = {
  /** Ce que la proposition colore : « Texte », « Page d'en face », « Fond ». */
  cible: "texte" | "face" | "fond";
  libelle: "Texte" | "Page d'en face" | "Fond";
  couleur: CouleurLibre;
  /** Le nom de la couleur : « Papier », « Ocre #ca7749 ». */
  nom: string;
  /** Pourquoi, en deux à quatre mots. */
  raison: string;
  geste: GesteProposition;
};

/** Les réglages des propositions, nommés ici (jamais plus bas dans un composant). */
export const REGLAGES_PROPOSITIONS = {
  /** Un texte courant se lit à 4,5:1 (WCAG AA, R-C-25) ; la même valeur que le nuancier. */
  CONTRASTE_TEXTE: REGLAGES_NUANCIER.CONTRASTE_TEXTE,
  /** Deux couleurs plus proches que ça (ΔE00) ne font qu'une : jamais proposer « presque la même ». */
  PRESQUE_PAREIL: 8,
  /** Une couleur de la palette d'un combo est reconnue à ce ΔE00 près. */
  MEME_COULEUR: 3,
  /** Au plus trois propositions. */
  MAX: 3,
} as const;

const TRIO: readonly RoleCouleur[] = ["aplatSourd", "aplatClair", "accent"];
const NEUTRES: readonly RoleCouleur[] = ["encre", "papier", "nuit"];

/** Le nuancier courant du magazine (celui du style, sinon celui d'origine). */
const nuancierDuMagazine = (m: Magazine): CouleursNuancier => m.style?.couleurs ?? { ...COULEURS_ORIGINE };

/**
 * La couleur d'une page la plus proche de « du même combo » : si `c` est une couleur du trio d'un combo (le nuancier courant, ou un
 * combo proposé), son autre couleur la plus éloignée en clarté (le sourd appelle le pâle) ; sinon, des aplats du nuancier celui qui s'en distingue le plus. Un RÔLE reste
 * un rôle (il suit le nuancier), une couleur prise à un combo non appliqué est un hexa.
 */
function partenaire(c: CouleurLibre, nuancier: CouleursNuancier, combos: readonly Combo[], style: StyleMagazine | null): CouleurLibre | null {
  const H = hexDeCouleur(c, style);
  const loin = (candidats: readonly { couleur: CouleurLibre; hex: string }[]): CouleurLibre | null => {
    const bons = candidats.filter((x) => deltaE00(x.hex, H) >= REGLAGES_PROPOSITIONS.PRESQUE_PAREIL);
    /* le plus grand écart de CLARTÉ d'abord (le sourd appelle le pâle : le rythme d'une double), puis le plus éloigné en teinte */
    const L = lchDeHex(H).L;
    bons.sort((a, b) => Math.abs(lchDeHex(b.hex).L - L) - Math.abs(lchDeHex(a.hex).L - L) || deltaE00(b.hex, H) - deltaE00(a.hex, H));
    return bons[0]?.couleur ?? null;
  };
  /* 1. la couleur est un rôle du trio du nuancier courant (ou en a la valeur) : ses deux sœurs, en rôles */
  if (TRIO.some((r) => r === c || nuancier[r] === H)) return loin(TRIO.map((r) => ({ couleur: r as CouleurLibre, hex: nuancier[r] })));
  /* 2. la couleur est (à ΔE00 < 3) du trio d'un combo proposé : ses sœurs, en hexa */
  for (const k of combos) {
    if (TRIO.some((r) => deltaE00(k.couleurs[r], H) < REGLAGES_PROPOSITIONS.MEME_COULEUR)) {
      return loin(TRIO.map((r) => ({ couleur: k.couleurs[r] as CouleurLibre, hex: k.couleurs[r] })));
    }
  }
  /* 3. une couleur libre ou neutre : l'aplat du nuancier qui s'en distingue le plus */
  return loin(TRIO.map((r) => ({ couleur: r as CouleurLibre, hex: nuancier[r] })));
}

/** Les couleurs de TEXTE qui se lisent sur ce fond, la plus lisible d'abord (l'encre, le papier, la nuit : des rôles ; à défaut noir ou blanc). */
export function textesLisibles(fond: string, nuancier: CouleursNuancier, seuil: number = REGLAGES_PROPOSITIONS.CONTRASTE_TEXTE): { couleur: CouleurLibre; k: number }[] {
  const liste: { couleur: CouleurLibre; k: number }[] = NEUTRES.map((r) => ({ couleur: r as CouleurLibre, k: contraste(nuancier[r], fond) }));
  const vus = new Set<string>();
  return liste.filter((x) => { const h = nuancier[x.couleur as RoleCouleur]; if (vus.has(h)) return false; vus.add(h); return true; })
    .filter((x) => x.k >= seuil).sort((a, b) => b.k - a.k);
}

const nommee = (c: CouleurLibre): string => nomCouleur(c);

/**
 * Ce que la palette PROPOSE juste après une pose (2 ou 3 couleurs nommées avec leur cible, la plus sûre d'abord), pur et déterministe.
 * - un FOND posé sur une page : « Texte », la couleur qui s'y lit à 4,5:1 (l'encre, le papier ou la nuit, la plus lisible), pour les
 *   textes de cette page (seulement s'il y en a, et pas déjà celle-là) ; « Page d'en face », la couleur du même combo (sœur du trio),
 *   puis « Page d'en face », la MÊME couleur (une double unie, d'un clic) ; sur la première ou la dernière planche, pas de face ;
 * - un TEXTE coloré : « Fond » pour sa page, parmi l'autre couleur de son combo, le papier et la nuit, ce qui se lit avec lui
 *   (4,5:1 ; 3:1 pour un titre) ; la couverture n'a pas de fond libre : rien.
 * Aucune proposition n'est une couleur déjà posée ni presque la même que celle qu'on vient de poser.
 */
export function propositionsApres(m: Magazine, pose: PoseCouleur, combos: readonly Combo[] = []): PropositionCouleur[] {
  const nuancier = nuancierDuMagazine(m);
  const style = m.style ?? null;
  const sortie: PropositionCouleur[] = [];
  if (pose.type === "fond") {
    const i = m.planches.findIndex((p) => p.id === pose.plancheId);
    if (i < 0 || !couleurLibreValide(pose.couleur)) return [];
    const p = m.planches[i];
    const H = hexDeCouleur(pose.couleur, style);
    /* le texte qui s'y lit */
    const textes = textesDuCote(m, pose.plancheId, pose.cote);
    const lisible = textesLisibles(H, nuancier)[0];
    if (textes.length && lisible && !textes.every((t) => t.couleur === lisible.couleur)) {
      sortie.push({ cible: "texte", libelle: "Texte", couleur: lisible.couleur, nom: nommee(lisible.couleur), raison: `Se lit à ${lisible.k.toFixed(1).replace(".", ",")} : 1`,
        geste: { type: "colorerTextes", refs: textes.map((t) => t.ref), couleur: lisible.couleur } });
    }
    /* la page d'en face : seulement sur une double (ni la première, ni la dernière) */
    const face: CoteFond | null = coteSeul(m, i) ? null : pose.cote === "gauche" ? "droite" : "gauche";
    if (face) {
      const dejaFace = (c: CouleurLibre) => (p.fond?.[face] ?? null) === c;
      const soeur = partenaire(pose.couleur, nuancier, combos, style);
      if (soeur && !dejaFace(soeur) && deltaE00(hexDeCouleur(soeur, style), H) >= REGLAGES_PROPOSITIONS.PRESQUE_PAREIL) {
        sortie.push({ cible: "face", libelle: "Page d'en face", couleur: soeur, nom: nommee(soeur), raison: "Même combo",
          geste: { type: "colorerFond", plancheId: pose.plancheId, cible: face, couleur: soeur } });
      }
      if (!dejaFace(pose.couleur)) {
        sortie.push({ cible: "face", libelle: "Page d'en face", couleur: pose.couleur, nom: nommee(pose.couleur), raison: "Double unie",
          geste: { type: "colorerFond", plancheId: pose.plancheId, cible: face, couleur: pose.couleur } });
      }
    }
    return sortie.slice(0, REGLAGES_PROPOSITIONS.MAX);
  }
  /* un texte coloré : le fond qui va avec */
  const { ref } = pose;
  if (ref.plancheId === "couverture" || !couleurLibreValide(pose.couleur)) return [];
  const p = m.planches.find((x) => x.id === ref.plancheId);
  const d = p ? dispositionDe(p, ref.cible) : null;
  if (!p || !d) return [];
  /* le côté du texte : celui de sa page, ou, sur une double, celui où est son centre */
  const cadre = cadresDe(d, ref.cible).filter((c) => c.role !== "photo")[ref.index];
  if (!cadre) return [];
  const cote: CoteFond = ref.cible === "double" ? (cadre.x + cadre.l / 2 < PAGE_L ? "gauche" : "droite") : ref.cible;
  const T = hexDeCouleur(pose.couleur, style);
  const seuil = cadre.role === "titre" ? REGLAGES_NUANCIER.CONTRASTE_TITRE : REGLAGES_PROPOSITIONS.CONTRASTE_TEXTE;
  const soeur = partenaire(pose.couleur, nuancier, combos, style);
  const candidats: CouleurLibre[] = [...(soeur ? [soeur] : []), "papier", "nuit", ...TRIO];
  const dejaPose = p.fond?.[cote] ?? null;
  const vus: string[] = [];
  for (const c of candidats) {
    const h = hexDeCouleur(c, style);
    if (!estHex(h) || c === pose.couleur || c === dejaPose) continue;
    if (deltaE00(h, T) < REGLAGES_PROPOSITIONS.PRESQUE_PAREIL || contraste(T, h) < seuil) continue;
    if (vus.some((v) => deltaE00(v, h) < REGLAGES_PROPOSITIONS.PRESQUE_PAREIL)) continue;
    vus.push(h);
    sortie.push({ cible: "fond", libelle: "Fond", couleur: c, nom: nommee(c), raison: `Se lit à ${contraste(T, h).toFixed(1).replace(".", ",")} : 1`,
      geste: { type: "colorerFond", plancheId: ref.plancheId, cible: cote, couleur: c } });
    if (sortie.length >= REGLAGES_PROPOSITIONS.MAX) break;
  }
  return sortie;
}

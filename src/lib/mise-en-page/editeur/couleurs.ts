/**
 * Les gestes de couleur (lot G, 14/11) : poser ou retirer le FOND d'une page ou d'une double, et la couleur d'un TEXTE (intérieur ou
 * couverture). Purs : le MÊME magazine si rien ne change ou si la demande ne se relit pas ; une clé n'est écrite que quand elle
 * existe (jamais `fond: undefined` ni `couleur: undefined`, que `contenuValide` refuse).
 */

import { coteSeul, dispositionDe, type Cible, type Disposition, type Magazine, type Planche, type RefCadre, type TexteCadre } from "../magazine";
import { couleurLibreValide, estRole, nomDeCouleur, majuscule, type CouleurLibre, type FondPlanche } from "../couleursLibres";
import { NOM_ROLE } from "../style";
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

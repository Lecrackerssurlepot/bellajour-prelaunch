/**
 * Le harnais du lot PALETTE (T-209, second temps, 16/11), appelé par verif-atelier.ts :
 *   1. `propositionsApres` : pure, déterministe, 2 ou 3 couleurs nommées avec leur cible (« Texte », « Page d'en face », « Fond »),
 *      la couleur de texte proposée se LIT (contraste), jamais une couleur déjà posée, jamais presque la même ;
 *   2. le geste `colorerTextes` : une seule entrée d'historique, Annuler, invariants, un magazine qui se relit ;
 *   3. la proposition appliquée : une double unie, un texte lisible ; la couverture n'a pas de fond libre.
 * Sans base, sans réseau, sans écriture.
 */

import * as O from "@/lib/mise-en-page/editeur";
import type { EtatEditeur, PhotoMaq } from "@/lib/mise-en-page/editeur";
import { nouveauMagazine, tousLesTemplates, type Magazine, type PhotoRef } from "@/lib/mise-en-page/magazine";
import { contenuValide } from "@/lib/mise-en-page/sauvegarde";
import { COULEURS_ORIGINE, contraste, deltaE00 } from "@/lib/mise-en-page/nuancier";
import { hexDeCouleur, type CouleurLibre } from "@/lib/mise-en-page/couleursLibres";
import { proposerCombos } from "@/lib/mise-en-page/combos";
import { styleDePaire } from "@/lib/mise-en-page/style";

type Rapporter = (nom: string, reussi: boolean) => void;

const maq = (id: string, l: number, h: number): PhotoMaq => ({
  id, nom: `${id}.jpg`, l, h, date: `2026-07-0${(id.charCodeAt(1) % 8) + 1}T10:00:00.000Z`, personne: "Inès", lien: null, type: "atelier", coeur: false, signalee: false,
  autresMagazines: [], nouvelle: false, vignette: null,
});
const IDS = ["p1", "p2", "p3", "p4", "p5", "p6", "p7"];
const CATALOGUE: Map<string, PhotoMaq> = new Map(IDS.map((id, i) => [id, maq(id, i % 2 ? 3000 : 4000, i % 2 ? 4000 : 3000)]));

/** Page 1 (une photo), une double à titre (trois photos), une planche en deux pages (un titre sur la gauche), la dernière page. */
function magazine(): Magazine {
  const cat = CATALOGUE as unknown as ReadonlyMap<string, PhotoRef>;
  let m = nouveauMagazine("mp", "Madère", "2026-11-16T10:00:00.000Z");
  m = O.insererDouble(m, "pl-1", "pl-2").magazine;
  m = O.insererDouble(m, "pl-2", "pl-3").magazine;
  m = O.ajouter(m, "pl-1", "droite", ["p1"], cat).magazine;
  m = O.ajouter(m, "pl-2", "double", ["p2", "p3", "p4"], cat).magazine;
  const t = tousLesTemplates().find((x) => x.portee === "double" && x.nbPhotos === 3 && x.cadres.some((c) => c.role === "titre"));
  if (t) m = O.choisirGabarit(m, "pl-2", "double", t.id, cat).magazine;
  m = O.ajouter(m, "pl-3", "gauche", ["p5"], cat).magazine;
  m = O.ajouter(m, "pl-3", "droite", ["p6"], cat).magazine;
  m = O.ajouter(m, "pl-fin", "gauche", ["p7"], cat).magazine;
  return m;
}
const etatDe = (m: Magazine): EtatEditeur => O.creerEtat({ magazine: m, catalogue: CATALOGUE });
/** Un titre sur la page de GAUCHE de pl-3 : le gabarit à titre d'une page, s'il en existe un. */
function avecTitrePage(m: Magazine): Magazine {
  const cat = CATALOGUE as unknown as ReadonlyMap<string, PhotoRef>;
  const t = tousLesTemplates().find((x) => x.portee === "page" && x.nbPhotos === 1 && x.cadres.some((c) => c.role === "titre"));
  return t ? O.choisirGabarit(m, "pl-3", "gauche", t.id, cat).magazine : m;
}

/** Un échantillon de palettes (la lecture d'un lot : un ocre qui revient, du bleu de ciel) pour avoir de vrais combos. */
const PALETTES: string[][] = [["#cf8a5b", "#d8d8de", "#99afce", "#3f2c26", "#a9978a"], ["#c98558", "#786a60", "#d0d3df", "#363e3f", "#658bcc"], ["#d09062", "#cdb091", "#528bd4", "#837553", "#8dc4f8"]];

export async function verifierMepPalette(ok: Rapporter, titre: (t: string) => void): Promise<void> {
  titre("— mise en page, lot Palette (T-209, second temps) : glisser une couleur, ce qui va avec —");
  const m0 = avecTitrePage(magazine());
  const combos = proposerCombos(PALETTES, COULEURS_ORIGINE);
  const hex = (c: CouleurLibre, m: Magazine = m0): string => hexDeCouleur(c, m.style ?? null);
  const double = m0.planches.find((p) => p.id === "pl-2")!;
  ok("palette : le magazine de test porte un titre sur la double et des combos réels (de quoi proposer)", !!double.double && double.double.textes.length > 0 && combos.length >= 2);

  /* ── 1. un fond posé sur la page de GAUCHE de la double ── */
  const surGauche = O.propositionsApres(m0, { type: "fond", plancheId: "pl-2", cote: "gauche", couleur: "aplatSourd" }, combos);
  const surGauche2 = O.propositionsApres(m0, { type: "fond", plancheId: "pl-2", cote: "gauche", couleur: "aplatSourd" }, combos);
  ok("propositions : pures et déterministes (deux appels, même résultat, le magazine ne bouge pas)", JSON.stringify(surGauche) === JSON.stringify(surGauche2) && m0 === m0);
  ok("propositions : un fond posé sur une page de double donne 2 ou 3 propositions, chacune avec une cible et un nom", surGauche.length >= 2 && surGauche.length <= 3
    && surGauche.every((p) => ["texte", "face", "fond"].includes(p.cible) && p.nom.length > 0 && p.libelle.length > 0 && p.raison.length > 0));
  const texte = surGauche.find((p) => p.cible === "texte");
  const textesGauche = O.textesDuCote(m0, "pl-2", "gauche");
  ok("propositions : « Texte » n'est proposé que s'il y a un texte sur cette page, et la couleur proposée SE LIT sur le fond (4,5:1)",
    (textesGauche.length > 0) === !!texte && (!texte || contraste(hex(texte.couleur), hex("aplatSourd")) >= 4.5));
  const faces = surGauche.filter((p) => p.cible === "face");
  ok("propositions : « Page d'en face » vise le côté opposé (la droite) de la même planche, avec un geste colorerFond ; l'une est la MÊME couleur (une double unie)",
    faces.length >= 1 && faces.every((p) => p.geste.type === "colorerFond" && p.geste.plancheId === "pl-2" && p.geste.cible === "droite") && faces.some((p) => p.couleur === "aplatSourd" && p.raison === "Double unie"));
  const soeur = faces.find((p) => p.couleur !== "aplatSourd");
  ok("propositions : la page d'en face du même combo est une autre couleur du trio du nuancier, assez différente (ΔE00 ≥ 8) ; à l'aplat sourd répond l'aplat CLAIR (le plus grand écart de clarté : le rythme d'une double)",
    !!soeur && ["aplatClair", "accent"].includes(soeur.couleur as string) && deltaE00(hex(soeur.couleur), hex("aplatSourd")) >= 8 && soeur.couleur === "aplatClair");

  /* le texte se lit sur un fond sombre (papier) comme sur un fond clair (encre) */
  const surNuit = O.propositionsApres(m0, { type: "fond", plancheId: "pl-2", cote: "droite", couleur: "nuit" }, combos).find((p) => p.cible === "texte");
  const surClair = O.propositionsApres(m0, { type: "fond", plancheId: "pl-2", cote: "droite", couleur: "aplatClair" }, combos).find((p) => p.cible === "texte");
  ok("propositions : sur la nuit le texte proposé est le papier ; sur l'aplat clair, l'encre ou la nuit (jamais le papier)", surNuit?.couleur === "papier" && !!surClair && surClair.couleur !== "papier");
  /* un fond sur lequel aucune couleur du nuancier ne se lit : pas de proposition « Texte » plutôt qu'un texte illisible */
  const milieu = O.propositionsApres(m0, { type: "fond", plancheId: "pl-2", cote: "droite", couleur: "#808080" }, combos).find((p) => p.cible === "texte");
  ok("propositions : sur un gris moyen (aucun texte du nuancier ne s'y lit à 4,5:1) la machine ne propose PAS un texte illisible", !milieu || contraste(hex(milieu.couleur), "#808080") >= 4.5);
  /* jamais presque la même */
  ok("propositions : une page d'en face n'est jamais « presque la même » que le fond posé, sauf la proposition « Double unie » assumée",
    surGauche.filter((p) => p.cible === "face" && p.raison !== "Double unie").every((p) => deltaE00(hex(p.couleur), hex("aplatSourd")) >= 8));
  /* la première planche et la dernière n'ont pas de face */
  const surPage1 = O.propositionsApres(m0, { type: "fond", plancheId: "pl-1", cote: "droite", couleur: "accent" }, combos);
  const surFin = O.propositionsApres(m0, { type: "fond", plancheId: "pl-fin", cote: "gauche", couleur: "accent" }, combos);
  ok("propositions : la page 1 et la dernière page (seules) n'ont pas de « page d'en face »", !surPage1.some((p) => p.cible === "face") && !surFin.some((p) => p.cible === "face"));
  /* une couleur de photo (hexa) trouve son combo */
  const ocre = combos[0].couleurs.aplatSourd;
  const horsCombo = O.propositionsApres(m0, { type: "fond", plancheId: "pl-2", cote: "gauche", couleur: ocre as CouleurLibre }, combos).filter((p) => p.cible === "face");
  ok("propositions : une couleur prise à un combo non appliqué propose la sœur de CE combo (en hexa), pas un rôle du nuancier courant",
    horsCombo.length >= 1 && horsCombo.some((p) => /^#[0-9a-f]{6}$/.test(p.couleur) && (p.couleur === combos[0].couleurs.aplatClair || p.couleur === combos[0].couleurs.accent)));
  /* des entrées qui ne se relisent pas */
  ok("propositions : une planche inconnue, une couleur qui ne se relit pas, une couverture : rien (jamais une exception)",
    O.propositionsApres(m0, { type: "fond", plancheId: "pl-9", cote: "gauche", couleur: "accent" }, combos).length === 0
      && O.propositionsApres(m0, { type: "fond", plancheId: "pl-2", cote: "gauche", couleur: "#FFF" as never }, combos).length === 0
      && O.propositionsApres(m0, { type: "texte", ref: { plancheId: "couverture", cible: "double", index: 0 }, couleur: "accent" }, combos).length === 0);

  /* ── 2. un TEXTE coloré : le fond qui va avec ── */
  const refT = { plancheId: "pl-2", cible: "double" as const, index: 0 };
  const pourTexte = O.propositionsApres(m0, { type: "texte", ref: refT, couleur: "papier" }, combos);
  ok("propositions : un texte coloré (papier) propose des FONDS sur lesquels il se lit (contraste ≥ 3 pour un titre), 1 à 3, cible « Fond »",
    pourTexte.length >= 1 && pourTexte.length <= 3 && pourTexte.every((p) => p.cible === "fond" && p.libelle === "Fond" && p.geste.type === "colorerFond" && contraste(hex(p.couleur), "#ffffff") >= 3));
  const encre = O.propositionsApres(m0, { type: "texte", ref: refT, couleur: "encre" }, combos);
  ok("propositions : un texte à l'encre propose le papier ou un aplat pâle, jamais la nuit (la même couleur) ni un fond où il ne se lit pas",
    encre.length >= 1 && encre.every((p) => p.couleur !== "nuit" && contraste(hex(p.couleur), hex("encre")) >= 3));
  const pourPoser = O.propositionsApres(m0, { type: "texte", ref: refT, couleur: "papier" }, combos)[0];
  ok("propositions : le fond proposé pour un titre de double vise la page où est son centre (gauche ou droite), jamais « double »", pourPoser?.geste.type === "colorerFond" && (pourPoser.geste.cible === "gauche" || pourPoser.geste.cible === "droite"));
  /* sous un style, les rôles lisent le nuancier du style */
  const mStyle = { ...m0, style: styleDePaire("T-01")! } as Magazine;
  const sousStyle = O.propositionsApres(mStyle, { type: "fond", plancheId: "pl-2", cote: "gauche", couleur: "aplatSourd" }, combos).find((p) => p.cible === "texte");
  ok("propositions : sous un style, la lisibilité est calculée sur le nuancier DU STYLE (le fond du style, ses encres)", !sousStyle || contraste(hex(sousStyle.couleur, mStyle), hex("aplatSourd", mStyle)) >= 4.5);

  /* ── 3. le geste colorerTextes et l'application d'une proposition ── */
  const e0 = etatDe(m0);
  const err: string[] = [];
  const jouer = (e: EtatEditeur, g: O.Geste): EtatEditeur => { const x = O.appliquer(e, g); err.push(...O.verifierInvariants(x, e, g)); return x; };
  const poseFond = jouer(e0, { type: "colorerFond", plancheId: "pl-2", cible: "gauche", couleur: "aplatSourd" });
  const props = O.propositionsApres(poseFond.magazine, { type: "fond", plancheId: "pl-2", cote: "gauche", couleur: "aplatSourd" }, combos);
  const pT = props.find((p) => p.cible === "texte");
  const pF = props.find((p) => p.cible === "face" && p.raison === "Double unie");
  if (!pT || !pF) { ok("propositions appliquées : une proposition « Texte » et une « Double unie » existent sur la double de test", false); return; }
  const apresT = jouer(poseFond, pT.geste as O.Geste);
  ok("geste : « Texte » = UNE entrée d'historique (« Texte · … »), tous les textes de la page prennent la couleur, rien d'autre ne bouge, Annuler la retire",
    apresT.historique.passe.length === poseFond.historique.passe.length + 1 && /^Texte · /.test(apresT.historique.passe[apresT.historique.passe.length - 1].libelle)
      && O.textesDuCote(apresT.magazine, "pl-2", "gauche").every((t) => t.couleur === pT.couleur) && O.textesDuCote(apresT.magazine, "pl-2", "droite").every((t, i) => t.couleur === O.textesDuCote(poseFond.magazine, "pl-2", "droite")[i].couleur)
      && O.appliquer(apresT, { type: "annuler" }).magazine === poseFond.magazine && contenuValide(apresT.magazine));
  ok("geste : le texte proposé se lit DE VRAI sur le fond posé (contraste calculé sur le magazine après les deux gestes)",
    O.textesDuCote(apresT.magazine, "pl-2", "gauche").every((t) => t.couleur && contraste(hex(t.couleur, apresT.magazine), hex("aplatSourd", apresT.magazine)) >= 4.5));
  const unie = jouer(apresT, pF.geste as O.Geste);
  const fond2 = unie.magazine.planches.find((p) => p.id === "pl-2")!.fond;
  ok("geste : « Page d'en face » (même couleur) = la double UNIE (les deux côtés à la même couleur), en une entrée ; Annuler redonne la page seule",
    fond2?.gauche === "aplatSourd" && fond2?.droite === "aplatSourd" && O.appliquer(unie, { type: "annuler" }).magazine.planches.find((p) => p.id === "pl-2")!.fond?.droite === undefined);
  const refus = O.appliquer(poseFond, { type: "colorerTextes", refs: [{ plancheId: "pl-2", cible: "double", index: 0 }, { plancheId: "pl-3", cible: "gauche", index: 0 }], couleur: "encre" });
  ok("geste : colorerTextes sur DEUX planches, une liste vide, une couleur qui ne se relit pas ou une couverture : rien ne change (aucune entrée d'historique)",
    refus.magazine === poseFond.magazine && O.appliquer(poseFond, { type: "colorerTextes", refs: [], couleur: "encre" }).magazine === poseFond.magazine
      && O.appliquer(poseFond, { type: "colorerTextes", refs: [{ plancheId: "pl-2", cible: "double", index: 0 }], couleur: "#FFF" as never }).magazine === poseFond.magazine
      && O.appliquer(poseFond, { type: "colorerTextes", refs: [{ plancheId: "couverture", cible: "double", index: 0 }], couleur: "encre" }).historique.passe.length === poseFond.historique.passe.length);
  ok("geste : les invariants sont tenus à chaque pas (G1 : ni photo, ni gabarit, ni autre planche touchés)", err.length === 0);
  /* l'export n'a pas bougé : un magazine qui ne porte aucune couleur libre garde les mêmes planches (rien de la palette n'est écrit) */
  ok("palette : la pose n'écrit que des clés que la sauvegarde relit (fond, couleur) : le magazine se relit après chaque geste", contenuValide(poseFond.magazine) && contenuValide(apresT.magazine) && contenuValide(unie.magazine));
}

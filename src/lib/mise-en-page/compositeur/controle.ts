/**
 * LE CONTRÔLE (C20, 18/11/2026) : portage de `mesurer.ts` du banc (passe 10), sur ce que la pose rend, sans fichier ni rendu.
 * Fautes DURES (la proposition les dit à l'atelier, le harnais exige zéro sur ses jeux) : page vide ou sous le seuil d'occupation sans
 * fond ni texte (M-07), photo de personnes en vignette (M-08), visage coupé ou caché, zone importante coupée de moitié, personne ou
 * corps au pli (DA-3), photo posée deux fois, photo de couverture aussi à l'intérieur (M-10), définition sous 150 dpi, 21:9 mal posée
 * (S-098), texte qui n'est pas un fait (D30), texte sans place, légende dans une photo (DA-8), cadre vide, pages pas multiple de 4,
 * trou blanc (DA-5), gabarit répété (DA-7). SIGNAUX : le reste (150 à 200 dpi, zone entamée, page maigre habillée, parts du profil).
 * Écart assumé au banc : DA-10 (« l'accent n'apparaît nulle part ») devient un signal (un magazine sans palette lue n'a pas d'aplat pris
 * dans une photo : ce n'est pas une faute de pose). Module pur.
 */

import type { Magazine } from "../magazine";
import { REGLAGES_POSE } from "./reglagesCompositeur";
import { trouEnveloppe, type PlancheTrame, type Resultat, type Trame } from "./pose";
import type { Controle, Faute } from "./types";

const TEXTES_PAR_DEFAUT = /^(Titre|Texte|Légende)$/;
/** v2.1 (M-07) : sous 30 % de page imprimée, une page sans texte écrit est presque vide, même colorée. */
export const PAGE_PRESQUE_VIDE = 0.3;
/** v2.1 (M-29) : le CŒUR de la zone importante (sans son air) entamé de plus de 10 % : le sujet est coupé. */
export const ZONE_AIR_PERDUE_MAX = 0.1;
/** N-57 : une photo dont tout le cadre compte ne perd jamais plus de 10 % de sa LARGEUR (elle se rogne en hauteur). */
export const TOUT_LE_CADRE_LARGEUR_PERDUE = 0.1;

export function controler(trame: Trame & { faits: string[] }, pose: Resultat, magazine: Magazine): Controle {
  const fautes: Faute[] = [];
  const signaux: Faute[] = [];
  const dur = (faute: string, ou: string, detail: string, regle: string) => fautes.push({ faute, ou, detail, regle });
  const signal = (faute: string, ou: string, detail: string, regle: string) => signaux.push({ faute, ou, detail, regle });
  const faits = new Set(trame.faits);
  const nom = (id: string) => trame.photos[id]?.fichier ?? id;
  const nPlanches = magazine.planches.length;
  const pages = 2 * (nPlanches - 1);
  if (pages % 4 !== 0) dur("pages pas multiple de 4", "magazine", `${pages} pages`, "D-TAI-01");
  const pt = new Map<number, PlancheTrame>(trame.planches.map((p) => [p.n, p]));
  const idee = (n: number) => pt.get(n)?.idee;

  /* M-07 : une page est « habillée » si elle porte un fond (couleur) ou un texte écrit */
  const habillee = (i: number, cote: "gauche" | "droite"): boolean => {
    const pl = magazine.planches[i];
    if (!pl) return false;
    if (pl.fond?.[cote]) return true;
    const d = pl.mode === "double" ? pl.double : pl[cote];
    return (d?.textes ?? []).some((t) => t.contenu && t.contenu.trim() && !TEXTES_PAR_DEFAUT.test(t.contenu));
  };
  const texteEcrit = (i: number, cote: "gauche" | "droite"): boolean => {
    const pl = magazine.planches[i];
    const d = pl?.mode === "double" ? pl.double : pl?.[cote];
    return (d?.textes ?? []).some((t) => t.contenu && t.contenu.trim() && !TEXTES_PAR_DEFAUT.test(t.contenu));
  };
  const vues = new Map<string, string[]>();
  pose.planches.forEach((p, i) => {
    const ou = i === 0 ? "page 1" : i === pose.planches.length - 1 ? "dernière page" : `double ${i}`;
    for (const x of p.parties) {
      for (const b of x.photos) {
        vues.set(b.id, [...(vues.get(b.id) ?? []), ou]);
        if (b.dpi < 150) dur("photo sous 150 dpi", ou, `${nom(b.id)} à ${b.dpi} dpi`, "P2-04");
        else if (b.dpi < 200) signal("photo entre 150 et 200 dpi", ou, `${nom(b.id)} à ${b.dpi} dpi`, "P2-04");
        if (b.visages_coupes + b.visages_hors > 0) dur("visage coupé", ou, `${nom(b.id)} : ${b.visages_coupes} coupé(s), ${b.visages_hors} hors cadre`, "P3-00");
        if (b.visages_pli > 0) dur("visage dans le pli", ou, nom(b.id), "P-15");
        if (b.corps_pli > 0) dur("personne sur le pli", ou, nom(b.id), "DA-3");
        if ((trame.photos[b.id]?.personnes ?? 0) >= 1 && (Math.min(b.cadre.l, b.cadre.h) < REGLAGES_POSE.PERSONNES_COTE_MIN || b.cadre.l * b.cadre.h < REGLAGES_POSE.PERSONNES_AIRE_MIN))
          dur("photo de personnes trop petite", ou, `${nom(b.id)} dans ${Math.round(b.cadre.l)} × ${Math.round(b.cadre.h)} mm`, "M-08");
        if (b.visages_sous_texte + b.visages_sous_photo > 0) dur("visage caché", ou, `${nom(b.id)} sous un texte ou une photo`, "P-16");
        if (b.zone_perdue > 0.5) dur("zone importante coupée", ou, `${nom(b.id)} perd ${Math.round(b.zone_perdue * 100)} % de sa zone importante`, "P-14");
        else if (trame.recadrage && b.zone_perdue > ZONE_AIR_PERDUE_MAX) dur("sujet entamé par le recadrage", ou, `${nom(b.id)} perd ${Math.round(b.zone_perdue * 100)} % de sa zone importante (cœur de la zone)`, "M-29");
        if (trame.recadrage?.toutLeCadre.includes(b.id) && b.coupe.gauche + b.coupe.droite > TOUT_LE_CADRE_LARGEUR_PERDUE + 1e-6) dur("photo où tout le cadre compte, rognée en largeur", ou, `${nom(b.id)} perd ${Math.round((b.coupe.gauche + b.coupe.droite) * 100)} % de sa largeur`, "N-57");
        else if (b.zone_perdue > 0.25) signal("zone importante entamée", ou, `${nom(b.id)} perd ${Math.round(b.zone_perdue * 100)} %`, "P-14");
        const ph = trame.photos[b.id];
        if (!trame.recadrage && ph && ph.l / ph.h >= 1.9 && (b.cadre.l / b.cadre.h < 1.19 || b.coupe.part > 0.45)) dur("21:9 mal posée", ou, `${nom(b.id)} coupée de ${Math.round(b.coupe.part * 100)} %`, "S-098");
      }
      const textesT = [...(pt.get(p.n)?.textes ?? []), ...(pt.get(p.n)?.gauche?.textes ?? []), ...(pt.get(p.n)?.droite?.textes ?? [])];
      for (const t of x.textes) {
        const facultatif = textesT.some((y) => y.contenu === t.contenu && y.facultatif);
        if (t.place === "sans-cadre") (facultatif ? signal : dur)("texte sans place", ou, `« ${t.contenu} »`, "DA-8");
        if (String(t.role).startsWith("legende") && t.place === "ajoute-sur-photo") dur("légende posée dans une photo", ou, `« ${t.contenu} »`, "DA-8");
        if (t.contenu && !faits.has(t.contenu)) dur("texte qui n'est pas un fait", ou, `« ${t.contenu} »`, "D30");
      }
      const pageDeTitre = ["ouverture", "itineraire"].includes(String(idee(p.n)));
      for (const pi of x.pages_imprimees ?? []) {
        if (pageDeTitre) continue;
        const cote = pi.page as "gauche" | "droite";
        if (pi.part < REGLAGES_POSE.OCCUPATION_MIN && !habillee(i, cote)) dur("page presque vide", ou, `${cote} imprimée à ${Math.round(pi.part * 100)} %`, "M-07");
        /* v2.1 (M-07 redevenue DURE) : une couleur ne sauve pas une page presque vide ; seul un texte écrit la tient */
        else if (trame.recadrage && pi.part < PAGE_PRESQUE_VIDE && !texteEcrit(i, cote)) dur("page presque vide, même colorée", ou, `${cote} imprimée à ${Math.round(pi.part * 100)} %`, "M-07");
        else if (pi.part < REGLAGES_POSE.OCCUPATION_MIN) signal("page maigre, habillée", ou, `${cote} à ${Math.round(pi.part * 100)} %`, "M-07");
      }
    }
    /* DA-5 : pas de trou blanc dans le bloc de photos d'une page */
    if (i > 0 && i < pose.planches.length - 1 && !["ouverture", "itineraire"].includes(String(idee(p.n))) && !pt.get(p.n)?.respiration) {
      const rects = p.parties.flatMap((x) => x.photos.map((b) => b.cadre));
      for (const [pg, x0] of [["gauche", 0], ["droite", 210]] as const) {
        const t = trouEnveloppe(rects, { x: x0, y: 0, l: 210, h: 297 });
        if (t && t.h >= REGLAGES_POSE.TROU_H && t.l >= REGLAGES_POSE.TROU_L) dur("trou blanc dans le bloc de photos", ou, `page ${pg} : ${Math.round(t.l * 100)} × ${Math.round(t.h * 100)} %`, "DA-5");
      }
    }
  });
  for (const [id, ous] of vues) if (ous.length > 1) dur("photo posée deux fois", ous.join(", "), nom(id), "DA-6");

  /* le magazine lui-même : cadres vides, pages vides, textes, répétition, couverture */
  magazine.planches.forEach((p, i) => {
    const ou = i === 0 ? "page 1" : i === nPlanches - 1 ? "dernière page" : `double ${i}`;
    for (const d of [p.double, p.gauche, p.droite]) {
      if (!d) continue;
      for (const a of d.photos) if (!a.photoId) dur("cadre vide", ou, d.templateId, "P-19");
      for (const t of d.textes) if (t.contenu && t.contenu.trim() && !faits.has(t.contenu.trim()) && !TEXTES_PAR_DEFAUT.test(t.contenu)) dur("texte qui n'est pas un fait", ou, `« ${t.contenu} »`, "D30");
    }
    if (i > 0 && i < nPlanches - 1 && !p.double && !p.gauche && !p.droite) dur("page vide", ou, "planche sans disposition", "M-07");
  });
  const sig = magazine.planches.map((p) => (p.double ? p.double.templateId : `${p.gauche?.templateId ?? "-"}|${p.droite?.templateId ?? "-"}`));
  for (let i = 1; i < sig.length; i++) {
    if (sig[i] === sig[i - 1] && idee(pose.planches[i]?.n ?? -1) !== "ouverture" && !/^-\|-$/.test(sig[i])) dur("deux doubles voisines identiques", `doubles ${i - 1} et ${i}`, sig[i], "DA-7");
  }
  if (magazine.couverture) {
    const dedans = new Set(vues.keys());
    for (const a of magazine.couverture.photos) if (a.photoId && dedans.has(a.photoId)) dur("photo de couverture aussi à l'intérieur", "couverture", nom(a.photoId), "M-10");
  }
  let accent = 0;
  for (const pl of magazine.planches) for (const d of [pl.double, pl.gauche, pl.droite]) for (const t of d?.textes ?? []) if (t.couleur === "accent" && t.contenu) accent++;
  if (!accent) signal("l'accent n'apparaît nulle part", "magazine", "", "DA-10");
  return { fautes, signaux };
}

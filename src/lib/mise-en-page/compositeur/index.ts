/**
 * LE COMPOSITEUR (C20, 18/11/2026) : des photos lues à un magazine PROPOSÉ, chargé dans l'éditeur par le chemin du premier jet.
 *
 *   fiche (les questions, qui priment) → profil, sobriété (M-06), chapitres (M-05, N-32)
 *   → sélection (S-001, M-09 : la réserve ne garde que les faibles) → trame (decider.py : ouvertures, sommet, recettes, couvertures, M-10)
 *   → pose (poser/pose.ts : gabarits et recadrages du moteur de l'éditeur) → contrôle (mesurer.ts : les fautes)
 *
 * Portage fidèle du banc du tunnel (`design-explorations/tunnel-2026-11-17/compositeur/`, passe 10). Règles GÉNÉRALES seulement (M-01) :
 * aucun nom de projet, aucun numéro de photo. Module pur : ni React, ni réseau, ni horloge (`quand` est passé par l'appelant).
 */

import { COULEURS_ORIGINE, proposerNuancier } from "../nuancier";
import { styleValide, type StyleMagazine } from "../style";
import { FORMAT_PREMIER_JET, VERSION_PREMIER_JET, lirePremierJet, type PremierJet } from "../editeur/premierJet";
import { controler } from "./controle";
import { PAIRE_DU_PROFIL, chapitrer, devinerFiche, ficheEffective, profilDe, sobreDe } from "./fiche";
import { Poseur } from "./pose";
import { charger, entonnoir } from "./selection";
import { construireTrame } from "./trame";
import type { Decision, EntreeCompo, EtatPhoto, PhotoChoisie, ResultatCompo } from "./types";

export * from "./types";
export { REGLAGES_COMPO, REGLAGES_POSE, REGLES_COMPO, REGLES_POSE } from "./reglagesCompositeur";
export { AMBIANCES_FICHE, PROFILS, THEMES } from "./types";
export { LIEUX_MAX, MOT_AMBIANCE, MOT_THEME, TAILLES_PROPOSEES, devinerFiche, ficheEffective, lieuxDeTexte, lireFiche, profilDe, sobreDe } from "./fiche";
export { teinteDe } from "./trame";
export { bandeCalme, entreeDepuisEditeur, type DonneesEditeur } from "./depuisEditeur";

/** Les identifiants de règle qu'une phrase de pose cite (P-…, M-…, S-…, DA-…, N-…, D…). */
const REGLE = /\b(P\d?-\d+(?: bis| ter)?|M-\d+|S-\d+|DA-\d+|N-\d+|D\d+|C-\d+)\b/g;
const reglesDe = (s: string, defaut: string): string[] => { const m = s.match(REGLE); return m && m.length ? [...new Set(m)] : [defaut]; };

/** Le style proposé quand l'atelier n'en impose pas : la paire du profil, le nuancier tiré des couleurs réelles des photos (R-C-01). */
function styleDe(e: EntreeCompo, paire: string): StyleMagazine | null {
  if (e.style !== undefined) return e.style;
  const n = proposerNuancier(e.photos.map((p) => p.palette).filter((p) => p.length));
  const s: StyleMagazine = { paire, couleurs: { ...(n?.couleurs ?? COULEURS_ORIGINE) } };
  return styleValide(s) ? s : null;
}

export function composer(e: EntreeCompo): ResultatCompo {
  const journal: Decision[] = [];
  const devinee = devinerFiche(e.photos, e.voyage);
  const fiche = ficheEffective(e.fiche, devinee);
  const profil = profilDe(fiche, e.voyage, e.photos);
  const sobre = sobreDe(fiche, profil, e.voyage);
  journal.push({ quoi: "fiche", ou: "profil", detail: `${profil}${fiche.theme ? `, thème ${fiche.theme}` : ""}${e.fiche.theme ? " (saisi)" : ""}`, regles: ["PROFILS"] });
  journal.push({ quoi: "fiche", ou: "sobriété", detail: sobre ? "sobre : aucun cadre tourné, aucun timbre" : "stylisée", regles: ["M-06"] });
  const chap = chapitrer(e.photos, fiche, e.voyage);
  /* les étapes saisies recoupent le temps : les lieux de l'IA (numérotés sur les chapitres du voyage) ne valent plus */
  const lieux = chap.fiche.size ? null : e.lieux;
  const P = charger(e, lieux, chap.chapitreDe);
  const { cand } = entonnoir(P, e.piles, journal);
  const style = styleDe(e, PAIRE_DU_PROFIL[profil]);
  const parLieux = fiche.theme === "road_trip" || (!fiche.theme && e.voyage?.type === "road_trip");
  const motTitre = (e.voyage?.pays ?? "").trim() || e.titre.trim();
  const t = construireTrame({
    P, cand, chapNom: chap.nom, chapFiche: chap.fiche, parLieux, lieux: lieux ? { chapitres: lieux.chapitres, ancre: lieux.ancre } : null,
    fiche, titre: e.titre.trim(), motTitre, profil, sobre, style, couverture: e.couverture ?? null,
  }, journal);

  const pose = new Poseur(t.trame, e.luminances, e.quand).poser();
  const jet: PremierJet = {
    format: FORMAT_PREMIER_JET, version: VERSION_PREMIER_JET, magazine: pose.magazine, photos: pose.photosTable,
    ...(Object.keys(pose.raisons).length ? { raisons: pose.raisons } : {}),
  };
  const relu = lirePremierJet(JSON.stringify(jet));
  if (!relu.ok) throw new Error(`premier jet refusé par l'éditeur : ${relu.phrase}`);
  const controle = controler(t.trame, pose, pose.magazine);
  if (!pose.magazine.couverture && t.propositions.length) controle.signaux.push({ faute: "couverture non posée", ou: "couverture", detail: "aucune proposition ne passe sans couper un visage", regle: "P3-03" });

  /* les décisions de la pose, chacune avec sa règle */
  for (const p of pose.planches) for (const x of p.parties) for (const ec of [...x.ecarts]) journal.push({ quoi: `planche ${p.n}`, ou: x.gabarit, detail: ec, regles: reglesDe(ec, "P-08") });
  for (const ec of pose.ecarts) journal.push({ quoi: "pose", ou: "magazine", detail: ec, regles: reglesDe(ec, "P-08") });
  for (const c of pose.couvertures) for (const ec of c.ecarts) journal.push({ quoi: "couverture", ou: c.gabarit ?? "", detail: ec, regles: reglesDe(ec, "P-19") });

  /* M-02 : posées, couverture, réserve, écartées, chacune avec sa raison */
  const dansMag = new Set(pose.magazine.planches.flatMap((p) => [p.double, p.gauche, p.droite]).flatMap((d) => d?.photos.map((a) => a.photoId) ?? []).filter((x): x is string => !!x));
  const enCouverture = new Set((pose.magazine.couverture?.photos ?? []).map((a) => a.photoId).filter((x): x is string => !!x));
  const photos: PhotoChoisie[] = [];
  for (const x of P.values()) {
    const base = { id: x.id, chapitre: x.chap, note: x.s };
    if (x.ecart) photos.push({ ...base, etat: "ecartee", raison: x.ecart[0], regles: x.ecart[1].split(/,\s*/) });
    else if (dansMag.has(x.id)) photos.push({ ...base, etat: "posee", raison: t.place.get(x.id) ?? "posée", regles: x.regles, place: t.place.get(x.id) });
    else if (enCouverture.has(x.id)) photos.push({ ...base, etat: "couverture", raison: "en couverture", regles: ["M-03", "M-04", "M-10"] });
    else {
      const r = x.reserve ?? (t.nommees.has(x.id) ? ["proposée en couverture, gardée hors de l'intérieur", "M-10"] : ["laissée par la composition : aucune double ne la tenait", "P-02"]);
      photos.push({ ...base, etat: "reserve", raison: r[0], regles: r[1].split(/,\s*/) });
    }
  }
  const compte: Record<EtatPhoto, number> = { posee: 0, couverture: 0, reserve: 0, ecartee: 0 };
  for (const p of photos) compte[p.etat]++;
  const premiere = t.propositions[0];
  return {
    jet, pages: 2 * (pose.magazine.planches.length - 1), taille: fiche.taille ?? "tout", profil, sobre, chapitres: t.chapitres,
    decisions: journal, selection: { photos, compte }, controle,
    couverture: pose.magazine.couverture && premiere ? { premiere: premiere.premiere, quatrieme: premiere.quatrieme ?? [] } : null,
  };
}

/** Les fautes dures et leur nombre, pour un bandeau. */
export const nombreDeFautes = (r: ResultatCompo): number => r.controle.fautes.length;

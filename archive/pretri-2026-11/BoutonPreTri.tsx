"use client";

/* Le bouton « Pré-trier · N » tel qu'il était dans `src/app/admin/atelier/mise-en-page/[id]/TriBulles.tsx` au 16/11/2026
   (main db5285a4), avant son retrait (T-210). Il était posé par `Panneau.tsx` à côté de la jauge du tri :
   en grand écran `<PaletteTri /><BoutonPreTri /><JaugeTri />`, dans la barre `<PaletteTri /><BoutonPreTri />` sous la jauge.
   Sa feuille : `.mep-editeur .ed-pretri { flex: 0 0 auto; font-variant-numeric: tabular-nums; }` et
   `.mep-editeur .ed-ph--grand .ed-ph-tete .ed-pretri { margin-right: 10px; }` (mise-en-page.css). */

import { marquesProposees, preTrier } from "./pretri";
import { useEd } from "./contexte";

/** Lot 3 (A10) : un geste pose les marques que la machine propose, sur les photos encore sans marque. Annulable. */
export function BoutonPreTri() {
  const { etat, envoyer, lectureSeule } = useEd();
  if (lectureSeule || !etat.lecture.mesurees) return null;
  const pt = preTrier(etat.catalogue, etat.magazine, etat.lecture);
  const pm = marquesProposees(pt);
  const n = pm.choisie.length + pm.reserve.length + pm.ecartee.length;
  const detail = [pm.choisie.length ? `${pm.choisie.length} à garder` : "", pm.reserve.length ? `${pm.reserve.length} en réserve` : "", pm.ecartee.length ? `${pm.ecartee.length} à écarter` : ""].filter(Boolean).join(" · ");
  const titre = n ? `${detail}${pt.objectif ? "" : " · fixe l'objectif pour que la machine propose aussi quoi garder"}` : "Rien à proposer";
  return <button type="button" className="ed-bt ed-pretri" disabled={!n} title={titre} onClick={(e) => { e.stopPropagation(); envoyer({ type: "preTrier" }); }}>Pré-trier{n ? ` · ${n}` : ""}</button>;
}


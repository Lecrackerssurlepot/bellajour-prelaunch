"use client";

import { useEffect, useRef } from "react";
import { TAILLE_MAX_LECTURE_IA, appliquerPremierJet, estLectureIA, lireLectureIA, lirePremierJet, relierLectureIA, type EtatEditeur } from "@/lib/mise-en-page/editeur";
import { useEd } from "./contexte";
import { garderLectureIA } from "./lectureIAClient";

/* Lot E (13/11) : « Premier jet ». En création libre, après l'import des photos, un fichier JSON de magazine composé hors de l'éditeur
   (une démo de composition automatique, format dans docs/moteur/PREMIER-JET.md) se charge en un geste : les photos se relient par leur
   NOM DE FICHIER, tout reste modifiable, et Annuler le défait d'un coup. Le bandeau (Barre.tsx) dit ce qui n'a pas trouvé sa photo.
   Lot F (14/11) : le MÊME bouton accepte la LECTURE IA (docs/moteur/LECTURE-IA.md), reconnue à son champ « format », et les deux
   fichiers ensemble. La lecture n'est pas un geste du magazine : elle va dans l'état d'écran et dans ce navigateur, avec le projet. */

export function BoutonPremierJet() {
  const { etat, envoyer, majUi, lectureSeule: ro, cleProjet } = useEd();
  const choix = useRef<HTMLInputElement>(null);
  const etatRef = useRef<EtatEditeur>(etat);
  useEffect(() => { etatRef.current = etat; });
  const sansPhoto = etat.catalogue.size === 0;
  const refuser = (fichier: string, phrase: string, lecture: boolean) => majUi(lecture ? { lectureIA: { type: "refuse", fichier, phrase } } : { premierJet: { type: "refuse", fichier, phrase } });

  const lire = async (f: File) => {
    if (f.size > TAILLE_MAX_LECTURE_IA) { refuser(f.name, "Ce fichier est trop gros.", false); return; }
    let texte: string;
    try { texte = await f.text(); } catch { refuser(f.name, "Ce fichier n'a pas pu être lu.", false); return; }
    let brut: unknown = null;
    try { brut = JSON.parse(texte) as unknown; } catch { /* le lecteur du premier jet dira la phrase */ }
    if (estLectureIA(brut)) {
      const l = lireLectureIA(brut);
      if (!l.ok) { refuser(f.name, l.phrase, true); return; }
      envoyer({ type: "poserLectureIA", lecture: l.lecture });
      if (cleProjet) void garderLectureIA(cleProjet, l.lecture);
      const r = relierLectureIA(l.lecture, etatRef.current.catalogue);
      majUi({ lectureIA: { type: "ok", fichier: f.name, reliees: r.reliees, total: r.total, manquantes: r.manquantes, ambigues: [] } });
      return;
    }
    const r = lirePremierJet(texte);
    if (!r.ok) { refuser(f.name, r.phrase, false); return; }
    const e = etatRef.current;
    const b = appliquerPremierJet(r.jet, e.magazine, e.catalogue);
    if (b.refus) { refuser(f.name, b.refus, false); return; }
    envoyer({ type: "chargerPremierJet", jet: r.jet });
    majUi({ premierJet: { type: "ok", fichier: f.name, reliees: b.reliees, total: b.total, manquantes: b.manquantes.map((x) => x.nom), ambigues: b.ambigues } });
  };

  return (
    <>
      <input ref={choix} type="file" accept=".json,application/json" multiple hidden
        onChange={(e) => { const l = Array.from(e.currentTarget.files ?? []); e.currentTarget.value = ""; void (async () => { for (const f of l) await lire(f); })(); }} />
      <button type="button" className="ed-bt" disabled={ro || sansPhoto}
        title={sansPhoto ? "Importez d'abord vos photos : le premier jet et la lecture s'y relient par leur nom de fichier" : "Premier jet ou lecture IA (un fichier JSON, ou les deux). Les photos se relient par leur nom de fichier."}
        onClick={() => choix.current?.click()}>
        Premier jet
      </button>
    </>
  );
}

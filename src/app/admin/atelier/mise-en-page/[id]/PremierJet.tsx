"use client";

import { useEffect, useRef } from "react";
import { TAILLE_MAX_PREMIER_JET, appliquerPremierJet, lirePremierJet, type EtatEditeur } from "@/lib/mise-en-page/editeur";
import { useEd } from "./contexte";

/* Lot E (13/11) : « Premier jet ». En création libre, après l'import des photos, un fichier JSON de magazine composé hors de l'éditeur
   (une démo de composition automatique, format dans docs/moteur/PREMIER-JET.md) se charge en un geste : les photos se relient par leur
   NOM DE FICHIER, tout reste modifiable, et Annuler le défait d'un coup. Le bandeau (Barre.tsx) dit ce qui n'a pas trouvé sa photo. */

export function BoutonPremierJet() {
  const { etat, envoyer, majUi, lectureSeule: ro } = useEd();
  const choix = useRef<HTMLInputElement>(null);
  const etatRef = useRef<EtatEditeur>(etat);
  useEffect(() => { etatRef.current = etat; });
  const sansPhoto = etat.catalogue.size === 0;
  const refuser = (fichier: string, phrase: string) => majUi({ premierJet: { type: "refuse", fichier, phrase } });

  const lire = async (f: File) => {
    if (f.size > TAILLE_MAX_PREMIER_JET) { refuser(f.name, "Ce fichier est trop gros pour un premier jet."); return; }
    let texte: string;
    try { texte = await f.text(); } catch { refuser(f.name, "Ce fichier n'a pas pu être lu."); return; }
    const r = lirePremierJet(texte);
    if (!r.ok) { refuser(f.name, r.phrase); return; }
    const e = etatRef.current;
    const b = appliquerPremierJet(r.jet, e.magazine, e.catalogue);
    if (b.refus) { refuser(f.name, b.refus); return; }
    envoyer({ type: "chargerPremierJet", jet: r.jet });
    majUi({ premierJet: { type: "ok", fichier: f.name, reliees: b.reliees, total: b.total, manquantes: b.manquantes.map((x) => x.nom), ambigues: b.ambigues } });
  };

  return (
    <>
      <input ref={choix} type="file" accept=".json,application/json" hidden
        onChange={(e) => { const f = e.currentTarget.files?.[0]; e.currentTarget.value = ""; if (f) void lire(f); }} />
      <button type="button" className="ed-bt" disabled={ro || sansPhoto}
        title={sansPhoto ? "Importez d'abord vos photos : le premier jet s'y relie par leur nom de fichier" : "Charger un premier jet : un fichier JSON de magazine composé hors de l'éditeur. Les photos se relient par leur nom de fichier ; Annuler le défait."}
        onClick={() => choix.current?.click()}>
        Premier jet
      </button>
    </>
  );
}

"use client";

/* « Demander une modification » : un motif, quelques mots, et la demande
   part à l'atelier comme un message (il la lit dans sa messagerie). */

import Link from "next/link";
import { useState } from "react";
import { MOTIFS_MODIFICATION, type MotifModification } from "@/lib/collectif/livraison";

export default function DemandeModification({ token, tu, lienDossier }: { token: string; tu: boolean; lienDossier: string }) {
  const v = (vous: string, toi: string) => (tu ? toi : vous);
  const [motif, setMotif] = useState<MotifModification | null>(null);
  const [texte, setTexte] = useState("");
  const [etat, setEtat] = useState<{ occupe: boolean; envoyee: boolean; erreur: string | null }>({ occupe: false, envoyee: false, erreur: null });

  async function envoyer() {
    setEtat({ occupe: true, envoyee: false, erreur: null });
    try {
      const rep = await fetch("/api/collectif/modification", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ token, motif, texte }),
      });
      const json = (await rep.json().catch(() => ({}))) as { message?: string };
      if (!rep.ok) return setEtat({ occupe: false, envoyee: false, erreur: json.message ?? `Non envoyée (erreur ${rep.status}).` });
      setEtat({ occupe: false, envoyee: true, erreur: null });
      setTexte("");
      setMotif(null);
    } catch {
      setEtat({ occupe: false, envoyee: false, erreur: "Le réseau n'a pas répondu. Rien n'est parti." });
    }
  }

  return (
    <div className="ec-demande">
      <div className="ec-puces" role="group" aria-label="Ce que vous voulez changer">
        {MOTIFS_MODIFICATION.map((m) => (
          <button key={m.cle} type="button" className="ec-onglet" aria-pressed={motif === m.cle} onClick={() => setMotif(m.cle)}>
            {m.libelle}
          </button>
        ))}
      </div>
      <label className="ec-curseur">
        {v("Précisez si vous le souhaitez", "Précise si tu le souhaites")}
        <textarea
          className="ec-champ ec-demande-texte"
          rows={4}
          value={texte}
          maxLength={2000}
          placeholder="Par exemple : ajouter les photos de la soirée de clôture"
          onChange={(e) => setTexte(e.target.value)}
        />
      </label>
      <div className="ec-actions">
        <button type="button" className="ec-bouton" disabled={!motif || etat.occupe} onClick={envoyer}>
          Envoyer la demande
        </button>
      </div>
      {etat.envoyee ? (
        <p className="ec-note" role="status">
          {v("Demande envoyée. L'atelier vous répond dans votre dossier.", "Demande envoyée. L'atelier te répond dans ton dossier.")}{" "}
          <Link className="ec-lien-texte" href={lienDossier} prefetch={false}>
            Voir la messagerie
          </Link>
        </p>
      ) : null}
      {etat.erreur ? (
        <p className="ec-note ec-note--erreur" role="alert">
          {etat.erreur}
        </p>
      ) : null}
    </div>
  );
}

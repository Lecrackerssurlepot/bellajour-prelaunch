"use client";

/* « Demander une modification », dans sa fenêtre (révision §14.5) : un motif,
   quelques mots, et la demande part à l'atelier comme un message (il la lit
   dans sa messagerie). Le message écrit revient à l'écran, qui l'ajoute au
   fil en carte sans attendre la relève. */

import { useState } from "react";
import { MOTIFS_MODIFICATION, type MotifModification } from "@/lib/collectif/livraison";
import type { Message } from "@/lib/collectif/messages";

export default function DemandeModification({ token, tu, onEnvoyee }: { token: string; tu: boolean; onEnvoyee: (m: Message | null) => void }) {
  const v = (vous: string, toi: string) => (tu ? toi : vous);
  const [motif, setMotif] = useState<MotifModification | null>(null);
  const [texte, setTexte] = useState("");
  const [etat, setEtat] = useState<{ occupe: boolean; erreur: string | null }>({ occupe: false, erreur: null });

  async function envoyer() {
    setEtat({ occupe: true, erreur: null });
    try {
      const rep = await fetch("/api/collectif/modification", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ token, motif, texte }),
      });
      const json = (await rep.json().catch(() => ({}))) as { message?: Message | string };
      if (!rep.ok) {
        return setEtat({ occupe: false, erreur: typeof json.message === "string" ? json.message : `Non envoyée (erreur ${rep.status}).` });
      }
      onEnvoyee(json.message && typeof json.message === "object" ? json.message : null);
    } catch {
      setEtat({ occupe: false, erreur: "Le réseau n'a pas répondu. Rien n'est parti." });
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
      <textarea
        className="ec-champ ec-zone-texte"
        rows={4}
        value={texte}
        maxLength={2000}
        aria-label={v("Précisez si vous le souhaitez", "Précise si tu le souhaites")}
        placeholder={v("Précisez si vous le souhaitez", "Précise si tu le souhaites")}
        onChange={(e) => setTexte(e.target.value)}
      />
      {etat.erreur ? (
        <p className="ec-note ec-note--erreur" role="alert">
          {etat.erreur}
        </p>
      ) : null}
      <button type="button" className="ec-bouton ec-bouton--plein" disabled={!motif || etat.occupe} onClick={envoyer}>
        {etat.occupe ? "Envoi…" : "Envoyer la demande"}
      </button>
    </div>
  );
}

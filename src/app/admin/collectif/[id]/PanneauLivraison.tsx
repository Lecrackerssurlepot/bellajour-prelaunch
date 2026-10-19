"use client";

/* La livraison, côté atelier : l'adresse et le jour prévu se règlent ici ;
   le transporteur et le numéro se posent par le geste « Marquer expédiée »
   (panneau des gestes), qui les passe par `suivi.ts`. Le client voit tout
   cela sur sa page Livraison. */

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { Livraison } from "@/lib/collectif/types";

export default function PanneauLivraison({ id, livraison, expedieeTexte, livreeTexte }: { id: string; livraison: Livraison; expedieeTexte: string; livreeTexte: string }) {
  const router = useRouter();
  const [adresse, setAdresse] = useState(livraison.adresse ?? "");
  const [prevue, setPrevue] = useState(livraison.prevue_le ?? "");
  const [message, setMessage] = useState<{ texte: string; ok: boolean } | null>(null);
  const [envoi, setEnvoi] = useState(false);

  async function enregistrer() {
    setEnvoi(true);
    setMessage(null);
    try {
      const rep = await fetch(`/api/admin/collectif/editions/${id}/livraison`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ adresse, prevue_le: prevue }),
      });
      const json = (await rep.json().catch(() => ({}))) as { message?: string };
      if (!rep.ok) return setMessage({ texte: json.message ?? `Refusé (erreur ${rep.status}).`, ok: false });
      setMessage({ texte: "Livraison enregistrée.", ok: true });
      router.refresh();
    } catch {
      setMessage({ texte: "Le réseau n'a pas répondu.", ok: false });
    } finally {
      setEnvoi(false);
    }
  }

  return (
    <section className="eca-carte">
      <span className="eca-carte-tete">
        <h2 className="eca-carte-titre">Livraison</h2>
      </span>
      <label className="eca-champ">
        <span className="eca-champ-label">Adresse de livraison</span>
        <textarea className="eca-textarea" rows={4} value={adresse} onChange={(e) => setAdresse(e.target.value)} placeholder={"Nom, société\nAdresse\nCode postal, ville"} />
      </label>
      <label className="eca-champ">
        <span className="eca-champ-label">Livraison prévue le</span>
        <input type="date" className="eca-input" value={prevue} onChange={(e) => setPrevue(e.target.value)} />
        <span className="eca-champ-aide">Facultatif : le client ne voit une date que si l&apos;atelier la pose.</span>
      </label>
      <div className="eca-barre">
        <button type="button" className="adm-btn adm-btn--ghost" disabled={envoi} onClick={enregistrer}>
          Enregistrer
        </button>
      </div>
      {livraison.transporteur ? (
        <p className="eca-sous">
          Expédiée {expedieeTexte ? `le ${expedieeTexte}` : ""} · {livraison.transporteur}
          {livraison.code ? ` · ${livraison.code}` : ""}
          {livraison.url ? (
            <>
              {" · "}
              <a href={livraison.url} target="_blank" rel="noopener noreferrer">
                suivi
              </a>
            </>
          ) : (
            " · pas de lien de suivi connu pour ce transporteur"
          )}
          {livreeTexte ? ` · livrée le ${livreeTexte}` : ""}
        </p>
      ) : (
        <p className="eca-champ-aide">Le transporteur et le numéro se posent avec le geste « Marquer expédiée ».</p>
      )}
      {message ? (
        <p className={`eca-message ${message.ok ? "eca-message--ok" : "eca-message--erreur"}`} role="status">
          {message.texte}
        </p>
      ) : null}
    </section>
  );
}

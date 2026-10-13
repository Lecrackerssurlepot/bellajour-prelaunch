"use client";

/* Les propositions complémentaires : le document vient de l'atelier (contenu
   et montant). « Accepter » se fait en deux gestes et ne paie rien : un
   message part à l'atelier, le journal le garde, le document le dit. */

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { DocumentDossier } from "../donnees";

export default function Propositions({ token, ecrire, propositions, tu }: { token: string; ecrire: boolean; propositions: DocumentDossier[]; tu: boolean }) {
  const router = useRouter();
  const v = (vous: string, toi: string) => (tu ? toi : vous);
  const [confirmer, setConfirmer] = useState<string | null>(null);
  const [occupe, setOccupe] = useState(false);
  const [message, setMessage] = useState<{ id: string; texte: string; erreur: boolean } | null>(null);
  /* Acceptée ici même : les boutons disparaissent sans attendre le
     rafraîchissement de la page (mesuré à 1,4 s), un second clic serait refusé. */
  const [accepteesIci, setAccepteesIci] = useState<string[]>([]);

  async function repondre(documentId: string, reponse: "accepter" | "reparler") {
    setOccupe(true);
    setMessage(null);
    try {
      const rep = await fetch("/api/collectif/proposition", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ token, documentId, reponse }),
      });
      const json = (await rep.json().catch(() => ({}))) as { message?: string };
      if (!rep.ok) {
        setMessage({ id: documentId, texte: json.message ?? `Non envoyé (erreur ${rep.status}).`, erreur: true });
        return;
      }
      setMessage({
        id: documentId,
        texte: reponse === "accepter" ? "Proposition acceptée. L'atelier est prévenu." : v("Message envoyé : l'atelier vous recontacte.", "Message envoyé : l'atelier te recontacte."),
        erreur: false,
      });
      setConfirmer(null);
      if (reponse === "accepter") setAccepteesIci((l) => [...l, documentId]);
      router.refresh();
    } catch {
      setMessage({ id: documentId, texte: "Le réseau n'a pas répondu. Rien n'est parti.", erreur: true });
    } finally {
      setOccupe(false);
    }
  }

  return (
    <ul className="ec-propositions">
      {propositions.map((d) => {
        const acceptee = Boolean(d.statut?.startsWith("Acceptée")) || accepteesIci.includes(d.id);
        return (
          <li key={d.id} className="ec-proposition">
            <div>
              <strong>{d.libelle}</strong>
              <p className="ec-note">{d.statut ?? (acceptee ? "Acceptée à l'instant" : null) ?? v("Proposée par l'atelier : à lire, puis à accepter ou à rediscuter.", "Proposée par l'atelier : à lire, puis à accepter ou à rediscuter.")}</p>
              {d.url ? (
                <a className="ec-lien-texte" href={d.url} rel="noopener noreferrer">
                  Lire la proposition
                </a>
              ) : null}
            </div>
            {ecrire && !acceptee ? (
              confirmer === d.id ? (
                <div className="ec-confirmer">
                  <p className="ec-texte">
                    {v(
                      "Accepter cette proposition ? L'atelier en est prévenu et l'ajoute à votre édition. Rien n'est payé sur cette page.",
                      "Accepter cette proposition ? L'atelier en est prévenu et l'ajoute à ton édition. Rien n'est payé sur cette page."
                    )}
                  </p>
                  <div className="ec-actions">
                    <button type="button" className="ec-bouton" disabled={occupe} onClick={() => repondre(d.id, "accepter")}>
                      Oui, j&apos;accepte
                    </button>
                    <button type="button" className="ec-bouton ec-bouton--clair" onClick={() => setConfirmer(null)}>
                      Annuler
                    </button>
                  </div>
                </div>
              ) : (
                <div className="ec-actions">
                  <button type="button" className="ec-bouton ec-bouton--clair" disabled={occupe} onClick={() => repondre(d.id, "reparler")}>
                    En reparler
                  </button>
                  <button type="button" className="ec-bouton" disabled={occupe} onClick={() => setConfirmer(d.id)}>
                    Accepter la proposition
                  </button>
                </div>
              )
            ) : null}
            {message?.id === d.id ? (
              <p className={message.erreur ? "ec-note ec-note--erreur" : "ec-note"} role={message.erreur ? "alert" : "status"}>
                {message.texte}
              </p>
            ) : null}
          </li>
        );
      })}
    </ul>
  );
}

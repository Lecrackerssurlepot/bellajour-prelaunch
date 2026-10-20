"use client";

/* Une proposition complémentaire, en carte DANS le fil (révision §14.5) : le
   document vient de l'atelier (contenu et montant), « Ouvrir » le lit.
   « Accepter » se fait en deux gestes et ne paie rien : un message part à
   l'atelier, le journal le garde, le document le dit.
   D26 (20/10, décision de Mathias) : accepter n'ENGAGE pas, c'est le devis
   signé qui engage ; la carte le dit avant, pendant et après (`phrasesProposition`). */

import { useRouter } from "next/navigation";
import { useState } from "react";
import { formaterHeureParis } from "@/lib/collectif/dates";
import { phrasesProposition, PREFIXE_ACCEPTEE } from "@/lib/collectif/livraison";
import type { Message } from "@/lib/collectif/messages";
import { useVisionneuse } from "../../_composants/Visionneuse";
import type { DocumentDossier } from "../donnees";

export default function CarteProposition({
  token,
  d,
  ecrire,
  tu,
  onMessage,
}: {
  token: string;
  d: DocumentDossier;
  ecrire: boolean;
  tu: boolean;
  /** Le message écrit par la réponse : il entre au fil sans attendre la relève. */
  onMessage: (m: Message) => void;
}) {
  const router = useRouter();
  const v = (vous: string, toi: string) => (tu ? toi : vous);
  const [confirmer, setConfirmer] = useState(false);
  const vision = useVisionneuse();
  const [occupe, setOccupe] = useState(false);
  const [message, setMessage] = useState<{ texte: string; erreur: boolean } | null>(null);
  /* Acceptée ici même : les boutons disparaissent sans attendre le
     rafraîchissement de la page (mesuré à 1,4 s), un second clic serait refusé. */
  const [accepteeIci, setAccepteeIci] = useState(false);
  const acceptee = Boolean(d.statut?.startsWith(PREFIXE_ACCEPTEE)) || accepteeIci;
  const phrases = phrasesProposition(tu);

  async function repondre(reponse: "accepter" | "reparler") {
    setOccupe(true);
    setMessage(null);
    try {
      const rep = await fetch("/api/collectif/proposition", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ token, documentId: d.id, reponse }),
      });
      const json = (await rep.json().catch(() => ({}))) as { message?: Message | string };
      if (!rep.ok) {
        setMessage({ texte: typeof json.message === "string" ? json.message : `Non envoyé (erreur ${rep.status}).`, erreur: true });
        return;
      }
      if (json.message && typeof json.message === "object") onMessage(json.message);
      setConfirmer(false);
      if (reponse === "accepter") {
        setAccepteeIci(true);
        router.refresh();
      } else {
        setMessage({ texte: v("Message envoyé : l'atelier vous recontacte.", "Message envoyé : l'atelier te recontacte."), erreur: false });
      }
    } catch {
      setMessage({ texte: "Le réseau n'a pas répondu. Rien n'est parti.", erreur: true });
    } finally {
      setOccupe(false);
    }
  }

  return (
    <div className="ec-parler-carte ec-parler-carte--proposition">
      <span className="ec-parler-etiquette ec-parler-accent">Proposition complémentaire</span>
      <strong>{d.libelle}</strong>
      <span className="ec-note">{d.statut ?? (acceptee ? "Acceptée à l'instant" : phrases.aLire)}</span>
      {acceptee ? <span className="ec-note">{phrases.apres}</span> : null}
      {confirmer ? (
        <div className="ec-confirmer">
          <p className="ec-texte">{phrases.confirmer}</p>
          <div className="ec-actions">
            <button type="button" className="ec-bouton ec-bouton--petit" disabled={occupe} onClick={() => repondre("accepter")}>
              Oui, j&apos;accepte
            </button>
            <button type="button" className="ec-bouton ec-bouton--clair ec-bouton--petit" onClick={() => setConfirmer(false)}>
              Annuler
            </button>
          </div>
        </div>
      ) : (
        <div className="ec-actions">
          {d.voir ? (
            <button type="button" className="ec-bouton ec-bouton--clair ec-bouton--petit" onClick={() => vision.ouvrir({ titre: d.libelle, sous: d.libelleType, voir: d.voir as string, telecharger: d.url })}>
              Ouvrir
            </button>
          ) : null}
          {vision.rendu}
          {ecrire && !acceptee ? (
            <>
              <button type="button" className="ec-bouton ec-bouton--petit" disabled={occupe} onClick={() => setConfirmer(true)}>
                Accepter
              </button>
              <button type="button" className="ec-bouton ec-bouton--clair ec-bouton--petit" disabled={occupe} onClick={() => repondre("reparler")}>
                En reparler
              </button>
            </>
          ) : null}
        </div>
      )}
      {message ? (
        <p className={message.erreur ? "ec-note ec-note--erreur" : "ec-note"} role={message.erreur ? "alert" : "status"}>
          {message.texte}
        </p>
      ) : null}
      <span className="ec-parler-qui">L&apos;atelier · {formaterHeureParis(d.quand)}</span>
    </div>
  );
}

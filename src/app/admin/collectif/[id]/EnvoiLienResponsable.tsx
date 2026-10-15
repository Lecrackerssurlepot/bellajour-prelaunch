"use client";

/* « Votre espace est prêt » : envoyer au responsable le lien de son espace
   (T-146). L'aperçu s'ouvre dans un onglet, tel qu'il partirait ; l'envoi se
   fait en deux temps (vérifier : à qui, quel objet ; puis confirmer). Tant que
   les mails des éditions sont fermés (`COLLECTIF_MAILS`), l'écran le dit et
   rien ne part. */

import { useState } from "react";

type Verif = { a: string; sujet: string; ouverts: boolean; interrupteur: string };

const PHRASE_ETAT: Record<string, string> = {
  envoye: "Mail parti. Le journal le note.",
  deja: "Ce lien a déjà été envoyé. « Renvoyer quand même » le renvoie.",
  coupe: "Rien n'est parti : les mails des éditions sont coupés.",
  echec: "Brevo a refusé le mail : rien n'est parti, on peut réessayer.",
};

export default function EnvoiLienResponsable({ id }: { id: string }) {
  const [verif, setVerif] = useState<Verif | null>(null);
  const [etat, setEtat] = useState<string | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);
  const [envoi, setEnvoi] = useState(false);

  async function appeler(corps: Record<string, unknown>) {
    setEnvoi(true);
    setErreur(null);
    try {
      const rep = await fetch(`/api/admin/collectif/editions/${id}/mail-espace`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(corps),
      });
      const json = (await rep.json().catch(() => ({}))) as Partial<Verif> & { etat?: string; message?: string };
      if (!rep.ok && !json.etat) {
        setErreur(json.message ?? `Refusé (erreur ${rep.status}). Rien n'est parti.`);
        return;
      }
      if (corps.verifier) setVerif(json as Verif);
      else {
        setEtat(json.etat ?? null);
        setVerif(null);
      }
    } catch {
      setErreur("Le réseau n'a pas répondu. Rien n'est parti.");
    } finally {
      setEnvoi(false);
    }
  }

  return (
    <section className="ate-carte">
      <h2 className="ate-carte-titre">Envoyer son lien au responsable</h2>
      <p className="eca-champ-aide">
        Le mail « Votre espace est prêt », avec le lien de son espace. Il ne part qu&apos;à l&apos;adresse du responsable.
      </p>
      <div className="eca-barre">
        <a className="ate-lien-discret" href={`/api/admin/collectif/editions/${id}/mail-espace`} target="_blank" rel="noopener noreferrer">
          Voir le mail
        </a>
        {verif ? null : (
          <button type="button" className="adm-btn adm-btn--ghost" disabled={envoi} onClick={() => appeler({ verifier: true })}>
            {envoi ? "Vérification…" : "Envoyer…"}
          </button>
        )}
      </div>
      {verif ? (
        <div className="eca-confirm">
          <p>
            À <strong>{verif.a}</strong>, objet « {verif.sujet} ».
          </p>
          {verif.ouverts ? null : (
            <p>
              <strong>Les mails des éditions sont coupés</strong> ({verif.interrupteur} n&apos;est pas ouvert) : rien ne partira.
            </p>
          )}
          <div className="eca-barre">
            <button type="button" className="adm-btn" disabled={envoi} onClick={() => appeler({})}>
              {envoi ? "Envoi…" : "Confirmer l'envoi"}
            </button>
            <button type="button" className="adm-btn adm-btn--ghost" onClick={() => setVerif(null)}>
              Annuler
            </button>
          </div>
        </div>
      ) : null}
      {etat ? (
        <p className={etat === "envoye" ? "eca-message" : "eca-message eca-message--erreur"} role="status">
          {PHRASE_ETAT[etat] ?? etat}
          {etat === "deja" ? (
            <>
              {" "}
              <button type="button" className="ate-lien-discret" disabled={envoi} onClick={() => appeler({ renvoyer: true })}>
                Renvoyer quand même
              </button>
            </>
          ) : null}
        </p>
      ) : null}
      {erreur ? (
        <p className="eca-message eca-message--erreur" role="alert">
          {erreur}
        </p>
      ) : null}
    </section>
  );
}

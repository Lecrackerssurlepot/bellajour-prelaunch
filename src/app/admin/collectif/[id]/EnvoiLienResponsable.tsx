"use client";

/* « Votre espace est prêt » : envoyer au responsable son lien, et où trouver
   dans l'espace ceux de l'équipe et des participants (T-146, T-187 ; retouche
   de Mathias du 20/10). L'aperçu s'ouvre dans un onglet, tel qu'il partirait ; l'envoi se
   fait en deux temps (vérifier : à qui, quel objet ; puis confirmer), par le
   même flux que l'écran « L'édition est créée » (`useEnvoiEspace`). Tant que
   les mails des éditions sont fermés (`COLLECTIF_MAILS`), l'écran le dit et
   rien ne part. */

import { PHRASE_ETAT, useEnvoiEspace } from "./useEnvoiEspace";

export default function EnvoiLienResponsable({ id }: { id: string }) {
  const { verif, etat, erreur, envoi, verifier, confirmer, renvoyer, annuler } = useEnvoiEspace(id);

  return (
    <section className="eca-carte">
      <span className="eca-carte-tete">
        <h2 className="eca-carte-titre">Envoyer son lien au responsable</h2>
      </span>
      <p className="eca-champ-aide">
        {"Le mail « Votre espace est prêt » : son lien, et où trouver dans l'espace ceux de l'équipe et des participants, pour les envoyer de là. Il ne part qu'à l'adresse du responsable."}
      </p>
      <div className="eca-barre">
        <a className="ate-lien-discret" href={`/api/admin/collectif/editions/${id}/mail-espace`} target="_blank" rel="noopener noreferrer">
          Voir le mail
        </a>
        {verif ? null : (
          <button type="button" className="adm-btn adm-btn--ghost" disabled={envoi} onClick={verifier}>
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
              <strong>Les mails des éditions sont coupés</strong> ({verif.interrupteur}{" "}n&apos;est pas ouvert) : rien ne partira.
            </p>
          )}
          <div className="eca-barre">
            <button type="button" className="adm-btn" disabled={envoi} onClick={confirmer}>
              {envoi ? "Envoi…" : "Confirmer l'envoi"}
            </button>
            <button type="button" className="adm-btn adm-btn--ghost" onClick={annuler}>
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
              <button type="button" className="ate-lien-discret" disabled={envoi} onClick={renvoyer}>
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

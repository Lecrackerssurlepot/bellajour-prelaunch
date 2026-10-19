"use client";

/* « L'édition est créée » (T-187, planche 6) : les trois liens en cartes, l'envoi
   au responsable en DEUX TEMPS (le flux de `useEnvoiEspace`, le même que l'onglet
   « Réglages et liens »), « Copier les trois liens », et l'aperçu du vrai mail.

   - Les adresses se MONTRENT abrégées (`lienAbrege`, « bellajour.fr/edition/kq3f… »,
     comme la planche) : le lien entier ne sort que par « Copier ».
   - Mails coupés (`COLLECTIF_MAILS` fermé, lu par le serveur) : le bouton le dit,
     il ne vérifie ni n'envoie rien, et « Copier les trois liens » devient le geste
     principal. Une édition archivée ne reçoit rien non plus (la route le refuse). */

import Link from "next/link";
import { useState } from "react";
import { lienAbrege, texteTroisLiens, type QuelLien } from "@/lib/collectif/liens";
import { PHRASE_ETAT, useEnvoiEspace } from "../../[id]/useEnvoiEspace";

type Props = {
  id: string;
  liens: Record<QuelLien, string>;
  /** Le prénom du responsable, ou null. */
  prenom: string | null;
  email: string;
  /** « 14 novembre », ou null sans clôture. */
  cloture: string | null;
  collecteOuverte: boolean;
  /** Les mails des éditions peuvent-ils partir (`mailsCollectifOuverts`) ? */
  ouverts: boolean;
  archivee: boolean;
  sujet: string;
};

export default function FinCreation(p: Props) {
  const envoi = useEnvoiEspace(p.id);
  const [copie, setCopie] = useState<"responsable" | "trois" | "echec" | null>(null);
  const [hauteur, setHauteur] = useState(640);

  async function copier(quoi: "responsable" | "trois") {
    try {
      await navigator.clipboard.writeText(quoi === "trois" ? texteTroisLiens(p.liens) : p.liens.responsable);
      setCopie(quoi);
      setTimeout(() => setCopie((c) => (c === quoi ? null : c)), 2500);
    } catch {
      setCopie("echec");
    }
  }

  const titreResponsable = p.prenom ? `Le lien de ${p.prenom}, responsable de l'édition` : "Le lien du responsable";
  const qui = p.prenom ?? "Le responsable";
  const participants = !p.collecteOuverte
    ? "Pour déposer ses photos, avec un QR code. La collecte est close : il ne reçoit plus de photos."
    : p.cloture
      ? `Pour déposer ses photos, avec un QR code. Il s'ouvre maintenant et se ferme le ${p.cloture}.`
      : "Pour déposer ses photos, avec un QR code. Il s'ouvre maintenant et reste ouvert tant que la collecte n'est pas close.";
  const parti = envoi.etat === "envoye";

  /* Le bouton d'envoi dit ce qu'il fera, ou pourquoi il ne fera rien. */
  const boutonEnvoi = p.archivee ? (
    <button type="button" className="eca-bouton eca-bouton--petit" disabled>
      Édition archivée : aucun mail ne part
    </button>
  ) : !p.ouverts ? (
    <button type="button" className="eca-bouton eca-bouton--petit eca-bouton--coupe" disabled title="COLLECTIF_MAILS n'est pas ouvert : rien ne partirait d'ici.">
      Mails coupés : copiez les liens
    </button>
  ) : envoi.verif ? null : (
    <button type="button" className="eca-bouton eca-bouton--petit eca-bouton--plein" disabled={envoi.envoi} onClick={envoi.verifier}>
      {envoi.envoi ? "Vérification…" : `Envoyer à ${p.email}`}
    </button>
  );

  return (
    <div className="eca-fin">
      <div className="eca-fin-liens">
        <section className="eca-lien-carte eca-lien-carte--premier" aria-label="Le lien du responsable">
          <span className="eca-lien-carte-tete">
            <b>{titreResponsable}</b>
            <span className={parti ? "eca-etiquette eca-etiquette--ok" : "eca-etiquette"}>{parti ? "envoyé" : "à envoyer"}</span>
          </span>
          <span className="eca-note">Il y fait tout : photos, style, bon à tirer. À ne pas transférer.</span>
          <span className="eca-url">{lienAbrege(p.liens.responsable)}</span>
          <span className="eca-fin-gestes">
            {boutonEnvoi}
            <button type="button" className="eca-bouton eca-bouton--petit" onClick={() => copier("responsable")}>
              {copie === "responsable" ? "Copié" : "Copier"}
            </button>
          </span>
          {envoi.verif ? (
            <div className="eca-confirm">
              <p>
                À <strong>{envoi.verif.a}</strong>, objet « {envoi.verif.sujet} ».
              </p>
              {envoi.verif.ouverts ? null : (
                <p>
                  <strong>Les mails des éditions sont coupés</strong> ({envoi.verif.interrupteur}) : rien ne partira.
                </p>
              )}
              <span className="eca-fin-gestes">
                <button type="button" className="eca-bouton eca-bouton--petit eca-bouton--plein" disabled={envoi.envoi} onClick={envoi.confirmer}>
                  {envoi.envoi ? "Envoi…" : "Confirmer l'envoi"}
                </button>
                <button type="button" className="eca-bouton eca-bouton--petit" onClick={envoi.annuler}>
                  Annuler
                </button>
              </span>
            </div>
          ) : null}
          {envoi.etat ? (
            <p className={parti ? "eca-message eca-message--ok" : "eca-message eca-message--erreur"} role="status">
              {PHRASE_ETAT[envoi.etat] ?? envoi.etat}
              {envoi.etat === "deja" ? (
                <>
                  {" "}
                  <button type="button" className="eca-lien-texte" disabled={envoi.envoi} onClick={envoi.renvoyer}>
                    Renvoyer quand même
                  </button>
                </>
              ) : null}
            </p>
          ) : null}
          {envoi.erreur ? (
            <p className="eca-message eca-message--erreur" role="alert">
              {envoi.erreur}
            </p>
          ) : null}
        </section>

        <section className="eca-lien-carte" aria-label="Le lien de l'équipe">
          <b>{"Le lien de l'équipe"}</b>
          <span className="eca-note">{`Lecture seule : suivre sans rien modifier. ${qui} le transfère à son équipe.`}</span>
          <span className="eca-url">{lienAbrege(p.liens.equipe)}</span>
        </section>

        <section className="eca-lien-carte" aria-label="Le lien des participants">
          <b>Le lien des participants</b>
          <span className="eca-note">{participants}</span>
          <span className="eca-url">{lienAbrege(p.liens.depot)}</span>
        </section>

        <span className="eca-fin-gestes">
          <button
            type="button"
            className={p.ouverts && !p.archivee ? "eca-bouton eca-bouton--petit" : "eca-bouton eca-bouton--petit eca-bouton--plein"}
            onClick={() => copier("trois")}
          >
            {copie === "trois" ? "Les trois liens sont copiés" : "Copier les trois liens"}
          </button>
          <Link href={`/admin/collectif/${p.id}`} className="eca-lien-fiche">
            Aller à la fiche →
          </Link>
        </span>
        {copie === "echec" ? (
          <p className="eca-message eca-message--erreur" role="alert">
            {"Copie impossible ici : l'onglet « Réglages et liens » de la fiche montre chaque lien en entier."}
          </p>
        ) : null}
      </div>

      <div className="eca-mail" aria-label="Aperçu du mail">
        <span className="eca-mail-entete">
          <span>
            À : <b>{p.email}</b>
          </span>
          <span>
            Objet : <b>{p.sujet}</b>
          </span>
        </span>
        <iframe
          className="eca-mail-cadre"
          src={`/api/admin/collectif/editions/${p.id}/mail-espace`}
          title="Aperçu du mail « Votre espace est prêt »"
          style={{ height: hauteur }}
          onLoad={(ev) => {
            const doc = ev.currentTarget.contentDocument;
            if (doc?.documentElement) setHauteur(doc.documentElement.scrollHeight);
          }}
        />
      </div>
    </div>
  );
}

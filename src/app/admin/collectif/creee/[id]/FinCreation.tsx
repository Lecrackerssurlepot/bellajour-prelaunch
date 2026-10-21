"use client";

/* « L'édition est créée » (T-187, planche 6 du 19/10 ; planche 5C du 21/10) : le lien
   du responsable et celui de l'équipe en cartes, l'envoi au responsable en DEUX TEMPS
   (le flux de `useEnvoiEspace`, le même que l'onglet « Réglages et liens »), « Copier
   les deux liens », et l'aperçu du vrai mail.

   - Plus de « lien des participants » (planche 5, 21/10) : l'adresse de base n'est plus
     montrée ni envoyée. La troisième carte, « Les liens des participants », dit qu'il y a
     un lien par groupe, que le responsable les crée dans son espace (page Photos, onglet
     « Les liens »), combien il y en a déjà, et « Préparer les groupes maintenant » ouvre
     la carte de création de l'atelier (`PanneauProvenances`, celle de « Réglages et
     liens » : la route `…/provenances`, ses contrôles, son plafond).

   - Les adresses se MONTRENT abrégées (`lienAbrege`, « bellajour.fr/edition/kq3f… »,
     comme la planche) : le lien entier ne sort que par « Copier ».
   - Mails coupés (`COLLECTIF_MAILS` fermé, lu par le serveur) : le bouton le dit,
     il ne vérifie ni n'envoie rien, et « Copier les deux liens » devient le geste
     principal. Une édition archivée ne reçoit rien non plus (la route le refuse). */

import Link from "next/link";
import { useState } from "react";
import { RAISON_COLLECTE_TERMINEE } from "@/lib/collectif/finCollecte";
import { lienAbrege, texteDeuxLiens } from "@/lib/collectif/liens";
import PanneauProvenances, { type LienCarte } from "../../[id]/PanneauProvenances";
import { PHRASE_ETAT, useEnvoiEspace } from "../../[id]/useEnvoiEspace";

type Props = {
  id: string;
  /** Les deux liens que l'écran montre et copie. L'adresse de dépôt n'en est plus (planche 5C). */
  liens: { responsable: string; equipe: string };
  /** L'adresse de base, seulement pour former l'adresse des liens de groupe qu'on crée ici (`?p=<clé>`) ; jamais montrée. */
  depot: string;
  /** Les liens de groupe déjà là ; `null` : illisibles (la carte ne dit pas de nombre). */
  groupes: LienCarte[] | null;
  /** Le plus de photos par personne pour un lien (`plafondLienMax`). */
  max: number;
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
  const [copie, setCopie] = useState<"responsable" | "deux" | "echec" | null>(null);
  const [hauteur, setHauteur] = useState(640);
  /* « Préparer les groupes maintenant » : la carte de création s'ouvre sous les liens ; ses liens écrits font suivre le compte. */
  const [preparer, setPreparer] = useState(false);
  const [crees, setCrees] = useState<LienCarte[]>([]);
  const groupes = p.groupes === null ? null : [...p.groupes, ...crees.filter((c) => !p.groupes?.some((g) => g.id === c.id))];
  const actifs = groupes ? groupes.filter((g) => !g.retire).length : null;

  async function copier(quoi: "responsable" | "deux") {
    try {
      await navigator.clipboard.writeText(quoi === "deux" ? texteDeuxLiens(p.liens) : p.liens.responsable);
      setCopie(quoi);
      setTimeout(() => setCopie((c) => (c === quoi ? null : c)), 2500);
    } catch {
      setCopie("echec");
    }
  }

  const titreResponsable = p.prenom ? `Le lien de ${p.prenom}, responsable de l'édition` : "Le lien du responsable";
  const qui = p.prenom ?? "Le responsable";
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

        <section className="eca-lien-carte eca-lien-carte--groupes" aria-label="Les liens des participants">
          <span className="eca-lien-carte-tete">
            <b>Les liens des participants</b>
            {actifs === null ? null : (
              <span className={actifs ? "eca-etiquette" : "eca-etiquette eca-etiquette--creux"}>{actifs ? `${actifs} lien${actifs > 1 ? "s" : ""}` : "aucun pour l'instant"}</span>
            )}
          </span>
          <span className="eca-note">
            {`Un lien par groupe : un bateau, une équipe, un photographe. ${qui} les crée dans son espace, page Photos, onglet « Les liens » : chacun a son nom, son nombre de photos et son QR code.`}
            {p.collecteOuverte ? null : ` ${RAISON_COLLECTE_TERMINEE}`}
          </span>
          {p.archivee ? null : (
            <span className="eca-fin-gestes">
              <button type="button" className="eca-bouton eca-bouton--petit" aria-expanded={preparer} onClick={() => setPreparer(!preparer)}>
                {preparer ? "Fermer la préparation des groupes" : "Préparer les groupes maintenant"}
              </button>
              <span className="eca-note">{"Facultatif : vous pouvez les créer à sa place, ici ou plus tard dans « Réglages et liens », avant de lui envoyer l'espace."}</span>
            </span>
          )}
        </section>

        {preparer && !p.archivee ? (
          <PanneauProvenances
            id={p.id}
            liens={groupes ?? []}
            depot={p.depot}
            max={p.max}
            ouverte={p.collecteOuverte}
            archivee={p.archivee}
            cloture={p.cloture ?? ""}
            onCree={(l) => setCrees((c) => [...c, l])}
          />
        ) : null}

        <span className="eca-fin-gestes">
          <button
            type="button"
            className={p.ouverts && !p.archivee ? "eca-bouton eca-bouton--petit" : "eca-bouton eca-bouton--petit eca-bouton--plein"}
            onClick={() => copier("deux")}
          >
            {copie === "deux" ? "Les deux liens sont copiés" : "Copier les deux liens"}
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

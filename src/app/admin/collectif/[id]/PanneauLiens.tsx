"use client";

/* Les trois liens d'une édition : copier, ouvrir, régénérer (PRD §8).
   Régénérer coupe l'ancien lien AUSSITÔT : jamais d'un seul clic.
   (Le mode `compact`, que personne n'appelait plus, est archivé :
   archive/panneau-liens-compact-2026-10/, T-185.)

   T-196 (20/10) : « Régénérer » VÉRIFIE d'abord (la route, `verifier: true`,
   rien n'est écrit) et dit ce que le geste coupera : pour le lien des
   participants, combien de liens de contribution actifs tombent avec lui
   (ils contiennent ce lien) ; et le mail qui préviendra le responsable
   (lien du responsable ou des participants), avec son aperçu. Tant que
   `COLLECTIF_MAILS` est fermé, l'écran le dit et rien ne part. */

import { useState } from "react";
import { useRouter } from "next/navigation";
import { LIBELLE_LIEN, QUELS_LIENS, type QuelLien } from "@/lib/collectif/liens";

type Verif = {
  quel: QuelLien;
  contributions: number | null;
  mail: { a: string; sujet: string; ouverts: boolean; interrupteur: string } | null;
  sansMail: string | null;
};
type Resultat = { quel: QuelLien; mail: string | null; sansMail: string | null };

/** Ce que l'écran dit du mail après le geste (l'état rendu par `envoyerMailCollectif`). */
const PHRASE_MAIL: Record<string, string> = {
  envoye: "Le responsable est prévenu par mail, avec le nouveau lien. Le journal le note.",
  coupe: "Aucun mail n'est parti : les mails des éditions sont coupés. Prévenez le responsable vous-même.",
  deja: "Ce mail était déjà parti pour ce lien.",
  echec: "Le mail n'est pas parti (Brevo l'a refusé ou n'a pas répondu) : prévenez le responsable vous-même.",
};

const prevenu = (quel: QuelLien) => quel === "responsable" || quel === "depot";

function phraseContributions(n: number | null): string {
  if (n === null) return "Les liens de contribution n'ont pas pu être comptés : ceux qui existent tombent aussi avec lui.";
  if (n === 0) return "Aucun lien de contribution actif : rien d'autre ne tombe.";
  return n === 1
    ? "1 lien de contribution actif cessera aussi de fonctionner : il contient ce lien. Sa nouvelle adresse sera dans « Les liens » de l'espace du responsable."
    : `${n} liens de contribution actifs cesseront aussi de fonctionner : ils contiennent ce lien. Leurs nouvelles adresses seront dans « Les liens » de l'espace du responsable.`;
}

export default function PanneauLiens({ id, liens }: { id: string; liens: Record<QuelLien, string> }) {
  const router = useRouter();
  const [copie, setCopie] = useState<QuelLien | null>(null);
  const [verif, setVerif] = useState<Verif | null>(null);
  const [resultat, setResultat] = useState<Resultat | null>(null);
  const [envoi, setEnvoi] = useState<QuelLien | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);
  const apercu = (quel: QuelLien) => `/api/admin/collectif/editions/${id}/lien?quel=${quel}`;

  async function copier(quel: QuelLien) {
    try {
      await navigator.clipboard.writeText(liens[quel]);
      setCopie(quel);
      setTimeout(() => setCopie((c) => (c === quel ? null : c)), 2000);
    } catch {
      setErreur("Copie impossible : sélectionner le lien et le copier à la main.");
    }
  }

  async function appeler(quel: QuelLien, verifier: boolean) {
    setEnvoi(quel);
    setErreur(null);
    try {
      const rep = await fetch(`/api/admin/collectif/editions/${id}/lien`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(verifier ? { quel, verifier: true } : { quel }),
      });
      const json = (await rep.json().catch(() => ({}))) as Partial<Verif> & { mail?: unknown; message?: string; sansMail?: string | null };
      if (!rep.ok) {
        setErreur(
          verifier
            ? `La vérification n'a pas abouti (erreur ${rep.status}). Rien n'a changé.`
            : (json.message ?? `Le lien n'a pas été régénéré (erreur ${rep.status}). L'ancien fonctionne toujours.`)
        );
        if (rep.status === 409) router.refresh();
        return;
      }
      if (verifier) {
        setResultat(null);
        setVerif({ quel, contributions: json.contributions ?? null, mail: (json.mail as Verif["mail"]) ?? null, sansMail: json.sansMail ?? null });
        return;
      }
      setVerif(null);
      setResultat({ quel, mail: typeof json.mail === "string" ? json.mail : null, sansMail: json.sansMail ?? null });
      router.refresh();
    } catch {
      setErreur(verifier ? "Le réseau n'a pas répondu. Rien n'a changé." : "Le réseau n'a pas répondu. L'ancien lien fonctionne toujours.");
    } finally {
      setEnvoi(null);
    }
  }

  return (
    <section className="eca-carte">
      <span className="eca-carte-tete">
        <h2 className="eca-carte-titre">Les liens</h2>
      </span>
      {QUELS_LIENS.map((quel) => (
        <div className="eca-lien" key={quel}>
          <span className="eca-lien-titre">{LIBELLE_LIEN[quel].titre}</span>
          <span className="eca-champ-aide">{LIBELLE_LIEN[quel].aide}</span>
          <div className="eca-lien-ligne">
            <input
              className="eca-input"
              readOnly
              value={liens[quel]}
              aria-label={LIBELLE_LIEN[quel].titre}
              onFocus={(e) => e.currentTarget.select()}
            />
            <button type="button" className="adm-btn" onClick={() => copier(quel)}>
              {copie === quel ? "Copié" : "Copier"}
            </button>
          </div>
          <div className="eca-barre">
            <a className="ate-lien-discret" href={liens[quel]} target="_blank" rel="noopener noreferrer">
              Ouvrir
            </a>
            {verif?.quel === quel ? null : (
              <button type="button" className="adm-btn adm-btn--ghost" disabled={envoi !== null} onClick={() => appeler(quel, true)}>
                {envoi === quel ? "Vérification…" : "Régénérer…"}
              </button>
            )}
          </div>
          {verif?.quel === quel ? (
            <div className="eca-confirm">
              <p>
                <strong>L&apos;ancien lien cessera de fonctionner tout de suite.</strong>
                {" "}Quiconque l&apos;a reçu tombera sur « Ce lien ne fonctionne plus ». Il faudra envoyer le nouveau.
              </p>
              {quel === "depot" ? <p>{phraseContributions(verif.contributions)}</p> : null}
              {verif.mail ? (
                <>
                  <p>
                    Un mail préviendra le responsable : à <strong>{verif.mail.a}</strong>, objet « {verif.mail.sujet} ».{" "}
                    <a className="ate-lien-discret" href={apercu(quel)} target="_blank" rel="noopener noreferrer">
                      Voir le mail
                    </a>
                    {" "}(il montre le lien actuel ; le nouveau y prendra sa place).
                  </p>
                  {verif.mail.ouverts ? null : (
                    <p>
                      <strong>Les mails des éditions sont coupés</strong> ({verif.mail.interrupteur}{" "}n&apos;est pas ouvert) : rien ne partira, il faudra le
                      prévenir vous-même.
                    </p>
                  )}
                </>
              ) : verif.sansMail ? (
                <p>{verif.sansMail}</p>
              ) : null}
              <div className="eca-barre">
                <button type="button" className="adm-btn" disabled={envoi !== null} onClick={() => appeler(quel, false)}>
                  {envoi === quel ? "Régénération…" : "Confirmer"}
                </button>
                <button type="button" className="adm-btn adm-btn--ghost" onClick={() => setVerif(null)}>
                  Annuler
                </button>
              </div>
            </div>
          ) : null}
          {resultat?.quel === quel ? (
            <p className={resultat.mail === "envoye" ? "eca-message" : "eca-message eca-message--erreur"} role="status">
              Lien régénéré : l&apos;ancien ne fonctionne plus.{" "}
              {resultat.mail ? (Object.hasOwn(PHRASE_MAIL, resultat.mail) ? PHRASE_MAIL[resultat.mail] : resultat.mail) : resultat.sansMail}
              {prevenu(quel) ? (
                <>
                  {" "}
                  <a className="ate-lien-discret" href={apercu(quel)} target="_blank" rel="noopener noreferrer">
                    Voir le mail
                  </a>
                </>
              ) : null}
            </p>
          ) : null}
        </div>
      ))}
      {erreur ? (
        <p className="eca-message eca-message--erreur" role="alert">
          {erreur}
        </p>
      ) : null}
    </section>
  );
}

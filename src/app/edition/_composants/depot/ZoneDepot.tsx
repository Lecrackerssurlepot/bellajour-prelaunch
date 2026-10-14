"use client";

/* La zone de dépôt du responsable, déjà ouverte (PRD §14.2) : on glisse des
   photos ou un dossier entier, ou on les choisit. Elle conduit le moteur
   d'envoi de la coquille (DepotContexte) : l'envoi continue pendant qu'on
   navigue. Le « dossier de destination » est le nom sous lequel l'atelier
   voit ces photos ; « Mes photos » par défaut. */

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useMoteurDepot } from "./DepotContexte";
import { fichiersDuDepot, useMoteur } from "./useMoteur";

export default function ZoneDepot({ tu }: { tu: boolean }) {
  const router = useRouter();
  const moteur = useMoteurDepot();
  const vue = useMoteur(moteur);
  const v = (vous: string, toi: string) => (tu ? toi : vous);
  const [dossierNom, setDossierNom] = useState("Mes photos");
  const [renommer, setRenommer] = useState(false);
  const [survol, setSurvol] = useState(false);
  const fichiers = useRef<HTMLInputElement>(null);
  const dossier = useRef<HTMLInputElement>(null);
  const enCours = useRef(0);

  /* `webkitdirectory` n'est pas typé par React : posé à la main. */
  useEffect(() => {
    dossier.current?.setAttribute("webkitdirectory", "");
  }, []);

  /* Quand le dernier envoi se termine, l'encart relit ses compteurs. */
  useEffect(() => {
    if (enCours.current > 0 && vue.enCours === 0) router.refresh();
    enCours.current = vue.enCours;
  }, [vue.enCours, router]);

  if (!moteur) return null;
  const ajouter = (liste: Iterable<File>) => {
    const nom = dossierNom.trim();
    moteur.definirProvenance({ type: "organisateur", libelle: nom === "Mes photos" ? "" : nom });
    moteur.ajouter(liste);
  };
  const recues = vue.arrivees + vue.dejaLa;

  return (
    <div
      className={`ec-zone-depot${survol ? " ec-zone-depot--survol" : ""}`}
      onDragOver={(e) => {
        e.preventDefault();
        setSurvol(true);
      }}
      onDragLeave={() => setSurvol(false)}
      onDrop={async (e) => {
        e.preventDefault();
        setSurvol(false);
        ajouter(await fichiersDuDepot(e.dataTransfer));
      }}
    >
      {vue.total ? (
        <div className="ec-zone-depot-envoi" role="status" aria-live="polite">
          <strong className="ec-zone-depot-titre">
            {recues} sur {vue.total}
          </strong>
          <span className="ec-texte">{vue.enCours ? `${vue.enCours} en cours d'envoi` : "Toutes les photos sont arrivées."}</span>
          <div className="ec-dp-barre-espace" aria-hidden="true">
            <div style={{ width: `${vue.total ? Math.round(((vue.total - vue.enCours) / vue.total) * 100) : 0}%` }} />
          </div>
          {vue.horsLigne ? <p className="ec-note">Connexion interrompue : l&apos;envoi reprend tout seul.</p> : null}
          {vue.raisons.map((r) => (
            <p key={r} className="ec-note ec-note--erreur">
              {r}
            </p>
          ))}
          {vue.erreurs ? (
            <button type="button" className="ec-bouton ec-bouton--clair ec-bouton--petit" onClick={() => moteur.reessayer()}>
              Réessayer ({vue.erreurs})
            </button>
          ) : null}
          {vue.ferme ? <p className="ec-note ec-note--erreur">{vue.ferme}</p> : null}
          <button type="button" className="ec-bouton ec-bouton--clair ec-bouton--petit" onClick={() => fichiers.current?.click()}>
            Ajouter d&apos;autres photos
          </button>
        </div>
      ) : (
        <>
          <span className="ec-zone-depot-icone" aria-hidden="true">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 16V4M7 9l5-5 5 5" />
              <path d="M4 16v3a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-3" />
            </svg>
          </span>
          <strong className="ec-zone-depot-titre">{v("Déposez vos photos ici", "Dépose tes photos ici")}</strong>
          <span className="ec-texte">
            {v(
              "Glissez des photos ou un dossier entier. Sans limite pour vous, un fichier déjà envoyé n'est jamais renvoyé.",
              "Glisse des photos ou un dossier entier. Sans limite pour toi, un fichier déjà envoyé n'est jamais renvoyé."
            )}
          </span>
          <div className="ec-actions ec-actions--centre">
            <button type="button" className="ec-bouton" onClick={() => fichiers.current?.click()}>
              Choisir des photos
            </button>
            <button type="button" className="ec-bouton ec-bouton--clair" onClick={() => dossier.current?.click()}>
              Un dossier
            </button>
          </div>
          {renommer ? (
            <span className="ec-zone-depot-dossier">
              <input
                className="ec-champ"
                value={dossierNom}
                maxLength={80}
                aria-label="Le dossier où ranger ces photos"
                onChange={(e) => setDossierNom(e.target.value)}
              />
              <button type="button" className="ec-bouton ec-bouton--clair ec-bouton--petit" onClick={() => setRenommer(false)}>
                OK
              </button>
            </span>
          ) : (
            <button type="button" className="ec-lien-discret" onClick={() => setRenommer(true)}>
              Rangées dans « {dossierNom.trim() || "Mes photos"} » · changer de dossier
            </button>
          )}
        </>
      )}
      <input ref={fichiers} type="file" multiple accept="image/*,.heic,.heif" hidden onChange={(e) => { if (e.target.files) ajouter(e.target.files); e.target.value = ""; }} />
      <input ref={dossier} type="file" multiple hidden onChange={(e) => { if (e.target.files) ajouter(e.target.files); e.target.value = ""; }} />
    </div>
  );
}

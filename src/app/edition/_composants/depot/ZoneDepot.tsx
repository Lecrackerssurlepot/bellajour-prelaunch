"use client";

/* La zone de dépôt du responsable, déjà ouverte (PRD §14.2) : on glisse des
   photos ou un dossier entier, ou on les choisit. Elle conduit le moteur
   d'envoi de la coquille (DepotContexte) : l'envoi continue pendant qu'on
   navigue. Le « dossier de destination » est le nom sous lequel l'atelier
   voit ces photos ; « Mes photos » par défaut.
   21/10 : le compte est celui du DERNIER envoi, et ce qui était déjà là ne se
   compte plus comme arrivé (`progression`, la règle de la page du participant). */

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { bilanDuLot, progression } from "@/lib/collectif/depotParticipant";
import { useMoteurDepot } from "./DepotContexte";
import { fichiersDuDepot, useMoteur } from "./useMoteur";
import { phraseSilence, useSelecteur } from "./useSelecteur";

export default function ZoneDepot({ tu }: { tu: boolean }) {
  const router = useRouter();
  const moteur = useMoteurDepot();
  const vue = useMoteur(moteur);
  const v = (vous: string, toi: string) => (tu ? toi : vous);
  const [dossierNom, setDossierNom] = useState("Mes photos");
  const [renommer, setRenommer] = useState(false);
  const [survol, setSurvol] = useState(false);
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

  const ajouter = (liste: Iterable<File>) => {
    if (!moteur) return;
    const nom = dossierNom.trim();
    moteur.definirProvenance({ type: "organisateur", libelle: nom === "Mes photos" ? "" : nom });
    moteur.ajouter(liste);
  };
  const selecteur = useSelecteur(ajouter);

  if (!moteur) return null;
  /* Le dernier envoi : ce qui part vraiment, et à part ce qui était déjà là. */
  const prog = progression(vue.lot);
  const dejaLa = bilanDuLot(vue.lot).dejaLa + vue.lot.deuxFois;

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
            {prog.total ? `${prog.envoyees} sur ${prog.total}` : `${dejaLa} déjà là`}
          </strong>
          <span className="ec-texte">
            {vue.enCours
              ? `${vue.enCours} en cours d'envoi`
              : vue.erreurs
                ? `${vue.erreurs} photo${vue.erreurs > 1 ? "s" : ""} n'${vue.erreurs > 1 ? "ont" : "a"} pas pu partir.`
                : vue.lot.refusees
                  ? `Terminé : ${vue.lot.refusees} photo${vue.lot.refusees > 1 ? "s" : ""} refusée${vue.lot.refusees > 1 ? "s" : ""}.`
                  : prog.total
                    ? "Toutes les photos sont arrivées."
                    : "Rien de nouveau : ces photos étaient déjà là."}
          </span>
          <div className="ec-dp-barre-espace" aria-hidden="true">
            <div style={{ width: `${prog.total ? prog.part : 100}%` }} />
          </div>
          {dejaLa && prog.total ? <p className="ec-note">{dejaLa} déjà là, sautée{dejaLa > 1 ? "s" : ""} : une photo déjà envoyée ne repart jamais.</p> : null}
          {vue.horsLigne ? <p className="ec-note">Connexion interrompue : l&apos;envoi reprend tout seul.</p> : null}
          {vue.serveurLent ? <p className="ec-note">Le serveur répond lentement : l&apos;envoi reprend tout seul.</p> : null}
          {vue.reseauBloque ? <p className="ec-note ec-note--erreur">{vue.reseauBloque}</p> : null}
          {vue.ignores ? <p className="ec-note">{vue.ignores} fichier(s) ignoré(s) : ce ne sont pas des photos.</p> : null}
          {vue.raisons.map((r) => (
            <p key={r} className="ec-note ec-note--erreur">
              {r}
            </p>
          ))}
          {vue.erreurs || vue.reseauBloque ? (
            <button type="button" className="ec-bouton ec-bouton--clair ec-bouton--petit" onClick={() => moteur.reessayer()}>
              {vue.erreurs ? `Réessayer (${vue.erreurs})` : "Réessayer"}
            </button>
          ) : null}
          {vue.ferme ? <p className="ec-note ec-note--erreur">{vue.ferme}</p> : null}
          <button type="button" className="ec-bouton ec-bouton--clair ec-bouton--petit" onClick={selecteur.ouvrir}>
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
            <button type="button" className="ec-bouton" onClick={selecteur.ouvrir}>
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
            <button type="button" className="ec-lien-discret ec-lien-discret--bouton" onClick={() => setRenommer(true)}>
              Rangées dans « {dossierNom.trim() || "Mes photos"} » · changer de dossier
            </button>
          )}
        </>
      )}
      {selecteur.silence ? (
        <p className="ec-note ec-note--erreur" role="alert">
          {phraseSilence(selecteur.silence, tu)}
        </p>
      ) : null}
      <input type="file" multiple accept="image/*,.heic,.heif" hidden {...selecteur.champ} />
      <input ref={dossier} type="file" multiple hidden onChange={(e) => { if (e.target.files) ajouter(e.target.files); e.target.value = ""; }} />
    </div>
  );
}

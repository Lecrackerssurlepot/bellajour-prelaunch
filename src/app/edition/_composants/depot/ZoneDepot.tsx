"use client";

/* La zone de dépôt du responsable, déjà ouverte (PRD §14.2) : on glisse des
   photos ou un dossier entier, ou on les choisit. Elle conduit le moteur
   d'envoi de la coquille (DepotContexte) : l'envoi continue pendant qu'on
   navigue.
   21/10 : le compte est celui du DERNIER envoi, et ce qui était déjà là ne se
   compte plus comme arrivé (`progression`, la règle de la page du participant).
   28/10 (décision de Mathias) : « Choisir des photos » ouvre la MÊME feuille de
   choix que tous les « Déposer » (Mes photos, ses dossiers, ses liens, Nouveau
   dossier) ; la ligne « « Mes photos » · Changer » et son champ sont partis
   (`archive/depot-destination-2026-10/`). Ce qu'on glisse, ou « Un dossier »
   de l'ordinateur, va dans « Mes photos ». */

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { bilanDuLot, progression } from "@/lib/collectif/depotParticipant";
import { useFenetreEnvoi, useMoteurDepot } from "./DepotContexte";
import { fichiersDuDepot, useMoteur } from "./useMoteur";

export default function ZoneDepot({ tu }: { tu: boolean }) {
  const router = useRouter();
  const moteur = useMoteurDepot();
  const { ouvrir } = useFenetreEnvoi();
  const vue = useMoteur(moteur);
  const v = (vous: string, toi: string) => (tu ? toi : vous);
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

  /* Glissées, ou un dossier de l'ordinateur : « Mes photos ». */
  const ajouter = (liste: Iterable<File>) => {
    if (!moteur) return;
    moteur.definirProvenance({ type: "organisateur", libelle: "" });
    moteur.ajouter(liste);
  };

  if (!moteur || !ouvrir) return null;
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
                ? `${vue.erreurs} à reprendre`
                : vue.lot.refusees
                  ? `${vue.lot.refusees} refusée${vue.lot.refusees > 1 ? "s" : ""}`
                  : prog.total
                    ? "Tout est arrivé."
                    : "Déjà là."}
          </span>
          <div className="ec-dp-barre-espace" aria-hidden="true">
            <div style={{ width: `${prog.total ? prog.part : 100}%` }} />
          </div>
          {dejaLa && prog.total ? <p className="ec-note">{dejaLa} déjà là</p> : null}
          {vue.horsLigne ? <p className="ec-note">Connexion perdue. Reprise automatique.</p> : null}
          {vue.serveurLent ? <p className="ec-note">Serveur lent. Reprise automatique.</p> : null}
          {vue.reseauBloque ? <p className="ec-note ec-note--erreur">{vue.reseauBloque}</p> : null}
          {vue.lotIgnores ? <p className="ec-note">{vue.lotIgnores} fichier(s) ignoré(s).</p> : null}
          {vue.lot.raisons.map((r) => (
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
          <button type="button" className="ec-bouton ec-bouton--clair ec-bouton--petit" onClick={() => ouvrir()}>
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
            Photos ou dossier entier.
          </span>
          <div className="ec-actions ec-actions--centre">
            <button type="button" className="ec-bouton" onClick={() => ouvrir()}>
              Choisir des photos
            </button>
            <button type="button" className="ec-bouton ec-bouton--clair ec-pour-souris" onClick={() => dossier.current?.click()}>
              Un dossier
            </button>
          </div>
        </>
      )}
      <input ref={dossier} type="file" multiple hidden onChange={(e) => { if (e.target.files) ajouter(e.target.files); e.target.value = ""; }} />
    </div>
  );
}

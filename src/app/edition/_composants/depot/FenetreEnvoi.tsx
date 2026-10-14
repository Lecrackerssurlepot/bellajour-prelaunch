"use client";

/* La fenêtre d'envoi des photos du responsable (retours du 14/10, points 6 et
   8, maquette EnvoiPhotos validée). Deux vues dans la même fenêtre :
   - CHOISIR : d'où viennent les photos, puis la zone où les glisser ;
   - L'ENVOI : où il en est (le compte en grand, la barre), ce qui est arrivé,
     ce qui était DÉJÀ LÀ et pourquoi c'est sauté, ce qui est à reprendre.
   « Réduire et continuer » ferme sans rien arrêter ; la pastille de l'en-tête
   rouvre. « Ajouter d'autres photos » repasse au choix pendant que l'envoi
   continue : le nouveau lot garde SA provenance (moteur.ts). */

import { useEffect, useRef, useState } from "react";
import { TYPES_PROVENANCE } from "@/lib/collectif/types";
import { DOSSIER_RESPONSABLE } from "@/lib/collectif/sources";
import Fenetre from "../Fenetre";
import type { MoteurDepot, Provenance } from "./moteur";
import { fichiersDuDepot, useMoteur } from "./useMoteur";

const AVEC_NOM: Record<string, string> = {
  organisateur: `Le nom du dossier (${DOSSIER_RESPONSABLE} si vide)`,
  photographe: "Son nom (facultatif)",
  participant: "Son nom",
  autre: "La source (ex. l'agence)",
};

function libelleDossier(p: Provenance | null): string {
  if (!p || p.type === "organisateur") return p?.libelle.trim() || DOSSIER_RESPONSABLE;
  const type = TYPES_PROVENANCE.find((t) => t.cle === p.type)?.libelle ?? "Autre source";
  return p.libelle.trim() ? `${type} · ${p.libelle.trim()}` : type;
}

export default function FenetreEnvoi({ moteur, tu, fermer }: { moteur: MoteurDepot; tu: boolean; fermer: () => void }) {
  const vue = useMoteur(moteur);
  const v = (vous: string, toi: string) => (tu ? toi : vous);
  /* Lu une fois, pour retrouver le choix en se rouvrant ; ensuite l'état local fait foi. */
  const [deja] = useState(() => moteur.provenanceChoisie());
  const [choisir, setChoisir] = useState(vue.total === 0);
  const [type, setType] = useState(deja?.type ?? "organisateur");
  const [libelle, setLibelle] = useState(deja?.libelle ?? "");
  const [survol, setSurvol] = useState(false);
  const fichiers = useRef<HTMLInputElement>(null);
  const dossier = useRef<HTMLInputElement>(null);

  /* `webkitdirectory` n'est pas typé par React : posé à la main. */
  useEffect(() => {
    dossier.current?.setAttribute("webkitdirectory", "");
  }, [choisir]);

  function ajouter(liste: Iterable<File>) {
    const nom = libelle.trim();
    moteur.definirProvenance({ type, libelle: type === "organisateur" && nom === DOSSIER_RESPONSABLE ? "" : nom });
    moteur.ajouter(liste);
    setChoisir(false);
  }

  if (choisir) {
    return (
      <Fenetre titre="Déposer des photos" onFermer={fermer} large>
        <fieldset className="ec-fieldset">
          <legend className="ec-note">1. D&apos;où viennent ces photos ?</legend>
          <div className="ec-puces">
            {TYPES_PROVENANCE.map((o) => (
              <label key={o.cle} className={`ec-puce${type === o.cle ? " ec-puce--active" : ""}`}>
                <input type="radio" name="provenance" value={o.cle} checked={type === o.cle} onChange={() => setType(o.cle)} hidden />
                {o.libelle}
              </label>
            ))}
          </div>
          {AVEC_NOM[type] ? <input className="ec-champ" placeholder={AVEC_NOM[type]} value={libelle} maxLength={80} onChange={(e) => setLibelle(e.target.value)} /> : null}
        </fieldset>

        <div
          className={`ec-depose${survol ? " ec-depose--survol" : ""}`}
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
          <p className="ec-texte">{v("2. Glissez des photos ou un dossier entier ici", "2. Glisse des photos ou un dossier entier ici")}</p>
          <div className="ec-actions">
            <button type="button" className="ec-bouton" onClick={() => fichiers.current?.click()}>
              Choisir des photos
            </button>
            <button type="button" className="ec-bouton ec-bouton--clair" onClick={() => dossier.current?.click()}>
              Choisir un dossier
            </button>
          </div>
          <p className="ec-note">
            JPEG, HEIC, PNG · sans plafond par personne pour {v("vous", "toi")} · une photo déjà envoyée n&apos;est jamais envoyée deux fois
          </p>
          <input ref={fichiers} type="file" multiple accept="image/*,.heic,.heif" hidden onChange={(e) => { if (e.target.files) ajouter(e.target.files); e.target.value = ""; }} />
          <input ref={dossier} type="file" multiple hidden onChange={(e) => { if (e.target.files) ajouter(e.target.files); e.target.value = ""; }} />
        </div>

        {vue.total ? (
          <button type="button" className="ec-bouton ec-bouton--clair" onClick={() => setChoisir(false)}>
            Revenir à l&apos;envoi en cours
          </button>
        ) : null}
      </Fenetre>
    );
  }

  const faites = vue.total - vue.enCours;
  const part = vue.total ? Math.round((faites / vue.total) * 100) : 0;
  const fini = vue.enCours === 0;
  return (
    <Fenetre titre={v("L'envoi de vos photos", "L'envoi de tes photos")} sous={`Rangées dans « ${libelleDossier({ type, libelle })} »`} onFermer={fermer} large>
      <div className="ec-envoi" role="status" aria-live="polite">
        <div className="ec-envoi-compte">
          <strong className="ec-envoi-n">
            {faites.toLocaleString("fr-FR")} <span>sur {vue.total.toLocaleString("fr-FR")}</span>
          </strong>
          <span className="ec-texte">{fini ? "Terminé" : `${vue.enCours} en cours`}</span>
        </div>
        <div className="ec-dp-barre-espace" aria-hidden="true">
          <div style={{ width: `${part}%` }} />
        </div>
      </div>

      <ul className="ec-lignes ec-envoi-lignes">
        <li>
          <span>Arrivées</span>
          <strong>{vue.arrivees.toLocaleString("fr-FR")}</strong>
        </li>
        <li>
          <span>Déjà là, sautées (même fichier déjà envoyé)</span>
          <strong>{vue.dejaLa.toLocaleString("fr-FR")}</strong>
        </li>
        {vue.dejaAjoutes ? (
          <li>
            <span>Choisies deux fois, sautées</span>
            <strong>{vue.dejaAjoutes.toLocaleString("fr-FR")}</strong>
          </li>
        ) : null}
        <li>
          <span>À reprendre</span>
          <strong>{vue.erreurs.toLocaleString("fr-FR")}</strong>
        </li>
        {vue.refusees ? (
          <li>
            <span>Refusées</span>
            <strong>{vue.refusees.toLocaleString("fr-FR")}</strong>
          </li>
        ) : null}
      </ul>

      {vue.dejaLa || vue.dejaAjoutes ? (
        <p className="ec-note">
          {v(
            "Une photo déjà envoyée n'est jamais envoyée deux fois : c'est ce qui permet de reprendre un envoi interrompu en choisissant de nouveau le même dossier. Pour ajouter de nouvelles photos, choisissez simplement les nouvelles.",
            "Une photo déjà envoyée n'est jamais envoyée deux fois : c'est ce qui permet de reprendre un envoi interrompu en choisissant de nouveau le même dossier. Pour ajouter de nouvelles photos, choisis simplement les nouvelles."
          )}
        </p>
      ) : null}
      {vue.raisons.map((r) => (
        <p key={r} className="ec-note ec-note--erreur">
          {r}
        </p>
      ))}
      {vue.horsLigne ? <p className="ec-note">Connexion interrompue : l&apos;envoi reprend tout seul.</p> : null}
      {vue.ignores ? <p className="ec-note">{vue.ignores} fichier(s) ignoré(s) : ce ne sont pas des photos.</p> : null}
      {vue.ferme ? <p className="ec-note ec-note--erreur">{vue.ferme}</p> : null}
      {!fini ? (
        <p className="ec-envoi-info">
          {v(
            "Vous pouvez naviguer dans l'espace pendant l'envoi : la pastille « Envoi en cours », en haut de chaque écran, rouvre cette fenêtre. Gardez l'onglet ouvert.",
            "Tu peux naviguer dans l'espace pendant l'envoi : la pastille « Envoi en cours », en haut de chaque écran, rouvre cette fenêtre. Garde l'onglet ouvert."
          )}
        </p>
      ) : null}

      <div className="ec-envoi-gestes">
        {vue.erreurs ? (
          <button type="button" className="ec-bouton ec-bouton--clair" onClick={() => moteur.reessayer()}>
            Réessayer ({vue.erreurs})
          </button>
        ) : null}
        {!vue.ferme ? (
          <button type="button" className="ec-bouton ec-bouton--clair" onClick={() => setChoisir(true)}>
            Ajouter d&apos;autres photos
          </button>
        ) : null}
        <button type="button" className="ec-bouton" onClick={fermer}>
          {fini ? "Terminé" : "Réduire et continuer"}
        </button>
      </div>
    </Fenetre>
  );
}

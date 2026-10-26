"use client";

/* La fenêtre d'envoi des photos du responsable (T-152, maquette « Déposer =
   choisir où », après la fenêtre du 14/10). Deux vues dans la même fenêtre :
   - CHOISIR : DANS QUEL DOSSIER (ceux qui existent, en pastilles, ou un nom
     nouveau qui crée le dossier ; « Mes photos » la première fois), puis la
     zone où glisser les photos, un seul bouton « Choisir des photos » (un
     dossier de l'ordinateur se glisse toujours) ;
   - L'ENVOI : le compte en très grand, la barre, ce qui est arrivé, ce qui
     était DÉJÀ LÀ (et pourquoi c'est sauté), ce qui est à reprendre.
   « Réduire et continuer » ferme sans rien arrêter ; la pastille de l'en-tête
   rouvre. « Ajouter d'autres photos » repasse au choix pendant que l'envoi
   continue : le nouveau lot garde SON dossier (moteur.ts).

   21/10 (la même règle que la page du participant) : la fenêtre dit le DERNIER
   envoi (`vue.lot`), et « arrivées » ne compte plus les déjà-là ; elles ont
   leur case, et une photo à la corbeille sa phrase (`phrasesDuLot`). */

import { useEffect, useRef, useState } from "react";
import { bilanDuLot, phrasesDuLot, progression } from "@/lib/collectif/depotParticipant";
import { DOSSIER_RESPONSABLE, lireNomDossier, SEPARATEUR, type Arbre } from "@/lib/collectif/dossiers";
import Fenetre from "../Fenetre";
import type { OuvertureEnvoi } from "./DepotContexte";
import type { MoteurDepot } from "./moteur";
import { fichiersDuDepot, useMoteur } from "./useMoteur";
import { phraseSilence, useSelecteur } from "./useSelecteur";

/** Les dossiers du responsable, à plat : « La soirée », « La soirée / Photobooth »… avec leurs photos. */
function cheminsDe(arbre: Arbre | null): { chemin: string; n: number }[] {
  if (!arbre) return [];
  return arbre.vous
    .filter((h) => h.cle.startsWith("resp:organisateur:"))
    .flatMap((h) => [{ chemin: h.nom, n: h.n }, ...h.enfants.map((e) => ({ chemin: `${h.nom}${SEPARATEUR}${e.nom}`, n: e.n }))]);
}

export default function FenetreEnvoi({
  moteur,
  token,
  tu,
  ouverture,
  fermer,
}: {
  moteur: MoteurDepot;
  token: string;
  tu: boolean;
  ouverture: OuvertureEnvoi;
  fermer: () => void;
}) {
  const vue = useMoteur(moteur);
  const v = (vous: string, toi: string) => (tu ? toi : vous);
  /* Lu une fois, pour retrouver le dossier en se rouvrant ; ensuite l'état local fait foi. */
  const [deja] = useState(() => moteur.provenanceChoisie());
  const [choisir, setChoisir] = useState(vue.total === 0 || Boolean(ouverture.nouveau) || Boolean(ouverture.dossier));
  const [arbre, setArbre] = useState<Arbre | null>(null);
  const [chemin, setChemin] = useState<string>(ouverture.dossier ?? (deja?.libelle ? deja.libelle : DOSSIER_RESPONSABLE));
  const [nouveau, setNouveau] = useState("");
  const [refus, setRefus] = useState<string | null>(null);
  const [survol, setSurvol] = useState(false);
  const champNouveau = useRef<HTMLInputElement>(null);

  /* Les dossiers qui existent déjà : la route de la grille rend l'arbre seul. */
  useEffect(() => {
    let vivant = true;
    void fetch("/api/collectif/photos", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ token, seulementArbre: true }),
    })
      .then((r) => (r.ok ? r.json() : null))
      .then((j: { arbre?: Arbre } | null) => {
        if (vivant && j?.arbre) setArbre(j.arbre);
      })
      .catch(() => {});
    return () => {
      vivant = false;
    };
  }, [token]);
  useEffect(() => {
    if (ouverture.nouveau) champNouveau.current?.focus();
  }, [ouverture.nouveau]);

  const existants = cheminsDe(arbre);
  const nomNouveau = nouveau.trim();
  const cible = nomNouveau ? nomNouveau : chemin;

  function ajouter(liste: Iterable<File>) {
    let dossier = chemin;
    if (nomNouveau) {
      const lu = lireNomDossier(nomNouveau);
      if (!lu.ok) {
        setRefus(lu.message);
        return;
      }
      dossier = lu.nom;
    }
    setRefus(null);
    moteur.definirProvenance({ type: "organisateur", libelle: dossier === DOSSIER_RESPONSABLE ? "" : dossier });
    moteur.ajouter(liste);
    setChemin(dossier);
    setNouveau("");
    setChoisir(false);
  }
  const selecteur = useSelecteur(ajouter);
  /* La page relancée pendant le choix rouvre la fenêtre (DepotContexte) : elle le dit, jusqu'au prochain choix. */
  const silence = selecteur.silence ?? (ouverture.interrompu ? "recharge" : null);

  if (choisir) {
    return (
      <Fenetre titre="Déposer des photos" onFermer={fermer} large>
        <fieldset className="ec-fieldset">
          <legend className="ec-envoi-question">Dans quel dossier ?</legend>
          {existants.length ? (
            <div className="ec-puces">
              {existants.map((d) => (
                <button
                  key={d.chemin}
                  type="button"
                  className="ec-onglet"
                  aria-pressed={!nomNouveau && chemin === d.chemin}
                  onClick={() => {
                    setChemin(d.chemin);
                    setNouveau("");
                  }}
                >
                  {d.chemin} <span className="ec-envoi-puce-n">· {d.n.toLocaleString("fr-FR")}</span>
                </button>
              ))}
            </div>
          ) : null}
          <label className="ec-curseur">
            {existants.length ? "Ou un nouveau dossier" : "Le nom du dossier"}
            <input
              ref={champNouveau}
              className="ec-champ"
              value={nouveau}
              maxLength={80}
              placeholder={existants.length ? "Le dîner, Le photographe, Jour 2…" : DOSSIER_RESPONSABLE}
              onChange={(e) => setNouveau(e.target.value)}
            />
          </label>
          <span className="ec-note">
            {existants.length
              ? v("Un nom nouveau crée le dossier. Vous rangerez ensuite en glissant un dossier dans un autre.", "Un nom nouveau crée le dossier. Tu rangeras ensuite en glissant un dossier dans un autre.")
              : v("La première fois, tout va dans « Mes photos », ou sous le nom que vous tapez.", "La première fois, tout va dans « Mes photos », ou sous le nom que tu tapes.")}
          </span>
        </fieldset>

        <div
          className={`ec-depose ec-depose--centre${survol ? " ec-depose--survol" : ""}`}
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
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="ec-depose-icone">
            <path d="M12 16V4M7 9l5-5 5 5M4 16v3a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-3" />
          </svg>
          <strong className="ec-depose-titre">
            <span className="ec-pour-souris">{v("Glissez vos photos ici", "Glisse tes photos ici")}</span>
            <span className="ec-pour-doigt">{v("Choisissez vos photos", "Choisis tes photos")}</span>
          </strong>
          <span className="ec-note">
            Vers « {cible} »<span className="ec-pour-souris"> · {v("un dossier de votre ordinateur se glisse aussi", "un dossier de ton ordinateur se glisse aussi")}</span>
          </span>
          <button type="button" className="ec-bouton" onClick={selecteur.ouvrir}>
            Choisir des photos
          </button>
          <span className="ec-note">JPEG, HEIC, PNG · une photo déjà envoyée ne part jamais deux fois</span>
          <input type="file" multiple accept="image/*,.heic,.heif" hidden {...selecteur.champ} />
        </div>
        {silence ? (
          <p className="ec-note ec-note--erreur" role="alert">
            {phraseSilence(silence, tu)}
          </p>
        ) : null}
        {refus ? (
          <p className="ec-note ec-note--erreur" role="alert">
            {refus}
          </p>
        ) : null}

        {vue.total ? (
          <button type="button" className="ec-bouton ec-bouton--clair" onClick={() => setChoisir(false)}>
            Revenir à l&apos;envoi en cours
          </button>
        ) : null}
      </Fenetre>
    );
  }

  /* Le dernier envoi seulement ; ce qui part VRAIMENT (les déjà-là n'y entrent pas). */
  const lot = vue.lot;
  const prog = progression(lot);
  const bilan = bilanDuLot(lot);
  const fini = vue.enCours === 0;
  const part = prog.total ? prog.part : fini ? 100 : 0;
  return (
    <Fenetre titre={`Vers « ${chemin} »`} sous={fini ? "Envoi terminé" : "Pendant l'envoi"} onFermer={fermer} large>
      <div className="ec-envoi" role="status" aria-live="polite">
        <div className="ec-envoi-compte">
          <strong className="ec-envoi-n">{prog.envoyees.toLocaleString("fr-FR")}</strong>
          <span className="ec-envoi-sur">{prog.total ? `sur ${prog.total.toLocaleString("fr-FR")} arrivées` : "aucune photo nouvelle"}</span>
        </div>
        <div className="ec-envoi-barre" aria-hidden="true">
          <div style={{ width: `${part}%` }} />
        </div>
        <span className="ec-note">
          {!fini
            ? prog.restent
              ? `${prog.restent} photo${prog.restent > 1 ? "s" : ""} en route en ce moment`
              : "Dernières vérifications en cours"
            : vue.erreurs
              ? `${vue.erreurs} photo${vue.erreurs > 1 ? "s" : ""} n'${vue.erreurs > 1 ? "ont" : "a"} pas pu partir : « Réessayer » les renvoie.`
              : "Terminé"}
        </span>
      </div>

      <div className="ec-envoi-cases">
        <span className="ec-envoi-case">
          <strong>{prog.envoyees.toLocaleString("fr-FR")}</strong>
          <span>arrivées</span>
        </span>
        <span className="ec-envoi-case">
          {/* Un fichier choisi deux fois est compté ici, jamais sauté en silence. */}
          <strong>{(bilan.dejaLa + lot.deuxFois).toLocaleString("fr-FR")}</strong>
          <span>déjà là, sautées</span>
        </span>
        <span className="ec-envoi-case">
          <strong>{vue.erreurs.toLocaleString("fr-FR")}</strong>
          <span>à reprendre</span>
        </span>
        {lot.refusees ? (
          <span className="ec-envoi-case">
            <strong>{lot.refusees.toLocaleString("fr-FR")}</strong>
            <span>refusées</span>
          </span>
        ) : null}
      </div>

      {phrasesDuLot(bilan, { tu, pour: "responsable" }).map((t) => (
        <p key={t} className="ec-note">
          {t}
        </p>
      ))}
      {bilan.dejaLa || lot.deuxFois ? (
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
      {vue.serveurLent ? <p className="ec-note">Le serveur répond lentement : l&apos;envoi reprend tout seul.</p> : null}
      {vue.reseauBloque ? <p className="ec-note ec-note--erreur">{vue.reseauBloque}</p> : null}
      {vue.ignores ? <p className="ec-note">{vue.ignores} fichier(s) ignoré(s) : ce ne sont pas des photos.</p> : null}
      {vue.ferme ? <p className="ec-note ec-note--erreur">{vue.ferme}</p> : null}
      {!fini ? (
        <p className="ec-envoi-info">
          {v(
            "Naviguez librement : la pastille « Envoi en cours », en haut de chaque écran, rouvre cette fenêtre. Gardez l'onglet ouvert.",
            "Navigue librement : la pastille « Envoi en cours », en haut de chaque écran, rouvre cette fenêtre. Garde l'onglet ouvert."
          )}
        </p>
      ) : null}

      <div className="ec-envoi-gestes">
        {vue.erreurs || vue.reseauBloque ? (
          <button type="button" className="ec-bouton ec-bouton--clair" onClick={() => moteur.reessayer()}>
            {vue.erreurs ? `Réessayer (${vue.erreurs})` : "Réessayer"}
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

"use client";

/* La fenêtre d'envoi des photos du responsable (T-152, puis les retours de
   Mathias du 28/10). Deux vues dans la même fenêtre, une feuille du bas au
   téléphone (`Fenetre`) :
   - CHOISIR OÙ : « Mes photos » d'abord, ses autres dossiers, ses LIENS
     (Bateau 1, Bateau 5…), puis « Nouveau dossier » (`destinationsDuDepot`).
     Un toucher sur une destination ouvre la photothèque : aucune étape de
     plus. Ouverte depuis un lien ou un dossier, la fenêtre propose CETTE
     destination, affichée, avec « Changer ». À l'ordinateur, on glisse aussi.
   - L'ENVOI : le compte en très grand, la barre, ce qui est arrivé, ce qui
     était DÉJÀ LÀ, ce qui est à reprendre.
   Un envoi FINI (tout arrivé ou refusé) ne revient plus : le prochain
   « Déposer » repart sur le choix (`envoiAMontrer`). Un envoi qui vit encore
   (en route, à reprendre) reste, et « Ajouter » s'y ajoute : le nouveau lot
   garde SA destination (moteur.ts). L'ancienne vue est dans
   `archive/depot-destination-2026-10/`. */

import { useEffect, useRef, useState } from "react";
import { bilanDuLot, envoiAMontrer, phrasesDuLot, progression } from "@/lib/collectif/depotParticipant";
import { destinationOuverte, destinationsDuDepot, DOSSIER_RESPONSABLE, lireNomDossier, type Arbre, type Destination } from "@/lib/collectif/dossiers";
import Fenetre from "../Fenetre";
import type { OuvertureEnvoi } from "./DepotContexte";
import type { MoteurDepot, Provenance } from "./moteur";
import { fichiersDuDepot, useMoteur } from "./useMoteur";
import { phraseSilence, useSelecteur } from "./useSelecteur";

/** Où partent les photos : un lien (son id) ou un dossier (son chemin), et le nom à afficher. */
type Cible = { lien: string | null; chemin: string | null; nom: string };

const deDestination = (d: Destination): Cible => ({ lien: d.lien, chemin: d.chemin, nom: d.nom });
/** La provenance que le moteur garde pour ces photos (le serveur relit le lien dans l'édition). */
const provenanceDe = (c: Cible): Provenance =>
  c.lien ? { type: "organisateur", libelle: c.nom, lien: c.lien } : { type: "organisateur", libelle: c.chemin === DOSSIER_RESPONSABLE ? "" : (c.chemin ?? "") };
/** La destination que le moteur garde d'un envoi précédent (la fenêtre la retrouve en se rouvrant). */
const deProvenance = (p: Provenance | null): { lien: string | null; dossier: string | null } =>
  p?.lien ? { lien: p.lien, dossier: null } : { lien: null, dossier: p?.libelle || null };

function Icone({ sorte }: { sorte: "dossier" | "lien" | "plus" }) {
  const d =
    sorte === "lien"
      ? "M10 14a4 4 0 0 0 5.66 0l3-3a4 4 0 0 0-5.66-5.66l-1 1M14 10a4 4 0 0 0-5.66 0l-3 3a4 4 0 0 0 5.66 5.66l1-1"
      : sorte === "plus"
        ? "M12 5v14M5 12h14"
        : "M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z";
  return (
    <svg className="ec-dest-icone" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={d} />
    </svg>
  );
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
  /* Lus une fois à l'ouverture ; ensuite l'état local fait foi. */
  const [vivantALOuverture] = useState(() => envoiAMontrer(moteur.vue()));
  const [precedente] = useState(() => moteur.provenanceChoisie());
  const visee = Boolean(ouverture.lien || ouverture.dossier);
  const [choisir, setChoisir] = useState(!vivantALOuverture || Boolean(ouverture.nouveau) || visee);
  /* La destination proposée : celle de l'ouverture (le lien ou le dossier où l'on est), celle de l'envoi
     qui vit encore, sinon « Mes photos ». */
  const [choix, setChoix] = useState<{ lien: string | null; dossier: string | null }>(() =>
    visee ? { lien: ouverture.lien ?? null, dossier: ouverture.lien ? null : (ouverture.dossier ?? null) } : vivantALOuverture ? deProvenance(precedente) : { lien: null, dossier: null }
  );
  /* La liste entière, ou seulement la destination proposée et « Changer » (ouverte depuis un lien ou un dossier). */
  const [liste, setListe] = useState(!visee);
  const [nouveauOuvert, setNouveauOuvert] = useState(Boolean(ouverture.nouveau));
  const [arbre, setArbre] = useState<Arbre | null>(null);
  const [nouveau, setNouveau] = useState("");
  const [refus, setRefus] = useState<string | null>(null);
  const [survol, setSurvol] = useState(false);
  const [titre, setTitre] = useState<string>(() => precedente?.libelle || DOSSIER_RESPONSABLE);
  const champNouveau = useRef<HTMLInputElement>(null);
  /* La destination du choix EN COURS, posée au toucher (avant d'ouvrir la photothèque), lue à son retour. */
  const enAttente = useRef<Cible | null>(null);

  /* Les dossiers et les liens qui existent : la route de la grille rend l'arbre seul. */
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
    if (nouveauOuvert) champNouveau.current?.focus();
  }, [nouveauOuvert]);

  const destinations = destinationsDuDepot(arbre);
  const proposee = destinationOuverte(destinations, choix);

  function partir(fichiers: Iterable<File>, c: Cible) {
    setRefus(null);
    moteur.definirProvenance(provenanceDe(c));
    moteur.ajouter(fichiers);
    setTitre(c.nom);
    setChoix({ lien: c.lien, dossier: c.lien ? null : c.chemin });
    setNouveau("");
    setNouveauOuvert(false);
    setChoisir(false);
  }
  const selecteur = useSelecteur((fichiers) => partir(fichiers, enAttente.current ?? deDestination(proposee)));
  /* La page relancée pendant le choix rouvre la fenêtre (DepotContexte) : elle le dit, jusqu'au prochain choix. */
  const silence = selecteur.silence ?? (ouverture.interrompu ? "recharge" : null);

  /** Un toucher sur une destination : la photothèque s'ouvre tout de suite (le clic reste celui de la personne). */
  function vers(c: Cible) {
    enAttente.current = c;
    setRefus(null);
    selecteur.ouvrir();
  }
  function versNouveau() {
    const lu = lireNomDossier(nouveau);
    if (!lu.ok) {
      setRefus(lu.message);
      return;
    }
    vers({ lien: null, chemin: lu.nom, nom: lu.nom });
  }

  if (choisir) {
    const glisser = {
      onDragOver: (e: React.DragEvent) => {
        e.preventDefault();
        setSurvol(true);
      },
      onDragLeave: () => setSurvol(false),
      onDrop: async (e: React.DragEvent) => {
        e.preventDefault();
        setSurvol(false);
        partir(await fichiersDuDepot(e.dataTransfer), deDestination(proposee));
      },
    };
    return (
      <Fenetre titre="Déposer des photos" onFermer={fermer} large>
        {liste ? (
          <div className="ec-dest-liste" role="group" aria-label="Où vont les photos">
            {destinations.map((d) => (
              <button key={d.cle} type="button" className="ec-dest" aria-pressed={d.cle === proposee.cle} onClick={() => vers(deDestination(d))}>
                <Icone sorte={d.lien ? "lien" : "dossier"} />
                <span className="ec-dest-nom">{d.nom}</span>
                {d.n ? <span className="ec-dest-n">{d.n.toLocaleString("fr-FR")}</span> : null}
              </button>
            ))}
            {nouveauOuvert ? (
              <div className="ec-dest ec-dest--nouveau">
                <Icone sorte="plus" />
                <input
                  ref={champNouveau}
                  className="ec-champ ec-dest-champ"
                  value={nouveau}
                  maxLength={80}
                  placeholder="Le nom du dossier"
                  aria-label="Le nom du nouveau dossier"
                  onChange={(e) => setNouveau(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") versNouveau();
                  }}
                />
                <button type="button" className="ec-bouton ec-bouton--petit" disabled={!nouveau.trim()} onClick={versNouveau}>
                  Choisir
                </button>
              </div>
            ) : (
              <button type="button" className="ec-dest" onClick={() => setNouveauOuvert(true)}>
                <Icone sorte="plus" />
                <span className="ec-dest-nom">Nouveau dossier</span>
              </button>
            )}
          </div>
        ) : (
          <div className="ec-dest-ici">
            <span className="ec-dest ec-dest--ici">
              <Icone sorte={proposee.lien ? "lien" : "dossier"} />
              <span className="ec-dest-nom">
                <span className="ec-dest-vers">Vers</span> {proposee.nom}
              </span>
              <button type="button" className="ec-dest-changer" onClick={() => setListe(true)}>
                Changer
              </button>
            </span>
            <button type="button" className="ec-bouton ec-dest-choisir" onClick={() => vers(deDestination(proposee))}>
              Choisir des photos
            </button>
          </div>
        )}

        <div className={`ec-depose ec-depose--centre ec-dest-glisser ec-pour-souris${survol ? " ec-depose--survol" : ""}`} {...glisser}>
          <strong className="ec-depose-titre">{v("Ou glissez vos photos ici", "Ou glisse tes photos ici")}</strong>
          <span className="ec-note">Vers « {proposee.nom} »</span>
        </div>
        <input type="file" multiple accept="image/*,.heic,.heif" hidden {...selecteur.champ} />
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

        {envoiAMontrer(vue) ? (
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
    <Fenetre titre={`Vers « ${titre} »`} sous={fini ? "Envoi terminé" : "Pendant l'envoi"} onFermer={fermer} large>
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
              ? `${prog.restent} en route`
              : "Vérification…"
            : vue.erreurs
              ? `${vue.erreurs} à reprendre`
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
      {/* Les raisons de CE lot (28/10 : la fenêtre d'un nouvel envoi ne redit pas les refus de l'ancien). */}
      {lot.raisons.map((r) => (
        <p key={r} className="ec-note ec-note--erreur">
          {r}
        </p>
      ))}
      {vue.horsLigne ? <p className="ec-note">Connexion perdue. Reprise automatique.</p> : null}
      {vue.serveurLent ? <p className="ec-note">Serveur lent. Reprise automatique.</p> : null}
      {vue.reseauBloque ? <p className="ec-note ec-note--erreur">{vue.reseauBloque}</p> : null}
      {vue.lotIgnores ? <p className="ec-note">{vue.lotIgnores} fichier(s) ignoré(s).</p> : null}
      {vue.ferme ? <p className="ec-note ec-note--erreur">{vue.ferme}</p> : null}
      {!fini ? (
        <p className="ec-envoi-info">
          {v("Gardez l'onglet ouvert.", "Garde l'onglet ouvert.")}
        </p>
      ) : null}

      <div className="ec-envoi-gestes">
        {vue.erreurs || vue.reseauBloque ? (
          <button type="button" className="ec-bouton ec-bouton--clair" onClick={() => moteur.reessayer()}>
            {vue.erreurs ? `Réessayer (${vue.erreurs})` : "Réessayer"}
          </button>
        ) : null}
        {!vue.ferme ? (
          <button
            type="button"
            className="ec-bouton ec-bouton--clair"
            onClick={() => {
              /* La destination de l'envoi en cours, affichée, et « Changer » à côté. */
              setListe(false);
              setChoisir(true);
            }}
          >
            Ajouter
          </button>
        ) : null}
        <button type="button" className="ec-bouton" onClick={fermer}>
          {fini ? "Terminé" : "Réduire et continuer"}
        </button>
      </div>
    </Fenetre>
  );
}

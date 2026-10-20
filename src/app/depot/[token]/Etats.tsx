"use client";

/* Les pages d'état du lien de dépôt (planche 9 du 20/10, T-196) : la même
   carte de verre que le dépôt, l'en-tête de l'édition et du lien, puis ce qui
   se passe.
   - 9B « Le dépôt n'est pas encore ouvert » : la phrase vient de
     `phrasesPasEncoreOuvert` (ouverture.ts), l'heure de Paris.
   - 9C « La collecte est terminée » : la date de clôture, le merci, et ce qui
     est arrivé de CE téléphone (son prénom seulement) ; l'album reste lisible
     (« Revoir l'album »), rien ne s'y ajoute ni ne s'y supprime.
   - le plafond par personne non réglé (T-195) : la page serveur passe ses
     phrases dans `CarteEtat`.
   (9A, le lien mort, est `LienMort.tsx` : il ne nomme pas l'édition.) */

import { useState } from "react";
import { phrasesPasEncoreOuvert, quandOuvre } from "@/lib/collectif/ouverture";
import { initiales } from "@/lib/collectif/depotParticipant";
import Album, { type Tete } from "./Album";
import { IcoCadenas, IcoHorloge } from "./icones";

/** Le haut de la carte : la marque, « Audencia t'invite · Bateau 1 », le nom de l'événement. */
export function TeteCarte({ tete }: { tete: Tete }) {
  return (
    <>
      <p className="ec-dp-marque">
        Bellajour <span>Édition collective</span>
      </p>
      <p className="ec-dp-surtitre">
        {tete.organisation} {tete.tu ? "t’invite" : "vous invite"}
        {tete.lien ? ` · ${tete.lien}` : ""}
      </p>
      <h1 className="ec-dp-titre">{tete.evenement}</h1>
    </>
  );
}

export function CarteEtat({ tete, children }: { tete: Tete; children: React.ReactNode }) {
  return (
    <div className="ec-dp-etat">
      <div className="ec-dp-in">
        <TeteCarte tete={tete} />
        {children}
      </div>
    </div>
  );
}

/** 9B : le jour et l'heure d'ouverture (`ouverture_le`), et que le lien restera le même. */
export function EtatPasOuvert({ tete, ouvertureLe, registre }: { tete: Tete; ouvertureLe: string | null; registre: string }) {
  const ph = phrasesPasEncoreOuvert(ouvertureLe, registre);
  const quand = quandOuvre(ouvertureLe);
  const i = quand ? ph.quand.indexOf(quand) : -1;
  return (
    <CarteEtat tete={tete}>
      <span className="ec-dp-etat-ico" aria-hidden="true">
        <IcoHorloge taille={22} />
      </span>
      <h2 className="ec-dp-etat-titre">{ph.titre}</h2>
      <p className="ec-dp-texte">
        {i >= 0 ? (
          <>
            {ph.quand.slice(0, i)}
            <b>{quand}</b>
            {ph.quand.slice(i + quand.length)}
          </>
        ) : (
          ph.quand
        )}
      </p>
      <p className="ec-dp-note">{ph.garder}</p>
    </CarteEtat>
  );
}

/** 9C : la collecte est close. */
export function CollecteTerminee({
  token,
  p,
  tete,
  fermeLe,
  recu,
}: {
  token: string;
  p: string | null;
  tete: Tete;
  /** « 15 novembre », ou vide si la date n'est pas connue. */
  fermeLe: string;
  /** Ce qui est arrivé de ce téléphone : son prénom (jamais son nom de famille) et ses photos. */
  recu: { prenom: string | null; photos: number } | null;
}) {
  const [album, setAlbum] = useState(false);
  const tu = tete.tu;
  if (album) {
    return (
      <Album
        token={token}
        p={p}
        tete={tete}
        qui={null}
        personnes={false}
        moteur={null}
        place={undefined}
        ongletInitial="album"
        accueil={null}
        lectureSeule
        retour={() => setAlbum(false)}
      />
    );
  }
  const n = recu?.photos ?? 0;
  return (
    <CarteEtat tete={tete}>
      <span className="ec-dp-etat-ico" aria-hidden="true">
        <IcoCadenas taille={22} />
      </span>
      <h2 className="ec-dp-etat-titre">La collecte est terminée</h2>
      <p className="ec-dp-texte">
        {fermeLe ? `Le dépôt a fermé le ${fermeLe}.` : "Le dépôt est fermé."} Merci : l’atelier compose le magazine avec les photos reçues.
      </p>
      {recu && n > 0 ? (
        <div className="ec-dp-reconnu">
          <span className="ec-dp-reconnu-ini" aria-hidden="true">
            {initiales(recu.prenom)}
          </span>
          <span>
            <b>
              {n > 1
                ? tu
                  ? `Tes ${n} photos sont bien arrivées`
                  : `Vos ${n} photos sont bien arrivées`
                : tu
                  ? "Ta photo est bien arrivée"
                  : "Votre photo est bien arrivée"}
            </b>
            <span>{[recu.prenom, tete.lien].filter(Boolean).join(" · ") || "Depuis ce téléphone"}</span>
          </span>
        </div>
      ) : null}
      <button type="button" className="ec-dp-bouton ec-dp-bouton--clair" onClick={() => setAlbum(true)}>
        Revoir l’album
      </button>
    </CarteEtat>
  );
}

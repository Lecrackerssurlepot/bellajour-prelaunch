"use client";

/* L'encart « Les photos » du tableau de bord (PRD §14.2, maquette Espace).
   Il change dès qu'il se passe quelque chose :
   - aucune photo, aucun lien : la ZONE DE DÉPÔT est déjà ouverte, et en bas
     « Inviter des proches à ajouter leurs photos » ;
   - un lien créé, rien reçu : la carte du lien (QR, Copier, WhatsApp, Mail) ;
   - des photos reçues : le total, les dossiers (un par lien, « Mes photos »…),
     une mosaïque, et les gestes.
   Le lien d'équipe voit les compteurs, sans aucun geste. */

import Link from "next/link";
import { useState } from "react";
import FenetreLien, { CarteLien } from "../_composants/LienContribution";
import { useFenetreEnvoi } from "../_composants/depot/DepotContexte";
import ZoneDepot from "../_composants/depot/ZoneDepot";
import type { DossierPhotos, LienContribution } from "./donnees";

type Props = {
  token: string;
  ecrire: boolean;
  ouverte: boolean;
  photos: number;
  participants: number;
  dossiers: DossierPhotos[];
  mosaique: string[];
  liens: LienContribution[];
  max: number;
  organisation: string;
  evenement: string;
  cloture: string;
  statut: string;
  lienPhotos: string;
  tu: boolean;
};

export default function CartePhotos(p: Props) {
  const v = (vous: string, toi: string) => (p.tu ? toi : vous);
  const [fenetre, setFenetre] = useState(false);
  const [deposer, setDeposer] = useState(false);
  const envoi = useFenetreEnvoi();
  const contexte = { organisation: p.organisation, evenement: p.evenement, cloture: p.cloture, tu: p.tu };
  const dernier = p.liens[p.liens.length - 1] ?? null;
  const etat = p.photos > 0 ? "photos" : deposer || !dernier ? "vide" : "lien";

  return (
    <section className="ec-carte ec-tdb-carte" aria-labelledby="ec-carte-photos">
      <div className="ec-tdb-carte-tete">
        <span className="ec-tdb-etiquette">2 · Les photos</span>
        <span className="ec-note">{p.statut}</span>
      </div>

      {etat === "photos" ? (
        <>
          <div className="ec-tdb-total">
            <strong>{p.photos.toLocaleString("fr-FR")}</strong>
            <span className="ec-texte">
              photo{p.photos > 1 ? "s" : ""}
              {p.participants ? `, de ${p.participants} participant${p.participants > 1 ? "s" : ""}` : ""}
            </span>
          </div>
          <ul className="ec-tdb-dossiers ec-defile" aria-label="Les dossiers de photos">
            {p.dossiers.map((d) => {
              const plus = Math.max(1, ...p.dossiers.map((x) => x.n));
              return (
                <li key={d.cle}>
                  <Link className="ec-tdb-dossier-lien" href={`${p.lienPhotos}?dossier=${encodeURIComponent(d.cle)}`} prefetch={false}>
                    {d.couverture ? (
                      <img className="ec-tdb-dossier-couv" src={d.couverture} alt="" loading="lazy" decoding="async" />
                    ) : (
                      <span className={d.lien ? "ec-tdb-dossier-couv ec-tdb-dossier-couv--lien" : "ec-tdb-dossier-couv"} aria-hidden="true" />
                    )}
                    <span className="ec-tdb-dossier">
                      <span>{d.libelle}</span>
                      <span className="ec-note">{d.detail}</span>
                    </span>
                    <span className="ec-tdb-dossier-barre" aria-hidden="true">
                      <span style={{ width: `${Math.round((d.n / plus) * 100)}%` }} />
                    </span>
                    <span className="ec-tdb-n">{d.n.toLocaleString("fr-FR")}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
          {p.mosaique.length ? (
            <div className="ec-tdb-mosaique" aria-hidden="true">
              {p.mosaique.map((u, i) => (
                <img key={i} src={u} alt="" loading="lazy" decoding="async" />
              ))}
            </div>
          ) : null}
          <div className="ec-tdb-gestes">
            <Link href={p.lienPhotos} prefetch={false} className="ec-bouton">
              Voir les photos
            </Link>
            {p.ecrire && p.ouverte ? (
              <>
                {envoi.ouvrir ? (
                  <button type="button" className="ec-bouton ec-bouton--clair" onClick={() => envoi.ouvrir?.()}>
                    Déposer
                  </button>
                ) : null}
                <Link href={`${p.lienPhotos}?onglet=liens`} prefetch={false} className="ec-bouton ec-bouton--clair">
                  Inviter quelqu&apos;un
                </Link>
              </>
            ) : null}
          </div>
        </>
      ) : !p.ecrire || !p.ouverte ? (
        <div className="ec-tdb-vide">
          <p className="ec-texte">{p.ouverte ? "Aucune photo pour l'instant." : "La collecte est close, sans photo reçue."}</p>
        </div>
      ) : etat === "lien" && dernier ? (
        <>
          <h2 className="ec-tdb-titre">Lien envoyé, en attente des premières photos</h2>
          <div className="ec-tdb-centre">
            <CarteLien lien={dernier} contexte={contexte} />
          </div>
          <div className="ec-tdb-gestes ec-tdb-gestes--deux">
            <button type="button" className="ec-bouton" onClick={() => setFenetre(true)}>
              Envoyer un autre lien
            </button>
            <button type="button" className="ec-bouton ec-bouton--clair" onClick={() => setDeposer(true)}>
              Déposer moi-même
            </button>
          </div>
        </>
      ) : (
        <>
          <ZoneDepot tu={p.tu} />
          <button type="button" className="ec-tdb-inviter" onClick={() => setFenetre(true)}>
            <span className="ec-tdb-inviter-icone" aria-hidden="true">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="9" cy="8" r="3.5" />
                <path d="M3 20a6 6 0 0 1 12 0M19 8v6M16 11h6" />
              </svg>
            </span>
            <span className="ec-tdb-inviter-texte">
              <strong>{v("Inviter des proches à ajouter leurs photos", "Inviter des proches à ajouter leurs photos")}</strong>
              <span className="ec-note">Un lien de contribution pour chaque personne</span>
            </span>
            <span className="ec-tdb-fleche" aria-hidden="true">
              →
            </span>
          </button>
        </>
      )}

      {fenetre ? <FenetreLien token={p.token} max={p.max} contexte={contexte} onFermer={() => setFenetre(false)} /> : null}
    </section>
  );
}

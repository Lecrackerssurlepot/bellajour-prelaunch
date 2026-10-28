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
import { useRouter } from "next/navigation";
import { useState } from "react";
import { corpsSondagePhotos, lireEtatSondage, SONDAGE_TABLEAU_MS } from "@/lib/collectif/arrivees";
import { useSondage } from "../_composants/useSondage";
import FenetreLien, { CarteLien } from "../_composants/LienContribution";
import { useFenetreEnvoi } from "../_composants/depot/DepotContexte";
import ZoneDepot from "../_composants/depot/ZoneDepot";
import { FenetreTerminerCollecte, ID_LIGNE_FIN, LigneFinCollecte } from "../_composants/FinCollecte";
import type { DossierPhotos, LienContribution } from "./donnees";
/* Le grand QR du téléphone (`FeuilleQr`, ouvert par la pilule « QR code » de `BoutonsPartage`) est une feuille `ec-s-*` : sa feuille de style n'était chargée que par Photos. */
import "./photos/simple.css";

type Props = {
  token: string;
  ecrire: boolean;
  ouverte: boolean;
  photos: number;
  participants: number;
  /** « Ma sélection » (T-182). */
  selection: number;
  /** Le responsable peut terminer la collecte (D25) ; jamais l'équipe. */
  terminer: boolean;
  /** La clôture (ISO), pour dire « Collecte terminée le 21 octobre à 11 h 24 » ; `null` sans date. */
  termineLe: string | null;
  /** « Un oubli ? Écrivez à l'atelier » : le responsable seulement, tant que l'atelier peut rouvrir. */
  oubli: boolean;
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
  /** T-159 : « Les photos de cette édition ont été supprimées le … » (30 jours après la livraison) ; sinon `null`. */
  effacees: string | null;
};

export default function CartePhotos(p: Props) {
  const [fenetre, setFenetre] = useState(false);
  const [deposer, setDeposer] = useState(false);
  const envoi = useFenetreEnvoi();
  const contexte = { organisation: p.organisation, evenement: p.evenement, cloture: p.cloture, tu: p.tu };
  const dernier = p.liens[p.liens.length - 1] ?? null;
  /* Les photos qui arrivent pendant que le tableau est ouvert (T-181) : une lecture LÉGÈRE
     chaque minute, onglet visible ; si le nombre a bougé, la page se relit. Le NOMBRE et les
     participants se lisent dans la réponse du sondage elle-même et s'affichent aussitôt : la
     relecture de la page (`router.refresh()`) apporte les dossiers et la mosaïque, mais elle ne
     repeint pas toujours (14/10) ; sans elle, l'encart d'une édition qui part de zéro ne
     passait JAMAIS de « Lien envoyé, en attente » aux photos (21/10, test de Mathias). */
  const router = useRouter();
  const [enDirect, setEnDirect] = useState<{ photos: number; personnes: number | null } | null>(null);
  /* La page rendue par le serveur est en retard sur ce que le sondage a vu. */
  const enRetard = enDirect !== null && enDirect.photos !== p.photos;
  const photos = enRetard ? enDirect.photos : p.photos;
  const participants = enRetard ? (enDirect.personnes ?? p.participants) : p.participants;
  const etat = photos > 0 ? "photos" : deposer || !dernier ? "vide" : "lien";
  useSondage(
    async () => {
      const rep = await fetch("/api/collectif/photos/etat", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(corpsSondagePhotos(p.token, null, photos)) });
      if (!rep.ok) return;
      const j = lireEtatSondage(await rep.json().catch(() => null));
      if (!j || j.photos === photos) return;
      setEnDirect({ photos: j.photos, personnes: j.personnes ?? enDirect?.personnes ?? null });
      router.refresh();
    },
    SONDAGE_TABLEAU_MS,
    p.ouverte
  );
  const nouvelles = enRetard ? Math.max(0, enDirect.photos - p.photos) : 0;

  /* « Toutes les photos sont là ? » (D25, planche 4) : le responsable termine la collecte
     lui-même, en deux temps (la fenêtre et l'appel sont ceux de la page Photos :
     `FinCollecte.tsx`). La réponse s'affiche aussitôt (la relecture de la page ne repeint pas
     toujours) : `fait` ferme l'encart sans attendre, et la ligne d'état dit quand. */
  const [fin, setFin] = useState<"repos" | "confirmer" | "fait">("repos");
  const [termineLocal, setTermineLocal] = useState<string | null>(null);
  const ouverte = p.ouverte && fin !== "fait";
  const termineLe = termineLocal ?? p.termineLe;

  return (
    <section className="ec-carte ec-tdb-carte" aria-labelledby="ec-carte-photos">
      <div className="ec-tdb-carte-tete">
        <span className="ec-tdb-etiquette"><span className="ec-tdb-rang">2 · </span>Les photos</span>
        <span className="ec-note">{fin === "fait" ? "Collecte terminée" : p.statut}</span>
      </div>

      {/* La collecte est terminée : l'encart le DIT, quel que soit son état (21/10, retour de Mathias). */}
      {!ouverte ? <LigneFinCollecte id={ID_LIGNE_FIN} le={termineLe} tu={p.tu} oubli={(p.oubli || fin === "fait") && p.terminer} /> : null}

      {etat === "photos" ? (
        <>
          {nouvelles ? (
            <div className="ec-ph-annonce" role="status">
              <span className="ec-ph-annonce-point" aria-hidden="true" />
              <span>
                <strong>
                  {nouvelles} nouvelle{nouvelles > 1 ? "s" : ""} photo{nouvelles > 1 ? "s" : ""}
                </strong>
                , à l&apos;instant
              </span>
              <Link href={p.lienPhotos} prefetch={false} className="ec-bouton ec-bouton--petit">
                Les voir
              </Link>
            </div>
          ) : null}
          <div className="ec-tdb-total">
            <strong>{photos.toLocaleString("fr-FR")}</strong>
            <span className="ec-texte">
              photo{photos > 1 ? "s" : ""}
              {participants ? `, de ${participants} participant${participants > 1 ? "s" : ""}` : ""}
            </span>
          </div>
          {p.effacees ? (
            /* T-159 : l'édition effacée le DIT ; ni dossiers vides, ni mosaïque sans image. */
            <p className="ec-texte ec-tdb-effacees">{p.effacees}.</p>
          ) : (
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
          )}
          {p.mosaique.length && !p.effacees ? (
            <div className="ec-tdb-mosaique" aria-hidden="true">
              {p.mosaique.map((u, i) => (
                <img key={i} src={u} alt="" loading="lazy" decoding="async" />
              ))}
            </div>
          ) : null}
          {p.terminer && ouverte ? (
            <div className="ec-tdb-fin">
              <span className="ec-tdb-fin-texte">
                <strong className="ec-tdb-fin-titre">Toutes les photos sont là ?</strong>
                <span className="ec-note">
                  L&apos;atelier peut commencer.
                </span>
              </span>
              <button type="button" className="ec-bouton ec-bouton--petit" onClick={() => setFin("confirmer")}>
                Terminer la collecte
              </button>
            </div>
          ) : null}
          <div className="ec-tdb-gestes">
            <Link href={p.lienPhotos} prefetch={false} className="ec-bouton">
              Voir les photos
            </Link>
            {p.ecrire && ouverte ? (
              <>
                {envoi.ouvrir ? (
                  <button type="button" className="ec-bouton ec-bouton--clair" onClick={() => envoi.ouvrir?.()}>
                    Déposer
                  </button>
                ) : null}
                <Link href={`${p.lienPhotos}?dossier=liens`} prefetch={false} className="ec-bouton ec-bouton--clair">
                  Inviter quelqu&apos;un
                </Link>
              </>
            ) : null}
          </div>
        </>
      ) : !p.ecrire || !ouverte ? (
        <div className="ec-tdb-vide">
          <p className="ec-texte">{ouverte ? "Aucune photo pour l'instant." : "Aucune photo n'a été reçue."}</p>
        </div>
      ) : etat === "lien" && dernier ? (
        <>
          <h2 className="ec-tdb-titre">En attente des photos</h2>
          <div className="ec-tdb-centre">
            <CarteLien lien={dernier} contexte={contexte} />
          </div>
          {p.liens.length > 1 ? (
            <Link href={`${p.lienPhotos}?dossier=liens`} prefetch={false} className="ec-tdb-liens-n">
              {p.liens.length} liens
            </Link>
          ) : null}
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
              <strong>Inviter les participants</strong>
              <span className="ec-note">Un lien par groupe</span>
            </span>
            <span className="ec-tdb-fleche" aria-hidden="true">
              →
            </span>
          </button>
        </>
      )}

      {fenetre ? <FenetreLien token={p.token} max={p.max} contexte={contexte} onFermer={() => setFenetre(false)} /> : null}
      {fin === "confirmer" ? (
        <FenetreTerminerCollecte
          token={p.token}
          tu={p.tu}
          photos={photos}
          selection={p.selection}
          onFermer={() => setFin("repos")}
          onFait={(le) => {
            setTermineLocal(le);
            setFin("fait");
            router.refresh();
          }}
        />
      ) : null}
    </section>
  );
}

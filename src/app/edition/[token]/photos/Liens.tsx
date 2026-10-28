/* Les liens de la page Photos : le menu « … » d'un lien (`actionsDuLien`), la fenêtre « Modifier » (`FenetreModifierLien`) et l'état vide
   « Créez un lien par groupe » (`EtatSansLien`).

   22/10 (« Photos, en plus simple », planches 8 et 12) : l'ONGLET « Les liens » n'existe plus. Au téléphone « Par lien » et « Les liens » étaient déjà
   UNE vue ; à l'ordinateur, les deux onglets (« Les photos · Les liens · 3 ») sont retirés : « Par lien » (la colonne de gauche) montre la mosaïque, et
   « Nouveau lien » en est la dernière tuile (une ligne « + Nouveau lien » dans la colonne). `OngletLiens` (l'intro, le plafond de l'édition, la
   mosaïque à quatre colonnes) est dans `archive/photos-simple-2026-10/Liens.tsx`.

   21/10 (planche 3, validée) : la carte de lien d'avant (QR, barres par personne, « Afficher en grand », « Partager », menu) est
   dans archive/mosaique-liens-2026-10/ ; la tuile la remplace (`Mosaique.tsx`), et le menu « … » (`MenuLien.tsx`) porte
   Partager, QR code, Modifier, Supprimer. Les barres de chaque personne sont parties avec la carte : le lien ouvert montre ses
   personnes en pastilles (3C).

   21/10 (retour de Mathias : « changer le nom et changer le nombre pourraient être ensemble ») : UN seul geste « Modifier »,
   UNE fenêtre avec le nom ET le nombre de photos par personne, enregistrés en une requête (`FenetreModifierLien`). Les deux
   fenêtres d'avant (`FenetreNom`, `FenetrePlafond`) sont dans archive/liens-nom-et-nombre-2026-10/.

   21/10, planche 5 (validée) : plus de carte pour le lien général. L'adresse de base reste une base technique (elle reçoit encore,
   tous les liens de groupe en dépendent) mais ne se montre ni ne s'envoie plus. Ses photos, s'il y en a, apparaissent sous
   « Sans groupe », en LECTURE SEULE : une tuile sans « … ». Sans aucun lien de groupe, l'état vide « Créez un lien par groupe »
   (5B) : un grand « Créer un lien » et trois noms pour commencer qui préremplissent la fenêtre de création (tenue par
   `Collecte.tsx`, la même pour la tuile « Nouveau lien », la colonne de l'ordinateur et cet état vide). Les fenêtres de partage, de QR, de
   modification et de suppression sont aussi tenues par `Collecte.tsx`. */

import { useState } from "react";
import { RAISON_COLLECTE_TERMINEE } from "@/lib/collectif/finCollecte";
import { NOMS_POUR_COMMENCER } from "@/lib/collectif/partage";
import { RACCOURCIS_LIEN } from "@/lib/collectif/plafonds";
import { focusSiClavierPhysique } from "@/lib/pointeur";
import Fenetre from "../../_composants/Fenetre";
import { ICONES_MENU, type ActionMenu } from "./MenuLien";
import "./liens.css";

export type Personne = { nom: string; n: number };
export type LienDetail = { id: string; cle: string; nom: string; plafond: string; plafondNombre: number | null; sansPlafond: boolean; n: number; personnes: Personne[] };
/** `general` : les photos de l'adresse de base, montrées sous « Sans groupe » quand `n` > 0, jamais partagées. */
export type Liens = { general: { nom: string; plafond: string; n: number; personnes: Personne[] }; liens: LienDetail[]; reste: number | null };

/**
 * Le menu « … » d'un lien de contribution (planche 3B) : Partager et QR code seulement tant que la collecte est ouverte (collecte
 * terminée, il n'y a plus rien à partager), puis Modifier le nom et le nombre, et Supprimer le lien en rouge. Les mêmes gestes
 * que les anciens boutons de la carte, et le MÊME menu depuis la tuile d'une mosaïque et depuis la tuile d'un album.
 */
export function actionsDuLien(o: { ouverte: boolean; partager: () => void; qr: () => void; modifier: () => void; supprimer: () => void }): ActionMenu[] {
  return [
    ...(o.ouverte
      ? [
          { cle: "partager", libelle: "Partager", icone: ICONES_MENU.partager, faire: o.partager },
          { cle: "qr", libelle: "QR code", icone: ICONES_MENU.qr, faire: o.qr },
        ]
      : []),
    { cle: "modifier", libelle: "Modifier le nom et le nombre", icone: ICONES_MENU.crayon, faire: o.modifier },
    { cle: "supprimer", libelle: "Supprimer le lien", icone: ICONES_MENU.corbeille, danger: true, faire: o.supprimer },
  ];
}

/**
 * L'état vide de « Par lien » quand AUCUN lien de groupe n'existe (planche 5B) : un grand « Créer un lien » et trois noms pour commencer.
 * Collecte terminée : le bouton reste, ÉTEINT, avec la raison.
 */
export function EtatSansLien(o: {
  tu: boolean;
  ouverte: boolean;
  /** Ouvrir la fenêtre de création, un nom déjà écrit ou non. */
  creer: (nom: string) => void;
}) {
  const v = (vous: string, toi: string) => (o.tu ? toi : vous);
  return (
    <div className="ec-ph-accueil ec-cl-vide">
      <span className="ec-cl-vide-icone" aria-hidden="true">
        <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM2 21a7 7 0 0 1 14 0M16 3.5a4 4 0 0 1 0 7.5M22 21a7 7 0 0 0-4-6.3" />
        </svg>
      </span>
      <strong className="ec-ph-accueil-titre">{v("Créez un lien par groupe", "Crée un lien par groupe")}</strong>
      <p className="ec-texte">
        Un lien par bateau, par équipe ou par personne.
      </p>
      <div className="ec-ph-accueil-gestes">
        {o.ouverte ? (
          <button type="button" className="ec-bouton ec-bouton--plein ec-ph-large" onClick={() => o.creer("")}>
            Créer un lien
          </button>
        ) : (
          <button type="button" className="ec-bouton ec-bouton--plein ec-ph-large" disabled title={RAISON_COLLECTE_TERMINEE}>
            Créer un lien
          </button>
        )}
      </div>
      {o.ouverte ? (
        <div className="ec-cl-exemples" role="group" aria-label="Des noms pour commencer">
          <span className="ec-note">Pour commencer :</span>
          {NOMS_POUR_COMMENCER.map((nom) => (
            <button key={nom} type="button" className="ec-ph-pilule" onClick={() => o.creer(nom)}>
              {nom}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

/**
 * « Modifier » un lien : le nom ET le nombre de photos par personne dans la même fenêtre, enregistrés
 * ensemble. Le lien général (`general`) n'a pas de nom à changer ni de « Sans limite » (son nombre
 * est celui de l'édition). La règle est celle du serveur (`planModificationLien`) : l'écran ne fait que
 * la montrer, et affiche son refus (nom déjà pris, nombre hors règle).
 */
export function FenetreModifierLien(f: {
  nom: string;
  general: boolean;
  max: number;
  valeurInitiale: number;
  sansLimiteInitial: boolean;
  occupe: boolean;
  erreur: string | null;
  onFermer: () => void;
  onGarder: (nom: string, valeur: number, sansLimite: boolean) => void;
}) {
  const [nom, setNom] = useState(f.nom);
  const [valeur, setValeur] = useState(Math.min(Math.max(f.valeurInitiale, 1), f.max));
  const [sansLimite, setSansLimite] = useState(f.sansLimiteInitial && !f.general);
  const pret = f.general || nom.trim().length > 0;
  const garder = () => {
    if (pret && !f.occupe) f.onGarder(nom, valeur, sansLimite);
  };
  return (
    <Fenetre
      titre={f.general ? "Modifier le lien général" : `Modifier « ${f.nom} »`}
            onFermer={f.onFermer}
    >
      {f.general ? null : (
        <label className="ec-curseur">
          Le nom
          <input className="ec-champ" ref={focusSiClavierPhysique} value={nom} maxLength={80} onChange={(e) => setNom(e.target.value)} onKeyDown={(e) => e.key === "Enter" && garder()} />
        </label>
      )}
      <div className="ec-lien-plafond">
        <div className="ec-lien-plafond-tete">
          <span className="ec-texte">Photos par personne</span>
          <strong className="ec-lien-valeur">{sansLimite ? "Sans limite" : `${valeur} photo${valeur > 1 ? "s" : ""}`}</strong>
        </div>
        <div className="ec-puces">
          {[...new Set([...RACCOURCIS_LIEN.filter((n) => n <= f.max), ...(sansLimite ? [] : [valeur])])].sort((a, b) => a - b).map((n) => (
            <button
              key={n}
              type="button"
              className="ec-onglet"
              aria-pressed={!sansLimite && valeur === n}
              onClick={() => {
                setValeur(n);
                setSansLimite(false);
              }}
            >
              {n}
            </button>
          ))}
          {!f.general ? (
            <button type="button" className="ec-onglet" aria-pressed={sansLimite} onClick={() => setSansLimite(true)}>
              Sans limite
            </button>
          ) : null}
        </div>
      </div>
      {f.erreur ? (
        <p className="ec-note ec-note--erreur" role="alert">
          {f.erreur}
        </p>
      ) : null}
      <button type="button" className="ec-bouton ec-bouton--plein" disabled={f.occupe || !pret} onClick={garder}>
        Enregistrer
      </button>
    </Fenetre>
  );
}

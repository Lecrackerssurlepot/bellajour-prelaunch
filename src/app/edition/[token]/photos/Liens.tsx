"use client";

/* L'onglet « Les liens » de la page Photos (T-152, T-197) : une carte par lien,
   chaque personne avec sa barre, un seul « Partager », « Afficher en grand »
   (le QR), et un menu (« Modifier », supprimer). Déplacé tel quel de l'ancien
   `Collecte.tsx` le 20/10 (archive/photos-rayons-2026-10). Les fenêtres (partage,
   QR, modifier, suppression) restent tenues par `Collecte.tsx`, qui les ouvre aussi
   depuis l'onglet des photos (« Partager ce lien », le titre d'un lien).

   21/10 (retour de Mathias : « changer le nom et changer le nombre pourraient être
   ensemble ») : UN seul geste « Modifier », UNE fenêtre avec le nom ET le nombre de
   photos par personne, enregistrés en une requête. Les deux fenêtres d'avant (`FenetreNom`,
   `FenetrePlafond`) sont dans archive/liens-nom-et-nombre-2026-10/. */

import { useState } from "react";
import { CURSEUR_LIEN, RACCOURCIS_LIEN } from "@/lib/collectif/plafonds";
import Fenetre from "../../_composants/Fenetre";
import type { LienPartage } from "../../_composants/LienContribution";
import QrCode from "../../_composants/QrCode";

export type Personne = { nom: string; n: number };
export type LienDetail = { id: string; cle: string; nom: string; plafond: string; plafondNombre: number | null; sansPlafond: boolean; n: number; personnes: Personne[] };
export type Liens = { general: { nom: string; plafond: string; n: number; personnes: Personne[] }; liens: LienDetail[]; reste: number | null };

const nombre = (n: number) => n.toLocaleString("fr-FR");

export function OngletLiens(o: {
  liens: Liens | null;
  tu: boolean;
  ouverte: boolean;
  cloture: string;
  lienParticipants: string;
  plafondGeneral: number | null;
  max: number;
  maxPlafond: number;
  lienDe: (nom: string, cle: string | null, plafondTexte: string, n: number) => LienPartage;
  setPartage: (l: LienPartage) => void;
  setGrandQr: (l: LienPartage) => void;
  ouvrir: (cle: string) => void;
  /** `id` nul : le lien général (son nombre seulement). */
  setModifier: (r: { id: string | null; nom: string; valeur: number; sansLimite: boolean }) => void;
  setSupprimer: (r: { id: string; nom: string; n: number }) => void;
}) {
  const v = (vous: string, toi: string) => (o.tu ? toi : vous);
  const [menu, setMenu] = useState<string | null>(null);
  const p = o;
  const { liens, lienDe, setPartage, setGrandQr, ouvrir, setModifier, setSupprimer, maxPlafond } = o;
  return (
    <div className="ec-ecran-corps ec-li ec-defile">
      <div className="ec-li-intro">
        <span>{v("Un lien par personne ou par groupe : chacun dépose depuis son téléphone, sans compte, et vous suivez qui a envoyé quoi.", "Un lien par personne ou par groupe : chacun dépose depuis son téléphone, sans compte, et tu suis qui a envoyé quoi.")}</span>
        {liens?.reste !== null && liens?.reste !== undefined ? <span className="ec-note">Il reste {nombre(liens.reste)} photos avant le plafond de l&apos;édition</span> : null}
      </div>
      <div className="ec-li-cartes">
        {liens ? (
          <CarteLien
            genre="Lien général"
            nom={liens.general.nom}
            n={liens.general.n}
            plafondTexte={liens.general.plafond}
            cap={p.plafondGeneral}
            personnes={liens.general.personnes}
            url={p.lienParticipants}
            cloture={p.cloture}
            ouverte={p.ouverte}
            menuOuvert={menu === "general"}
            onMenu={() => setMenu((m) => (m === "general" ? null : "general"))}
            onPartager={() => setPartage(lienDe(liens.general.nom, null, liens.general.plafond, liens.general.n))}
            onGrand={() => setGrandQr(lienDe(liens.general.nom, null, liens.general.plafond, liens.general.n))}
            onVoir={() => ouvrir("participants")}
            actions={[{ libelle: "Modifier", note: "le nombre de photos pour chaque personne", faire: () => setModifier({ id: null, nom: liens.general.nom, valeur: p.plafondGeneral ?? Math.min(30, p.max), sansLimite: false }) }]}
          />
        ) : null}
        {liens?.liens.map((l) => (
          <CarteLien
            key={l.id}
            genre="Lien de contribution"
            nom={l.nom}
            n={l.n}
            plafondTexte={l.plafond}
            cap={l.plafondNombre}
            personnes={l.personnes}
            url={`${p.lienParticipants}?p=${l.cle}`}
            cloture={p.cloture}
            ouverte={p.ouverte}
            menuOuvert={menu === l.id}
            onMenu={() => setMenu((m) => (m === l.id ? null : l.id))}
            onPartager={() => setPartage(lienDe(l.nom, l.cle, l.plafond, l.n))}
            onGrand={() => setGrandQr(lienDe(l.nom, l.cle, l.plafond, l.n))}
            onVoir={() => ouvrir(`lien:${l.id}`)}
            actions={[
              {
                libelle: "Modifier",
                note: liens.reste !== null ? `le nom et le nombre de photos (jusqu'à ${maxPlafond} par personne, selon ce qu'il reste)` : "le nom et le nombre de photos par personne",
                faire: () => setModifier({ id: l.id, nom: l.nom, valeur: l.plafondNombre ?? Math.min(30, p.max), sansLimite: l.sansPlafond }),
              },
              { libelle: "Supprimer le lien", note: `il ne reçoit plus rien ; ses ${nombre(l.n)} photos restent`, danger: true, faire: () => setSupprimer({ id: l.id, nom: l.nom, n: l.n }) },
            ]}
          />
        ))}
      </div>
    </div>
  );
}

/* ─────────────────────────── une carte de lien ─────────────────────────── */

function CarteLien(c: {
  genre: string;
  nom: string;
  n: number;
  plafondTexte: string;
  cap: number | null;
  personnes: Personne[];
  url: string;
  cloture: string;
  ouverte: boolean;
  menuOuvert: boolean;
  onMenu: () => void;
  onPartager: () => void;
  onGrand: () => void;
  onVoir: () => void;
  actions: { libelle: string; note?: string; danger?: boolean; faire: () => void }[];
}) {
  const visibles = c.personnes.slice(0, 3);
  const autres = c.personnes.length - visibles.length;
  return (
    <article className="ec-li-carte">
      <div className="ec-li-tete">
        <span className="ec-li-titres">
          <span className="ec-li-genre">{c.genre}</span>
          <strong className="ec-li-nom">{c.nom}</strong>
          <span className="ec-note">
            {c.n ? `${nombre(c.n)} photo${c.n > 1 ? "s" : ""} · ${c.personnes.length} personne${c.personnes.length > 1 ? "s" : ""}` : "Rien reçu pour l'instant"}
          </span>
        </span>
        <QrCode texte={c.url} taille={64} etiquette={`QR code du lien « ${c.nom} »`} />
      </div>
      {visibles.length ? (
        <ul className="ec-li-personnes">
          {visibles.map((pe) => {
            const part = c.cap ? Math.min(100, Math.round((pe.n / c.cap) * 100)) : 100;
            return (
              <li key={pe.nom}>
                <span className="ec-li-personne-nom">{pe.nom}</span>
                <span className="ec-li-barre" aria-hidden="true">
                  <span className={c.cap && pe.n >= c.cap ? "ec-li-barre-plein" : undefined} style={{ width: `${part}%` }} />
                </span>
                <span className="ec-li-compte">{c.cap ? `${pe.n} / ${c.cap}` : `${pe.n} photo${pe.n > 1 ? "s" : ""}`}</span>
              </li>
            );
          })}
        </ul>
      ) : null}
      {c.n ? (
        <button type="button" className="ec-ph-lien ec-li-voir" onClick={c.onVoir}>
          {autres > 0 ? `Voir les ${autres} autres personnes et leurs photos` : "Voir ses photos"}
        </button>
      ) : null}
      <div className="ec-li-pied">
        <span className="ec-note ec-li-regle">
          {c.plafondTexte}
          {c.cloture ? ` · jusqu'au ${c.cloture}` : ""}
        </span>
        {c.ouverte ? (
          <>
            <button type="button" className="ec-bouton ec-bouton--clair ec-bouton--petit" onClick={c.onGrand}>
              Afficher en grand
            </button>
            <button type="button" className="ec-bouton ec-bouton--petit" onClick={c.onPartager}>
              Partager
            </button>
            <button type="button" className="ec-li-plus" aria-label={`Plus d'actions sur le lien « ${c.nom} »`} aria-expanded={c.menuOuvert} onClick={c.onMenu}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <circle cx="5" cy="12" r="1.8" />
                <circle cx="12" cy="12" r="1.8" />
                <circle cx="19" cy="12" r="1.8" />
              </svg>
            </button>
          </>
        ) : null}
      </div>
      {c.menuOuvert ? (
        <div className="ec-li-menu" role="menu" aria-label={`Actions sur le lien « ${c.nom} »`}>
          {c.actions.map((a) => (
            <button
              key={a.libelle}
              type="button"
              role="menuitem"
              className={a.danger ? "ec-li-menu-danger" : undefined}
              onClick={() => {
                c.onMenu();
                a.faire();
              }}
            >
              <span>{a.libelle}</span>
              {a.note ? <span className="ec-note">{a.note}</span> : null}
            </button>
          ))}
        </div>
      ) : null}
    </article>
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
  const min = Math.min(CURSEUR_LIEN.min, f.max);
  const [nom, setNom] = useState(f.nom);
  const [valeur, setValeur] = useState(Math.min(Math.max(f.valeurInitiale, min), f.max));
  const [sansLimite, setSansLimite] = useState(f.sansLimiteInitial && !f.general);
  const pret = f.general || nom.trim().length > 0;
  const garder = () => {
    if (pret && !f.occupe) f.onGarder(nom, valeur, sansLimite);
  };
  return (
    <Fenetre
      titre={f.general ? "Modifier le lien général" : `Modifier « ${f.nom} »`}
      sous={f.general ? "Le nombre de photos par personne : chacun dépose depuis son téléphone." : "Le nom et le nombre de photos par personne, en une fois."}
      onFermer={f.onFermer}
    >
      {f.general ? null : (
        <label className="ec-curseur">
          Le nom
          <input className="ec-champ" value={nom} maxLength={80} autoFocus onChange={(e) => setNom(e.target.value)} onKeyDown={(e) => e.key === "Enter" && garder()} />
          <span className="ec-note">Ses photos se rangent sous ce nom.</span>
        </label>
      )}
      <div className="ec-lien-plafond">
        <div className="ec-lien-plafond-tete">
          <span className="ec-texte">Photos par personne</span>
          <strong className="ec-lien-valeur">{sansLimite ? "Sans limite" : `${valeur} photo${valeur > 1 ? "s" : ""}`}</strong>
        </div>
        <input
          type="range"
          min={min}
          max={f.max}
          step={1}
          value={valeur}
          disabled={sansLimite}
          aria-label="Nombre de photos par personne"
          onChange={(e) => {
            setValeur(Number(e.target.value));
            setSansLimite(false);
          }}
        />
        <div className="ec-puces">
          {RACCOURCIS_LIEN.filter((n) => n <= f.max).map((n) => (
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

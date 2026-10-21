"use client";

/* Terminer la collecte, et le DIRE (retour de Mathias, 21/10).

   Trois pièces, partagées par le tableau de bord (`CartePhotos`) et la page Photos
   (`Collecte`), pour qu'il n'y ait qu'une fenêtre, qu'une phrase et qu'un appel :
   - `FenetreTerminerCollecte` : « Terminer la collecte maintenant ? » en DEUX temps,
     l'appel à `/api/collectif/collecte/terminer` (réservé au responsable, relu par le
     serveur), la réponse rendue à l'écran sans attendre la relecture de la page ;
   - `LigneFinCollecte` : la ligne d'état « Collecte terminée le 21 octobre à 11 h 24 : les
     liens ne reçoivent plus de photos. L'atelier compose. » (`finCollecte.ts`) ;
   - `ActionsFinCollecte` : dans l'en-tête de la page Photos, « Terminer la collecte » tant
     qu'elle est ouverte ; une fois terminée, les boutons de dépôt et de création de lien
     restent à leur place, ÉTEINTS, avec la raison.
   Les phrases viennent de `@/lib/collectif/finCollecte` (pur, au harnais). */

import { useState } from "react";
import { ligneOubli, partiesCollecteTerminee, phraseAtelierCommence, RAISON_COLLECTE_TERMINEE } from "@/lib/collectif/finCollecte";
import Fenetre from "./Fenetre";

/** Ce que l'écran sait de la fin de collecte : qui peut la terminer, depuis quand elle l'est, si l'atelier peut encore rouvrir. */
export type FinDeCollecte = {
  /** Le responsable peut terminer la collecte (`terminer_collecte`) ; jamais l'équipe. */
  terminer: boolean;
  /** La clôture de la collecte (ISO), pour dire « le 21 octobre à 11 h 24 ». */
  le: string | null;
  /** « Un oubli ? Écrivez à l'atelier » : seulement tant que l'atelier peut rouvrir (état composition). */
  oubli: boolean;
};

export const ID_LIGNE_FIN = "ec-fin-ligne";

/* ─────────────────────────── la fenêtre de confirmation ─────────────────────────── */

export function FenetreTerminerCollecte({
  token,
  tu,
  photos,
  selection,
  onFermer,
  onFait,
}: {
  token: string;
  tu: boolean;
  /** Le total reçu, tel que l'écran le connaît ; `null` s'il ne le connaît pas encore. */
  photos: number | null;
  selection: number;
  onFermer: () => void;
  /** La collecte est terminée : l'instant écrit comme clôture (celui que la route a posé). */
  onFait: (termineLe: string) => void;
}) {
  const v = (vous: string, toi: string) => (tu ? toi : vous);
  const [envoi, setEnvoi] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);

  async function terminer() {
    setEnvoi(true);
    setErreur(null);
    try {
      const rep = await fetch("/api/collectif/collecte/terminer", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ token }) });
      const json = (await rep.json().catch(() => ({}))) as { message?: string; termineLe?: unknown };
      if (!rep.ok) {
        setErreur(json.message ?? `La collecte n'a pas pu se terminer (erreur ${rep.status}).`);
        setEnvoi(false);
        return;
      }
      onFait(typeof json.termineLe === "string" ? json.termineLe : new Date().toISOString());
    } catch {
      setErreur("Le réseau n'a pas répondu. Rien n'a changé.");
      setEnvoi(false);
    }
  }

  return (
    <Fenetre titre="Terminer la collecte maintenant ?" onFermer={onFermer}>
      <ul className="ec-tdb-fin-liste">
        <li>Les liens des participants se ferment : ils verront que le dépôt des photos est fermé.</li>
        <li>{phraseAtelierCommence(photos, selection, tu)}</li>
        <li>{v("Si vous avez oublié quelqu'un, écrivez à l'atelier : il peut rouvrir.", "Si tu as oublié quelqu'un, écris à l'atelier : il peut rouvrir.")}</li>
      </ul>
      {erreur ? (
        <p className="ec-note ec-note--erreur" role="alert">
          {erreur}
        </p>
      ) : null}
      <div className="ec-envoi-gestes">
        <button type="button" className="ec-bouton ec-bouton--clair" disabled={envoi} onClick={onFermer}>
          Pas encore
        </button>
        <button type="button" className="ec-bouton ec-bouton--plein" disabled={envoi} onClick={() => void terminer()}>
          {envoi ? "Un instant…" : "Oui, terminer"}
        </button>
      </div>
    </Fenetre>
  );
}

/* ─────────────────────────────── la ligne d'état ─────────────────────────────── */

/** « Collecte terminée le … : les liens ne reçoivent plus de photos. L'atelier compose. » ; l'oubli en dessous pour le responsable. */
export function LigneFinCollecte({ le, tu, oubli, id }: { le: string | null; tu: boolean; oubli: boolean; id?: string }) {
  const { tete, suite } = partiesCollecteTerminee(le);
  return (
    <div className="ec-fin-ligne" role="status" id={id}>
      <span className="ec-fin-coche" aria-hidden="true">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
          <path d="M5 12l5 5 9-10" />
        </svg>
      </span>
      <span className="ec-fin-texte">
        <span>
          <strong>{tete}</strong> : {suite}
        </span>
        {oubli ? <span className="ec-note">{ligneOubli(tu)}</span> : null}
      </span>
    </div>
  );
}

/* ───────────────────── l'en-tête de la page Photos (Collecte) ───────────────────── */

/**
 * Les boutons qui dépendent de la fin de collecte, posés à côté de « Déposer des photos » :
 * - collecte ouverte : « Terminer la collecte » (discret), pour qui en a le droit ;
 * - collecte terminée : « Déposer des photos » (onglet Photos) ou « Créer un lien » (onglet
 *   Liens) ÉTEINT, avec la raison au survol et pour le lecteur d'écran ; la ligne d'état, juste
 *   dessous, la dit en toutes lettres.
 * `variante="tel"` : le « + » rond de l'en-tête du téléphone (planche 2 du 21/10 : « Déposer » n'est plus un bouton flottant), éteint lui aussi.
 * `variante="ligne"` : « Terminer la collecte » du téléphone, sous l'en-tête (la rangée de l'en-tête n'a pas
 * la place d'un bouton de plus à 375 px).
 */
export function ActionsFinCollecte({
  token,
  tu,
  fin,
  ecrire,
  ouverte,
  onglet,
  photos,
  selection,
  onTermine,
  variante = "ordi",
}: {
  token: string;
  tu: boolean;
  fin: FinDeCollecte;
  /** Peut déposer et créer des liens (le responsable ; jamais l'équipe). */
  ecrire: boolean;
  ouverte: boolean;
  onglet: "photos" | "liens";
  photos: number | null;
  selection: number;
  onTermine: (termineLe: string) => void;
  variante?: "ordi" | "tel" | "ligne";
}) {
  const [fenetre, setFenetre] = useState(false);

  if (!ouverte) {
    if (!ecrire || variante === "ligne") return null;
    if (variante === "tel") {
      if (onglet !== "photos") return null;
      return (
        <button type="button" className="ec-ph-plus ec-ph-plus--eteint ec-ph-tel" disabled title={RAISON_COLLECTE_TERMINEE} aria-describedby={ID_LIGNE_FIN} aria-label="Déposer des photos">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M12 5v14M5 12h14" />
          </svg>
        </button>
      );
    }
    return (
      <button type="button" className={onglet === "photos" ? "ec-bouton ec-bouton--clair ec-bouton--petit ec-ph-ordi" : "ec-bouton ec-bouton--clair ec-bouton--petit"} disabled title={RAISON_COLLECTE_TERMINEE} aria-describedby={ID_LIGNE_FIN}>
        {onglet === "photos" ? "Déposer des photos" : "Créer un lien"}
      </button>
    );
  }

  if (variante === "tel" || !fin.terminer || photos === 0) return null;
  return (
    <>
      <button type="button" className={variante === "ligne" ? "ec-bouton ec-bouton--petit ec-bouton--discret ec-fin-tel ec-ph-tel" : "ec-bouton ec-bouton--petit ec-bouton--discret ec-ph-ordi"} onClick={() => setFenetre(true)}>
        Terminer la collecte
      </button>
      {fenetre ? (
        <FenetreTerminerCollecte
          token={token}
          tu={tu}
          photos={photos}
          selection={selection}
          onFermer={() => setFenetre(false)}
          onFait={(le) => {
            setFenetre(false);
            onTermine(le);
          }}
        />
      ) : null}
    </>
  );
}

"use client";

/* Terminer la collecte, et le DIRE (retour de Mathias, 21/10 ; refait le 22/10, planche 9 « La fin de la collecte, en deux choix »).

   Pièces, partagées par le tableau de bord (`CartePhotos`) et la page Photos (`Collecte`), pour qu'il n'y ait qu'un appel et qu'une phrase :
   - `terminerLaCollecte` : l'appel à `/api/collectif/collecte/terminer` (réservé au responsable, relu par le serveur) ;
   - `ChoixFinCollecte` (22/10) : « Terminer la collecte », atteinte par le « … » de Photos, en UNE feuille du bas à deux choix (au
     téléphone ; une fenêtre au milieu à l'ordinateur) : « Envoyer toutes les photos à l'atelier » (le geste d'aujourd'hui, même route, même
     effet) ou « Choisir d'abord mes préférées » (un mode calme où l'on touche les photos à garder, puis « Envoyer ma sélection »). Le choix
     LUI-MÊME est la confirmation : les trois phrases et les deux boutons (« Pas encore », « Oui, terminer ») de la fenêtre d'avant
     sont partis, une seule phrase reste : « Les liens des participants se ferment. » ;
   - `FenetreTerminerCollecte` : la fenêtre d'AVANT (trois phrases, « Pas encore », « Oui, terminer »), gardée par le tableau de bord, qui ne
     parle pas encore de « préférées » ;
   - `LigneFinCollecte` : la ligne d'état « Collecte terminée le 21 octobre à 11 h 24 : les liens ne reçoivent plus de photos. L'atelier
     compose. » (`finCollecte.ts`) ;
   - `ActionsFinCollecte` : une fois la collecte terminée, à l'ORDINATEUR « Déposer des photos » reste à sa place, ÉTEINT, avec la raison ; au
     TÉLÉPHONE le « + » disparaît (planche 9, vue 11D : « rien ne s'ajoute plus », une pastille calme dit où l'on en est). Le bouton « Terminer
     la collecte » de l'en-tête n'existe plus : il est dans le « … ».
   Les phrases viennent de `@/lib/collectif/finCollecte` (pur, au harnais). */

import { createPortal } from "react-dom";
import { useEffect, useState, useSyncExternalStore } from "react";
import { ligneOubli, partiesCollecteTerminee, phraseAtelierCommence, RAISON_COLLECTE_TERMINEE } from "@/lib/collectif/finCollecte";
import type { FinReponse } from "@/lib/collectif/photosSimples";
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

/** L'appel qui termine la collecte : un seul chemin pour la fenêtre du tableau de bord, la feuille à deux choix et « Envoyer ma sélection ». */
export async function terminerLaCollecte(token: string): Promise<FinReponse> {
  try {
    const rep = await fetch("/api/collectif/collecte/terminer", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ token }) });
    const json = (await rep.json().catch(() => ({}))) as { message?: string; termineLe?: unknown };
    if (!rep.ok) return { ok: false, message: json.message ?? `La collecte n'a pas pu se terminer (erreur ${rep.status}).` };
    return { ok: true, termineLe: typeof json.termineLe === "string" ? json.termineLe : new Date().toISOString() };
  } catch {
    return { ok: false, message: "Le réseau n'a pas répondu. Rien n'a changé." };
  }
}

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
    const r = await terminerLaCollecte(token);
    if (!r.ok) {
      setErreur(r.message);
      setEnvoi(false);
      return;
    }
    onFait(r.termineLe);
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
export function LigneFinCollecte({ le, tu, oubli, id, className }: { le: string | null; tu: boolean; oubli: boolean; id?: string; className?: string }) {
  const { tete, suite } = partiesCollecteTerminee(le);
  return (
    <div className={className ? `ec-fin-ligne ${className}` : "ec-fin-ligne"} role="status" id={id}>
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

/* ───────────────────── la feuille à deux choix (22/10, planche 9, vue 11B) ───────────────────── */

const rien = () => () => {};
const TRACE_ENVOYER = "M4 12l16-8-6 16-3-7z";
const TRACE_COEUR = "M12 20.5s-7.5-4.6-9.2-9.4C1.6 7.6 3.7 4.5 6.9 4.5c2 0 3.6 1.1 5.1 3 1.5-1.9 3.1-3 5.1-3 3.2 0 5.3 3.1 4.1 6.6-1.7 4.8-9.2 9.4-9.2 9.4z";
const TRACE_CHEVRON = "m9 6 6 6-6 6";
const TRACE_FERMER = "M6 6l12 12M18 6 6 18";
const Trait = ({ d, t = 20, epais = 1.8 }: { d: string; t?: number; epais?: number }) => (
  <svg width={t} height={t} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={epais} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d={d} />
  </svg>
);

/**
 * « Terminer la collecte » : DEUX choix et une phrase. Une feuille du bas au téléphone (le choix se fait comme sur iPhone), une fenêtre au milieu
 * à l'ordinateur. « Envoyer toutes les photos à l'atelier » est le geste d'avant : même route, mêmes droits (le responsable seul, relus par le
 * serveur), même effet (les liens des participants se ferment, l'atelier commence avec tout). « Choisir d'abord mes préférées » (`onChoisir`)
 * ouvre le mode calme de la page Photos, qui écrit les cœurs PUIS termine (`envoyerMaSelection`, photosSimples.ts).
 */
export function ChoixFinCollecte({
  token,
  photos,
  telephone,
  onFermer,
  onFait,
  onChoisir,
}: {
  token: string;
  /** Le total reçu, tel que l'écran le connaît ; `null` s'il ne le connaît pas encore. */
  photos: number | null;
  telephone: boolean;
  onFermer: () => void;
  /** La collecte est terminée : l'instant écrit comme clôture (celui que la route a posé). */
  onFait: (termineLe: string) => void;
  onChoisir: () => void;
}) {
  const client = useSyncExternalStore(rien, () => true, () => false);
  const [envoi, setEnvoi] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);

  useEffect(() => {
    if (!telephone) return;
    const html = document.documentElement;
    const avant = html.style.overflow;
    html.style.overflow = "hidden";
    const touche = (e: KeyboardEvent) => {
      if (e.key === "Escape") onFermer();
    };
    window.addEventListener("keydown", touche);
    return () => {
      html.style.overflow = avant;
      window.removeEventListener("keydown", touche);
    };
  }, [telephone, onFermer]);

  async function toutEnvoyer() {
    setEnvoi(true);
    setErreur(null);
    const r = await terminerLaCollecte(token);
    if (!r.ok) {
      setErreur(r.message);
      setEnvoi(false);
      return;
    }
    onFait(r.termineLe);
  }

  const corps = (
    <>
      <button type="button" className="ec-s-choix-fin ec-s-choix-fin--plein" disabled={envoi} onClick={() => void toutEnvoyer()}>
        <i>
          <Trait d={TRACE_ENVOYER} t={26} />
        </i>
        <span>
          <b>{envoi ? "Un instant…" : "Envoyer toutes les photos à l'atelier"}</b>
          {photos !== null ? <small>{photos.toLocaleString("fr-FR")} photo{photos > 1 ? "s" : ""}</small> : null}
        </span>
      </button>
      <button type="button" className="ec-s-choix-fin" disabled={envoi} onClick={onChoisir}>
        <i>
          <Trait d={TRACE_COEUR} t={26} />
        </i>
        <span>
          <b>Choisir d&apos;abord mes préférées</b>
          <small>Puis envoyer ma sélection</small>
        </span>
        <Trait d={TRACE_CHEVRON} t={18} epais={2.2} />
      </button>
      {erreur ? (
        <p className="ec-note ec-note--erreur" role="alert">
          {erreur}
        </p>
      ) : null}
      <p className="ec-s-pied-feuille">Les liens des participants se ferment.</p>
    </>
  );

  if (!telephone) {
    return (
      <Fenetre titre="Terminer la collecte" onFermer={onFermer}>
        <div className="ec-s-fin-choix">{corps}</div>
      </Fenetre>
    );
  }
  const hote = client ? document.querySelector(".ec-contenu") : null;
  if (!hote) return null;
  return createPortal(
    <div className="ec-s-voile" role="presentation" onClick={onFermer}>
      <div className="ec-s-feuille" role="dialog" aria-modal="true" aria-label="Terminer la collecte" onClick={(e) => e.stopPropagation()}>
        <div className="ec-s-poignee" aria-hidden="true" />
        <div className="ec-s-feuille-tete">
          <h2 className="ec-s-feuille-titre">Terminer la collecte</h2>
          <button type="button" className="ec-s-rond" aria-label="Fermer" onClick={onFermer}>
            <Trait d={TRACE_FERMER} t={18} epais={2.2} />
          </button>
        </div>
        {corps}
      </div>
    </div>,
    hote
  );
}

/* ───────────────────── l'en-tête de la page Photos (Collecte) ───────────────────── */

/**
 * Collecte terminée : à l'ORDINATEUR « Déposer des photos » ne disparaît pas, il est ÉTEINT, avec la raison au survol et pour le lecteur d'écran ;
 * la ligne d'état, juste dessous, la dit en toutes lettres. Au TÉLÉPHONE (22/10, planche 9, vue 11D) le « + » n'est plus montré : une pastille
 * calme sous le titre dit « Collecte terminée le … ». Collecte ouverte : rien (le « + » vit dans la page, « Terminer la collecte » dans le « … »).
 */
export function ActionsFinCollecte({ ecrire, ouverte, variante = "ordi" }: { ecrire: boolean; ouverte: boolean; variante?: "ordi" | "tel" }) {
  if (ouverte || !ecrire || variante === "tel") return null;
  return (
    <button type="button" className="ec-bouton ec-bouton--clair ec-bouton--petit ec-ph-ordi" disabled title={RAISON_COLLECTE_TERMINEE} aria-describedby={ID_LIGNE_FIN}>
      Déposer des photos
    </button>
  );
}

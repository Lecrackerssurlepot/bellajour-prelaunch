/**
 * La mémoire côté navigateur (lot 2, G1, G2, G6). Les leçons s'accumulent dans l'état (`etat.lecons`) ; ce crochet les
 * envoie par lots à `/api/admin/atelier/mise-en-page/lecons`, trois secondes après le dernier geste, et les retire de
 * l'état quand le serveur les a prises. Un refus (table absente, réseau) les laisse en place : on réessaie au geste
 * suivant ou une minute plus tard. Rien ne bloque l'écran, rien ne se dit à l'atelier.
 *
 * À l'ouverture, un jalon « ouverture » ; à la fin d'un export, un jalon « export » ET l'instantané du magazine (G2).
 * Les leçons non envoyées ne survivent pas à la fermeture de l'onglet : c'est une mémoire best-effort, pas un journal
 * comptable (les instantanés, eux, sont renvoyés à chaque export).
 */

import { useEffect, useRef } from "react";
import { instantane, jalon, reponse, troisQuestions, type EtatEditeur, type Geste, type Lecon } from "@/lib/mise-en-page/editeur";

const ROUTE = "/api/admin/atelier/mise-en-page/lecons";
const ATTENTE_MS = 3000;
const REPRISE_MS = 60_000;
const LOT = 200;
/* un seul envoi à la fois pour tout l'onglet : deux lots en vol enverraient les mêmes leçons deux fois */
let enVol = false;
/* G3 : les leçons envoyées pendant cette séance, pour en tirer trois questions à la fin d'un export */
const historique: Lecon[] = [];

async function envoyerLot(cle: string, lecons: Lecon[], inst?: ReturnType<typeof instantane>): Promise<boolean> {
  try {
    const quand = new Date().toISOString();
    const rep = await fetch(ROUTE, {
      method: "POST", credentials: "same-origin", headers: { "content-type": "application/json" },
      body: JSON.stringify({ cle, lecons: lecons.map((lecon) => ({ lecon, quand })), ...(inst ? { instantane: inst } : {}) }),
    });
    return rep.ok;
  } catch { return false; }
}

export type Memoire = {
  /** À appeler quand un export a abouti : jalon + instantané. `format` : Affinity (IDML, par défaut) ou Canva (PDF, 11/11). */
  exporte: (dossier: string, format?: "IDML" | "PDF") => void;
  /** G3 : au plus trois questions tirées des gestes contraires de la séance. */
  questions: () => Lecon[];
  /** G3 : la réponse de l'atelier, envoyée comme une leçon. */
  repondre: (q: Lecon, choix: "machine" | "atelier" | "depend", note: string) => void;
};

export function useLecons(cle: string, etat: EtatEditeur | null, envoyer: (g: Geste) => void): Memoire {
  const etatRef = useRef(etat);
  const envoyerRef = useRef(envoyer);
  useEffect(() => { etatRef.current = etat; envoyerRef.current = envoyer; });
  const ouvert = useRef(false);

  /* le jalon d'ouverture, une fois l'état là */
  useEffect(() => {
    if (!etat || ouvert.current) return;
    ouvert.current = true;
    envoyerRef.current({ type: "ajouterLecon", lecon: jalon("ouverture", "ouverture du projet") });
  }, [etat]);

  const n = etat?.lecons.length ?? 0;
  useEffect(() => {
    if (!n) return;
    let annule = false;
    const partir = async () => {
      if (annule || enVol) return;
      const e = etatRef.current;
      if (!e || !e.lecons.length) return;
      enVol = true;
      const lot = e.lecons.slice(0, LOT);
      const ok = await envoyerLot(cle, lot);
      enVol = false;
      if (annule) return;
      if (ok) { historique.push(...lot); envoyerRef.current({ type: "leconsEnvoyees", n: lot.length }); }
      else setTimeout(() => { if (!annule) void partir(); }, REPRISE_MS);
    };
    const t = setTimeout(() => { void partir(); }, ATTENTE_MS);
    return () => { annule = true; clearTimeout(t); };
  }, [n, cle]);

  const exporte = (dossier: string, format: "IDML" | "PDF" = "IDML") => {
    const e = etatRef.current;
    if (!e) return;
    const j = jalon("export", `export ${format} · ${dossier}`);
    envoyerRef.current({ type: "ajouterLecon", lecon: j });
    /* l'instantané part tout de suite, avec le jalon, sans attendre le lot : c'est le moment qui compte */
    void envoyerLot(cle, [j], instantane(e));
  };
  const questions = () => troisQuestions([...historique, ...(etatRef.current?.lecons ?? [])]);
  const repondre = (q: Lecon, choix: "machine" | "atelier" | "depend", note: string) => {
    const r = reponse(q, choix, note);
    void envoyerLot(cle, [r]).then((ok) => { if (!ok) envoyerRef.current({ type: "ajouterLecon", lecon: r }); });
  };
  return { exporte, questions, repondre };
}

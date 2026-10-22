"use client";

/* Le choix des photos dans la photothèque, sans silence (22/10).

   Sur iPhone, une grande sélection (50 photos et plus) pouvait finir ainsi :
   un long « préparation » dans la photothèque, qui se ferme, et RIEN à
   l'écran. Le code de la page lit bien chaque fichier rendu ; c'est l'iPhone
   qui n'en rend aucun. Quatre façons, que l'écran distingue désormais par un
   repère à recopier dans le ticket :
   - « vide » : l'événement arrive avec zéro fichier ;
   - « annule » : l'iPhone annule le choix après une longue attente ;
   - « rien » : la page revient au premier plan et aucun événement ne suit ;
   - « recharge » : la page s'est relancée pendant le choix (la marque posée
     au clic, en sessionStorage, survit au rechargement).
   Une annulation RAPIDE est celle du client qui change d'avis : elle se tait. */

import { useCallback, useEffect, useRef, useState, type ChangeEvent } from "react";
import { useValeurClient } from "@/hooks/useClient";

export type Silence = "vide" | "annule" | "rien" | "recharge";

const MARQUE = "bj-selecteur-ouvert";
/** Au-delà, une annulation ou un retour sans fichier n'est plus le geste du client : la photothèque a travaillé. */
const ATTENTE_LONGUE_MS = 4_000;
/** Le délai laissé à l'événement `change` après le retour de la page au premier plan. */
const GRACE_MS = 2_000;
/** Une marque plus vieille n'est pas ce choix-là (un onglet rouvert le lendemain). */
const MARQUE_MAX_MS = 10 * 60_000;

function poserMarque(quand: number | null) {
  try {
    if (quand === null) sessionStorage.removeItem(MARQUE);
    else sessionStorage.setItem(MARQUE, String(quand));
  } catch {
    /* Navigation privée ou stockage bloqué : le rechargement ne sera pas reconnu, le reste marche. */
  }
}

/* Lue UNE fois par chargement de page, puis effacée : une primitive stable pour `useValeurClient`. */
let interrompue: boolean | null = null;
function lireInterruption(): boolean {
  if (interrompue === null) {
    try {
      const lu = Number(sessionStorage.getItem(MARQUE));
      sessionStorage.removeItem(MARQUE);
      interrompue = lu > 0 && Date.now() - lu < MARQUE_MAX_MS;
    } catch {
      interrompue = false;
    }
  }
  return interrompue;
}

/** La page s'est-elle relancée pendant un choix de photos ? `false` au rendu du serveur. */
export function useSelecteurInterrompu(): boolean {
  return useValeurClient(lireInterruption, false);
}

/** La phrase d'un choix revenu vide, et son repère. */
export function phraseSilence(s: Silence, tu: boolean): string {
  const v = (vous: string, toi: string) => (tu ? toi : vous);
  const conseil = v(
    "Sur iPhone, une grande sélection peut échouer sans un mot, surtout quand des photos sont dans iCloud : choisissez-les par petits paquets.",
    "Sur iPhone, une grande sélection peut échouer sans un mot, surtout quand des photos sont dans iCloud : choisis-les par petits paquets."
  );
  const constat = s === "recharge" ? "La page s'est relancée pendant le choix des photos, rien n'est parti." : "Aucune photo n'est arrivée de la photothèque.";
  return `${constat} ${conseil} (repère : ${s})`;
}

export function useSelecteur(recevoir: (fichiers: File[]) => void, { rechargement = false }: { rechargement?: boolean } = {}) {
  const champ = useRef<HTMLInputElement>(null);
  const ouvertLe = useRef(0);
  const [silence, setSilence] = useState<Silence | null>(null);
  /* Le rechargement se dit jusqu'au prochain choix (seulement là où on le demande : une seule lecture par page). */
  const interrompu = useSelecteurInterrompu();
  const [rechargeVue, setRechargeVue] = useState(false);

  const finir = useCallback(() => {
    ouvertLe.current = 0;
    poserMarque(null);
  }, []);

  const longue = useCallback(() => ouvertLe.current > 0 && Date.now() - ouvertLe.current > ATTENTE_LONGUE_MS, []);

  useEffect(() => {
    let attente: ReturnType<typeof setTimeout> | null = null;
    const retour = () => {
      if (document.visibilityState !== "visible" || !ouvertLe.current) return;
      if (attente) clearTimeout(attente);
      attente = setTimeout(() => {
        if (!ouvertLe.current) return;
        if (longue()) setSilence("rien");
        finir();
      }, GRACE_MS);
    };
    window.addEventListener("focus", retour);
    document.addEventListener("visibilitychange", retour);
    return () => {
      if (attente) clearTimeout(attente);
      window.removeEventListener("focus", retour);
      document.removeEventListener("visibilitychange", retour);
    };
  }, [finir, longue]);

  const ouvrir = useCallback(() => {
    const maintenant = Date.now();
    ouvertLe.current = maintenant;
    poserMarque(maintenant);
    setSilence(null);
    setRechargeVue(true);
    champ.current?.click();
  }, []);

  /** Le `onChange` du champ : les fichiers sont COPIÉS avant la remise à zéro (qui vide la liste). */
  const surChangement = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      const fichiers = e.target.files ? [...e.target.files] : [];
      e.target.value = "";
      const apresAttente = longue();
      finir();
      if (fichiers.length) {
        setSilence(null);
        recevoir(fichiers);
      } else if (apresAttente) setSilence("vide");
    },
    [recevoir, finir, longue]
  );

  /* L'événement `cancel` du champ (Safari 16.4 et plus) : une annulation après une longue attente n'est pas celle du
     client. Écouté sur l'élément : React ne relaie `onCancel` que pour un `<dialog>`. */
  const brancher = useCallback(
    (el: HTMLInputElement | null) => {
      champ.current = el;
      if (!el) return;
      const annule = () => {
        if (longue()) setSilence("annule");
        finir();
      };
      el.addEventListener("cancel", annule);
      return () => el.removeEventListener("cancel", annule);
    },
    [finir, longue]
  );

  /** À étaler sur le champ : `<input type="file" {...champ} />`. */
  const dit = silence ?? (rechargement && interrompu && !rechargeVue ? "recharge" : null);
  return { champ: { ref: brancher, onChange: surChangement }, ouvrir, silence: dit };
}

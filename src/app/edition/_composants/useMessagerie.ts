"use client";

/* Le fil d'une messagerie qui se met à jour seul (PRD §7), partagé par
   l'espace client et la fiche de l'atelier.

   Interrogation QUAND L'ONGLET EST VISIBLE, rien quand il est caché,
   rattrapage immédiat au retour (patron Rafraichissement.tsx). Depuis T-169,
   l'attente suit les paliers de `intervalleMessages` (messages.ts) : 3,5 s
   juste après un mouvement, puis 10 s, 30 s, 60 s quand rien ne bouge. Un
   mouvement (l'ouverture, un message reçu ou envoyé, une frappe dans la page,
   le retour sur l'onglet) ramène aussitôt au palier rapide : la relève qui
   était prévue plus tard est avancée, jamais reculée. Une seule relève à la
   fois, une seule minuterie (un `setTimeout` réarmé après chaque lecture,
   jamais un `setInterval` qui empilerait les appels d'un réseau lent).
   Les messages s'ajoutent sans doublon (fusionnerMessages). Un message
   envoyé s'affiche dès que le serveur l'a écrit, jamais avant : pas de
   bulle « envoyée » qui n'existerait pas en base.

   `marquerLus` est appelé par un EFFET, jamais au rendu : un préchargement
   de page ne doit pas faire croire que quelqu'un a lu. Il reçoit la date du
   dernier message AFFICHÉ (T-188) : l'atelier borne ainsi son marquage à ce
   qu'il a sous les yeux. L'espace client ignore cet argument : rien n'y change. */

import { useCallback, useEffect, useRef, useState } from "react";
import { curseur, fusionnerMessages, INTERVALLE_MESSAGES_MS, intervalleMessages, type Message } from "@/lib/collectif/messages";

/** Ce qui accompagne un message (révision §14.5) : un document cité, un fichier joint, un envoi cité, et le message auquel il RÉPOND (T-152). */
export type Joint = { documentId: string | null; fichier: File | null; contenuId?: string | null; reponseA?: string | null };

type Options = {
  initiaux: Message[];
  /** Les messages arrivés après `depuis` ; `null` si l'appel a échoué. */
  charger: (depuis: string | null) => Promise<Message[] | null>;
  /** Écrit un message ; rend le message écrit, ou une phrase d'erreur. */
  envoyer: (texte: string, joint?: Joint) => Promise<Message | string>;
  /** Le camp qui lit : on marque lus les messages de L'AUTRE camp. */
  lecteur: "client" | "atelier";
  /** `jusqua` : la date du dernier message affiché (le fil au rendu, puis le dernier arrivé en direct). */
  marquerLus?: (jusqua: string | null) => Promise<void>;
};

export function useMessagerie(o: Options) {
  const [messages, setMessages] = useState<Message[]>(o.initiaux);
  const [erreur, setErreur] = useState<string | null>(null);
  const [envoi, setEnvoi] = useState(false);
  const dernier = useRef<string | null>(curseur(o.initiaux));
  const options = useRef(o);
  /* L'instant du dernier MOUVEMENT (horloge du navigateur), posé à l'ouverture par l'effet. */
  const mouvement = useRef(0);
  /* Avancer la prochaine relève : branché par l'effet de la relève, inerte avant lui. */
  const reveiller = useRef<() => void>(() => {});
  useEffect(() => {
    options.current = o;
  });

  const ajouter = useCallback((nouveaux: Message[]) => {
    if (!nouveaux.length) return;
    setMessages((deja) => {
      const tout = fusionnerMessages(deja, nouveaux);
      dernier.current = curseur(tout);
      return tout;
    });
    /* Un message reçu ou envoyé est un mouvement : la conversation est vivante. */
    reveiller.current();
    if (nouveaux.some((m) => m.auteur !== options.current.lecteur)) void options.current.marquerLus?.(curseur(fusionnerMessages([], nouveaux)));
  }, []);

  useEffect(() => {
    let minuteur: ReturnType<typeof setTimeout> | null = null;
    /* L'instant où la relève armée partira : un mouvement ne l'avance que si elle part plus tard que le palier rapide. */
    let prevueA = 0;
    let enCours = false;
    let monte = true;
    const visible = () => document.visibilityState === "visible";
    const desarmer = () => {
      if (minuteur) clearTimeout(minuteur);
      minuteur = null;
    };
    const armer = () => {
      desarmer();
      if (!monte || !visible()) return;
      const attente = intervalleMessages(Date.now() - mouvement.current);
      prevueA = Date.now() + attente;
      minuteur = setTimeout(() => {
        minuteur = null;
        void relire();
      }, attente);
    };
    const relire = async () => {
      if (!monte || !visible() || enCours) return;
      enCours = true;
      try {
        const nouveaux = await options.current.charger(dernier.current);
        if (nouveaux && monte) ajouter(nouveaux);
      } catch {
        /* une relève ratée attend la suivante */
      } finally {
        enCours = false;
      }
      armer();
    };
    const bouger = () => {
      mouvement.current = Date.now();
      /* Pendant une lecture, `armer` repartira de ce mouvement à son retour. */
      if (!monte || !visible() || enCours) return;
      if (!minuteur || prevueA - Date.now() > INTERVALLE_MESSAGES_MS) armer();
    };
    const auRetour = () => {
      /* Caché : plus rien. Visible : la minuterie en cours est levée AVANT de relire (sinon elle relirait une fois de trop). */
      desarmer();
      if (!visible()) return;
      mouvement.current = Date.now();
      void relire();
    };
    mouvement.current = Date.now();
    reveiller.current = bouger;
    armer();
    document.addEventListener("visibilitychange", auRetour);
    /* La frappe, où qu'elle soit dans la page (le champ du message, celui d'une demande) : un mouvement. */
    document.addEventListener("input", bouger, true);
    return () => {
      monte = false;
      desarmer();
      reveiller.current = () => {};
      document.removeEventListener("visibilitychange", auRetour);
      document.removeEventListener("input", bouger, true);
    };
  }, [ajouter]);

  /* À l'ouverture : ce que l'autre camp a écrit est désormais lu. */
  useEffect(() => {
    if (options.current.initiaux.some((m) => m.auteur !== options.current.lecteur)) void options.current.marquerLus?.(curseur(fusionnerMessages([], options.current.initiaux)));
  }, []);

  const envoyer = useCallback(
    async (texte: string, joint?: Joint): Promise<boolean> => {
      setEnvoi(true);
      setErreur(null);
      try {
        const r = await options.current.envoyer(texte, joint);
        if (typeof r === "string") {
          setErreur(r);
          return false;
        }
        ajouter([r]);
        return true;
      } finally {
        setEnvoi(false);
      }
    },
    [ajouter]
  );

  /* `ajouter` : un message écrit par une AUTRE route (une demande, une réponse
     à une proposition) entre au fil sans attendre la relève. */
  return { messages, envoyer, envoi, erreur, ajouter };
}

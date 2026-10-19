"use client";

/* Le fil d'une messagerie qui se met à jour seul (PRD §7), partagé par
   l'espace client et la fiche de l'atelier.

   Interrogation toutes les 3,5 s QUAND L'ONGLET EST VISIBLE, rien quand il
   est caché, rattrapage immédiat au retour (patron Rafraichissement.tsx).
   Les messages s'ajoutent sans doublon (fusionnerMessages). Un message
   envoyé s'affiche dès que le serveur l'a écrit, jamais avant : pas de
   bulle « envoyée » qui n'existerait pas en base.

   `marquerLus` est appelé par un EFFET, jamais au rendu : un préchargement
   de page ne doit pas faire croire que quelqu'un a lu. Il reçoit la date du
   dernier message AFFICHÉ (T-188) : l'atelier borne ainsi son marquage à ce
   qu'il a sous les yeux. L'espace client ignore cet argument : rien n'y change. */

import { useCallback, useEffect, useRef, useState } from "react";
import { curseur, fusionnerMessages, INTERVALLE_MESSAGES_MS, type Message } from "@/lib/collectif/messages";

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
    if (nouveaux.some((m) => m.auteur !== options.current.lecteur)) void options.current.marquerLus?.(curseur(fusionnerMessages([], nouveaux)));
  }, []);

  useEffect(() => {
    let minuteur: ReturnType<typeof setInterval> | null = null;
    let enCours = false;
    const relire = async () => {
      if (enCours) return;
      enCours = true;
      const nouveaux = await options.current.charger(dernier.current);
      enCours = false;
      if (nouveaux) ajouter(nouveaux);
    };
    const armer = () => {
      if (minuteur) clearInterval(minuteur);
      minuteur = document.visibilityState === "visible" ? setInterval(relire, INTERVALLE_MESSAGES_MS) : null;
    };
    const auRetour = () => {
      armer();
      if (document.visibilityState === "visible") void relire();
    };
    armer();
    document.addEventListener("visibilitychange", auRetour);
    return () => {
      if (minuteur) clearInterval(minuteur);
      document.removeEventListener("visibilitychange", auRetour);
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

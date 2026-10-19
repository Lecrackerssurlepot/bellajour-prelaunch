"use client";

/* Le flux d'envoi de « Votre espace est prêt », en DEUX TEMPS (T-146) : vérifier
   (à qui, quel objet, les mails sont-ils ouverts ? rien ne part), puis confirmer.
   Partagé par l'onglet « Réglages et liens » (`EnvoiLienResponsable`) et l'écran
   « L'édition est créée » (`FinCreation`, T-187) : une seule façon d'envoyer.
   Tant que `COLLECTIF_MAILS` est fermé, la route répond « coupe » et rien ne part. */

import { useState } from "react";

export type VerifEnvoi = { a: string; sujet: string; ouverts: boolean; interrupteur: string };

export const PHRASE_ETAT: Record<string, string> = {
  envoye: "Mail parti. Le journal le note.",
  deja: "Ce lien a déjà été envoyé. « Renvoyer quand même » le renvoie.",
  coupe: "Rien n'est parti : les mails des éditions sont coupés.",
  echec: "Brevo a refusé le mail : rien n'est parti, on peut réessayer.",
};

export function useEnvoiEspace(id: string) {
  const [verif, setVerif] = useState<VerifEnvoi | null>(null);
  const [etat, setEtat] = useState<string | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);
  const [envoi, setEnvoi] = useState(false);

  async function appeler(corps: Record<string, unknown>) {
    setEnvoi(true);
    setErreur(null);
    try {
      const rep = await fetch(`/api/admin/collectif/editions/${id}/mail-espace`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(corps),
      });
      const json = (await rep.json().catch(() => ({}))) as Partial<VerifEnvoi> & { etat?: string; message?: string };
      if (!rep.ok && !json.etat) {
        setErreur(json.message ?? `Refusé (erreur ${rep.status}). Rien n'est parti.`);
        return;
      }
      if (corps.verifier) setVerif(json as VerifEnvoi);
      else {
        setEtat(json.etat ?? null);
        setVerif(null);
      }
    } catch {
      setErreur("Le réseau n'a pas répondu. Rien n'est parti.");
    } finally {
      setEnvoi(false);
    }
  }

  return {
    verif,
    etat,
    erreur,
    envoi,
    verifier: () => appeler({ verifier: true }),
    confirmer: () => appeler({}),
    renvoyer: () => appeler({ renvoyer: true }),
    annuler: () => setVerif(null),
  };
}

"use client";

/* Le pont React du moteur d'envoi : un abonnement, une vue mise en cache
   par version (useSyncExternalStore), et l'avertissement de fermeture de
   page tant qu'un envoi est en cours. */

import { useEffect, useSyncExternalStore } from "react";
import type { MoteurDepot, Vue } from "./moteur";

const VUE_VIDE: Vue = { total: 0, arrivees: 0, dejaLa: 0, enCours: 0, refusees: 0, erreurs: 0, raisons: [], ferme: null, horsLigne: false, ignores: 0 };

export function useMoteur(moteur: MoteurDepot | null): Vue {
  const vue = useSyncExternalStore(
    moteur?.abonner ?? (() => () => {}),
    moteur?.vue ?? (() => VUE_VIDE),
    () => VUE_VIDE
  );

  useEffect(() => {
    if (!moteur) return;
    const avant = (e: BeforeUnloadEvent) => {
      if (moteur.occupe()) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", avant);
    return () => window.removeEventListener("beforeunload", avant);
  }, [moteur]);

  return vue;
}

/** Tous les fichiers d'un glisser-déposer, dossiers compris (webkitGetAsEntry). */
export async function fichiersDuDepot(donnees: DataTransfer): Promise<File[]> {
  const entrees = [...donnees.items]
    .map((i) => (typeof i.webkitGetAsEntry === "function" ? i.webkitGetAsEntry() : null))
    .filter((e): e is FileSystemEntry => Boolean(e));
  if (!entrees.length) return [...donnees.files];
  const fichiers: File[] = [];
  const parcourir = async (e: FileSystemEntry): Promise<void> => {
    if (e.isFile) {
      const f = await new Promise<File | null>((r) => (e as FileSystemFileEntry).file(r, () => r(null)));
      if (f) fichiers.push(f);
      return;
    }
    if (e.isDirectory) {
      const lecteur = (e as FileSystemDirectoryEntry).createReader();
      /* readEntries rend les entrées par paquets : on lit jusqu'au paquet vide. */
      for (;;) {
        const paquet = await new Promise<FileSystemEntry[]>((r) => lecteur.readEntries(r, () => r([])));
        if (!paquet.length) break;
        for (const enfant of paquet) await parcourir(enfant);
      }
    }
  };
  for (const e of entrees) await parcourir(e);
  return fichiers;
}

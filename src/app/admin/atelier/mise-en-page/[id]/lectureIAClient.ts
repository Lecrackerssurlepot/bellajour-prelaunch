/**
 * La lecture IA côté navigateur (lot F, 14/11) : gardée AVEC LE PROJET dans ce navigateur (IndexedDB, clé = la clé locale du
 * projet, `cleLocale`), comme les mesures : elle revient au rechargement, sans rien écrire en base ni toucher à la sauvegarde
 * du magazine. Relue par le validateur à chaque ouverture (un fichier d'un ancien format est oublié sans bruit).
 * Best-effort : sans IndexedDB (navigation privée), la lecture vaut pour la séance.
 */

import { useEffect, useRef } from "react";
import { lireLectureIA, type Geste, type LectureIA } from "@/lib/mise-en-page/editeur";

const BASE = "bj-mep-lecture-ia";
const MAGASIN = "lectures";

let basePromise: Promise<IDBDatabase | null> | null = null;
function base(): Promise<IDBDatabase | null> {
  if (basePromise) return basePromise;
  basePromise = new Promise((ok) => {
    try {
      const r = indexedDB.open(BASE, 1);
      r.onupgradeneeded = () => { r.result.createObjectStore(MAGASIN); };
      r.onsuccess = () => ok(r.result);
      r.onerror = () => ok(null);
    } catch { ok(null); }
  });
  return basePromise;
}

/** Garde (ou oublie, `null`) la lecture IA de ce projet. */
export async function garderLectureIA(cle: string, lecture: LectureIA | null): Promise<void> {
  const b = await base();
  if (!b) return;
  try {
    const s = b.transaction(MAGASIN, "readwrite").objectStore(MAGASIN);
    if (lecture) s.put(lecture, cle); else s.delete(cle);
  } catch { /* stockage refusé : la lecture vaut pour la séance */ }
}

async function lireGardee(cle: string): Promise<LectureIA | null> {
  const b = await base();
  if (!b) return null;
  return new Promise((ok) => {
    try {
      const r = b.transaction(MAGASIN, "readonly").objectStore(MAGASIN).get(cle);
      r.onsuccess = () => { const v = lireLectureIA(r.result as unknown); ok(v.ok ? v.lecture : null); };
      r.onerror = () => ok(null);
    } catch { ok(null); }
  });
}

/** À l'ouverture du projet (une fois l'état prêt) : la lecture IA gardée revient dans l'état. */
export function useLectureIAGardee(cle: string, pret: boolean, envoyer: (g: Geste) => void): void {
  const fait = useRef<string | null>(null);
  const envoyerRef = useRef(envoyer);
  useEffect(() => { envoyerRef.current = envoyer; });
  useEffect(() => {
    if (!pret || fait.current === cle) return;
    fait.current = cle;
    void lireGardee(cle).then((l) => { if (l) envoyerRef.current({ type: "poserLectureIA", lecture: l }); });
  }, [cle, pret]);
}

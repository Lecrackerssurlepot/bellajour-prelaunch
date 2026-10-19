/* Le nombre de conversations qui attendent l'atelier (T-188), côté navigateur.

   UN magasin de module, lu par `useSyncExternalStore` : les deux pastilles de
   la barre, le titre de l'onglet et la conversation ouverte lisent la MÊME
   valeur, et une seule lecture réseau sert toute la page. Il survit aux
   navigations entre écrans (le module reste chargé) : la barre d'un écran qui
   ne compte pas lui-même (Styles, Agendas, Nouvelle édition, Bon à tirer)
   montre aussitôt le dernier compte connu.

   Chaque valeur porte l'instant SERVEUR de sa lecture (`le`, ISO). Deux sources
   la nourrissent : le rendu de la page (le compte lu avec elle) et la route
   GET `/api/admin/collectif/en-attente`. La plus récente gagne, sans jamais
   comparer à l'horloge du navigateur. Aucun setState dans un effet : ce module
   n'est écrit que par une réponse réseau. */

import { plusRecent, type Lecture } from "@/lib/collectif/nouveaux";

export { plusRecent };
export type { Lecture };

export const ROUTE_EN_ATTENTE = "/api/admin/collectif/en-attente";

/** Une minute, comme la table de travail (Rafraichissement.tsx) : quelques messages par jour, pas une salle de marché. */
export const PERIODE_MS = 60_000;

/** Au retour sur l'onglet, pas de relecture si l'on vient d'en faire une. */
export const REPOS_MIN_MS = 20_000;

const VIDE: Lecture = { n: null, le: "" };
let courant: Lecture = VIDE;
let dernierSignal = 0;
const abonnes = new Set<() => void>();

export function abonner(f: () => void): () => void {
  abonnes.add(f);
  return () => {
    abonnes.delete(f);
  };
}
export const lireMagasin = (): Lecture => courant;
export const lireMagasinServeur = (): Lecture => VIDE;

function publier(n: number, le: string) {
  if (le <= courant.le) return;
  courant = { n, le };
  for (const f of abonnes) f();
}

/** Le temps écoulé depuis la dernière lecture (ou le dernier rendu qui a compté), horloge du navigateur. */
export function depuisDernierSignal(): number {
  return Date.now() - dernierSignal;
}

/** Une page qui a compté au serveur vaut une lecture fraîche : pas de relecture immédiate derrière elle. */
export function signalerLecture() {
  dernierSignal = Date.now();
}

/** Relit le compte (GET, cookie admin). Rend le nombre lu, ou `null` si la route n'a pas répondu. */
export async function relireCompte(): Promise<number | null> {
  dernierSignal = Date.now();
  try {
    const rep = await fetch(ROUTE_EN_ATTENTE, { cache: "no-store" });
    if (!rep.ok) return null;
    const json = (await rep.json()) as { conversations?: unknown; le?: unknown };
    if (typeof json.conversations !== "number" || typeof json.le !== "string") return null;
    publier(json.conversations, json.le);
    return json.conversations;
  } catch {
    return null;
  }
}

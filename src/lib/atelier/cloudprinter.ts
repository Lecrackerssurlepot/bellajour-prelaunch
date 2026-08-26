/**
 * Le client Cloudprinter — la partie RÉSEAU (PRD §13, phase 2).
 *
 * ══════════════════════════════════════════════════════════════════════════
 * Ce module ne décide RIEN : le contenu de la commande vient d'impression.ts
 * (pur), la séquence vient de la route de transition. Ici, seulement l'appel
 * HTTP, la clé API, et la traduction des réponses en résultats.
 *
 * CONTRAT : aucune fonction ne throw. Un échec réseau, un refus, une clé
 * absente — tout rend un résultat que l'appelant peut afficher. La route de
 * transition en fait un 422/502 propre ; un throw en ferait un 500 muet.
 *
 * La clé vit dans CLOUDPRINTER_API_KEY (jamais dans le code — règle absolue
 * du dépôt). Absente = MODE MANUEL : la transition « Envoyer à l'impression »
 * passe sans commander, comme avant ce lot. C'est ce qui permet de brancher
 * la sandbox sur la preview sans toucher la production.
 * ══════════════════════════════════════════════════════════════════════════
 */

import type { PayloadCommande } from "./impression";

const BASE = "https://api.cloudprinter.com/cloudcore/1.0";

/* Une fonction Vercel qui attend Cloudprinter sans borne finit en timeout de
   plateforme, ce qui s'affiche côté écran comme une erreur anonyme. Dix
   secondes : leur API répond en une, et au-delà c'est un incident chez eux. */
const TIMEOUT_MS = 10_000;

export function cloudprinterConfigure(): { pret: boolean } {
  return { pret: Boolean(process.env.CLOUDPRINTER_API_KEY) };
}

type Refus = { ok: false; code: "reference_existante" | "refus" | "reseau"; message: string };

async function poster(chemin: string, corps: Record<string, unknown>): Promise<
  { ok: true; statut: number; corps: Record<string, unknown> } | Refus
> {
  const apikey = process.env.CLOUDPRINTER_API_KEY;
  if (!apikey) return { ok: false, code: "refus", message: "CLOUDPRINTER_API_KEY absente." };

  try {
    const reponse = await fetch(`${BASE}/${chemin}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...corps, apikey }),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });

    const texte = await reponse.text();
    let json: Record<string, unknown> = {};
    try {
      json = JSON.parse(texte) as Record<string, unknown>;
    } catch {
      /* Un corps illisible avec un statut 2xx reste un succès sans détail. */
    }

    if (reponse.ok) return { ok: true, statut: reponse.status, corps: json };

    /* Leur format d'erreur réel (vérifié le 26/08) est
       `{"error": {"type": "...", "info": "..."}}` — la doc montrait un
       `message` plat. On lit les deux : un refus doit se LIRE à l'écran,
       pas s'afficher en « HTTP 400 » muet. */
    const erreur = (json.error && typeof json.error === "object" ? json.error : {}) as Record<string, unknown>;
    const message =
      (typeof json.message === "string" && json.message) ||
      [erreur.type, erreur.info].filter((v) => typeof v === "string" && v).join(" : ") ||
      `HTTP ${reponse.status}`;

    /* La commande existe déjà sous cette référence : ce n'est PAS un échec,
       c'est notre idempotence distante qui joue (deux clics en course). Le
       libellé exact du message n'est pas documenté — on reconnaît large. */
    const existante =
      reponse.status === 409 || /already|exist|duplicate|reference/i.test(message);

    return {
      ok: false,
      code: existante && chemin === "orders/add" ? "reference_existante" : "refus",
      message: message.slice(0, 300),
    };
  } catch (err) {
    return {
      ok: false,
      code: "reseau",
      message: ((err as Error)?.message ?? "réseau").slice(0, 300),
    };
  }
}

/**
 * Passe la commande. `orderId` est l'identifiant Cloudprinter si leur
 * réponse en porte un, sinon notre référence — les deux permettent de
 * retrouver la commande (`orders/info` interroge par référence).
 */
export async function creerCommande(
  payload: PayloadCommande
): Promise<{ ok: true; orderId: string } | Refus> {
  const r = await poster("orders/add", payload as unknown as Record<string, unknown>);
  if (!r.ok) return r;

  const corps = r.corps;
  const orderId =
    (typeof corps.order === "string" && corps.order) ||
    (typeof corps.id === "string" && corps.id) ||
    (typeof corps.order_reference === "string" && corps.order_reference) ||
    payload.reference;

  return { ok: true, orderId };
}

/**
 * Le statut d'une commande existante — sert au rattrapage quand `orders/add`
 * refuse une référence déjà utilisée : la commande est chez eux, il ne nous
 * manque que son identifiant.
 */
export async function infoCommande(
  reference: string
): Promise<{ ok: true; orderId: string; corps: Record<string, unknown> } | Refus> {
  const r = await poster("orders/info", { reference });
  if (!r.ok) return r;

  const corps = r.corps;
  const orderId =
    (typeof corps.order === "string" && corps.order) ||
    (typeof corps.id === "string" && corps.id) ||
    reference;

  return { ok: true, orderId, corps };
}

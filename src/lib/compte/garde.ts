/**
 * Les gardes partagées des routes /api/compte/* — rate-limit, délai neutre,
 * validation des entrées. Cinq routes les utilisent : les dupliquer cinq
 * fois inviterait cinq dérives.
 *
 * Le rate-limit est une Map en MÉMOIRE D'INSTANCE : sur Vercel il freine un
 * script naïf, il n'arrête pas une attaque (cf. src/app/api/CLAUDE.md, et
 * l'avertissement de frein-login.ts). Les vraies défenses : les rate-limits
 * natifs de Supabase Auth, les réponses indistinctes, et des mots de passe
 * que Supabase hache lui-même.
 */

type Entree = { count: number; resetAt: number };

/**
 * Un plafond par CLÉ, que l'appelant compose (une adresse IP, une IP et un
 * lien…) : `max` demandes par minute et par clé, `true` = refuser. Même fenêtre
 * et même règle que `creerPlafond`, qui n'est que ce frein-ci tenu par l'en-tête
 * `x-forwarded-for` brut. Une `Map` par instance : un frein, pas une garantie.
 */
export function creerFrein(max: number): (cle: string) => boolean {
  const parCle = new Map<string, Entree>();
  const fenetre = process.env.NODE_ENV === "production" ? 60_000 : 10_000;
  const plafond = process.env.NODE_ENV === "production" ? max : max * 6;
  return (cle: string): boolean => {
    const now = Date.now();
    for (const [c, val] of parCle) {
      if (val.resetAt < now) parCle.delete(c);
    }
    const entree = parCle.get(cle);
    if (entree && entree.resetAt > now) {
      if (entree.count >= plafond) return true;
      entree.count += 1;
      return false;
    }
    parCle.set(cle, { count: 1, resetAt: now + fenetre });
    return false;
  };
}

/** Un plafond par route — chaque route crée le sien au chargement du module. */
export function creerPlafond(max: number): (request: Request) => boolean {
  const frein = creerFrein(max);
  return (request: Request): boolean => frein(request.headers.get("x-forwarded-for") ?? "unknown");
}

const FORME_IP = /^[0-9A-Fa-f.:]{2,45}$/;

/**
 * L'adresse IP qui se CONNECTE à Vercel : la première de `x-forwarded-for`,
 * que Vercel réécrit lui-même (un appelant ne la choisit pas), sinon
 * `x-real-ip`. Derrière Cloudflare en proxy, c'est l'adresse de Cloudflare,
 * partagée par beaucoup de monde : un frein large seulement.
 */
export function ipDeConnexion(request: Request): string {
  const xff = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  if (xff && FORME_IP.test(xff)) return xff;
  const reel = request.headers.get("x-real-ip")?.trim();
  return reel && FORME_IP.test(reel) ? reel : "inconnu";
}

/**
 * L'adresse IP du CLIENT : `cf-connecting-ip` quand Cloudflare la pose (le
 * site passe par lui en proxy), sinon celle qui se connecte à Vercel
 * (`ipDeConnexion`). ⚠️ `cf-connecting-ip` s'écrit aussi par un appelant qui
 * vise directement Vercel (l'adresse *.vercel.app) : un script peut en changer
 * à chaque demande. Ne s'emploie donc qu'avec un second frein, large, tenu par
 * `ipDeConnexion`, qui, lui, ne se forge pas.
 */
export function ipDuClient(request: Request): string {
  const cf = request.headers.get("cf-connecting-ip")?.trim();
  if (cf && FORME_IP.test(cf)) return cf;
  return ipDeConnexion(request);
}

/**
 * T-045, même motif que /api/waitlist : les chemins courts (email inconnu,
 * envoi sauté) durent visiblement moins que les chemins pleins. Ce délai
 * rapproche les durées pour qu'un chronomètre ne remplace pas la réponse.
 */
export function delaiNeutre(): Promise<void> {
  const ms = 500 + Math.random() * 700;
  return new Promise((r) => setTimeout(r, ms));
}

/** Forme d'email minimale — le serveur revalide, jamais le navigateur seul. */
export function emailPlausible(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email) && email.length <= 254;
}

/** La seule règle du mot de passe : 8 caractères. Supabase revérifie. */
export const MOT_DE_PASSE_MIN = 8;

export function motDePasseAcceptable(mdp: string): boolean {
  return typeof mdp === "string" && mdp.length >= MOT_DE_PASSE_MIN && mdp.length <= 256;
}

/**
 * Le cookie qui porte la destination d'après-OAuth entre /api/compte/google
 * et /compte/callback (dix minutes, httpOnly). Ici et pas dans une route :
 * un route.ts Next ne peut exporter que ses handlers.
 */
export const COOKIE_SUITE = "bj_compte_suite";

/**
 * Une destination `?suite=` ne peut être qu'un chemin INTERNE : un chemin
 * absolu commençant par un seul « / » suivi ni de « / » ni de « \ » (les
 * navigateurs lisent « \ » comme « / »). Tout le reste (« // », « /\ », « http: »,
 * vide, caractères de contrôle) retombe sur /compte — jamais de redirection ouverte.
 */
const ORIGINE_TEST = "https://origine.invalide";

export function suiteSure(suite: string | null | undefined): string {
  if (!suite || !/^\/[^/\\]/.test(suite) || /[\u0000-\u001f\u007f]/.test(suite)) return "/compte";
  try {
    if (new URL(suite, ORIGINE_TEST).origin !== ORIGINE_TEST) return "/compte";
  } catch {
    return "/compte";
  }
  return suite;
}

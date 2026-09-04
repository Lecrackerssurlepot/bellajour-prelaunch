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

/** Un plafond par route — chaque route crée le sien au chargement du module. */
export function creerPlafond(max: number): (request: Request) => boolean {
  const parIp = new Map<string, Entree>();
  const fenetre = process.env.NODE_ENV === "production" ? 60_000 : 10_000;
  const plafond = process.env.NODE_ENV === "production" ? max : max * 6;
  return (request: Request): boolean => {
    const now = Date.now();
    for (const [cle, val] of parIp) {
      if (val.resetAt < now) parIp.delete(cle);
    }
    const ip = request.headers.get("x-forwarded-for") ?? "unknown";
    const entree = parIp.get(ip);
    if (entree && entree.resetAt > now) {
      if (entree.count >= plafond) return true;
      entree.count += 1;
      return false;
    }
    parIp.set(ip, { count: 1, resetAt: now + fenetre });
    return false;
  };
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
 * absolu commençant par un seul « / ». Tout le reste (« // », « http: »,
 * vide) retombe sur /compte — jamais de redirection ouverte.
 */
export function suiteSure(suite: string | null | undefined): string {
  if (!suite || !suite.startsWith("/") || suite.startsWith("//")) return "/compte";
  return suite;
}

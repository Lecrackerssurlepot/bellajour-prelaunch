import { createServerClient } from "@supabase/ssr";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";

/**
 * La session du compte cliente — Supabase Auth en « identité seulement ».
 *
 * ═══════════════ LES INVARIANTS DE SÉCURITÉ DU COMPTE ═══════════════
 * 1. Le token /numero/<token> reste une identité complète et suffisante :
 *    AUCUNE régression sur les routes /api/atelier/*, avec ou sans compte.
 * 2. Une session ne montre JAMAIS un dossier dont compte_id ≠ uid ET
 *    email_canonical ≠ canon(email du compte) ; et le rapprochement par
 *    email exige un email CONFIRMÉ (sinon n'importe qui créerait un compte
 *    avec l'adresse d'une cliente et lirait ses dossiers).
 * 3. Aucune énumération d'emails : inscription, connexion et réinitialisation
 *    répondent de façon indistincte (patron /api/waitlist).
 * 4. Le lien de réinitialisation n'ouvre pas de session durable : signOut()
 *    systématique après updateUser.
 * 5. Les cookies de session sont httpOnly — possible UNIQUEMENT parce
 *    qu'aucun client Supabase ne tourne dans le navigateur : les formulaires
 *    font des fetch vers /api/compte/*, et c'est le serveur qui parle à
 *    Supabase. Ne jamais introduire de createBrowserClient : il exigerait
 *    des cookies lisibles en JS et casserait cet invariant en silence.
 * ═════════════════════════════════════════════════════════════════════
 *
 * DEUX CLÉS, DEUX CLIENTS, DEUX RÔLES.
 * - La clé ANON (SUPABASE_ANON_KEY, jamais NEXT_PUBLIC) ne sert qu'aux
 *   endpoints /auth/v1/* : connexion, OAuth, verifyOtp. RLS est activée sans
 *   aucune policy sur les 10 tables, donc même exposée elle ne lirait RIEN.
 * - La SERVICE KEY (client auth.admin) frappe les liens signup/recovery et
 *   pré-crée les comptes fondateurs. Elle ne quitte jamais le serveur.
 * Les DONNÉES, elles, continuent de passer par makeSupabase() (service key),
 * filtrées côté serveur — aucune policy RLS n'existe ni ne doit exister.
 *
 * Règle du dépôt : une variable absente ne fait jamais d'erreur, elle fait
 * un silence. Sans SUPABASE_ANON_KEY, utilisateurConnecte() rend null et le
 * site vit comme avant les comptes.
 */

export type Connectee = {
  /** L'identifiant auth.users — la valeur de numeros.compte_id. */
  id: string;
  /** L'adresse du compte, telle que Supabase la connaît. */
  email: string;
  /** Faux tant que l'adresse n'a pas été prouvée (invariant nº2). */
  emailConfirme: boolean;
};

function configAnon(): { url: string; key: string } | null {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  return { url, key };
}

/**
 * Le client de session, côté serveur uniquement (route handlers et
 * composants serveur). Rend null si la brique compte n'est pas configurée.
 *
 * Dans un composant serveur, Next interdit d'écrire les cookies : le setAll
 * avale l'exception. Le rafraîchissement des jetons, lui, a un endroit où
 * écrire — la branche compte du middleware.
 */
export async function clientCompte(): Promise<SupabaseClient | null> {
  const config = configAnon();
  if (!config) return null;
  const magasin = await cookies();
  return createServerClient(config.url, config.key, {
    cookieOptions: {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
    },
    cookies: {
      getAll() {
        return magasin.getAll();
      },
      setAll(aEcrire) {
        try {
          for (const { name, value, options } of aEcrire) {
            magasin.set(name, value, options);
          }
        } catch {
          /* Composant serveur : lecture seule, le middleware écrira. */
        }
      },
    },
  });
}

/**
 * Le client d'administration auth (service key) — generateLink, createUser.
 * À n'utiliser QUE dans des routes serveur. Jette si la config manque :
 * ses appelants ont tous un utilisateur en face et doivent répondre quelque
 * chose de générique, pas planter en silence.
 */
export function clientAuthAdmin(): SupabaseClient {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_KEY;
  if (!url || !key) throw new Error("SUPABASE_URL ou SUPABASE_SERVICE_KEY manquant.");
  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

/**
 * Qui est connectée ? getUser() — jamais getSession() : on veut un jeton
 * VÉRIFIÉ auprès de Supabase, pas le contenu d'un cookie cru sur parole.
 * Null : personne, ou brique compte non configurée — les deux se traitent
 * pareil (le site sans compte).
 */
export async function utilisateurConnecte(): Promise<Connectee | null> {
  const client = await clientCompte();
  if (!client) return null;
  const { data, error } = await client.auth.getUser();
  if (error || !data.user || !data.user.email) return null;
  return {
    id: data.user.id,
    email: data.user.email,
    emailConfirme: Boolean(data.user.email_confirmed_at),
  };
}

/**
 * inviter-fondateurs — le mail C0 : « votre espace fondateur est ouvert ».
 *   npx tsx --tsconfig tsconfig.json scripts/inviter-fondateurs.ts                       (liste, n'envoie rien)
 *   npx tsx --tsconfig tsconfig.json scripts/inviter-fondateurs.ts --vraiment --seulement adresse@exemple.com
 *   npx tsx --tsconfig tsconfig.json scripts/inviter-fondateurs.ts --vraiment            (tous)
 * ══════════════════════════════════════════════════════════════════════════
 * Les comptes des fondateurs ont été pré-créés SANS mail le 07/09
 * (creer-comptes-fondateurs.ts, décision du 04/09 : chacun découvre à son
 * rythme). Le 10/09, Mathias change d'avis : l'atelier ouvre pour de vrai,
 * on leur ÉCRIT pour qu'ils puissent se connecter.
 *
 * Ce que le mail porte : un lien QUI N'EXPIRE JAMAIS, vers /compte/bienvenue
 * avec l'adresse pré-remplie. Là, un clic déclenche le flux « mot de passe
 * oublié » (C2, une heure, la personne est devant son écran) ; ou Google avec
 * la même adresse. Décision de Mathias du 10/09 : un lien à durée limitée
 * (Supabase plafonne à 24 h) finit toujours par tomber sur quelqu'un qui lit
 * trop tard. Rien à régler dans Supabase, aucun jeton dans le mail.
 *
 * IL N'ENVOIE RIEN PAR DÉFAUT. `--seulement <email>` borne l'envoi à une
 * adresse (la vérification de Mathias sur lui-même). Ne passe jamais par
 * mails_envoyes (pas de dossier) : la trace est la sortie de ce script, à
 * garder. Idempotence : aucune ; relancer renvoie un mail. D'où --seulement.
 * ══════════════════════════════════════════════════════════════════════════
 */

import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";
import { sendBrevoEmail } from "@/lib/brevo";

function sansGuillemets(v: string): string {
  const t = v.trim();
  return t.length > 1 && (t[0] === '"' || t[0] === "'") && t.at(-1) === t[0] ? t.slice(1, -1) : t;
}
function chargerEnv(): void {
  for (const ligne of readFileSync(".env.local", "utf8").split("\n")) {
    const m = ligne.match(/^([A-Z0-9_]+)=(.*)$/);
    if (!m || process.env[m[1]] !== undefined) continue;
    process.env[m[1]] = sansGuillemets(m[2]);
  }
}
chargerEnv();

function argument(nom: string): string | null {
  const i = process.argv.indexOf(nom);
  return i >= 0 ? (process.argv[i + 1] ?? null) : null;
}

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://www.bellajour.fr";

type Fondateur = { email: string; prenom: string | null; numero_fondateur: number };

async function main(): Promise<void> {
  const vraiment = process.argv.includes("--vraiment");
  const seulement = argument("--seulement")?.trim().toLowerCase() ?? null;

  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_KEY;
  const templateId = Number(process.env.BREVO_TEMPLATE_C0_ID);
  if (!url || !key) throw new Error("SUPABASE_URL / SUPABASE_SERVICE_KEY absentes de .env.local");
  if (vraiment && !templateId) throw new Error("BREVO_TEMPLATE_C0_ID absente de .env.local : pousser le template C0 d'abord");

  const supabase = createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
  const { data, error } = await supabase
    .from("waitlist")
    .select("email, prenom, numero_fondateur")
    .eq("offer_type", "founder")
    .eq("status", "confirmed")
    .not("numero_fondateur", "is", null)
    .order("numero_fondateur", { ascending: true })
    .returns<Fondateur[]>();
  if (error) throw new Error(`waitlist : ${error.code} ${error.message}`);

  const tous = (data ?? []).filter((f) => !seulement || f.email.toLowerCase() === seulement);
  console.log(`\n  ${tous.length} fondateur(s)${seulement ? ` (borné à ${seulement})` : ""}${vraiment ? "  — ENVOI" : "  — lecture seule"}\n`);
  for (const f of tous) console.log(`  nº${String(f.numero_fondateur).padStart(2)}  ${(f.prenom ?? "").padEnd(12)}  ${f.email}`);
  if (!vraiment) {
    console.log("\n  Rien n'a été envoyé. Relancer avec --vraiment (et --seulement <email> pour un seul).\n");
    return;
  }

  let ok = 0;
  for (const f of tous) {
    /* Aucun jeton : la page /compte/bienvenue fera partir le vrai lien au
       clic. Le compte doit exister (créé le 07/09) pour que ce clic serve :
       vérifié ici pour ne pas inviter quelqu'un vers un bouton qui ne fera
       rien. */
    const { data: comptes } = await supabase.auth.admin.listUsers({ page: 1, perPage: 1000 });
    const existe = (comptes?.users ?? []).some((u) => (u.email ?? "").toLowerCase() === f.email.toLowerCase());
    if (!existe) {
      console.error(`  ✗ nº${f.numero_fondateur} ${f.email} : aucun compte auth.users, rien envoyé (lancer creer-comptes-fondateurs.ts)`);
      continue;
    }
    const parti = await sendBrevoEmail({
      templateId,
      email: f.email,
      name: f.prenom ?? undefined,
      params: {
        PRENOM: f.prenom ?? "",
        NUMERO: String(f.numero_fondateur),
        URL: `${SITE_URL}/compte/bienvenue?e=${encodeURIComponent(f.email)}`,
      },
      apiKey: process.env.BREVO_API_KEY,
      label: "C0",
    });
    if (parti) { ok += 1; console.log(`  ✓ nº${f.numero_fondateur} ${f.email} : C0 accepté par Brevo`); }
    else console.error(`  ✗ nº${f.numero_fondateur} ${f.email} : Brevo a refusé`);
  }
  console.log(`\n  ${ok}/${tous.length} envoyé(s).\n`);
}

main().catch((err) => { console.error(String((err as Error)?.message ?? err)); process.exit(1); });

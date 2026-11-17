/**
 * LES CAMPAGNES DE NOËL N1 à N4 (17/11/2026), vers toute la liste Brevo.
 *
 *   node scripts/noel-campagnes.mjs                    # HTML des campagnes dans .mails-apercus/noel/campagne-N*.html
 *   node scripts/noel-campagnes.mjs --creer N1         # crée (ou met à jour) le BROUILLON Brevo de N1
 *
 * ⚠️ `--creer` écrit chez Brevo mais n'ENVOIE rien : la campagne reste en
 * brouillon. L'envoi (test ou réel) se fait à part, jamais sans l'accord de
 * Mathias dans la conversation.
 *
 * Le texte vit dans `scripts/mails-noel.mjs`. Ici, trois retouches propres à
 * une campagne : les variables de gabarit (`params.X`) deviennent des
 * attributs de contact (`contact.X`), une variable qu'aucun contact ne porte
 * (PLACES) est retirée, et le lien de désinscription s'ajoute au pied.
 */
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { MAILS } from "./mails-noel.mjs";
import { maquette } from "./mails-noel.mjs";

const RACINE = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const SORTIE = resolve(RACINE, ".mails-apercus/noel");

/** Waitlist Bellajour (3) + Contacts impliqués dans les conversations (5). Les fondateurs (8) sont tous dans la 3. */
export const LISTES = [3, 5];
const ATTRIBUTS_CONTACT = new Set(["PRENOM"]);

export function campagneHtml(mail) {
  let html = maquette(mail);
  /* Une condition sur une variable qu'aucun contact ne porte : on la retire entière. */
  html = html.replace(/\{% if params\.([A-Z_]+) %\}((?:(?!\{% if )[\s\S])*?)\{% endif %\}/g, (bloc, cle, corps) => {
    if (ATTRIBUTS_CONTACT.has(cle)) return bloc;
    const [, non = ""] = corps.split("{% else %}");
    return non;
  });
  html = html.replace(/params\.([A-Z_]+)/g, (t, cle) => {
    if (!ATTRIBUTS_CONTACT.has(cle)) throw new Error(`${mail.code} : variable ${cle} sans attribut de contact`);
    return `contact.${cle}`;
  });
  return html.replace(
    "Une question ? R&eacute;pondez &agrave; ce message.</p>",
    'Une question ? R&eacute;pondez &agrave; ce message.<br /><a href="{{ unsubscribe }}" style="color: #928d84; text-decoration: underline;">Se d&eacute;sinscrire</a></p>',
  );
}

function cleBrevo() {
  const ligne = readFileSync(resolve(RACINE, ".env.local"), "utf8").split("\n").find((l) => l.startsWith("BREVO_API_KEY="));
  if (!ligne) throw new Error("BREVO_API_KEY absente de .env.local");
  return ligne.slice("BREVO_API_KEY=".length).trim().replace(/^["']|["']$/g, "");
}

async function brevo(chemin, options = {}) {
  const r = await fetch(`https://api.brevo.com/v3${chemin}`, {
    ...options,
    headers: { "api-key": cleBrevo(), "content-type": "application/json", accept: "application/json", ...options.headers },
  });
  const texte = await r.text();
  if (!r.ok) throw new Error(`Brevo ${r.status} ${chemin} : ${texte}`);
  return texte ? JSON.parse(texte) : {};
}

async function main() {
  mkdirSync(SORTIE, { recursive: true });
  const campagnes = MAILS.filter((m) => /^N[1-4]$/.test(m.code));
  for (const mail of campagnes) {
    const html = campagneHtml(mail);
    if (/params\./.test(html)) throw new Error(`${mail.code} : une variable params. a survécu`);
    writeFileSync(resolve(SORTIE, `campagne-${mail.code}.html`), html, "utf8");
  }
  console.log(`HTML des campagnes écrit : ${campagnes.map((m) => m.code).join(", ")}.`);

  const i = process.argv.indexOf("--creer");
  if (i === -1) return;
  const codes = (process.argv[i + 1] ?? "").split(",").filter(Boolean);
  if (!codes.length) throw new Error("--creer exige un code : N1, ou N1,N2");
  const existantes = (await brevo("/emailCampaigns?limit=100&sort=desc")).campaigns ?? [];
  for (const code of codes) {
    const mail = campagnes.find((m) => m.code === code);
    if (!mail) throw new Error(`campagne inconnue : ${code}`);
    const corps = {
      name: mail.nom,
      subject: mail.sujet,
      previewText: mail.preheader,
      sender: { name: "Bellajour", email: "contact@bellajour.com" },
      replyTo: "contact@bellajour.com",
      htmlContent: campagneHtml(mail),
      recipients: { listIds: LISTES },
      inlineImageActivation: false,
    };
    const deja = existantes.find((c) => c.name === mail.nom);
    if (deja) {
      if (deja.status !== "draft") throw new Error(`${code} : la campagne ${deja.id} n'est plus un brouillon (${deja.status}), on n'y touche pas`);
      await brevo(`/emailCampaigns/${deja.id}`, { method: "PUT", body: JSON.stringify(corps) });
      console.log(`  ${code} : brouillon ${deja.id} mis à jour`);
    } else {
      const { id } = await brevo("/emailCampaigns", { method: "POST", body: JSON.stringify(corps) });
      console.log(`  ${code} : brouillon ${id} créé`);
    }
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((e) => {
    console.error(e instanceof Error ? e.message : e);
    process.exit(1);
  });
}

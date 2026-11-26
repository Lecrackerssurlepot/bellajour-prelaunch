/**
 * Les mails dans la charte V2 (26/11) : brand/charte/N-declinaisons.md, « Le gabarit commun ».
 *
 * Importé par `verif-atelier.ts`. Ni base, ni réseau, ni Brevo : il rend chaque gabarit de
 * `mails-atelier.mjs` (atelier et compte) et de `mails-noel.mjs` (Noël et carte cadeau), puis
 * relit le HTML. Ce qui part chez Brevo est exactement ce qui est relu ici.
 */

import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

type Ok = (n: string, c: boolean) => void;
type MailAtelier = { code: string; sujet: string; [k: string]: unknown };
type MailNoel = { code: string; sujet: string; blocs: string[] };

/** Les seules couleurs qu'un mail peut écrire : les jetons de la charte, et le noir de la parade Gmail. */
function couleursPermises(): Set<string> {
  const m = JSON.parse(readFileSync("brand/build/mail.json", "utf8")) as Record<string, string>;
  const jetons = ["couleur.papier.fond", "couleur.papier.texte", "couleur.papier.texte-doux", "couleur.papier.ligne",
    "couleur.nuit.fond", "couleur.nuit.texte", "couleur.nuit.texte-doux"].map((k) => m[k].toLowerCase());
  return new Set([...jetons, "#000000"]);
}

/** Les routes servies par src/app : `/numero/[token]` → /^\/numero\/[^/]+$/. Les (groupes) ne comptent pas. */
function routesDuSite(): RegExp[] {
  const routes: RegExp[] = [];
  const marcher = (d: string, segments: string[]) => {
    for (const e of readdirSync(d)) {
      const p = join(d, e);
      if (statSync(p).isDirectory()) {
        if (e === "api" && segments.length === 0) {
          marcher(p, [...segments, "api"]);
          continue;
        }
        marcher(p, /^\(.*\)$/.test(e) ? segments : [...segments, e]);
      } else if (/^(page\.tsx|route\.ts)$/.test(e)) {
        const motif = segments
          .map((s) => (/^\[\[\.\.\..+\]\]$/.test(s) ? "(?:/.*)?" : /^\[\.\.\..+\]$/.test(s) ? "/.+" : /^\[.+\]$/.test(s) ? "/[^/]+" : `/${s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`))
          .join("");
        routes.push(new RegExp(`^${motif || "/"}$`));
      }
    }
  };
  marcher("src/app", []);
  return routes;
}

export async function verifierMailsCharte(ok: Ok, titre: (t: string) => void): Promise<void> {
  titre("Mails : la charte V2 (26/11, fiche N)");
  const Charte = (await import("./mails-charte.mjs")) as unknown as { SITE: string; LOGO_MAIL: string; INSTAGRAM: string };
  const Atelier = (await import("./mails-atelier.mjs")) as unknown as { MAILS: MailAtelier[]; maquette: (m: MailAtelier) => string };
  const Noel = (await import("./mails-noel.mjs")) as unknown as { MAILS: MailNoel[]; maquette: (m: MailNoel) => string };
  const Campagnes = (await import("./noel-campagnes.mjs")) as unknown as { campagneHtml: (m: MailNoel) => string };

  const mails = [
    ...Atelier.MAILS.map((m) => ({ code: m.code, html: Atelier.maquette(m) })),
    ...Noel.MAILS.map((m) => ({ code: m.code, html: Noel.maquette(m) })),
  ];
  ok(`charte : ${mails.length} mails rendus par la même coquille (atelier, compte, Noël, carte)`,
    mails.length === Atelier.MAILS.length + Noel.MAILS.length && mails.length >= 29
      && mails.every((m) => (m.html.match(/<body class="body"/g) ?? []).length === 1));

  const fautes = (test: (html: string) => boolean) => mails.filter((m) => !test(m.html)).map((m) => m.code);
  const dire = (codes: string[]) => (codes.length ? ` (en faute : ${codes.join(", ")})` : "");

  const sansSombre = fautes((h) => /<meta name="color-scheme" content="light only" \/>/.test(h) && /<meta name="supported-color-schemes" content="light only" \/>/.test(h));
  ok(`charte : chaque mail déclare color-scheme « light only »${dire(sansSombre)}`, sansSombre.length === 0);

  const anciens = fautes((h) => !/#d68a63|#070708|#161618|#f5f0e7|#928d84|#c7c2b8|#a07c64|Cormorant|DM Sans|@import|fonts\.googleapis/i.test(h));
  ok(`charte : plus de cuivre, de crème ni de police chargée (Cormorant, DM Sans, @import)${dire(anciens)}`, anciens.length === 0);

  const permises = couleursPermises();
  const horsCharte = mails.flatMap((m) => [...new Set((m.html.match(/#[0-9a-fA-F]{6}\b/g) ?? []).map((c) => c.toLowerCase()))]
    .filter((c) => !permises.has(c)).map((c) => `${m.code} ${c}`));
  ok(`charte : chaque couleur écrite est un jeton de brand/build/mail.json${horsCharte.length ? ` (${horsCharte.slice(0, 6).join(", ")})` : ""}`, horsCharte.length === 0);

  const polices = fautes((h) => [...h.matchAll(/font-family:\s*([^;"]+)/g)].every((f) => /^(?:'Georgia', 'Times New Roman', serif|'Helvetica Neue', 'Helvetica', 'Arial', sans-serif|Helvetica, Arial, sans-serif( !important)?|Georgia, 'Times New Roman', serif( !important)?|Helvetica,Arial,sans-serif)\s*$/.test(f[1].trim())));
  ok(`charte : Georgia et Helvetica seulement (police.mail.*)${dire(polices)}`, polices.length === 0);

  const unBouton = fautes((h) => (h.match(/class="bouton-mail"/g) ?? []).length <= 1 && (h.match(/<v:roundrect/g) ?? []).length === (h.match(/class="bouton-mail"/g) ?? []).length);
  ok(`charte : un bouton au plus par mail, et sa forme Outlook avec lui${dire(unBouton)}`, unBouton.length === 0);

  const bouton = fautes((h) => !/class="bouton-mail"/.test(h)
    || /<td align="center" bgcolor="#111111" style="background-color: #111111; border: 1px solid #111111; border-radius: 999px;">\s*<a href="[^"]+" class="bouton-mail" style="display: inline-block; padding: 15px 32px; line-height: 20px;[^"]*color: #ffffff;/.test(h));
  ok(`charte : le bouton est une cellule encre bordée d'encre, pilule, 52 px${dire(bouton)}`, bouton.length === 0);

  const bandeau = fautes((h) => /<tr><td align="center" bgcolor="#0c0c0d" style="background-color: #0c0c0d; background-image: linear-gradient\(#0c0c0d, #0c0c0d\);[^"]*">\s*<a href="https:\/\/www\.bellajour\.fr\/"[^>]*><img src="([^"]+)"/.test(h)
    && h.includes(`<img src="${Charte.LOGO_MAIL}" width="140"`));
  ok(`charte : le bandeau nuit est peint deux fois et porte le logo papier${dire(bandeau)}`, bandeau.length === 0);

  /* Toute image vient du site, en JPEG ou PNG, avec un alt, et le fichier existe dans public/. */
  const images = mails.flatMap((m) => [...m.html.matchAll(/<img ([^>]+)>/g)].map((i) => ({ code: m.code, attrs: i[1] })));
  const imagesKo = images.filter(({ attrs }) => {
    const src = attrs.match(/src="([^"]+)"/)?.[1] ?? "";
    const chemin = src.startsWith(`${Charte.SITE}/`) ? `public/${src.slice(Charte.SITE.length + 1)}` : "";
    return !/alt="[^"]+"/.test(attrs) || !/\.(png|jpe?g)$/.test(src) || !chemin || !existsSync(chemin);
  }).map((i) => `${i.code} ${i.attrs.match(/src="([^"]+)"/)?.[1]}`);
  ok(`charte : ${images.length} images, toutes en JPEG ou PNG, avec un alt, présentes dans public/${imagesKo.length ? ` (${[...new Set(imagesKo)].join(", ")})` : ""}`,
    images.length > 0 && imagesKo.length === 0);
  ok("charte : le logo des mails existe en PNG, papier et encre (brand/scripts/logo-mail.mjs)",
    existsSync("public/images/v2/mail/logo-papier-420.png") && existsSync("public/images/v2/mail/logo-encre-420.png")
      && Charte.LOGO_MAIL === `${Charte.SITE}/images/v2/mail/logo-papier-420.png`);

  /* Les liens : le vrai site sur une route qui existe, un paramètre construit par le code, Instagram. */
  const routes = routesDuSite();
  const liens = mails.flatMap((m) => [...m.html.matchAll(/href="([^"]+)"/g)].map((l) => ({ code: m.code, href: l[1] })));
  const liensKo = liens.filter(({ href }) => {
    if (/^\{\{ params\.[A-Z_]+ \}\}$/.test(href) || href === Charte.INSTAGRAM) return false;
    if (!href.startsWith(`${Charte.SITE}/`)) return true;
    const chemin = href.slice(Charte.SITE.length).split(/[?#]/)[0] || "/";
    return !routes.some((r) => r.test(chemin));
  }).map((l) => `${l.code} ${l.href}`);
  ok(`charte : ${liens.length} liens, tous vers une route de ${Charte.SITE}, un paramètre du code ou @bellajour__${liensKo.length ? ` (${[...new Set(liensKo)].join(", ")})` : ""}`,
    liens.length > 0 && liensKo.length === 0);
  const parametres = [...new Set(liens.map((l) => l.href).filter((h) => h.startsWith("{{")))].sort();
  ok(`charte : les liens-paramètres sont ceux que le code construit sur le vrai site (${parametres.join(" ")})`,
    parametres.every((p) => /params\.(LIEN|URL|SUIVI|LIEN_CARTE|LIEN_RECU|LIEN_COMPOSER)\b/.test(p)));
  /* Ceux du compte : construits sur origineDuSite, vers des routes qui existent. */
  const compte = readFileSync("src/lib/compte/mails.ts", "utf8");
  const inviter = readFileSync("scripts/inviter-fondateurs.ts", "utf8");
  ok("charte : C1, C2 et C0 visent /compte/confirmer, /compte/reinitialiser et /compte/bienvenue sur le vrai site",
    /origineDuSite\(process\.env\.NEXT_PUBLIC_SITE_URL\)/.test(compte) && /\$\{SITE_URL\}\/compte\/confirmer\?/.test(compte) && /\$\{SITE_URL\}\/compte\/reinitialiser\?/.test(compte)
      && /const SITE_URL = ORIGINE_SITE;/.test(inviter) && /\$\{SITE_URL\}\/compte\/bienvenue\?/.test(inviter)
      && ["/compte/confirmer", "/compte/reinitialiser", "/compte/bienvenue", "/numero/x", "/carte/x", "/api/cartes/recu/x", "/composer"].every((c) => routes.some((r) => r.test(c)))
      /* Le témoin : le lecteur de routes sait dire non. */
      && !["/page-qui-n-existe-pas", "/numero", "/compte/confirmer/x/y", "/offrirx"].some((c) => routes.some((r) => r.test(c))));

  /* Le pied des campagnes : le lien de désinscription s'accroche à la fin exacte de la mention. */
  const campagnes = Noel.MAILS.filter((m) => /^N[1-4]$/.test(m.code));
  ok("charte : chaque campagne de Noël garde son lien de désinscription",
    campagnes.length === 4 && campagnes.every((m) => (Campagnes.campagneHtml(m).match(/href="\{\{ unsubscribe \}\}"/g) ?? []).length === 1));

  /* La règle est écrite dans la charte, et pointe ce fichier. */
  const fiche = readFileSync("brand/charte/N-declinaisons.md", "utf8");
  ok("charte : la fiche N décrit le gabarit commun (mails-charte.mjs, ce harnais, bandeau nuit)",
    /### Le gabarit commun \(26\/11\)/.test(fiche) && fiche.includes("scripts/mails-charte.mjs") && fiche.includes("scripts/verif-mails-charte.ts") && /bandeau nuit/.test(fiche));
}

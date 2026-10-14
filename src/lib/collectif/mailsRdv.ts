/**
 * Les trois mails d'un rendez-vous (T-148) : pris, déplacé, annulé.
 * Module PUR : aucun accès base, aucun réseau, aucune variable d'environnement.
 *
 * ⚠️ TEXTE PROPOSÉ PAR CLAUDE, À VALIDER PAR MATHIAS. Rien ne part tant que
 * `COLLECTIF_MAILS_RDV` n'est pas ouvert (rendezvous.ts) : ce sont de vrais
 * mails à de vrais clients. Le texte vit ICI (et pas dans un modèle Brevo)
 * pour se relire, se tester au harnais et s'afficher en aperçu.
 *
 * Masculin générique, vous ou tu selon le registre de l'édition, aucun tiret
 * cadratin. Le lien vers l'espace porte le token du responsable : il ne part
 * qu'à SON adresse.
 */

import { libelleCreneau } from "./creneaux";

export type GenreMailRdv = "pris" | "deplace" | "annule";

export type DonneesMailRdv = {
  genre: GenreMailRdv;
  tu: boolean;
  /** Le prénom de l'interlocuteur de l'atelier. */
  interlocuteur: string;
  debut: string;
  /** Le créneau d'avant, pour un déplacement. */
  ancienDebut: string | null;
  dureeMinutes: number;
  meetUrl: string | null;
  motif: string | null;
  lienEspace: string;
};

export type MailRdv = { sujet: string; html: string; texte: string };

const ENCRE = "#1c1c1c";
const DOUX = "#6b6b6b";
const ACCENT = "#b56a45";

function echapper(t: string): string {
  return t.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function majuscule(t: string): string {
  return t.charAt(0).toUpperCase() + t.slice(1);
}

function bouton(href: string, libelle: string): string {
  return `<a href="${echapper(href)}" style="display:inline-block;padding:12px 22px;border-radius:999px;background:${ENCRE};color:#ffffff;text-decoration:none;font-family:Arial,sans-serif;font-size:15px">${echapper(libelle)}</a>`;
}

export function mailRendezVous(d: DonneesMailRdv): MailRdv {
  const v = (vous: string, toi: string) => (d.tu ? toi : vous);
  const quand = libelleCreneau(d.debut);
  const avant = d.ancienDebut ? libelleCreneau(d.ancienDebut) : "";

  let sujet: string;
  let titre: string;
  let phrase: string;
  if (d.genre === "pris") {
    sujet = `${v("Votre", "Ton")} rendez-vous avec Bellajour · ${quand}`;
    titre = "Rendez-vous confirmé";
    phrase = `${v("Votre", "Ton")} rendez-vous avec ${d.interlocuteur}, de l'atelier Bellajour, est confirmé.`;
  } else if (d.genre === "deplace") {
    sujet = `${v("Votre", "Ton")} rendez-vous est déplacé · ${quand}`;
    titre = "Rendez-vous déplacé";
    phrase = `${v("Votre", "Ton")} rendez-vous avec ${d.interlocuteur} est déplacé${avant ? ` (il était prévu ${avant})` : ""}.`;
  } else {
    sujet = `${v("Votre", "Ton")} rendez-vous du ${quand} est annulé`;
    titre = "Rendez-vous annulé";
    phrase = `${v("Votre", "Ton")} rendez-vous avec ${d.interlocuteur}, prévu ${quand}, est annulé.`;
  }

  const lignes: { html: string; texte: string }[] = [{ html: echapper(phrase), texte: phrase }];
  if (d.genre !== "annule") {
    const quandLong = `${majuscule(quand)}, pendant ${d.dureeMinutes} minutes${d.meetUrl ? ", en visio" : ""}.`;
    lignes.push({ html: `<strong>${echapper(quandLong)}</strong>`, texte: quandLong });
    if (d.motif) lignes.push({ html: `Le sujet : ${echapper(d.motif)}`, texte: `Le sujet : ${d.motif}` });
  }

  const gestes =
    d.genre === "annule"
      ? v("Pour en prendre un autre, passez par votre espace :", "Pour en prendre un autre, passe par ton espace :")
      : v("Pour le déplacer ou l'annuler, passez par votre espace :", "Pour le déplacer ou l'annuler, passe par ton espace :");
  const agenda =
    d.genre === "annule"
      ? v("L'invitation jointe retire le rendez-vous de votre agenda.", "L'invitation jointe retire le rendez-vous de ton agenda.")
      : v("L'invitation est jointe à ce mail : ouvrez-la pour l'ajouter à votre agenda.", "L'invitation est jointe à ce mail : ouvre-la pour l'ajouter à ton agenda.");

  const html = `<!doctype html><html lang="fr"><body style="margin:0;padding:0;background:#f6f2ec">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f6f2ec;padding:32px 16px"><tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:16px;padding:32px">
<tr><td style="font-family:Georgia,serif;font-size:13px;letter-spacing:2px;text-transform:uppercase;color:${DOUX}">Bellajour · Édition collective</td></tr>
<tr><td style="padding-top:12px;font-family:Georgia,serif;font-size:28px;line-height:1.2;color:${ENCRE}">${echapper(titre)}</td></tr>
<tr><td style="padding-top:18px;font-family:Arial,sans-serif;font-size:15px;line-height:1.6;color:${ENCRE}">Bonjour,</td></tr>
${lignes.map((l) => `<tr><td style="padding-top:10px;font-family:Arial,sans-serif;font-size:15px;line-height:1.6;color:${ENCRE}">${l.html}</td></tr>`).join("\n")}
${d.genre !== "annule" && d.meetUrl ? `<tr><td style="padding-top:20px">${bouton(d.meetUrl, "Rejoindre la visio")}</td></tr>` : ""}
<tr><td style="padding-top:22px;font-family:Arial,sans-serif;font-size:15px;line-height:1.6;color:${ENCRE}">${echapper(gestes)} <a href="${echapper(d.lienEspace)}" style="color:${ACCENT}">ouvrir mon espace</a>.</td></tr>
<tr><td style="padding-top:10px;font-family:Arial,sans-serif;font-size:13px;line-height:1.6;color:${DOUX}">${echapper(agenda)}</td></tr>
<tr><td style="padding-top:24px;font-family:Arial,sans-serif;font-size:15px;line-height:1.6;color:${ENCRE}">À très vite,<br>L'atelier Bellajour</td></tr>
</table></td></tr></table></body></html>`;

  const texte = [
    "Bonjour,",
    "",
    ...lignes.map((l) => l.texte),
    ...(d.genre !== "annule" && d.meetUrl ? ["", `Rejoindre la visio : ${d.meetUrl}`] : []),
    "",
    `${gestes} ${d.lienEspace}`,
    agenda,
    "",
    "À très vite,",
    "L'atelier Bellajour",
  ].join("\n");

  return { sujet, html, texte };
}

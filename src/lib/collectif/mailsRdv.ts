/**
 * Les trois mails d'un rendez-vous (T-148) : pris, déplacé, annulé.
 * Module PUR : aucun accès base, aucun réseau, aucune variable d'environnement.
 *
 * Texte proposé par Claude, relu par Mathias le 20/10 (« d'accord »), avec une
 * retouche : la MÊME mise en page que les autres mails des éditions
 * (`pageMail`, mailsTextes.ts : en-tête, bouton bleu, signature), « Bonjour
 * <prénom> » quand le nom du responsable est connu, et « Ouvrir mon espace »
 * en bouton (il était un lien cuivre dans la phrase). Rien ne part tant que
 * `COLLECTIF_MAILS_RDV` n'est pas ouvert (rendezvous.ts) : ce sont de vrais
 * mails à de vrais clients. Le texte vit ICI (et pas dans un modèle Brevo)
 * pour se relire, se tester au harnais et s'afficher en aperçu.
 *
 * Masculin générique, vous ou tu selon le registre de l'édition, aucun tiret
 * cadratin. Le lien vers l'espace porte le token du responsable : il ne part
 * qu'à SON adresse.
 */

import { libelleCreneau } from "./creneaux";
import { bonjour, ligne, pageMail, type Bouton, type Ligne, type Mail } from "./mailsTextes";

export type GenreMailRdv = "pris" | "deplace" | "annule";

export type DonneesMailRdv = {
  genre: GenreMailRdv;
  tu: boolean;
  /** Le prénom de l'interlocuteur de l'atelier. */
  interlocuteur: string;
  /** Le nom du responsable (« Bonjour Camille, »), ou null : « Bonjour, ». */
  responsable: string | null;
  debut: string;
  /** Le créneau d'avant, pour un déplacement. */
  ancienDebut: string | null;
  dureeMinutes: number;
  meetUrl: string | null;
  motif: string | null;
  lienEspace: string;
};

export type MailRdv = Mail;

function majuscule(t: string): string {
  return t.charAt(0).toUpperCase() + t.slice(1);
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

  const lignes: (Ligne | Bouton)[] = [ligne(phrase)];
  if (d.genre !== "annule") {
    const quandLong = `${majuscule(quand)}, pendant ${d.dureeMinutes} minutes${d.meetUrl ? ", en visio" : ""}.`;
    lignes.push({ html: `<strong>${ligne(quandLong).html}</strong>`, texte: quandLong });
    if (d.motif) lignes.push(ligne(`Le sujet : ${d.motif}`));
    if (d.meetUrl) lignes.push({ href: d.meetUrl, libelle: "Rejoindre la visio" });
  }
  lignes.push(
    ligne(
      d.genre === "annule"
        ? v("Pour en prendre un autre, passez par votre espace.", "Pour en prendre un autre, passe par ton espace.")
        : v("Pour le déplacer ou l'annuler, passez par votre espace.", "Pour le déplacer ou l'annuler, passe par ton espace.")
    ),
    { href: d.lienEspace, libelle: "Ouvrir mon espace" }
  );

  const agenda =
    d.genre === "annule"
      ? v("L'invitation jointe retire le rendez-vous de votre agenda.", "L'invitation jointe retire le rendez-vous de ton agenda.")
      : v("L'invitation est jointe à ce mail : ouvrez-la pour l'ajouter à votre agenda.", "L'invitation est jointe à ce mail : ouvre-la pour l'ajouter à ton agenda.");

  const { html, texte } = pageMail({ titre, bonjour: bonjour(d.responsable), lignes, notes: [ligne(agenda)] });
  return { sujet, html, texte };
}

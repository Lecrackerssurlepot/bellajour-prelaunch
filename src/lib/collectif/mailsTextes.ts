/**
 * Les mails de l'Édition collective (T-146), hors rendez-vous (`mailsRdv.ts`).
 * Module PUR : aucun accès base, aucun réseau, aucune variable d'environnement.
 *
 * « Votre espace est prêt » : le texte de la planche 6 du 19/10, VALIDÉ par
 * Mathias (T-187), avec les trois liens séparés. Les autres textes : proposés
 * par Claude le 15/10, à valider. Rien ne part tant que `COLLECTIF_MAILS`
 * n'est pas ouvert (`mails.ts`) : ce sont de vrais mails à de vrais clients,
 * et l'ouvrir attend Mathias. Le texte vit ICI (et pas dans un modèle Brevo)
 * pour se relire, se tester au harnais et s'afficher en aperçu dans l'atelier.
 *
 * Masculin générique, vous ou tu selon le registre de l'édition, aucun tiret
 * cadratin (consigne de Mathias). Un lien vers l'espace du responsable porte
 * son token : il ne part qu'à SON adresse.
 */

import { formaterJourParis } from "./dates";
import type { TokensEdition } from "./droits";
import { liensEdition } from "./liens";

export type Mail = { sujet: string; html: string; texte: string };

const ENCRE = "#1c1c1c";
const DOUX = "#6b6b6b";
/* Les blocs des liens (planche 6) : le fond Porcelaine, le bleu de Bellajour. */
const BLOC = "#f3f4f7";
const ACTION = "#4a90d9";
const ACTION_TEXTE = "#1d4f8a";

function echapper(t: string): string {
  return t.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

/** Un paragraphe : son HTML (déjà échappé) et son texte brut. */
type Ligne = { html: string; texte: string };
const ligne = (t: string): Ligne => ({ html: echapper(t), texte: t });

/**
 * Un lien du mail, dans son bloc (planche 6) : un titre, une phrase, puis un
 * bouton OU l'adresse elle-même. Un mail ne sait pas « copier » : l'adresse
 * s'écrit en clair et en lien, pour qu'on la transfère telle quelle.
 */
type BlocLien = { titre: string; phrase: string; href: string; bouton?: string };

function blocHtml(b: BlocLien): string {
  const action = b.bouton
    ? `<a href="${echapper(b.href)}" style="display:inline-block;padding:10px 20px;border-radius:999px;background:${ACTION};color:#ffffff;text-decoration:none;font-family:Arial,sans-serif;font-size:14px">${echapper(b.bouton)}</a>`
    : `<a href="${echapper(b.href)}" style="color:${ACTION_TEXTE};font-family:Arial,sans-serif;font-size:13px;line-height:1.5;word-break:break-all">${echapper(b.href)}</a>`;
  return `<tr><td style="padding-top:12px"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${BLOC};border-radius:12px"><tr><td style="padding:14px 16px">
<div style="font-family:Arial,sans-serif;font-size:15px;font-weight:bold;color:${ENCRE}">${echapper(b.titre)}</div>
<div style="padding-top:4px;font-family:Arial,sans-serif;font-size:13px;line-height:1.5;color:${DOUX}">${echapper(b.phrase)}</div>
<div style="padding-top:10px">${action}</div>
</td></tr></table></td></tr>`;
}

function blocTexte(b: BlocLien): string[] {
  return ["", b.titre, b.phrase, b.bouton ? `${b.bouton} : ${b.href}` : b.href];
}

/** La mise en page commune : celle des mails de rendez-vous, même maison. */
function page(p: { titre: string; bonjour: string; lignes: Ligne[]; bouton?: { href: string; libelle: string }; blocs?: BlocLien[]; notes?: Ligne[] }): { html: string; texte: string } {
  const html = `<!doctype html><html lang="fr"><body style="margin:0;padding:0;background:#f6f2ec">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f6f2ec;padding:32px 16px"><tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:16px;padding:32px">
<tr><td style="font-family:Georgia,serif;font-size:13px;letter-spacing:2px;text-transform:uppercase;color:${DOUX}">Bellajour · Édition collective</td></tr>
<tr><td style="padding-top:12px;font-family:Georgia,serif;font-size:28px;line-height:1.2;color:${ENCRE}">${echapper(p.titre)}</td></tr>
<tr><td style="padding-top:18px;font-family:Arial,sans-serif;font-size:15px;line-height:1.6;color:${ENCRE}">${echapper(p.bonjour)}</td></tr>
${p.lignes.map((l) => `<tr><td style="padding-top:10px;font-family:Arial,sans-serif;font-size:15px;line-height:1.6;color:${ENCRE}">${l.html}</td></tr>`).join("\n")}
${(p.blocs ?? []).map(blocHtml).join("\n")}
${p.bouton ? `<tr><td style="padding-top:22px"><a href="${echapper(p.bouton.href)}" style="display:inline-block;padding:12px 22px;border-radius:999px;background:${ENCRE};color:#ffffff;text-decoration:none;font-family:Arial,sans-serif;font-size:15px">${echapper(p.bouton.libelle)}</a></td></tr>` : ""}
${(p.notes ?? []).map((l) => `<tr><td style="padding-top:12px;font-family:Arial,sans-serif;font-size:13px;line-height:1.6;color:${DOUX}">${l.html}</td></tr>`).join("\n")}
<tr><td style="padding-top:24px;font-family:Arial,sans-serif;font-size:15px;line-height:1.6;color:${ENCRE}">À très vite,<br>L'atelier Bellajour</td></tr>
</table></td></tr></table></body></html>`;
  const texte = [
    p.bonjour,
    "",
    ...p.lignes.map((l) => l.texte),
    ...(p.blocs ?? []).flatMap(blocTexte),
    ...(p.bouton ? ["", `${p.bouton.libelle} : ${p.bouton.href}`] : []),
    ...(p.notes?.length ? ["", ...p.notes.map((l) => l.texte)] : []),
    "",
    "À très vite,",
    "L'atelier Bellajour",
  ].join("\n");
  return { html, texte };
}

/** « Bonjour Camille, » ; sans nom, « Bonjour, ». */
function bonjour(nom: string | null): string {
  const prenom = (nom ?? "").trim().split(/\s+/)[0];
  return prenom ? `Bonjour ${prenom},` : "Bonjour,";
}

export type DonneesEspacePret = {
  tu: boolean;
  organisation: string;
  evenement: string;
  responsable: string | null;
  /**
   * Les TROIS liens de l'édition (T-187, planche 6) : le sien (son token, il ne
   * part qu'à son adresse), celui de l'équipe (lecture seule, à transférer),
   * celui des participants (déposer ses photos).
   */
  liens: { responsable: string; equipe: string; depot: string };
  /** « 28 octobre », ou null si la clôture n'est pas fixée. */
  cloture: string | null;
  /** Le code par appareil (T-154) est en service : le mail le dit. */
  avecCode: boolean;
  /** L'adresse courte pour retrouver son lien (« bellajour.fr/espace »), ou null pour ne pas l'écrire. */
  retrouver?: string | null;
};

/** Ce que le mail « Votre espace est prêt » lit d'une édition : la route ET l'écran « L'édition est créée » passent par ici. */
export function donneesEspacePret(
  e: TokensEdition & { registre: string; organisation: string; evenement: string; responsable_nom: string | null; cloture_le: string | null },
  origine: string,
  avecCode: boolean
): DonneesEspacePret {
  return {
    tu: e.registre === "ecole_tu",
    organisation: e.organisation,
    evenement: e.evenement,
    responsable: e.responsable_nom,
    liens: liensEdition(origine, e),
    cloture: e.cloture_le ? formaterJourParis(e.cloture_le) || null : null,
    avecCode,
    retrouver: origine ? `${origine.replace(/^https?:\/\//, "")}/espace` : null,
  };
}

/** Le premier mail : l'espace est ouvert, voici les trois liens. Envoyé par l'atelier depuis la fiche. */
export function mailEspacePret(d: DonneesEspacePret): Mail {
  const v = (vous: string, toi: string) => (d.tu ? toi : vous);
  const lignes: Ligne[] = [
    ligne(
      v(
        `L'espace de votre édition « ${d.evenement} » est ouvert. Voici vos trois liens.`,
        `L'espace de ton édition « ${d.evenement} » est ouvert. Voici tes trois liens.`
      )
    ),
  ];
  const blocs: BlocLien[] = [
    {
      titre: v("Votre lien", "Ton lien"),
      phrase: v("Pour tout faire : photos, style, bon à tirer. Gardez-le pour vous.", "Pour tout faire : photos, style, bon à tirer. Garde-le pour toi."),
      href: d.liens.responsable,
      bouton: "Ouvrir mon espace",
    },
    {
      titre: v("Le lien de votre équipe", "Le lien de ton équipe"),
      phrase: v("Lecture seule. Transférez-le à vos collègues.", "Lecture seule. Transfère-le à tes collègues."),
      href: d.liens.equipe,
    },
    {
      titre: "Le lien des participants",
      phrase: d.cloture
        ? v(
            `Pour que chacun dépose ses photos, jusqu'au ${d.cloture}. Le QR code est dans votre espace.`,
            `Pour que chacun dépose ses photos, jusqu'au ${d.cloture}. Le QR code est dans ton espace.`
          )
        : v("Pour que chacun dépose ses photos. Le QR code est dans votre espace.", "Pour que chacun dépose ses photos. Le QR code est dans ton espace."),
      href: d.liens.depot,
    },
  ];
  const notes: Ligne[] = [];
  if (d.retrouver)
    notes.push(ligne(v(`Lien perdu ? Retrouvez-le à tout moment sur ${d.retrouver}.`, `Lien perdu ? Retrouve-le à tout moment sur ${d.retrouver}.`)));
  if (d.avecCode)
    notes.push(
      ligne(
        v(
          "Sur un nouveau téléphone ou ordinateur, l'espace s'ouvre en lecture : pour modifier, il vous envoie un code à cette adresse.",
          "Sur un nouveau téléphone ou ordinateur, l'espace s'ouvre en lecture : pour modifier, il t'envoie un code à cette adresse."
        )
      )
    );
  const { html, texte } = page({
    titre: v("Votre espace est prêt", "Ton espace est prêt"),
    bonjour: bonjour(d.responsable),
    lignes,
    blocs,
    notes,
  });
  return { sujet: `${v("Votre", "Ton")} espace Bellajour est prêt, ${d.evenement}`, html, texte };
}

export type DonneesCodeAppareil = {
  tu: boolean;
  evenement: string;
  /** Les six chiffres, en clair : ce mail est le SEUL endroit où ils s'écrivent. */
  code: string;
  /** Sa durée de validité, telle qu'elle s'écrit (« 24 heures »). */
  duree: string;
  /** L'adresse du site (bellajour.fr, ou la version d'essai) : la personne sait d'où vient la demande. */
  site: string;
};

/** Le code pour modifier (T-154) : demandé par le responsable depuis un appareil pas encore reconnu. */
export function mailCodeAppareil(d: DonneesCodeAppareil): Mail {
  const v = (vous: string, toi: string) => (d.tu ? toi : vous);
  const espace = `${d.code.slice(0, 3)} ${d.code.slice(3)}`;
  const { html, texte } = page({
    titre: v("Votre code", "Ton code"),
    bonjour: "Bonjour,",
    lignes: [
      ligne(v(`Pour modifier l'espace de « ${d.evenement} » depuis ce nouvel appareil, saisissez ce code :`, `Pour modifier l'espace de « ${d.evenement} » depuis ce nouvel appareil, saisis ce code :`)),
      { html: `<span style="display:inline-block;padding:10px 18px;border-radius:12px;background:#f6f2ec;font-family:Arial,sans-serif;font-size:28px;letter-spacing:6px;color:#1c1c1c"><strong>${espace}</strong></span>`, texte: espace },
      ligne(`Il est valable ${d.duree}, sur l'appareil qui l'a demandé.`),
    ],
    notes: [
      ligne(
        v(
          "Vous n'êtes pas à l'origine de cette demande ? Ignorez ce mail : sans ce code, personne ne peut modifier votre espace.",
          "Tu n'es pas à l'origine de cette demande ? Ignore ce mail : sans ce code, personne ne peut modifier ton espace."
        )
      ),
      ligne(`Demande faite depuis ${d.site.replace(/^https?:\/\//, "")}.`),
    ],
  });
  return { sujet: `${v("Votre", "Ton")} code Bellajour : ${espace}`, html, texte };
}

export type DonneesRetrouver = {
  tu: boolean;
  organisation: string;
  evenement: string;
  responsable: string | null;
  /** Le lien du responsable (son token) : il ne part qu'à son adresse, qui vient de le demander. */
  lien: string;
};

/** « Retrouver mon espace » (T-154) : le responsable a tapé son adresse, voici son lien. */
export function mailRetrouverEspace(d: DonneesRetrouver): Mail {
  const v = (vous: string, toi: string) => (d.tu ? toi : vous);
  const { html, texte } = page({
    titre: v("Votre lien", "Ton lien"),
    bonjour: bonjour(d.responsable),
    lignes: [ligne(v(`Voici le lien de votre espace « ${d.evenement} » (${d.organisation}).`, `Voici le lien de ton espace « ${d.evenement} » (${d.organisation}).`))],
    bouton: { href: d.lien, libelle: "Ouvrir mon espace" },
    notes: [
      ligne(v("Ce lien vous est personnel : gardez ce mail, il vous servira à revenir.", "Ce lien t'est personnel : garde ce mail, il te servira à revenir.")),
      ligne(
        v(
          "Vous n'êtes pas à l'origine de cette demande ? Ignorez ce mail : il n'est parti qu'à votre adresse.",
          "Tu n'es pas à l'origine de cette demande ? Ignore ce mail : il n'est parti qu'à ton adresse."
        )
      ),
    ],
  });
  return { sujet: `${v("Votre", "Ton")} lien Bellajour · ${d.evenement}`, html, texte };
}

/**
 * Les mails de l'Édition collective (T-146), hors rendez-vous (`mailsRdv.ts`).
 * Module PUR : aucun accès base, aucun réseau, aucune variable d'environnement.
 *
 * ⚠️ TEXTES PROPOSÉS PAR CLAUDE LE 15/10, À VALIDER PAR MATHIAS. Rien ne part
 * tant que `COLLECTIF_MAILS` n'est pas ouvert (`mails.ts`) : ce sont de vrais
 * mails à de vrais clients. Le texte vit ICI (et pas dans un modèle Brevo)
 * pour se relire, se tester au harnais et s'afficher en aperçu dans l'atelier.
 *
 * Masculin générique, vous ou tu selon le registre de l'édition, aucun tiret
 * cadratin (consigne de Mathias). Un lien vers l'espace du responsable porte
 * son token : il ne part qu'à SON adresse.
 */

export type Mail = { sujet: string; html: string; texte: string };

const ENCRE = "#1c1c1c";
const DOUX = "#6b6b6b";

function echapper(t: string): string {
  return t.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

/** Un paragraphe : son HTML (déjà échappé) et son texte brut. */
type Ligne = { html: string; texte: string };
const ligne = (t: string): Ligne => ({ html: echapper(t), texte: t });

/** La mise en page commune : celle des mails de rendez-vous, même maison. */
function page(p: { titre: string; bonjour: string; lignes: Ligne[]; bouton?: { href: string; libelle: string }; notes?: Ligne[] }): { html: string; texte: string } {
  const html = `<!doctype html><html lang="fr"><body style="margin:0;padding:0;background:#f6f2ec">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f6f2ec;padding:32px 16px"><tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:16px;padding:32px">
<tr><td style="font-family:Georgia,serif;font-size:13px;letter-spacing:2px;text-transform:uppercase;color:${DOUX}">Bellajour · Édition collective</td></tr>
<tr><td style="padding-top:12px;font-family:Georgia,serif;font-size:28px;line-height:1.2;color:${ENCRE}">${echapper(p.titre)}</td></tr>
<tr><td style="padding-top:18px;font-family:Arial,sans-serif;font-size:15px;line-height:1.6;color:${ENCRE}">${echapper(p.bonjour)}</td></tr>
${p.lignes.map((l) => `<tr><td style="padding-top:10px;font-family:Arial,sans-serif;font-size:15px;line-height:1.6;color:${ENCRE}">${l.html}</td></tr>`).join("\n")}
${p.bouton ? `<tr><td style="padding-top:22px"><a href="${echapper(p.bouton.href)}" style="display:inline-block;padding:12px 22px;border-radius:999px;background:${ENCRE};color:#ffffff;text-decoration:none;font-family:Arial,sans-serif;font-size:15px">${echapper(p.bouton.libelle)}</a></td></tr>` : ""}
${(p.notes ?? []).map((l) => `<tr><td style="padding-top:12px;font-family:Arial,sans-serif;font-size:13px;line-height:1.6;color:${DOUX}">${l.html}</td></tr>`).join("\n")}
<tr><td style="padding-top:24px;font-family:Arial,sans-serif;font-size:15px;line-height:1.6;color:${ENCRE}">À très vite,<br>L'atelier Bellajour</td></tr>
</table></td></tr></table></body></html>`;
  const texte = [
    p.bonjour,
    "",
    ...p.lignes.map((l) => l.texte),
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
  /** Le lien du responsable (son token) : il ne part qu'à son adresse. */
  lien: string;
  /** « 28 octobre », ou null si la clôture n'est pas fixée. */
  cloture: string | null;
  /** Le code par appareil (T-154) est en service : le mail le dit. */
  avecCode: boolean;
};

/** Le premier mail : l'espace est ouvert, voici le lien. Envoyé par l'atelier depuis la fiche. */
export function mailEspacePret(d: DonneesEspacePret): Mail {
  const v = (vous: string, toi: string) => (d.tu ? toi : vous);
  const lignes: Ligne[] = [
    ligne(
      v(
        `L'espace de « ${d.evenement} » (${d.organisation}) est ouvert. C'est là que vous choisissez le style de vos magazines, que vous réunissez les photos de tous et que vous échangez avec l'atelier.`,
        `L'espace de « ${d.evenement} » (${d.organisation}) est ouvert. C'est là que tu choisis le style de tes magazines, que tu réunis les photos de tous et que tu échanges avec l'atelier.`
      )
    ),
  ];
  if (d.cloture) lignes.push(ligne(v(`Les photos se réunissent jusqu'au ${d.cloture}.`, `Les photos se réunissent jusqu'au ${d.cloture}.`)));
  const notes: Ligne[] = [
    ligne(
      v(
        "Ce lien vous est personnel : gardez-le pour vous. Pour vos collègues, l'espace vous donne un lien d'équipe, en lecture seule, et un lien pour déposer leurs photos.",
        "Ce lien t'est personnel : garde-le pour toi. Pour tes collègues, l'espace te donne un lien d'équipe, en lecture seule, et un lien pour déposer leurs photos."
      )
    ),
  ];
  if (d.avecCode)
    notes.push(
      ligne(
        v(
          "La première fois que vous l'ouvrez sur un téléphone ou un ordinateur, nous vous envoyons un code à cette adresse.",
          "La première fois que tu l'ouvres sur un téléphone ou un ordinateur, nous t'envoyons un code à cette adresse."
        )
      )
    );
  const { html, texte } = page({
    titre: v("Votre espace est prêt", "Ton espace est prêt"),
    bonjour: bonjour(d.responsable),
    lignes,
    bouton: { href: d.lien, libelle: v("Ouvrir mon espace", "Ouvrir mon espace") },
    notes,
  });
  return { sujet: `${v("Votre", "Ton")} espace Bellajour est prêt · ${d.evenement}`, html, texte };
}

export type DonneesCodeAppareil = {
  tu: boolean;
  evenement: string;
  /** Les six chiffres, en clair : ce mail est le SEUL endroit où ils s'écrivent. */
  code: string;
  /** Sa durée de validité, en minutes. */
  minutes: number;
  /** L'adresse du site (bellajour.fr, ou la version d'essai) : la personne sait d'où vient la demande. */
  site: string;
};

/** Le code par appareil (T-154) : envoyé quand le lien du responsable s'ouvre sur un appareil inconnu. */
export function mailCodeAppareil(d: DonneesCodeAppareil): Mail {
  const v = (vous: string, toi: string) => (d.tu ? toi : vous);
  const espace = `${d.code.slice(0, 3)} ${d.code.slice(3)}`;
  const { html, texte } = page({
    titre: v("Votre code", "Ton code"),
    bonjour: "Bonjour,",
    lignes: [
      ligne(v(`Pour ouvrir l'espace de « ${d.evenement} » sur ce nouvel appareil, saisissez ce code :`, `Pour ouvrir l'espace de « ${d.evenement} » sur ce nouvel appareil, saisis ce code :`)),
      { html: `<span style="display:inline-block;padding:10px 18px;border-radius:12px;background:#f6f2ec;font-family:Arial,sans-serif;font-size:28px;letter-spacing:6px;color:#1c1c1c"><strong>${espace}</strong></span>`, texte: espace },
      ligne(`Il est valable ${d.minutes} minutes, sur l'appareil qui l'a demandé.`),
    ],
    notes: [
      ligne(
        v(
          "Vous n'êtes pas à l'origine de cette demande ? Ignorez ce mail : sans ce code, personne ne peut entrer dans votre espace.",
          "Tu n'es pas à l'origine de cette demande ? Ignore ce mail : sans ce code, personne ne peut entrer dans ton espace."
        )
      ),
      ligne(`Demande faite depuis ${d.site.replace(/^https?:\/\//, "")}.`),
    ],
  });
  return { sujet: `${v("Votre", "Ton")} code Bellajour : ${espace}`, html, texte };
}

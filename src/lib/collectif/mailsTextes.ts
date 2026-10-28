/**
 * Les mails de l'Édition collective (T-146), et LA mise en page de tous, y
 * compris les trois mails de rendez-vous (`mailsRdv.ts` importe `pageMail`).
 * Module PUR : aucun accès base, aucun réseau, aucune variable d'environnement.
 *
 * Relus par Mathias le 20/10 : tous « d'accord », avec deux retouches faites
 * ce jour-là. (1) Une seule maison : même en-tête, même bouton bleu, même
 * signature, « Bonjour <prénom> » partout où le nom est connu, l'objet coupé
 * par « · ». (2) « Votre espace est prêt » ne porte plus que SON lien.
 * Planche 6 du 21/10 (validée) : ce mail est ALLÉGÉ, un titre, deux lignes,
 * un bouton, une ligne pour la suite, la signature ; plus de blocs ni de
 * notes (l'ancien texte : archive/partage-liens-mail-2026-10/). « Le lien des
 * participants a changé » ne change pas pour l'instant. Rien ne part tant que
 * `COLLECTIF_MAILS` n'est pas ouvert (`mails.ts`) : ce sont de vrais mails à
 * de vrais clients, et l'ouvrir attend Mathias. Le texte vit ICI (et pas dans
 * un modèle Brevo) pour se relire, se tester au harnais et s'afficher en
 * aperçu dans l'atelier.
 *
 * ⚠️ Chaque endroit de l'espace qu'un mail nomme (« Ouvrir mon espace », la
 * page Photos, l'onglet « Les liens », « Partager ») est relu dans les écrans
 * par le harnais : renommer l'un sans le mail, c'est envoyer le client
 * chercher un bouton qui n'existe plus.
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
/* Les blocs (planche 6) : le fond Porcelaine. Le bouton : le bleu de Bellajour, le même dans les huit mails. */
const BLOC = "#f3f4f7";
const ACTION = "#4a90d9";
/* L'encadré du titre (retour de Mathias du 28/10 : « le titre en gras, dans un encadré », le logo en haut) : un bleu très
   clair, de la famille du bouton. Le logo est un PNG (un SVG ou un WebP ne s'affichent pas dans Outlook ni dans tous les Gmail),
   servi par le site à adresse fixe : `public/logo-mail-bleu.png`, 300 px affichés à 150 (net sur un écran Retina). ⚠️ Le logo
   n'est PAS un lien : chaque mail ne porte qu'UN `<a` (son bouton), le harnais le compte. */
const TITRE_FOND = "#eaf2fb";
const LOGO = "https://www.bellajour.fr/logo-mail-bleu.png";

function echapper(t: string): string {
  return t.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

/** Un paragraphe : son HTML (déjà échappé) et son texte brut. */
export type Ligne = { html: string; texte: string };
export const ligne = (t: string): Ligne => ({ html: echapper(t), texte: t });

/** Un bouton du mail. Il n'y en a qu'UN dessin, partout : le bleu de la planche 6. */
export type Bouton = { href: string; libelle: string };

const estBouton = (m: Ligne | Bouton): m is Bouton => "href" in m;

function boutonHtml(b: Bouton): string {
  return `<a href="${echapper(b.href)}" style="display:inline-block;padding:14px 28px;border-radius:999px;background:${ACTION};color:#ffffff;text-decoration:none;font-family:Arial,sans-serif;font-size:16px;font-weight:bold">${echapper(b.libelle)}</a>`;
}

/**
 * Un bloc du mail (planche 6) : un titre, une phrase, et parfois un bouton.
 * Depuis le 20/10, aucun bloc n'écrit plus une adresse en clair : un lien à
 * transmettre se trouve dans l'espace, qui sait le copier et le partager.
 */
type Bloc = { titre: string; phrase: string; bouton?: Bouton };

function blocHtml(b: Bloc): string {
  return `<tr><td style="padding-top:12px"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${BLOC};border-radius:12px"><tr><td style="padding:14px 16px">
<div style="font-family:Arial,sans-serif;font-size:15px;font-weight:bold;color:${ENCRE}">${echapper(b.titre)}</div>
<div style="padding-top:4px;font-family:Arial,sans-serif;font-size:13px;line-height:1.5;color:${DOUX}">${echapper(b.phrase)}</div>
${b.bouton ? `<div style="padding-top:12px">${boutonHtml(b.bouton)}</div>` : ""}
</td></tr></table></td></tr>`;
}

function blocTexte(b: Bloc): string[] {
  return ["", b.titre, b.phrase, ...(b.bouton ? [`${b.bouton.libelle} : ${b.bouton.href}`] : [])];
}

/**
 * LA mise en page des mails des éditions, rendez-vous compris : l'en-tête
 * « Bellajour · Édition collective », le titre, « Bonjour… », le corps (des
 * paragraphes et des boutons, dans l'ordre), les blocs, les notes en petit,
 * la signature. Un nouveau mail des éditions passe par elle.
 */
export function pageMail(p: { titre: string; bonjour: string; lignes: (Ligne | Bouton)[]; blocs?: Bloc[]; notes?: Ligne[] }): { html: string; texte: string } {
  const corps = p.lignes
    .map((m, i) => {
      if (estBouton(m)) return `<tr><td style="padding-top:22px">${boutonHtml(m)}</td></tr>`;
      const apresBouton = i > 0 && estBouton(p.lignes[i - 1]);
      return `<tr><td style="padding-top:${apresBouton ? 22 : 10}px;font-family:Arial,sans-serif;font-size:15px;line-height:1.6;color:${ENCRE}">${m.html}</td></tr>`;
    })
    .join("\n");
  const html = `<!doctype html><html lang="fr"><body style="margin:0;padding:0;background:#f3f4f7">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f3f4f7;padding:32px 16px"><tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:16px;padding:32px">
<tr><td><img src="${LOGO}" width="150" height="56" alt="Bellajour" style="display:block;width:150px;height:auto;border:0"></td></tr>
<tr><td style="padding-top:20px"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${TITRE_FOND};border-radius:14px"><tr><td style="padding:18px 22px">
<div style="font-family:Arial,sans-serif;font-size:11px;font-weight:bold;letter-spacing:2px;text-transform:uppercase;color:${ACTION}">Édition collective</div>
<div style="padding-top:6px;font-family:Georgia,serif;font-size:26px;font-weight:bold;line-height:1.2;color:${ENCRE}">${echapper(p.titre)}</div>
</td></tr></table></td></tr>
<tr><td style="padding-top:22px;font-family:Arial,sans-serif;font-size:16px;font-weight:bold;line-height:1.6;color:${ENCRE}">${echapper(p.bonjour)}</td></tr>
${corps}
${(p.blocs ?? []).map(blocHtml).join("\n")}
${(p.notes ?? []).map((l) => `<tr><td style="padding-top:12px;font-family:Arial,sans-serif;font-size:13px;line-height:1.6;color:${DOUX}">${l.html}</td></tr>`).join("\n")}
<tr><td style="padding-top:28px"><div style="border-top:1px solid #e4e6eb;padding-top:16px;font-family:Arial,sans-serif;font-size:14px;line-height:1.6;color:${DOUX}">À très vite,<br><span style="color:${ENCRE};font-weight:bold">L'atelier Bellajour</span></div></td></tr>
</table></td></tr></table></body></html>`;
  const texteCorps = p.lignes.flatMap((m, i) => {
    if (estBouton(m)) return ["", `${m.libelle} : ${m.href}`];
    return i > 0 && estBouton(p.lignes[i - 1]) ? ["", m.texte] : [m.texte];
  });
  const texte = [
    p.bonjour,
    "",
    ...texteCorps,
    ...(p.blocs ?? []).flatMap(blocTexte),
    ...(p.notes?.length ? ["", ...p.notes.map((l) => l.texte)] : []),
    "",
    "À très vite,",
    "L'atelier Bellajour",
  ].join("\n");
  return { html, texte };
}

/** « Bonjour Camille, » ; sans nom, « Bonjour, ». */
export function bonjour(nom: string | null): string {
  const prenom = (nom ?? "").trim().split(/\s+/)[0];
  return prenom ? `Bonjour ${prenom},` : "Bonjour,";
}

export type DonneesEspacePret = {
  tu: boolean;
  organisation: string;
  evenement: string;
  responsable: string | null;
  /**
   * Les liens de l'édition (T-187), lus par `liensEdition`. Le MAIL n'écrit que
   * le sien (son token, il ne part qu'à son adresse). L'écran « L'édition est
   * créée » montre et copie le sien et celui de l'équipe ; l'adresse de dépôt
   * (`depot`) n'est plus montrée ni envoyée (planche 5, 21/10) : l'écran ne
   * s'en sert que pour former les liens de groupe qu'il crée.
   */
  liens: { responsable: string; equipe: string; depot: string };
  /** « 28 octobre », ou null si la clôture n'est pas fixée (la ligne de résumé de l'écran). */
  cloture: string | null;
};

/**
 * Ce que le mail « Votre espace est prêt » lit d'une édition : la route ET l'écran « L'édition est
 * créée » passent par ici. Depuis la planche 6 du 21/10, le mail ne dit plus ni l'adresse courte
 * « Lien perdu ? » ni le code par appareil (l'espace l'explique quand on en a besoin) : ni
 * `retrouver` ni `avecCode` ici (« Le lien des participants a changé » garde les siens).
 */
export function donneesEspacePret(
  e: TokensEdition & { registre: string; organisation: string; evenement: string; responsable_nom: string | null; cloture_le: string | null },
  origine: string
): DonneesEspacePret {
  return {
    tu: e.registre === "ecole_tu",
    organisation: e.organisation,
    evenement: e.evenement,
    responsable: e.responsable_nom,
    liens: liensEdition(origine, e),
    cloture: e.cloture_le ? formaterJourParis(e.cloture_le) || null : null,
  };
}

/**
 * Où se trouve le lien des participants dans l'espace, et ce que l'espace en
 * fait (`Liens.tsx`, « Partager » ; la fenêtre de partage de
 * `LienContribution.tsx` : le QR code, le message de `partage.ts`, WhatsApp,
 * Mail). Ne sert plus qu'au mail « Le lien des participants a changé », qui ne
 * change pas pour l'instant (planche 6 du 21/10, « dans un second temps »).
 */
function ouTrouverLienParticipants(tu: boolean, cloture: string | null, qr: "le QR code" | "le nouveau QR code"): string {
  const pour = cloture ? `Pour que chacun dépose ses photos, jusqu'au ${cloture}.` : "Pour que chacun dépose ses photos.";
  return tu
    ? `${pour} Il est dans ton espace, page Photos, onglet « Les liens » : « Partager » y prépare le message et ${qr}, à envoyer par WhatsApp ou par mail.`
    : `${pour} Il est dans votre espace, page Photos, onglet « Les liens » : « Partager » y prépare le message et ${qr}, à envoyer par WhatsApp ou par mail.`;
}

/**
 * Le premier mail : l'espace est ouvert, voici SON lien (planche 6 du 21/10, validée par
 * Mathias, « allégé ») : un titre, « Bonjour <prénom>, », deux lignes (l'espace est ouvert ; ce
 * lien est le sien, il y fait tout), UN bouton « Ouvrir mon espace », une ligne pour la suite
 * (« Votre équipe et les participants : tout se partage depuis l'espace. »), la signature. Même
 * `pageMail` que les autres : on a retiré des blocs, rien redessiné. Plus aucun bloc « Le lien de
 * votre équipe » ni « Le lien des participants », plus de note « Lien perdu ? » ni du code par
 * appareil. Envoyé par l'atelier depuis la fiche ou l'écran « L'édition est créée ».
 */
export function mailEspacePret(d: DonneesEspacePret): Mail {
  const v = (vous: string, toi: string) => (d.tu ? toi : vous);
  const { html, texte } = pageMail({
    titre: v("Votre espace est prêt", "Ton espace est prêt"),
    bonjour: bonjour(d.responsable),
    lignes: [
      ligne(v(`L'espace de votre édition « ${d.evenement} » est ouvert.`, `L'espace de ton édition « ${d.evenement} » est ouvert.`)),
      ligne(v("Photos, style, bon à tirer : tout s'y fait depuis ce lien. Gardez-le pour vous.", "Photos, style, bon à tirer : tout s'y fait depuis ce lien. Garde-le pour toi.")),
      { href: d.liens.responsable, libelle: "Ouvrir mon espace" },
      ligne(v("Votre équipe et les participants : tout se partage depuis l'espace.", "Ton équipe et les participants : tout se partage depuis l'espace.")),
    ],
  });
  return { sujet: `${v("Votre", "Ton")} espace Bellajour est prêt · ${d.evenement}`, html, texte };
}

/* ─────────────── « Votre lien a changé » (T-196, décision de Mathias du 20/10) ───────────────
   Quand l'ATELIER régénère le lien du responsable ou celui des participants, le
   responsable apprend que l'ancien ne marche plus et reçoit le nouveau. Le lien de
   l'équipe n'en a pas (il se transmet par le responsable) ; un lien de contribution
   supprimé par le responsable non plus (il ne veut peut-être plus que ces personnes
   l'aient) : sa page dit seulement « Ce lien ne fonctionne plus ». Texte proposé par
   Claude le 20/10, relu par Mathias le même jour ; retouche : le nouveau lien des
   participants ne s'écrit plus, le mail dit où il est dans l'espace (page Photos,
   onglet « Les liens ») et ouvre SON espace. Rien ne part tant que `COLLECTIF_MAILS`
   est fermé. */

/** Les deux liens dont la régénération prévient le responsable. */
export type LienPrevenu = "responsable" | "depot";

export function lienPrevenu(quel: string): quel is LienPrevenu {
  return quel === "responsable" || quel === "depot";
}

export type DonneesLienRegenere = {
  tu: boolean;
  quel: LienPrevenu;
  evenement: string;
  responsable: string | null;
  /**
   * Le lien qui a changé, tel qu'il est maintenant : le sien ou celui des
   * participants. Le mail ne l'écrit que pour le sien ; celui des participants
   * se trouve dans l'espace (20/10).
   */
  lien: string;
  /** SON lien (son token) : le bouton « Ouvrir mon espace ». Le mail ne part qu'à son adresse. */
  espace: string;
  /** Les liens de contribution actifs, coupés avec le lien des participants (ils portent son token). */
  contributions: number;
  /** « 28 octobre », ou null si la clôture n'est pas fixée. */
  cloture: string | null;
  /** Le code par appareil (T-154) est en service : un nouveau lien du responsable rend ses appareils inconnus. */
  avecCode: boolean;
  /** L'adresse courte pour retrouver son lien (« bellajour.fr/espace »), ou null. */
  retrouver: string | null;
};

/** Ce que le mail lit d'une édition (APRÈS la régénération : les tokens sont les nouveaux). La route ET l'aperçu passent par ici. */
export function donneesLienRegenere(
  e: TokensEdition & { registre: string; evenement: string; responsable_nom: string | null; cloture_le: string | null },
  quel: LienPrevenu,
  origine: string,
  contributions: number,
  avecCode: boolean
): DonneesLienRegenere {
  const liens = liensEdition(origine, e);
  return {
    tu: e.registre === "ecole_tu",
    quel,
    evenement: e.evenement,
    responsable: e.responsable_nom,
    lien: quel === "responsable" ? liens.responsable : liens.depot,
    espace: liens.responsable,
    contributions: Math.max(0, Math.floor(contributions)),
    cloture: e.cloture_le ? formaterJourParis(e.cloture_le) || null : null,
    avecCode,
    retrouver: origine ? `${origine.replace(/^https?:\/\//, "")}/espace` : null,
  };
}

export function mailLienRegenere(d: DonneesLienRegenere): Mail {
  const v = (vous: string, toi: string) => (d.tu ? toi : vous);
  const notes: Ligne[] = [];
  if (d.retrouver)
    notes.push(ligne(v(`Lien perdu ? Retrouvez-le à tout moment sur ${d.retrouver}.`, `Lien perdu ? Retrouve-le à tout moment sur ${d.retrouver}.`)));

  if (d.quel === "responsable") {
    notes.unshift(ligne(v("Ce lien vous est personnel : gardez ce mail, il vous servira à revenir.", "Ce lien t'est personnel : garde ce mail, il te servira à revenir.")));
    if (d.avecCode)
      notes.push(
        ligne(
          v(
            "Sur chaque téléphone ou ordinateur, l'espace s'ouvre d'abord en lecture : pour modifier, il vous envoie un code à cette adresse.",
            "Sur chaque téléphone ou ordinateur, l'espace s'ouvre d'abord en lecture : pour modifier, il t'envoie un code à cette adresse."
          )
        )
      );
    const { html, texte } = pageMail({
      titre: v("Votre lien a changé", "Ton lien a changé"),
      bonjour: bonjour(d.responsable),
      lignes: [
        ligne(
          v(
            `L'atelier a changé le lien de votre espace « ${d.evenement} » : l'ancien ne fonctionne plus. Voici le nouveau.`,
            `L'atelier a changé le lien de ton espace « ${d.evenement} » : l'ancien ne fonctionne plus. Voici le nouveau.`
          )
        ),
        { href: d.lien, libelle: "Ouvrir mon espace" },
      ],
      notes,
    });
    return { sujet: `${v("Votre nouveau lien", "Ton nouveau lien")} Bellajour · ${d.evenement}`, html, texte };
  }

  const lignes: Ligne[] = [
    ligne(
      v(
        `L'atelier a changé le lien des participants de « ${d.evenement} » : l'ancien ne fonctionne plus, ni le QR code qui y menait. Partagez le nouveau à sa place.`,
        `L'atelier a changé le lien des participants de « ${d.evenement} » : l'ancien ne fonctionne plus, ni le QR code qui y menait. Partage le nouveau à sa place.`
      )
    ),
    ligne("Les photos déjà reçues sont gardées."),
  ];
  if (d.contributions === 1)
    lignes.push(
      ligne(
        v(
          "Votre lien de contribution a changé aussi : retrouvez-le dans votre espace, page Photos, onglet « Les liens », et partagez-le de nouveau.",
          "Ton lien de contribution a changé aussi : retrouve-le dans ton espace, page Photos, onglet « Les liens », et partage-le de nouveau."
        )
      )
    );
  else if (d.contributions > 1)
    lignes.push(
      ligne(
        v(
          `Vos ${d.contributions} liens de contribution ont changé aussi : retrouvez-les dans votre espace, page Photos, onglet « Les liens », et partagez-les de nouveau.`,
          `Tes ${d.contributions} liens de contribution ont changé aussi : retrouve-les dans ton espace, page Photos, onglet « Les liens », et partage-les de nouveau.`
        )
      )
    );
  const { html, texte } = pageMail({
    titre: "Le lien des participants a changé",
    bonjour: bonjour(d.responsable),
    lignes,
    blocs: [
      {
        titre: "Le nouveau lien des participants",
        phrase: ouTrouverLienParticipants(d.tu, d.cloture, "le nouveau QR code"),
        bouton: { href: d.espace, libelle: "Ouvrir mon espace" },
      },
    ],
    notes,
  });
  return { sujet: `Nouveau lien des participants · ${d.evenement}`, html, texte };
}

export type DonneesCodeAppareil = {
  tu: boolean;
  evenement: string;
  /** Le nom du responsable (« Bonjour Camille, »), ou null : « Bonjour, ». Le code ne part qu'à son adresse. */
  responsable: string | null;
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
  const { html, texte } = pageMail({
    titre: v("Votre code", "Ton code"),
    bonjour: bonjour(d.responsable),
    lignes: [
      ligne(v(`Pour modifier l'espace de « ${d.evenement} » depuis ce nouvel appareil, saisissez ce code :`, `Pour modifier l'espace de « ${d.evenement} » depuis ce nouvel appareil, saisis ce code :`)),
      /* Le code dans un bloc, du fond des blocs (Porcelaine). */
      { html: `<span style="display:inline-block;padding:10px 18px;border-radius:12px;background:${BLOC};font-family:Arial,sans-serif;font-size:28px;letter-spacing:6px;color:${ENCRE}"><strong>${espace}</strong></span>`, texte: espace },
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
  const { html, texte } = pageMail({
    titre: v("Votre lien", "Ton lien"),
    bonjour: bonjour(d.responsable),
    lignes: [
      ligne(v(`Voici le lien de votre espace « ${d.evenement} » (${d.organisation}).`, `Voici le lien de ton espace « ${d.evenement} » (${d.organisation}).`)),
      { href: d.lien, libelle: "Ouvrir mon espace" },
    ],
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

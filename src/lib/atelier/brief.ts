/**
 * Le brief de composition : ce qu'il faut savoir pour ouvrir Canva.
 *
 * ══════════════════════════════════════════════════════════════════════════
 * POURQUOI UN FICHIER TEXTE ET PAS UN ÉCRAN DE PLUS
 *
 * Les notes de l'éditeur, l'occasion et l'histoire vivent dans la fiche. Or
 * celui qui compose ne travaille pas dans la fiche : il travaille dans Canva,
 * avec un dossier de photos ouvert à côté. Tant que la matière reste dans le
 * back-office, elle demande un aller-retour par onglet interposé, et un
 * aller-retour qui coûte, on finit par ne plus le faire. Les notes cessent
 * alors de servir à quoi que ce soit.
 *
 * Le brief voyage donc AVEC les photos, dans le même dossier, sous un nom qui
 * se range en premier. Il ne remplace pas la fiche (qui reste la source
 * vivante) : il en emporte la part qui sert à composer, au moment où l'on
 * compose.
 *
 * Ce module est PUR : pas de DOM, pas de base, pas d'horloge implicite.
 * `maintenant` est passé, comme dans urgence.ts, pour que le texte produit
 * soit reproductible au clavier.
 * ══════════════════════════════════════════════════════════════════════════
 *
 * ⚠️ Ce fichier est INTERNE. Il porte des notes que la cliente ne doit jamais
 * lire. Il n'est écrit que sur le disque de l'atelier, et rien dans le code
 * ne l'envoie nulle part.
 */

/* La reliure se déduit de la pagination, par la MÊME fonction que le prix et
   que la référence Cloudprinter : le brief ne peut donc pas annoncer un dos
   carré là où l'imprimeur recevra un agrafé. `grille.ts` est pur. */
import { reliurePour, RELIURE_LIBELLE } from './grille';
/* T-123 — ce que les photos savent d'elles-mêmes : deux modules purs, comme
   celui-ci. Le brief en tire un bloc « chronologie et lieux » que l'atelier
   lit avant d'ouvrir le lot. */
import {
  estCaptureEcran,
  jourEnClair,
  periodeEnClair,
  resumeChronologie,
  type MetaPhoto,
} from './metadonnees';
import { lieuEnClair, resumeLieux } from './lieux';

/** Ce dont le brief a besoin. Volontairement étroit : le brief ne connaît pas
 *  la fiche, la fiche lui donne ce qu'il demande. */
export type MatiereBrief = {
  titre: string | null;
  prenom: string | null;
  email: string | null;
  token: string;
  libelleEtat: string;
  nbPhotos: number;
  nbPages: number | null;
  euros: number | null;
  createdAt: string | null;
  occasion: string | null;
  histoire: string | null;
  /** Les mots de couverture facultatifs de l'écran 3 (03/09). Null la
      plupart du temps : le bloc n'apparaît dans le brief que s'ils existent. */
  sousTitre: string | null;
  motQuatrieme: string | null;
  /**
   * Ce que le client a RÉPONDU sur sa couverture (11/09/2026).
   *
   * Le type est recopié plutôt qu'importé d'`apercu.ts` : ce module est pur
   * et le sien tire le SDK AWS. Même choix que `types.ts` côté admin.
   *
   * `null` = il n'a rien dit, et la ligne N'APPARAÎT PAS. Écrire « couverture
   * 1 » par défaut ferait composer sur la proposition de l'atelier en croyant
   * suivre le client : ce sont deux choses différentes, et c'est justement la
   * différence qu'on vient chercher dans ce fichier.
   */
  choixCouverture: { rang: number } | { indifferent: true } | null;
  /** Le lien d'ÉDITION, interne (PRD §11). Il ne part jamais chez le client. */
  canvaTravail: string | null;
  notes: Array<{ prenom: string; texte: string; createdAt: string }>;
  /**
   * T-123 — les photos avec ce qu'elles savent d'elles-mêmes, dans l'ORDRE
   * DU DÉPÔT (celui des noms de fichiers du lot). Facultatif : un appelant
   * qui ne les a pas ne perd que le bloc. `doublonDe` désigne l'originale
   * dont la photo est une copie (calculé par `empreinte.ts`).
   */
  photos?: Array<MetaPhoto & { doublonDe: string | null }>;
};

/* Une largeur de colonne, pas une largeur de fenêtre : le brief se lit dans
   un aperçu Finder ou un TextEdit non maximisé, à côté de Canva. */
const COLONNE = 74;

/** Nom du fichier. Les deux zéros le rangent en tête du dossier. */
export const NOM_BRIEF = "00-BRIEF.txt";

function dateCourte(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric" });
}

function dateHeure(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleString("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/** Repli à la largeur de colonne, en respectant les retours déjà écrits. */
export function plier(texte: string, largeur = COLONNE): string {
  return texte
    .split("\n")
    .map((paragraphe) => {
      const mots = paragraphe.trim().split(/\s+/).filter(Boolean);
      if (!mots.length) return "";
      const lignes: string[] = [];
      let courante = "";
      for (const mot of mots) {
        if (!courante) courante = mot;
        else if (courante.length + 1 + mot.length <= largeur) courante += ` ${mot}`;
        else {
          lignes.push(courante);
          courante = mot;
        }
      }
      lignes.push(courante);
      return lignes.join("\n");
    })
    .join("\n");
}

function bloc(titre: string, corps: string): string {
  return `${titre}\n${"-".repeat(titre.length)}\n${corps}\n`;
}

/**
 * La valeur de la ligne « Couverture choisie », ou "" s'il n'a rien dit.
 *
 * Le rang est interne (0-based), le numéro écrit ne l'est pas : la conversion
 * se fait une fois, ici. Pas de tiret cadratin, comme partout dans ce fichier :
 * il finit ouvert dans TextEdit ou collé dans un message.
 */
function choixEnClair(choix: { rang: number } | { indifferent: true } | null): string {
  if (choix === null) return "";
  if ("indifferent" in choix) return "sans préférence, il nous fait confiance";
  return `${choix.rang + 1}`;
}

/* Au-delà, on ne liste plus les jours un par un : un mois de vacances ferait
   trente lignes que personne ne lirait. */
const JOURS_DETAILLES_MAX = 14;

/**
 * Le corps du bloc « chronologie et lieux », ou "" s'il n'y a rien à dire.
 * Exporté pour le harnais.
 */
export function blocChronologie(photos: NonNullable<MatiereBrief["photos"]>): string {
  const lues = photos.filter((p) => p.metadonneesLe);
  if (!lues.length) return "";
  const lignes: string[] = [];
  const nomDe = (id: string) => photos.find((p) => p.id === id)?.nom ?? id.slice(0, 8);
  const pluriel = (n: number, mot: string) => `${n} ${mot}${n > 1 ? "s" : ""}`;

  const c = resumeChronologie(photos);
  if (c.premier && c.dernier) {
    const periode = periodeEnClair(c.premier, c.dernier);
    lignes.push(
      `${periode.charAt(0).toUpperCase()}${periode.slice(1)}${c.jours > 1 ? ` (${c.jours} jours)` : ""}. ` +
        `${pluriel(c.datees, "photo")} datée${c.datees > 1 ? "s" : ""} sur ${photos.length}.`,
    );
    if (c.parJour.length > 1 && c.parJour.length <= JOURS_DETAILLES_MAX) {
      for (const j of c.parJour) lignes.push(`  ${jourEnClair(j.jour, false)} : ${pluriel(j.n, "photo")}`);
    }
  } else {
    lignes.push(`Aucune photo datée sur ${photos.length} : l'ordre du dépôt est le seul repère.`);
  }

  const lieux = resumeLieux(photos);
  if (lieux.length) {
    lignes.push("");
    lignes.push(lieux.length > 1 ? "Les lieux, dans l'ordre où on y arrive :" : "Le lieu :");
    for (const l of lieux) {
      const quand = l.premier && l.dernier ? `, ${periodeEnClair(l.premier, l.dernier).replace(/ \d{4}$/, "")}` : "";
      lignes.push(`  ${lieuEnClair(l)} : ${pluriel(l.n, "photo")}${quand}`);
    }
  }

  const doublons = photos.filter((p) => p.doublonDe);
  if (doublons.length) {
    lignes.push("");
    lignes.push("Doublons (la même image deux fois, la plus ancienne fait foi) :");
    for (const d of doublons) lignes.push(`  ${d.nom ?? d.id.slice(0, 8)} = copie de ${nomDe(d.doublonDe!)}`);
  }

  const captures = photos.filter((p) => estCaptureEcran(p));
  if (captures.length) {
    lignes.push("");
    lignes.push(`Captures d'écran : ${captures.map((p) => p.nom ?? p.id.slice(0, 8)).join(", ")}`);
  }

  lignes.push("");
  lignes.push(
    plier(
      "Le lot est numéroté dans l'ordre du dépôt, celui que le client a choisi. Les dates et les lieux sont lus dans les fichiers : ils aident à ordonner, ils ne racontent pas sa vie.",
    ),
  );
  return lignes.join("\n");
}

/**
 * Le brief, en texte brut.
 *
 * Aucun tiret cadratin nulle part : ce fichier finit ouvert dans TextEdit, un
 * aperçu Finder ou collé dans un message, et la consigne de la maison vaut
 * ici comme pour les mails.
 */
export function composerBrief(m: MatiereBrief, maintenant: Date): string {
  const titre = m.titre?.trim() || "Numéro sans titre";
  const morceaux: string[] = [];

  morceaux.push(`BELLAJOUR · LE BRIEF DE COMPOSITION`);
  morceaux.push(titre.toUpperCase());
  morceaux.push("=".repeat(Math.min(COLONNE, Math.max(titre.length, 34))));
  morceaux.push("");

  const fiches: Array<[string, string]> = [
    ["Client", [m.prenom?.trim(), m.email?.trim()].filter(Boolean).join(" · ") || "inconnu"],
    ["Dossier", m.token.slice(0, 8)],
    ["Étape", m.libelleEtat],
    ["Photos", `${m.nbPhotos}`],
  ];
  if (m.nbPages) {
    /* La RELIURE, plus le code de palier (10/09/2026) : c'est l'information
       dont l'atelier a besoin en ouvrant le brief — agrafé ou dos carré change
       la façon de monter la couverture. « p40 » ne nommait plus rien. */
    const reliure = reliurePour(m.nbPages);
    const mot = reliure ? ` (${RELIURE_LIBELLE[reliure]})` : "";
    const prix = m.euros ? `, ${m.euros} €` : "";
    fiches.push(["Pages", `${m.nbPages}${mot}${prix}`]);
  }
  /* ── CE QUE LE CLIENT A DEMANDÉ (11/09/2026) ────────────────────────
     Dans l'en-tête, avec la pagination et la reliure, et pas dans un bloc à
     part : c'est un FAIT du dossier, et celui qui compose le lit avant
     d'ouvrir quoi que ce soit. Absente quand il n'a rien dit — écrire
     « couverture 1 » par défaut ferait composer la proposition de l'atelier
     en croyant suivre le client. */
  const choix = choixEnClair(m.choixCouverture);
  if (choix) fiches.push(["Couverture choisie", choix]);
  if (m.createdAt) fiches.push(["Ouvert le", dateCourte(m.createdAt)]);
  if (m.canvaTravail) fiches.push(["Canva (travail)", m.canvaTravail]);

  const large = Math.max(...fiches.map(([k]) => k.length));
  for (const [cle, valeur] of fiches) morceaux.push(`${cle.padEnd(large)}  ${valeur}`);
  morceaux.push("");

  morceaux.push(bloc("L'OCCASION", plier(m.occasion?.trim() || "Il ne l'a pas précisée.")));

  /* Les mots de couverture : un bloc SEULEMENT s'il y a quelque chose à
     composer. La plupart des dossiers n'en ont pas, et un bloc vide se
     lirait comme un oubli. */
  const motsCouverture = [
    m.sousTitre?.trim() ? `Sous-titre (1re de couverture) : ${m.sousTitre.trim()}` : "",
    m.motQuatrieme?.trim() ? `Quatrième de couverture : ${m.motQuatrieme.trim()}` : "",
  ].filter(Boolean);
  if (motsCouverture.length) {
    morceaux.push(bloc("LES MOTS DE COUVERTURE", plier(motsCouverture.join("\n"))));
  }

  morceaux.push(
    bloc("SON HISTOIRE, DANS SES MOTS", plier(m.histoire?.trim() || "Il n'a rien écrit.")),
  );

  /* ── T-123 : LA CHRONOLOGIE ET LES LIEUX ──────────────────────────
     Ce que les fichiers savent : quand, où, lesquels sont des copies. Un
     bloc SEULEMENT si quelque chose a été lu ; un dossier antérieur au
     21/09 n'a rien, et un bloc vide se lirait comme une panne. Ce sont des
     lectures de fichiers, pas des vérités sur sa vie : le brief le dit. */
  const chrono = blocChronologie(m.photos ?? []);
  if (chrono) morceaux.push(bloc("LA CHRONOLOGIE ET LES LIEUX", chrono));

  /* Chronologique, la plus ancienne d'abord : le carnet se lit comme une
     conversation, pas comme un fil d'actualité. L'écran, lui, montre la plus
     récente en haut, parce qu'on y vient pour voir ce qui vient d'être dit. */
  const notes = [...m.notes].sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  morceaux.push(
    bloc(
      "LE CARNET DE L'ÉDITEUR",
      notes.length
        ? notes
            .map((n) => `[${dateHeure(n.createdAt)} · ${n.prenom}]\n${plier(n.texte, COLONNE - 2)
              .split("\n")
              .map((l) => `  ${l}`)
              .join("\n")}`)
            .join("\n\n")
        : "Rien de noté.",
    ),
  );

  morceaux.push("");
  morceaux.push(
    plier(
      `Document interne, écrit le ${dateHeure(maintenant.toISOString())}. Il ne part jamais chez le client. La fiche du dossier reste la source vivante : si tu ajoutes une note pendant la composition, écris-la dans le carnet, pas ici.`,
    ),
  );

  return morceaux.join("\n").replace(/\n{3,}/g, "\n\n") + "\n";
}

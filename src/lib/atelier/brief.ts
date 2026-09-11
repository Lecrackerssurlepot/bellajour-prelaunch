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
  /** Le lien d'ÉDITION, interne (PRD §11). Il ne part jamais chez la cliente. */
  canvaTravail: string | null;
  notes: Array<{ prenom: string; texte: string; createdAt: string }>;
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
    ["Cliente", [m.prenom?.trim(), m.email?.trim()].filter(Boolean).join(" · ") || "inconnue"],
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

  morceaux.push(bloc("L'OCCASION", plier(m.occasion?.trim() || "Elle ne l'a pas précisée.")));

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
    bloc("SON HISTOIRE, DANS SES MOTS", plier(m.histoire?.trim() || "Elle n'a rien écrit.")),
  );

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
      `Document interne, écrit le ${dateHeure(maintenant.toISOString())}. Il ne part jamais chez la cliente. La fiche du dossier reste la source vivante : si tu ajoutes une note pendant la composition, écris-la dans le carnet, pas ici.`,
    ),
  );

  return morceaux.join("\n").replace(/\n{3,}/g, "\n\n") + "\n";
}

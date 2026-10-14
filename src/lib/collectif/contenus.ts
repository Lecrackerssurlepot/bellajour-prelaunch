/**
 * Les contenus que le client envoie à l'atelier (PRD §14.2, « À envoyer à
 * l'atelier ») : un FICHIER (logo, programme, liste, rubrique) ou un
 * QUESTIONNAIRE question par question (le mot du dirigeant).
 * Module PUR : aucun accès base, aucun réseau, aucune variable d'environnement.
 *
 * Le fichier passe PAR LE SERVEUR (4 Mo au plus, la limite d'un corps de
 * requête Vercel), comme les documents de l'atelier ; il est servi en
 * téléchargement (jamais affiché dans la page : un SVG ou un PDF n'exécute
 * rien chez nous). Envoyer de nouveau un contenu le REMPLACE à l'écran : le
 * plus récent gagne, l'ancien reste en base (rien ne s'efface).
 */

import type { CleContenu } from "./types";

export const OCTETS_MAX_CONTENU = 4 * 1024 * 1024;

export type ContenuClient = {
  cle: CleContenu;
  /** La puce du tableau de bord (maquette Espace). */
  libelle: string;
  /** Le titre de la fenêtre. */
  titre: string;
  mode: "fichier" | "questionnaire";
  /** Les extensions acceptées, dans l'ordre où l'écran les cite. */
  extensions: readonly string[];
  aide: string;
};

export const CONTENUS_CLIENT: readonly ContenuClient[] = [
  {
    cle: "logo",
    libelle: "Logo",
    titre: "Votre logo",
    mode: "fichier",
    extensions: ["svg", "pdf", "ai", "eps", "png"],
    aide: "Le fichier vectoriel si vous l'avez (SVG, PDF, AI) : il reste net à toutes les tailles.",
  },
  {
    cle: "programme",
    libelle: "Programme",
    titre: "Le programme",
    mode: "fichier",
    extensions: ["pdf", "docx", "jpg", "png"],
    aide: "Le déroulé de l'événement : il aide l'atelier à ranger les photos dans l'ordre.",
  },
  {
    cle: "mot",
    libelle: "Mot du dirigeant",
    titre: "Le mot du dirigeant",
    mode: "questionnaire",
    extensions: [],
    aide: "Quelques questions courtes. L'atelier écrit le texte à partir de vos réponses, et vous le relisez au bon à tirer.",
  },
  {
    cle: "liste",
    libelle: "Liste des participants",
    titre: "La liste des participants",
    mode: "fichier",
    extensions: ["xlsx", "csv", "pdf", "docx"],
    aide: "Les noms tels qu'ils doivent s'écrire dans le magazine.",
  },
  {
    cle: "rubrique",
    libelle: "Rubrique",
    titre: "La rubrique à contenu fourni",
    mode: "fichier",
    extensions: ["pdf", "docx", "jpg", "png"],
    aide: "Le texte ou les images de la rubrique que vous fournissez.",
  },
];

/**
 * ⚠️ PROPOSITION À RELIRE PAR MATHIAS (PRD §12.14) : la maquette n'écrit
 * qu'une question, et elle est fictive (« ces trois jours »). Quatre
 * questions neutres, valables pour tout événement ; les remplacer ici suffit.
 */
export const QUESTIONS_MOT = [
  "Que retenez-vous de cet événement ?",
  "Une personne ou un moment à remercier ?",
  "Ce que cette édition dit de votre équipe ?",
  "Un mot pour la suite ?",
] as const;

export const REPONSE_MAX = 2000;

export function contenuClient(cle: unknown): ContenuClient | null {
  return CONTENUS_CLIENT.find((c) => c.cle === cle) ?? null;
}

/** Le type de fichier qu'on écrit au coffre, par extension (jamais celui que le navigateur annonce). */
export const TYPE_PAR_EXTENSION: Record<string, string> = {
  svg: "image/svg+xml",
  pdf: "application/pdf",
  ai: "application/postscript",
  eps: "application/postscript",
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  csv: "text/csv",
};

export type FichierLu = { ok: true; extension: string; type: string } | { ok: false; message: string };

/** Un fichier pour ce contenu : une extension attendue, pas vide, 4 Mo au plus. */
export function lireFichierContenu(c: ContenuClient, nom: string, taille: number): FichierLu {
  if (c.mode !== "fichier") return { ok: false, message: "Ce contenu se remplit en répondant aux questions." };
  const m = /\.([A-Za-z0-9]{1,5})$/.exec(nom.trim());
  const ext = m ? m[1].toLowerCase().replace(/^jpeg$/, "jpg") : "";
  if (!c.extensions.includes(ext)) return { ok: false, message: `Format accepté : ${c.extensions.map((e) => e.toUpperCase()).join(", ")}.` };
  if (!Number.isFinite(taille) || taille <= 0) return { ok: false, message: "Ce fichier est vide." };
  if (taille > OCTETS_MAX_CONTENU) return { ok: false, message: "4 Mo au plus. Pour un fichier plus lourd, écrivez à l'atelier." };
  return { ok: true, extension: ext, type: TYPE_PAR_EXTENSION[ext] ?? "application/octet-stream" };
}

export type ReponsesLues = { ok: true; reponses: Record<string, string> } | { ok: false; message: string };

/** Les réponses du questionnaire : au moins une, chacune bornée ; les clés sont les questions elles-mêmes. */
export function lireReponsesMot(brut: unknown): ReponsesLues {
  const liste = Array.isArray(brut) ? brut : [];
  const reponses: Record<string, string> = {};
  QUESTIONS_MOT.forEach((q, i) => {
    const v = typeof liste[i] === "string" ? (liste[i] as string).trim().slice(0, REPONSE_MAX) : "";
    if (v) reponses[q] = v;
  });
  if (!Object.keys(reponses).length) return { ok: false, message: "Répondre à au moins une question." };
  return { ok: true, reponses };
}

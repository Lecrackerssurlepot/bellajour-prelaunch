/**
 * Les documents que l'atelier pose dans « Votre dossier » (PRD §4.2, §8).
 * Module PUR : aucun accès base, aucun réseau, aucune variable d'environnement.
 *
 * Le contenu de ces documents (devis, factures, CGV, accord sur les données)
 * vient de l'atelier, jamais du code : l'écran les sert tels quels. L'accord
 * sur les données est un texte JURIDIQUE (PRD §12.7) : l'outil le range, il
 * ne l'écrit pas.
 */

export const TYPES_DOCUMENT = [
  { cle: "devis", libelle: "Devis signé" },
  { cle: "facture", libelle: "Facture" },
  { cle: "cgv", libelle: "Conditions générales" },
  { cle: "donnees", libelle: "Accord sur les données" },
  { cle: "proposition", libelle: "Proposition complémentaire" },
  { cle: "autre", libelle: "Autre document" },
] as const;
export type TypeDocument = (typeof TYPES_DOCUMENT)[number]["cle"];

export function libelleTypeDocument(type: string): string {
  return TYPES_DOCUMENT.find((t) => t.cle === type)?.libelle ?? "Document";
}

/** Ce que la route accepte : un PDF ou une image, rien qui s'exécute. */
export const TYPES_FICHIER_DOCUMENT: Record<string, string> = {
  "application/pdf": "pdf",
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

export type SaisieDocument =
  | { ok: true; type: TypeDocument; libelle: string; nom: string }
  | { ok: false; message: string };

export function lireSaisieDocument(type: unknown, libelle: unknown, nom: unknown): SaisieDocument {
  const t = TYPES_DOCUMENT.find((x) => x.cle === type)?.cle;
  if (!t) return { ok: false, message: "Choisir le type du document." };
  const l = typeof libelle === "string" ? libelle.trim().slice(0, 120) : "";
  const n = typeof nom === "string" ? nom.trim().slice(0, 160) : "";
  return { ok: true, type: t, libelle: l || libelleTypeDocument(t), nom: n || "document" };
}

/**
 * Le nom sous lequel le client télécharge : le libellé lisible, sans accent ni
 * caractère qui casse un en-tête (même raison que lot.ts : `curl -OJ` n'écrit
 * que l'ASCII).
 */
export function nomTelechargement(libelle: string, extension: string): string {
  const base = libelle
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^A-Za-z0-9 _-]+/g, " ")
    .trim()
    .replace(/\s+/g, " ")
    .slice(0, 80);
  return `${base || "document"}.${extension}`;
}

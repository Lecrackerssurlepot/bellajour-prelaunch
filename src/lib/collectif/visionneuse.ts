/* La visionneuse des documents (T-152, retour du 14/10 : « un document s'ouvre
   dans une fenêtre de la page, avec l'icône pour le télécharger »). Pur,
   importable navigateur.

   Ce que le navigateur sait PEINDRE dans la page : un PDF (son lecteur, dans
   un cadre) et une image courante. Le reste (Word, HEIC hors Safari…) ne
   s'affiche pas : la fenêtre le dit et propose de le télécharger. */

export type GenreFichier = "pdf" | "image" | "autre";

const IMAGES = new Set(["jpg", "jpeg", "png", "webp", "gif", "avif", "svg"]);

/** L'extension d'un nom, d'une clé ou d'une adresse signée (la requête est ignorée). */
export function extensionDe(nom: string | null | undefined): string | null {
  if (!nom) return null;
  const chemin = nom.split(/[?#]/)[0];
  return /\.([a-z0-9]{1,5})$/i.exec(chemin)?.[1]?.toLowerCase() ?? null;
}

/** Le genre du premier nom qui en dit un (le nom d'origine, puis la clé de l'adresse). */
export function genreFichier(...noms: (string | null | undefined)[]): GenreFichier {
  for (const n of noms) {
    const ext = extensionDe(n);
    if (ext === "pdf") return "pdf";
    if (ext && IMAGES.has(ext)) return "image";
  }
  return "autre";
}

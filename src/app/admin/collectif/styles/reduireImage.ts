/* Réduire une image de style dans le navigateur avant de l'envoyer.
   Module navigateur (createImageBitmap, canvas) ; aucune dépendance.

   Pourquoi : les images d'un style partent par le serveur (le CORS du coffre
   n'accepte pas tous les localhost), et un corps de requête Vercel s'arrête
   à 4,5 Mo. Un export Affinity ou Canva de 20 Mo devient ici un WebP de
   2400 px de côté, largement de quoi remplir un mur et une page de style.

   WebP si le navigateur sait l'écrire, JPEG sinon (Safari ancien) : on lit
   le type du Blob rendu, on ne le suppose pas.

   Cette image est la MAÎTRESSE. Le mur ne la sert plus dans ses cartes de
   300 px (T-172) : à l'envoi, le SERVEUR en écrit aussi une version de 600 et
   une de 1 200 px de large (`@/lib/collectif/taillesStyle`, sharp), une seule
   fabrique pour la route et le rattrapage des images d'avant. Rien ne se
   réduit deux fois ici : le corps envoyé reste une seule image. */

export const COTE_MAX = 2400;
export const OCTETS_MAX = 4 * 1024 * 1024;

function versBlob(canvas: HTMLCanvasElement, type: string, qualite: number): Promise<Blob | null> {
  return new Promise((resolve) => canvas.toBlob((b) => resolve(b), type, qualite));
}

export type ImageReduite = { blob: Blob; type: "image/webp" | "image/jpeg" };

export async function reduireImage(fichier: File): Promise<ImageReduite> {
  let source: ImageBitmap;
  try {
    source = await createImageBitmap(fichier, { imageOrientation: "from-image" });
  } catch {
    throw new Error("Ce navigateur ne sait pas lire ce fichier (HEIC ?). L'exporter en JPEG ou PNG.");
  }

  for (const [cote, qualite] of [
    [COTE_MAX, 0.86],
    [COTE_MAX, 0.75],
    [1800, 0.75],
  ] as const) {
    const echelle = Math.min(1, cote / Math.max(source.width, source.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(source.width * echelle);
    canvas.height = Math.round(source.height * echelle);
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Le navigateur refuse de dessiner l'image.");
    ctx.drawImage(source, 0, 0, canvas.width, canvas.height);

    let blob = await versBlob(canvas, "image/webp", qualite);
    let type: ImageReduite["type"] = "image/webp";
    if (!blob || blob.type !== "image/webp") {
      blob = await versBlob(canvas, "image/jpeg", qualite);
      type = "image/jpeg";
    }
    if (blob && blob.size <= OCTETS_MAX) {
      source.close();
      return { blob, type };
    }
  }
  source.close();
  throw new Error("Image trop lourde même réduite : l'exporter plus petite.");
}

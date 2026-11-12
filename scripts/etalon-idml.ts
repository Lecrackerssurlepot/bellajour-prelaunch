/**
 * L'étalon de l'IDML INTÉRIEUR (lot B, 12/11) : un magazine qui passe par tout ce que l'export sait écrire (page seule,
 * double, pages avec une page vide, aplats, textes blancs, coins arrondis, cadres tournés à bord blanc, photo stockée
 * couchée, saut de ligne, échappement). Son empreinte SHA-256 a été relevée AVANT l'arrivée de la couverture dans
 * idml.ts : le harnais exige la même, octet pour octet. Si un lot change l'intérieur EXPRÈS (après un essai Affinity),
 * il relève la nouvelle empreinte et le dit dans son commit.
 */

import { createHash } from "node:crypto";
import { construireIdml, type PhotoExport } from "@/lib/mise-en-page/idml";
import type { Magazine } from "@/lib/mise-en-page/magazine";

const neutre = { zoom: 1, dx: 0, dy: 0 };
const a = (photoId: string | null, recadrage = neutre) => ({ photoId, recadrage });

export const PHOTOS_ETALON: Map<string, PhotoExport> = new Map([
  ["p1", { id: "p1", nomLien: "un.jpg", l: 4000, h: 3000 }],
  ["p2", { id: "p2", nomLien: "deux & co.jpg", l: 3000, h: 4000 }],
  ["p3", { id: "p3", nomLien: "couchée.jpg", l: 3024, h: 4032, tag: 6 }],
]);

export function magazineEtalon(): Magazine {
  return {
    version: 1, id: "m", titre: "t", creeLe: "x", modifieLe: "x",
    planches: [
      { id: "pl-1", mode: "pages", double: null, gauche: null, droite: { templateId: "G-P1-a", photos: [a("p2")], textes: [] } },
      { id: "pl-2", mode: "double", gauche: null, droite: null, double: {
        templateId: "DP-04", photos: [a("p1"), a(null), a("p1", { zoom: 2, dx: 10, dy: 0 })],
        textes: [{ contenu: `L'été <à> "Lisbonne" & co`, taille: 30, gras: true }, { contenu: "ligne 1\nligne 2", taille: 8, gras: false }],
      } },
      { id: "pl-3", mode: "pages", double: null, gauche: null, droite: { templateId: "G-P2-a", photos: [a("p1"), a("p2")], textes: [] } },
      { id: "pl-4", mode: "double", gauche: null, droite: null, double: {
        templateId: "E-D14a", photos: [a("p3"), a("p1", { zoom: 1.5, dx: -4, dy: 3 })],
        textes: [{ contenu: "Titre", taille: 16, gras: true }, { contenu: "Un texte", taille: 10, gras: false }, { contenu: "Légende", taille: 7, gras: false }, { contenu: "Fin", taille: 7, gras: false }],
      } },
      { id: "pl-5", mode: "pages", double: null,
        gauche: { templateId: "E-S1", photos: [a("p2")], textes: [{ contenu: "Blanc", taille: 16, gras: true }, { contenu: "sur photo", taille: 10, gras: false }] },
        droite: { templateId: "E-S4b", photos: [a("p1"), a("p3"), a("p2")], textes: [{ contenu: "Arrondis", taille: 10, gras: false }] } },
      { id: "pl-6", mode: "double", gauche: null, droite: null, double: { templateId: "E-D13a", photos: [a("p1"), a("p2"), a("p3"), a("p1"), a("p2")], textes: [] } },
    ],
  };
}

/** L'empreinte des fichiers de l'IDML intérieur (chemins et contenus, dans l'ordre du paquet). */
export function empreinteIdml(m: Magazine = magazineEtalon()): string {
  const f = construireIdml(m, PHOTOS_ETALON, { liens: { mode: "absolu", dossier: "/Users/x/Bellajour/test-idml/etalon" } });
  return createHash("sha256").update(JSON.stringify(f)).digest("hex");
}

/** Relevée le 12/11 sur origin/main 98b68bad, AVANT la couverture (lot B). */
export const EMPREINTE_IDML_INTERIEUR = "5c07a3d6901af21f13fcd684d6fdcb13d914b121908e45afd60bd098782fc057";

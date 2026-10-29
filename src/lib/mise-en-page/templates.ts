/**
 * Les 4 doubles pages de l'annexe du brief, recopiées À L'IDENTIQUE (mm, repère
 * planche 420 × 297). Ne pas « arrondir » ni « corriger » une valeur ici : c'est
 * la référence que Mathias a dessinée, et l'export la rend au 0,1 mm près.
 */

import type { Template } from "./types";

export const TEMPLATES_ANNEXE: readonly Template[] = [
  {
    id: "DP-01", nom: "Portraits 2+1", portee: "double", nbPhotos: 3, signature: "P,P,P", attribut: "classique", origine: "annexe",
    cadres: [
      { role: "photo", x: 15, y: 104, l: 85, h: 128.5, orientation: "P" },
      { role: "photo", x: 105, y: 104, l: 85, h: 128.5, orientation: "P" },
      { role: "photo", x: 320, y: 104, l: 85, h: 128.5, orientation: "P" },
      { role: "texte", x: 15, y: 15, l: 175, h: 20, taille: 11, gras: false },
      { role: "legende", x: 320, y: 15, l: 85, h: 6, taille: 7, gras: true },
      { role: "titre", x: 230, y: 104, l: 85, h: 6, taille: 8, gras: true },
      { role: "titre", x: 15, y: 262, l: 175, h: 8, taille: 16, gras: true },
      { role: "titre", x: 230, y: 262, l: 175, h: 8, taille: 16, gras: true },
    ],
  },
  {
    id: "DP-02", nom: "Titre géant + photo pleine", portee: "double", nbPhotos: 2, signature: "P,P", attribut: "original", origine: "annexe",
    cadres: [
      { role: "photo", x: 45, y: 183, l: 85, h: 104, orientation: "P" },
      { role: "photo", x: 215, y: 5, l: 200, h: 235, orientation: "P" },
      { role: "texte", x: 15, y: 15, l: 175, h: 20, taille: 9, gras: false },
      { role: "texte", x: 45, y: 166, l: 115, h: 14, taille: 8, gras: false },
      { role: "titre", x: 5, y: 249, l: 185, h: 30, taille: 110, gras: true },
      { role: "legende", x: 215, y: 243, l: 200, h: 5, taille: 6, gras: true },
      { role: "titre", x: 230, y: 249, l: 185, h: 30, taille: 110, gras: true },
    ],
  },
  {
    id: "DP-03", nom: "Titre bloc + colonnes", portee: "double", nbPhotos: 3, signature: "L,L,P", attribut: "original", origine: "annexe",
    cadres: [
      { role: "photo", x: 15, y: 193, l: 175, h: 84, orientation: "L" },
      { role: "photo", x: 260, y: -3, l: 115, h: 57.5, orientation: "L" },
      { role: "photo", x: 260, y: 79, l: 115, h: 153.5, orientation: "P" },
      { role: "titre", x: 15, y: 15, l: 110, h: 30, taille: 26, gras: true },
      { role: "titre", x: 75, y: 148.5, l: 115, h: 25, taille: 80, gras: true },
      { role: "legende", x: 15, y: 148.5, l: 40, h: 4, taille: 6, gras: false, rotation: -90 },
      { role: "legende", x: 186, y: 59.5, l: 40, h: 4, taille: 6, gras: false, rotation: 90 },
      { role: "legende", x: 15, y: 282, l: 175, h: 4, taille: 6, gras: true },
      { role: "titre", x: 230, y: 59.5, l: 175, h: 7, taille: 16, gras: true },
      { role: "titre", x: 260, y: 237.5, l: 115, h: 20, taille: 60, gras: true },
      { role: "legende", x: 260, y: 268, l: 115, h: 5, taille: 10, gras: true },
      { role: "legende", x: 230, y: 282, l: 175, h: 4, taille: 6, gras: true },
    ],
  },
  {
    id: "DP-04", nom: "Deux empilées + paysage", portee: "double", nbPhotos: 3, signature: "L,L,L", attribut: "classique", origine: "annexe",
    cadres: [
      { role: "photo", x: 15, y: -3, l: 195, h: 146.5, orientation: "L" },
      { role: "photo", x: 15, y: 148.5, l: 195, h: 151.5, orientation: "L" },
      { role: "photo", x: 230, y: 104, l: 175, h: 128.5, orientation: "L" },
      { role: "legende", x: 260, y: 7, l: 115, h: 4, taille: 8, gras: true },
      { role: "legende", x: 230, y: 59.5, l: 55, h: 15, taille: 8, gras: false },
    ],
  },
];

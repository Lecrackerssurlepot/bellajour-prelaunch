/**
 * Les noms de fichiers d'un lot de photos.
 *
 * ══════════════════════════════════════════════════════════════════════════
 * POURQUOI CE CALCUL EST ICI ET PAS DANS LE COMPOSANT
 *
 * Le lot descend par deux chemins qui ne se ressemblent pas : Chrome écrit
 * lui-même dans un dossier choisi, les autres navigateurs récupèrent une
 * liste de liens qu'on donne à `curl`. Les deux doivent produire LES MÊMES
 * NOMS, sans quoi le dossier obtenu dépend du navigateur, et deux éditeurs
 * qui se passent un lot ne parlent plus de la même photo.
 *
 * Le nom est donc calculé une fois, ici, dans un module PUR : le navigateur
 * s'en sert pour nommer ses fichiers, et le serveur pour signer un
 * `Content-Disposition` que `curl -OJ` respectera.
 * ══════════════════════════════════════════════════════════════════════════
 */

import { NOM_BRIEF } from "./brief";

/** Le strict minimum pour nommer. Le reste du lot ne regarde pas ce module. */
export type PhotoNommable = { nom: string | null };

/* Ce que macOS et Windows refusent dans un nom de fichier, plus les
   caractères de contrôle. Les espaces sont CONSERVÉS : ils ne gênent ni le
   Finder ni `curl -OJ`, et un nom d'origine reste reconnaissable. */
const INTERDITS = /[\\/:*?"<>|\u0000-\u001f]/g;

export function assainir(nom: string): string {
  return nom
    .replace(INTERDITS, "-")
    .replace(/\s+/g, " ")
    /* Un nom qui commence par un point est invisible dans le Finder ; un nom
       qui finit par un point ou une espace est refusé par Windows. */
    .replace(/^[.\s]+/, "")
    .replace(/[.\s]+$/, "")
    .slice(0, 100);
}

/**
 * Les noms du lot, dans l'ordre.
 *
 * Deux exigences, dans cet ordre. D'abord L'ORDRE DU DÉPÔT : la cliente a
 * envoyé ses photos dans un ordre qui raconte quelque chose, et le Finder
 * trie par nom. Un préfixe numéroté le préserve ; sans lui, `IMG_4207` passe
 * avant `IMG_988` et la chronologie se perd. Ensuite L'UNICITÉ : deux photos
 * peuvent porter le même nom d'origine (deux téléphones, deux exports), et
 * la seconde écraserait la première en silence.
 *
 * Le nom du brief est réservé d'avance : une photo qui s'appellerait comme
 * lui l'écraserait, et on perdrait les notes au lieu d'une vignette.
 */
export function nomsDeFichiers(photos: PhotoNommable[]): string[] {
  const largeur = Math.max(2, String(photos.length).length);
  const pris = new Set<string>([NOM_BRIEF.toLowerCase()]);

  return photos.map((p, i) => {
    const base = assainir(p.nom ?? "") || `photo-${i + 1}`;
    const point = base.lastIndexOf(".");
    const souche = point > 0 ? base.slice(0, point) : base;
    const ext = point > 0 ? base.slice(point) : "";
    const prefixe = String(i + 1).padStart(largeur, "0");

    let candidat = `${prefixe}-${souche}${ext}`;
    let n = 2;
    while (pris.has(candidat.toLowerCase())) candidat = `${prefixe}-${souche}-${n++}${ext}`;
    pris.add(candidat.toLowerCase());
    return candidat;
  });
}

/**
 * Le dossier créé chez l'éditeur : « Camille - Séville, dix jours ».
 *
 * Le nom de la cliente d'abord, parce que c'est par là qu'on cherche : le
 * dossier de travail de l'atelier se range par personne, et un titre seul
 * (« Nos dimanches ») ne dit pas de qui il s'agit tant qu'on ne l'a pas
 * ouvert.
 *
 * ⚠️ Ce nom n'est pas garanti unique, et c'est un choix. Retélécharger le
 * MÊME numéro doit retomber sur le MÊME dossier et réécrire par-dessus :
 * c'est ce qu'on veut après un lot interrompu ou trois photos ratées. Le
 * revers est qu'une cliente qui donnerait deux fois le même titre à deux
 * numéros verrait les deux lots se mélanger. Le token ne revient donc dans
 * le nom que lorsqu'il ne reste rien d'autre pour l'identifier.
 */
export function nomDossier(prenom: string | null, titre: string | null, token: string): string {
  const qui = assainir(prenom?.trim() ?? "").slice(0, 40);
  const quoi = assainir(titre?.trim() ?? "").slice(0, 60);
  const parts = [qui, quoi].filter(Boolean);
  return parts.length ? parts.join(" - ") : `numero (${token.slice(0, 6)})`;
}

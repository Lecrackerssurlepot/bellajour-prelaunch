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
import { jourCourt } from "./metadonnees";

/** Le strict minimum pour nommer. Le reste du lot ne regarde pas ce module. */
export type PhotoNommable = {
  nom: string | null;
  /** T-124 — ce que la photo sait d'elle-même (T-123), quand elle le sait :
      la date EXIF locale et le lieu géocodé. Absents ou `null`, le nom se
      fait sans eux. */
  priseLe?: string | null;
  lieuVille?: string | null;
  lieuPays?: string | null;
};

/* Ce qui sépare les morceaux du nom : « 01 - 08 aou 2024 - Seville - IMG_4207.jpg ».
   Le même que celui du dossier (`nomDossier`), pour que le lot se lise d'un
   seul regard dans le Finder. */
const SEP = " - ";

/* Ce que macOS et Windows refusent dans un nom de fichier, plus les
   caractères de contrôle. Les espaces sont CONSERVÉS : ils ne gênent ni le
   Finder ni `curl -OJ`, et un nom d'origine reste reconnaissable. */
const INTERDITS = /[\\/:*?"<>|\u0000-\u001f]/g;

/** « Séville » → « Seville ». Le lieu entre dans un nom de fichier, et le
 *  chemin `curl -OJ` n'écrit que la forme ASCII du `Content-Disposition`
 *  (r2.ts) : sans cela, Chrome écrirait « Séville » et curl « S-ville », et
 *  les deux chemins ne donneraient plus LES MÊMES NOMS. */
function sansAccents(s: string): string {
  return s.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

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
 * trie par nom. (Cet ordre est celui du CHOIX depuis T-114 : le navigateur
 * annonce son rang à la déclaration, cf. rang.ts. Avant, c'était l'ordre de
 * fin de réduction.) Un préfixe numéroté le préserve ; sans lui, `IMG_4207` passe
 * avant `IMG_988` et la chronologie se perd. Ensuite L'UNICITÉ : deux photos
 * peuvent porter le même nom d'origine (deux téléphones, deux exports), et
 * la seconde écraserait la première en silence.
 *
 * Le nom du brief est réservé d'avance : une photo qui s'appellerait comme
 * lui l'écraserait, et on perdrait les notes au lieu d'une vignette.
 *
 * T-124 (21/09/2026) — entre le rang et le nom d'origine viennent LA DATE
 * (« 08 aou 2024 », mois en trois lettres) et LE LIEU (la ville, sinon le
 * pays), quand la photo les sait : c'est ce qui permet de se repérer dans
 * Canva sans rouvrir la fiche. Le rang reste TOUJOURS en tête : la date
 * aide à lire, elle ne réordonne rien (l'ordre est celui du client, T-114).
 * Une photo sans date ni lieu garde la forme courte « 01 - IMG_4207.jpg ».
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
    const date = jourCourt(p.priseLe ?? null);
    const lieu = assainir(sansAccents(p.lieuVille?.trim() || p.lieuPays?.trim() || "")).slice(0, 40);
    const tete = [prefixe, date, lieu || null].filter(Boolean).join(SEP);

    let candidat = `${tete}${SEP}${souche}${ext}`;
    let n = 2;
    while (pris.has(candidat.toLowerCase())) candidat = `${tete}${SEP}${souche}-${n++}${ext}`;
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

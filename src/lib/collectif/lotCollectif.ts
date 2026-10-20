/**
 * Les noms des fichiers et des dossiers d'un lot de l'ÉDITION COLLECTIVE
 * (T-193, 20/10/2026). Module PUR : aucun accès base, aucun réseau.
 *
 * ══════════════════════════════════════════════════════════════════════════
 * POURQUOI UN MODULE À PART, ET PAS `atelier/lot.ts`
 *
 * `lot.ts` nomme le lot d'un PARTICULIER : « 01 - 08 aou 2024 - Seville -
 * IMG_4207.jpg ». Une seule personne, un seul récit. Une édition, c'est huit
 * bateaux de dix personnes : avec ce nom-là, l'atelier compose sans savoir
 * quelle photo vient de quel bateau, ni de qui. `lot.ts` sert aussi le B2C et
 * n'a PAS bougé ; ce module-ci reprend ses mots (`assainir`, `jourCourt`) et
 * son principe (le rang en tête, un nom d'origine reconnaissable, jamais deux
 * fichiers du même nom), et ajoute ce qui manque à une édition :
 *
 *     « <rang> - <lien> - <personne> - <date> - <nom d'origine> »
 *     « 07 - Bateau 3 - Lea Martin - 08 oct 2026 - IMG_4207.jpg »
 *
 * La date manque quand la photo ne la sait pas (le morceau est alors omis,
 * comme dans `lot.ts`). Le lieu n'y est plus : ici la question est « de qui »,
 * pas « où ».
 *
 * LE NOM EST UN, POUR LES DEUX CHEMINS. Chrome écrit lui-même dans un dossier ;
 * les autres navigateurs reçoivent une liste de liens pour `curl -OJ`, qui
 * n'écrit que la forme ASCII du `Content-Disposition` (r2.ts). Les morceaux
 * ajoutés (le lien, la personne) passent donc par les mêmes accents retirés
 * que le lieu dans `lot.ts`, et deux noms qui ne se distinguent qu'au-delà de
 * l'ASCII sont départagés AVANT d'être écrits. Le lien est TOUJOURS dans le
 * nom : sans sous-dossiers (navigateur qui n'écrit pas sur le disque), le
 * fichier dit encore de quel bateau il vient.
 *
 * LE RANG est la place dans le DOSSIER où le fichier est écrit : un lot par
 * lien ou par personne numérote 01, 02… ; « tout le lot » range en
 * sous-dossiers (un par lien, `separer`) et chaque lien repart de 01 ; la
 * sélection du client est un seul dossier, numérotée d'un bout à l'autre.
 * L'ordre est celui de l'arrivée (l'appelant donne les photos dans cet ordre).
 * ══════════════════════════════════════════════════════════════════════════
 */

import { assainir } from "@/lib/atelier/lot";
import { jourCourt } from "@/lib/atelier/metadonnees";

const SEP = " - ";

/** « Séville » → « Seville » : même raison que dans `lot.ts` (le chemin `curl -OJ` n'écrit que l'ASCII). */
function sansAccents(s: string): string {
  return s.normalize("NFD").replace(/[̀-ͯ]/g, "");
}

/** Ce que `curl -J` écrirait de ce nom : tout ce qui n'est pas de l'ASCII devient « - » (r2.ts, `contentDispositionAttachment`). */
const enAscii = (s: string) => s.replace(/[^\x20-\x7e]/g, "-");

/** Un morceau du nom (le lien, la personne) : sans accent, sans caractère interdit, 40 caractères au plus. */
export function morceauDeNom(texte: string, secours: string, max = 40): string {
  const propre = assainir(sansAccents(texte)).slice(0, max).replace(/[.\s]+$/, "");
  return propre || secours;
}

/** Ce que ce module lit d'une photo. */
export type PhotoDuLot = {
  /** Le nom d'origine (déjà préfixé « A-NE-PAS-PUBLIER » par la route pour une photo signalée). */
  nom: string | null;
  priseLe: string | null;
  /** La clé du lien (`cleDuLien`) : le rang repart de 01 pour chaque lien quand on sépare, et le sous-dossier en vient. */
  groupe: string;
  /** Le nom du lien, rendu unique (`nomsDesLiens`). */
  lien: string;
  personne: string;
};

export type NomDuLot = {
  /** Le nom du fichier. */
  nom: string;
  /** Le sous-dossier du lien (« Bateau 3 »), ou `null` quand le lot n'est pas séparé par lien. */
  dossier: string | null;
};

/**
 * Le nom d'un sous-dossier de lien : le nom du lien (accents gardés : le dossier
 * est créé par le navigateur, jamais par `curl`), rendu unique dans le lot.
 */
function dossiersDesLiens(photos: readonly PhotoDuLot[]): Map<string, string> {
  const noms = new Map<string, string>();
  const pris = new Set<string>();
  for (const p of photos) {
    if (noms.has(p.groupe)) continue;
    const base = assainir(p.lien).slice(0, 60).replace(/[.\s]+$/, "") || "Lien";
    let nom = base;
    let n = 2;
    while (pris.has(nom.toLowerCase())) nom = `${base} (${n++})`;
    pris.add(nom.toLowerCase());
    noms.set(p.groupe, nom);
  }
  return noms;
}

/**
 * Les noms du lot, dans l'ordre des photos données. `separer` : un sous-dossier
 * et un rang par lien (« Télécharger tout le lot ») ; sinon un seul dossier.
 */
export function nomsDuLotCollectif(photos: readonly PhotoDuLot[], separer: boolean): NomDuLot[] {
  const cle = (p: PhotoDuLot) => (separer ? p.groupe : "");
  const comptes = new Map<string, number>();
  for (const p of photos) comptes.set(cle(p), (comptes.get(cle(p)) ?? 0) + 1);
  const largeur = Math.max(2, String(Math.max(0, ...comptes.values())).length);
  const rangs = new Map<string, number>();
  const dossiers = separer ? dossiersDesLiens(photos) : null;
  const pris = new Set<string>();

  return photos.map((p, i) => {
    const k = cle(p);
    const rang = (rangs.get(k) ?? 0) + 1;
    rangs.set(k, rang);

    /* L'extension est lue AVANT le raccourcissement : un nom d'origine démesuré (100 caractères au plus
       après `assainir`) ne perd pas son « .jpg ». */
    const brut = (p.nom ?? "").trim();
    const m = /\.([A-Za-z0-9]{1,8})$/.exec(brut);
    const ext = m ? `.${m[1]}` : "";
    const souche = assainir(m ? brut.slice(0, m.index) : brut).slice(0, 90).replace(/[.\s]+$/, "") || `photo-${i + 1}`;
    const tete = [String(rang).padStart(largeur, "0"), morceauDeNom(p.lien, "Lien"), morceauDeNom(p.personne, "Sans nom"), jourCourt(p.priseLe ?? null)]
      .filter(Boolean)
      .join(SEP);

    let candidat = `${tete}${SEP}${souche}${ext}`;
    let n = 2;
    /* Unique à la forme que `curl` écrirait, pas seulement à la nôtre. */
    while (pris.has(enAscii(candidat).toLowerCase())) candidat = `${tete}${SEP}${souche}-${n++}${ext}`;
    pris.add(enAscii(candidat).toLowerCase());
    return { nom: candidat, dossier: dossiers ? (dossiers.get(p.groupe) ?? null) : null };
  });
}

/**
 * Le dossier d'un lot, tel que le navigateur le crée : « Lot - Bateau 3 »,
 * « Lot - Bateau 3 - Lea Martin », « Lot complet », « Sélection du client ».
 * Le même lot retombe toujours sur le même dossier et le réécrit (lot
 * interrompu, trois photos ratées) ; un autre lot en fait un autre.
 */
export function dossierDuLot(p: { lien?: string | null; personne?: string | null; selection?: boolean }): string {
  const tete = p.selection ? "Sélection du client" : "Lot";
  const reste = [p.lien, p.personne].map((x) => (x ? assainir(x).slice(0, 60).replace(/[.\s]+$/, "") : "")).filter(Boolean);
  if (reste.length === 0) return p.selection ? tete : "Lot complet";
  return `${tete}${SEP}${reste.join(SEP)}`;
}

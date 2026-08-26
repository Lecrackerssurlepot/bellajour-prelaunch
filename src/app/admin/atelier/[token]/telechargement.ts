/**
 * Télécharger un lot de photos sur le disque de l'éditeur.
 *
 * ══════════════════════════════════════════════════════════════════════════
 * POURQUOI PAS UN ZIP
 *
 * Le premier réflexe est un ZIP fabriqué par le serveur. Quatre-vingts photos
 * de cinq mégaoctets, c'est quatre cents mégaoctets à tenir dans une fonction
 * Vercel plafonnée, pour un fichier que l'éditeur va de toute façon
 * décompresser. C'est une panne à retardement, et elle arriverait le jour du
 * plus gros dossier.
 *
 * Le deuxième réflexe, celui qui était en place, est un fichier de liens
 * signés. Il ne coûte rien au serveur et ne servait à personne : la recette
 * du 25/08 l'a tranché en une phrase, « je veux les photos sur mon Mac ».
 *
 * Ici, le navigateur écrit lui-même. `showDirectoryPicker()` rend une poignée
 * de dossier, chaque photo descend du coffre en flux et part directement sur
 * le disque (`pipeTo`) : rien ne transite par le serveur, rien ne s'accumule
 * en mémoire, la taille du lot n'a plus de limite.
 *
 * L'API n'existe que sur Chrome et Edge. Ailleurs, on retombe sur le fichier
 * de liens, qui redevient ce qu'il aurait toujours dû être : une liste nue,
 * consommable par `xargs curl`, sans les lignes de commentaire qui la
 * cassaient.
 * ══════════════════════════════════════════════════════════════════════════
 */

import { NOM_BRIEF } from "@/lib/atelier/brief";
import { nomsDeFichiers, nomDossier } from "@/lib/atelier/lot";

export type PhotoLot = {
  id: string;
  nom: string | null;
  taille: number | null;
  /** T2-5 — le nom calculé par la route sur le lot COMPLET : sur un lot
      partiel, il préserve la numérotation d'origine. Absent (mode démo,
      vieux appels) : recalculé localement. */
  nomFichier?: string | null;
  url: string | null;
};

/* Le sélecteur de dossier n'est pas typé par lib.dom. On déclare le strict
   nécessaire plutôt que d'élargir Window à `any` : le jour où TypeScript
   l'ajoutera, ces trois lignes disparaîtront sans rien casser d'autre. */
type OptionsPicker = { id?: string; mode?: "read" | "readwrite"; startIn?: string };
type AvecPicker = { showDirectoryPicker(o?: OptionsPicker): Promise<FileSystemDirectoryHandle> };

/**
 * Chrome et Edge, en contexte sécurisé.
 *
 * Testé à l'exécution, jamais déduit du navigateur annoncé : un test d'UA se
 * trompe le jour où Safari l'implémente, et il se trompe TOUJOURS dans le
 * mauvais sens (il refuse une capacité présente).
 */
export function supporteDossier(): boolean {
  return (
    typeof window !== "undefined" &&
    typeof (window as unknown as AvecPicker).showDirectoryPicker === "function"
  );
}

/**
 * Ouvre le sélecteur de dossier.
 *
 * ⚠️ À appeler DIRECTEMENT dans le gestionnaire de clic, avant tout `await` :
 * Chrome exige une activation utilisateur « fraîche », et un aller-retour
 * réseau intercalé la consomme. C'est la seule raison pour laquelle cette
 * fonction est séparée de l'écriture qui suit.
 */
export async function choisirDossier(): Promise<FileSystemDirectoryHandle | null> {
  try {
    return await (window as unknown as AvecPicker).showDirectoryPicker({
      /* Chrome rouvre au même endroit la fois suivante : l'éditeur désigne
         son dossier de travail une fois, pas à chaque numéro. */
      id: "bellajour-lots",
      mode: "readwrite",
      startIn: "downloads",
    });
  } catch {
    /* Sélecteur fermé, ou permission refusée. Ce n'est pas une erreur : c'est
       quelqu'un qui a changé d'avis. */
    return null;
  }
}

async function ecrireFichier(
  dossier: FileSystemDirectoryHandle,
  nom: string,
  corps: ReadableStream<Uint8Array> | Blob,
): Promise<void> {
  const poignee = await dossier.getFileHandle(nom, { create: true });
  const sortie = await poignee.createWritable();
  if (corps instanceof Blob) {
    await sortie.write(corps);
    await sortie.close();
    return;
  }
  /* `pipeTo` ferme le flux d'écriture lui-même, et surtout : les octets vont
     du réseau au disque sans jamais former un Blob en mémoire. C'est ce qui
     rend la taille du lot indifférente. */
  await corps.pipeTo(sortie);
}

export type Progres = { faites: number; total: number; enCours: string };

export type ResultatLot = {
  dossier: string;
  ecrites: number;
  /** Les noms d'origine de celles qui n'ont pas pu être écrites. */
  ratees: string[];
  interrompu: boolean;
};

/* Quatre de front. Au delà, le disque et la ligne se disputent sans rien
   gagner, et la barre de progression avance par à-coups. */
const FRONT = 4;

/**
 * Écrit le brief puis les photos, dans un sous-dossier créé pour l'occasion.
 *
 * Une photo qui échoue est RETENUE, jamais fatale : on la nomme à la fin.
 * Perdre trente-neuf photos parce que la quarantième a expiré serait le pire
 * des deux mondes.
 */
export async function ecrireLot(
  racine: FileSystemDirectoryHandle,
  options: {
    prenom: string | null;
    titre: string | null;
    token: string;
    photos: PhotoLot[];
    brief: string;
    signal: AbortSignal;
    onProgres: (p: Progres) => void;
  },
): Promise<ResultatLot> {
  const { prenom, titre, token, photos, brief, signal, onProgres } = options;

  const nom = nomDossier(prenom, titre, token);
  const dossier = await racine.getDirectoryHandle(nom, { create: true });

  await ecrireFichier(dossier, NOM_BRIEF, new Blob([brief], { type: "text/plain;charset=utf-8" }));

  /* T2-5 — le nom de la route d'abord (numérotation du lot COMPLET, stable
     sur un lot partiel), le calcul local en repli (mode démo). */
  const nomsCalcules = nomsDeFichiers(photos);
  const noms = photos.map((p, i) => p.nomFichier ?? nomsCalcules[i]);
  const ratees: string[] = [];
  let faites = 0;
  let curseur = 0;

  async function ouvrier(): Promise<void> {
    for (;;) {
      const i = curseur++;
      if (i >= photos.length || signal.aborted) return;
      const p = photos[i];
      onProgres({ faites, total: photos.length, enCours: noms[i] });
      try {
        if (!p.url) throw new Error("lien absent");
        const r = await fetch(p.url, { signal, cache: "no-store" });
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        await ecrireFichier(dossier, noms[i], r.body ?? (await r.blob()));
        faites++;
      } catch {
        if (signal.aborted) return;
        ratees.push(p.nom ?? noms[i]);
      }
      onProgres({ faites, total: photos.length, enCours: noms[i] });
    }
  }

  await Promise.all(Array.from({ length: Math.min(FRONT, photos.length) }, () => ouvrier()));

  return { dossier: nom, ecrites: faites, ratees, interrompu: signal.aborted };
}

/** Déclenche le téléchargement d'un fichier fabriqué dans le navigateur. */
export function telechargerTexte(nomFichier: string, contenu: string): void {
  const url = URL.createObjectURL(new Blob([contenu], { type: "text/plain;charset=utf-8" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = nomFichier;
  a.click();
  /* Révoquer tout de suite annule le téléchargement sur Safari : on laisse au
     clic le temps de partir. */
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}

/**
 * Le repli : la liste NUE des liens.
 *
 * Le fichier précédent commençait par trois lignes de commentaire `#`. Elles
 * expliquaient la commande à taper, et elles la cassaient : `xargs` passe le
 * dièse à `curl` comme si c'était une adresse. La consigne a donc quitté le
 * fichier pour l'écran, où elle se copie, et le fichier est redevenu
 * consommable tel quel.
 *
 * Les liens sont signés avec un `Content-Disposition` portant le nom calculé
 * par `lot.ts` : `-OJ` écrit donc les mêmes noms que le chemin Chrome.
 */
export function listeDesLiens(photos: PhotoLot[]): string {
  const liens = photos.map((p) => p.url).filter(Boolean) as string[];
  return liens.length ? `${liens.join("\n")}\n` : "";
}

/** La commande à coller dans le Terminal, affichée à côté du bouton. */
export const COMMANDE_REPLI = "xargs -n1 curl -sOJ <";

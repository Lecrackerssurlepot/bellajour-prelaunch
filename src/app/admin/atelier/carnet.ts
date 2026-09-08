/**
 * Ce que l'écran du carnet LIT — et il ne fait que lire.
 *
 * Service key, donc strictement serveur : ce fichier n'est importé que par
 * des composants serveur et par la route d'export. Aucune écriture, aucun
 * mail, aucune suppression : le carnet complet est une salle de lecture. Les
 * écritures restent où elles ont toujours été, dans
 * `/api/admin/atelier/note`.
 *
 * ⚠️ UNE COLONNE FRAÎCHE : `genre` (migration `20260908_notes_genre.sql`,
 * T-096). Un `select` qui la nomme alors qu'elle n'existe pas échoue
 * ENTIÈREMENT (PostgREST, 42703) — pas « des notes sans genre », ZÉRO note,
 * et l'écran afficherait « carnet non installé » alors que la table est là.
 * D'où le repli : on relit sans la colonne et `genre` vaut `null` partout.
 * ⚠️ Le revers du repli (supabase/CLAUDE.md) : une fois la migration passée,
 * il faut VÉRIFIER que le genre arrive vraiment sur l'écran, parce qu'un
 * repli qui se déclenche encore l'effacerait en silence sans rien casser.
 *
 * La TABLE, elle, peut manquer aussi (migration `20260825` non appliquée) :
 * dans ce cas l'écran le DIT, exactement comme le carnet de la fiche. Une
 * page vide sans explication se lirait « on n'a jamais rien noté ».
 *
 * Le volume est faible (quelques centaines de notes au plus) : on lit large
 * et on agrège en mémoire, comme le reste du back-office.
 */

import { makeSupabase } from "@/lib/supabase";
import { prenomDe } from "@/lib/admin-auth";
import type { DossierCarnet, NoteCarnet } from "@/lib/atelier/carnet";
import { PLAFOND_CARNET, genreNote, libelleDossier } from "@/lib/atelier/carnet";

export type ChoixCarnet = { valeur: string; libelle: string; nb: number };

export type VueCarnet = {
  notes: NoteCarnet[];
  /** Les dossiers qui portent au moins une note, du plus bavard au moins. */
  dossiers: ChoixCarnet[];
  /** Les auteurs qui ont écrit au moins une note. */
  auteurs: ChoixCarnet[];
  /** La migration `notes` n'est pas passée : l'écran le dit au lieu de mentir. */
  indisponible: boolean;
  /** On a atteint le plafond : il existe des notes plus anciennes non lues. */
  tronque: boolean;
  fetchedAt: string;
};

type RangeeNote = {
  id: string;
  numero_id: string;
  qui: string;
  texte: string;
  created_at: string;
  /* Absent tant que la migration `20260908_notes_genre.sql` n'est pas passée :
     la seconde lecture, celle du repli, ne le rapporte pas du tout. */
  genre?: string | null;
};

type RangeeDossier = {
  id: string;
  token: string;
  titre: string | null;
  prenom: string | null;
};

export async function chargerCarnet(): Promise<VueCarnet> {
  const supabase = makeSupabase();
  const vide: VueCarnet = {
    notes: [],
    dossiers: [],
    auteurs: [],
    indisponible: false,
    tronque: false,
    fetchedAt: new Date().toISOString(),
  };

  let rangees: RangeeNote[];
  try {
    const lu = await lireNotes(supabase);
    if (!lu) return { ...vide, indisponible: true };
    rangees = lu;
  } catch (err) {
    console.error("[admin/atelier] carnet exception", (err as Error)?.message);
    return { ...vide, indisponible: true };
  }

  /* Les dossiers cités, en une requête. Une note dont le dossier a disparu
     garde `null` : elle reste affichée, sans lien. */
  const ids = [...new Set(rangees.map((n) => n.numero_id))];
  const parId = new Map<string, DossierCarnet>();
  if (ids.length) {
    const { data, error } = await supabase
      .from("numeros")
      .select("id, token, titre, prenom")
      .in("id", ids)
      .returns<RangeeDossier[]>();
    if (error) {
      console.error("[admin/atelier] carnet : dossiers illisibles", error.code, error.message);
    }
    for (const d of data ?? []) {
      parId.set(d.id, { token: d.token, titre: d.titre, prenom: d.prenom });
    }
  }

  const notes: NoteCarnet[] = rangees.map((n) => ({
    id: n.id,
    numeroId: n.numero_id,
    qui: n.qui,
    auteur: prenomDe(n.qui),
    texte: n.texte,
    createdAt: n.created_at,
    /* `genreNote` et pas la valeur brute : la colonne n'a ni `check` ni enum,
       donc la base peut rendre n'importe quoi. Ce qui n'est pas l'un des cinq
       mots vaut `null`, comme une note sans genre. */
    genre: genreNote(n.genre),
    dossier: parId.get(n.numero_id) ?? null,
  }));

  return {
    notes,
    dossiers: compterDossiers(notes),
    auteurs: compterAuteurs(notes),
    indisponible: false,
    tronque: rangees.length >= PLAFOND_CARNET,
    fetchedAt: new Date().toISOString(),
  };
}

/**
 * Les notes, avec `genre` si la colonne existe — sinon sans, et sans le dire.
 *
 * Rend `null` quand la table elle-même est illisible (l'écran affiche alors
 * « carnet non installé »), et une liste dans tous les autres cas.
 *
 * 42703 = undefined_column. Toute AUTRE erreur est une vraie panne : on ne
 * retente pas, sinon un incident de base se lirait « carnet vide ».
 */
async function lireNotes(supabase: ReturnType<typeof makeSupabase>): Promise<RangeeNote[] | null> {
  const avec = await supabase
    .from("notes")
    .select("id, numero_id, qui, texte, created_at, genre")
    .order("created_at", { ascending: false })
    .limit(PLAFOND_CARNET)
    .returns<RangeeNote[]>();

  if (!avec.error) return avec.data ?? [];

  if (avec.error.code !== "42703") {
    console.error("[admin/atelier] carnet indisponible", avec.error.code, avec.error.message);
    return null;
  }

  const sans = await supabase
    .from("notes")
    .select("id, numero_id, qui, texte, created_at")
    .order("created_at", { ascending: false })
    .limit(PLAFOND_CARNET)
    .returns<RangeeNote[]>();

  if (sans.error) {
    console.error("[admin/atelier] carnet indisponible", sans.error.code, sans.error.message);
    return null;
  }
  return sans.data ?? [];
}

/* Les listes déroulantes se construisent depuis les notes elles-mêmes, jamais
   depuis la table des dossiers : proposer 300 dossiers dont 290 sans une
   seule note ferait d'un filtre utile un annuaire. */
function compterDossiers(notes: NoteCarnet[]): ChoixCarnet[] {
  const par = new Map<string, ChoixCarnet>();
  for (const n of notes) {
    if (!n.dossier) continue;
    const cle = n.dossier.token;
    const vu = par.get(cle);
    if (vu) vu.nb++;
    else par.set(cle, { valeur: cle, libelle: libelleDossier(n.dossier), nb: 1 });
  }
  return [...par.values()].sort((a, b) => b.nb - a.nb || a.libelle.localeCompare(b.libelle, "fr"));
}

function compterAuteurs(notes: NoteCarnet[]): ChoixCarnet[] {
  const par = new Map<string, ChoixCarnet>();
  for (const n of notes) {
    const vu = par.get(n.qui);
    if (vu) vu.nb++;
    else par.set(n.qui, { valeur: n.qui, libelle: n.auteur, nb: 1 });
  }
  return [...par.values()].sort((a, b) => b.nb - a.nb || a.libelle.localeCompare(b.libelle, "fr"));
}

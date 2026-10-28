/**
 * Les projets de la page d'accueil de la mise en page : dossiers (avec
 * photos), éditions collectives et magazines sauvegardés, classés en
 * « À démarrer », « En cours », « Archivés ». LECTURE seule, serveur seul.
 *
 * Un magazine sauvegardé (table `mises_en_page`, migration 20261027) range sa
 * source en « En cours » ou « Archivés ». Sans lui, ou sans la table
 * (42P01 / PGRST205 : `tableAbsente`), tout est « À démarrer » et rien ne
 * plante : l'écran le dit d'un mot.
 */

import { makeSupabase } from "@/lib/supabase";
import { estEtatEdition, etatEffectif, LIBELLE_ETAT_EDITION, type EtatEdition } from "@/lib/collectif/etats";
import { COMPTE_SANS_LIGNE, lireHorsCorbeille } from "@/lib/collectif/horsCorbeille";
import { lireToutesLesLignes } from "@/lib/collectif/lignes";
import { colonneAbsente, tableAbsente } from "@/lib/collectif/migration";
import { chargerDossiersMep } from "./donnees";
import { LIBRE_PATTERN, libelleEtat, nomDossier } from "./libelles";

export type OngletMep = "demarrer" | "cours" | "archives";
export type SourceMep = "particulier" | "edition" | "libre";

export type ProjetMep = {
  cle: string;
  source: SourceMep;
  nom: string;
  href: string;
  onglet: OngletMep;
  /** Le mot de l'état de la source (dossier ou édition). */
  etat: string;
  nbPhotos: number | null;
  /** Édition dont la collecte est encore ouverte : avertit, ne bloque pas. */
  collecteOuverte: boolean;
  photosSupprimees: boolean;
  /** La source elle-même est archivée (dossier ou édition). */
  sourceArchivee: boolean;
  modifieLe: string | null;
  modifiePar: string | null;
  exporteLe: string | null;
  /** Instant de tri (ms), 0 si inconnu. */
  tri: number;
};

export type ProjetsMep = { projets: ProjetMep[]; sauvegardeDisponible: boolean };

type RangeeMagazine = {
  id: string;
  source: SourceMep;
  numero_id: string | null;
  edition_id: string | null;
  titre: string | null;
  etat: "en_cours" | "archive";
  created_at: string;
  modifie_par: string | null;
  modifie_le: string | null;
  exporte_le: string | null;
};

type RangeeEdition = {
  id: string;
  organisation: string;
  evenement: string;
  etat: string;
  cloture_le: string | null;
  archive_le: string | null;
  photos_supprimees_le?: string | null;
};

const COLONNES_MAGAZINE = "id, source, numero_id, edition_id, titre, etat, created_at, modifie_par, modifie_le, exporte_le";
const COLONNES_EDITION = "id, organisation, evenement, etat, cloture_le, archive_le";

const JOUR = new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short", timeZone: "Europe/Paris" });
const jour = (iso: string | null) => (iso ? JOUR.format(new Date(iso)) : null);
const instant = (iso: string | null) => (iso ? Date.parse(iso) || 0 : 0);

async function lireMagazines(): Promise<{ lignes: RangeeMagazine[]; disponible: boolean }> {
  const supabase = makeSupabase();
  const lu = await lireToutesLesLignes<RangeeMagazine>(
    () => supabase.from("mises_en_page").select(COLONNES_MAGAZINE).returns<RangeeMagazine[]>(),
    { colonne: "modifie_le", croissant: false },
    "magazines sauvegardés"
  );
  if (lu.error) {
    if (!tableAbsente(lu.error.code)) console.error("[admin/mise-en-page] magazines illisibles", lu.error.code);
    return { lignes: [], disponible: false };
  }
  return { lignes: lu.data, disponible: true };
}

async function lireEditions(): Promise<{ editions: (RangeeEdition & { nbPhotos: number | null })[] }> {
  const supabase = makeSupabase();
  const lire = (colonnes: string) =>
    supabase.from("collectif_editions").select(colonnes).order("created_at", { ascending: false }).returns<RangeeEdition[]>();
  let r = await lire(`${COLONNES_EDITION}, photos_supprimees_le`);
  if (r.error && colonneAbsente(r.error.code)) r = await lire(COLONNES_EDITION);
  if (r.error) {
    if (!tableAbsente(r.error.code)) console.error("[admin/mise-en-page] éditions illisibles", r.error.code);
    return { editions: [] };
  }
  /* Le compte exact par édition (GET limit(0), jamais head), sous la règle de corbeille. */
  const editions = await Promise.all(
    (r.data ?? []).map(async (e) => {
      const c = await lireHorsCorbeille((avec) => {
        const q = supabase.from("collectif_photos").select("id", COMPTE_SANS_LIGNE).eq("edition_id", e.id).not("confirmee_le", "is", null);
        return (avec ? q.is("supprimee_le", null) : q).limit(0);
      });
      return { ...e, nbPhotos: c.error ? null : c.count };
    })
  );
  return { editions };
}

export async function chargerProjetsMep(avecEditions: boolean): Promise<ProjetsMep> {
  const [dossiers, mags, eds] = await Promise.all([
    chargerDossiersMep(),
    lireMagazines(),
    avecEditions ? lireEditions() : Promise.resolve({ editions: [] }),
  ]);

  /* Le plus récent magazine par source ; un « en cours » l'emporte sur un archivé. */
  const parSource = new Map<string, RangeeMagazine>();
  const libres: RangeeMagazine[] = [];
  for (const m of mags.lignes) {
    if (m.source === "libre") { libres.push(m); continue; }
    const cle = m.source === "particulier" ? `p:${m.numero_id}` : `e:${m.edition_id}`;
    const ancien = parSource.get(cle);
    if (!ancien || (ancien.etat === "archive" && m.etat === "en_cours")) parSource.set(cle, m);
  }

  const ongletDe = (m: RangeeMagazine | undefined): OngletMep => (!m ? "demarrer" : m.etat === "archive" ? "archives" : "cours");
  const projets: ProjetMep[] = [];

  /* Les dossiers déjà vus : un magazine sauvegardé d'un dossier sans photo (effacées) reste listé via lui. */
  for (const d of dossiers) {
    const m = parSource.get(`p:${d.token}`);
    projets.push({
      cle: `p:${d.token}`,
      source: "particulier",
      nom: nomDossier(d),
      href: `/admin/atelier/mise-en-page/${d.token}`,
      onglet: ongletDe(m),
      etat: libelleEtat(d.etat),
      nbPhotos: d.nbPhotos,
      collecteOuverte: false,
      photosSupprimees: false,
      sourceArchivee: d.archive,
      modifieLe: jour(m?.modifie_le ?? null),
      modifiePar: m?.modifie_par ?? null,
      exporteLe: jour(m?.exporte_le ?? null),
      tri: m ? instant(m.modifie_le) : instant(d.creeLe),
    });
  }

  for (const e of eds.editions) {
    const m = parSource.get(`e:${e.id}`);
    const purgee = Boolean(e.photos_supprimees_le);
    /* Une édition archivée ou purgée sans magazine n'a rien à démarrer. */
    if (!m && (e.archive_le || purgee)) continue;
    const etat: EtatEdition = estEtatEdition(e.etat) ? etatEffectif(e.etat, e.cloture_le, new Date()) : "composition";
    projets.push({
      cle: `e:${e.id}`,
      source: "edition",
      nom: `${e.organisation} · ${e.evenement}`,
      href: `/admin/atelier/mise-en-page/edition-${e.id}`,
      onglet: ongletDe(m),
      etat: LIBELLE_ETAT_EDITION[etat],
      nbPhotos: e.nbPhotos,
      collecteOuverte: etat === "preparation",
      photosSupprimees: purgee,
      sourceArchivee: Boolean(e.archive_le),
      modifieLe: jour(m?.modifie_le ?? null),
      modifiePar: m?.modifie_par ?? null,
      exporteLe: jour(m?.exporte_le ?? null),
      tri: m ? instant(m.modifie_le) : instant(e.cloture_le),
    });
  }

  for (const m of libres) {
    const id = `libre-${m.id}`;
    if (!LIBRE_PATTERN.test(id)) continue;
    projets.push({
      cle: `l:${m.id}`,
      source: "libre",
      nom: m.titre?.trim() || "Création libre",
      href: `/admin/atelier/mise-en-page/${id}`,
      onglet: ongletDe(m),
      etat: "Libre",
      nbPhotos: null,
      collecteOuverte: false,
      photosSupprimees: false,
      sourceArchivee: false,
      modifieLe: jour(m.modifie_le),
      modifiePar: m.modifie_par,
      exporteLe: jour(m.exporte_le),
      tri: instant(m.modifie_le),
    });
  }

  projets.sort((a, b) => b.tri - a.tri);
  return { projets, sauvegardeDisponible: mags.disponible };
}

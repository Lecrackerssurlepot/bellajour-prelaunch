import type { SupabaseClient } from "@supabase/supabase-js";
import { logEvenement } from "@/lib/atelier/evenements";
import { canonicalizeEmail } from "@/lib/email";
import type { Connectee } from "@/lib/compte/session";
import {
  doitEpingler,
  peutVoirDossier,
  type DossierDuCompte,
  type Regard,
} from "@/lib/compte/rattachement";

/**
 * Les lectures et l'épinglage du compte — côté serveur, service key.
 *
 * Le compte ne lit JAMAIS la base directement depuis le navigateur : le
 * serveur relit la session (utilisateurConnecte), construit le Regard, et
 * filtre ici. La règle d'accès vit dans rattachement.ts, pas dans une
 * requête — les deux selects ci-dessous ramènent des CANDIDATS, et
 * peutVoirDossier tranche (défense en profondeur : si un select ramenait
 * trop large, la règle pure retiendrait quand même la porte).
 *
 * REPLI 42703 — `compte_id` est une colonne fraîche (20260904) et Mathias
 * applique les migrations lui-même : tant qu'elle n'existe pas, le select
 * par compte_id échoue en 42703 et on vit sur le rapprochement par email
 * seul. Même patron que CHAMPS_MAIL / CHAMPS_MAIL_REPLI (mails.ts). En
 * ajoutant une colonne fraîche à CHAMPS_COMPTE, la retirer du REPLI.
 */

export type DossierAffiche = DossierDuCompte & {
  id: string;
  titre: string | null;
  occasion: string | null;
  palier: string | null;
  nb_pages: number | null;
  created_at: string | null;
  souvenir_pdf_key: string | null;
  tracking_url: string | null;
  transporteur: string | null;
  anonymise_le: string | null;
  /* Le prix GELÉ à la publication de l'aperçu (migration 20260910).
     Optionnelle : le repli la laisse `undefined` et le prix retombe sur la
     grille, exactement comme avant le gel. */
  prix_centimes?: number | null;
  /* Les visuels publiés par l'atelier — la vraie couverture de la
     bibliothèque, et les pages de la visionneuse. jsonb libre, résolu par
     `resoudreApercu` (apercu.ts) : jamais lu à la main. */
  apercu_urls: unknown;
};

const CHAMPS_COMPTE =
  "id, token, etat, titre, occasion, palier, nb_pages, nb_photos, consent_photos, " +
  "compte_id, email_canonical, created_at, etat_maj_le, souvenir_pdf_key, " +
  "tracking_url, transporteur, anonymise_le, apercu_urls, " +
  "prix_centimes, livraison_centimes, pays_livraison, livraison_niveau";

/* Identique moins les trois colonnes du prix gelé (20260910), les plus
   fraîches — le repli tant qu'elle n'est pas passée. `compte_id` (20260904,
   appliquée et vérifiée le 04/09) est donc revenue dedans, comme
   `tracking_code` était revenu dans CHAMPS_MAIL_REPLI. */
const CHAMPS_COMPTE_REPLI =
  "id, token, etat, titre, occasion, palier, nb_pages, nb_photos, consent_photos, " +
  "compte_id, email_canonical, created_at, etat_maj_le, souvenir_pdf_key, " +
  "tracking_url, transporteur, anonymise_le, apercu_urls";

/* Ce que la BARRE lit — les colonnes de `DossierDuCompte`, pas une de plus. */
const CHAMPS_BARRE =
  "token, etat, compte_id, email_canonical, consent_photos, nb_photos, etat_maj_le";
const CHAMPS_BARRE_REPLI =
  "token, etat, email_canonical, consent_photos, nb_photos, etat_maj_le";

export function regardDe(qui: Connectee): Regard {
  return {
    uid: qui.id,
    canon: canonicalizeEmail(qui.email),
    emailConfirme: qui.emailConfirme,
  };
}

type LigneBrute = Omit<DossierAffiche, "compte_id"> & { compte_id?: string | null };

function normaliser<T extends { compte_id?: string | null }>(lignes: T[]) {
  return lignes.map((l) => ({ ...l, compte_id: l.compte_id ?? null }));
}

/**
 * Les CANDIDATS : deux selects, fusionnés par token, puis la règle pure
 * tranche (peutVoirDossier). Le cœur commun des deux lectures ci-dessous —
 * l'espace en veut toutes les colonnes, la barre de navigation presque
 * aucune, et ni l'une ni l'autre ne doit réécrire la règle d'accès.
 *
 * ⚠️ LES DEUX SELECTS PARTENT ENSEMBLE (09/09/2026, chantier lenteur).
 * Ils étaient séquentiels : on payait deux allers-retours vers Supabase l'un
 * derrière l'autre alors qu'aucun des deux ne dépend du résultat de l'autre.
 * En parallèle, le coût de la lecture tombe à celui du plus lent.
 *
 * REPLI 42703 — Mathias applique les migrations lui-même : tant qu'une
 * colonne fraîche n'existe pas, PostgREST répond 42703 aux DEUX requêtes
 * (elles demandent les mêmes colonnes), et on les refait avec `champsRepli`.
 * Un aller-retour de plus, mais UNIQUEMENT dans ce monde-là.
 * ⚠️ Une seule exception, et elle a sa raison : quand c'est `compte_id`
 * lui-même qui manque (20260904), la requête par compte_id ne peut pas être
 * refaite — on filtre dessus. Seul le rapprochement par email répond alors,
 * et c'est pourquoi le repli teste la présence de la colonne dans la liste
 * plutôt que de rejouer les deux en aveugle.
 */
async function lireCandidats(
  supabase: SupabaseClient,
  regard: Regard,
  champs: string,
  champsRepli: string,
): Promise<LigneBrute[]> {
  const requete = (colonnes: string, par: "compte" | "email") => {
    const base = supabase.from("numeros").select(colonnes).is("anonymise_le", null);
    return par === "compte"
      ? base.eq("compte_id", regard.uid)
      : base.eq("email_canonical", regard.canon);
  };

  const [premierCompte, premierEmail] = await Promise.all([
    requete(champs, "compte"),
    regard.emailConfirme ? requete(champs, "email") : null,
  ]);

  /* Une colonne fraîche manque : les DEUX requêtes ont échoué pour la même
     raison (elles demandent les mêmes colonnes), on les refait sans elle.
     La requête par compte_id n'est refaite que si le repli porte encore
     cette colonne : quand c'est ELLE qui manque (20260904), filtrer dessus
     n'a aucun sens et seul le rapprochement par email peut répondre. */
  const replier = premierCompte.error?.code === "42703";
  const compteEncorePossible = champsRepli.includes("compte_id");

  const [parCompte, parEmail] = replier
    ? await Promise.all([
        compteEncorePossible ? requete(champsRepli, "compte") : premierCompte,
        regard.emailConfirme ? requete(champsRepli, "email") : null,
      ])
    : [premierCompte, premierEmail];

  const parToken = new Map<string, LigneBrute>();

  if (parCompte.error) {
    if (parCompte.error.code !== "42703") {
      console.error("[compte] lecture par compte_id en panne :", parCompte.error.message);
    }
    /* 42703 : la migration n'est pas passée — le rapprochement email suffit. */
  } else {
    for (const ligne of (parCompte.data ?? []) as unknown as LigneBrute[]) {
      parToken.set(ligne.token, ligne);
    }
  }

  const email = parEmail;

  if (email) {
    if (email.error) {
      console.error("[compte] lecture par email en panne :", email.error.message);
    } else {
      for (const ligne of (email.data ?? []) as unknown as LigneBrute[]) {
        if (!parToken.has(ligne.token)) parToken.set(ligne.token, ligne);
      }
    }
  }

  return [...parToken.values()];
}

function trier<T extends DossierDuCompte>(dossiers: T[], regard: Regard): T[] {
  const visibles = dossiers.filter((d) => peutVoirDossier(d, regard));
  visibles.sort((a, b) => (b.etat_maj_le ?? "").localeCompare(a.etat_maj_le ?? ""));
  return visibles;
}

/**
 * Tous les dossiers que ce compte a le droit de voir, anonymisés exclus
 * (un dossier refermé ne porte plus rien — il n'a rien à faire sur un
 * dashboard).
 */
export async function lireDossiersDuCompte(
  supabase: SupabaseClient,
  qui: Connectee,
): Promise<DossierAffiche[]> {
  const regard = regardDe(qui);
  const lignes = await lireCandidats(supabase, regard, CHAMPS_COMPTE, CHAMPS_COMPTE_REPLI);
  return trier(normaliser(lignes) as DossierAffiche[], regard);
}

/**
 * LA MÊME LECTURE, POUR LA BARRE DE NAVIGATION (09/09/2026).
 *
 * /api/compte/statut ne rend qu'un nombre et, à l'occasion, un token : il
 * n'a que faire du titre, du palier, du PDF souvenir, et surtout pas du
 * `apercu_urls` — un jsonb qui porte toutes les planches d'un numéro et
 * qu'on traînait sur le réseau, pour chaque dossier, à chaque ouverture de
 * page, pour le jeter aussitôt.
 *
 * Les colonnes retenues sont EXACTEMENT celles de `DossierDuCompte`, c'est-à-dire
 * celles dont la règle d'accès a besoin — plus rien. Même règle, même filtre,
 * même tri : c'est la charge qui maigrit, pas le contrôle.
 */
export async function lireDossiersPourLaBarre(
  supabase: SupabaseClient,
  qui: Connectee,
): Promise<DossierDuCompte[]> {
  const regard = regardDe(qui);
  const lignes = await lireCandidats(supabase, regard, CHAMPS_BARRE, CHAMPS_BARRE_REPLI);
  return trier(normaliser(lignes) as unknown as DossierDuCompte[], regard);
}

/**
 * Le rattachement au rendu de /numero/<token> — la cliente CONNECTÉE qui
 * visite son numéro le lie à son compte, sans un geste de plus.
 *
 * - 'lie'      : le dossier est (ou vient d'être) rattaché à CE compte ;
 * - 'etranger' : la session ne voit pas ce dossier — on ne dit RIEN sur la
 *   page (le token reste une identité complète : elle affiche le dossier,
 *   mais la bande compte se tait plutôt que de proposer un rattachement
 *   qui échouerait ou, pire, de fuiter à qui il est) ;
 * - 'aucun'    : dossier introuvable ou brique compte en panne — silence.
 *
 * Best-effort intégral : rien ici ne fait tomber la page du numéro.
 */
export async function rattacherParToken(
  supabase: SupabaseClient,
  qui: Connectee,
  token: string,
): Promise<"lie" | "etranger" | "aucun"> {
  try {
    const lire = (champs: string) =>
      supabase.from("numeros").select(champs).eq("token", token).maybeSingle();
    let { data, error } = await lire(
      "id, token, etat, compte_id, email_canonical, consent_photos, nb_photos, etat_maj_le, anonymise_le",
    );
    if (error?.code === "42703") {
      ({ data, error } = await lire(
        "id, token, etat, email_canonical, consent_photos, nb_photos, etat_maj_le, anonymise_le",
      ));
    }
    if (error || !data) return "aucun";

    const brute = data as unknown as DossierAffiche & { anonymise_le: string | null };
    const dossier = { ...brute, compte_id: brute.compte_id ?? null };
    if (dossier.anonymise_le) return "aucun";

    const regard = regardDe(qui);
    if (!peutVoirDossier(dossier, regard)) return "etranger";
    if (doitEpingler(dossier, regard)) {
      const { error: errMaj } = await supabase
        .from("numeros")
        .update({ compte_id: regard.uid })
        .eq("id", dossier.id)
        .is("compte_id", null);
      if (errMaj) {
        /* Un UPDATE sur colonne inconnue rend PGRST204, pas 42703 (cache de
           schema PostgREST — supabase/CLAUDE.md) : les deux sont le meme
           « migration pas encore passee ». */
        if (errMaj.code !== "42703" && errMaj.code !== "PGRST204") {
          console.error("[compte] rattachement /numero en panne :", errMaj.message);
        }
        /* Colonne absente : elle le sera au prochain passage. La cliente
           VOIT quand même la bande « rattaché » — le rapprochement par
           email fait déjà foi en lecture. */
        return "lie";
      }
      await logEvenement(supabase, dossier.id, "compte_rattache", { via: "numero" });
    }
    return "lie";
  } catch (e) {
    console.error("[compte] rattacherParToken :", e instanceof Error ? e.message : e);
    return "aucun";
  }
}

/**
 * Épingle au compte les dossiers vus par email seul (compte_id = uid).
 * Best-effort et idempotent : le `is("compte_id", null)` fait que deux
 * rendus concurrents n'écrivent qu'une fois, un 42703 se tait (la colonne
 * arrivera), et RIEN ici ne fait échouer un rendu de page.
 */
export async function epinglerDossiers(
  supabase: SupabaseClient,
  qui: Connectee,
  dossiers: DossierAffiche[],
  via: "compte" | "numero",
): Promise<void> {
  const regard = regardDe(qui);
  for (const d of dossiers) {
    if (!doitEpingler(d, regard)) continue;
    const { error } = await supabase
      .from("numeros")
      .update({ compte_id: regard.uid })
      .eq("id", d.id)
      .is("compte_id", null);
    if (error) {
      /* PGRST204 = colonne inconnue d'un UPDATE (supabase/CLAUDE.md). */
      if (error.code !== "42703" && error.code !== "PGRST204") {
        console.error("[compte] épinglage en panne :", error.message);
      }
      return; /* colonne absente ou panne : inutile d'insister sur les suivants */
    }
    await logEvenement(supabase, d.id, "compte_rattache", { via });
  }
}

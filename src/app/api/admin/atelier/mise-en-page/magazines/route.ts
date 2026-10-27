/**
 * /api/admin/atelier/mise-en-page/magazines — la sauvegarde partagée de l'outil
 * de mise en page (docs/produit/MISE-EN-PAGE.md §6, étape 1).
 *
 * GET  ?etat=en_cours|archive : la liste, SANS le contenu.
 * POST { source, numeroToken? | editionId + magazineId?, titre, contenu } : crée.
 *
 * Seule table écrite : `mises_en_page` (§5 : aucune table existante n'est
 * touchée, aucun état changé, aucun mail). Pas de ligne dans `evenements` : ce
 * journal est celui d'un DOSSIER client et la mise en page n'en change aucun ;
 * la ligne porte elle-même qui l'a créée et modifiée (`cree_par`,
 * `modifie_par`, `modifie_le`).
 *
 * Le résumé (planches, photos posées) n'est PAS calculé dans la liste : il
 * faudrait relire chaque `contenu` (jusqu'à 2 Mo par ligne) pour afficher un
 * accueil. La liste rend les colonnes seules ; le résumé viendra d'une colonne
 * posée à la sauvegarde si l'accueil en a besoin.
 *
 * Sans la migration 20261027 : 503 `migration_mises_en_page_absente`.
 */

import { NextResponse } from "next/server";
import { makeSupabase } from "@/lib/supabase";
import { quiEstConnecteRequete } from "@/lib/admin-session";
import { prenomDe } from "@/lib/admin-auth";
import { isValidNumeroToken } from "@/lib/atelier/token";
import { estUuid } from "@/lib/collectif/cles";
import { collectifOuvert } from "@/lib/collectif/interrupteur";
import { ERREUR_MIGRATION_ABSENTE, tableAbsente } from "@/lib/collectif/migration";
import {
  TAILLE_MAX_CONTENU,
  TAILLE_MAX_CORPS,
  contenuValide,
  estEtatMep,
  estSourceMep,
  tailleContenu,
  titreValide,
} from "@/lib/mise-en-page/sauvegarde";
import {
  COLONNES_SANS_CONTENU,
  SANS_CACHE,
  lireCorpsBorne,
  refus,
  refusCorps,
  reponseTableAbsente,
  tableMepAbsente,
} from "./commun";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const qui = await quiEstConnecteRequete(request);
  if (!qui) return refus(401, "non_authentifie");

  const etat = new URL(request.url).searchParams.get("etat") ?? "en_cours";
  if (!estEtatMep(etat)) return refus(400, "etat_invalide");

  try {
    const supabase = makeSupabase();
    const { data, error } = await supabase
      .from("mises_en_page")
      .select(COLONNES_SANS_CONTENU)
      .eq("etat", etat)
      .order("modifie_le", { ascending: false });
    if (error) {
      if (tableMepAbsente(error.code)) return reponseTableAbsente();
      console.error("[admin/mise-en-page/magazines] lecture", error.code, error.message);
      return refus(500, "lecture_impossible");
    }
    return NextResponse.json({ ok: true, etat, magazines: data ?? [] }, { status: 200, headers: SANS_CACHE });
  } catch (err) {
    console.error("[admin/mise-en-page/magazines] exception", (err as Error)?.message);
    return refus(500, "internal");
  }
}

type Rattachement = { numero_id: string | null; edition_id: string | null; magazine_id: string | null };

export async function POST(request: Request) {
  const qui = await quiEstConnecteRequete(request);
  if (!qui) return refus(401, "non_authentifie");

  const lu = await lireCorpsBorne(request, TAILLE_MAX_CORPS);
  if (!lu.ok) return refusCorps(lu.raison);
  const corps = lu.corps;

  const source = corps.source;
  if (!estSourceMep(source)) return refus(400, "source_invalide");
  const titre = titreValide(corps.titre);
  if (!titre) return refus(400, "titre_invalide");
  if (tailleContenu(corps.contenu) > TAILLE_MAX_CONTENU) return refus(413, "trop_lourd");
  if (!contenuValide(corps.contenu)) return refus(400, "contenu_invalide");
  const contenu = corps.contenu;

  /* Une édition n'existe que si le B2B est ouvert : même 404 qu'une route collectif fermée. */
  if (source === "edition" && !collectifOuvert()) return new NextResponse(null, { status: 404 });

  try {
    const supabase = makeSupabase();
    let rattachement: Rattachement = { numero_id: null, edition_id: null, magazine_id: null };

    if (source === "particulier") {
      const token = typeof corps.numeroToken === "string" ? corps.numeroToken.trim() : "";
      if (!isValidNumeroToken(token)) return refus(400, "token_invalide");
      const { data: numero, error } = await supabase.from("numeros").select("id").eq("token", token).maybeSingle<{ id: string }>();
      if (error) {
        console.error("[admin/mise-en-page/magazines] numero", error.code, error.message);
        return refus(500, "lecture_impossible");
      }
      if (!numero) return refus(404, "introuvable");
      rattachement = { numero_id: numero.id, edition_id: null, magazine_id: null };
    } else if (source === "edition") {
      const editionId = corps.editionId;
      const magazineId = corps.magazineId;
      if (!estUuid(editionId) || !estUuid(magazineId)) return refus(400, "identifiant_invalide");
      /* Le magazine doit appartenir à CETTE édition : la base ne le vérifie pas (MISE-EN-PAGE, migration 20261027). */
      const { data: mag, error } = await supabase
        .from("collectif_magazines")
        .select("id, edition_id")
        .eq("id", magazineId)
        .eq("edition_id", editionId)
        .maybeSingle<{ id: string; edition_id: string }>();
      if (error) {
        if (tableAbsente(error.code)) return refus(503, ERREUR_MIGRATION_ABSENTE);
        console.error("[admin/mise-en-page/magazines] magazine", error.code, error.message);
        return refus(500, "lecture_impossible");
      }
      if (!mag) return refus(404, "introuvable");
      rattachement = { numero_id: null, edition_id: mag.edition_id, magazine_id: mag.id };
    } else if (corps.numeroToken !== undefined || corps.editionId !== undefined || corps.magazineId !== undefined) {
      return refus(400, "libre_sans_rattachement");
    }

    const prenom = prenomDe(qui);
    const { data, error } = await supabase.from("mises_en_page").insert({
      source,
      ...rattachement,
      titre,
      contenu,
      version: 1,
      cree_par: prenom,
      modifie_par: prenom,
      modifie_le: new Date().toISOString(),
    }).select(COLONNES_SANS_CONTENU).single();

    if (error) {
      if (tableMepAbsente(error.code)) return reponseTableAbsente();
      if (error.code === "23505") {
        /* Déjà un enregistrement pour ce dossier ou ce magazine : l'écran l'ouvre au lieu d'en créer un second. */
        const q = supabase.from("mises_en_page").select("id, version, modifie_par, modifie_le");
        const { data: existant } = await (rattachement.numero_id
          ? q.eq("numero_id", rattachement.numero_id)
          : q.eq("magazine_id", rattachement.magazine_id ?? "")
        ).maybeSingle<{ id: string; version: number; modifie_par: string | null; modifie_le: string }>();
        return refus(409, "existe_deja", existant ? { id: existant.id, version: existant.version, modifie_par: existant.modifie_par, modifie_le: existant.modifie_le } : {});
      }
      console.error("[admin/mise-en-page/magazines] insertion", error.code, error.message);
      return refus(500, "ecriture_impossible");
    }
    return NextResponse.json({ ok: true, magazine: data }, { status: 201, headers: SANS_CACHE });
  } catch (err) {
    console.error("[admin/mise-en-page/magazines] exception", (err as Error)?.message);
    return refus(500, "internal");
  }
}

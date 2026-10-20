import { NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { prenomDe } from "@/lib/admin-auth";
import { quiEstConnecteRequete } from "@/lib/admin-session";
import { generateNumeroToken } from "@/lib/atelier/token";
import { makeSupabase } from "@/lib/supabase";
import { controleAppareilActif, empreinte } from "@/lib/collectif/appareil";
import { estUuid } from "@/lib/collectif/cles";
import { collectifOuvert } from "@/lib/collectif/interrupteur";
import { journaliser } from "@/lib/collectif/journal";
import { codeMailLienRegenere, COLONNE_LIEN, origineDepuis, QUELS_LIENS, type QuelLien } from "@/lib/collectif/liens";
import { envoyerMailCollectif, mailsCollectifOuverts, VAR_MAILS_COLLECTIF, type EtatEnvoi } from "@/lib/collectif/mails";
import { donneesLienRegenere, lienPrevenu, mailLienRegenere, type LienPrevenu } from "@/lib/collectif/mailsTextes";
import { colonneAbsente, ERREUR_MIGRATION_ABSENTE, tableAbsente } from "@/lib/collectif/migration";
import type { EditionLigne } from "@/lib/collectif/types";

/**
 * /api/admin/collectif/editions/[id]/lien — régénérer UN des trois liens.
 *
 * L'ancien cesse de fonctionner AUSSITÔT : c'est le geste quand un lien a
 * circulé trop loin. Le nouveau n'est pas renvoyé ici (la fiche se relit et
 * l'affiche), et le journal dit QUEL lien a changé, jamais sa valeur.
 *
 * T-196 (20/10) :
 * - POST `{ quel, verifier: true }` : la vérification, rien n'est écrit. Pour
 *   le lien des participants, combien de liens de CONTRIBUTION actifs tombent
 *   avec lui (ils sont `/depot/<token_depot>?p=<clé>`) ; et le mail qui
 *   partira au responsable (à qui, quel objet, les mails sont-ils ouverts ?).
 * - POST `{ quel }` : la régénération. Le journal garde l'EMPREINTE de
 *   l'ancien lien (`ancien`, jamais le token) : la page « Ce lien ne fonctionne
 *   plus » y retrouve le registre de l'édition. Puis, décision de Mathias, le
 *   responsable est prévenu par mail (lien du responsable ou des participants
 *   seulement), par le circuit unique (`envoyerMailCollectif`, coupé tant que
 *   `COLLECTIF_MAILS` est fermé). Le mail ne fait JAMAIS échouer le geste.
 * - GET `?quel=responsable|depot` : l'aperçu du mail, avec le lien ACTUEL
 *   (avant le geste, l'ancien ; après, celui qui est parti).
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Lue = Pick<
  EditionLigne,
  "id" | "registre" | "evenement" | "responsable_email" | "responsable_nom" | "cloture_le" | "archive_le" | "token_responsable" | "token_equipe" | "token_depot"
>;
const COLONNES = "id, registre, evenement, responsable_email, responsable_nom, cloture_le, archive_le, token_responsable, token_equipe, token_depot";

async function garde(request: Request, params: Promise<{ id: string }>) {
  if (!collectifOuvert()) return { refus: new NextResponse(null, { status: 404 }) } as const;
  const qui = await quiEstConnecteRequete(request);
  if (!qui) return { refus: NextResponse.json({ error: "non_authentifie" }, { status: 401 }) } as const;
  const { id } = await params;
  if (!estUuid(id)) return { refus: NextResponse.json({ error: "introuvable" }, { status: 404 }) } as const;
  return { qui, id } as const;
}

async function lireEdition(supabase: SupabaseClient, id: string) {
  const { data, error } = await supabase.from("collectif_editions").select(COLONNES).eq("id", id).maybeSingle<Lue>();
  if (error) {
    if (tableAbsente(error.code)) return { refus: NextResponse.json({ error: ERREUR_MIGRATION_ABSENTE }, { status: 503 }) } as const;
    console.error("[collectif] édition illisible (lien)", error.code, error.message);
    return { refus: NextResponse.json({ error: "lecture_impossible" }, { status: 500 }) } as const;
  }
  if (!data) return { refus: NextResponse.json({ error: "introuvable" }, { status: 404 }) } as const;
  return { edition: data } as const;
}

/**
 * Les liens de contribution ACTIFS de l'édition (non supprimés) : ceux qui
 * portent `token_depot` et meurent avec lui. Repli sans `retire_le` (migration
 * 20261018) : tous comptent. `null` si la base ne répond pas. Un compte exact,
 * pas une lecture de lignes (aucun plafond de 1 000 ne s'en mêle).
 */
async function compterContributions(supabase: SupabaseClient, id: string): Promise<number | null> {
  const actifs = await supabase.from("collectif_provenances").select("id", { count: "exact" }).eq("edition_id", id).is("retire_le", null).limit(1);
  if (!actifs.error) return actifs.count ?? 0;
  if (!colonneAbsente(actifs.error.code)) {
    console.error("[collectif] liens de contribution illisibles", actifs.error.code, actifs.error.message);
    return null;
  }
  const tous = await supabase.from("collectif_provenances").select("id", { count: "exact" }).eq("edition_id", id).limit(1);
  return tous.error ? null : (tous.count ?? 0);
}

function origineDe(request: Request): string {
  return origineDepuis(request.headers.get("x-forwarded-host") ?? request.headers.get("host"), request.headers.get("x-forwarded-proto"));
}

/** Pourquoi aucun mail ne partira (ou `null` : il partira, si `COLLECTIF_MAILS` est ouvert). */
function sansMail(e: Lue, quel: QuelLien): string | null {
  if (!lienPrevenu(quel)) return "Le lien de l'équipe se transmet par le responsable : aucun mail ne part.";
  if (e.archive_le) return "L'édition est archivée : aucun mail ne part.";
  if (!e.responsable_email) return "Aucune adresse de responsable dans les réglages : aucun mail ne part.";
  return null;
}

function mailPour(e: Lue, quel: LienPrevenu, origine: string, contributions: number | null) {
  return mailLienRegenere(donneesLienRegenere(e, quel, origine, quel === "depot" ? (contributions ?? 0) : 0, controleAppareilActif(process.env)));
}

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const g = await garde(request, params);
  if ("refus" in g) return g.refus;
  const quel = new URL(request.url).searchParams.get("quel") ?? "";
  if (!lienPrevenu(quel)) return NextResponse.json({ error: "lien_inconnu" }, { status: 400 });
  const supabase = makeSupabase();
  const lu = await lireEdition(supabase, g.id);
  if ("refus" in lu) return lu.refus;
  const contributions = quel === "depot" ? await compterContributions(supabase, g.id) : 0;
  const mail = mailPour(lu.edition, quel, origineDe(request), contributions);
  return new NextResponse(mail.html, { headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-store", "x-robots-tag": "noindex" } });
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const g = await garde(request, params);
  if ("refus" in g) return g.refus;
  const { qui, id } = g;

  let corps: { quel?: unknown; verifier?: unknown };
  try {
    corps = (await request.json()) as typeof corps;
  } catch {
    return NextResponse.json({ error: "corps_illisible" }, { status: 400 });
  }
  const quel = corps.quel as QuelLien;
  if (!QUELS_LIENS.includes(quel)) return NextResponse.json({ error: "lien_inconnu" }, { status: 400 });

  const supabase = makeSupabase();
  const lu = await lireEdition(supabase, id);
  if ("refus" in lu) return lu.refus;
  const origine = origineDe(request);
  const contributions = quel === "depot" ? await compterContributions(supabase, id) : 0;

  /* La vérification : rien n'est écrit, rien ne part. */
  if (corps.verifier === true) {
    const raison = sansMail(lu.edition, quel);
    return NextResponse.json({
      quel,
      contributions,
      mail:
        raison === null && lienPrevenu(quel)
          ? { a: lu.edition.responsable_email, sujet: mailPour(lu.edition, quel, origine, contributions).sujet, ouverts: mailsCollectifOuverts(), interrupteur: VAR_MAILS_COLLECTIF }
          : null,
      sansMail: raison,
    });
  }

  const colonne = COLONNE_LIEN[quel];
  const ancien = lu.edition[colonne];
  for (let essai = 0; essai < 2; essai++) {
    /* Conditionné à l'ancien lien : deux régénérations croisées ne s'écrasent pas en silence. */
    const { data, error } = await supabase
      .from("collectif_editions")
      .update({ [colonne]: generateNumeroToken() })
      .eq("id", id)
      .eq(colonne, ancien)
      .select(COLONNES)
      .returns<Lue[]>();
    if (error) {
      if (tableAbsente(error.code)) return NextResponse.json({ error: ERREUR_MIGRATION_ABSENTE }, { status: 503 });
      if (error.code === "23505" || error.code === "23514") continue;
      console.error("[collectif] lien non régénéré", error.code, error.message);
      return NextResponse.json({ error: "ecriture_impossible" }, { status: 500 });
    }
    const apres = data?.[0];
    if (!apres) {
      return NextResponse.json(
        { error: "lien_change", message: "Le lien vient de changer depuis un autre écran : la fiche se relit, rien n'a été écrit." },
        { status: 409 }
      );
    }

    const journal = await journaliser(
      supabase,
      { editionId: id },
      "lien_regenere",
      { quel, par: prenomDe(qui), ancien: empreinte(ancien), ...(quel === "depot" && contributions ? { liensCoupes: contributions } : {}) },
      qui
    );

    /* Le responsable est prévenu (décision de Mathias, T-196). Best-effort strict : le lien est
       déjà changé, un mail raté ne le défait pas et ne fait pas échouer la réponse. */
    let mail: EtatEnvoi | null = null;
    const raison = sansMail(apres, quel);
    if (raison === null && lienPrevenu(quel) && apres.responsable_email) {
      try {
        mail = await envoyerMailCollectif({
          supabase,
          editionId: id,
          code: codeMailLienRegenere(quel, empreinte(apres[colonne])),
          a: { email: apres.responsable_email, nom: apres.responsable_nom },
          mail: mailPour(apres, quel, origine, contributions),
          verrou: true,
          qui,
        });
      } catch (e) {
        console.error("[collectif] mail du lien régénéré", e);
        mail = "echec";
      }
    }
    return NextResponse.json({ ok: true, journal, contributions, mail, sansMail: raison });
  }
  return NextResponse.json({ error: "ecriture_impossible" }, { status: 500 });
}

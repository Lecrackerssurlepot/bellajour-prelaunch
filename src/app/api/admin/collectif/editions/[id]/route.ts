import { NextResponse } from "next/server";
import { prenomDe } from "@/lib/admin-auth";
import { quiEstConnecteRequete } from "@/lib/admin-session";
import { makeSupabase } from "@/lib/supabase";
import { estUuid } from "@/lib/collectif/cles";
import { collectifOuvert } from "@/lib/collectif/interrupteur";
import { journaliser } from "@/lib/collectif/journal";
import { colonneAbsente, ERREUR_MIGRATION_ABSENTE, ERREUR_PERSONNES_ABSENTE, MESSAGE_PERSONNES_ABSENTE, personnesAbsentes, tableAbsente } from "@/lib/collectif/migration";
import type { BriefLigne } from "@/lib/collectif/brief";
import { lireSaisieEdition, magazineVide, planMagazines, resserrerRangs, type MagazineActuel } from "@/lib/collectif/saisie";
import type { ReglagesPlafond } from "@/lib/collectif/plafonds";

/**
 * PATCH /api/admin/collectif/editions/[id] — régler une édition depuis sa fiche.
 *
 * Seuls les champs envoyés sont lus (même règle que la création, saisie.ts).
 * Le plafond de l'atelier ramène le curseur du client dans la même écriture.
 * Les magazines (T-190, planche 10 validée le 19/10 au soir) : renommer toujours,
 * ajouter à la suite, retirer n'importe quel magazine ENCORE VIDE (`magazineVide` :
 * aucune pièce de brief, aucun tour, rien de validé), les suivants prenant le
 * numéro libéré ; un magazine commencé répond 409 et le dit (planMagazines).
 * ⚠️ `unique (edition_id, rang)` : les retraits d'abord, puis les rangs resserrés
 * UN PAR UN du plus petit au plus grand (`resserrerRangs`), puis les nouveaux à la
 * suite. Aucune étape ne pose deux magazines au même rang. Tout est journalisé.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!collectifOuvert()) return new NextResponse(null, { status: 404 });
  const qui = await quiEstConnecteRequete(request);
  if (!qui) return NextResponse.json({ error: "non_authentifie" }, { status: 401 });

  const { id } = await params;
  if (!estUuid(id)) return NextResponse.json({ error: "introuvable" }, { status: 404 });

  let corps: unknown;
  try {
    corps = await request.json();
  } catch {
    return NextResponse.json({ error: "corps_illisible" }, { status: 400 });
  }

  const supabase = makeSupabase();
  /* La clôture en base : une date passée n'est refusée que si on la CHANGE
     (T-186), une édition close reste réglable. */
  /* L'ouverture (migration 20261023) se lit aussi : inchangée, elle n'est pas réécrite. Sans la
     colonne, la lecture d'avant (rien à replier d'autre : la saisie ne l'écrit alors que si on la règle). */
  type Actuel = ReglagesPlafond & { id: string; cloture_le: string | null; ouverture_le?: string | null };
  const lireActuel = (colonnes: string) => supabase.from("collectif_editions").select(colonnes).eq("id", id).maybeSingle<Actuel>();
  let lu = await lireActuel("id, plafond_participant_atelier, plafond_participant_client, plafond_total, cloture_le, ouverture_le");
  if (lu.error && personnesAbsentes(lu.error)) lu = await lireActuel("id, plafond_participant_atelier, plafond_participant_client, plafond_total, cloture_le");
  const { data: actuel, error: errLecture } = lu;
  if (errLecture) {
    if (tableAbsente(errLecture.code)) return NextResponse.json({ error: ERREUR_MIGRATION_ABSENTE }, { status: 503 });
    return NextResponse.json({ error: "lecture_impossible" }, { status: 500 });
  }
  if (!actuel) return NextResponse.json({ error: "introuvable" }, { status: 404 });

  const saisie = lireSaisieEdition(corps, "modification", actuel, new Date());
  if (!saisie.ok) return NextResponse.json({ error: "saisie", erreurs: saisie.erreurs }, { status: 422 });

  /* Les magazines d'abord VÉRIFIÉS (sans rien écrire) : un plan refusé ne
     doit pas laisser derrière lui des réglages à moitié enregistrés. */
  let plan: ReturnType<typeof planMagazines> | null = null;
  let actuels: MagazineActuel[] = [];
  if (saisie.magazines) {
    /* Un magazine n'est « vide » que si RIEN n'y est composé ni rattaché
       (`magazineVide` : D24, une pièce peut venir d'un style sans que `style_id`
       soit posé ; la seule table qui pointe vers un magazine est
       `collectif_tours`, les notes et les couvertures pointent vers un tour).
       Repli sans les colonnes de la migration 20261017. */
    const avant = "id, rang, nom, style_id, palette_cle, texte, doubles, couvertures_aimees, brief_valide_le, bat_valide_le";
    const lire = (c: string) =>
      supabase
        .from("collectif_magazines")
        .select(c)
        .eq("edition_id", id)
        .returns<(BriefLigne & { id: string; rang: number; nom: string; bat_valide_le: string | null })[]>();
    let mags = await lire(`${avant}, palette_style_id, typo_style_id, doubles_aimes`);
    if (mags.error && colonneAbsente(mags.error.code)) mags = await lire(avant);
    if (mags.error) return NextResponse.json({ error: "lecture_impossible" }, { status: 500 });
    const ids = (mags.data ?? []).map((m) => m.id as string);
    const tours = ids.length
      ? await supabase.from("collectif_tours").select("magazine_id").in("magazine_id", ids)
      : { data: [], error: null };
    if (tours.error) return NextResponse.json({ error: "lecture_impossible" }, { status: 500 });
    const nbTours = new Map<string, number>();
    for (const t of (tours.data ?? []) as { magazine_id: string }[]) nbTours.set(t.magazine_id, (nbTours.get(t.magazine_id) ?? 0) + 1);
    actuels = (mags.data ?? []).map((m) => ({
      id: m.id as string,
      rang: m.rang as number,
      nom: m.nom as string,
      vide: magazineVide(m, nbTours.get(m.id as string) ?? 0),
    }));
    plan = planMagazines(actuels, saisie.magazines);
    if (!plan.ok) {
      /* Un magazine commencé : 409, la saisie n'est pas fautive, l'état l'interdit. */
      return NextResponse.json(
        { error: plan.conflit ? "magazine_commence" : "saisie", erreurs: [{ champ: "magazines", message: plan.message }] },
        { status: plan.conflit ? 409 : 422 }
      );
    }
  }

  const par = prenomDe(qui);
  let journalOk = true;

  const champs = Object.keys(saisie.edition);
  if (champs.length) {
    const { error } = await supabase.from("collectif_editions").update(saisie.edition).eq("id", id);
    if (error) {
      /* Une ouverture réglée sans la migration 20261023 : rien n'est écrit, et on le dit. */
      if (personnesAbsentes(error)) return NextResponse.json({ error: ERREUR_PERSONNES_ABSENTE, message: MESSAGE_PERSONNES_ABSENTE }, { status: 503 });
      console.error("[collectif] réglages non écrits", error.code, error.message);
      return NextResponse.json({ error: "ecriture_impossible" }, { status: 500 });
    }
    journalOk = await journaliser(supabase, { editionId: id }, "reglages_modifies", { par, champs }, qui);
  }

  let restes: MagazineActuel[] = [];
  if (plan?.ok && (plan.renommer.length || plan.renumeroter.length || plan.ajouter.length || plan.retirer.length)) {
    for (const r of plan.renommer) {
      const { error } = await supabase.from("collectif_magazines").update({ nom: r.nom }).eq("id", r.id).eq("edition_id", id);
      if (error) return NextResponse.json({ error: "ecriture_impossible" }, { status: 500 });
    }

    const retirer = plan.retirer;
    let renumeroter = plan.renumeroter;
    let ajouter = plan.ajouter;
    const partis: MagazineActuel[] = [];
    if (retirer.length) {
      /* Seulement des magazines VIDES (planMagazines). La requête le redit : si le
         client a commencé ou validé le brief depuis la lecture, la ligne reste.
         (Un tour, que seul l'atelier crée, ne se garde pas ici : la suppression
         l'emporterait en cascade.) */
      const { data, error } = await supabase
        .from("collectif_magazines")
        .delete()
        .in("id", retirer)
        .eq("edition_id", id)
        .is("brief_valide_le", null)
        .is("bat_valide_le", null)
        .is("style_id", null)
        .is("palette_cle", null)
        .is("texte", null)
        .select("id");
      if (error) return NextResponse.json({ error: "ecriture_impossible" }, { status: 500 });
      const supprimes = new Set(((data ?? []) as { id: string }[]).map((d) => d.id));
      partis.push(...actuels.filter((m) => supprimes.has(m.id)));
      restes = actuels.filter((m) => retirer.includes(m.id) && !supprimes.has(m.id));
      if (restes.length) {
        /* La course : on resserre ce qui est VRAIMENT resté, sans collision. */
        const restants = actuels.filter((m) => !supprimes.has(m.id));
        renumeroter = resserrerRangs(restants);
        ajouter = plan.ajouter.map((m, i) => ({ ...m, rang: restants.length + i + 1 }));
      }
    }

    /* Du plus petit rang au plus grand, un par un : chacun descend sur une place libre. */
    for (const r of renumeroter) {
      const { error } = await supabase.from("collectif_magazines").update({ rang: r.rang }).eq("id", r.id).eq("edition_id", id);
      if (error) {
        console.error("[collectif] rang non resserré", error.code, error.message);
        return NextResponse.json({ error: "ecriture_impossible" }, { status: 500 });
      }
    }
    if (ajouter.length) {
      const { error } = await supabase
        .from("collectif_magazines")
        .insert(ajouter.map((m) => ({ edition_id: id, rang: m.rang, nom: m.nom })));
      if (error) return NextResponse.json({ error: "ecriture_impossible" }, { status: 500 });
    }

    for (const m of partis) {
      journalOk = (await journaliser(supabase, { editionId: id }, "magazine_retire", { par, nom: m.nom, rang: m.rang }, qui)) && journalOk;
    }
    journalOk =
      (await journaliser(
        supabase,
        { editionId: id },
        "magazines_modifies",
        { par, renommes: plan.renommer.length, ajoutes: ajouter.length, retires: partis.length, renumerotes: renumeroter.length },
        qui
      )) && journalOk;
  }

  /* La liste telle que la base la garde maintenant : l'écran la reprend aussitôt (un
     magazine ajouté a son id, il ne repartira pas en double au prochain « Enregistrer »). */
  let magazines: { id: string; rang: number; nom: string }[] | undefined;
  if (plan?.ok) {
    const relus = await supabase.from("collectif_magazines").select("id, rang, nom").eq("edition_id", id).order("rang", { ascending: true });
    if (!relus.error) magazines = (relus.data ?? []) as { id: string; rang: number; nom: string }[];
  }

  if (restes.length) {
    /* Le reste est écrit ; ce magazine-là, le client vient de le commencer. */
    return NextResponse.json(
      {
        error: "magazine_commence",
        partiel: true,
        erreurs: [{ champ: "magazines", message: `« ${restes[0].nom} » : le client vient de commencer ce magazine, il n'a pas été retiré.` }],
        magazines,
        journal: journalOk,
      },
      { status: 409 }
    );
  }
  return NextResponse.json({ ok: true, suggestion: saisie.suggestion, magazines, journal: journalOk });
}

import { createHash } from "node:crypto";
import { NextResponse } from "next/server";
import { quiEstConnecteRequete } from "@/lib/admin-session";
import { makeSupabase } from "@/lib/supabase";
import { controleAppareilActif } from "@/lib/collectif/appareil";
import { estUuid } from "@/lib/collectif/cles";
import { collectifOuvert } from "@/lib/collectif/interrupteur";
import { origineDesMails } from "@/lib/collectif/liens";
import { envoyerMailCollectif, mailsCollectifOuverts, VAR_MAILS_COLLECTIF } from "@/lib/collectif/mails";
import { donneesEspacePret, mailEspacePret } from "@/lib/collectif/mailsTextes";
import { ERREUR_MIGRATION_ABSENTE, tableAbsente } from "@/lib/collectif/migration";
import type { EditionLigne } from "@/lib/collectif/types";

/**
 * /api/admin/collectif/editions/[id]/mail-espace — « Votre espace est prêt » (T-146,
 * T-187) : SON lien, et depuis le 20/10 (retouche de Mathias) où trouver dans
 * l'espace ceux de l'équipe et des participants, sans les écrire. Appelée par
 * l'onglet « Réglages et liens » ET par l'écran « L'édition est créée »
 * (`/admin/collectif/creee/[id]`).
 *
 * GET : l'aperçu HTML du mail, tel qu'il partirait (l'atelier le relit avant).
 * POST `{ verifier: true }` : à qui, quel objet, et si les mails des éditions
 * sont ouverts ; rien ne part. POST `{}` : l'envoi, une fois par lien du
 * responsable (le verrou porte l'empreinte du token : régénérer le lien
 * permet de renvoyer) ; `{ renvoyer: true }` le renvoie quand même.
 * Rien ne part tant que `COLLECTIF_MAILS` est fermé : la route le dit.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Lue = Pick<EditionLigne, "id" | "organisation" | "evenement" | "registre" | "responsable_email" | "responsable_nom" | "cloture_le" | "token_responsable" | "token_equipe" | "token_depot" | "archive_le">;

async function preparer(request: Request, id: string) {
  const supabase = makeSupabase();
  const { data, error } = await supabase
    .from("collectif_editions")
    .select("id, organisation, evenement, registre, responsable_email, responsable_nom, cloture_le, token_responsable, token_equipe, token_depot, archive_le")
    .eq("id", id)
    .maybeSingle<Lue>();
  if (error) return { erreur: tableAbsente(error.code) ? NextResponse.json({ error: ERREUR_MIGRATION_ABSENTE }, { status: 503 }) : NextResponse.json({ error: "lecture_impossible" }, { status: 500 }) } as const;
  if (!data) return { erreur: NextResponse.json({ error: "introuvable" }, { status: 404 }) } as const;
  /* L'origine du site, aussi pour l'aperçu (T-164) : l'atelier relit le mail tel qu'il partira,
     jamais avec l'adresse locale ou celle d'une version d'essai. */
  const origine = origineDesMails(process.env);
  /* Les mêmes données que l'écran « L'édition est créée » (`donneesEspacePret`, qui lit
     les trois tokens par `liensEdition` : l'écran montre et copie les trois liens). Le
     MAIL n'écrit que celui du responsable. Aucun ne va au journal : le code du verrou
     porte une empreinte du lien du responsable, jamais le lien. */
  const mail = mailEspacePret(donneesEspacePret(data, origine, controleAppareilActif(process.env)));
  return { supabase, edition: data, mail } as const;
}

async function garde(request: Request, params: Promise<{ id: string }>) {
  if (!collectifOuvert()) return { refus: new NextResponse(null, { status: 404 }) } as const;
  const qui = await quiEstConnecteRequete(request);
  if (!qui) return { refus: NextResponse.json({ error: "non_authentifie" }, { status: 401 }) } as const;
  const { id } = await params;
  if (!estUuid(id)) return { refus: NextResponse.json({ error: "introuvable" }, { status: 404 }) } as const;
  return { qui, id } as const;
}

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const g = await garde(request, params);
  if ("refus" in g) return g.refus;
  const p = await preparer(request, g.id);
  if ("erreur" in p) return p.erreur;
  return new NextResponse(p.mail.html, { headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-store", "x-robots-tag": "noindex" } });
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const g = await garde(request, params);
  if ("refus" in g) return g.refus;
  let corps: { verifier?: unknown; renvoyer?: unknown } = {};
  try {
    corps = (await request.json()) as typeof corps;
  } catch {
    corps = {};
  }
  const p = await preparer(request, g.id);
  if ("erreur" in p) return p.erreur;
  if (p.edition.archive_le) return NextResponse.json({ error: "archivee", message: "L'édition est archivée : aucun mail ne part." }, { status: 409 });
  if (!p.edition.responsable_email) return NextResponse.json({ error: "sans_adresse", message: "Aucune adresse de responsable dans les réglages." }, { status: 409 });

  if (corps.verifier === true) {
    return NextResponse.json({ a: p.edition.responsable_email, sujet: p.mail.sujet, ouverts: mailsCollectifOuverts(), interrupteur: VAR_MAILS_COLLECTIF });
  }

  const empreinte = createHash("sha256").update(p.edition.token_responsable).digest("hex").slice(0, 10);
  const code = corps.renvoyer === true ? `ESPACE-${empreinte}-R${Date.now().toString(36)}` : `ESPACE-${empreinte}`;
  const etat = await envoyerMailCollectif({
    supabase: p.supabase,
    editionId: p.edition.id,
    code,
    a: { email: p.edition.responsable_email, nom: p.edition.responsable_nom },
    mail: p.mail,
    verrou: true,
    qui: g.qui,
  });
  return NextResponse.json({ etat }, { status: etat === "echec" ? 502 : 200 });
}

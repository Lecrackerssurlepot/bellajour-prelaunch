import { after, NextResponse } from "next/server";
import { creerPlafond, delaiNeutre, emailPlausible } from "@/lib/compte/garde";
import { collectifOuvert } from "@/lib/collectif/interrupteur";
import { liensEdition, origineDesMails } from "@/lib/collectif/liens";
import { envoyerMailCollectif, mailsCollectifEnService } from "@/lib/collectif/mails";
import { mailRetrouverEspace } from "@/lib/collectif/mailsTextes";
import { lireCorps } from "@/lib/collectif/reponses";
import type { EditionLigne } from "@/lib/collectif/types";
import { makeSupabase } from "@/lib/supabase";

/**
 * POST /api/collectif/retrouver — « Retrouver mon espace » (T-154).
 *
 * Le responsable tape son adresse ; si elle est celle d'un responsable, son
 * lien part par mail, À CETTE ADRESSE SEULEMENT. La réponse est la MÊME que
 * l'adresse soit connue ou non (patron `/api/waitlist`) : sinon la page serait
 * un annuaire des clients. Même corps, même statut, et le même temps : les
 * mails partent APRÈS la réponse (`after`), derrière un délai neutre.
 *
 * Exception assumée aux règles des routes publiques (pas de token, donc ni
 * `chargerAcces` ni `peut`) : la route ne lit qu'une adresse et n'écrit qu'un
 * verrou de mail. Deux freins :
 * - un mail au plus par quart d'heure et par édition (verrou `collectif_mails`,
 *   code `RETROUVER-<quart d'heure>`) : c'est lui qui protège le responsable ;
 * - trois demandes par minute et par appelant (T-166), le plafond de « mot de
 *   passe oublié », la route sœur du compte. Une `Map` par instance Vercel : il
 *   freine un script qui soumet des adresses en boucle, il n'arrête pas une
 *   attaque (src/app/api/CLAUDE.md). Il compte l'APPELANT, jamais l'adresse, et
 *   chaque demande pareil : le refus ne dit rien de ce qui est en base.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const QUART_D_HEURE_MS = 15 * 60_000;
const EDITIONS_MAX = 5;
const tropVite = creerPlafond(3);

type Lue = Pick<EditionLigne, "id" | "organisation" | "evenement" | "registre" | "responsable_email" | "responsable_nom" | "token_responsable" | "token_equipe" | "token_depot">;

export async function POST(request: Request) {
  if (!collectifOuvert()) return new NextResponse(null, { status: 404 });
  if (tropVite(request)) return NextResponse.json({ error: "trop_de_demandes", message: "Trop de demandes d'un coup. Réessayez dans une minute." }, { status: 429 });
  const corps = await lireCorps(request);
  const email = typeof corps?.email === "string" ? corps.email.trim().toLowerCase() : "";
  if (!emailPlausible(email)) return NextResponse.json({ error: "adresse_invalide", message: "Cette adresse ne semble pas valide." }, { status: 400 });

  if (mailsCollectifEnService()) {
    /* Le lien du mail vient du site, jamais d'un en-tête que l'appelant écrit (T-164). */
    const origine = origineDesMails(process.env);
    after(async () => {
      const supabase = makeSupabase();
      const { data, error } = await supabase
        .from("collectif_editions")
        .select("id, organisation, evenement, registre, responsable_email, responsable_nom, token_responsable, token_equipe, token_depot")
        .eq("responsable_email", email)
        .is("archive_le", null)
        .limit(EDITIONS_MAX)
        .returns<Lue[]>();
      if (error) {
        console.error("[collectif] retrouver : lecture impossible", error.code, error.message);
        return;
      }
      const quart = Math.floor(Date.now() / QUART_D_HEURE_MS);
      for (const e of data ?? []) {
        await envoyerMailCollectif({
          supabase,
          editionId: e.id,
          code: `RETROUVER-${quart}`,
          a: { email: e.responsable_email, nom: e.responsable_nom },
          mail: mailRetrouverEspace({
            tu: e.registre === "ecole_tu",
            organisation: e.organisation,
            evenement: e.evenement,
            responsable: e.responsable_nom,
            lien: liensEdition(origine, e).responsable,
          }),
          verrou: true,
          qui: null,
        });
      }
    });
  }

  await delaiNeutre();
  return NextResponse.json({ ok: true });
}

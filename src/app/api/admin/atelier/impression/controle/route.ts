/**
 * POST /api/admin/atelier/impression/controle — le contrôle technique des
 * PDF print-ready, À LA DEMANDE, avant « Envoyer à l'impression ».
 *
 * ══════════════════════════════════════════════════════════════════════════
 * Jusqu'ici, l'atelier déposait ses PDF sans jamais les revoir : la seule
 * vérification était l'empreinte md5 et la taille (transition/route.ts), qui
 * prouvent que l'objet est ARRIVÉ, pas qu'il est IMPRIMABLE. Cette route
 * télécharge chaque PDF déposé, l'ouvre avec pdf-lib et rend :
 *
 *   - le nombre de pages, comparé à la pagination du dossier pour
 *     `product` / `book`, et à la règle du produit (multiple de 4 min 8
 *     pour l'agrafé, multiple de 2 pour le dos carré) ;
 *   - les dimensions de page en mm (MediaBox, TrimBox si distincte) et
 *     leur verdict contre les specs relevées le 30/08/2026 : 216 × 303 mm
 *     attendus (210 × 297 fini + 3 mm de fond perdu) — la source unique
 *     est docs/reference/SPECS-CLOUDPRINTER.md, les règles pures vivent
 *     dans impression.ts ;
 *   - un signalement si toutes les pages n'ont pas la même taille.
 *
 * Lecture seule : aucun état ne bouge, rien n'est écrit — le résultat vit
 * dans l'écran qui l'a demandé. Un PDF illisible rend un message, jamais
 * une erreur de fiche.
 * ══════════════════════════════════════════════════════════════════════════
 */

import { NextResponse } from "next/server";
import { EncryptedPDFError } from "pdf-lib";
import { makeSupabase } from "@/lib/supabase";
import { quiEstConnecteRequete } from "@/lib/admin-session";
import { isValidNumeroToken } from "@/lib/atelier/token";
import { empreinteObjet, lireObjet } from "@/lib/atelier/r2";
import {
  estCleImpression,
  produitPour,
  finitionDuDossier,
  MAX_PDF_BYTES,
  SLOTS_IMPRESSION,
  type TypeFichier,
} from "@/lib/atelier/impression";
/* T-121 (18/09/2026) : la lecture du PDF et ses verdicts vivent dans
   `controlePdf.ts`, partagés avec la route de transition qui REFUSE désormais
   de commander sur un fichier hors format. Une seule inspection, deux usages. */
import { inspecterPdf, type Inspection } from "@/lib/atelier/controlePdf";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/* Deux PDF de magazine à descendre et à parser : la minute par défaut ne
   suffit pas toujours. Vercel écrête à la limite du plan — déclarer plus
   n'ouvre rien, déclarer moins couperait un contrôle légitime. */
export const maxDuration = 300;

/* Le budget d'UN fichier (téléchargement + lecture). Au-delà, on rend un
   message et on passe au suivant : un contrôle qui plante à mi-course sans
   verdict sur les autres fichiers ne sert à rien. */
const BUDGET_FICHIER_MS = 90_000;

type ControleFichier = {
  type: TypeFichier;
  label: string;
  cle: string;
  taille: number | null;
} & ({ lisible: false; probleme: string } | ({ lisible: true } & Inspection));

export async function POST(request: Request) {
  /* Même défense en profondeur que les routes voisines (presign,
     transition) : le middleware couvre /api/admin/*, la route revérifie. */
  const qui = await quiEstConnecteRequete(request);
  if (!qui) return NextResponse.json({ error: "non_authentifie" }, { status: 401 });

  try {
    const body = (await request.json()) as { token?: unknown };
    const token = typeof body.token === "string" ? body.token.trim() : "";
    if (!isValidNumeroToken(token)) {
      return NextResponse.json({ error: "token_invalide" }, { status: 400 });
    }

    const supabase = makeSupabase();

    let nbPagesDossier: number | null = null;
    /* La finition (migration 20260911) : depuis le 21/09 elle choisit le
       papier intérieur, donc le dos, donc la largeur attendue d'une
       couverture. Lue avec le reste ; `null` = brillant, comme partout. */
    let finitionDossier: string | null = null;
    let fichiersBruts: Record<string, unknown> = {};
    let colonneAbsente = false;

    const { data: numero, error: lecture } = await supabase
      .from("numeros")
      .select("id, nb_pages, impression_fichiers, finition")
      .eq("token", token)
      .maybeSingle<{ id: string; nb_pages: number | null; impression_fichiers: unknown; finition?: string | null }>();

    if (lecture && lecture.code === "42703") {
      /* La colonne `impression_fichiers` (migration 20260827) n'existe pas
         encore ici : aucun PDF n'a donc pu être déposé, on le DIT au lieu
         de tomber. ⚠️ Ce repli efface la donnée en silence si la colonne
         existe mais qu'une autre du select manque — les deux autres sont
         d'origine, le cas est théorique. */
      const { data: repli, error: erreurRepli } = await supabase
        .from("numeros")
        .select("id, nb_pages")
        .eq("token", token)
        .maybeSingle<{ id: string; nb_pages: number | null }>();
      if (erreurRepli) {
        console.error("[admin/impression/controle] lecture échouée", erreurRepli.code, erreurRepli.message);
        return NextResponse.json({ error: "internal" }, { status: 500 });
      }
      if (!repli) return NextResponse.json({ error: "introuvable" }, { status: 404 });
      nbPagesDossier = repli.nb_pages;
      colonneAbsente = true;
    } else if (lecture) {
      console.error("[admin/impression/controle] lecture échouée", lecture.code, lecture.message);
      return NextResponse.json({ error: "internal" }, { status: 500 });
    } else if (!numero) {
      return NextResponse.json({ error: "introuvable" }, { status: 404 });
    } else {
      nbPagesDossier = numero.nb_pages;
      finitionDossier = numero.finition ?? null;
      fichiersBruts = (numero.impression_fichiers && typeof numero.impression_fichiers === "object"
        ? numero.impression_fichiers
        : {}) as Record<string, unknown>;
    }

    /* Le produit se DÉDUIT de la pagination du dossier, comme partout :
       c'est lui qui porte la règle du multiple de pages. */
    const produit = produitPour(nbPagesDossier);

    /* Les slots remplis, dans l'ordre de la table produit. En SÉRIE et pas
       en parallèle : deux PDF de magazine tiennent l'un après l'autre dans
       la mémoire d'une fonction, pas forcément côte à côte. */
    const resultats: ControleFichier[] = [];

    for (const slot of SLOTS_IMPRESSION) {
      const cle = fichiersBruts[slot.type];
      if (typeof cle !== "string" || !cle) continue;

      const socle = { type: slot.type, label: slot.label, cle };

      if (!estCleImpression(cle)) {
        resultats.push({ ...socle, taille: null, lisible: false, probleme: "Clé de coffre invalide : redépose le fichier." });
        continue;
      }

      const empreinte = await empreinteObjet(cle);
      if (!empreinte) {
        resultats.push({
          ...socle,
          taille: null,
          lisible: false,
          probleme: "Le fichier n'est pas dans le coffre (dépôt interrompu ?). Redépose-le.",
        });
        continue;
      }
      if (empreinte.taille > MAX_PDF_BYTES) {
        resultats.push({
          ...socle,
          taille: empreinte.taille,
          lisible: false,
          probleme: `Trop lourd pour être contrôlé (${Math.round(empreinte.taille / (1024 * 1024))} Mo, plafond 200 Mo).`,
        });
        continue;
      }

      try {
        const bytes = await lireObjet(cle, AbortSignal.timeout(BUDGET_FICHIER_MS));
        const lu = await inspecterPdf(bytes, slot.type, nbPagesDossier, produit, finitionDuDossier(finitionDossier));
        resultats.push({ ...socle, taille: empreinte.taille, lisible: true, ...lu });
      } catch (err) {
        const e = err as Error;
        const probleme =
          e instanceof EncryptedPDFError || e.name === "EncryptedPDFError"
            ? "PDF chiffré ou protégé par mot de passe : l'imprimeur ne pourra pas l'ouvrir non plus."
            : e.name === "TimeoutError" || e.name === "AbortError"
              ? "Le téléchargement a dépassé le temps imparti. Réessaie, ou contrôle ce fichier en local."
              : "PDF illisible : le fichier n'a pas pu être ouvert comme un PDF valide.";
        console.error("[admin/impression/controle] fichier KO", slot.type, cle, e.name, e.message);
        resultats.push({ ...socle, taille: empreinte.taille, lisible: false, probleme });
      }
    }

    return NextResponse.json(
      { ok: true, nbPagesDossier, colonneAbsente, fichiers: resultats },
      { status: 200 }
    );
  } catch (err) {
    console.error("[admin/impression/controle] exception", (err as Error)?.message);
    return NextResponse.json({ error: "internal" }, { status: 500 });
  }
}

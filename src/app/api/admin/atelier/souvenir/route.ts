/**
 * POST /api/admin/atelier/souvenir — la fabrication du PDF souvenir (03/09).
 *
 * ══════════════════════════════════════════════════════════════════════════
 * Le client reçoit son magazine en numérique à la livraison (mail M7b).
 * Cette route fabrique le fichier : elle relit les PDF print-ready déposés
 * (`impression_fichiers`, JAMAIS des clés venues du navigateur), les
 * assemble en UN document feuilletable, et range le résultat au coffre.
 *
 *   agrafé (20 p.)      — le `product`, pages rognées au format fini ;
 *   dos carré (22-50 p.) — 1re de couv + bloc + 4e de couv, les deux faces
 *                          découpées de la feuille enveloppante (la
 *                          géométrie vit dans souvenir.ts, PURE, prouvée
 *                          par verif-atelier.ts).
 *
 * Les fichiers envoyés à Cloudprinter ne sont pas touchés d'un octet : le
 * souvenir est une COPIE retravaillée, sous sa propre clé. Le CMJN est
 * gardé tel quel (décision du 03/09) et rien n'est recompressé : le
 * souvenir pèse le poids de l'impression, et ce poids est enregistré pour
 * être AFFICHÉ au client avant le clic.
 *
 * Déclencheurs : l'UI l'appelle après « Envoyer à l'impression »
 * (best-effort), et la carte Impression porte un bouton de reprise. Filet
 * ultime : tant que `souvenir_pdf_key` manque, `manquePour` retient M7b et
 * la relève réessaie chaque jour — visible sur /admin/atelier/sante.
 *
 * UN SEUL PASSAGE À LA FOIS (T-122, 21/09/2026). Sur la première commande
 * réelle, les deux déclencheurs ont tourné l'un après l'autre à 16 s d'écart
 * (134 Mo lus, fusionnés et écrits deux fois). La route pose donc un verrou
 * DANS LE JOURNAL : `souvenir_demarre` avant de lire le coffre, puis
 * `souvenir_genere` ou `souvenir_echoue`. Un `souvenir_demarre` sans suite
 * depuis moins de `FENETRE_VERROU_SOUVENIR_MS` rend 409 `deja_en_cours`. La
 * règle est pure (`etatGenerationSouvenir`) et la fiche la relit pour
 * éteindre son bouton. Pas de colonne, pas de migration.
 * ══════════════════════════════════════════════════════════════════════════
 */

import { NextResponse } from "next/server";
import { PDFDocument, EncryptedPDFError } from "pdf-lib";
import { makeSupabase } from "@/lib/supabase";
import { quiEstConnecteRequete } from "@/lib/admin-session";
import { isValidNumeroToken } from "@/lib/atelier/token";
import { logEvenement } from "@/lib/atelier/evenements";
import { ecrireObjet, empreinteObjet, lireObjet, supprimer } from "@/lib/atelier/r2";
import { estCleImpression, MAX_PDF_BYTES } from "@/lib/atelier/impression";
import { reliurePour } from "@/lib/atelier/grille";
import {
  boiteRognee,
  decouperCouverture,
  etatGenerationSouvenir,
  EVT_SOUVENIR_DEMARRE,
  EVT_SOUVENIR_ECHOUE,
  EVT_SOUVENIR_GENERE,
  EVTS_SOUVENIR,
  type Boite,
} from "@/lib/atelier/souvenir";
import { prenomDe } from "@/lib/admin-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/* Deux PDF de magazine à descendre, parser et réécrire : la minute par
   défaut ne suffit pas. Même réglage que le contrôle technique.
   ⚠️ C'est AUSSI la durée du verrou (`FENETRE_VERROU_SOUVENIR_MS`,
   souvenir.ts) : un verrou ne doit pas survivre à la fonction qui l'a posé.
   Next exige ici un LITTÉRAL (un calcul casse le build), donc le lien est
   tenu par le harnais : « la fenetre du verrou vaut la maxDuration ». */
export const maxDuration = 300;

/* Le budget d'UN téléchargement. Au-delà, on rend un message clair plutôt
   qu'un timeout de fonction anonyme. */
const BUDGET_FICHIER_MS = 90_000;

/** Applique une boîte de rognage : les lecteurs affichent le CropBox, les
    imprimantes de bureau suivent le MediaBox — on pose les deux. */
function rogner(page: { setMediaBox: (x: number, y: number, w: number, h: number) => void; setCropBox: (x: number, y: number, w: number, h: number) => void }, b: Boite): void {
  page.setMediaBox(b.x, b.y, b.largeur, b.hauteur);
  page.setCropBox(b.x, b.y, b.largeur, b.hauteur);
}

/** Télécharge et borne un PDF du coffre ; toute impossibilité devient une
    phrase pour l'écran, jamais un 500 anonyme. */
async function chargerPdf(cle: string, label: string): Promise<{ doc: PDFDocument } | { probleme: string }> {
  if (!estCleImpression(cle)) return { probleme: `${label} : clé de coffre invalide, redépose le fichier.` };
  const empreinte = await empreinteObjet(cle);
  if (!empreinte) return { probleme: `${label} : le fichier n'est pas dans le coffre (dépôt interrompu ?).` };
  if (empreinte.taille > MAX_PDF_BYTES) {
    return { probleme: `${label} : trop lourd (${Math.round(empreinte.taille / (1024 * 1024))} Mo, plafond 200 Mo).` };
  }
  try {
    const octets = await lireObjet(cle, AbortSignal.timeout(BUDGET_FICHIER_MS));
    return { doc: await PDFDocument.load(octets, { updateMetadata: false }) };
  } catch (err) {
    const e = err as Error;
    const probleme =
      e instanceof EncryptedPDFError || e.name === "EncryptedPDFError"
        ? `${label} : PDF chiffré ou protégé par mot de passe.`
        : e.name === "TimeoutError" || e.name === "AbortError"
          ? `${label} : téléchargement trop long, réessaie.`
          : `${label} : PDF illisible.`;
    console.error("[admin/souvenir] fichier KO", cle, e.name, e.message);
    return { probleme };
  }
}

export async function POST(request: Request) {
  /* Même défense en profondeur que les routes voisines : le middleware
     couvre /api/admin/*, la route revérifie. */
  const qui = await quiEstConnecteRequete(request);
  if (!qui) return NextResponse.json({ error: "non_authentifie" }, { status: 401 });

  /* Le verrou posé, à libérer sur TOUTE sortie en échec — y compris
     l'exception du `catch`, hors de portée des `const` du `try`. */
  let verrou: { supabase: ReturnType<typeof makeSupabase>; numeroId: string } | null = null;
  const liberer = async (raison: string) => {
    if (!verrou) return;
    await logEvenement(verrou.supabase, verrou.numeroId, EVT_SOUVENIR_ECHOUE, { par: prenomDe(qui), raison });
  };

  try {
    const body = (await request.json()) as { token?: unknown };
    const token = typeof body.token === "string" ? body.token.trim() : "";
    if (!isValidNumeroToken(token)) {
      return NextResponse.json({ error: "token_invalide" }, { status: 400 });
    }

    const supabase = makeSupabase();

    const { data: numero, error: lecture } = await supabase
      .from("numeros")
      .select("id, nb_pages, impression_fichiers, souvenir_pdf_key")
      .eq("token", token)
      .maybeSingle<{
        id: string;
        nb_pages: number | null;
        impression_fichiers: unknown;
        souvenir_pdf_key: string | null;
      }>();

    if (lecture?.code === "42703") {
      /* ⚠️ La migration 20260903 n'est pas passée : ce repli EFFACERAIT la
         clé du souvenir, donc il CRIE et refuse (patron T-001). M7b reste
         « incomplet » jusque-là — comportement sûr. */
      console.error(
        "[admin/souvenir] ⚠️ REPLI 42703 : souvenir_pdf_key absente en base, le PDF souvenir ne peut PAS être enregistré. Appliquer supabase/migrations/20260903_atelier_souvenir.sql.",
      );
      return NextResponse.json({ error: "migration_manquante" }, { status: 500 });
    }
    if (lecture) {
      console.error("[admin/souvenir] lecture échouée", lecture.code, lecture.message);
      return NextResponse.json({ error: "internal" }, { status: 500 });
    }
    if (!numero) return NextResponse.json({ error: "introuvable" }, { status: 404 });

    /* ── LE VERROU (T-122) ─────────────────────────────────────────────
       Le dernier événement souvenir du dossier décide : un `souvenir_demarre`
       récent sans suite = une fusion tourne, on refuse. Une lecture ratée du
       journal refuse aussi : sans lui, on ne sait pas, et ce travail est
       trop lourd pour être fait « au cas où ». */
    const { data: dernierSouvenir, error: lectureJournal } = await supabase
      .from("evenements")
      .select("type, created_at")
      .eq("numero_id", numero.id)
      .in("type", [...EVTS_SOUVENIR])
      .order("created_at", { ascending: false })
      .limit(1)
      .returns<Array<{ type: string; created_at: string }>>();
    if (lectureJournal) {
      console.error("[admin/souvenir] journal illisible", lectureJournal.code, lectureJournal.message);
      return NextResponse.json({ error: "internal" }, { status: 500 });
    }
    const etat = etatGenerationSouvenir(dernierSouvenir ?? [], Date.now());
    if (etat.enCours) {
      return NextResponse.json({ error: "deja_en_cours", depuis: etat.depuis }, { status: 409 });
    }
    /* Best-effort comme tout le journal : si la ligne ne s'écrit pas, on
       génère quand même — le verrou est une ceinture, pas la raison d'être. */
    await logEvenement(supabase, numero.id, EVT_SOUVENIR_DEMARRE, { par: prenomDe(qui) });
    verrou = { supabase, numeroId: numero.id };

    /* Une sortie en échec libère le verrou ET rend la réponse. */
    const echouer = async (statut: number, corps: Record<string, unknown>, raison: string) => {
      await liberer(raison);
      return NextResponse.json(corps, { status: statut });
    };

    const fichiers = (numero.impression_fichiers && typeof numero.impression_fichiers === "object"
      ? numero.impression_fichiers
      : {}) as Record<string, unknown>;
    const cleDe = (type: string): string | null =>
      typeof fichiers[type] === "string" && fichiers[type] ? (fichiers[type] as string) : null;

    /* La reliure se DÉDUIT de la pagination, comme partout, et par la MÊME
       fonction que le prix et que la référence Cloudprinter (`grille.ts`).
       Depuis le 15/09/2026 il n'y a plus que le dos carré (`cover` + `book`) :
       la branche « agrafé » (un seul `product`) est dans
       archive/agrafe-2026-09/souvenir-route.ts. Une pagination hors grille ne
       rend aucune reliure : elle tombe dans la même exigence des deux PDF et
       refuse proprement s'ils manquent — jamais un souvenir composé au hasard. */
    if (reliurePour(numero.nb_pages) !== "dos_carre") {
      console.warn("[admin/souvenir] pagination hors grille, on exige quand même les deux PDF", numero.id, numero.nb_pages);
    }

    const souvenir = await PDFDocument.create();
    let dosMm: number | null = null;

    {
      const cleCover = cleDe("cover");
      const cleBook = cleDe("book");
      if (!cleCover || !cleBook) {
        return echouer(
          409,
          { error: "fichiers_manquants", detail: "Il faut la couverture ET le bloc intérieur déposés." },
          "fichiers_manquants",
        );
      }

      /* EN SÉRIE, pas en parallèle : deux PDF de magazine tiennent l'un
         après l'autre dans la mémoire d'une fonction, pas forcément côte à
         côte (le motif du contrôle technique). */
      const cover = await chargerPdf(cleCover, "PDF de la couverture");
      if ("probleme" in cover) return echouer(422, { error: "fichier_ko", detail: cover.probleme }, cover.probleme);

      const feuille = cover.doc.getPage(0).getMediaBox();
      const decoupe = decouperCouverture(feuille.width, feuille.height);
      if (!decoupe) {
        return echouer(
          422,
          {
            error: "cover_hors_gabarit",
            detail:
              "La couverture n'a pas la tête d'une feuille enveloppante (2 faces + dos + fonds perdus) : le souvenir ne peut pas la découper. Vérifie le fichier avec le contrôle technique.",
          },
          "cover_hors_gabarit",
        );
      }
      dosMm = decoupe.dosMm;

      /* La même page source copiée deux fois : chaque copie reçoit sa boîte
         (1re de couv = panneau droit, 4e = panneau gauche). */
      const [c1, c4] = await souvenir.copyPages(cover.doc, [0, 0]);
      rogner(c1, decoupe.c1);
      rogner(c4, decoupe.c4);
      souvenir.addPage(c1);

      const book = await chargerPdf(cleBook, "PDF du bloc intérieur");
      if ("probleme" in book) return echouer(422, { error: "fichier_ko", detail: book.probleme }, book.probleme);
      const pages = await souvenir.copyPages(book.doc, book.doc.getPageIndices());
      for (const page of pages) {
        rogner(page, boiteRognee(page.getMediaBox().width, page.getMediaBox().height));
        souvenir.addPage(page);
      }

      souvenir.addPage(c4);
    }

    const octets = await souvenir.save();

    /* Suffixe aléatoire, comme les dépôts : on n'écrase jamais un objet dont
       une URL signée circule peut-être encore. */
    const suffixe = crypto.randomUUID().slice(0, 8);
    const cleSouvenir = `numeros/${numero.id}/souvenir/${suffixe}.pdf`;
    await ecrireObjet(cleSouvenir, octets, "application/pdf");

    const { error: ecriture } = await supabase
      .from("numeros")
      .update({ souvenir_pdf_key: cleSouvenir, souvenir_pdf_octets: octets.byteLength })
      .eq("id", numero.id);
    if (ecriture) {
      console.error("[admin/souvenir] écriture échouée", ecriture.code, ecriture.message);
      /* L'objet sans ligne serait invisible et éternel : on le reprend. */
      await supprimer(cleSouvenir);
      return echouer(500, { error: "internal" }, "ecriture_base");
    }

    /* Régénération : l'ancien objet n'est plus référencé, on le reprend.
       Best-effort — un raté laisse un orphelin, pas un lien mort. */
    if (numero.souvenir_pdf_key && numero.souvenir_pdf_key !== cleSouvenir) {
      await supprimer(numero.souvenir_pdf_key);
    }

    /* Invariant nº6 : toute écriture se journalise. Best-effort assumé —
       la clé est déjà en base, un rejeu régénérerait proprement. */
    await logEvenement(supabase, numero.id, EVT_SOUVENIR_GENERE, {
      par: prenomDe(qui),
      cle: cleSouvenir,
      octets: octets.byteLength,
      ...(dosMm !== null ? { dos_mm: dosMm } : {}),
    });

    return NextResponse.json({ ok: true, octets: octets.byteLength }, { status: 200 });
  } catch (err) {
    console.error("[admin/souvenir] exception", (err as Error)?.message);
    await liberer("exception");
    return NextResponse.json({ error: "internal" }, { status: 500 });
  }
}

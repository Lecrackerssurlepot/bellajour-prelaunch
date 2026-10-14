import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { creerPlafond } from "@/lib/compte/garde";
import { ecrireObjet } from "@/lib/atelier/r2";
import { makeSupabase } from "@/lib/supabase";
import { chargerAcces } from "@/lib/collectif/acces";
import { cleContenu } from "@/lib/collectif/cles";
import { contenuClient, lireFichierContenu, lireReponsesMot, OCTETS_MAX_CONTENU } from "@/lib/collectif/contenus";
import { peut } from "@/lib/collectif/droits";
import { collectifOuvert } from "@/lib/collectif/interrupteur";
import { journaliser } from "@/lib/collectif/journal";
import { refusAcces, refusDroit } from "@/lib/collectif/reponses";

/**
 * POST /api/collectif/contenus — « À envoyer à l'atelier » (PRD §14.2).
 * - un FICHIER (logo, programme, liste, rubrique) : `multipart/form-data`
 *   avec `token`, `type` et `fichier`. Le token reste dans le CORPS, jamais
 *   dans l'URL. Le fichier passe par le serveur (4 Mo au plus) et s'écrit au
 *   coffre sous `collectif/<id>/contenus/` ;
 * - un QUESTIONNAIRE (le mot du dirigeant) : JSON `{ token, type: "mot", reponses: [...] }`.
 *
 * Responsable seulement (`envoyer_contenu`) ; l'équipe reçoit 403. Envoyer de
 * nouveau un contenu ajoute une ligne : le plus récent gagne à l'écran, rien
 * ne s'efface.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const tropVite = creerPlafond(30);

function non(statut: number, error: string, message?: string) {
  return NextResponse.json(message ? { error, message } : { error }, { status: statut });
}

export async function POST(request: Request) {
  if (!collectifOuvert()) return new NextResponse(null, { status: 404 });
  if (tropVite(request)) return non(429, "trop_vite");
  const type = (request.headers.get("content-type") ?? "").toLowerCase();
  const annonce = Number(request.headers.get("content-length") ?? "0");
  if (annonce > OCTETS_MAX_CONTENU + 64 * 1024) return non(413, "trop_lourd", "4 Mo au plus. Pour un fichier plus lourd, écrivez à l'atelier.");

  let token = "";
  let cle: unknown;
  let fichier: File | null = null;
  let reponses: unknown;
  try {
    if (type.startsWith("multipart/form-data")) {
      const f = await request.formData();
      token = String(f.get("token") ?? "");
      cle = f.get("type");
      const brut = f.get("fichier");
      fichier = brut instanceof File ? brut : null;
    } else {
      const c = (await request.json()) as Record<string, unknown>;
      token = String(c?.token ?? "");
      cle = c?.type;
      reponses = c?.reponses;
    }
  } catch {
    return non(400, "corps_illisible");
  }

  const acces = await chargerAcces(token, "espace");
  const refus = refusAcces(acces);
  if (refus || acces.statut !== "ok") return refus ?? new NextResponse(null, { status: 404 });
  if (!peut(acces.role, "envoyer_contenu")) return refusDroit();
  const { edition } = acces;

  const contenu = contenuClient(cle);
  if (!contenu || !(edition.contenus_demandes ?? []).includes(contenu.cle)) return non(422, "saisie", "L'atelier n'a pas demandé ce contenu.");

  const supabase = makeSupabase();
  const qui = edition.responsable_nom ?? "Le responsable";
  const id = randomUUID();
  let ligne: Record<string, unknown>;

  if (contenu.mode === "questionnaire") {
    const lues = lireReponsesMot(reponses);
    if (!lues.ok) return non(422, "saisie", lues.message);
    ligne = { id, edition_id: edition.id, type: contenu.cle, reponses: lues.reponses, depose_par: qui };
  } else {
    if (!fichier) return non(422, "saisie", "Choisir un fichier.");
    const lu = lireFichierContenu(contenu, fichier.name, fichier.size);
    if (!lu.ok) return non(422, "saisie", lu.message);
    const octets = new Uint8Array(await fichier.arrayBuffer());
    if (octets.byteLength > OCTETS_MAX_CONTENU) return non(413, "trop_lourd", "4 Mo au plus.");
    const key = cleContenu(edition.id, id, `contenu.${lu.extension}`);
    try {
      await ecrireObjet(key, octets, lu.type);
    } catch (e) {
      console.error("[collectif] contenu non écrit au coffre", e);
      return non(502, "ecriture_impossible", "Le coffre n'a pas répondu : rien n'a été enregistré.");
    }
    ligne = { id, edition_id: edition.id, type: contenu.cle, r2_key: key, nom_origine: fichier.name.slice(0, 160), depose_par: qui };
  }

  const { error } = await supabase.from("collectif_contenus").insert(ligne);
  if (error) {
    console.error("[collectif] contenu non enregistré", error.code, error.message);
    return non(500, "ecriture_impossible");
  }
  const journal = await journaliser(supabase, { editionId: edition.id }, "contenu_recu", { type: contenu.libelle, par: qui }, null);
  return NextResponse.json({ ok: true, journal }, { status: 201 });
}

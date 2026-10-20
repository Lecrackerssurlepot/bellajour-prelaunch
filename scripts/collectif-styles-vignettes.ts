/**
 * T-172 — poser les tailles réduites (600 et 1 200 px de large) des images de
 * style enregistrées AVANT que la route ne les fabrique.
 *
 *   npx tsx --tsconfig tsconfig.json scripts/collectif-styles-vignettes.ts
 *   npx tsx --tsconfig tsconfig.json scripts/collectif-styles-vignettes.ts --mesurer
 *   npx tsx --tsconfig tsconfig.json scripts/collectif-styles-vignettes.ts --style riviera --mesurer
 *   npx tsx --tsconfig tsconfig.json scripts/collectif-styles-vignettes.ts --vraiment
 * ══════════════════════════════════════════════════════════════════════════
 * CE QU'IL FAIT, ET POURQUOI IL EXISTE
 * Le mur des styles servait les images MAÎTRESSES (jusqu'à 2 400 px et 4 Mo)
 * dans des cartes de 300 px. Depuis T-172, la route d'envoi d'une image de
 * style écrit aussi une version de 600 et une de 1 200 px (`taillesStyle.ts`)
 * et le style les garde dans `tailles` ; le mur les sert en `srcset`. Ce
 * script fait la MÊME chose, avec la MÊME fabrique, pour les images d'avant.
 * Sans lui, rien ne casse : une image sans tailles reste servie en maîtresse.
 *
 * TROIS RÉGIMES
 * - sans option : LECTURE SEULE de `collectif_styles`. Il compte, style par
 *   style, les images qui ont déjà leurs tailles et celles qui les attendent.
 * - `--mesurer` : LECTURE SEULE aussi. Il lit en plus chaque maîtresse au
 *   coffre (GET), fabrique ses tailles EN MÉMOIRE, et dit le poids : ce que le
 *   mur télécharge aujourd'hui (les maîtresses) et ce qu'il téléchargerait
 *   en 600 px. Rien n'est écrit, ni au coffre, ni en base.
 * - `--vraiment` : ÉCRIT. Pour chaque image qui attend : ses tailles au coffre
 *   (objets NEUFS à côté de la maîtresse, `…_w600.webp`, jamais la maîtresse
 *   elle-même), puis le style (`couvertures`, `doubles`, `typos` : la même
 *   liste, chaque image gagne seulement `tailles`), À CONDITION que la ligne
 *   n'ait pas bougé depuis la lecture (`maj_le` inchangé) ; sinon il ne
 *   l'écrit pas et le dit. Une ligne au journal du style (`style_tailles`).
 *   ⚠️ Décision de Mathias : ne pas lancer `--vraiment` sans son accord.
 *
 * IDEMPOTENT : une image qui a déjà des tailles valides (`lireTailles`) est
 * sautée ; relancé, il reprend où il s'était arrêté. Une maîtresse de 600 px
 * ou moins n'a rien à réduire, et une taille plus lourde que sa maîtresse
 * n'est pas gardée (`tailleUtile`) : la maîtresse reste seule, et il le dit.
 * ⚠️ Un éditeur de style resté ouvert AVANT le passage, puis enregistré, remet
 * le style sans ses tailles (il ne les connaît pas) : relancer le script.
 * ══════════════════════════════════════════════════════════════════════════
 */

import { readFileSync } from "node:fs";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { lireObjet } from "@/lib/atelier/r2";
import { journaliser } from "@/lib/collectif/journal";
import { lireTailles, type TailleImage } from "@/lib/collectif/styles";
import { ecrireTailles, produireTailles } from "@/lib/collectif/taillesStyle";

/* Une maîtresse fait jusqu'à 4 Mo et sharp la décode entière : deux à la fois. */
const CONCURRENCE = 2;

function sansGuillemets(v: string): string {
  const t = v.trim();
  return t.length > 1 && (t[0] === '"' || t[0] === "'") && t.at(-1) === t[0] ? t.slice(1, -1) : t;
}

/** `.env.local` versé dans `process.env` (r2.ts et le client lisent `process.env`, cf. collectif-heic-rattrapage.ts). */
function chargerEnv(): void {
  for (const ligne of readFileSync(".env.local", "utf8").split("\n")) {
    const m = ligne.match(/^([A-Z0-9_]+)=(.*)$/);
    if (!m || process.env[m[1]] !== undefined) continue;
    process.env[m[1]] = sansGuillemets(m[2]);
  }
}

function argument(nom: string): string | null {
  const i = process.argv.indexOf(nom);
  return i >= 0 ? (process.argv[i + 1] ?? null) : null;
}

type Objet = Record<string, unknown>;
type LigneStyle = {
  id: string;
  slug: string;
  nom: string;
  publie: boolean;
  typos: Objet | null;
  couvertures: Objet[] | null;
  doubles: Objet[] | null;
  maj_le: string;
};

/** Où vit une image dans la ligne : l'échantillon des typographies, une couverture ou une double page (par rang). */
type Place = { ou: "echantillon" } | { ou: "couverture"; i: number } | { ou: "double"; i: number };
type Image = { place: Place; key: string; deja: boolean };

function imagesDu(s: LigneStyle): Image[] {
  const l: Image[] = [];
  const ech = s.typos?.echantillon_key;
  if (typeof ech === "string" && ech) l.push({ place: { ou: "echantillon" }, key: ech, deja: lireTailles(s.slug, ech, s.typos?.echantillon_tailles).length > 0 });
  (s.couvertures ?? []).forEach((c, i) => {
    if (typeof c?.image_key === "string" && c.image_key) l.push({ place: { ou: "couverture", i }, key: c.image_key, deja: lireTailles(s.slug, c.image_key, c.tailles).length > 0 });
  });
  (s.doubles ?? []).forEach((d, i) => {
    if (typeof d?.image_key === "string" && d.image_key) l.push({ place: { ou: "double", i }, key: d.image_key, deja: lireTailles(s.slug, d.image_key, d.tailles).length > 0 });
  });
  return l;
}

type Issue =
  | { quoi: "faite"; key: string; place: Place; tailles: TailleImage[]; maitresse: number; reduites: Record<number, number> }
  | { quoi: "rien_a_reduire"; key: string; maitresse: number; largeur: number }
  | { quoi: "ratee"; key: string; raison: string };

async function traiter(img: Image, vraiment: boolean): Promise<Issue> {
  let octets: Uint8Array;
  try {
    octets = await lireObjet(img.key);
  } catch (e) {
    return { quoi: "ratee", key: img.key, raison: `lecture du coffre (${(e as Error)?.message})` };
  }
  const production = await produireTailles(img.key, octets);
  if (!production.ok) return { quoi: "ratee", key: img.key, raison: production.raison };
  if (!production.tailles.length) return { quoi: "rien_a_reduire", key: img.key, maitresse: octets.byteLength, largeur: production.largeur };
  const reduites: Record<number, number> = {};
  for (const t of production.tailles) reduites[t.largeur] = t.octets.byteLength;
  if (!vraiment) {
    /* La liste qu'on écrirait, sans rien écrire : le compte de la mesure. */
    return { quoi: "faite", key: img.key, place: img.place, tailles: [], maitresse: octets.byteLength, reduites };
  }
  const ecriture = await ecrireTailles(img.key, production);
  if (!ecriture.ok) return { quoi: "ratee", key: img.key, raison: `écriture au coffre (${ecriture.raison})` };
  return { quoi: "faite", key: img.key, place: img.place, tailles: ecriture.tailles, maitresse: octets.byteLength, reduites };
}

/** La ligne du style avec ses nouvelles tailles : chaque objet image GARDE tout ce qu'il avait, il gagne `tailles`. */
function avecTailles(s: LigneStyle, faites: Extract<Issue, { quoi: "faite" }>[]): { typos: Objet | null; couvertures: Objet[]; doubles: Objet[] } {
  const typos = s.typos ? { ...s.typos } : null;
  const couvertures = (s.couvertures ?? []).map((c) => ({ ...c }));
  const doubles = (s.doubles ?? []).map((d) => ({ ...d }));
  for (const f of faites) {
    if (f.place.ou === "echantillon" && typos && typos.echantillon_key === f.key) typos.echantillon_tailles = f.tailles;
    if (f.place.ou === "couverture" && couvertures[f.place.i]?.image_key === f.key) couvertures[f.place.i].tailles = f.tailles;
    if (f.place.ou === "double" && doubles[f.place.i]?.image_key === f.key) doubles[f.place.i].tailles = f.tailles;
  }
  return { typos, couvertures, doubles };
}

const ko = (n: number) => `${Math.round(n / 1024)} Ko`;
const mo = (n: number) => `${(n / 1024 / 1024).toFixed(1).replace(".", ",")} Mo`;

async function main(): Promise<void> {
  chargerEnv();
  const vraiment = process.argv.includes("--vraiment");
  const mesurer = vraiment || process.argv.includes("--mesurer");
  const seul = argument("--style");

  const url = process.env.SUPABASE_URL;
  const cle = process.env.SUPABASE_SERVICE_KEY;
  if (!url || !cle) throw new Error("SUPABASE_URL / SUPABASE_SERVICE_KEY absentes de .env.local");
  const supabase: SupabaseClient = createClient(url, cle);

  let q = supabase.from("collectif_styles").select("id, slug, nom, publie, typos, couvertures, doubles, maj_le").order("ordre", { ascending: true });
  if (seul) q = q.eq("slug", seul);
  const { data, error } = await q.returns<LigneStyle[]>();
  if (error) throw new Error(`Lecture des styles échouée : ${error.code} ${error.message}`);
  const styles = data ?? [];
  if (!styles.length) {
    console.log(`\n  Aucun style${seul ? ` « ${seul} »` : ""}.\n`);
    return;
  }

  const regime = vraiment ? "ÉCRITURE : tailles au coffre, puis le style" : mesurer ? "lecture seule : les maîtresses sont lues, rien n'est écrit" : "lecture seule : la base seulement, ajouter --mesurer pour les poids";
  console.log(`\n  ${styles.length} style(s). [${regime}]\n`);

  const total = { images: 0, deja: 0, faites: 0, rien: 0, ratees: 0, maitresses: 0, w600: 0, w1200: 0, mur: 0, murApres: 0 };
  for (const s of styles) {
    const images = imagesDu(s);
    const attendent = images.filter((i) => !i.deja);
    total.images += images.length;
    total.deja += images.length - attendent.length;
    console.log(`  ${s.publie ? "●" : "○"} ${s.nom} (${s.slug}) : ${images.length} image(s), ${images.length - attendent.length} déjà réduite(s), ${attendent.length} à réduire`);
    if (!mesurer || !attendent.length) continue;

    const issues: Issue[] = [];
    let curseur = 0;
    await Promise.all(
      Array.from({ length: Math.min(CONCURRENCE, attendent.length) }, async () => {
        for (;;) {
          const i = curseur++;
          if (i >= attendent.length) return;
          issues.push(await traiter(attendent[i], vraiment));
        }
      })
    );

    const faites = issues.filter((x): x is Extract<Issue, { quoi: "faite" }> => x.quoi === "faite");
    for (const x of issues) {
      if (x.quoi === "faite") {
        total.faites++;
        total.maitresses += x.maitresse;
        total.w600 += x.reduites[600] ?? 0;
        total.w1200 += x.reduites[1200] ?? 0;
        if (s.publie) {
          total.mur += x.maitresse;
          total.murApres += x.reduites[600] ?? x.maitresse;
        }
        console.log(`      ${x.key.split("/").pop()} : ${ko(x.maitresse)} → 600 px ${ko(x.reduites[600] ?? 0)}${x.reduites[1200] ? `, 1 200 px ${ko(x.reduites[1200])}` : ""}`);
      } else if (x.quoi === "rien_a_reduire") {
        total.rien++;
        if (s.publie) {
          total.mur += x.maitresse;
          total.murApres += x.maitresse;
        }
        console.log(`      ${x.key.split("/").pop()} : ${x.largeur} px de large, aucune taille plus étroite ET plus légère (reste la maîtresse)`);
      } else {
        total.ratees++;
        console.error(`      ✗ ${x.key.split("/").pop()} : ${x.raison}`);
      }
    }

    if (!vraiment || !faites.length) continue;
    const nouveau = avecTailles(s, faites);
    const { data: ecrits, error: e } = await supabase
      .from("collectif_styles")
      .update({ typos: nouveau.typos, couvertures: nouveau.couvertures, doubles: nouveau.doubles })
      .eq("id", s.id)
      .eq("maj_le", s.maj_le)
      .select("id");
    if (e) {
      console.error(`      ✗ style non écrit (${e.code}) : les tailles sont au coffre, relancer`);
      continue;
    }
    if (!ecrits?.length) {
      console.error("      ✗ le style a été modifié pendant le passage : rien d'écrit en base, relancer");
      continue;
    }
    const journal = await journaliser(supabase, { styleId: s.id }, "style_tailles", { par: "rattrapage T-172", images: faites.length }, null);
    console.log(`      ✓ style écrit (${faites.length} image(s))${journal ? "" : " ; ⚠️ journal NON écrit"}`);
  }

  console.log(`\n  ${total.images} image(s) : ${total.deja} déjà réduite(s), ${total.images - total.deja} à réduire.`);
  if (mesurer) {
    console.log(`  Lues : ${total.faites} réduite(s)${vraiment ? "" : " en mémoire"}, ${total.rien} sans rien à réduire, ${total.ratees} en échec.`);
    if (total.faites) console.log(`  Maîtresses ${mo(total.maitresses)} · tailles 600 px ${mo(total.w600)} · 1 200 px ${mo(total.w1200)}.`);
    if (total.mur) console.log(`  Le mur des styles publiés, une image par carte : ${mo(total.mur)} aujourd'hui, ${mo(total.murApres)} en 600 px.`);
  }
  if (!vraiment && total.images - total.deja > 0) console.log("  Rien n'est écrit. Ajouter --vraiment, avec l'accord de Mathias.");
  console.log("");
}

main().catch((e) => {
  console.error("\n  ✗", (e as Error).message, "\n");
  process.exit(1);
});

/**
 * Fusionne le dossier SOURCE (un « suite ») dans le dossier CIBLE, quand un client a dû
 * ouvrir un second dossier parce que le dépôt plafonne à 100 photos par dossier
 * (`MAX_PHOTOS_PAR_NUMERO`, api/atelier/photos/presign).
 *
 *   npx tsx --tsconfig tsconfig.json scripts/fusionner-dossiers.ts --de <token> --vers <token>
 *   npx tsx --tsconfig tsconfig.json scripts/fusionner-dossiers.ts --de <token> --vers <token> --vraiment
 *
 * Sans `--vraiment` : lit tout, écrit la sauvegarde, dit ce qu'il ferait, n'écrit RIEN.
 * Avec : dans cet ordre, pour qu'une coupure laisse toujours un état lisible :
 *  1. sauvegarde JSON (numeros, mises_en_page, photos de la source) dans `--sauvegarde <dossier>`
 *     (par défaut le dossier courant) ;
 *  2. RECOPIE au coffre R2 l'original et la vignette de chaque photo sous `numeros/<cible>/`
 *     (rien n'est effacé à la source : un archivage puis une suppression du dossier source
 *     n'emporteront plus les photos fusionnées) ;
 *  3. rattache les lignes `photos` à la cible (mêmes ids, nouvelles clés, `ordre` à la suite) ;
 *  4. fusionne les mises en page : les planches de la source à la suite de celles de la cible
 *     (ids renumérotés), la couverture de la source posée sur celle de la cible si elle est
 *     vide, les listes du tri réunies ; relu par `contenuValide` avant écriture ; la mise en
 *     page de la source passe en `archive` ;
 *  5. `nb_photos` des deux dossiers, puis la source ARCHIVÉE (`archive_le`), jamais supprimée.
 * Les ids de photo ne changent pas : toute planche déjà composée reste valide.
 * Refuse deux dossiers d'adresses différentes, un dossier payé, ou un dossier déjà archivé.
 */

import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { CopyObjectCommand, HeadObjectCommand } from "@aws-sdk/client-s3";
import { createClient } from "@supabase/supabase-js";
import { bucket, makeR2 } from "@/lib/atelier/r2";
import type { Disposition, Magazine, Planche, TriMagazine } from "@/lib/mise-en-page/magazine";
import { contenuValide } from "@/lib/mise-en-page/sauvegarde";

function sansGuillemets(v: string): string {
  const t = v.trim();
  return t.length > 1 && (t[0] === '"' || t[0] === "'") && t.at(-1) === t[0] ? t.slice(1, -1) : t;
}

function chargerEnv(): void {
  for (const ligne of readFileSync(".env.local", "utf8").split("\n")) {
    const m = ligne.match(/^([A-Z0-9_]+)=(.*)$/);
    if (!m || process.env[m[1]] !== undefined) continue;
    process.env[m[1]] = sansGuillemets(m[2]);
  }
}

chargerEnv();

function argument(nom: string): string | null {
  const i = process.argv.indexOf(nom);
  return i >= 0 && process.argv[i + 1] && !process.argv[i + 1].startsWith("--") ? process.argv[i + 1] : null;
}

type Dossier = {
  id: string; token: string; titre: string | null; prenom: string | null; email: string | null;
  etat: string; nb_photos: number | null; archive_le: string | null; stripe_session_id: string | null;
};
type Photo = { id: string; r2_key: string; vignette_key: string | null; ordre: number };
type LigneMep = { id: string; numero_id: string; etat: string; version: number; contenu: Magazine };

const PREFIXE = (id: string) => `numeros/${id}/`;

/** Renomme les planches de `ajout` en `pl-N` à la suite des ids de `base`. */
function renumeroter(base: Planche[], ajout: Planche[]): Planche[] {
  let n = base.reduce((acc, p) => {
    const k = /^pl-(\d+)$/.exec(p.id);
    return k ? Math.max(acc, Number(k[1])) : acc;
  }, 0);
  return ajout.map((p) => ({ ...p, id: `pl-${++n}` }));
}

const vide = (d: Disposition | null) => !d || d.photos.every((a) => !a.photoId);
const planche0Vide = (p: Planche) => vide(p.double) && vide(p.gauche) && vide(p.droite);

function unir(a: string[] | undefined, b: string[] | undefined): string[] {
  return [...new Set([...(a ?? []), ...(b ?? [])])];
}

function fusionnerTri(a: TriMagazine | undefined, b: TriMagazine | undefined): TriMagazine | undefined {
  if (!a && !b) return undefined;
  const tri: TriMagazine = {
    choisies: unir(a?.choisies, b?.choisies),
    ecartees: unir(a?.ecartees, b?.ecartees),
    visees: a?.visees ?? b?.visees ?? null,
  };
  const coeur = unir(a?.coupsDeCoeur, b?.coupsDeCoeur);
  const reserve = unir(a?.reserve, b?.reserve);
  if (coeur.length) tri.coupsDeCoeur = coeur;
  if (reserve.length) tri.reserve = reserve;
  const et = { ...(a?.etiquettes ?? {}) };
  for (const k of ["couverture", "double", "pleine"] as const) {
    const u = unir(a?.etiquettes?.[k], b?.etiquettes?.[k]);
    if (u.length) et[k] = u;
  }
  if (Object.keys(et).length) tri.etiquettes = et;
  return tri;
}

/** Les planches de la source à la suite de la cible ; la couverture de la source remplace une couverture vide. */
export function fusionnerMagazines(cible: Magazine, source: Magazine, maintenant: string): Magazine {
  const [couvCible, ...resteCible] = cible.planches;
  const [couvSource, ...resteSource] = source.planches;
  const prendreCouverture = planche0Vide(couvCible) && !planche0Vide(couvSource);
  const couverture = prendreCouverture ? { ...couvSource, id: couvCible.id } : couvCible;
  const ajout = prendreCouverture ? resteSource : source.planches.map((p, i) => (i === 0 ? { ...p, mode: "pages" as const } : p));
  const base = [couverture, ...resteCible];
  const tri = fusionnerTri(cible.tri, source.tri);
  const m: Magazine = { ...cible, planches: [...base, ...renumeroter(base, ajout)], modifieLe: maintenant };
  if (tri) m.tri = tri; else delete m.tri;
  return m;
}

async function main(): Promise<void> {
  const de = argument("--de");
  const vers = argument("--vers");
  const vraiment = process.argv.includes("--vraiment");
  const dossierSauvegarde = argument("--sauvegarde") ?? ".";
  if (!de || !vers || de === vers) throw new Error("Usage : --de <token source> --vers <token cible> [--vraiment]");

  const url = process.env.SUPABASE_URL;
  const cle = process.env.SUPABASE_SERVICE_KEY;
  if (!url || !cle) throw new Error("SUPABASE_URL ou SUPABASE_SERVICE_KEY manquant.");
  const sb = createClient(url, cle, { auth: { persistSession: false } });

  const champs = "id, token, titre, prenom, email, etat, nb_photos, archive_le, stripe_session_id";
  const lire = async (token: string) => {
    const r = await sb.from("numeros").select(champs).eq("token", token).single<Dossier>();
    if (r.error || !r.data) throw new Error(`Dossier ${token} introuvable (${r.error?.code}).`);
    return r.data;
  };
  const source = await lire(de);
  const cible = await lire(vers);
  if ((source.email ?? "").toLowerCase() !== (cible.email ?? "").toLowerCase()) throw new Error("Adresses différentes : refus.");
  if (source.stripe_session_id || cible.stripe_session_id) throw new Error("Un des dossiers est payé : refus (le prix suit le nombre de pages).");
  if (source.archive_le || cible.archive_le) throw new Error("Un des dossiers est déjà archivé : refus.");

  const photosDe = async (id: string) => {
    const r = await sb.from("photos").select("id, r2_key, vignette_key, ordre").eq("numero_id", id).returns<Photo[]>();
    if (r.error) throw new Error(`Photos illisibles (${r.error.code}).`);
    return r.data ?? [];
  };
  const photosSource = await photosDe(source.id);
  const photosCible = await photosDe(cible.id);
  const ordreDepart = photosCible.reduce((m, p) => Math.max(m, p.ordre), -1) + 1;

  const meps = await sb.from("mises_en_page").select("id, numero_id, etat, version, contenu").in("numero_id", [source.id, cible.id]).returns<LigneMep[]>();
  if (meps.error) throw new Error(`Mises en page illisibles (${meps.error.code}).`);
  const enCours = (id: string) => (meps.data ?? []).filter((m) => m.numero_id === id && m.etat === "en_cours");
  if (enCours(source.id).length > 1 || enCours(cible.id).length > 1) throw new Error("Plusieurs mises en page en cours sur un dossier : à trancher à la main.");
  const mepSource = enCours(source.id)[0] ?? null;
  const mepCible = enCours(cible.id)[0] ?? null;

  mkdirSync(dossierSauvegarde, { recursive: true });
  const fichier = join(dossierSauvegarde, `fusion-${source.id}-vers-${cible.id}.json`);
  writeFileSync(fichier, JSON.stringify({ le: new Date().toISOString(), source, cible, photosSource, mises_en_page: meps.data }, null, 2));

  const maintenant = new Date().toISOString();
  const fusion = mepSource && mepCible ? fusionnerMagazines(mepCible.contenu, mepSource.contenu, maintenant) : null;
  if (fusion && !contenuValide(fusion)) throw new Error("La mise en page fusionnée ne passe pas contenuValide : rien n'est écrit.");

  console.log(`Source : « ${source.titre} » (${photosSource.length} photos) → cible : « ${cible.titre} » (${photosCible.length} photos)`);
  console.log(`Sauvegarde : ${fichier}`);
  console.log(`Ordre des photos rattachées : ${ordreDepart} à ${ordreDepart + photosSource.length - 1}`);
  if (fusion) console.log(`Mise en page : ${mepCible!.contenu.planches.length} + ${mepSource!.contenu.planches.length} planches → ${fusion.planches.length}`);
  else if (mepSource && !mepCible) console.log("Mise en page : seule la source en a une ; elle sera rattachée à la cible.");
  if (!vraiment) { console.log("Essai : rien n'est écrit. Relancer avec --vraiment."); return; }

  /* 2. Le coffre : recopier, vérifier, ne rien effacer. */
  const r2 = makeR2();
  const b = bucket();
  const nouvelleCle = (k: string) => {
    if (!k.startsWith(PREFIXE(source.id))) throw new Error(`Clé hors du dossier source : ${k}`);
    return PREFIXE(cible.id) + k.slice(PREFIXE(source.id).length);
  };
  let copies = 0;
  for (const p of photosSource) {
    for (const k of [p.r2_key, p.vignette_key].filter((x): x is string => Boolean(x))) {
      const dest = nouvelleCle(k);
      await r2.send(new CopyObjectCommand({ Bucket: b, CopySource: `${b}/${encodeURIComponent(k).replace(/%2F/g, "/")}`, Key: dest }));
      await r2.send(new HeadObjectCommand({ Bucket: b, Key: dest }));
      copies++;
    }
  }
  console.log(`Coffre : ${copies} objets recopiés et relus.`);

  /* 3. Les lignes de photos. */
  const tri = [...photosSource].sort((a, c) => a.ordre - c.ordre);
  for (const [i, p] of tri.entries()) {
    const r = await sb.from("photos").update({
      numero_id: cible.id,
      r2_key: nouvelleCle(p.r2_key),
      vignette_key: p.vignette_key ? nouvelleCle(p.vignette_key) : null,
      ordre: ordreDepart + i,
    }).eq("id", p.id).eq("numero_id", source.id);
    if (r.error) throw new Error(`Photo ${p.id} non rattachée (${r.error.code}) : relancer reprend où ça s'est arrêté ? NON, relire la sauvegarde.`);
  }
  console.log(`Photos : ${tri.length} rattachées.`);

  /* 4. Les mises en page. */
  if (fusion && mepCible && mepSource) {
    const r = await sb.from("mises_en_page").update({ contenu: fusion, version: mepCible.version + 1, modifie_le: maintenant, modifie_par: "Mathias" })
      .eq("id", mepCible.id).eq("version", mepCible.version).select("id");
    if (r.error || !r.data?.length) throw new Error(`Mise en page cible non écrite (${r.error?.code ?? "version changée entre-temps"}).`);
    const a = await sb.from("mises_en_page").update({ etat: "archive", modifie_le: maintenant }).eq("id", mepSource.id);
    if (a.error) throw new Error(`Mise en page source non archivée (${a.error.code}).`);
    console.log(`Mise en page : ${fusion.planches.length} planches, la source archivée.`);
  } else if (mepSource && !mepCible) {
    const r = await sb.from("mises_en_page").update({ numero_id: cible.id, modifie_le: maintenant }).eq("id", mepSource.id);
    if (r.error) throw new Error(`Mise en page non rattachée (${r.error.code}).`);
  }

  /* 5. Les compteurs, puis l'archive de la source. */
  const n1 = await sb.from("numeros").update({ nb_photos: photosCible.length + photosSource.length }).eq("id", cible.id);
  const n2 = await sb.from("numeros").update({ nb_photos: 0, archive_le: maintenant }).eq("id", source.id);
  if (n1.error || n2.error) throw new Error(`Compteurs non écrits (${n1.error?.code ?? n2.error?.code}).`);
  console.log(`Dossiers : cible à ${photosCible.length + photosSource.length} photos, source archivée.`);
}

main().catch((e: unknown) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});

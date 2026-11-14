/**
 * Vérifier un fichier de LECTURE IA (lot F, 14/11) avec le validateur de l'éditeur, sans navigateur ni base :
 *
 *     npx tsx --tsconfig tsconfig.json scripts/lecture-ia.ts <lecture.json> [<dossier de photos>]
 *
 * Dit « valide » et ce que la lecture porte, ou la phrase du refus (code de sortie 1). Avec un dossier, relie les photos par leur
 * NOM DE FICHIER comme l'éditeur et liste celles qu'il ne trouve pas. Lecture seule : rien n'est écrit.
 */

import { readFileSync, readdirSync } from "node:fs";
import { lireLectureIA, relierLectureIA, tagsIA } from "@/lib/mise-en-page/editeur";

const [fichier, dossier] = process.argv.slice(2);
if (!fichier) { console.error("usage : lecture-ia.ts <lecture.json> [<dossier de photos>]"); process.exit(1); }
const r = lireLectureIA(readFileSync(fichier, "utf8"));
if (!r.ok) { console.error(`REFUSÉE : ${r.phrase}`); process.exit(1); }
const l = r.lecture;
const ph = Object.values(l.photos);
console.log(`valide : ${Object.keys(l.photos).length} photos · ${ph.filter((p) => p.role).length} rôles · ${ph.filter((p) => p.lieu).length} lieux (${ph.filter((p) => p.lieu?.statut === "sur").length} sûrs) · ${ph.filter((p) => p.capture).length} captures · ${l.rafales.length} rafales · ${l.groupes.length} groupes (${["duo", "trio", "combo"].map((t) => `${l.groupes.filter((g) => g.type === t).length} ${t}`).join(", ")}) · ${l.couleurs?.length ?? 0} combos de couleurs${l.projet ? ` · projet ${l.projet.type} (${l.projet.source})` : ""}`);
if (dossier) {
  const noms = readdirSync(dossier).filter((f) => !f.startsWith("."));
  const cat = new Map(noms.map((n, i) => [`f${i}`, { nom: n }]));
  const re = relierLectureIA(l, cat);
  const t = tagsIA(re);
  console.log(`dossier : ${re.reliees} noms reliés sur ${re.total} · ${t.size} photos portent un tag de la lecture`);
  if (re.manquantes.length) console.log(`introuvables (${re.manquantes.length}) : ${re.manquantes.slice(0, 20).join(", ")}${re.manquantes.length > 20 ? "…" : ""}`);
}

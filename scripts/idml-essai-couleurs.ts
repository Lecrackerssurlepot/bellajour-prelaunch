/**
 * Essai Affinity des COULEURS LIBRES (lot G, 14/11, D28) : sur de vraies photos, trois IDML à relire dans Affinity valeur par valeur.
 *
 *   npx tsx --tsconfig tsconfig.json scripts/idml-essai-couleurs.ts <dossier de JPEG> <dossier de sortie>
 *
 * Lit les six premiers JPEG du dossier (lecture seule), calcule leurs palettes comme la lecture de l'éditeur (vignette de 256 px,
 * `paletteDePixels`), applique le combo « complémentaire » proposé (`proposerCombos`) au style T-03, puis compose quatre planches :
 *   - page 1 (page droite seule) : un fond LIBRE en hexa (la 2e couleur de la palette de la photo 1), un titre au papier ;
 *   - une double : un fond du rôle « aplat sourd » sur les DEUX côtés (un seul rectangle « Fond »), un titre à l'accent ;
 *   - une planche en deux pages : un fond « aplat clair » à GAUCHE seulement, une légende en hexa libre ;
 *   - la dernière page (page gauche seule) : un fond « nuit », un titre au papier.
 * Et la couverture CV-01 : le mot-titre (blanc dans son gabarit) passé à l'ENCRE, la ligne en hexa libre.
 *
 * Écrit dans le dossier de sortie, et NULLE PART ailleurs (ni le Bureau, ni la base, ni le réseau) :
 *   - `magazine-style.idml`   : sous le style (six nuances de rôle + les nuances « Libre »), liens ABSOLUS vers `Links/` ;
 *   - `magazine-sans-style.idml` : le même magazine sans style (les rôles posés y sont déclarés avec leur valeur d'origine) ;
 *   - `couverture.idml`        : la couverture, dos de 3 mm ;
 *   - `Links/` (copie des photos) et `attendu.json` : pour chaque page, le rectangle « Fond… » attendu (nuance, nom, RVB, mm),
 *     chaque texte coloré (nuance, nom, RVB), et la liste des nuances de chaque Graphic.xml.
 * Affinity n'ouvre bien que ce qui est sur le Bureau : c'est à Mathias de choisir la sortie (par exemple
 * `~/Desktop/Bellajour/test-idml/couleurs-lot-g`) ; ce script ne la choisit jamais pour lui.
 */

import { copyFileSync, existsSync, mkdirSync, readdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import sharp from "sharp";
import * as O from "@/lib/mise-en-page/editeur";
import { nouveauMagazine, tousLesTemplates, type Cible, type Magazine, type PhotoRef } from "@/lib/mise-en-page/magazine";
import { construireIdml, construireIdmlCouverture, nomsDeLiens, type FichierIdml, type PhotoExport } from "@/lib/mise-en-page/idml";
import { zipperIdml } from "@/lib/mise-en-page/paquet";
import { couvertureNeuve, couverturePourExport } from "@/lib/mise-en-page/couverture";
import { styleDePaire } from "@/lib/mise-en-page/style";
import { COULEURS_ORIGINE, hexVersRgb, lchDeHex } from "@/lib/mise-en-page/nuancier";
import { proposerCombos } from "@/lib/mise-en-page/combos";
import { hexDeCouleur, nuanceIdml, piecesDuFond, type CouleurLibre } from "@/lib/mise-en-page/couleursLibres";
import { contenuValide } from "@/lib/mise-en-page/sauvegarde";

const graphic = (f: FichierIdml[]) => (f.find((x) => x.chemin === "Resources/Graphic.xml")?.contenu ?? "");
const nuances = (f: FichierIdml[]) => [...graphic(f).matchAll(/<Color Self="([^"]+)" [^>]*ColorValue="([^"]+)" Name="([^"]+)"/g)].map((m) => ({ self: m[1], valeur: m[2], nom: m[3] }));

async function main(): Promise<void> {
  const [source, sortie] = process.argv.slice(2);
  if (!source || !sortie || !existsSync(source)) throw new Error("usage : idml-essai-couleurs.ts <dossier de JPEG> <dossier de sortie>");
  const noms = readdirSync(source).filter((n) => /\.jpe?g$/i.test(n)).sort().slice(0, 6);
  if (noms.length < 6) throw new Error("il faut six JPEG dans le dossier");
  const photos: PhotoRef[] = [];
  const palettes: string[][] = [];
  for (const nom of noms) {
    const m = await sharp(join(source, nom)).metadata();
    const o = m.orientation ?? 1;
    const [l, h] = o >= 5 ? [m.height ?? 0, m.width ?? 0] : [m.width ?? 0, m.height ?? 0];
    photos.push({ id: nom, nom, l, h, date: null });
    const { data } = await sharp(join(source, nom)).rotate().resize(256, 256, { fit: "inside" }).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    palettes.push(O.paletteDePixels(data, 8));
  }
  const cat = new Map(photos.map((p) => [p.id, p]));
  const [a, b, c, d, e, f] = noms;

  /* le style T-03 et le combo « complémentaire » proposé d'après ces six photos (le nuancier d'origine s'il n'y en a pas) */
  const combos = proposerCombos(palettes, COULEURS_ORIGINE);
  const combo = combos.find((x) => x.id === "complementaire") ?? combos[0] ?? null;
  const style = styleDePaire("T-03", combo ? combo.couleurs : { ...COULEURS_ORIGINE })!;

  const avecTexte = (portee: "page" | "double", n: number, role: "titre" | "legende") =>
    tousLesTemplates().find((t) => t.portee === portee && t.nbPhotos === n && t.cadres.some((x) => x.role === role) && t.origine !== "atelier");
  let m: Magazine = { ...nouveauMagazine("essai-couleurs", "Essai couleurs", "2026-11-14T00:00:00.000Z"), style };
  m = O.insererDouble(m, "pl-1", "pl-2").magazine;
  m = O.insererDouble(m, "pl-2", "pl-3").magazine;
  m = O.ajouter(m, "pl-1", "droite", [a], cat).magazine;
  m = O.ajouter(m, "pl-2", "double", [b, c, d], cat).magazine;
  m = O.ajouter(m, "pl-3", "gauche", [e], cat).magazine;
  m = O.ajouter(m, "pl-fin", "gauche", [f], cat).magazine;
  const poserGabarit = (plancheId: string, cible: Cible, portee: "page" | "double", n: number, role: "titre" | "legende") => {
    const t = avecTexte(portee, n, role);
    if (t) m = O.choisirGabarit(m, plancheId, cible, t.id, cat).magazine;
  };
  poserGabarit("pl-1", "droite", "page", 1, "titre");
  poserGabarit("pl-2", "double", "double", 3, "titre");
  poserGabarit("pl-3", "gauche", "page", 1, "legende");
  poserGabarit("pl-fin", "gauche", "page", 1, "titre");

  /* les couleurs : fonds et textes */
  /* le fond libre : la couleur la plus franche de la palette de la photo 1 (une vraie couleur de la photo, pas un gris) */
  const libreFond = ([...palettes[0]].sort((x, y) => lchDeHex(y).C - lchDeHex(x).C)[0] ?? "#ca7749") as CouleurLibre;
  const libreTexte = "#1f3a5c" as CouleurLibre;
  m = O.colorerFond(m, "pl-1", "droite", libreFond);
  m = O.colorerFond(m, "pl-2", "double", "aplatSourd");
  m = O.colorerFond(m, "pl-3", "gauche", "aplatClair");
  m = O.colorerFond(m, "pl-fin", "gauche", "nuit");
  const textes: { plancheId: string; cible: Cible; contenu: string; couleur: CouleurLibre; role: string }[] = [];
  const ecrire = (plancheId: string, cible: Cible, role: "titre" | "legende", contenu: string, couleur: CouleurLibre) => {
    const p = m.planches.find((x) => x.id === plancheId);
    const disp = p ? (cible === "double" ? p.double : p[cible]) : null;
    if (!disp) return;
    const cadres = O.cadresPlanche(O.creerEtat({ magazine: m, catalogue: new Map() }), plancheId).filter((x) => x.role !== "photo" && x.ref.cible === cible);
    const k = cadres.findIndex((x) => x.role === role);
    if (k < 0) return;
    const ref = { plancheId, cible, index: cadres[k].ref.index };
    m = O.ecrireTexteCadre(m, ref, contenu);
    m = O.colorerTexte(m, ref, couleur);
    textes.push({ plancheId, cible, contenu, couleur, role });
  };
  ecrire("pl-1", "droite", "titre", "Madère", "papier");
  ecrire("pl-2", "double", "titre", "Funchal", "accent");
  ecrire("pl-3", "gauche", "legende", "Le marché", libreTexte);
  ecrire("pl-fin", "gauche", "titre", "Fin", "papier");
  if (!contenuValide(m)) throw new Error("le magazine d'essai ne se relit pas (contenuValide)");

  /* la couverture CV-01 : mot-titre à l'encre (blanc dans le gabarit), ligne en hexa libre */
  const cv = couvertureNeuve("CV-01");
  const couverture = { ...cv, photos: cv.photos.map((x, i) => ({ ...x, photoId: [a, f][i] ?? null })), textes: cv.textes.map((t, i) => (i === 0 ? { ...t, contenu: "MADÈRE", couleur: "encre" as const } : i === 1 ? { ...t, contenu: "Juin 2026", couleur: libreTexte } : t)) };

  const liens = nomsDeLiens(photos.map((p) => ({ id: p.id, nom: p.nom })));
  const exp = new Map<string, PhotoExport>(photos.map((p) => [p.id, { id: p.id, nomLien: liens.get(p.id) ?? p.nom, l: p.l, h: p.h }]));
  mkdirSync(join(sortie, "Links"), { recursive: true });
  for (const p of photos) copyFileSync(join(source, p.nom), join(sortie, "Links", liens.get(p.id) ?? p.nom));
  const options = { liens: { mode: "absolu" as const, dossier: sortie } };
  /* comme l'export de l'éditeur : un texte non écrit (« Titre », « Légende ») est vidé, donc jamais exporté */
  const pret = O.avecLieuxParDefaut(m, cat);
  const avecStyle = construireIdml(pret, exp, options);
  const sansStyle = construireIdml({ ...pret, style: undefined } as Magazine, exp, options);
  const idCouv = construireIdmlCouverture(couverturePourExport(couverture, null, style), exp, { ...options, dosMm: 3, style });
  writeFileSync(join(sortie, "magazine-style.idml"), zipperIdml(avecStyle));
  writeFileSync(join(sortie, "magazine-sans-style.idml"), zipperIdml(sansStyle));
  writeFileSync(join(sortie, "couverture.idml"), zipperIdml(idCouv));

  /* ce qu'Affinity doit montrer, valeur par valeur */
  const attenduFonds = (sty: boolean) => m.planches.map((p, i) => ({
    planche: p.id,
    fonds: piecesDuFond(p.fond, O.actionsPlanche(O.creerEtat({ magazine: m, catalogue: new Map() }), p.id)?.seule ?? null, { perdu: true }).map((x) => ({
      nom: x.cote === "double" ? "Fond" : x.cote === "gauche" ? "Fond gauche" : "Fond droite",
      choisi: x.couleur, nuance: nuanceIdml(x.couleur, sty).self, rvb: hexVersRgb(hexDeCouleur(x.couleur, sty ? style : null)).join(" "),
      mm: { x: x.rect.x, y: x.rect.y, l: x.rect.l, h: x.rect.h },
      pages: i === 0 ? "1" : i === m.planches.length - 1 ? String(2 * i) : `${2 * i}-${2 * i + 1}`,
    })),
  }));
  writeFileSync(join(sortie, "attendu.json"), JSON.stringify({
    pages: O.pagesDe(m), combo: combo ? { id: combo.id, nom: combo.nom, raison: combo.raison } : null, paire: "T-03",
    magazineStyle: { fonds: attenduFonds(true), textes: textes.map((t) => ({ ...t, nuance: nuanceIdml(t.couleur, true).self, rvb: hexVersRgb(hexDeCouleur(t.couleur, style)).join(" ") })), nuances: nuances(avecStyle) },
    magazineSansStyle: { fonds: attenduFonds(false), textes: textes.map((t) => ({ ...t, nuance: nuanceIdml(t.couleur, false).self, rvb: hexVersRgb(hexDeCouleur(t.couleur, null)).join(" ") })), nuances: nuances(sansStyle) },
    couverture: {
      gabarit: "CV-01", dosMm: 3, nuances: nuances(idCouv),
      textes: [
        { contenu: "MADÈRE", couleur: "encre", attendu: "aucun FillColor sur la plage (l'encre du style de paragraphe Titre), plus le blanc du gabarit", rvb: hexVersRgb(style.couleurs.encre).join(" ") },
        { contenu: "Juin 2026", couleur: libreTexte, nuance: nuanceIdml(libreTexte, true).self, rvb: hexVersRgb(libreTexte).join(" ") },
      ],
    },
    aVerifier: [
      "chaque page : un rectangle « Fond… » sous les photos, de la nuance et du RVB attendus, fond perdu extérieur compris (page seule : arrêté au pli)",
      "la double : UN seul rectangle « Fond » d'un bord perdu à l'autre",
      "les nuances « Libre … » apparaissent nommées dans le panneau Nuancier, avec leur valeur RVB",
      "chaque texte coloré : la couleur attendue (le titre au papier se lit en réserve sur le fond)",
      "sans style : les nuances « Aplat clair », « Aplat sourd », « Nuit », « Accent » déclarées avec leur valeur d'origine, à côté de l'ancienne « Aplat »",
    ],
  }, null, 2));
  console.log(`${O.pagesDe(m)} pages, combo ${combo ? combo.nom : "aucun"}, trois IDML écrits dans ${sortie}`);
}

main().catch((e: unknown) => { console.error(e instanceof Error ? e.message : e); process.exit(1); });

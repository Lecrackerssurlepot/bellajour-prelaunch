/**
 * Le harnais de la COUVERTURE (lot B, 12/11), appelé par verif-atelier.ts : le validateur de `couverture`, les magazines
 * d'aujourd'hui inchangés, la géométrie (dos 24 / 32 / 60 pages en brillant et en mat), les cadres par face stables quand
 * le dos change, l'IDML intérieur identique à l'octet (étalon relevé avant le lot), l'IDML et le PDF de la couverture,
 * l'export bloqué sans dos, la photo de la 1re hors des propositions de l'intérieur, et les gestes (pose, texte, gabarit,
 * recadrage, retrait, pages) rejoués avec les invariants après chacun.
 */

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { PDFDocument, StandardFonts } from "pdf-lib";
import { strFromU8, unzipSync } from "fflate";
import * as O from "@/lib/mise-en-page/editeur";
import type { EtatEditeur, Geste, PhotoMaq } from "@/lib/mise-en-page/editeur";
import {
  CHASSES_HELVETICA_GRAS, GABARITS_COUVERTURE, GABARIT_COUVERTURE_DEFAUT, ID_COUVERTURE, PART_MOT_TITRE_MIN, cadresCouverture,
  contenuImprime, couvertureNeuve, couverturePourExport, decorCouverture, defautsGabarit, faceDe, gabaritCouverture, idsDeLaPremiere,
  largeurImprimee, tailleMotTitre, textesDeCouverture, titreSurLeSujet, type Couverture,
} from "@/lib/mise-en-page/couverture";
import { PAGE_L, PT_PAR_MM, boiteCouverture, largeurCouverture, origineFace } from "@/lib/mise-en-page/geometrie";
import { contenuValide } from "@/lib/mise-en-page/sauvegarde";
import { construireIdml, construireIdmlCouverture, photosUtilisees } from "@/lib/mise-en-page/idml";
import { ecrirePdf, planPdf, planPdfCouverture } from "@/lib/mise-en-page/pdf";
import { zipperExport, zipperIdml, zipperPdfs } from "@/lib/mise-en-page/paquet";
import { nouveauMagazine, utilisations, type Magazine } from "@/lib/mise-en-page/magazine";
import { dosDeLaCouverture } from "@/app/admin/atelier/mise-en-page/[id]/dosCouverture";
import { couvertureDeLExport } from "@/app/admin/atelier/mise-en-page/[id]/exporter";
import { criteres } from "@/lib/mise-en-page/editeur/bibliotheque";
import { EMPREINTE_IDML_INTERIEUR, PHOTOS_ETALON, empreinteIdml, magazineEtalon } from "./etalon-idml";

const K = PT_PAR_MM;
const neutre = { zoom: 1, dx: 0, dy: 0 };
const proche = (a: number, b: number, tol = 1e-6): boolean => Math.abs(a - b) <= tol;

function photoMaq(id: string, l: number, h: number, extra: Partial<PhotoMaq> = {}): PhotoMaq {
  return { id, nom: `${id}.jpg`, l, h, date: `2026-06-11T10:00:0${id.length % 10}.000Z`, personne: "Inès", lien: null, type: "atelier", coeur: false, signalee: false,
    autresMagazines: [], nouvelle: false, vignette: null, ...extra };
}

export async function verifierMepCouverture(ok: (nom: string, reussi: boolean) => void, titre: (t: string) => void): Promise<void> {
  titre("— mise en page, lot B : la couverture à plat (4e · dos · 1re) —");

  /* ── le catalogue des gabarits ── */
  ok(`gabarits de couverture : ${GABARITS_COUVERTURE.length} (8 à 12), ids « CV-nn » uniques et stables, le défaut existe`,
    GABARITS_COUVERTURE.length >= 8 && GABARITS_COUVERTURE.length <= 12 && GABARITS_COUVERTURE.every((g) => /^CV-\d{2}$/.test(g.id))
      && new Set(GABARITS_COUVERTURE.map((g) => g.id)).size === GABARITS_COUVERTURE.length && !!gabaritCouverture(GABARIT_COUVERTURE_DEFAUT));
  const defauts = GABARITS_COUVERTURE.flatMap((g) => defautsGabarit(g).map((e) => `${g.id} : ${e}`));
  ok(`gabarits de couverture : une vraie photo sur la 1re, un mot-titre de 60 % au moins, cadres dans leur face, fond perdu entier, textes hors de la zone de collage et dans la zone sûre${defauts.length ? ` (${defauts.join(" ; ")})` : ""}`,
    defauts.length === 0);
  ok("gabarits de couverture : chacun cite les idées du catalogue des artistes (C-01 à C-23) dont il vient",
    GABARITS_COUVERTURE.every((g) => g.idees.length > 0 && g.idees.every((i) => /^C-(0[1-9]|1\d|2[0-3])$/.test(i))));

  /* ── les chasses du mot-titre = celles d'Helvetica Bold (pdf-lib), donc d'Arial Bold ── */
  {
    const doc = await PDFDocument.create();
    const hb = await doc.embedFont(StandardFonts.HelveticaBold);
    const lettres = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789 .,-'";
    ok("mot-titre : la table des chasses est celle d'Helvetica Bold, lettre par lettre (A–Z, a–z, 0–9, ponctuation)",
      [...lettres].every((c) => proche(hb.widthOfTextAtSize(c, 1000), CHASSES_HELVETICA_GRAS[c] ?? -1, 0.5)));
    const t = tailleMotTitre("MARTINIQUE", { l: 180, h: 46 });
    ok(`mot-titre : « MARTINIQUE » dans un cadre de 180 mm prend ${t} pt et couvre ${Math.round((largeurImprimee("MARTINIQUE", t) / PAGE_L) * 100)} % de la 1re (≥ 60 %, ≤ le cadre)`,
      largeurImprimee("MARTINIQUE", t) <= 180 + 1e-9 && largeurImprimee("MARTINIQUE", t) / PAGE_L >= PART_MOT_TITRE_MIN);
    const t5 = tailleMotTitre(contenuImprime("MADRID", { repeter: 5 }), { l: 180, h: 257 });
    ok("mot-titre répété (C-01) : cinq lignes tiennent dans la hauteur à l'interligne d'Affinity (120 %)", (t5 * (1.2 * 4 + 1.25)) / K <= 257 + 1e-9 && t5 > 60);
  }

  /* ── la géométrie et le dos ── */
  const proj = (nbPagesCible: number | null, finition: "gloss" | "matte" | null) => ({ nbPagesCible, finition });
  const dosB = [24, 32, 60].map((n) => dosDeLaCouverture(proj(n, "gloss"), null).dos);
  const dosM = [24, 32, 60].map((n) => dosDeLaCouverture(proj(n, "matte"), null).dos);
  ok(`dos de la couverture : 24 / 32 / 60 pages = ${dosB.join(" / ")} mm en brillant, ${dosM.join(" / ")} mm en mat`,
    dosB.join() === "2.25,2.66,4.12" && dosM.join() === "2.4,2.87,4.51");
  const sansFinition = dosDeLaCouverture(proj(32, null), null);
  ok("dos : finition jamais choisie = le défaut de la commande (brillant), et l'écran le DIT (finitionParDefaut)",
    sansFinition.dos === 2.66 && sansFinition.finition === "gloss" && sansFinition.finitionParDefaut && !dosDeLaCouverture(proj(32, "gloss"), null).finitionParDefaut);
  const inconnu = dosDeLaCouverture(proj(null, null), null);
  ok("dos : pages inconnues (édition, création libre) et rien de saisi = dos INCONNU, une phrase, jamais un dos inventé",
    inconnu.dos === null && inconnu.source === null && inconnu.manque === "Pages à saisir pour le dos");
  ok("dos : les pages saisies sur la couverture servent quand le projet ne les connaît pas ; celles du projet priment toujours",
    dosDeLaCouverture(proj(null, null), 32).dos === 2.66 && dosDeLaCouverture(proj(null, null), 32).source === "saisie"
      && dosDeLaCouverture(proj(24, "gloss"), 60).dos === 2.25 && dosDeLaCouverture(proj(24, "gloss"), 60).source === "projet");
  ok("dos : une saisie hors de 24 à 60 pages paires reste inconnue, avec sa raison",
    [22, 23, 25, 62].every((n) => dosDeLaCouverture(proj(null, null), n).dos === null && dosDeLaCouverture(proj(null, null), n).manque === "Dos carré : 24 à 60 pages paires"));
  ok("géométrie : coupe 420 + dos, boîte au fond perdu 426 + dos × 303, la 1re commence à 210 + dos",
    [2.25, 2.87, 4.51].every((d) => largeurCouverture(d) === 420 + d && proche(boiteCouverture(d).l, 426 + d) && boiteCouverture(d).h === 303
      && boiteCouverture(d).x === -3 && origineFace("premiere", d) === 210 + d && origineFace("dos", d) === 210 && origineFace("quatrieme", d) === 0)
      && faceDe(100, 3) === "quatrieme" && faceDe(211, 3) === "dos" && faceDe(214, 3) === "premiere");
  {
    let stable = true;
    for (const g of GABARITS_COUVERTURE) {
      const a = cadresCouverture({ templateId: g.id }, 2.25), b = cadresCouverture({ templateId: g.id }, 4.51);
      a.forEach((x, i) => {
        const y = b[i];
        const dx = y.x - x.x;
        if (x.l !== y.l || x.h !== y.h || x.y !== y.y || x.face !== y.face) stable = false;
        if (!proche(dx, x.face === "premiere" ? 4.51 - 2.25 : 0)) stable = false;
      });
      const dosA = decorCouverture({ templateId: g.id }, 2.25)[0], dosBb = decorCouverture({ templateId: g.id }, 4.51)[0];
      if (dosA.x !== 210 || dosA.l !== 2.25 || dosBb.l !== 4.51 || dosA.teinte !== g.dos) stable = false;
    }
    ok("cadres par face : quand le dos passe de 2,25 à 4,51 mm, aucun cadre ne change de forme, la 4e ne bouge pas, la 1re glisse du dos exactement ; le dos se peint de sa couleur", stable);
  }

  /* ── le validateur ── */
  const mag0 = (): Magazine => {
    const m = nouveauMagazine("m-couv", "Martinique", "2026-11-12T10:00:00.000Z");
    return { ...m, planches: [{ ...m.planches[0], droite: { templateId: "G-P1-a", photos: [{ photoId: "a", recadrage: neutre }], textes: [] } }] };
  };
  const vraie: Couverture = { ...couvertureNeuve("CV-01"), photos: [{ photoId: "b", recadrage: neutre }, { photoId: null, recadrage: neutre }, { photoId: "c", recadrage: { zoom: 1.4, dx: 3, dy: -2 } }] };
  const m0 = mag0();
  ok("validateur : un magazine d'aujourd'hui (sans couverture) reste valide ; une couverture juste passe, avec ou sans pages, relue depuis JSON",
    contenuValide(m0) && !("couverture" in m0) && contenuValide({ ...m0, couverture: vraie }) && contenuValide(JSON.parse(JSON.stringify({ ...m0, couverture: { ...vraie, pages: 32 } })))
      && contenuValide({ ...m0, tri: { choisies: ["a"], ecartees: [], visees: null }, couverture: vraie }));
  ok("validateur : refusés : gabarit inconnu, comptes faux, clé en trop, `pages` cassé, `couverture` vide, `undefined` ou `null`",
    !contenuValide({ ...m0, couverture: { ...vraie, templateId: "CV-99" } }) && !contenuValide({ ...m0, couverture: { ...vraie, templateId: "E-D14a" } })
      && !contenuValide({ ...m0, couverture: { ...vraie, photos: vraie.photos.slice(1) } }) && !contenuValide({ ...m0, couverture: { ...vraie, textes: [] } })
      && !contenuValide({ ...m0, couverture: { ...vraie, cadres: [] } }) && !contenuValide({ ...m0, couverture: { ...vraie, pages: 1 } })
      && !contenuValide({ ...m0, couverture: { ...vraie, pages: 32.5 } }) && !contenuValide({ ...m0, couverture: { ...vraie, pages: undefined } })
      && !contenuValide({ ...m0, couverture: {} }) && !contenuValide({ ...m0, couverture: undefined }) && !contenuValide({ ...m0, couverture: null })
      && !contenuValide({ ...m0, couverture: { ...vraie, photos: [{ photoId: "b", recadrage: { zoom: 9, dx: 0, dy: 0 } }, vraie.photos[1], vraie.photos[2]] } }));
  ok("validateur : chaque gabarit de couverture neuf se sauvegarde", GABARITS_COUVERTURE.every((g) => contenuValide({ ...m0, couverture: couvertureNeuve(g.id) })));

  /* ── les magazines d'aujourd'hui sont inchangés ── */
  const etalon = magazineEtalon();
  ok("IDML intérieur IDENTIQUE à l'octet : l'empreinte de l'étalon est celle relevée avant le lot (fabriques sorties sans rien changer)",
    empreinteIdml(etalon) === EMPREINTE_IDML_INTERIEUR);
  const avecCouv: Magazine = { ...etalon, couverture: { ...couvertureNeuve("CV-02"), photos: [{ photoId: "p3", recadrage: neutre }, { photoId: "p2", recadrage: neutre }] } };
  ok("IDML intérieur : une couverture n'y entre jamais (même paquet octet pour octet avec ou sans elle) ; le PDF intérieur non plus",
    empreinteIdml(avecCouv) === EMPREINTE_IDML_INTERIEUR && JSON.stringify(planPdf(avecCouv)) === JSON.stringify(planPdf(etalon)));
  ok("sans couverture, rien ne change : utilisations, ids du magazine, photos utilisées et magazine exporté identiques",
    O.egal(utilisations(etalon), utilisations({ ...etalon })) && O.idsMagazine(etalon).length === 16 && photosUtilisees(etalon).join() === "p2,p1,p3"
      /* lot R (D2) : un export vide les mots-repères ; l'étalon en porte (« Titre », « Légende ») : seuls ses textes vides changent, jamais une planche ni une photo */
      && O.avecLieuxParDefaut(etalon, new Map()).planches.every((p, i) => O.egal({ ...p, double: null, gauche: null, droite: null }, { ...etalon.planches[i], double: null, gauche: null, droite: null })));
  ok("avec une couverture : ses photos comptent APRÈS l'intérieur (les noms de Links/ de l'intérieur ne bougent pas)",
    photosUtilisees({ ...etalon, couverture: { ...couvertureNeuve("CV-02"), photos: [{ photoId: "z", recadrage: neutre }, { photoId: "p1", recadrage: neutre }] } }).join() === "p2,p1,p3,z");

  /* ── l'IDML de la couverture ── */
  const dos = 2.66;
  const pret = couverturePourExport({ ...couvertureNeuve("CV-01"), photos: [{ photoId: "p1", recadrage: neutre }, { photoId: "p2", recadrage: neutre }, { photoId: "p3", recadrage: neutre }],
    textes: [{ contenu: "MARTINIQUE", taille: 48, gras: true }, { contenu: "Geffroy family · 2026", taille: 11, gras: false }] }, null);
  const fic = construireIdmlCouverture(pret, PHOTOS_ETALON, { liens: { mode: "absolu", dossier: "/Users/x/Bellajour/test-idml/couv" }, dosMm: dos });
  const parC = new Map(fic.map((x) => [x.chemin, x.contenu]));
  const prefs = parC.get("Resources/Preferences.xml") ?? "";
  const sp = parC.get("Spreads/Spread_sp1.xml") ?? "";
  const stC = fic.filter((x) => x.chemin.startsWith("Stories/")).map((x) => x.contenu).join("");
  const dm = parC.get("designmap.xml") ?? "";
  ok(`IDML couverture : un document d'UNE page non vis-à-vis, large de 420 + dos = ${420 + dos} mm, fond perdu 3 mm aux quatre bords`,
    prefs.includes(`PageWidth="${((420 + dos) * K).toFixed(4)}"`) && prefs.includes('PagesPerDocument="1"') && prefs.includes('FacingPages="false"')
      && prefs.includes(`DocumentBleedTopOffset="${(3 * K).toFixed(4)}"`) && prefs.includes(`DocumentBleedOutsideOrRightOffset="${(3 * K).toFixed(4)}"`)
      && sp.includes('PageCount="1" BindingLocation="0"') && (sp.match(/<Page /g) ?? []).length === 1
      && sp.includes(`GeometricBounds="0 0 ${(297 * K).toFixed(4)} ${((420 + dos) * K).toFixed(4)}"`) && dm.includes('Length="1"'));
  ok("IDML couverture : le dos est un aplat de sa largeur exacte à 210 mm, la photo pleine de la 1re part de 210 + dos (au point près), celle de la 4e du fond perdu",
    sp.includes(`Anchor="${(210 * K).toFixed(4)} ${(-3 * K - 297 * K / 2).toFixed(4)}"`) && sp.includes(`Anchor="${((210 + dos) * K).toFixed(4)} ${(-3 * K - 297 * K / 2).toFixed(4)}"`)
      && sp.includes(`Anchor="${(-3 * K).toFixed(4)} ${(-3 * K - 297 * K / 2).toFixed(4)}"`) && /Name="Aplat 1"[^>]*FillColor="Color\/Aplat"/.test(sp));
  {
    const objets = sp.match(/<(Rectangle|TextFrame) [^>]*>/g) ?? [];
    const images = [...sp.matchAll(/<Image Self="[^"]+" ItemTransform="([^"]+)"/g)].map((x) => x[1].split(" ").map(Number));
    const pasEtiree = images.every((m) => (m[1] === 0 && m[2] === 0 ? proche(Math.abs(m[0]), Math.abs(m[3])) : proche(Math.abs(m[1]), Math.abs(m[2]))));
    ok("IDML couverture : D28 tenu (ItemLayer partout, français, FOGRA39), trois images jamais étirées (même échelle en x et en y), la couchée tournée par la matrice",
      objets.length === 6 && objets.every((o) => o.includes('ItemLayer="ly1"')) && stC.includes('AppliedLanguage="$ID/French"') && dm.includes("FOGRA39")
        && images.length === 3 && pasEtiree && images.some((m) => m[0] === 0));
    const t = pret.textes[0].taille;
    ok(`IDML couverture : le mot-titre part en gras au corps calculé (${t} pt), la ligne en dessous, aucun libellé « Titre » imprimé`,
      stC.includes(`PointSize="${t}" FontStyle="Bold"`) && stC.includes("<Content>MARTINIQUE</Content>") && stC.includes("<Content>Geffroy family · 2026</Content>") && !stC.includes(">Titre<"));
    const motif = couverturePourExport({ ...couvertureNeuve("CV-11"), textes: [{ contenu: "MADRID", taille: 48, gras: true }] }, null);
    const fm = construireIdmlCouverture(motif, PHOTOS_ETALON, { liens: { mode: "relatif" }, dosMm: 4.12 });
    const stM = fm.filter((x) => x.chemin.startsWith("Stories/")).map((x) => x.contenu).join("");
    ok("IDML couverture : le titre en motif (C-01) part en cinq lignes séparées par <Br/>", (stM.match(/<Content>MADRID<\/Content>/g) ?? []).length === 5 && (stM.match(/<Br\/>/g) ?? []).length === 4);
    const vide = couverturePourExport(couvertureNeuve("CV-01"), null);
    ok("IDML couverture : un texte jamais écrit et sans lieu part VIDE ; avec le lieu de la 1re, le mot-titre le prend en capitales",
      vide.textes.every((x) => x.contenu === "") && couverturePourExport(couvertureNeuve("CV-01"), "Le Diamant").textes[0].contenu === "LE DIAMANT"
        && O.egal(couverturePourExport(couverturePourExport(couvertureNeuve("CV-01"), "Rome"), "Rome"), couverturePourExport(couvertureNeuve("CV-01"), "Rome")));
    const zip = unzipSync(zipperExport({ idml: zipperIdml(construireIdml(etalon, PHOTOS_ETALON, { liens: { mode: "relatif" } })), couverture: zipperIdml(fic), liens: [], utilisees: [], nonUtilisees: [], racine: "projet" }));
    const couvZ = unzipSync(zip["projet/couverture.idml"] ?? new Uint8Array());
    ok("paquet : couverture.idml voyage DANS le zip de l'intérieur (un seul téléchargement), son mimetype en premier",
      !!zip["projet/magazine.idml"] && !!zip["projet/couverture.idml"] && strFromU8(couvZ.mimetype ?? new Uint8Array()) === "application/vnd.adobe.indesign-idml-package"
        && Object.keys(couvZ)[0] === "mimetype");
  }

  /* ── le PDF de la couverture ── */
  {
    const page = planPdfCouverture(pret, dos);
    const photosP = page.objets.filter((o) => o.type === "photo");
    ok("PDF couverture : boîte 426 + dos × 303 (fond perdu compris), clés « c-… », le dos et les cadres à leur place",
      O.egal(page.boite, { x: -3, y: -3, l: 426 + dos, h: 303 }) && photosP.length === 3 && photosP.every((o) => o.type === "photo" && o.cle.startsWith("c-"))
        && page.objets[0].type === "aplat" && page.objets[0].rect.x === 210 && proche(page.objets[0].rect.l, dos));
    const r = await ecrirePdf([page], new Map(), "Couverture");
    const lu = await PDFDocument.load(r.octets);
    const { width, height } = lu.getPage(0).getSize();
    ok(`PDF couverture : écrit et relu, une page de ${(426 + dos).toFixed(2)} × 303 mm`, lu.getPageCount() === 1 && proche(width, (426 + dos) * K, 0.01) && proche(height, 303 * K, 0.01));
    const z = unzipSync(zipperPdfs({ magazine: new Uint8Array([1]), couverture: new Uint8Array([2]), racine: "p" }));
    ok("PDF : intérieur et couverture partent dans UN zip", !!z["p/magazine.pdf"] && !!z["p/couverture.pdf"]);
  }

  /* ── l'export bloqué sans dos ── */
  {
    const m = { ...etalon, couverture: { ...couvertureNeuve("CV-02"), photos: [{ photoId: "z", recadrage: neutre }, { photoId: null, recadrage: neutre }] } };
    const sans = couvertureDeLExport(m, null, "Pages à saisir pour le dos");
    const avec = couvertureDeLExport(m, 2.25, null);
    ok("export : dos inconnu = couverture BLOQUÉE avec sa phrase, l'intérieur part seul (ses photos sans celles de la couverture) ; dos connu = couverture écrite",
      sans.couverture.etat === "bloquee" && (sans.couverture.etat === "bloquee" && sans.couverture.raison === "Pages à saisir pour le dos") && !("couverture" in sans.magazine)
        && !photosUtilisees(sans.magazine).includes("z") && avec.couverture.etat === "ecrite" && photosUtilisees(avec.magazine).includes("z")
        && couvertureDeLExport(etalon, 2.25, null).couverture.etat === "aucune");
    const fe = readFileSync(resolve(process.cwd(), "src/app/admin/atelier/mise-en-page/[id]/ExportFeuille.tsx"), "utf8");
    ok("export : la feuille passe le dos et sa raison aux deux exports, et dit « bloquée » AVANT le clic",
      (fe.match(/dosMm: dosC\.dos, raisonDos: dosC\.manque/g) ?? []).length === 2 && fe.includes("bloquée · ${dosC.manque}"));
  }

  /* ── les gestes, rejoués avec les invariants ── */
  const cat: PhotoMaq[] = [
    photoMaq("ciel", 3000, 4000, { ville: "Le Diamant", pays: "Martinique", zone: { x: 0, y: 0.55, l: 0.4, h: 0.4 } }),
    photoMaq("mer", 4000, 3000, { ville: "Sainte-Anne" }), photoMaq("nous", 3000, 4000), photoMaq("plage", 3000, 4000),
  ];
  let e: EtatEditeur = O.creerEtat({ magazine: mag0(), catalogue: [...cat, photoMaq("a", 3000, 4000)], projet: { nom: "Martinique", source: "libre", nbPagesCible: null, finition: null } });
  const fautes: string[] = [];
  const g = (x: Geste): EtatEditeur => {
    const avant = e;
    e = O.appliquer(avant, x);
    for (const f of O.verifierInvariants(e, avant, x)) fautes.push(`${x.type} : ${f}`);
    return e;
  };
  const refC = (index: number) => ({ plancheId: ID_COUVERTURE, cible: "double" as const, index });
  const m1 = e.magazine;
  g({ type: "naviguer", sens: -1 });
  ok("écran : ← depuis la planche 1 mène à la couverture ; l'ouvrir n'écrit rien dans le magazine", e.plancheCourante === ID_COUVERTURE && e.magazine === m1 && !e.magazine.couverture);
  /* CV-01 : photos 0 (4e pleine), 1 (4e petite), 2 (1re pleine) */
  g({ type: "deposer", source: { type: "bibliotheque", ids: ["ciel"] }, cible: { type: "cadre", ref: refC(2) } });
  ok("poser sur la 1re : la couverture s'écrit au gabarit par défaut, la photo est GARDÉE (★) dans la même entrée d'historique, recadrée sur son sujet",
    e.magazine.couverture?.templateId === "CV-01" && e.magazine.couverture.photos[2].photoId === "ciel" && O.marqueDe(e.magazine, "ciel") === "choisie"
      && e.historique.passe.length === 1 && e.magazine.couverture.photos[2].recadrage.dx !== 0 && e.magazine.planches === m1.planches);
  g({ type: "deposer", source: { type: "bibliotheque", ids: ["mer"] }, cible: { type: "cadre", ref: refC(0) } });
  ok("poser sur la 4e : la photo va dans son cadre, la 1re ne bouge pas", e.magazine.couverture?.photos[0].photoId === "mer" && e.magazine.couverture.photos[2].photoId === "ciel");
  ok("photo de la 1re HORS des propositions de l'intérieur : comptée posée (×1), sortie des « libres », masquée par « masquer les utilisées »",
    idsDeLaPremiere(e.magazine.couverture).join() === "ciel" && utilisations(e.magazine).get("ciel") === 1
      && !criteres({ ...e, filtres: { ...e.filtres, statut: "libres" } }).statut(cat[0]) && !criteres({ ...e, filtres: { ...e.filtres, masquerUtilisees: true } }).masquerUtilisees(cat[0]));
  {
    const eco = O.ajouter(e.magazine, e.magazine.planches[0].id, "droite", ["ciel"], e.catalogue);
    ok("… elle peut revenir dans l'intérieur en ÉCHO voulu (geste de l'atelier) : posée deux fois, ×2", !eco.refus && utilisations(eco.magazine).get("ciel") === 2);
  }
  const bilan = O.bilanCouverture(e);
  ok("le mot-titre non écrit prend le lieu de la photo de la 1re (« LE DIAMANT »), et couvre au moins 60 % de la 1re",
    textesDeCouverture(e.magazine.couverture!, O.lieuCouverture(e.magazine.couverture, e.catalogue))[0].parDefaut === "LE DIAMANT"
      && bilan.partMotTitre !== null && bilan.partMotTitre >= PART_MOT_TITRE_MIN && !bilan.motTitreCourt);
  ok("zone calme : le titre du haut ne couvre pas le sujet (en bas de la photo) ; le même sujet en haut serait couvert, et l'écran le dirait",
    titreSurLeSujet(e.magazine.couverture!, e.catalogue) === 0 && !bilan.titreSurLeSujet
      && titreSurLeSujet(e.magazine.couverture!, new Map([...e.catalogue].map(([k, v]) => [k, k === "ciel" ? { ...v, zone: { x: 0.2, y: 0.02, l: 0.6, h: 0.2 } } : v]))) > 0.15);
  g({ type: "ouvrirTexte", ref: refC(0) }); g({ type: "taper", contenu: "MARTINIQUE" }); g({ type: "fermerTexte" });
  ok("écrire le titre : une séance, une entrée d'historique, le texte dans la couverture", e.magazine.couverture?.textes[0].contenu === "MARTINIQUE" && e.historique.passe.length === 3);
  g({ type: "choisirGabarit", plancheId: ID_COUVERTURE, cible: "double", templateId: "CV-03" });
  ok("changer de gabarit : la photo de la 1re reste sur la 1re (au plus grand cadre), celle de la 4e sur la 4e, le titre écrit suit",
    e.magazine.couverture?.templateId === "CV-03" && idsDeLaPremiere(e.magazine.couverture).join() === "ciel" && e.magazine.couverture.photos[0].photoId === "mer"
      && e.magazine.couverture.textes[0].contenu === "MARTINIQUE");
  g({ type: "touche", cle: "r" });
  ok("R sur la couverture : le gabarit de couverture suivant", e.magazine.couverture?.templateId === "CV-04" && e.plancheCourante === ID_COUVERTURE);
  g({ type: "choisirGabarit", plancheId: ID_COUVERTURE, cible: "double", templateId: "CV-10" });
  const grille = e.magazine.couverture!;
  ok("vers « Nous tous » (une photo sur la 4e, neuf sur la 1re) : rien ne se perd qui ait sa place", grille.photos.filter((x) => x.photoId).length === 2 && idsDeLaPremiere(grille).join() === "ciel");
  g({ type: "choisirGabarit", plancheId: ID_COUVERTURE, cible: "double", templateId: "CV-01" });
  g({ type: "deposer", source: { type: "bibliotheque", ids: ["nous"] }, cible: { type: "cadre", ref: refC(1) } });
  g({ type: "choisirGabarit", plancheId: ID_COUVERTURE, cible: "double", templateId: "CV-06" });
  ok("vers un gabarit qui a moins de place sur la 4e : la photo en trop quitte la couverture et le dit (restée à côté)",
    e.magazine.couverture?.photos.filter((x) => x.photoId).length === 2 && !!e.message && /restée/.test(e.message.texte));
  g({ type: "annuler" });
  ok("annuler : la couverture d'avant revient, l'écran reste sur la couverture", e.magazine.couverture?.templateId === "CV-01" && e.plancheCourante === ID_COUVERTURE);
  const r0 = e.magazine.couverture!.photos[2].recadrage;
  g({ type: "ouvrirRecadrage", ref: refC(2) }); g({ type: "zoomerImage", zoom: 1.8 }); g({ type: "deplacerImage", ddx: 500, ddy: 0 }); g({ type: "fermerRecadrage" });
  const r1 = e.magazine.couverture!.photos[2].recadrage;
  ok("recadrer sur la couverture : zoom et décalage BORNÉS par le cadre de la 1re (jamais de blanc), une entrée d'historique",
    r1.zoom === 1.8 && r1.dx !== r0.dx && r1.dx < 500 && e.historique.passe.at(-1)?.libelle === "Recadrer");
  g({ type: "echanger", a: refC(0), b: refC(1) });
  ok("échanger deux cadres de la couverture", e.magazine.couverture?.photos[0].photoId === "nous" && e.magazine.couverture.photos[1].photoId === "mer");
  g({ type: "activerCadre", ref: refC(1) }); g({ type: "touche", cle: "Backspace" });
  ok("retirer (⌫ sur le cadre actif) : le cadre reste, vide ; la photo retourne à la bibliothèque", e.magazine.couverture?.photos[1].photoId === null && !utilisations(e.magazine).has("mer"));
  g({ type: "pagesCouverture", pages: 32 });
  ok("saisir 32 pages (création libre) : écrites sur la couverture, le dos se calcule (2,66 mm en brillant par défaut)",
    e.magazine.couverture?.pages === 32 && dosDeLaCouverture(e.projet, e.magazine.couverture.pages).dos === 2.66 && contenuValide(e.magazine));
  g({ type: "deposer", source: { type: "bibliotheque", ids: ["plage"] }, cible: { type: "cadre", ref: { plancheId: e.magazine.planches[0].id, cible: "droite", index: 0 } } });
  g({ type: "deposer", source: { type: "cadre", ref: { plancheId: e.magazine.planches[0].id, cible: "droite", index: 0 }, photoId: "plage" }, cible: { type: "cadre", ref: refC(0) } });
  ok("entre l'intérieur et la couverture rien ne voyage en glissant (une photo de l'intérieur se repose depuis la bibliothèque)",
    e.magazine.couverture?.photos[0].photoId === "nous");
  ok(`invariants tenus après chaque geste de couverture${fautes.length ? ` (${fautes.slice(0, 3).join(" ; ")})` : ""}`, fautes.length === 0);
  ok("la couverture se sauvegarde telle que les gestes l'ont laissée", contenuValide(e.magazine) && contenuValide(JSON.parse(JSON.stringify(e.magazine))));

  /* ── l'écran : ce que la carte exigeait d'apprendre ── */
  const src = (f: string) => readFileSync(resolve(process.cwd(), f), "utf8");
  const em = src("src/app/admin/atelier/mise-en-page/[id]/EditeurMagazine.tsx"), bas = src("src/app/admin/atelier/mise-en-page/[id]/Bas.tsx");
  ok("écran : la couverture a sa scène, sa bande (dos, pages) et son tiroir ; elle est en tête du chemin de fer",
    /surCouverture \? <SceneCouverture \/> : <Scene \/>/.test(em) && /surCouverture \? <BandeCouverture \/> : <Bande \/>/.test(em) && /<RangeeCouverture \/>/.test(em)
      && bas.indexOf("ed-cf-couv") > 0 && bas.indexOf("ed-cf-couv") < bas.indexOf("vignettes.map"));
}

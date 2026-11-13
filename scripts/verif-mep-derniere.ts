/**
 * Le harnais du LOT E (13/11), appelé par verif-atelier.ts :
 *   1. la DERNIÈRE page, seule, à gauche (nombre de pages pair) : modèle, lecture de l'ancien format, validateur, opérations,
 *      chemin de fer, IDML, PDF ;
 *   2. la TRANCHE : le dos calculé, ou saisi à la main (bornes nommées), dit à l'écran, relu par le validateur strict ;
 *   3. le PREMIER JET : un fichier JSON de magazine (produit hors de l'éditeur) chargé sur les photos importées, relié par le
 *      NOM DE FICHIER d'origine.
 */

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { PDFDocument } from "pdf-lib";
import { strFromU8, unzipSync } from "fflate";
import * as O from "@/lib/mise-en-page/editeur";
import type { PhotoMaq } from "@/lib/mise-en-page/editeur";
import { aDerniere, avecDerniere, coteSeul, estDerniere, ID_DERNIERE, nouveauMagazine, type Magazine, type PhotoRef } from "@/lib/mise-en-page/magazine";
import { contenuValide } from "@/lib/mise-en-page/sauvegarde";
import { PT_PAR_MM } from "@/lib/mise-en-page/geometrie";
import { construireIdml, photosUtilisees, type PhotoExport } from "@/lib/mise-en-page/idml";
import { BOITE_DERNIERE_PAGE, BOITE_DOUBLE, BOITE_PAGE_SEULE, ecrirePdf, planPdf } from "@/lib/mise-en-page/pdf";
import { zipperIdml } from "@/lib/mise-en-page/paquet";
import { DOS_SAISI_MAX_MM, DOS_SAISI_MIN_MM, GABARITS_COUVERTURE, couvertureNeuve, dosSaisiValide } from "@/lib/mise-en-page/couverture";
import { construireIdmlCouverture } from "@/lib/mise-en-page/idml";
import { largeurCouverture } from "@/lib/mise-en-page/geometrie";
import { dosDeLEtat, dosDeLaCouverture } from "@/app/admin/atelier/mise-en-page/[id]/dosCouverture";
import { couvertureDeLExport } from "@/app/admin/atelier/mise-en-page/[id]/exporter";
import { LECTURE_VIDE } from "@/lib/mise-en-page/editeur/mesures";
import { marqueDe } from "@/lib/mise-en-page/editeur/tri";
import { EMPREINTE_IDML_INTERIEUR, PHOTOS_ETALON, empreinteIdml, magazineEtalon } from "./etalon-idml";

const K = PT_PAR_MM;
const neutre = { zoom: 1, dx: 0, dy: 0 };
const clone = <T,>(x: T): T => JSON.parse(JSON.stringify(x)) as T;

const ref = (id: string, l = 4000, h = 3000): PhotoRef => ({ id, nom: `${id}.jpg`, l, h, date: `2026-06-11T10:00:0${id.length % 10}.000Z` });
const catalogue = (ids: string[]): Map<string, PhotoRef> => new Map(ids.map((id, i) => [id, ref(id, i % 3 === 1 ? 3000 : 4000, i % 3 === 1 ? 4000 : 3000)]));
const photoMaq = (id: string, l: number, h: number): PhotoMaq => ({
  id, nom: `${id}.jpg`, l, h, date: "2026-06-11T10:00:00.000Z", personne: "Inès", lien: null, type: "atelier", coeur: false, signalee: false,
  autresMagazines: [], nouvelle: false, vignette: null,
});

export async function verifierMepDerniere(ok: (nom: string, reussi: boolean) => void, titre: (t: string) => void): Promise<void> {
  titre("— mise en page, lot E : la dernière page est une page seule (nombre de pages pair) —");

  /* ── 1. le modèle ── */
  const neuf = nouveauMagazine("m", "Essai", "2026-11-13T10:00:00.000Z");
  ok("dernière page : un magazine neuf a DEUX planches (la page droite seule, puis la page gauche seule, « pl-fin »), `derniere`, 2 pages, valide",
    neuf.planches.length === 2 && neuf.derniere === true && neuf.planches[0].id === "pl-1" && neuf.planches[1].id === ID_DERNIERE && aDerniere(neuf)
      && !estDerniere(neuf, 0) && estDerniere(neuf, 1) && coteSeul(neuf, 0) === "droite" && coteSeul(neuf, 1) === "gauche"
      && O.pagesDe(neuf) === 2 && contenuValide(neuf) && contenuValide(clone(neuf)));
  let m = neuf;
  for (let k = 0; k < 7; k++) m = O.insererDouble(m, m.planches[m.planches.length - 1].id).magazine;
  ok("dernière page : le nombre de pages est TOUJOURS pair (1 + 2 par double + 1) : 2, 4, 6… jusqu'à 16 pour sept doubles, la dernière reste en dernier",
    m.planches.length === 9 && O.pagesDe(m) === 16 && m.planches[8].id === ID_DERNIERE && m.planches.slice(1, 8).every((p) => /^pl-\d+$/.test(p.id))
      && [1, 2, 3, 4, 5].every((n) => O.pagesDe({ ...neuf, planches: [neuf.planches[0], ...Array.from({ length: n }, (_, i) => ({ id: `pl-${i + 2}`, mode: "double" as const, double: null, gauche: null, droite: null })), neuf.planches[1]] }) === 2 + 2 * n));

  /* ── 2. la lecture de l'ANCIEN format : rien d'existant ne bouge, la dernière page manquante se crée à l'ouverture ── */
  /* l'étalon de l'IDML (six planches : page seule, doubles, pages, aplats, textes blancs…) avec des dates lisibles : un magazine d'AVANT le lot E */
  const vieux: Magazine = { ...magazineEtalon(), creeLe: "2026-11-12T10:00:00.000Z", modifieLe: "2026-11-12T10:00:00.000Z" };
  ok("ancien format : un magazine sauvegardé avant le lot E (sans `derniere`, six planches) reste VALIDE tel quel, et ses pages restent comptées comme avant (11, impair)",
    contenuValide(vieux) && !("derniere" in vieux) && !aDerniere(vieux) && O.pagesDe(vieux) === 11 && coteSeul(vieux, 5) === null && coteSeul(vieux, 0) === "droite");
  const migre = avecDerniere(vieux);
  ok("ancien format : `avecDerniere` ajoute UNE planche vide « pl-fin » à la fin ; les six planches d'avant sont les MÊMES objets (rien ne bouge), 12 pages, valide, relue depuis JSON",
    migre !== vieux && migre.derniere === true && migre.planches.length === 7 && vieux.planches.every((p, i) => migre.planches[i] === p)
      && migre.planches[6].id === ID_DERNIERE && migre.planches[6].mode === "pages" && migre.planches[6].gauche === null && migre.planches[6].droite === null
      && O.pagesDe(migre) === 12 && contenuValide(migre) && contenuValide(clone(migre)) && vieux.planches.length === 6);
  ok("ancien format : idempotent (un magazine qui a sa dernière page revient LE MÊME objet), `creerEtat` l'applique aussi, et un « pl-fin » déjà pris est évité",
    avecDerniere(migre) === migre && avecDerniere(neuf) === neuf
      && O.creerEtat({ magazine: vieux, catalogue: [] }).magazine.derniere === true && O.creerEtat({ magazine: vieux, catalogue: [] }).magazine.planches.length === 7
      && O.creerEtat({ magazine: migre, catalogue: [] }).magazine === migre
      && (() => {
        const pris: Magazine = { ...vieux, planches: [...vieux.planches.slice(0, 5), { ...vieux.planches[5], id: ID_DERNIERE }] };
        const a = avecDerniere(pris);
        return a.planches.length === 7 && new Set(a.planches.map((p) => p.id)).size === 7 && contenuValide(a);
      })());
  /* la première page ne change pas, et l'ancien format n'a toujours pas de dernière page : aucun garde ne s'y applique */
  ok("ancien format : sans `derniere`, aucune planche n'est « dernière » (ajouterDouble ajoute à la fin comme avant, supprimer supprime la dernière planche)",
    O.supprimerPlanche(vieux, "pl-6").planches.length === 5 && O.insererDouble(vieux, "pl-6").magazine.planches[6].id === "pl-7" && !estDerniere(vieux, 5));

  /* ── 3. le validateur ── */
  const casse = (f: (b: Record<string, unknown> & { planches: Array<Record<string, unknown>> }) => void): boolean => {
    const b = clone(migre) as unknown as Record<string, unknown> & { planches: Array<Record<string, unknown>> };
    f(b);
    return contenuValide(b);
  };
  ok("validateur : `derniere` seul `true` ; absente, valide (ancien format) ; `false`, `null`, `undefined`, `1`, « oui » refusés",
    contenuValide({ ...vieux }) && contenuValide(migre) && !contenuValide({ ...migre, derniere: false }) && !contenuValide({ ...migre, derniere: null })
      && !contenuValide({ ...migre, derniere: undefined }) && !contenuValide({ ...migre, derniere: 1 }) && !contenuValide({ ...migre, derniere: "oui" }));
  ok("validateur : avec `derniere`, la dernière planche est une page GAUCHE seule : refusée en double, ou avec une page droite ; au moins deux planches ; la gauche peut porter des photos",
    !casse((b) => { const p = b.planches[6]; p.mode = "double"; })
      && !casse((b) => { b.planches[6].droite = { templateId: "G-P1-a", photos: [{ photoId: "p1", recadrage: neutre }], textes: [] }; })
      && !casse((b) => { b.planches = [b.planches[0]]; })
      && casse((b) => { b.planches[6].gauche = { templateId: "G-P1-a", photos: [{ photoId: "p1", recadrage: neutre }], textes: [] }; })
      && !contenuValide({ ...neuf, planches: [neuf.planches[0]] })
      && !contenuValide({ ...neuf, planches: [neuf.planches[0], { ...neuf.planches[1], mode: "double" }] }));

  /* ── 4. les opérations ── */
  const cat = catalogue(Array.from({ length: 30 }, (_, i) => `p${i}`));
  const ids = (n: number, d = 0) => Array.from({ length: n }, (_, i) => `p${i + d}`);
  const a0 = O.ajouter(neuf, ID_DERNIERE, "droite", ids(3), cat);
  ok("opérations : une photo posée sur la dernière page va TOUJOURS à gauche (cible « droite » ou « double » comprises), jamais à droite ; la planche ne change pas de mode",
    a0.posees.length === 3 && a0.magazine.planches[1].gauche?.photos.length === 3 && a0.magazine.planches[1].droite === null && a0.magazine.planches[1].mode === "pages"
      && O.ajouter(neuf, ID_DERNIERE, "double", ids(2), cat).magazine.planches[1].gauche?.photos.length === 2
      && O.ajouter(neuf, ID_DERNIERE, "gauche", ids(2), cat).magazine.planches[1].gauche?.photos.length === 2
      && contenuValide(a0.magazine) && O.cibleSurPlanche(neuf, ID_DERNIERE) === "gauche");
  const six = O.ajouter(neuf, ID_DERNIERE, "gauche", ids(6), cat).magazine;
  ok("opérations : la dernière page est pleine à six photos (comme une page seule), puis refuse ; « poser » du moteur la garde en page gauche",
    O.estPleine(six.planches[1], "gauche") && O.cibleSurPlanche(six, ID_DERNIERE) === null && O.ajouter(six, ID_DERNIERE, "gauche", ["p9"], cat).refus === "pleine"
      && !O.estPleine(neuf.planches[1], "gauche") && !O.estPleine(a0.magazine.planches[0], "droite"));
  const deux = O.insererDouble(O.insererDouble(neuf, "pl-1").magazine, "pl-1");
  ok("opérations : « Ajouter une double » et « après la dernière page » insèrent AVANT la dernière page (qui reste en dernier) ; l'id suit la suite pl-N, « pl-fin » n'y entre pas",
    deux.magazine.planches.map((p) => p.id).join() === "pl-1,pl-3,pl-2,pl-fin"
      && O.insererDouble(neuf, ID_DERNIERE).magazine.planches.map((p) => p.id).join() === "pl-1,pl-2,pl-fin"
      && O.insererDouble(neuf, ID_DERNIERE).plancheId === "pl-2" && O.prochainId(neuf) === "pl-2"
      && O.creerDoubles(neuf, 99, ids(3), cat, 2).magazine.planches.map((p) => p.id).join() === "pl-1,pl-2,pl-fin"
      && O.creerDoubles(neuf, 2, ids(3), cat, 2).magazine.planches.map((p) => p.id).join() === "pl-1,pl-2,pl-fin"
      && O.creerDoubles(neuf, 1, ids(13), cat, 2).magazine.planches.map((p) => p.id).join() === "pl-1,pl-2,pl-3,pl-fin");
  const trois = ((): Magazine => { let x = neuf; for (let k = 0; k < 3; k++) x = O.insererDouble(x, "pl-1").magazine; return x; })();
  const ordre = (x: Magazine) => x.planches.map((p) => p.id).join();
  ok("opérations : la dernière page ne se déplace pas ; rien ne passe derrière elle (ni vers l'index le plus grand, ni par le geste « entre ») ; ni devant la première",
    ordre(trois) === "pl-1,pl-4,pl-3,pl-2,pl-fin" && O.deplacerPlanche(trois, ID_DERNIERE, 1) === trois
      && ordre(O.deplacerPlanche(trois, "pl-4", 99)) === "pl-1,pl-3,pl-2,pl-4,pl-fin" && ordre(O.deplacerPlanche(trois, "pl-2", 0)) === "pl-1,pl-2,pl-4,pl-3,pl-fin"
      && ordre(O.deplacerPlanche(trois, "pl-2", 4)) === "pl-1,pl-4,pl-3,pl-2,pl-fin");
  const avecPhotos = O.ajouter(trois, ID_DERNIERE, "gauche", ids(2), cat).magazine;
  ok("opérations : « Supprimer » la dernière page la VIDE (elle reste, comme la première) ; elle ne passe ni en double, ni en deux pages, ni en miroir",
    O.supprimerPlanche(avecPhotos, ID_DERNIERE).planches.length === avecPhotos.planches.length && O.supprimerPlanche(avecPhotos, ID_DERNIERE).planches[4].gauche === null
      && O.supprimerPlanche(avecPhotos, "pl-3").planches.length === avecPhotos.planches.length - 1
      && O.fusionner(avecPhotos, ID_DERNIERE, cat).refus === "rien" && O.fusionner(avecPhotos, ID_DERNIERE, cat).magazine === avecPhotos
      && O.separer(avecPhotos, ID_DERNIERE, cat).magazine === avecPhotos && O.miroir(avecPhotos, ID_DERNIERE).magazine === avecPhotos
      && O.composer(avecPhotos, ID_DERNIERE, "double", ids(3), cat).magazine === avecPhotos && O.composer(avecPhotos, ID_DERNIERE, "droite", ids(3), cat).magazine === avecPhotos
      && O.composer(avecPhotos, ID_DERNIERE, "gauche", ids(3), cat).magazine !== avecPhotos);
  const lib = O.poserLibre(neuf, ID_DERNIERE, "double", ["p1"], 100, 100, cat);
  ok("opérations : la pose en libre sur la dernière page reste sur la page gauche ; déplacer un cadre entre deux pages seules y arrive à gauche",
    lib.posees.length === 1 && lib.magazine.planches[1].gauche?.photos.length === 1 && lib.magazine.planches[1].droite === null && contenuValide(lib.magazine)
      && O.deplacerPhoto(O.ajouter(neuf, "pl-1", "droite", ["p1"], cat).magazine, { plancheId: "pl-1", cible: "droite", index: 0 }, { plancheId: ID_DERNIERE, cible: "droite" }, cat).magazine.planches[1].gauche?.photos.length === 1);

  /* ── 5. le chemin de fer, les comptes, le contrôle avant export ── */
  const catMaq = new Map(Array.from({ length: 12 }, (_, i) => [`p${i}`, photoMaq(`p${i}`, i % 3 === 1 ? 3000 : 4000, i % 3 === 1 ? 4000 : 3000)] as const));
  let e = O.creerEtat({ magazine: trois, catalogue: catMaq, projet: null });
  const v = O.cheminDeFer(e);
  ok("chemin de fer : p. 1, 2-3, 4-5, 6-7, puis la dernière page SEULE « p. 8 » (jamais « 8-9 ») ; sa vignette n'est pas « pleine » vide ; 8 pages comptées",
    v.map((x) => x.pages).join("|") === "1|2-3|4-5|6-7|8" && O.pagesDe(trois) === 8 && O.pagesLibelle(e).texte === "8 pages" && v.every((x) => !x.pleine)
      && O.etiquettePages(vieux, 5) === "10-11" && O.etiquettePages(migre, 6) === "12" && O.etiquettePages(migre, 0) === "1");
  e = O.appliquer(e, { type: "deposer", source: { type: "bibliotheque", ids: ["p1", "p2"] }, cible: { type: "page", plancheId: ID_DERNIERE, cote: "droite" } });
  const act = O.actionsPlanche(e, ID_DERNIERE);
  ok("éditeur : poser sur la dernière page (cible « droite » lâchée là) arrive en page gauche ; ses actions : page seule gauche, ni double, ni miroir, ni suppression, ni déplacement",
    e.magazine.planches[4].gauche?.photos.length === 2 && e.magazine.planches[4].droite === null && !!act && act.derniere && !act.premiere && act.seule === "gauche"
      && !act.fusionner && !act.separer && !act.zoneDouble && !act.miroir && !act.supprimer && !act.deplacable && act.vider
      && O.actionsPlanche(e, "pl-1")?.seule === "droite" && O.actionsPlanche(e, "pl-2")?.seule === null
      && O.verifierInvariants(e).length === 0);
  ok("éditeur : la bande de la dernière page n'a QU'un segment « gauche » ; la cible « droite » n'y est pas allumée, la « gauche » oui ; la cible « double » non",
    O.bande(O.appliquer(e, { type: "naviguer", plancheId: ID_DERNIERE })).map((s) => s.cible).join() === "gauche"
      && !O.cibleAllumee(e, { type: "bibliotheque", ids: ["p3"] }, { type: "page", plancheId: ID_DERNIERE, cote: "droite" })
      && O.cibleAllumee(e, { type: "bibliotheque", ids: ["p3"] }, { type: "page", plancheId: ID_DERNIERE, cote: "gauche" })
      && !O.cibleAllumee(e, { type: "bibliotheque", ids: ["p3"] }, { type: "double", plancheId: ID_DERNIERE })
      && !O.cibleAllumee(e, { type: "bibliotheque", ids: ["p3"] }, { type: "double", plancheId: "pl-1" }) && O.cibleAllumee(e, { type: "bibliotheque", ids: ["p3"] }, { type: "double", plancheId: "pl-2" }));
  const vide = O.avertissementsExport(O.creerEtat({ magazine: trois, catalogue: catMaq }));
  const rapport = O.avertissementsExport(O.appliquer(O.creerEtat({ magazine: neuf, catalogue: catMaq }), { type: "insererDouble" }));
  ok("contrôle avant export : la dernière page vide n'est PAS une « planche vide » (comme la première) ; les doubles vides le sont (p. 2, 3, 4) ; 5 planches comptées",
    vide.pagesVides.join() === "2,3,4" && vide.planches === 5 && rapport.pagesVides.join() === "2" && rapport.planches === 3);
  const surLeProjet = O.pagesLibelle(O.creerEtat({ magazine: trois, catalogue: catMaq, projet: { nbPagesCible: 8, finition: null } as never }));
  const depasse = O.pagesLibelle(O.creerEtat({ magazine: trois, catalogue: catMaq, projet: { nbPagesCible: 6, finition: null } as never }));
  ok("comptes : 8 pages composées pour 8 payées ne dépassent pas (avant le lot E, 9 pour 8 : « 1 page au-dessus » à tort) ; 8 pour 6 payées : 2 au-dessus",
    surLeProjet.texte === "8 / 8 pages" && !surLeProjet.depasse && depasse.depasse && depasse.pages - (depasse.cible ?? 0) === 2);

  /* ── 6. l'export IDML ── */
  const fichiers = (x: Magazine, photos: Map<string, PhotoExport> = PHOTOS_ETALON) => construireIdml(x, photos, { liens: { mode: "relatif" } });
  const texte = (f: { chemin: string; contenu: string }[], c: string) => f.find((x) => x.chemin === c)?.contenu ?? "";
  const etalon = magazineEtalon();
  const etalonDerniere = avecDerniere(etalon);
  const fi = fichiers(etalon), fd = fichiers(etalonDerniere);
  ok("IDML : l'ancien format reste IDENTIQUE à l'octet (empreinte de l'étalon d'avant le lot B), pas une planche de plus ; le même magazine AVEC dernière page a UN spread de plus",
    empreinteIdml(etalon) === EMPREINTE_IDML_INTERIEUR && fi.filter((x) => /^Spreads\//.test(x.chemin)).length === 6 && fd.filter((x) => /^Spreads\//.test(x.chemin)).length === 7);
  const spN = texte(fd, "Spreads/Spread_sp7.xml");
  ok("IDML : le spread de la dernière page = UNE page GAUCHE (décalée de −une page, 595,2756 pt), BindingLocation 1 (la reliure à sa droite), numéro 12 ; les six spreads d'avant sont inchangés à l'octet",
    /PageCount="1" BindingLocation="1"/.test(spN) && /<Page Self="pg12" Name="12" [^>]*ItemTransform="1 0 0 1 -595\.2756 /.test(spN)
      && [1, 2, 3, 4, 5, 6].every((k) => texte(fd, `Spreads/Spread_sp${k}.xml`) === texte(fi, `Spreads/Spread_sp${k}.xml`)) && !/Rectangle|TextFrame/.test(spN));
  ok("IDML : le document compte 12 pages (PagesPerDocument, Section Length), toujours un nombre PAIR ; la première spread reste une page droite (BindingLocation 0)",
    /PagesPerDocument="12"/.test(texte(fd, "Resources/Preferences.xml")) && /Section Self="sec1" Length="12"/.test(texte(fd, "designmap.xml"))
      && /PageCount="1" BindingLocation="0"/.test(texte(fd, "Spreads/Spread_sp1.xml")) && /PagesPerDocument="11"/.test(texte(fi, "Resources/Preferences.xml")));
  /* une photo sur la dernière page : cadres en repère page gauche, x négatifs (à gauche du pli) */
  const surDerniere = O.ajouter(neuf, ID_DERNIERE, "gauche", ["a"], new Map([["a", ref("a")]])).magazine;
  const photoA = new Map<string, PhotoExport>([["a", { id: "a", nomLien: "a.jpg", l: 4000, h: 3000 }]]);
  const sp2 = texte(fichiers(surDerniere, photoA), "Spreads/Spread_sp2.xml");
  const gb = [...sp2.matchAll(/<Rectangle [^>]*ContentType="GraphicType"[^>]*>.*?<PathPointType Anchor="([-\d.]+) ([-\d.]+)"[^>]*\/><PathPointType Anchor="[-\d.]+ [-\d.]+"[^>]*\/><PathPointType Anchor="([-\d.]+) ([-\d.]+)"/g)];
  ok("IDML : une photo posée sur la dernière page est écrite à GAUCHE du pli (tous ses x < 0), dans le spread de la dernière page ; elle compte dans les photos utilisées",
    gb.length === 1 && Number(gb[0][1]) < 0 && Number(gb[0][3]) <= 0.01 && photosUtilisees(surDerniere).join() === "a");
  const zip = unzipSync(zipperIdml(fd));
  ok("IDML : le paquet se zippe et se relit avec la dernière page (mimetype d'abord), les 7 spreads présents", Object.keys(zip).filter((c) => /^Spreads\//.test(c)).length === 7 && strFromU8(zip["mimetype"]).startsWith("application/vnd.adobe.indesign-idml-package"));

  /* ── 7. l'export PDF ── */
  const pdfM = O.ajouter(trois, ID_DERNIERE, "gauche", ["a"], new Map([["a", ref("a")]])).magazine;
  const pages = planPdf(pdfM);
  ok("PDF : une page par planche ; la dernière est une page seule 216 × 303 (fond perdu compris, x de −3 à 213) comme la première, les doubles 426 × 303 ; l'ancien format garde une double en dernier",
    pages.length === 5 && pages[0].boite === BOITE_PAGE_SEULE && pages[4].boite === BOITE_DERNIERE_PAGE && pages.slice(1, 4).every((p) => p.boite === BOITE_DOUBLE)
      && BOITE_DERNIERE_PAGE.l === 216 && BOITE_DERNIERE_PAGE.h === 303 && BOITE_DERNIERE_PAGE.x === -3 && BOITE_DERNIERE_PAGE.y === -3
      && planPdf(vieux)[5].boite === BOITE_DOUBLE && planPdf(vieux).length === 6);
  const objetsDerniere = pages[4].objets.filter((o) => o.type === "photo");
  ok("PDF : la photo de la dernière page est dans la boîte de la page (ses cadres, repère planche, tiennent dans x de −3 à 213) ; elle est lue par le plan",
    objetsDerniere.length === 1 && objetsDerniere.every((o) => o.type === "photo" && o.cadre.x >= BOITE_DERNIERE_PAGE.x - 1e-6 && o.cadre.x + o.cadre.l <= BOITE_DERNIERE_PAGE.x + BOITE_DERNIERE_PAGE.l + 1e-6));
  const jpeg = new Uint8Array(await (await import("node:fs/promises")).readFile("archive/images-v1/divers/decor-album-email.jpg"));
  const images = new Map(pages.flatMap((p) => p.objets.flatMap((o) => (o.type === "photo" && o.photoId ? [[o.cle, jpeg] as const] : []))));
  const ecrit = await ecrirePdf(pages, images, "Essai");
  const lu = await PDFDocument.load(ecrit.octets, { updateMetadata: false });
  const tailles = lu.getPages().map((p) => p.getSize());
  ok("PDF écrit et relu : 5 pages ; la première et la DERNIÈRE à 216 × 303 mm en points, les trois doubles à 426 × 303",
    ecrit.pages === 5 && tailles.length === 5 && [0, 4].every((i) => Math.abs(tailles[i].width - 216 * K) < 0.01 && Math.abs(tailles[i].height - 303 * K) < 0.01)
      && [1, 2, 3].every((i) => Math.abs(tailles[i].width - 426 * K) < 0.01));

  /* ═════════════════════════ 2. la tranche : calculée seule, ou saisie à la main ═════════════════════════ */
  titre("— mise en page, lot E : la tranche (le dos) saisie à la main, qui remplace le calcul jusqu'à ce qu'on l'efface —");
  ok(`dos saisi : les bornes sont NOMMÉES (${DOS_SAISI_MIN_MM} à ${DOS_SAISI_MAX_MM} mm) ; le centième de mm, comme le calcul ; hors bornes, non fini, chaîne, null, millièmes : refusés`,
    DOS_SAISI_MIN_MM === 1 && DOS_SAISI_MAX_MM === 20 && [1, 20, 2.25, 2.66, 3.2, 4.51, 10].every(dosSaisiValide)
      && [0.99, 20.01, 0, -3, NaN, Infinity, "3", null, undefined, 2.666, 3.005].every((v) => !dosSaisiValide(v)));

  const couvOk = { ...couvertureNeuve("CV-02"), photos: couvertureNeuve("CV-02").photos };
  const baseC = nouveauMagazine("m-dos", "Dos", "2026-11-13T10:00:00.000Z");
  ok("validateur : `dosMm` est une clé FACULTATIVE de la couverture : absente = comme avant ; présente et valide (seule, avec `pages`, relue depuis JSON) passe",
    contenuValide({ ...baseC, couverture: couvOk }) && contenuValide({ ...baseC, couverture: { ...couvOk, dosMm: 3.2 } }) && contenuValide({ ...baseC, couverture: { ...couvOk, dosMm: 1 } })
      && contenuValide({ ...baseC, couverture: { ...couvOk, dosMm: 20 } }) && contenuValide({ ...baseC, couverture: { ...couvOk, pages: 32, dosMm: 2.66 } })
      && contenuValide(clone({ ...baseC, couverture: { ...couvOk, pages: 32, dosMm: 2.66 } })));
  ok("validateur : `dosMm` hors bornes (0,5 et 25), `undefined`, `null`, chaîne, NaN (null en JSON), millièmes, ou une clé voisine en trop : REFUSÉS",
    [0.5, 25, undefined, null, "3,2", NaN, 3.205, Infinity].every((v) => !contenuValide({ ...baseC, couverture: { ...couvOk, dosMm: v } }))
      && !contenuValide(clone({ ...baseC, couverture: { ...couvOk, dosMm: NaN } })) && !contenuValide({ ...baseC, couverture: { ...couvOk, dos: 3.2 } })
      && !contenuValide({ ...baseC, couverture: { ...couvOk, dosMm: 3.2, extra: 1 } }));
  /* un geste sans effet laisse le MÊME magazine et ne pousse aucune entrée d'historique */
  const sansEffet = (e: ReturnType<typeof O.creerEtat>, dosMm: number | null): boolean => {
    const x = O.appliquer(e, { type: "dosCouverture", dosMm });
    return x.magazine === e.magazine && x.historique.passe.length === e.historique.passe.length;
  };
  let e2 = O.creerEtat({ magazine: baseC, catalogue: catMaq, projet: { nbPagesCible: 32, finition: "gloss" } as never });
  const avantDos = e2.magazine;
  e2 = O.appliquer(e2, { type: "dosCouverture", dosMm: 3.2 });
  ok("geste : saisir le dos l'écrit dans `couverture` (la couverture neuve au gabarit par défaut), une seule entrée d'historique ; le MÊME dos ne change rien ; hors bornes ne change rien",
    e2.magazine.couverture?.dosMm === 3.2 && contenuValide(e2.magazine) && e2.historique.passe.length === 1 && e2.historique.passe[0].libelle === "Dos saisi"
      && sansEffet(e2, 3.2) && sansEffet(e2, 0.5) && sansEffet(e2, 25) && sansEffet(e2, NaN) && O.verifierInvariants(e2).length === 0);
  const e3 = O.appliquer(e2, { type: "choisirGabarit", plancheId: "couverture", cible: "double", templateId: "CV-05" });
  ok("geste : changer de gabarit de couverture GARDE le dos saisi (et les pages saisies) ; Annuler rend l'état d'avant ; l'effacer retire la clé (jamais `undefined`) et le calcul reprend",
    e3.magazine.couverture?.templateId === "CV-05" && e3.magazine.couverture.dosMm === 3.2 && contenuValide(e3.magazine)
      && O.appliquer(e2, { type: "annuler" }).magazine === avantDos
      && (() => {
        const e4 = O.appliquer(e3, { type: "dosCouverture", dosMm: null });
        return !!e4.magazine.couverture && !("dosMm" in e4.magazine.couverture) && contenuValide(e4.magazine) && sansEffet(e4, null)
          && sansEffet(O.creerEtat({ magazine: baseC, catalogue: catMaq }), null);
      })());

  /* le calcul, ou la saisie : lequel est utilisé, dit par `origine` */
  const p32 = { nbPagesCible: 32, finition: "gloss" as const };
  const calc = dosDeLaCouverture(p32, null);
  const main = dosDeLaCouverture(p32, null, { dosSaisi: 3.2 });
  ok("tranche : calculée seule (32 pages brillant : 2,66 mm, origine « calcule ») ; avec une largeur saisie, CELLE-CI remplace le calcul (3,2 mm, origine « main », le calcul gardé en repère) ; effacée, le calcul revient",
    calc.dos === 2.66 && calc.origine === "calcule" && calc.saisi === null && calc.calcule === 2.66 && calc.manque === null
      && main.dos === 3.2 && main.origine === "main" && main.saisi === 3.2 && main.calcule === 2.66 && main.manque === null && main.source === "projet"
      && dosDeLaCouverture(p32, null, { dosSaisi: null }).dos === 2.66 && dosDeLaCouverture(p32, null, { dosSaisi: undefined }).origine === "calcule");
  ok("tranche : une saisie hors bornes ou non finie est ignorée (le calcul reste) ; une saisie sans pages ni projet est utilisée (dos connu) ; le calcul inconnu reste dit sans bloquer la saisie",
    [0.5, 25, NaN, Infinity].every((v) => dosDeLaCouverture(p32, null, { dosSaisi: v }).origine === "calcule" && dosDeLaCouverture(p32, null, { dosSaisi: v }).dos === 2.66)
      && (() => {
        const sans = dosDeLaCouverture({ nbPagesCible: null, finition: null }, null, { dosSaisi: 4.1 });
        return sans.dos === 4.1 && sans.origine === "main" && sans.calcule === null && sans.manque === null && sans.finitionParDefaut;
      })()
      && dosDeLaCouverture({ nbPagesCible: null, finition: null }, null).dos === null && dosDeLaCouverture({ nbPagesCible: null, finition: null }, null).manque === "Pages à saisir pour le dos");
  /* le nombre de pages PAIR du magazine entre enfin dans le calcul du dos */
  let m24 = neuf;
  for (let k = 0; k < 11; k++) m24 = O.insererDouble(m24, "pl-1").magazine;
  const sansProjet = { nbPagesCible: null, finition: null } as const;
  const d24 = dosDeLEtat({ projet: sansProjet as never, magazine: m24 });
  const m10 = O.insererDouble(O.insererDouble(O.insererDouble(O.insererDouble(neuf, "pl-1").magazine, "pl-1").magazine, "pl-1").magazine, "pl-1").magazine;
  ok("tranche : sans pages payées ni saisies, le dos se calcule sur les pages COMPOSÉES (24 pages = 12 planches : 2,25 mm en brillant, source « magazine ») ; 10 pages : pas de dos carré, dit avec le nombre de pages",
    O.pagesDe(m24) === 24 && d24.dos === 2.25 && d24.source === "magazine" && d24.pages === 24 && d24.manque === null
      && O.pagesDe(m10) === 10 && dosDeLEtat({ projet: sansProjet as never, magazine: m10 }).dos === null && /10 pages composées/.test(dosDeLEtat({ projet: sansProjet as never, magazine: m10 }).manque ?? "")
      && dosDeLEtat({ projet: sansProjet as never, magazine: vieux }).dos === null);
  ok("tranche : les pages PAYÉES priment sur les composées (D20), les pages SAISIES sur les composées ; la saisie à la main prime sur tout",
    dosDeLaCouverture({ nbPagesCible: 32, finition: "gloss" }, null, { pagesMagazine: 24 }).dos === 2.66 && dosDeLaCouverture(sansProjet as never, 32, { pagesMagazine: 24 }).dos === 2.66
      && dosDeLaCouverture(sansProjet as never, 32, { pagesMagazine: 24 }).source === "saisie" && dosDeLaCouverture({ nbPagesCible: 32, finition: "gloss" }, 40, { pagesMagazine: 24, dosSaisi: 5 }).dos === 5);
  /* l'export part avec le dos saisi : la largeur de la couverture suit */
  const choix = couvertureDeLExport({ ...baseC, couverture: { ...couvOk, dosMm: 3.2 } }, main.dos, main.manque);
  const photosC = new Map<string, PhotoExport>();
  const fc = construireIdmlCouverture({ ...couvOk, dosMm: 3.2 }, photosC, { liens: { mode: "relatif" }, dosMm: 3.2 });
  const prefs = fc.find((x) => x.chemin === "Resources/Preferences.xml")?.contenu ?? "";
  const largeurPt = Number(/PageWidth="([\d.]+)"/.exec(prefs)?.[1] ?? "0");
  ok("tranche : l'export de la couverture part avec le dos saisi (couverture « ecrite », 3,2 mm) ; l'IDML a la largeur 420 + 3,2 mm ; sans dos du tout, elle reste bloquée avec sa phrase",
    choix.couverture.etat === "ecrite" && choix.couverture.dosMm === 3.2 && Math.abs(largeurPt - largeurCouverture(3.2) * K) < 0.001 && Math.abs(largeurCouverture(3.2) - 423.2) < 1e-9
      && couvertureDeLExport({ ...baseC, couverture: couvOk }, null, "Pages à saisir pour le dos").couverture.etat === "bloquee" && GABARITS_COUVERTURE.length > 0);

  /* ═════════════════════════ 3. le premier jet : un magazine composé hors de l'éditeur, relié par les noms de fichier ═════════════════════════ */
  titre("— mise en page, lot E : le premier jet (un fichier JSON de magazine, les photos reliées par leur nom de fichier) —");
  const exempleTexte = readFileSync(resolve(process.cwd(), "docs/moteur/exemple-premier-jet.json"), "utf8");
  const lu1 = O.lirePremierJet(exempleTexte);
  ok("premier jet : le fichier d'exemple de docs/moteur se lit (texte JSON ou objet), son magazine passe `contenuValide`, il porte la dernière page, la table des noms et les raisons",
    lu1.ok && contenuValide(lu1.jet.magazine) && lu1.jet.magazine.derniere === true && Object.keys(lu1.jet.photos).length === 7 && !!lu1.jet.raisons && Object.keys(lu1.jet.raisons).length === 3
      && O.lirePremierJet(JSON.parse(exempleTexte)).ok && O.FORMAT_PREMIER_JET === "bellajour-premier-jet" && O.VERSION_PREMIER_JET === 1);
  if (!lu1.ok) return;
  const jet = lu1.jet;
  const exemple = JSON.parse(exempleTexte) as Record<string, unknown> & { magazine: Record<string, unknown> & { planches: Record<string, unknown>[] }; photos: Record<string, string>; raisons: Record<string, string> };

  /* les photos importées : autres identifiants (loc-…), noms de fichier d'origine (casse, dossier et espaces d'un export) */
  const importees = (noms: string[]): PhotoMaq[] => noms.map((n, i) => photoMaq(`loc-${String(i).padStart(4, "0")}`, i % 2 ? 3024 : 4032, i % 2 ? 4032 : 3024)).map((p, i) => ({ ...p, nom: noms[i] }));
  const tous = importees(["img_0101.jpg", "DCIM/IMG_0102.JPG", " IMG_0103.JPG ", "IMG_0104.JPG", "IMG_0105.JPG", "IMG_0106.JPG", "IMG_0107.JPG", "IMG_9999.JPG"]);
  const catTous = new Map(tous.map((p) => [p.id, p]));
  const courant = nouveauMagazine("courant-libre", "Création libre", "2026-11-13T08:00:00.000Z");
  const b = O.appliquerPremierJet(jet, courant, catTous);
  const jetVersCat: Record<string, string> = { p001: "loc-0000", p002: "loc-0001", p003: "loc-0002", p004: "loc-0003", p005: "loc-0004", p006: "loc-0005", p007: "loc-0006" };
  ok("premier jet : les 7 photos du fichier se relient aux photos importées par leur NOM DE FICHIER (casse, dossier et espaces ignorés), sans en oublier ; rien n'est introuvable ; le magazine composé est valide",
    b.reliees === 7 && b.total === 7 && b.manquantes.length === 0 && b.ambigues.length === 0 && b.refus === null && contenuValide(b.magazine)
      && O.idsMagazine(b.magazine).every((id) => catTous.has(id)) && b.magazine.planches[0].droite?.photos[0].photoId === "loc-0000"
      && b.magazine.planches[1].double?.photos.map((a) => a.photoId).join() === "loc-0001,loc-0002,loc-0003" && b.magazine.planches[2].gauche?.photos[0].photoId === "loc-0004"
      && b.magazine.couverture?.photos.map((a) => a.photoId).join() === "loc-0002,,loc-0005");
  /* rien de plus que les identifiants ne change : on remet les identifiants du fichier et on retrouve le magazine du fichier (planches, gabarits, recadrages, textes, style, couverture) */
  const retour = JSON.parse(JSON.stringify(b.magazine).replace(/"(loc-\d{4})"/g, (_, id: string) => `"${Object.entries(jetVersCat).find(([, v]) => v === id)![0]}"`)) as Record<string, unknown>;
  const original = clone(jet.magazine) as unknown as Record<string, unknown>;
  ok("premier jet : le magazine arrive TEL QUEL (planches, gabarits, photos, recadrages, textes, style, couverture, tri, dernière page) : en remettant les identifiants du fichier, on retrouve le magazine du fichier, à l'identité du projet près",
    JSON.stringify({ ...retour, id: 0, titre: 0, creeLe: 0, modifieLe: 0 }, Object.keys({ ...retour, id: 0 }).sort()) === JSON.stringify({ ...original, id: 0, titre: 0, creeLe: 0, modifieLe: 0 }, Object.keys({ ...original, id: 0 }).sort())
      && b.magazine.id === "courant-libre" && b.magazine.titre === "Création libre" && b.magazine.creeLe === courant.creeLe && b.magazine.modifieLe === courant.modifieLe
      && b.magazine.style?.paire === "T-01" && b.magazine.couverture?.templateId === "CV-01" && b.magazine.planches.length === 3 && b.magazine.derniere === true);
  ok("premier jet : le TRI et les RAISONS arrivent : gardées, écartée, objectif ; les raisons deviennent des propositions « PJ » sur les photos reliées, avec la marque que le tri porte (jamais celle de la raison)",
    b.magazine.tri?.choisies.length === 6 && b.magazine.tri.ecartees.join() === "loc-0006" && b.magazine.tri.visees === 24 && marqueDe(b.magazine, "loc-0000") === "choisie" && marqueDe(b.magazine, "loc-0006") === "ecartee"
      && Object.keys(b.propositions).sort().join() === "loc-0000,loc-0001,loc-0006" && b.propositions["loc-0006"].marque === "ecartee" && b.propositions["loc-0006"].regle === "PJ"
      && b.propositions["loc-0000"].marque === "choisie" && /lumière/.test(b.propositions["loc-0000"].raison) && O.motProposition(b.propositions["loc-0006"]) === "premier jet"
      && O.motProposition({ regle: "A10" }) === "pré-tri");

  /* les photos qui ne trouvent pas leur photo : listées, jamais perdues, rien ne casse */
  const sans = importees(["IMG_0101.JPG", "IMG_0103.JPG", "IMG_0104.JPG", "IMG_0106.JPG", "IMG_9999.JPG"]);
  const catSans = new Map(sans.map((p) => [p.id, p]));
  const bm = O.appliquerPremierJet(jet, courant, catSans);
  ok("premier jet : les photos sans photo importée du même nom sont LISTÉES par leur nom de fichier (IMG_0102, 0105, 0107), restent posées « indisponibles » sous un identifiant `jet:…`, sans toucher au catalogue ; le magazine reste valide ; 4 reliées sur 7",
    bm.reliees === 4 && bm.total === 7 && bm.manquantes.map((x) => x.nom).sort().join() === "IMG_0102.JPG,IMG_0105.JPG,IMG_0107.JPG" && bm.manquantes.every((x) => x.id.startsWith(O.PREFIXE_ABSENTE) && !catSans.has(x.id))
      && contenuValide(bm.magazine) && O.photosIndisponibles(bm.magazine, catSans as never).sort().join() === "jet:p002,jet:p005"
      && bm.magazine.planches[1].double?.photos[0].photoId === "jet:p002" && bm.refus === null);
  ok("premier jet : le tri ne garde que les photos RECONNUES (une photo introuvable n'est ni gardée ni écartée à sa place), sans doublon ni recouvrement ; leurs raisons ne sont pas écrites ; les étiquettes restent des gardées",
    bm.magazine.tri?.choisies.join() === "loc-0000,loc-0001,loc-0002,loc-0003" && bm.magazine.tri.ecartees.length === 0 && !JSON.stringify(bm.magazine.tri).includes("jet:")
      && Object.keys(bm.propositions).join() === "loc-0000" && contenuValide(bm.magazine));
  ok("premier jet : aucune photo importée ne correspond : tout est listé, rien ne casse, le magazine reste valide et sans tri ; un catalogue vide de même",
    (() => {
      const nul = O.appliquerPremierJet(jet, courant, new Map());
      return nul.reliees === 0 && nul.total === 7 && nul.manquantes.length === 7 && contenuValide(nul.magazine) && nul.magazine.tri?.choisies.length === 0 && nul.magazine.planches.length === 3 && nul.refus === null;
    })());
  ok("premier jet : deux photos importées de même nom : la PREMIÈRE du catalogue est prise et le nom est signalé ; deux photos du fichier qui n'en font qu'une sur la même planche : refus en une phrase, rien n'est chargé",
    (() => {
      const dbl = importees(["IMG_0101.JPG", "IMG_0101.JPG", "IMG_0102.JPG", "IMG_0103.JPG", "IMG_0104.JPG", "IMG_0105.JPG", "IMG_0106.JPG", "IMG_0107.JPG"]);
      const r = O.appliquerPremierJet(jet, courant, new Map(dbl.map((p) => [p.id, p])));
      const fusion = clone(exemple);
      fusion.photos.p003 = "IMG_0102.JPG";
      const lu = O.lirePremierJet(fusion);
      const r2 = lu.ok ? O.appliquerPremierJet(lu.jet, courant, catTous) : null;
      return r.ambigues.join() === "IMG_0101.JPG" && r.magazine.planches[0].droite?.photos[0].photoId === "loc-0000" && !!r2 && !!r2.refus && /deux fois sur une planche/.test(r2.refus);
    })());
  ok("premier jet : le magazine courant GARDE ce que le fichier ne porte pas (tri, style, couverture) ; un fichier sans dernière page en reçoit une vide ; les planches du fichier remplacent toujours celles du courant",
    (() => {
      const ancien = clone(exemple);
      delete (ancien.magazine as Record<string, unknown>).tri; delete (ancien.magazine as Record<string, unknown>).style; delete (ancien.magazine as Record<string, unknown>).couverture; delete (ancien.magazine as Record<string, unknown>).derniere;
      ancien.magazine.planches = ancien.magazine.planches.slice(0, 2);
      delete (ancien as Record<string, unknown>).raisons;
      const lu = O.lirePremierJet(ancien);
      if (!lu.ok) return false;
      const deja: Magazine = { ...courant, tri: { choisies: ["loc-0000"], ecartees: [], visees: 12 }, style: jet.magazine.style, couverture: { ...couvertureNeuve("CV-02"), dosMm: 3.2 } };
      const r = O.appliquerPremierJet(lu.jet, deja, catTous);
      return contenuValide(r.magazine) && r.magazine.derniere === true && r.magazine.planches.length === 3 && r.magazine.planches[2].id === "pl-fin" && O.pagesDe(r.magazine) === 4
        && r.magazine.tri === deja.tri && r.magazine.style === deja.style && r.magazine.couverture === deja.couverture && r.magazine.planches[1].double !== null
        && Object.keys(r.propositions).length === 0;
    })());

  /* les refus : une PHRASE chaque fois, jamais une exception */
  const refus = (x: unknown): string | null => { const r = O.lirePremierJet(x); return r.ok ? null : r.phrase; };
  const modif = (f: (j: typeof exemple) => void): unknown => { const j = clone(exemple); f(j); return j; };
  const cas: [string, unknown, RegExp][] = [
    ["JSON illisible", "{ pas du json", /JSON lisible/], ["un tableau", [], /objet JSON/], ["une chaîne JSON", "\"x\"", /objet JSON/], ["null", null, /objet JSON/], ["rien", undefined, /objet JSON/],
    ["format absent", modif((j) => { delete (j as Record<string, unknown>).format; }), /format/], ["autre format", modif((j) => { (j as Record<string, unknown>).format = "autre"; }), /bellajour-premier-jet/],
    ["version 2", modif((j) => { (j as Record<string, unknown>).version = 2; }), /Version 2 inconnue/], ["version absente", modif((j) => { delete (j as Record<string, unknown>).version; }), /Version absente/],
    ["champ en trop", modif((j) => { (j as Record<string, unknown>).pirate = 1; }), /« pirate »/], ["sans magazine", modif((j) => { delete (j as Record<string, unknown>).magazine; }), /pas de « magazine »/],
    ["un magazine qui n'est pas un objet", modif((j) => { (j as Record<string, unknown>).magazine = "x"; }), /pas de « magazine »/],
    ["planches cassées", modif((j) => { j.magazine.planches[0].mode = "triple"; }), /« planches » est refusé/],
    ["couverture cassée", modif((j) => { (j.magazine as Record<string, unknown>).couverture = { templateId: "CV-99" }; }), /« couverture » est refusé/],
    ["style cassé", modif((j) => { (j.magazine as Record<string, unknown>).style = { paire: "T-04" }; }), /« style » est refusé/],
    ["tri cassé", modif((j) => { (j.magazine as Record<string, unknown>).tri = { choisies: ["p001"], ecartees: ["p001"], visees: null }; }), /« tri » est refusé/],
    ["clé de magazine en trop", modif((j) => { (j.magazine as Record<string, unknown>).pirate = 1; }), /magazine sauvegardé/],
    ["dernière page cassée", modif((j) => { j.magazine.planches[2].mode = "double"; }), /refusé/],
    ["sans table des noms", modif((j) => { delete (j as Record<string, unknown>).photos; }), /table « photos »/], ["table en tableau", modif((j) => { (j as Record<string, unknown>).photos = ["a"]; }), /table « photos »/],
    ["un nom vide", modif((j) => { j.photos.p001 = "  "; }), /p001/], ["un nom qui n'est pas un texte", modif((j) => { (j.photos as Record<string, unknown>).p002 = 12; }), /p002/],
    ["un nom trop long", modif((j) => { j.photos.p001 = "x".repeat(O.NOM_FICHIER_MAX + 1); }), /p001/],
    ["une photo posée sans nom", modif((j) => { delete (j.photos as Record<string, unknown>).p004; }), /pas de nom de fichier pour p004/],
    ["une photo de la couverture sans nom", modif((j) => { delete (j.photos as Record<string, unknown>).p006; }), /p006/],
    ["des raisons qui ne sont pas un objet", modif((j) => { (j as Record<string, unknown>).raisons = "x"; }), /« raisons »/], ["une raison pour une photo inconnue", modif((j) => { j.raisons.p999 = "x"; }), /p999/],
    ["une raison vide", modif((j) => { j.raisons.p001 = ""; }), /p001/], ["une raison trop longue", modif((j) => { j.raisons.p001 = "x".repeat(O.RAISON_MAX + 1); }), /p001/],
    ["une raison qui n'est pas un texte", modif((j) => { (j.raisons as Record<string, unknown>).p001 = 3; }), /p001/],
    ["un fichier énorme", "x".repeat(O.TAILLE_MAX_PREMIER_JET + 1), /trop gros/],
  ];
  const echecs = cas.filter(([, x, re]) => { const p = refus(x); return p === null || !re.test(p) || p.length < 12; }).map(([n]) => n);
  ok(`premier jet : ${cas.length} fichiers invalides sont REFUSÉS chacun avec une phrase qui dit la cause (JSON illisible, format, version, magazine, planches, couverture, style, tri, table des noms, raisons, taille)${echecs.length ? ` — ratés : ${echecs.join(" · ")}` : ""}`,
    echecs.length === 0);
  ok("premier jet : une raison est facultative, une table peut nommer plus de photos que le magazine n'en pose, un nom peut porter le dossier ; une raison de 120 signes passe",
    !refus(modif((j) => { delete (j as Record<string, unknown>).raisons; })) && !refus(modif((j) => { j.photos.p888 = "IMG_8888.JPG"; })) && !refus(modif((j) => { j.photos.p001 = "Lisbonne/IMG_0101.JPG"; }))
      && !refus(modif((j) => { j.raisons.p001 = "x".repeat(O.RAISON_MAX); })) && O.nomComparable("Lisbonne\\Été/IMG_0101.JPG") === "img_0101.jpg" && O.nomComparable("  IMG_0101.JPG ") === "img_0101.jpg");

  /* ── le geste : un seul pas d'historique, annulable, rétablissable, jamais une leçon ── */
  const base0 = O.creerEtat({ magazine: courant, catalogue: tous });
  const charge = O.appliquer(base0, { type: "chargerPremierJet", jet });
  ok("geste : « Premier jet » remplace les planches en UNE entrée d'historique (libellé « Premier jet chargé »), arrive sur la première planche, garde l'identité du projet ; le message propose Annuler ; les invariants tiennent",
    charge.magazine !== base0.magazine && charge.magazine.planches.length === 3 && charge.historique.passe.length === 1 && charge.historique.passe[0].libelle === "Premier jet chargé"
      && charge.plancheCourante === "pl-1" && charge.premiereId === "pl-1" && charge.prochainNumero >= 3 && charge.magazine.id === "courant-libre" && charge.message?.action?.libelle === "Annuler"
      && charge.message.texte === "Premier jet chargé" && Object.keys(charge.pretri).length === 3 && O.verifierInvariants(charge).length === 0 && contenuValide(charge.magazine));
  const annule = O.appliquer(charge, { type: "annuler" });
  const refait = O.appliquer(annule, { type: "retablir" });
  ok("geste : Annuler rend EXACTEMENT le magazine d'avant (même objet, deux planches), Rétablir le premier jet ; les invariants tiennent à chaque pas ; tout reste modifiable (poser, écrire, marquer après le chargement)",
    annule.magazine === base0.magazine && refait.magazine === charge.magazine && O.verifierInvariants(annule).length === 0 && O.verifierInvariants(refait).length === 0
      && (() => {
        let e = charge;
        e = O.appliquer(e, { type: "deposer", source: { type: "bibliotheque", ids: ["loc-0007"] }, cible: { type: "page", plancheId: "pl-fin", cote: "gauche" } });
        e = O.appliquer(e, { type: "marquer", ids: ["loc-0007"], marque: "reserve", poser: true });
        return e.historique.passe.length === 3 && e.magazine.planches[2].gauche?.photos.length === 2 && O.verifierInvariants(e).length === 0 && contenuValide(e.magazine)
          && O.appliquer(O.appliquer(e, { type: "annuler" }), { type: "annuler" }).magazine === charge.magazine;
      })());
  /* jamais une leçon : ce n'est pas un geste de l'atelier, même quand le fichier garde une photo que la lecture dit floue */
  const flou = O.creerEtat({ magazine: courant, catalogue: tous });
  const lectureFloue = { ...flou, lecture: { ...LECTURE_VIDE, floues: ["loc-0003"], mesurees: 8 } };
  const viaMarque = O.appliquer(lectureFloue, { type: "marquer", ids: ["loc-0003"], marque: "choisie", poser: true });
  const viaJet = O.appliquer(lectureFloue, { type: "chargerPremierJet", jet });
  ok("geste : le chargement ne produit AUCUNE leçon (garder une floue à la main en fait une, le fichier non), les propositions du fichier servent ensuite : renverser une marque du premier jet est une leçon « PJ »",
    viaMarque.lecons.length === 1 && viaMarque.lecons[0].type === "floue_gardee" && viaJet.lecons.length === 0
      && (() => {
        const apres = O.appliquer(viaJet, { type: "marquer", ids: ["loc-0006"], marque: "choisie", poser: true });
        return apres.lecons.length === 1 && apres.lecons[0].type === "pretri_renverse" && apres.lecons[0].regle === "PJ" && /écartée : floue/.test(apres.lecons[0].proposition) && O.leconValide(apres.lecons[0]);
      })());
  const lectureSeuleE = O.appliquer(base0, { type: "ouvrirLectureSeule", raison: "archive" });
  const doublon = O.creerEtat({ magazine: courant, catalogue: new Map([...catTous]) });
  const fusionLu = O.lirePremierJet(modif((j) => { j.photos.p003 = "IMG_0102.JPG"; }));
  ok("geste : en lecture seule, ou pour un fichier qui ne compose pas un magazine valide, rien ne change (même état, aucune entrée d'historique)",
    O.appliquer(lectureSeuleE, { type: "chargerPremierJet", jet }).magazine === lectureSeuleE.magazine && fusionLu.ok
      && O.appliquer(doublon, { type: "chargerPremierJet", jet: fusionLu.jet }).magazine === doublon.magazine && O.appliquer(doublon, { type: "chargerPremierJet", jet: fusionLu.jet }).historique.passe.length === 0);
  const eSans = O.appliquer(O.creerEtat({ magazine: courant, catalogue: catSans }), { type: "chargerPremierJet", jet });
  ok("geste : avec des photos introuvables, le message le dit (« 3 photos introuvables ») et l'écran les liste ; elles restent posées, le bandeau « photos indisponibles » les compte (jet:p002, jet:p005) ; invariants tenus",
    /3 photos introuvables/.test(eSans.message?.texte ?? "") && O.photosIndisponibles(eSans.magazine, eSans.catalogue).length === 2 && O.verifierInvariants(eSans).filter((x) => !/I8|photo|catalogue|indispon/i.test(x)).length === 0);
  /* le fichier ne touche à rien d'autre : ni photos, ni catalogue, ni sélection */
  ok("geste : le catalogue et la sélection restent tels quels (le fichier ne crée aucune photo)", charge.catalogue === base0.catalogue && charge.selection === base0.selection);
}

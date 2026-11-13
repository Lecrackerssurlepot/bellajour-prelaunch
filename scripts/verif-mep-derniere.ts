/**
 * Le harnais du LOT E (13/11), appelé par verif-atelier.ts :
 *   1. la DERNIÈRE page, seule, à gauche (nombre de pages pair) : modèle, lecture de l'ancien format, validateur, opérations,
 *      chemin de fer, IDML, PDF ;
 *   2. la TRANCHE : le dos calculé, ou saisi à la main (bornes nommées), dit à l'écran, relu par le validateur strict ;
 *   3. le PREMIER JET : un fichier JSON de magazine (produit hors de l'éditeur) chargé sur les photos importées, relié par le
 *      NOM DE FICHIER d'origine.
 */

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
}

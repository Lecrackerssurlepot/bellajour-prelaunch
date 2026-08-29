/**
 * Vérification du noyau de l'atelier — SANS base, SANS réseau, SANS Brevo.
 *
 *     npx tsx --tsconfig tsconfig.json scripts/verif-atelier.ts
 *
 * Trois modules PURS y sont mis à l'épreuve : la table des transitions (quel
 * geste est permis, et à quel prix), le tri par urgence (qui attend quoi), et
 * la règle d'envoi des mails (ce qui part, et surtout ce qui NE part pas).
 *
 * ⚠️ La section « garde-fou de chaîne » n'est pas théorique : elle reproduit
 * un dossier réellement présent en base au moment du branchement de M5→M9 —
 * état « validée », aucun mail jamais parti, jamais payé. Sans la règle, le
 * premier balayage lui envoyait « votre numéro part à l'impression ».
 *
 * Ce fichier ne remplace pas une suite de tests ; il remplace le fait de
 * n'avoir rien du tout, et il tourne en une seconde.
 */

import { preparerTransition, actionsDepuis } from "@/lib/atelier/transitions";
import { urgencePour, comparerUrgence, etapeDepot } from "@/lib/atelier/urgence";
import {
  codesPour,
  doitAutoValider,
  manquePour,
  parametresPour,
  type Envoyes,
  type NumeroPourReleve,
} from "@/lib/atelier/mails";
import { nomsDeFichiers, nomDossier } from "@/lib/atelier/lot";
import {
  CHAMPS_PAR_ECRAN,
  CHAMPS_QUESTIONNAIRE,
  normaliserTelephone,
  premierManquant,
  reponseValide,
  suggestionEmail,
} from "@/lib/atelier/questionnaire";
import { lireSignal, suitePour, typeEvenement } from "@/lib/atelier/rebond";
import { lireSuivi, nomTransporteur } from "@/lib/atelier/suivi";
import { composerBrief, NOM_BRIEF, type MatiereBrief } from "@/lib/atelier/brief";
import {
  adresseCloudprinter,
  estCleImpression,
  interpreterSignal,
  payloadCommande,
  produitPour,
} from "@/lib/atelier/impression";

let ko = 0;
const ok = (n: string, c: boolean) => {
  console.log(`${c ? "  ok " : "  KO "} ${n}`);
  if (!c) ko++;
};
const titre = (t: string) => console.log(`\n${t}`);

/* ════════════════════════════ TRANSITIONS ════════════════════════════ */

const VISUELS = { apercu_c1: "k/c1.jpg", apercu_c4: "k/c4.jpg", apercu_double: "k/d.jpg" };

titre("— le prix vient de la pagination, jamais du navigateur —");
const p34 = preparerTransition("publier_apercu", "photos_recues", { nb_pages: "34", ...VISUELS });
ok("34 pages -> p40 / 40 EUR", p34.ok && p34.resume.palier === "p40" && p34.resume.euros === 40);
const p24 = preparerTransition("publier_apercu", "photos_recues", { nb_pages: 24, ...VISUELS });
ok("24 pages -> p30 / 30 EUR", p24.ok && p24.resume.euros === 30);
const p44 = preparerTransition("publier_apercu", "photos_recues", { nb_pages: 44, ...VISUELS });
ok("44 pages -> p45 / 45 EUR", p44.ok && p44.resume.euros === 45);

titre("— ce qui doit etre REFUSE —");
const p52 = preparerTransition("publier_apercu", "photos_recues", { nb_pages: 52, ...VISUELS });
ok("52 pages refusees (hors grille)", !p52.ok && p52.erreurs[0].champ === "nb_pages");
ok("12 pages refusees", !preparerTransition("publier_apercu", "photos_recues", { nb_pages: 12, ...VISUELS }).ok);
const sansImg = preparerTransition("publier_apercu", "photos_recues", { nb_pages: 34, apercu_c1: "k/c1.jpg" });
ok("2 visuels manquants nommes un par un", !sansImg.ok && sansImg.erreurs.length === 2);
const mauvaisEtat = preparerTransition("publier_maquette", "photos_recues", { canva_url: "https://x.fr" });
ok("publier la maquette depuis l'etat 1 refuse", !mauvaisEtat.ok && mauvaisEtat.erreurs[0].champ === "etat");
ok("lien javascript: refuse", !preparerTransition("publier_maquette", "payee", { canva_url: "javascript:alert(1)" }).ok);
ok("transporteur vide refuse", !preparerTransition("marquer_expediee", "en_production", { transporteur: "  " }).ok);

titre("— les actions proposees par etat —");
ok("etat 1 -> publier l'apercu + demander plus de photos", actionsDepuis("photos_recues").length === 2);
ok("etat 3 -> publier la maquette seulement", actionsDepuis("payee").map((a) => a.cle).join() === "publier_maquette");
ok("etat 8 -> rien", actionsDepuis("livree").length === 0);

/* ═════════════════════════════ URGENCE ═════════════════════════════ */

const NOW = new Date("2026-08-24T12:00:00Z"); // un lundi
const ilYAh = (h: number) => new Date(NOW.getTime() - h * 3_600_000).toISOString();

titre("— l'urgence : qui attend quoi —");
ok("etat 1 depuis 61 h = EN RETARD (promesse 48 h)", urgencePour("photos_recues", ilYAh(61), NOW).pile === "retard");
ok("etat 1 depuis 14 h = a faire", urgencePour("photos_recues", ilYAh(14), NOW).pile === "a_faire");
ok("etat 2 depuis 8 j = chez la cliente, JAMAIS un retard", urgencePour("apercu_pret", ilYAh(200), NOW).pile === "attente_cliente");
ok("questionnaire sans depot = a relancer, pas a traiter", urgencePour("photos_recues", ilYAh(300), NOW, { depot: "vide" }).pile === "attente_cliente");

titre("— le depot inacheve (incident du 25/08) —");
ok("55 photos jamais envoyees : PAS du travail d'atelier",
   urgencePour("photos_recues", ilYAh(26), NOW, { depot: "abandonne" }).pile === "attente_cliente");
ok("55 photos jamais envoyees : AUCUN compte a rebours de 48 h",
   urgencePour("photos_recues", ilYAh(26), NOW, { depot: "abandonne" }).reste === null);
ok("le libelle dit qu'il y a des photos, pas qu'il en manque",
   urgencePour("photos_recues", ilYAh(26), NOW, { depot: "abandonne" }).libelle.includes("jamais envoyees".replace("envoyees", "envoy\u00e9es")));
ok("depot termine : la pile normale reprend",
   urgencePour("photos_recues", ilYAh(2), NOW, { depot: "termine" }).pile === "a_faire");
ok("etapeDepot : consent pose = termine", etapeDepot(true, 0) === "termine");
ok("etapeDepot : pas de consent, des photos = abandonne", etapeDepot(false, 55) === "abandonne");
ok("etapeDepot : pas de consent, pas de photo = vide", etapeDepot(null, 0) === "vide");
ok("etapeDepot : le consentement PRIME sur le compteur", etapeDepot(true, 0) === "termine");

titre("— les jours ouvres —");
// Paye jeudi 20 a 12 h. +3 jours ouvres = vendredi, lundi, MARDI 25.
ok("paye jeudi, lundi midi : PAS en retard (echeance mardi)", urgencePour("payee", ilYAh(96), NOW).pile === "a_faire");
ok("paye mardi dernier : EN RETARD lundi", urgencePour("payee", ilYAh(144), NOW).pile === "retard");

titre("— le tri —");
const lot = [
  urgencePour("livree", ilYAh(500), NOW),
  urgencePour("apercu_pret", ilYAh(100), NOW),
  urgencePour("photos_recues", ilYAh(20), NOW),
  urgencePour("payee", ilYAh(200), NOW),
  urgencePour("photos_recues", ilYAh(60), NOW),
].sort(comparerUrgence);
ok("les retards d'abord", lot[0].pile === "retard" && lot[1].pile === "retard");
ok("le plus en retard passe devant", (lot[0].reste ?? 0) < (lot[1].reste ?? 0));
ok("les termines en dernier", lot[4].pile === "termine");

/* ══════════════════════════════ MAILS ══════════════════════════════ */

const MAINTENANT = new Date("2026-09-01T12:00:00Z");
const ilYA = (j: number) => new Date(MAINTENANT.getTime() - j * 86_400_000).toISOString();
const env = (...paires: Array<[string, string]>): Envoyes => new Map(paires);

const base: NumeroPourReleve = {
  id: "x", token: "t", titre: "Un titre", prenom: "Camille", email: "c@example.com",
  nb_photos: 40, nb_pages: 34, palier: "p40", apercu_urls: { c1: "a", c4: "b", double: "c" },
  etat: "photos_recues", consent_photos: true, created_at: ilYA(10), etat_maj_le: ilYA(1),
  transporteur: null, tracking_url: null, stripe_payment_intent: null,
  retouches_demandees_le: null,
};
const d = (p: Partial<NumeroPourReleve>): NumeroPourReleve => ({ ...base, ...p });

titre("— LE GARDE-FOU DE CHAINE (le vrai danger) —");
ok("etat validee sans aucun mail : RIEN ne part", codesPour(d({ etat: "validee" }), env(), MAINTENANT).length === 0);
ok("etat validee avec M5 parti : M6 part", codesPour(d({ etat: "validee" }), env(["M5", ilYA(1)]), MAINTENANT).join() === "M6");
ok("maquette prete sans M4 : pas de M5", codesPour(d({ etat: "maquette_prete" }), env(), MAINTENANT).length === 0);
ok("maquette prete avec M4 : M5 part", codesPour(d({ etat: "maquette_prete" }), env(["M4", ilYA(2)]), MAINTENANT).join() === "M5");
ok("expediee sans M6 : pas de M7", codesPour(d({ etat: "expediee", transporteur: "Colissimo" }), env(), MAINTENANT).length === 0);
ok("expediee avec M6 : M7 part", codesPour(d({ etat: "expediee", transporteur: "Colissimo" }), env(["M6", ilYA(1)]), MAINTENANT).join() === "M7");
ok("1b sans M1 : pas de M9", codesPour(d({ etat: "photos_insuffisantes" }), env(), MAINTENANT).length === 0);
ok("1b avec M1 : M9 part", codesPour(d({ etat: "photos_insuffisantes" }), env(["M1", ilYA(3)]), MAINTENANT).join() === "M9");

titre("— M2, la seule borne de date —");
ok("0 photo cree le 21/08 (avant mise en service) : PAS de relance",
   codesPour(d({ nb_photos: 0, consent_photos: false, created_at: "2026-08-21T10:00:00Z" }), env(), MAINTENANT).length === 0);
ok("0 photo cree apres, vieux de 2 j : M2 part",
   codesPour(d({ nb_photos: 0, consent_photos: false, created_at: ilYA(2) }), env(), MAINTENANT).join() === "M2");
/* M0 est parti à la création (env), donc ce qu'on éprouve ici est bien la
   RELANCE : à 3 h, elle est peut-être encore en train de choisir ses photos. */
ok("0 photo cree il y a 3 h : trop tot pour relancer",
   codesPour(d({ nb_photos: 0, consent_photos: false, created_at: new Date(MAINTENANT.getTime() - 3 * 3_600_000).toISOString() }), env(["M0", ilYA(0)]), MAINTENANT).length === 0);
ok("... mais l'accuse, lui, est du tout de suite",
   codesPour(d({ nb_photos: 0, consent_photos: false, created_at: new Date(MAINTENANT.getTime() - 3 * 3_600_000).toISOString() }), env(), MAINTENANT).join() === "M0");

titre("— M2b, le depot reste en plan (incident du 25/08) —");
ok("55 photos, pas de consentement, 26 h : M2b et pas M2",
   codesPour(d({ nb_photos: 55, consent_photos: false, created_at: ilYA(2) }), env(), MAINTENANT).join() === "M2b");
ok("0 photo, pas de consentement, 26 h : M2 et pas M2b",
   codesPour(d({ nb_photos: 0, consent_photos: false, created_at: ilYA(2) }), env(), MAINTENANT).join() === "M2");
ok("55 photos sans consentement, 3 h : trop tot, elle est peut-etre en train",
   codesPour(d({ nb_photos: 55, consent_photos: false, created_at: new Date(MAINTENANT.getTime() - 3 * 3_600_000).toISOString() }), env(["M0", ilYA(0)]), MAINTENANT).length === 0);
ok("consentement pose : M1, et surtout AUCUNE relance",
   codesPour(d({ nb_photos: 55, consent_photos: true, created_at: ilYA(9) }), env(), MAINTENANT).join() === "M1");
ok("consentement pose mais compteur a zero : silence, pas de relance",
   codesPour(d({ nb_photos: 0, consent_photos: true, created_at: ilYA(9) }), env(), MAINTENANT).length === 0);
ok("M2b deja parti : rien",
   codesPour(d({ nb_photos: 55, consent_photos: false, created_at: ilYA(9) }), env(["M2b", ilYA(1)]), MAINTENANT).length === 0);
ok("M2b sans photo : refuse plutot que de promettre du vide",
   manquePour("M2b", d({ nb_photos: 0 })).includes("nb_photos"));
ok("M2b avec photos : complet", manquePour("M2b", d({ nb_photos: 55 })).length === 0);

titre("— M3b, le mail qui rapporte le plus —");
ok("apercu publie, M3 il y a 4 j, non paye : M3b", codesPour(d({ etat: "apercu_pret" }), env(["M3", ilYA(4)]), MAINTENANT).join() === "M3b");
ok("apercu publie, M3 il y a 4 j, PAYE : pas de relance", codesPour(d({ etat: "apercu_pret", stripe_payment_intent: "pi_1" }), env(["M3", ilYA(4)]), MAINTENANT).length === 0);
ok("apercu publie, M3 il y a 1 j : trop tot", codesPour(d({ etat: "apercu_pret" }), env(["M3", ilYA(1)]), MAINTENANT).length === 0);
ok("apercu publie, M3 jamais parti : c'est M3 qui part", codesPour(d({ etat: "apercu_pret" }), env(), MAINTENANT).join() === "M3");

titre("— M8, apres livraison —");
ok("livree il y a 4 j avec M7 : M8", codesPour(d({ etat: "livree", etat_maj_le: ilYA(4) }), env(["M7", ilYA(4)]), MAINTENANT).join() === "M8");
ok("livree aujourd'hui : on ne vend pas avant qu'elle ouvre", codesPour(d({ etat: "livree", etat_maj_le: ilYA(0) }), env(["M7", ilYA(0)]), MAINTENANT).length === 0);

titre("— jamais deux fois —");
ok("M1 deja parti : rien", codesPour(d({}), env(["M1", ilYA(1)]), MAINTENANT).length === 0);
ok("M4 ne se rattrape jamais au balayage", codesPour(d({ etat: "payee" }), env(), MAINTENANT).length === 0);

titre("— l'auto-validation a J+7 —");
ok("maquette + M5 + 8 j : valide d'office", doitAutoValider(d({ etat: "maquette_prete", etat_maj_le: ilYA(8) }), env(["M5", ilYA(8)]), MAINTENANT));
ok("maquette + M5 + 5 j : elle a encore le temps", !doitAutoValider(d({ etat: "maquette_prete", etat_maj_le: ilYA(5) }), env(["M5", ilYA(5)]), MAINTENANT));
ok("maquette SANS M5 + 30 j : on n'imprime PAS en silence", !doitAutoValider(d({ etat: "maquette_prete", etat_maj_le: ilYA(30) }), env(), MAINTENANT));

titre("— l'apercu a plat (T2-2) —");
const pPlat = preparerTransition("publier_apercu", "photos_recues", {
  nb_pages: 34, apercu_plat: "k/plat.jpg", apercu_double: "k/d.jpg",
});
ok("plat + double : accepte, deux cles en base",
   pPlat.ok && JSON.stringify(pPlat.patch.apercu_urls) === JSON.stringify({ plat: "k/plat.jpg", double: "k/d.jpg" }));
ok("plat sans double : refuse",
   !preparerTransition("publier_apercu", "photos_recues", { nb_pages: 34, apercu_plat: "k/plat.jpg" }).ok);
const pTrio = preparerTransition("publier_apercu", "photos_recues", { nb_pages: 34, ...VISUELS });
ok("le trio historique reste accepte (correction d'anciens dossiers)",
   pTrio.ok && JSON.stringify(pTrio.patch.apercu_urls) === JSON.stringify({ c1: "k/c1.jpg", c4: "k/c4.jpg", double: "k/d.jpg" }));
const pMixte = preparerTransition("publier_apercu", "photos_recues", {
  nb_pages: 34, apercu_plat: "k/plat.jpg", apercu_double: "k/d.jpg", ...({ apercu_c1: "k/c1.jpg" }),
});
ok("plat fourni : c1 est ignore, jamais de melange des deux formats",
   pMixte.ok && JSON.stringify(pMixte.patch.apercu_urls) === JSON.stringify({ plat: "k/plat.jpg", double: "k/d.jpg" }));

titre("— le mot de l'atelier (T2-3) —");
const avecMot = preparerTransition("photos_insuffisantes", "photos_recues", { mot: "Trop sombres pour l'impression." });
ok("un mot saisi part en params.MOT, jamais en patch",
   avecMot.ok && avecMot.params?.MOT === "Trop sombres pour l'impression." && !("mot" in avecMot.patch));
const sansMot = preparerTransition("photos_insuffisantes", "photos_recues", {});
ok("sans mot : pas de params", sansMot.ok && sansMot.params === undefined);
const motVide = preparerTransition("photos_insuffisantes", "photos_recues", { mot: "   " });
ok("des espaces seuls ne sont pas un mot", motVide.ok && motVide.params === undefined);
ok("le mot ne fuit pas sur une autre action",
   (() => { const p = preparerTransition("publier_maquette", "payee", { canva_url: "https://www.canva.com/x", mot: "coucou" }); return p.ok && p.params === undefined; })());
ok("M9 declare MOT vide par defaut (verif-mails-brevo reste juste)",
   parametresPour("M9", d({})).MOT === "");

titre("— retouches demandees (T2-13) —");
ok("maquette + M5 + 8 j + retouches : SUSPENDU, on n'imprime pas par-dessus",
   !doitAutoValider(d({ etat: "maquette_prete", etat_maj_le: ilYA(8), retouches_demandees_le: ilYA(3) }), env(["M5", ilYA(8)]), MAINTENANT));
ok("meme dossier sans retouches : valide d'office (temoin)",
   doitAutoValider(d({ etat: "maquette_prete", etat_maj_le: ilYA(8), retouches_demandees_le: null }), env(["M5", ilYA(8)]), MAINTENANT));
ok("retouches demandees : le dossier remonte dans A FAIRE",
   urgencePour("maquette_prete", ilYAh(50), NOW, { retouches: true }).pile === "a_faire");
ok("retouches demandees : pas de compte a rebours, le libelle dit quoi",
   urgencePour("maquette_prete", ilYAh(50), NOW, { retouches: true }).reste === null
   && urgencePour("maquette_prete", ilYAh(50), NOW, { retouches: true }).libelle.includes("retouches"));
ok("retouches passent devant un a-faire confortable",
   urgencePour("maquette_prete", ilYAh(5), NOW, { retouches: true }).rang
   < urgencePour("photos_recues", ilYAh(2), NOW).rang);
ok("sans l'option : l'etat 4 reste chez la cliente (temoin)",
   urgencePour("maquette_prete", ilYAh(50), NOW).pile === "attente_cliente");
const republi = preparerTransition("publier_maquette", "maquette_prete", { canva_url: "https://www.canva.com/x" });
ok("republier la maquette depuis l'etat 4 : accepte",
   republi.ok);
ok("republier leve la suspension dans le patch",
   republi.ok && republi.patch.retouches_demandees_le === null && "retouches_demandees_le" in republi.patch);
const premierePubli = preparerTransition("publier_maquette", "payee", { canva_url: "https://www.canva.com/x" });
ok("premiere publication : leve aussi la suspension (sans danger)",
   premierePubli.ok && premierePubli.patch.retouches_demandees_le === null);
ok("publier la maquette depuis l'etat 2 : toujours refuse",
   !preparerTransition("publier_maquette", "apercu_pret", { canva_url: "https://www.canva.com/x" }).ok);

titre("— ce qui manque pour envoyer —");
ok("M7 sans transporteur : signale", manquePour("M7", d({ transporteur: null })).includes("transporteur"));
ok("M7 avec transporteur : complet", manquePour("M7", d({ transporteur: "Colissimo" })).length === 0);
ok("M5 sans pagination : signale", manquePour("M5", d({ nb_pages: null })).includes("nb_pages"));
ok("M2 sans pagination : normal, il n'en parle pas", manquePour("M2", d({ nb_pages: null, palier: null })).length === 0);

/* ═══════════════════════ LE LOT ET LE BRIEF ═══════════════════════ */

titre("— le lot partiel (T2-5) —");
/* La route calcule les noms sur le lot COMPLET puis filtre : un sous-ensemble
   garde la numerotation d'origine et COMPLETE le dossier deja telecharge.
   Nommer apres filtrage renumeroterait a 01- et melangerait tout. */
const lotComplet = nomsDeFichiers([{ nom: "a.jpg" }, { nom: "b.jpg" }, { nom: "c.jpg" }]);
ok("nommer PUIS filtrer garde le rang d'origine (03- pour la troisieme)",
   lotComplet[2] === "03-c.jpg");
ok("filtrer puis nommer renumeroterait (la preuve du danger)",
   nomsDeFichiers([{ nom: "c.jpg" }])[0] === "01-c.jpg");

titre("— les noms de fichiers d'un lot —");
const nomsSimples = nomsDeFichiers([{ nom: "IMG_988.jpg" }, { nom: "IMG_4207.jpg" }]);
ok("l'ordre du depot est prefixe, pas l'ordre alphabetique",
   nomsSimples[0] === "01-IMG_988.jpg" && nomsSimples[1] === "02-IMG_4207.jpg");
ok("largeur du prefixe suivant la taille du lot",
   nomsDeFichiers(Array.from({ length: 120 }, () => ({ nom: "a.jpg" })))[0] === "001-a.jpg");
const doublons = nomsDeFichiers([{ nom: "photo.jpg" }, { nom: "photo.jpg" }]);
ok("deux noms d'origine identiques ne s'ecrasent pas",
   doublons[0] !== doublons[1] && new Set(doublons).size === 2);
ok("nom absent : un nom quand meme", nomsDeFichiers([{ nom: null }])[0] === "01-photo-1");
ok("une barre oblique ne cree pas de sous-dossier", !nomsDeFichiers([{ nom: "ete/2026.jpg" }])[0].includes("/"));
ok("le nom du brief est reserve", nomsDeFichiers([{ nom: NOM_BRIEF }])[0] !== NOM_BRIEF);
ok("le dossier porte la cliente puis le titre",
   nomDossier("Camille", "Seville, dix jours", "abcdef0123") === "Camille - Seville, dix jours");
ok("un titre a rallonge ne fabrique pas un dossier illisible",
   nomDossier("Camille", "x".repeat(200), "abcdef0123").length < 110);
ok("sans prenom : le titre suffit", nomDossier(null, "Nos dimanches", "abcdef0123") === "Nos dimanches");
ok("sans rien : le token identifie quand meme", nomDossier(null, null, "abcdef0123") === "numero (abcdef)");
ok("une barre oblique dans le titre ne cree pas de sous-dossier",
   !nomDossier("Camille", "ete 2026/2027", "abcdef0123").includes("/"));

titre("— le brief qui part avec les photos —");
const MATIERE: MatiereBrief = {
  titre: "Seville, dix jours",
  prenom: "Camille",
  email: "camille@exemple.fr",
  token: "abcdef0123456789",
  libelleEtat: "Photos recues",
  nbPhotos: 41,
  nbPages: 34,
  palier: "p40",
  euros: 40,
  createdAt: "2026-08-12T09:00:00.000Z",
  occasion: "Un anniversaire",
  histoire: "On a marche des kilometres dans Triana.",
  canvaTravail: "https://canva.com/design/interne",
  notes: [
    { prenom: "Louis", texte: "Deux enfants, n'en faire disparaitre aucun.", createdAt: "2026-08-14T10:00:00.000Z" },
    { prenom: "Mathias", texte: "Ton chaud, eviter les cadres blancs.", createdAt: "2026-08-13T10:00:00.000Z" },
  ],
};
const BRIEF = composerBrief(MATIERE, new Date("2026-08-25T08:00:00.000Z"));
ok("le brief porte l'histoire", BRIEF.includes("Triana"));
ok("le brief porte les DEUX notes", BRIEF.includes("cadres blancs") && BRIEF.includes("disparaitre"));
ok("le carnet est chronologique, la plus ancienne d'abord",
   BRIEF.indexOf("cadres blancs") < BRIEF.indexOf("disparaitre"));
ok("le brief porte le lien Canva de travail", BRIEF.includes("canva.com/design/interne"));
ok("aucun tiret cadratin (consigne de la maison)", !/[\u2013\u2014]/.test(BRIEF));
ok("aucune ligne au dela de 80 colonnes sauf les liens",
   BRIEF.split("\n").every((l) => l.length <= 80 || l.includes("http")));
const VIDE = composerBrief({ ...MATIERE, occasion: null, histoire: null, notes: [] }, new Date("2026-08-25T08:00:00.000Z"));
ok("un dossier sans matiere le DIT au lieu de rendre un fichier vide",
   VIDE.includes("Rien de not\u00e9.") && VIDE.includes("Elle n'a rien \u00e9crit."));

/* ════════════════════════════ IMPRESSION ════════════════════════════ */

titre("— la reference produit se deduit de la pagination —");
ok("20 pages -> agrafe", produitPour(20)?.produit === "magazine_sas_a4_p_fc");
ok("24 pages -> dos carre", produitPour(24)?.produit === "magazine_pb_a4_p_fc");
ok("50 pages -> dos carre", produitPour(50)?.produit === "magazine_pb_a4_p_fc");
ok("18 pages -> aucun produit", produitPour(18) === null);
ok("52 pages -> aucun produit", produitPour(52) === null);
ok("pagination absente -> aucun produit", produitPour(null) === null);

titre("— la saisie d'impression —");
ok("l'agrafe exige UN fichier product", produitPour(20)!.fichiers.join(",") === "product");
ok("le dos carre exige couverture ET bloc", produitPour(32)!.fichiers.join(",") === "cover,book");
const sansPdf = preparerTransition("envoyer_impression", "validee", {});
ok("sans PDF refuse, champ nomme", !sansPdf.ok && sansPdf.erreurs[0].champ === "pdf_produit");
ok("un lien externe refuse (pas de md5 possible)",
   !preparerTransition("envoyer_impression", "validee", { pdf_produit: "https://x.fr/a.pdf" }).ok);
const avecPdf = preparerTransition("envoyer_impression", "validee", { pdf_produit: "numeros/x/impression/produit-a1.pdf" });
ok("une cle de coffre acceptee, patch pose sous son type Cloudprinter",
   avecPdf.ok && (avecPdf.patch.impression_fichiers as { product: string }).product === "numeros/x/impression/produit-a1.pdf");
const deuxPdf = preparerTransition("envoyer_impression", "validee", {
  pdf_couverture: "numeros/x/impression/couverture-a1.pdf",
  pdf_interieur: "numeros/x/impression/interieur-b2.pdf",
});
ok("le duo couverture + bloc du dos carre est patche sous cover et book",
   deuxPdf.ok
     && (deuxPdf.patch.impression_fichiers as { cover: string }).cover === "numeros/x/impression/couverture-a1.pdf"
     && (deuxPdf.patch.impression_fichiers as { book: string }).book === "numeros/x/impression/interieur-b2.pdf");
ok("estCleImpression refuse les remontees de chemin", !estCleImpression("../autre/objet.pdf"));

titre("— l'adresse Stripe devient une adresse Cloudprinter —");
const ADRESSE_STRIPE = {
  name: "Marie Dupont",
  address: { line1: "12 rue des Lilas", line2: null, city: "Paris", postal_code: "75011", state: null, country: "fr" },
};
const adr = adresseCloudprinter(ADRESSE_STRIPE, "marie@exemple.fr", "06 12 34 56 78");
ok("adresse complete acceptee", adr.ok);
ok("le nom est decoupe prenom / nom", adr.ok && adr.adresse.firstname === "Marie" && adr.adresse.lastname === "Dupont");
ok("le pays est normalise en majuscules", adr.ok && adr.adresse.country === "FR");
ok("le telephone du dossier part, nettoye (exige par leur API)",
   adr.ok && adr.adresse.phone === "0612345678");
const adrSansTel = adresseCloudprinter(ADRESSE_STRIPE, "marie@exemple.fr");
ok("sans telephone au dossier : repli sur le numero de la maison, jamais un refus",
   adrSansTel.ok && typeof adrSansTel.adresse.phone === "string" && adrSansTel.adresse.phone.length > 5);
const adrMono = adresseCloudprinter({ name: "Madonna", address: { line1: "1 rue X", city: "Lille", postal_code: "59000", country: "FR" } }, "m@x.fr");
ok("un nom d'un seul mot sert deux fois", adrMono.ok && adrMono.adresse.lastname === "Madonna");
const adrIncomplete = adresseCloudprinter({ name: "Marie", address: { line1: "12 rue X", country: "FR" } }, "m@x.fr");
ok("les manques sont nommes un par un",
   !adrIncomplete.ok && adrIncomplete.manque.includes("code postal") && adrIncomplete.manque.includes("ville"));
ok("une adresse vide dit tout ce qui manque", !adresseCloudprinter(null, "").ok);

titre("— le corps de la commande orders/add —");
const ADR_OK = (adr as { ok: true; adresse: import("@/lib/atelier/impression").AdresseCp }).adresse;
const MD5 = "d41d8cd98f00b204e9800998ecf8427e";
const CORPS = payloadCommande({
  reference: "0b0e8400-e29b-41d4-a716-446655440000",
  emailContact: "contact@bellajour.com",
  adresse: ADR_OK,
  produit: produitPour(32)!,
  pages: 32,
  fichiers: {
    cover: { url: "https://coffre.example/c.pdf?sig", md5: MD5 },
    book: { url: "https://coffre.example/b.pdf?sig", md5: MD5 },
  },
  titre: "Seville, aout 2026",
});
ok("un seul item, count en chaine", CORPS.items.length === 1 && CORPS.items[0].count === "1");
ok("le dos carre envoie DEUX fichiers, cover puis book",
   CORPS.items[0].files.map((f) => f.type).join(",") === "cover,book");
ok("le md5 part avec chaque fichier", CORPS.items[0].files.every((f) => f.md5sum.length === 32));
ok("l'option total_pages porte la pagination",
   CORPS.items[0].options.some((o) => o.type === "total_pages" && o.count === "32"));
ok("le papier interieur est compte en pages",
   CORPS.items[0].options.some((o) => o.type.startsWith("pageblock_") && o.count === "32"));
ok("l'adresse est de type delivery", CORPS.addresses[0].type === "delivery");
ok("la cle API n'est PAS dans le payload", !("apikey" in CORPS));
const CORPS_SAS = payloadCommande({
  reference: "0b0e8400-e29b-41d4-a716-446655440000",
  emailContact: "contact@bellajour.com",
  adresse: ADR_OK,
  produit: produitPour(20)!,
  pages: 20,
  fichiers: { product: { url: "https://coffre.example/p.pdf?sig", md5: MD5 } },
});
ok("l'agrafe envoie UN fichier de type product",
   CORPS_SAS.items[0].files.length === 1 && CORPS_SAS.items[0].files[0].type === "product");
let jete = false;
try {
  payloadCommande({
    reference: "x", emailContact: "c@b.com", adresse: ADR_OK,
    produit: produitPour(32)!, pages: 32,
    fichiers: { cover: { url: "https://x/c.pdf", md5: MD5 } },
  });
} catch { jete = true; }
ok("un fichier requis manquant est une erreur franche, jamais une commande partielle", jete);

titre("— les signaux CloudSignal —");
ok("ItemShipped expedie", interpreterSignal("ItemShipped").effet === "expedier");
ok("ItemError alerte sans changer l'etat", interpreterSignal("ItemError").effet === "alerte");
ok("ItemCanceled alerte", interpreterSignal("ItemCanceled").effet === "alerte");
ok("CloudprinterOrderCanceled alerte", interpreterSignal("CloudprinterOrderCanceled").effet === "alerte");
ok("ItemDeliveryFailed alerte", interpreterSignal("ItemDeliveryFailed").effet === "alerte");
ok("ItemPacked se journalise seulement", interpreterSignal("ItemPacked").effet === "journal");
ok("ItemDeliveryCompleted ne livre PAS tout seul (M8 reste un geste de l'atelier)",
   interpreterSignal("ItemDeliveryCompleted").effet === "journal");
ok("un type inconnu tombe au journal, jamais en erreur", interpreterSignal("ItemFutur2027").effet === "journal");

titre("— le suivi du colis : un numero doit devenir un lien —");
const dpd = lireSuivi("dpd_france", "250A4B7C1234");
ok("dpd_france se lit DPD", dpd.transporteur === "DPD");
ok("le numero est CONSERVE", dpd.code === "250A4B7C1234");
ok("le numero devient un lien", dpd.url === "https://www.dpd.fr/trace/250A4B7C1234");
const colis = lireSuivi("Colissimo suivi", "TEST123456789FR");
ok("colissimo passe par La Poste",
   colis.url === "https://www.laposte.fr/outils/suivre-vos-envois?code=TEST123456789FR");
const urlDonnee = lireSuivi("chronopost", "https://www.chronopost.fr/xyz");
ok("une adresse donnee est prise telle quelle", urlDonnee.url === "https://www.chronopost.fr/xyz");
const inconnu = lireSuivi("transporteur_local_38", "ABC123");
ok("transporteur inconnu : AUCUN lien invente", inconnu.url === null);
ok("transporteur inconnu : le numero reste lisible", inconnu.code === "ABC123");
ok("un transporteur vide ne laisse jamais M7 sans mot", nomTransporteur("") === "Transporteur");
ok("le numero est nettoye avant d'entrer dans l'URL",
   lireSuivi("ups", " 1Z 999 AA1 ").code === "1Z999AA1");

titre("— l'expedition a la main accepte les DEUX formes —");
const parNumero = preparerTransition("marquer_expediee", "en_production", {
  transporteur: "Colissimo", tracking_url: "6A123456789FR",
});
ok("un numero seul suffit et produit un lien",
   parNumero.ok && parNumero.patch.tracking_url === "https://www.laposte.fr/outils/suivre-vos-envois?code=6A123456789FR");
ok("le numero est ecrit a part", parNumero.ok && parNumero.patch.tracking_code === "6A123456789FR");
ok("le transporteur reste ecrit comme l'atelier l'a tape",
   parNumero.ok && parNumero.patch.transporteur === "Colissimo");
ok("un javascript: reste refuse",
   !preparerTransition("marquer_expediee", "en_production", {
     transporteur: "X", tracking_url: "javascript:alert(1)",
   }).ok);

/* ════════════════════ M0 : L'ACCUSÉ, ET SES BORNES ════════════════════
   M0 part de la route de création, dans la seconde. Ici on éprouve son
   FILET : ce que la relève rattrape, et surtout ce qu'elle NE rattrape pas.
   Réutilise `d()`, `env()` et `MAINTENANT` déclarés plus haut. */

const H = 3_600_000;
/* Un dépôt jamais commencé, ouvert il y a `heures` heures. */
const ouvert = (heures: number): NumeroPourReleve =>
  d({
    etat: "photos_recues", consent_photos: false, nb_photos: 0,
    created_at: new Date(MAINTENANT.getTime() - heures * H).toISOString(),
    etat_maj_le: new Date(MAINTENANT.getTime() - heures * H).toISOString(),
  });

titre("— M0 : le filet rattrape un envoi immediat rate —");
ok("dossier de 2 h sans M0 : la releve l'envoie",
   codesPour(ouvert(2), env(), MAINTENANT).includes("M0"));
ok("M0 deja parti : JAMAIS deux fois",
   !codesPour(ouvert(2), env(["M0", ilYA(0)]), MAINTENANT).includes("M0"));

titre("— M0 ne double JAMAIS M2 —");
const dusVieux = codesPour(ouvert(30), env(), MAINTENANT);
ok("passe le seuil : M2 seul, pas d'accuse tardif",
   dusVieux.includes("M2") && !dusVieux.includes("M0"));

/* ⚠️ LE PIEGE DU `break`. Le filet M0 se termine par un `break` : si sa borne
   depassait le seuil de relance, un dossier situe ENTRE les deux partirait
   avec M0 et n'atteindrait jamais M2. Ces trois lignes verrouillent la
   coincidence exacte des deux bornes, seuil de 12 h compris. */
titre("— aucun trou entre l'accuse et la relance (seuil 12 h) —");
ok("11 h : l'accuse, pas encore la relance",
   codesPour(ouvert(11), env(), MAINTENANT).join() === "M0");
ok("13 h sans M0 : la RELANCE, et le filet ne l'avale pas",
   codesPour(ouvert(13), env(), MAINTENANT).join() === "M2");
ok("13 h avec M0 deja parti : la relance aussi",
   codesPour(ouvert(13), env(["M0", ilYA(0)]), MAINTENANT).join() === "M2");
ok("13 h, 55 photos jamais envoyees : M2b, jamais M0",
   codesPour(d({ etat: "photos_recues", consent_photos: false, nb_photos: 55,
     created_at: new Date(MAINTENANT.getTime() - 13 * H).toISOString(),
     etat_maj_le: new Date(MAINTENANT.getTime() - 13 * H).toISOString() }),
     env(), MAINTENANT).join() === "M2b");
ok("le dossier reel du 27/08 (45 h) serait relance des le premier balayage",
   codesPour(ouvert(45), env(), MAINTENANT).join() === "M2");
ok("un dossier ANTERIEUR au branchement ne recoit aucun accuse retroactif",
   !codesPour(ouvert(9 * 24), env(), MAINTENANT).includes("M0"));

titre("— M0 ne parle jamais a qui a fini —");
const dusFini = codesPour(
  d({ etat: "photos_recues", consent_photos: true, nb_photos: 49, created_at: ilYA(0) }),
  env(), MAINTENANT,
);
ok("depot termine : M1, et surtout pas M0",
   dusFini.includes("M1") && !dusFini.includes("M0"));

titre("— M0 n'annonce aucun chiffre —");
const paramsM0 = parametresPour("M0", ouvert(1));
ok("trois variables, et pas une de plus",
   Object.keys(paramsM0).sort().join() === "LIEN,PRENOM,TITRE");
ok("le lien est celui du numero", String(paramsM0.LIEN).endsWith("/numero/t"));
ok("rien ne manque pour l'envoyer", manquePour("M0", ouvert(1)).length === 0);
ok("sans adresse, M0 est REFUSE",
   manquePour("M0", { ...ouvert(1), email: null }).includes("email"));

/* ═════════════════════ QUESTIONNAIRE : PLUS DE TROU ═════════════════════
   Reproduit le dossier reellement arrive le 27/08 : occasion et histoire
   remplies, AUCUN titre, aucune photo. Il entrait en base sans un mot. */

titre("— le dossier du 27/08 ne passerait plus —");
const flore = {
  occasion: "Un voyage",
  histoire: "Un road trip au Maroc avec Mathilde. Des paysages de dingue.",
  titre: "",
  prenom: "Flore",
  email: "flore@example.com",
  telephone: "0769710686",
};
ok("sans titre : REFUSE, et on dit lequel",
   premierManquant(CHAMPS_QUESTIONNAIRE, (c) => flore[c]) === "titre");
ok("avec un titre : accepte",
   premierManquant(CHAMPS_QUESTIONNAIRE, (c) => ({ ...flore, titre: "Maroc" })[c]) === null);

titre("— le PREMIER champ fautif, pas un bilan —");
ok("occasion avant histoire",
   premierManquant(CHAMPS_QUESTIONNAIRE, () => "") === "occasion");
ok("chaque ecran connait ses champs",
   CHAMPS_PAR_ECRAN[1].length === 1 && CHAMPS_PAR_ECRAN[4].length === 3);
ok("les six champs sont couverts par les quatre ecrans",
   Object.values(CHAMPS_PAR_ECRAN).flat().sort().join() ===
     [...CHAMPS_QUESTIONNAIRE].sort().join());

titre("— l'histoire : un brief court passe, un mot jete non —");
ok("« ok » refuse", !reponseValide("histoire", "ok"));
ok("le brief REEL du 25/08 passe (35 caracteres)",
   reponseValide("histoire", "On doit ressentir les 9 ans d'amour"));
ok("les espaces ne comptent pas pour du texte",
   !reponseValide("histoire", "                              "));

titre("— le telephone, exige mais pas tatillon —");
ok("format francais espace", reponseValide("telephone", "07 69 71 06 86"));
ok("format international", reponseValide("telephone", "+33 7 69 71 06 86"));
ok("points et tirets", reponseValide("telephone", "07.69.71-06.86"));
ok("vide : REFUSE", !reponseValide("telephone", ""));
ok("trois chiffres : REFUSE", !reponseValide("telephone", "123"));
ok("un texte : REFUSE", !reponseValide("telephone", "je n'en ai pas"));
ok("normalise pour Cloudprinter",
   normaliserTelephone("+33 (0)7 69.71-06 86") === "+330769710686");
ok("le + de tete est conserve, et lui seul",
   normaliserTelephone("00 351 912 345 678") === "00351912345678");

titre("— l'email : la meme regle des deux cotes —");
ok("adresse normale", reponseValide("email", "flore@example.com"));
ok("sans arobase : REFUSE", !reponseValide("email", "flore.example.com"));
ok("sans domaine : REFUSE", !reponseValide("email", "flore@example"));

/* ═══════════════ LES REBONDS : CE QU'ON ECOUTE, ET CE QU'ON JETTE ═══════
   Le seul echec du parcours qui ne laissait aucune trace. */

titre("— les trois facons dont une adresse est morte —");
ok("hard_bounce (payload)", suitePour("hard_bounce") === "rebond");
ok("hardBounce (configuration)", suitePour("hardBounce") === "rebond");
ok("blocked : le plus sournois, aucune tentative", suitePour("blocked") === "rebond");
ok("invalid_email", suitePour("invalid_email") === "rebond");

titre("— ce qui n'est PAS un rebond —");
ok("spam : elle a RECU, c'est autre chose", suitePour("spam") === "plainte");
ok("soft_bounce : temporaire, Brevo reessaie", suitePour("soft_bounce") === "ignore");
ok("deferred : temporaire aussi", suitePour("deferred") === "ignore");
ok("delivered : rien a ecrire", suitePour("delivered") === "ignore");
ok("opened / click : rien a ecrire", suitePour("click") === "ignore");
ok("un evenement inconnu ne declenche RIEN", suitePour("chose_nouvelle") === "ignore");

titre("— le type de journal suit la decision —");
ok("rebond -> email_rebond", typeEvenement("rebond") === "email_rebond");
ok("plainte -> email_plainte", typeEvenement("plainte") === "email_plainte");
ok("ignore -> aucune ecriture", typeEvenement("ignore") === null);

titre("— lecture du signal Brevo —");
const sig = lireSignal({
  event: "hard_bounce", email: "  Marie@Gmial.COM ", reason: "unknown user",
  subject: "Votre numero est ouvert", "message-id": "<abc@brevo>",
});
ok("l'adresse est normalisee", sig?.email === "marie@gmial.com");
ok("le motif est conserve tel quel", sig?.raison === "unknown user");
ok("le message-id a tiret est lu", sig?.messageId === "<abc@brevo>");
ok("message_id a souligne est lu aussi",
   lireSignal({ event: "blocked", email: "a@b.co", message_id: "<x>" })?.messageId === "<x>");
ok("sans evenement : refuse", lireSignal({ email: "a@b.co" }) === null);
ok("sans adresse : refuse", lireSignal({ event: "hard_bounce" }) === null);
ok("un motif absent n'est pas invente", lireSignal({ event: "blocked", email: "a@b.co" })?.raison === null);

/* ═════════════ LA FAUTE DE FRAPPE, ATTRAPEE AVANT L'ENVOI ══════════════
   ⚠️ Les faux positifs comptent PLUS que les vrais : suggerer de corriger
   une adresse qui marchait invite la cliente a la casser. */

titre("— les fautes qu'on attrape —");
ok("gmial.com", suggestionEmail("marie@gmial.com") === "marie@gmail.com");
ok("gmai.com", suggestionEmail("marie@gmai.com") === "marie@gmail.com");
ok("gmail.co", suggestionEmail("marie@gmail.co") === "marie@gmail.com");
ok("hotmial.fr", suggestionEmail("marie@hotmial.fr") === "marie@hotmail.fr");
ok("outlok.com", suggestionEmail("marie@outlok.com") === "marie@outlook.com");
ok("la casse et les espaces ne genent pas",
   suggestionEmail("  Marie@GMIAL.com ") === "marie@gmail.com");

titre("— ce qu'on ne touche SURTOUT PAS —");
ok("une adresse juste : aucune suggestion", suggestionEmail("marie@gmail.com") === null);
ok("free.fr n'est pas « corrige » en live.fr", suggestionEmail("marie@free.fr") === null);
ok("un domaine d'entreprise est laisse tranquille",
   suggestionEmail("m.durand@bellajour.com") === null);
ok("un domaine rare est laisse tranquille", suggestionEmail("x@laboite-a-outils.coop") === null);
ok("deux fautes : on n'invente pas", suggestionEmail("marie@gmiil.co") === null);
ok("sans arobase : rien", suggestionEmail("marie.gmail.com") === null);
ok("arobase en tete : rien", suggestionEmail("@gmail.com") === null);
ok("domaine vide : rien", suggestionEmail("marie@") === null);

console.log(ko === 0 ? "\nTOUT PASSE\n" : `\n${ko} ECHEC(S)\n`);
process.exit(ko === 0 ? 0 : 1);

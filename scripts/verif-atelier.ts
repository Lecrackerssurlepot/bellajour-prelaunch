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
import { urgencePour, comparerUrgence } from "@/lib/atelier/urgence";
import {
  codesPour,
  doitAutoValider,
  manquePour,
  type Envoyes,
  type NumeroPourReleve,
} from "@/lib/atelier/mails";
import { nomsDeFichiers, nomDossier } from "@/lib/atelier/lot";
import { composerBrief, NOM_BRIEF, type MatiereBrief } from "@/lib/atelier/brief";

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
ok("questionnaire sans depot = a relancer, pas a traiter", urgencePour("photos_recues", ilYAh(300), NOW, { sansPhotos: true }).pile === "attente_cliente");

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
ok("0 photo cree il y a 3 h : trop tot",
   codesPour(d({ nb_photos: 0, consent_photos: false, created_at: new Date(MAINTENANT.getTime() - 3 * 3_600_000).toISOString() }), env(), MAINTENANT).length === 0);

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

titre("— ce qui manque pour envoyer —");
ok("M7 sans transporteur : signale", manquePour("M7", d({ transporteur: null })).includes("transporteur"));
ok("M7 avec transporteur : complet", manquePour("M7", d({ transporteur: "Colissimo" })).length === 0);
ok("M5 sans pagination : signale", manquePour("M5", d({ nb_pages: null })).includes("nb_pages"));
ok("M2 sans pagination : normal, il n'en parle pas", manquePour("M2", d({ nb_pages: null, palier: null })).length === 0);

/* ═══════════════════════ LE LOT ET LE BRIEF ═══════════════════════ */

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

console.log(ko === 0 ? "\nTOUT PASSE\n" : `\n${ko} ECHEC(S)\n`);
process.exit(ko === 0 ? 0 : 1);

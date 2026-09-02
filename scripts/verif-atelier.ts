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
import { lireDoublesBrutes, MAX_DOUBLES } from "@/lib/atelier/apercu";
import type Stripe from "stripe";
import {
  codesPour,
  doitAutoValider,
  manquePour,
  parametresPour,
  templateExiste,
  type Envoyes,
  type NumeroPourReleve,
} from "@/lib/atelier/mails";
import { estSessionAtelier, estChargeAtelier, KIND_ATELIER } from "@/lib/atelier/paiement";
import { nomsDeFichiers, nomDossier } from "@/lib/atelier/lot";
import {
  signToken,
  signTokenShort,
  signTokenConfirmation,
  verifyToken,
  verifyTokenConfirmation,
} from "@/lib/ambassadeur-token";
import {
  CHAMPS_PAR_ECRAN,
  CHAMPS_QUESTIONNAIRE,
  normaliserTelephone,
  premierManquant,
  reponseValide,
  suggestionEmail,
} from "@/lib/atelier/questionnaire";
import { lireSignal, suitePour, typeEvenement } from "@/lib/atelier/rebond";
import {
  totalPour,
  centimesPour,
  eurosPour,
  palierPourPages,
  PAYS_LIVRAISON,
  QUANTITE_MAX,
  type PalierCle,
} from "@/lib/atelier/prix";
import { raconter } from "@/lib/atelier/recit";
import {
  codeDansLeJournal,
  codesPossibles,
  creditEncoreDu,
  estCollisionDeCode,
  numeroFondatricePour,
  parametreCredit,
  CREDIT_FONDATRICE_CENTIMES,
  CREDIT_FONDATRICE_EUROS,
  type LigneWaitlist,
} from "@/lib/atelier/fondatrice";
import { lireSuivi, nomTransporteur } from "@/lib/atelier/suivi";
import { composerBrief, NOM_BRIEF, type MatiereBrief } from "@/lib/atelier/brief";
import {
  adresseCloudprinter,
  telephoneE164,
  estCleImpression,
  interpreterSignal,
  payloadCommande,
  pointsEnMm,
  produitPour,
  verdictMultiplePages,
  verdictPagesPdf,
  verdictTaillePage,
} from "@/lib/atelier/impression";
import {
  comptesAdmin,
  PRENOM_COMPTE,
  signAdminCookie,
  verifierCookieAdmin,
} from "@/lib/admin-auth";
import {
  apresEchec,
  delaiPourEchecs,
  doitJournaliser,
  estBloque,
  DELAI_MAX_MS,
  FENETRE_FREIN_MS,
  SEUIL_BLOCAGE,
  SEUIL_JOURNAL,
} from "@/lib/frein-login";
import {
  reconstruireJalons,
  dureeEtape,
  dureesEtapes,
  compterEntonnoir,
  reactiviteConversion,
  composerConstats,
  ETAPES_VIE,
  ENTONNOIR,
  type EvenementMesure,
  type Seau,
} from "@/lib/atelier/mesure";
import { estAbsenceR2 } from "@/lib/atelier/r2";
import { formaterJour } from "@/lib/atelier/dates";
import {
  ETATS_ENGAGES,
  PREAVIS_A_JOURS,
  PREAVIS_JOURS,
  RETENTION_JOURS,
  TITRE_ANONYME,
  dateDeCloture,
  doitPrevenirCloture,
  estAnonymisable,
  joursDInactivite,
  meriteUnRegardDeRetention,
  patchAnonymisation,
  preavisRespecte,
  verdictRetention,
  type NumeroPourRetention,
} from "@/lib/atelier/retention";
import { cheminPublic, MASQUE } from "@/lib/analytics/chemin";

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

/* ── apercu : 1 a 3 doubles pages, avec repli sur l'ancien format (T-089) ── */
ok("doubles : le nouveau format tableau est lu dans l'ordre",
   JSON.stringify(lireDoublesBrutes({ doubles: ["a", "b", "c"] })) === JSON.stringify(["a", "b", "c"]));
ok(`doubles : borne a ${MAX_DOUBLES} (l'admin n'en publie pas plus que ce qu'on montre)`,
   lireDoublesBrutes({ doubles: ["a", "b", "c", "d"] }).length === MAX_DOUBLES);
ok("doubles : l'ancien format `double` unique devient une liste d'un element",
   JSON.stringify(lireDoublesBrutes({ double: "x" })) === JSON.stringify(["x"]));
ok("doubles : le tableau prime sur la valeur unique",
   JSON.stringify(lireDoublesBrutes({ doubles: ["a"], double: "z" })) === JSON.stringify(["a"]));
ok("doubles : vides et non-chaines ignores, chaines rognees",
   JSON.stringify(lireDoublesBrutes({ doubles: ["a", "", 5, "  b  "] })) === JSON.stringify(["a", "b"]));
ok("doubles : rien -> liste vide",
   lireDoublesBrutes({}).length === 0 && lireDoublesBrutes({ double: "" }).length === 0);
ok("doubles : alias `double_page` accepte",
   JSON.stringify(lireDoublesBrutes({ double_page: "y" })) === JSON.stringify(["y"]));
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
  transporteur: null, tracking_url: null, tracking_code: null, stripe_payment_intent: null,
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

titre("— M7 : un numero de suivi sans URL doit quand meme se voir —");
/* Le cas reel : suivi.ts ne sait pas construire l'adresse de certains
   transporteurs (url: null). Le template ne rendait l'encart que sur SUIVI :
   la cliente recevait « confie a DPD » et RIEN a suivre. CODE_SUIVI porte le
   numero en texte ; le template l'affiche quand le lien manque. */
const m7SansUrl = parametresPour("M7", d({ transporteur: "DPD", tracking_url: null, tracking_code: "ABC123" }));
ok("sans URL, le CODE_SUIVI porte le numero", m7SansUrl.CODE_SUIVI === "ABC123");
ok("sans URL, SUIVI est vide (pas de lien invente)", m7SansUrl.SUIVI === "");
ok("le transporteur accompagne le numero", m7SansUrl.TRANSPORTEUR === "DPD");
const m7AvecUrl = parametresPour("M7", d({ transporteur: "Colissimo", tracking_url: "https://x", tracking_code: "6A1" }));
ok("avec URL, les deux voyagent (le template prefere le lien)",
   m7AvecUrl.SUIVI === "https://x" && m7AvecUrl.CODE_SUIVI === "6A1");

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

titre("— le telephone Cloudprinter passe en E.164 avec le pays (test 01/09) —");
ok("national FR -> +33, zero de tete retire", telephoneE164("0680009071", "FR") === "+33680009071");
ok("national BE -> +32", telephoneE164("0470123456", "BE") === "+32470123456");
ok("national LU -> +352 (pas de zero national a retirer)", telephoneE164("621123456", "LU") === "+352621123456");
ok("deja en +... : garde tel quel", telephoneE164("+33612345678", "FR") === "+33612345678");
ok("prefixe 00 -> +", telephoneE164("0033612345678", "FR") === "+33612345678");
ok("separateurs (espaces/points) nettoyes", telephoneE164("06 80 00 90 71", "FR") === "+33680009071");
ok("pays hors zone : on ne devine pas, on rend le national", telephoneE164("0680009071", "US") === "0680009071");
ok("numero vide -> chaine vide (le repli TELEPHONE_CONTACT joue ailleurs)", telephoneE164("", "FR") === "");
ok("adresseCloudprinter met le telephone en E.164",
   (() => { const r = adresseCloudprinter({ name: "Mathias Durand", address: { line1: "12 rue du Test", postal_code: "75001", city: "Paris", country: "FR" } }, "mdurand085@gmail.com", "0680009071");
            return r.ok && r.adresse.phone === "+33680009071"; })());

/* ─────────────────────────────────────────────────────────────────────────
   Le controle technique du PDF print-ready (route impression/controle).
   Les attendus viennent du releve products/info du 30/08/2026
   (docs/reference/SPECS-CLOUDPRINTER.md) : 210 x 297 fini + 3 mm de fond
   perdu = page PDF de 216 x 303 ; agrafe en multiples de 4 (min 8), dos
   carre en multiples de 2.
   ───────────────────────────────────────────────────────────────────────── */
titre("— le controle technique du PDF : points -> mm —");
ok("un A4 en points rend 210 x 297", pointsEnMm(595.276) === 210 && pointsEnMm(841.89) === 297);
ok("la page avec fond perdu rend 216 x 303", pointsEnMm(612.283) === 216 && pointsEnMm(858.898) === 303);
ok("arrondi au dixieme de mm", pointsEnMm(600) === 211.7);

titre("— le compte de pages face au dossier —");
ok("book a la pagination du dossier -> conforme",
   verdictPagesPdf("book", 32, 32).genre === "conforme");
const ecart = verdictPagesPdf("book", 30, 32);
ok("book en ecart le DIT avec l'attendu", ecart.genre === "ecart" && ecart.attendu === 32);
ok("product compare aussi au dossier", verdictPagesPdf("product", 24, 20).genre === "ecart");
ok("cover : constat, jamais de verdict", verdictPagesPdf("cover", 1, 32).genre === "constat");
ok("dossier sans pagination : constat", verdictPagesPdf("book", 32, null).genre === "constat");

titre("— le format de page face aux specs relevees —");
ok("216 x 303 (fini + fond perdu) -> conforme", verdictTaillePage("book", 216, 303) === "conforme");
ok("la tolerance absorbe l'arrondi d'export (0,4 mm)",
   verdictTaillePage("book", 216.4, 302.6) === "conforme");
ok("210 x 297 -> signale SANS fond perdu", verdictTaillePage("product", 210, 297) === "sans_fond_perdu");
ok("largeur bonne mais hauteur fausse -> hors format", verdictTaillePage("book", 216, 297) === "hors_format");
ok("un A5 -> hors format", verdictTaillePage("product", 148, 210) === "hors_format");
ok("cover : largeur libre (le dos), hauteur 303 -> constat",
   verdictTaillePage("cover", 450.5, 303) === "constat");
ok("cover au fini sans fond perdu -> signale", verdictTaillePage("cover", 438, 297) === "sans_fond_perdu");
ok("cover de mauvaise hauteur -> hors format", verdictTaillePage("cover", 450, 200) === "hors_format");

titre("— la regle de compte du produit —");
ok("agrafe : 20 pages (multiple de 4, >= 8) -> ok",
   verdictMultiplePages("product", 20, produitPour(20))?.ok === true);
ok("agrafe : 22 pages -> refuse (pas multiple de 4)",
   verdictMultiplePages("product", 22, produitPour(20))?.ok === false);
ok("agrafe : 4 pages -> refuse (minimum 8)",
   verdictMultiplePages("product", 4, produitPour(20))?.ok === false);
ok("dos carre : 32 pages (multiple de 2) -> ok",
   verdictMultiplePages("book", 32, produitPour(32))?.ok === true);
ok("dos carre : 33 pages -> refuse",
   verdictMultiplePages("book", 33, produitPour(32))?.ok === false);
ok("cover : aucune regle de compte", verdictMultiplePages("cover", 1, produitPour(32)) === null);
ok("produit inconnu : aucune regle", verdictMultiplePages("book", 32, null) === null);

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
ok("le telephone du dossier part en E.164 (national FR -> +33, exige par leur API)",
   adr.ok && adr.adresse.phone === "+33612345678");
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
ok("invalid_email (graphie payload)", suitePour("invalid_email") === "rebond");
/* T-036 — on s'abonne a `invalid` dans la configuration du webhook et la
   documentation nomme `invalid_email` dans le payload. Rien ne permet de
   trancher laquelle arrive : les DEUX doivent passer, sinon un rebond est
   classe « ignore » et personne ne le sait. */
ok("invalid (graphie configuration)", suitePour("invalid") === "rebond");
ok("invalidEmail (camelCase)", suitePour("invalidEmail") === "rebond");

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

/* ─────────────────────────────────────────────────────────────────────────
   T-040 — un lien d'ACCÈS ne doit jamais pouvoir promouvoir en ambassadrice

   La propriété qui compte : `request-access` envoie un lien magique a
   N'IMPORTE QUELLE adresse saisie par n'importe qui. Si ce lien pouvait
   confirmer une inscription, on aurait juste déplacé la faille au lieu de la
   fermer — la destinataire deviendrait ambassadrice sans l'avoir demandé,
   et sa signature de charte serait de nouveau fabriquée par un tiers.
   ───────────────────────────────────────────────────────────────────────── */
process.env.AMBASSADEUR_LINK_SECRET =
  process.env.AMBASSADEUR_LINK_SECRET || "secret-de-verification-local";

ok("un token de confirmation confirme",
   verifyTokenConfirmation(signTokenConfirmation("marie@exemple.fr")) === "marie@exemple.fr");
ok("⚠️ un token d'ACCES 7 j ne confirme PAS",
   verifyTokenConfirmation(signToken("marie@exemple.fr")) === null);
ok("⚠️ un token d'acces court 1 h ne confirme PAS",
   verifyTokenConfirmation(signTokenShort("marie@exemple.fr")) === null);
ok("un token de confirmation ouvre aussi l'espace (la personne vient d'y entrer)",
   verifyToken(signTokenConfirmation("marie@exemple.fr")) === "marie@exemple.fr");
ok("un token trafique ne confirme rien",
   verifyTokenConfirmation(signTokenConfirmation("marie@exemple.fr").slice(0, -3) + "aaa") === null);
ok("rien du tout ne confirme rien", verifyTokenConfirmation(null) === null);
ok("une chaine quelconque ne confirme rien", verifyTokenConfirmation("nimportequoi") === null);

/* ═══════════════ LA MESURE : JALONS, ETAPES, ENTONNOIR, SEAUX ═══════════════
   Les règles de /admin/atelier/metriques et de l'export CSV. Tout est dérivé
   du journal `evenements` ; les dossiers avancés en SQL n'ont pas de jalons,
   et la mesure doit les IGNORER au lieu d'inventer des durées. */

const T0 = Date.parse("2026-08-01T08:00:00Z");
const evt = (numero: string, type: string, h: number, payload: Record<string, unknown> = {}): EvenementMesure => ({
  numero_id: numero, type, payload, created_at: new Date(T0 + h * H).toISOString(),
});
const vers = (numero: string, etat: string, h: number) => evt(numero, "etat_change", h, { de: "x", vers: etat });

/* A : la vie complete. B : couverte en 30 h, jamais payee. C : couverte en
   60 h, payee APRES la fenetre. D : avancee en SQL, aucun depot journalise.
   E : consentement REFUSE. F : aller-retour, l'apercu republie a 30 h.
   G : couverte en 24 h pile (borne de seau). */
const JOURNAL: EvenementMesure[] = [
  evt("A", "numero_cree", 0),
  evt("A", "consentements", 10, { consent_photos: true }),
  vers("A", "apercu_pret", 20),
  evt("A", "checkout_ouvert", 25),
  vers("A", "payee", 30),
  vers("A", "maquette_prete", 60),
  vers("A", "validee", 80),
  vers("A", "en_production", 90),
  vers("A", "expediee", 120),
  vers("A", "livree", 150),
  evt("B", "numero_cree", 1),
  evt("B", "consentements", 5, { consent_photos: true }),
  vers("B", "apercu_pret", 35),
  evt("C", "numero_cree", 2),
  evt("C", "consentements", 5, { consent_photos: true }),
  vers("C", "apercu_pret", 65),
  evt("C", "checkout_ouvert", 68),
  vers("C", "payee", 70),
  vers("D", "apercu_pret", 40),
  evt("E", "numero_cree", 3),
  evt("E", "consentements", 4, { consent_photos: false }),
  vers("F", "apercu_pret", 10),
  vers("F", "apercu_pret", 30),
  evt("G", "consentements", 0, { consent_photos: true }),
  vers("G", "apercu_pret", 24),
];
/* Le journal arrive MELANGE : la reconstruction doit trier elle-meme. */
const JALONS = reconstruireJalons([...JOURNAL].reverse());
const FIN = T0 + 200 * H;

titre("— la reconstruction des jalons —");
const jA = JALONS.get("A")!;
ok("la vie complete pose ses dix jalons",
   jA.cree !== undefined && jA.depot !== undefined && jA.apercu !== undefined && jA.checkout !== undefined
   && jA.paye !== undefined && jA.maquette !== undefined && jA.validee !== undefined
   && jA.production !== undefined && jA.expediee !== undefined && jA.livree !== undefined);
ok("un consentement REFUSE ne pose pas le depot", JALONS.get("E")!.depot === undefined);
ok("aller-retour : le DERNIER passage compte", JALONS.get("F")!.apercu === T0 + 30 * H);
ok("un dossier avance en SQL n'a pas de depot", JALONS.get("D")!.depot === undefined);

titre("— les durees d'etape —");
ok("la table couvre les neuf paires plus le bout-en-bout", ETAPES_VIE.length === 10);
ok("une duree negative n'est pas une duree (aller-retour)",
   dureeEtape({ depot: T0 + 100 * H, apercu: T0 + 50 * H }, "depot", "apercu") === null);
ok("un jalon manquant : pas de duree inventee", dureeEtape({ apercu: T0 }, "depot", "apercu") === null);
const ETAPES = dureesEtapes(JALONS, 0, FIN);
ok("depot -> apercu : mediane sur A(10) B(30) C(60) G(24), F et D ignores",
   ETAPES.depot_apercu.echantillon === 4 && ETAPES.depot_apercu.mediane === 27);
ok("checkout -> paye : A(5) et C(2), mediane 3,5 h",
   ETAPES.checkout_paye.echantillon === 2 && ETAPES.checkout_paye.mediane === 3.5);
ok("bout-en-bout depot -> livree : A seul (140 h)",
   ETAPES.depot_livree.echantillon === 1 && ETAPES.depot_livree.mediane === 140);
ok("sans echantillon : mediane null, JAMAIS zero",
   dureesEtapes(JALONS, 0, T0).depot_apercu.mediane === null);
const FENETRE_COURTE = dureesEtapes(JALONS, 0, T0 + 21 * H);
ok("une duree est comptee dans la fenetre ou elle S'ACHEVE",
   FENETRE_COURTE.depot_apercu.echantillon === 1 && FENETRE_COURTE.depot_apercu.mediane === 10);

titre("— l'entonnoir —");
ok("les marches vont de la creation a la livraison",
   ENTONNOIR[0].cle === "cree" && ENTONNOIR[ENTONNOIR.length - 1].cle === "livree");
const COMPTE = compterEntonnoir(JALONS, 0, FIN);
ok("crees : A B C E (D et F sans numero_cree, G sans non plus)", COMPTE.cree === 4);
ok("depots : A B C G (le refus de E ne compte pas)", COMPTE.depot === 4);
ok("apercus : A B C D F G", COMPTE.apercu === 6);
ok("checkouts ouverts : A et C", COMPTE.checkout === 2);
ok("payes : A et C, livree : A seule", COMPTE.paye === 2 && COMPTE.livree === 1);

titre("— reactivite <-> conversion (LE chiffre qui dit si repondre vite vend) —");
/* Fenetre close a 66 h : l'apercu de C (65 h) est dedans, son paiement
   (70 h) est DEHORS — et il doit compter quand meme. */
const SEAUX = reactiviteConversion(JALONS, 0, T0 + 66 * H);
ok("A (10 h) tombe dans moins de 24 h", SEAUX[0].n === 1);
ok("G (24 h pile) tombe dans 24-48 h, la borne est stricte", SEAUX[1].n === 2);
ok("C (60 h) tombe dans plus de 48 h", SEAUX[2].n === 1);
ok("D (pas de depot journalise) n'entre dans aucun seau",
   SEAUX[0].n + SEAUX[1].n + SEAUX[2].n === 4);
ok("le paiement compte A CE JOUR, meme hors fenetre (C)", SEAUX[2].payes === 1 && SEAUX[2].taux === 100);
ok("B et G jamais payees : 0 % dans leur seau", SEAUX[1].payes === 0 && SEAUX[1].taux === 0);
ok("un seau vide rend null, pas 0 %", reactiviteConversion(JALONS, 0, T0)[0].taux === null);

titre("— les constats : des faits, jamais une conclusion sans effectif —");
const SEAUX_MAIGRES: Seau[] = [
  { cle: "moins24", label: "Couverte en moins de 24 h", n: 1, payes: 1, taux: 100 },
  { cle: "de24a48", label: "Couverte entre 24 et 48 h", n: 0, payes: 0, taux: null },
  { cle: "plus48", label: "Couverte en plus de 48 h", n: 1, payes: 0, taux: 0 },
];
const VIDE_ENTONNOIR = ENTONNOIR.map((e) => ({ label: e.label, n: 0 }));
const cMaigres = composerConstats({
  seaux: SEAUX_MAIGRES, entonnoir: VIDE_ENTONNOIR,
  boutEnBout: { mediane: null, echantillon: 0 }, checkoutPaye: { mediane: null, echantillon: 0 },
});
ok("2 apercus seulement : la phrase DIT que c'est trop tot, sans conclure",
   cMaigres.some((c) => c.includes("Trop tôt")));
ok("aucun taux n'est affirme sur un seau maigre", !cMaigres.some((c) => c.includes("100 %")));
const SEAUX_PLEINS: Seau[] = [
  { cle: "moins24", label: "Couverte en moins de 24 h", n: 4, payes: 3, taux: 75 },
  { cle: "de24a48", label: "Couverte entre 24 et 48 h", n: 2, payes: 1, taux: 50 },
  { cle: "plus48", label: "Couverte en plus de 48 h", n: 3, payes: 1, taux: 33 },
];
const cPleins = composerConstats({
  seaux: SEAUX_PLEINS,
  entonnoir: [{ label: "Dossiers créés", n: 10 }, { label: "Dépôts terminés", n: 8 }, { label: "Payés", n: 2 }],
  boutEnBout: { mediane: 200, echantillon: 3 },
  checkoutPaye: { mediane: 2, echantillon: 5 },
});
ok("3 par seau : le constat compare les taux avec leurs n=",
   cPleins.some((c) => c.includes("75 %") && c.includes("33 %") && c.includes("n=4") && c.includes("n=3")));
ok("la pire marche de l'entonnoir est nommee avec son taux",
   cPleins.some((c) => c.includes("25 %") && c.includes("Payés")));
ok("le bout-en-bout passe en jours au-dela de 48 h", cPleins.some((c) => c.includes("8 j")));
ok("jamais plus de quatre constats", cPleins.length <= 4);
const cRien = composerConstats({
  seaux: [
    { cle: "moins24", label: "x", n: 0, payes: 0, taux: null },
    { cle: "de24a48", label: "y", n: 0, payes: 0, taux: null },
    { cle: "plus48", label: "z", n: 0, payes: 0, taux: null },
  ],
  entonnoir: VIDE_ENTONNOIR,
  boutEnBout: { mediane: null, echantillon: 0 },
  checkoutPaye: { mediane: null, echantillon: 0 },
});
ok("rien a lire : UNE phrase qui le dit, pas une page vide",
   cRien.length === 1 && cRien[0].includes("Pas encore assez"));

/* ══════════════════ MULTI-EXEMPLAIRES (T-073) : LE VERROU ══════════════════
   Les paliers dégressifs ne sont PAS décidés (interdit nº5 : jamais inventer
   une remise). La structure `totalPour` existe, verrouillée à 1 exemplaire :
   à 1, elle DOIT rendre la grille actuelle au centime, et tout le reste DOIT
   être refusé. Lever le verrou = QUANTITE_MAX dans prix.ts, quand Mathias
   donne les paliers — et ces tests changeront AVEC lui, pas avant. */

titre("— multi-exemplaires (T-073) : verrouille a 1 —");
ok("QUANTITE_MAX vaut 1 (verrou T-073, leve par Mathias seulement)", QUANTITE_MAX === 1);
const GRILLE_ACTUELLE: Array<[PalierCle, number]> = [
  ["p30", 3000],
  ["p40", 4000],
  ["p45", 4500],
];
for (const [palier, attendu] of GRILLE_ACTUELLE) {
  ok(
    `totalPour(${palier}, 1) = ${attendu} centimes, la grille au centime`,
    totalPour(palier, 1) === attendu && totalPour(palier, 1) === centimesPour(palier),
  );
}
ok("2 exemplaires : REFUSE tant que le verrou tient (pas de remise inventee)",
   totalPour("p30", 2) === null);
ok("quantite nulle ou negative : refusee", totalPour("p40", 0) === null && totalPour("p40", -1) === null);
ok("quantite non entiere : refusee", totalPour("p45", 1.5) === null);
ok("palier absent : null, on ne facture pas sans chiffrage",
   totalPour(null, 1) === null && totalPour(undefined, 1) === null);

/* ═══════════════ LE CODE FONDATRICE (T-021) : LE RECIT ═══════════════
   La route /api/admin/atelier/fondatrice-code écrit `code_fondatrice_cree`
   au journal — c'est sa persistance ET son verrou d'idempotence. La part
   pure testable ici : la phrase du journal existe, dit le montant, et ne
   REVELE PAS le code (il reste dans le payload replie). */

titre("— le code fondatrice (T-021) au journal —");
const rCode = raconter("code_fondatrice_cree", {
  code: "FONDATEUR-3-XYZW",
  montant: 3000,
  numero_fondateur: 3,
  par: "Mathias",
});
ok("la phrase nomme le geste et le montant",
   rCode.texte.includes("30") && rCode.texte.toLowerCase().includes("code fondateur"));
ok("la phrase porte son auteur", rCode.texte.includes("Mathias"));
ok("le code lui-meme n'est PAS dans la phrase ni le detail",
   !rCode.texte.includes("FONDATEUR-3-XYZW") && !(rCode.detail ?? "").includes("FONDATEUR-3-XYZW"));
ok("sans auteur, la phrase reste correcte",
   raconter("code_fondatrice_cree", { montant: 3000 }).texte.length > 0);

titre("— T-021 : les deux nouveaux evenements du credit se racontent —");
const rApplique = raconter("credit_fondatrice_applique", {
  code: "FONDATEUR-MARIE30",
  montant: 3000,
  numero_fondateur: 3,
  session_id: "cs_test_1",
  par: "auto",
});
ok("« applique » dit le montant et l'automatisme",
   rApplique.texte.includes("30") && /automatique/i.test(rApplique.texte));
ok("« applique » ne revele pas le code",
   !rApplique.texte.includes("FONDATEUR-MARIE30")
   && !(rApplique.detail ?? "").includes("FONDATEUR-MARIE30"));
const rConsomme = raconter("credit_fondatrice_consomme", { code: "X", montant: 3000 });
ok("« consomme » dit que le droit est solde",
   /d[ée]pens/i.test(rConsomme.texte) && (rConsomme.detail ?? "").includes("30"));

/* ═══════════ T-021 : LE CREDIT FONDATRICE, LA REGLE PURE ═══════════
   Depuis le 01/09 la remise s'applique TOUTE SEULE au checkout. Trois choses
   doivent tenir sans base ni reseau : QUI y a droit (eligibilite), COMBIEN
   (montant borne), et UNE SEULE FOIS (unicite). Le reste — la frappe du
   coupon, la lecture de `waitlist` — est a effets et n'a pas sa place ici. */

titre("— T-021 : l'eligibilite, LES TROIS conditions —");
const wl = (o: Partial<LigneWaitlist>): LigneWaitlist => ({
  offer_type: "founder",
  status: "confirmed",
  numero_fondateur: 3,
  ...o,
});
ok("founder + confirmed + numero : fondatrice nº3", numeroFondatricePour(wl({})) === 3);
ok("pas de ligne waitlist : personne", numeroFondatricePour(null) === null
   && numeroFondatricePour(undefined) === null);
ok("offre standard : PAS fondatrice (elle n'a jamais verse les 25 EUR)",
   numeroFondatricePour(wl({ offer_type: "standard" })) === null);
ok("influenceuse : PAS fondatrice",
   numeroFondatricePour(wl({ offer_type: "influencer" })) === null);
ok("founder mais status pending : PAS fondatrice (paiement jamais alle au bout)",
   numeroFondatricePour(wl({ status: "pending" })) === null);
ok("founder confirmed SANS numero attribue : on ne devine pas une place",
   numeroFondatricePour(wl({ numero_fondateur: null })) === null);
ok("numero a 0 ou negatif : colonne mal initialisee, pas un droit",
   numeroFondatricePour(wl({ numero_fondateur: 0 })) === null
   && numeroFondatricePour(wl({ numero_fondateur: -2 })) === null);
ok("numero non entier : refuse",
   numeroFondatricePour(wl({ numero_fondateur: 3.5 })) === null);

titre("— T-021 : le montant, borne et jamais invente —");
ok("le credit vaut 3000 centimes, soit 30 EUR (CGV art. 5 bis)",
   CREDIT_FONDATRICE_CENTIMES === 3000 && CREDIT_FONDATRICE_EUROS === 30);
ok("le parametre du mail rend « 30 » quand le credit est du",
   parametreCredit(CREDIT_FONDATRICE_EUROS) === "30");
ok("il rend une chaine VIDE sans credit (le bloc Brevo disparait)",
   parametreCredit(null) === "" && parametreCredit(undefined) === ""
   && parametreCredit(0) === "");
ok("une valeur absurde ne devient jamais une remise",
   parametreCredit(-30) === "" && parametreCredit(Number.NaN) === ""
   && parametreCredit(Number.POSITIVE_INFINITY) === "");

titre("— T-021 : l'unicite, cote Stripe (l'autorite) —");
ok("code actif, jamais utilise : le credit est du",
   creditEncoreDu({ active: true, max_redemptions: 1, times_redeemed: 0 }));
ok("code deja utilise une fois : PLUS de credit",
   !creditEncoreDu({ active: true, max_redemptions: 1, times_redeemed: 1 }));
ok("code desactive a la main chez Stripe : plus de credit",
   !creditEncoreDu({ active: false, max_redemptions: 1, times_redeemed: 0 }));
ok("aucune reponse de Stripe : PAS de credit (on ne devine jamais une remise)",
   !creditEncoreDu(null));
ok("sans plafond declare, un code actif reste utilisable",
   creditEncoreDu({ active: true, max_redemptions: null, times_redeemed: 4 }));

titre("— T-021 : l'unicite, cote journal (le raccourci) —");
const ligneJournal = (payload: Record<string, unknown>, created_at = "2026-09-01T10:00:00Z") =>
  ({ payload, created_at });
ok("le PREMIER code du journal fait foi",
   codeDansLeJournal([
     ligneJournal({ code: "FONDATRICE-MARIE30", promotion_code_id: "promo_1" }, "2026-09-01T10:00:00Z"),
     ligneJournal({ code: "FONDATRICE-MARIE30-N3", promotion_code_id: "promo_2" }, "2026-09-02T10:00:00Z"),
   ])?.code === "FONDATRICE-MARIE30");
ok("l'identifiant de promotion code remonte avec lui",
   codeDansLeJournal([ligneJournal({ code: "C", promotion_code_id: "promo_1", coupon_id: "co_1" })])
     ?.promotionCodeId === "promo_1");
ok("journal vide : rien trouve (donc creation, qui est reparable)",
   codeDansLeJournal([]) === null && codeDansLeJournal(null) === null
   && codeDansLeJournal(undefined) === null);
ok("payload sans code lisible : ignore, jamais de code fantome",
   codeDansLeJournal([ligneJournal({ montant: 3000 }), ligneJournal({ code: "   " })]) === null);
ok("une vieille ligne sans promotion_code_id rend le code mais pas d'id",
   codeDansLeJournal([ligneJournal({ code: "FONDATRICE-N3-30" })])?.promotionCodeId === null);

titre("— T-021 : le code lisible, et sa collision —");
ok("prenom accentue : FONDATEUR-CHLOE30",
   codesPossibles("Chloé", 3).voulu === "FONDATEUR-CHLOE30");
ok("prenom compose : les espaces et tirets sautent",
   codesPossibles("Marie-Anne", 7).voulu === "FONDATEUR-MARIEANNE30");
ok("le repli porte le numero de fondateur (deux homonymes possibles)",
   codesPossibles("Marie", 7).repli === "FONDATEUR-MARIE30-N7");
ok("prenom absent ou illisible : on retombe sur le numero seul",
   codesPossibles(null, 12).voulu === "FONDATEUR-N12-30"
   && codesPossibles("123", 12).voulu === "FONDATEUR-N12-30");
ok("Stripe dit « already exists » : c'est une collision, on tente le repli",
   estCollisionDeCode({ type: "invalid_request_error", message: "A promotion code with that code already exists." }));
ok("toute autre erreur Stripe n'est PAS une collision (elle doit ressortir)",
   !estCollisionDeCode({ type: "api_error", message: "service unavailable" })
   && !estCollisionDeCode(null) && !estCollisionDeCode(new Error("")));

titre("— T-021 : ce que M3 et M3b envoient a Brevo —");
const dossierM3 = d({ etat: "apercu_pret", nb_pages: 34, palier: "p40" });
for (const c of ["M3", "M3b"] as const) {
  const sans = parametresPour(c, dossierM3);
  ok(`${c} : CREDIT_FONDATRICE est TOUJOURS envoye (liste stable)`,
     "CREDIT_FONDATRICE" in sans);
  ok(`${c} : vide pour une cliente ordinaire`, sans.CREDIT_FONDATRICE === "");
  const avec = parametresPour(c, dossierM3, { creditFondatriceEuros: 30 });
  ok(`${c} : « 30 » pour une fondatrice`, avec.CREDIT_FONDATRICE === "30");
  ok(`${c} : le prix affiche reste celui de la grille, jamais diminue`,
     avec.PRIX === 40 && sans.PRIX === 40);
}
ok("M5 n'annonce AUCUN credit (elle a deja paye)",
   !("CREDIT_FONDATRICE" in parametresPour("M5", dossierM3, { creditFondatriceEuros: 30 })));
ok("M0 non plus (aucun prix, aucun paiement en vue)",
   !("CREDIT_FONDATRICE" in parametresPour("M0", dossierM3, { creditFondatriceEuros: 30 })));

/* ═══════════ LE TRI DU WEBHOOK PARTAGÉ (T-035, incident du 24/08) ═══════════
   /api/webhook sert DEUX produits. Le tri se fait sur les métadonnées, AVANT
   tout accès en base, et AUCUN produit n'est le cas par défaut : le 24/08, un
   album de l'atelier payé en test a déclenché « bienvenue en prévente » parce
   qu'un ancien déploiement faisait de la prévente le dépotoir de tout paiement
   non identifié. Le correctif est en place ; ces lignes garantissent qu'il le
   RESTE. Les objets sont construits à la main : aucune clé, aucun réseau. */

const sessionStripe = (metadata: Record<string, string> | null) =>
  ({ metadata }) as unknown as Stripe.Checkout.Session;
const chargeStripe = (metadata: Record<string, string> | null) =>
  ({ metadata }) as unknown as Stripe.Charge;

titre("— le tri du webhook : chaque produit se reconnait EXPLICITEMENT —");
ok("session atelier (kind: atelier) : revendiquee",
   estSessionAtelier(sessionStripe({ kind: "atelier", numero_id: "n1", token: "t" })));
ok("session prevente (offer_type: founder, sans kind) : PAS l'atelier",
   !estSessionAtelier(sessionStripe({ offer_type: "founder", email: "m@x.fr" })));
ok("session orpheline (aucune metadonnee) : PAS l'atelier",
   !estSessionAtelier(sessionStripe({})));
ok("metadata null : PAS l'atelier, pas d'exception",
   !estSessionAtelier(sessionStripe(null)));
ok("un kind approchant ne suffit pas", !estSessionAtelier(sessionStripe({ kind: "ateliers" })));
ok("le discriminant est la constante que /api/atelier/checkout pose", KIND_ATELIER === "atelier");
ok("charge atelier (metadata du PaymentIntent) : revendiquee",
   estChargeAtelier(chargeStripe({ kind: "atelier", numero_id: "n1" })));
ok("charge de la prevente (JAMAIS de metadonnees) : PAS l'atelier",
   !estChargeAtelier(chargeStripe({})));
ok("charge metadata null : PAS l'atelier, pas d'exception",
   !estChargeAtelier(chargeStripe(null)));

/* ═════════ LA GRILLE FACE À L'ANNEXE DES CGV (T-035) ═════════
   Annexe « Grille tarifaire — Offre Atelier » (src/app/legal/content/cgv.ts) :
   20 à 28 pages -> 30 €, 30 à 38 -> 40 €, 40 à 50 -> 45 €. TTC, impression et
   livraison comprises. Un écart entre prix.ts et cette annexe est un mensonge
   opposable — c'est le test qui aurait attrapé T-006 tout seul. */

titre("— la grille de prix face a l'annexe des CGV —");
ok("p30 = 30 EUR (annexe : 20 a 28 pages)", eurosPour("p30") === 30);
ok("p40 = 40 EUR (annexe : 30 a 38 pages)", eurosPour("p40") === 40);
ok("p45 = 45 EUR (annexe : 40 a 50 pages)", eurosPour("p45") === 45);
ok("les bornes de palier suivent l'annexe (pages paires)",
   palierPourPages(20) === "p30" && palierPourPages(28) === "p30"
   && palierPourPages(30) === "p40" && palierPourPages(38) === "p40"
   && palierPourPages(40) === "p45" && palierPourPages(50) === "p45");
ok("hors grille : aucun palier, donc aucun prix invente",
   palierPourPages(18) === null && palierPourPages(52) === null);
ok("palier absent : null, on ne facture pas sans chiffrage",
   eurosPour(null) === null && eurosPour(undefined) === null);

titre("— la zone de livraison (CGV 4bis.6) —");
/* Stripe EXIGE une liste explicite : cette constante EST le menu « Pays » du
   paiement. Un pays hors liste ne peut pas etre saisi — c'est tout le
   comportement hors zone, et il vit dans cette liste. */
ok("exactement la zone des CGV : Belgique, France, Luxembourg",
   [...PAYS_LIVRAISON].sort().join() === "BE,FR,LU");
ok("aucun pays hors zone ne s'est glisse dans la liste envoyee a Stripe",
   !(PAYS_LIVRAISON as readonly string[]).includes("DE")
   && !(PAYS_LIVRAISON as readonly string[]).includes("CH")
   && !(PAYS_LIVRAISON as readonly string[]).includes("MC"));

/* ═════════ T-007 : LE SAUT « SANS TEMPLATE » LAISSE UNE TRACE ═════════
   La part pure : la phrase du journal existe, nomme le mail ET la variable a
   poser, et sonne comme une alerte. L'ecriture elle-meme (une fois par
   dossier+code, jamais a chaque releve) vit dans mails.ts,
   signalerSansTemplate — deduplication par lecture prealable, sur le modele
   du verrou de mails_envoyes. */

titre("— T-007 : le mail saute sans template se lit dans le journal —");
const rSaut = raconter("mail_sans_template", { code: "M2b", variable: "BREVO_TEMPLATE_M2B_ID" });
ok("la phrase nomme le mail saute", rSaut.texte.includes("M2b"));
ok("le detail nomme la variable a poser (la reparation, pas un indice)",
   (rSaut.detail ?? "").includes("BREVO_TEMPLATE_M2B_ID"));
ok("c'est une alerte, pas une ligne neutre", rSaut.ton === "alerte");
ok("sans variable dans le payload, la phrase tient quand meme",
   raconter("mail_sans_template", { code: "M0" }).texte.includes("M0"));

titre("— templateExiste suit la variable d'environnement —");
ok("variable absente : le template n'existe pas",
   (() => { delete process.env.BREVO_TEMPLATE_M9_ID; return !templateExiste("M9"); })());
ok("variable posee : le template existe (sans redemarrage de module)",
   (() => {
     process.env.BREVO_TEMPLATE_M9_ID = "123";
     const la = templateExiste("M9");
     delete process.env.BREVO_TEMPLATE_M9_ID;
     return la;
   })());
ok("variable illisible : le template n'existe pas",
   (() => {
     process.env.BREVO_TEMPLATE_M9_ID = "pas-un-nombre";
     const la = templateExiste("M9");
     delete process.env.BREVO_TEMPLATE_M9_ID;
     return !la;
   })());

/* ═════════ T-005 : L'ANCIEN MOT DE PASSE PARTAGÉ N'OUVRE PLUS ═════════
   comptesAdmin() lit process.env à CHAQUE appel : on pose les variables ici,
   on vérifie, on remet tout en place. Web Crypto est global en Node 20+,
   aucun réseau. Le point dangereux : que quelqu'un « répare » un jour le
   repli ADMIN_PASSWORD en croyant débloquer un déploiement — ces lignes
   crieraient. */

/* Le script sort en CJS sous tsx : pas de top-level await. La section vit
   dans une IIFE async, et c'est ELLE qui porte la conclusion et l'exit —
   le compteur `ko` n'est arrêté qu'une fois ces await rendus. */
const verifierT005 = async () => {
  titre("— T-005 : le mot de passe partage est mort —");
  const sauvegarde = {
    mathias: process.env.ADMIN_PASSWORD_MATHIAS,
    louis: process.env.ADMIN_PASSWORD_LOUIS,
    partage: process.env.ADMIN_PASSWORD,
  };
  process.env.ADMIN_PASSWORD_MATHIAS = "mdp-de-mathias-pour-le-test";
  process.env.ADMIN_PASSWORD_LOUIS = "mdp-de-louis-pour-le-test";
  process.env.ADMIN_PASSWORD = "l-ancien-secret-partage";

  const comptes = comptesAdmin();
  ok("les deux comptes nominatifs ouvrent", "mathias" in comptes && "louis" in comptes);
  ok("ADMIN_PASSWORD pose dans l'env : le compte « atelier » n'existe QUAND MEME pas",
     !("atelier" in comptes));

  /* Une session « atelier » signée avec l'ancien secret — exactement le
     cookie qu'aurait un porteur de l'ancien mot de passe — ne valide plus. */
  const dansUneSemaine = Date.now() + 6 * 86_400_000;
  const cookieAtelier = await signAdminCookie("atelier", "l-ancien-secret-partage", dansUneSemaine);
  ok("un cookie « atelier » signe de l'ancien secret est REFUSE",
     (await verifierCookieAdmin(cookieAtelier)) === null);

  /* Les sessions nominatives en cours, elles, ne bougent pas. */
  const cookieMathias = await signAdminCookie("mathias", "mdp-de-mathias-pour-le-test", dansUneSemaine);
  ok("la session de Mathias reste valide (rien ne casse pour lui)",
     (await verifierCookieAdmin(cookieMathias)) === "mathias");
  const cookieLouis = await signAdminCookie("louis", "mdp-de-louis-pour-le-test", dansUneSemaine);
  ok("celle de Louis aussi", (await verifierCookieAdmin(cookieLouis)) === "louis");

  /* Le journal d'avant le 31/08 porte la clé « atelier » : elle doit encore
     s'AFFICHER, sans pour autant authentifier. */
  ok("« atelier » s'affiche encore dans le journal (PRENOM_COMPTE), sans ouvrir",
     PRENOM_COMPTE.atelier === "Atelier");

  process.env.ADMIN_PASSWORD_MATHIAS = sauvegarde.mathias;
  process.env.ADMIN_PASSWORD_LOUIS = sauvegarde.louis;
  if (sauvegarde.partage === undefined) delete process.env.ADMIN_PASSWORD;
  else process.env.ADMIN_PASSWORD = sauvegarde.partage;
  if (sauvegarde.mathias === undefined) delete process.env.ADMIN_PASSWORD_MATHIAS;
  if (sauvegarde.louis === undefined) delete process.env.ADMIN_PASSWORD_LOUIS;
};

/* ═════════════════════════════════════════════════════════════════════════
 * T-076 : LA RETENTION A 90 JOURS
 *
 * La moitie utile de cette section est celle des EPARGNES. Ce module commande
 * une suppression irreversible de photos de clientes : ce qu'il faut prouver
 * en premier, ce n'est pas qu'il mord, c'est qu'il ne mord PAS sur ce qu'il
 * ne doit pas toucher. Un faux positif ici ne se rattrape par aucun backup.
 * ═════════════════════════════════════════════════════════════════════════ */

titre("— T-076 : les constantes viennent d'un seul endroit —");
ok("retention a 90 jours (decision de Mathias, 01/09)", RETENTION_JOURS === 90);
ok("preavis a 7 jours", PREAVIS_JOURS === 7);
ok("le jour du preavis est DERIVE, jamais ecrit en dur",
   PREAVIS_A_JOURS === RETENTION_JOURS - PREAVIS_JOURS && PREAVIS_A_JOURS === 83);

const T76 = new Date("2026-12-01T12:00:00Z");
const ilYAj = (j: number) => new Date(T76.getTime() - j * 86_400_000).toISOString();

/* Le cas nominal : questionnaire rempli, depot jamais termine, jamais paye,
   plus rien depuis. C'est la SEULE population que ce module vise. */
const abandonne = (p: Partial<NumeroPourRetention> = {}): NumeroPourRetention => ({
  etat: "photos_recues",
  consent_photos: false,
  stripe_payment_intent: null,
  created_at: ilYAj(120),
  etat_maj_le: ilYAj(120),
  anonymise_le: null,
  ...p,
});

/** Le motif d'epargne, ou "" si le dossier est anonymisable. Rend les tests
    lisibles : le verdict est une union, et le `as` inline la noyait. */
const motifDe = (
  n: NumeroPourRetention,
  quand: Date,
  jalons?: { depotLe?: string | null; dernierePhotoLe?: string | null },
): string => {
  const v = verdictRetention(n, quand, jalons);
  return v.anonymisable ? "" : v.motif;
};

titre("— T-076 : CE QU'ON N'EFFACE JAMAIS (le coeur du sujet) —");
ok("un dossier PAYE n'est jamais anonymise, meme vieux de 120 jours",
   verdictRetention(abandonne({ stripe_payment_intent: "pi_123" }), T76).anonymisable === false);
ok("... et le motif le dit : obligations comptables",
   motifDe(abandonne({ stripe_payment_intent: "pi_123" }), T76) === "paye");
for (const etat of ETATS_ENGAGES) {
  ok(`etat « ${etat} » : jamais anonymise, meme sans intent Stripe`,
     !estAnonymisable(abandonne({ etat, consent_photos: true }), T76));
}
/* ⚠️ LE CAS QUI PROUVE QU'IL FAUT DEUX GARDES ET PAS UNE. Au palier 30 EUR,
   le credit d'une fondatrice couvre TOUT le prix : la session Stripe se solde
   en `no_payment_required` et le dossier n'a AUCUN payment_intent. Sur la
   seule garde Stripe, une fondatrice servie gratuitement se faisait refermer
   son dossier. C'est l'etat qui la sauve. */
ok("fondatrice au palier 30 EUR : payee mais SANS payment_intent, epargnee quand meme",
   !estAnonymisable(abandonne({ etat: "payee", consent_photos: true, stripe_payment_intent: null }), T76,
                    { depotLe: ilYAj(200) }));
ok("deja anonymise : on ne repasse pas dessus",
   !estAnonymisable(abandonne({ anonymise_le: ilYAj(10) }), T76));
ok("aucune date lisible : on ne touche pas a ce qu'on ne date pas",
   verdictRetention({ etat: "photos_recues", consent_photos: false, stripe_payment_intent: null,
                      created_at: null, etat_maj_le: null }, T76).anonymisable === false);

titre("— T-076 : la borne exacte des 90 jours —");
ok("119 jours d'inactivite : anonymisable", estAnonymisable(abandonne(), T76));
ok("90,0 jours PILE : anonymisable (la borne est incluse)",
   estAnonymisable(abandonne({ created_at: ilYAj(90), etat_maj_le: ilYAj(90) }), T76));
ok("89,9 jours : PAS anonymisable",
   !estAnonymisable(abandonne({ created_at: ilYAj(89.9), etat_maj_le: ilYAj(89.9) }), T76));
ok("... et le motif est « encore dans les 90 jours »",
   motifDe(abandonne({ created_at: ilYAj(89.9), etat_maj_le: ilYAj(89.9) }), T76) === "dans_la_retention");
ok("un dossier d'hier : evidemment pas", !estAnonymisable(abandonne({ created_at: ilYAj(1), etat_maj_le: ilYAj(1) }), T76));

/* ═════════ T-076 (01/09) : LA POPULATION B ═════════
   Mathias a tranche le trou laisse par la premiere version : « On fait 90
   jours apres le depot, cela me parait bien. » Un depot TERMINE mais jamais
   paye devient donc eligible, 90 jours apres la date du depot — celle du
   journal (`evenements` type `consentements`), la seule qui existe. */

titre("— T-076 : population B, 90 jours apres LE DEPOT —");
/* Le depot terminé, en attente de l'atelier ou d'un achat. */
const depose = (p: Partial<NumeroPourRetention> = {}): NumeroPourRetention =>
  abandonne({ consent_photos: true, etat: "apercu_pret", ...p });

ok("couverture publiee, jamais payee, depot il y a 120 j : ANONYMISABLE",
   estAnonymisable(depose({ created_at: ilYAj(200), etat_maj_le: ilYAj(120) }), T76,
                   { depotLe: ilYAj(120) }));
ok("meme dossier, depot il y a 40 j : epargne",
   !estAnonymisable(depose({ created_at: ilYAj(60), etat_maj_le: ilYAj(40) }), T76,
                    { depotLe: ilYAj(40) }));
ok("... et le motif distingue les deux populations (dry-run lisible)",
   motifDe(depose({ created_at: ilYAj(60), etat_maj_le: ilYAj(40) }), T76, { depotLe: ilYAj(40) }) === "depot_termine"
   && motifDe(abandonne({ created_at: ilYAj(40), etat_maj_le: ilYAj(40) }), T76) === "dans_la_retention");
ok("depot terminé en attente de l'atelier (etat 1) : eligible aussi",
   estAnonymisable(depose({ etat: "photos_recues", created_at: ilYAj(200), etat_maj_le: ilYAj(200) }), T76,
                   { depotLe: ilYAj(200) }));
ok("1b « photos insuffisantes » reste sans reponse 120 j : eligible aussi",
   estAnonymisable(depose({ etat: "photos_insuffisantes", created_at: ilYAj(200), etat_maj_le: ilYAj(200) }), T76,
                   { depotLe: ilYAj(200) }));

/* L'atelier qui publie une couverture REPOUSSE l'echeance : elle a 90 jours
   pour se decider a partir de la, pas a partir de son depot. */
ok("depot il y a 200 j mais apercu publie il y a 10 j : epargne",
   !estAnonymisable(depose({ created_at: ilYAj(250), etat_maj_le: ilYAj(10) }), T76,
                    { depotLe: ilYAj(200) }));
ok("un redepot (1b) remet le compteur : depot il y a 5 j, dossier de 300 j",
   !estAnonymisable(depose({ created_at: ilYAj(300), etat_maj_le: ilYAj(300) }), T76,
                    { depotLe: ilYAj(5) }));

titre("— T-076 : sans date de depot, ON GARDE (le repli honnete) —");
ok("depot termine, 200 j, AUCUN evenement `consentements` : on ne ferme pas",
   !estAnonymisable(depose({ created_at: ilYAj(200), etat_maj_le: ilYAj(200) }), T76));
ok("... et le motif ne ment pas sur la raison",
   motifDe(depose({ created_at: ilYAj(200), etat_maj_le: ilYAj(200) }), T76) === "depot_sans_date");
/* Sans ce test, un depot termine du jour ressortait « SANS date dans le
   journal » dans le dry-run : ca ressemble a une panne alors que tout va
   bien. L'age se teste AVANT la date de depot. */
ok("un depot termine RECENT sans jalons dit « encore dans les 90 jours », pas « sans date »",
   motifDe(depose({ created_at: ilYAj(3), etat_maj_le: ilYAj(3) }), T76) === "depot_termine");
ok("pas de preavis non plus sans date de depot (on n'annonce pas une date inconnue)",
   !doitPrevenirCloture(depose({ created_at: ilYAj(200), etat_maj_le: ilYAj(200) }), T76));
ok("avec la date, le preavis redevient du",
   doitPrevenirCloture(depose({ created_at: ilYAj(200), etat_maj_le: ilYAj(200) }), T76,
                       { depotLe: ilYAj(200) }));

titre("— T-076 : le pre-tri bon marche ne laisse rien passer —");
/* Il calcule l'age SANS jalons, donc sur un MAJORANT : tout ce qu'il ecarte
   est forcement hors de portee une fois les vraies dates connues. */
ok("un dossier de 200 j merite un regard (on ira lire ses jalons)",
   meriteUnRegardDeRetention(abandonne(), T76));
ok("un dossier de 83 j pile aussi (c'est le jour du preavis)",
   meriteUnRegardDeRetention(abandonne({ created_at: ilYAj(83), etat_maj_le: ilYAj(83) }), T76));
ok("un dossier de 82 j : pas encore, on ne paie pas les requetes",
   !meriteUnRegardDeRetention(abandonne({ created_at: ilYAj(82), etat_maj_le: ilYAj(82) }), T76));
ok("un dossier paye n'est jamais regarde",
   !meriteUnRegardDeRetention(abandonne({ stripe_payment_intent: "pi_1" }), T76));
ok("un depot termine de 200 j EST regarde (c'est la population B)",
   meriteUnRegardDeRetention(depose({ created_at: ilYAj(200), etat_maj_le: ilYAj(200) }), T76));
/* La demonstration, en acte : un jalon ne peut que RAJEUNIR. Tout dossier
   anonymisable AVEC jalons passe donc le pre-tri SANS. */
ok("tout dossier eligible avec jalons passe le pre-tri sans jalons",
   [ilYAj(90), ilYAj(120), ilYAj(300)].every((quand) =>
     !estAnonymisable(depose({ created_at: ilYAj(400), etat_maj_le: ilYAj(400) }), T76, { depotLe: quand })
     || meriteUnRegardDeRetention(depose({ created_at: ilYAj(400), etat_maj_le: ilYAj(400) }), T76)));

titre("— T-076 : la DERNIERE activite, pas la creation —");
ok("cree il y a 200 j mais etat repasse il y a 10 j : epargne",
   !estAnonymisable(abandonne({ created_at: ilYAj(200), etat_maj_le: ilYAj(10) }), T76));
/* Le vrai piege : deposer une photo n'ecrit AUCUNE date sur `numeros`. Sans
   ce troisieme argument, une cliente qui monte 40 photos au 85e jour voit son
   depot efface cinq jours plus tard, en pleine activite. */
ok("cree il y a 200 j, DERNIERE PHOTO il y a 5 j : epargne",
   !estAnonymisable(abandonne({ created_at: ilYAj(200), etat_maj_le: ilYAj(200) }), T76, { dernierePhotoLe: ilYAj(5) }));
ok("cree il y a 200 j, derniere photo il y a 95 j : anonymisable",
   estAnonymisable(abandonne({ created_at: ilYAj(200), etat_maj_le: ilYAj(200) }), T76, { dernierePhotoLe: ilYAj(95) }));
ok("une photo PLUS VIEILLE que le dossier ne rallonge rien",
   estAnonymisable(abandonne(), T76, { dernierePhotoLe: ilYAj(300) }));
ok("joursDInactivite compte bien depuis la plus recente des quatre",
   Math.round(joursDInactivite(abandonne({ created_at: ilYAj(200), etat_maj_le: ilYAj(140) }), T76,
                               { dernierePhotoLe: ilYAj(120) }) ?? 0) === 120);

titre("— T-076 : la date de cloture annoncee EST celle appliquee —");
{
  const d = abandonne({ created_at: ilYAj(100), etat_maj_le: ilYAj(100) });
  const cloture = dateDeCloture(d);
  ok("cloture = derniere activite + 90 jours",
     cloture !== null
     && Math.round((cloture.getTime() - Date.parse(ilYAj(100))) / 86_400_000) === RETENTION_JOURS);
  ok("a la date de cloture, le dossier est effectivement anonymisable",
     cloture !== null && estAnonymisable(d, cloture));
  ok("la veille, il ne l'est pas encore",
     cloture !== null && !estAnonymisable(d, new Date(cloture.getTime() - 3_600_000)));
  ok("sans aucune date : pas de date de cloture (et donc DATE_CLOTURE vide dans M10)",
     dateDeCloture({ etat: "photos_recues", consent_photos: false, stripe_payment_intent: null,
                     created_at: null, etat_maj_le: null }) === null);
}

titre("— T-076 : le preavis M10, a J-83 —");
ok("83 jours PILE : le preavis est du",
   doitPrevenirCloture(abandonne({ created_at: ilYAj(83), etat_maj_le: ilYAj(83) }), T76));
ok("82,9 jours : trop tot",
   !doitPrevenirCloture(abandonne({ created_at: ilYAj(82.9), etat_maj_le: ilYAj(82.9) }), T76));
ok("120 jours et toujours pas prevenue : le preavis reste DU (jamais de fermeture muette)",
   doitPrevenirCloture(abandonne(), T76));
ok("un dossier paye ne recoit JAMAIS ce mail",
   !doitPrevenirCloture(abandonne({ stripe_payment_intent: "pi_1" }), T76));
ok("un depot termine non plus (ce serait une frayeur doublee d'un mensonge)",
   !doitPrevenirCloture(abandonne({ consent_photos: true }), T76));
ok("un dossier deja anonymise non plus",
   !doitPrevenirCloture(abandonne({ anonymise_le: ilYAj(5) }), T76));

titre("— T-076 : M10 dans la releve —");
{
  const vieux = { created_at: ilYAj(90), etat_maj_le: ilYAj(90) };
  const dossierM10 = (p: Partial<NumeroPourReleve> = {}): NumeroPourReleve =>
    ({ ...base, nb_photos: 0, consent_photos: false, ...vieux, ...p });
  ok("dossier abandonne de 90 j, M2 deja parti : M10 part",
     codesPour(dossierM10(), env(["M0", ilYAj(90)], ["M2", ilYAj(89)]), T76).join() === "M10");
  ok("M10 deja parti : rien (le verrou de mails_envoyes fait le reste)",
     codesPour(dossierM10(), env(["M2", ilYAj(89)], ["M10", ilYAj(3)]), T76).length === 0);
  ok("M10 n'a PAS de predecesseur : un dossier sans aucun mail le recoit quand meme",
     codesPour(dossierM10(), env(), T76).includes("M10"));
  ok("depot termine : M1 et surtout PAS de M10",
     codesPour(dossierM10({ consent_photos: true, nb_photos: 40 }), env(), T76).join() === "M1");
  ok("dossier de 40 jours : ni M10 ni rien",
     codesPour(dossierM10({ created_at: ilYAj(40), etat_maj_le: ilYAj(40) }),
               env(["M0", ilYAj(40)], ["M2", ilYAj(39)]), T76).length === 0);
  /* Un dossier deja anonymise garde son etat et son age : sans la garde sur
     l'adresse, il ressortirait « incomplet » a CHAQUE releve, tous les jours,
     pour un mail qu'on ne veut plus envoyer. */
  ok("dossier deja anonymise (email vide) : la releve n'a plus rien a en dire",
     codesPour(dossierM10({ email: null }), env(["M2", ilYAj(89)]), T76).length === 0);
  /* T-076 (01/09) — M10 est SORTI du switch sur l'etat : la population B vit
     dans trois branches differentes (photos_recues, photos_insuffisantes,
     apercu_pret) qui n'ont rien d'autre en commun. */
  const vieuxDepot = { depotLe: ilYAj(120) };
  ok("apercu publie, jamais paye, depot il y a 120 j : M10 part",
     codesPour(dossierM10({ etat: "apercu_pret", consent_photos: true, nb_photos: 42,
                            created_at: ilYAj(200), etat_maj_le: ilYAj(120) }),
               env(["M3", ilYAj(119)], ["M3b", ilYAj(116)]), T76, vieuxDepot).join() === "M10");
  ok("1b sans reponse depuis 120 j : M10 part aussi",
     codesPour(dossierM10({ etat: "photos_insuffisantes", consent_photos: true, nb_photos: 12,
                            created_at: ilYAj(200), etat_maj_le: ilYAj(120) }),
               env(["M1", ilYAj(121)], ["M9", ilYAj(120)]), T76, vieuxDepot).join() === "M10");
  ok("depot terminé en attente de l'atelier depuis 120 j : M10 part (M1 deja parti)",
     codesPour(dossierM10({ consent_photos: true, nb_photos: 40,
                            created_at: ilYAj(200), etat_maj_le: ilYAj(120) }),
               env(["M1", ilYAj(120)]), T76, vieuxDepot).join() === "M10");
  ok("SANS la date de depot, aucun M10 pour un depot termine",
     codesPour(dossierM10({ etat: "apercu_pret", consent_photos: true,
                            created_at: ilYAj(200), etat_maj_le: ilYAj(120) }),
               env(["M3", ilYAj(119)], ["M3b", ilYAj(116)]), T76).length === 0);
  /* Le garde-fou absolu : aucun etat engage ne recoit ce mail, meme tres
     vieux, meme avec tous les jalons du monde. */
  for (const etat of ETATS_ENGAGES) {
    ok(`etat « ${etat} » : jamais de M10, meme a 120 jours`,
       !codesPour(dossierM10({ etat, consent_photos: true,
                               created_at: ilYAj(200), etat_maj_le: ilYAj(120) }),
                  env(["M4", ilYAj(120)], ["M5", ilYAj(119)], ["M6", ilYAj(118)],
                      ["M7", ilYAj(117)], ["M8", ilYAj(110)]), T76, vieuxDepot).includes("M10"));
  }
  ok("M10 exige une adresse comme tous les autres",
     manquePour("M10", d({ email: null })).includes("email"));
  ok("M10 n'exige ni pagination ni prix (rien n'a ete compose)",
     manquePour("M10", d({ email: "c@example.com", nb_pages: null, palier: null })).length === 0);
}

titre("— T-076 : les parametres de M10 —");
{
  const pM10 = parametresPour("M10", d({ nb_photos: 0, created_at: ilYAj(83), etat_maj_le: ilYAj(83) }));
  ok("il porte le lien permanent du numero", String(pM10.LIEN).includes("/numero/"));
  ok("il annonce une date de cloture non vide", String(pM10.DATE_CLOTURE).length > 0);
  /* Le zero est VRAI pour le `{% if %}` de Brevo : passer un nombre ferait
     apparaitre « vos 0 photos seront effacees » sur tous les dossiers vides. */
  ok("aucune photo : PHOTOS_DEPOSEES est la chaine vide, pas 0",
     pM10.PHOTOS_DEPOSEES === "");
  ok("des photos : PHOTOS_DEPOSEES est une chaine non vide",
     parametresPour("M10", d({ nb_photos: 42, created_at: ilYAj(83), etat_maj_le: ilYAj(83) })).PHOTOS_DEPOSEES === "42");
  /* T-076 (01/09) : le questionnaire abandonne n'a pas de couverture, donc
     pas d'encart de vente. Le drapeau est une CHAINE vide, pas un booleen :
     `{% if %}` de Brevo traite "" comme faux et 0 comme VRAI. */
  ok("questionnaire abandonne : pas d'encart couverture",
     pM10.COUVERTURE_PRETE === "");

  /* La population B : couverture publiee, jamais achetee. M10 est son dernier
     rappel, donc sa derniere chance de vente : il redit pages et prix. */
  const pM10b = parametresPour("M10", d({
    etat: "apercu_pret", nb_pages: 34, palier: "p40", nb_photos: 42,
    created_at: ilYAj(200), etat_maj_le: ilYAj(120),
  }), { jalons: { depotLe: ilYAj(120) } });
  ok("couverture prete : l'encart de vente s'allume",
     pM10b.COUVERTURE_PRETE === "oui");
  ok("... et il porte la pagination et le prix, comme M3b",
     pM10b.NB_PAGES === 34 && pM10b.PRIX === 40);
  ok("... et la date de cloture suit LE DEPOT, pas la creation du dossier",
     pM10b.DATE_CLOTURE === formaterJour(new Date(Date.parse(ilYAj(120)) + 90 * 86_400_000)));
  ok("un apercu sans palier n'allume pas l'encart (jamais de prix vide affiche)",
     parametresPour("M10", d({ etat: "apercu_pret", nb_pages: 34, palier: null })).COUVERTURE_PRETE === "");
}

titre("— T-076 : jamais de fermeture sans avertissement —");
ok("preavis parti il y a 7 jours pile : on peut refermer",
   preavisRespecte(ilYAj(7), true, T76));
ok("preavis parti il y a 6,9 jours : on attend",
   !preavisRespecte(ilYAj(6.9), true, T76));
ok("preavis JAMAIS parti : on ne referme pas, meme a 120 jours",
   !preavisRespecte(null, true, T76));
ok("preavis illisible : on ne referme pas",
   !preavisRespecte("pas-une-date", true, T76));
ok("aucune adresse ou ecrire : rien a attendre, on peut refermer",
   preavisRespecte(null, false, T76));

titre("— T-076 : ce que l'anonymisation ecrit, et surtout ce qu'elle N'ECRIT PAS —");
{
  const patch = patchAnonymisation();
  for (const champ of ["email", "email_canonical", "prenom", "telephone", "occasion", "histoire", "adresse_livraison"]) {
    ok(`${champ} part`, champ in patch && patch[champ] === null);
  }
  ok("le titre devient un marqueur lisible, pas ses mots a elle",
     patch.titre === TITRE_ANONYME && !String(patch.titre).includes("Seville"));
  /* Les metriques se calculent sur ces colonnes : les toucher reecrirait
     l'histoire du produit dans /admin/atelier/metriques. */
  for (const intouchable of ["created_at", "etat_maj_le", "etat", "nb_photos", "nb_pages",
                             "palier", "token", "consent_photos", "id"]) {
    ok(`${intouchable} n'est PAS dans le patch (les metriques restent justes)`,
       !(intouchable in patch));
  }
}

/* ═════════ T-046 : LE FREIN DU LOGIN ADMIN (regle pure) ═════════
   La Map vit dans la route ; ici on eprouve la REGLE : delai croissant et
   plafonne, blocage au seuil, oubli apres la fenetre, journalisation des
   recidives. Rappel honnete : par instance Vercel, ca decourage un script
   naif, ca n'arrete pas une attaque (cf. src/app/api/CLAUDE.md). */

titre("— T-046 : le frein du login admin —");
const T0_FREIN = 1_000_000_000;
ok("zero echec : zero delai", delaiPourEchecs(0) === 0);
ok("le delai croit avec les echecs",
   delaiPourEchecs(1) > 0 && delaiPourEchecs(2) > delaiPourEchecs(1)
   && delaiPourEchecs(5) > delaiPourEchecs(2));
ok(`le delai plafonne a ${DELAI_MAX_MS} ms (une lambda n'attend pas des minutes)`,
   delaiPourEchecs(1_000) === DELAI_MAX_MS && delaiPourEchecs(SEUIL_BLOCAGE * 100) === DELAI_MAX_MS);
ok("un compte d'echecs absurde ne casse rien",
   delaiPourEchecs(-3) === 0 && delaiPourEchecs(Number.NaN) === 0);

let frein = apresEchec(undefined, T0_FREIN);
ok("premier echec : compteur a 1, fenetre ouverte",
   frein.echecs === 1 && frein.resetAt === T0_FREIN + FENETRE_FREIN_MS);
for (let i = 1; i < SEUIL_BLOCAGE; i++) frein = apresEchec(frein, T0_FREIN + i);
ok(`au ${SEUIL_BLOCAGE}e echec dans la fenetre : bloque (429)`,
   frein.echecs === SEUIL_BLOCAGE && estBloque(frein, T0_FREIN + SEUIL_BLOCAGE));
ok("juste avant le seuil : pas bloque",
   !estBloque({ echecs: SEUIL_BLOCAGE - 1, resetAt: T0_FREIN + FENETRE_FREIN_MS }, T0_FREIN + 1));
ok("fenetre expiree : le blocage tombe, l'ardoise repart de 1",
   !estBloque(frein, T0_FREIN + FENETRE_FREIN_MS)
   && apresEchec(frein, T0_FREIN + FENETRE_FREIN_MS).echecs === 1);
ok("aucun etat : pas bloque (jamais de verrouillage par defaut)",
   !estBloque(undefined, T0_FREIN));
ok(`les logs Vercel parlent a partir du ${SEUIL_JOURNAL}e echec, pas avant`,
   !doitJournaliser(SEUIL_JOURNAL - 1) && doitJournaliser(SEUIL_JOURNAL)
   && doitJournaliser(SEUIL_JOURNAL + 5));

/* ════════ T-012 : un HEAD R2 qui echoue — absence ou panne ? ════════ */

titre("— T-012 : estAbsenceR2 distingue « pas la » (silence) de « panne » (log) —");

ok("NotFound (objet absent) : une absence, silence voulu",
   estAbsenceR2({ name: "NotFound", $metadata: { httpStatusCode: 404 } }));
ok("NoSuchKey : une absence aussi",
   estAbsenceR2({ name: "NoSuchKey" }));
ok("un 404 sans nom d'erreur reste une absence",
   estAbsenceR2({ $metadata: { httpStatusCode: 404 } }));
ok("reseau coupe (TypeError fetch failed) : une PANNE, elle doit parler",
   !estAbsenceR2(new TypeError("fetch failed")));
ok("403 AccessDenied (config) : une panne, pas une absence",
   !estAbsenceR2({ name: "AccessDenied", $metadata: { httpStatusCode: 403 } }));
ok("500 R2 : une panne",
   !estAbsenceR2({ name: "InternalError", $metadata: { httpStatusCode: 500 } }));
ok("null/undefined ne sont jamais une absence (pas de silence par defaut)",
   !estAbsenceR2(null) && !estAbsenceR2(undefined));

/* ════════ T-020 : ce qui a le droit de partir chez Vercel Analytics ════════ */

titre("— T-020 : cheminPublic masque le token AVANT tout envoi —");

const TOKEN = "aB3xY9kLmN0pQ7rS2tU4vW6zC8dE1fG5"; // 32 caracteres base64url
const O = "https://www.bellajour.fr";

const urlNumero = cheminPublic(`${O}/numero/${TOKEN}`);
ok("/numero/<token> devient /numero/[token]",
   urlNumero === `${O}/numero/${MASQUE}`);
ok("le token n'apparait NULLE PART dans l'URL rendue",
   urlNumero !== null && !urlNumero.includes(TOKEN));
ok("le retour de paiement ne traine pas le token non plus",
   cheminPublic(`${O}/numero/${TOKEN}?paiement=ok`) === `${O}/numero/${MASQUE}`);

ok("/composer?reprendre=<token> : le lien de reprise est jete",
   cheminPublic(`${O}/composer?reprendre=${TOKEN}`) === `${O}/composer`);
ok("/ambassadeurs/espace?token=… : le jeton d'ambassadrice est jete",
   cheminPublic(`${O}/ambassadeurs/espace?token=${TOKEN}&confirmer=1`)
   === `${O}/ambassadeurs/espace`);
ok("le fragment (#…) ne part jamais",
   cheminPublic(`${O}/magazine#tarifs`) === `${O}/magazine`);

ok("/admin/atelier/<token> : rien ne part du tout",
   cheminPublic(`${O}/admin/atelier/${TOKEN}`) === null);
ok("/admin/atelier/metriques : l'arriere-boutique ne se mesure pas",
   cheminPublic(`${O}/admin/atelier/metriques`) === null);
ok("/admin tout court : rien non plus",
   cheminPublic(`${O}/admin`) === null);

ok("une page publique passe intacte",
   cheminPublic(`${O}/magazine`) === `${O}/magazine`
   && cheminPublic(`${O}/`) === `${O}/`);
ok("un nom de route long n'est PAS pris pour un token",
   cheminPublic(`${O}/mentions-legales`) === `${O}/mentions-legales`
   && cheminPublic(`${O}/ambassadeurs/espace`) === `${O}/ambassadeurs/espace`);

ok("les utm_* survivent (attribution de campagne)",
   cheminPublic(`${O}/?utm_source=instagram&utm_campaign=lancement`)
   === `${O}/?utm_source=instagram&utm_campaign=lancement`);
ok("tout autre parametre tombe, meme a cote d'un utm_*",
   cheminPublic(`${O}/inviter?ref=marie&utm_source=story`)
   === `${O}/inviter?utm_source=story`);
ok("un utm_* demesure (> 64 car.) est jete plutot que recopie",
   cheminPublic(`${O}/?utm_source=${"x".repeat(65)}`) === `${O}/`);

ok("filet generique : une future route dynamique est masquee d'office",
   cheminPublic(`${O}/cadeau/aB3xY9kLmN0pQ7rS`) === `${O}/cadeau/${MASQUE}`);
ok("une URL illisible n'envoie RIEN (le doute profite a la cliente)",
   cheminPublic("pas-une-url") === null && cheminPublic("") === null);

void verifierT005().then(() => {
  console.log(ko === 0 ? "\nTOUT PASSE\n" : `\n${ko} ECHEC(S)\n`);
  process.exit(ko === 0 ? 0 : 1);
});

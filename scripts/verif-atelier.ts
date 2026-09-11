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

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { preparerTransition, actionsDepuis, cleCadrageCouverture } from "@/lib/atelier/transitions";
import { urgencePour, comparerUrgence, etapeDepot } from "@/lib/atelier/urgence";
import {
  lireDoublesBrutes,
  lirePlanchesBrutes,
  lireChoixCouverture,
  dernierChoixCouverture,
  MAX_DOUBLES,
  MAX_PLANCHES,
} from "@/lib/atelier/apercu";
import { construirePlanche, formatDepuisRatio, SEUIL_PLANCHE } from "@/lib/atelier/formatVisuel";
/* Le brouillon LOCAL du panneau d'action (11/09/2026). Module sans React
   exprès : le composant tire `next/navigation` et une feuille de style, ce
   harnais ne peut charger ni l'un ni l'autre. */
import {
  CLE_BROUILLON,
  depuis,
  ecrireBrouillonPanneau,
  effacerBrouillonPanneau,
  empreinte,
  lireBrouillonPanneau,
  nomDeCle,
} from "@/app/admin/atelier/[token]/brouillonPanneau";
import type Stripe from "stripe";
import {
  codesPour,
  doitAutoValider,
  doitRattraperM4,
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
  ecranDuChamp,
  normaliserTelephone,
  premierManquant,
  reponseValide,
  suggestionEmail,
  telephoneValide,
} from "@/lib/atelier/questionnaire";
import {
  PAYS_DEFAUT,
  PAYS_LIBELLE,
  PAYS_TRIES,
  normaliserPays,
  paysValide,
} from "@/lib/atelier/pays";
import { lireSignal, suitePour, typeEvenement } from "@/lib/atelier/rebond";
import {
  totalPour,
  centimesPourPages,
  centimesDuDossier,
  eurosDuDossier,
  formaterCentimes,
  formaterEuros,
  palierHerite,
  PAYS_LIVRAISON,
  QUANTITE_MAX,
  REIMPRESSION_CENTIMES,
  centimesReimpression,
  reimpressionOuverte,
} from "@/lib/atelier/prix";
import {
  GRILLE,
  BANDES_PHOTOS,
  PAGES_AUTORISEES,
  eurosPourPages,
  reliurePour,
  EUROS_MAX,
  EUROS_MIN,
  PAGES_AGRAFE,
  PAGES_MAX,
  PAGES_MAX_PUBLIC,
  GRILLE_PUBLIQUE,
  EUROS_MAX_PUBLIC,
  PAGES_MIN,
  PAS_PAGES,
  RELIURE_LIBELLE,
} from "@/lib/atelier/grille";
import { palierPour as bandePour } from "@/app/(atelier)/composer/depot/paliers";
import { peutRecommander } from "@/lib/atelier/reimpression";
import {
  cheminRetour,
  motRetour,
  marqueProvenance,
} from "@/app/(atelier)/composer/provenance";
import { raconter } from "@/lib/atelier/recit";
import {
  COLONNES_BROUILLON,
  ETAT_BROUILLON,
  TYPE_BROUILLON,
  appliquerBrouillon,
  lireBrouillon,
} from "@/lib/atelier/brouillon";
import {
  codeDansLeJournal,
  codesPossibles,
  creditEncoreDu,
  estCollisionDeCode,
  numeroFondatricePour,
  numeroRattache,
  parametreCredit,
  CREDIT_FONDATRICE_CENTIMES,
  CREDIT_FONDATRICE_EUROS,
  type LigneWaitlist,
} from "@/lib/atelier/fondatrice";
import { lireSuivi, nomTransporteur } from "@/lib/atelier/suivi";
import { boiteRognee, decouperCouverture, nomFichierSouvenir } from "@/lib/atelier/souvenir";
import { composerBrief, NOM_BRIEF, type MatiereBrief } from "@/lib/atelier/brief";
import {
  adresseCloudprinter,
  telephoneE164,
  indicatifPour,
  estCleImpression,
  interpreterSignal,
  payloadCommande,
  payloadDevis,
  SHIPPING_LEVEL,
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
  livraisonEncaissee,
  dureeEtape,
  dureesEtapes,
  compterEntonnoir,
  reactiviteConversion,
  composerConstats,
  repartirParPages,
  libelleParPages,
  ETAPES_VIE,
  ENTONNOIR,
  type EvenementMesure,
  type Seau,
} from "@/lib/atelier/mesure";
import {
  centimesDeSaisie,
  lireDevisCloudprinter,
  livraisonClient,
  livraisonClientAvec,
  totalCommande,
  ttcDepuisHt,
  LIVRAISON_PLAFOND_CENTIMES,
  TAUX_TTC_LIVRAISON,
  HORS_UE,
} from "@/lib/atelier/livraison";
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
import {
  peutVoirDossier,
  doitEpingler,
  sectionPour,
  classerDossiers,
  numerosEnCours,
  type DossierDuCompte,
} from "@/lib/compte/rattachement";
import { suiteSure } from "@/lib/compte/garde";
import { compteOuvert } from "@/lib/compte/session";
import {
  GENRES_NOTE,
  csvCarnet,
  filtreGenre,
  filtrerNotes,
  genreNote,
  joursDePeriode,
  libelleDossier,
  libelleGenre,
  periodeCarnet,
  referenceDossier,
  texteCarnet,
  type GenreNote,
  type NoteCarnet,
} from "@/lib/atelier/carnet";

let ko = 0;
const ok = (n: string, c: boolean) => {
  console.log(`${c ? "  ok " : "  KO "} ${n}`);
  if (!c) ko++;
};
const titre = (t: string) => console.log(`\n${t}`);

/* ════════════════════════════ TRANSITIONS ════════════════════════════ */

const VISUELS = { apercu_c1: "k/c1.jpg", apercu_c4: "k/c4.jpg", apercu_double: "k/d.jpg" };

titre("— le prix vient de la pagination, jamais du navigateur —");
const p34 = preparerTransition("publier_apercu", "photos_recues", { nb_pages: "34", pays_livraison: "FR", ...VISUELS });
ok("34 pages -> 37 EUR, bucket herite p40, dos carre",
   p34.ok && p34.resume.euros === 37 && p34.resume.palier === "p40"
   && p34.resume.reliure === "dos_carre");
const p24 = preparerTransition("publier_apercu", "photos_recues", { nb_pages: 24, pays_livraison: "FR", ...VISUELS });
ok("24 pages -> 27 EUR", p24.ok && p24.resume.euros === 27);
const p44 = preparerTransition("publier_apercu", "photos_recues", { nb_pages: 44, pays_livraison: "FR", ...VISUELS });
ok("44 pages -> 45 EUR", p44.ok && p44.resume.euros === 45);
const p20 = preparerTransition("publier_apercu", "photos_recues", { nb_pages: 20, pays_livraison: "FR", ...VISUELS });
ok("20 pages -> 25 EUR et AGRAFE (la seule pagination agrafee)",
   p20.ok && p20.resume.euros === 25 && p20.resume.reliure === "agrafe");
const p60 = preparerTransition("publier_apercu", "photos_recues", { nb_pages: 60, pays_livraison: "FR", ...VISUELS });
ok("60 pages est ACCEPTE : la grille monte jusque-la (59 EUR)",
   p60.ok && p60.resume.euros === 59 && p60.patch.prix_centimes === 5900);

/* Les trois refus qui protegent la caisse. 22 est le trou volontaire de la
   grille (l'agrafe s'arrete a 20, le dos carre commence a 24), 33 est un
   impair, 62 est au-dela de la derniere ligne. Aucun ne doit pouvoir etre
   publie : une couverture sans prix, c'est M3 qui part sans montant. */
for (const [pages, pourquoi] of [[22, "le trou de la grille"], [33, "un impair"], [62, "au-dela du maximum"]] as Array<[number, string]>) {
  const r = preparerTransition("publier_apercu", "photos_recues", { nb_pages: pages, pays_livraison: "FR", ...VISUELS });
  ok(`${pages} pages (${pourquoi}) : REFUSE, sur le champ nb_pages`,
     !r.ok && r.erreurs.some((e) => e.champ === "nb_pages"));
}
ok("le message de refus DERIVE de la grille (bornes, pas, exclusion)",
   (() => {
     const r = preparerTransition("publier_apercu", "photos_recues", { nb_pages: 22, pays_livraison: "FR", ...VISUELS });
     if (r.ok) return false;
     const m = r.erreurs.find((e) => e.champ === "nb_pages")?.message ?? "";
     return m.includes(String(PAGES_MIN)) && m.includes(String(PAGES_MAX))
       && m.includes(String(PAS_PAGES)) && m.includes(String(PAGES_AGRAFE + PAS_PAGES));
   })());

/* ── LE PRIX SE FIGE SUR LE DOSSIER (10/09/2026) ──────────────────────────
   Publier l'apercu, c'est montrer un montant a une cliente. A partir de cet
   instant le dossier vaut CE prix : la colonne `prix_centimes` doit donc etre
   dans le patch, au centime, et l'ecran de verification doit annoncer la meme
   chose que ce qui sera ecrit. Si ce test tombe, une grille qui change
   reecrira le prix de dossiers deja chiffres. */
const pGel = preparerTransition("publier_apercu", "photos_recues", { nb_pages: 34, pays_livraison: "FR", ...VISUELS });
ok("publier : le prix est GELE dans le patch (34 pages -> 3700 centimes)",
   pGel.ok && pGel.patch.prix_centimes === 3700);
ok("publier : l'ecran de verification annonce le MEME montant que le patch",
   pGel.ok && pGel.resume.prixCentimes === 3700);
ok("publier : le bucket herite part quand meme en base (colonne palier)",
   pGel.ok && pGel.patch.palier === "p40");
const pGelCorrige = preparerTransition("corriger_apercu", "apercu_pret", { nb_pages: 44, pays_livraison: "FR", ...VISUELS });
ok("corriger : republier regele le prix (44 pages -> 4500 centimes)",
   pGelCorrige.ok && pGelCorrige.patch.prix_centimes === 4500
   && pGelCorrige.resume.prixCentimes === 4500);

/* ── LE PAYS DE LIVRAISON A LA PUBLICATION (lot 3, revu le 11/09/2026) ────
   Publier l'apercu, c'est annoncer un prix. Depuis que le port est devise par
   destination, ce prix n'est pas complet sans pays — d'ou l'exigence posee le
   10/09. Elle obligeait l'atelier a CHOISIR une destination a la place des
   dossiers ouverts avant l'ecran 4, c'est-a-dire a deviner : exactement ce
   qu'elle voulait empecher. Mathias a tranche le 11/09 : sans pays, on publie
   quand meme, et c'est LE CLIENT qui choisit sur sa page, ou la livraison est
   chiffree avant le paiement.
   Le pays est NORMALISE par la meme fonction que la route : l'atelier tape ce
   qu'il veut, c'est le code canonique qui entre en base. */
const pPays = preparerTransition("publier_apercu", "photos_recues",
  { nb_pages: 34, pays_livraison: "be", ...VISUELS });
ok("publier : « be » est normalise en BE dans le patch",
   pPays.ok && pPays.patch.pays_livraison === "BE");
ok("publier : l'ecran de verification annonce le meme pays que le patch",
   pPays.ok && pPays.resume.pays === "BE");
const pSansPays = preparerTransition("publier_apercu", "photos_recues",
  { nb_pages: 34, ...VISUELS });
ok("publier SANS pays : ACCEPTE (le client choisira sur sa page)", pSansPays.ok);
ok("publier sans pays : aucune colonne pays n'entre dans le patch",
   pSansPays.ok && !("pays_livraison" in pSansPays.patch));
/* `null` et pas « absent » : l'ecran de confirmation doit pouvoir DIRE
   « livraison choisie par le client », et une cle manquante ne dit rien. */
ok("publier sans pays : le resume l'annonce (pays === null), il ne se tait pas",
   pSansPays.ok && pSansPays.resume.pays === null);
ok("publier sans pays : AUCUN port n'est exige ni ecrit",
   pSansPays.ok && !("livraison_centimes" in pSansPays.patch));
/* ⚠️ UN PORT SANS PAYS N'A PAS DE SENS : il n'a ete chiffre pour nulle part,
   et il ferait taire la question sur la page du client en affichant un
   montant. On refuse, sur le champ du PAYS — c'est lui qui manque. */
const pPortSansPays = preparerTransition("publier_apercu", "photos_recues",
  { nb_pages: 34, livraison_centimes: "4,90", ...VISUELS });
ok("un port SANS pays : refuse, et c'est le pays qu'on reclame",
   !pPortSansPays.ok && pPortSansPays.erreurs.some((e) => e.champ === "pays_livraison"));
ok("un port sans pays : le montant n'entre nulle part",
   !pPortSansPays.ok);
const pHorsZone = preparerTransition("publier_apercu", "photos_recues",
  { nb_pages: 34, pays_livraison: "US", ...VISUELS });
ok("publier vers un pays hors zone : refuse",
   !pHorsZone.ok && pHorsZone.erreurs.some((e) => e.champ === "pays_livraison"));
const pCorrigePays = preparerTransition("corriger_apercu", "apercu_pret",
  { nb_pages: 44, pays_livraison: "LU", ...VISUELS });
ok("corriger : le pays se regele lui aussi",
   pCorrigePays.ok && pCorrigePays.patch.pays_livraison === "LU"
   && pCorrigePays.resume.pays === "LU");

titre("— ce qui doit etre REFUSE —");
const p52 = preparerTransition("publier_apercu", "photos_recues", { nb_pages: 51, pays_livraison: "FR", ...VISUELS });
ok("51 pages refusees (impair, hors grille)", !p52.ok && p52.erreurs[0].champ === "nb_pages");
ok("12 pages refusees", !preparerTransition("publier_apercu", "photos_recues", { nb_pages: 12, pays_livraison: "FR", ...VISUELS }).ok);
const sansImg = preparerTransition("publier_apercu", "photos_recues", { nb_pages: 34, pays_livraison: "FR", apercu_c1: "k/c1.jpg" });
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

/* ── apercu : 1 a 3 couvertures proposees au choix (T-093) ────────────────
   Meme contrat que les doubles pages, et surtout : TOUS les dossiers deja
   publies (une seule cle `plat`) doivent continuer de se lire sans reprise. */
ok("planches : le tableau `plats` est lu dans l'ordre de proposition",
   JSON.stringify(lirePlanchesBrutes({ plats: ["a", "b", "c"] })) === JSON.stringify(["a", "b", "c"]));
ok(`planches : borne a ${MAX_PLANCHES} (au-dela, un choix devient un catalogue)`,
   lirePlanchesBrutes({ plats: ["a", "b", "c", "d"] }).length === MAX_PLANCHES);
ok("planches : un dossier deja publie (`plat` seul) reste lisible",
   JSON.stringify(lirePlanchesBrutes({ plat: "k/plat.jpg" })) === JSON.stringify(["k/plat.jpg"]));
ok("planches : le tableau prime sur la valeur unique",
   JSON.stringify(lirePlanchesBrutes({ plats: ["a"], plat: "z" })) === JSON.stringify(["a"]));
ok("planches : vides et non-chaines ignores",
   JSON.stringify(lirePlanchesBrutes({ plats: ["a", "", 7, "  b  "] })) === JSON.stringify(["a", "b"]));
ok("planches : rien -> liste vide",
   lirePlanchesBrutes({}).length === 0 && lirePlanchesBrutes({ plat: "" }).length === 0);
ok("planches : alias `couverture_plat` accepte (ancienne ecriture)",
   JSON.stringify(lirePlanchesBrutes({ couverture_plat: "y" })) === JSON.stringify(["y"]));

/* La PUBLICATION : une seule couverture s'ecrit comme avant (pas de cle
   `plats` parasite), plusieurs ecrivent la liste ET gardent `plat` = la
   premiere, celle que la cliente voit par defaut. */
const uneSeule = preparerTransition("publier_apercu", "photos_recues",
  { nb_pages: 34, pays_livraison: "FR", apercu_plats: ["k/p1.jpg"] });
ok("publier : une seule couverture n'ecrit PAS de cle `plats`",
   uneSeule.ok && JSON.stringify(uneSeule.patch.apercu_urls) === JSON.stringify({ plat: "k/p1.jpg" }));
const troisChoix = preparerTransition("publier_apercu", "photos_recues",
  { nb_pages: 34, pays_livraison: "FR", apercu_plats: ["k/p1.jpg", "k/p2.jpg", "k/p3.jpg"] });
const urlsChoix = troisChoix.ok ? (troisChoix.patch.apercu_urls as Record<string, unknown>) : {};
ok("publier : trois couvertures ecrivent la liste, `plat` = la premiere",
   troisChoix.ok && urlsChoix.plat === "k/p1.jpg" &&
   JSON.stringify(urlsChoix.plats) === JSON.stringify(["k/p1.jpg", "k/p2.jpg", "k/p3.jpg"]));
const ancienAppel = preparerTransition("publier_apercu", "photos_recues",
  { nb_pages: 34, pays_livraison: "FR", apercu_plat: "k/seul.jpg" });
ok("publier : l'ancien champ `apercu_plat` seul marche toujours",
   ancienAppel.ok && JSON.stringify(ancienAppel.patch.apercu_urls) === JSON.stringify({ plat: "k/seul.jpg" }));

/* ── le cadrage des doubles pages (T-090, 07/09) ──────────────────────────
   Une valeur `object-position` qui finit dans un attribut `style` : on ne
   garde que la forme attendue, et seulement pour les pages publiees. */
const cadre = preparerTransition("publier_apercu", "photos_recues", {
  nb_pages: 34, pays_livraison: "FR",
  apercu_plat: "k/p.jpg",
  apercu_doubles: ["k/d1.jpg", "k/d2.jpg"],
  apercu_cadrages: { "k/d1.jpg": "50% 30%", "k/d2.jpg": "top" },
});
const urlsCadre = cadre.ok ? (cadre.patch.apercu_urls as Record<string, unknown>) : {};
ok("cadrage : les valeurs valides sont ecrites",
   cadre.ok && JSON.stringify(urlsCadre.cadrages) === JSON.stringify({ "k/d1.jpg": "50% 30%", "k/d2.jpg": "top" }));

const cadreSale = preparerTransition("publier_apercu", "photos_recues", {
  nb_pages: 34, pays_livraison: "FR",
  apercu_plat: "k/p.jpg",
  apercu_doubles: ["k/d1.jpg"],
  apercu_cadrages: {
    "k/d1.jpg": "url(javascript:alert(1))",
    "k/absente.jpg": "50% 50%",
  },
});
const urlsSale = cadreSale.ok ? (cadreSale.patch.apercu_urls as Record<string, unknown>) : {};
ok("cadrage : une valeur qui n'est pas une position est REFUSEE",
   cadreSale.ok && urlsSale.cadrages === undefined);
ok("cadrage : une cle qui ne correspond a aucune page publiee est ignoree",
   cadreSale.ok && urlsSale.cadrages === undefined);

const sansCadrage = preparerTransition("publier_apercu", "photos_recues", {
  nb_pages: 34, pays_livraison: "FR",
  apercu_plat: "k/p.jpg",
  apercu_doubles: ["k/d1.jpg"],
});
const urlsSans = sansCadrage.ok ? (sansCadrage.patch.apercu_urls as Record<string, unknown>) : {};
ok("cadrage : rien de regle -> aucune cle `cadrages` en base (cas normal inchange)",
   sansCadrage.ok && !("cadrages" in urlsSans));

/* ── le cadrage des DEUX FACES d'une planche (T-090, rouvert 07/09) ────────
   Meme brique que les doubles pages, mais une planche montre C1 ET C4 :
   deux cles derivees de la meme cle de coffre, jamais confondues. */
ok("cleCadrageCouverture : deux faces, deux cles distinctes",
   cleCadrageCouverture("k/plat.jpg", "droite") !== cleCadrageCouverture("k/plat.jpg", "gauche") &&
   cleCadrageCouverture("k/plat.jpg", "droite") === "k/plat.jpg::droite");

const cadrePlanche = preparerTransition("publier_apercu", "photos_recues", {
  nb_pages: 34, pays_livraison: "FR",
  apercu_plat: "k/plat.jpg",
  apercu_cadrages: {
    [cleCadrageCouverture("k/plat.jpg", "droite")]: "88% 50%",
    [cleCadrageCouverture("k/plat.jpg", "gauche")]: "12% 50%",
  },
});
const urlsCadrePlanche = cadrePlanche.ok ? (cadrePlanche.patch.apercu_urls as Record<string, unknown>) : {};
ok("cadrage planche : les deux faces sont ecrites, sous des cles distinctes",
   cadrePlanche.ok &&
   JSON.stringify(urlsCadrePlanche.cadrages) === JSON.stringify({
     "k/plat.jpg::droite": "88% 50%",
     "k/plat.jpg::gauche": "12% 50%",
   }));

const cadrePlancheRetiree = preparerTransition("publier_apercu", "photos_recues", {
  nb_pages: 34, pays_livraison: "FR",
  apercu_plat: "k/plat.jpg",
  apercu_cadrages: {
    [cleCadrageCouverture("k/absente.jpg", "droite")]: "88% 50%",
  },
});
const urlsCadrePlancheRetiree = cadrePlancheRetiree.ok
  ? (cadrePlancheRetiree.patch.apercu_urls as Record<string, unknown>)
  : {};
ok("cadrage planche : la cle d'une planche non publiee est ignoree",
   cadrePlancheRetiree.ok && urlsCadrePlancheRetiree.cadrages === undefined);

ok("cadrage planche : sans reglage, la publication reste identique au cas normal",
   sansCadrage.ok && !("cadrages" in urlsSans));
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
// T-091 — la feuille d'ajustement de l'etat 2 fait remonter le dossier en A FAIRE.
ok("etat 2 + ajustement demande = remonte en A FAIRE (la balle change de camp)",
   urgencePour("apercu_pret", ilYAh(200), NOW, { ajustement: true, ajustementLe: ilYAh(3) }).pile === "a_faire");
ok("ajustement : le libelle le dit",
   urgencePour("apercu_pret", ilYAh(200), NOW, { ajustement: true, ajustementLe: ilYAh(3) }).libelle.startsWith("ajustement demand"));
ok("ajustement : date depuis la DEMANDE, pas depuis l'entree dans l'etat",
   urgencePour("apercu_pret", ilYAh(200), NOW, { ajustement: true, ajustementLe: ilYAh(3) }).libelle.includes("3 h"));
ok("ajustement : sans demande, l'etat 2 reste chez la cliente",
   urgencePour("apercu_pret", ilYAh(200), NOW, { ajustement: false }).pile === "attente_cliente");
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
  retouches_demandees_le: null, souvenir_pdf_key: null,
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

titre("— M7b et M8, apres livraison —");
ok("livree sans M7 : rien ne part (chaine)", codesPour(d({ etat: "livree", etat_maj_le: ilYA(0) }), env(), MAINTENANT).length === 0);
ok("livree aujourd'hui avec M7 : M7b part, la vente attend",
   codesPour(d({ etat: "livree", etat_maj_le: ilYA(0) }), env(["M7", ilYA(0)]), MAINTENANT).join() === "M7b");
ok("M7b deja parti, livree aujourd'hui : rien",
   codesPour(d({ etat: "livree", etat_maj_le: ilYA(0) }), env(["M7", ilYA(0)], ["M7b", ilYA(0)]), MAINTENANT).length === 0);
/* M8 reste chaine sur M7, PAS sur M7b : un souvenir jamais genere retiendrait
   M7b, et rechainer M8 dessus le bloquerait pour toujours. */
ok("livree il y a 4 j, M7b jamais parti : M7b puis M8 (M8 n'attend pas M7b)",
   codesPour(d({ etat: "livree", etat_maj_le: ilYA(4) }), env(["M7", ilYA(4)]), MAINTENANT).join() === "M7b,M8");
ok("livree il y a 4 j, M7b parti : M8",
   codesPour(d({ etat: "livree", etat_maj_le: ilYA(4) }), env(["M7", ilYA(4)], ["M7b", ilYA(4)]), MAINTENANT).join() === "M8");

titre("— jamais deux fois —");
ok("M1 deja parti : rien", codesPour(d({}), env(["M1", ilYA(1)]), MAINTENANT).length === 0);
ok("M4 ne se rattrape jamais au balayage", codesPour(d({ etat: "payee" }), env(), MAINTENANT).length === 0);

titre("— M4, le seul mail qu'on REPARE (05/09) —");
/* Il part au webhook Stripe. S'il echoue, plus rien ne repassait derriere :
   M5 l'exige, donc le dossier PAYE se figeait pour toujours. La reparation
   se decide sur la PREUVE de l'echec, jamais sur l'etat seul. */
ok("paye, M4 en echec au journal : on repare",
   doitRattraperM4(d({ etat: "payee" }), env(), true));
ok("paye, M4 jamais parti mais AUCUN echec : on ne repare pas (etat force a la main)",
   !doitRattraperM4(d({ etat: "payee" }), env(), false));
ok("paye, M4 deja parti : rien, meme avec un vieil echec repare",
   !doitRattraperM4(d({ etat: "payee" }), env(["M4", ilYA(1)]), true));
ok("pas encore paye : M4 ne se repare pas d'avance",
   !doitRattraperM4(d({ etat: "apercu_pret" }), env(), true));
ok("maquette publiee dans la journee, M4 en echec : on repare encore (M5 l'exige)",
   doitRattraperM4(d({ etat: "maquette_prete" }), env(), true));
ok("deja expedie : on ne reveille plus la chaine",
   !doitRattraperM4(d({ etat: "expediee" }), env(), true));
ok("deja livre : on ne reveille plus la chaine",
   !doitRattraperM4(d({ etat: "livree" }), env(), true));

titre("— l'auto-validation a J+7 —");
ok("maquette + M5 + 8 j : valide d'office", doitAutoValider(d({ etat: "maquette_prete", etat_maj_le: ilYA(8) }), env(["M5", ilYA(8)]), MAINTENANT));
ok("maquette + M5 + 5 j : elle a encore le temps", !doitAutoValider(d({ etat: "maquette_prete", etat_maj_le: ilYA(5) }), env(["M5", ilYA(5)]), MAINTENANT));
ok("maquette SANS M5 + 30 j : on n'imprime PAS en silence", !doitAutoValider(d({ etat: "maquette_prete", etat_maj_le: ilYA(30) }), env(), MAINTENANT));

titre("— la planche a plat + 0 a 3 doubles pages (T2-2 / T-090) —");
const pPlat = preparerTransition("publier_apercu", "photos_recues", {
  nb_pages: 34, pays_livraison: "FR", apercu_plat: "k/plat.jpg", apercu_doubles: ["k/d1.jpg", "k/d2.jpg"],
});
ok("planche + doubles : la liste ordonnee entre en base",
   pPlat.ok && JSON.stringify(pPlat.patch.apercu_urls) === JSON.stringify({ plat: "k/plat.jpg", doubles: ["k/d1.jpg", "k/d2.jpg"] }));
const pPlatSeule = preparerTransition("publier_apercu", "photos_recues", { nb_pages: 34, pays_livraison: "FR", apercu_plat: "k/plat.jpg" });
ok("planche SEULE : acceptee, `doubles` absent (0 double permis, decision 02/09)",
   pPlatSeule.ok && JSON.stringify(pPlatSeule.patch.apercu_urls) === JSON.stringify({ plat: "k/plat.jpg" }));
const pPlat4 = preparerTransition("publier_apercu", "photos_recues", {
  nb_pages: 34, pays_livraison: "FR", apercu_plat: "k/plat.jpg", apercu_doubles: ["a", "b", "c", "d"],
});
ok("planche + 4 doubles : rognee a 3 a l'ecriture",
   pPlat4.ok && (pPlat4.patch.apercu_urls as { doubles: string[] }).doubles.length === MAX_DOUBLES);
const pPlatVides = preparerTransition("publier_apercu", "photos_recues", {
  nb_pages: 34, pays_livraison: "FR", apercu_plat: "k/plat.jpg", apercu_doubles: ["", "  k/d.jpg  ", null as unknown as string],
});
ok("planche + doubles vides/espaces : ignorees et rognees",
   pPlatVides.ok && JSON.stringify(pPlatVides.patch.apercu_urls) === JSON.stringify({ plat: "k/plat.jpg", doubles: ["k/d.jpg"] }));
const pTrio = preparerTransition("publier_apercu", "photos_recues", { nb_pages: 34, pays_livraison: "FR", ...VISUELS });
ok("le trio historique reste accepte (correction d'anciens dossiers)",
   pTrio.ok && JSON.stringify(pTrio.patch.apercu_urls) === JSON.stringify({ c1: "k/c1.jpg", c4: "k/c4.jpg", double: "k/d.jpg" }));
const pMixte = preparerTransition("publier_apercu", "photos_recues", {
  nb_pages: 34, pays_livraison: "FR", apercu_plat: "k/plat.jpg", apercu_doubles: ["k/d1.jpg"], ...({ apercu_c1: "k/c1.jpg" }),
});
ok("planche fournie : c1 est ignore, jamais de melange des deux formats",
   pMixte.ok && JSON.stringify(pMixte.patch.apercu_urls) === JSON.stringify({ plat: "k/plat.jpg", doubles: ["k/d1.jpg"] }));

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
ok("M7b sans PDF souvenir : signale (jamais un lien vers un 404)",
   manquePour("M7b", d({ souvenir_pdf_key: null })).includes("souvenir_pdf_key"));
ok("M7b avec PDF souvenir : complet",
   manquePour("M7b", d({ souvenir_pdf_key: "numeros/x/souvenir/a1b2c3d4.pdf" })).length === 0);

/* Retournee le 03/09, apres un constat en PRODUCTION : le bouton pointait le
   FICHIER, qui se telechargeait en laissant un onglet blanc (une reponse en
   piece jointe ne rend aucune page). Il envoie desormais sur la PAGE, qui
   porte le meme bouton et le poids du fichier. */
titre("— M7b : le bouton envoie sur la PAGE, jamais sur le fichier —");
const m7b = parametresPour("M7b", d({ souvenir_pdf_key: "numeros/x/souvenir/a1b2c3d4.pdf" }));
ok("LIEN pointe sur la page du numero",
   typeof m7b.LIEN === "string" && m7b.LIEN.includes("/numero/t"));
ok("aucun lien direct vers le fichier (l'onglet blanc de production)",
   !JSON.stringify(m7b).includes("/api/atelier/souvenir"));
ok("la cle R2 ne voyage jamais dans le mail",
   !JSON.stringify(m7b).includes("a1b2c3d4"));

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
  euros: 37,
  createdAt: "2026-08-12T09:00:00.000Z",
  occasion: "Un anniversaire",
  histoire: "On a marche des kilometres dans Triana.",
  sousTitre: null,
  motQuatrieme: null,
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
ok("sans mots de couverture, le bloc n'existe pas", !BRIEF.includes("LES MOTS DE COUVERTURE"));
/* La ligne « Pages » nomme la RELIURE, plus un code de palier (10/09/2026) :
   agrafe ou dos carre change la facon de monter la couverture, « p40 » ne
   disait rien a personne. */
ok("le brief nomme la reliure, pas un code de palier",
   BRIEF.includes(RELIURE_LIBELLE.dos_carre) && !BRIEF.includes("p40"));
ok("le brief porte le prix a cote de la pagination", BRIEF.includes("37 "));

/* Les mots de couverture (03/09) : pr\u00e9sents, ils forment leur bloc. */
const BRIEF_COUVERTURE = composerBrief(
  { ...MATIERE, sousTitre: "Seville, juin 2026", motQuatrieme: "A la bande." },
  new Date("2026-08-25T08:00:00.000Z"),
);
ok("le brief porte le sous-titre de couverture", BRIEF_COUVERTURE.includes("Seville, juin 2026"));
ok("le brief porte le mot de quatrieme", BRIEF_COUVERTURE.includes("A la bande."));
ok("le bloc des mots de couverture est nomme", BRIEF_COUVERTURE.includes("LES MOTS DE COUVERTURE"));
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
ok("60 pages -> dos carre (la grille monte jusque-la)",
   produitPour(60)?.produit === "magazine_pb_a4_p_fc");
ok("18 pages -> aucun produit", produitPour(18) === null);
/* 22 et 61 ne sont PAS dans la grille : depuis le 10/09/2026 ils ne
   designent plus aucun produit, la ou 22 tombait avant en dos carre par
   repli arbitraire. Une pagination qu'on ne sait pas facturer ne part pas a
   l'impression. */
ok("22 pages -> aucun produit (le trou de la grille, plus de repli)", produitPour(22) === null);
ok("61 pages (impair) -> aucun produit", produitPour(61) === null);
ok("62 pages -> aucun produit", produitPour(62) === null);
ok("pagination absente -> aucun produit", produitPour(null) === null);
/* La reliure et la reference produit sortent de la MEME fonction : elles ne
   peuvent pas diverger. Ce test-la est le lien entre les deux tables. */
ok("produitPour SUIT reliurePour, pagination par pagination",
   PAGES_AUTORISEES.every((n) =>
     (reliurePour(n) === "agrafe") === (produitPour(n)?.produit === "magazine_sas_a4_p_fc")
     && (reliurePour(n) === "dos_carre") === (produitPour(n)?.produit === "magazine_pb_a4_p_fc")));

titre("— le telephone Cloudprinter passe en E.164 avec le pays (test 01/09) —");
ok("national FR -> +33, zero de tete retire", telephoneE164("0680009071", "FR") === "+33680009071");
ok("national BE -> +32", telephoneE164("0470123456", "BE") === "+32470123456");
ok("national LU -> +352 (pas de zero national a retirer)", telephoneE164("621123456", "LU") === "+352621123456");
ok("deja en +... : garde tel quel", telephoneE164("+33612345678", "FR") === "+33612345678");
ok("national DE -> +49, zero retire (zone Europe, 11/09)", telephoneE164("0170 1234567", "DE") === "+491701234567");
ok("national GB -> +44", telephoneE164("07700 900123", "GB") === "+447700900123");
ok("national CH -> +41", telephoneE164("079 123 45 67", "CH") === "+41791234567");
ok("national IT -> +39 et le ZERO RESTE (il fait partie du numero)", telephoneE164("02 1234567", "IT") === "+39021234567");
ok("chaque pays de la zone a son indicatif : aucun numero ne part national par oubli",
   PAYS_LIVRAISON.every((p) => indicatifPour(p) !== null));
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


/* ════════════════════ LA LIVRAISON FACTUREE EN SUS (lot 6) ════════════════
   Mathias a tranche le 10/09/2026 : le port sort du prix du magazine et se
   devise chez Cloudprinter, par destination. Tout ce qui suit s'appuie sur
   DEUX RELEVES REELS de leur `prices/lookup`, rangees dans scripts/fixtures/ :
   ce ne sont PAS des tarifs decides, ce sont des reponses d'API capturees un
   jour donne. Le parseur doit savoir les lire, c'est tout ce qu'on teste. */

titre("— le devis Cloudprinter, lu sur des reponses REELLES —");

const fixture = (nom: string): unknown =>
  JSON.parse(readFileSync(resolve(process.cwd(), "scripts/fixtures", nom), "utf8"));

const DEVIS_FR = fixture("cloudprinter-devis.json");
const DEVIS_BE = fixture("cloudprinter-devis-be-20.json");

/* LE PIEGE CENTRAL DU LOT : `cp_saver` (SHIPPING_LEVEL) n'est PAS propose
   pour la France en 32 pages. Commander sous ce niveau reviendrait a acheter
   un service qui n'a jamais ete chiffre. Le parseur retient donc le MOINS
   CHER des niveaux offerts, et le DIT. */
const devFR = lireDevisCloudprinter(DEVIS_FR, SHIPPING_LEVEL);
ok("FR/32 : cp_saver absent, on retient le moins cher (cp_ground) et on le signale",
   devFR.ok && devFR.niveauVouluAbsent === true && devFR.devis.niveau === "cp_ground");
ok("FR/32 : 9,2160 EUR HT devient 922 centimes (arrondi au centime)",
   devFR.ok && devFR.devis.htCentimes === 922);
/* L'espace finale de « Colissimo  » est dans la reponse reelle : ce trim n'est
   pas de la coquetterie, cette chaine s'affiche dans le back-office. */
ok("FR/32 : le transporteur est lisible et debarrasse de son espace finale",
   devFR.ok && devFR.devis.transporteur === "Colissimo"
   && devFR.devis.service === "Ground - Tracked");

const devFast = lireDevisCloudprinter(DEVIS_FR, "cp_fast");
ok("FR/32 : un niveau DEMANDE et propose est retenu tel quel (cp_fast, 976)",
   devFast.ok && devFast.devis.niveau === "cp_fast" && devFast.devis.htCentimes === 976
   && devFast.niveauVouluAbsent === false);

const devBE = lireDevisCloudprinter(DEVIS_BE, SHIPPING_LEVEL);
ok("BE/20 : un seul niveau propose, cp_ground a 1245 centimes",
   devBE.ok && devBE.devis.niveau === "cp_ground" && devBE.devis.htCentimes === 1245
   && devBE.niveauVouluAbsent === true);

/* Cinq formes de refus. Aucune ne doit rendre un montant : un port invente
   serait un montant que personne n'a decide (interdit nº5). */
for (const [corps, quoi] of [
  [{}, "un objet vide"],
  [null, "null"],
  ["x", "une chaine"],
  [{ shipments: [] }, "aucune expedition"],
  [{ shipments: [{ quotes: [] }] }, "aucun tarif"],
] as Array<[unknown, string]>) {
  ok(`devis illisible (${quoi}) : refuse, avec une raison affichable`,
     (() => {
       const r = lireDevisCloudprinter(corps, SHIPPING_LEVEL);
       return !r.ok && typeof r.raison === "string" && r.raison.length > 0;
     })());
}

titre("— du cout HT de l'imprimeur au prix client TTC —");

/* ⚠️ CE N'EST PAS UN TAUX FISCAL. C'est un COEFFICIENT commercial (le taux
   normal du pays), pour afficher le port TTC comme le magazine. La TVA
   reellement facturee est celle de Stripe Tax. Regle a valider par Mathias. */
ok("FR : 922 HT donne 1106 TTC (coefficient 20 %)", ttcDepuisHt(922, "FR") === 1106);
ok("BE : 1245 HT donne 1506 TTC (coefficient 21 %)", ttcDepuisHt(1245, "BE") === 1506);
ok("LU : 1000 HT donne 1170 TTC (coefficient 17 %)", ttcDepuisHt(1000, "LU") === 1170);
/* Un pays hors table ne se devine PAS : la route retombe alors sur la saisie
   a la main, ce qui est le comportement sur. */
ok("un pays hors zone ne rend AUCUN montant", ttcDepuisHt(922, "US") === null);
/* ⚠️ UNE ENTREE PAR DESTINATION, SANS EXCEPTION (11/09/2026, ouverture de
   l'Europe). Un pays de la zone sans coefficient rendrait `null` au moment du
   devis : le client verrait « nous n'avons pas pu chiffrer » pour une
   destination pourtant proposee dans le menu. */
ok("les 30 destinations ont toutes un coefficient, et aucune de plus",
   PAYS_LIVRAISON.every((c) => typeof TAUX_TTC_LIVRAISON[c] === "number")
   && Object.keys(TAUX_TTC_LIVRAISON).length === PAYS_LIVRAISON.length);
ok("DE : 1000 HT donne 1190 TTC (coefficient 19 %)", ttcDepuisHt(1000, "DE") === 1190);
/* Hors Union : on n'ajoute RIEN. Les droits d'importation eventuels sont
   reclames au destinataire, et la page du client le DIT avant le paiement. */
ok("GB : 1000 HT reste 1000 (hors Union, aucune TVA ajoutee par nous)",
   ttcDepuisHt(1000, "GB") === 1000);
ok("les trois pays hors Union sont a zero, et ce ne sont pas les memes que HORS_UE par hasard",
   TAUX_TTC_LIVRAISON.GB === 0 && TAUX_TTC_LIVRAISON.CH === 0 && TAUX_TTC_LIVRAISON.NO === 0
   && [...HORS_UE].sort().join(",") === "CH,GB,NO");
ok("aucun pays de l'Union n'est a zero (un taux oublie se lit comme un cadeau)",
   PAYS_LIVRAISON.filter((c) => !(HORS_UE as readonly string[]).includes(c))
     .every((c) => TAUX_TTC_LIVRAISON[c] > 0));

titre("— le plafond : au-dela, Bellajour absorbe —");

ok("sans plafond, le client paie tout et rien n'est absorbe",
   (() => { const r = livraisonClientAvec(1106, null); return r.client === 1106 && r.absorbe === 0; })());
ok("plafond a 600 : le client paie 600, Bellajour absorbe 506",
   (() => { const r = livraisonClientAvec(1106, 600); return r.client === 600 && r.absorbe === 506; })());
ok("sous le plafond, il ne se passe RIEN (500 reste 500)",
   (() => { const r = livraisonClientAvec(500, 600); return r.client === 500 && r.absorbe === 0; })());
/* Le plafond du depot n'est pas encore pose (Mathias le tranchera) : tant
   qu'il vaut null, `livraisonClient` ne doit rien plafonner. */
ok("le plafond du depot n'est pas encore pose, donc il n'absorbe rien",
   LIVRAISON_PLAFOND_CENTIMES === null && livraisonClient(9999).absorbe === 0);

titre("— un montant tape a la main par l'atelier —");

/* CHOIX ASSUME : au-dela de deux decimales on ARRONDIT (« 12,345 » -> 1235)
   plutot que de refuser. Le centime n'existe pas en dessous, et refuser une
   saisie pour une decimale de trop ferait perdre le geste sans rien proteger. */
ok("« 4,90 », « 4.9 » et 4.9 donnent tous 490 centimes",
   centimesDeSaisie("4,90") === 490 && centimesDeSaisie("4.9") === 490
   && centimesDeSaisie(4.9) === 490);
ok("« 0 » vaut ZERO, pas « inconnu » : offrir le port est une decision",
   centimesDeSaisie("0") === 0);
ok("vide, negatif et illisible rendent null, jamais un montant",
   centimesDeSaisie("") === null && centimesDeSaisie("   ") === null
   && centimesDeSaisie("-1") === null && centimesDeSaisie("abc") === null
   && centimesDeSaisie(null) === null && centimesDeSaisie(undefined) === null);
ok("« 12,345 » est ARRONDI a 1235, il n'est pas refuse", centimesDeSaisie("12,345") === 1235);

titre("— le total d'une commande —");

const ordinaire = totalCommande({ prixCentimes: 3700, livraisonCentimes: 1106, creditCentimes: 0, portOffert: false });
ok("un client ordinaire, 34 pages : 37 EUR + 11,06 EUR = 48,06 EUR",
   ordinaire.prix === 3700 && ordinaire.livraison === 1106 && ordinaire.remise === 0
   && ordinaire.total === 4806);

/* Le fondateur ne paie NI son credit NI son port (decision de Mathias). */
const fondateur34 = totalCommande({ prixCentimes: 3700, livraisonCentimes: 1106, creditCentimes: 3000, portOffert: true });
ok("un fondateur, 34 pages : 30 EUR deduits, port offert, reste 7 EUR",
   fondateur34.remise === 3000 && fondateur34.livraison === 0 && fondateur34.total === 700);

/* ⚠️ LE SURPLUS DE CREDIT EST PERDU, et c'est le comportement de Stripe
   (`amount_off` plafonne au total). SUR, mais pas tranche commercialement :
   ce test fige ce qu'on fait AUJOURD'HUI, il ne valide pas une decision. */
const fondateur20 = totalCommande({ prixCentimes: 2500, livraisonCentimes: 1106, creditCentimes: 3000, portOffert: true });
ok("un fondateur, 20 pages : la remise est plafonnee au prix, le total tombe a 0",
   fondateur20.remise === 2500 && fondateur20.total === 0);
ok("un total n'est JAMAIS negatif, quel que soit le credit",
   totalCommande({ prixCentimes: 100, livraisonCentimes: 0, creditCentimes: 99999, portOffert: true }).total === 0);
/* Le credit ne deborde pas sur le port : Stripe ne reporte pas un reliquat. */
ok("le credit ne s'impute jamais sur la livraison d'un client ordinaire",
   totalCommande({ prixCentimes: 2500, livraisonCentimes: 1106, creditCentimes: 3000, portOffert: false }).total === 1106);

titre("— la livraison a la publication de l'apercu —");

const pLivr = preparerTransition("publier_apercu", "photos_recues",
  { nb_pages: 34, pays_livraison: "FR", livraison_centimes: "4,90", ...VISUELS });
ok("un montant tape en EUROS entre en base en CENTIMES",
   pLivr.ok && pLivr.patch.livraison_centimes === 490 && pLivr.resume.livraisonCentimes === 490);

/* ⚠️ LE CHAMP VIDE EST UN SIGNAL, PAS UN ZERO : il dit « devise pour moi ».
   Ecrire 0 par defaut ferait offrir le port en silence, a tout le monde. */
const pLivrVide = preparerTransition("publier_apercu", "photos_recues",
  { nb_pages: 34, pays_livraison: "FR", livraison_centimes: "", ...VISUELS });
ok("un champ vide ne pose AUCUNE cle : c'est la route qui devisera",
   pLivrVide.ok && !("livraison_centimes" in pLivrVide.patch));
const pLivrAbsent = preparerTransition("publier_apercu", "photos_recues",
  { nb_pages: 34, pays_livraison: "FR", ...VISUELS });
ok("un champ absent se comporte comme un champ vide",
   pLivrAbsent.ok && !("livraison_centimes" in pLivrAbsent.patch));

const pLivrNeg = preparerTransition("publier_apercu", "photos_recues",
  { nb_pages: 34, pays_livraison: "FR", livraison_centimes: "-2", ...VISUELS });
ok("un montant negatif est REFUSE, sur son propre champ",
   !pLivrNeg.ok && pLivrNeg.erreurs.some((e) => e.champ === "livraison_centimes"));

const pLivrZero = preparerTransition("publier_apercu", "photos_recues",
  { nb_pages: 34, pays_livraison: "FR", livraison_centimes: "0", ...VISUELS });
ok("zero est ACCEPTE et gele : offrir le port est une decision legitime",
   pLivrZero.ok && pLivrZero.patch.livraison_centimes === 0);

/* Le niveau ne vient pas d'un clavier : il est renvoye par l'ecran apres le
   devis. Une valeur abimee est IGNOREE, jamais transformee en erreur — un
   niveau bancal ne doit pas empecher de publier une couverture. */
const pNiveau = preparerTransition("publier_apercu", "photos_recues",
  { nb_pages: 34, pays_livraison: "FR", livraison_niveau: "cp_ground", ...VISUELS });
ok("le niveau d'expedition est gele avec le montant",
   pNiveau.ok && pNiveau.patch.livraison_niveau === "cp_ground");
const pNiveauSale = preparerTransition("publier_apercu", "photos_recues",
  { nb_pages: 34, pays_livraison: "FR", livraison_niveau: "CP GROUND!", ...VISUELS });
ok("un niveau qui ne respecte pas le motif de la base est IGNORE, sans erreur",
   pNiveauSale.ok && !("livraison_niveau" in pNiveauSale.patch));

titre("— le devis chiffre EXACTEMENT ce qu'on commandera —");

/* Si les options du devis et celles de la commande divergent, le devis chiffre
   un autre objet — et l'ecart ne fait AUCUNE erreur, seulement un prix faux.
   C'est pour ca que les deux passent par la meme construction. */
const OPT_DEVIS = payloadDevis({ pays: "FR", produit: produitPour(32)!, pages: 32 }).items[0].options;
const OPT_COMMANDE = CORPS.items[0].options;
ok("payloadDevis et payloadCommande envoient EXACTEMENT les memes options",
   JSON.stringify(OPT_DEVIS) === JSON.stringify(OPT_COMMANDE));
ok("le devis part en EUR, sur un exemplaire, sans fichier ni adresse",
   (() => {
     const d = payloadDevis({ pays: "BE", produit: produitPour(20)!, pages: 20 });
     return d.currency === "EUR" && d.country === "BE" && d.items.length === 1
       && d.items[0].count === "1" && !("files" in d.items[0]) && !("addresses" in d);
   })());

/* Le niveau GELE au devis remonte jusqu'a la commande. Sans lui, on
   acheterait `cp_saver` — que la France ne propose meme pas. */
ok("payloadCommande commande le niveau GELE quand on le lui donne",
   payloadCommande({
     reference: "r", emailContact: "c@b.com", adresse: ADR_OK,
     produit: produitPour(32)!, pages: 32,
     fichiers: { cover: { url: "u", md5: MD5 }, book: { url: "u", md5: MD5 } },
   }, "cp_ground").items[0].shipping_level === "cp_ground");
ok("sans niveau gele, elle retombe sur SHIPPING_LEVEL, comme avant le lot 6",
   CORPS.items[0].shipping_level === SHIPPING_LEVEL
   && payloadCommande({
     reference: "r", emailContact: "c@b.com", adresse: ADR_OK,
     produit: produitPour(32)!, pages: 32,
     fichiers: { cover: { url: "u", md5: MD5 }, book: { url: "u", md5: MD5 } },
   }, null).items[0].shipping_level === SHIPPING_LEVEL);

titre("— les signaux CloudSignal —");
ok("ItemShipped expedie", interpreterSignal("ItemShipped").effet === "expedier");
ok("ItemError alerte sans changer l'etat", interpreterSignal("ItemError").effet === "alerte");
ok("ItemCanceled alerte", interpreterSignal("ItemCanceled").effet === "alerte");
ok("CloudprinterOrderCanceled alerte", interpreterSignal("CloudprinterOrderCanceled").effet === "alerte");
ok("ItemDeliveryFailed alerte", interpreterSignal("ItemDeliveryFailed").effet === "alerte");
ok("ItemPacked se journalise seulement", interpreterSignal("ItemPacked").effet === "journal");
/* Retournee le 03/09 (decision de Mathias) : la livraison passe l'etat en
   « livree » toute seule et fait partir M7b. L'ancienne assertion disait
   l'inverse — c'etait la regle d'avant, pas un oubli. */
ok("ItemDeliveryCompleted livre (7 vers 8, M7b part)",
   interpreterSignal("ItemDeliveryCompleted").effet === "livrer");
ok("un type inconnu tombe au journal, jamais en erreur", interpreterSignal("ItemFutur2027").effet === "journal");

/* ═══════════════ LE PDF SOUVENIR — la geometrie (03/09) ═══════════════ */

titre("— le PDF souvenir : rognage au format fini —");
const PTS = (mm: number) => (mm * 72) / 25.4;
/* Une page de bloc 216 x 303 (fini + 3 mm de fond perdu partout). */
const rognee = boiteRognee(PTS(216), PTS(303));
ok("216 x 303 : rognee a 210 x 297", pointsEnMm(rognee.largeur) === 210 && pointsEnMm(rognee.hauteur) === 297);
ok("le rognage est centre (3 mm de chaque cote)", pointsEnMm(rognee.x) === 3 && pointsEnMm(rognee.y) === 3);
/* Une page deja au format fini : rien a couper. */
const finie = boiteRognee(PTS(210), PTS(297));
ok("210 x 297 : laissee telle quelle", finie.x === 0 && pointsEnMm(finie.largeur) === 210);
/* Un format inattendu : on ne charcute pas, on rend la page entiere. */
const bizarre = boiteRognee(PTS(180), PTS(240));
ok("format inconnu : page entiere, jamais amputee", bizarre.x === 0 && bizarre.largeur === PTS(180));

titre("— le PDF souvenir : la couverture enveloppante se decoupe —");
/* 24 pages : dos 2,404 mm (SPECS-CLOUDPRINTER.md) -> largeur 428,4, hauteur 303. */
const feuille24 = decouperCouverture(PTS(2 * 213 + 2.404), PTS(303));
ok("feuille 24 p : decoupee", feuille24 !== null);
ok("le dos est MESURE sur la feuille, pas calcule au grammage",
   feuille24 !== null && Math.abs(feuille24.dosMm - 2.404) < 0.05);
ok("la 1re de couv est le panneau de DROITE, au format fini",
   feuille24 !== null &&
     pointsEnMm(feuille24.c1.largeur) === 210 &&
     feuille24.c1.x > feuille24.c4.x);
ok("la 4e est le panneau de gauche, apres le fond perdu",
   feuille24 !== null && pointsEnMm(feuille24.c4.x) === 3);
/* 50 pages : dos 3,925 mm. */
const feuille50 = decouperCouverture(PTS(2 * 213 + 3.925), PTS(303));
ok("feuille 50 p : dos plus epais, decoupe toujours juste",
   feuille50 !== null && Math.abs(feuille50.dosMm - 3.925) < 0.05);
/* Une feuille trop etroite pour deux faces : refus, jamais de charcutage. */
ok("feuille trop etroite : refus propre", decouperCouverture(PTS(216), PTS(303)) === null);
ok("hauteur impossible : refus propre", decouperCouverture(PTS(428.4), PTS(200)) === null);

titre("— le PDF souvenir : le nom de fichier —");
ok("le titre entre dans le nom", nomFichierSouvenir("Notre été à Séville") === "Bellajour - Notre été à Séville.pdf");
ok("sans titre, un nom digne quand meme", nomFichierSouvenir(null) === "Bellajour - Votre numero.pdf");
ok("les caracteres interdits d'un nom de fichier sautent", !nomFichierSouvenir('a/b:c"d').includes("/"));

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
  /* Depuis le lot 3 (10/09), le pays fait partie des reponses exigees : sans
     lui, ce dossier serait refuse pour le pays et non pour le titre, et le
     test ci-dessous ne prouverait plus rien. */
  pays: "FR",
};
ok("sans titre : REFUSE, et on dit lequel",
   premierManquant(CHAMPS_QUESTIONNAIRE, (c) => flore[c]) === "titre");
ok("avec un titre : accepte",
   premierManquant(CHAMPS_QUESTIONNAIRE, (c) => ({ ...flore, titre: "Maroc" })[c]) === null);

titre("— le PREMIER champ fautif, pas un bilan —");
ok("occasion avant histoire",
   premierManquant(CHAMPS_QUESTIONNAIRE, () => "") === "occasion");
ok("chaque ecran connait ses champs",
   CHAMPS_PAR_ECRAN[1].length === 1 && CHAMPS_PAR_ECRAN[4].length === 4);
ok("tous les champs sont couverts par les quatre ecrans",
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
ok("la forme francaise entre en base sans ses espaces",
   normaliserTelephone("06 12 34 56 78") === "0612345678");

/* ═══ LE TELEPHONE AJOUTE OU CORRIGE DEPUIS LA FICHE (11/09/2026) ═══
   Les dossiers ouverts avant le 28/08 n'ont pas de telephone et Cloudprinter
   en exige un : sans lui, c'est le numero de la maison qui part chez le
   transporteur. La route admin ecrit la forme NORMALISEE (celle que
   Cloudprinter attend) et journalise l'avant et l'apres. */

titre("— le telephone pose a la main : la route ecrit ce que le questionnaire valide —");
ok("un numero tape avec des espaces est accepte", telephoneValide("06 12 34 56 78"));
ok("il entre en base sous la forme que Cloudprinter attend",
   normaliserTelephone("06 12 34 56 78") === "0612345678");
ok("un champ vide est REFUSE (on n'efface jamais le seul moyen de joindre)",
   !telephoneValide(""));
ok("sept chiffres : REFUSE", !telephoneValide("0612345"));
ok("seize chiffres : REFUSE", !telephoneValide("+3312345678901234"));

titre("— le recit du telephone : ajout et correction ne disent pas la meme chose —");
const rTelAjout = raconter("telephone_modifie", {
  avant: null,
  apres: "0612345678",
  par: "Mathias",
});
ok("l'ajout nomme l'admin", rTelAjout.texte.includes("Mathias"));
ok("l'ajout dit « a ajoute »", /a ajout/i.test(rTelAjout.texte));
ok("l'ajout NE dit PAS « a modifie »", !/modifi/i.test(rTelAjout.texte));
ok("le numero pose est lisible dans le detail (c'est l'admin qui lit)",
   (rTelAjout.detail ?? "").includes("0612345678"));

const rTelChange = raconter("telephone_modifie", {
  avant: "+33612345678",
  apres: "+33769710686",
  par: "Louis",
});
ok("la correction dit « a modifie »", /modifi/i.test(rTelChange.texte));
ok("elle nomme l'auteur", rTelChange.texte.includes("Louis"));
ok("le detail porte l'AVANT et l'APRES",
   (rTelChange.detail ?? "").includes("+33612345678")
   && (rTelChange.detail ?? "").includes("+33769710686"));
ok("sans auteur, la phrase reste correcte",
   raconter("telephone_modifie", { avant: null, apres: "0612345678" }).texte.length > 0
   && !/undefined|null/.test(raconter("telephone_modifie", { avant: null, apres: "0612345678" }).texte));
ok("le geste est du cote de l'atelier (ton « nous »)", rTelChange.ton === "nous");

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


titre("— lot 6 : la livraison encaissee, a part du chiffre d'affaires —");

/* ⚠️ LE PORT N'EST PAS UNE VENTE. C'est un cout d'imprimeur refacture, sans
   marge (et parfois absorbe, cf. le plafond de livraison.ts). L'ajouter au CA
   ferait passer du transport pour de la croissance, et le panier moyen
   mentirait d'autant. Deux nombres, deux questions.
   La source est ce que STRIPE dit avoir pris (`livraison_encaissee`, ecrit par
   le webhook), pas ce que le checkout avait demande : l'ecart est precisement
   ce qu'on veut pouvoir constater. */
const JOURNAL_PORT: EvenementMesure[] = [
  evt("P1", "etat_change", 10, { vers: "payee", livraison_encaissee: 1106 }),
  evt("P2", "etat_change", 20, { vers: "payee", livraison_encaissee: 1506 }),
  /* Fondateur : port offert. Zero est une INFORMATION, pas une absence. */
  evt("P3", "etat_change", 30, { vers: "payee", livraison_encaissee: 0 }),
  /* Paiement d'AVANT le lot 6 : aucune ligne de livraison, il ne compte pour
     rien — et c'est juste, aucun port n'a ete facture ce jour-la. */
  evt("P4", "etat_change", 40, { vers: "payee" }),
  /* Une transition qui n'est PAS un paiement ne doit rien ajouter. */
  evt("P5", "etat_change", 50, { vers: "maquette_prete", livraison_encaissee: 9999 }),
  /* Hors fenetre. */
  evt("P6", "etat_change", 500, { vers: "payee", livraison_encaissee: 5000 }),
];
ok("le port encaisse s'additionne sur la fenetre, et seulement sur les paiements",
   livraisonEncaissee(JOURNAL_PORT, T0, FIN) === 1106 + 1506);
ok("un paiement hors fenetre n'entre pas dans le total",
   livraisonEncaissee(JOURNAL_PORT, T0, T0 + 15 * H) === 1106);
ok("un journal sans aucune ligne de livraison rend ZERO, jamais NaN",
   livraisonEncaissee(JOURNAL, T0, FIN) === 0);

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
   Les paliers degressifs ne sont PAS decides (interdit nº5 : jamais inventer
   une remise). La structure `totalPour` existe, verrouillee a 1 exemplaire :
   a 1, elle DOIT rendre le prix unitaire au centime, et tout le reste DOIT
   etre refuse. Lever le verrou = QUANTITE_MAX dans prix.ts, quand Mathias
   donne les paliers — et ces tests changeront AVEC lui, pas avant.

   Depuis le 10/09/2026 elle prend des CENTIMES et non un palier : l'appelant
   a deja le prix gele du dossier sous la main, et le palier ne nomme plus un
   montant. La boucle balaie TOUTE la grille, ligne par ligne. */

titre("— multi-exemplaires (T-073) : verrouille a 1 —");
ok("QUANTITE_MAX vaut 1 (verrou T-073, leve par Mathias seulement)", QUANTITE_MAX === 1);
for (const g of GRILLE) {
  ok(
    `${g.pages} pages : totalPour(x1) = ${g.euros * 100} centimes, la grille au centime`,
    totalPour(centimesPourPages(g.pages), 1) === g.euros * 100,
  );
  ok(
    `${g.pages} pages : 2 exemplaires REFUSES (aucune remise inventee)`,
    totalPour(centimesPourPages(g.pages), 2) === null,
  );
}
ok("quantite nulle ou negative : refusee",
   totalPour(3700, 0) === null && totalPour(3700, -1) === null);
ok("quantite non entiere : refusee", totalPour(3700, 1.5) === null);
ok("prix absent : null, on ne facture pas sans chiffrage",
   totalPour(null, 1) === null && totalPour(undefined, 1) === null);
ok("un prix qui n'en est pas un (0, negatif, demi-centime) est refuse",
   totalPour(0, 1) === null && totalPour(-100, 1) === null && totalPour(12.5, 1) === null);

/* ══════════════ LE PRIX GELE SUR LE DOSSIER (10/09/2026) ══════════════
   Decision de Mathias : le prix annonce est le prix debite, sur CE dossier,
   meme si la grille change ensuite. `centimesDuDossier` porte cette regle et
   elle est lue par tout le monde (page cliente, mails, checkout, admin,
   compte, metriques). Ce qu'on verifie ici :
     — le gel gagne TOUJOURS sur la grille, meme quand les deux different ;
     — l'absence de gel retombe sur la grille au centime pres, ce qui est le
       comportement d'avant le 10/09 (dossiers anciens, et fenetre entre le
       deploiement et la migration ou le repli 42703 efface la colonne) ;
     — une valeur qui ne peut pas etre un prix (0, negatif, non entiere) est
       IGNOREE plutot que facturee : elle ne vient pas d'une publication
       d'apercu, donc d'un UPDATE a la main ou d'une donnee abimee. */

titre("— le prix GELE sur le dossier : le gel gagne, la grille rattrape —");
/* ⚠️ LE REPLI PASSE PAR `nb_pages` DEPUIS LE 10/09/2026, plus par le palier :
   le palier ne nomme plus un montant, s'en servir facturerait 30 EUR un
   dossier de 28 pages qui en vaut 31. */
ok("le gel gagne sur la grille (3000 alors que 34 pages diraient 3700)",
   centimesDuDossier({ prix_centimes: 3000, nb_pages: 34 }) === 3000);
ok("pas de gel : la grille rattrape, au centime (34 pages -> 3700)",
   centimesDuDossier({ prix_centimes: null, nb_pages: 34 }) === 3700);
ok("colonne absente (repli 42703) : la grille rattrape aussi",
   centimesDuDossier({ nb_pages: 34 }) === 3700);
ok("zero n'est pas un prix : ignore, on retombe sur la grille",
   centimesDuDossier({ prix_centimes: 0, nb_pages: 34 }) === 3700);
ok("un negatif n'est pas un prix : ignore",
   centimesDuDossier({ prix_centimes: -5, nb_pages: 34 }) === 3700);
ok("un demi-centime n'existe pas chez Stripe : ignore",
   centimesDuDossier({ prix_centimes: 12.5, nb_pages: 34 }) === 3700);
ok("ni gel ni pagination : null, on ne facture pas sans chiffrage",
   centimesDuDossier({ prix_centimes: null, nb_pages: null }) === null
   && centimesDuDossier({}) === null);
ok("une pagination hors grille ne rattrape RIEN (22 pages -> null)",
   centimesDuDossier({ nb_pages: 22 }) === null);
ok("le palier seul ne facture plus rien : il n'est plus un prix",
   centimesDuDossier({ palier: "p40" }) === null);
ok("le gel se lit meme sans pagination (un dossier chiffre reste chiffre)",
   centimesDuDossier({ prix_centimes: 3700, nb_pages: null }) === 3700);
ok("eurosDuDossier = centimes / 100, sans arrondi maison",
   eurosDuDossier({ prix_centimes: 3700 }) === 37
   && eurosDuDossier({ prix_centimes: 490 }) === 4.9
   && eurosDuDossier({ nb_pages: 44 }) === 45
   && eurosDuDossier({}) === null);

titre("— formater un montant : des decimales SEULEMENT si elles disent quelque chose —");
/* L'espace avant le symbole est INSECABLE (U+00A0) : un prix ne se coupe
   jamais en fin de ligne. Meme regle que `formaterEuros`. */
ok('490 -> « 4,90 € »', formaterCentimes(490) === "4,90 €");
ok('3700 -> « 37 € » (pas « 37,00 € », l\'atelier n\'est pas comptable)',
   formaterCentimes(3700) === "37 €");
ok('1005 -> « 10,05 € » (le zero des centimes ne saute pas)',
   formaterCentimes(1005) === "10,05 €");
ok("l'espace avant l'euro est insecable, comme formaterEuros",
   formaterCentimes(3000).includes(" ") && formaterEuros(30) === formaterCentimes(3000));
ok("zero se dit « 0 € » plutot que rien",
   formaterCentimes(0) === "0 €");

/* ═══════════════ D'OU L'ON VIENT, ET DONC OU L'ON RETOURNE ═══════════════
   Mathias, 08/09 : « quand je clique sur la croix et je vais quitter, ca ne
   m'emmene pas sur la page ou j'etais avant ». La sortie du questionnaire
   etait ecrite en dur sur /magazine.
   Le retour arrive maintenant par l'URL — donc par quelqu'un qui peut ecrire
   ce qu'il veut. La moitie de ces tests ne verifie pas le confort : elle
   verifie qu'AUCUN parametre ne peut faire de ce lien une redirection
   ouverte. Ils sont la pour echouer le jour ou quelqu'un « simplifierait »
   `cheminRetour` en renvoyant le parametre tel quel. */
titre("— d'ou l'on vient : les retours legitimes —");
const TOK = "abcdefghijklmnopqrstuvwxyzABCDEF"; /* 32 caracteres, forme valide */
ok("rien -> /magazine, le comportement d'avant garde en filet",
   cheminRetour(null) === "/magazine" && cheminRetour(undefined) === "/magazine");
ok("compte -> /compte", cheminRetour("compte") === "/compte");
ok("accueil -> /", cheminRetour("accueil") === "/");
ok("magazine -> /magazine", cheminRetour("magazine") === "/magazine");
ok("numero:<token> -> /numero/<token>", cheminRetour(`numero:${TOK}`) === `/numero/${TOK}`);

titre("— d'ou l'on vient : AUCUN parametre ne detourne la sortie —");
for (const attaque of [
  "https://malveillant.example",
  "//malveillant.example",
  "/admin/atelier",
  "javascript:alert(1)",
  "numero:../../admin",
  "numero:trop-court",
  `numero:${TOK}x`,
  `numero:${TOK}/../../admin`,
  "compte/../admin",
  "\\\\malveillant.example",
]) {
  ok(`« ${attaque} » retombe sur /magazine`, cheminRetour(attaque) === "/magazine");
}

titre("— d'ou l'on vient : le libelle nomme la destination —");
ok("compte", motRetour("compte") === "Quitter et revenir à mon compte");
ok("numero valide", motRetour(`numero:${TOK}`) === "Quitter et revenir à mon numéro");
ok("token abime : le libelle suit le defaut, il ne promet pas un numero",
   motRetour("numero:court") === "Quitter et revenir à la page du magazine");
ok("attaque : libelle du defaut", motRetour("//mal.example") === "Quitter et revenir à la page du magazine");

titre("— d'ou l'on vient : on n'ecrit jamais une marque bancale —");
ok("token valide -> numero:<token>", marqueProvenance("numero", TOK) === `numero:${TOK}`);
ok("token absent -> null, donc AUCUN parametre dans l'URL",
   marqueProvenance("numero") === null);
ok("token trop court -> null", marqueProvenance("numero", "abc") === null);
ok("compte -> compte", marqueProvenance("compte") === "compte");

/* ═══════════════ RECOMMANDER UN NUMERO (T-105) : VERROUILLE ═══════════════
   Mathias, 08/09 : « qu'on ait tout le processus qui soit prevu pour pouvoir
   recommander le meme produit ». Il a tranche le circuit (paiement puis
   impression directe) et PAS le prix. Ces tests-la gardent le verrou : leur
   role est de faire echouer la verification le jour ou quelqu'un ouvrirait la
   reimpression sans avoir pose de montant. */
titre("— recommander un numero (T-105) : verrouille tant que le prix n'est pas donne —");
ok("REIMPRESSION_CENTIMES est null : Mathias n'a pas tranche le prix",
   REIMPRESSION_CENTIMES === null);
ok("reimpressionOuverte() est faux : rien ne s'affiche cote cliente",
   reimpressionOuverte() === false);
for (const g of GRILLE) {
  ok(`centimesReimpression(${g.pages} pages) = null : aucun prix de repli invente`,
     centimesReimpression(g.pages) === null);
}
ok("un numero LIVRE avec pagination : refuse pour 'prix_non_tranche', pas autre chose",
   JSON.stringify(peutRecommander({ etat: "livree", nb_pages: 34 }))
     === JSON.stringify({ possible: false, refus: "prix_non_tranche" }));
ok("un numero EN FABRICATION s'entend dire qu'il n'est pas livre, pas que le prix manque",
   JSON.stringify(peutRecommander({ etat: "maquette_prete", nb_pages: 34 }))
     === JSON.stringify({ possible: false, refus: "pas_livree" }));
ok("un numero livre SANS pagination : 'prix_inconnu' — il n'a jamais ete chiffre",
   JSON.stringify(peutRecommander({ etat: "livree", nb_pages: null }))
     === JSON.stringify({ possible: false, refus: "prix_inconnu" }));
ok("un numero livre a une pagination HORS GRILLE : 'prix_inconnu' aussi",
   JSON.stringify(peutRecommander({ etat: "livree", nb_pages: 22 }))
     === JSON.stringify({ possible: false, refus: "prix_inconnu" }));
ok("l'ordre des controles tient : pas livre ET sans pagination -> 'pas_livree'",
   JSON.stringify(peutRecommander({ etat: "payee", nb_pages: null }))
     === JSON.stringify({ possible: false, refus: "pas_livree" }));
ok("AUCUN etat ne rend possible:true tant que le verrou tient",
   ["brouillon", "apercu_pret", "payee", "maquette_prete", "expediee", "livree"]
     .every((e) => peutRecommander({ etat: e, nb_pages: 44 }).possible === false));

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

/* ═══ LE RATTACHEMENT A LA MAIN (10/09/2026) : LA PARTIE PURE ═══
   Un fondateur peut composer sous une AUTRE adresse que celle de sa prevente.
   La detection par email ne le voit pas, et le filet manuel non plus puisqu'il
   passe par la meme detection : il n'etait atteignable par aucun des deux.
   L'admin le designe alors, et ce sont les evenements `fondateur_rattache` qui
   portent la designation. Ce qui se teste ici sans base : quel numero une pile
   d'evenements designe, et ce qu'elle NE designe pas.

   Ce qui touche Stripe ou la base reste hors perimetre (cf. le commentaire du
   code fondatrice plus haut) : la relecture de `waitlist` par numero, elle,
   est a effets. */

titre("— rattachement : le numero designe par le journal —");
const evRat = (numero_fondateur: unknown) => ({ payload: { numero_fondateur } });
ok("journal vide : personne n'est rattache",
   numeroRattache([]) === null && numeroRattache(null) === null
   && numeroRattache(undefined) === null);
ok("payload vide ou nul : ignore, jamais devine",
   numeroRattache([{ payload: {} }]) === null
   && numeroRattache([{ payload: null }]) === null);
ok("un numero en CHAINE n'est pas un numero (« 3 » ne vaut pas 3)",
   numeroRattache([evRat("3")]) === null);
ok("zero, negatif, decimal : aucune place de fondateur",
   numeroRattache([evRat(0)]) === null
   && numeroRattache([evRat(-1)]) === null
   && numeroRattache([evRat(2.5)]) === null);
ok("un rattachement lisible designe son numero",
   numeroRattache([evRat(3)]) === 3);
ok("le DERNIER gagne : rattacher est une correction, pas une premiere fois",
   numeroRattache([evRat(3), evRat(7)]) === 7);
ok("une ligne illisible au milieu ne fait pas perdre la designation",
   numeroRattache([evRat(3), { payload: {} }]) === 3);

titre("— rattachement : le recit nomme l'auteur et le numero —");
const rRat = raconter("fondateur_rattache", { numero_fondateur: 3, par: "Mathias" });
ok("la phrase nomme l'admin qui a decide", rRat.texte.includes("Mathias"));
ok("la phrase nomme le numero de fondateur", rRat.texte.includes("nº3"));
ok("elle dit le geste (« rattache »)", /rattach/i.test(rRat.texte));
ok("sans auteur, la phrase reste correcte et garde le numero",
   raconter("fondateur_rattache", { numero_fondateur: 7 }).texte.includes("nº7"));
ok("sans numero lisible, la phrase ne fabrique aucun numero",
   !/nº/.test(raconter("fondateur_rattache", { par: "Louis" }).texte));
ok("le credit frappe sur un dossier rattache le DIT dans le journal",
   (raconter("code_fondatrice_cree", { numero_fondateur: 3, origine: "rattachement" }).detail ?? "")
     .includes("rattach"));
ok("un credit detecte par email ne parle PAS de rattachement",
   !(raconter("code_fondatrice_cree", { numero_fondateur: 3, origine: "email" }).detail ?? "")
     .includes("rattach"));

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
     avec.PRIX === 37 && sans.PRIX === 37);
}
ok("M5 n'annonce AUCUN credit (elle a deja paye)",
   !("CREDIT_FONDATRICE" in parametresPour("M5", dossierM3, { creditFondatriceEuros: 30 })));
ok("M0 non plus (aucun prix, aucun paiement en vue)",
   !("CREDIT_FONDATRICE" in parametresPour("M0", dossierM3, { creditFondatriceEuros: 30 })));

/* Le PRIX que Brevo recoit vient du GEL, pas de la grille du jour (10/09).
   Sans cette regle, changer la grille reecrirait le montant d'un mail deja
   promis a une cliente : M3 annoncerait 40 EUR sur un dossier gele a 37, et
   Stripe debiterait 37. Le mail et le paiement doivent dire LE MEME nombre. */
const dossierGele = d({ etat: "apercu_pret", nb_pages: 34, palier: "p40", prix_centimes: 3700 });
ok("M3 : PRIX vient du prix GELE du dossier (37), pas de la grille (40)",
   parametresPour("M3", dossierGele).PRIX === 37);
ok("M3b : la relance annonce le MEME montant que M3",
   parametresPour("M3b", dossierGele).PRIX === 37);
ok("M5 : la maquette rappelle le meme montant gele",
   parametresPour("M5", d({ etat: "validee", nb_pages: 34, palier: "p40", prix_centimes: 3700 })).PRIX === 37);
ok("M10 : le dernier rappel avant fermeture ne reinvente pas le prix non plus",
   parametresPour("M10", d({ etat: "apercu_pret", nb_pages: 34, palier: "p40", prix_centimes: 3700 })).PRIX === 37);
ok("sans gel, M3 retombe sur la grille, DEPUIS LA PAGINATION (34 -> 37)",
   parametresPour("M3", d({ etat: "apercu_pret", nb_pages: 34, palier: "p40" })).PRIX === 37);
ok("sans gel NI pagination, M3 n'invente aucun prix (le palier ne facture plus)",
   parametresPour("M3", d({ etat: "apercu_pret", nb_pages: null, palier: "p40" })).PRIX === "");


titre("— lot 6 : le port entre dans les mails qui vendent —");

/* ⚠️ LE MAIL QUI ANNONCE UN TOTAL FAUX EST UN PANIER ABANDONNE. M3, M3b et le
   M10 d'une couverture prete portent le LIEN DE PAIEMENT : sans le port, ils
   diraient 37 EUR a quelqu'un a qui Stripe en demandera 48. C'est la garantie
   nº1 du module (jamais un mail qui tombe sur une page fausse), appliquee a un
   chiffre au lieu d'une image. Et /api/atelier/checkout refuserait de toute
   facon le paiement : on enverrait un mail vers un bouton mort. */
const dossierPort = d({
  etat: "apercu_pret", nb_pages: 34, palier: "p40", prix_centimes: 3700,
  livraison_centimes: 1106, pays_livraison: "FR",
});
for (const c of ["M3", "M3b"] as const) {
  ok(`${c} sans port devise ALORS QUE LE PAYS EST CONNU : SIGNALE, le mail ne part pas`,
     manquePour(c, d({ ...dossierPort, livraison_centimes: null })).includes("livraison_centimes"));
  /* ⚠️ SANS PAYS, LE MAIL PART QUAND MEME (11/09/2026). Le dossier n'a pas de
     destination : le client la choisira sur sa page, ou le port sera chiffre
     avant le paiement. Retenir le mail reviendrait a ne jamais l'amener sur
     cette page — donc a ne jamais vendre ce dossier. Le mail bascule sur sa
     phrase sans montant (PAYS_A_CHOISIR). */
  ok(`${c} sans pays NI port : le mail part, il dira que le port sera chiffre`,
     manquePour(c, d({ ...dossierPort, pays_livraison: null, livraison_centimes: null })).length === 0);
  ok(`${c} avec le port : plus rien ne manque`, manquePour(c, dossierPort).length === 0);
}
/* `undefined` (repli 42703, migration pas passee) se traite comme `null` :
   dans les deux cas on ne SAIT pas, et on ne devine pas un port. */
ok("M3 : une colonne absente (repli 42703) retient le mail comme un null",
   manquePour("M3", d({ ...dossierPort, livraison_centimes: undefined })).includes("livraison_centimes"));

/* M10 n'exige le port QUE s'il va parler d'une couverture prete : un depot
   abandonne n'a ni prix ni port a annoncer. */
ok("M10 sur une couverture prete : le port est exige",
   manquePour("M10", d({ ...dossierPort, livraison_centimes: null })).includes("livraison_centimes"));
ok("M10 sur une couverture prete SANS pays : il part quand meme",
   manquePour("M10", d({ ...dossierPort, pays_livraison: null, livraison_centimes: null })).length === 0);
ok("M10 sur un depot abandonne : aucun port exige, il n'annonce aucun total",
   manquePour("M10", d({ etat: "photos_recues", nb_pages: null, palier: null })).length === 0);

/* LES TROIS PARAMETRES SONT TOUJOURS ENVOYES, quitte a etre vides : le
   `{% if %}` de Brevo traite la chaine vide comme faux, mais la LISTE doit
   rester stable d'un dossier a l'autre, sinon verif-mails-brevo ne peut plus
   la comparer aux templates. Meme discipline que CREDIT_FONDATRICE. */
for (const c of ["M3", "M3b", "M10"] as const) {
  const p = parametresPour(c, dossierPort);
  ok(`${c} : LIVRAISON, LIVRAISON_OFFERTE, TOTAL et PAYS_A_CHOISIR sont TOUJOURS envoyes`,
     "LIVRAISON" in p && "LIVRAISON_OFFERTE" in p && "TOTAL" in p && "PAYS_A_CHOISIR" in p);
  /* Le drapeau est une CHAINE, vide quand il n'a rien a dire : le
     `{% if params.X %}` de Brevo traite la chaine vide comme faux, et un
     booleen `false` comme VRAI. Le confondre afficherait la phrase « livraison
     chiffree selon votre pays » sur un dossier deja chiffre. */
  ok(`${c} : PAYS_A_CHOISIR est VIDE quand le pays est connu`, p.PAYS_A_CHOISIR === "");
}

/* Sans pays : le drapeau passe a « oui », et les deux montants se taisent. Le
   mail dit alors « livraison chiffree selon votre pays, avant le paiement »
   au lieu d'annoncer un total qu'il ne peut pas connaitre. */
const sansPaysM3 = parametresPour("M3", d({ ...dossierPort, pays_livraison: null, livraison_centimes: null }));
ok("M3 sans pays : PAYS_A_CHOISIR vaut « oui »", sansPaysM3.PAYS_A_CHOISIR === "oui");
ok("M3 sans pays : LIVRAISON et TOTAL restent VIDES, jamais zero",
   sansPaysM3.LIVRAISON === "" && sansPaysM3.TOTAL === "");
ok("M3 sans pays : le PRIX du magazine, lui, est toujours dit",
   sansPaysM3.PRIX === 37);

const ordinaireM3 = parametresPour("M3", dossierPort);
ok("M3 ordinaire : le port s'ecrit « 11,06 », le total « 48,06 »",
   ordinaireM3.LIVRAISON === "11,06" && ordinaireM3.TOTAL === "48,06"
   && ordinaireM3.LIVRAISON_OFFERTE === "");

/* Un fondateur ne paie NI son credit NI son port : le mail doit dire SON
   total, pas celui des autres. 3700 - 3000 + 0 = 700, donc « 7 » (les
   decimales ne s'ecrivent que quand elles disent quelque chose). */
const fondateurM3 = parametresPour("M3", dossierPort, { creditFondatriceEuros: 30 });
ok("M3 fondateur, 34 pages : livraison offerte et total a 7 EUR",
   fondateurM3.LIVRAISON_OFFERTE === "oui" && fondateurM3.TOTAL === "7");
ok("M3 fondateur : le PRIX affiche reste celui du magazine, jamais diminue",
   fondateurM3.PRIX === 37 && fondateurM3.LIVRAISON === "11,06");

/* Sans port connu, les trois paramètres existent quand meme, vides : le
   template ne casse pas, il se tait. (Le mail, lui, ne partira pas — c'est
   `manquePour` qui le retient, pas la mise en forme.) */
const sansPortM3 = parametresPour("M3", d({ ...dossierPort, livraison_centimes: null }));
ok("sans port : LIVRAISON et TOTAL sont VIDES, jamais zero",
   sansPortM3.LIVRAISON === "" && sansPortM3.TOTAL === "");

/* Les mails d'apres le paiement ne parlent plus de port : il est paye. */
ok("M5 n'envoie aucun parametre de livraison (elle a deja paye)",
   !("LIVRAISON" in parametresPour("M5", dossierPort))
   && !("TOTAL" in parametresPour("M5", dossierPort)));

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

/* ═════════════ LA GRILLE PAR PAGES (10/09/2026) : LA FORME ═════════════
   Grille FINALE de Mathias : un prix TTC par nombre de pages exact, 20 puis
   24 a 60 par pas de 2. Ces tests-la ne verifient pas seulement trois valeurs,
   ils verifient la FORME de la table — c'est ce qui fera echouer la
   verification le jour ou quelqu'un ajoutera 22, un impair, ou un prix qui
   descend. Les montants eux-memes viennent de Mathias : les changer ici sans
   lui, c'est inventer un prix (interdit nº5).

   ⚠️ CE QUE CE BLOC NE VERIFIE PLUS, ET QUI EST UN VRAI ECART.
   Il comparait la grille a l'annexe « Grille tarifaire — Offre Atelier » des
   CGV (src/app/legal/content/cgv.ts), qui dit toujours 30/40/45 EUR pour
   20-28 / 30-38 / 40-50 pages. L'annexe n'a PAS suivi la grille du 10/09 :
   le texte legal appartient a Mathias (interdit nº2) et ne se reecrit pas
   sans son accord. L'ecart est donc REEL et connu, pas oublie. */

titre("— la grille par pages : la forme de la table —");
ok("vingt lignes : 20, puis 24 a 60 par pas de 2", GRILLE.length === 20);
ok("les paginations sont strictement croissantes",
   GRILLE.every((g, i) => i === 0 || g.pages > GRILLE[i - 1].pages));
ok("toutes les paginations sont PAIRES (un magazine se compose par feuilles)",
   GRILLE.every((g) => g.pages % 2 === 0));
ok("le pas est de 2 partout, SAUF le saut 20 -> 24 (22 n'existe pas)",
   GRILLE.every((g, i) => {
     if (i === 0) return true;
     const ecart = g.pages - GRILLE[i - 1].pages;
     return i === 1 ? ecart === 2 * PAS_PAGES : ecart === PAS_PAGES;
   }));
ok("22 pages n'est PAS dans la grille (le trou est volontaire)",
   !PAGES_AUTORISEES.includes(PAGES_AGRAFE + PAS_PAGES));
ok("les prix sont strictement croissants (plus epais n'est jamais moins cher)",
   GRILLE.every((g, i) => i === 0 || g.euros > GRILLE[i - 1].euros));
ok("PAGES_AUTORISEES derive de GRILLE, ligne pour ligne",
   PAGES_AUTORISEES.length === GRILLE.length
   && PAGES_AUTORISEES.every((n, i) => n === GRILLE[i].pages));

titre("— la grille par pages : les valeurs de Mathias —");
ok("20 pages = 25 EUR (le prix d'appel)", eurosPourPages(20) === 25);
ok("34 pages = 37 EUR (le milieu de la table)", eurosPourPages(34) === 37);
ok("60 pages = 59 EUR (le haut de la table)", eurosPourPages(60) === 59);
ok("22 pages : null, le trou volontaire ne s'approxime pas", eurosPourPages(22) === null);
ok("21 pages (impair) : null", eurosPourPages(21) === null);
ok("62 pages (au-dela) : null", eurosPourPages(62) === null);
ok("pagination absente : null, jamais un prix par defaut",
   eurosPourPages(null) === null && eurosPourPages(undefined) === null);
ok("une pagination non entiere ne passe pas", eurosPourPages(34.5) === null);
ok("les bornes sont DERIVEES : 20 / 60 pages, 25 / 59 EUR",
   PAGES_MIN === 20 && PAGES_MAX === 60 && EUROS_MIN === 25 && EUROS_MAX === 59);
ok("chaque pagination autorisee a bien un prix",
   PAGES_AUTORISEES.every((n) => typeof eurosPourPages(n) === "number"));

titre("— la reliure se deduit de la pagination, jamais d'un choix a l'ecran —");
ok("20 pages : agrafe, et c'est la SEULE", reliurePour(20) === "agrafe");
ok("PAGES_AGRAFE derive de la premiere ligne", PAGES_AGRAFE === 20);
ok("24, 50 et 60 pages : dos carre",
   reliurePour(24) === "dos_carre" && reliurePour(50) === "dos_carre"
   && reliurePour(60) === "dos_carre");
ok("22 et 61 : aucune reliure (hors grille, on ne devine pas)",
   reliurePour(22) === null && reliurePour(61) === null);
ok("pagination absente : aucune reliure", reliurePour(null) === null);
ok("une seule pagination agrafee dans toute la grille",
   PAGES_AUTORISEES.filter((n) => reliurePour(n) === "agrafe").length === 1);
ok("les deux libelles se lisent en francais",
   RELIURE_LIBELLE.agrafe === "agrafe".replace("agrafe", "agraf\u00e9")
   && RELIURE_LIBELLE.dos_carre === "dos carr\u00e9 coll\u00e9");

titre("— le palier HERITE : un bucket de metriques, plus un prix —");
/* La colonne `numeros.palier` (enum atelier_palier) continue d'etre ecrite
   pour les metriques et les anciennes lignes du journal. Elle ne decide plus
   d'aucun montant : c'est `centimesDuDossier` qui le prouve plus haut. */
ok("20 et 28 pages -> p30", palierHerite(20) === "p30" && palierHerite(28) === "p30");
ok("30 et 38 pages -> p40", palierHerite(30) === "p40" && palierHerite(38) === "p40");
ok("40 et 60 pages -> p45", palierHerite(40) === "p45" && palierHerite(60) === "p45");
ok("22 pages : aucun bucket, comme aucun prix", palierHerite(22) === null);
ok("pagination absente : aucun bucket",
   palierHerite(null) === null && palierHerite(undefined) === null);
ok("chaque pagination de la grille a un bucket",
   PAGES_AUTORISEES.every((n) => palierHerite(n) !== null));

titre("— les bandes de photos de l'ecran 5 : un ordre de grandeur, pas un prix —");
ok("les bornes de chaque bande SONT des paginations de la grille",
   BANDES_PHOTOS.every((b) =>
     PAGES_AUTORISEES.includes(b.pagesMin) && PAGES_AUTORISEES.includes(b.pagesMax)));
ok("les bandes de photos se suivent sans trou ni recouvrement",
   BANDES_PHOTOS.every((b, i) => i === 0 || b.photosMin === BANDES_PHOTOS[i - 1].photosMax + 1));
ok("la derniere bande monte jusqu'au maximum de la grille",
   BANDES_PHOTOS[BANDES_PHOTOS.length - 1].pagesMax === PAGES_MAX_PUBLIC);
ok("l'offre PUBLIQUE s'arrete a 50 pages (Mathias, 10/09) : 15 lignes, 50 EUR au plus, le 60 reste interne",
   PAGES_MAX_PUBLIC === 50 && GRILLE_PUBLIQUE.length === 15 && EUROS_MAX_PUBLIC === 50 && PAGES_MAX === 60);
/* La phrase de l'ecran 5, telle qu'elle s'affiche : une FOURCHETTE de prix,
   plus « autour de 30 EUR ». L'espace avant l'euro est INSECABLE. */
ok("45 photos -> « de 25 a 31 EUR » (20 a 28 pages)",
   bandePour(45)?.autour === "de 25 \u00e0 31\u00a0\u20ac");
ok("90 photos -> « 40 a 50 pages »", bandePour(90)?.pages === "40 \u00e0 50 pages");
ok("sous le seuil de faisabilite, aucune bande", bandePour(39) === null);
ok("au-dela du plafond, aucune bande", bandePour(101) === null);

titre("— la repartition par nombre de pages (metriques + export CSV) —");
/* Remplace la repartition par palier : « 4 x p40 » ne nommait plus trois prix.
   Une pagination absente n'est PAS comptee — un dossier paye sans pagination
   est une anomalie, pas un seau. */
ok("comptee, triee, les absentes ecartees",
   JSON.stringify(repartirParPages([34, 40, 34, null, 34, undefined, 20]))
     === JSON.stringify([{ pages: 20, n: 1 }, { pages: 34, n: 3 }, { pages: 40, n: 1 }]));
ok("rien a repartir -> tableau vide, jamais un seau invente",
   repartirParPages([]).length === 0 && repartirParPages([null, undefined]).length === 0);
ok("le libelle de l'ecran : « 3 x 34 p. »",
   libelleParPages([{ pages: 34, n: 3 }, { pages: 40, n: 1 }])
     === "3 \u00d7 34 p. \u00b7 1 \u00d7 40 p.");
ok("le libelle du CSV reste en ASCII",
   libelleParPages([{ pages: 34, n: 3 }, { pages: 40, n: 1 }], "x", " / ")
     === "3 x 34 p. / 1 x 40 p.");

titre("— la zone de livraison : toute l'Europe (11/09/2026) —");
/* ⚠️ LA ZONE DES CGV A CHANGE LE 11/09/2026 (art. 4bis.6) : « France, Belgique,
   Luxembourg » est devenu « les pays de l'Union europeenne, le Royaume-Uni, la
   Suisse et la Norvege ». Le texte legal appartient a Mathias : ce harnais ne
   compare donc pas deux phrases, il verifie la zone TECHNIQUE, celle qui borne
   reellement Stripe. Si l'une des deux bouge sans l'autre, c'est ici qu'on doit
   s'en souvenir — une commande acceptee hors de la zone ecrite est une vente
   sans conditions applicables.
   Stripe EXIGE une liste explicite : cette constante EST le menu « Pays » du
   paiement, et la preuve que Stripe connait ces 30 codes est a la COMPILATION
   (`codeStripe`, /api/atelier/checkout). */
ok("30 destinations : les 27 de l'Union, plus GB, CH et NO",
   PAYS_LIVRAISON.length === 30 && new Set(PAYS_LIVRAISON).size === 30);
ok("les trois pays d'origine sont toujours la (aucune regression de zone)",
   (PAYS_LIVRAISON as readonly string[]).includes("FR")
   && (PAYS_LIVRAISON as readonly string[]).includes("BE")
   && (PAYS_LIVRAISON as readonly string[]).includes("LU"));
ok("tous les codes sont des ISO alpha-2 en MAJUSCULES",
   PAYS_LIVRAISON.every((c) => /^[A-Z]{2}$/.test(c)));
ok("l'Europe est bien ouverte : Allemagne, Espagne, Italie, Suisse en sont",
   (PAYS_LIVRAISON as readonly string[]).includes("DE")
   && (PAYS_LIVRAISON as readonly string[]).includes("ES")
   && (PAYS_LIVRAISON as readonly string[]).includes("IT")
   && (PAYS_LIVRAISON as readonly string[]).includes("CH"));
/* Monaco n'est pas dans la liste de Stripe pour nous : il reste dehors tant
   que personne n'a verifie que l'imprimeur y livre. */
ok("un pays jamais decide ne s'y est pas glisse (MC)",
   !(PAYS_LIVRAISON as readonly string[]).includes("MC"));

/* ── L'ORDRE DES MENUS ────────────────────────────────────────────────
   Trente entrees, c'est une liste qu'on parcourt. Les quatre destinations
   majoritaires passent devant ; le reste suit par ordre alphabetique du
   LIBELLE, pas du code (« Allemagne » se cherche a la lettre A). */
ok("PAYS_TRIES commence par France, Belgique, Luxembourg, Suisse",
   PAYS_TRIES.slice(0, 4).join(",") === "FR,BE,LU,CH");
ok("PAYS_TRIES contient TOUTE la zone, une fois chacune",
   PAYS_TRIES.length === PAYS_LIVRAISON.length
   && new Set(PAYS_TRIES).size === PAYS_LIVRAISON.length
   && PAYS_LIVRAISON.every((c) => (PAYS_TRIES as readonly string[]).includes(c)));
ok("apres les quatre premiers, le tri suit le LIBELLE : Allemagne avant Autriche",
   PAYS_TRIES.indexOf("DE") < PAYS_TRIES.indexOf("AT")
   && PAYS_TRIES.indexOf("AT") < PAYS_TRIES.indexOf("BG"));
ok("chaque destination a un libelle en toutes lettres (aucun code affiche brut)",
   PAYS_LIVRAISON.every((c) => (PAYS_LIBELLE[c] ?? "").length > 2));

/* ═══════════ LE PAYS DE LIVRAISON, DEMANDE DES L'ECRAN 4 (lot 3) ═══════════
   Mathias a decide le 10/09/2026 que la livraison serait facturee en sus, sur
   DEVIS de l'imprimeur. Un devis exige la destination AVANT qu'on annonce un
   montant ; l'adresse Stripe, elle, n'arrive qu'apres le paiement. Le pays est
   donc devenu une reponse du questionnaire, et une condition de publication.

   Les deux fonctions sont volontairement SEPAREES : `paysValide` juge sans
   rien reparer, `normaliserPays` repare puis juge. Les confondre rendrait la
   validation permissive au passage, et « fr » entrerait en base la ou Stripe
   et Cloudprinter attendent « FR ». */

titre("— paysValide : strictement les trois codes, majuscules comprises —");
ok("FR, BE et LU sont valides",
   paysValide("FR") && paysValide("BE") && paysValide("LU"));
ok("« fr » en minuscules est REFUSE (la validation ne repare pas)", !paysValide("fr"));
ok("un pays hors zone est refuse", !paysValide("US"));
ok("le vide et l'absence sont refuses",
   !paysValide("") && !paysValide(null) && !paysValide(undefined));
ok("un non-texte ne passe pas", !paysValide(42) && !paysValide({ pays: "FR" }));

titre("— normaliserPays : repare ce qui se repare, invente le reste jamais —");
ok("«  be  » devient BE (espaces et casse)", normaliserPays(" be ") === "BE");
ok("« Fr » devient FR", normaliserPays("Fr") === "FR");
ok("un pays hors zone rend null, JAMAIS le pays par defaut",
   normaliserPays("US") === null && normaliserPays("CA") === null);
/* L'Allemagne etait hors zone jusqu'au 10/09 : elle est dedans depuis. */
ok("un pays entre dans la zone le jour ou il entre dans la liste (DE)",
   normaliserPays("de") === "DE" && paysValide("DE"));
ok("le vide rend null", normaliserPays("") === null && normaliserPays(null) === null);
ok("le defaut est un pays de la zone, et il a un libelle",
   paysValide(PAYS_DEFAUT) && PAYS_LIBELLE[PAYS_DEFAUT] === "France");
ok("les trois pays ont un libelle en toutes lettres (aucun code affiche brut)",
   PAYS_LIVRAISON.every((c) => (PAYS_LIBELLE[c] ?? "").length > 2));

titre("— le pays est une REPONSE du questionnaire, lue des deux cotes —");
ok("reponseValide accepte FR", reponseValide("pays", "FR"));
ok("reponseValide refuse « fr » (le navigateur envoie une valeur du select)",
   !reponseValide("pays", "fr"));
ok("reponseValide refuse un pays hors zone et le vide",
   !reponseValide("pays", "US") && !reponseValide("pays", ""));
const complet = {
  occasion: "Un voyage",
  histoire: "Un road trip au Maroc avec Mathilde. Des paysages de dingue.",
  titre: "Maroc",
  prenom: "Flore",
  email: "flore@example.com",
  telephone: "0769710686",
  pays: "",
};
ok("tout rempli SAUF le pays : c'est le pays qu'on redemande",
   premierManquant(CHAMPS_QUESTIONNAIRE, (c) => complet[c]) === "pays");
ok("avec le pays : plus rien ne manque",
   premierManquant(CHAMPS_QUESTIONNAIRE, (c) => ({ ...complet, pays: "BE" })[c]) === null);
ok("le pays vit sur l'ecran 4, avec les coordonnees",
   CHAMPS_PAR_ECRAN[4].includes("pays") && ecranDuChamp("pays") === 4);

/* ═════════ T-007 : LE SAUT « SANS TEMPLATE » LAISSE UNE TRACE ═════════
   La part pure : la phrase du journal existe, nomme le mail ET la variable a
   poser, et sonne comme une alerte. L'ecriture elle-meme (une fois par
   dossier+code, jamais a chaque releve) vit dans mails.ts,
   signalerSansTemplate — deduplication par lecture prealable, sur le modele
   du verrou de mails_envoyes. */

titre("— le pays declare contre le pays de l'adresse Stripe —");
/* Rien n'est bloque (l'argent est encaisse, la commande est legitime), mais
   l'ecart de port est pour l'atelier : il doit se LIRE dans le journal du
   dossier, en toutes lettres. « BE != FR » ne se lit pas. */
const rPays = raconter("pays_livraison_divergent", { declare: "FR", stripe: "BE" });
ok("la phrase nomme les DEUX pays en clair",
   (rPays.detail ?? "").includes("Belgique") && (rPays.detail ?? "").includes("France"));
ok("c'est une alerte, pas une ligne neutre", rPays.ton === "alerte");
ok("un code inconnu reste visible plutot que d'etre efface",
   (raconter("pays_livraison_divergent", { declare: "FR", stripe: "US" }).detail ?? "")
     .includes("US"));

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
     pM10b.NB_PAGES === 34 && pM10b.PRIX === 37);
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
  for (const champ of ["email", "email_canonical", "prenom", "telephone", "occasion", "histoire", "adresse_livraison", "compte_id"]) {
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

/* ════════════════════════ LE COMPTE CLIENTE ════════════════════════ */

titre("— le compte : qui voit quoi (invariant no2 de session.ts) —");

const dossierCompte = (extra: Partial<DossierDuCompte>): DossierDuCompte => ({
  token: "t".repeat(32),
  etat: "photos_recues",
  compte_id: null,
  email_canonical: "lea@gmail.com",
  consent_photos: true,
  nb_photos: 42,
  etat_maj_le: "2026-09-01T00:00:00Z",
  ...extra,
});

const regardLea = { uid: "uid-lea", canon: "lea@gmail.com", emailConfirme: true };

ok("le lien explicite (compte_id) suffit, meme si l'email a change",
   peutVoirDossier(dossierCompte({ compte_id: "uid-lea", email_canonical: "autre@x.fr" }), regardLea));
ok("l'email qui concorde suffit, s'il est CONFIRME",
   peutVoirDossier(dossierCompte({}), regardLea));
ok("un email non confirme ne montre RIEN (anti-usurpation)",
   !peutVoirDossier(dossierCompte({}), { ...regardLea, emailConfirme: false }));
ok("ni lien ni email : porte fermee",
   !peutVoirDossier(dossierCompte({ email_canonical: "autre@x.fr" }), regardLea));
ok("un dossier anonymise (email_canonical null) ne se rapproche plus",
   !peutVoirDossier(dossierCompte({ email_canonical: null }), regardLea));
ok("le compte_id d'une AUTRE ne s'ouvre pas par email non plus",
   !peutVoirDossier(
     dossierCompte({ compte_id: "uid-autre", email_canonical: "autre@x.fr" }),
     regardLea,
   ));

ok("on epingle un dossier vu par email et pas encore lie",
   doitEpingler(dossierCompte({}), regardLea));
ok("on n'epingle jamais deux fois (compte_id deja pose)",
   !doitEpingler(dossierCompte({ compte_id: "uid-lea" }), regardLea));
ok("on n'epingle pas ce qu'on ne voit pas",
   !doitEpingler(dossierCompte({ email_canonical: "autre@x.fr" }), regardLea));

titre("— le dashboard : trois sections, chacune sa regle —");

ok("livree -> bibliotheque",
   sectionPour(dossierCompte({ etat: "livree" })) === "bibliotheque");
ok("depot non termine -> a terminer (la balle est chez la cliente)",
   sectionPour(dossierCompte({ consent_photos: false, nb_photos: 3 })) === "a_terminer"
   && sectionPour(dossierCompte({ consent_photos: false, nb_photos: 0 })) === "a_terminer");
ok("depot termine -> en cours, meme a l'etat photos_recues",
   sectionPour(dossierCompte({})) === "en_cours");
ok("photos_insuffisantes -> en cours (c'est l'atelier qui redemande)",
   sectionPour(dossierCompte({ etat: "photos_insuffisantes", consent_photos: false })) === "en_cours");
ok("apercu_pret, payee, expediee -> en cours",
   sectionPour(dossierCompte({ etat: "apercu_pret" })) === "en_cours"
   && sectionPour(dossierCompte({ etat: "payee" })) === "en_cours"
   && sectionPour(dossierCompte({ etat: "expediee" })) === "en_cours");

const troisDossiers = [
  dossierCompte({ token: "a".repeat(32), etat: "livree" }),
  dossierCompte({ token: "b".repeat(32), consent_photos: false }),
  dossierCompte({ token: "c".repeat(32), etat: "apercu_pret" }),
];
const ranges = classerDossiers(troisDossiers);
ok("classerDossiers ne perd ni ne duplique aucun dossier",
   ranges.aTerminer.length === 1 && ranges.enCours.length === 1
   && ranges.bibliotheque.length === 1);

titre("— les numeros en cours : la barre ne devine JAMAIS a sa place —");

ok("un dossier livre n'est jamais « en cours »",
   numerosEnCours([dossierCompte({ etat: "livree" })]).length === 0);
ok("un seul en cours : la barre peut y mener",
   numerosEnCours([dossierCompte({ etat: "apercu_pret" })]).length === 1);
ok("DEUX en cours : la barre en voit deux, donc elle menera au compte",
   numerosEnCours([
     dossierCompte({ token: "v".repeat(32), etat_maj_le: "2026-09-01T00:00:00Z" }),
     dossierCompte({ token: "w".repeat(32), etat: "apercu_pret", etat_maj_le: "2026-09-03T00:00:00Z" }),
   ]).length === 2);
ok("le plus recemment remue vient en tete",
   numerosEnCours([
     dossierCompte({ token: "v".repeat(32), etat_maj_le: "2026-09-01T00:00:00Z" }),
     dossierCompte({ token: "w".repeat(32), etat: "apercu_pret", etat_maj_le: "2026-09-03T00:00:00Z" }),
   ])[0].token === "w".repeat(32));
ok("aucun dossier actif : rien dans la barre",
   numerosEnCours([]).length === 0);

titre("— l'espace compte ne s'ouvre QUE quand il peut tenir sa promesse —");
{
  /* La regle lit process.env : on la met en scene, puis on rend l'env. */
  const sauve = {
    url: process.env.SUPABASE_URL,
    anon: process.env.SUPABASE_ANON_KEY,
    c1: process.env.BREVO_TEMPLATE_C1_ID,
    c2: process.env.BREVO_TEMPLATE_C2_ID,
    node: process.env.NODE_ENV,
  };
  const poser = (v: Record<string, string | undefined>) => {
    for (const [k, val] of Object.entries(v)) {
      if (val === undefined) delete process.env[k];
      else process.env[k] = val;
    }
  };
  const posNode = (v: string | undefined) => {
    (process.env as Record<string, string | undefined>).NODE_ENV = v;
  };
  posNode("production");

  poser({ SUPABASE_URL: "u", SUPABASE_ANON_KEY: undefined, BREVO_TEMPLATE_C1_ID: "1", BREVO_TEMPLATE_C2_ID: "2" });
  ok("prod sans cle anon : ferme", compteOuvert() === false);

  poser({ SUPABASE_ANON_KEY: "k", BREVO_TEMPLATE_C1_ID: undefined, BREVO_TEMPLATE_C2_ID: undefined });
  ok("prod sans les mails : FERME — c'etait l'etat de la prod le 04/09", compteOuvert() === false);

  poser({ BREVO_TEMPLATE_C1_ID: "1" });
  ok("prod avec un seul mail : ferme (le reset resterait muet)", compteOuvert() === false);

  poser({ BREVO_TEMPLATE_C2_ID: "2" });
  ok("prod avec tout : OUVERT, sans rien redeployer", compteOuvert() === true);

  posNode("development");
  poser({ BREVO_TEMPLATE_C1_ID: undefined, BREVO_TEMPLATE_C2_ID: undefined });
  ok("en developpement, la cle anon suffit (on veut pouvoir regarder)", compteOuvert() === true);

  poser({ SUPABASE_URL: sauve.url, SUPABASE_ANON_KEY: sauve.anon, BREVO_TEMPLATE_C1_ID: sauve.c1, BREVO_TEMPLATE_C2_ID: sauve.c2 });
  posNode(sauve.node);
}

titre("— ?suite= : jamais une redirection ouverte —");

ok("un chemin interne passe",
   suiteSure("/numero/abc") === "/numero/abc" && suiteSure("/compte") === "/compte");
ok("une URL absolue, un protocole ou un vide retombent sur /compte",
   suiteSure("https://evil.example") === "/compte"
   && suiteSure("//evil.example") === "/compte"
   && suiteSure("") === "/compte"
   && suiteSure(null) === "/compte"
   && suiteSure(undefined) === "/compte");

titre("— le carnet complet : ce que l'ecran montre est ce que l'export sort —");
{
  const dossierA = { token: "a".repeat(32), titre: "Un ete a Biarritz", prenom: "Lea" };
  const dossierB = { token: "b".repeat(32), titre: null, prenom: "Camille" };
  const note = (
    id: string,
    texte: string,
    createdAt: string,
    qui: string,
    dossier: NoteCarnet["dossier"],
    /* Ajouté le 08/09 (T-096) : le corpus historique n'a pas de genre, et
       c'est exactement ce qu'il doit continuer de prouver. */
    genre: GenreNote | null = null,
  ): NoteCarnet => ({
    id,
    numeroId: `n-${id}`,
    qui,
    auteur: qui === "mathias" ? "Mathias" : "Louis",
    texte,
    createdAt,
    dossier,
    genre,
  });

  const MAINTENANT = new Date("2026-09-08T12:00:00.000Z");
  const CORPUS: NoteCarnet[] = [
    note("1", "Ne jamais couper le petit frere dans une double page.", "2026-09-07T10:00:00.000Z", "mathias", dossierA),
    note("2", "Relancee par telephone, elle rappelle lundi.", "2026-09-01T10:00:00.000Z", "louis", dossierB),
    note("3", "Le RÉCIT commence a la plage, pas a la voiture.", "2026-06-01T10:00:00.000Z", "mathias", dossierA),
    note("4", "Note orpheline : le dossier a disparu.", "2026-09-06T10:00:00.000Z", "louis", null),
  ];

  const tout = filtrerNotes(CORPUS, { q: "", dossier: "", qui: "", jours: null }, MAINTENANT);
  ok("sans filtre, tout le corpus, la plus recente en tete",
     tout.length === 4 && tout[0].id === "1" && tout[3].id === "3");

  ok("la recherche ignore la casse ET les accents",
     filtrerNotes(CORPUS, { q: "recit", dossier: "", qui: "", jours: null }, MAINTENANT).length === 1
     && filtrerNotes(CORPUS, { q: "RÉCIT", dossier: "", qui: "", jours: null }, MAINTENANT).length === 1);

  ok("deux mots = les deux exiges, pas l'un OU l'autre",
     filtrerNotes(CORPUS, { q: "frere page", dossier: "", qui: "", jours: null }, MAINTENANT).length === 1
     && filtrerNotes(CORPUS, { q: "frere voiture", dossier: "", qui: "", jours: null }, MAINTENANT).length === 0);

  ok("la recherche mord aussi sur le nom du dossier",
     filtrerNotes(CORPUS, { q: "biarritz", dossier: "", qui: "", jours: null }, MAINTENANT).length === 2);

  ok("le filtre par dossier ne garde que le sien",
     filtrerNotes(CORPUS, { q: "", dossier: dossierA.token, qui: "", jours: null }, MAINTENANT)
       .every((n) => n.dossier?.token === dossierA.token));

  ok("le filtre par auteur ne garde que les siennes",
     filtrerNotes(CORPUS, { q: "", dossier: "", qui: "louis", jours: null }, MAINTENANT).length === 2);

  ok("30 jours ecarte la note de juin, pas celle d'hier",
     filtrerNotes(CORPUS, { q: "", dossier: "", qui: "", jours: 30 }, MAINTENANT).map((n) => n.id).join() === "1,4,2");

  /* Une note orpheline reste de la matiere : la perdre en silence serait
     pire que l'afficher sans lien. */
  ok("une note dont le dossier a disparu reste dans le corpus",
     tout.some((n) => n.id === "4") && libelleDossier(null) === "Dossier inconnu");

  ok("un dossier sans titre se nomme par son prenom, sinon par son token court",
     libelleDossier(dossierB) === "Camille"
     && libelleDossier({ token: "c".repeat(32), titre: "  ", prenom: null }) === "Dossier cccccc"
     && referenceDossier(dossierA) === "aaaaaa");

  ok("une periode inconnue retombe sur « tout », jamais sur une fenetre etroite",
     periodeCarnet("42") === "tout" && periodeCarnet(null) === "tout"
     && joursDePeriode("tout") === null && joursDePeriode("30") === 30);

  /* Le token COMPLET ne sort jamais du back-office : 6 caracteres suffisent
     a retrouver le dossier a la main et n'ouvrent aucune page. */
  const csv = csvCarnet(tout);
  ok("l'export ne contient jamais un token complet",
     !csv.includes(dossierA.token) && csv.includes("aaaaaa"));

  const piege: NoteCarnet[] = [
    note("5", 'Elle dit : "coupez ; pas la mer".\nDeuxieme ligne.', "2026-09-05T10:00:00.000Z", "mathias", dossierA),
  ];
  const csvPiege = csvCarnet(piege);
  ok("un point-virgule, un guillemet et un retour a la ligne ne cassent pas le CSV",
     csvPiege.split("\r\n")[0] === "Date;Genre;Auteur;Dossier;Référence;Note"
     && csvPiege.includes('"Elle dit : ""coupez ; pas la mer"".\nDeuxieme ligne."'));

  const txt = texteCarnet(piege, "Le carnet");
  ok("l'export texte garde la note telle qu'ecrite, retours a la ligne compris",
     txt.includes("Deuxieme ligne.") && txt.startsWith("Le carnet\n=========\n"));
  ok("l'export texte le dit quand le filtre ne rend rien",
     texteCarnet([], "Le carnet").includes("Aucune note pour ce filtre."));
}

titre("— le genre d'une note : cinq mots, facultatifs, jamais bloquants (T-096) —");
{
  const dossier = { token: "d".repeat(32), titre: "Trois jours a Lisbonne", prenom: "Ines" };
  const note = (
    id: string,
    texte: string,
    genre: GenreNote | null,
    createdAt = "2026-09-07T10:00:00.000Z",
  ): NoteCarnet => ({
    id,
    numeroId: `n-${id}`,
    qui: "mathias",
    auteur: "Mathias",
    texte,
    createdAt,
    genre,
    dossier,
  });

  const MAINTENANT = new Date("2026-09-08T12:00:00.000Z");
  const CORPUS: NoteCarnet[] = [
    note("g1", "Beaucoup d'interieur, eviter les cadres blancs.", "photos"),
    note("g2", "Le fil commence a la plage, pas a la voiture.", "recit"),
    note("g3", "Une double pleine page pour l'arrivee.", "page"),
    note("g4", "Elle veut voir sa mere sur la couverture.", "cliente"),
    note("g5", "Relancee par telephone, elle rappelle lundi.", "atelier"),
    note("g6", "Ecrite avant que le genre existe.", null),
    note("g7", "Elle aussi, ecrite avant.", null),
  ];

  /* Les cinq mots, et RIEN d'autre : la base n'a ni check ni enum, donc c'est
     cette liste qui fait autorite. */
  ok("les cinq genres sont exactement ceux tranches le 08/09",
     GENRES_NOTE.map((g) => g.cle).join() === "photos,recit,page,cliente,atelier");

  ok("chaque genre filtre le corpus sur ses seules notes",
     GENRES_NOTE.every((g) => {
       const r = filtrerNotes(CORPUS, { q: "", dossier: "", qui: "", genre: g.cle, jours: null }, MAINTENANT);
       return r.length === 1 && r[0].genre === g.cle;
     }));

  /* Le filtre qui sert a RANGER l'existant : sans lui, les centaines de notes
     ecrites avant le 08/09 sont introuvables en tant que telles. */
  const sans = filtrerNotes(CORPUS, { q: "", dossier: "", qui: "", genre: "sans", jours: null }, MAINTENANT);
  ok("« sans genre » ne rend QUE les notes sans genre, et les rend toutes",
     sans.length === 2 && sans.every((n) => n.genre === null));

  ok("aucun filtre de genre laisse tout passer, et un champ absent aussi",
     filtrerNotes(CORPUS, { q: "", dossier: "", qui: "", genre: null, jours: null }, MAINTENANT).length === 7
     && filtrerNotes(CORPUS, { q: "", dossier: "", qui: "", jours: null }, MAINTENANT).length === 7);

  ok("le genre se combine avec la recherche, il ne la remplace pas",
     filtrerNotes(CORPUS, { q: "telephone", dossier: "", qui: "", genre: "atelier", jours: null }, MAINTENANT).length === 1
     && filtrerNotes(CORPUS, { q: "telephone", dossier: "", qui: "", genre: "photos", jours: null }, MAINTENANT).length === 0);

  /* Tout ce qui n'est pas l'un des cinq mots vaut null. JAMAIS une erreur :
     une note refusee pour un genre inconnu, c'est un texte perdu. */
  ok("un genre invalide devient null, quelle que soit sa forme",
     genreNote("humeur") === null && genreNote("") === null && genreNote(null) === null
     && genreNote(undefined) === null && genreNote(42) === null && genreNote({}) === null
     && genreNote("récit") === null);

  ok("un genre valide survit a la casse et aux espaces",
     genreNote(" Photos ") === "photos" && genreNote("RECIT") === "recit");

  ok("le filtre d'URL comprend « sans » et rejette le reste sur « tous »",
     filtreGenre("sans") === "sans" && filtreGenre("page") === "page"
     && filtreGenre("nimporte") === null && filtreGenre(null) === null);

  ok("le libelle est accentue a l'ecran, la cle ne l'est jamais en base",
     libelleGenre("recit") === "Récit" && libelleGenre(null) === "" && libelleGenre("humeur") === "");

  /* Les deux exports portent le genre, sinon le fichier telecharge ne dit plus
     ce que l'ecran montrait. */
  const csvGenre = csvCarnet([note("g8", "Une double pleine page.", "page")]);
  ok("le CSV porte une colonne Genre, remplie avec le libelle",
     csvGenre.split("\r\n")[0] === "Date;Genre;Auteur;Dossier;Référence;Note"
     && csvGenre.split("\r\n")[1].includes(";Page;Mathias;"));

  /* Une absence n'est pas une valeur : la cellule reste VIDE. */
  const csvSans = csvCarnet([note("g9", "Ecrite avant.", null)]);
  ok("une note sans genre laisse la cellule vide, elle ne dit pas « aucun »",
     csvSans.split("\r\n")[1].includes(";;Mathias;")
     && !/aucun/i.test(csvSans));

  const txtGenre = texteCarnet([note("g10", "Le fil commence a la plage.", "recit")], "Le carnet");
  ok("le texte pose le genre en fin de ligne d'en-tete de la note",
     txtGenre.includes(" · Mathias · Trois jours a Lisbonne · Récit")
     && txtGenre.includes("Le fil commence a la plage."));

  const txtSans = texteCarnet([note("g11", "Ecrite avant.", null)], "Le carnet");
  ok("sans genre, la ligne d'en-tete est exactement celle d'avant le 08/09",
     txtSans.includes(" · Mathias · Trois jours a Lisbonne\n")
     && !/aucun/i.test(txtSans));
}


/* ═════════ LA PRÉVISUALISATION D'UN APERÇU (10/09/2026) ═════════
   Mathias veut voir la page du client AVANT de publier. Le dry-run dépose ce
   qui serait écrit dans `evenements`, et la page d'état le superpose à la
   ligne lue. Deux fonctions pures portent tout le risque : ce qui a le droit
   de traverser (`appliquerBrouillon`) et lequel gagne (`lireBrouillon`).
   Le risque, s'il fallait le nommer : une page de client rendue avec les
   donnees d'un autre dossier, ou un brouillon abime qui casse l'affichage. */

titre("— le brouillon superpose les colonnes attendues, et RIEN d'autre —");

/* La forme d'une ligne `numeros` vue par la page d'etat, reduite a ce qui
   nous interesse ici. Types explicites : sans eux, TypeScript deduit `null`
   et rend la superposition intestable. */
const LIGNE: {
  id: string;
  token: string;
  email: string | null;
  etat: string;
  nb_pages: number | null;
  palier: string | null;
  prix_centimes: number | null;
  livraison_centimes: number | null;
  livraison_niveau: string | null;
  pays_livraison: string | null;
  apercu_urls: unknown;
  nb_photos: number;
} = {
  id: "id-reel",
  token: "tok-reel",
  email: "client@exemple.fr",
  etat: "photos_recues",
  nb_pages: null,
  palier: null,
  prix_centimes: null,
  livraison_centimes: null,
  livraison_niveau: null,
  pays_livraison: null,
  apercu_urls: null,
  nb_photos: 41,
};

const BROUILLON = lireBrouillon([
  {
    type: TYPE_BROUILLON,
    payload: {
      par: "Mathias",
      patch: {
        nb_pages: 34,
        palier: "p40",
        prix_centimes: 3700,
        livraison_centimes: 1106,
        livraison_niveau: "cp_ground",
        pays_livraison: "FR",
        apercu_urls: { plat: "k/plat.jpg" },
        /* Ce qui ne doit JAMAIS traverser. */
        id: "id-vole",
        token: "tok-vole",
        email: "quelquun@ailleurs.fr",
        etat: "livree",
        nb_photos: 999,
      },
    },
  },
]);

ok("le brouillon est lu, avec son auteur",
   BROUILLON !== null && BROUILLON.par === "Mathias");

const VUE = appliquerBrouillon(LIGNE, BROUILLON);

ok("les sept colonnes attendues sont superposees",
   VUE.nb_pages === 34 && VUE.palier === "p40" && VUE.prix_centimes === 3700
   && VUE.livraison_centimes === 1106 && VUE.livraison_niveau === "cp_ground"
   && VUE.pays_livraison === "FR"
   && (VUE.apercu_urls as { plat: string }).plat === "k/plat.jpg");

ok("l'identite du dossier ne bouge PAS : id, token, email restent ceux de la base",
   VUE.id === "id-reel" && VUE.token === "tok-reel" && VUE.email === "client@exemple.fr");

ok("une colonne inconnue du brouillon est ignoree",
   VUE.nb_photos === 41);

ok("l'etat est FORCE a l'apercu, jamais celui du patch",
   VUE.etat === ETAT_BROUILLON && ETAT_BROUILLON === "apercu_pret");

ok("la ligne d'origine n'est pas mutee : c'est une copie",
   LIGNE.etat === "photos_recues" && LIGNE.nb_pages === null);

ok("sans brouillon, la ligne ressort telle quelle (meme etat)",
   appliquerBrouillon(LIGNE, null).etat === "photos_recues");

ok("la liste blanche ne nomme que les sept colonnes du gel et de l'apercu",
   COLONNES_BROUILLON.length === 7
   && !(COLONNES_BROUILLON as readonly string[]).includes("etat")
   && !(COLONNES_BROUILLON as readonly string[]).includes("id"));

titre("— le brouillon : les valeurs abimees ne passent pas —");

const SALE = lireBrouillon([
  {
    type: TYPE_BROUILLON,
    payload: {
      patch: {
        nb_pages: 34,
        /* Un prix nul ou negatif n'est pas un prix : meme borne que prix.ts
           et que le `check` de la base. */
        prix_centimes: 0,
        /* Zero est en revanche un PORT valide : offrir la livraison est une
           decision commerciale legitime. */
        livraison_centimes: 0,
        /* Hors zone : le pays decide du port et de la phrase affichee. */
        pays_livraison: "US",
        /* Ne respecte pas le motif du `check` de la colonne. */
        livraison_niveau: "CP GROUND!",
        /* Une chaine n'est pas un jsonb de visuels. */
        apercu_urls: "k/plat.jpg",
      },
    },
  },
]);
const VUE_SALE = appliquerBrouillon(LIGNE, SALE);
ok("un prix a zero est refuse, un port a zero est garde",
   VUE_SALE.prix_centimes === null && VUE_SALE.livraison_centimes === 0);
ok("un pays hors zone, un niveau abime et des visuels non-objet sont ignores",
   VUE_SALE.pays_livraison === null && VUE_SALE.livraison_niveau === null
   && VUE_SALE.apercu_urls === null);
ok("le reste du brouillon passe quand meme : une valeur abimee n'annule pas tout",
   VUE_SALE.nb_pages === 34 && VUE_SALE.etat === "apercu_pret");

titre("— le brouillon : lequel gagne, et quand il n'y en a pas —");

ok("une liste vide ne rend rien", lireBrouillon([]) === null);
ok("une liste absente ne jette pas", lireBrouillon(null) === null && lireBrouillon(undefined) === null);
ok("un payload malforme est ignore",
   lireBrouillon([{ type: TYPE_BROUILLON, payload: null }]) === null
   && lireBrouillon([{ type: TYPE_BROUILLON, payload: "34 pages" }]) === null
   && lireBrouillon([{ type: TYPE_BROUILLON, payload: { patch: [1, 2] } }]) === null);
ok("un patch sans AUCUNE colonne connue ne fait pas un brouillon",
   lireBrouillon([{ type: TYPE_BROUILLON, payload: { patch: { etat: "livree", id: "x" } } }]) === null);
ok("un evenement d'un autre type n'est jamais pris pour un brouillon",
   lireBrouillon([{ type: "etat_change", payload: { patch: { nb_pages: 34 } } }]) === null);

/* L'ordre est CHRONOLOGIQUE : le dernier prepare est celui que l'atelier a
   sous les yeux. Un dry-run efface le precedent a l'ecran, pas en base. */
const SUITE = lireBrouillon([
  { type: TYPE_BROUILLON, payload: { patch: { nb_pages: 24 }, par: "Louis" } },
  { type: TYPE_BROUILLON, payload: { patch: { nb_pages: 34 }, par: "Mathias" } },
]);
ok("le dernier brouillon gagne", SUITE?.patch.nb_pages === 34 && SUITE?.par === "Mathias");

/* Un brouillon recent mais illisible ne doit pas faire disparaitre la
   prevision : on remonte jusqu'au dernier qui tienne debout. */
const REPLI = lireBrouillon([
  { type: TYPE_BROUILLON, payload: { patch: { nb_pages: 24 } } },
  { type: TYPE_BROUILLON, payload: { patch: {} } },
]);
ok("un dernier brouillon vide laisse la place au precedent", REPLI?.patch.nb_pages === 24);

titre("— le brouillon se raconte dans le journal —");

const rBrouillon = raconter(TYPE_BROUILLON, {
  par: "Mathias",
  resume: { nbPages: 34, euros: 37 },
  livraison: { source: "cloudprinter", client: 1106 },
});
ok("la phrase nomme l'auteur et le geste",
   rBrouillon.texte === "Mathias a prévisualisé la page");
ok("le detail dit la pagination, le prix et le port",
   rBrouillon.detail === "34 pages, 37 €, livraison 11,06 €");
ok("le ton reste sobre : ce n'est pas une decision",
   rBrouillon.ton === "neutre");
ok("sans auteur ni chiffres, la phrase reste correcte et sans detail",
   raconter(TYPE_BROUILLON, {}).texte === "Page prévisualisée"
   && raconter(TYPE_BROUILLON, {}).detail === null);

titre("— le FORMAT d'une couverture : planche a plat ou page seule (11/09) —");

/* Le defaut constate par Mathias sur un vrai dossier : une couverture seule
   (portrait) etait coupee en deux, « La quatrieme » montrant la moitie GAUCHE
   de la premiere. Le fichier dit son format ; on ne le devine plus. */
ok("210 x 297 (A4, le format fini) -> portrait",
   formatDepuisRatio(210, 297) === "portrait");
ok("216 x 303 (A4 + fonds perdus) -> portrait",
   formatDepuisRatio(216, 303) === "portrait");
ok("420 x 297 (deux A4 cote a cote) -> planche",
   formatDepuisRatio(420, 297) === "planche");
ok("426 x 297 (deux A4 + le dos) -> planche",
   formatDepuisRatio(426, 297) === "planche");
ok("1000 x 700 (un export paysage quelconque) -> planche",
   formatDepuisRatio(1000, 700) === "planche");
ok("700 x 1000 (un export portrait quelconque) -> portrait",
   formatDepuisRatio(700, 1000) === "portrait");
/* Le choix assume : une mesure IMPOSSIBLE rend « planche », le comportement
   historique — tous les dossiers publies jusqu'ici sont a plat, et les faire
   basculer changerait ce que des clients ont deja vu. */
ok("hauteur nulle -> planche (le comportement historique, jamais une erreur)",
   formatDepuisRatio(420, 0) === "planche"
   && formatDepuisRatio(0, 0) === "planche"
   && formatDepuisRatio(Number.NaN, 297) === "planche");
ok("le seuil est FRANC : rien du catalogue ne tombe autour",
   SEUIL_PLANCHE > 1 && SEUIL_PLANCHE < 1.41
   && formatDepuisRatio(114, 100) === "portrait"
   && formatDepuisRatio(115, 100) === "planche");

titre("— la planche (cartes de couverture + tuiles de double) suit le format mesure —");
/* 11/09/2026 — remplace les assertions de l'ancienne visionneuse en
   carrousel (`construireVues`) : mêmes scenarios, nouvelle forme. La
   fonction elle-même est archivée dans `archive/numero-carrousel-2026-09/`. */

const ENTREE = {
  plat: null as string | null,
  plats: [] as string[],
  c1: null as string | null,
  c4: null as string | null,
  doubles: [] as string[],
  doublesCadrage: [] as string[],
  platsCadrageDroite: [] as string[],
  platsCadrageGauche: [] as string[],
  formats: {} as Record<string, "portrait" | "planche" | undefined>,
};

const PLANCHE_SEULE = construirePlanche({
  ...ENTREE,
  plats: ["a.jpg"],
  platsCadrageDroite: ["80% 50%"],
  platsCadrageGauche: ["10% 50%"],
  formats: { "a.jpg": "planche" },
});
ok("planche : une carte, deux tuiles (premiere cadree + planche entiere)",
   PLANCHE_SEULE.couvertures.length === 1
   && PLANCHE_SEULE.couvertures[0].format === "planche"
   && PLANCHE_SEULE.couvertures[0].premiere?.legende === "La couverture"
   && PLANCHE_SEULE.couvertures[0].entiere.legende === "La couverture à plat");
ok("planche : la premiere porte le cadrage DROITE de l'atelier ; le cadrage GAUCHE n'a plus d'effet",
   PLANCHE_SEULE.couvertures[0].premiere?.cadrage === "80% 50%"
   && PLANCHE_SEULE.couvertures[0].entiere.cadrage === undefined);

const PORTRAIT_SEUL = construirePlanche({
  ...ENTREE,
  plats: ["a.jpg"],
  platsCadrageDroite: ["80% 50%"],
  platsCadrageGauche: ["10% 50%"],
  formats: { "a.jpg": "portrait" },
});
ok("portrait : UNE seule carte, une seule tuile, aucune premiere separee",
   PORTRAIT_SEUL.couvertures.length === 1
   && PORTRAIT_SEUL.couvertures[0].format === "portrait"
   && PORTRAIT_SEUL.couvertures[0].premiere === undefined);
ok("portrait : l'image est montree ENTIERE, sans le cadrage des planches",
   PORTRAIT_SEUL.couvertures[0].entiere.legende === "La couverture"
   && PORTRAIT_SEUL.couvertures[0].entiere.cadrage === undefined);

const PAS_MESURE = construirePlanche({ ...ENTREE, plats: ["a.jpg"] });
ok("pas encore mesuree : une carte 'inconnu', une seule tuile entiere, jamais une decoupe au hasard",
   PAS_MESURE.couvertures.length === 1
   && PAS_MESURE.couvertures[0].format === "inconnu"
   && PAS_MESURE.couvertures[0].premiere === undefined);

const DEUX_PLANCHES = construirePlanche({
  ...ENTREE,
  plats: ["a.jpg", "b.jpg"],
  platsCadrageDroite: ["", "30% 50%"],
  formats: { "a.jpg": "planche", "b.jpg": "planche" },
});
ok("planche + planche : DEUX cartes a deux tuiles chacune, la seconde cadree sur sa face avant",
   DEUX_PLANCHES.couvertures.length === 2
   && DEUX_PLANCHES.couvertures[1].nom === "Couverture 2"
   && DEUX_PLANCHES.couvertures[1].premiere?.cadrage === "30% 50%"
   && DEUX_PLANCHES.couvertures[1].entiere.legende === "Couverture 2 à plat");

const DEUX_PORTRAITS = construirePlanche({
  ...ENTREE,
  plats: ["a.jpg", "b.jpg"],
  formats: { "a.jpg": "portrait", "b.jpg": "portrait" },
});
ok("portrait + portrait : deux cartes a une tuile, un rang chacune",
   DEUX_PORTRAITS.couvertures.length === 2
   && DEUX_PORTRAITS.couvertures.every((c) => c.premiere === undefined)
   && JSON.stringify(DEUX_PORTRAITS.couvertures.map((c) => c.rang)) === JSON.stringify([0, 1]));

const MELANGE = construirePlanche({
  ...ENTREE,
  plats: ["a.jpg", "b.jpg"],
  formats: { "a.jpg": "planche", "b.jpg": "portrait" },
});
ok("planche + portrait : chacune est traitee selon SON format",
   MELANGE.couvertures.length === 2
   && MELANGE.couvertures[0].format === "planche" && MELANGE.couvertures[0].premiere !== undefined
   && MELANGE.couvertures[1].format === "portrait" && MELANGE.couvertures[1].premiere === undefined
   && MELANGE.couvertures[1].rang === 1);

const AVEC_DOUBLES = construirePlanche({
  ...ENTREE,
  plats: ["a.jpg"],
  doubles: ["d1.jpg", "d2.jpg"],
  doublesCadrage: ["50% 30%", ""],
  formats: { "a.jpg": "portrait" },
});
ok("les doubles pages sont des tuiles a part, cadrage conserve, numerotees",
   AVEC_DOUBLES.doubles.length === 2
   && AVEC_DOUBLES.doubles[0].legende === "Double page 1" && AVEC_DOUBLES.doubles[0].cadrage === "50% 30%"
   && AVEC_DOUBLES.doubles[1].legende === "Double page 2" && AVEC_DOUBLES.doubles[1].cadrage === undefined);
ok("une seule double page porte le nom singulier",
   construirePlanche({ ...ENTREE, doubles: ["d1.jpg"] }).doubles[0].legende === "Une double page");

const HISTORIQUE = construirePlanche({ ...ENTREE, c1: "c1.jpg", c4: "c4.jpg" });
ok("un dossier d'AVANT le format a plat (c1/c4) se lit comme deux cartes SANS rien a choisir",
   HISTORIQUE.couvertures.length === 2
   && HISTORIQUE.couvertures[0].nom === "La couverture" && HISTORIQUE.couvertures[0].rang === undefined
   && HISTORIQUE.couvertures[1].nom === "La quatrième" && HISTORIQUE.couvertures[1].rang === undefined);

ok("aucun visuel -> aucune carte, aucune tuile (la page ne rend rien plutot qu'une grille vide)",
   construirePlanche(ENTREE).couvertures.length === 0 && construirePlanche(ENTREE).doubles.length === 0);

titre("— le choix de couverture : un rang, ou « je vous fais confiance » —");

/* La validation d'un corps de requete PUBLIC : c'est la seule barriere entre
   le journal et n'importe qui. */
ok("le mot « indifferent » est accepte",
   JSON.stringify(lireChoixCouverture("indifferent")) === JSON.stringify({ indifferent: true }));
ok("il est accepte quelles que soient casse et espaces",
   JSON.stringify(lireChoixCouverture("  Indifferent ")) === JSON.stringify({ indifferent: true }));
ok("un autre mot est REFUSE", lireChoixCouverture("autre") === null);
ok("un rang negatif est refuse", lireChoixCouverture(-1) === null);
ok("un rang au-dela du plafond est refuse", lireChoixCouverture(MAX_PLANCHES) === null);
ok("un rang decimal est refuse", lireChoixCouverture(1.5) === null);
ok("les rangs valides passent",
   JSON.stringify(lireChoixCouverture(0)) === JSON.stringify({ rang: 0 })
   && JSON.stringify(lireChoixCouverture(2)) === JSON.stringify({ rang: 2 }));
ok("rien du tout n'est pas un choix",
   lireChoixCouverture(undefined) === null && lireChoixCouverture(null) === null
   && lireChoixCouverture(true) === null && lireChoixCouverture({}) === null);

/* Ce que la fiche admin relit dans le journal : le DERNIER mot du client. */
ok("sans evenement, il n'a rien dit (ce n'est pas « sans preference »)",
   dernierChoixCouverture([]) === null);
/* La fiche lit le journal trie DECROISSANT (donnees.ts) : le plus recent
   arrive en premier. La regle ne doit dependre d'aucun ordre. */
ok("le journal trie a l'envers donne le meme verdict",
   JSON.stringify(dernierChoixCouverture([
     { type: "couverture_choisie", payload: { rang: 2 }, created_at: "2026-09-11T10:00:00Z" },
     { type: "couverture_choisie", payload: { indifferent: true }, created_at: "2026-09-11T09:00:00Z" },
   ])) === JSON.stringify({ rang: 2 }));
ok("le plus RECENT fait foi",
   JSON.stringify(dernierChoixCouverture([
     { type: "couverture_choisie", payload: { rang: 2 }, created_at: "2026-09-11T09:00:00Z" },
     { type: "couverture_choisie", payload: { indifferent: true }, created_at: "2026-09-11T10:00:00Z" },
   ])) === JSON.stringify({ indifferent: true }));
ok("un evenement d'un autre type n'est jamais pris pour un choix",
   dernierChoixCouverture([{ type: "etat_change", payload: { rang: 1 } }]) === null);

titre("— le journal raconte les deux reponses —");

const rIndifferent = raconter("couverture_choisie", { source: "page_numero", indifferent: true, rang: null });
ok("« je vous fais confiance » se lit comme une REPONSE",
   rIndifferent.texte === "Le client nous laisse choisir la couverture");
ok("le detail dit ce que l'atelier doit en faire",
   rIndifferent.detail === "Sans préférence : l'atelier décide");
ok("le ton reste celui du client", rIndifferent.ton === "elle");
ok("un rang se raconte toujours comme avant",
   raconter("couverture_choisie", { rang: 1 }).texte === "Le client préfère la couverture 2"
   && raconter("couverture_choisie", { rang: 0 }).texte === "Le client garde la couverture proposée");

titre("— le brouillon LOCAL du panneau d'action (11/09) —");

/* Un `localStorage` de papier : le harnais tourne sous Node, et la regle a
   verifier est le FORMAT, pas le navigateur. */
const disque = new Map<string, string>();
(globalThis as { localStorage?: unknown }).localStorage = {
  getItem: (c: string) => disque.get(c) ?? null,
  setItem: (c: string, v: string) => {
    disque.set(c, v);
  },
  removeItem: (c: string) => {
    disque.delete(c);
  },
};

const BROUILLON_PANNEAU = {
  version: 1 as const,
  enregistreLe: Date.UTC(2026, 8, 11, 9, 0, 0),
  action: "publier_apercu",
  saisie: { nb_pages: "34", pays_livraison: "FR" },
  planches: [{ id: "p1", key: "numeros/x/apercu/plat-a.jpg", nom: "plat-a.jpg" }],
  doubles: [{ id: "d1", key: "numeros/x/apercu/double-a.jpg", nom: "double-a.jpg" }],
  cadrages: { "numeros/x/apercu/double-a.jpg": "50% 30%" },
};
ecrireBrouillonPanneau("jeton", BROUILLON_PANNEAU);
ok("la cle porte le token : deux dossiers ouverts ne se melangent pas",
   disque.has(`${CLE_BROUILLON}:jeton`) && lireBrouillonPanneau("autre") === null);
const relu = lireBrouillonPanneau("jeton");
ok("l'aller-retour rend exactement ce qui a ete ecrit",
   JSON.stringify(relu) === JSON.stringify(BROUILLON_PANNEAU));

/* Restaurer remet les memes valeurs dans les memes etats, donc redeclenche
   une ecriture : si elle passait, l'horodatage repartirait a zero et l'ecran
   dirait « a l'instant » pour un travail vieux de dix minutes. */
ecrireBrouillonPanneau("jeton", { ...BROUILLON_PANNEAU, enregistreLe: Date.now() });
ok("un contenu identique ne REECRIT pas : la date reste celle du dernier changement",
   lireBrouillonPanneau("jeton")?.enregistreLe === BROUILLON_PANNEAU.enregistreLe);
ecrireBrouillonPanneau("jeton", {
  ...BROUILLON_PANNEAU,
  enregistreLe: BROUILLON_PANNEAU.enregistreLe + 60_000,
  saisie: { nb_pages: "36" },
});
ok("un contenu DIFFERENT reecrit, horodatage compris",
   lireBrouillonPanneau("jeton")?.enregistreLe === BROUILLON_PANNEAU.enregistreLe + 60_000);
ecrireBrouillonPanneau("jeton", BROUILLON_PANNEAU);

disque.set(`${CLE_BROUILLON}:abime`, "{ceci n'est pas du json");
ok("un contenu illisible ne jette jamais : le panneau marche comme avant",
   lireBrouillonPanneau("abime") === null);
disque.set(`${CLE_BROUILLON}:v2`, JSON.stringify({ ...BROUILLON_PANNEAU, version: 2 }));
ok("une version inconnue est ignoree (le format pourra changer sans casser)",
   lireBrouillonPanneau("v2") === null);
disque.set(`${CLE_BROUILLON}:sansdate`, JSON.stringify({ ...BROUILLON_PANNEAU, enregistreLe: "hier" }));
ok("sans horodatage, pas de brouillon : on ne peut pas dire depuis quand",
   lireBrouillonPanneau("sansdate") === null);
disque.set(`${CLE_BROUILLON}:sale`, JSON.stringify({
  ...BROUILLON_PANNEAU,
  saisie: { nb_pages: "34", pays_livraison: 7 },
  planches: [{ key: "k/ok.jpg" }, { nom: "sans cle" }, "pas un objet"],
  doubles: "pas une liste",
}));
const SALE_B = lireBrouillonPanneau("sale");
ok("une valeur abimee est ecartee sans faire tomber le reste",
   SALE_B !== null && JSON.stringify(SALE_B.saisie) === JSON.stringify({ nb_pages: "34" })
   && SALE_B.planches.length === 1 && SALE_B.planches[0].key === "k/ok.jpg"
   && SALE_B.doubles.length === 0);
ok("un visuel sans id en recoit un : le glisse a besoin d'une identite stable",
   Boolean(SALE_B?.planches[0].id) && SALE_B?.planches[0].nom === "ok.jpg");

effacerBrouillonPanneau("jeton");
ok("l'effacement ne laisse rien derriere lui",
   lireBrouillonPanneau("jeton") === null && !disque.has(`${CLE_BROUILLON}:jeton`));

/* Un `localStorage` ABSENT (rendu serveur) ou qui refuse d'ecrire (quota,
   navigation privee) : le panneau ne doit pas s'en apercevoir. */
(globalThis as { localStorage?: unknown }).localStorage = undefined;
ok("sans localStorage, lire rend null et ecrire ne jette pas",
   lireBrouillonPanneau("jeton") === null
   && (() => { ecrireBrouillonPanneau("jeton", BROUILLON_PANNEAU); effacerBrouillonPanneau("jeton"); return true; })());
(globalThis as { localStorage?: unknown }).localStorage = {
  getItem: () => { throw new Error("refuse"); },
  setItem: () => { throw new Error("plein"); },
  removeItem: () => { throw new Error("refuse"); },
};
ok("un stockage qui REFUSE ne casse rien non plus",
   lireBrouillonPanneau("jeton") === null
   && (() => { ecrireBrouillonPanneau("jeton", BROUILLON_PANNEAU); effacerBrouillonPanneau("jeton"); return true; })());

ok("une cle de coffre se lit par son dernier segment",
   nomDeCle("numeros/abc/apercu/plat-3f2.jpg") === "plat-3f2.jpg" && nomDeCle("seul.jpg") === "seul.jpg");

/* L'empreinte : elle ne regarde QUE ce qui distingue l'ecran de la fiche.
   Les id de glisse et les vignettes changent a chaque rendu — les compter
   ferait croire a un brouillon des l'ouverture de la page. */
ok("deux listes de memes cles, d'ids differents, ont la meme empreinte",
   empreinte("a", { x: "1" }, [{ key: "k1" }], [], {})
   === empreinte("a", { x: "1" }, [{ key: "k1" }], [], {}));
ok("l'ordre des couvertures compte : ranger, c'est decider ce qu'il voit en premier",
   empreinte("a", {}, [{ key: "k1" }, { key: "k2" }], [], {})
   !== empreinte("a", {}, [{ key: "k2" }, { key: "k1" }], [], {}));
ok("un champ de saisie modifie change l'empreinte",
   empreinte("a", { nb_pages: "34" }, [], [], {})
   !== empreinte("a", { nb_pages: "36" }, [], [], {}));
ok("l'ordre d'ecriture des champs, lui, ne compte pas",
   empreinte("a", { x: "1", y: "2" }, [], [], {}) === empreinte("a", { y: "2", x: "1" }, [], [], {}));
ok("un cadrage regle au doigt change l'empreinte",
   empreinte("a", {}, [], [{ key: "d1" }], {}) !== empreinte("a", {}, [], [{ key: "d1" }], { d1: "50% 30%" }));

/* « il y a 12 min » : la phrase que Mathias lit en haut du panneau. */
const MINUTE = 60_000;
ok("sous une minute, on dit « a l'instant » plutot qu'un « il y a 0 min » douteux",
   depuis(Date.now() - 20_000) === "à l'instant");
ok("douze minutes", depuis(Date.now() - 12 * MINUTE) === "il y a 12 min");
ok("deux heures", depuis(Date.now() - 125 * MINUTE) === "il y a 2 h");
ok("hier", depuis(Date.now() - 30 * 60 * MINUTE) === "hier");
ok("trois jours", depuis(Date.now() - 3 * 24 * 60 * MINUTE) === "il y a 3 jours");

/* On repose le globe comme on l'a trouve : la suite du harnais ne doit pas
   heriter d'un `localStorage` qui jette. */
delete (globalThis as { localStorage?: unknown }).localStorage;

void verifierT005().then(() => {
  console.log(ko === 0 ? "\nTOUT PASSE\n" : `\n${ko} ECHEC(S)\n`);
  process.exit(ko === 0 ? 0 : 1);
});

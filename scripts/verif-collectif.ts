/**
 * Vérification du socle de l'Édition collective — SANS base, SANS réseau.
 *
 *     npx tsx --tsconfig tsconfig.json scripts/verif-collectif.ts
 *
 * Le jumeau de `verif-atelier.ts` pour le B2B (PRD-edition-collective §10).
 * Il met à l'épreuve les modules PURS de `src/lib/collectif/` : l'interrupteur,
 * la machine d'états et ses gestes, les verrous du menu, les plafonds, les
 * droits par token, les clés R2. Puis il relit, sans les exécuter, la
 * migration et les routes : une garde oubliée se voit ici avant de se voir en
 * production.
 *
 * Toute règle ajoutée à `src/lib/collectif/` s'ajoute ici aussi.
 */

import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join, resolve } from "node:path";
import { cheminPublic, MASQUE } from "@/lib/analytics/chemin";
import { groupesDeDoublons } from "@/lib/atelier/empreinte";
import * as MailsTextes from "@/lib/collectif/mailsTextes";
import * as Appareil from "@/lib/collectif/appareil";
import * as Appareils from "@/lib/collectif/appareils";
import {
  cleContenu,
  cleCouverture,
  cleDocument,
  cleGrisTour,
  clePieceJointe,
  clePageTour,
  clePdfTour,
  cleVignettePageTour,
  clePhoto,
  cleStyle,
  cleVignette,
  estCleCollectif,
  estSlugStyle,
  extensionSure,
  prefixeEdition,
} from "@/lib/collectif/cles";
import {
  ACTIONS,
  ACTIONS_ECRITURE,
  DROITS,
  estCleProvenance,
  peut,
  roleAdmisSur,
  roleDuToken,
  type Action,
} from "@/lib/collectif/droits";
import {
  atteint,
  collecteOuverte,
  estEtatEdition,
  ETATS_EDITION,
  etatEffectif,
  etatMagazine,
  LIBELLE_ETAT_EDITION,
  lireInstant,
  type EtatEdition,
} from "@/lib/collectif/etats";
import {
  GESTES,
  GESTES_DE_LA_FICHE,
  gestesDepuis,
  preparerGeste,
  quiPour,
  type ContexteGeste,
  type GesteCle,
  type MagazinePourGeste,
} from "@/lib/collectif/gestes";
import { lireInterrupteur } from "@/lib/collectif/interrupteur";
import { basculerCouverture, briefModifiable, compositionDu, etatDuBrief, grouperParChoix, lireChoixStyle, lirePiece, lireTexte, manquesBrief, PARTS_TEXTE, patchCouvertures, raisonsDuStyle, resumeBrief, styleVisible, stylesDeLaComposition, typesDes, type BriefLigne, type Composition } from "@/lib/collectif/brief";
import { cleFichier, compteDansPlafond, DELAI_DECLARATION_MORTE_MS, lireDeclaration, LOT_DECLARATION, planDeclaration, type Existant } from "@/lib/collectif/depot";
import { groupesDoublonsRapides } from "@/lib/collectif/doublons";
import { jourDePhoto, libelleProvenance, lireFiltre, resumeDeposants } from "@/lib/collectif/grille";
import { contenusAEnvoyer, ETAPES_CLIENT, etapeClient, initiales, joursAvant, libelleRole, parler, phraseJours } from "@/lib/collectif/espace";
import { curseur, extraitDe, filDeConversation, fusionnerMessages, lirePieceJointe, lireTexteMessage, MESSAGE_MAX, PIECE_MAX, texteDuMessage, type Message } from "@/lib/collectif/messages";
import { libelleTypeDocument, lireSaisieDocument, nomTelechargement } from "@/lib/collectif/documents";
import { formaterHeureParis, formaterInstantParis, formaterJourParis, instantDeParis, versChampParis } from "@/lib/collectif/dates";
import { liensEdition, origineDepuis } from "@/lib/collectif/liens";
import { prochaineEtape } from "@/lib/collectif/prochaine";
import { phraseEvenement } from "@/lib/collectif/recit";
import { lireSaisieEdition, planMagazines, type MagazineActuel } from "@/lib/collectif/saisie";
import {
  estCleImageStyle,
  lireSaisieStyle,
  manquesPourPublier,
  nomImageStyle,
  slugDepuisNom,
  TYPES_DOUBLES,
} from "@/lib/collectif/styles";
import { MIGRATION_COLLECTIF, TABLES_COLLECTIF, tableAbsente } from "@/lib/collectif/migration";
import {
  lireEntierPositif,
  placeRestante,
  plafondParticipant,
  reglerPlafondAtelier,
  reglerPlafondClient,
  trancherLot,
  type ReglagesPlafond,
} from "@/lib/collectif/plafonds";
import { estTypeNote, ROLES, TYPES_NOTE, type Role } from "@/lib/collectif/types";
import { cookieMode, LOGO_MODE, lireMode, MODES } from "@/lib/collectif/affichage";
import { CONTENUS_CLIENT, contenuClient, lireFichierContenu, lireReponsesMot, QUESTIONS_MOT } from "@/lib/collectif/contenus";
import { cheminQr, matriceQr, svgQr } from "@/lib/collectif/qr";
import { apercuPossible, envoisCourants } from "@/lib/collectif/contenus";
import * as Dossiers from "@/lib/collectif/dossiers";
import { genreFichier } from "@/lib/collectif/visionneuse";
import { aTraiter as aTraiterBoite, conversationsDe, initialesDe, quandCourt } from "@/lib/collectif/boite";
import { etapesEdition } from "@/lib/collectif/prochaine";
import { messagePartage } from "@/lib/collectif/partage";
import { colonneAbsente, MIGRATION_REVISION } from "@/lib/collectif/migration";
import { libellePlafondLien, lirePlafondLien, plafondLienMax, CURSEUR_LIEN } from "@/lib/collectif/plafonds";
import {
  demandePossible,
  demandesDuFil,
  estJour,
  etapesLivraison,
  formaterJour,
  lireDemande,
  lireMessageDemande,
  lireSaisieLivraison,
  messageDemande,
  messageProposition,
  MOTIFS_MODIFICATION,
  titreLivraison,
} from "@/lib/collectif/livraison";
import {
  apparierPages,
  decoderGris,
  doublesPages,
  encoderGris,
  etatNote,
  GRIS_H,
  GRIS_L,
  libelleBande,
  libelleDouble,
  lireChoixCouverture,
  rappelValidation,
  lireNote,
  lirePagesTour,
  manquesPourPublierTour,
  MAX_PAGES_TOUR,
  rectRognage,
  resumeNote,
  resumeTour,
  PLAFOND_EMPREINTE,
  coutPaire,
  motsDePage,
  motsUtiles,
  texteValidationBat,
  tourCourant,
  zonesModifiees,
} from "@/lib/collectif/bat";
import { cheminSection, MENU, RAISON_VERROU, sectionDuChemin, verrousPour } from "@/lib/collectif/verrous";
import { chevauche, creneauxDuJour, creneauxLibres, heuresDeDebut, joursOuvres, libelleCreneau, lireCreneau, lireMotif, lireReglageAgenda, lundiDeSemaine, REGLES_RDV } from "@/lib/collectif/creneaux";
import { invitationIcs, replier } from "@/lib/collectif/ics";
import { mailRendezVous } from "@/lib/collectif/mailsRdv";
import { lireCompteAgenda } from "@/lib/collectif/agenda";

let ko = 0;
const ok = (n: string, c: boolean) => {
  console.log(`${c ? "  ok " : "  KO "} ${n}`);
  if (!c) ko++;
};
const titre = (t: string) => console.log(`\n${t}`);

const RACINE = process.cwd();
const lire = (chemin: string) => readFileSync(resolve(RACINE, chemin), "utf8");

/* ════════════════════════════ L'INTERRUPTEUR ════════════════════════════ */

titre("— COLLECTIF_OUVERT : ouvert seulement sur un oui franc —");
ok("absent = ferme", !lireInterrupteur(undefined).ouvert && !lireInterrupteur(undefined).incompris);
ok("vide = ferme", !lireInterrupteur("").ouvert);
ok("« 1 », « true », « Oui », « ON » = ouvert",
   ["1", "true", "Oui", " ON "].every((v) => lireInterrupteur(v).ouvert));
ok("« 0 », « false », « non » = ferme sans alerte",
   ["0", "false", "non"].every((v) => !lireInterrupteur(v).ouvert && !lireInterrupteur(v).incompris));
ok("une valeur incomprise FERME et le signale",
   !lireInterrupteur("peut-etre").ouvert && lireInterrupteur("peut-etre").incompris);

/* ═══════════════════════════ LA MIGRATION ABSENTE ═══════════════════════════ */

titre("— la table absente se reconnait a ses deux codes —");
ok("PGRST205 (cache PostgREST) = absente", tableAbsente("PGRST205"));
ok("42P01 (PostgreSQL) = absente", tableAbsente("42P01"));
ok("42703 (colonne) n'est PAS une table absente", !tableAbsente("42703"));
ok("une panne n'est pas une table absente", !tableAbsente("PGRST301") && !tableAbsente(undefined));

titre("— la migration ecrite : treize tables, aucune liee a numeros —");
const sql = lire(MIGRATION_COLLECTIF);
ok("le fichier existe et s'ouvre par begin / se ferme par commit",
   /^\s*begin;\s*$/m.test(sql) && /^\s*commit;\s*$/m.test(sql));
ok(`${TABLES_COLLECTIF.length} tables, chacune creee`,
   TABLES_COLLECTIF.length === 13
   && TABLES_COLLECTIF.every((t) => sql.includes(`create table if not exists public.${t} (`)));
ok("chacune a la RLS activee",
   TABLES_COLLECTIF.every((t) => new RegExp(`alter table public\\.${t}\\s+enable row level security`).test(sql)));
ok("aucune ne reference numeros (pas de cle etrangere vers le B2C)",
   !/references\s+public\.numeros/i.test(sql));
ok("aucune table existante n'est alteree (seule collectif_magazines recoit sa FK de couverture)",
   (sql.match(/alter table public\.(\w+)\s+add/g) ?? []).every((l) => l.includes("collectif_magazines")));
const colonnesChiffrees = [
  "plafond_participant_atelier", "plafond_participant_client", "plafond_total", "preselection_max",
  "pagination_prevue", "tirage", "tours_inclus", "nb_propositions_couverture", "couvertures_aimees_max",
];
ok("aucun chiffre par defaut sur les plafonds, le tirage, les tours, les couvertures",
   colonnesChiffrees.every((c) => {
     const ligne = sql.split("\n").find((l) => new RegExp(`^\\s*${c}\\s+integer`).test(l));
     return Boolean(ligne) && !/default/i.test(ligne!);
   }));
ok("un tour publie est fige par un trigger, avant update ET delete",
   /before update or delete on public\.collectif_tours/.test(sql)
   && /collectif_tour_fige/.test(sql));
ok("les couvertures d'un tour publie aussi",
   /before insert or update or delete on public\.collectif_couvertures/.test(sql));
ok("la cle de provenance fait au moins 22 caracteres en base", sql.includes("'^[A-Za-z0-9_-]{22,64}$'"));
ok("le verrou des mails est unique (edition, code)", /unique \(edition_id, code\)/.test(sql));

/* ═════════════════════════════════ LES ÉTATS ═════════════════════════════════ */

const LUNDI = new Date("2026-10-12T10:00:00.000Z");
const HIER = "2026-10-11T10:00:00.000Z";
const DEMAIN = "2026-10-13T10:00:00.000Z";

titre("— l'etat effectif : la cloture se calcule a la lecture —");
ok("preparation + cloture passee = composition", etatEffectif("preparation", HIER, LUNDI) === "composition");
ok("preparation + cloture future = preparation", etatEffectif("preparation", DEMAIN, LUNDI) === "preparation");
ok("preparation sans date = preparation (seul « Clore maintenant » avance)",
   etatEffectif("preparation", null, LUNDI) === "preparation");
ok("une date illisible ne clot rien (V8 lit « le 4 octobre » comme 2001 : prouve le 13/10)",
   etatEffectif("preparation", "le 4 octobre", LUNDI) === "preparation");
ok("lireInstant : ISO avec fuseau seulement",
   lireInstant("2026-10-11T10:00:00.000Z") === Date.parse("2026-10-11T10:00:00.000Z")
   && lireInstant("2026-10-11T10:00:00+00:00") !== null && lireInstant("2026-10-11 10:00:00+00") !== null
   && lireInstant("2026-10-20T22:00") === null && lireInstant("2026-10-20") === null
   && lireInstant("4 octobre 2026") === null && lireInstant(1791712800000) === null);
ok("a l'instant exact de la cloture, c'est clos",
   etatEffectif("preparation", LUNDI.toISOString(), LUNDI) === "composition");
ok("un etat au-dela de la preparation ne bouge jamais a la lecture",
   etatEffectif("bat", HIER, LUNDI) === "bat" && etatEffectif("composition", DEMAIN, LUNDI) === "composition");
ok("collecte ouverte = preparation effective",
   collecteOuverte("preparation", DEMAIN, LUNDI) && !collecteOuverte("preparation", HIER, LUNDI));
ok("sept etats, dans l'ordre du parcours, tous libelles",
   ETATS_EDITION.length === 7 && ETATS_EDITION[0] === "preparation" && ETATS_EDITION[6] === "livree"
   && ETATS_EDITION.every((e) => LIBELLE_ETAT_EDITION[e]?.length > 0));
ok("atteint() suit l'ordre", atteint("bat_valide", "bat") && !atteint("composition", "bat"));
ok("estEtatEdition refuse l'inconnu", estEtatEdition("bat") && !estEtatEdition("validee") && !estEtatEdition(3));

titre("— l'etat d'un magazine est derive, jamais stocke —");
ok("rien = brief a faire",
   etatMagazine({ brief_valide_le: null, bat_valide_le: null, toursPublies: [] }).etape === "brief_a_faire");
ok("brief valide sans tour = brief valide",
   etatMagazine({ brief_valide_le: HIER, bat_valide_le: null, toursPublies: [] }).etape === "brief_valide");
const m2 = etatMagazine({ brief_valide_le: HIER, bat_valide_le: null, toursPublies: [1, 2] });
ok("deux tours publies = tour 2 publie", m2.etape === "tour_publie" && m2.tour === 2);
ok("un tour publie l'emporte sur un brief jamais valide",
   etatMagazine({ brief_valide_le: null, bat_valide_le: null, toursPublies: [1] }).etape === "tour_publie");
ok("le BAT valide l'emporte sur tout",
   etatMagazine({ brief_valide_le: HIER, bat_valide_le: HIER, toursPublies: [1] }).etape === "valide");

/* ═════════════════════════════════ LES GESTES ═════════════════════════════════ */

const mag = (p: Partial<MagazinePourGeste> = {}): MagazinePourGeste => ({
  id: "m1", rang: 1, bat_valide_le: null, couverture_choisie_id: null,
  couverture_sans_preference: false, toursPublies: 0, ...p,
});
const ctx = (p: Partial<ContexteGeste> = {}): ContexteGeste => ({
  role: "atelier", etat: "preparation", clotureLe: DEMAIN, archiveLe: null,
  maintenant: LUNDI, magazines: [mag()], magazineId: "m1", ...p,
});
const refuse = (r: ReturnType<typeof preparerGeste>, champ: string) => !r.ok && r.erreurs[0]?.champ === champ;

titre("— chaque geste derive son « qui » de la matrice des droits —");
ok("aucun geste ne redeclare ses droits : qui = DROITS[action]",
   (Object.keys(GESTES) as GesteCle[]).every((c) => quiPour(c) === DROITS[GESTES[c].action]));
ok("seul valider_bat est un geste du responsable, tous les autres sont atelier",
   (Object.keys(GESTES) as GesteCle[]).every((c) =>
     c === "valider_bat"
       ? quiPour(c).length === 1 && quiPour(c)[0] === "responsable"
       : quiPour(c).length === 1 && quiPour(c)[0] === "atelier"));
ok("l'equipe et le participant ne peuvent tenter AUCUN geste",
   (Object.keys(GESTES) as GesteCle[]).every((c) =>
     refuse(preparerGeste(c, ctx({ role: "equipe" })), "role")
     && refuse(preparerGeste(c, ctx({ role: "participant" })), "role")));

titre("— clore / rouvrir la collecte —");
const clore = preparerGeste("clore_collecte", ctx());
ok("clore depuis la preparation : composition, et la cloture devient maintenant",
   clore.ok && clore.vers === "composition" && clore.patch.etat === "composition"
   && clore.patch.cloture_le === LUNDI.toISOString() && clore.patch.etat_maj_le === LUNDI.toISOString());
ok("clore une collecte deja close (date passee) est refuse : on juge l'etat EFFECTIF",
   refuse(preparerGeste("clore_collecte", ctx({ clotureLe: HIER })), "etat"));
const rouvrir = preparerGeste("rouvrir_collecte", ctx({ etat: "composition", saisie: { cloture_le: "2026-10-20T22:00:00.000Z" } }));
ok("rouvrir depuis la composition avec une date future : preparation + nouvelle date",
   rouvrir.ok && rouvrir.vers === "preparation" && rouvrir.patch.cloture_le === "2026-10-20T22:00:00.000Z");
ok("rouvrir marche aussi quand la base dit encore « preparation » (clôture passee)",
   preparerGeste("rouvrir_collecte", ctx({ clotureLe: HIER, saisie: { cloture_le: DEMAIN } })).ok);
ok("rouvrir sans date est refuse",
   refuse(preparerGeste("rouvrir_collecte", ctx({ etat: "composition" })), "cloture_le"));
ok("rouvrir avec une date sans fuseau est refuse (l'heure de la machine n'est pas celle de Paris)",
   refuse(preparerGeste("rouvrir_collecte", ctx({ etat: "composition", saisie: { cloture_le: "2026-10-20T22:00" } })), "cloture_le"));
ok("rouvrir avec une date passee est refuse (l'etat repartirait aussitot en composition)",
   refuse(preparerGeste("rouvrir_collecte", ctx({ etat: "composition", saisie: { cloture_le: HIER } })), "cloture_le"));
ok("rouvrir est refuse des qu'un tour est publie",
   refuse(preparerGeste("rouvrir_collecte", ctx({ etat: "composition", magazines: [mag({ toursPublies: 1 })], saisie: { cloture_le: DEMAIN } })), "tours"));

titre("— publier un tour —");
const pub1 = preparerGeste("publier_tour", ctx({ etat: "composition" }));
ok("premier tour depuis la composition : l'edition passe en bat",
   pub1.ok && pub1.vers === "bat" && pub1.patch.etat === "bat");
ok("composition atteinte par la date (base encore en preparation) : publier realigne la base",
   (() => { const r = preparerGeste("publier_tour", ctx({ clotureLe: HIER })); return r.ok && r.patch.etat === "bat"; })());
const pub2 = preparerGeste("publier_tour", ctx({ etat: "bat", magazines: [mag({ toursPublies: 1 })] }));
ok("tour suivant depuis bat : rien a ecrire sur l'edition", pub2.ok && pub2.vers === "bat" && Object.keys(pub2.patch).length === 0);
ok("publier avant la cloture est refuse", refuse(preparerGeste("publier_tour", ctx()), "etat"));
ok("publier pour un magazine deja valide est refuse",
   refuse(preparerGeste("publier_tour", ctx({ etat: "bat", magazines: [mag({ bat_valide_le: HIER, toursPublies: 1 })] })), "magazine"));
ok("publier pour un magazine inconnu est refuse",
   refuse(preparerGeste("publier_tour", ctx({ etat: "composition", magazineId: "autre" })), "magazine"));

titre("— valider le bon a tirer (responsable) —");
const resp = (p: Partial<ContexteGeste>) => ctx({ role: "responsable", etat: "bat", ...p });
const unSeul = preparerGeste("valider_bat", resp({ magazines: [mag({ toursPublies: 1, couverture_choisie_id: "c1" })] }));
ok("un seul magazine : valider fait passer l'edition en bat_valide",
   unSeul.ok && unSeul.vers === "bat_valide" && unSeul.patch.etat === "bat_valide"
   && unSeul.magazine?.id === "m1" && unSeul.magazine.patch.bat_valide_le === LUNDI.toISOString());
const deuxMag = [mag({ toursPublies: 1, couverture_sans_preference: true }), mag({ id: "m2", rang: 2, toursPublies: 1 })];
const premierDeDeux = preparerGeste("valider_bat", resp({ magazines: deuxMag }));
ok("deux magazines, le premier valide : l'edition RESTE en bat",
   premierDeDeux.ok && premierDeDeux.vers === "bat" && Object.keys(premierDeDeux.patch).length === 0);
const dernierDeDeux = preparerGeste("valider_bat", resp({
  magazineId: "m2",
  magazines: [mag({ toursPublies: 1, bat_valide_le: HIER }), mag({ id: "m2", rang: 2, toursPublies: 1, couverture_choisie_id: "c9" })],
}));
ok("deux magazines, le dernier valide : bat_valide", dernierDeDeux.ok && dernierDeDeux.vers === "bat_valide");
ok("« Sans preference » est une reponse : la validation passe",
   preparerGeste("valider_bat", resp({ magazines: [mag({ toursPublies: 1, couverture_sans_preference: true })] })).ok);
ok("sans choix de couverture, la validation est refusee",
   refuse(preparerGeste("valider_bat", resp({ magazines: [mag({ toursPublies: 1 })] })), "couverture"));
ok("sans tour publie, refusee",
   refuse(preparerGeste("valider_bat", resp({ magazines: [mag({ couverture_sans_preference: true })] })), "magazine"));
ok("deja validee, refusee (la validation est definitive)",
   refuse(preparerGeste("valider_bat", resp({ magazines: [mag({ toursPublies: 1, bat_valide_le: HIER, couverture_sans_preference: true })] })), "magazine"));
ok("l'atelier ne valide pas a la place du client", refuse(preparerGeste("valider_bat", ctx({ etat: "bat" })), "role"));

titre("— impression, expedition, livraison —");
ok("lancer l'impression depuis bat_valide", (() => { const r = preparerGeste("lancer_impression", ctx({ etat: "bat_valide" })); return r.ok && r.vers === "impression"; })());
ok("lancer l'impression avant la validation est refuse", refuse(preparerGeste("lancer_impression", ctx({ etat: "bat" })), "etat"));
const exp = preparerGeste("marquer_expediee", ctx({ etat: "impression", saisie: { transporteur: "colissimo", suivi: " 6A 1234 5678 9 " } }));
ok("expedier : transporteur reconnu, numero nettoye, lien construit, date posee",
   exp.ok && exp.vers === "expediee" && exp.livraison?.transporteur === "Colissimo"
   && exp.livraison.code === "6A123456789" && typeof exp.livraison.url === "string"
   && exp.livraison.url.includes("6A123456789") && exp.livraison.expediee_le === LUNDI.toISOString());
const inconnu = preparerGeste("marquer_expediee", ctx({ etat: "impression", saisie: { transporteur: "Transports Martin", suivi: "TM-42" } }));
ok("transporteur inconnu : le numero est garde, AUCUN lien invente",
   inconnu.ok && inconnu.livraison?.code === "TM-42" && inconnu.livraison.url === null);
ok("expedier sans numero est refuse",
   refuse(preparerGeste("marquer_expediee", ctx({ etat: "impression", saisie: { transporteur: "DPD" } })), "suivi"));
ok("expedier sans transporteur est refuse",
   refuse(preparerGeste("marquer_expediee", ctx({ etat: "impression", saisie: { suivi: "123" } })), "transporteur"));
const livree = preparerGeste("marquer_livree", ctx({ etat: "expediee" }));
ok("livrer depuis expediee pose la date de livraison", livree.ok && livree.livraison?.livree_le === LUNDI.toISOString());

titre("— l'archive est un marqueur, pas un etat —");
const arch = preparerGeste("archiver", ctx({ etat: "bat" }));
ok("archiver ne touche pas l'etat", arch.ok && arch.vers === "bat" && !("etat" in arch.patch) && arch.patch.archive_le === LUNDI.toISOString());
ok("une edition archivee ne bouge plus",
   refuse(preparerGeste("clore_collecte", ctx({ archiveLe: HIER })), "archive")
   && refuse(preparerGeste("archiver", ctx({ archiveLe: HIER })), "archive"));
const desarch = preparerGeste("desarchiver", ctx({ archiveLe: HIER, etat: "bat" }));
ok("desarchiver remet archive_le a null, l'etat ne bouge pas", desarch.ok && desarch.patch.archive_le === null && desarch.vers === "bat");
ok("desarchiver une edition non archivee est refuse", refuse(preparerGeste("desarchiver", ctx()), "archive"));

titre("— les gestes proposes a l'ecran —");
ok("en preparation, l'atelier peut clore (et pas publier)",
   gestesDepuis("preparation", "atelier").some((g) => g.cle === "clore_collecte")
   && !gestesDepuis("preparation", "atelier").some((g) => g.cle === "publier_tour"));
ok("en bat, le responsable ne voit que la validation",
   gestesDepuis("bat", "responsable").map((g) => g.cle).join() === "valider_bat");
ok("l'equipe ne voit aucun geste, dans aucun etat",
   ETATS_EDITION.every((e) => gestesDepuis(e, "equipe").length === 0));

/* ═════════════════════════════ LES VERROUS DU MENU ═════════════════════════════ */

titre("— le menu : toujours les memes entrees, dans l'ordre des maquettes —");
ok("sept entrees, deux groupes",
   MENU.map((e) => e.libelle).join(" | ")
     === "Tableau de bord | Style | Photos | Bon à tirer | Livraison | Parler à l'atelier | Documents"
   && MENU.filter((e) => e.groupe === 2).map((e) => e.cle).join() === "atelier,dossier");
const attendus: Record<EtatEdition, { bat: boolean; livraison: boolean }> = {
  preparation: { bat: true, livraison: true },
  composition: { bat: true, livraison: true },
  bat: { bat: false, livraison: true },
  bat_valide: { bat: false, livraison: false },
  impression: { bat: false, livraison: false },
  expediee: { bat: false, livraison: false },
  livree: { bat: false, livraison: false },
};
for (const e of ETATS_EDITION) {
  const v = verrousPour(e);
  ok(`${e} : BAT ${attendus[e].bat ? "verrouille" : "ouvert"}, livraison ${attendus[e].livraison ? "verrouillee" : "ouverte"}`,
     (v.bat !== null) === attendus[e].bat && (v.livraison !== null) === attendus[e].livraison
     && v.tableau === null && v.style === null && v.photos === null && v.dossier === null && v.atelier === null);
}
ok("les raisons sont celles du PRD, mot pour mot",
   verrousPour("composition").bat === "Disponible à la réception du premier bon à tirer"
   && verrousPour("bat").livraison === "Disponible après la validation du bon à tirer"
   && RAISON_VERROU.bat.length > 0);
const T = "A".repeat(32);
ok("la section se lit dans le chemin (meme regle pour le menu et la page)",
   sectionDuChemin(`/edition/${T}`) === "tableau" && sectionDuChemin(`/edition/${T}/bat`) === "bat"
   && sectionDuChemin(`/edition/${T}/style/riviera`) === "style" && sectionDuChemin(`/edition/${T}/inconnu`) === null
   && sectionDuChemin(`/depot/${T}`) === null && sectionDuChemin(`/edition/${T}/photos?filtre=jour`) === "photos");
ok("le chemin d'une section", cheminSection(T, "tableau") === `/edition/${T}` && cheminSection(T, "livraison") === `/edition/${T}/livraison`);

/* ═════════════════════════════════ LES PLAFONDS ═════════════════════════════════ */

const r = (p: Partial<ReglagesPlafond> = {}): ReglagesPlafond => ({
  plafond_participant_atelier: 30, plafond_participant_client: null, plafond_total: 2000, ...p,
});

titre("— le plafond par personne : le curseur, borne par l'atelier —");
ok("sans curseur, le plafond de l'atelier", plafondParticipant(r()) === 30);
ok("avec curseur, le curseur", plafondParticipant(r({ plafond_participant_client: 12 })) === 12);
ok("un curseur au-dessus (base incoherente) est quand meme borne", plafondParticipant(r({ plafond_participant_client: 50 })) === 30);
ok("atelier non regle = pas de plafond lisible (null), meme avec un curseur",
   plafondParticipant(r({ plafond_participant_atelier: null, plafond_participant_client: 10 })) === null);
ok("lireEntierPositif : vide = null, illisible = undefined",
   lireEntierPositif("") === null && lireEntierPositif(null) === null && lireEntierPositif("12") === 12
   && lireEntierPositif("0") === undefined && lireEntierPositif("2,5") === undefined && lireEntierPositif(-3) === undefined);

titre("— regler le curseur du responsable —");
const c1 = reglerPlafondClient("20", r());
ok("20 sous un plafond atelier de 30 : accepte", c1.ok && c1.patch.plafond_participant_client === 20);
ok("egal au plafond atelier : accepte", reglerPlafondClient(30, r()).ok);
ok("au-dessus du plafond atelier : refuse, et la phrase cite le plafond",
   (() => { const x = reglerPlafondClient(31, r()); return !x.ok && x.message.includes("30"); })());
ok("atelier non regle : le curseur est refuse", !reglerPlafondClient(5, r({ plafond_participant_atelier: null })).ok);
ok("valeur illisible ou nulle : refusee", !reglerPlafondClient("beaucoup", r()).ok && !reglerPlafondClient("", r()).ok);

titre("— regler le plafond de l'atelier : il ramene le curseur —");
const a1 = reglerPlafondAtelier(10, r({ plafond_participant_client: 20 }));
ok("l'atelier descend a 10 sous un curseur a 20 : le curseur descend a 10 dans la meme ecriture",
   a1.ok && a1.patch.plafond_participant_atelier === 10 && a1.patch.plafond_participant_client === 10);
const a2 = reglerPlafondAtelier(40, r({ plafond_participant_client: 20 }));
ok("l'atelier monte : le curseur ne bouge pas", a2.ok && a2.patch.plafond_participant_atelier === 40 && !("plafond_participant_client" in a2.patch));
const a3 = reglerPlafondAtelier("", r({ plafond_participant_client: 20 }));
ok("vider le plafond atelier vide aussi le curseur (contrainte de la base)",
   a3.ok && a3.patch.plafond_participant_atelier === null && a3.patch.plafond_participant_client === null);
ok("valeur illisible refusee", !reglerPlafondAtelier("trente", r()).ok);

titre("— la place restante, selon qui depose —");
const part = (deja: number) => ({ role: "participant" as const, sansPlafond: false, dejaParAppareil: deja });
ok("l'atelier n'a aucune limite", placeRestante(r({ plafond_total: 1 }), { role: "atelier", sansPlafond: false, dejaParAppareil: 0 }, 9999).illimitee);
const p1 = placeRestante(r(), part(25), 100);
ok("participant a 25/30 : 5 places, borne par la personne", !p1.illimitee && p1.place === 5 && p1.borne === "plafond_participant");
const p2 = placeRestante(r(), part(0), 1995);
ok("edition a 1995/2000 : 5 places, borne par le total", !p2.illimitee && p2.place === 5 && p2.borne === "plafond_total");
const p3 = placeRestante(r(), part(25), 1995);
ok("a egalite (5 et 5), c'est le total qui est cite", !p3.illimitee && p3.place === 5 && p3.borne === "plafond_total");
const p4 = placeRestante(r(), { role: "responsable", sansPlafond: false, dejaParAppareil: 500 }, 1990);
ok("le responsable n'a pas de plafond PAR PERSONNE, mais le total le compte", !p4.illimitee && p4.place === 10 && p4.borne === "plafond_total");
const p5 = placeRestante(r(), { role: "participant", sansPlafond: true, dejaParAppareil: 300 }, 1000);
ok("un lien de provenance sans plafond : seul le total compte", !p5.illimitee && p5.place === 1000);
const p6 = placeRestante(r({ plafond_participant_atelier: null }), part(0), 0);
ok("plafond par personne non regle : le participant est refuse (on ne devine pas)", !p6.illimitee && p6.place === 0 && p6.borne === "plafond_non_regle");
const p7 = placeRestante(r({ plafond_total: null }), { role: "responsable", sansPlafond: false, dejaParAppareil: 0 }, 0);
ok("plafond total non regle : meme le responsable est refuse", !p7.illimitee && p7.place === 0 && p7.borne === "plafond_non_regle");
const p8 = placeRestante(r(), part(40), 2100);
ok("des compteurs au-dela du plafond ne donnent jamais une place negative", !p8.illimitee && p8.place === 0);

titre("— trancher un lot —");
const t1 = trancherLot(12, placeRestante(r(), part(25), 100));
ok("12 demandees, 5 places : 5 acceptees, 7 refusees, et pourquoi", t1.acceptees === 5 && t1.refusees === 7 && t1.raison === "plafond_participant");
const t2 = trancherLot(3, placeRestante(r(), part(0), 0));
ok("lot qui tient : tout passe, aucune raison", t2.acceptees === 3 && t2.refusees === 0 && t2.raison === null);
ok("lot illimite (atelier) : tout passe", trancherLot(500, { illimitee: true }).acceptees === 500);
ok("un lot non regle est refuse en entier", trancherLot(4, p6).refusees === 4 && trancherLot(4, p6).raison === "plafond_non_regle");

/* ═════════════════════════════════ LES DROITS ═════════════════════════════════ */

titre("— la matrice du PRD §2 —");
const attenduDroits: Record<Action, Role[]> = {
  regler_edition: ["atelier"],
  gerer_styles: ["atelier"],
  voir_espace: ["atelier", "responsable", "equipe"],
  regler_plafond_participant: ["atelier", "responsable"],
  deposer_photos: ["atelier", "responsable", "participant"],
  preselectionner: ["atelier", "responsable"],
  signaler_photo: ["atelier", "responsable"],
  choisir_style: ["responsable"],
  valider_brief: ["responsable"],
  envoyer_contenu: ["responsable"],
  deposer_tour: ["atelier"],
  repondre_note: ["atelier"],
  poser_note: ["responsable"],
  resoudre_note: ["responsable"],
  envoyer_notes: ["responsable"],
  choisir_couverture: ["responsable"],
  valider_bat: ["responsable"],
  ecrire_message: ["atelier", "responsable"],
  prendre_rendez_vous: ["atelier", "responsable"],
  saisir_livraison: ["atelier"],
  /* T-154 (15/10) : seul le lien du responsable reçoit un code d'appareil. */
  ouvrir_sur_appareil: ["responsable"],
};
ok("chaque action, chaque role : exactement le tableau du PRD",
   ACTIONS.length === Object.keys(attenduDroits).length
   && ACTIONS.every((a) => ROLES.every((role) => peut(role, a) === attenduDroits[a].includes(role))));
ok("L'EQUIPE N'ECRIT RIEN : aucune action d'ecriture ne l'admet",
   ACTIONS_ECRITURE.length === ACTIONS.length - 1 && ACTIONS_ECRITURE.every((a) => !peut("equipe", a)));
ok("l'equipe voit l'espace", peut("equipe", "voir_espace"));
ok("le participant ne fait que deposer",
   ACTIONS.filter((a) => peut("participant", a)).join() === "deposer_photos");
ok("l'atelier ne choisit ni le style ni la couverture, et ne valide pas le BAT",
   !peut("atelier", "choisir_style") && !peut("atelier", "valider_brief")
   && !peut("atelier", "choisir_couverture") && !peut("atelier", "valider_bat"));

titre("— un token, un role ; une porte, ses roles —");
const ed = { token_responsable: "R".repeat(32), token_equipe: "E".repeat(32), token_depot: "D".repeat(32) };
ok("le token responsable donne le responsable", roleDuToken(ed, "R".repeat(32)) === "responsable");
ok("le token equipe donne l'equipe", roleDuToken(ed, "E".repeat(32)) === "equipe");
ok("le token de depot donne le participant", roleDuToken(ed, "D".repeat(32)) === "participant");
ok("un autre token ne donne rien", roleDuToken(ed, "X".repeat(32)) === null);
ok("un token vide ne donne rien, meme face a une colonne vide",
   roleDuToken(ed, "") === null && roleDuToken({ ...ed, token_equipe: "" }, "") === null);
ok("l'espace admet responsable et equipe, pas le participant",
   roleAdmisSur("espace", "responsable") && roleAdmisSur("espace", "equipe") && !roleAdmisSur("espace", "participant"));
ok("le depot n'admet que le participant (un lien responsable tape sur /depot ne passe pas)",
   roleAdmisSur("depot", "participant") && !roleAdmisSur("depot", "responsable") && !roleAdmisSur("depot", "equipe"));
ok("aucune porte publique n'admet l'atelier",
   !roleAdmisSur("espace", "atelier") && !roleAdmisSur("depot", "atelier"));
ok("une cle de provenance lisible (« photographe ») est refusee",
   !estCleProvenance("photographe") && !estCleProvenance("a".repeat(21)) && estCleProvenance("aB3_-".repeat(5)));

/* ═════════════════════════════════ LES CLÉS R2 ═════════════════════════════════ */

titre("— les cles du coffre : toujours sous collectif/, jamais sous numeros/ —");
const E = "0b6f3c2e-1a2b-4c3d-8e9f-001122334455";
const P = "11111111-2222-4333-8444-555555555555";
const TOUR = "99999999-8888-4777-8666-555555555555";
const cles = [
  clePhoto(E, P, "image/jpeg"), cleVignette(E, P), clePdfTour(E, TOUR), clePageTour(E, TOUR, 7, "webp"),
  cleCouverture(E, TOUR, 2, "c3", "jpg"), cleContenu(E, P, "logo.SVG"), cleDocument(E, P, "devis signé.pdf"),
  cleStyle("riviera", "couverture-1.webp"),
];
ok("toutes sous collectif/", cles.every((k) => k.startsWith("collectif/") && estCleCollectif(k)));
ok("aucune sous numeros/", cles.every((k) => !k.includes("numeros/")));
ok("photo : meme forme que le B2C", clePhoto(E, P, "image/heic") === `collectif/${E}/photos/${P}/original.heic`);
ok("vignette : toujours .jpg", cleVignette(E, P).endsWith("/vignette.jpg"));
ok("page de tour : rangee par l'id du tour, index sur trois chiffres",
   clePageTour(E, TOUR, 7, "webp") === `collectif/${E}/tours/${TOUR}/pages/007.webp`);
ok("deux magazines, deux tours 1 : deux dossiers distincts (ecart corrige du PRD §6.1)",
   clePageTour(E, TOUR, 0, "webp") !== clePageTour(E, P, 0, "webp"));
ok("extension sure : minuscules, rien d'autre", extensionSure("logo.SVG") === "svg" && extensionSure("sans-extension") === "bin" && extensionSure("x.ph p") === "bin");
ok("prefixe d'edition", prefixeEdition(E) === `collectif/${E}/`);
const jette = (f: () => unknown) => { try { f(); return false; } catch { return true; } };
ok("un id qui n'est pas un uuid est refuse (pas de ../ dans le coffre)",
   jette(() => clePhoto("../numeros/x", P, "image/jpeg")) && jette(() => clePageTour(E, "abc", 1, "webp")));
ok("un index de page absurde est refuse", jette(() => clePageTour(E, TOUR, -1, "webp")) && jette(() => clePageTour(E, TOUR, 1.5, "webp")));
ok("un slug ou un nom de fichier de style douteux est refuse",
   jette(() => cleStyle("Riviera", "a.webp")) && jette(() => cleStyle("riviera", "../a.webp")) && !estSlugStyle("a b"));
ok("une cle avec .. n'est pas du coffre collectif", !estCleCollectif("collectif/../numeros/x"));

/* ═══════════════════════════ LES NOTES, LES DOUBLONS ═══════════════════════════ */

titre("— les types de note : une liste extensible —");
ok("quatre types, libelles du PRD", TYPES_NOTE.length === 4 && TYPES_NOTE.map((t) => t.libelle).join(" | ")
   === "Corriger un texte | Changer une photo | Une idée, une demande | Retirer un élément");
ok("estTypeNote refuse l'inconnu", estTypeNote("texte") && !estTypeNote("autre") && !estTypeNote(1));

titre("— les doublons du B2C se reutilisent tels quels (remarques, jamais exclusions) —");
const g = groupesDeDoublons([
  { id: "a", empreinte: "0000000000000000", priseLe: null, ordre: 1 },
  { id: "b", empreinte: "0000000000000001", priseLe: null, ordre: 2 },
]);
ok("deux empreintes a une distance de 1 forment un groupe", g.length === 1 && g[0].doublons.join() === "b");

/* ═══════════════════════════ L'ANALYTIQUE MASQUE LES JETONS ═══════════════════════════ */

titre("— /edition et /depot : le token ne part jamais vers la mesure —");
const O = "https://bellajour.fr";
const TOK = "aB3dE5gH7jK9mN1pQ3sT5vW7yZ9bC1dE";
ok("/edition/<token> devient /edition/[token]", cheminPublic(`${O}/edition/${TOK}`) === `${O}/edition/${MASQUE}`);
ok("/edition/<token>/bat garde la section", cheminPublic(`${O}/edition/${TOK}/bat`) === `${O}/edition/${MASQUE}/bat`);
ok("/depot/<token>?p=<cle> : token masque, cle de provenance jamais envoyee",
   cheminPublic(`${O}/depot/${TOK}?p=${"k".repeat(22)}`) === `${O}/depot/${MASQUE}`);
ok("l'admin collectif ne part pas du tout", cheminPublic(`${O}/admin/collectif`) === null);


/* ═══════════════════════════ PHASE 1 : L'HEURE DE PARIS ═══════════════════════════ */

titre("— la cloture se tape a l'heure de Paris, part en UTC —");
ok("ete (UTC+2) : 20 octobre 23:59 a Paris = 21:59 UTC",
   instantDeParis("2026-10-20T23:59") === "2026-10-20T21:59:00.000Z");
ok("hiver (UTC+1) : 1er decembre 00:00 a Paris = 30 novembre 23:00 UTC",
   instantDeParis("2026-12-01T00:00") === "2026-11-30T23:00:00.000Z");
ok("l'heure qui n'existe pas (29 mars 2026, 2:30) est refusee, pas decalee",
   instantDeParis("2026-03-29T02:30") === null);
ok("l'heure qui existe deux fois (25 octobre 2026, 2:30) donne un instant qui relit la meme heure",
   (() => { const i = instantDeParis("2026-10-25T02:30"); return i !== null && versChampParis(i) === "2026-10-25T02:30"; })());
ok("une saisie illisible est refusee",
   instantDeParis("20/10/2026 23:59") === null && instantDeParis("2026-13-01T10:00") === null && instantDeParis("") === null);
ok("aller-retour : versChampParis relit ce qu'instantDeParis a ecrit",
   versChampParis(instantDeParis("2026-07-14T08:05")) === "2026-07-14T08:05");
ok("versChampParis d'une valeur vide ou illisible = vide", versChampParis(null) === "" && versChampParis("n'importe") === "");
ok("formaterInstantParis ecrit l'heure de Paris", formaterInstantParis("2026-10-20T21:59:00.000Z").includes("23:59"));

/* ═══════════════════════════ PHASE 1 : LA SAISIE D'UNE ÉDITION ═══════════════════════════ */

titre("— ouvrir une edition : ce qui est exige, ce qui reste vide —");
const creation = {
  organisation: "  Maison Test  ", evenement: "Seminaire", registre: "entreprise_vous",
  responsable_email: "Resp@Exemple.fr", magazines: [{ nom: "Le seminaire" }, { nom: "La soiree" }],
};
const cr1 = lireSaisieEdition(creation, "creation");
ok("une creation minimale passe, textes nettoyes, e-mail en minuscules",
   cr1.ok && cr1.edition.organisation === "Maison Test" && cr1.edition.responsable_email === "resp@exemple.fr"
   && cr1.magazines?.length === 2);
ok("AUCUN chiffre invente : tous les champs chiffres absents valent null",
   cr1.ok && ["plafond_participant_atelier", "plafond_total", "preselection_max", "pagination_prevue", "tirage",
     "tours_inclus", "nb_propositions_couverture", "couvertures_aimees_max"].every((k) => cr1.edition[k] === null));
ok("le segment par defaut est « tous » (un choix, pas un chiffre)", cr1.ok && cr1.edition.styles_segment === "tous");
ok("une cloture sans fuseau est refusee (l'ecran envoie de l'ISO)",
   (() => { const x = lireSaisieEdition({ ...creation, cloture_le: "2026-10-20T23:59" }, "creation"); return !x.ok && x.erreurs.some((e) => e.champ === "cloture_le"); })());
ok("une cloture ISO avec fuseau passe",
   (() => { const x = lireSaisieEdition({ ...creation, cloture_le: "2026-10-20T21:59:00.000Z" }, "creation"); return x.ok && x.edition.cloture_le === "2026-10-20T21:59:00.000Z"; })());
const sansRien = lireSaisieEdition({}, "creation");
ok("sans organisation, evenement, e-mail ni magazine : quatre refus nommes",
   !sansRien.ok && ["organisation", "evenement", "responsable_email", "magazines"].every((c) => sansRien.erreurs.some((e) => e.champ === c)));
ok("un magazine sans nom est refuse",
   !lireSaisieEdition({ ...creation, magazines: [{ nom: "" }] }, "creation").ok);
ok("un chiffre illisible est refuse, zero l'est pour un plafond, accepte pour la preselection",
   !lireSaisieEdition({ ...creation, tirage: "beaucoup" }, "creation").ok
   && !lireSaisieEdition({ ...creation, plafond_total: "0" }, "creation").ok
   && (() => { const x = lireSaisieEdition({ ...creation, preselection_max: "0" }, "creation"); return x.ok && x.edition.preselection_max === 0; })());
ok("un lien de rendez-vous qui n'est pas en https est refuse (javascript: compris)",
   !lireSaisieEdition({ ...creation, rdv_url: "javascript:alert(1)" }, "creation").ok
   && !lireSaisieEdition({ ...creation, rdv_url: "http://calendar.app.google/x" }, "creation").ok
   && lireSaisieEdition({ ...creation, rdv_url: "https://calendar.app.google/x" }, "creation").ok);
ok("les contenus demandes ne gardent que les cles connues",
   (() => { const x = lireSaisieEdition({ ...creation, contenus_demandes: ["logo", "pirate", "mot"] }, "creation"); return x.ok && JSON.stringify(x.edition.contenus_demandes) === '["logo","mot"]'; })());
ok("une faute de frappe dans l'e-mail est SUGGEREE, pas bloquee",
   (() => { const x = lireSaisieEdition({ ...creation, responsable_email: "resp@gmial.com" }, "creation"); return x.ok && x.suggestion === "resp@gmail.com"; })());
ok("la case « demonstration » ne s'ecrit jamais d'ici",
   (() => { const x = lireSaisieEdition({ ...creation, demo: true }, "creation"); return x.ok && !("demo" in x.edition); })());

titre("— regler une edition : seuls les champs envoyes —");
const mo1 = lireSaisieEdition({ tirage: "120" }, "modification");
ok("modifier le tirage n'ecrit que le tirage", mo1.ok && JSON.stringify(mo1.edition) === '{"tirage":120}' && mo1.magazines === null);
const mo2 = lireSaisieEdition({ plafond_participant_atelier: "10" }, "modification",
  { plafond_participant_atelier: 30, plafond_participant_client: 20, plafond_total: 2000 });
ok("baisser le plafond atelier sous le curseur client ramene le curseur (meme ecriture)",
   mo2.ok && mo2.edition.plafond_participant_atelier === 10 && mo2.edition.plafond_participant_client === 10);

titre("— les magazines : renommer, ajouter a la suite, retirer le dernier s'il est vide —");
const actuels: MagazineActuel[] = [
  { id: "a", rang: 1, nom: "Le seminaire", vide: false },
  { id: "b", rang: 2, nom: "La soiree", vide: true },
];
const pRen = planMagazines(actuels, [{ id: "a", nom: "Le grand seminaire" }, { id: "b", nom: "La soiree" }]);
ok("renommer le premier", pRen.ok && pRen.renommer.length === 1 && pRen.renommer[0].nom === "Le grand seminaire" && !pRen.ajouter.length);
const pAj = planMagazines(actuels, [{ id: "a", nom: "Le seminaire" }, { id: "b", nom: "La soiree" }, { id: null, nom: "Le voyage" }]);
ok("ajouter a la suite : rang 3", pAj.ok && pAj.ajouter.length === 1 && pAj.ajouter[0].rang === 3);
const pRet = planMagazines(actuels, [{ id: "a", nom: "Le seminaire" }]);
ok("retirer le dernier, vide", pRet.ok && pRet.retirer.join() === "b");
ok("retirer un magazine qui a un brief : refuse",
   !planMagazines([{ ...actuels[0] }, { ...actuels[1], vide: false }], [{ id: "a", nom: "x" }]).ok);
ok("retirer le premier en gardant le second : refuse (pas de renumerotation)",
   !planMagazines(actuels, [{ id: "b", nom: "La soiree" }]).ok);
ok("un id etranger a l'edition : refuse", !planMagazines(actuels, [{ id: "zzz", nom: "x" }]).ok);
ok("a la creation, tout s'ajoute a partir du rang 1",
   (() => { const p = planMagazines([], [{ id: null, nom: "Un" }, { id: null, nom: "Deux" }]); return p.ok && p.ajouter.map((x) => x.rang).join() === "1,2"; })());

/* ═══════════════════════════ PHASE 1 : LES STYLES ═══════════════════════════ */

titre("— un style : son adresse, sa saisie, ce qui manque pour publier —");
ok("slugDepuisNom enleve accents et ponctuation", slugDepuisNom("Riviéra d'été !") === "riviera-d-ete" && slugDepuisNom("   ") === "");
const st1 = lireSaisieStyle({ nom: "Riviera", segment: "entreprise" }, "creation");
ok("creer : nom + adresse derivee + public", st1.ok && st1.patch.slug === "riviera" && st1.patch.segment === "entreprise");
ok("une adresse invalide est refusee", !lireSaisieStyle({ nom: "X", slug: "Riv Iera" }, "creation").ok);
ok("en modification, le slug ne se change JAMAIS",
   (() => { const x = lireSaisieStyle({ slug: "autre", nom: "R" }, "modification", "riviera"); return x.ok && !("slug" in x.patch); })());
const img = (n: string) => `collectif/styles/riviera/${n}`;
ok("une image d'un AUTRE style est refusee",
   estCleImageStyle("riviera", img("couverture-a-1234.webp")) && !estCleImageStyle("riviera", "collectif/styles/autre/a.webp")
   && !estCleImageStyle("riviera", "collectif/styles/riviera/../../numeros/x"));
const pal = lireSaisieStyle({ palettes: [{ nom: "Azur", couleurs: ["#1D3557", "#7fa7c9", "#f6efe3", "#d68a63"] }] }, "modification", "riviera");
ok("une palette : nom + 4 couleurs hex, cle derivee du nom, minuscules",
   pal.ok && JSON.stringify(pal.patch.palettes) === '[{"cle":"azur","nom":"Azur","couleurs":["#1d3557","#7fa7c9","#f6efe3","#d68a63"]}]');
ok("une palette a 3 couleurs ou une couleur illisible est refusee",
   !lireSaisieStyle({ palettes: [{ nom: "A", couleurs: ["#000000", "#ffffff", "#123456"] }] }, "modification", "riviera").ok
   && !lireSaisieStyle({ palettes: [{ nom: "A", couleurs: ["noir", "#ffffff", "#123456", "#000000"] }] }, "modification", "riviera").ok);
const dbl = lireSaisieStyle({ doubles: [{ type: "dense", image_key: img("double-dense-ab12.webp"), legende: "L" }] }, "modification", "riviera");
ok("les doubles pages reviennent TOUJOURS a cinq, dans l'ordre, les manquantes vides",
   dbl.ok && Array.isArray(dbl.patch.doubles) && (dbl.patch.doubles as { type: string; image_key: string | null }[]).map((d) => d.type).join()
     === TYPES_DOUBLES.map((t) => t.cle).join()
   && (dbl.patch.doubles as { type: string; image_key: string | null }[]).filter((d) => d.image_key).length === 1);
const complet = {
  nom: "Riviera",
  palettes: [{ cle: "azur", nom: "Azur", couleurs: ["#000000", "#111111", "#222222", "#333333"] }],
  typos: { titres: "Fraunces", texte: "Inter", echantillon_key: null },
  couvertures: [{ cle: "c1", image_key: img("c.webp"), legende: "" }],
  doubles: TYPES_DOUBLES.map(({ cle }) => ({ type: cle, image_key: img(`${cle}.webp`), legende: "" })),
};
ok("un style complet est publiable (l'echantillon est facultatif)", manquesPourPublier(complet).length === 0);
ok("sans palette, sans typo, sans couverture, une double sans image : quatre manques nommes",
   manquesPourPublier({ ...complet, palettes: [], typos: { titres: "", texte: "" }, couvertures: [],
     doubles: complet.doubles.map((d) => (d.type === "recit" ? { ...d, image_key: null } : d)) }).length === 4);
ok("le nom d'une image est versionne et sur",
   nomImageStyle("couverture", "c1", "a1b2c3", "webp") === "couverture-c1-a1b2c3.webp"
   && nomImageStyle("double", "../x", "ZZ", "jpg") === "double-x-0000.jpg");

/* ═══════════════════════════ PHASE 1 : LISTE, FICHE, JOURNAL ═══════════════════════════ */

titre("— la prochaine etape et son camp —");
ok("preparation : au client, avec la date de cloture",
   (() => { const p = prochaineEtape("preparation", "2026-10-20T21:59:00.000Z"); return p.camp === "client" && p.texte.includes("20 octobre"); })());
ok("preparation sans date : la cloture est a fixer", prochaineEtape("preparation", null).texte.includes("à fixer"));
ok("composition : a nous ; bat : au client ; bat_valide : a nous ; livree : termine",
   prochaineEtape("composition", null).camp === "atelier" && prochaineEtape("bat", null).camp === "client"
   && prochaineEtape("bat_valide", null).camp === "atelier" && prochaineEtape("livree", null).camp === "aucun");
ok("chaque etat a sa phrase", ETATS_EDITION.every((e) => prochaineEtape(e, null).texte.length > 0));

titre("— la fiche ne propose que ses gestes —");
ok("publier un tour n'est pas un bouton de la fiche (il part avec son PDF, phase 5)", !GESTES_DE_LA_FICHE.includes("publier_tour"));
ok("valider le BAT non plus (c'est le responsable)", !GESTES_DE_LA_FICHE.includes("valider_bat"));
ok("chaque geste de la fiche est un geste d'atelier", GESTES_DE_LA_FICHE.every((c) => quiPour(c).includes("atelier")));

titre("— les liens et le journal ne laissent fuir aucun token —");
const tok = { token_responsable: "R".repeat(32), token_equipe: "E".repeat(32), token_depot: "D".repeat(32) };
const l = liensEdition("http://localhost:3006/", tok);
ok("les trois liens, sur l'origine de la requete",
   l.responsable === `http://localhost:3006/edition/${"R".repeat(32)}` && l.equipe.endsWith(`/edition/${"E".repeat(32)}`)
   && l.depot === `http://localhost:3006/depot/${"D".repeat(32)}`);
ok("origineDepuis : https par defaut, http pour localhost, refuse un hote douteux",
   origineDepuis("bellajour.fr", null) === "https://bellajour.fr" && origineDepuis("localhost:3006", null) === "http://localhost:3006"
   && origineDepuis("bellajour.fr", "https,http") === "https://bellajour.fr" && origineDepuis("evil.com/x", "https") === "");
ok("le journal dit QUEL lien a change, jamais sa valeur",
   (() => { const ph = phraseEvenement("lien_regenere", { quel: "equipe", par: "Mathias", token: "R".repeat(32) }); return ph.includes("de l'équipe") && !ph.includes("RRRR"); })());
ok("un geste se raconte par son libelle", phraseEvenement("geste", { cle: "clore_collecte", par: "Louis" }) === "Clore maintenant, par Louis.");
ok("les champs modifies se nomment en francais",
   phraseEvenement("reglages_modifies", { par: "Mathias", champs: ["tirage", "plafond_total"] }).includes("Tirage prévu au devis"));
ok("un type inconnu reste lisible", phraseEvenement("truc_inconnu", {}) === "truc_inconnu");


/* ═══════════════════════════ PHASE 2 : L'ESPACE CLIENT ═══════════════════════════ */

titre("— les etapes du client, sans « N sur M » —");
ok("cinq etapes nommees", ETAPES_CLIENT.map((e) => e.libelle).join(" | ") === "Style et photos | Composition | Bon à tirer | Impression | Livraison");
ok("chaque etat tombe sur une etape", ETATS_EDITION.every((e) => etapeClient(e) >= 0));
ok("bat_valide et impression = Impression ; expediee et livree = Livraison",
   etapeClient("bat_valide") === 3 && etapeClient("impression") === 3 && etapeClient("expediee") === 4 && etapeClient("livree") === 4);

titre("— le temps qui reste, en jours de Paris —");
const midi = new Date("2026-10-13T10:00:00.000Z");
ok("le meme jour = aujourd'hui", phraseJours(joursAvant("2026-10-13T21:59:00.000Z", midi)) === "aujourd'hui");
ok("le lendemain 00:30 a Paris = demain (pas « dans 0 jour »)", phraseJours(joursAvant("2026-10-13T22:30:00.000Z", midi)) === "demain");
ok("dans 7 jours", joursAvant("2026-10-20T21:59:00.000Z", midi) === 7 && phraseJours(7) === "dans 7 jours");
ok("une date passee le dit", phraseJours(joursAvant("2026-10-01T10:00:00.000Z", midi)) === "date passée");
ok("sans date, rien", joursAvant(null, midi) === null && phraseJours(null) === "");

titre("— qui regarde, et comment on lui parle —");
ok("initiales", initiales("Camille Renaud") === "CR" && initiales("Lou") === "LO" && initiales("  ") === "?" && initiales(null) === "?" && initiales("Mathias (essai)") === "MA" && initiales("Élise Ô") === "ÉÔ");
ok("le role au masculin generique", libelleRole("responsable") === "Responsable du BAT" && libelleRole("equipe").includes("lecture seule"));
ok("vous pour une entreprise, tu pour une ecole", parler("entreprise_vous")("vous", "tu") === "vous" && parler("ecole_tu")("vous", "tu") === "tu");
const cont = contenusAEnvoyer(["mot", "logo", "pirate"], ["logo"]);
ok("contenus demandes : ordre de la fiche, inconnu ignore, recu marque",
   cont.map((c) => `${c.cle}:${c.recu}`).join() === "logo:true,mot:false");

titre("— la messagerie —");
ok("un message vide ou trop long est refuse",
   !lireTexteMessage("   ").ok && !lireTexteMessage(42).ok && !lireTexteMessage("x".repeat(MESSAGE_MAX + 1)).ok);
ok("un message se nettoie (CRLF, espaces autour)",
   (() => { const t = lireTexteMessage("  Bonjour\r\nà tous  "); return t.ok && t.texte === "Bonjour\nà tous"; })());
const msg = (id: string, quand: string): Message => ({ id, auteur: "client", qui: null, texte: id, created_at: quand });
const fil = fusionnerMessages([msg("a", "2026-10-13T10:00:00Z"), msg("b", "2026-10-13T10:01:00Z")], [msg("b", "2026-10-13T10:01:00Z"), msg("c", "2026-10-13T10:00:30Z")]);
ok("fusion sans doublon, dans l'ordre du temps", fil.map((m) => m.id).join() === "a,c,b");
ok("le curseur est le dernier message", curseur(fil) === "2026-10-13T10:01:00Z" && curseur([]) === null);

titre("— les documents du dossier —");
ok("un type inconnu est refuse", !lireSaisieDocument("bulletin", "", "x").ok);
ok("sans libelle, le type le donne",
   (() => { const d = lireSaisieDocument("devis", "", "devis-2026"); return d.ok && d.libelle === "Devis signé" && d.nom === "devis-2026"; })());
ok("l'accord sur les donnees est un document ATELIER, jamais redige par le code", libelleTypeDocument("donnees") === "Accord sur les données");
ok("le nom de telechargement est en ASCII sur", nomTelechargement("Facture n°3 / été", "pdf") === "Facture n 3 ete.pdf" && nomTelechargement("", "pdf") === "document.pdf");
ok("le journal raconte un message sans le citer",
   phraseEvenement("message_client", { par: "Camille", texte: "secret" }) === "Message du client (Camille).");


/* ═══════════════════════════ PHASE 3 : LA COLLECTE ═══════════════════════════ */

titre("— la cle de fichier : la reprise sans doublon —");
ok("nom|taille|date de modification, sur l'ORIGINAL", cleFichier("IMG_1.HEIC", 2048, 1700000000123) === "IMG_1.HEIC|2048|1700000000123");
const decl = lireDeclaration([
  { cle: cleFichier("a.jpg", 10, 1), nom: "a.jpg", taille: 900, type: "image/jpeg", tailleVignette: 30, ordre: 0 },
  { cle: "pas une cle", nom: "b.jpg", taille: 10, type: "image/jpeg" },
  { cle: cleFichier("c.pdf", 10, 1), nom: "c.pdf", taille: 10, type: "application/pdf" },
  { cle: cleFichier("d.jpg", 10, 1), nom: "d.jpg", taille: 60 * 1024 * 1024, type: "image/jpeg" },
]);
ok("une declaration garde ce qui est lisible et refuse le reste, un par un",
   decl !== null && decl.fichiers.length === 1 && decl.refus.map((r) => r.erreur).join() === "cle,format,taille");
ok("un lot vide ou trop gros est refuse en bloc",
   lireDeclaration([]) === null && lireDeclaration(Array.from({ length: LOT_DECLARATION + 1 }, () => ({}))) === null);

titre("— le partage d'un lot : deja la, reprise, nouvelle, refusee —");
const f = (nom: string) => ({ cle: cleFichier(nom, 1, 1), nom, taille: 1, type: "image/jpeg", tailleVignette: null, ordre: null });
const lotDepot = [f("a"), f("b"), f("c"), f("d"), f("e")];
const existantsDepot = new Map<string, Existant>([
  [f("a").cle, { id: "A", r2_key: "k/a", confirmee: true }],
  [f("b").cle, { id: "B", r2_key: "k/b", confirmee: false }],
]);
const plan = planDeclaration(lotDepot, existantsDepot, { illimitee: false, place: 2, borne: "plafond_participant" });
ok("deja arrivee = deja ; declaree jamais arrivee = reprise sur la MEME cle",
   plan[0].sorte === "deja" && plan[1].sorte === "reprise" && (plan[1] as { r2_key: string }).r2_key === "k/b");
ok("seules les nouvelles consomment la place : 2 places pour c, d, e = c et d acceptees, e refusee",
   plan[2].sorte === "nouvelle" && plan[3].sorte === "nouvelle" && plan[4].sorte === "refusee"
   && (plan[4] as { raison: string }).raison === "plafond_participant");
const planDouble = planDeclaration([f("x"), f("x")], new Map(), { illimitee: true });
ok("le meme fichier deux fois dans un lot : la seconde est ignoree", planDouble[0].sorte === "nouvelle" && planDouble[1].sorte === "double");
ok("un plafond non regle refuse tout le neuf, mais laisse passer les reprises",
   (() => { const pl = planDeclaration([f("a"), f("z")], existantsDepot, { illimitee: false, place: 0, borne: "plafond_non_regle" }); return pl[0].sorte === "deja" && pl[1].sorte === "refusee"; })());
const ilya = (ms: number) => new Date(LUNDI.getTime() - ms).toISOString();
ok("une declaration morte (plus de 2 h sans arriver) ne bloque plus le plafond",
   compteDansPlafond({ confirmee_le: null, created_at: ilya(10_000) }, LUNDI)
   && !compteDansPlafond({ confirmee_le: null, created_at: ilya(DELAI_DECLARATION_MORTE_MS + 1) }, LUNDI)
   && compteDansPlafond({ confirmee_le: ilya(5), created_at: ilya(DELAI_DECLARATION_MORTE_MS * 9) }, LUNDI));

titre("— les doublons rapides = les doublons du B2C, sur des lots synthetiques —");
let graine = 7;
const alea = () => { graine = (graine * 1103515245 + 12345) & 0x7fffffff; return graine; };
const hexAlea = () => Array.from({ length: 16 }, () => (alea() % 16).toString(16)).join("");
const voisin = (h: string, bits: number) => {
  const b = [...h].map((c) => parseInt(c, 16).toString(2).padStart(4, "0")).join("").split("");
  for (let k = 0; k < bits; k++) { const i = alea() % 64; b[i] = b[i] === "0" ? "1" : "0"; }
  return Array.from({ length: 16 }, (_, i) => parseInt(b.slice(i * 4, i * 4 + 4).join(""), 2).toString(16)).join("");
};
let identiques = true;
for (let lot = 0; lot < 25; lot++) {
  const photosSynth: { id: string; empreinte: string | null; priseLe: string | null; ordre: number }[] = [];
  for (let i = 0; i < 60; i++) {
    const base = i > 0 && alea() % 3 === 0 ? photosSynth[alea() % photosSynth.length].empreinte ?? hexAlea() : hexAlea();
    photosSynth.push({
      id: `p${lot}-${i}`,
      empreinte: alea() % 15 === 0 ? null : voisin(base, alea() % 4),
      priseLe: alea() % 4 === 0 ? null : `2026-10-0${1 + (alea() % 9)}T10:00:00`,
      ordre: i,
    });
  }
  if (JSON.stringify(groupesDoublonsRapides(photosSynth)) !== JSON.stringify(groupesDeDoublons(photosSynth))) identiques = false;
}
ok("25 lots de 60 photos (rafales, recompressions, sans empreinte) : exactement les memes groupes", identiques);

titre("— la grille —");
ok("un filtre inconnu retombe sur « toutes »", lireFiltre("pirate") === "toutes" && lireFiltre("doublons") === "doublons");
ok("le jour d'une photo : sa prise de vue, lue SANS fuseau", jourDePhoto("2024-08-08T23:30:00", "2026-10-13T10:00:00Z").libelle.startsWith("8 août"));
ok("sans date de prise de vue : le jour d'arrivee, et c'est dit", jourDePhoto(null, "2026-10-13T10:00:00Z").libelle.includes("sans date"));
ok("qui a depose : par provenance et deposant, le plus fourni d'abord",
   JSON.stringify(resumeDeposants([
     { provenance_type: "participant", deposant: "Camille" }, { provenance_type: "photographe", deposant: "Studio X" },
     { provenance_type: "participant", deposant: "Camille" },
   ])) === JSON.stringify([{ libelle: "Un participant · Camille", n: 2 }, { libelle: "Le photographe · Studio X", n: 1 }]));
ok("le responsable se nomme comme tel", libelleProvenance("organisateur", "Lou") === "Le responsable · Lou");


/* ═══════════════════════════ PHASE 4 : LE STYLE ET LE BRIEF ═══════════════════════════ */

titre("— D24 : prendre un style EN ENTIER —");
const riviera = { id: "s-riv", publie: true, palettes: [{ cle: "marine" }, { cle: "sable" }], couvertures: [{ cle: "c1" }, { cle: "c2" }] };
const nuit = { id: "s-nuit", publie: true, palettes: [{ cle: "noir" }], couvertures: [{ cle: "n1" }] };
const choix = lireChoixStyle({ palette_cle: "sable", texte: "peu", doubles: ["recit", "aeree", "pirate"] }, riviera);
ok("prendre tout le style : sa palette, ses typographies, ses doubles (inconnues ignorees, ordre des types), brief remis a valider",
   choix.ok && choix.patch.style_id === "s-riv" && choix.patch.palette_cle === "sable" && choix.patch.palette_style_id === "s-riv" && choix.patch.typo_style_id === "s-riv"
   && JSON.stringify(choix.patch.doubles_aimes) === JSON.stringify([{ style_id: "s-riv", double: "aeree" }, { style_id: "s-riv", double: "recit" }])
   && (choix.patch.doubles as string[]).join() === "aeree,recit" && choix.patch.brief_valide_le === null);
ok("prendre tout le style ne touche pas aux couvertures aimees", choix.ok && !("couvertures_aimees" in choix.patch));
ok("sans la migration, le style pris en entier s'ecrit tout entier dans les colonnes d'avant",
   choix.ok && !("palette_style_id" in choix.patchAvant) && !("doubles_aimes" in choix.patchAvant) && choix.patchAvant.style_id === "s-riv" && choix.patchAvant.palette_cle === "sable");
ok("prendre tout le style : sa palette a LUI (une palette d'un autre style se prend comme une piece)",
   !lireChoixStyle({ palette_cle: "noir", texte: "peu", doubles: ["aeree"] }, riviera).ok);
ok("sans double page, ou sans la place du texte : refuse",
   !lireChoixStyle({ palette_cle: "sable", texte: "peu", doubles: [] }, riviera).ok
   && !lireChoixStyle({ palette_cle: "sable", doubles: ["aeree"] }, riviera).ok);
ok("un style non publie ne se choisit pas", !lireChoixStyle({ palette_cle: "sable", texte: "peu", doubles: ["aeree"] }, { ...riviera, publie: false }).ok);
ok("trois parts de texte, libelles de la maquette", PARTS_TEXTE.map((t) => t.libelle).join(" | ") === "Surtout des photos | Un peu de texte | Beaucoup de texte");

titre("— les couvertures aimees : de n'importe quel style, plafonnees, jamais devinees —");
const b1 = basculerCouverture([], { style_id: "s-nuit", couverture: "n1" }, true, 2, nuit);
ok("aimer une couverture de n'importe quel style : permis", b1.ok && b1.aimees.length === 1);
ok("au plafond, une de plus est refusee avec la phrase",
   (() => { const b = basculerCouverture([{ style_id: "s-riv", couverture: "c1" }, { style_id: "s-riv", couverture: "c2" }], { style_id: "s-nuit", couverture: "n1" }, true, 2, nuit); return !b.ok && b.message.includes("2 couvertures"); })());
ok("plafond non regle par l'atelier : refuse (on n'invente pas de chiffre)",
   !basculerCouverture([], { style_id: "s-nuit", couverture: "n1" }, true, null, nuit).ok);
ok("ne plus aimer marche toujours, meme sans plafond",
   (() => { const b = basculerCouverture([{ style_id: "s-nuit", couverture: "n1" }], { style_id: "s-nuit", couverture: "n1" }, false, null, null); return b.ok && b.aimees.length === 0; })());
ok("une couverture qui n'existe pas dans le style est refusee",
   !basculerCouverture([], { style_id: "s-nuit", couverture: "zz" }, true, 3, nuit).ok);

titre("— valider, et jusqu'a quand —");
const vierge: BriefLigne = { style_id: null, palette_cle: null, texte: null, doubles: [], couvertures_aimees: [], brief_valide_le: null };
ok("ce qui manque se nomme : palette, typographies, texte, une double page", manquesBrief(vierge).length === 4
   && manquesBrief({ ...vierge, style_id: "s", palette_cle: "p", texte: "peu", doubles: ["aeree"] }).length === 0);
ok("le brief ne bouge plus apres la cloture", briefModifiable("preparation") && !briefModifiable("composition") && !briefModifiable("bat"));
ok("le mur d'une ecole voit les styles ecole et tous, pas entreprise",
   styleVisible("ecole", "ecole") && styleVisible("ecole", "tous") && !styleVisible("ecole", "entreprise") && styleVisible("tous", "entreprise"));

/* ═══════════════════════════ LES GARDES DANS LES FICHIERS ═══════════════════════════ */

function fichiers(dossier: string, nom: string): string[] {
  const abs = resolve(RACINE, dossier);
  if (!existsSync(abs)) return [];
  const sortie: string[] = [];
  for (const entree of readdirSync(abs)) {
    const chemin = join(abs, entree);
    if (statSync(chemin).isDirectory()) sortie.push(...fichiers(join(dossier, entree), nom));
    else if (entree === nom) sortie.push(join(dossier, entree));
  }
  return sortie;
}


/* ════════════════════════════ PHASE 5 : LE BON À TIRER ════════════════════════════ */

function fichiersParSuffixe(dossier: string, motif: RegExp): string[] {
  const abs = resolve(RACINE, dossier);
  if (!existsSync(abs)) return [];
  const sortie: string[] = [];
  for (const entree of readdirSync(abs)) {
    const chemin = join(abs, entree);
    if (statSync(chemin).isDirectory()) sortie.push(...fichiersParSuffixe(join(dossier, entree), motif));
    else if (motif.test(entree)) sortie.push(join(dossier, entree));
  }
  return sortie;
}

titre("— apparier deux tours : le texte d'abord, l'image ensuite, l'ordre toujours —");
{
  /* Des pages de texte : chacune son histoire (mots distincts). */
  const histoire = (k: number) => ["arrivee domaine matin cafe accueil", "conference directrice strategie annee chiffres", "atelier equipe jeux rires cuisine", "diner soiree musique danse lumieres", "remise prix trophees applaudissements podium"][k];
  const page = (index: number, k: number, empreinte = "0000000000000000") => ({ index, empreinte, mots: histoire(k) });
  const t1 = [page(0, 0), page(1, 1), page(2, 2), page(3, 3)];
  const insere = apparierPages(t1, [page(0, 0), page(1, 1), page(2, 4), page(3, 2), page(4, 3)]);
  ok("une page ajoutee au milieu : nouvelle, et les suivantes retrouvent leur ancienne",
     insere.apparie.get(0) === 0 && insere.apparie.get(1) === 1 && insere.apparie.get(2) === null && insere.apparie.get(3) === 2 && insere.apparie.get(4) === 3 && insere.retirees.length === 0);
  const retire = apparierPages(t1, [page(0, 0), page(1, 2), page(2, 3)]);
  ok("une page retiree : signalee, les autres appariees", retire.retirees.join() === "1" && retire.apparie.get(1) === 2);
  /* Le cas mesure le 13/10 : meme gabarit (images a 0 bit), histoires differentes. */
  const memeGabarit = apparierPages([page(0, 0), page(1, 1)], [page(0, 1), page(1, 0)]);
  ok("deux pages de meme gabarit mais d'histoires differentes ne sont pas confondues",
     memeGabarit.apparie.get(0) !== 0 && memeGabarit.apparie.get(1) !== 1);
  const photoChangee = apparierPages([page(0, 2, "0000000000000000")], [{ index: 0, empreinte: "ffffffffffffffff", mots: histoire(2) + " legende" }]);
  ok("une photo changee (image tres differente, meme texte) : la meme page, retouchee", photoChangee.apparie.get(0) === 0);
  /* Les pages sans texte : l'image decide. */
  const A = "0000000000000000", B = "ffffffff00000000";
  ok("pleine photo : une retouche de 2 bits reste la meme page", apparierPages([{ index: 0, empreinte: A }], [{ index: 0, empreinte: "0000000000000003" }]).apparie.get(0) === 0);
  ok(`pleine photo : au-dela de ${PLAFOND_EMPREINTE} bits, une autre page`, apparierPages([{ index: 0, empreinte: A }], [{ index: 0, empreinte: B }]).apparie.get(0) === null);
  const unique = apparierPages([{ index: 0, empreinte: A }], [{ index: 0, empreinte: A }, { index: 1, empreinte: A }]);
  ok("une ancienne n'est reprise qu'une fois", [unique.apparie.get(0), unique.apparie.get(1)].filter((x) => x === 0).length === 1);
  ok("une page sans empreinte ni texte n'est jamais appariee", apparierPages([{ index: 0, empreinte: null }], [{ index: 0, empreinte: null }]).apparie.get(0) === null);
  ok("les mots : minuscules, sans accent ni chiffre, trois lettres au moins, une fois chacun",
     motsDePage("Été 2026 : le Séminaire, l'été !").join(" ") === "ete seminaire");
  ok("les mots communs a plus de la moitie des pages (titre courant) sont retires",
     motsUtiles([["seminaire", "arrivee"], ["seminaire", "diner"], ["seminaire", "prix"], ["seminaire", "danse"]]).join("|") === "arrivee|diner|prix|danse");
  ok("le cout d'une paire : texte partage = bon marche, rien en commun = impossible",
     coutPaire({ empreinte: A, mots: new Set(["a1", "b1", "c1", "d1", "e1"]) }, { empreinte: B, mots: new Set(["a1", "b1", "c1", "d1", "e1"]) }) === 0 &&
     coutPaire({ empreinte: A, mots: new Set(["a1", "b1", "c1", "d1", "e1"]) }, { empreinte: A, mots: new Set(["v1", "w1", "x1", "y1", "z1"]) }) === Infinity);
}

titre("— les zones modifiees, en pourcentages —");
{
  const l = 40, h = 40;
  const fond = () => new Uint8Array(l * h).fill(200);
  const a = fond();
  ok("deux pages identiques : aucune zone", zonesModifiees(a, fond(), l, h).length === 0);
  const bruit = fond();
  for (let k = 0; k < bruit.length; k += 3) bruit[k] = 210;
  ok("le bruit de recompression reste sous le seuil", zonesModifiees(a, bruit, l, h).length === 0);
  const b = fond();
  for (let y = 8; y < 16; y++) for (let x = 0; x < 16; x++) b[y * l + x] = 20;
  const z = zonesModifiees(a, b, l, h);
  ok("un bloc change : une zone, au bon endroit", z.length === 1 && z[0].x === 0 && z[0].y === 20 && z[0].l === 40 && z[0].h === 20);
  for (let y = 32; y < 40; y++) for (let x = 32; x < 40; x++) b[y * l + x] = 20;
  ok("deux blocs separes : deux zones", zonesModifiees(a, b, l, h).length === 2);
  const ligne = fond();
  for (let x = 20; x < 30; x++) ligne[30 * l + x] = 0;
  ok("une seule ligne de pixels franchement changee (un mot) : une zone, malgre une moyenne faible", zonesModifiees(a, ligne, l, h).length === 1);
  const unPixel = fond();
  unPixel[5 * l + 5] = 0;
  ok("un pixel isole ne fait pas une zone", zonesModifiees(a, unPixel, l, h).length === 0);
  let leve = false;
  try {
    zonesModifiees(a, new Uint8Array(10), l, h);
  } catch {
    leve = true;
  }
  ok("des tailles differentes levent (on ne compare jamais faux)", leve);
}

titre("— les doubles pages : la premiere seule, a droite —");
ok("0 page : rien", doublesPages(0).length === 0);
ok("1 page : [0]", JSON.stringify(doublesPages(1)) === "[[0]]");
ok("4 pages : [0] [1,2] [3]", JSON.stringify(doublesPages(4)) === "[[0],[1,2],[3]]");
ok("5 pages : [0] [1,2] [3,4]", JSON.stringify(doublesPages(5)) === "[[0],[1,2],[3,4]]");
ok("libelles : « Page 1 », « Pages 2 et 3 »", libelleDouble([0]) === "Page 1" && libelleDouble([1, 2]) === "Pages 2 et 3");

titre("— rogner au format fini (TrimBox) —");
{
  const r = rectRognage([0, 0, 624, 876], { x: 12, y: 12, width: 600, height: 852 }, 2);
  ok("fond perdu de 12 pt retire des quatre cotes", r.sx === 24 && r.sy === 24 && r.sl === 1200 && r.sh === 1704);
  const sans = rectRognage([0, 0, 600, 800], null, 1);
  ok("sans TrimBox : la page entiere", sans.sx === 0 && sans.sy === 0 && sans.sl === 600 && sans.sh === 800);
  const decale = rectRognage([10, 20, 610, 820], { x: 10, y: 20, width: 600, height: 800 }, 1);
  ok("une vue qui ne part pas de 0 : rien a rogner quand trim = vue", decale.sx === 0 && decale.sy === 0 && decale.sl === 600 && decale.sh === 800);
}

titre("— une note : chaque type dit ce qu'il exige —");
ok("type inconnu : refuse", !lireNote({ type: "autre", contenu: {} }, 10).ok);
ok("corriger un texte sans rien dire : refuse", !lireNote({ type: "texte", contenu: {}, page_index: 0 }, 10).ok);
ok("corriger un texte avec le remplacement seul : accepte", lireNote({ type: "texte", contenu: { remplacement: "Jour 1" }, page_index: 0 }, 10).ok);
ok("changer une photo sans photo ni description : refuse", !lireNote({ type: "photo", contenu: {}, page_index: 0 }, 10).ok);
ok("une idee vide : refusee", !lireNote({ type: "idee", contenu: { texte: "   " } }, 10).ok);
ok("retirer sans raison : accepte (la raison est facultative)", lireNote({ type: "retirer", contenu: {}, page_index: 2, x_pct: 10, y_pct: 10 }, 10).ok);
ok("page hors du tour : refusee", !lireNote({ type: "retirer", contenu: {}, page_index: 10 }, 10).ok);
{
  const g = lireNote({ type: "idee", contenu: { texte: "Plus de photos de groupe" }, x_pct: 50 }, 10);
  ok("une note generale n'a pas de position", g.ok && g.note.page_index === null && g.note.x_pct === null && g.note.y_pct === null);
  const c = lireNote({ type: "retirer", contenu: { raison: "x", inconnu: "y" }, page_index: 1, x_pct: 140, y_pct: -3 }, 10);
  ok("la position est bornee a la page, les champs inconnus sont ignores",
     c.ok && c.note.x_pct === 100 && c.note.y_pct === 0 && !("inconnu" in c.note.contenu));
}
ok("etat d'une note : brouillon, a traiter, resolue, retiree",
   etatNote({ envoyee_le: null, resolue_le: null, retiree_le: null }) === "brouillon" &&
   etatNote({ envoyee_le: "x", resolue_le: null, retiree_le: null }) === "a_traiter" &&
   etatNote({ envoyee_le: "x", resolue_le: "y", retiree_le: null }) === "resolue" &&
   etatNote({ envoyee_le: null, resolue_le: null, retiree_le: "z" }) === "retiree");
ok("la note se resume en une phrase", resumeNote("texte", { cible: "Jour un", remplacement: "Jour 1" }) === "« Jour un » devient « Jour 1 »" && resumeNote("retirer", {}) === "Retirer cet élément");

titre("— la phrase de validation : le tirage de la fiche, jamais devine —");
ok("avec un tirage : le nombre est dit", texteValidationBat(120).includes("120 exemplaires"));
ok("sans tirage : aucun chiffre invente", !/\d/.test(texteValidationBat(null)));

titre("— revision 14.4 : la bande, le rappel avant de valider —");
ok("bande : « 1 » pour la page seule, « 2–3 » pour une double", libelleBande([0]) === "1" && libelleBande([1, 2]) === "2–3");
{
  const r = rappelValidation(120, 2, { sansPreference: false, rang: 3 });
  ok("rappel : le tour, la proposition retenue, le tirage", r.resume === "Tour 2 · couverture : la proposition 3." && r.tirage.includes("120 exemplaires"));
  ok("rappel : « sans préférence » le dit", rappelValidation(null, 1, { sansPreference: true, rang: null }).resume === "Tour 1 · couverture : sans préférence, l'atelier choisit.");
  const vide = rappelValidation(null, 1, { sansPreference: false, rang: null });
  ok("rappel : aucune couverture choisie = rien d'affirme, aucun tirage invente", vide.resume === "Tour 1." && !/\d/.test(vide.tirage));
}
const liseuse = lire("src/app/edition/[token]/bat/Liseuse.tsx");
ok("BAT plein ecran : plus de bouton « Plein écran », ni d'appel « en appel »", !/Plein écran|en appel/.test(liseuse));
ok("BAT : l'onglet vertical des notes et la note DANS le panneau", liseuse.includes("ec-bat-onglet-notes") && /<aside[^>]*ec-bat-panneau/.test(liseuse) && liseuse.includes("<NoteEnCours"));
ok("BAT : les magazines en onglets SOUS la bande", liseuse.indexOf('className="ec-bat-bande"') < liseuse.indexOf("{onglets}", liseuse.indexOf('className="ec-bat-bande"')));
const batCss = lire("src/app/edition/[token]/bat/bat.css");
ok("BAT : la page suit la scene (unites de conteneur), aucun plafond en px", batCss.includes("container-type: size") && /max-height: 100cqh/.test(batCss) && !/max-height: 520px/.test(batCss));

titre("— les gris d'un tour : un format a nous, relu sans confiance —");
{
  const p1 = new Uint8Array(GRIS_L * GRIS_H).fill(7);
  const p2 = new Uint8Array(GRIS_L * GRIS_H).fill(9);
  const lu = decoderGris(encoderGris([p1, p2]));
  ok("aller-retour sans perte", lu !== null && lu.pages.length === 2 && lu.pages[1][5] === 9 && lu.l === GRIS_L && lu.h === GRIS_H);
  ok("un fichier tronque ou etranger est refuse", decoderGris(encoderGris([p1]).slice(0, 50)) === null && decoderGris(new Uint8Array([1, 2, 3])) === null);
}

titre("— les pages d'un tour : le serveur recalcule chaque cle —");
{
  const ED = "11111111-1111-4111-8111-111111111111", TO = "22222222-2222-4222-8222-222222222222";
  const cles = { page: (i: number, e: "webp" | "jpg") => clePageTour(ED, TO, i, e), vignette: (i: number, e: "webp" | "jpg") => cleVignettePageTour(ED, TO, i, e) };
  const page = (i: number, extra: Record<string, unknown> = {}) => ({ index: i, image_key: clePageTour(ED, TO, i, "webp"), vignette_key: cleVignettePageTour(ED, TO, i, "webp"), empreinte: "0123456789abcdef", apparie_a: null, zones: [], ...extra });
  ok("trois pages bien formees : acceptees", lirePagesTour([page(0), page(1), page(2)], cles, null).ok);
  ok("une cle qui pointe ailleurs : refusee", !lirePagesTour([{ ...page(0), image_key: clePageTour(ED, "33333333-3333-4333-8333-333333333333", 0, "webp") }], cles, null).ok);
  ok("une vignette qui pointe ailleurs : refusee", !lirePagesTour([{ ...page(0), vignette_key: clePageTour(ED, TO, 0, "webp") }], cles, null).ok);
  ok("des index qui ne se suivent pas : refuses", !lirePagesTour([page(0), page(2)], cles, null).ok);
  ok("un appariement sans tour precedent : refuse", !lirePagesTour([page(0, { apparie_a: 0 })], cles, null).ok);
  ok("une ancienne page reprise deux fois : refusee", !lirePagesTour([page(0, { apparie_a: 0 }), page(1, { apparie_a: 0 })], cles, 3).ok);
  ok("une ancienne page qui n'existe pas : refusee", !lirePagesTour([page(0, { apparie_a: 7 })], cles, 3).ok);
  ok(`plus de ${MAX_PAGES_TOUR} pages : refuse`, !lirePagesTour(Array.from({ length: MAX_PAGES_TOUR + 1 }, (_, i) => page(i)), cles, null).ok);
  const z = lirePagesTour([page(0, { apparie_a: 1, zones: [{ x: -5, y: 10, l: 150, h: 20 }, { x: "a", y: 0, l: 1, h: 1 }] })], cles, 2);
  ok("les zones sont bornees, une zone illisible est ecartee", z.ok && z.pages[0].zones.length === 1 && z.pages[0].zones[0].x === 0 && z.pages[0].zones[0].l === 100);
  const n = lirePagesTour([page(0, { zones: [{ x: 1, y: 1, l: 1, h: 1 }] })], cles, 2);
  ok("une nouvelle page n'a pas de zones (rien a comparer)", n.ok && n.pages[0].zones.length === 0);
  const r = resumeTour([{ apparie_a: 0, zones: [{ x: 0, y: 0, l: 1, h: 1 }] }, { apparie_a: null, zones: [] }, { apparie_a: 2, zones: [] }], 4);
  ok("le resume du tour : modifiees, nouvelles, retirees", r.modifiees === 1 && r.nouvelles === 1 && r.retirees.join() === "1,3");
  ok("le premier tour n'a rien a resumer", resumeTour([{ apparie_a: null, zones: [] }], null).nouvelles === 0);
}

titre("— le tour courant, publier, la couverture —");
ok("le tour courant est le dernier PUBLIE (un brouillon ne compte pas)",
   tourCourant([{ numero: 1, publie_le: "a" }, { numero: 2, publie_le: "b" }, { numero: 3, publie_le: null }])?.numero === 2);
{
  const futur = new Date("2026-10-20T10:00:00Z").toISOString();
  const maintenant = new Date("2026-10-13T10:00:00Z");
  const complet = { pdf_key: "k", nb_pages: 24, pages: [1], echeance_retours: futur };
  const couv = (rang: number) => ({ rang, image_key: "a", interieur2_key: "b", interieur3_key: "c" });
  ok("tour 2 complet : publiable sans couverture", manquesPourPublierTour(complet, false, [], null, maintenant).length === 0);
  ok("tour 1 sans nombre de propositions regle : refuse (on ne devine pas « 3 »)", manquesPourPublierTour(complet, true, [couv(1)], null, maintenant).some((m) => m.includes("nombre de propositions")));
  ok("tour 1 avec le bon nombre de propositions completes : publiable", manquesPourPublierTour(complet, true, [couv(1), couv(2)], 2, maintenant).length === 0);
  ok("une proposition sans sa 3e de couverture : refusee", manquesPourPublierTour(complet, true, [{ ...couv(1), interieur3_key: null }], 1, maintenant).some((m) => m.includes("3e")));
  ok("sans echeance, ou une echeance passee : refuse",
     manquesPourPublierTour({ ...complet, echeance_retours: null }, false, [], null, maintenant).length === 1 &&
     manquesPourPublierTour({ ...complet, echeance_retours: "2026-10-01T00:00:00Z" }, false, [], null, maintenant).length === 1);
  ok("sans PDF rendu : refuse", manquesPourPublierTour({ ...complet, pdf_key: null }, false, [], null, maintenant).length === 1);
}
ok("choisir une proposition du magazine, ou « sans preference »",
   lireChoixCouverture({ couvertureId: "p1" }, [{ id: "p1" }]).ok &&
   !lireChoixCouverture({ couvertureId: "p9" }, [{ id: "p1" }]).ok &&
   (() => {
     const r = lireChoixCouverture({ sans_preference: true }, []);
     return r.ok && r.patch.couverture_sans_preference && r.patch.couverture_choisie_id === null;
   })());

titre("— le PDF source et les gris ne sortent jamais vers le client —");
{
  const ED = "11111111-1111-4111-8111-111111111111", TO = "22222222-2222-4222-8222-222222222222";
  ok("les gris et les vignettes de pages sont sous collectif/", estCleCollectif(cleGrisTour(ED, TO)) && estCleCollectif(cleVignettePageTour(ED, TO, 3, "jpg")));
  let leve = false;
  try {
    cleGrisTour(ED, "../numeros");
  } catch {
    leve = true;
  }
  ok("un id de tour qui n'est pas un uuid est refuse", leve);
  const client = [...fichiersParSuffixe("src/app/edition", /\.tsx?$/), ...fichiers("src/app/api/collectif", "route.ts")];
  ok(`aucun fichier client ou route publique (${client.length}) ne lit pdf_key, clePdfTour ou cleGrisTour`,
     client.every((f) => !/\b(pdf_key|clePdfTour|cleGrisTour)\b/.test(lire(f))));
  ok("le lecteur client ne lit que les tours PUBLIES",
     /\.filter\(\(t\) => t\.publie_le\)/.test(lire("src/app/edition/[token]/donnees.ts")));
}

titre("— le journal du bon a tirer se lit en francais, sans token —");
ok("tour publie, notes envoyees, BAT valide",
   phraseEvenement("tour_publie", { magazine: 1, tour: 2, par: "mathias" }).includes("tour 2 publié") &&
   phraseEvenement("notes_envoyees", { magazine: 1, n: 3 }).includes("3 note") &&
   phraseEvenement("bat_valide", { magazine: 2 }).includes("VALIDÉ"));


/* ════════════════════════════ PHASE 6 : L'ATELIER ET LA LIVRAISON ════════════════════════════ */

titre("— demander une modification : un motif, des mots, jusqu'a la validation —");
ok("cinq motifs, ceux de la maquette", MOTIFS_MODIFICATION.length === 5 && MOTIFS_MODIFICATION.some((m) => m.cle === "autre"));
ok("sans motif : refuse", !lireDemande({ texte: "x" }).ok);
ok("« Autre chose » sans un mot : refuse", !lireDemande({ motif: "autre", texte: "  " }).ok);
{
  const d = lireDemande({ motif: "pages", texte: "  huit pages pour la soiree  " });
  ok("un motif et un texte : acceptes, le texte nettoye", d.ok && d.texte === "huit pages pour la soiree" && d.libelle === "Ajouter des pages");
  ok("le message dit le motif puis le texte", d.ok && messageDemande(d) === "Demande de modification · Ajouter des pages\nhuit pages pour la soiree");
}
ok("possible jusqu'au bon a tirer, plus apres",
   (["preparation", "composition", "bat"] as EtatEdition[]).every(demandePossible) &&
   !(["bat_valide", "impression", "expediee", "livree"] as EtatEdition[]).some(demandePossible));
ok("accepter ou reparler d'une proposition : un message sans montant",
   messageProposition("accepter", "8 pages en plus") === "J'accepte la proposition complémentaire « 8 pages en plus »." &&
   messageProposition("reparler", "x").startsWith("Je souhaite reparler"));
ok("aucun montant ecrit dans la phase 6 (le document vient de l'atelier)",
   ["src/lib/collectif/livraison.ts", "src/app/api/collectif/proposition/route.ts", "src/app/api/collectif/modification/route.ts", "src/app/edition/[token]/atelier/Propositions.tsx"].every((f) => !/€/.test(lire(f))));

titre("— la livraison : un jour du calendrier, des etapes posees par l'atelier —");
ok("un jour qui existe", estJour("2026-10-29") && !estJour("2026-06-31") && !estJour("29/10/2026") && !estJour(null));
ok("le jour se lit sans fuseau", formaterJour("2026-10-29") === "jeudi 29 octobre 2026" && formaterJour("x") === "");
{
  const s1 = lireSaisieLivraison({ adresse: "  Maison Essai\r\n12 rue du Port  ", prevue_le: "" });
  ok("l'adresse garde ses lignes, un jour vide reste vide", s1.ok && s1.adresse === "Maison Essai\n12 rue du Port" && s1.prevue_le === null);
  ok("un jour illisible : refuse", !lireSaisieLivraison({ prevue_le: "2026-13-01" }).ok);
}
{
  const e = etapesLivraison("impression", { bat_valide: "21 octobre", impression: "22 octobre", expediee: "x" });
  ok("a l'impression : BAT fait, impression en cours, le reste a venir",
     e[0].faite && !e[0].courante && e[1].courante && !e[2].faite && !e[3].faite);
  ok("une date ne s'affiche que pour une etape atteinte", e[0].quand === "21 octobre" && e[2].quand === null);
  const l = etapesLivraison("livree", {});
  ok("livree : tout est fait, la derniere est la courante", l.every((x) => x.faite) && l[3].courante && l.filter((x) => x.courante).length === 1);
}
ok("le titre suit l'etape", titreLivraison("bat_valide").includes("validé") && titreLivraison("expediee") === "Votre magazine arrive." && titreLivraison("livree").includes("arrivé"));
ok("le journal de la phase 6 se lit en francais",
   phraseEvenement("modification_demandee", { motif: "Ajouter des pages" }).includes("Ajouter des pages") &&
   phraseEvenement("proposition_acceptee", { libelle: "Option" }).includes("acceptée"));


/* ════════════════════════════ RÉVISION DU 13/10 : LA COQUILLE ════════════════════════════ */

titre("— jour / nuit : une preference de l'appareil, jamais une donnee —");
ok("deux modes, la nuit par defaut, toute valeur inconnue vaut nuit",
   MODES.join() === "nuit,jour" && lireMode(undefined) === "nuit" && lireMode("jour") === "jour" && lireMode("JOUR") === "nuit" && lireMode("<script>") === "nuit");
ok("le cookie vit un an, sur l'espace seulement", cookieMode("jour") === "bj_ec_mode=jour; path=/edition; max-age=31536000; samesite=lax");
ok("le logo suit le mode, et les deux fichiers existent",
   LOGO_MODE.nuit.includes("blanc") && LOGO_MODE.jour.includes("bleu") &&
   Object.values(LOGO_MODE).every((f) => existsSync(resolve(RACINE, "public" + f))));
{
  /* Aucune couleur écrite en dur hors des blocs de jetons : un composant écrit
     un RÔLE (`--ec-text`, `rgba(var(--ec-fg-rgb), x)`), jamais une teinte.
     bat.css garde les vraies couleurs des pages de magazine, en jetons
     `--ec-page` / `--ec-encre` : il est vérifié de la même façon. */
  const sansJetons = (css: string) =>
    css
      .replace(/\/\*[\s\S]*?\*\//g, "")
      .replace(/\.bj-atelier\.ec-espace(\[data-ec-mode="jour"\])?\s*\{[^}]*\}/g, "");
  const feuilles = fichiersParSuffixe("src/app/edition/[token]", /\.css$/);
  const fautives = feuilles.filter((f) => /#[0-9a-fA-F]{3,8}\b|rgba?\(\s*\d/.test(sansJetons(lire(f))));
  ok(`aucune couleur en dur dans les feuilles de l'espace (${feuilles.length} feuilles${fautives.length ? " ; en faute : " + fautives.join(", ") : ""})`, fautives.length === 0);
  const composants = fichiersParSuffixe("src/app/edition", /\.tsx$/);
  ok("aucune couleur en dur dans les composants de l'espace", composants.every((f) => !/["'`]#[0-9a-fA-F]{3,8}["'`]/.test(lire(f))));
  ok("la pastille des non-lus est sur « Parler à l'atelier »", /e\.cle === "atelier" && nonLus > 0/.test(lire("src/app/edition/[token]/Coquille.tsx")));
  ok("le mode n'utilise pas data-theme (systeme mort, src/app/CLAUDE.md)", !/data-theme/.test(lire("src/app/edition/_composants/RacineEspace.tsx") + lire("src/app/edition/[token]/espace.css")));
}


/* ════════════════════════════ RÉVISION : LE TABLEAU DE BORD ════════════════════════════ */

titre("— la migration de la revision : des colonnes, un repli a la lecture, un 503 a l'ecriture —");
{
  const sql = lire(MIGRATION_REVISION);
  ok("ecrite, atomique, idempotente", /^begin;/m.test(sql) && /^commit;/m.test(sql) && (sql.match(/add column if not exists/g) ?? []).length === 4);
  ok("le plafond d'un lien, le document cite, la piece jointe",
     /collectif_provenances[\s\S]*plafond_par_personne integer/.test(sql) && /document_id uuid[\s\S]*references public\.collectif_documents\(id\) on delete set null/.test(sql) && /piece_jointe_key text/.test(sql) && /piece_jointe_nom text/.test(sql));
  ok("aucune table du B2C touchee", !/\b(numeros|photos|evenements|mails_envoyes)\b(?!_)/.test(sql.replace(/collectif_\w+/g, "").replace(/--.*$/gm, "")));
  ok("colonne absente : 42703 a la lecture, PGRST204 a l'ecriture, rien d'autre",
     colonneAbsente("42703") && colonneAbsente("PGRST204") && !colonneAbsente("42P01") && !colonneAbsente(null));
}

titre("— chaque lien de contribution porte son plafond —");
{
  const ed = { plafond_participant_atelier: 40, plafond_participant_client: null, plafond_total: 1000 };
  ok("le curseur va de 5 a 100, ou jusqu'au plafond de l'atelier", CURSEUR_LIEN.min === 5 && plafondLienMax({ plafond_participant_atelier: null }) === 100 && plafondLienMax(ed) === 40 && plafondLienMax({ plafond_participant_atelier: 300 }) === 100);
  const l = lirePlafondLien({ plafond: 30 }, ed);
  ok("30 photos par personne : accepte", l.ok && l.plafond_par_personne === 30 && !l.sans_plafond);
  ok("au-dela du plafond de l'atelier : refuse, la phrase le dit", (() => { const r = lirePlafondLien({ plafond: 50 }, ed); return !r.ok && r.message.includes("40"); })());
  ok("« Sans limite » : sans plafond par personne", (() => { const r = lirePlafondLien({ sansPlafond: true, plafond: 9999 }, ed); return r.ok && r.sans_plafond && r.plafond_par_personne === null; })());
  ok("ni nombre ni « Sans limite » : refuse", !lirePlafondLien({}, ed).ok && !lirePlafondLien({ plafond: "trente" }, ed).ok && !lirePlafondLien({ plafond: 0 }, ed).ok);
  ok("le libelle d'un lien, et d'un lien d'avant la revision (regle de l'edition)",
     libellePlafondLien({ sans_plafond: false, plafond_par_personne: 30 }, ed) === "30 photos par personne" &&
     libellePlafondLien({ sans_plafond: true, plafond_par_personne: null }, ed) === "Sans limite" &&
     libellePlafondLien({ sans_plafond: false, plafond_par_personne: null }, ed) === "40 photos par personne");
  const place = placeRestante(ed, { role: "participant", sansPlafond: false, plafondLien: 10, dejaParAppareil: 7 }, 100);
  ok("le plafond du lien remplace celui de l'edition pour la place restante", !place.illimitee && place.place === 3 && place.borne === "plafond_participant");
  const sansLien = placeRestante(ed, { role: "participant", sansPlafond: false, dejaParAppareil: 7 }, 100);
  ok("sans lien : la regle de l'edition, comme avant", !sansLien.illimitee && sansLien.place === 33);
  const plein = placeRestante(ed, { role: "participant", sansPlafond: false, plafondLien: 10, dejaParAppareil: 0 }, 995);
  ok("le plafond total compte toujours tout", !plein.illimitee && plein.place === 5 && plein.borne === "plafond_total");
  ok("la route des liens lit le plafond par la regle pure, et nomme la colonne seulement s'il y en a un",
     /lirePlafondLien\(/.test(lire("src/app/api/collectif/provenances/route.ts")) && /plafond_par_personne !== null\) ligne\.plafond_par_personne/.test(lire("src/app/api/collectif/provenances/route.ts")));
  ok("la declaration des photos se replie sans la colonne", /colonneAbsente\(lu\.error\.code\)/.test(lire("src/app/api/collectif/depot/presign/route.ts")));
}

titre("— le QR code d'un lien : un objet imprime —");
{
  const url = "https://bellajour.fr/depot/AbCdEfGhIjKlMnOpQrStUvWxYz012345?p=AbCdEfGhIjKlMnOpQrStUv";
  const m = matriceQr(url);
  ok("une matrice carree, assez grande pour ce lien", m.length >= 25 && m.every((l) => l.length === m.length));
  const { cote } = cheminQr(m);
  ok("une marge de quatre modules", cote === m.length + 8);
  ok("le fichier telechargeable est fonce sur clair", /fill="#ffffff"/.test(svgQr(url)) && /fill="#050505"/.test(svgQr(url)));
  ok("le meme lien donne le meme QR", JSON.stringify(matriceQr(url)) === JSON.stringify(m));
}

titre("— a envoyer a l'atelier : un fichier, ou des reponses —");
{
  ok("cinq contenus, le mot du dirigeant en questionnaire", CONTENUS_CLIENT.length === 5 && contenuClient("mot")?.mode === "questionnaire" && contenuClient("inconnu") === null);
  ok("quatre questions, a relire par Mathias (PRD §12.14)", QUESTIONS_MOT.length === 4);
  const logo = contenuClient("logo")!;
  ok("un logo en SVG : accepte, ecrit en image/svg+xml", (() => { const r = lireFichierContenu(logo, "logo.SVG", 2000); return r.ok && r.extension === "svg" && r.type === "image/svg+xml"; })());
  ok("une extension inattendue : refusee", !lireFichierContenu(logo, "logo.exe", 2000).ok && !lireFichierContenu(logo, "logo", 2000).ok);
  ok("vide ou au-dela de 4 Mo : refuse", !lireFichierContenu(logo, "a.png", 0).ok && !lireFichierContenu(logo, "a.png", 5 * 1024 * 1024).ok);
  ok("un questionnaire n'accepte pas de fichier", !lireFichierContenu(contenuClient("mot")!, "a.pdf", 10).ok);
  const rep = lireReponsesMot(["  Une belle annee  ", "", 42]);
  ok("les reponses : au moins une, nettoyees, cle = la question", rep.ok && Object.keys(rep.reponses).length === 1 && rep.reponses[QUESTIONS_MOT[0]] === "Une belle annee");
  ok("aucune reponse : refuse", !lireReponsesMot(["", " "]).ok && !lireReponsesMot(null).ok);
  const route = lire("src/app/api/collectif/contenus/route.ts");
  ok("la route des contenus : responsable seulement, contenu demande par la fiche, token dans le corps",
     /peut\(acces\.role, "envoyer_contenu"\)/.test(route) && /contenus_demandes/.test(route) && !/searchParams/.test(route));
}

titre("— chaque porte du B2B lit l'interrupteur —");
const layouts = ["src/app/edition/layout.tsx", "src/app/depot/layout.tsx", "src/app/admin/collectif/layout.tsx"];
ok("les trois layouts existent et appellent collectifOuvert() puis notFound()",
   layouts.every((f) => existsSync(resolve(RACINE, f)) && /collectifOuvert\(\)/.test(lire(f)) && /notFound\(\)/.test(lire(f))));
const routes = [...fichiers("src/app/api/collectif", "route.ts"), ...fichiers("src/app/api/admin/collectif", "route.ts")];
ok(`chaque route collectif (${routes.length}) lit l'interrupteur`,
   routes.every((f) => /collectifOuvert\(\)/.test(lire(f))));
const ECRITURE = /export\s+(async\s+)?function\s+(POST|PUT|PATCH|DELETE)\b/;
/* Une seule route publique SANS token : « Retrouver mon espace » (T-154). Elle a ses
   propres controles plus bas (reponse identique, mails apres la reponse, frein). */
const SANS_TOKEN = ["src/app/api/collectif/retrouver/route.ts"];
const avecToken = fichiers("src/app/api/collectif", "route.ts").filter((f) => !SANS_TOKEN.some((x) => f.endsWith(x)));
ok("chaque route publique lit le token par chargerAcces (forme, porte, archive)",
   avecToken.every((f) => /chargerAcces(Depot)?\(/.test(lire(f))));
ok("chaque route publique qui ECRIT demande peut(role, action) avant d'agir",
   avecToken.filter((f) => ECRITURE.test(lire(f))).every((f) => /\bpeut\(/.test(lire(f))));
ok("une SEULE route publique sans token, et c'est « Retrouver mon espace »",
   fichiers("src/app/api/collectif", "route.ts").length - avecToken.length === SANS_TOKEN.length);
ok("chaque route admin revérifie l'admin (defense en profondeur)",
   fichiers("src/app/api/admin/collectif", "route.ts").every((f) => /quiEstConnecteRequete\(/.test(lire(f))));

titre("— le B2B n'ecrit jamais dans les tables du B2C —");
const libCollectif = readdirSync(resolve(RACINE, "src/lib/collectif")).filter((f) => f.endsWith(".ts"));
const interdits = /@\/lib\/atelier\/(evenements|mails|paiement|cloudprinter|apercu)["']/;
ok("aucun module de src/lib/collectif n'importe un module B2C qui ecrit dans numeros/photos/evenements",
   libCollectif.every((f) => !interdits.test(lire(`src/lib/collectif/${f}`))));
ok("de l'enrichissement B2C, seul le COEUR sans table est importe (jamais enrichirPhotos ni geocoderNumero)",
   libCollectif.every((f) => !/\b(enrichirPhotos|geocoderNumero|enrichirDossier|logEvenement|envoyerMailAtelier)\b/.test(lire(`src/lib/collectif/${f}`).replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, ""))));
ok("aucun module de src/lib/collectif ne nomme une table du B2C",
   libCollectif.every((f) => !/from\(["'](numeros|photos|evenements|mails_envoyes)["']\)/.test(lire(`src/lib/collectif/${f}`))));

titre("— revision 14.5 : parler a l'atelier, documents —");
{
  ok("piece jointe : un PDF de 1 Mo passe", lirePieceJointe("Programme.pdf", 1_000_000).ok);
  const exe = lirePieceJointe("outil.exe", 1000);
  ok("piece jointe : un executable est refuse, par son extension", !exe.ok);
  ok("piece jointe : au-dela de 4 Mo, refusee", !lirePieceJointe("photo.jpg", PIECE_MAX + 1).ok && lirePieceJointe("photo.jpg", PIECE_MAX).ok);
  ok("piece jointe : un fichier vide est refuse", !lirePieceJointe("vide.pdf", 0).ok);
  const seul = texteDuMessage("  ", "Programme.pdf");
  ok("un fichier envoye seul prend « Fichier joint : nom » (le texte reste obligatoire en base)", seul.ok && seul.texte === "Fichier joint : Programme.pdf");
  ok("sans fichier, un message vide reste refuse", !texteDuMessage("", null).ok);
  const d = messageDemande({ libelle: "Ajouter des pages", texte: "8 pages pour la soiree" });
  const lue = lireMessageDemande(d);
  ok("une demande se relit en carte : motif et precision", lue?.motif === "Ajouter des pages" && lue.precision === "8 pages pour la soiree");
  ok("une phrase qui imite une demande sans motif connu reste un message", lireMessageDemande("Demande de modification · n'importe quoi") === null);
  const m = (id: string, auteur: "client" | "atelier", texte: string, created_at: string): Message => ({ id, auteur, qui: null, texte, created_at });
  const fil = [
    m("a", "atelier", "Bienvenue", "2026-10-12T08:02:00Z"),
    m("b", "client", messageDemande({ libelle: "Ajouter des pages", texte: "" }), "2026-10-14T12:20:00Z"),
    m("c", "atelier", messageDemande({ libelle: "Ajouter des pages", texte: "" }), "2026-10-14T12:30:00Z"),
  ];
  const dem = demandesDuFil(fil);
  ok("« Vos demandes » : seulement les demandes DU CLIENT", dem.length === 1 && dem[0].motif === "Ajouter des pages");
  const el = filDeConversation(fil, [{ id: "p1", quand: "2026-10-13T09:00:00Z" }], formaterJourParis);
  ok("le fil : jours, messages et proposition dans l'ordre du temps",
    el.map((e) => e.genre).join() === "jour,message,jour,proposition,jour,message,message"
    && el[0].genre === "jour" && el[0].jour === "12 octobre");
  ok("l'heure du fil : « 14 h 20 », heure de Paris", formaterHeureParis("2026-10-14T12:20:00Z") === "14 h 20");
  const ed = "11111111-2222-3333-4444-555555555555";
  ok("la piece jointe se range sous collectif/<edition>/messages/<id du message>",
    clePieceJointe(ed, "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee", "Programme final.PDF") === `collectif/${ed}/messages/aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee.pdf`);
  let refuse = false;
  try {
    clePieceJointe(ed, "../x", "a.pdf");
  } catch {
    refuse = true;
  }
  ok("un id de message hors forme est refuse par la cle", refuse);

  const envoyer = lire("src/app/api/collectif/messages/envoyer/route.ts");
  ok("envoyer : la migration est SONDEE avant d'ecrire au coffre (aucun fichier orphelin)",
    envoyer.indexOf("revisionMessagesAppliquee(") > 0 && envoyer.indexOf("revisionMessagesAppliquee(") < envoyer.indexOf("ecrireObjet("));
  ok("envoyer : 503 migration_revision_absente, jamais un message sans sa piece", /ERREUR_REVISION_ABSENTE/.test(envoyer) && /colonneAbsente\(ecrit\.code\)/.test(envoyer));
  ok("envoyer : le document cite appartient a l'edition", /\.eq\("edition_id", edition\.id\)/.test(envoyer));
  const messagerie = lire("src/lib/collectif/messagerie.ts");
  ok("le fil se replie sans les colonnes de la revision (lecture)", /colonneAbsente\(error\.code\)\) \(\{ data, error \} = await requete\(COLONNES_AVANT\)\)/.test(messagerie));
  ok("un message simple ne nomme pas les colonnes de la revision (il s'ecrit avant la migration)", /\.\.\.\(extras\.documentId \?/.test(messagerie));
  const docs = lire("src/app/edition/[token]/dossier/page.tsx");
  ok("Documents : plus de messagerie, l'encart « Nouvelle proposition » mene a Parler a l'atelier",
    !/Messagerie|useMessagerie/.test(docs) && docs.includes("Nouvelle proposition") && docs.includes("cheminSection(token, 'atelier')"));
  ok("Documents : pas de ligne « Format » inventee", !/Format/.test(docs));
  ok("Parler a l'atelier : le fil, le « + » (joindre, citer), les demandes",
    /filDeConversation/.test(lire("src/app/edition/[token]/atelier/Parler.tsx")) && /Citer un document/.test(lire("src/app/edition/[token]/atelier/Parler.tsx")));
  const restes = fichiersParSuffixe("src/app/edition", /\.tsx?$/).filter((f) => /[Vv]otre dossier|[Tt]on dossier/.test(lire(f)));
  ok(`plus aucun « votre dossier » dans l'espace client${restes.length ? ` (${restes.join(", ")})` : ""}`, restes.length === 0);
  ok("les rendez-vous affiches viennent des donnees (D23) : aucune date ni duree ecrite en dur", (() => { const t = lire("src/app/edition/[token]/atelier/Parler.tsx"); return /libelleCreneau\(r\.debut\)/.test(t) && !/\b\d{1,2} (janvier|février|mars|avril|mai|juin|juillet|août|septembre|octobre|novembre|décembre)\b/.test(t) && !/\b20 minutes\b|\b30 minutes\b/.test(t); })());
}

titre("— D24 : le brief se compose piece par piece, de n'importe quel style —");
{
  const sable = { id: "s1", publie: true, palettes: [{ cle: "sable" }, { cle: "nuit" }], couvertures: [{ cle: "c1" }], typos: { titres: "Fraunces" }, doubles: [{ type: "aeree" }, { type: "recit" }] };
  const brut = { id: "s2", publie: true, palettes: [{ cle: "noir" }], couvertures: [{ cle: "b1" }], typos: { titres: "Archivo Black" }, doubles: [{ type: "audacieuse" }, { type: "aeree" }] };
  const avant: BriefLigne = { style_id: "s1", palette_cle: "sable", texte: "peu", doubles: ["aeree"], couvertures_aimees: [{ style_id: "s2", couverture: "b1" }], brief_valide_le: "2026-10-14T10:00:00Z" };
  const c0 = compositionDu(avant);
  ok("un brief d'avant D24 se lit en entier depuis style_id (palette, typographies, doubles)",
    c0.palette?.style_id === "s1" && c0.palette.cle === "sable" && c0.typos?.style_id === "s1" && JSON.stringify(c0.doubles) === JSON.stringify([{ style_id: "s1", double: "aeree" }]) && c0.texte === "peu");
  const apres: BriefLigne = { ...avant, palette_style_id: "s2", palette_cle: "noir", typo_style_id: "s2", doubles_aimes: [{ style_id: "s1", double: "recit" }, { style_id: "s2", double: "audacieuse" }] };
  const c1 = compositionDu(apres);
  ok("les colonnes de D24 l'emportent : chaque piece garde SON style",
    c1.palette?.style_id === "s2" && c1.palette.cle === "noir" && c1.typos?.style_id === "s2" && c1.doubles.length === 2 && c1.doubles[1].style_id === "s2");
  ok("les styles de la composition, chacun une fois", JSON.stringify(stylesDeLaComposition(c1)) === JSON.stringify(["s2", "s1"]));
  ok("une double page d'un style inconnu ou d'un type inconnu est ignoree",
    compositionDu({ ...avant, doubles_aimes: [{ style_id: "s1", double: "pirate" as never }] }).doubles[0]?.double === "aeree");

  const pal = lirePiece("palette", { palette_cle: "noir" }, brut, c0);
  ok("prendre la palette d'un AUTRE style que le reste : permis (D24), brief remis a valider",
    pal.ok && pal.patch.palette_style_id === "s2" && pal.patch.palette_cle === "noir" && pal.patch.brief_valide_le === null);
  ok("une palette qui n'est pas dans ce style est refusee", !lirePiece("palette", { palette_cle: "sable" }, brut, c0).ok);
  const ty = lirePiece("typos", {}, brut, c0);
  ok("prendre les typographies d'un autre style : permis", ty.ok && ty.patch.typo_style_id === "s2");
  ok("un style sans typographies ne les donne pas", !lirePiece("typos", {}, { ...brut, typos: { titres: "" } }, c0).ok);
  const db = lirePiece("double", { double: "audacieuse" }, brut, c0);
  ok("ajouter une double page d'un autre style : elle s'ajoute, la colonne d'avant suit (les types)",
    db.ok && JSON.stringify(db.patch.doubles_aimes) === JSON.stringify([{ style_id: "s1", double: "aeree" }, { style_id: "s2", double: "audacieuse" }]) && JSON.stringify(db.patch.doubles) === JSON.stringify(["aeree", "audacieuse"]));
  ok("la meme double page de deux styles : deux pieces distinctes", (() => { const r = lirePiece("double", { double: "aeree" }, brut, c0); return r.ok && (r.patch.doubles_aimes as unknown[]).length === 2; })());
  ok("une double page absente du style est refusee", !lirePiece("double", { double: "dense" }, brut, c0).ok);
  const plein: Composition = { ...c0, doubles: ["aeree", "equilibree", "dense", "recit", "audacieuse"].map((d) => ({ style_id: "s1", double: d as "aeree" })) };
  ok("cinq doubles pages au plus, tous styles confondus", (() => { const r = lirePiece("double", { double: "aeree" }, brut, plein); return !r.ok && r.message.includes("5 doubles pages au plus"); })());
  ok("retirer une double page, meme la derniere (le brief ne se valide plus tant qu'il n'en a pas)",
    (() => { const r = lirePiece("double", { double: "aeree", ajouter: false }, sable, c0); return r.ok && (r.patch.doubles_aimes as unknown[]).length === 0 && (r.patch.doubles as unknown[]).length === 0; })());
  ok("un style retire du mur ne donne aucune piece", !lirePiece("palette", { palette_cle: "noir" }, { ...brut, publie: false }, c0).ok && !lirePiece("typos", {}, null, c0).ok);
  ok("une piece inconnue est refusee", !lirePiece("couverture", {}, brut, c0).ok);
  ok("les types d'une liste de doubles, chacun une fois, dans l'ordre des types",
    JSON.stringify(typesDes([{ style_id: "a", double: "recit" }, { style_id: "b", double: "aeree" }, { style_id: "c", double: "recit" }])) === JSON.stringify(["aeree", "recit"]));
  const tx = lireTexte({ texte: "beaucoup" });
  ok("texte : une reponse de la liste, rien d'autre", tx.ok && tx.patch.texte === "beaucoup" && !lireTexte({ texte: "roman" }).ok);

  ok("« avec vos choix » : la raison dit d'ou vient deja une autre piece de ce style",
    JSON.stringify(raisonsDuStyle(c1, "s2", "typos")) === JSON.stringify(["votre couverture", "votre palette", "vos doubles pages"]) && raisonsDuStyle(c1, "s9", "typos").length === 0);
  const pieces = [
    { genre: "typos" as const, style_id: "s1", cle: "" },
    { genre: "typos" as const, style_id: "s2", cle: "" },
    { genre: "typos" as const, style_id: "s3", cle: "" },
  ];
  const g = grouperParChoix(pieces, compositionDu({ ...avant, typo_style_id: "s1" }));
  ok("une categorie : le choix d'abord, puis ce qui va avec (la raison dite), puis le reste",
    g.choisies.map((x) => x.style_id).join() === "s1" && g.avec.map((x) => `${x.piece.style_id}:${x.raison}`).join() === "s2:Du style de votre couverture" && g.autres.map((x) => x.style_id).join() === "s3");
  const pals = [{ genre: "palette" as const, style_id: "s1", cle: "sable" }, { genre: "palette" as const, style_id: "s1", cle: "nuit" }];
  ok("une palette du meme style que le choix va « avec »", grouperParChoix(pals, c0).avec[0]?.raison === "Du même style que votre choix");

  const a = [{ style_id: "s1", couverture: "c1" }];
  ok("aimer une couverture de plus de-valide le brief", patchCouvertures([], a).brief_valide_le === null && "brief_valide_le" in patchCouvertures([], a));
  ok("un clic qui ne change rien ne de-valide rien", !("brief_valide_le" in patchCouvertures(a, [...a])));
  const noms = [{ id: "s1", nom: "Riviera", palettes: [{ cle: "sable", nom: "Sable" }] }, { id: "s2", nom: "Brut", palettes: [{ cle: "noir", nom: "Noir" }] }];
  ok("le resume dit chaque piece et son style", resumeBrief(c1, noms) === "Palette Noir, du style Brut · typographies du style Brut · 2 doubles pages · 1 couverture aimée");
  ok("le resume d'un brief vide le dit", resumeBrief(compositionDu(vierge), noms) === "Rien de composé pour l'instant.");
  ok("l'etat d'un brief dans le bandeau : valide, un style, plusieurs mêles, rien",
    etatDuBrief({ valide: true, styles: ["Riviera"] }) === "Brief validé" && etatDuBrief({ valide: false, styles: ["Riviera"] }) === "Style : Riviera" && etatDuBrief({ valide: false, styles: ["Riviera", "Brut", "Nuit"] }) === "3 styles mêlés" && etatDuBrief({ valide: false, styles: [] }) === "À composer");
  ok("le slug « brief » est reserve (la page voisine style/brief)", !lireSaisieStyle({ nom: "Brief", slug: "brief" }, "creation").ok);

  const route = lire("src/app/api/collectif/brief/route.ts");
  ok("l'API : une piece passe par lirePiece contre la composition ACTUELLE, de n'importe quel style publie",
    /lirePiece\(corps\.genre, corps, style, compositionDu\(mag\)\)/.test(route) && /lireStyle\(\{ id: corps\.styleId \}\)/.test(route));
  ok("l'API : sans la migration, une piece repond 503 nomme ; le style pris en entier s'ecrit dans les colonnes d'avant",
    /if \(!patchAvant\) return NextResponse\.json\(\{ error: ERREUR_COMPOSITION_ABSENTE/.test(route) && /update\(patchAvant\)/.test(route) && /requete|lireMag\(COLONNES_AVANT/.test(route));
  ok("aimer une couverture passe par patchCouvertures (le brief valide repasse a valider)", /patchCouvertures\(/.test(route));
  const mig = lire("supabase/migrations/20261017_collectif_composition.sql");
  ok("migration 20261017 : atomique, idempotente, trois colonnes, PostgREST relit",
    /^begin;/m.test(mig) && /^commit;/m.test(mig) && (mig.match(/add column if not exists/g) ?? []).length === 3 && /doubles_aimes jsonb not null default '\[\]'::jsonb/.test(mig) && /notify pgrst, 'reload schema'/.test(mig));
  const mur = lire("src/app/edition/[token]/style/Mur.tsx");
  ok("le mur : « Tout, en vrac », les categories rangees par les choix, « Votre composition »",
    /piecesEnVrac\(p\.styles\)/.test(mur) && /grouperParChoix\(/.test(mur) && /Votre composition/.test(mur) && /Tout, en vrac/.test(mur));
  ok("modifier une partie : un panneau lateral, le choix en haut, « Terminé »",
    /<Fenetre\s+cote/.test(mur) && /Votre choix reste en haut/.test(mur) && /Terminé/.test(mur) && /partieInitiale=\{partie\}/.test(lire("src/app/edition/[token]/style/brief/page.tsx")));
  ok("la regle du 08/10 n'est plus ecrite a l'ecran",
    !fichiersParSuffixe("src/app/edition", /\.tsx?$/).some((f) => /seule la couverture peut venir|L'intérieur suit ce style|ce style en dessine tout l/.test(lire(f))));
  const fiche = lire("src/app/edition/[token]/style/[slug]/FicheStyle.tsx");
  ok("un style en detail : la barre d'etapes et ses quatre ancres, « Prendre tout le style »", ["ec-etape-1", "ec-etape-2", "ec-etape-3", "ec-etape-4"].every((x) => fiche.includes(`"${x}"`)) && fiche.includes("ec-fiche-etapes") && /Prendre tout le style/.test(fiche));
  ok("l'atelier voit le style de chaque piece", /typos: c\.typos \?/.test(lire("src/app/admin/collectif/donnees.ts")) && /styles mêlés, à harmoniser/.test(lire("src/app/admin/collectif/[id]/page.tsx")));
  ok("un magazine compose n'est jamais « vide » (il ne se retire pas)", /stylesDeLaComposition\(compositionDu\(m\)\)\.length === 0/.test(lire("src/app/api/admin/collectif/editions/[id]/route.ts")));
}

titre("— revision 14.3 / 14.7 : photos et livraison —");
{
  const collecte = lire("src/app/edition/[token]/photos/Collecte.tsx");
  ok("Photos : le chargement par pages observe SA zone de defilement (root), nul sur telephone",
    /root: racine/.test(collecte) && /matchMedia\(REQUETE_TELEPHONE\)\.matches \? null : zone\.current/.test(collecte));
  ok("Photos : « Créer un lien » ouvre la fenetre du lien de contribution (plafond PAR LIEN), plus de formulaire « photographe » en dur",
    /<FenetreLien\b/.test(collecte) && !/type: "photographe"/.test(collecte));
  ok("Photos : le depot s'ouvre dans une fenetre en verre (celle de la coquille), sur le dossier ouvert",
    /<Fenetre titre="Déposer des photos"/.test(lire("src/app/edition/_composants/depot/FenetreEnvoi.tsx")) && /envoi\.ouvrir\?\.\(\{ dossier:/.test(collecte));
  ok("Photos (T-152, 15/10) : des rayons au-dessus des photos (plus de grande colonne), Toutes / Par jour / Doublons, la selection facultative, plus de pastilles de filtres",
    /className="ec-ph-rayons"/.test(collecte) && !/aria-label="Les dossiers"/.test(collecte) && /Par jour/.test(collecte) && /Doublons/.test(collecte) && /Ma sélection/.test(collecte) && /facultatif/.test(collecte) && !/cle: "signalees"/.test(collecte));
  const livraison = lire("src/app/edition/[token]/livraison/page.tsx");
  ok("Livraison : l'en-tete commun et « Écrire à l'atelier » vers Parler a l'atelier",
    /<EnTeteEcran titre="Livraison"/.test(livraison) && livraison.includes("cheminSection(token, 'atelier')") && !livraison.includes("cheminSection(token, 'dossier')"));
}

titre("— D23 / T-148 : les rendez-vous dans l'espace —");
{
  ok("les regles de Mathias : lundi-vendredi, 10 h a 18 h, 30 minutes", JSON.stringify(REGLES_RDV.jours) === "[1,2,3,4,5]" && REGLES_RDV.ouverture === "10:00" && REGLES_RDV.fermeture === "18:00" && REGLES_RDV.dureeMinutes === 30);
  const h = heuresDeDebut();
  ok("seize creneaux par jour : 10 h 00 ... 17 h 30", h.length === 16 && h[0] === "10:00" && h[15] === "17:30");
  ok("le samedi et le dimanche n'ont aucun creneau", creneauxDuJour("2026-10-17").length === 0 && creneauxDuJour("2026-10-18").length === 0);
  ok("10 h reste 10 h a Paris, heure d'ete (08:00Z) comme d'hiver (09:00Z)", creneauxDuJour("2026-10-23")[0].debut === "2026-10-23T08:00:00.000Z" && creneauxDuJour("2026-10-26")[0].debut === "2026-10-26T09:00:00.000Z");
  const maintenant = new Date("2026-10-14T08:20:00Z");
  const jour = creneauxDuJour("2026-10-14");
  const libres = creneauxLibres(jour, [{ debut: "2026-10-14T09:00:00Z", fin: "2026-10-14T10:00:00Z" }], maintenant);
  ok("reservable jusqu'a la demi-heure qui arrive (10 h 20 → 10 h 30 propose, 10 h 00 non)", libres[0].debut === "2026-10-14T08:30:00.000Z" && !libres.some((c) => c.debut === "2026-10-14T08:00:00.000Z"));
  ok("une plage occupee retire les creneaux qu'elle chevauche, et eux seuls", libres.length === 13 && !libres.some((c) => c.debut === "2026-10-14T09:00:00.000Z" || c.debut === "2026-10-14T09:30:00.000Z"));
  ok("bord contre bord ne chevauche pas", !chevauche({ debut: "2026-10-14T08:00:00Z", fin: "2026-10-14T08:30:00Z" }, { debut: "2026-10-14T08:30:00Z", fin: "2026-10-14T09:00:00Z" }));
  const propre = { debut: "2026-10-14T13:00:00.000Z", fin: "2026-10-14T13:30:00.000Z" };
  ok("deplacer : le rendez-vous ne se bloque pas lui-meme", creneauxLibres(jour, [propre], maintenant, propre).some((c) => c.debut === propre.debut));
  ok("un creneau demande est refait depuis les regles", lireCreneau("2026-10-14T13:30:00Z", maintenant)?.fin === "2026-10-14T14:00:00.000Z");
  ok("un creneau desaligne, passe, ou un samedi est refuse",
    lireCreneau("2026-10-14T13:15:00Z", maintenant) === null && lireCreneau("2026-10-14T08:00:00Z", maintenant) === null && lireCreneau("2026-10-17T08:00:00Z", maintenant) === null && lireCreneau("demain", maintenant) === null);
  ok("le lundi d'un dimanche est celui de la meme semaine", lundiDeSemaine(new Date("2026-10-18T20:00:00Z")) === "2026-10-12" && JSON.stringify(joursOuvres("2026-10-12")) === JSON.stringify(["2026-10-12", "2026-10-13", "2026-10-14", "2026-10-15", "2026-10-16"]));
  ok("le libelle : « mercredi 14 octobre à 15 h 30 »", libelleCreneau("2026-10-14T13:30:00Z") === "mercredi 14 octobre à 15 h 30");
  ok("le motif est facultatif et borne", lireMotif("   ") === null && (lireMotif("x".repeat(900)) ?? "").length === 500);
  ok("l'agenda : une adresse, le lien visio : https", lireReglageAgenda({ agenda_id: "mathias@gmail.com", meet_url: "https://meet.google.com/abc" }).ok && !lireReglageAgenda({ agenda_id: "mathias" }).ok && !lireReglageAgenda({ meet_url: "http://x" }).ok);

  const ics = invitationIcs({ uid: "u1@bellajour.fr", sequence: 2, debut: "2026-10-15T08:30:00Z", fin: "2026-10-15T09:00:00Z", titre: "Rendez-vous, Bellajour; essai", description: "ligne 1\nligne 2", lieu: "https://meet.google.com/abc", annule: false, maintenant });
  ok("l'invitation : CRLF, UID et SEQUENCE, dates UTC, texte echappe",
    ics.includes("\r\nUID:u1@bellajour.fr\r\n") && ics.includes("SEQUENCE:2") && ics.includes("DTSTART:20261015T083000Z") && ics.includes("SUMMARY:Rendez-vous\\, Bellajour\\; essai") && ics.includes("METHOD:PUBLISH"));
  ok("chaque ligne repliee tient en 75 octets", replier("D".repeat(10) + "é".repeat(80)).split("\r\n").every((l) => Buffer.byteLength(l, "utf8") <= 75));
  ok("une annulation est un CANCEL", invitationIcs({ uid: "u1", sequence: 3, debut: "2026-10-15T08:30:00Z", fin: "2026-10-15T09:00:00Z", titre: "t", description: "d", lieu: null, annule: true, maintenant }).includes("METHOD:CANCEL"));

  const base = { tu: false, interlocuteur: "Mathias", debut: "2026-10-15T08:30:00Z", ancienDebut: null, dureeMinutes: 30, meetUrl: "https://meet.google.com/abc", motif: "Relire le BAT", lienEspace: "https://www.bellajour.fr/edition/x/atelier" };
  const pris = mailRendezVous({ ...base, genre: "pris" });
  const deplace = mailRendezVous({ ...base, genre: "deplace", ancienDebut: "2026-10-14T13:30:00Z" });
  const annule = mailRendezVous({ ...base, genre: "annule" });
  ok("mail pris : la date, la visio, le lien de l'espace", pris.sujet.includes("jeudi 15 octobre à 10 h 30") && pris.html.includes("Rejoindre la visio") && pris.texte.includes(base.lienEspace));
  ok("mail deplace : l'ancien creneau est dit", deplace.texte.includes("mercredi 14 octobre à 15 h 30"));
  ok("mail annule : pas de bouton visio", !annule.html.includes("Rejoindre la visio") && annule.sujet.includes("annulé"));
  ok("mails : aucun tiret cadratin, le tu respecte le registre", [pris, deplace, annule].every((m) => !/—/.test(m.sujet + m.html + m.texte)) && mailRendezVous({ ...base, tu: true, genre: "pris" }).sujet.startsWith("Ton"));

  const cleFausse = "-----BEGIN PRIVATE KEY-----\\nabc\\n-----END PRIVATE KEY-----\\n";
  const json = `{"client_email":"agenda@projet.iam.gserviceaccount.com","private_key":"${cleFausse}"}`;
  ok("le compte Google se lit en JSON ou en base64, une valeur illisible n'ouvre rien",
    lireCompteAgenda(json)?.client_email === "agenda@projet.iam.gserviceaccount.com" && lireCompteAgenda(Buffer.from(json).toString("base64"))?.private_key.includes("\n") === true && lireCompteAgenda("n'importe quoi") === null && lireCompteAgenda("") === null);

  const agenda = lire("src/lib/collectif/agenda.ts").replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");
  ok("VIE PRIVEE : l'agenda n'est lu que par free/busy, jamais un evenement lu (aucun GET)", agenda.includes('"/freeBusy"') && !/method: "GET"/.test(agenda) && !/events\?|singleEvents|events\.list/.test(agenda));
  const rdv = lire("src/lib/collectif/rendezvous.ts");
  const prendreCorps = rdv.slice(rdv.indexOf("export async function prendre"), rdv.indexOf("async function lireUn"));
  ok("prendre : la regle, puis l'agenda, puis le VERROU en base, puis l'evenement Google",
    prendreCorps.indexOf("RDV_A_VENIR_MAX") < prendreCorps.indexOf("plagesOccupees(") && prendreCorps.indexOf("plagesOccupees(") < prendreCorps.indexOf(".insert(") && prendreCorps.indexOf(".insert(") < prendreCorps.indexOf("poserEvenement("));
  ok("un evenement Google rate defait la ligne (jamais un rendez-vous affiche sans agenda)", /if \(!ev\.ok\) \{[\s\S]{0,200}statut: "annule"/.test(prendreCorps));
  const mailCorps = rdv.slice(rdv.indexOf("export async function envoyerMailRdv"));
  ok("MAILS : fermes sans COLLECTIF_MAILS_RDV, coupes par ATELIER_MAILS_COUPES, verrou AVANT Brevo, retire si refus",
    mailCorps.indexOf("VAR_MAILS_RDV") < mailCorps.indexOf("fetch(") && mailCorps.indexOf("envoisCoupes(") < mailCorps.indexOf("fetch(") && mailCorps.indexOf('from("collectif_mails").insert') < mailCorps.indexOf("fetch(") && /from\("collectif_mails"\)\.delete\(\)/.test(mailCorps));
  const mig = lire("supabase/migrations/20261015_collectif_rendez_vous.sql");
  ok("la base refuse deux rendez-vous sur le meme creneau du meme interlocuteur", /create unique index if not exists collectif_rendez_vous_creneau_unique[\s\S]{0,120}\(interlocuteur_cle, debut\)[\s\S]{0,40}where statut = 'pris'/.test(mig));
  ok("migration atomique, RLS activee, aucune policy", /^begin;/m.test(mig) && /^commit;/m.test(mig) && /collectif_rendez_vous\s+enable row level security/.test(mig) && !/create policy/i.test(mig));
  ok("les creneaux ne s'ouvrent qu'au responsable (prendre_rendez_vous)", /peut\(acces\.role, "prendre_rendez_vous"\)/.test(lire("src/app/api/collectif/rendez-vous/creneaux/route.ts")) && /peut\(acces\.role, "prendre_rendez_vous"\)/.test(lire("src/app/api/collectif/rendez-vous/route.ts")));
  const fil = filDeConversation([], [], () => "j", [{ id: "r1", quand: "2026-10-14T09:00:00Z" }]);
  ok("le rendez-vous pris entre au fil", fil.some((e) => e.genre === "rendezvous"));
  ok("le journal dit les rendez-vous", phraseEvenement("rdv_pris", { par: "Camille", quand: "jeudi 15 octobre à 10 h 30", avec: "Mathias" }).includes("Mathias"));
}

titre("— retours de Mathias du 14/10 —");
{
  const parler = lire("src/app/edition/[token]/atelier/Parler.tsx");
  ok("messages : Entree envoie, Maj + Entree va a la ligne, jamais pendant une composition (IME)",
    /ev\.key === "Enter" && !ev\.shiftKey && !ev\.nativeEvent\.isComposing/.test(parler) && !/ev\.metaKey \|\| ev\.ctrlKey\)\) void soumettre/.test(parler));

  /* 7 : la présélection se marque par un BORD, et se fait ou se défait d'un geste. */
  const collecte = lire("src/app/edition/[token]/photos/Collecte.tsx");
  const css = lire("src/app/edition/[token]/espace.css");
  ok("presélection : un bord autour de la photo choisie, trace EN DEDANS (la tuile rogne sa peinture), ni case ni coche",
    /\.ec-tuile--choisie \.ec-tuile-image \{\s*outline: 3px solid var\(--ec-accent\);\s*outline-offset: -3px;/.test(css) && !/type="checkbox"/.test(collecte) && !/[✓✔]/.test(collecte));
  ok("selection : « Sélectionner tout ce dossier », « Vider la sélection » dans Ma sélection",
    /Sélectionner tout ce dossier/.test(collecte) && /Vider la sélection/.test(collecte) && /toutes: true, preselection, dossier/.test(collecte));
  const marquer = lire("src/app/api/collectif/photos/marquer/route.ts");
  ok("tout selectionner : le droit preselectionner, jamais une photo signalee, journalise",
    /corps\.toutes === true/.test(marquer) && /peut\(role, "preselectionner"\)/.test(marquer) && /if \(preselection\) requete = requete\.eq\("signalee", false\)/.test(marquer) && /"preselection_toutes" : "preselection_aucune"/.test(marquer));
  ok("le journal dit « tout selectionne » et « tout deselectionne »",
    /Tout sélectionné : 12 photo/.test(phraseEvenement("preselection_toutes", { n: 12 })) && /Tout désélectionné : 3 photo/.test(phraseEvenement("preselection_aucune", { n: 3 })));

  /* 9 et 10 : « Qui a déposé » et les liens au même endroit (l'arbre lui-même : bloc T-152). */
  const route = lire("src/app/api/collectif/photos/route.ts");
  ok("route photos : les liens ne sortent que pour qui peut en creer",
    /const partage = peut\(acces\.role, "regler_plafond_participant"\)/.test(route) && /const liens = partage \? provenances : \[\]/.test(route) && /liens: partage\s*\?/.test(route) && /arbreDesPhotos\(toutes, liens, edition, partage\)/.test(route));
  ok("Photos : les liens vivent dans l'onglet « Les liens » (un « Partager », un menu), plus de « Copier le lien » eparpilles",
    !/Copier le lien participants/.test(collecte) && /Les liens · /.test(collecte) && /Partager/.test(collecte) && /Changer le nombre de photos/.test(collecte) && /Supprimer le lien/.test(collecte) && !/Copier le lien</.test(collecte));
  ok("Photos : collecte close, ni « Déposer », ni « Créer un lien », ni « Partager » (la selection reste)",
    /envoi\.ouvrir && p\.ouverte/.test(collecte) && /onglet === "liens" && p\.ouverte/.test(collecte) && /c\.ouverte \?/.test(collecte) && /collecteOuverte\(edition\.etat, edition\.cloture_le, new Date\(\)\)/.test(lire("src/app/edition/[token]/photos/page.tsx")));
  ok("tableau de bord : ses dossiers sont le meme arbre que la page Photos, chaque ligne y mene",
    /arbreDesPhotos\(lignes, provenances, edition, false\)/.test(lire("src/app/edition/[token]/donnees.ts")) && /\?dossier=\$\{encodeURIComponent\(d\.cle\)\}/.test(lire("src/app/edition/[token]/CartePhotos.tsx")));

  /* 5 : le message de partage, écrit pour ce groupe et cet événement. */
  const base = { organisation: "Maison Aubier", evenement: "Séminaire d'automne", url: "https://bellajour.fr/depot/x?p=y", plafond: "30 photos par personne", cloture: "28 octobre", tu: false };
  const m1 = messagePartage({ ...base, groupe: "Équipe Lyon" });
  ok("partage : le groupe salue, l'organisation et l'evenement sont nommes, le plafond et la cloture precises",
    m1.texte.startsWith("Bonjour Équipe Lyon,") && m1.texte.includes("Maison Aubier prépare le magazine « Séminaire d'automne »") && m1.texte.includes("(30 par personne, jusqu'au 28 octobre)") && m1.texte.includes(base.url) && m1.objet === "Vos photos : Séminaire d'automne");
  ok("partage : un article se met en minuscule apres « Bonjour », un nom propre ne bouge pas",
    messagePartage({ ...base, groupe: "Le photographe" }).texte.startsWith("Bonjour le photographe,") && messagePartage({ ...base, groupe: "Laura" }).texte.startsWith("Bonjour Laura,"));
  const m2 = messagePartage({ ...base, groupe: null, tu: true, plafond: "Sans limite", cloture: "" });
  ok("partage : le lien general salue « a tous » et vouvoie (un groupe), meme en registre tu ; sans limite ni cloture, aucune parenthese",
    m2.texte.startsWith("Bonjour à tous,") && /vos photos/.test(m2.texte) && !/\(/.test(m2.texte) && m2.objet.startsWith("Vos photos"));
  ok("partage : un lien nomme tutoie en registre tu", /tes photos/.test(messagePartage({ ...base, groupe: "La classe de CM2", tu: true }).texte));
  ok("partage : aucun tiret cadratin", ![m1, m2].some((m) => /—/.test(m.texte + m.objet)));
  ok("partage : la fenetre montre le message a retoucher, WhatsApp, Mail, Copier le message, Telecharger le QR",
    ["export function FenetrePartage", "Copier le message", "Télécharger le QR", "WhatsApp", "export function FenetreQr"].every((t) => lire("src/app/edition/_composants/LienContribution.tsx").includes(t)));

  /* 6 et 8 : la fenêtre d'envoi se rouvre ; « déjà là » se dit. */
  const moteur = lire("src/app/edition/_composants/depot/moteur.ts");
  ok("envoi : chaque lot garde SA provenance (un second lot ne relabellise jamais le premier)",
    /provenance: this\.provenance,\n\s*\}\);/.test(moteur) && /provenance: premier\.provenance/.test(moteur) && !/provenance: this\.provenance,\n\s*fichiers/.test(moteur));
  ok("envoi : un fichier choisi deux fois est compte et dit, plus jamais saute en silence",
    /this\.dejaAjoutes\+\+/.test(moteur) && /vue\.dejaLa \+ vue\.dejaAjoutes/.test(lire("src/app/edition/_composants/depot/FenetreEnvoi.tsx")));
  const fenetre = lire("src/app/edition/_composants/depot/FenetreEnvoi.tsx");
  ok("envoi : « déjà là » est explique, « Ajouter d'autres photos » et « Réduire et continuer », le compte en grand",
    /déjà là, sautées/.test(fenetre) && /n'est jamais envoyée deux fois/.test(fenetre) && /Ajouter d&apos;autres photos/.test(fenetre) && /Réduire et continuer/.test(fenetre) && /ec-envoi-n/.test(fenetre));
  ok("envoi : la fenetre vit dans la coquille, la pastille de chaque en-tete la rouvre",
    /<HoteFenetreEnvoi \/>/.test(lire("src/app/edition/[token]/Coquille.tsx")) && /<PastilleEnvoi \/>/.test(lire("src/app/edition/_composants/Ecran.tsx")) && /onClick=\{\(\) => c\.ouvrir\(\)\}/.test(lire("src/app/edition/_composants/depot/DepotContexte.tsx")));
}

titre("— retours du 14/10 : les envois du client et les dossiers —");
{
  const collecte = lire("src/app/edition/[token]/photos/Collecte.tsx");
  const mig = lire("supabase/migrations/20261016_collectif_envois.sql");
  ok("migration 20261016 : atomique, idempotente, trois colonnes, PostgREST relit",
    /^begin;/m.test(mig) && /^commit;/m.test(mig) && (mig.match(/add column if not exists/g) ?? []).length === 3 && /remplace_le timestamptz/.test(mig) && /contenu_id uuid/.test(mig) && /on delete set null/.test(mig) && /notify pgrst, 'reload schema'/.test(mig));
  const l = (id: string, type: string, recu: string, remplace: string | null = null) => ({ id, type, r2_key: `k/${id}`, nom_origine: `${id}.png`, reponses: null, recu_le: recu, remplace_le: remplace });
  const c = envoisCourants([
    l("a", "logo", "2026-10-14T10:00:00Z"),
    l("b", "logo", "2026-10-14T11:00:00Z", "2026-10-14T12:00:00Z"),
    l("c", "logo", "2026-10-14T12:00:00Z"),
    l("m1", "mot", "2026-10-14T09:00:00Z"),
    l("m2", "mot", "2026-10-14T13:00:00Z"),
    l("x", "inconnu", "2026-10-14T13:00:00Z"),
  ]);
  ok("envois : un contenu a plusieurs fichiers, une version remplacee sort de l'ecran",
    JSON.stringify(c.get("logo")?.map((x) => x.id)) === JSON.stringify(["a", "c"]));
  ok("envois : le questionnaire n'a qu'une version courante, la plus recente ; un type inconnu est ignore",
    JSON.stringify(c.get("mot")?.map((x) => x.id)) === JSON.stringify(["m2"]) && !c.has("inconnu"));
  ok("envois : sans la migration (aucun remplace_le), tous les fichiers se montrent",
    envoisCourants([{ ...l("a", "logo", "2026-10-14T10:00:00Z"), remplace_le: undefined }, { ...l("b", "logo", "2026-10-14T11:00:00Z"), remplace_le: undefined }]).get("logo")?.length === 2);
  ok("envois : l'apercu seulement pour une image (png, jpg, svg)", apercuPossible("logo.SVG") && apercuPossible("a.jpeg") && !apercuPossible("logo.pdf") && !apercuPossible(null));
  const route = lire("src/app/api/collectif/contenus/route.ts");
  ok("remplacer : la migration est SONDEE avant d'ecrire au coffre (aucun fichier orphelin), 503 nomme",
    route.indexOf("ERREUR_ENVOIS_ABSENTE") > 0 && route.indexOf("ERREUR_ENVOIS_ABSENTE") < route.indexOf("await ecrireObjet("));
  ok("remplacer : un fichier courant du meme contenu et de la meme edition, l'ancien devient ancienne version (rien ne s'efface)",
    /\.eq\("edition_id", edition\.id\)/.test(route) && /data\.type !== contenu\.cle/.test(route) && /remplace_le: new Date\(\)\.toISOString\(\), remplace_par: id/.test(route) && !/\.delete\(/.test(route));
  const ligne = lire("src/app/edition/[token]/LigneContenus.tsx");
  ok("contenus : revoir (apercu ou Ouvrir), Remplacer, Ajouter un autre fichier, Modifier les reponses",
    ["Remplacer", "Ajouter un autre fichier", "Ouvrir", "ancienne version", "Modifier"].every((t) => ligne.includes(t)));
  ok("contenus : l'atelier voit l'ancienne version", /ancienne version/.test(lire("src/app/admin/collectif/[id]/PanneauContenus.tsx")) && /remplace_le/.test(lire("src/app/admin/collectif/donnees.ts")));

  {
    const a = Dossiers.arbreDesPhotos(
      [{ provenance_id: null, provenance_type: "photographe", role_deposant: "responsable", deposant: "Jean" }, { provenance_id: null, provenance_type: "participant", role_deposant: "participant", deposant: null }, { provenance_id: null, provenance_type: "autre", role_deposant: "atelier", deposant: null }],
      [{ id: "0b1f3c2e-4a5b-4c6d-8e9f-001122334455", cle: "c".repeat(22), libelle: "Équipe Lyon", sans_plafond: true, plafond_par_personne: null }],
      { plafond_participant_atelier: 30, plafond_participant_client: null, plafond_total: 2000, responsable_nom: "Camille" },
      true
    );
    ok("dossiers : un lien ou un dossier du responsable se renomme ; le lien general et l'atelier non ; une cle inconnue est refusee",
      a.vous[0].renommable && a.liens.find((l) => l.cle.startsWith("lien:"))?.renommable === true && a.liens.find((l) => l.cle === "participants")?.renommable === false && a.atelier?.renommable === false
      && Dossiers.lireCleResp("resp:photographe:Jean")?.brut === "Jean" && Dossiers.lireCleResp("resp:pirate:x") === null && Dossiers.lireCleResp("participants") === null);
    ok("dossiers : un dossier d'avant T-152 garde son nom, sans « Autre source · » ni « Le photographe · »", a.vous[0].nom === "Jean");
  }
  ok("dossiers : un nom d'une ligne, 80 caracteres au plus, jamais vide",
    Dossiers.lireNomDossier("  La  soirée\n de clôture ").ok && (Dossiers.lireNomDossier("  La  soirée\n de clôture ") as { nom: string }).nom === "La soirée de clôture" && !Dossiers.lireNomDossier("   ").ok && !Dossiers.lireNomDossier("x".repeat(81)).ok);
  const dossiers = lire("src/app/api/collectif/dossiers/route.ts");
  ok("dossiers : le droit du responsable, l'edition filtree, journalise ; « Mes photos » rend son propre nom",
    /peut\(acces\.role, "regler_plafond_participant"\)/.test(dossiers) && /\.eq\("edition_id", edition\.id\)/.test(dossiers) && /"dossier_renomme"/.test(dossiers) && /deposantPour\(n, edition\.responsable_nom\)/.test(dossiers));
  ok("dossiers : le crayon d'une vignette ou du titre (double clic sur le titre), Entree garde, Echap annule",
    /className="ec-ph-album-renommer"/.test(collecte) && /onDoubleClick=\{\(\) => p\.ecrire && courant\?\.renommable/.test(collecte) && /e\.key === "Enter"/.test(collecte) && /e\.key === "Escape"/.test(collecte));
  ok("le journal dit le renommage et le remplacement",
    /devient « La soirée »/.test(phraseEvenement("dossier_renomme", { avant: "Mes photos", apres: "La soirée" })) && /ancienne version reste/.test(phraseEvenement("contenu_remplace", { type: "Logo", nom: "logo.png" })));

  const envoyer = lire("src/app/api/collectif/messages/envoyer/route.ts");
  ok("citer un envoi : sonde la migration, l'envoi doit etre de l'edition, 503 nomme sinon",
    /envoisMessagesAppliques\(supabase\)/.test(envoyer) && /from\("collectif_contenus"\)[\s\S]{0,120}\.eq\("edition_id", edition\.id\)/.test(envoyer) && /ERREUR_ENVOIS_ABSENTE/.test(envoyer));
  const messagerie = lire("src/lib/collectif/messagerie.ts");
  ok("citer un envoi : la lecture se replie en trois paliers (envois, revision, avant)",
    /requete\(COLONNES_ENVOIS\)[\s\S]{0,200}requete\(COLONNES\)[\s\S]{0,200}requete\(COLONNES_AVANT\)/.test(messagerie));
  ok("citer un envoi : le « + » propose « Citer un de vos envois », la bulle et l'atelier le montrent",
    /Citer un de \{v\("vos", "tes"\)\} envois/.test(lire("src/app/edition/[token]/atelier/Parler.tsx")) && /Votre envoi · \{m\.contenu\.libelle\}/.test(lire("src/app/edition/[token]/atelier/Parler.tsx")) && /Envoi du client cité/.test(lire("src/app/admin/collectif/ConversationAtelier.tsx")));
}

titre("— T-152 : les photos rangees en dossiers, les liens a part —");
{
  const D = Dossiers;
  const ed = { plafond_participant_atelier: 30, plafond_participant_client: null, plafond_total: 2000, responsable_nom: "Camille" };
  const r = (deposant: string | null, extra: Partial<Dossiers.LignePhoto> = {}): Dossiers.LignePhoto => ({ provenance_id: null, provenance_type: "organisateur", role_deposant: "responsable", deposant, ...extra });
  const p = (lien: string | null, nom: string | null): Dossiers.LignePhoto => ({ provenance_id: lien, provenance_type: "participant", role_deposant: "participant", deposant: nom });
  const L = "0b1f3c2e-4a5b-4c6d-8e9f-001122334455";
  const liens = [{ id: L, cle: "c".repeat(22), libelle: "Équipe Lyon", sans_plafond: false, plafond_par_personne: 30 }];
  const lignes = [
    r("Camille"), r(null), r("La soirée"), r("La soirée / Photobooth"), r("La soirée / Photobooth"), r("Mes photos / Brouillons"),
    p(L, "Hugo"), p(L, "Hugo"), p(L, "Inès"), p(null, null), p(null, "Léa"),
  ];
  const a = D.arbreDesPhotos(lignes, liens, ed, true);
  ok("dossiers : « Mes photos » d'abord, un dossier par nom, ses sous-dossiers dedans (un niveau)",
    JSON.stringify(a.vous.map((h) => `${h.nom}:${h.n}[${h.enfants.map((e) => `${e.nom}:${e.n}`).join(",")}]`)) === JSON.stringify(["Mes photos:3[Brouillons:1]", "La soirée:3[Photobooth:2]"]));
  ok("dossiers : un dossier qui a des sous-dossiers ne se range pas dans un autre ; les autres oui",
    a.vous.every((h) => h.deplacable === (h.enfants.length === 0)) && a.vous.every((h) => h.enfants.every((e) => e.deplacable && !e.accueille)));
  ok("liens : le lien general et chaque lien, une ligne par personne dedans (« Sans nom » si pas de nom)",
    a.liens.map((l) => `${l.nom}:${l.n}`).join() === "Tous les participants:2,Équipe Lyon:3" && a.liens[1].enfants.map((e) => `${e.nom}:${e.n}`).join() === "Hugo:2,Inès:1" && a.liens[0].enfants.some((e) => e.nom === "Sans nom"));
  ok("liens : une seule personne qui porte le nom du lien n'est pas detaillee ; un lien supprime et vide disparait",
    D.arbreDesPhotos([p(L, "Équipe Lyon")], liens, ed, true).liens[1].enfants.length === 0
    && D.arbreDesPhotos([], [{ ...liens[0], retire_le: "2026-10-14T20:00:00Z" }], ed, true).liens.length === 1);
  ok("l'equipe ne voit pas les liens vides", D.arbreDesPhotos([], liens, ed, false).liens.length === 0);
  const dans = (cle: string) => lignes.filter((l) => D.dansLeDossier(l, cle, "Camille")).length;
  ok("un dossier montre ses photos ET celles de ses sous-dossiers ; un sous-dossier les siennes",
    dans("resp:organisateur:") === 3 && dans("resp:organisateur:La soirée") === 3 && dans("resp:organisateur:La soirée / Photobooth") === 2);
  ok("un lien, une personne, le lien general, tout", dans(`lien:${L}`) === 3 && dans(`pers:${L}:Hugo`) === 2 && dans("participants") === 2 && dans("pers:general:Sans nom") === 1 && dans("tout") === lignes.length);
  ok("« Ma sélection » : les photos choisies", D.dansLeDossier({ ...r(null), preselection: true }, "selection", "Camille") && !D.dansLeDossier(r(null), "selection", "Camille"));
  const soiree = D.noeudDe(a, "resp:organisateur:La soirée");
  const mes = D.noeudDe(a, "resp:organisateur:");
  const photobooth = D.noeudDe(a, "resp:organisateur:La soirée / Photobooth");
  const seul = D.arbreDesPhotos([r("Le dîner"), r("La soirée")], [], ed, false);
  const plan1 = D.planDeplacement(D.noeudDe(seul, "resp:organisateur:Le dîner"), D.noeudDe(seul, "resp:organisateur:La soirée"), seul);
  ok("ranger : un dossier sans sous-dossier entre dans un autre (« La soirée / Le dîner »)", plan1.ok && plan1.avant === "Le dîner" && plan1.apres === "La soirée / Le dîner");
  ok("ranger : un dossier qui a des sous-dossiers refuse (un seul niveau), un sous-dossier ne recoit rien",
    !D.planDeplacement(soiree, mes, a).ok && !D.planDeplacement(D.noeudDe(a, "resp:organisateur:Mes photos / Brouillons"), photobooth, a).ok && !D.planDeplacement(soiree, soiree, a).ok);
  const sortir = D.planDeplacement(photobooth, null, a);
  ok("ranger : un sous-dossier revient au premier niveau", sortir.ok && sortir.avant === "La soirée / Photobooth" && sortir.apres === "Photobooth");
  ok("renommer : le dossier et ses sous-dossiers suivent, les autres ne bougent pas",
    D.nouveauChemin("La soirée", "La soirée", "Le gala") === "Le gala" && D.nouveauChemin("La soirée / Photobooth", "La soirée", "Le gala") === "Le gala / Photobooth" && D.nouveauChemin("La soirée bis", "La soirée", "Le gala") === null);
  ok("un nom de dossier : sans « / » (il separe le sous-dossier), une ligne, 80 caracteres",
    (D.lireNomDossier("Jour 1/2") as { nom: string }).nom === "Jour 1-2" && !D.lireNomDossier("  ").ok && !D.lireNomDossier("x".repeat(81)).ok);
  ok("« Mes photos » redevient le nom du responsable en base", D.deposantPour("Mes photos", "Camille") === "Camille" && D.deposantPour("La soirée / Photobooth", "Camille") === "La soirée / Photobooth");

  const route = lire("src/app/api/collectif/dossiers/route.ts");
  ok("route dossiers : ranger par planDeplacement, renommer par nouveauChemin, ecrire par paquets d'ids de l'edition",
    /planDeplacement\(source, dans, arbre\)/.test(route) && /nouveauChemin\(cheminDe\(l, edition\.responsable_nom\)\.chemin, avant, apres\)/.test(route) && /\.in\("id", ids\.slice\(i, i \+ 500\)\)/.test(route) && /"dossier_range"/.test(route));
  ok("le depot du responsable accepte un chemin de sous-dossier (170 caracteres)", /demande\.libelle\.trim\(\)\.slice\(0, 170\)/.test(lire("src/app/api/collectif/depot/presign/route.ts")));
  const photos = lire("src/app/api/collectif/photos/route.ts");
  ok("route photos : la grille filtre par dansLeDossier, « en cours d'arrivee » = declarees non confirmees depuis 2 h",
    /dansLeDossier\(p, dossier, responsable\)/.test(photos) && /\.is\("confirmee_le", null\)\.gt\("created_at", depuis\)/.test(photos) && /seulementArbre === true/.test(photos));
  ok("selectionner tout un dossier : la meme regle que la grille, jamais une photo signalee",
    /dansLeDossier\(l, dossier, responsable\)/.test(lire("src/app/api/collectif/photos/marquer/route.ts")) && /!preselection \|\| !l\.signalee/.test(lire("src/app/api/collectif/photos/marquer/route.ts")));

  const prov = lire("src/app/api/collectif/provenances/route.ts");
  ok("supprimer un lien : un marqueur (retire_le), jamais un DELETE ; 503 nomme sans la migration ; ses photos restent",
    /update\(\{ retire_le: new Date\(\)\.toISOString\(\) \}\)/.test(prov) && !/\.delete\(/.test(prov) && /ERREUR_LIENS_ABSENTE/.test(prov) && /"provenance_supprimee"/.test(prov));
  ok("changer le nombre de photos d'un lien : la meme regle qu'a la creation (lirePlafondLien), journalise",
    /async function modifierLien[\s\S]*lirePlafondLien\(corps, edition\)/.test(prov) && /"provenance_plafond"/.test(prov));
  ok("un lien supprime ne recoit plus rien : la page de depot est introuvable, la route refuse",
    /lu\.data\.retire_le\) notFound\(\)/.test(lire("src/app/depot/[token]/page.tsx")) && /!prov \|\| prov\.retire_le/.test(lire("src/app/api/collectif/depot/presign/route.ts")));
  const mig = lire("supabase/migrations/20261018_collectif_liens_reponses.sql");
  ok("migration 20261018 : atomique, idempotente, retire_le et reponse_a, PostgREST relit",
    /^begin;/m.test(mig) && /^commit;/m.test(mig) && /retire_le timestamptz/.test(mig) && /reponse_a uuid/.test(mig) && /notify pgrst, 'reload schema'/.test(mig));

  const page = lire("src/app/edition/[token]/photos/Collecte.tsx");
  ok("Photos : plus de « Signaler », plus de barre de presélection, les grands chiffres en tete",
    !/Signaler/.test(page) && !/ec-presel/.test(page) && /ec-ph-chiffres/.test(page) && /photos reçues/.test(page));
  ok("Photos : ranger en glissant (draggable, onDrop), « + Nouveau dossier » ouvre le depot sur un nom neuf",
    /draggable: true/.test(page) && /void ranger\(glisse, cible === "vous" \? null : cible\)/.test(page) && /envoi\.ouvrir\?\.\(\{ nouveau: true \}\)/.test(page));
  const fen = lire("src/app/edition/_composants/depot/FenetreEnvoi.tsx");
  ok("deposer : « Dans quel dossier ? », les dossiers existants ou un nom neuf, un seul bouton",
    /Dans quel dossier \?/.test(fen) && /Ou un nouveau dossier/.test(fen) && /Choisir des photos/.test(fen) && !/Choisir un dossier/.test(fen) && !/webkitdirectory/.test(fen));
  const css = lire("src/app/edition/[token]/espace.css");
  ok("le bleu de Bellajour en mode jour (#4a90d9), le nom de l'edition sans boite",
    /--ec-accent: #4a90d9;/.test(css) && /--ec-ac-rgb: 74, 144, 217;/.test(css) && !/\.ec-espace \.ec-edition \{[^}]*border: 1px/.test(css));
}

titre("— T-152 : les documents s'ouvrent dans la page, on repond a un message —");
{
  ok("visionneuse : un PDF et une image courante se peignent, le reste se telecharge ; la requete d'une adresse signee est ignoree",
    genreFichier("devis.pdf") === "pdf" && genreFichier(null, "https://x.r2/collectif/a/devis.PDF?X-Amz-Signature=1") === "pdf" && genreFichier("logo.png") === "image" && genreFichier("photo.heic") === "autre" && genreFichier("note.docx") === "autre" && genreFichier("sans-extension", "https://x/y.webp?a=b") === "image");
  const vis = lire("src/app/edition/_composants/Visionneuse.tsx");
  ok("visionneuse : posee dans la colonne par un portail, l'icone qui telecharge, ouvrir dans un onglet",
    /createPortal\(/.test(vis) && /document\.querySelector\("\.ec-contenu"\)/.test(vis) && /aria-label="Télécharger"/.test(vis) && /download/.test(vis) && /Ouvrir dans un nouvel onglet/.test(vis));
  const donnees = lire("src/app/edition/[token]/donnees.ts");
  ok("documents : deux adresses signees, l'une telecharge (nom propre), l'autre s'affiche",
    /\[url, voir\] = await Promise\.all\(\[signerGet\(d\.r2_key, undefined, nomTelechargement\(d\.libelle, ext\)\), signerGet\(d\.r2_key\)\]\)/.test(donnees) && /telecharger,/.test(donnees));
  ok("visionneuse branchee : Documents, propositions, envois, fichiers cites dans le fil ; plus aucun « Ouvrir » vers un nouvel onglet",
    /vision\.ouvrir/.test(lire("src/app/edition/[token]/dossier/ListeDocuments.tsx")) && /vision\.ouvrir/.test(lire("src/app/edition/[token]/atelier/Propositions.tsx")) && /vision\.ouvrir/.test(lire("src/app/edition/[token]/LigneContenus.tsx")) && /ouvrir=\{vision\.ouvrir\}/.test(lire("src/app/edition/[token]/atelier/Parler.tsx"))
    && ["src/app/edition/[token]/atelier/Parler.tsx", "src/app/edition/[token]/atelier/Propositions.tsx", "src/app/edition/[token]/LigneContenus.tsx"].every((f) => !/href=\{(m\.(document|contenu|piece)|d|e)\.url\} target="_blank"/.test(lire(f))));
  const ms = lire("src/lib/collectif/messagerie.ts");
  ok("reponse : la lecture se replie en quatre paliers (reponses, envois, revision, avant)",
    /requete\(COLONNES_REPONSES\)[\s\S]*requete\(COLONNES_ENVOIS\)[\s\S]*requete\(COLONNES\)[\s\S]*requete\(COLONNES_AVANT\)/.test(ms) && /COLONNES_REPONSES = `\$\{COLONNES_ENVOIS\}, reponse_a`/.test(ms));
  ok("reponse : le message repondu est de la MEME edition, la migration sondee avant tout",
    /async function lireReponseA[\s\S]*reponsesMessagesAppliquees\(supabase\)[\s\S]*\.eq\("edition_id", editionId\)/.test(ms) && /\.eq\("edition_id", editionId\)\s*\.in\("id", idsReponses\)/.test(ms));
  const env = lire("src/app/api/collectif/messages/envoyer/route.ts");
  ok("reponse cote client : sondee AVANT le coffre, 503 nomme sans la migration",
    env.indexOf("lireReponseA(") > 0 && env.indexOf("lireReponseA(") < env.indexOf("ecrireObjet(cle.key") && /ERREUR_LIENS_ABSENTE, MESSAGE_LIENS_ABSENTE/.test(env));
  ok("reponse cote atelier : la meme regle", /lireReponseA\(supabase, g\.id, corps\.reponseA\)/.test(lire("src/app/api/admin/collectif/editions/[id]/messages/route.ts")));
  ok("reponse : un extrait d'une ligne, coupe au mot", extraitDe("Bonjour\n\nla  couverture") === "Bonjour la couverture" && extraitDe("a".repeat(50) + " " + "b".repeat(200)).endsWith("…") && extraitDe("a".repeat(50) + " " + "b".repeat(200)).length <= 141);
  const parler = lire("src/app/edition/[token]/atelier/Parler.tsx");
  ok("reponse : « Répondre » sur la bulle (pour qui ecrit), la citation dans la zone d'ecriture et dans la bulle, un clic y ramene",
    /repondre=\{p\.ecrire \? \(\) => setReponse\(el\.message\) : undefined\}/.test(parler) && /Réponse à \{auteurDe\(e\.reponse\)\}/.test(parler) && /allerAuMessage\(m\.reponseA\.id\)/.test(parler) && /reponseA: e\.reponse\?\.id \?\? null/.test(parler));
  ok("Documents : « Répondre » ouvre la conversation, le document deja cite (pour qui ecrit seulement)",
    /\?citer=\$\{d\.id\}/.test(lire("src/app/edition/[token]/dossier/ListeDocuments.tsx")) && /peut\(role, 'ecrire_message'\) \? versAtelier : null/.test(lire("src/app/edition/[token]/dossier/page.tsx")) && /documents\.some\(\(d\) => d\.id === citer\) \? citer : null/.test(lire("src/app/edition/[token]/atelier/page.tsx")));
}

titre("— 15/10 : Porcelaine le jour, Charbon la nuit, du verre et des arrondis —");
{
  const css = lire("src/app/edition/[token]/espace.css");
  const nuit = /\.bj-atelier\.ec-espace \{([^}]*)\}/.exec(css)?.[1] ?? "";
  const jour = /\.bj-atelier\.ec-espace\[data-ec-mode="jour"\] \{([^}]*)\}/.exec(css)?.[1] ?? "";
  ok("la nuit est un CHARBON (#17181c), plus de noir pur ni de blanc pur pour le texte", /--ec-bg: #17181c;/.test(nuit) && /--ec-text: #ecedf0;/.test(nuit) && !/#050505;/.test(nuit.replace(/--ec-encre[^;]*;/, "")));
  ok("le jour est une PORCELAINE (#f3f4f7) au bleu de Bellajour, plus de beige", /--ec-bg: #f3f4f7;/.test(jour) && /--ec-accent: #4a90d9;/.test(jour) && !/#f3ece2|#ece3d6|#fbf8f3/.test(jour));
  ok("la forme est commune : arrondis emboîtés (28/24/16/14), verre, ombres en jetons", ["--ec-r-panneau: 28px", "--ec-r-carte: 24px", "--ec-r-bloc: 16px", "--ec-r-champ: 14px", "--ec-flou:"].every((j) => nuit.includes(j)) && ["--ec-carte:", "--ec-ombre-carte:", "--ec-actif:"].every((j) => nuit.includes(j) && jour.includes(j)));
  ok("la coquille flotte : un fond vivant (deux taches floues) et un menu de verre arrondi, plus de trait à droite",
    /\.ec-espace \.ec-coquille::before/.test(css) && /\.ec-espace \.ec-menu \{[^}]*border-radius: var\(--ec-r-panneau\)/.test(css) && !/\.ec-espace \.ec-menu \{[^}]*border-right/.test(css));
  ok("l'en-tête d'un écran n'est plus souligné d'un trait", !/\.ec-espace \.ec-ecran-tete \{[^}]*border-bottom/.test(css));
  const admin = lire("src/app/admin/admin.css");
  ok("l'atelier passe en Porcelaine DANS admin.css (les pages publiques crème ne bougent pas)",
    /\.adm-root \{[^}]*--bj-cream: #f3f4f7;/.test(admin) && /--bj-cream:\s+#f7f1e9;/.test(lire("src/app/tokens.css")));
  ok("la page de dépôt des participants est en charbon, plus de noir pur", /background: #17181c;/.test(lire("src/app/depot/[token]/depot.css")) && !/#050505/.test(lire("src/app/depot/[token]/depot.css")));
}

titre("— 15/10 : la page Photos sans grande colonne (rayons, albums, fil d'Ariane) —");
{
  const D = Dossiers;
  ok("rayons : chaque cle trouve son onglet", D.rayonDe("tout") === "tout" && D.rayonDe("resp:organisateur:La soirée") === "vous" && D.rayonDe("pers:general:Léa") === "liens" && D.rayonDe("lien:0b1f3c2e-4a5b-4c6d-8e9f-001122334455") === "liens" && D.rayonDe("participants") === "liens" && D.rayonDe("atelier") === "atelier" && D.rayonDe("selection") === "selection");
  const r = (provenance_id: string | null, role_deposant: string): Dossiers.LignePhoto => ({ provenance_id, provenance_type: "organisateur", role_deposant, deposant: null });
  ok("vues d'ensemble : « vous » = les photos du responsable, « liens » = celles des participants", D.dansLeDossier(r(null, "responsable"), "vous", "C") && !D.dansLeDossier(r(null, "participant"), "vous", "C") && D.dansLeDossier(r(null, "participant"), "liens", "C") && D.dansLeDossier(r("x", "participant"), "liens", "C") && !D.dansLeDossier(r(null, "atelier"), "liens", "C"));
  const route = lire("src/app/api/collectif/photos/route.ts");
  ok("route photos : une vue d'ensemble ne signe aucune PAGE de grille (les huit dernieres arrivees seulement), une couverture par dossier ou lien",
    /const sansGrille = corps\.seulementArbre === true \|\| estVueEnsemble\(dossier\)/.test(route) && /suivante: !sansGrille &&/.test(route) && /couvertures\[n\.cle\] = await signerGet\(p\.vignette_key\)/.test(route)
    && /const ARRIVEES = 8;/.test(route) && /sansGrille \? dansDossier\.slice\(-ARRIVEES\)\.reverse\(\)/.test(route));
  const page = lire("src/app/edition/[token]/photos/Collecte.tsx");
  ok("Photos : dossiers et liens en vignettes, sous-dossiers en petites vignettes, personnes d'un lien en pastilles, fil d'Ariane",
    /className="ec-ph-albums"/.test(page) && /ec-ph-albums--petits/.test(page) && /className="ec-ph-personnes"/.test(page) && /className="ec-ph-fil"/.test(page) && existsSync(resolve(RACINE, "archive/photos-colonne-2026-10/README.md")));
}

titre("— T-152 : l'atelier, un seul logiciel (barre commune, boite de reception, fiche en onglets) —");
{
  ok("boite : des initiales lisibles", initialesDe("Maison Aubier") === "MA" && initialesDe("Lycée Jean Moulin") === "LJ" && initialesDe("Club de la Rive") === "CR" && initialesDe("Bellajour") === "BE");
  const midi = new Date("2026-10-14T10:00:00Z");
  ok("boite : quand, en court (heure de Paris : l'heure, hier, le jour, la date)",
    quandCourt("2026-10-14T08:05:00Z", midi) === "10 h 05" && quandCourt("2026-10-13T20:00:00Z", midi) === "hier" && /^(sam|dim|lun)/.test(quandCourt("2026-10-11T09:00:00Z", midi)) && quandCourt("2026-10-02T09:00:00Z", midi) === "2 oct.");
  const ed = (id: string, organisation: string) => ({ id, organisation, evenement: "E", created_at: "2026-10-01T00:00:00Z" });
  const msg = (edition_id: string, auteur: "client" | "atelier", texte: string, created_at: string, lu: string | null = null) => ({ edition_id, auteur, texte, created_at, lu_atelier_le: lu });
  const convs = conversationsDe(
    [ed("a", "Atelier A"), ed("b", "Bureau B"), ed("c", "Club C")],
    [
      msg("a", "client", "Bonjour", "2026-10-14T09:00:00Z", "2026-10-14T09:30:00Z"),
      msg("b", "client", "Demande de modification : Ajouter des pages\n8 pages", "2026-10-13T09:00:00Z"),
      msg("b", "atelier", "Bien reçu", "2026-10-12T09:00:00Z"),
    ],
    midi
  );
  ok("boite : a lire d'abord, puis le plus recent, sans message a la fin ; rien n'est marque lu ici",
    convs.map((c) => c.id).join() === "b,a,c" && convs[0].nonLus === 1 && convs[2].apercu === null && !/update\(|lu_atelier_le: new Date/.test(lire("src/lib/collectif/boite.ts")));
  ok("boite : « Vous : » quand l'atelier a ecrit en dernier", conversationsDe([ed("x", "X")], [msg("x", "atelier", "Merci", "2026-10-14T09:00:00Z")], midi)[0].apercu === "Vous : Merci");
  const traiter = aTraiterBoite(convs, [{ edition_id: "a", debut: "2026-10-14T13:30:00Z", avec: "Mathias" }, { edition_id: "a", debut: "2026-10-15T13:30:00Z", avec: "Mathias" }], midi);
  ok("boite : a traiter = les messages a lire (la demande se dit), puis les rendez-vous du JOUR seulement",
    traiter.length === 2 && /Bureau B : (une demande de modification|1 message à lire)/.test(traiter[0].texte) && traiter[1].texte === "Rendez-vous à 15 h 30 avec Atelier A (Mathias)");
  ok("etapes : en cours, faites, a venir ; livree = tout fait",
    etapesEdition("composition").map((e) => e.statut).join() === "fait,encours,avenir,avenir,avenir" && etapesEdition("bat_valide")[2].statut === "encours" && etapesEdition("livree").every((e) => e.statut === "fait"));

  const barre = lire("src/app/admin/BarreAtelier.tsx");
  ok("barre commune : un commutateur « Particuliers | Éditions », absent sans l'interrupteur",
    /collectif \? \(\s*<nav className="atb-switch"/.test(barre) && /Particuliers/.test(barre) && /Éditions/.test(barre) && /href: "\/admin\/collectif\/messages"/.test(barre));
  const pages = ["src/app/admin/atelier/Liste.tsx", "src/app/admin/atelier/[token]/Fiche.tsx", "src/app/admin/collectif/page.tsx", "src/app/admin/collectif/[id]/page.tsx", "src/app/admin/collectif/messages/page.tsx", "src/app/admin/collectif/styles/page.tsx", "src/app/admin/collectif/agendas/page.tsx", "src/app/admin/collectif/nouvelle/page.tsx", "src/app/admin/collectif/[id]/bat/page.tsx"];
  ok("barre commune : posee sur chaque ecran des deux mondes (plus de « ← Table de travail »)",
    pages.every((f) => /<BarreAtelier /.test(lire(f))) && !/← Table de travail/.test(lire("src/app/admin/collectif/page.tsx")));
  ok("barre commune : la table de travail des particuliers garde ses ecrans, et la demo ne parle jamais des editions",
    ["Carnet", "Métriques", "Cockpit", "Santé", "Factures", "Prévente", "Démo"].every((t) => barre.includes(t)) && /collectif=\{collectif && !vue\.demo\}/.test(lire("src/app/admin/atelier/Liste.tsx")) && /collectif=\{collectif && !demo\}/.test(lire("src/app/admin/atelier/[token]/Fiche.tsx")));
  ok("barre commune : les non-lus se comptent SANS rien marquer, en parallele de la liste",
    /async function compterNonLus[\s\S]*?head: true/.test(lire("src/app/admin/collectif/donnees.ts")) && /Promise\.all\(\[\s*chargerListe/.test(lire("src/app/admin/atelier/page.tsx")));
  const boitePage = lire("src/app/admin/collectif/messages/page.tsx");
  ok("boite : une conversation a la fois, remontee a chaque changement (key), le dossier du client a droite",
    /<ConversationAtelier key=\{courant\.id\}/.test(boitePage) && /Le dossier du client/.test(boitePage) && /Ouvrir la fiche/.test(boitePage) && /chargerBoite\(supabase, maintenant\)/.test(boitePage));
  const onglets = lire("src/app/admin/collectif/[id]/OngletsFiche.tsx");
  ok("fiche : des onglets, un onglet monte a sa premiere visite puis garde (les messages ne se marquent lus qu'a leur ouverture)",
    /vus\.includes\(cle\) \?/.test(onglets) && /hidden=\{cle !== actif\}/.test(onglets) && /replaceState/.test(onglets) && /messages: <PanneauMessages/.test(lire("src/app/admin/collectif/[id]/page.tsx")));

  /* 15/10 au soir : ce qui manquait des maquettes « direction visuelle » (retour de Mathias). */
  {
    const css = lire("src/app/edition/[token]/espace.css");
    const tab = lire("src/app/edition/[token]/tableau.css");
    const tdb = lire("src/app/edition/[token]/page.tsx");
    const carte = lire("src/app/edition/[token]/CartePhotos.tsx");
    const col = lire("src/app/edition/[token]/photos/Collecte.tsx");
    ok("maquettes : la nuit, la lueur cuivree en haut a DROITE ; le jour, le bleu en haut a gauche",
      /\.ec-espace \.ec-coquille::before \{[^}]*right: -200px;[^}]*top: -260px;/.test(css) && /\[data-ec-mode="jour"\] \.ec-coquille::before \{[^}]*left: -160px;/.test(css));
    ok("maquettes : jour | nuit en deux boutons (soleil et lune), le mode en cours eclaire",
      /className="ec-mode-choix" role="group"/.test(lire("src/app/edition/[token]/Coquille.tsx")) && (lire("src/app/edition/[token]/Coquille.tsx").match(/className="ec-mode" aria-pressed=/g) ?? []).length === 2);
    ok("tableau de bord : deux colonnes (1 et 1,08), « À envoyer » sous le style et le message sous les photos, DANS la grille",
      /grid-template-columns: minmax\(0, 1fr\) minmax\(0, 1\.08fr\);\s*grid-template-rows: minmax\(0, 1fr\) auto;/.test(tab)
      && tdb.indexOf("<LigneContenus") > tdb.indexOf('className="ec-tdb-grille"') && tdb.indexOf('className="ec-tdb-message"') < tdb.indexOf("</div>\n      </div>\n    </section>"));
    ok("tableau de bord : l'encart Style dit « Fait » quand tout est valide, l'eventail Lisbonne / Aussie / Côte d'Azur (couvertures de Bellajour, jamais celles d'essai), une tuile par magazine et « Modifier »",
      /className="ec-tdb-fait"/.test(tdb) && /\{ nom: 'lisbonne', place: 'gauche' \},\s*\{ nom: 'aussie', place: 'droite' \},\s*\{ nom: 'cote-azur', place: 'centre' \},/.test(tdb) && /\/images\/v2\/accueil\/couverture-\$\{c\.nom\}-360\.webp/.test(tdb) && !/styleCouverture|tableau\.eventail/.test(tdb) && /className=\{reste \? 'ec-tdb-tuile ec-tdb-tuile--a-faire' : 'ec-tdb-tuile'\}/.test(tdb) && /\{ecrire \? 'Modifier' : 'Voir'\}/.test(tdb));
    ok("tableau de bord : une vignette par dossier et son nombre, plus de point ni de fleche",
      /className="ec-tdb-dossier-couv"/.test(carte) && !/ec-tdb-chevron|ec-tdb-point/.test(carte) && /dansLeDossier\(x, d\.cle, edition\.responsable_nom\)/.test(lire("src/app/edition/[token]/donnees.ts")));
    const fen = lire("src/app/edition/_composants/Fenetre.tsx");
    ok("fenetres : toujours ouvertes dans la colonne de contenu (portail), jamais prisonnieres d'un panneau de verre",
      /document\.querySelector\("\.ec-contenu"\)/.test(fen) && /createPortal\(fenetre, hote\)/.test(fen) && /useSyncExternalStore\(rien, \(\) => true, \(\) => false\)/.test(fen));
    ok("tableau de bord : a partir de TROIS contenus, « À envoyer » prend toute la largeur et le message passe dessous (regle de Mathias)",
      /const LIGNE_LONGUE = 3;/.test(lire("src/app/edition/[token]/LigneContenus.tsx")) && /contenus\.length >= LIGNE_LONGUE/.test(lire("src/app/edition/[token]/LigneContenus.tsx"))
      && /\.ec-tdb-grille > \.ec-tdb-ligne--longue,\s*\.ec-espace \.ec-tdb-grille > \.ec-tdb-ligne--longue \+ \.ec-tdb-message \{\s*grid-column: 1 \/ -1;/.test(tab));
    ok("Photos : le nombre POSE sur la couverture d'un album, « Dernières arrivées » sous les albums, les rayons DANS le panneau",
      /<span className="ec-ph-album-n">/.test(col) && /Dernières arrivées/.test(col) && col.indexOf('className="ec-ph-rayons"') > col.indexOf('"ec-ph-principal"'));
  }

  /* 15/10 : la fiche en cartes (maquette « Atelier, la fiche » validée par Mathias). */
  const fiche = lire("src/app/admin/collectif/[id]/page.tsx");
  ok("fiche en cartes : un retour visible vers la liste des editions, sur la fiche et sa silhouette",
    /<Link href="\/admin\/collectif" className="eca-retour">[\s\S]{0,80}Les éditions/.test(fiche) && /eca-retour[\s\S]{0,80}Les éditions/.test(lire("src/app/admin/collectif/[id]/loading.tsx")));
  ok("fiche en cartes : TROIS cartes dans la vue d'ensemble, chacune avec son lien en tete, plus de resumes en lignes",
    (fiche.match(/<section className="eca-carte">/g) ?? []).length === 3 && (fiche.match(/className="eca-carte-tete"/g) ?? []).length === 3 && !/const resume = /.test(fiche) && !/eca-apercu/.test(fiche));
  ok("fiche en cartes : les gestes dans un menu de l'en-tete, les trois liens et leur regeneration dans « Réglages et liens »",
    /<PanneauGestes [^>]*menu \/>/.test(fiche) && /libelle: "Réglages et liens"/.test(fiche) && /reglages: \([\s\S]*?<PanneauLiens id=\{e\.id\} liens=\{liens\} \/>/.test(fiche));
  const donneesFiche = lire("src/app/admin/collectif/donnees.ts");
  ok("fiche en cartes : les doublons se comptent par la MEME regle que la page Photos du client, quatre apercus signes au plus",
    /doublons: groupesDoublonsRapides\(/.test(donneesFiche) && /\.slice\(0, 4\)[\s\S]{0,60}signerOuRien\(p\.vignette_key\)/.test(donneesFiche));
}

titre("— T-150 : les HEIC ont leur aperçu et leur empreinte —");
{
  const moteur = lire("src/app/edition/_composants/depot/moteur.ts");
  const heic = lire("src/app/edition/_composants/depot/heic.ts");
  const worker = lire("public/heic/vignette-heic.worker.js");
  const paquet = JSON.parse(lire("package.json")) as { devDependencies?: Record<string, string> };
  ok("HEIC : le moteur des editions demande la vignette a libheif SEULEMENT quand le navigateur n'en a pas fait (Safari la fait)",
    /it\.vignette = r\.vignette \?\? \(estHeic\(it\.mime\) \? await vignetteHeic\(it\.fichier\) : null\);/.test(moteur));
  ok("HEIC : le moteur des PARTICULIERS n'est pas touche (aucun import de heic dans composer/)",
    !/heic"|vignetteHeic/.test(lire("src/app/(atelier)/composer/depot/moteur.ts")) && !/libheif/.test(lire("src/app/(atelier)/composer/depot/reduire.worker.js")));
  ok("HEIC : l'original part tel quel (la charge n'est jamais remplacee), deux workers au plus, un delai, jamais d'exception",
    !/it\.charge = .*vignetteHeic/.test(moteur) && /const WORKERS_MAX = 2;/.test(heic) && /DELAI_MAX_MS/.test(heic) && /Promise\.resolve\(null\)/.test(heic));
  ok("HEIC : le worker charge libheif a la premiere photo, un decodeur par worker, chaque image liberee",
    /importScripts\('\/heic\/libheif-bundle\.js'\)/.test(worker) && /decodeur = new lib\.HeifDecoder\(\)/.test(worker) && /i\.free\(\)/.test(worker) && !/\.is_primary\(/.test(worker));
  const copie = resolve(RACINE, "public/heic/libheif-bundle.js");
  const source = resolve(RACINE, "node_modules/libheif-js/libheif-wasm/libheif-bundle.js");
  ok("HEIC : libheif-js epingle a 1.19.8, copie de public/ IDENTIQUE au paquet, licence a cote",
    paquet.devDependencies?.["libheif-js"] === "1.19.8" && existsSync(resolve(RACINE, "public/heic/LICENSE-libheif.txt"))
      && (!existsSync(source) || readFileSync(copie).equals(readFileSync(source))));
  ok("HEIC : le rattrapage lit sans ecrire par defaut (--vraiment), pose la colonne APRES le depot, relit l'empreinte sur la vignette",
    (() => {
      const r = lire("scripts/collectif-heic-rattrapage.ts");
      return /const vraiment = process\.argv\.includes\("--vraiment"\)/.test(r) && r.indexOf("PutObjectCommand({") < r.indexOf('update({ vignette_key: key })') && /lireDepuisCoffre\(\{ r2_key: l\.r2_key, taille: l\.taille, vignette_key: key \}\)/.test(r);
    })());
}

titre("— T-146 : les mails des éditions, un seul circuit, coupé par défaut —");
{
  const textes = MailsTextes;
  const base = { organisation: "Maison Aubier", evenement: "Séminaire d'automne", responsable: "Camille Essai", lien: "https://bellajour.fr/edition/ABCDEFGHIJKLMNOPQRSTUVWXYZ012345", cloture: "28 octobre", avecCode: false };
  const vous = textes.mailEspacePret({ ...base, tu: false });
  const toi = textes.mailEspacePret({ ...base, tu: true });
  const avecCode = textes.mailEspacePret({ ...base, tu: false, avecCode: true });
  ok("« Votre espace est prêt » : le lien du responsable, l'evenement dans l'objet, vous ou tu, Bonjour + prenom",
    vous.html.includes(base.lien) && vous.texte.includes(base.lien) && vous.sujet.includes("Séminaire d'automne") && vous.sujet.startsWith("Votre") && toi.sujet.startsWith("Ton") && /Bonjour Camille,/.test(vous.texte) && /tu choisis/.test(toi.texte) && /vous choisissez/.test(vous.texte));
  ok("« Votre espace est prêt » : aucun tiret cadratin ni demi-cadratin, rien n'est injecte sans echappement",
    ![vous, toi, avecCode].some((m) => /[—–]/.test(m.html + m.texte + m.sujet)) && textes.mailEspacePret({ ...base, tu: false, evenement: "<script>" }).html.includes("&lt;script&gt;"));
  ok("« Votre espace est prêt » : le code par appareil n'est annonce QUE quand il est en service (T-154)",
    !/un code/.test(vous.texte) && /un code/.test(avecCode.texte));
  const circuit = lire("src/lib/collectif/mails.ts");
  ok("circuit : coupe par defaut (COLLECTIF_MAILS, ATELIER_MAILS_COUPES), verrou AVANT Brevo et RETIRE si Brevo refuse ou si le reseau tombe, journal",
    /export const VAR_MAILS_COLLECTIF = "COLLECTIF_MAILS";/.test(circuit) && circuit.indexOf("lireInterrupteur(process.env[VAR_MAILS_COLLECTIF]).ouvert") < circuit.indexOf("fetch(BREVO_SMTP_URL")
      && circuit.indexOf('from("collectif_mails").insert') < circuit.indexOf("fetch(BREVO_SMTP_URL") && (circuit.match(/await retirer\(\);/g) ?? []).length === 2 && /"mail_envoye"/.test(circuit) && /"mail_echec"/.test(circuit));
  const routeMail = lire("src/app/api/admin/collectif/editions/[id]/mail-espace/route.ts");
  ok("route du mail : admin revérifié, « verifier » ne fait rien partir, une edition archivee ne recoit rien, le verrou suit le lien (regenerer permet de renvoyer)",
    /quiEstConnecteRequete\(request\)/.test(routeMail) && routeMail.indexOf("corps.verifier === true") < routeMail.indexOf("envoyerMailCollectif({") && /archive_le\) return/.test(routeMail) && /createHash\("sha256"\)\.update\(p\.edition\.token_responsable\)/.test(routeMail));
}

titre("— T-154 : le lien du responsable ne s'ouvre que sur un appareil reconnu —");
{
  const A = Appareil;
  ok("code : six chiffres, espaces et tirets toleres, rien d'autre",
    A.lireCode("123 456") === "123456" && A.lireCode("123-456") === "123456" && A.lireCode("12345") === null && A.lireCode("12345a") === null && A.lireCode(123456) === null && A.codeAffiche("123456") === "123 456");
  ok("le controle n'est actif QUE si COLLECTIF_CODE_APPAREIL ET COLLECTIF_MAILS sont ouverts (sans mail, personne ne recevrait son code)",
    A.controleAppareilActif({ COLLECTIF_CODE_APPAREIL: "1", COLLECTIF_MAILS: "1" }) && !A.controleAppareilActif({ COLLECTIF_CODE_APPAREIL: "1" }) && !A.controleAppareilActif({ COLLECTIF_MAILS: "1" }) && !A.controleAppareilActif({ COLLECTIF_CODE_APPAREIL: "peut-etre", COLLECTIF_MAILS: "1" }));
  ok("un code est LIE a l'appareil qui l'a demande, jamais stocke en clair, compare a duree constante",
    A.empreinteCode(A.empreinte("app-1"), "123456") !== A.empreinteCode(A.empreinte("app-2"), "123456") && A.memeEmpreinte("abc", "abc") && !A.memeEmpreinte("abc", "abd") && !A.memeEmpreinte("abc", "abcd"));
  ok("identifiant d'appareil : 32 a 64 caracteres base64url ; adresse masquee",
    A.idAppareilValide("A".repeat(43)) && !A.idAppareilValide("court") && !A.idAppareilValide("A".repeat(43) + "!") && A.adresseMasquee("camille@exemple.fr") === "c***@exemple.fr");
  const acces = lire("src/lib/collectif/acces.ts");
  ok("la porte : sur un appareil inconnu, le responsable LIT (droits de l'equipe) au lieu d'etre bloque ; l'atelier connecte passe ; sans la migration on laisse passer ; une seule route sans le controle",
    /role === "responsable" && !options\.sansAppareil && controleAppareilActif\(process\.env\)/.test(acces) && /return \{ statut: "ok", edition: data, role: "equipe", appareilInconnu: true \};/.test(acces)
      && /if \(await quiEstConnecte\(\)\) return true;/.test(acces) && /return reconnu \?\? true;/.test(acces) && !/appareil_inconnu/.test(acces)
      && fichiers("src/app/api", "route.ts").filter((f) => /sansAppareil: true/.test(lire(f))).length === 1);
  const appareils = lire("src/lib/collectif/appareils.ts");
  ok("les codes : empreinte seulement, essais comptes, expiration, frein par heure ; le code d'essai est IGNORE sur Vercel",
    /code_empreinte: empreinteCode\(appareilEmp, code\)/.test(appareils) && !/code_empreinte: code[,\s]/.test(appareils) && /essais >= ESSAIS_MAX/.test(appareils) && /expire_le/.test(appareils) && /CODES_PAR_HEURE/.test(appareils) && /localhost\|127\\\.0\\\.0\\\.1/.test(appareils) && !/!process\.env\.VERCEL/.test(appareils)
      && !/if \(!idAppareil\) return false;/.test(appareils) && /empreinte\(idAppareil \?\? "aucun-appareil"\)/.test(appareils));
  ok("le code d'essai ne vaut QUE depuis localhost, jamais depuis bellajour.fr ni une version d'essai",
    (() => {
      const env = { COLLECTIF_CODE_ESSAI: "246810" };
      return Appareils.codeNeuf("http://localhost:3007", env) === "246810" && Appareils.codeNeuf("http://127.0.0.1:3000", env) === "246810"
        && Appareils.codeNeuf("https://www.bellajour.fr", env) !== "246810" && Appareils.codeNeuf("https://bellajour-prelaunch-git-x.vercel.app", env) !== "246810"
        && Appareils.codeNeuf("http://localhost.evil.fr", env) !== "246810" && /^\d{6}$/.test(Appareils.codeNeuf("https://www.bellajour.fr", {}));
    })());
  const routeApp = lire("src/app/api/collectif/appareil/route.ts");
  ok("la route du code : token dans le CORPS, cookie httpOnly + secure + sameSite lax, le lien d'equipe recoit « introuvable »",
    /lireCorps\(request\)/.test(routeApp) && !/searchParams/.test(routeApp) && /httpOnly: true,\s*secure: true,\s*sameSite: "lax"/.test(routeApp) && /peut\(acces\.role, "ouvrir_sur_appareil"\)/.test(routeApp));
  const layoutEspace = lire("src/app/edition/[token]/layout.tsx");
  ok("l'espace : le responsable reste lui-meme a l'ecran, une pastille propose le code pour modifier, plus aucun ecran bloquant",
    /appareil=\{appareilInconnu \? \{ adresse: adresseMasquee\(edition\.responsable_email\) \} : null\}/.test(layoutEspace) && !/CodeAppareil/.test(layoutEspace)
      && /<PastilleAppareil \/>/.test(lire("src/app/edition/_composants/Ecran.tsx")) && /<AppareilFournisseur /.test(lire("src/app/edition/[token]/Coquille.tsx"))
      && fichiers("src/app/edition/[token]", "page.tsx").every((f) => !/appareil_inconnu/.test(lire(f))));
  ok("reglages souples (Mathias, 16/10 : « il faut pas que ça soit très compliqué ») : 24 heures par code, 10 essais, 10 codes par heure ; la duree s'ecrit en clair",
    A.DUREE_CODE_MS === 24 * 60 * 60_000 && A.ESSAIS_MAX === 10 && A.CODES_PAR_HEURE === 10 && A.libelleDuree(A.DUREE_CODE_MS) === "24 heures" && A.libelleDuree(60 * 60_000) === "1 heure" && A.libelleDuree(15 * 60_000) === "15 minutes");
  const mailCode = MailsTextes.mailCodeAppareil({ tu: false, evenement: "Séminaire", code: "123456", duree: "24 heures", site: "https://bellajour.fr" });
  ok("le mail du code : les six chiffres, la duree, d'ou vient la demande, aucun tiret cadratin",
    mailCode.sujet.includes("123 456") && mailCode.texte.includes("123 456") && /valable 24 heures/.test(mailCode.texte) && /bellajour\.fr/.test(mailCode.texte) && !/[—–]/.test(mailCode.html + mailCode.texte));
}

titre("— T-154 : « Retrouver mon espace » —");
{
  const r = lire("src/app/api/collectif/retrouver/route.ts");
  ok("la route repond la MEME chose que l'adresse soit connue ou non : les mails partent APRES la reponse, derriere un delai neutre",
    /after\(async \(\) => \{/.test(r) && /await delaiNeutre\(\);\s*return NextResponse\.json\(\{ ok: true \}\);/.test(r) && r.indexOf("after(async") < r.indexOf("await delaiNeutre()") && !/data\.length|trouve|inconnu/.test(r.slice(r.indexOf("await delaiNeutre()"))));
  ok("le lien ne part qu'a l'adresse du responsable, jamais pour une edition archivee, un mail par quart d'heure et par edition",
    /\.eq\("responsable_email", email\)/.test(r) && /\.is\("archive_le", null\)/.test(r) && /a: \{ email: e\.responsable_email/.test(r) && /code: `RETROUVER-\$\{quart\}`/.test(r) && /verrou: true/.test(r) && /collectifOuvert\(\)/.test(r));
  const page = lire("src/app/edition/retrouver/page.tsx") + lire("src/app/edition/retrouver/FormulaireRetrouver.tsx");
  ok("la page : rien ne pretend etre parti quand les mails sont coupes ; la reponse ne dit jamais si l'adresse est connue",
    /mailsCollectifEnService\(\)/.test(page) && /Ce service ouvre bientôt/.test(page) && /Si <strong>\{email\}<\/strong>\{" "\}est l&apos;adresse d&apos;un responsable/.test(page));
  ok("l'adresse courte /espace mene a la page, la page « lien introuvable » y renvoie, le mail « Votre espace est prêt » la cite",
    /source: "\/espace", destination: "\/edition\/retrouver"/.test(lire("next.config.ts")) && /<Link className="ec-porte-lien" href="\/edition\/retrouver">/.test(lire("src/app/edition/not-found.tsx"))
      && MailsTextes.mailEspacePret({ tu: false, organisation: "O", evenement: "E", responsable: null, lien: "https://x/edition/A", cloture: null, avecCode: false, retrouver: "bellajour.fr/espace" }).texte.includes("bellajour.fr/espace"));
  const m = MailsTextes.mailRetrouverEspace({ tu: false, organisation: "Maison Aubier", evenement: "Séminaire", responsable: "Camille Essai", lien: "https://bellajour.fr/edition/ABC" });
  ok("le mail « Votre lien » : le lien, l'evenement, aucun tiret cadratin",
    m.texte.includes("https://bellajour.fr/edition/ABC") && m.sujet.includes("Séminaire") && /Bonjour Camille,/.test(m.texte) && !/[—–]/.test(m.html + m.texte + m.sujet));
}

console.log(ko === 0 ? "\nTOUT PASSE\n" : `\n${ko} ECHEC(S)\n`);
process.exit(ko === 0 ? 0 : 1);

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
import * as Espace from "@/lib/collectif/espace";
import * as Appareil from "@/lib/collectif/appareil";
import * as Appareils from "@/lib/collectif/appareils";
import * as Accord from "@/lib/collectif/accord";
import * as CleDepot from "@/lib/collectif/cleDepot";
import * as Participant from "@/lib/collectif/participant";
import { lireInterrupteur as lireInterrupteurStyles, stylesOuverts, VAR_STYLES } from "@/lib/collectif/interrupteur";
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
import { cleFichier, compteDansPlafond, DELAI_DECLARATION_MORTE_MS, estCleFichier, lireDeclaration, LOT_DECLARATION, planDeclaration, type Existant } from "@/lib/collectif/depot";
import { groupesDoublonsRapides } from "@/lib/collectif/doublons";
import { jourDePhoto, libelleProvenance, lireFiltre, resumeDeposants } from "@/lib/collectif/grille";
import { contenusAEnvoyer, ETAPES_CLIENT, etapeClient, initiales, joursAvant, libelleRole, parler, phraseJours } from "@/lib/collectif/espace";
import { curseur, extraitDe, filDeConversation, fusionnerMessages, INTERVALLE_MESSAGES_MS, lirePieceJointe, lireTexteMessage, MESSAGE_MAX, PIECE_MAX, texteDuMessage, type Message } from "@/lib/collectif/messages";
import { libelleTypeDocument, lireSaisieDocument, nomTelechargement } from "@/lib/collectif/documents";
import { formaterHeureParis, formaterInstantParis, formaterJourParis, instantDeParis, versChampParis } from "@/lib/collectif/dates";
import { lienAbrege, liensEdition, ORIGINE_SITE, origineDepuis, origineDesMails, texteTroisLiens } from "@/lib/collectif/liens";
import { prochaineEtape } from "@/lib/collectif/prochaine";
import { phraseEvenement } from "@/lib/collectif/recit";
import { ETAPE_DU_CHAMP, ETAPES_EDITION, LIBELLE_CHAMP, lireSaisieEdition, planMagazines, rangEtapeDuChamp, type MagazineActuel } from "@/lib/collectif/saisie";
import * as Saisie from "@/lib/collectif/saisie";
import * as Calendrier from "@/lib/collectif/calendrier";
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
import * as Arrivees from "@/lib/collectif/arrivees";
import { genreFichier } from "@/lib/collectif/visionneuse";
import { aTraiter as aTraiterBoite, conversationsDe, initialesDe, quandCourt } from "@/lib/collectif/boite";
import * as Nouveaux from "@/lib/collectif/nouveaux";
import { etapesEdition } from "@/lib/collectif/prochaine";
import { messagePartage } from "@/lib/collectif/partage";
import { colonneAbsente, MIGRATION_ACCORD, MIGRATION_REVISION } from "@/lib/collectif/migration";
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
import * as Pieces from "@/app/edition/[token]/style/pieces";
import * as Demandes from "@/lib/collectif/demandes";
import * as PlafondsLot from "@/lib/collectif/plafonds";
import * as LiensLot from "@/lib/collectif/liens";
import * as DepotLot from "@/lib/collectif/depot";
import * as LivraisonLot from "@/lib/collectif/livraison";
import { contrainteRefusee, ERREUR_DEMANDES_ABSENTE, MESSAGE_DEMANDES_ABSENTE, MIGRATION_DEMANDES } from "@/lib/collectif/migration";
import { migrationDemandes, TYPE_SONDE } from "@/lib/collectif/sondeDemandes";
import { estUuid } from "@/lib/collectif/cles";
import * as Retention from "@/lib/collectif/retention";
import { racineEffacable, supprimerCoffreEdition, supprimerPrefixe } from "@/lib/atelier/r2";
import { prefixeCoffre } from "@/lib/atelier/archive";
import type { StyleMur } from "@/app/edition/[token]/donnees";

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
ok("valider_bat et terminer_collecte (D25, 19/10) sont les gestes du responsable, tous les autres sont atelier",
   (Object.keys(GESTES) as GesteCle[]).every((c) =>
     c === "valider_bat" || c === "terminer_collecte"
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
/* D27 (T-195, Mathias le 20/10 : « on ne sait pas forcément combien il y aura ») : un total VIDE
   n'est plus « non réglé », il veut dire « pas de limite pour toute l'édition ». */
const p7 = placeRestante(r({ plafond_total: null }), { role: "responsable", sansPlafond: false, dejaParAppareil: 0 }, 0);
ok("D27 : total vide = pas de limite pour l'edition ; le responsable depose sans borne", p7.illimitee);
const p7b = placeRestante(r({ plafond_total: null }), { role: "participant", sansPlafond: true, dejaParAppareil: 300 }, 50_000);
ok("D27 : total vide, un lien « sans limite » n'a plus aucune borne", p7b.illimitee);
const p7c = placeRestante(r({ plafond_total: null }), part(25), 50_000);
ok("D27 : total vide, le participant garde son plafond par personne (25/30 : 5 places, bornees par la personne)",
   !p7c.illimitee && p7c.place === 5 && p7c.borne === "plafond_participant");
const p7d = placeRestante(r({ plafond_total: null, plafond_participant_atelier: null }), part(0), 0);
ok("D27 : total vide ET plafond par personne vide : le lien general reste FERME (on ne devine pas)",
   !p7d.illimitee && p7d.place === 0 && p7d.borne === "plafond_non_regle");
ok("D27 : total vide, un lien avec son propre plafond (10) s'applique", (() => {
  const x = placeRestante(r({ plafond_total: null, plafond_participant_atelier: null }), { role: "participant", sansPlafond: false, plafondLien: 10, dejaParAppareil: 4 }, 0);
  return !x.illimitee && x.place === 6 && x.borne === "plafond_participant";
})());
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
  terminer_collecte: ["responsable"],
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
   (() => { const x = lireSaisieEdition({ ...creation, cloture_le: "2026-10-20T21:59:00.000Z" }, "creation", undefined, new Date("2026-10-01T10:00:00.000Z")); return x.ok && x.edition.cloture_le === "2026-10-20T21:59:00.000Z"; })());
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

titre("— T-186 : la cloture passee est refusee (a la creation, et en reglage seulement si elle change) —");
{
  const MAINTENANT = new Date("2026-10-19T10:00:00.000Z");
  const PASSEE = "2026-10-18T21:59:00.000Z";
  const FUTURE = "2026-11-14T22:59:00.000Z";
  const plafonds = { plafond_participant_atelier: null, plafond_participant_client: null, plafond_total: null };
  const refusCloture = (x: ReturnType<typeof lireSaisieEdition>) => !x.ok && x.erreurs.some((e) => e.champ === "cloture_le" && /déjà passée/.test(e.message));
  ok("creation : une cloture passee est refusee, nommee sur son champ",
    refusCloture(lireSaisieEdition({ ...creation, cloture_le: PASSEE }, "creation", undefined, MAINTENANT)));
  ok("creation : une cloture a l'instant meme est refusee, une cloture a venir passe, sans cloture aussi (null)",
    refusCloture(lireSaisieEdition({ ...creation, cloture_le: MAINTENANT.toISOString() }, "creation", undefined, MAINTENANT))
      && (() => { const x = lireSaisieEdition({ ...creation, cloture_le: FUTURE }, "creation", undefined, MAINTENANT); return x.ok && x.edition.cloture_le === FUTURE; })()
      && (() => { const x = lireSaisieEdition({ ...creation, cloture_le: "" }, "creation", undefined, MAINTENANT); return x.ok && x.edition.cloture_le === null; })());
  ok("reglage : une edition CLOSE reste reglable, sa cloture passee inchangee (meme minute, secondes perdues par l'ecran) n'est ni refusee ni reecrite",
    (() => {
      const x = lireSaisieEdition({ cloture_le: "2026-10-18T21:59:00.000Z", tirage: "120" }, "modification", { ...plafonds, cloture_le: "2026-10-18T21:59:41.123456+00:00" }, MAINTENANT);
      return x.ok && !("cloture_le" in x.edition) && x.edition.tirage === 120;
    })());
  ok("reglage : sans le champ cloture, rien a verifier (le tirage d'une edition close se change)",
    (() => { const x = lireSaisieEdition({ tirage: "80" }, "modification", { ...plafonds, cloture_le: PASSEE }, MAINTENANT); return x.ok && JSON.stringify(x.edition) === '{"tirage":80}'; })());
  ok("reglage : CHANGER pour une autre date passee est refuse ; pour une date a venir, ecrit",
    refusCloture(lireSaisieEdition({ cloture_le: "2026-10-17T21:59:00.000Z" }, "modification", { ...plafonds, cloture_le: PASSEE }, MAINTENANT))
      && refusCloture(lireSaisieEdition({ cloture_le: PASSEE }, "modification", { ...plafonds, cloture_le: null }, MAINTENANT))
      && (() => { const x = lireSaisieEdition({ cloture_le: FUTURE }, "modification", { ...plafonds, cloture_le: PASSEE }, MAINTENANT); return x.ok && x.edition.cloture_le === FUTURE; })());
  ok("reglage : vider la cloture reste possible (null)",
    (() => { const x = lireSaisieEdition({ cloture_le: "" }, "modification", { ...plafonds, cloture_le: FUTURE }, MAINTENANT); return x.ok && x.edition.cloture_le === null; })());
  ok("les deux routes passent l'instant present ; le PATCH lit la cloture en base pour comparer",
    /lireSaisieEdition\(corps, "creation", undefined, new Date\(\)\)/.test(lire("src/app/api/admin/collectif/editions/route.ts"))
      && /lireSaisieEdition\(corps, "modification", actuel, new Date\(\)\)/.test(lire("src/app/api/admin/collectif/editions/[id]/route.ts"))
      && /\.select\("id, plafond_participant_atelier, plafond_participant_client, plafond_total, cloture_le"\)/.test(lire("src/app/api/admin/collectif/editions/[id]/route.ts")));
  ok("l'ecran ne renvoie pas une cloture inchangee en reglage (une edition close reste reglable)",
    /const clotureChangee = creation \|\| v\.cloture_local !== props\.initiales\.cloture_local;/.test(lire("src/app/admin/collectif/FormulaireEdition.tsx"))
      && /if \(clotureChangee\) corps\.cloture_le = cloture_le;/.test(lire("src/app/admin/collectif/FormulaireEdition.tsx")));

  titre("— T-186 : la livraison souhaitee s'ecrit a la creation seulement, dans le jsonb, sans rien ecraser —");
  ok("creation : le jour devient livraison.prevue_le ; vide, rien ; illisible, refuse sur son champ",
    (() => { const x = lireSaisieEdition({ ...creation, livraison_prevue_le: "2026-12-04" }, "creation", undefined, MAINTENANT); return x.ok && JSON.stringify(x.edition.livraison) === '{"prevue_le":"2026-12-04"}'; })()
      && (() => { const x = lireSaisieEdition({ ...creation, livraison_prevue_le: "" }, "creation", undefined, MAINTENANT); return x.ok && !("livraison" in x.edition); })()
      && (() => { const x = lireSaisieEdition({ ...creation, livraison_prevue_le: "2026-02-30" }, "creation", undefined, MAINTENANT); return !x.ok && x.erreurs.some((e) => e.champ === "livraison_prevue_le"); })());
  ok("reglage : jamais `livraison` depuis ici (l'onglet Livraison FUSIONNE, l'adresse y vit)",
    (() => { const x = lireSaisieEdition({ livraison_prevue_le: "2026-12-04", tirage: "50" }, "modification", plafonds, MAINTENANT); return x.ok && !("livraison" in x.edition); })());

  titre("— T-186 : six etapes, chaque champ a la sienne, aucun chiffre invente —");
  ok("les six etapes, dans l'ordre de la planche",
    ETAPES_EDITION.map((e) => e.nom).join(" | ") === "Le client | Le calendrier | Les magazines | Les photos | À envoyer par le client | Le devis");
  ok("chaque champ de la saisie a son etape (une erreur du serveur y ramene)",
    Object.keys(LIBELLE_CHAMP).every((c) => c in ETAPE_DU_CHAMP) && rangEtapeDuChamp("cloture_le") === 1 && rangEtapeDuChamp("tirage") === 5 && rangEtapeDuChamp("inconnu") === 0);
  const formulaire = lire("src/app/admin/collectif/FormulaireEdition.tsx");
  ok("l'aide fausse est partie (D24 : le brief se compose piece par piece), « Dates de l'evenement » dit la verite",
    !/tout l&apos;intérieur suit le style|tout l'intérieur suit le style/.test(formulaire) && /pièce par pièce/.test(formulaire)
      && /Pour l'atelier seulement : elles s'affichent en tête de la fiche\./.test(formulaire) && !/tel que le client le lira/.test(formulaire));
  /* T-191 (19/10 soir) : les cinq cases sont devenues les DEMANDES (DemandesClient) ; chaque ligne
     dit en petit ce que le client voit, et la bande du bas montre sa ligne « À envoyer ». */
  ok("chaque demande dit son effet chez le client (T-191) ; vide, la clôture le dit en rouge",
    /<DemandesClient /.test(formulaire) && /<small>\{aideAtelier\(d\)\}<\/small>/.test(lire("src/app/admin/collectif/DemandesClient.tsx"))
      && /Ce que voit le client, dans « À envoyer »/.test(lire("src/app/admin/collectif/DemandesClient.tsx"))
      && /Sans date de clôture, la collecte reste ouverte jusqu'à ce que quelqu'un la ferme\./.test(formulaire));
  ok("aucun chiffre pre-rempli a la creation (la page part de champs vides)",
    (() => {
      const page = lire("src/app/admin/collectif/nouvelle/page.tsx");
      return ["plafond_participant_atelier", "plafond_total", "preselection_max", "pagination_prevue", "tirage", "tours_inclus", "nb_propositions_couverture", "couvertures_aimees_max"].every((c) => new RegExp(`${c}: "",`).test(page));
    })());
  ok("« Le devis → » ne cree PAS l'edition : le bouton suivant et « Créer l'édition » ont chacun leur cle (sinon React recycle le bouton en submit pendant le clic)",
    /key="suivante" type="button"/.test(formulaire) && /key="envoyer" type="submit"/.test(formulaire)
      && /if \(creation && etape < DERNIERE\) aller\(etape \+ 1\);/.test(formulaire));
  ok("reglages : le formulaire n'est plus dans une carte (jamais une carte dans une carte)",
    !/<section className="ate-carte">\s*<h2 className="ate-carte-titre">Réglages de l&apos;édition<\/h2>/.test(lire("src/app/admin/collectif/[id]/page.tsx")) && !/eca-fieldset/.test(formulaire));

  titre("— T-186 : le calendrier, les raccourcis de cloture, la duree —");
  ok("« Dans 2 semaines », « Dans 3 semaines », « Dans 1 mois », a 23 h 59",
    Calendrier.RACCOURCIS_CLOTURE.map((r) => r.libelle).join() === "Dans 2 semaines,Dans 3 semaines,Dans 1 mois"
      && Calendrier.pucesCloture("2026-10-19", "").map((p) => p.champ).join() === "2026-11-02T23:59,2026-11-09T23:59,2026-11-19T23:59");
  ok("un mois apres le 31 janvier : le dernier jour de fevrier, jamais le 3 mars ; les jours passent les mois et les annees",
    Calendrier.jourPlus("2026-01-31", { mois: 1 }) === "2026-02-28" && Calendrier.jourPlus("2028-01-31", { mois: 1 }) === "2028-02-29"
      && Calendrier.jourPlus("2026-12-25", { jours: 14 }) === "2027-01-08" && Calendrier.jourPlus("pas un jour", { jours: 1 }) === "");
  ok("le jour choisi qui n'est pas un raccourci se range a sa place dans le temps (la planche : « 14 novembre » entre 3 semaines et 1 mois)",
    Calendrier.pucesCloture("2026-10-19", "2026-11-14T23:59").map((p) => `${p.libelle}${p.actif ? "*" : ""}`).join() === "Dans 2 semaines,Dans 3 semaines,14 novembre*,Dans 1 mois"
      && Calendrier.pucesCloture("2026-10-19", "2026-11-02T23:59").filter((p) => p.actif).map((p) => p.libelle).join() === "Dans 2 semaines");
  ok("la duree : « 26 jours pour déposer les photos » du 19 octobre au 14 novembre ; le jour meme, « jusqu'à ce soir »",
    Calendrier.phraseDuree(Calendrier.joursEntre("2026-10-19", "2026-11-14") ?? -1) === "26 jours pour déposer les photos"
      && Calendrier.phraseDuree(1) === "1 jour pour déposer les photos" && /ce soir/.test(Calendrier.phraseDuree(0)));
  ok("l'ecriture : « 19 oct. », « 14 novembre », « 23 h 59 », un champ illisible ne donne rien",
    Calendrier.formaterJourCourt("2026-10-19") === "19 oct." && Calendrier.formaterJourLong("2026-11-14") === "14 novembre" && Calendrier.formaterHeure("23:59") === "23 h 59"
      && Calendrier.lireChampCloture("2026-11-14T23:59")?.jour === "2026-11-14" && Calendrier.lireChampCloture("2026-02-30T23:59") === null && Calendrier.champCloture("2026-11-14") === "2026-11-14T23:59");
  ok("l'instant d'un raccourci passe par l'heure de Paris (23 h 59 a Paris le 14 novembre = 22 h 59 UTC)",
    instantDeParis(Calendrier.champCloture("2026-11-14")) === "2026-11-14T22:59:00.000Z");

  titre("— T-189 : le calendrier Bellajour (planche 9), la grille, la plage, le texte —");
  const g = Calendrier.grilleMois("2026-10");
  ok("octobre 2026 : lundi d'abord, cinq semaines, du lundi 28 septembre au dimanche 1er novembre (la planche)",
    g.length === 5 && g[0][0].jour === "2026-09-28" && !g[0][0].dansLeMois && g[0][3].jour === "2026-10-01" && g[0][3].dansLeMois
      && g[4][6].jour === "2026-11-01" && !g[4][6].dansLeMois && g.every((s) => s.length === 7)
      && Calendrier.INITIALES_JOURS.join("") === "LMMJVSD" && Calendrier.titreMois("2026-10") === "Octobre 2026");
  ok("novembre 2026 a SIX semaines (le 30 est un lundi : la planche l'avait oublie) ; fevrier 2027 en a quatre ; le mois d'apres decembre est janvier",
    Calendrier.grilleMois("2026-11").length === 6 && Calendrier.grilleMois("2026-11")[5][0].jour === "2026-11-30"
      && Calendrier.grilleMois("2027-02").length === 4 && Calendrier.moisPlus("2026-12", 1) === "2027-01" && Calendrier.moisPlus("2027-01", -1) === "2026-12"
      && Calendrier.grilleMois("pas un mois").length === 0);
  ok("la plage au clic : le premier pose le debut (un seul jour, deja valable), le second la fin, un second AVANT le debut devient le debut, un troisieme recommence",
    (() => {
      const a = Calendrier.cliquerPlage(null, false, "2026-10-02");
      const b = Calendrier.cliquerPlage(a.plage, a.enAttente, "2026-10-04");
      const c = Calendrier.cliquerPlage(b.plage, b.enAttente, "2026-10-09");
      const d = Calendrier.cliquerPlage(a.plage, a.enAttente, "2026-09-30");
      const e = Calendrier.cliquerPlage(a.plage, a.enAttente, "2026-10-02");
      return JSON.stringify(a) === '{"plage":{"debut":"2026-10-02","fin":"2026-10-02"},"enAttente":true}'
        && JSON.stringify(b) === '{"plage":{"debut":"2026-10-02","fin":"2026-10-04"},"enAttente":false}'
        && JSON.stringify(c.plage) === '{"debut":"2026-10-09","fin":"2026-10-09"}' && c.enAttente
        && JSON.stringify(d.plage) === '{"debut":"2026-09-30","fin":"2026-10-02"}'
        && JSON.stringify(e.plage) === '{"debut":"2026-10-02","fin":"2026-10-02"}' && !e.enAttente;
    })());
  ok("le texte ecrit : « du 2 au 4 octobre 2026 », « le 2 octobre 2026 », « le 1er », entre deux mois, entre deux annees ; une plage a l'envers remise dans l'ordre",
    Calendrier.textePlage({ debut: "2026-10-02", fin: "2026-10-04" }) === "du 2 au 4 octobre 2026"
      && Calendrier.textePlage({ debut: "2026-10-02", fin: "2026-10-02" }) === "le 2 octobre 2026"
      && Calendrier.textePlage({ debut: "2026-10-01", fin: "2026-10-03" }) === "du 1er au 3 octobre 2026"
      && Calendrier.textePlage({ debut: "2026-09-30", fin: "2026-10-02" }) === "du 30 septembre au 2 octobre 2026"
      && Calendrier.textePlage({ debut: "2026-12-28", fin: "2027-01-03" }) === "du 28 décembre 2026 au 3 janvier 2027"
      && Calendrier.textePlage({ debut: "2026-10-04", fin: "2026-10-02" }) === "du 2 au 4 octobre 2026");
  ok("relire ce qu'on a ecrit donne la meme plage (aller-retour sur 400 plages), casse, espaces et accents toleres",
    (() => {
      for (let i = 0; i < 400; i++) {
        const debut = Calendrier.jourPlus("2026-01-01", { jours: i * 3 });
        const fin = Calendrier.jourPlus(debut, { jours: i % 45 });
        const p = Calendrier.lirePlage(Calendrier.textePlage({ debut, fin }));
        if (!p || p.debut !== debut || p.fin !== fin) return false;
      }
      return JSON.stringify(Calendrier.lirePlage("  Du 2 au 4   OCTOBRE 2026 ")) === '{"debut":"2026-10-02","fin":"2026-10-04"}'
        && JSON.stringify(Calendrier.lirePlage("du 28 decembre 2026 au 3 janvier 2027")) === '{"debut":"2026-12-28","fin":"2027-01-03"}';
    })());
  ok("un texte d'avant qui ne se relit pas reste TEL QUEL (null : rien de selectionne, rien de reecrit) ; un jour qui n'existe pas non plus",
    Calendrier.lirePlage("du 2 au 4 octobre") === null && Calendrier.lirePlage("début octobre") === null && Calendrier.lirePlage("") === null
      && Calendrier.lirePlage("le 31 novembre 2026") === null && Calendrier.lirePlage("du 4 au 2 octobre 2026") === null);
  ok("les pieds : « 3 jours », « 1 jour » ; « 26 jours pour déposer » du 19 octobre au 14 novembre, « Jusqu'à ce soir » le jour meme",
    Calendrier.phraseJoursPlage({ debut: "2026-10-02", fin: "2026-10-04" }) === "3 jours" && Calendrier.phraseJoursPlage({ debut: "2026-10-02", fin: "2026-10-02" }) === "1 jour"
      && Calendrier.phraseDepot(Calendrier.joursEntre("2026-10-19", "2026-11-14") ?? -1) === "26 jours pour déposer" && Calendrier.phraseDepot(0) === "Jusqu'à ce soir");
  ok("le clavier : fleches d'un jour ou d'une semaine, pages d'un mois (le 31 janvier + 1 mois = fin fevrier), une autre touche ne bouge rien",
    Calendrier.jourAuClavier("2026-10-31", "ArrowRight") === "2026-11-01" && Calendrier.jourAuClavier("2026-10-01", "ArrowUp") === "2026-09-24"
      && Calendrier.jourAuClavier("2026-01-31", "PageDown") === "2026-02-28" && Calendrier.jourAuClavier("2026-10-02", "a") === null
      && Calendrier.libelleJour("2026-10-02") === "vendredi 2 octobre 2026" && Calendrier.libelleJour("2026-11-01") === "dimanche 1er novembre 2026");

  const form = lire("src/app/admin/collectif/FormulaireEdition.tsx");
  const cal = lire("src/app/admin/collectif/Calendrier.tsx");
  ok("plus AUCUN champ du navigateur pour une date, une heure ou un chiffre dans le formulaire ; le calendrier Bellajour aux trois endroits",
    !/type="(date|datetime-local|time|number)"/.test(form + lire("src/app/admin/collectif/Pastille.tsx") + cal)
      && (form.match(/<Calendrier\b/g) ?? []).length === 3
      && /mode="plage"/.test(form) && (form.match(/mode="jour"/g) ?? []).length === 2
      && /onPlage=\{\(p\) => maj\("dates_texte", textePlage\(p\)\)\}/.test(form));
  ok("la cloture au calendrier : les jours passes barres (min = aujourd'hui, venu du serveur), 23 h 59 heure de Paris par champCloture, le pied le dit",
    /libelle="Clôture de la collecte"\s*aujourdhui=\{aujourdhui\}\s*min=\{aujourdhui\}/.test(form)
      && /choisirCloture\(champCloture\(jour, heureCloture\)\)/.test(form) && /const heureCloture = cloture\?\.heure \?\? HEURE_CLOTURE;/.test(form)
      && /`à \$\{formaterHeure\(heureCloture\)\}, heure de Paris`/.test(form) && /const aujourdhui = versChampParis\(props\.maintenant\)\.slice\(0, 10\);/.test(form));
  ok("le panneau : Echap et un clic dehors referment, un jour passe ne se choisit pas, aujourd'hui est marque (aria-current)",
    /e\.key !== "Escape"/.test(cal) && /addEventListener\("pointerdown", dehors\)/.test(cal) && /if \(min && jour < min\) return;/.test(cal)
      && /aria-current=\{jour === aujourdhui \? "date" : undefined\}/.test(cal) && !/setState|set[A-Z]\w*\(/.test(cal.slice(cal.indexOf("useEffect("), cal.indexOf("const semaines"))));
}

titre("— les magazines : renommer, ajouter a la suite, retirer un magazine VIDE (T-190, planche 10) —");
const actuels: MagazineActuel[] = [
  { id: "a", rang: 1, nom: "Le seminaire", vide: false },
  { id: "b", rang: 2, nom: "La soiree", vide: true },
];
const pRen = planMagazines(actuels, [{ id: "a", nom: "Le grand seminaire" }, { id: "b", nom: "La soiree" }]);
ok("renommer le premier", pRen.ok && pRen.renommer.length === 1 && pRen.renommer[0].nom === "Le grand seminaire" && !pRen.ajouter.length && !pRen.renumeroter.length);
const pAj = planMagazines(actuels, [{ id: "a", nom: "Le seminaire" }, { id: "b", nom: "La soiree" }, { id: null, nom: "Le voyage" }]);
ok("ajouter a la suite : rang 3", pAj.ok && pAj.ajouter.length === 1 && pAj.ajouter[0].rang === 3);
const pRet = planMagazines(actuels, [{ id: "a", nom: "Le seminaire" }]);
ok("retirer le dernier, vide", pRet.ok && pRet.retirer.join() === "b" && !pRet.renumeroter.length);
ok("retirer un magazine qui a un brief : refuse, en CONFLIT (409), le message le nomme et propose de le renommer",
   (() => { const p = planMagazines([{ ...actuels[0] }, { ...actuels[1], vide: false }], [{ id: "a", nom: "x" }]); return !p.ok && p.conflit === true && /« La soiree »/.test(p.message) && /Changez son nom si besoin\./.test(p.message); })());
ok("un id etranger a l'edition : refuse", !planMagazines(actuels, [{ id: "zzz", nom: "x" }]).ok);
ok("a la creation, tout s'ajoute a partir du rang 1",
   (() => { const p = planMagazines([], [{ id: null, nom: "Un" }, { id: null, nom: "Deux" }]); return p.ok && p.ajouter.map((x) => x.rang).join() === "1,2"; })());

{
  /* Rejoue un plan sur une table qui tient `unique (edition_id, rang)` : retraits, puis
     rangs un par un dans l'ordre donne, puis ajouts. Rend les rangs finaux, ou l'etape qui heurte. */
  const rejouer = (avant: MagazineActuel[], p: ReturnType<typeof planMagazines>): string => {
    if (!p.ok) return `refus : ${p.message}`;
    const table = new Map(avant.map((m) => [m.id, { rang: m.rang, nom: m.nom }]));
    const occupe = (rang: number, sauf?: string) => [...table].some(([id, m]) => id !== sauf && m.rang === rang);
    for (const id of p.retirer) table.delete(id);
    for (const r of p.renumeroter) {
      if (occupe(r.rang, r.id)) return `collision au rang ${r.rang}`;
      table.get(r.id)!.rang = r.rang;
    }
    p.ajouter.forEach((m, i) => {
      if (occupe(m.rang)) throw new Error(`collision a l'ajout, rang ${m.rang}`);
      table.set(`nouveau-${i}`, { rang: m.rang, nom: m.nom });
    });
    for (const r of p.renommer) table.get(r.id)!.nom = r.nom;
    return [...table.values()].sort((x, y) => x.rang - y.rang).map((m) => `${m.rang}:${m.nom}`).join(", ");
  };
  const trois: MagazineActuel[] = [
    { id: "e", rang: 1, nom: "Les eleves", vide: false },
    { id: "p", rang: 2, nom: "Les professeurs", vide: true },
    { id: "s", rang: 3, nom: "La soiree", vide: false },
  ];

  ok("CREATION : retirer le 2 sur 3, les numeros se resserrent (1, 2) et les noms suivent",
    (() => {
      const lignes = [{ id: null, nom: "Un", vide: true }, { id: null, nom: "Deux", vide: true }, { id: null, nom: "Trois", vide: true }];
      const restent = Saisie.retirerMagazine(lignes, 1);
      const p = planMagazines([], restent);
      return restent.map((m) => m.nom).join() === "Un,Trois" && p.ok && p.ajouter.map((m) => `${m.rang}:${m.nom}`).join() === "1:Un,2:Trois";
    })());
  ok("REGLAGES : retirer un magazine VIDE au milieu, le suivant prend son numero (rangs 1, 2), sans collision",
    (() => {
      const p = planMagazines(trois, [{ id: "e", nom: "Les eleves" }, { id: "s", nom: "La soiree" }]);
      return p.ok && p.retirer.join() === "p" && JSON.stringify(p.renumeroter) === '[{"id":"s","rang":2}]'
        && rejouer(trois, p) === "1:Les eleves, 2:La soiree";
    })());
  ok("REGLAGES : retirer un magazine COMMENCE est refuse (conflit), rien n'est prevu",
    (() => { const p = planMagazines(trois, [{ id: "e", nom: "Les eleves" }, { id: "p", nom: "Les professeurs" }]); return !p.ok && p.conflit === true && /« La soiree »/.test(p.message); })());
  ok("REGLAGES : retirer le PREMIER (vide) fait descendre tous les suivants, un par un, du plus petit au plus grand, sans collision",
    (() => {
      const quatre: MagazineActuel[] = [
        { id: "w", rang: 1, nom: "W", vide: true }, { id: "x", rang: 2, nom: "X", vide: false },
        { id: "y", rang: 3, nom: "Y", vide: true }, { id: "z", rang: 4, nom: "Z", vide: false },
      ];
      const p = planMagazines(quatre, [{ id: "x", nom: "X" }, { id: "z", nom: "Z" }]);
      return p.ok && p.renumeroter.map((r) => `${r.id}${r.rang}`).join() === "x1,z2" && rejouer(quatre, p) === "1:X, 2:Z";
    })());
  ok("REGLAGES : retirer ET ajouter dans le meme enregistrement (le nouveau prend la suite des restants)",
    (() => {
      const p = planMagazines(trois, [{ id: "e", nom: "Les eleves" }, { id: "s", nom: "La soiree" }, { id: null, nom: "Le voyage" }]);
      return p.ok && p.ajouter[0]?.rang === 3 && rejouer(trois, p) === "1:Les eleves, 2:La soiree, 3:Le voyage";
    })());
  ok("refuses : changer l'ordre, glisser un nouveau entre deux anciens, demander deux fois le meme",
    !planMagazines(trois, [{ id: "s", nom: "x" }, { id: "e", nom: "y" }, { id: "p", nom: "z" }]).ok
      && !planMagazines(trois, [{ id: "e", nom: "x" }, { id: null, nom: "n" }, { id: "p", nom: "y" }, { id: "s", nom: "z" }]).ok
      && !planMagazines(trois, [{ id: "e", nom: "x" }, { id: "e", nom: "x" }, { id: "s", nom: "z" }]).ok);
  ok("resserrerRangs : des rangs troues (1, 3, 7) redeviennent 1, 2, 3, seulement ceux qui changent, dans l'ordre",
    JSON.stringify(Saisie.resserrerRangs([{ id: "c", rang: 7 }, { id: "a", rang: 1 }, { id: "b", rang: 3 }])) === '[{"id":"b","rang":2},{"id":"c","rang":3}]');
  ok("la poubelle : un nouveau ou un vide se retire ; un commence dit pourquoi (mot pour mot la planche) ; le dernier reste",
    Saisie.retraitMagazine({ id: null, vide: true }, 2).ok && Saisie.retraitMagazine({ id: "a", vide: true }, 2).ok
      && (() => { const r = Saisie.retraitMagazine({ id: "a", vide: false }, 3); return !r.ok && r.raison === "Le client a commencé ce magazine : il ne se retire pas. Changez son nom si besoin."; })()
      && (() => { const r = Saisie.retraitMagazine({ id: null, vide: true }, 1); return !r.ok && r.raison === Saisie.RAISON_DERNIER_MAGAZINE; })()
      && Saisie.retirerMagazine([{ id: "a", vide: false }, { id: "b", vide: true }], 0).length === 2);
  const brief = (b: Partial<BriefLigne> & { bat_valide_le?: string | null } = {}) =>
    ({ style_id: null, palette_cle: null, texte: null, doubles: [], couvertures_aimees: [], brief_valide_le: null, ...b }) as BriefLigne & { bat_valide_le?: string | null };
  ok("magazineVide : rien de compose, aucun tour, rien de valide ; une seule piece, un tour ou une validation suffit a le dire commence",
    Saisie.magazineVide(brief(), 0)
      && !Saisie.magazineVide(brief(), 1)
      && !Saisie.magazineVide(brief({ typo_style_id: "s1" }), 0)
      && !Saisie.magazineVide(brief({ couvertures_aimees: [{ style_id: "s1", couverture: "c" }] }), 0)
      && !Saisie.magazineVide(brief({ texte: "equilibre" }), 0)
      && !Saisie.magazineVide(brief({ brief_valide_le: "2026-10-19T10:00:00Z" }), 0)
      && !Saisie.magazineVide(brief({ bat_valide_le: "2026-10-19T10:00:00Z" }), 0));
  ok("l'etiquette d'une ligne en reglages : « vide », « brief validé », « bon à tirer validé », « 2 tours publiés », « brief commencé »",
    Saisie.etiquetteMagazine({ vide: true, brief_valide_le: null, bat_valide_le: null, toursPublies: 0, briefCommence: false }).texte === "vide"
      && Saisie.etiquetteMagazine({ vide: false, brief_valide_le: "x", bat_valide_le: null, toursPublies: 0, briefCommence: true }).texte === "brief validé"
      && Saisie.etiquetteMagazine({ vide: false, brief_valide_le: "x", bat_valide_le: "y", toursPublies: 3, briefCommence: true }).texte === "bon à tirer validé"
      && Saisie.etiquetteMagazine({ vide: false, brief_valide_le: "x", bat_valide_le: null, toursPublies: 2, briefCommence: true }).texte === "2 tours publiés"
      && Saisie.etiquetteMagazine({ vide: false, brief_valide_le: null, bat_valide_le: null, toursPublies: 0, briefCommence: true }).texte === "brief commencé");

  const routeReglages = lire("src/app/api/admin/collectif/editions/[id]/route.ts");
  const fiche = lire("src/app/admin/collectif/donnees.ts");
  ok("la route : magazineVide (avec les tours) pour chaque magazine, 409 sur un magazine commence, la suppression redit les colonnes brutes et se compte",
    /vide: magazineVide\(m, nbTours\.get\(m\.id as string\) \?\? 0\)/.test(routeReglages)
      && /status: plan\.conflit \? 409 : 422/.test(routeReglages)
      && /\.delete\(\)\s*\.in\("id", retirer\)\s*\.eq\("edition_id", id\)\s*\.is\("brief_valide_le", null\)\s*\.is\("bat_valide_le", null\)\s*\.is\("style_id", null\)\s*\.is\("palette_cle", null\)\s*\.is\("texte", null\)\s*\.select\("id"\)/.test(routeReglages));
  ok("la route : retraits, PUIS rangs resserres un par un, PUIS ajouts (jamais deux magazines au meme rang) ; chaque retrait journalise",
    (() => {
      const iRetrait = routeReglages.indexOf(".delete()");
      const iRang = routeReglages.indexOf("update({ rang: r.rang })");
      const iAjout = routeReglages.indexOf(".insert(ajouter.map(");
      return iRetrait > 0 && iRang > iRetrait && iAjout > iRang
        && /journaliser\(supabase, \{ editionId: id \}, "magazine_retire", \{ par, nom: m\.nom, rang: m\.rang \}, qui\)/.test(routeReglages)
        && /magazines,\s*journal: journalOk/.test(routeReglages);
    })());
  ok("la fiche lit la MEME regle que la route (la poubelle et le PATCH ne se contredisent pas)",
    /vide: magazineVide\(m, t\.total\)/.test(fiche));
  ok("le journal dit le retrait en francais, sans token",
    phraseEvenement("magazine_retire", { par: "Mathias", nom: "Les professeurs", rang: 2 }) === "« Les professeurs » (magazine 2) retiré par Mathias.");
  ok("l'ecran reprend la liste ecrite par la route (un magazine ajoute ne repart pas en double au prochain « Enregistrer »)",
    /reprendreMagazines\(json\.magazines\);/.test(lire("src/app/admin/collectif/FormulaireEdition.tsx")));

  titre("— T-190 : les chiffres en pastille, et ou va le message d'accueil (planche 11) —");
  const formP = lire("src/app/admin/collectif/FormulaireEdition.tsx");
  const pastille = lire("src/app/admin/collectif/Pastille.tsx");
  const depotPage = lire("src/app/depot/[token]/page.tsx");
  ok("les valeurs rapides : 10, 20, 30, 50 pour les photos par personne, nulle part ailleurs ; jamais une valeur par defaut",
    JSON.stringify(Saisie.VALEURS_RAPIDES) === '{"plafond_participant_atelier":[10,20,30,50]}'
      && /plafond_participant_atelier: "",/.test(lire("src/app/admin/collectif/nouvelle/page.tsx")));
  ok("la pastille : chiffres seulement, vide reste vide (null en base), « − » ne descend pas sous le minimum, l'unite dans la pastille",
    /replace\(\/\\D\/g, ""\)/.test(pastille) && /disabled=\{n === null \|\| n <= plancher\}/.test(pastille)
      && /n === null \? null : <span className="eca-fm-pas-unite">\{p\.unite\}<\/span>/.test(pastille) && /inputMode="numeric"/.test(pastille)
      && (() => { const x = lireSaisieEdition({ ...creation, plafond_total: "" }, "creation"); return x.ok && x.edition.plafond_total === null; })());
  ok("le message d'accueil : l'aide dit ou il s'affiche, et la phrase par defaut est MOT POUR MOT celle de la page des participants (vous et tu)",
    /Il s'affiche sous le nom de l'événement, sur la page qu'ouvrent les participants avec le lien ou le QR code\. Vide : « \$\{accueilParDefaut\(v\.registre\)\} »/.test(formP)
      && depotPage.includes(`'${Saisie.accueilParDefaut("entreprise_vous")}'`) && depotPage.includes(`'${Saisie.accueilParDefaut("ecole_tu")}'`));
  ok("l'apercu suit la frappe (les valeurs du formulaire, rien lu en base), avec le nom, l'invitation, le prenom et le bouton",
    /<ApercuDepot organisation=\{v\.organisation\} evenement=\{v\.evenement\} message=\{v\.invitation_texte\} registre=\{v\.registre\} \/>/.test(formP)
      && (() => { const a = lire("src/app/admin/collectif/ApercuDepot.tsx"); return /vous invite/.test(a) && /t’invite/.test(a) && /Votre prénom et votre nom \(facultatif\)/.test(a) && /eca-fm-tel-bouton/.test(a) && !/supabase|fetch\(/.test(a) && !/#[0-9a-f]{3,8}\b/i.test(a); })());
}

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
ok("la case d'accord des participants porte le texte CHOISI par Mathias le 17/10 (version complete), plus aucun [À FIXER] sur la page de depot",
   (() => {
     const d = lire("src/app/depot/[token]/Depot.tsx");
     return /J&apos;accepte que Bellajour utilise ces photos pour composer le magazine « \{props\.evenement\} » \{deNom\(props\.organisation\)\}, et je confirme\s+avoir le droit de les partager, y compris pour les personnes qu&apos;on y voit\./.test(d)
       && !/\[À FIXER\]/.test(d.replace(/\/\*[\s\S]*?\*\//g, "")) && /disabled=\{!accord \|\| !nomPret\}/.test(d)
       && Espace.deNom("SKEMA") === "de SKEMA" && Espace.deNom("Air France") === "d'Air France" && Espace.deNom("Essai neuf") === "d'Essai neuf" && Espace.deNom("Hermès") === "de Hermès";
   })());
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
  ok("le mur : tout en vrac, les categories rangees par les choix, la composition en barre et en feuille (T-179)",
    /piecesEnVrac\(p\.styles\)/.test(mur) && /grouperParChoix\(/.test(mur) && /<BarreComposition\b/.test(mur) && /<FeuilleComposition\b/.test(mur) && /Votre composition/.test(lire("src/app/edition/[token]/style/Composition.tsx")));
  ok("modifier une partie : un panneau lateral, le choix en haut, « Terminé »",
    /<Fenetre\s+cote/.test(mur) && /Votre choix reste en haut/.test(mur) && /Terminé/.test(mur) && /partieInitiale=\{partie\}/.test(lire("src/app/edition/[token]/style/brief/page.tsx")));
  ok("la regle du 08/10 n'est plus ecrite a l'ecran",
    !fichiersParSuffixe("src/app/edition", /\.tsx?$/).some((f) => /seule la couverture peut venir|L'intérieur suit ce style|ce style en dessine tout l/.test(lire(f))));
  const fiche = lire("src/app/edition/[token]/style/[slug]/FicheStyle.tsx");
  ok("un style en detail : la barre d'etapes et ses quatre ancres, « Prendre tout le style »", ["ec-etape-1", "ec-etape-2", "ec-etape-3", "ec-etape-4"].every((x) => fiche.includes(`"${x}"`)) && fiche.includes("ec-fiche-etapes") && /Prendre tout le style/.test(fiche));
  ok("l'atelier voit le style de chaque piece (T-185 : chaque piece du brief dit son style, sous sa vignette)", /typos: c\.typos \?/.test(lire("src/app/admin/collectif/donnees.ts")) && /styles mêlés : \$\{m\.brief\.styles\.join/.test(lire("src/app/admin/collectif/[id]/page.tsx")) && /className="eca-piece-style"/.test(lire("src/app/admin/collectif/[id]/page.tsx")));
  ok("un magazine compose n'est jamais « vide » (il ne se retire pas)",
    /const c = compositionDu\(m\);\s*return \(\s*stylesDeLaComposition\(c\)\.length === 0 &&/.test(lire("src/lib/collectif/saisie.ts"))
      && /vide: magazineVide\(m, nbTours\.get\(m\.id as string\) \?\? 0\)/.test(lire("src/app/api/admin/collectif/editions/[id]/route.ts")));
}

titre("— T-179 : la composition en images ; chaque geste se dit et s'annule —");
{
  const riviera: StyleMur = {
    id: "s1", slug: "riviera", nom: "Riviera", description: null,
    palettes: [{ cle: "sable", nom: "Sable", couleurs: ["#e9dcc6", "#1d3557", "#2f5d8a", "#f6efe3"] }, { cle: "marine", nom: "Marine", couleurs: ["#1d3557", "#f6efe3", "#7fa7c9", "#2f5d8a"] }],
    typos: { titres: "Fraunces", texte: "DM Sans", echantillon: "https://exemple.test/echantillon.webp" },
    couvertures: [{ cle: "c1", url: "https://exemple.test/c1.webp", legende: "" }, { cle: "c2", url: null, legende: "" }],
    doubles: [{ type: "aeree", url: "https://exemple.test/aeree.webp", legende: "" }, { type: "dense", url: "https://exemple.test/dense.webp", legende: "" }],
  };
  const archive: StyleMur = {
    id: "s2", slug: "archive", nom: "Archive", description: null,
    palettes: [{ cle: "sable", nom: "Sable", couleurs: ["#efe6d6", "#3b2f25", "#8a6a4b", "#d8c7ad"] }],
    typos: { titres: "Bodoni Moda", texte: "DM Sans", echantillon: null },
    couvertures: [{ cle: "a1", url: "https://exemple.test/a1.webp", legende: "" }],
    doubles: [{ type: "recit", url: "https://exemple.test/recit.webp", legende: "" }],
  };
  const styles = [riviera, archive];
  const vierge: BriefLigne = { style_id: null, palette_cle: null, texte: null, doubles: [], couvertures_aimees: [], brief_valide_le: null };
  const b0: BriefLigne = { ...vierge, palette_style_id: "s1", palette_cle: "sable", texte: "peu", couvertures_aimees: [{ style_id: "s1", couverture: "c1" }], doubles_aimes: [{ style_id: "s2", double: "recit" }], doubles: ["recit"] };
  const c0 = compositionDu(b0);
  const appliquer = (b: BriefLigne, g: Pieces.Geste): BriefLigne => {
    const r = Pieces.preparerGeste(g, b, styles, 3, "2026-10-19T12:00:00.000Z");
    if (!r.ok) throw new Error(r.message);
    return { ...b, ...r.patch };
  };
  const memeComposition = (a: BriefLigne, b: BriefLigne) => JSON.stringify(compositionDu(a)) === JSON.stringify(compositionDu(b));

  ok("le nombre de pieces exigees vient de manquesBrief (rien n'est compte a la main)", Pieces.PIECES_EXIGEES === manquesBrief(vierge).length && Pieces.PIECES_EXIGEES === 4);
  ok("l'etat d'un magazine dans le bandeau : « À composer », « Brief validé », « N pièces sur M exigées »",
    Pieces.etatDuMagazine(vierge) === "À composer"
    && Pieces.etatDuMagazine({ ...b0, brief_valide_le: "2026-10-19T10:00:00Z" }) === "Brief validé"
    && Pieces.etatDuMagazine(b0) === "3 pièces sur 4 exigées"
    && Pieces.etatDuMagazine({ ...vierge, texte: "peu" }) === "1 pièce sur 4 exigées"
    && Pieces.etatDuMagazine({ ...vierge, couvertures_aimees: [{ style_id: "s1", couverture: "c1" }] }) === "0 pièce sur 4 exigées");
  ok("la ligne de la barre : ce qui manque (manquesBrief), puis les styles meles",
    Pieces.ligneDeLaBarre(b0) === "Il manque les typographies. 2 styles mêlés."
    && Pieces.ligneDeLaBarre(vierge) === "Il manque la palette, les typographies, la place du texte et au moins une double page."
    && Pieces.ligneDeLaBarre({ ...b0, typo_style_id: "s1", doubles_aimes: [{ style_id: "s1", double: "aeree" }], couvertures_aimees: [] }) === "Tout ce qu'il faut est choisi."
    && Pieces.ligneDeLaBarre({ ...b0, typo_style_id: "s1", brief_valide_le: "2026-10-19T10:00:00Z" }) === "Brief validé. 2 styles mêlés.");
  ok("une liste en francais : « a », « a et b », « a, b et c »",
    Pieces.listeEnFrancais([]) === "" && Pieces.listeEnFrancais(["a"]) === "a" && Pieces.listeEnFrancais(["a", "b"]) === "a et b" && Pieces.listeEnFrancais(["a", "b", "c"]) === "a, b et c");
  ok("la phrase des styles meles (planche 2), vous et tu",
    Pieces.phraseDesStyles(["Riviera", "Éditorial", "Brut"], true) === "Trois styles mêlés : Riviera, Éditorial, Brut. L'atelier accorde l'ensemble et te le montre au bon à tirer."
    && Pieces.phraseDesStyles(["Riviera", "Brut"], false).endsWith("et vous le montre au bon à tirer.")
    && Pieces.phraseDesStyles(["Riviera"], true) === "Tout vient du style Riviera."
    && Pieces.phraseDesStyles([], false).startsWith("Rien de choisi"));
  const vu = Pieces.visuelsDe(c0, styles);
  ok("la composition en images : chaque piece avec son image ou ses couleurs, et son style",
    vu.couvertures[0]?.url === "https://exemple.test/c1.webp" && vu.couvertures[0].style === "Riviera"
    && vu.palette?.nom === "Sable" && vu.palette.style === "Riviera" && vu.palette.couleurs.length === 4
    && vu.typos === null
    && vu.doubles[0]?.libelle === "Récit" && vu.doubles[0].style === "Archive" && vu.doubles[0].url === "https://exemple.test/recit.webp"
    && Pieces.visuelsDe({ ...c0, typos: { style_id: "s2" } }, styles).typos?.polices === "Bodoni Moda et DM Sans");
  ok("une piece d'un style retire du mur se nomme sans mentir", Pieces.visuelsDe({ ...c0, couvertures: [{ style_id: "zz", couverture: "x" }] }, styles).couvertures[0]?.style === "un style retiré du mur");

  const couvC1 = { genre: "couverture" as const, style_id: "s1", cle: "c1" };
  ok("le geste d'une piece : retirer une couverture aimee, aimer une autre ; rien pour la palette deja choisie",
    JSON.stringify(Pieces.gesteDeLaPiece(couvC1, c0)) === JSON.stringify({ quoi: "couverture", style_id: "s1", cle: "c1", ajouter: false })
    && (Pieces.gesteDeLaPiece({ genre: "couverture", style_id: "s2", cle: "a1" }, c0) as { ajouter: boolean }).ajouter === true
    && Pieces.gesteDeLaPiece({ genre: "palette", style_id: "s1", cle: "sable" }, c0) === null
    && Pieces.gesteDeLaPiece({ genre: "palette", style_id: "s1", cle: "marine" }, c0)?.quoi === "palette"
    && Pieces.gesteDeLaPiece({ genre: "typos", style_id: "s2", cle: "" }, c0)?.quoi === "typos");

  ok("l'annonce : « Palette Marine ajoutée. Elle remplace Sable. »",
    Pieces.annonceDuGeste({ quoi: "palette", style_id: "s1", cle: "marine" }, c0, styles, false, 1) === "Palette Marine ajoutée. Elle remplace Sable.");
  ok("l'annonce : une premiere palette ne remplace rien",
    Pieces.annonceDuGeste({ quoi: "palette", style_id: "s1", cle: "marine" }, compositionDu(vierge), styles, false, 1) === "Palette Marine ajoutée.");
  ok("l'annonce : deux palettes du meme nom se distinguent par leur style",
    Pieces.annonceDuGeste({ quoi: "palette", style_id: "s2", cle: "sable" }, c0, styles, false, 1) === "Palette Sable (Archive) ajoutée. Elle remplace Sable (Riviera).");
  ok("l'annonce : « Couverture aimée. », « Double page Dense retirée. », les typographies remplacees",
    Pieces.annonceDuGeste({ quoi: "couverture", style_id: "s2", cle: "a1", ajouter: true }, c0, styles, false, 1) === "Couverture aimée."
    && Pieces.annonceDuGeste({ quoi: "double", style_id: "s1", cle: "dense", ajouter: false }, c0, styles, false, 1) === "Double page Dense retirée."
    && Pieces.annonceDuGeste({ quoi: "typos", style_id: "s2" }, { ...c0, typos: { style_id: "s1" } }, styles, false, 1) === "Typographies Bodoni Moda et DM Sans ajoutées. Elles remplacent Fraunces et DM Sans.");
  ok("l'annonce : la place du texte, la validation ; un brief valide qui change le dit",
    Pieces.annonceDuGeste({ quoi: "texte", texte: "beaucoup" }, c0, styles, false, 1) === "Place du texte : « Beaucoup de texte ». Elle remplace « Un peu de texte »."
    && Pieces.annonceDuGeste({ quoi: "valider" }, c0, styles, false, 2) === "Brief du magazine 2 validé."
    && Pieces.annonceDuGeste({ quoi: "couverture", style_id: "s2", cle: "a1", ajouter: true }, c0, styles, true, 1) === "Couverture aimée. Le brief est à revalider.");

  ok("l'inverse : l'ancienne palette, les anciennes typographies, l'ancienne place du texte",
    JSON.stringify(Pieces.gesteInverse({ quoi: "palette", style_id: "s1", cle: "marine" }, c0)) === JSON.stringify({ quoi: "palette", style_id: "s1", cle: "sable" })
    && JSON.stringify(Pieces.gesteInverse({ quoi: "typos", style_id: "s2" }, { ...c0, typos: { style_id: "s1" } })) === JSON.stringify({ quoi: "typos", style_id: "s1" })
    && JSON.stringify(Pieces.gesteInverse({ quoi: "texte", texte: "beaucoup" }, c0)) === JSON.stringify({ quoi: "texte", texte: "peu" }));
  ok("l'inverse : rien quand il n'y avait rien avant (aucun geste n'efface une palette), ni quand rien ne change",
    Pieces.gesteInverse({ quoi: "palette", style_id: "s1", cle: "marine" }, compositionDu(vierge)) === null
    && Pieces.gesteInverse({ quoi: "typos", style_id: "s1" }, c0) === null
    && Pieces.gesteInverse({ quoi: "texte", texte: "peu" }, c0) === null
    && Pieces.gesteInverse({ quoi: "palette", style_id: "s1", cle: "sable" }, c0) === null
    && Pieces.gesteInverse({ quoi: "couverture", style_id: "s1", cle: "c1", ajouter: true }, c0) === null);
  ok("l'inverse : retirer ce qui a ete ajoute, rajouter ce qui a ete retire, rouvrir ce qui a ete valide",
    (Pieces.gesteInverse({ quoi: "couverture", style_id: "s2", cle: "a1", ajouter: true }, c0) as { ajouter: boolean }).ajouter === false
    && (Pieces.gesteInverse({ quoi: "double", style_id: "s2", cle: "recit", ajouter: false }, c0) as { ajouter: boolean }).ajouter === true
    && Pieces.gesteInverse({ quoi: "valider" }, c0)?.quoi === "devalider" && Pieces.gesteInverse({ quoi: "devalider" }, c0)?.quoi === "valider");

  const allerRetour = (g: Pieces.Geste) => {
    const apres = appliquer(b0, g);
    const inv = Pieces.gesteInverse(g, c0);
    return inv !== null && memeComposition(appliquer(apres, inv), b0) && !memeComposition(apres, b0);
  };
  ok("« Annuler » rend la composition d'avant : palette, typographies, texte, couverture, double page (aller puis retour par les memes regles)",
    allerRetour({ quoi: "palette", style_id: "s2", cle: "sable" })
    && (() => { const b1 = { ...b0, typo_style_id: "s1" }; const g: Pieces.Geste = { quoi: "typos", style_id: "s2" }; const inv = Pieces.gesteInverse(g, compositionDu(b1)); return inv !== null && memeComposition(appliquer(appliquer(b1, g), inv), b1); })()
    && allerRetour({ quoi: "texte", texte: "photos" })
    && allerRetour({ quoi: "couverture", style_id: "s2", cle: "a1", ajouter: true })
    && allerRetour({ quoi: "couverture", style_id: "s1", cle: "c1", ajouter: false })
    && allerRetour({ quoi: "double", style_id: "s1", cle: "aeree", ajouter: true })
    && allerRetour({ quoi: "double", style_id: "s2", cle: "recit", ajouter: false }));

  const pal = Pieces.preparerGeste({ quoi: "palette", style_id: "s1", cle: "marine" }, { ...b0, brief_valide_le: "2026-10-19T10:00:00Z" }, styles, 3, "t");
  ok("le geste part comme avant vers la route (action piece) et remet le brief a valider",
    pal.ok && JSON.stringify(pal.corps) === JSON.stringify({ action: "piece", genre: "palette", styleId: "s1", palette_cle: "marine" }) && pal.patch.palette_style_id === "s1" && pal.patch.brief_valide_le === null);
  const couv = Pieces.preparerGeste({ quoi: "couverture", style_id: "s2", cle: "a1", ajouter: true }, b0, styles, 3, "t");
  ok("aimer une couverture : action couverture, la liste par patchCouvertures",
    couv.ok && JSON.stringify(couv.corps) === JSON.stringify({ action: "couverture", styleId: "s2", couverture: "a1", aimer: true }) && (couv.patch.couvertures_aimees ?? []).length === 2);
  ok("les refus sont ceux de brief.ts, avant tout envoi : plafond des couvertures, plafond non regle, style retire, cinq doubles pages",
    (() => { const r = Pieces.preparerGeste({ quoi: "couverture", style_id: "s2", cle: "a1", ajouter: true }, b0, styles, 1, "t"); return !r.ok && r.message.includes("1 couverture au plus"); })()
    && (() => { const r = Pieces.preparerGeste({ quoi: "couverture", style_id: "s2", cle: "a1", ajouter: true }, b0, styles, null, "t"); return !r.ok && r.message.includes("pas encore réglé"); })()
    && (() => { const r = Pieces.preparerGeste({ quoi: "palette", style_id: "zz", cle: "x" }, b0, styles, 3, "t"); return !r.ok && r.message === "Ce style n'est pas sur le mur."; })()
    && (() => { const plein: BriefLigne = { ...b0, doubles_aimes: ["aeree", "equilibree", "dense", "recit", "audacieuse"].map((d) => ({ style_id: "s9", double: d as "aeree" })) }; const r = Pieces.preparerGeste({ quoi: "double", style_id: "s1", cle: "aeree", ajouter: true }, plein, styles, 3, "t"); return !r.ok && r.message.includes("5 doubles pages au plus"); })());
  ok("valider : refuse tant qu'il manque une piece (manquesBrief, la regle de la route), sinon la date du clic",
    (() => { const r = Pieces.preparerGeste({ quoi: "valider" }, b0, styles, 3, "t"); return !r.ok && r.message === "Il manque les typographies."; })()
    && (() => { const r = Pieces.preparerGeste({ quoi: "valider" }, { ...b0, typo_style_id: "s1" }, styles, 3, "2026-10-19T12:00:00.000Z"); return r.ok && r.patch.brief_valide_le === "2026-10-19T12:00:00.000Z" && r.corps.action === "valider"; })());

  const mur = lire("src/app/edition/[token]/style/Mur.tsx");
  const compo = lire("src/app/edition/[token]/style/Composition.tsx");
  const carte = lire("src/app/edition/[token]/style/CartePiece.tsx");
  const css = lire("src/app/edition/[token]/style/style.css");
  ok("la colonne « Votre composition » est partie (archivee), le mur prend toute la largeur",
    !/ec-mur-brief|ec-mur-lignes/.test(mur) && !/minmax\(0, 1fr\) 340px/.test(css) && existsSync(resolve(RACINE, "archive/composition-colonne-2026-10/README.md")));
  ok("la barre : en images, l'etat, « Voir ma composition » ; collee en bas sur telephone",
    /ligneDeLaBarre\(b\)/.test(mur) && /Voir ma composition/.test(compo) && /ec-mur-mini-vide/.test(compo) && /\.ec-mur-bas \{\s*position: sticky;\s*bottom: 8px;/.test(css));
  ok("l'annonce dit chaque geste (role status) et « Annuler » rejoue l'inverse par le meme chemin",
    /role="status"/.test(compo) && /Annuler/.test(compo) && /jouer\(annonce\.inverse, annonce\.magId, false\)/.test(mur) && /preparerGeste\(g, bl,/.test(mur) && /void envoyer\(magId, pret\.corps, pret\.patch\)/.test(mur));
  ok("la feuille : portail dans .ec-contenu, « Modifier » par case, valider en bas, ou rouvrir et passer au suivant",
    /document\.querySelector\("\.ec-contenu"\)/.test(compo) && /onModifier\(partie\)/.test(compo) && /Valider le brief du magazine/.test(compo) && /Rouvrir le brief/.test(compo) && /Passer au magazine/.test(compo) && /Continuer à composer/.test(compo));
  ok("une piece choisie se voit de loin : sceau, « Retirer », « Choisie » ; « Aimer », « Prendre », ce qu'elle remplacera",
    /Dans ta composition/.test(carte) && /Ta palette/.test(carte) && /Tes typographies/.test(carte) && /"Retirer"/.test(carte) && /"Aimer"/.test(carte) && /"Prendre"/.test(carte) && /Choisie/.test(carte) && /Remplacera ta palette/.test(mur));
  ok("le bandeau des magazines dit l'etat par etatDuMagazine", /etatDuMagazine\(briefs\[m\.id\]\)/.test(mur));
  ok("lecture seule et cloture : aucun geste, la feuille se lit", /if \(!bl \|\| !m \|\| !peutAgir\) return;/.test(mur) && /Lecture seule : vous voyez tout/.test(compo) && /La collecte est close/.test(compo));
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
    /provenance: this\.provenance,\n(\s*accord: this\.accord,\n)?\s*\}\);/.test(moteur) && /provenance: premier\.provenance/.test(moteur) && !/provenance: this\.provenance,\n\s*fichiers/.test(moteur));
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
    /planDeplacement\(source, dans, arbre\)/.test(route) && /nouveauChemin\(cheminDe\(l, edition\.responsable_nom\)\.chemin, avant, apres\)/.test(route) && /for \(const paquet of enPaquets\(ids\)\)/.test(route) && /\.eq\("edition_id", edition\.id\)\s*\.in\("id", paquet\)/.test(route) && /"dossier_range"/.test(route));
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
  const vueEnsemble = fiche.slice(fiche.indexOf("const apercu = ("), fiche.indexOf("\n  return (", fiche.indexOf("const apercu = (")));
  ok("fiche en cartes : TROIS cartes dans la vue d'ensemble, chacune avec son lien en tete, plus de resumes en lignes",
    (vueEnsemble.match(/<section className="eca-carte">/g) ?? []).length === 3 && (vueEnsemble.match(/className="eca-carte-tete"/g) ?? []).length === 3 && !/const resume = /.test(fiche) && !/eca-apercu/.test(fiche));
  /* T-185 (19/10, planche 7) : les onglets aussi sont en cartes de la vue d'ensemble. */
  const panneaux = ["PanneauCollecte", "PanneauDocuments", "PanneauContenus", "PanneauRendezVous", "PanneauLivraison"].map((f) => lire(`src/app/admin/collectif/[id]/${f}.tsx`));
  ok("T-185 : les onglets Magazines, Photos, Documents, Rendez-vous, Livraison, Journal en cartes de la vue d'ensemble, sans style en ligne ni ancienne carte",
    panneaux.every((t) => /className="eca-carte(?: [a-z-]+)?"/.test(t) && !/ate-carte/.test(t)) && !/style=\{\{/.test(panneaux[0] + panneaux[1])
      && /magazines: \(\s*<div className="eca-cartes eca-cartes--deux">/.test(fiche) && /<h2 className="eca-carte-titre">Journal<\/h2>/.test(fiche) && /className="eca-pieces"/.test(fiche));
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
  const liens = {
    responsable: "https://bellajour.fr/edition/RESPONSABLEAAAAAAAAAAAAAAAAAAAAA",
    equipe: "https://bellajour.fr/edition/EQUIPEBBBBBBBBBBBBBBBBBBBBBBBBBB",
    depot: "https://bellajour.fr/depot/DEPOTCCCCCCCCCCCCCCCCCCCCCCCCCCC",
  };
  const base = { organisation: "Maison Aubier", evenement: "Séminaire d'automne", responsable: "Camille Essai", liens, cloture: "28 octobre", avecCode: false };
  const vous = textes.mailEspacePret({ ...base, tu: false });
  const toi = textes.mailEspacePret({ ...base, tu: true });
  const avecCode = textes.mailEspacePret({ ...base, tu: false, avecCode: true });
  ok("« Votre espace est prêt » : l'evenement dans l'objet, vous ou tu, Bonjour + prenom",
    vous.sujet === "Votre espace Bellajour est prêt, Séminaire d'automne" && toi.sujet.startsWith("Ton") && /Bonjour Camille,/.test(vous.texte)
      && /L'espace de votre édition « Séminaire d'automne » est ouvert\. Voici vos trois liens\./.test(vous.texte) && /Voici tes trois liens\./.test(toi.texte));
  ok("T-187 : les TROIS liens, separes, dans le HTML ET le texte (planche 6), le sien en bouton, les deux autres en adresse lisible",
    [vous, toi].every((m) => Object.values(liens).every((l) => m.html.includes(l) && m.texte.includes(l)))
      && (vous.html.match(/Ouvrir mon espace/g) ?? []).length === 1 && vous.html.includes(`>${liens.equipe}</a>`) && vous.html.includes(`>${liens.depot}</a>`)
      && vous.texte.indexOf("Votre lien") < vous.texte.indexOf("Le lien de votre équipe") && vous.texte.indexOf("Le lien de votre équipe") < vous.texte.indexOf("Le lien des participants"));
  ok("T-187 : les mots de la planche, en vous et en tu (garder le sien, transferer celui de l'equipe, le QR dans l'espace, la cloture)",
    /Pour tout faire : photos, style, bon à tirer\. Gardez-le pour vous\./.test(vous.texte) && /Lecture seule\. Transférez-le à vos collègues\./.test(vous.texte)
      && /Pour que chacun dépose ses photos, jusqu'au 28 octobre\. Le QR code est dans votre espace\./.test(vous.texte)
      && /Ton lien/.test(toi.texte) && /Garde-le pour toi\./.test(toi.texte) && /Le lien de ton équipe/.test(toi.texte) && /Transfère-le à tes collègues\./.test(toi.texte) && /dans ton espace\./.test(toi.texte)
      && !/votre|vous/i.test(toi.texte.replace(/Bellajour/g, "")) && /Pour que chacun dépose ses photos\. Le QR/.test(textes.mailEspacePret({ ...base, cloture: null, tu: false }).texte));
  ok("« Votre espace est prêt » : aucun tiret cadratin ni demi-cadratin, rien n'est injecte sans echappement (texte ET adresses)",
    ![vous, toi, avecCode].some((m) => /[—–]/.test(m.html + m.texte + m.sujet)) && textes.mailEspacePret({ ...base, tu: false, evenement: "<script>" }).html.includes("&lt;script&gt;")
      && (() => { const m = textes.mailEspacePret({ ...base, tu: false, liens: { ...liens, equipe: 'https://x/edition/"><img src=x>' } }); return !m.html.includes('"><img') && m.html.includes("&quot;&gt;&lt;img"); })());
  ok("« Votre espace est prêt » : le code par appareil n'est annonce QUE quand il est en service (T-154)",
    !/un code/.test(vous.texte) && /un code/.test(avecCode.texte));
  const donnees = textes.donneesEspacePret(
    { token_responsable: "R".repeat(32), token_equipe: "E".repeat(32), token_depot: "D".repeat(32), registre: "ecole_tu", organisation: "Lycée", evenement: "Promo", responsable_nom: "Claire Dubois", cloture_le: "2026-11-14T22:59:00.000Z" },
    "https://bellajour.fr",
    false
  );
  ok("T-187 : la route et l'ecran lisent les TROIS liens par liensEdition (donneesEspacePret), la cloture a l'heure de Paris, l'adresse courte",
    donnees.liens.responsable === `https://bellajour.fr/edition/${"R".repeat(32)}` && donnees.liens.equipe === `https://bellajour.fr/edition/${"E".repeat(32)}` && donnees.liens.depot === `https://bellajour.fr/depot/${"D".repeat(32)}`
      && donnees.tu && donnees.cloture === "14 novembre" && donnees.retrouver === "bellajour.fr/espace");
  const circuit = lire("src/lib/collectif/mails.ts");
  ok("circuit : coupe par defaut (COLLECTIF_MAILS, ATELIER_MAILS_COUPES), verrou AVANT Brevo et RETIRE si Brevo refuse ou si le reseau tombe, journal",
    /export const VAR_MAILS_COLLECTIF = "COLLECTIF_MAILS";/.test(circuit) && circuit.indexOf("lireInterrupteur(process.env[VAR_MAILS_COLLECTIF]).ouvert") < circuit.indexOf("fetch(BREVO_SMTP_URL")
      && circuit.indexOf('from("collectif_mails").insert') < circuit.indexOf("fetch(BREVO_SMTP_URL") && (circuit.match(/await retirer\(\);/g) ?? []).length === 2 && /"mail_envoye"/.test(circuit) && /"mail_echec"/.test(circuit));
  const routeMail = lire("src/app/api/admin/collectif/editions/[id]/mail-espace/route.ts");
  ok("route du mail : admin revérifié, « verifier » ne fait rien partir, une edition archivee ne recoit rien, le verrou suit le lien (regenerer permet de renvoyer)",
    /quiEstConnecteRequete\(request\)/.test(routeMail) && routeMail.indexOf("corps.verifier === true") < routeMail.indexOf("envoyerMailCollectif({") && /archive_le\) return/.test(routeMail) && /createHash\("sha256"\)\.update\(p\.edition\.token_responsable\)/.test(routeMail));
  ok("T-187 : la route lit les trois tokens et passe les TROIS liens au gabarit (donneesEspacePret, liensEdition)",
    /token_responsable, token_equipe, token_depot/.test(routeMail) && /mailEspacePret\(donneesEspacePret\(data, origine, controleAppareilActif\(process\.env\)\)\)/.test(routeMail)
      && /liens: liensEdition\(origine, e\)/.test(lire("src/lib/collectif/mailsTextes.ts")) && !/lien: liensEdition/.test(routeMail));
  ok("T-187 : le journal ne garde JAMAIS un token (code = empreinte, adresse masquee, aucun lien passe a journaliser)",
    /code = corps\.renvoyer === true \? `ESPACE-\$\{empreinte\}-R/.test(routeMail) && !/journaliser/.test(routeMail)
      && (circuit.match(/journaliser\([^)]*\)/g) ?? []).every((j) => !/lien|token|mail\.html|mail\.texte/.test(j)) && /a: adresseMasquee\(p\.a\.email\)/.test(circuit));
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
  ok("le code d'essai ne vaut QUE pour un host localhost, jamais bellajour.fr ni une version d'essai (T-164 : le host brut, plus une origine)",
    (() => {
      const env = { COLLECTIF_CODE_ESSAI: "246810" };
      return Appareils.codeNeuf("localhost:3007", env) === "246810" && Appareils.codeNeuf("127.0.0.1:3000", env) === "246810" && Appareils.codeNeuf("localhost", env) === "246810"
        && Appareils.codeNeuf("www.bellajour.fr", env) !== "246810" && Appareils.codeNeuf("bellajour-prelaunch-git-x.vercel.app", env) !== "246810"
        && Appareils.codeNeuf("localhost.evil.fr", env) !== "246810" && Appareils.codeNeuf("http://localhost:3007", env) !== "246810" && Appareils.codeNeuf(null, env) !== "246810"
        && /^\d{6}$/.test(Appareils.codeNeuf("www.bellajour.fr", {}));
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
      && MailsTextes.mailEspacePret({ tu: false, organisation: "O", evenement: "E", responsable: null, liens: { responsable: "https://x/edition/A", equipe: "https://x/edition/B", depot: "https://x/depot/C" }, cloture: null, avecCode: false, retrouver: "bellajour.fr/espace" }).texte.includes("bellajour.fr/espace"));
  const m = MailsTextes.mailRetrouverEspace({ tu: false, organisation: "Maison Aubier", evenement: "Séminaire", responsable: "Camille Essai", lien: "https://bellajour.fr/edition/ABC" });
  ok("le mail « Votre lien » : le lien, l'evenement, aucun tiret cadratin",
    m.texte.includes("https://bellajour.fr/edition/ABC") && m.sujet.includes("Séminaire") && /Bonjour Camille,/.test(m.texte) && !/[—–]/.test(m.html + m.texte + m.sujet));
}

titre("— T-164 / T-166 : les liens des mails viennent du site, « Retrouver » a son frein —");
{
  ok("T-164 : l'origine des mails est celle du site (NEXT_PUBLIC_SITE_URL, sinon www.bellajour.fr) ; une valeur douteuse retombe sur le site",
    ORIGINE_SITE === "https://www.bellajour.fr" && origineDesMails({}) === ORIGINE_SITE
      && origineDesMails({ NEXT_PUBLIC_SITE_URL: " https://www.bellajour.fr/ " }) === "https://www.bellajour.fr"
      && origineDesMails({ NEXT_PUBLIC_SITE_URL: "http://localhost:3006" }) === "http://localhost:3006"
      && origineDesMails({ NEXT_PUBLIC_SITE_URL: "http://pirate.example" }) === ORIGINE_SITE
      && origineDesMails({ NEXT_PUBLIC_SITE_URL: "http://localhost.pirate.example" }) === ORIGINE_SITE
      && origineDesMails({ NEXT_PUBLIC_SITE_URL: "https://bellajour.fr/edition" }) === ORIGINE_SITE
      && origineDesMails({ NEXT_PUBLIC_SITE_URL: "javascript:alert(1)" }) === ORIGINE_SITE);
  const routesApi = fichiers("src/app/api", "route.ts");
  const surLEnTete = routesApi.filter((f) => /origineDepuis\(|headers\.get\(["']x-forwarded-host["']\)/.test(lire(f)));
  ok(`T-164 : aucune route d'API ne batit un lien sur un en-tete de la requete (origineDepuis, x-forwarded-host)${surLEnTete.length ? " : " + surLEnTete.join(", ") : ""}`,
    routesApi.length > 10 && surLEnTete.length === 0);
  const ROUTES_MAIL = [
    "src/app/api/collectif/retrouver/route.ts",
    "src/app/api/collectif/appareil/route.ts",
    "src/app/api/collectif/rendez-vous/route.ts",
    "src/app/api/admin/collectif/editions/[id]/mail-espace/route.ts",
    "src/app/api/admin/collectif/editions/[id]/rendez-vous/route.ts",
  ];
  ok("T-164 : les cinq routes qui envoient un mail d'edition prennent origineDesMails(process.env), apercu du mail compris",
    ROUTES_MAIL.every((f) => /origineDesMails\(process\.env\)/.test(lire(f))));
  ok("T-164 : le code d'essai lit l'en-tete host SEUL, le mail nomme le site",
    /demanderCode\(supabase, acces\.edition, idAppareil, request\.headers\.get\("host"\), origineDesMails\(process\.env\)\)/.test(lire("src/app/api/collectif/appareil/route.ts"))
      && /const code = codeNeuf\(hoteRequete\);/.test(lire("src/lib/collectif/appareils.ts")) && /site \}\),/.test(lire("src/lib/collectif/appareils.ts")));
  const r = lire("src/app/api/collectif/retrouver/route.ts");
  const freinAvant = r.indexOf("if (tropVite(request))");
  ok("T-166 : « Retrouver » plafonne l'APPELANT (trois demandes par minute, le plafond de « mot de passe oublie ») avant de lire le corps, 429 avec une phrase",
    /const tropVite = creerPlafond\(3\);/.test(r) && freinAvant > 0 && freinAvant < r.indexOf("lireCorps(request)")
      && /error: "trop_de_demandes", message: "[^"]+" \}, \{ status: 429 \}/.test(r)
      && /creerPlafond\(3\)/.test(lire("src/app/api/compte/mot-de-passe-oublie/route.ts")));
}

titre("— T-180 / T-181 : chaque personne nommée, les photos qui arrivent en direct —");
{
  const D = Dossiers;
  const A = Arrivees;
  type L = { provenance_id: string | null; provenance_type: string; role_deposant: string; deposant: string | null; appareil_id?: string | null };
  const part = (deposant: string | null, appareil = "a1", prov: string | null = null): L => ({ provenance_id: prov, provenance_type: "participant", role_deposant: "participant", deposant, appareil_id: appareil });
  const resp = (deposant: string | null): L => ({ provenance_id: null, provenance_type: "organisateur", role_deposant: "responsable", deposant, appareil_id: null });
  ok("une personne = son nom compare sans la casse ni les espaces ; vide = « Sans nom »",
    D.clePersonne("Mathias") === D.clePersonne(" mathias  ") && D.clePersonne("Mathias  Durand") === D.clePersonne("mathias durand") && D.nomDePersonne(null) === "Sans nom" && D.nomDePersonne("  ") === "Sans nom" && D.clePersonne("Léa") !== D.clePersonne("Lea"));
  const ps = D.personnesDe([{ deposant: "mathias" }, { deposant: "Mathias" }, { deposant: "Mathias" }, { deposant: "Léa" }]);
  ok("les personnes : regroupees, sous l'orthographe la plus frequente, la plus fournie d'abord",
    ps.length === 2 && ps[0].nom === "Mathias" && ps[0].n === 3 && ps[1].nom === "Léa" && ps[1].n === 1);
  ok("compter les personnes : un nom compte une fois quel que soit le telephone ; deux anonymes sur deux telephones font deux ; le responsable ne compte pas",
    D.compterPersonnes([part("Mathias", "a1"), part("mathias", "a2"), part(null, "a3"), part(null, "a4"), part(null, "a4"), resp("Claire")]) === 3);
  const ed = { responsable_nom: "Claire", plafond_participant: 30, plafond_total: 2000 } as unknown as Parameters<typeof D.arbreDesPhotos>[2];
  const seul = D.arbreDesPhotos([part("Mathias Durand"), part("Mathias Durand")] as never, [], ed, true);
  ok("T-180 : seul sur son lien, le participant a sa pastille (Mathias ne voyait son nom nulle part)",
    seul.liens[0].enfants.length === 1 && seul.liens[0].enfants[0].nom === "Mathias Durand" && seul.personnes.map((x) => x.nom).join() === "Mathias Durand");
  const melange = D.arbreDesPhotos([resp(null), resp("La soirée"), part("Léa"), part("léa", "a2"), part("Tom", "a3", "0b1f3c2e-4a5b-4c6d-8e9f-001122334455")] as never, [], ed, true);
  ok("« Toutes les photos » : le responsable d'abord (toutes ses photos, tous dossiers), puis chaque participant, tous liens confondus",
    melange.personnes.map((x) => `${x.cle}=${x.n}`).join() === `${D.QUI_RESPONSABLE}=2,qui:léa=2,qui:tom=1`);
  const lignes = [resp(null), resp("La soirée"), part("Léa"), part("LÉA", "a2"), part("Tom", "a3", "0b1f3c2e-4a5b-4c6d-8e9f-001122334455")];
  const dans = (cle: string) => lignes.filter((l) => D.dansLeDossier(l as never, cle, "Claire")).length;
  ok("le filtre par personne : sans la casse, dans un lien comme dans toute l'edition",
    dans("qui:léa") === 2 && dans("qui:Léa") === 2 && dans(D.QUI_RESPONSABLE) === 2 && dans("pers:general:léa") === 2 && dans("pers:general:LÉA") === 2 && dans("qui:tom") === 1 && D.rayonDe("qui:léa") === "tout");
  const n = (deposants: (string | null)[], appareils?: string[]) => A.nouvellesDepuis(deposants.map((d, i) => part(d, appareils?.[i] ?? `a${i}`)) as never);
  ok("T-181 : « 12 nouvelles photos de Mathias » ; deux noms ; puis « et N autres personnes »",
    A.phraseArrivees(n(Array(12).fill("Mathias"), Array(12).fill("x"))) === "12 nouvelles photos de Mathias"
    && A.phraseArrivees(n(["Léa", "Tom"])) === "2 nouvelles photos de Léa et Tom"
    && A.phraseArrivees(n(["Léa", "Léa", "Tom", "Inès", "Sacha"])) === "5 nouvelles photos de Léa, Inès et 2 autres personnes"
    && A.phraseArrivees(n(["Léa"])) === "1 nouvelle photo de Léa");
  ok("T-181 : « Sans nom » ne se dit pas comme un nom ; le responsable seul ne s'annonce pas ; au-dela de la lecture : « Plus de »",
    A.phraseArrivees(n([null, null], ["x", "y"])) === "2 nouvelles photos"
    && A.phraseArrivees(n(["Léa", null], ["x", "y"])) === "2 nouvelles photos de Léa et 1 autre personne"
    && A.phraseArrivees(A.nouvellesDepuis([resp(null)] as never)) === null
    && A.phraseArrivees(A.nouvellesDepuis(Array(3).fill(part("Léa")) as never, 3))?.startsWith("Plus de 3 ") === true);
  ok("T-181 : la cadence (30 s sur Photos, une minute sur le tableau), jamais onglet cache, tout de suite au retour apres 20 s",
    A.SONDAGE_PHOTOS_MS === 30_000 && A.SONDAGE_TABLEAU_MS === 60_000
    && !A.aRelire(100_000, 0, false, 30_000) && A.aRelire(30_000, 0, true, 30_000) && !A.aRelire(29_999, 0, true, 30_000)
    && A.aRelire(20_000, 0, true, 60_000, true) && !A.aRelire(19_999, 0, true, 60_000, true));
  const etat = lire("src/app/api/collectif/photos/etat/route.ts");
  ok("la lecture legere : le token par chargerAcces, le droit de voir, un compte en `head`, aucune ecriture, et `depuis` passe TEL QUEL (microsecondes)",
    /chargerAcces\(/.test(etat) && /peut\(acces\.role, "voir_espace"\)/.test(etat) && /count: "exact", head: true/.test(etat) && !/\.(insert|update|upsert|delete)\(/.test(etat) && /String\(corps\.depuis\)\.trim\(\)/.test(etat) && /limit\(depuis \? ARRIVEES_LUES_MAX : 1\)/.test(etat));
  const collecte = lire("src/app/edition/[token]/photos/Collecte.tsx");
  const carte = lire("src/app/edition/[token]/CartePhotos.tsx");
  ok("l'ecran : les pastilles des la premiere personne, le nom sur chaque vignette, l'annonce et « Les voir », le sondage de 30 s (pas 3,5 s)",
    /lienDuDossier\.enfants\.length >= 1/.test(collecte) && /className="ec-ph-qui"/.test(collecte) && /className="ec-ph-annonce"/.test(collecte) && /Les voir/.test(collecte) && /useSondage\(/.test(collecte) && /SONDAGE_PHOTOS_MS/.test(collecte)
      && /useSondage\(/.test(carte) && /SONDAGE_TABLEAU_MS/.test(carte) && !/INTERVALLE_MESSAGES_MS/.test(collecte + carte));
  const depot = lire("src/app/depot/[token]/Depot.tsx");
  ok("le participant retrouve son prenom sur son telephone (lu sans setState d'hydratation) et il part avec les photos",
    /useSyncExternalStore\(/.test(depot) && /moteur\.definirDeposant\(nomEnvoye\);\s*if \(e\.target\.files\) moteur\.ajouter/.test(depot));
  const photos = lire("src/app/api/collectif/photos/route.ts");
  ok("la grille : « Toutes » commence par la derniere arrivee ; chaque photo dit qui et quand ; « N personnes » suit la meme regle que les pastilles",
    /vue === "toutes" \? \[\.\.\.dansDossier\]\.reverse\(\)/.test(photos) && /qui: role === "participant"/.test(photos) && /arrivee: p\.confirmee_le/.test(photos) && /personnes: compterPersonnes\(toutes\)/.test(photos)
      && /participants: compterPersonnes\(lignes\)/.test(lire("src/app/edition/[token]/donnees.ts")));
}

titre("— T-182 / D25 : le responsable termine la collecte, l'atelier voit la selection —");
{
  const ctx = (role: "responsable" | "equipe" | "atelier", etat: "preparation" | "composition") => ({ role, etat, clotureLe: "2026-11-14T22:59:00Z", archiveLe: null, maintenant: new Date("2026-11-03T10:00:00Z"), magazines: [] });
  const ok1 = preparerGeste("terminer_collecte", ctx("responsable", "preparation"));
  ok("terminer : le responsable, en preparation ; la cloture devient maintenant, l'edition passe en composition (meme effet que « Clore maintenant »)",
    ok1.ok && ok1.vers === "composition" && ok1.patch.cloture_le === "2026-11-03T10:00:00.000Z" && ok1.patch.etat === "composition");
  ok("terminer : jamais l'equipe ni l'atelier (lui « clot »), jamais une collecte deja close ; rouvrir reste a l'atelier",
    !preparerGeste("terminer_collecte", ctx("equipe", "preparation")).ok && !preparerGeste("terminer_collecte", ctx("atelier", "preparation")).ok
      && !preparerGeste("terminer_collecte", ctx("responsable", "composition")).ok && !peut("responsable", "regler_edition"));
  ok("le message a l'atelier : les vrais nombres, la selection seulement si elle existe, aucun tiret cadratin",
    Espace.messageFinCollecte(1248, 86) === "Collecte terminée : toutes les photos sont là (1\u202f248 photos, dont 86 dans la sélection). L'atelier peut commencer."
      && Espace.messageFinCollecte(1, 0) === "Collecte terminée : toutes les photos sont là (1 photo). L'atelier peut commencer." && !/[—–]/.test(Espace.messageFinCollecte(3, 2)));
  const route = lire("src/app/api/collectif/collecte/terminer/route.ts");
  ok("la route : le droit du responsable, la regle de gestes.ts, l'ecriture conditionnee a l'etat lu (409), un message et une ligne de journal, aucun mail",
    /peut\(acces\.role, "terminer_collecte"\)/.test(route) && /preparerGeste\("terminer_collecte"/.test(route) && /\.eq\("etat", edition\.etat\)/.test(route) && /status: 409/.test(route)
      && /ecrireMessage\(supabase, edition\.id, "client"/.test(route) && /journaliser\(supabase, \{ editionId: edition\.id \}, "geste", \{ cle: "terminer_collecte"/.test(route) && !/envoyerMail|brevo/i.test(route));
  const carte = lire("src/app/edition/[token]/CartePhotos.tsx");
  ok("le tableau de bord : « Toutes les photos sont là ? » pour le responsable seulement, en DEUX temps (« Oui, terminer »)",
    /p\.terminer && \(p\.ouverte \|\| fin === "fait"\)/.test(carte) && /Toutes les photos sont là \?/.test(carte) && /Oui, terminer/.test(carte) && /\/api\/collectif\/collecte\/terminer/.test(carte)
      && /terminer=\{peut\(role, 'terminer_collecte'\)\}/.test(lire("src/app/edition/[token]/page.tsx")));
  const lot = lire("src/app/api/admin/collectif/editions/[id]/lot/route.ts");
  const panneau = lire("src/app/admin/collectif/[id]/PanneauCollecte.tsx");
  ok("l'atelier voit la selection du client (nombre, vignettes) et la telecharge a part ; « collecte terminee par » vient du journal",
    /\(!selection \|\| p\.preselection\)/.test(lot) && /Télécharger la sélection/.test(panneau) && /selectionApercus/.test(panneau) && /"Sélection du client"/.test(panneau)
      && /j\.payload\?\.cle === "terminer_collecte"/.test(lire("src/app/admin/collectif/donnees.ts")));
}

titre("— T-188 : la messagerie de l'atelier, non lus et nouveaux (planche 8 du 19/10) —");
{
  const N = Nouveaux;
  ok("le compte de « Messages » est celui des CONVERSATIONS : une edition compte une fois, quel que soit son nombre de non-lus",
    N.conversationsEnAttente([{ edition_id: "a" }, { edition_id: "a" }, { edition_id: "b" }]) === 2 && N.conversationsEnAttente([]) === 0);
  ok("l'onglet du navigateur : « (3) Atelier · Messages », le compte d'avant remplace (jamais empile), rien a zero",
    N.titreAvecCompte("Atelier · Messages", 3) === "(3) Atelier · Messages" && N.titreAvecCompte("(3) Atelier · Messages", 5) === "(5) Atelier · Messages"
      && N.titreAvecCompte("(3) Atelier · Messages", 0) === "Atelier · Messages" && N.titreAvecCompte("(12) Atelier — styles du mur", null) === "Atelier — styles du mur");
  ok("la phrase du compte, au singulier et au pluriel",
    N.phraseEnAttente(1) === "1 conversation attend une réponse" && N.phraseEnAttente(3) === "3 conversations attendent une réponse");
  const magasin = { n: 4, le: "2026-10-19T10:00:30.000Z" };
  ok("la plus recente des deux lectures gagne (instants SERVEUR, jamais l'horloge du navigateur)",
    N.plusRecent(2, "2026-10-19T10:01:00.000Z", magasin) === 2 && N.plusRecent(2, "2026-10-19T10:00:00.000Z", magasin) === 4
      && N.plusRecent(2, null, magasin) === 4 && N.plusRecent(2, null, { n: null, le: "" }) === 2 && N.plusRecent(undefined, undefined, { n: null, le: "" }) === null);

  const m = (id: string, auteur: "client" | "atelier", created_at: string): Message => ({ id, auteur, qui: auteur === "client" ? "Claire" : "Mathias", texte: id, created_at });
  /* L'exemple de la maquette : Claire hier a 10 h 12 (lu), nous a 10 h 40, puis deux nouveaux ce soir. */
  const fil = [m("c1", "client", "2026-10-18T08:12:00Z"), m("a1", "atelier", "2026-10-18T08:40:00Z"), m("c2", "client", "2026-10-19T16:41:00Z"), m("c3", "client", "2026-10-19T16:42:00Z")];
  ok("le trait se pose sur le premier message du CLIENT non lu (un id d'atelier n'y compte pas), rien sans non-lu",
    N.premierNouveau(fil, ["c3", "c2", "a1"]) === "c2" && N.premierNouveau(fil, []) === null && N.premierNouveau(fil, ["a1"]) === null);
  ok("le trait dit « 1 nouveau message », « 2 nouveaux messages »", N.libelleNouveaux(1) === "1 nouveau message" && N.libelleNouveaux(2) === "2 nouveaux messages");
  const soir = new Date("2026-10-19T16:45:00Z");
  ok("les jours, a l'heure de PARIS : Aujourd'hui, Hier, la date (l'annee si ce n'est pas la meme)",
    N.jourRelatif("2026-10-19T08:00:00Z", soir) === "Aujourd'hui" && N.jourRelatif("2026-10-18T21:30:00Z", soir) === "Hier"
      && N.jourRelatif("2026-10-18T22:30:00Z", soir) === "Aujourd'hui" && N.jourRelatif("2026-10-12T10:00:00Z", soir) === "12 octobre"
      && N.jourRelatif("2025-12-31T10:00:00Z", soir) === "31 décembre 2025" && N.jourRelatif("pas une date", soir) === "");
  const tous = new Set(fil.map((x) => x.id));
  const jourDe = (iso: string) => N.jourRelatif(iso, soir);
  type ElMessage = Extract<Nouveaux.ElementAtelier, { genre: "message" }>;
  type ElTrait = Extract<Nouveaux.ElementAtelier, { genre: "trait" }>;
  const els = N.filAtelier(fil, { premier: "c2", initiaux: tous, jourDe });
  const msgs = els.filter((e): e is ElMessage => e.genre === "message");
  const trait = els.find((e): e is ElTrait => e.genre === "trait");
  ok("le fil de la maquette : Hier, deux anciens, Aujourd'hui, PUIS le trait « 2 nouveaux messages », puis les deux nouveaux",
    els.map((e) => (e.genre === "jour" ? e.jour : e.genre)).join("|") === "Hier|message|message|Aujourd'hui|trait|message|message" && trait?.nombre === 2);
  ok("anciens attenues (les deux camps), nouveaux du client cercles, « lu » sur le message du client deja lu seulement",
    msgs.map((x) => x.ton).join() === "ancien,ancien,nouveau,nouveau" && msgs.map((x) => x.lu).join() === "true,false,false,false");
  const reponse = N.filAtelier([...fil, m("a2", "atelier", "2026-10-19T16:50:00Z")], { premier: "c2", initiaux: tous, jourDe });
  const dernierReponse = reponse[reponse.length - 1];
  ok("une reponse de l'atelier apres le trait n'est ni comptee ni cerclee",
    reponse.find((e): e is ElTrait => e.genre === "trait")?.nombre === 2 && dernierReponse.genre === "message" && dernierReponse.ton === null);
  const direct = N.filAtelier([...fil, m("c4", "client", "2026-10-19T16:55:00Z")], { premier: null, initiaux: tous, jourDe });
  const iTrait = direct.findIndex((e) => e.genre === "trait");
  const traitDirect = direct[iTrait];
  const dernierDirect = direct[direct.length - 1];
  ok("sans non-lu a l'ouverture, un message du client arrive EN DIRECT pose le trait juste avant lui (« 1 nouveau message »)",
    iTrait === direct.length - 2 && traitDirect?.genre === "trait" && traitDirect.nombre === 1 && dernierDirect.genre === "message" && dernierDirect.ton === "nouveau");
  const rien = N.filAtelier(fil, { premier: null, initiaux: tous, jourDe });
  const rienMsgs = rien.filter((e): e is ElMessage => e.genre === "message");
  ok("rien de nouveau : ni trait, ni attenuation, les messages du client deja lus disent « lu »",
    !rien.some((e) => e.genre === "trait") && rienMsgs.every((e) => e.ton === null) && rienMsgs.filter((x) => x.lu).length === 3);

  const boite = lire("src/app/admin/collectif/messages/page.tsx");
  ok("la boite n'ouvre plus d'office la premiere conversation non lue : seule ?e= ouvre, sinon un ecran qui invite a choisir",
    !/conversations\.find\(\(c\) => c\.nonLus\)/.test(boite) && /const courant = \(choisie && estUuid\(choisie\)[^\n]*\?\? null;/.test(boite) && /Choisissez une conversation/.test(boite) && /eca-boite-fil--vide/.test(boite));
  ok("la boite : le trait calcule au rendu serveur, le compte des conversations, la liste relue quand il change, « Marquer comme non lu »",
    /premierNouveau=\{premierNouveau\(fiche\.messages, fiche\.nonLusAtelier\)\}/.test(boite) && /compterConversationsEnAttente\(supabase\)/.test(boite)
      && /nonLusLe=\{maintenant\.toISOString\(\)\} rafraichir/.test(boite) && /<MarquerNonLu key=\{courant\.id\} id=\{courant\.id\}/.test(boite) && /title: "Atelier · Messages"/.test(boite));
  const fiche188 = lire("src/app/admin/collectif/[id]/page.tsx");
  ok("la fiche : le meme trait dans l'onglet Messages, et la barre au compte des conversations",
    /<PanneauMessages id=\{e\.id\} initiaux=\{messages\} premierNouveau=\{premierNouveau\(messages, lu\.fiche\.nonLusAtelier\)\}/.test(fiche188)
      && /compterConversationsEnAttente\(makeSupabase\(\)\)/.test(fiche188) && /<MarquerNonLu /.test(lire("src/app/admin/collectif/[id]/PanneauMessages.tsx")));
  const donnees = lire("src/app/admin/collectif/donnees.ts");
  const compte = donnees.slice(donnees.indexOf("export async function compterConversationsEnAttente"), donnees.indexOf("/* ─────────────────────────────── la boîte de réception"));
  ok("le compte lit seulement (une colonne, editions NON archivees, aucun marquage), exact meme au-dela du plafond de 1000 lignes",
    /\.eq\("auteur", "client"\)/.test(compte) && /\.is\("lu_atelier_le", null\)/.test(compte) && /\.is\("collectif_editions\.archive_le", null\)/.test(compte)
      && /\.not\("edition_id", "in"/.test(compte) && !/update\(|insert\(|delete\(/.test(compte) && /conversationsEnAttente\(lignes\)/.test(compte));
  const messagerie188 = lire("src/lib/collectif/messagerie.ts");
  ok("le trait lit lu_atelier_le par une requete de donnees.ts ; lireMessages (partage avec le client) n'y touche pas",
    /nonLusAtelier: nonLus\.error \? \[\] :/.test(donnees) && !/lu_atelier_le|lu_client_le/.test(messagerie188.slice(0, messagerie188.indexOf("export async function revisionMessagesAppliquee"))));
  const enAttente = lire("src/app/api/admin/collectif/en-attente/route.ts");
  ok("la route du compte : GET seul, cookie atelier exige, interrupteur, jamais mise en cache",
    /export async function GET\(/.test(enAttente) && !ECRITURE.test(enAttente) && /quiEstConnecteRequete\(request\)/.test(enAttente) && /collectifOuvert\(\)/.test(enAttente) && /private, no-store/.test(enAttente));
  const routeMsg = lire("src/app/api/admin/collectif/editions/[id]/messages/route.ts");
  ok("le marquage est BORNE au dernier message affiche ; une borne illisible est refusee, jamais lue comme « tout marquer »",
    /lireInstant\(corps\.jusqua\) === null\) \{\s*return NextResponse\.json\(\{ error: "jusqua_illisible" \}, \{ status: 422 \}\)/.test(routeMsg)
      && /marquerLus\(makeSupabase\(\), g\.id, "atelier", jusqua\)/.test(routeMsg) && /requete = requete\.lte\("created_at", jusqua\)/.test(messagerie188));
  ok("« Marquer comme non lu » passe par la MEME route PATCH (un champ en plus) : le dernier message du client redevient non lu",
    /corps\.nonLu === true[\s\S]*?marquerNonLuAtelier\(makeSupabase\(\), g\.id\)/.test(routeMsg)
      && /\.order\("created_at", \{ ascending: false \}\)\s*\.limit\(1\)[\s\S]*?update\(\{ lu_atelier_le: null \}\)/.test(messagerie188));
  ok("le client ne change pas : sa route marque sans borne, son rappel ignore l'argument",
    /marquerLus\(makeSupabase\(\), acces\.edition\.id, "client"\)/.test(lire("src/app/api/collectif/messages/lus/route.ts")) && /marquerLus: p\.ecrire\s*\? async \(\) =>/.test(lire("src/app/edition/[token]/atelier/Parler.tsx")));
  const conv = lire("src/app/admin/collectif/ConversationAtelier.tsx");
  ok("le fil : le repere fige en etat local, le marquage envoie sa borne, puis les compteurs se relisent",
    /const \[premier\] = useState\(premierNouveau\)/.test(conv) && /body: JSON\.stringify\(\{ jusqua \}\)/.test(conv) && /void relireCompte\(\);\s*if \(premiere\) router\.refresh\(\);/.test(conv) && /filAtelier\(messages,/.test(conv));
  const veille = lire("src/app/admin/collectif/VeilleMessages.tsx") + lire("src/app/admin/collectif/compteMessages.ts");
  ok("la releve : une minute, rien onglet cache, rattrapage au retour, refresh seulement si le nombre change, jamais location.reload",
    /PERIODE_MS = 60_000/.test(veille) && /visibilitychange/.test(veille) && /if \(rafraichir && apres !== null && avant !== null && apres !== avant\) router\.refresh\(\)/.test(veille) && !/location\.reload\(/.test(veille));
  ok("le fil garde SA releve de 3,5 s (T-169, a part)", INTERVALLE_MESSAGES_MS === 3500);
  const barre188 = lire("src/app/admin/BarreAtelier.tsx");
  ok("la barre : « Messages » porte le compte vivant sur chaque ecran des editions, la releve ne tourne que cote editions",
    /libelle: "Messages", badge: nonLus \?\? null, courant: courant === "messages", compteMessages: true/.test(barre188) && /\{collectif && editions \? <VeilleMessages /.test(barre188)
      && /l\.compteMessages \? \(\s*<PastilleMessages/.test(barre188) && /suivre=\{editions\}/.test(barre188));
  const liste188 = lire("src/app/admin/collectif/messages/ListeConversations.tsx");
  ok("la liste : l'heure d'une conversation non lue en couleur d'accent, la conversation ouverte quitte « À traiter » (pas son rendez-vous)",
    /eca-boite-heure--alire/.test(liste188) && /t\.genre === "rdv" \|\| t\.editionId !== courant/.test(liste188)
      && /\.eca-root \.eca-boite-conv \.eca-boite-heure--alire \{\s*color: var\(--eca-bleu-encre\);/.test(lire("src/app/admin/collectif/collectif.css")));
  ok("aucun mail a l'atelier dans ce lot (A1 attend Mathias, T-146)",
    [veille, conv, enAttente, routeMsg, boite].every((t) => !/envoyerMail|brevo/i.test(t)));
}

titre("— T-187 : l'ecran « L'edition est creee », et le lien d'equipe chez le responsable seulement —");
{
  ok("le lien d'equipe se montre au RESPONSABLE (y compris sur un appareil pas encore reconnu), jamais a l'equipe ni a un participant",
    Espace.voitLienEquipe("responsable", false) && Espace.voitLienEquipe("equipe", true)
      && !Espace.voitLienEquipe("equipe", false) && !Espace.voitLienEquipe("participant", false) && !Espace.voitLienEquipe("participant", true));
  const layoutEspace = lire("src/app/edition/[token]/layout.tsx");
  const coquille = lire("src/app/edition/[token]/Coquille.tsx");
  const partage = lire("src/app/edition/[token]/PartageEquipe.tsx");
  ok("l'espace : le layout ne calcule le lien d'equipe QUE si voitLienEquipe, la coquille n'affiche l'entree que s'il existe",
    /if \(voitLienEquipe\(role, appareilInconnu\)\) \{/.test(layoutEspace) && /let lienEquipe: string \| null = null/.test(layoutEspace) && /lienEquipe=\{lienEquipe\}/.test(layoutEspace)
      && /\{props\.lienEquipe \? <PartageEquipe lien=\{props\.lienEquipe\}/.test(coquille));
  ok("« Partager avec mon équipe » : le lien, « Copier », « Lecture seule : votre équipe suit tout sans rien modifier. » (et tu)",
    /Partager avec mon équipe/.test(partage) && /Lecture seule : votre équipe suit tout sans rien modifier\./.test(partage) && /Lecture seule : ton équipe suit tout sans rien modifier\./.test(partage)
      && /navigator\.clipboard\.writeText\(lien\)/.test(partage) && /<Fenetre/.test(partage) && !/#[0-9a-f]{3,8}\b/i.test(partage));
  ok("l'ecran montre les adresses ABREGEES (le token entier ne sort que par « Copier »), copier les trois liens les nomme",
    lienAbrege(`https://bellajour.fr/edition/${"k".repeat(32)}`) === "bellajour.fr/edition/kkkk…" && lienAbrege("http://localhost:3109/depot/ABCD1234efgh5678ijkl9012mnop3456") === "localhost:3109/depot/ABCD…"
      && (() => { const t = texteTroisLiens({ responsable: "R", equipe: "E", depot: "D" }); return t.split("\n").length === 3 && /responsable.*: R$/m.test(t) && /équipe.*lecture seule : E$/m.test(t) && /participants.*: D$/m.test(t); })());
  const page = lire("src/app/admin/collectif/creee/[id]/page.tsx");
  const fin = lire("src/app/admin/collectif/creee/[id]/FinCreation.tsx");
  const hook = lire("src/app/admin/collectif/[id]/useEnvoiEspace.ts");
  ok("l'ecran : admin revérifié, les memes donnees que la route (objet du vrai mail), l'etat des mails lu par le SERVEUR",
    /quiEstConnecte\(\)/.test(page) && /donneesEspacePret\(e, origine, controleAppareilActif\(process\.env\)\)/.test(page) && /ouverts=\{mailsCollectifOuverts\(\)\}/.test(page) && /sujet=\{mail\.sujet\}/.test(page));
  ok("mails coupes : le bouton le dit et ne fait rien ; « Copier les trois liens » devient le geste principal",
    /Mails coupés : copiez les liens/.test(fin) && /!p\.ouverts \? \(\s*<button type="button" className="eca-bouton eca-bouton--petit eca-bouton--coupe" disabled/.test(fin)
      && /p\.ouverts && !p\.archivee \? "eca-bouton eca-bouton--petit" : "eca-bouton eca-bouton--petit eca-bouton--plein"/.test(fin));
  ok("l'envoi est en DEUX TEMPS (verifier, puis confirmer) par le flux partage avec l'onglet Reglages ; l'apercu est le GET de la route",
    /envoi\.verifier/.test(fin) && /envoi\.confirmer/.test(fin) && /verifier: \(\) => appeler\(\{ verifier: true \}\)/.test(hook) && /confirmer: \(\) => appeler\(\{\}\)/.test(hook)
      && /useEnvoiEspace\(id\)/.test(lire("src/app/admin/collectif/[id]/EnvoiLienResponsable.tsx")) && /src=\{`\/api\/admin\/collectif\/editions\/\$\{p\.id\}\/mail-espace`\}/.test(fin));
  ok("apres « Créer l'édition », l'ecran des liens (et non plus la fiche sans un mot)",
    /router\.push\(`\/admin\/collectif\/creee\/\$\{json\.id\}`\)/.test(lire("src/app/admin/collectif/FormulaireEdition.tsx")));
  ok("les mails des editions restent COUPES par defaut : rien de ce chantier n'ouvre COLLECTIF_MAILS",
    /return lireInterrupteur\(process\.env\[VAR_MAILS_COLLECTIF\]\)\.ouvert && !envoisCoupes\(process\.env\[VAR_MAILS_COUPES\]\);/.test(lire("src/lib/collectif/mails.ts")) && !lireInterrupteur(undefined).ouvert);
}


titre("— T-184 : l'accord du participant, envoye avec ses photos, exige par le serveur, enregistre horodate —");
{
  const v = Accord.VERSION_ACCORD;
  ok("l'accord vaut SEULEMENT `accord: true` (le booleen) avec une version connue",
    Accord.lireAccord({ accord: true, accordVersion: v })?.version === v
      && Accord.lireAccord({}) === null && Accord.lireAccord({ accordVersion: v }) === null
      && Accord.lireAccord({ accord: false, accordVersion: v }) === null && Accord.lireAccord({ accord: "true", accordVersion: v }) === null
      && Accord.lireAccord({ accord: 1, accordVersion: v }) === null && Accord.lireAccord({ accord: true }) === null
      && Accord.lireAccord({ accord: true, accordVersion: null }) === null && Accord.lireAccord({ accord: true, accordVersion: "2099-01-01" }) === null
      && Accord.lireAccord({ accord: true, accordVersion: 20261017 }) === null);
  ok("une version qui n'en est pas une ne trouve rien (« constructor », « __proto__ », « toString » : la lecon de T-161)",
    ["constructor", "__proto__", "toString", "hasOwnProperty", "valueOf", ""].every((x) => Accord.lireAccord({ accord: true, accordVersion: x }) === null));
  ok("le participant coche ; le responsable (il a signe le devis), l'atelier et l'equipe, non",
    Accord.accordExige("participant") && !Accord.accordExige("responsable") && !Accord.accordExige("atelier") && !Accord.accordExige("equipe"));
  const t = new Date("2026-10-20T08:15:30.123Z");
  ok("avec l'accord : la version et l'heure du SERVEUR ; sans : aucune colonne (jamais un accord invente)",
    JSON.stringify(Accord.colonnesAccord({ version: v }, t)) === JSON.stringify({ accord_version: v, accord_le: "2026-10-20T08:15:30.123Z" })
      && JSON.stringify(Accord.colonnesAccord(null, t)) === "{}");
  ok("le refus parle au registre de l'edition, sans tiret cadratin",
    Accord.messageAccord("entreprise_vous") === "Cochez l'accord pour envoyer vos photos." && Accord.messageAccord("ecole_tu") === "Coche l'accord pour envoyer tes photos."
      && Accord.ERREUR_ACCORD === "accord_requis" && ![Accord.messageAccord("entreprise_vous"), Accord.messageAccord("ecole_tu")].some((m) => /[—–]/.test(m)));

  const depot = lire("src/app/depot/[token]/Depot.tsx");
  const span = /<label className="ec-dp-accord">[\s\S]*?<span>([\s\S]*?)<\/span>/.exec(depot)?.[1] ?? "";
  const affiche = span
    .replace(/\{props\.evenement\}/g, "{evenement}")
    .replace(/\{deNom\(props\.organisation\)\}/g, "{deOrganisation}")
    .replace(/&apos;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
  ok("le texte AFFICHE est mot pour mot celui de la version envoyee : changer un mot = une NOUVELLE version dans TEXTES_ACCORD",
    affiche.length > 100 && affiche === Accord.TEXTES_ACCORD.get(v));
  ok("la version courante est le jour du choix de Mathias (17/10, PR #245)", v === "2026-10-17" && Accord.TEXTES_ACCORD.has("2026-10-17"));
  ok("cocher donne la version au moteur, decocher la retire ; le bouton reste ferme sans accord",
    /moteur\.definirAccord\(e\.target\.checked \? VERSION_ACCORD : null\)/.test(depot) && /disabled=\{!accord \|\| !nomPret\}/.test(depot));

  const moteur = lire("src/app/edition/_composants/depot/moteur.ts");
  ok("le moteur garde l'accord de CHAQUE photo a l'ajout (comme la provenance), n'en mele jamais deux dans un lot, et envoie `accord: true` avec la version",
    /provenance: this\.provenance,\s*accord: this\.accord,\s*\}\);/.test(moteur) && /i\.accord === premier\.accord/.test(moteur)
      && /accord: premier\.accord !== null,\s*accordVersion: premier\.accord,/.test(moteur));
  ok("un refus faute d'accord finit le lot avec la phrase du serveur, jamais en « Connexion interrompue » qui reessaierait sans fin",
    /status === 400 && json\.error === ERREUR_ACCORD/.test(moteur) && moteur.indexOf("json.error === ERREUR_ACCORD") < moteur.indexOf("throw new Error(`presign"));
  ok("le depot du responsable (l'espace) ne coche rien : son moteur n'appelle jamais definirAccord",
    !/definirAccord/.test(lire("src/app/edition/_composants/depot/DepotContexte.tsx") + lire("src/app/edition/_composants/depot/FenetreEnvoi.tsx") + lire("src/app/edition/_composants/depot/ZoneDepot.tsx")));

  const route = lire("src/app/api/collectif/depot/presign/route.ts");
  const iVerif = route.indexOf("Array.isArray(corps.connues)");
  const iAccord = route.indexOf("if (accordExige(role) && !accord)");
  const iDecl = route.indexOf("lireDeclaration(corps.fichiers)");
  const iCompte = route.indexOf("compterPourPlafond(");
  const iInsert = route.indexOf('from("collectif_photos").insert(lignes)');
  ok("la route : un participant sans accord repart en 400 `accord_requis` AVANT toute lecture du lot et toute ecriture ; la verification d'une reprise (qui n'ecrit rien) ne le demande pas",
    iVerif > 0 && iAccord > iVerif && iDecl > iAccord && iCompte > iAccord && iInsert > iAccord
      && /return NextResponse\.json\(\{ error: ERREUR_ACCORD, message: messageAccord\(edition\.registre\) \}, \{ status: 400 \}\)/.test(route));
  ok("la version et l'heure du serveur partent avec CHAQUE photo nouvelle du participant, dans la MEME insertion que la photo",
    /const champsAccord = accordExige\(role\) \? colonnesAccord\(accord, maintenant\) : \{\};/.test(route)
      && /const lignes = sansAccord\.map\(\(l\) => \(\{ \.\.\.l, \.\.\.champsAccord \}\)\);/.test(route));
  ok("sans la migration : l'insertion se replie SANS les deux colonnes (42703 et PGRST204) et le serveur le dit a chaque lot ; le refus, lui, tient deja",
    /colonneAbsente\(error\.code\) && "accord_version" in champsAccord/.test(route)
      && /console\.error\(`\[collectif\] accord du participant NON enregistré : \$\{MIGRATION_ACCORD\} absente`\)/.test(route)
      && /\(\{ error \} = await supabase\.from\("collectif_photos"\)\.insert\(sansAccord\)\)/.test(route)
      && colonneAbsente("42703") && colonneAbsente("PGRST204"));

  const mig = lire(MIGRATION_ACCORD);
  const sqlSeul = mig.split("\n").filter((l) => !/^\s*--/.test(l)).join("\n").replace(/'(?:[^']|'')*'/g, "''");
  ok("migration 20261020 : atomique, idempotente, deux colonnes SANS valeur par defaut sur collectif_photos, PostgREST relit, aucune ligne touchee",
    /^\s*begin;\s*$/m.test(mig) && /^\s*commit;\s*$/m.test(mig)
      && /alter table public\.collectif_photos\s+add column if not exists accord_version text;/.test(mig)
      && /alter table public\.collectif_photos\s+add column if not exists accord_le timestamptz;/.test(mig)
      && /notify pgrst, 'reload schema';/.test(mig)
      && !/\b(default|drop|update|delete|insert|truncate)\b/i.test(sqlSeul));
  ok("les colonnes ecrites par la route sont exactement celles de la migration",
    Object.keys(Accord.colonnesAccord({ version: v }, t)).every((k) => new RegExp(`add column if not exists ${k}\\b`).test(mig))
      && (mig.match(/add column if not exists/g) ?? []).length === 2);
}

/* ════════════════════ T-192 : LA PREMIÈRE VRAIE ÉDITION (Audencia, 19/10 au soir) ════════════════════ */

titre("— T-192 : la cle d'une photo, sur iPhone comme ailleurs —");
{
  const maintenant = Date.parse("2026-10-20T10:00:00Z");
  const vieille = Date.parse("2025-06-01T12:00:00Z");
  ok("une date de moins de dix minutes (l'heure du choix sur iPhone) ne compte pas ; une vraie date, si",
    CleDepot.dateDeCle(maintenant - 60_000, maintenant) === 0 && CleDepot.dateDeCle(maintenant + 30_000, maintenant) === 0 && CleDepot.dateDeCle(vieille, maintenant) === vieille);
  const f = { name: "IMG_1234.JPG", size: 2_345_678 };
  const premier = CleDepot.cleDuFichier("abc123", { ...f, lastModified: maintenant - 1_000 }, maintenant);
  const rechoisie = CleDepot.cleDuFichier("abc123", { ...f, lastModified: maintenant + 3_600_000 - 2_000 }, maintenant + 3_600_000);
  ok("la MEME photo re-choisie une heure plus tard sur iPhone (date = heure du choix) garde sa cle : « deja la », jamais un double",
    premier === rechoisie && estCleFichier(premier));
  ok("deux appareils (deux sels) qui envoient chacun un IMG_1234.JPG de meme poids n'ont PAS la meme cle : aucune photo perdue en « deja la »",
    CleDepot.cleDuFichier("abc123", { ...f, lastModified: 0 }, maintenant) !== CleDepot.cleDuFichier("zz9988", { ...f, lastModified: 0 }, maintenant));
  const moteur = lire("src/app/edition/_composants/depot/moteur.ts");
  ok("le moteur cle chaque fichier par le sel de l'appareil (gardé dans le navigateur, repli en memoire)",
    /cleDuFichier\(this\.sel, f, maintenant\)/.test(moteur) && /localStorage\.getItem\(CLE_SEL\)/.test(moteur) && !/cleFichier\(f\.name, f\.size, f\.lastModified\)/.test(moteur));
}

titre("— T-192 : le moteur tient une mauvaise connexion —");
{
  const moteur = lire("src/app/edition/_composants/depot/moteur.ts");
  ok("le retour du reseau relance TOUT DE SUITE (evenement online), et une coupure ne brule aucun essai",
    /window\.addEventListener\("online", this\.auRetourDuReseau\)/.test(moteur) && /else if \(!enLigne\(\)\) \{[\s\S]{0,200}await attendreEnLigne\(\);/.test(moteur));
  ok("seul un refus du COFFRE (une reponse HTTP) compte comme essai ; sans reponse en ligne (wifi filtre), un compteur a part, et une phrase qui dit quoi faire",
    /if \(r\.status > 0\) \{[\s\S]{0,120}it\.essais\+\+;/.test(moteur) && /it\.essaisReseau\+\+;/.test(moteur) && /passe en 4G, puis « Réessayer »/.test(moteur));
  ok("la vignette repart comme la photo (T-171), quatre essais au plus, sans jamais faire echouer la photo",
    /for \(let k = 0; k < 4; k\+\+\) \{\s*if \(\(await this\.put\(it\.urlVignette, it\.vignette, "image\/jpeg"\)\)\.ok\) break;/.test(moteur));
  ok("a la cloture, les photos deja au coffre sont CONFIRMEES avant d'etre dites refusees ; celles en route finissent leur course",
    /void this\.confirmerRestes\(\);/.test(moteur) && /private async confirmerRestes\(\)/.test(moteur)
      && !/it\.etat === "envoi"\) this\.finir\(it, "refuse", message\)/.test(moteur));
  ok("un lien supprime (404) ferme l'envoi avec une phrase vraie, jamais « connexion interrompue » a l'infini ; un autre 4xx refuse le lot",
    /if \(status === 404\) \{\s*\/\*[^*]*\*\/\s*this\.fermer\(/.test(moteur) && /status >= 400 && status < 500/.test(moteur));
  ok("chaque requete au serveur a un garde-temps ; une reponse coupee en route se relit comme une coupure",
    /garde\.abort\(\)/.test(moteur) && /signal: garde\.signal/.test(moteur) && /throw new Error\("réponse coupée"\)/.test(moteur));
  ok("l'ecran reste allume pendant l'envoi (Screen Wake Lock), et une page qui a dormi n'avorte pas ses envois",
    /navigator\.wakeLock\.request\("screen"\)/.test(moteur) && /maintenant - tic > 30_000\) dernier = maintenant/.test(moteur));
  ok("moins de requetes : plus de place = plus de declaration pour rien ; lots plus pleins ; confirmations groupees sur 15 s",
    /refusPlafond && json\.place === 0/.test(moteur) && /const LOT_PLEIN = 10;/.test(moteur) && /const ATTENTE_CONFIRMATION_MS = 15_000;/.test(moteur));
  ok("re-choisir une photo refusee ou en erreur la renvoie (plafond releve) ; en route ou arrivee, elle est seulement comptee",
    /if \(connu\.etat === "refuse" \|\| connu\.etat === "erreur"\)/.test(moteur) && /this\.dejaAjoutes\+\+/.test(moteur));
  const depot = lire("src/app/depot/[token]/Depot.tsx");
  const zone = lire("src/app/edition/_composants/depot/ZoneDepot.tsx");
  ok("« Merci » et « Toutes les photos sont arrivees » seulement sans erreur : une photo qui n'est pas partie se dit",
    /const termine = vue\.total > 0 && vue\.enCours === 0 && vue\.erreurs === 0;/.test(depot) && /vue\.erreurs\s*\?\s*`\$\{vue\.erreurs\} photo/.test(zone));
}

titre("— T-192 : le nom du participant ne change plus —");
{
  ok("prenom ET nom exiges, espaces resserres, 80 caracteres au plus ; le merci prend le prenom",
    Participant.nomComplet("  Léa ", "Martin") === "Léa Martin" && Participant.nomComplet("Léa", "  ") === null && Participant.nomComplet("", "Martin") === null
      && Participant.nomComplet("A".repeat(60), "B".repeat(60))?.length === Participant.NOM_MAX && Participant.premierMot("Léa  Martin") === "Léa" && Participant.premierMot(null) === "");
  const depot = lire("src/app/depot/[token]/Depot.tsx");
  ok("l'ecran : deux champs la premiere fois, puis « en tant que … » sans champ ; le nom du serveur passe avant celui du telephone",
    /autoComplete="given-name"/.test(depot) && /autoComplete="family-name"/.test(depot) && /const nomFixe = props\.nomConnu \?\? fige \?\? \(garde \|\| null\);/.test(depot)
      && /\{nomFixe \? \(/.test(depot) && /il ne se change plus ensuite/.test(depot));
  const route = lire("src/app/api/collectif/depot/presign/route.ts");
  ok("la route reprend le nom deja donne par l'appareil AVANT de compter et d'ecrire, et ne le cherche que pour un participant",
    /if \(role === "participant" && appareilLu\) \{\s*const connu = await nomDeLAppareil\(/.test(route) && /if \(connu\) deposant = connu;/.test(route)
      && route.indexOf("nomDeLAppareil(") < route.indexOf("compterPourPlafond(") && route.indexOf("nomDeLAppareil(") < route.indexOf('from("collectif_photos").insert(lignes)'));
  const connu = lire("src/lib/collectif/participantConnu.ts");
  ok("le nom de l'appareil se lit chez les PARTICIPANTS de l'edition, le libelle d'un lien n'est pas un nom, et l'appareil se compte en `head`",
    /\.eq\("role_deposant", "participant"\)/.test(connu) && /nom\.toLowerCase\(\) !== libelle/.test(connu) && /count: "exact", head: true/.test(connu));
  const page = lire("src/app/depot/[token]/page.tsx");
  ok("la page lit le cookie de l'appareil (meme cookie sur tous les liens) et ne cherche rien si la collecte est close (ni si le depot n'est pas regle, T-195)",
    /\(await cookies\(\)\)\.get\(COOKIE_APPAREIL\)/.test(page) && /ouvert && regle && estAppareil\(appareil\)/.test(page));
}

titre("— T-192 : le choix du style ferme, une vitrine a la place —");
{
  const avant = process.env[VAR_STYLES];
  delete process.env[VAR_STYLES];
  const absent = stylesOuverts();
  process.env[VAR_STYLES] = "peut-etre";
  const incompris = stylesOuverts();
  process.env[VAR_STYLES] = "1";
  const oui = stylesOuverts();
  if (avant === undefined) delete process.env[VAR_STYLES];
  else process.env[VAR_STYLES] = avant;
  ok("COLLECTIF_STYLES : ferme si absent ou incompris, ouvert sur un oui franc", !absent && !incompris && oui && lireInterrupteurStyles("on").ouvert);
  for (const f of ["src/app/edition/[token]/style/page.tsx", "src/app/edition/[token]/style/brief/page.tsx", "src/app/edition/[token]/style/[slug]/page.tsx"]) {
    const t = lire(f);
    ok(`${f.replace("src/app/edition/[token]/", "")} : la vitrine AVANT toute lecture du mur`,
      /if \(!stylesOuverts\(\)\) return <Vitrine /.test(t) && t.indexOf("stylesOuverts()") < t.indexOf("chargerMur("));
  }
  const brief = lire("src/app/api/collectif/brief/route.ts");
  ok("la route du brief refuse tout geste tant que c'est ferme (409 styles_fermes), avant toute ecriture",
    /if \(!stylesOuverts\(\)\) \{\s*return NextResponse\.json\(\{ error: "styles_fermes"/.test(brief) && brief.indexOf("stylesOuverts()") < brief.search(/\.(update|insert|upsert)\(/));
  const tdb = lire("src/app/edition/[token]/page.tsx");
  ok("le tableau de bord dit « Bientot » et mene a la vitrine, jamais au mur ni au brief", /if \(!ouverts\) return <CarteStyleBientot/.test(tdb) && /ouverts=\{stylesOuverts\(\)\}/.test(tdb));
  const vitrine = lire("src/app/edition/[token]/style/Vitrine.tsx");
  const chemins = [...vitrine.matchAll(/\$\{([AM])\}\/([a-z0-9-]+\.webp)/g)].map((m) => ({ A: "public/images/v2/accueil", M: "public/images/v2/magazine", C: "public/images/v2/composer" })[m[1] as "A" | "M" | "C"] + "/" + m[2]);
  ok(`la vitrine ne montre que des images STATIQUES deja publiees, toutes presentes (${chemins.length})`, chemins.length >= 13 && chemins.every((c) => existsSync(c)) && !/signerGet|chargerMur|image_key/.test(vitrine));
  ok("la vitrine n'a aucune couleur en dur", !/#[0-9a-f]{3,8}\b/i.test(lire("src/app/edition/[token]/style/vitrine.css")) && !/#[0-9a-f]{3,8}\b/i.test(vitrine));
}

/* ════════════════════ T-191 : LES DEMANDES SUR MESURE (planche 12 du 19/10 au soir) ════════════════════ */

titre("— T-191 : les demandes, lues sous leurs deux formes (une edition existante ne change pas d'un pixel) —");
{
  const avant = Demandes.lireDemandes(["logo", "programme", "mot", "liste"]);
  ok("des cles texte d'avant : des demandes HERITEES, avec le nom d'aujourd'hui",
    avant.length === 4 && avant.every((d) => d.heritee) && avant.map((d) => d.nom).join(" | ") === "Logo | Programme | Mot du dirigeant | Liste des participants");
  ok("des cles texte dans le desordre : l'ordre d'aujourd'hui (celui de l'ecran du client), une cle inconnue ignoree",
    Demandes.lireDemandes(["mot", "pirate", "logo"]).map((d) => d.cle).join() === "logo,mot");
  const heritees = CONTENUS_CLIENT.map((c) => Demandes.vueDemande(Demandes.lireDemandes([c.cle])[0], "ecole_tu"));
  ok("une heritee se montre EXACTEMENT comme avant (puce, titre, aide, formats, mode), meme au tutoiement",
    heritees.every((v, i) => {
      const c = CONTENUS_CLIENT[i];
      return v.heritee && v.libelle === c.libelle && v.titre === c.titre && v.aide === c.aide && v.mode === c.mode
        && JSON.stringify(v.extensions) === JSON.stringify(c.extensions) && v.formats === c.extensions.map((e) => e.toUpperCase()).join(", ")
        && Demandes.accepteDe(v) === c.extensions.map((e) => `.${e}`).join(",") && (c.mode !== "questionnaire" || v.questions === QUESTIONS_MOT);
    }));
  const logo = heritees[0];
  ok("une heritee refuse et accepte les memes fichiers, avec les memes mots, que la regle d'avant",
    ["logo.exe", "logo", "a.png", "logo.SVG", "x.ai"].every((n) => JSON.stringify(Demandes.lireFichierDemande(logo, n, 2000, "application/pdf")) === JSON.stringify(lireFichierContenu(contenuClient("logo")!, n, 2000)))
      && JSON.stringify(Demandes.lireFichierDemande(logo, "a.png", 0)) === JSON.stringify(lireFichierContenu(contenuClient("logo")!, "a.png", 0)));
  const melange = Demandes.lireDemandes([
    "logo",
    { cle: "d-abc1234567", nom: "  La photo   de classe\n officielle ", forme: "images" },
    { cle: "mot", nom: "Le mot du proviseur", forme: "questionnaire" },
  ]);
  ok("les deux formes ensemble : l'ordre de l'atelier, le nom nettoye, une heritee renommee garde SA cle",
    melange.map((d) => `${d.cle}:${d.heritee}`).join() === "logo:true,d-abc1234567:false,mot:false" && melange[1].nom === "La photo de classe officielle" && melange[2].nom === "Le mot du proviseur");
  ok("lecture tolerante : nom vide, forme inconnue, cle illisible, cle en double, autre chose qu'une liste : ignores",
    Demandes.lireDemandes([{ cle: "d-aaaaaaaaaa", nom: " ", forme: "tout" }, { cle: "d-bbbbbbbbbb", nom: "X", forme: "video" }, { cle: "D X", nom: "Y", forme: "tout" }, "logo", { cle: "logo", nom: "Logo bis", forme: "pdf" }, 42, null]).map((d) => d.cle).join() === "logo"
      && Demandes.lireDemandes({ logo: true }).length === 0 && Demandes.lireDemandes(null).length === 0);
  ok("reenregistrer une autre etape reecrit les cles d'avant A L'IDENTIQUE (des cles texte, pas des objets)",
    (() => { const x = lireSaisieEdition({ ...creation, contenus_demandes: ["logo", "programme", "mot", "liste"] }, "creation"); return x.ok && JSON.stringify(x.edition.contenus_demandes) === '["logo","programme","mot","liste"]'; })());
  const renomme = Demandes.renommer(avant[2], "Le mot du proviseur");
  ok("renommer une heritee : elle s'ecrit en objet, sa cle reste « mot » (ses envois aussi) ; non touchee, elle reste une cle texte",
    JSON.stringify(Demandes.versBase(renomme)) === '{"cle":"mot","nom":"Le mot du proviseur","forme":"questionnaire"}' && Demandes.versBase(avant[0]) === "logo" && Demandes.renommer(avant[0], "Logo") === avant[0]);
  ok("le formulaire garde une demande sans nom (« Autre » qu'on va nommer) et le nom tel qu'on le tape ; le client, jamais",
    (() => { const f = Demandes.demandesDuFormulaire([{ cle: "d-cccccccccc", nom: "", forme: "tout" }, { cle: "d-dddddddddd", nom: "Le mot de ", forme: "questionnaire" }]); return f.length === 2 && f[1].nom === "Le mot de "; })()
      && Demandes.lireDemandes([{ cle: "d-cccccccccc", nom: "", forme: "tout" }]).length === 0);
}

titre("— T-191 : la regle de saisie (nom, 80 caracteres, forme connue, 12 au plus, cles et noms uniques) —");
{
  const d = (cle: string, nom: string, forme: string) => ({ cle, nom, forme });
  const lit = (l: unknown[]) => lireSaisieEdition({ ...creation, contenus_demandes: l }, "creation");
  const erreurs = (l: unknown[]) => { const x = lit(l); return x.ok ? [] : x.erreurs.filter((e) => e.champ === "contenus_demandes").map((e) => e.message); };
  ok("des demandes nommees : acceptees, nettoyees, dans l'ordre de l'atelier",
    (() => { const x = lit([d("d-aaaaaaaaaa", "  Logo,  en vectoriel ", "pdf"), "mot", d("d-bbbbbbbbbb", "Liste des élèves", "tout")]); return x.ok && JSON.stringify(x.edition.contenus_demandes) === '[{"cle":"d-aaaaaaaaaa","nom":"Logo, en vectoriel","forme":"pdf"},"mot",{"cle":"d-bbbbbbbbbb","nom":"Liste des élèves","forme":"tout"}]'; })());
  ok("un nom vide : refuse, sur l'etape « À envoyer par le client »", erreurs([d("d-aaaaaaaaaa", "   ", "tout")]).some((m) => /a un nom/.test(m)) && ETAPE_DU_CHAMP.contenus_demandes === "envoyer");
  ok("81 caracteres : refuse ; 80 : accepte", erreurs([d("d-aaaaaaaaaa", "x".repeat(81), "tout")]).some((m) => /80 caractères au plus/.test(m)) && erreurs([d("d-aaaaaaaaaa", "x".repeat(80), "tout")]).length === 0);
  ok("une forme inconnue ou une cle illisible : refusee", erreurs([d("d-aaaaaaaaaa", "Film", "video")]).length === 1 && erreurs([d("../x", "Film", "tout")]).length === 1);
  ok("13 demandes : refuse ; 12 : accepte",
    erreurs(Array.from({ length: 13 }, (_, i) => d(`d-${String(i).padStart(10, "a")}`, `Demande ${i}`, "tout"))).some((m) => /Au plus 12 demandes/.test(m))
      && erreurs(Array.from({ length: 12 }, (_, i) => d(`d-${String(i).padStart(10, "a")}`, `Demande ${i}`, "tout"))).length === 0);
  ok("deux fois la meme cle : refuse", erreurs([d("d-aaaaaaaaaa", "Un", "tout"), d("d-aaaaaaaaaa", "Deux", "tout")]).some((m) => /même clé/.test(m)));
  ok("deux fois le meme nom (casse comprise), heritee comprise : refuse",
    erreurs([d("d-aaaaaaaaaa", "Programme", "tout"), d("d-bbbbbbbbbb", "programme", "images")]).some((m) => /s'appellent/.test(m)) && erreurs(["liste", d("d-bbbbbbbbbb", "Liste des participants", "tout")]).length === 1);
  ok("« Le mot de » laisse tel quel : a completer (« Le mot du proviseur » passe)",
    erreurs([d("d-aaaaaaaaaa", "Le mot de ", "questionnaire")]).some((m) => /à compléter/.test(m)) && erreurs([d("d-aaaaaaaaaa", "Le mot du proviseur", "questionnaire")]).length === 0 && Demandes.nomInacheve("Le mot d'") && !Demandes.nomInacheve("Le mot d'Anne"));
  ok("le modele « Le mot de… » laisse le nom a completer ; les cinq modeles de la planche, dans l'ordre",
    Demandes.MODELES_DEMANDE.map((m) => m.libelle).join(" | ") === "Logo | Programme | Le mot de… | Liste des participants | Autre"
      && Demandes.MODELES_DEMANDE[2].forme === "questionnaire" && Demandes.nomInacheve(Demandes.MODELES_DEMANDE[2].nom) && Demandes.MODELES_DEMANDE[0].forme === "pdf" && Demandes.MODELES_DEMANDE[4].nom === "");
  ok("une edition NEUVE : les quatre demandes de la planche, sous les cles d'origine (elles marchent avant la migration), la regle les accepte",
    Demandes.DEMANDES_PAR_DEFAUT.length === 4 && Demandes.DEMANDES_PAR_DEFAUT.every((x) => Demandes.estCleHeritee(x.cle)) && Demandes.DEMANDES_PAR_DEFAUT[0].nom === "Logo, en vectoriel" && Demandes.DEMANDES_PAR_DEFAUT[0].forme === "pdf"
      && Demandes.lireDemandesSaisies(Demandes.DEMANDES_PAR_DEFAUT).erreurs.length === 0 && /contenus_demandes: \[\.\.\.DEMANDES_PAR_DEFAUT\],/.test(lire("src/app/admin/collectif/nouvelle/page.tsx")));
  let n = 0;
  const suite = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5];
  const cle = Demandes.nouvelleCle(["d-aaaaaaaaaa"], () => suite[n++ % suite.length]);
  ok("une cle neuve : tiree au sort, jamais une cle deja prise ni une cle d'origine", /^d-[a-z0-9]{10}$/.test(cle) && cle !== "d-aaaaaaaaaa" && !Demandes.estCleHeritee(cle) && Demandes.estCleHeritee("mot"));
  ok("la forme : Images, PDF ou SVG, Tout ; une heritee de fichier n'allume aucune pastille (ses formats d'avant ne sont aucune des trois)",
    Demandes.FORMES_FICHIER.map((f) => f.libelle).join() === "Images,PDF ou SVG,Tout" && Demandes.formeAffichee(Demandes.lireDemandes(["logo"])[0]) === null
      && Demandes.formeAffichee(Demandes.lireDemandes(["mot"])[0]) === "questionnaire" && Demandes.changerForme(Demandes.lireDemandes(["mot"])[0], "questionnaire").heritee
      && !Demandes.changerForme(Demandes.lireDemandes(["logo"])[0], "tout").heritee);
  ok("ce que voit le client, en petit, sous chaque nom (planche 12)",
    Demandes.aideAtelier({ cle: "d-x0", nom: "a", forme: "images", heritee: false }) === "Seulement une image"
      && Demandes.aideAtelier({ cle: "d-x0", nom: "a", forme: "pdf", heritee: false }) === "Seulement un PDF ou un SVG"
      && Demandes.aideAtelier({ cle: "d-x0", nom: "a", forme: "tout", heritee: false }) === "N'importe quel fichier (tableur, PDF, texte)"
      && Demandes.aideAtelier({ cle: "d-x0", nom: "a", forme: "questionnaire", heritee: false }) === "Quatre questions, il répond dans son espace"
      && Demandes.aideAtelier(Demandes.lireDemandes(["logo"])[0]) === "Formats d'avant : SVG, PDF, AI, EPS ou PNG");
}

titre("— T-191 : la forme d'un envoi, lue cote serveur (extension ET type annonce) —");
{
  const vue = (forme: "images" | "pdf" | "tout" | "questionnaire", registre: "entreprise_vous" | "ecole_tu" = "entreprise_vous") =>
    Demandes.vueDemande({ cle: "d-abc1234567", nom: "La photo de classe officielle", forme, heritee: false }, registre);
  const images = vue("images");
  const lu = (v: ReturnType<typeof vue>, nom: string, mime = "", taille = 2000) => Demandes.lireFichierDemande(v, nom, taille, mime);
  ok("Images : une photo passe (JPEG, HEIC sans type annonce, type generique) ; le type ecrit vient de l'extension",
    (() => { const r = lu(images, "Photo.JPEG", "image/jpeg"); return r.ok && r.extension === "jpg" && r.type === "image/jpeg"; })()
      && (() => { const r = lu(images, "IMG_0001.HEIC", ""); return r.ok && r.type === "image/heic"; })() && lu(images, "a.webp", "application/octet-stream").ok);
  ok("Images : un PDF est refuse et le client lit pourquoi (« Seulement une image »)",
    (() => { const r = lu(images, "programme.pdf", "application/pdf"); return !r.ok && r.message.startsWith("Seulement une image"); })());
  ok("Images : une « photo.png » annoncee en PDF est refusee (le type annonce contredit l'extension)", !lu(images, "photo.png", "application/pdf").ok);
  const pdf = vue("pdf");
  ok("PDF ou SVG : un PDF et un SVG passent ; un PNG est refuse (« Seulement un PDF ou un SVG. »)",
    lu(pdf, "logo.pdf", "application/pdf").ok && (() => { const r = lu(pdf, "logo.svg", "image/svg+xml"); return r.ok && r.type === "image/svg+xml"; })()
      && (() => { const r = lu(pdf, "logo.png", "image/png"); return !r.ok && r.message === "Seulement un PDF ou un SVG."; })() && !lu(pdf, "logo.pdf", "image/png").ok);
  const tout = vue("tout");
  ok("Tout : un tableur, un fichier sans extension ; jamais servi en text/html (une page web se telecharge)",
    lu(tout, "liste.xlsx").ok && (() => { const r = lu(tout, "notes"); return r.ok && r.extension === "bin" && r.type === "application/octet-stream"; })()
      && (() => { const r = lu(tout, "page.html", "text/html"); return r.ok && r.type === "application/octet-stream"; })() && Demandes.accepteDe(tout) === undefined);
  ok("vide ou au-dela de 4 Mo : refuse, toutes formes", !lu(tout, "a.pdf", "", 0).ok && !lu(images, "a.jpg", "", 5 * 1024 * 1024).ok && !lu(pdf, "a.pdf", "", 4 * 1024 * 1024 + 1).ok);
  ok("un questionnaire n'accepte pas de fichier", !lu(vue("questionnaire"), "a.pdf", "application/pdf").ok);
  ok("l'extension venue du client se lit par Object.hasOwn (jamais TABLE[saisie], T-161)",
    /Object\.hasOwn\(TYPE_PAR_EXTENSION, ext\)/.test(lire("src/lib/collectif/demandes.ts")) && !/TYPE_PAR_EXTENSION\[ext\] \?\?/.test(lire("src/lib/collectif/demandes.ts")));
}

titre("— T-191 : vous ou tu, et le nom choisi en titre —");
{
  const v = (forme: "images" | "pdf" | "tout" | "questionnaire", registre: "entreprise_vous" | "ecole_tu") =>
    Demandes.vueDemande({ cle: "d-abc1234567", nom: "Le mot du proviseur", forme, heritee: false }, registre);
  const vous = v("questionnaire", "entreprise_vous");
  const tu = v("questionnaire", "ecole_tu");
  ok("le questionnaire est titre du NOM choisi, puce comprise", vous.titre === "Le mot du proviseur" && vous.libelle === "Le mot du proviseur" && vous.mode === "questionnaire");
  ok("vous : « vos réponses », les quatre questions au vouvoiement", /vos réponses, et vous le relisez/.test(vous.aide) && vous.questions === QUESTIONS_MOT);
  ok("tu : « tes réponses », les quatre questions au tutoiement, autant que de questions",
    /tes réponses, et tu le relis/.test(tu.aide) && tu.questions === Demandes.QUESTIONS_MOT_TU && Demandes.QUESTIONS_MOT_TU.length === QUESTIONS_MOT.length && Demandes.QUESTIONS_MOT_TU[0] === "Que retiens-tu de cet événement ?");
  ok("un fichier : « Vous pouvez » / « Tu peux », « écrivez » / « écris » à l'atelier",
    /Vous pouvez/.test(v("images", "entreprise_vous").aide) && /Tu peux/.test(v("images", "ecole_tu").aide) && /écrivez à l'atelier/.test(v("tout", "entreprise_vous").lourd) && /écris à l'atelier/.test(v("tout", "ecole_tu").lourd)
      && /si vous l'avez/.test(v("pdf", "entreprise_vous").aide) && /si tu l'as/.test(v("pdf", "ecole_tu").aide));
  ok("aucune phrase de demande au vouvoiement quand l'edition tutoie",
    (["images", "pdf", "tout", "questionnaire"] as const).every((f) => { const x = v(f, "ecole_tu"); return !/(^|[^\p{L}])(vous|vos|votre|écrivez|envoyez|retenez)(?!\p{L})/iu.test(`${x.aide} ${x.lourd} ${x.questions.join(" ")}`); })
      && /(^|[^\p{L}])(vous|vos|votre|écrivez|envoyez|retenez)(?!\p{L})/iu.test(v("tout", "entreprise_vous").lourd));
  ok("les reponses se rangent sous la question au vouvoiement : l'atelier lit les memes quatre questions",
    (() => { const r = lireReponsesMot(["Une belle annee"]); return r.ok && Object.keys(r.reponses)[0] === QUESTIONS_MOT[0]; })()
      && /contenu\.questions\[QUESTIONS_MOT\.indexOf\(/.test(lire("src/app/edition/[token]/LigneContenus.tsx")));
}

titre("— T-191 : les envois portent le nom de leur demande —");
{
  const demandes = Demandes.lireDemandes([{ cle: "mot", nom: "Le mot du proviseur", forme: "questionnaire" }, { cle: "d-abc1234567", nom: "La photo de classe", forme: "images" }, { cle: "d-qqqqqqqqqq", nom: "Le mot de la présidente", forme: "questionnaire" }]);
  ok("le nom d'un envoi : celui de sa demande ; une cle d'origine non demandee, son nom d'avant ; une demande retiree, rien",
    Demandes.nomDeLEnvoi("mot", demandes) === "Le mot du proviseur" && Demandes.nomDeLEnvoi("d-abc1234567", demandes) === "La photo de classe"
      && Demandes.nomDeLEnvoi("programme", demandes) === "Programme" && Demandes.nomDeLEnvoi("d-retiree00", demandes) === null);
  const l = (id: string, type: string, recu: string) => ({ id, type, r2_key: null, nom_origine: null, reponses: { q: "r" }, recu_le: recu, remplace_le: null });
  const c = envoisCourants([l("a", "d-qqqqqqqqqq", "2026-10-19T10:00:00Z"), l("b", "d-qqqqqqqqqq", "2026-10-19T11:00:00Z"), l("x", "d-retiree00", "2026-10-19T11:00:00Z"), l("p1", "d-abc1234567", "2026-10-19T09:00:00Z"), l("p2", "d-abc1234567", "2026-10-19T09:30:00Z")], (t) => Demandes.modeDeLEnvoi(t, demandes));
  ok("un questionnaire NOUVEAU n'a qu'une reponse courante ; une demande d'images garde tous ses fichiers ; une demande retiree ne se montre plus au client",
    JSON.stringify(c.get("d-qqqqqqqqqq")?.map((x) => x.id)) === '["b"]' && c.get("d-abc1234567")?.length === 2 && !c.has("d-retiree00"));
  ok("« À envoyer » (contenusAEnvoyer) : les noms choisis, recu marque",
    Espace.contenusAEnvoyer([{ cle: "mot", nom: "Le mot du proviseur", forme: "questionnaire" }, "logo"], ["logo"]).map((x) => `${x.libelle}:${x.recu}`).join() === "Le mot du proviseur:false,Logo:true");
  ok("partout ou les envois se montrent, le nom vient de la demande (tableau de bord, Parler a l'atelier, fil cite, fiche)",
    /nomDeLEnvoi\(l\.type, demandes\)/.test(lire("src/app/edition/[token]/donnees.ts")) && /modeDeLEnvoi\(type, demandes\)/.test(lire("src/app/edition/[token]/donnees.ts"))
      && /lireEnvois\(edition\)/.test(lire("src/app/edition/[token]/atelier/page.tsx")) && /nomDeLEnvoi\(c\.type, demandes\)/.test(lire("src/lib/collectif/messagerie.ts"))
      && /nomDeLEnvoi\(c\.type, demandes\) \?\? "Demande retirée"/.test(lire("src/app/admin/collectif/donnees.ts")) && !/contenuClient\(/.test(lire("src/app/admin/collectif/donnees.ts")));
  ok("le journal raconte le NOM que le client a lu, et garde la cle", /\{ type: contenu\.libelle, cle: contenu\.cle, par: qui/.test(lire("src/app/api/collectif/contenus/route.ts")));
}

titre("— T-191 : la route refuse hors demande et hors forme ; la migration absente rend un vrai 503, sans fichier orphelin —");
{
  const route = lire("src/app/api/collectif/contenus/route.ts");
  const coffre = route.indexOf("await ecrireObjet(");
  ok("la demande vient de CETTE edition (ses deux formes) ; une cle qu'elle n'a pas : 422",
    /const demande = typeof cle === "string" \? lireDemandes\(edition\.contenus_demandes\)\.find\(\(d\) => d\.cle === cle\) : undefined;/.test(route) && /if \(!demande\) return non\(422, "saisie", "L'atelier n'a pas demandé ce contenu\."\);/.test(route));
  ok("la forme est lue par le serveur (extension ET type annonce), AVANT le coffre",
    /lireFichierDemande\(contenu, fichier\.name, fichier\.size, fichier\.type\)/.test(route) && route.indexOf("lireFichierDemande(contenu") < coffre);
  ok("une demande NOUVELLE : la migration est SONDEE avant le coffre, 503 qui le dit ; les cinq cles d'origine passent sans sonde",
    /const nouvelle = !estCleHeritee\(contenu\.cle\);/.test(route) && /if \(nouvelle && \(await migrationDemandes\(supabase\)\) === "absente"\) return non\(503, ERREUR_DEMANDES_ABSENTE, MESSAGE_DEMANDES_ABSENTE\);/.test(route)
      && route.indexOf("await migrationDemandes(supabase)") < coffre && route.indexOf("await migrationDemandes(supabase)") > route.indexOf("if (!demande)"));
  ok("si la base refuse quand meme (23514) : le fichier deja au coffre est retire, et c'est le meme 503",
    /if \(contrainteRefusee\(error\.code\)\) \{\s*if \(typeof ligne\.r2_key === "string"\) await supprimer\(ligne\.r2_key\);\s*return non\(503, ERREUR_DEMANDES_ABSENTE, MESSAGE_DEMANDES_ABSENTE\);/.test(route) && !/\.delete\(/.test(route));
  ok("23514, et lui seul, est la contrainte refusee", contrainteRefusee("23514") && !contrainteRefusee("23503") && !contrainteRefusee("42703") && !contrainteRefusee(null));
  ok("le message nomme le fichier de la migration, et ce fichier existe",
    MESSAGE_DEMANDES_ABSENTE.includes("20261021_collectif_demandes.sql") && ERREUR_DEMANDES_ABSENTE === "migration_demandes_absente" && existsSync(resolve(RACINE, MIGRATION_DEMANDES)));
  const sonde = lire("src/lib/collectif/sondeDemandes.ts");
  ok("la sonde n'ecrit rien : une edition qui n'existe pas (cle etrangere), jamais d'update ; le seul delete vise la ligne de sonde",
    /edition_id: randomUUID\(\), type: TYPE_SONDE, reponses: \{\}/.test(sonde) && !/\.update\(/.test(sonde) && (sonde.match(/\.delete\(\)/g) ?? []).length === 1 && /\.delete\(\)\.eq\("id", id\)\.eq\("type", TYPE_SONDE\)/.test(sonde)
      && !Demandes.estCleHeritee(TYPE_SONDE));
  const admin = lire("src/app/api/admin/collectif/demandes/route.ts");
  ok("la route de la sonde (l'etape 5) : GET seul, cookie atelier exige, interrupteur, jamais mise en cache",
    /export async function GET\(/.test(admin) && !ECRITURE.test(admin) && /quiEstConnecteRequete\(request\)/.test(admin) && /collectifOuvert\(\)/.test(admin) && /private, no-store/.test(admin));
}

titre("— T-191 : la migration 20261021 (ecrite, jamais appliquee d'ici) —");
{
  const sql = lire(MIGRATION_DEMANDES);
  ok("atomique, rejouable : elle retire la contrainte des cinq valeurs et garde une borne de forme",
    /^begin;/m.test(sql) && /^commit;/m.test(sql) && /drop constraint if exists collectif_contenus_type_check;/.test(sql)
      && /add constraint collectif_contenus_type_forme\s+check \(char_length\(type\) between 1 and 64\);/.test(sql) && /drop constraint if exists collectif_contenus_type_forme;/.test(sql));
  ok("elle verifie qu'aucune contrainte ne limite encore le type (sinon tout est annule)", /raise exception/.test(sql) && /ilike '%rubrique%'/.test(sql));
  ok("elle ne touche qu'une contrainte : ni colonne, ni table, ni donnee",
    !/add column|create table|drop table|drop column|\bupdate\b|\binsert\b|\bdelete\b/i.test(sql.replace(/--.*$/gm, "")));
  ok("aucune table du B2C touchee", !/\b(numeros|photos|evenements|mails_envoyes)\b(?!_)/.test(sql.replace(/collectif_\w+/g, "").replace(/--.*$/gm, "")));
}

titre("— T-191 : les ecrans (etape 5, « À envoyer », la fiche) —");
{
  const dem = lire("src/app/admin/collectif/DemandesClient.tsx");
  const form = lire("src/app/admin/collectif/FormulaireEdition.tsx");
  ok("l'etape 5 est un composant a part ; le formulaire ne fait que l'inserer",
    /<DemandesClient key="envoyer" valeur=\{v\.contenus_demandes\} onChange=\{\(d\) => maj\("contenus_demandes", d\)\} erreur=\{erreurs\.contenus_demandes\} \/>/.test(form) && !/eca-case-effet/.test(form) && !/CONTENUS\b/.test(form));
  ok("une ligne par demande : icone, nom modifiable, ce que voit le client, la forme en pastille, la poubelle",
    /className="eca-dem-ico"/.test(dem) && /className="eca-dem-champ"/.test(dem) && /<small>\{aideAtelier\(d\)\}<\/small>/.test(dem) && /role="radiogroup"/.test(dem) && /className="eca-dem-poubelle"/.test(dem)
      && /Questionnaire/.test(dem) && /Fichier/.test(dem) && /FORMES_FICHIER\.map/.test(dem) && /maxLength=\{NOM_DEMANDE_MAX\}/.test(dem));
  ok("« + Ajouter une demande » et ses modeles ; « Ce que voit le client, dans « À envoyer » »",
    /\+ Ajouter une demande/.test(dem) && /MODELES_DEMANDE\.map/.test(dem) && /Ce que voit le client, dans « À envoyer »/.test(dem) && /nouvelleCle\(/.test(dem) && /crypto\.getRandomValues/.test(dem));
  ok("apres un essai refuse, l'erreur suit la saisie (la meme regle, relue) : une demande corrigee ne laisse pas de message perime",
    /const aCorriger = erreur \? lireDemandesSaisies\(valeur\)\.erreurs\.join\(" "\) : "";/.test(dem) && /\{aCorriger \? \(/.test(dem));
  ok("la migration manquante se DIT sur l'etape 5, apres une seule sonde par chargement",
    /fetch\("\/api\/admin\/collectif\/demandes"/.test(dem) && /if \(!lancee\) \{\s*lancee = true;/.test(dem) && /etat\?\.migration === "absente" && nouvelles\.length > 0/.test(dem) && /Les demandes d'origine/.test(dem));
  const ligne = lire("src/app/edition/[token]/LigneContenus.tsx");
  ok("« À envoyer » : les noms choisis (vuesDemandes), le fichier refuse dit pourquoi AVANT de partir, accept suit la forme",
    /demandes=\{vuesDemandes\(edition\.contenus_demandes, edition\.registre\)\}/.test(lire("src/app/edition/[token]/page.tsx")) && /const contenus = p\.demandes;/.test(ligne)
      && ligne.indexOf("lireFichierDemande(contenu, f.name, f.size, f.type)") > 0 && ligne.indexOf("lireFichierDemande(contenu, f.name, f.size, f.type)") < ligne.indexOf("await envoyer(d)") && /const accept = accepteDe\(contenu\);/.test(ligne)
      && /\{contenu\.formats\} · 4 Mo au plus/.test(ligne));
  const panneau = lire("src/app/admin/collectif/[id]/PanneauContenus.tsx");
  ok("la fiche : une ligne par demande sous son nom, ce qui est recu, « Pas encore reçu », et ce qui reste d'une demande retiree",
    /demandes\.map\(\(d\) =>/.test(panneau) && /<strong>\{d\.nom\}<\/strong>/.test(panneau) && /Pas encore reçu/.test(panneau) && /Demande retirée/.test(panneau)
      && /<PanneauContenus contenus=\{contenus\} demandes=\{lu\.fiche\.demandes\} \/>/.test(lire("src/app/admin/collectif/[id]/page.tsx")));
  ok("une puce au nom long passe a la ligne dans sa carte (80 caracteres), sans changer une puce courte",
    /\.ec-espace \.ec-tdb-puce-nom \{\s*min-width: 0;\s*overflow-wrap: anywhere;/.test(lire("src/app/edition/[token]/tableau.css")) && /<span className="ec-tdb-puce-nom">/.test(ligne));
}

/* ═══════════════ LOT a2 (20/10) : T-195, T-196, T-200, T-152 ═══════════════ */

titre("— T-195 / D27 : un total vide = pas de limite ; le plafond par personne qui manque se dit AVANT le choix —");
{
  const P = PlafondsLot;
  const rr = (p: Partial<ReglagesPlafond> = {}): ReglagesPlafond => ({ plafond_participant_atelier: 30, plafond_participant_client: null, plafond_total: 2000, ...p });
  ok("depotRegle : un total vide ne ferme plus rien (lien general, lien sans limite, lien a plafond)",
    P.depotRegle(rr({ plafond_total: null }), { sansPlafond: false }) && P.depotRegle(rr({ plafond_total: null }), { sansPlafond: true })
      && P.depotRegle(rr({ plafond_total: null, plafond_participant_atelier: null }), { sansPlafond: false, plafondLien: 10 }));
  ok("depotRegle : sans plafond par personne, le lien general est ferme (total vide ou non) ; « sans limite » et un lien a plafond propre restent ouverts",
    !P.depotRegle(rr({ plafond_participant_atelier: null }), { sansPlafond: false }) && !P.depotRegle(rr({ plafond_participant_atelier: null, plafond_total: null }), { sansPlafond: false })
      && P.depotRegle(rr({ plafond_participant_atelier: null }), { sansPlafond: true }) && P.depotRegle(rr({ plafond_participant_atelier: null }), { sansPlafond: false, plafondLien: 12 }));
  ok("depotRegle est placeRestante jouee a vide : meme verdict sur 16 combinaisons", (() => {
    for (const total of [null, 2000]) for (const atelier of [null, 30]) for (const sans of [false, true]) for (const lien of [null, 10]) {
      const reglages = rr({ plafond_total: total, plafond_participant_atelier: atelier });
      const p = placeRestante(reglages, { role: "participant", sansPlafond: sans, plafondLien: lien, dejaParAppareil: 0 }, 0);
      const attendu = p.illimitee || p.borne !== "plafond_non_regle";
      if (P.depotRegle(reglages, { sansPlafond: sans, plafondLien: lien }) !== attendu) return false;
    }
    return true;
  })());
  ok("les phrases de plafond suivent le registre : « Tu as atteint… » au tu, le vous sinon (registre inconnu compris)",
    P.messagePlafond("plafond_participant", "ecole_tu").startsWith("Tu as atteint") && P.messagePlafond("plafond_participant", "entreprise_vous") === P.MESSAGE_PLAFOND.plafond_participant
      && P.messagePlafond("plafond_participant", "") === P.MESSAGE_PLAFOND.plafond_participant && P.messagePlafond("plafond_total", "ecole_tu") === P.MESSAGE_PLAFOND.plafond_total
      && (Object.keys(P.MESSAGE_PLAFOND) as (keyof typeof P.MESSAGE_PLAFOND)[]).every((k) => P.MESSAGE_PLAFOND_TU[k].length > 0 && !/\bvous\b|\bvotre\b|\bvos\b/i.test(P.MESSAGE_PLAFOND_TU[k])));
  ok("la phrase « pas encore ouvert » nomme le plafond PAR PERSONNE, et sa suite tutoie ou vouvoie",
    /par personne/.test(P.MESSAGE_PLAFOND.plafond_non_regle) && P.phrasesDepotPasOuvert("ecole_tu")[1].startsWith("Garde ce lien") && P.phrasesDepotPasOuvert("entreprise_vous")[1].startsWith("Gardez ce lien")
      && P.phrasesDepotPasOuvert("ecole_tu")[0] === P.MESSAGE_PLAFOND.plafond_non_regle);
  const presign = lire("src/app/api/collectif/depot/presign/route.ts");
  ok("la route du depot rend la phrase au registre de l'edition (plus de MESSAGE_PLAFOND[...] en dur)",
    /message: messagePlafond\(d\.raison, edition\.registre\)/.test(presign) && !/MESSAGE_PLAFOND\[/.test(presign));
  const pageDepot = lire("src/app/depot/[token]/page.tsx");
  ok("la page de depot le dit AVANT le choix : depotRegle sur le lien lu, « pas encore ouvert » au registre, et le formulaire seulement sinon",
    /const regle = depotRegle\(edition, \{ sansPlafond: Boolean\(provenance\?\.sans_plafond\), plafondLien: provenance\?\.plafond_par_personne \?\? null \}\)/.test(pageDepot)
      && pageDepot.indexOf("ouvert && !regle ?") > 0 && pageDepot.indexOf("phrasesDepotPasOuvert(edition.registre)") > pageDepot.indexOf("ouvert && !regle ?")
      && pageDepot.indexOf("phrasesDepotPasOuvert(edition.registre)") < pageDepot.indexOf("<Depot"));
  const form = lire("src/app/admin/collectif/FormulaireEdition.tsx");
  ok("le formulaire : le total reste facultatif, vide = « sans limite », l'aide le dit ; la saisie le garde a null",
    /"Compte tout le monde, sauf l'atelier\. Laisser vide : pas de limite pour toute l'édition\.", 1, "sans limite"\)/.test(form)
      && (() => { const x = lireSaisieEdition({ ...creation, plafond_total: "" }, "creation"); return x.ok && x.edition.plafond_total === null; })()
      && (() => { const x = lireSaisieEdition({ plafond_total: "" }, "modification"); return x.ok && x.edition.plafond_total === null; })());
  const ficheA2 = lire("src/app/admin/collectif/[id]/page.tsx");
  ok("la fiche : plus d'alerte pour un total vide ; une alerte quand le plafond par personne manque (meme regle que la page)",
    !/plafond_total === null/.test(ficheA2) && /const parPersonneManque = etat === "preparation" && !depotRegle\(e, \{ sansPlafond: false \}\);/.test(ficheA2)
      && /Photos par personne : à régler\./.test(ficheA2));
}

titre("— T-196 : regenerer dit ce qu'il coupe, previent le responsable, et le lien mort a sa page —");
{
  const L = LiensLot;
  ok("« Ce lien ne fonctionne plus. Demande / Demandez le nouveau lien à l'organisateur. »",
    L.lienMort(true).phrase === "Ce lien ne fonctionne plus. Demande le nouveau lien à l'organisateur."
      && L.lienMort(false).phrase === "Ce lien ne fonctionne plus. Demandez le nouveau lien à l'organisateur." && L.lienMort(false).titre === "Ce lien ne fonctionne plus");
  ok("le verrou du mail : un code par lien regenere (l'empreinte du NOUVEAU token, jamais le token)",
    L.codeMailLienRegenere("depot", "a".repeat(64)) === "LIEN-depot-aaaaaaaaaa" && L.codeMailLienRegenere("depot", "b".repeat(64)) !== L.codeMailLienRegenere("depot", "a".repeat(64))
      && L.codeMailLienRegenere("responsable", "c".repeat(64)).startsWith("LIEN-responsable-"));
  const M = MailsTextes;
  const T = { token_responsable: "R".repeat(32), token_equipe: "E".repeat(32), token_depot: "D".repeat(32) };
  const ed = (registre: string) => ({ ...T, registre, evenement: "Croisière Audencia", responsable_nom: "Camille Martin", cloture_le: "2026-11-14T22:59:00.000Z" });
  ok("seuls le lien du responsable et celui des participants previennent par mail (pas celui de l'equipe)",
    M.lienPrevenu("responsable") && M.lienPrevenu("depot") && !M.lienPrevenu("equipe") && !M.lienPrevenu("constructor"));
  const dResp = M.donneesLienRegenere(ed("entreprise_vous"), "responsable", "https://bellajour.fr", 0, false);
  const mResp = M.mailLienRegenere(dResp);
  ok("responsable : le NOUVEAU lien (son token), « l'ancien ne fonctionne plus », vous ; objet nomme l'evenement",
    dResp.lien === `https://bellajour.fr/edition/${"R".repeat(32)}` && mResp.html.includes(dResp.lien) && mResp.texte.includes(dResp.lien)
      && /l'ancien ne fonctionne plus/.test(mResp.texte) && mResp.sujet === "Votre nouveau lien Bellajour · Croisière Audencia" && /Bonjour Camille,/.test(mResp.texte)
      && !mResp.texte.includes("D".repeat(32)) && !mResp.texte.includes("E".repeat(32)));
  const mRespTu = M.mailLienRegenere(M.donneesLienRegenere(ed("ecole_tu"), "responsable", "https://bellajour.fr", 0, true));
  ok("responsable au tu : « Ton lien a changé », et le code par appareil se dit quand il est en service",
    mRespTu.sujet.startsWith("Ton nouveau lien") && /ton espace/.test(mRespTu.texte) && !/\bvous\b|\bvotre\b/i.test(mRespTu.texte) && /il t'envoie un code/.test(mRespTu.texte)
      && !/code/.test(mResp.texte.replace("bellajour.fr/espace", "")));
  const mDepot = (n: number, registre = "entreprise_vous") => M.mailLienRegenere(M.donneesLienRegenere(ed(registre), "depot", "https://bellajour.fr", n, false));
  ok("participants : le nouveau lien en adresse, la cloture, les photos gardees, le QR code ancien qui ne marche plus",
    mDepot(0).html.includes(`https://bellajour.fr/depot/${"D".repeat(32)}`) && /jusqu'au 14 novembre/.test(mDepot(0).texte) && /Les photos déjà reçues sont gardées\./.test(mDepot(0).texte)
      && /ni le QR code qui y menait/.test(mDepot(0).texte) && mDepot(0).sujet === "Nouveau lien des participants · Croisière Audencia" && !mDepot(0).texte.includes("R".repeat(32)));
  ok("participants : les liens de contribution coupes se comptent (0 : rien ; 1 : au singulier ; 8 : au pluriel), au registre",
    !/contribution/.test(mDepot(0).texte) && /Votre lien de contribution a changé aussi/.test(mDepot(1).texte) && /Vos 8 liens de contribution ont changé aussi/.test(mDepot(8).texte)
      && /Tes 8 liens de contribution ont changé aussi : retrouve-les dans ton espace, page Photos, onglet « Les liens »/.test(mDepot(8, "ecole_tu").texte));
  ok("les mails du lien : aucun tiret cadratin, masculin generique, le nom echappe dans le HTML",
    [mResp, mRespTu, mDepot(8), mDepot(8, "ecole_tu")].every((m) => !/—/.test(m.texte + m.sujet) && !/cliente/i.test(m.texte))
      && M.mailLienRegenere(M.donneesLienRegenere({ ...ed("entreprise_vous"), evenement: "<b>x</b>" }, "depot", "https://bellajour.fr", 0, false)).html.includes("&lt;b&gt;x&lt;/b&gt;"));
  ok("le journal : le nombre de liens de contribution changes avec le lien, jamais l'empreinte ni le token",
    (() => { const ph = phraseEvenement("lien_regenere", { quel: "depot", par: "Mathias", ancien: "f".repeat(64), liensCoupes: 8 }); return /8 liens de contribution ont changé avec lui/.test(ph) && !ph.includes("ffff"); })()
      && /^Lien de l'équipe régénéré par .+ : l'ancien ne fonctionne plus\.$/.test(phraseEvenement("lien_regenere", { quel: "equipe", par: "Mathias" })));

  const route = lire("src/app/api/admin/collectif/editions/[id]/lien/route.ts");
  ok("la route : la verification repond AVANT toute ecriture (rien n'est ecrit, rien ne part)",
    route.indexOf("if (corps.verifier === true) {") > 0 && route.indexOf("if (corps.verifier === true) {") < route.indexOf(".update({ [colonne]: generateNumeroToken() })")
      && route.indexOf("if (corps.verifier === true) {") < route.indexOf("envoyerMailCollectif({"));
  ok("la route : les liens de contribution ACTIFS comptes (retire_le vide), repli 42703 sans la colonne, un compte exact",
    /\.from\("collectif_provenances"\)\.select\("id", \{ count: "exact" \}\)\.eq\("edition_id", id\)\.is\("retire_le", null\)/.test(route) && /if \(!colonneAbsente\(actifs\.error\.code\)\)/.test(route));
  ok("la route : la regeneration est conditionnee a l'ancien lien, le journal garde son EMPREINTE (jamais le token)",
    /\.eq\("id", id\)\s*\.eq\(colonne, ancien\)/.test(route) && /"lien_regenere",\s*\{ quel, par: prenomDe\(qui\), ancien: empreinte\(ancien\)/.test(route) && !/ancien: ancien/.test(route));
  ok("la route : le mail part par le circuit unique, verrouille, dans un try (il ne fait jamais echouer le geste), et seulement pour un lien qui previent",
    /mail = await envoyerMailCollectif\(\{/.test(route) && /code: codeMailLienRegenere\(quel, empreinte\(apres\[colonne\]\)\)/.test(route) && /verrou: true,/.test(route)
      && /\} catch \(e\) \{\s*console\.error\("\[collectif\] mail du lien régénéré", e\);\s*mail = "echec";/.test(route) && /if \(raison === null && lienPrevenu\(quel\) && apres\.responsable_email\)/.test(route)
      && /a: \{ email: apres\.responsable_email, nom: apres\.responsable_nom \}/.test(route));
  ok("la route : l'apercu GET ne sert que les deux liens qui previennent, en HTML non mis en cache",
    /if \(!lienPrevenu\(quel\)\) return NextResponse\.json\(\{ error: "lien_inconnu" \}, \{ status: 400 \}\);/.test(route) && /"cache-control": "no-store"/.test(route));
  const panneauL = lire("src/app/admin/collectif/[id]/PanneauLiens.tsx");
  ok("l'ecran : « Régénérer… » verifie d'abord, dit les liens de contribution coupes et le mail (avec son apercu), puis « Confirmer »",
    /onClick=\{\(\) => appeler\(quel, true\)\}/.test(panneauL) && /phraseContributions\(verif\.contributions\)/.test(panneauL) && /onClick=\{\(\) => appeler\(quel, false\)\}/.test(panneauL)
      && /href=\{apercu\(quel\)\}/.test(panneauL) && /Les mails des éditions sont coupés/.test(panneauL) && /cesseront aussi de fonctionner : ils contiennent ce lien/.test(panneauL));

  const lecture = lire("src/app/depot/[token]/lecture.ts");
  const layoutLien = lire("src/app/depot/[token]/layout.tsx");
  const mort = lire("src/app/depot/[token]/LienMort.tsx");
  ok("le lien mort : not-found sous le layout du token, qui lui passe le registre ; la page garde notFound() (404 pour tous)",
    /return <LienMort \/>/.test(lire("src/app/depot/[token]/not-found.tsx")) && /<FournisseurRegistre registre=\{await registreDuLien\(token\)\}>\{children\}<\/FournisseurRegistre>/.test(layoutLien)
      && /lienMort\(useContext\(RegistreDuLien\) === 'ecole_tu'\)/.test(mort)
      && /if \(acces\.statut === 'ferme' \|\| acces\.statut === 'introuvable'\) notFound\(\)/.test(pageDepot0()) && /if \(!lu\.data \|\| lu\.data\.retire_le\) notFound\(\)/.test(pageDepot0()));
  ok("le lien mort : la lecture est partagee (cache) avec la page, l'ancien lien se retrouve par son empreinte, rien ne leve",
    /export const accesDepot = cache\(\(token: string\) => chargerAcces\(token, 'depot'\)\)/.test(lecture) && /const acces = await accesDepot\(token\)/.test(pageDepot0())
      && /\.eq\('payload->>ancien', empreinte\(token\)\)/.test(lecture) && /\} catch \{\s*return null\s*\}/.test(lecture) && !/chargerAcces\(/.test(pageDepot0()));
  const moteurL = lire("src/app/edition/_composants/depot/moteur.ts");
  ok("le moteur dit la meme chose si le lien meurt pendant l'envoi (404)",
    (moteurL.match(/this\.fermer\(lienMort\(Boolean\(this\.cfg\.tu\)\)\.phrase\)/g) ?? []).length === 2 && !/n'est plus actif/.test(moteurL));
}
function pageDepot0(): string {
  return lire("src/app/depot/[token]/page.tsx");
}

titre("— T-200 : les videos ne partent pas, la page le dit avant, et le refus nomme la video —");
{
  const D = DepotLot;
  ok("estVideo : type video/*, ou extension de video ; jamais une photo acceptee ni un autre fichier",
    D.estVideo("IMG_0423.MOV", "") && D.estVideo("clip", "video/quicktime") && D.estVideo("a.mp4", "video/mp4") && D.estVideo("b.3gp", "")
      && !D.estVideo("a.jpg", "image/jpeg") && !D.estVideo("IMG_1.HEIC", "") && !D.estVideo("doc.pdf", "application/pdf") && !D.estVideo("photo.mov.jpg", ""));
  ok("le refus nomme la video (une : son nom ; plusieurs : leur nombre), puis le reste",
    JSON.stringify(D.phrasesIgnores(1, 1, "IMG_0423.MOV")) === JSON.stringify(["« IMG_0423.MOV » est une vidéo : seules les photos partent."])
      && JSON.stringify(D.phrasesIgnores(3, 2, "a.mov")) === JSON.stringify(["2 vidéos ignorées : seules les photos partent.", "1 fichier ignoré : ce ne sont pas des photos."])
      && JSON.stringify(D.phrasesIgnores(2, 0, null)) === JSON.stringify(["2 fichiers ignorés : ce ne sont pas des photos."]) && D.phrasesIgnores(0, 0, null).length === 0
      && D.phrasesIgnores(1, 5, null).length === 1);
  const depotTsx = lire("src/app/depot/[token]/Depot.tsx");
  ok("la page : « Photos seulement : les vidéos ne partent pas. » sous le bouton, toujours visible ; plus de « fichier(s) ignoré(s) »",
    D.PHOTOS_SEULEMENT === "Photos seulement : les vidéos ne partent pas." && /<\/button>\s*<p className="ec-dp-note">\{PHOTOS_SEULEMENT\}<\/p>/.test(depotTsx)
      && /phrasesIgnores\(vue\.ignores, vue\.videos, vue\.premiereVideo\)/.test(depotTsx) && !/fichier\(s\) ignoré\(s\)/.test(depotTsx));
  const moteurV = lire("src/app/edition/_composants/depot/moteur.ts");
  ok("le moteur compte les videos parmi les fichiers ecartes, par la regle pure",
    /this\.ignores\+\+;\s*if \(estVideo\(f\.name, f\.type\)\) \{\s*this\.videos\+\+;\s*this\.premiereVideo \?\?= f\.name;/.test(moteurV)
      && /videos: 0, premiereVideo: null/.test(lire("src/app/edition/_composants/depot/useMoteur.ts")));
}

titre("— T-152 / D26 : accepter une proposition n'engage pas ; l'atelier envoie le devis a signer —");
{
  const V = LivraisonLot;
  const doc = (id: string, type: string, quand: string, statut: string | null = null) => ({ id, type, quand, statut, libelle: id });
  const docs = [
    doc("devis-initial", "devis", "2026-10-01T10:00:00.000Z"),
    doc("p1", "proposition", "2026-10-10T10:00:00.000Z", "Acceptée le 12 octobre 2026 à 14:03"),
    doc("p2", "proposition", "2026-10-11T10:00:00.000Z"),
    doc("p3", "proposition", "2026-10-12T10:00:00.000Z", "Acceptée le 13 octobre 2026 à 09:00"),
    doc("devis-p3", "devis", "2026-10-14T10:00:00.000Z"),
  ];
  ok("devisAEnvoyer : une proposition acceptee sans devis depose APRES elle ; le devis du depart ne compte pas ; non acceptee : rien",
    JSON.stringify(V.devisAEnvoyer(docs.slice(0, 4)).map((d) => d.id)) === '["p1","p3"]' && JSON.stringify(V.devisAEnvoyer(docs).map((d) => d.id)) === "[]"
      && JSON.stringify(V.devisAEnvoyer([docs[0], docs[1]]).map((d) => d.id)) === '["p1"]' && V.devisAEnvoyer([docs[2]]).length === 0);
  ok("propositionAcceptee lit le statut pose par la route (« Acceptée le … »)",
    V.propositionAcceptee({ type: "proposition", statut: "Acceptée le 1 octobre" }) && !V.propositionAcceptee({ type: "devis", statut: "Acceptée le 1 octobre" })
      && !V.propositionAcceptee({ type: "proposition", statut: null }) && /statut_texte: statut/.test(lire("src/app/api/collectif/proposition/route.ts"))
      && lire("src/app/api/collectif/proposition/route.ts").includes(`const statut = \`${V.PREFIXE_ACCEPTEE} le \${`));
  const vous = V.phrasesProposition(false);
  const toi = V.phrasesProposition(true);
  ok("la carte du client : accepter ne l'engage pas, il recevra le devis a signer ; au registre ; aucun montant",
    /Accepter ne vous engage pas : vous recevrez ensuite le devis à signer\./.test(vous.aLire) && /Accepter ne t'engage pas : tu recevras ensuite le devis à signer\./.test(toi.aLire)
      && /C'est le devis signé qui engage\./.test(vous.confirmer) && /C'est le devis signé qui engage\./.test(toi.confirmer)
      && ![vous, toi].some((p) => Object.values(p).some((t) => /€|—/.test(t))) && !/\bvous\b|\bvotre\b/.test(Object.values(toi).join(" ")));
  const carte = lire("src/app/edition/[token]/atelier/Propositions.tsx");
  ok("la carte lit ces phrases (plus de « l'ajoute à votre édition »), avant, pendant et apres l'acceptation",
    /const phrases = phrasesProposition\(tu\);/.test(carte) && /phrases\.aLire/.test(carte) && /<p className="ec-texte">\{phrases\.confirmer\}<\/p>/.test(carte)
      && /\{acceptee \? <span className="ec-note">\{phrases\.apres\}<\/span> : null\}/.test(carte) && !/l'ajoute à (votre|ton) édition/.test(carte));
  const ficheP = lire("src/app/admin/collectif/[id]/page.tsx");
  ok("la fiche : « À faire : envoyer le devis à signer » pour chaque proposition acceptee sans devis, vers Documents ; le panneau Documents le redit",
    V.A_FAIRE_DEVIS === "À faire : envoyer le devis à signer" && /const devisEnAttente = devisAEnvoyer\(documents\);/.test(ficheP) && /<strong>\{A_FAIRE_DEVIS\}<\/strong>/.test(ficheP)
      && /href="\?onglet=documents" data-onglet="documents"/.test(ficheP) && /devisAEnvoyer\(documents\)/.test(lire("src/app/admin/collectif/[id]/PanneauDocuments.tsx"))
      && /\(d\) => \(\{ id: d\.id, type: d\.type,/.test(lire("src/app/admin/collectif/donnees.ts")));
  const decisions = lire("docs/DECISIONS.md");
  ok("les deux decisions sont ecrites (D26 : accepter n'engage pas ; D27 : total vide = pas de limite)",
    /^D26 \(20\/10\/2026\)/m.test(decisions) && /^D27 \(20\/10\/2026\)/m.test(decisions));
}

/* T-167 : plus de 1 000 photos. Supabase plafonne CHAQUE reponse a 1 000 lignes (« Max rows »,
   confirme le 19/10) : joue contre une fausse base qui plafonne pareil, respecte `range` et
   `order`, et rend les egalites dans un ordre QUELCONQUE (rebattu a chaque requete, comme
   PostgreSQL ne promet rien entre deux lignes de meme `confirmee_le`). Sans reseau. */
async function sondeT167() {
  const L = await import("@/lib/collectif/lignes");
  const C = await import("@/lib/collectif/collecte");
  const D = await import("@/lib/collectif/depot");
  const { randomUUID } = await import("node:crypto");
  const { JOURNAL_DE_LOT } = await import("@/lib/collectif/recit");

  /* La console du module, captee : on verifie qu'il PARLE, sans salir la sortie du harnais. */
  const ecoute = async <R>(f: () => Promise<R>): Promise<{ r: R; dit: string[] }> => {
    const dit: string[] = [];
    const avant = console.error;
    console.error = (...m: unknown[]) => void dit.push(m.map(String).join(" "));
    try {
      return { r: await f(), dit };
    } finally {
      console.error = avant;
    }
  };

  titre("— T-167 : lire TOUTES les lignes, par tranches de 1 000 (fausse base plafonnee) —");
  {
    type Rangee = { id: string; confirmee_le: string };
    type Erreur = { code: string; message: string };
    type Reponse = { data: Rangee[] | null; error: Erreur | null };
    type FausseRequete = { order(colonne: string, options?: { ascending?: boolean }): FausseRequete; range(de: number, a: number): Promise<Reponse> };
    const PLAFOND_API = 1000;
    /* 2 500 photos arrivees par lots de 25 qui partagent le meme instant ; un premier lot de 10,
       pour que les frontieres de tranche (1 000, 2 000) tombent AU MILIEU d'un lot. Des ids
       tires au hasard, sans rapport avec l'ordre d'arrivee. */
    const table = (n: number): Rangee[] =>
      Array.from({ length: n }, (_, i) => ({ id: randomUUID(), confirmee_le: new Date(Date.UTC(2026, 9, 19, 10, 0, Math.floor((i + 15) / 25))).toISOString() }));
    const base = (rangees: Rangee[], panne?: (appel: number) => Erreur | null) => {
      const appels: { ordres: string[]; de: number; a: number }[] = [];
      const fabrique = (): FausseRequete => {
        const ordres: { colonne: keyof Rangee; croissant: boolean }[] = [];
        const requete: FausseRequete = {
          order(colonne, options) {
            ordres.push({ colonne: colonne as keyof Rangee, croissant: options?.ascending !== false });
            return requete;
          },
          async range(de, a) {
            const appel = appels.length;
            appels.push({ ordres: ordres.map((o) => `${o.colonne}${o.croissant ? "" : " desc"}`), de, a });
            const erreur = panne?.(appel) ?? null;
            if (erreur) return { data: null, error: erreur };
            const hasard = new Map(rangees.map((r) => [r.id, Math.random()]));
            const triees = [...rangees].sort((x, y) => {
              for (const o of ordres) if (x[o.colonne] !== y[o.colonne]) return (x[o.colonne] < y[o.colonne] ? -1 : 1) * (o.croissant ? 1 : -1);
              return (hasard.get(x.id) ?? 0) - (hasard.get(y.id) ?? 0);
            });
            /* Le plafond de l'API : jamais plus de 1 000 lignes, quelle que soit la tranche demandee. */
            return { data: triees.slice(de, Math.min(a + 1, de + PLAFOND_API)), error: null };
          },
        };
        return requete;
      };
      return { fabrique, appels };
    };
    const sansTrouNiDoublon = (lues: readonly Rangee[], attendues: readonly Rangee[]) => {
      const ids = new Set(lues.map((r) => r.id));
      return lues.length === attendues.length && ids.size === lues.length && attendues.every((r) => ids.has(r.id));
    };
    const arrivee = { colonne: "confirmee_le", croissant: true };

    const photos = table(2500);
    ok("la fausse base est honnete : une lecture d'un seul coup (l'ancien `.limit(20000)`) rend 1 000 lignes sur 2 500",
      ((await base(photos).fabrique().order("confirmee_le").range(0, 19999)).data ?? []).length === 1000);
    /* Le piege que le second critere evite : paginer sur `confirmee_le` SEUL, contre la meme base. */
    const naif = base(photos);
    const lignesNaives: Rangee[] = [];
    for (let de = 0; de < 2500; de += 1000) lignesNaives.push(...((await naif.fabrique().order("confirmee_le").range(de, de + 999)).data ?? []));
    ok("sans `id` pour departager, des photos du meme instant sautent ou se repetent a la frontiere (la base le reproduit)",
      lignesNaives.length === 2500 && !sansTrouNiDoublon(lignesNaives, photos));

    const essais = await Promise.all(
      Array.from({ length: 5 }, async () => {
        const b = base(photos);
        return { lu: await L.lireToutesLesLignes(b.fabrique, arrivee, "essai"), appels: b.appels };
      })
    );
    ok("2 500 photos (lots de 25 au meme instant, frontieres au milieu d'un lot) : 2 500 rendues, sans trou ni doublon, cinq fois de suite",
      essais.every(({ lu }) => lu.error === null && sansTrouNiDoublon(lu.data ?? [], photos)));
    const premier = essais[0];
    ok("trois tranches de 1 000 (0-999, 1000-1999, 2000-2999), chacune triee par la colonne PUIS par id",
      premier.appels.length === 3 && premier.appels.map((x) => `${x.de}-${x.a}`).join() === "0-999,1000-1999,2000-2999"
        && premier.appels.every((x) => x.ordres.join() === "confirmee_le,id") && L.TAILLE_TRANCHE === 1000);
    const lues = premier.lu.data ?? [];
    ok("l'ordre rendu est l'ordre d'arrivee, l'id departageant un meme instant",
      lues.every((r, i) => i === 0 || lues[i - 1].confirmee_le < r.confirmee_le || (lues[i - 1].confirmee_le === r.confirmee_le && lues[i - 1].id < r.id)));
    const b2 = base(photos);
    const decroissant = await L.lireToutesLesLignes(b2.fabrique, { colonne: "confirmee_le", croissant: false }, "essai");
    ok("de la plus recente a la plus ancienne : exactement l'inverse (l'id suit le meme sens)",
      (decroissant.data ?? []).map((r) => r.id).join() === [...lues].reverse().map((r) => r.id).join() && b2.appels.every((x) => x.ordres.join() === "confirmee_le desc,id desc"));

    const bords = await Promise.all([0, 999, 1000, 2000].map(async (n) => {
      const t = table(n);
      const b = base(t);
      const lu = await L.lireToutesLesLignes(b.fabrique, arrivee, "essai");
      return { n, ok: lu.error === null && sansTrouNiDoublon(lu.data ?? [], t), appels: b.appels.length };
    }));
    ok("0, 999, 1 000 et 2 000 lignes : tout rendu ; un multiple exact de 1 000 fait une tranche de plus, vide, pour le savoir",
      bords.every((x) => x.ok) && bords.map((x) => x.appels).join() === "1,1,2,3");

    const b3 = base(photos, (appel) => (appel === 1 ? { code: "57014", message: "canceling statement due to statement timeout" } : null));
    const panne = await ecoute(() => L.lireToutesLesLignes(b3.fabrique, arrivee, "photos d'essai"));
    ok("une erreur en 2e tranche : une ERREUR (son code garde), jamais les 1 000 premieres rendues comme completes, et la console le dit",
      panne.r.data === null && panne.r.error?.code === "57014" && b3.appels.length === 2 && panne.dit.some((m) => m.includes("photos d'essai") && m.includes("tranche 2")));
    const b4 = base(photos, (appel) => (appel === 0 ? { code: "42703", message: "column does not exist" } : null));
    const colonne = await L.lireToutesLesLignes(b4.fabrique, arrivee, "essai");
    ok("une colonne absente garde son code 42703 : les replis `colonneAbsente` des appelants jouent toujours",
      colonne.data === null && colonneAbsente(colonne.error?.code) && b4.appels.length === 1);

    /* Le garde-fou : une base qui ne s'arrete jamais (sans tri : seul le compte compte ici). */
    const sansFin = (total: number) => {
      const appels: { de: number; a: number }[] = [];
      const fabrique = (): FausseRequete => {
        const requete: FausseRequete = {
          order: () => requete,
          async range(de, a) {
            appels.push({ de, a });
            const n = Math.max(0, Math.min(a + 1, de + PLAFOND_API, total) - de);
            return { data: Array.from({ length: n }, (_, k) => ({ id: String(de + k), confirmee_le: "" })), error: null };
          },
        };
        return requete;
      };
      return { fabrique, appels };
    };
    const max = L.MAX_TRANCHES * L.TAILLE_TRANCHE;
    const trop = sansFin(max + 1);
    const arrete = await ecoute(() => L.lireToutesLesLignes(trop.fabrique, arrivee, "photos sans fin"));
    ok(`au-dela de ${max.toLocaleString("fr-FR")} lignes : une erreur ${L.ERREUR_TROP_DE_LIGNES} dite en console, jamais une liste tronquee en silence`,
      arrete.r.data === null && arrete.r.error?.code === L.ERREUR_TROP_DE_LIGNES && arrete.dit.some((m) => m.includes("photos sans fin"))
        && trop.appels.length === L.MAX_TRANCHES + 1 && trop.appels[L.MAX_TRANCHES].de === max && trop.appels[L.MAX_TRANCHES].a === max);
    const pile = sansFin(max);
    const juste = await L.lireToutesLesLignes(pile.fabrique, arrivee, "essai");
    ok(`exactement ${max.toLocaleString("fr-FR")} lignes : rendues en entier (une ligne de plus est demandee pour le savoir)`,
      juste.error === null && (juste.data ?? []).length === max && pile.appels.length === L.MAX_TRANCHES + 1);
  }

  titre("— T-167 : les filtres `in` par paquets de 100 (la longueur de l'URL) —");
  {
    const ids = Array.from({ length: 250 }, () => randomUUID());
    const paquets = L.enPaquets(ids);
    ok("250 ids : trois paquets (100, 100, 50), dans l'ordre, rien de perdu ; une liste vide n'en fait aucun",
      L.PAQUET_IN === 100 && paquets.map((p) => p.length).join() === "100,100,50" && paquets.flat().join() === ids.join() && L.enPaquets([]).length === 0);
    const url = (valeurs: readonly string[]) => new URLSearchParams({ id: `in.(${valeurs.join(",")})` }).toString().length;
    ok("un paquet de 100 uuid tient sous 4 Ko d'URL ; 500 en faisaient plus de 19 (mesure ici, comme le 19/10)",
      url(paquets[0]) < 4000 && url(Array.from({ length: 500 }, () => randomUUID())) > 19000);
    ok("la verification d'une reprise : 100 cles par appel (500 faisaient 20 a 40 Ko d'URL), pas plus qu'un paquet",
      D.LOT_VERIFICATION === 100 && D.LOT_VERIFICATION <= L.PAQUET_IN && D.LOT_DECLARATION <= L.PAQUET_IN && D.LOT_CONFIRMATION <= L.PAQUET_IN);
    const ecrits = ["src/app/api/collectif/photos/marquer/route.ts", "src/app/api/collectif/dossiers/route.ts", "src/lib/collectif/enrichissement.ts"].map(lire);
    ok("« Sélectionner tout ce dossier », ranger un dossier, poser un lieu : les ids partent par `enPaquets`, plus jamais 500 d'un coup",
      ecrits.every((s) => /for \(const paquet of enPaquets\(/.test(s) && /\.in\("id", paquet\)/.test(s) && !/i \+= 500/.test(s) && !/slice\(i, i \+ 500\)/.test(s)));
  }

  titre("— T-167 / T-168 : les comptes du plafond se font EN BASE (head), jamais en lisant les lignes —");
  {
    type Appel = { table: string; colonnes: string; options: unknown; filtres: string[]; valeurs: readonly string[] };
    type Rendu = { data?: unknown; count?: number | null; error: { code: string; message: string } | null };
    type FausseQ = {
      eq(c: string, v: unknown): FausseQ;
      or(f: string): FausseQ;
      in(c: string, v: readonly string[]): FausseQ;
      not(c: string): FausseQ;
      is(c: string): FausseQ;
      gt(c: string): FausseQ;
      order(): FausseQ;
      range(): FausseQ;
      limit(): FausseQ;
      then(oui: (r: Rendu) => unknown, non?: (e: unknown) => unknown): Promise<unknown>;
    };
    const fausse = (rendre: (a: Appel, rang: number) => Rendu) => {
      const appels: Appel[] = [];
      const client = {
        from: (table: string) => ({
          select: (colonnes: string, options?: unknown): FausseQ => {
            const a: Appel = { table, colonnes, options, filtres: [], valeurs: [] };
            const rang = appels.length;
            appels.push(a);
            const note = (f: string): FausseQ => {
              a.filtres.push(f);
              return q;
            };
            const q: FausseQ = {
              eq: (c: string, v: unknown) => note(`eq ${c} ${String(v)}`),
              or: (f: string) => note(`or ${f}`),
              in: (c: string, v: readonly string[]) => {
                a.valeurs = v;
                return note(`in ${c}`);
              },
              not: (c: string) => note(`not ${c}`),
              is: (c: string) => note(`is ${c}`),
              gt: (c: string) => note(`gt ${c}`),
              order: () => note("order"),
              range: () => note("range"),
              limit: () => note("limit"),
              then: (oui: (r: Rendu) => unknown, non?: (e: unknown) => unknown) => Promise.resolve(rendre(a, rang)).then(oui, non),
            };
            return q;
          },
        }),
      };
      return { client: client as unknown as Parameters<typeof C.compterPourPlafond>[0], appels };
    };
    const LUNDI_MIDI = new Date("2026-10-19T12:00:00.000Z");
    const filtre = C.filtreDansPlafond(LUNDI_MIDI);
    const depuis = new Date(LUNDI_MIDI.getTime() - DELAI_DECLARATION_MORTE_MS).toISOString();
    ok("le filtre de la base : arrivee, OU declaree apres maintenant - 2 h",
      filtre === `confirmee_le.not.is.null,created_at.gt.${depuis}` && depuis === "2026-10-19T10:00:00.000Z");
    /* Le filtre lu comme PostgREST le lit, contre la regle pure, de part et d'autre du delai. */
    const selonLaBase = (l: { confirmee_le: string | null; created_at: string }) =>
      filtre.split(",").some((c) => {
        const m = /^(confirmee_le|created_at)\.(?:not\.is\.null|gt\.(.+))$/.exec(c);
        if (!m) return false;
        return m[2] === undefined ? l[m[1] as "confirmee_le"] !== null : Date.parse(l[m[1] as "created_at"]) > Date.parse(m[2]);
      });
    const ilYa = (ms: number) => new Date(LUNDI_MIDI.getTime() - ms).toISOString();
    const cas = [
      { confirmee_le: ilYa(5), created_at: ilYa(DELAI_DECLARATION_MORTE_MS * 9) },
      { confirmee_le: null, created_at: ilYa(10_000) },
      { confirmee_le: null, created_at: ilYa(DELAI_DECLARATION_MORTE_MS - 1) },
      { confirmee_le: null, created_at: ilYa(DELAI_DECLARATION_MORTE_MS) },
      { confirmee_le: null, created_at: ilYa(DELAI_DECLARATION_MORTE_MS + 1) },
    ];
    ok("le filtre de la base dit EXACTEMENT ce que dit `compteDansPlafond` (arrivee, recente, a la milliseconde du delai, morte)",
      cas.every((l) => selonLaBase(l) === compteDansPlafond(l, LUNDI_MIDI)) && cas.map((l) => compteDansPlafond(l, LUNDI_MIDI)).join() === "true,true,true,false,false");

    const avecLien = fausse((_a, rang) => ({ count: rang === 0 ? 2500 : 7, error: null }));
    const lu = await C.compterPourPlafond(avecLien.client, "ed-1", "app-1", LUNDI_MIDI, "lien-1");
    const [total, parAppareil] = avecLien.appels;
    const tete = (a: Appel | undefined) => a?.table === "collectif_photos" && a.colonnes === "id" && JSON.stringify(a.options) === JSON.stringify({ count: "exact", head: true });
    ok("deux comptes `head` exacts, et rien d'autre : ni lignes, ni tri, ni tranche, ni limite",
      avecLien.appels.length === 2 && avecLien.appels.every(tete) && avecLien.appels.every((a) => !a.filtres.some((f) => /^(order|range|limit|in)/.test(f))));
    ok("le total : l'edition ET le filtre du plafond ; par appareil : le meme, plus l'appareil et le lien",
      total?.filtres.join(" | ") === `eq edition_id ed-1 | or ${filtre}`
        && parAppareil?.filtres.join(" | ") === `eq edition_id ed-1 | or ${filtre} | eq appareil_id app-1 | eq provenance_id lien-1`);
    ok("le compte de la base est rendu tel quel, au-dela de 1 000 (le plafond total s'applique de nouveau)",
      lu?.total === 2500 && lu.parAppareil === 7);
    const sansLien = fausse(() => ({ count: 3, error: null }));
    await C.compterPourPlafond(sansLien.client, "ed-1", "app-1", LUNDI_MIDI);
    ok("hors d'un lien a plafond : l'appareil compte sur toute l'edition (aucun filtre de lien)",
      sansLien.appels[1]?.filtres.join(" | ") === `eq edition_id ed-1 | or ${filtre} | eq appareil_id app-1`);
    const sansAppareil = fausse(() => ({ count: 42, error: null }));
    const seul = await C.compterPourPlafond(sansAppareil.client, "ed-1", null, LUNDI_MIDI, "lien-1");
    ok("sans appareil : un seul compte, et 0 par appareil sans requete", sansAppareil.appels.length === 1 && seul?.total === 42 && seul.parAppareil === 0);
    const panne = fausse((_a, rang) => ({ count: null, error: rang === 1 ? { code: "57014", message: "timeout" } : null }));
    const muet = fausse((_a, rang) => ({ count: rang === 0 ? null : 3, error: null }));
    /* L'une APRÈS l'autre : deux écoutes en même temps se volent la console. */
    const enPanne = await ecoute(() => C.compterPourPlafond(panne.client, "ed-1", "app-1", LUNDI_MIDI));
    const sansCompte = await ecoute(() => C.compterPourPlafond(muet.client, "ed-1", "app-1", LUNDI_MIDI));
    ok("un compte en erreur, ou rendu sans nombre : null (la route repond 500), jamais 0 qui ouvrirait le plafond",
      enPanne.r === null && sansCompte.r === null && enPanne.dit.length > 0 && sansCompte.dit.length > 0);

    const cles = Array.from({ length: 250 }, (_, i) => `IMG_${i}.jpg|${1000 + i}|1760000000000`);
    const reprise = fausse((a) => ({ data: a.valeurs.filter((_c, k) => k % 2 === 0).map((c) => ({ id: `id-${c}`, r2_key: `r2/${c}`, cle_fichier: c, confirmee_le: c.startsWith("IMG_1") ? "2026-10-19T10:00:00Z" : null })), error: null }));
    const existants = await C.lireExistants(reprise.client, "ed-1", [...cles, cles[0]]);
    ok("la reprise : 250 cles (un doublon ote) en trois lectures de 100 au plus, toutes sur l'edition ; ce qui est trouve est rendu",
      reprise.appels.length === 3 && reprise.appels.every((a) => a.valeurs.length <= L.PAQUET_IN && a.filtres.join(" | ") === "eq edition_id ed-1 | in cle_fichier")
        && reprise.appels.flatMap((a) => a.valeurs).length === 250 && existants?.size === 125 && existants.get(cles[100])?.confirmee === true && existants.get(cles[0])?.confirmee === false);
    const reprisePanne = fausse((_a, rang) => (rang === 1 ? { data: null, error: { code: "57014", message: "timeout" } } : { data: [], error: null }));
    ok("un paquet illisible : null (500), jamais une reprise a moitie lue",
      (await ecoute(() => C.lireExistants(reprisePanne.client, "ed-1", cles))).r === null);
  }

  titre("— T-167 : les lectures plafonnees, la confirmation rejouee, le journal de la fiche (relus dans le code) —");
  {
    const sites = [
      "src/app/api/collectif/photos/route.ts",
      "src/app/edition/[token]/donnees.ts",
      "src/app/admin/collectif/donnees.ts",
      "src/app/api/admin/collectif/editions/[id]/lot/route.ts",
      "src/app/api/collectif/photos/marquer/route.ts",
      "src/app/api/collectif/dossiers/route.ts",
      "src/lib/collectif/enrichissement.ts",
    ];
    const code = (f: string) => lire(f).replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
    ok("les sept lectures de photos passent par `lireToutesLesLignes` ; plus aucun `.limit(20000)` ni `.limit(2000)` sur les photos",
      sites.every((f) => /lireToutesLesLignes<\w+>\(/.test(code(f)) && !/\.limit\((2000|20000)\)/.test(code(f))));
    const collecte = lire("src/lib/collectif/collecte.ts");
    ok("collecte.ts : `compterPourPlafond` compte (head), lance ses deux comptes ensemble, ne lit aucune ligne",
      /count: "exact", head: true/.test(collecte) && /Promise\.all\(\[compter\(\), duLien\(\)\]\)/.test(collecte) && !/\.limit\(/.test(collecte) && !/compteDansPlafond\(/.test(collecte));

    const lot = lire("src/app/api/admin/collectif/editions/[id]/lot/route.ts");
    const iCompte = lot.indexOf('select("id", { count: "exact", head: true })');
    ok("le lot : le compte exact AVANT la lecture ; moins de lignes lues que de photos comptees = 500 `lot_incomplet` qui donne les deux nombres ; `total` rendu",
      iCompte > 0 && iCompte < lot.indexOf("lireToutesLesLignes<Ligne>(") && /if \(total === null \|\| data\.length < total\)/.test(lot)
        && /error: "lot_incomplet", message, lues: data\.length, total \}, \{ status: 500 \}/.test(lot) && /photos lues sur \$\{total\.toLocaleString\("fr-FR"\)\} arrivées/.test(lot)
        && /return NextResponse\.json\(\{ photos, provenance, selection, total, lues: data\.length \}\)/.test(lot));
    const panneau = lire("src/app/admin/collectif/[id]/PanneauCollecte.tsx");
    ok("l'ecran du lot affiche le refus du serveur au lieu de « N photos écrites », et n'ouvre aucun dossier sur le disque",
      /if \(!rep\.ok\) \{/.test(panneau) && /setEtat\(typeof refus\?\.message === "string" \? refus\.message :/.test(panneau)
        && panneau.indexOf("if (!rep.ok) {") < panneau.indexOf("getDirectoryHandle("));

    const complete = lire("src/app/api/collectif/depot/complete/route.ts");
    ok("la confirmation est idempotente : `confirmee_le` lu ; une photo deja confirmee est rendue sans update ; l'update porte `.is(\"confirmee_le\", null)`",
      /\.select\("id, r2_key, confirmee_le"\)/.test(complete) && /for \(const l of lignes\) if \(l\.confirmee_le\) confirmees\.push\(l\.id\);/.test(complete)
        && /const aConfirmer = lignes\.filter\(\(l\) => !l\.confirmee_le\);/.test(complete) && /\.eq\("id", l\.id\)\s*\.is\("confirmee_le", null\)\s*\.select\("id"\)/.test(complete));
    ok("seules les NOUVELLES se comptent, se journalisent et se relisent (un lot rejoue ne double rien)",
      /"photos_confirmees", \{ n: nouvelles\.length, role: acces\.role \}/.test(complete) && /enrichirCollectif\(makeSupabase\(\), edition\.id, nouvelles\)/.test(complete)
        && !/n: confirmees\.length/.test(complete) && /if \(ecrites\?\.length\) nouvelles\.push\(l\.id\);/.test(complete));

    const fiche = lire("src/app/admin/collectif/donnees.ts");
    ok("le journal de la fiche ne lit pas les lignes ecrites a chaque lot (`photos_confirmees`, `metadonnees_lues`) : elles ne chassent plus le reste",
      JOURNAL_DE_LOT.join() === "photos_confirmees,metadonnees_lues"
        && /\.not\("type", "in", `\(\$\{JOURNAL_DE_LOT\.join\(","\)\}\)`\)\s*\.order\("created_at", \{ ascending: false \}\)\s*\.limit\(100\)/.test(fiche));
    ok("ces lignes restent ecrites et lisibles en clair ; « Collecte terminée par » (un `geste`) reste dans le journal lu",
      JOURNAL_DE_LOT.every((t) => phraseEvenement(t, { n: 3, traitees: 3, lieux: 1 }) !== t) && !(JOURNAL_DE_LOT as readonly string[]).includes("geste")
        && /"photos_confirmees"/.test(lire("src/app/api/collectif/depot/complete/route.ts")) && /"metadonnees_lues"/.test(lire("src/lib/collectif/enrichissement.ts")));
  }
}

/* ═══════════════════ T-159 : LA FIN DES PHOTOS D'UNE ÉDITION LIVRÉE ═══════════════════ */

titre("— T-159 : le delai est OBLIGATOIRE, sans aucune valeur par defaut —");
{
  const D = Retention.lireDelaiJours;
  ok("absent = null (aucun defaut), meme avec les autres arguments", D([]) === null && D(["--vraiment"]) === null && D(["--edition", E]) === null);
  ok("« --jours 30 » et « --jours=30 » donnent 30", D(["--jours", "30"]) === 30 && D(["--jours=30"]) === 30 && D(["--vraiment", "--jours", "1"]) === 1);
  ok("zero, negatif, decimal, mot, vide, blanc, notation scientifique : refuses",
     [["--jours", "0"], ["--jours", "-3"], ["--jours", "1.5"], ["--jours", "trente"], ["--jours"], ["--jours="], ["--jours", " 30"], ["--jours", "1e2"], ["--jours", "0x1e"]]
       .every((a) => D(a) === null));
  ok("cinq chiffres au plus (99999 passe, 123456 non)", D(["--jours", "99999"]) === 99999 && D(["--jours", "123456"]) === null);
}

titre("— T-159 : qui perd son coffre, et qui jamais —");
{
  const MAINTENANT_R = new Date("2026-11-20T12:00:00Z");
  const il = (jours: number) => new Date(MAINTENANT_R.getTime() - jours * 86_400_000).toISOString();
  const ed = (etat: string, livree_le?: string | null, extra: Partial<Retention.EditionPourRetention> = {}): Retention.EditionPourRetention => ({
    etat,
    cloture_le: null,
    livraison: livree_le === undefined ? {} : { livree_le },
    photos_supprimees_le: null,
    ...extra,
  });
  const V = (e: Retention.EditionPourRetention, d = 30) => Retention.verdictRetention(e, MAINTENANT_R, d);
  const motif = (v: Retention.VerdictRetention) => (v.effacable ? "effacable" : v.motif);
  ok("avant l'impression : jamais, meme livree il y a 400 jours dans le jsonb",
     ["preparation", "composition", "bat", "bat_valide"].every((s) => motif(V(ed(s, il(400)))) === "non_livree"));
  ok("en impression : jamais", motif(V(ed("impression", il(400)))) === "en_impression");
  ok("expediee mais pas marquee livree : jamais", motif(V(ed("expediee", il(400)))) === "expediee");
  ok("une preparation dont la cloture est passee est en composition (etat effectif) : jamais",
     motif(V(ed("preparation", il(400), { cloture_le: il(400) }))) === "non_livree");
  ok("un etat inconnu : jamais", motif(V(ed("perdue", il(400)))) === "etat_inconnu");
  ok("livree sans date, date nulle, sans fuseau, « le 4 octobre », livraison nulle : jamais (on ne devine pas)",
     motif(V(ed("livree"))) === "livree_sans_date" && motif(V(ed("livree", null))) === "livree_sans_date"
       && motif(V(ed("livree", "2026-10-01T10:00"))) === "livree_sans_date" && motif(V(ed("livree", "le 4 octobre"))) === "livree_sans_date"
       && motif(V(ed("livree", undefined, { livraison: null }))) === "livree_sans_date");
  ok("livree il y a 29 jours, delai 30 : dans le delai, et l'age est rendu pour le rapport",
     (() => { const v = V(ed("livree", il(29))); return !v.effacable && v.motif === "dans_le_delai" && v.jours !== null && Math.round(v.jours) === 29; })());
  ok("livree il y a 30 jours pile, delai 30 : effacable (au moins N jours pleins)", V(ed("livree", il(30))).effacable);
  ok("livree il y a 400 jours : effacable, la date de livraison rendue telle que la base l'a ecrite",
     (() => { const l = il(400); const v = V(ed("livree", l)); return v.effacable && v.livreeLe === l && Math.round(v.jours) === 400; })());
  ok("une livraison datee dans le futur : dans le delai", motif(V(ed("livree", il(-1)))) === "dans_le_delai");
  ok("jamais deux fois : photos_supprimees_le pose l'emporte sur tout", motif(V(ed("livree", il(400), { photos_supprimees_le: il(10) }))) === "deja_effacee");
  ok("l'archive n'epargne RIEN (le trou de T-159) : le verdict ne lit pas archive_le",
     V({ ...ed("livree", il(40)), archive_le: il(35) } as Retention.EditionPourRetention).effacable
       && !/archive_le/.test(lire("src/lib/collectif/retention.ts").replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "")));
  ok("un delai illisible n'efface rien, meme une edition livree il y a dix ans",
     [0, -1, 1.5, Number.NaN, Number.POSITIVE_INFINITY].every((d) => motif(V(ed("livree", il(3650)), d)) === "delai_invalide"));
  ok("chaque motif a sa phrase", (Object.keys(Retention.TEXTE_MOTIF) as Retention.MotifEpargne[]).every((m) => Retention.TEXTE_MOTIF[m].length > 5));
}

titre("— T-159 : ce qui part, ce qui reste (la table FAMILLES, lue sur les cles de cles.ts) —");
{
  const F = (k: string) => Retention.familleDeCle(k, E);
  const EFF = (k: string) => Retention.cleEffacee(k, E);
  const AUTRE_ED = "22222222-3333-4444-8555-666666666666";
  ok("photos : l'original (tout format) et la vignette partent",
     F(clePhoto(E, P, "image/heic")) === "photos" && F(cleVignette(E, P)) === "photos" && EFF(clePhoto(E, P, "image/jpeg")) && EFF(cleVignette(E, P)));
  ok("les rendus du bon a tirer partent (pages, miniatures, gris, couvertures proposees)",
     [clePageTour(E, TOUR, 7, "webp"), cleVignettePageTour(E, TOUR, 7, "jpg"), cleGrisTour(E, TOUR), cleCouverture(E, TOUR, 2, "c3", "jpg")]
       .every((k) => F(k) === "rendus_bat" && EFF(k)));
  ok("les contenus envoyes et les pieces jointes partent",
     F(cleContenu(E, P, "logo.SVG")) === "contenus" && F(clePieceJointe(E, P, "tour1.pdf")) === "pieces_jointes"
       && EFF(cleContenu(E, P, "liste.xlsx")) && EFF(clePieceJointe(E, P, "x.pdf")));
  ok("le PDF de chaque tour RESTE (question ouverte a Mathias : reimpression, preuve du BAT)",
     F(clePdfTour(E, TOUR)) === "pdf_tour" && !EFF(clePdfTour(E, TOUR)));
  ok("les documents de l'atelier RESTENT (devis signe, factures)", F(cleDocument(E, P, "devis signé.pdf")) === "documents" && !EFF(cleDocument(E, P, "facture.pdf")));
  ok("une cle inconnue reste ; une cle d'une autre edition, un style ou un « .. » sont hors edition et restent",
     F(`collectif/${E}/inconnu/a.jpg`) === "autre" && F(`collectif/${E}/photos/${P}/autre.jpg`) === "autre"
       && F(clePhoto(AUTRE_ED, P, "image/jpeg")) === "hors_edition" && F(`collectif/${E}/photos/../../${AUTRE_ED}/photos/${P}/original.jpg`) === "hors_edition"
       && F(cleStyle("riviera", "couverture-1.webp")) === "hors_edition" && F(`numeros/${E}/photos/${P}/original.jpg`) === "hors_edition"
       && !EFF(`collectif/${E}/inconnu/a.jpg`) && !EFF(clePhoto(AUTRE_ED, P, "image/jpeg")));
  ok("« autre » et « hors_edition » ne s'effacent jamais ; chaque famille est dans l'ordre du rapport, une seule fois",
     !Retention.FAMILLES.autre.efface && !Retention.FAMILLES.hors_edition.efface
       && Retention.ORDRE_FAMILLES.length === Object.keys(Retention.FAMILLES).length && new Set(Retention.ORDRE_FAMILLES).size === Retention.ORDRE_FAMILLES.length
       && (Object.keys(Retention.FAMILLES) as Retention.FamilleCoffre[]).every((f) => Retention.ORDRE_FAMILLES.includes(f)));
}

titre("— T-159 : aucune ligne supprimee ; l'image, le lieu et l'appareil se vident —");
{
  const sqlBase = lire("supabase/migrations/20261013_collectif.sql");
  const bloc = sqlBase.slice(sqlBase.indexOf("create table if not exists public.collectif_photos"), sqlBase.indexOf("create index if not exists collectif_photos_edition_idx"));
  const videes = Object.keys(Retention.PATCH_PHOTO_EFFACEE);
  ok("chaque colonne videe est dans la migration 20261013 (aucune colonne fraiche : rien a replier)",
     bloc.length > 500 && videes.length > 0 && videes.every((c) => new RegExp(`^\\s+${c}\\s`, "m").test(bloc)));
  ok("aucune n'est `not null` (l'ecriture ne peut pas echouer sur une contrainte)",
     videes.every((c) => !new RegExp(`^\\s+${c}\\s[^\\n]*not null`, "m").test(bloc)));
  ok("on vide vraiment le lieu, l'appareil, l'identifiant d'appareil, le nom du fichier et la vignette, et rien qu'a null",
     ["gps_lat", "gps_lon", "lieu_ville", "lieu_pays", "appareil", "appareil_id", "nom_origine", "vignette_key", "prise_le", "empreinte"].every((c) => videes.includes(c))
       && Object.values(Retention.PATCH_PHOTO_EFFACEE).every((v) => v === null));
  ok("on GARDE le nom, la preuve de l'accord et la cle effacee (question posee a Mathias)",
     Retention.COLONNES_GARDEES.every((c) => !videes.includes(c)) && (["deposant", "accord_version", "accord_le", "r2_key"] as const).every((c) => (Retention.COLONNES_GARDEES as readonly string[]).includes(c)));
  ok("le journal s'appelle coffre_efface et ne vit que dans collectif_evenements", Retention.TYPE_JOURNAL_RETENTION === "coffre_efface");
}

titre("— T-159 : l'effacement en masse a deux portes, chacune sa racine (r2.racineEffacable) —");
{
  ok("le prefixe d'une edition (prefixeEdition) est accepte, et c'est « collectif »", racineEffacable(prefixeEdition(E)) === "collectif");
  ok("un prefixe vide est refuse (le coffre entier)", racineEffacable("") === null);
  ok("« collectif/ » seul (toutes les editions ET les styles) est refuse, comme « collectif » et « collectif// »",
     racineEffacable("collectif/") === null && racineEffacable("collectif") === null && racineEffacable("collectif//") === null);
  ok("les styles sont refuses", racineEffacable("collectif/styles/") === null && racineEffacable("collectif/styles/riviera/") === null);
  ok("un uuid mal forme est refuse : tronque, trop long, majuscules, sans tirets, un mot, un « .. »",
     [`collectif/${E.slice(0, -1)}/`, `collectif/${E}0/`, `collectif/${E.toUpperCase()}/`, `collectif/${E.replace(/-/g, "")}/`, "collectif/abc/", "collectif/../", `collectif/${E}/../`, `collectif/${E.replace("b", "g")}/`]
       .every((p) => racineEffacable(p) === null));
  ok("sans la barre finale, un sous-dossier, des blancs, un retour a la ligne, une barre en tete : refuses",
     [`collectif/${E}`, `collectif/${E}/photos/`, ` collectif/${E}/`, `collectif/${E}/ `, `collectif/${E}/\n`, `/collectif/${E}/`].every((p) => racineEffacable(p) === null));
  ok("le B2C ne bouge pas : numeros/<id>/ reste « numeros » ; « numeros/ » et « numeros/ab » restent refuses",
     racineEffacable(prefixeCoffre("0f3e")) === "numeros" && racineEffacable("numeros/") === null && racineEffacable("numeros/ab") === null);
  const r2src = lire("src/lib/atelier/r2.ts");
  ok("chaque effaceur exige SA racine avant tout appel au coffre ; le balayage commun n'est pas exporte",
     /export async function supprimerPrefixe\(prefixe: string\): Promise<\{[^}]*\}> \{\s*if \(racineEffacable\(prefixe\) !== "numeros"\) \{/.test(r2src)
       && /export async function supprimerCoffreEdition\([\s\S]*?\): Promise<\{[^}]*\}> \{\s*if \(racineEffacable\(prefixe\) !== "collectif"\) \{/.test(r2src)
       && /\nasync function viderPrefixe\(/.test(r2src) && !/export async function viderPrefixe/.test(r2src));
}

titre("— T-159 : le script lit par defaut, n'efface qu'apres --vraiment, par la seule porte collective —");
{
  const brut = lire("scripts/collectif-retention.ts");
  const code = brut.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
  const main = code.slice(code.indexOf("async function main()"));
  const iEff = code.indexOf("async function effacer(");
  const dehors = (code.slice(0, iEff) + code.slice(code.indexOf("async function main()"))).replace(/import[^;]+;/g, "");
  ok("le delai passe par lireDelaiJours, son absence arrete tout AVANT de lire .env.local ou la base",
     /const delai = lireDelaiJours\(argv\);\s*if \(delai === null\) \{\s*throw new Error/.test(main) && main.indexOf("lireDelaiJours(") < main.indexOf("chargerEnv()"));
  ok("aucune valeur par defaut pour le delai (ni `?? 30`, ni `|| 30`, ni `delai = 30`)",
     !/lireDelaiJours\([^)]*\)\s*(\?\?|\|\|)/.test(code) && !/\bdelai\s*=\s*\d/.test(code));
  ok("`vraiment` ne vient que du mot --vraiment, et l'unique `await effacer(` vient APRES `if (!vraiment) {`",
     /const vraiment = argv\.includes\("--vraiment"\);/.test(main) && main.indexOf("if (!vraiment) {") > 0
       && main.indexOf("if (!vraiment) {") < main.indexOf("await effacer(") && (code.match(/await effacer\(/g) ?? []).length === 1);
  ok("toutes les ecritures sont dans `effacer` : aucun update, insert, upsert, delete, effacement ni journal ailleurs",
     iEff > 0 && !/\.(update|insert|upsert|delete)\(/.test(dehors) && !/supprimerCoffreEdition\(|supprimerPrefixe\(|journaliser\(|DeleteObject/.test(dehors));
  const eff = code.slice(iEff, code.indexOf("async function main()"));
  ok("le coffre d'abord (supprimerCoffreEdition, jamais supprimerPrefixe), un echec arrete l'edition, puis les lignes, puis le marqueur, puis le journal",
     !/supprimerPrefixe\(/.test(code) && /if \(coffre\.echecs > 0\) \{[\s\S]*?return false;/.test(eff)
       && eff.indexOf("supprimerCoffreEdition(prefixeEdition(c.e.id)") < eff.indexOf('from("collectif_photos").update(PATCH_PHOTO_EFFACEE)')
       && eff.indexOf('from("collectif_photos").update(PATCH_PHOTO_EFFACEE)') < eff.indexOf("photos_supprimees_le: maintenant")
       && eff.indexOf("photos_supprimees_le: maintenant") < eff.indexOf("await journaliser("));
  ok("le marqueur ne se pose qu'une fois, le journal va dans collectif_evenements, aucune table du B2C n'est nommee",
     /\.is\("photos_supprimees_le", null\)/.test(eff) && /journaliser\(\s*supabase,\s*\{ editionId: c\.e\.id \},\s*TYPE_JOURNAL_RETENTION/.test(eff)
       && !/from\(["'](numeros|photos|evenements|mails_envoyes)["']\)/.test(code));
  ok("ce qui part est decide par la table FAMILLES (cleEffacee), jamais par une liste du script",
     /supprimerCoffreEdition\(prefixeEdition\(c\.e\.id\), \(cle\) => !cleEffacee\(cle, c\.e\.id\)\)/.test(eff));
  ok("le listage (lecture seule) passe par la meme garde que l'effaceur", /if \(racineEffacable\(prefixe\) !== "collectif"\) throw/.test(code));
  ok("aucun cron, aucune route : seul ce script appelle supprimerCoffreEdition",
     fichiersParSuffixe("src", /\.tsx?$/).every((f) => f === "src/lib/atelier/r2.ts" || !/supprimerCoffreEdition\(/.test(lire(f)))
       && !/collectif-retention/.test(lire("vercel.json")));
  const doc = lire("scripts/CLAUDE.md");
  const iPrudence = doc.indexOf("## À manier avec précaution");
  ok("scripts/CLAUDE.md le range parmi les scripts « À manier avec précaution »", iPrudence > 0 && doc.indexOf("`collectif-retention.ts`", iPrudence) > iPrudence);
}

/* T-159 : les deux effaceurs refusent AVANT tout appel au coffre (aucune variable R2 n'est chargee ici :
   un appel au coffre leverait, et l'epreuve tomberait). */
async function gardeT159() {
  titre("— T-159 : les deux effaceurs refusent avant le moindre appel au coffre —");
  const refuse = async (f: () => Promise<{ supprimes: number; echecs: number }>) => {
    const avant = console.error;
    console.error = () => {};
    try {
      const r = await f();
      return r.supprimes === 0 && r.echecs === 1;
    } catch {
      return false;
    } finally {
      console.error = avant;
    }
  };
  const mauvais = ["", "collectif/", "collectif/styles/", `collectif/${E.toUpperCase()}/`, `collectif/${E}`, prefixeCoffre("0f3e")];
  ok("supprimerCoffreEdition refuse un vide, « collectif/ », les styles, un uuid en majuscules, sans barre finale, un dossier de particulier",
     (await Promise.all(mauvais.map((p) => refuse(() => supprimerCoffreEdition(p, () => false))))).every(Boolean));
  ok("supprimerPrefixe (« Supprimer définitivement », B2C) refuse le coffre d'une edition", await refuse(() => supprimerPrefixe(prefixeEdition(E))));
}

/* La sonde, jouee contre une fausse base (sans reseau) : 23514 = absente, 23503 = appliquee (et plus jamais resondee), le reste = inconnue. */
async function sondeT191() {
  titre("— T-191 : la sonde de la migration, contre une fausse base —");
  const appels: Record<string, unknown>[] = [];
  const fausse = (code: string | null) =>
    ({
      from: (table: string) => ({
        insert: async (ligne: Record<string, unknown>) => {
          appels.push({ table, ...ligne });
          return { error: code ? { code, message: "faux" } : null };
        },
        delete: () => ({ eq: () => ({ eq: async () => ({ error: null }) }) }),
      }),
    }) as unknown as Parameters<typeof migrationDemandes>[0];
  const absente = await migrationDemandes(fausse("23514"));
  const premier = appels[0] as { table: string; type: string; edition_id: string; reponses: unknown } | undefined;
  ok("contrainte encore la (23514) : « absente »", absente === "absente" && premier?.table === "collectif_contenus" && premier.type === TYPE_SONDE && estUuid(premier.edition_id) && JSON.stringify(premier.reponses) === "{}");
  ok("une autre erreur : « inconnue » (la route laisse alors la base trancher)", (await migrationDemandes(fausse("08006"))) === "inconnue");
  ok("la cle etrangere refuse l'edition inconnue (23503) : « appliquee »", (await migrationDemandes(fausse("23503"))) === "appliquee");
  const avant = appels.length;
  ok("une fois vue appliquee, l'instance ne sonde plus", (await migrationDemandes(fausse("23514"))) === "appliquee" && appels.length === avant);
}

void sondeT191().then(sondeT167).then(gardeT159).then(() => {
  console.log(ko === 0 ? "\nTOUT PASSE\n" : `\n${ko} ECHEC(S)\n`);
  process.exit(ko === 0 ? 0 : 1);
});

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
  cleTailleImage,
  estCleImageStyle,
  LARGEURS_REDUITES,
  largeursAProduire,
  lireSaisieStyle,
  lireTailles,
  listeDesTailles,
  manquesPourPublier,
  nomImageStyle,
  slugDepuisNom,
  srcSetDe,
  tailleUtile,
  TYPES_DOUBLES,
  type TailleImage,
} from "@/lib/collectif/styles";
import { ecrireTailles, MIME_TAILLE, produireTailles } from "@/lib/collectif/taillesStyle";
import sharp from "sharp";
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
import { cheminQr, matriceQr, nomFichierQr, pageQrImprimable, svgQr } from "@/lib/collectif/qr";
import * as Grille from "@/lib/collectif/grille";
import * as LotCollectif from "@/lib/collectif/lotCollectif";
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
import * as FiltresPhotos from "@/app/edition/[token]/photos/filtres";
import * as Demandes from "@/lib/collectif/demandes";
import * as PlafondsLot from "@/lib/collectif/plafonds";
import * as LiensLot from "@/lib/collectif/liens";
import * as DepotLot from "@/lib/collectif/depot";
import * as LivraisonLot from "@/lib/collectif/livraison";
import { contrainteRefusee, ERREUR_DEMANDES_ABSENTE, MESSAGE_DEMANDES_ABSENTE, MIGRATION_DEMANDES } from "@/lib/collectif/migration";
import { migrationDemandes, TYPE_SONDE } from "@/lib/collectif/sondeDemandes";
import { estUuid } from "@/lib/collectif/cles";
import * as Retention from "@/lib/collectif/retention";
import * as Fin from "@/lib/collectif/finCollecte";
import * as Mod from "@/lib/collectif/modifierLien";
import { listerCoffreEdition, racineEffacable, supprimerClesEdition, supprimerCoffreEdition, supprimerPrefixe } from "@/lib/atelier/r2";
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
/* La page Photos du responsable : depuis le 20/10 (planches 1, 2, 3), plusieurs fichiers (Collecte, Listes, Grille,
   Agrandir, Liens). Les épreuves qui relisaient l'ancien Collecte.tsx relisent la page entière, même intention. */
const lirePagePhotos = () => fichiersParSuffixe("src/app/edition/[token]/photos", /\.tsx$/).map(lire).join("\n");

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
  /* Planches du 20/10 (T-198, T-199) : la corbeille et les personnes au responsable et a l'atelier ;
     defaire une fusion, effacer pour de bon : l'atelier seul ; le participant se presente, voit
     l'album de son lien, supprime SES photos de CE telephone. */
  gerer_corbeille: ["atelier", "responsable"],
  gerer_personnes: ["atelier", "responsable"],
  defaire_fusion: ["atelier"],
  effacer_photo: ["atelier"],
  se_presenter: ["participant"],
  voir_album: ["participant"],
  supprimer_ses_photos: ["participant"],
};
ok("chaque action, chaque role : exactement le tableau du PRD",
   ACTIONS.length === Object.keys(attenduDroits).length
   && ACTIONS.every((a) => ROLES.every((role) => peut(role, a) === attenduDroits[a].includes(role))));
ok("L'EQUIPE N'ECRIT RIEN : aucune action d'ecriture ne l'admet (deux lectures : l'espace, l'album du participant)",
   ACTIONS_ECRITURE.length === ACTIONS.length - 2 && ACTIONS_ECRITURE.every((a) => !peut("equipe", a)));
ok("l'equipe ne voit pas la corbeille et ne touche a aucune personne (decision 4 du 20/10)",
   !peut("equipe", "gerer_corbeille") && !peut("equipe", "gerer_personnes") && !peut("equipe", "voir_album"));
ok("l'equipe voit l'espace", peut("equipe", "voir_espace"));
ok("le participant depose, se presente, voit l'album de son lien et supprime SES photos ; rien d'autre",
   ACTIONS.filter((a) => peut("participant", a)).join() === "deposer_photos,se_presenter,voir_album,supprimer_ses_photos");
ok("defaire une fusion et effacer pour de bon : l'atelier SEUL",
   ROLES.every((r) => peut(r, "defaire_fusion") === (r === "atelier") && peut(r, "effacer_photo") === (r === "atelier")));
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
      && /lireActuel\("id, plafond_participant_atelier, plafond_participant_client, plafond_total, cloture_le, ouverture_le"\)/.test(lire("src/app/api/admin/collectif/editions/[id]/route.ts"))
      && /if \(lu\.error && personnesAbsentes\(lu\.error\)\) lu = await lireActuel\("id, plafond_participant_atelier, plafond_participant_client, plafond_total, cloture_le"\)/.test(lire("src/app/api/admin/collectif/editions/[id]/route.ts")));
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
  ok("plus AUCUN champ du navigateur pour une date, une heure ou un chiffre dans le formulaire ; le calendrier Bellajour aux quatre endroits (dates, clôture, livraison, ouverture du dépôt, 20/10)",
    !/type="(date|datetime-local|time|number)"/.test(form + lire("src/app/admin/collectif/Pastille.tsx") + cal)
      && (form.match(/<Calendrier\b/g) ?? []).length === 4
      && /mode="plage"/.test(form) && (form.match(/mode="jour"/g) ?? []).length === 3
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

/* ═══════════════════════════ T-172 : LES TAILLES RÉDUITES D'UNE IMAGE DE STYLE ═══════════════════════════ */

titre("— T-172 : une image de style a ses tailles de 600 et 1 200 px, servies en srcset (la regle, pure) —");
{
  const m = img("couverture-c1-a1b2c3d4e5f6.webp");
  ok("la cle d'une taille est a cote de sa maitresse, en WebP, separee par un tiret bas",
     cleTailleImage(m, 600) === "collectif/styles/riviera/couverture-c1-a1b2c3d4e5f6_w600.webp"
     && cleTailleImage(img("double-dense-ab12.jpg"), 1200) === "collectif/styles/riviera/double-dense-ab12_w1200.webp"
     && estCleImageStyle("riviera", cleTailleImage(m, 600)));
  ok("aucun nom de maitresse ne ressemble a une taille : nomImageStyle n'ecrit jamais de tiret bas",
     ["couverture", "double", "echantillon"].every((e) => !nomImageStyle(e as "couverture", "w600_x", "abcd1234", "webp").includes("_")));
  ok("les largeurs : 600 et 1 200 ; on n'agrandit jamais (2 400 → les deux, 1 000 → 600, 600 → rien)",
     JSON.stringify(LARGEURS_REDUITES) === "[600,1200]" && JSON.stringify(largeursAProduire(2400)) === "[600,1200]"
     && JSON.stringify(largeursAProduire(1000)) === "[600]" && largeursAProduire(600).length === 0 && largeursAProduire(0).length === 0 && largeursAProduire(Number.NaN).length === 0);
  ok("une taille plus lourde que sa maitresse ne sert a rien : ecartee", tailleUtile(8000, 19000) && !tailleUtile(19000, 19000) && !tailleUtile(30000, 19000) && !tailleUtile(0, 19000));
  const bonnes: TailleImage[] = [{ largeur: 2400, key: m }, { largeur: 1200, key: cleTailleImage(m, 1200) }, { largeur: 600, key: cleTailleImage(m, 600) }];
  const lues = lireTailles("riviera", m, bonnes);
  ok("lireTailles garde les tailles qui DERIVENT de la maitresse et la maitresse, de la plus etroite a la plus large",
     JSON.stringify(lues.map((t) => t.largeur)) === "[600,1200,2400]" && lues[2].key === m);
  const autre = img("couverture-c1-ffffffffffff.webp");
  ok("les tailles d'une AUTRE maitresse (image remplacee, liste gardee par l'ecran) sont ecartees : jamais une vignette d'une autre image",
     lireTailles("riviera", autre, bonnes).length === 0
     && lireTailles("riviera", m, [{ largeur: 600, key: cleTailleImage(autre, 600) }, { largeur: 2400, key: m }]).length === 0);
  ok("une taille d'un autre style, une largeur inconnue, une cle hors du style : ecartees",
     lireTailles("autre", m, bonnes).length === 0
     && lireTailles("riviera", m, [{ largeur: 800, key: cleTailleImage(m, 800) }, { largeur: 2400, key: m }]).length === 0
     && lireTailles("riviera", "numeros/x/y.webp", bonnes).length === 0);
  ok("sans taille reduite, ou une liste illisible : [] (l'ecran garde la maitresse)",
     lireTailles("riviera", m, [{ largeur: 2400, key: m }]).length === 0 && lireTailles("riviera", m, "600").length === 0 && lireTailles("riviera", m, null).length === 0
     && lireTailles("riviera", m, [{ largeur: "600", key: cleTailleImage(m, 600) }]).length === 0);
  ok("une taille aussi large que la maitresse ne sert a rien : ecartee",
     JSON.stringify(lireTailles("riviera", m, [{ largeur: 600, key: cleTailleImage(m, 600) }, { largeur: 1200, key: cleTailleImage(m, 1200) }, { largeur: 1000, key: m }]).map((t) => t.largeur)) === "[600,1000]");
  const liste = listeDesTailles(m, 2400, [{ largeur: 600, key: cleTailleImage(m, 600) }, { largeur: 1200, key: cleTailleImage(m, 1200) }]);
  ok("aller-retour : ce que la route rend (listeDesTailles), la saisie le garde tel quel (lireTailles)",
     JSON.stringify(lireTailles("riviera", m, liste)) === JSON.stringify(liste) && listeDesTailles(m, 2400, []).length === 0);
  ok("srcSetDe : « url 600w, url 1200w » ; une adresse avec un blanc ou une virgule est ecartee ; rien = null",
     srcSetDe([{ largeur: 600, url: "https://a/x?s=1%2C2" }, { largeur: 1200, url: "https://a/y" }]) === "https://a/x?s=1%2C2 600w, https://a/y 1200w"
     && srcSetDe([{ largeur: 600, url: "https://a/x?s=1,2" }, { largeur: 1200, url: null }, { largeur: 2400, url: "https://a/ y" }]) === null && srcSetDe([]) === null);

  /* La saisie de l'éditeur : les tailles valides restent, les autres tombent, et sans elles rien ne change. */
  const couv = (tailles: unknown) => lireSaisieStyle({ couvertures: [{ cle: "c1", image_key: m, legende: "", tailles }] }, "modification", "riviera");
  const gardee = couv(liste);
  ok("un enregistrement de l'editeur GARDE les tailles valides d'une couverture (sinon il les effacerait)",
     gardee.ok && JSON.stringify((gardee.patch.couvertures as { tailles?: unknown }[])[0].tailles) === JSON.stringify(liste));
  const perimee = couv(listeDesTailles(autre, 2400, [{ largeur: 600, key: cleTailleImage(autre, 600) }]));
  ok("…et laisse tomber celles d'une autre image ; sans tailles, la couverture est ecrite exactement comme avant",
     perimee.ok && !("tailles" in (perimee.patch.couvertures as object[])[0])
     && (() => { const x = couv(undefined); return x.ok && JSON.stringify(x.patch.couvertures) === JSON.stringify([{ cle: "c1", image_key: m, legende: "" }]); })());
  const dm = img("double-dense-ab12cd34.webp");
  const dbl2 = lireSaisieStyle({ doubles: [{ type: "dense", image_key: dm, legende: "", tailles: listeDesTailles(dm, 1800, [{ largeur: 600, key: cleTailleImage(dm, 600) }]) }] }, "modification", "riviera");
  const em = img("echantillon-typo-ab12cd34.webp");
  const ty = lireSaisieStyle({ typos: { titres: "Fraunces", texte: "Inter", echantillon_key: em, echantillon_tailles: listeDesTailles(em, 1600, [{ largeur: 600, key: cleTailleImage(em, 600) }]) } }, "modification", "riviera");
  ok("les doubles pages et l'echantillon des typographies gardent aussi leurs tailles",
     dbl2.ok && ((dbl2.patch.doubles as { type: string; tailles?: TailleImage[] }[]).find((d) => d.type === "dense")?.tailles?.length ?? 0) === 2
     && ty.ok && ((ty.patch.typos as { echantillon_tailles?: TailleImage[] }).echantillon_tailles?.length ?? 0) === 2
     && (() => { const x = lireSaisieStyle({ typos: { titres: "F", texte: "I", echantillon_key: em } }, "modification", "riviera"); return x.ok && !("echantillon_tailles" in (x.patch.typos as object)); })());

  /* Le chemin dans le code : l'envoi, l'éditeur, le mur, les écrans. */
  const routeImage = lire("src/app/api/admin/collectif/styles/[id]/image/route.ts");
  ok("la route d'envoi ecrit la maitresse PUIS ses tailles, et les rend ; une production ratee n'echoue pas l'envoi",
     routeImage.indexOf("await ecrireObjet(key, octets, type)") > 0 && routeImage.indexOf("await ecrireObjet(key, octets, type)") < routeImage.indexOf("const tailles = await taillesPourImage(key, octets)")
     && /NextResponse\.json\(\{ ok: true, key, url: lecture, tailles, journal \}/.test(routeImage) && /tailles: tailles\.filter/.test(routeImage));
  const fabrique = lire("src/lib/collectif/taillesStyle.ts");
  ok("la fabrique : sharp, jamais la maitresse reecrite, l'en-tete de cache range avec l'objet (T-176), aucune exception",
     /from "sharp"/.test(fabrique) && /ecrireObjet\(t\.key, t\.octets, MIME_TAILLE, \{ cacheControl: CACHE_VIGNETTE \}\)/.test(fabrique) && !/ecrireObjet\(imageKey/.test(fabrique)
     && /if \(!tailleUtile\(sortie\.byteLength, octets\.byteLength\)\) continue;/.test(fabrique) && MIME_TAILLE === "image/webp");
  const editeur = lire("src/app/admin/collectif/styles/[id]/EditeurStyle.tsx");
  ok("l'editeur range les tailles AVEC la cle, a chaque envoi (couverture, double page, echantillon)",
     /image_key: envoi\.key, legende: "", tailles: envoi\.tailles/.test(editeur) && /image_key: envoi\.key, tailles: envoi\.tailles/.test(editeur) && /echantillon_key: envoi\.key, echantillon_tailles: envoi\.tailles/.test(editeur));
  ok("la page de l'editeur lui rend les tailles de l'echantillon (les couvertures et doubles passent entieres)",
     /echantillon_tailles: st\.typos\.echantillon_tailles/.test(lire("src/app/admin/collectif/styles/[id]/page.tsx")));
  const donneesMur = lire("src/app/edition/[token]/donnees.ts");
  const mur172 = donneesMur.slice(donneesMur.indexOf("async function imageDuMur("), donneesMur.indexOf("/* ───────────────────────────── le bon à tirer"));
  ok("le mur relit les tailles (lireTailles), les signe a adresse stable (T-176) et en fait un srcset ; la maitresse reste le repli",
     /const url = await signerOuRien\(key\)/.test(mur172) && /lireTailles\(slug, key, tailles\)/.test(mur172) && /signerLectureVignette\(t\.key\)/.test(mur172) && /srcSetDe\(signees\)/.test(mur172)
     && /imageDuMur\(s\.slug, c\.image_key, c\.tailles\)/.test(mur172) && /imageDuMur\(s\.slug, d\.image_key, d\.tailles\)/.test(mur172) && /imageDuMur\(s\.slug, s\.typos\?\.echantillon_key, s\.typos\?\.echantillon_tailles\)/.test(mur172));
  const imagesDe = (f: string) => [...lire(f).matchAll(/<img\b[\s\S]*?\/>/g)].map((x) => x[0]);
  const ecrans: [string, number][] = [
    ["src/app/edition/[token]/style/CartePiece.tsx", 1],
    ["src/app/edition/[token]/style/[slug]/FicheStyle.tsx", 4],
    ["src/app/edition/[token]/style/Composition.tsx", 5],
  ];
  ok("la carte du mur, la fiche d'un style et la composition : chaque image de style a son srcSet ET ses sizes (TAILLES_AFFICHAGE)",
     ecrans.every(([f, n]) => { const l = imagesDe(f).filter((x) => /srcSet=/.test(x)); return l.length === n && l.every((x) => /sizes=\{[^}]*TAILLES_AFFICHAGE\./.test(x)); }));
  ok("la vitrine (choix du style ferme en production) ne change pas : aucune taille du mur, aucune signature",
     !/TAILLES_AFFICHAGE|srcSetDe|tailles/.test(lire("src/app/edition/[token]/style/Vitrine.tsx")));
  /* Depuis le lot a4 (T-168), la grille se compose dans grillePhotos.ts ; la route lui passe DEUX signatures. */
  const photos176 = lire("src/app/api/collectif/photos/route.ts");
  const grille176 = lire("src/lib/collectif/grillePhotos.ts");
  ok("T-176 : la grille et les couvertures de dossiers signent leurs VIGNETTES a adresse stable ; l'original de repli reste signe comme avant",
     /signer: \(cle\) => signerLectureVignette\(cle\), signerOriginal: \(cle\) => signerGet\(cle\)/.test(photos176)
     && /if \(p\.vignette_key\) vignette = await c\.signer\(p\.vignette_key\)/.test(grille176)
     && /else if \(p\.mime !== "image\/heic" && p\.mime !== "image\/heif"\) vignette = await c\.signerOriginal\(p\.r2_key\)/.test(grille176)
     && !/c\.signer\(p\.r2_key\)/.test(grille176));
  const script = lire("scripts/collectif-styles-vignettes.ts");
  ok("le rattrapage : lecture seule sans --vraiment (rien au coffre, rien en base), ecrit seulement si la ligne n'a pas bouge, journalise",
     /if \(!vraiment\) \{[\s\S]*?return \{ quoi: "faite"/.test(script) && script.indexOf("if (!vraiment) {") < script.indexOf("await ecrireTailles(")
     && script.indexOf("if (!vraiment || !faites.length) continue;") < script.indexOf(".update(") && /\.eq\("maj_le", s\.maj_le\)/.test(script) && /"style_tailles"/.test(script)
     && (script.match(/ecrireTailles\(|\.update\(|\.insert\(|journaliser\(/g) ?? []).length === 3 && script.indexOf(".update(") < script.indexOf("await journaliser("));
  ok("…et sa ligne est dans scripts/CLAUDE.md, avec --vraiment a l'accord de Mathias",
     /`collectif-styles-vignettes\.ts`[^\n]*--vraiment[^\n]*Mathias/.test(lire("scripts/CLAUDE.md")));
  ok("le journal dit le rattrapage", phraseEvenement("style_tailles", { par: "rattrapage T-172", images: 3 }) === "Tailles réduites posées sur 3 images (rattrapage T-172).");
}

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
ok("la case d'accord des participants porte le texte CHOISI par Mathias (17/10, puis la phrase de l'album validee le 20/10), rendu par texteAccord et jamais ecrit dans la page, plus aucun [À FIXER] sur la page de depot",
   (() => {
     const d = lire("src/app/depot/[token]/Depot.tsx");
     return /texteAccord\(VERSION_ACCORD, \{ evenement: tete\.evenement, deOrganisation: deNom\(tete\.organisation\), lien \}\)/.test(d) && !/J(&apos;|')accepte que Bellajour/.test(d)
       && (Accord.texteAccord("2026-10-17", { evenement: "Week-end en mer", deOrganisation: Espace.deNom("Audencia"), lien: null }) ?? "").startsWith("J'accepte que Bellajour utilise ces photos pour composer le magazine « Week-end en mer » d'Audencia, et je confirme avoir le droit de les partager, y compris pour les personnes qu'on y voit.")
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
  const collecte = lirePagePhotos();
  ok("Photos : le chargement par pages observe SA zone de defilement (root), nul sur telephone",
    /root: racine/.test(collecte) && /matchMedia\(REQUETE_TELEPHONE\)\.matches \? null : zone\.current/.test(collecte));
  ok("Photos : « Créer un lien » ouvre la fenetre du lien de contribution (plafond PAR LIEN), plus de formulaire « photographe » en dur",
    /<FenetreLien\b/.test(collecte) && !/type: "photographe"/.test(collecte));
  ok("Photos : le depot s'ouvre dans une fenetre en verre (celle de la coquille), sur le dossier ouvert",
    /<Fenetre titre="Déposer des photos"/.test(lire("src/app/edition/_composants/depot/FenetreEnvoi.tsx")) && /envoi\.ouvrir\?\.\(\{ dossier:/.test(collecte));
  ok("Photos (planches du 20/10) : une colonne de LISTES qui trient et filtrent (Lien, Personne avec recherche, Jour, Afficher), Tout / Par lien, Par jour, Doublons, la selection facultative ; plus de rayons ni d'arbre de dossiers",
    /aria-label="Trier et filtrer"/.test(collecte) && /Chercher une personne/.test(collecte) && /Ranger par jour de prise de vue/.test(collecte) && /Par jour/.test(collecte) && /Doublons/.test(collecte) && /Ma sélection/.test(collecte) && /facultatif/.test(collecte)
      && /Par lien/.test(collecte) && !/className="ec-ph-rayons"/.test(collecte) && !/aria-label="Les dossiers"/.test(collecte) && !/cle: "signalees"/.test(collecte));
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

  const base = { tu: false, interlocuteur: "Mathias", responsable: "Mathilde Roux", debut: "2026-10-15T08:30:00Z", ancienDebut: null, dureeMinutes: 30, meetUrl: "https://meet.google.com/abc", motif: "Relire le BAT", lienEspace: "https://www.bellajour.fr/edition/x/atelier" };
  const pris = mailRendezVous({ ...base, genre: "pris" });
  const deplace = mailRendezVous({ ...base, genre: "deplace", ancienDebut: "2026-10-14T13:30:00Z" });
  const annule = mailRendezVous({ ...base, genre: "annule" });
  ok("mail pris : la date, la visio, le lien de l'espace", pris.sujet.includes("jeudi 15 octobre à 10 h 30") && pris.html.includes("Rejoindre la visio") && pris.texte.includes(base.lienEspace));
  ok("mail deplace : l'ancien creneau est dit", deplace.texte.includes("mercredi 14 octobre à 15 h 30"));
  ok("mail annule : pas de bouton visio", !annule.html.includes("Rejoindre la visio") && annule.sujet.includes("annulé"));
  ok("mails : aucun tiret cadratin, le tu respecte le registre", [pris, deplace, annule].every((m) => !/—/.test(m.sujet + m.html + m.texte)) && mailRendezVous({ ...base, tu: true, genre: "pris" }).sujet.startsWith("Ton"));
  {
    /* Relecture de Mathias du 20/10 : « aligne les couleurs et les visuels ». */
    const espaceVous = MailsTextes.mailRetrouverEspace({ tu: false, organisation: "O", evenement: "E", responsable: "Mathilde Roux", lien: "https://x/edition/A" });
    const entete = (h: string) => h.slice(0, h.indexOf("Bonjour"));
    const signature = (h: string) => h.slice(h.lastIndexOf("<tr>"));
    const bouton = (h: string, libelle: string) => (h.match(new RegExp(`<a [^>]*>${libelle}</a>`)) ?? [""])[0].replace(/href="[^"]*"/, "");
    const src = lire("src/lib/collectif/mailsRdv.ts");
    ok("T-148 (20/10) : les mails de rendez-vous prennent LA mise en page commune (pageMail), meme en-tete, meme signature, plus de gabarit a eux",
      /import \{[^}]*\bpageMail\b[^}]*\} from "\.\/mailsTextes";/.test(src) && !/<!doctype|<table|#[0-9a-f]{6}/i.test(src)
        && [pris, deplace, annule].every((m) => entete(m.html.replace(/>[^<]*Rendez-vous [a-zé]+</, "><")) === entete(espaceVous.html.replace(/>Votre lien</, "><")) && signature(m.html) === signature(espaceVous.html)));
    ok("T-148 (20/10) : « Ouvrir mon espace » est LE bouton des autres mails (bleu, plus de lien cuivre dans la phrase), vers « Parler a l'atelier »",
      [pris, deplace, annule].every((m) => bouton(m.html, "Ouvrir mon espace") === bouton(espaceVous.html, "Ouvrir mon espace") && m.html.includes(`href="${base.lienEspace}"`) && !/b56a45|ouvrir mon espace<\/a>/.test(m.html))
        && bouton(pris.html, "Rejoindre la visio").replace("Rejoindre la visio", "") === bouton(espaceVous.html, "Ouvrir mon espace").replace("Ouvrir mon espace", "")
        && /Pour le déplacer ou l'annuler, passez par votre espace\.\n\nOuvrir mon espace : https:\/\/www\.bellajour\.fr\/edition\/x\/atelier/.test(pris.texte)
        && /Pour en prendre un autre, passe par ton espace\./.test(mailRendezVous({ ...base, tu: true, genre: "annule" }).texte));
    ok("T-148 (20/10) : « Bonjour Mathilde, » quand le nom du responsable est connu, « Bonjour, » sinon ; rendezvous.ts passe le nom de l'edition",
      [pris, deplace, annule].every((m) => /^Bonjour Mathilde,\n/.test(m.texte) && m.html.includes(">Bonjour Mathilde,<")) && /^Bonjour,\n/.test(mailRendezVous({ ...base, responsable: null, genre: "pris" }).texte)
        && /^Bonjour,\n/.test(mailRendezVous({ ...base, responsable: "  ", genre: "pris" }).texte) && /responsable: edition\.responsable_nom,/.test(lire("src/lib/collectif/rendezvous.ts")));
  }

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
  const collecte = lirePagePhotos();
  const cssPhotos = lire("src/app/edition/[token]/photos/photos.css");
  ok("Ma sélection se marque par l'ETOILE, cocher par un bord trace EN DEDANS (la tuile rogne sa peinture) ; aucune case du navigateur, aucun ✓ en texte",
    /\.ec-espace \.ec-ph-t--cochee::after \{[^}]*box-shadow: inset 0 0 0 3px var\(--ec-accent\)/.test(cssPhotos) && /ec-ph-t-etoile--on/.test(collecte) && !/type="checkbox"/.test(collecte) && !/[✓✔]/.test(collecte));
  ok("cocher : « Tout cocher (N) » coche la vue, la barre d'actions (Ajouter à ma sélection, Retirer de ma sélection, Ne pas publier) ; « Vider la sélection » dans Ma sélection ; toute la vue cochée = UNE écriture",
    /Tout cocher \(\$\{nombre\(totalVue\)\}\)/.test(collecte) && /Ajouter à ma sélection/.test(collecte) && /Retirer<span className="ec-ph-act-long"> de ma sélection<\/span>/.test(collecte) && /Ne pas publier/.test(collecte) && /Vider la sélection/.test(collecte) && /toutes: true, preselection, dossier/.test(collecte));
  const marquer = lire("src/app/api/collectif/photos/marquer/route.ts");
  ok("tout selectionner : le droit preselectionner, jamais une photo signalee, journalise",
    /corps\.toutes === true/.test(marquer) && /peut\(role, "preselectionner"\)/.test(marquer) && /if \(preselection\) requete = requete\.eq\("signalee", false\)/.test(marquer) && /"preselection_toutes" : "preselection_aucune"/.test(marquer));
  ok("le journal dit « tout selectionne » et « tout deselectionne »",
    /Tout sélectionné : 12 photo/.test(phraseEvenement("preselection_toutes", { n: 12 })) && /Tout désélectionné : 3 photo/.test(phraseEvenement("preselection_aucune", { n: 3 })));

  /* 9 et 10 : « Qui a déposé » et les liens au même endroit (l'arbre lui-même : bloc T-152). */
  const route = lire("src/app/api/collectif/photos/route.ts");
  /* T-168 : la route lit, `grillePhotos.ts` compose (la lecture complete d'avant ET le resume en base). */
  const grille168 = lire("src/lib/collectif/grillePhotos.ts");
  ok("route photos : les liens ne sortent que pour qui peut en creer (les deux lectures)",
    /const partage = peut\(acces\.role, "regler_plafond_participant"\)/.test(route) && /provenances, partage, enCours/.test(route)
      && (grille168.match(/const liens = partage \? provenances : \[\]/g) ?? []).length === 2 && (grille168.match(/liens: partage\s*\?/g) ?? []).length === 2
      && /arbreDesPhotos\(toutes, liens, edition, partage\)/.test(grille168) && /arbreDesPhotos\(pesees, liens, edition, partage\)/.test(grille168));
  ok("Photos : les liens vivent dans l'onglet « Les liens » (un « Partager », un menu « Modifier » / « Supprimer le lien »), plus de « Copier le lien » eparpilles, plus de « Changer le nom » et « Changer le nombre » separes (21/10)",
    !/Copier le lien participants/.test(collecte) && /Les liens · /.test(collecte) && /Partager/.test(collecte) && /libelle: "Modifier"/.test(collecte) && /Supprimer le lien/.test(collecte) && !/Copier le lien</.test(collecte)
      && !/Changer le nombre de photos/.test(collecte) && !/libelle: "Changer le nom"/.test(collecte) && !/FenetreNom|FenetrePlafond|setRenommer\b|setPlafond\b/.test(collecte.replace(/\/\*[\s\S]*?\*\//g, "")));
  ok("Photos : collecte close, « Déposer » et « Créer un lien » ne s'ouvrent plus (ils restent ÉTEINTS, avec la raison : FinCollecte.tsx), ni « Partager » (la selection reste)",
    /envoi\.ouvrir && p\.ouverte/.test(collecte) && /onglet === "liens" && p\.ouverte/.test(collecte) && /c\.ouverte \?/.test(collecte) && /collecteOuverte\(edition\.etat, edition\.cloture_le, new Date\(\)\)/.test(lire("src/app/edition/[token]/photos/page.tsx")));
  ok("tableau de bord : ses dossiers sont le meme arbre que la page Photos (sur le resume, T-168), chaque ligne y mene",
    /arbreDesPhotos\(pesees, provenances, edition, false\)/.test(lire("src/app/edition/[token]/donnees.ts")) && /const pesees = enLignesPesees\(groupes\)/.test(lire("src/app/edition/[token]/donnees.ts")) && /\?dossier=\$\{encodeURIComponent\(d\.cle\)\}/.test(lire("src/app/edition/[token]/CartePhotos.tsx")));

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
    /this\.dejaAjoutes\+\+;\s*this\.deuxFoisLot\+\+;/.test(moteur) && /bilan\.dejaLa \+ lot\.deuxFois/.test(lire("src/app/edition/_composants/depot/FenetreEnvoi.tsx")));
  const fenetre = lire("src/app/edition/_composants/depot/FenetreEnvoi.tsx");
  ok("envoi : « déjà là » est explique, « Ajouter d'autres photos » et « Réduire et continuer », le compte en grand",
    /déjà là, sautées/.test(fenetre) && /n'est jamais envoyée deux fois/.test(fenetre) && /Ajouter d&apos;autres photos/.test(fenetre) && /Réduire et continuer/.test(fenetre) && /ec-envoi-n/.test(fenetre));
  ok("envoi : la fenetre vit dans la coquille, la pastille de chaque en-tete la rouvre",
    /<HoteFenetreEnvoi \/>/.test(lire("src/app/edition/[token]/Coquille.tsx")) && /<PastilleEnvoi \/>/.test(lire("src/app/edition/_composants/Ecran.tsx")) && /onClick=\{\(\) => c\.ouvrir\(\)\}/.test(lire("src/app/edition/_composants/depot/DepotContexte.tsx")));
}

titre("— retours du 14/10 : les envois du client et les dossiers —");
{
  const collecte = lirePagePhotos();
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
  ok("dossiers : le crayon du titre (un dossier du responsable, le nom d'un lien), double clic sur le titre, Entree garde, Echap annule",
    /className="ec-ph-renommer"/.test(collecte) && /onDoubleClick=\{\(\) => renommable && commencerRenommer\(\)\}/.test(collecte) && /e\.key === "Enter"/.test(collecte) && /e\.key === "Escape"/.test(collecte));
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
  const grilleFiltre = lire("src/lib/collectif/grillePhotos.ts");
  ok("route photos : la grille filtre par dansLeDossier (le repli en memoire, le plan en base qui le redit), « en cours d'arrivee » = declarees non confirmees depuis 2 h",
    /dansLeDossier\(p, dossier, responsable\)/.test(grilleFiltre) && /planDuDossier\(dossier, groupes, responsable\)/.test(grilleFiltre) && /dansLeDossierResume\(groupes, dossier, responsable\)/.test(grilleFiltre)
      && /const lignes = groupes\.filter\(\(g\) => dansLeDossier\(g, cle, responsable\)\);/.test(lire("src/lib/collectif/resumePhotos.ts"))
      && /\.is\("confirmee_le", null\)\.gt\("created_at", depuis\)/.test(photos) && /seulementArbre: corps\.seulementArbre === true/.test(grilleFiltre));
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

  const page = lirePagePhotos();
  ok("Photos : plus de « Signaler » (le geste s'appelle « Ne pas publier »), plus de barre de presélection, les grands chiffres en tete",
    !/Signaler/.test(page) && !/ec-presel/.test(page) && /ec-ph-chiffres/.test(page) && /photos reçues/.test(page));
  ok("Photos : ranger un dossier du responsable en le glissant (draggable, onDrop, dans la liste de « Mes photos »), « + Nouveau dossier » ouvre le depot sur un nom neuf",
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
  const route = lire("src/lib/collectif/grillePhotos.ts");
  ok("route photos : une vue d'ensemble ne signe aucune PAGE de grille (les huit dernieres arrivees seulement, en memoire ou lues en base), une couverture par dossier ou lien",
    (route.match(/const sansGrille = d\.seulementArbre \|\| estVueEnsemble\(dossier\)/g) ?? []).length === 2 && (route.match(/suivante: !sansGrille &&/g) ?? []).length === 2
    && /couvertures\[n\.cle\] = await c\.signer\(p\.vignette_key\)/.test(route) && /couvertures\[n\.cle\] = await c\.signer\(cle\)/.test(route)
    && /const ARRIVEES = 8;/.test(route) && /sansGrille \? dansDossier\.slice\(-ARRIVEES\)\.reverse\(\)/.test(route) && /lecture\.page\(conditions, TRI_TOUTES, 0, ARRIVEES - 1\)/.test(route));
  const page = lirePagePhotos();
  ok("Photos (planches du 20/10) : « Par lien », un album par lien ; le lien ouvert montre ses personnes DANS la même liste, « Mes photos » ses dossiers et sous-dossiers ; fil d'Ariane « Par lien › » ; l'ancienne page archivée",
    /className=\{n\.n \? "ec-ph-carte" : "ec-ph-carte ec-ph-carte--vide"\}/.test(page) && /Personnes · \$\{ouvert\.nom\}/.test(page) && /ec-ph-li--sous/.test(page) && /className="ec-ph-fil"/.test(page)
      && existsSync(resolve(RACINE, "archive/photos-colonne-2026-10/README.md")) && existsSync(resolve(RACINE, "archive/photos-rayons-2026-10/README.md")) && existsSync(resolve(RACINE, "archive/photos-rayons-2026-10/Collecte.tsx")));
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
    const col = lirePagePhotos();
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
      /className="ec-tdb-dossier-couv"/.test(carte) && !/ec-tdb-chevron|ec-tdb-point/.test(carte) && /couvertureDe\(groupes, d\.cle, edition\.responsable_nom\)/.test(lire("src/app/edition/[token]/donnees.ts"))
        && /dansLeDossier\(g, cle, responsable\)/.test(lire("src/lib/collectif/resumePhotos.ts")));
    const fen = lire("src/app/edition/_composants/Fenetre.tsx");
    ok("fenetres : toujours ouvertes dans la colonne de contenu (portail), jamais prisonnieres d'un panneau de verre",
      /document\.querySelector\("\.ec-contenu"\)/.test(fen) && /createPortal\(fenetre, hote\)/.test(fen) && /useSyncExternalStore\(rien, \(\) => true, \(\) => false\)/.test(fen));
    ok("tableau de bord : a partir de TROIS contenus, « À envoyer » prend toute la largeur et le message passe dessous (regle de Mathias)",
      /const LIGNE_LONGUE = 3;/.test(lire("src/app/edition/[token]/LigneContenus.tsx")) && /contenus\.length >= LIGNE_LONGUE/.test(lire("src/app/edition/[token]/LigneContenus.tsx"))
      && /\.ec-tdb-grille > \.ec-tdb-ligne--longue,\s*\.ec-espace \.ec-tdb-grille > \.ec-tdb-ligne--longue \+ \.ec-tdb-message \{\s*grid-column: 1 \/ -1;/.test(tab));
    ok("Photos : « Dernières arrivées » sous les albums des liens, la colonne de listes DANS le panneau de verre",
      /Dernières arrivées/.test(col) && col.indexOf('aria-label="Trier et filtrer"') > col.indexOf('"ec-ph-panneau'));
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
    /<PanneauGestes [^>]*menu \/>/.test(fiche) && /libelle: "Réglages et liens"/.test(fiche) && /reglages: \([\s\S]*?<PanneauLiens id=\{e\.id\} liens=\{liens\}(?: ouverture=\{ouverture\})? \/>/.test(fiche));
  const donneesFiche = lire("src/app/admin/collectif/donnees.ts");
  ok("fiche en cartes : les doublons sont le MEME resultat range que lit la page Photos du client (T-170), quatre apercus signes au plus",
    /doublons: \(\(await doublonsDeLEdition\(supabase, id, lignesPhotos\)\)\?\.groupes \?\? calculerSurLignes\(lignesPhotos\)\.groupes\)/.test(donneesFiche) && !/groupesDoublonsRapides\(/.test(donneesFiche)
      && /doublonsDeLEdition\(supabase, edition\.id\)/.test(lire("src/app/api/collectif/photos/route.ts")) && /\.slice\(0, 4\)[\s\S]{0,60}signerOuRien\(p\.vignette_key\)/.test(donneesFiche));
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
  ok("« Votre espace est prêt » : l'evenement dans l'objet apres « · » comme les autres mails (20/10), vous ou tu, Bonjour + prenom",
    vous.sujet === "Votre espace Bellajour est prêt · Séminaire d'automne" && toi.sujet === "Ton espace Bellajour est prêt · Séminaire d'automne" && /Bonjour Camille,/.test(vous.texte)
      && /L'espace de votre édition « Séminaire d'automne » est ouvert\. Voici votre lien\. Ceux de votre équipe et des participants vous attendent dans l'espace, prêts à envoyer\./.test(vous.texte)
      && /L'espace de ton édition « Séminaire d'automne » est ouvert\. Voici ton lien\. Ceux de ton équipe et des participants t'attendent dans l'espace, prêts à envoyer\./.test(toi.texte)
      && !/trois liens/.test(vous.texte + toi.texte));
  ok("20/10 : le mail ne porte plus QUE son lien, en bouton ; AUCUN token d'equipe ni de depot (HTML, texte, objet), les trois blocs dans l'ordre",
    [vous, toi, avecCode].every((m) => m.html.includes(liens.responsable) && m.texte.includes(`Ouvrir mon espace : ${liens.responsable}`) && ![liens.equipe, liens.depot, "EQUIPEBBBB", "DEPOTCCCC", "/depot/"].some((l) => (m.html + m.texte + m.sujet).includes(l)))
      && (vous.html.match(/Ouvrir mon espace/g) ?? []).length === 1 && (vous.html.match(/<a /g) ?? []).length === 1
      && vous.texte.indexOf("Votre lien") < vous.texte.indexOf("Le lien de votre équipe") && vous.texte.indexOf("Le lien de votre équipe") < vous.texte.indexOf("Le lien des participants"));
  ok("20/10 : ou trouver les deux autres liens pour les envoyer depuis l'espace, en vous et en tu (garder le sien, la cloture)",
    /Pour tout faire : photos, style, bon à tirer\. Gardez-le pour vous\./.test(vous.texte)
      && /Lecture seule : votre équipe suit tout sans rien modifier\. Dans votre espace, en bas du menu : « Partager avec mon équipe », puis « Copier »\./.test(vous.texte)
      && /Pour que chacun dépose ses photos, jusqu'au 28 octobre\. Il est dans votre espace, page Photos, onglet « Les liens » : « Partager » y prépare le message et le QR code, à envoyer par WhatsApp ou par mail\./.test(vous.texte)
      && /Ton lien/.test(toi.texte) && /Garde-le pour toi\./.test(toi.texte) && /Le lien de ton équipe/.test(toi.texte)
      && /Lecture seule : ton équipe suit tout sans rien modifier\. Dans ton espace, en bas du menu : « Partager avec mon équipe », puis « Copier »\./.test(toi.texte)
      && /Il est dans ton espace, page Photos, onglet « Les liens » : « Partager »/.test(toi.texte)
      && !/votre|vous/i.test(toi.texte.replace(/Bellajour/g, "")) && /Pour que chacun dépose ses photos\. Il est dans votre espace/.test(textes.mailEspacePret({ ...base, cloture: null, tu: false }).texte));
  ok("« Votre espace est prêt » : aucun tiret cadratin ni demi-cadratin, rien n'est injecte sans echappement (texte ET adresse)",
    ![vous, toi, avecCode].some((m) => /[—–]/.test(m.html + m.texte + m.sujet)) && textes.mailEspacePret({ ...base, tu: false, evenement: "<script>" }).html.includes("&lt;script&gt;")
      && (() => { const m = textes.mailEspacePret({ ...base, tu: false, liens: { ...liens, responsable: 'https://x/edition/"><img src=x>' } }); return !m.html.includes('"><img') && m.html.includes("&quot;&gt;&lt;img"); })());
  {
    /* Chaque endroit que les mails nomment EXISTE dans l'espace, sous ce libelle exact (relu dans les ecrans). */
    const partageEquipe = lire("src/app/edition/[token]/PartageEquipe.tsx");
    const coquille = lire("src/app/edition/[token]/Coquille.tsx");
    const collecte = lire("src/app/edition/[token]/photos/Collecte.tsx");
    const ongletLiens = lire("src/app/edition/[token]/photos/Liens.tsx");
    const fenetrePartage = lire("src/app/edition/_composants/LienContribution.tsx");
    const menu = lire("src/lib/collectif/verrous.ts");
    ok("20/10 : « Partager avec mon équipe » existe EN BAS du menu (apres la nav, avant le nom), sa fenetre dit la meme phrase et porte « Copier »",
      /<span>Partager avec mon équipe<\/span>/.test(partageEquipe) && /titre="Partager avec mon équipe"/.test(partageEquipe)
        && partageEquipe.includes('"Lecture seule : ton équipe suit tout sans rien modifier." : "Lecture seule : votre équipe suit tout sans rien modifier."')
        && /: "Copier"\}/.test(partageEquipe)
        && coquille.indexOf("</nav>") < coquille.indexOf("<PartageEquipe") && coquille.indexOf("<PartageEquipe") < coquille.indexOf('className="ec-moi"'));
    ok("20/10 : la page « Photos » du menu (jamais verrouillee), son onglet « Les liens », « Partager » sur le lien general, WhatsApp et Mail dans la fenetre",
      /\{ cle: "photos", libelle: "Photos", segment: "photos", groupe: 1 \}/.test(menu) && /photos: null,/.test(menu)
        && (collecte.match(/Les liens · \{nbLiens\}/g) ?? []).length === 2 && /genre="Lien général"/.test(ongletLiens) && /onClick=\{c\.onPartager\}>\s*Partager\s*<\/button>/.test(ongletLiens)
        && /WhatsApp\s*<\/a>/.test(fenetrePartage) && /Mail\s*<\/a>/.test(fenetrePartage) && /<QrCode texte=\{lien\.url\} taille=\{136\}/.test(fenetrePartage));
  }
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
  ok("T-187 : la route et l'ecran assemblent les MEMES donnees (donneesEspacePret, les trois liens par liensEdition pour l'ecran), et le mail rendu n'en ecrit qu'un (20/10)",
    /token_responsable, token_equipe, token_depot/.test(routeMail) && /mailEspacePret\(donneesEspacePret\(data, origine, controleAppareilActif\(process\.env\)\)\)/.test(routeMail)
      && /liens: liensEdition\(origine, e\)/.test(lire("src/lib/collectif/mailsTextes.ts")) && !/lien: liensEdition/.test(routeMail)
      && (() => {
        const d = textes.donneesEspacePret({ token_responsable: "R".repeat(32), token_equipe: "E".repeat(32), token_depot: "D".repeat(32), registre: "entreprise_vous", organisation: "O", evenement: "E", responsable_nom: null, cloture_le: null }, "https://bellajour.fr", false);
        const m = textes.mailEspacePret(d);
        return d.liens.equipe.endsWith("E".repeat(32)) && d.liens.depot.endsWith("D".repeat(32)) && m.html.includes("R".repeat(32)) && !(m.html + m.texte).includes("E".repeat(32)) && !(m.html + m.texte).includes("D".repeat(32));
      })());
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
  const mailCode = MailsTextes.mailCodeAppareil({ tu: false, evenement: "Séminaire", responsable: "Camille Essai", code: "123456", duree: "24 heures", site: "https://bellajour.fr" });
  ok("le mail du code (20/10) : « Bonjour Camille, » quand le nom est connu, « Bonjour, » sinon ; appareils.ts passe le nom de l'edition",
    /^Bonjour Camille,\n/.test(mailCode.texte) && /^Bonjour,\n/.test(MailsTextes.mailCodeAppareil({ tu: true, evenement: "S", responsable: null, code: "123456", duree: "24 heures", site: "https://bellajour.fr" }).texte)
      && /responsable: edition\.responsable_nom, code,/.test(lire("src/lib/collectif/appareils.ts")));
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
    "src/app/api/admin/collectif/editions/[id]/lien/route.ts",
  ];
  ok("T-164 : les six routes qui envoient un mail d'edition prennent origineDesMails(process.env), apercu du mail compris (T-196 : le lien regenere)",
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
  ok("la lecture legere : le token par chargerAcces, le droit de voir, un compte SANS ligne (GET `limit(0)` depuis la corbeille du 20/10), aucune ecriture, et `depuis` passe TEL QUEL (microsecondes)",
    /chargerAcces\(/.test(etat) && /peut\(acces\.role, "voir_espace"\)/.test(etat) && /select\("id", COMPTE_SANS_LIGNE\)/.test(etat) && /\(avec \? tete\.is\("supprimee_le", null\) : tete\)\.limit\(0\)/.test(etat) && !/\.(insert|update|upsert|delete)\(/.test(etat) && /String\(corps\.depuis\)\.trim\(\)/.test(etat) && /limit\(depuis \? ARRIVEES_LUES_MAX : 1\)/.test(etat));
  const collecte = lirePagePhotos();
  const carte = lire("src/app/edition/[token]/CartePhotos.tsx");
  ok("l'ecran : les personnes listees des la premiere, le nom sur chaque vignette (les initiales au telephone), l'annonce et « Les voir », le sondage de 30 s (pas 3,5 s)",
    /gens\.length >= 1/.test(collecte) && /className="ec-ph-qui"/.test(collecte) && /className="ec-ph-qui-ini"/.test(collecte) && /className="ec-ph-annonce[ "]/.test(collecte) && /Les voir/.test(collecte) && /useSondage\(/.test(collecte) && /SONDAGE_PHOTOS_MS/.test(collecte)
      && /useSondage\(/.test(carte) && /SONDAGE_TABLEAU_MS/.test(carte) && !/INTERVALLE_MESSAGES_MS/.test(collecte + carte));
  const depot = lire("src/app/depot/[token]/Depot.tsx");
  ok("le participant retrouve son prenom sur son telephone (lu sans setState d'hydratation) et il part avec les photos",
    /useSyncExternalStore\(/.test(depot) && /moteur\.definirDeposant\(nomEnvoye\);\s*if \(fichiers\.length\) moteur\.ajouter/.test(depot));
  const photos = lire("src/lib/collectif/grillePhotos.ts");
  ok("la grille : « Toutes » commence par la derniere arrivee (en memoire, ou triee par la base) ; chaque photo dit qui et quand ; « N personnes » suit la meme regle que les pastilles",
    /vue === "toutes" \? \[\.\.\.dansDossier\]\.reverse\(\)/.test(photos) && /vue === "toutes" \? TRI_TOUTES : TRI_JOUR/.test(photos) && /qui: role === "participant"/.test(photos) && /arrivee: p\.confirmee_le/.test(photos)
      && /personnes: compterPersonnes\(toutes\)/.test(photos) && /personnes: compterPersonnes\(groupes\)/.test(photos)
      && /participants: compterPersonnes\(groupes\)/.test(lire("src/app/edition/[token]/donnees.ts")));
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
  const finTsx = lire("src/app/edition/_composants/FinCollecte.tsx");
  ok("le tableau de bord : « Toutes les photos sont là ? » pour le responsable seulement, en DEUX temps (« Oui, terminer », dans la fenetre PARTAGEE avec la page Photos : FinCollecte.tsx porte l'appel)",
    /p\.terminer && ouverte/.test(carte) && /Toutes les photos sont là \?/.test(carte) && /<FenetreTerminerCollecte/.test(carte) && !/\/api\/collectif\/collecte\/terminer/.test(carte) && !/<Fenetre /.test(carte)
      && /Oui, terminer/.test(finTsx) && /\/api\/collectif\/collecte\/terminer/.test(finTsx) && /Terminer la collecte maintenant \?/.test(finTsx)
      && /terminer=\{peut\(role, 'terminer_collecte'\)\}/.test(lire("src/app/edition/[token]/page.tsx")));
  const lot = lire("src/app/api/admin/collectif/editions/[id]/lot/route.ts");
  const panneau = lire("src/app/admin/collectif/[id]/PanneauCollecte.tsx");
  ok("l'atelier voit la selection du client (nombre, vignettes) et la telecharge a part ; « collecte terminee par » vient du journal",
    /\(!selection \|\| p\.preselection\)/.test(lot) && /Télécharger la sélection/.test(panneau) && /selectionApercus/.test(panneau) && /"Sélection du client"/.test(panneau)
      && /gesteCollecte\?\.geste === "terminer_collecte"/.test(lire("src/app/admin/collectif/donnees.ts")) && /\.in\("payload->>cle", \[\.\.\.GESTES_COLLECTE\]\)/.test(lire("src/app/admin/collectif/donnees.ts")));
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
  /* Depuis le lot w2 (20/10) : la page n'ECRIT plus le texte, elle affiche `texteAccord(VERSION_ACCORD, …)` en deux
     morceaux (le texte du 17/10, puis la phrase de l'album encadree). Recoller les deux morceaux doit rendre le
     modele de la version envoyee, rempli, mot pour mot. */
  const modele = Accord.TEXTES_ACCORD.get(v) ?? "";
  const noms = (lien: string | null) => ({ evenement: "Week-end en mer", deOrganisation: Espace.deNom("Audencia"), lien });
  const rempli = (lien: string | null) => modele.replace("{evenement}", "Week-end en mer").replace("{deOrganisation}", "d'Audencia").replace("{album}", Accord.phraseAlbum(lien));
  const morceaux = (lien: string | null) => {
    const t = Accord.texteAccord(v, noms(lien)) ?? "";
    const album = Accord.phraseAlbum(lien);
    return t.endsWith(` ${album}`) ? { principal: t.slice(0, t.length - album.length - 1), album } : { principal: t, album: null };
  };
  ok("le texte AFFICHE est mot pour mot celui de la version envoyee : la page l'affiche par texteAccord(VERSION_ACCORD, …), jamais ecrit en dur, et n'encadre que la phrase de l'album ; changer un mot = une NOUVELLE version dans TEXTES_ACCORD",
    /const texte = texteAccord\(VERSION_ACCORD, \{ evenement: tete\.evenement, deOrganisation: deNom\(tete\.organisation\), lien \}\);/.test(depot)
      && /const accordTexte = decouperAccord\(texte \?\? "", lien\);/.test(depot)
      && /\{accordTexte\.principal\}\s*\{accordTexte\.album \? <span className="ec-dp-accord-album">\{accordTexte\.album\}<\/span> : null\}/.test(depot)
      && !/J(&apos;|')accepte que Bellajour/.test(depot)
      && /export function decouperAccord\(texte: string, lien: string \| null\)[\s\S]{0,200}texte\.endsWith\(` \$\{album\}`\)/.test(lire("src/lib/collectif/depotParticipant.ts"))
      && ["Bateau 1", null].every((l) => { const m = morceaux(l); const t = Accord.texteAccord(v, noms(l)) ?? ""; return t.length > 100 && m.album !== null && `${m.principal} ${m.album}` === t && t === rempli(l); }));
  ok("la version courante est celle de l'album (20/10 : la page affiche la phrase, bascule approuvee par Mathias avec ses deux phrases) ; celle du 17/10 reste lisible (des photos la portent)",
    v === "2026-10-20" && v === Accord.VERSION_ACCORD_ALBUM && Accord.VERSIONS_ALBUM.has(v) && Accord.TEXTES_ACCORD.has("2026-10-17") && Accord.lireAccord({ accord: true, accordVersion: "2026-10-17" })?.version === "2026-10-17");
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
    /if \(status === 404\) \{\s*\/\*[^*]*\*\/\s*this\.mourir\(\);/.test(moteur) && /private mourir\(\): void \{\s*this\.mort = true;\s*this\.fermer\(/.test(moteur) && /status >= 400 && status < 500/.test(moteur));
  ok("chaque requete au serveur a un garde-temps ; une reponse coupee en route se relit comme une coupure",
    /garde\.abort\(\)/.test(moteur) && /signal: garde\.signal/.test(moteur) && /throw new Error\("réponse coupée"\)/.test(moteur));
  ok("l'ecran reste allume pendant l'envoi (Screen Wake Lock), et une page qui a dormi n'avorte pas ses envois",
    /navigator\.wakeLock\.request\("screen"\)/.test(moteur) && /maintenant - tic > 30_000\) dernier = maintenant/.test(moteur));
  ok("moins de requetes : plus de place = plus de declaration pour rien ; lots plus pleins ; confirmations groupees sur 15 s",
    /refusPlafond && json\.place === 0/.test(moteur) && /const LOT_PLEIN = 10;/.test(moteur) && /const ATTENTE_CONFIRMATION_MS = 15_000;/.test(moteur));
  ok("re-choisir une photo refusee ou en erreur la renvoie (plafond releve) ; en route ou arrivee, elle est seulement comptee",
    /if \(connu\.etat === "refuse" \|\| connu\.etat === "erreur"\)/.test(moteur) && /this\.dejaAjoutes\+\+/.test(moteur));
  const albumMerci = lire("src/app/depot/[token]/Album.tsx");
  const zone = lire("src/app/edition/_composants/depot/ZoneDepot.tsx");
  ok("« Merci » et « Toutes les photos sont arrivees » seulement sans erreur : une photo qui n'est pas partie se dit (le merci lit le DERNIER envoi depuis le 21/10)",
    /const termine = lot\.total > 0 && lot\.enCours === 0 && lot\.erreurs === 0;/.test(albumMerci) && /const lot = vue\.lot;/.test(albumMerci) && /vue\.erreurs\s*\?\s*`\$\{vue\.erreurs\} photo/.test(zone));
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
    /if \(role === "participant" && appareilLu && !participant\) \{\s*const connu = await nomDeLAppareil\(/.test(route) && /if \(connu\) deposant = connu;/.test(route)
      && /if \(participant\) deposant = nomAffiche\(participant\);/.test(route)
      && route.indexOf("nomDeLAppareil(") < route.indexOf("compterPourPlafond(") && route.indexOf("nomDeLAppareil(") < route.indexOf('from("collectif_photos").insert(lignes)'));
  const connu = lire("src/lib/collectif/participantConnu.ts");
  ok("le nom de l'appareil se lit chez les PARTICIPANTS de l'edition, le libelle d'un lien n'est pas un nom, et l'appareil se compte en `head`",
    /\.eq\("role_deposant", "participant"\)/.test(connu) && /nom\.toLowerCase\(\) !== libelle/.test(connu) && /select\("id", COMPTE_SANS_LIGNE\)/.test(connu) && /\.limit\(0\)/.test(connu));
  const page = lire("src/app/depot/[token]/page.tsx");
  ok("la page lit le cookie de l'appareil (meme cookie sur tous les liens), ne cherche le nom d'avant que si le depot est ouvert et regle (T-195) ; close, seulement ce que dit la planche 9C (ses photos arrivees)",
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
  ok("participants (20/10) : le nouveau lien n'est PLUS ecrit (ni HTML ni texte), le mail dit ou il est et ouvre SON espace ; la cloture, les photos gardees, l'ancien QR code",
    [mDepot(0), mDepot(8, "ecole_tu")].every((m) => !(m.html + m.texte + m.sujet).includes("D".repeat(32)) && !(m.html + m.texte).includes("/depot/") && !(m.html + m.texte).includes("E".repeat(32))
      && m.html.includes(`href="https://bellajour.fr/edition/${"R".repeat(32)}"`) && m.texte.includes(`Ouvrir mon espace : https://bellajour.fr/edition/${"R".repeat(32)}`) && (m.html.match(/<a /g) ?? []).length === 1)
      && M.donneesLienRegenere(ed("entreprise_vous"), "depot", "https://bellajour.fr", 0, false).espace === `https://bellajour.fr/edition/${"R".repeat(32)}`
      && /Pour que chacun dépose ses photos, jusqu'au 14 novembre\. Il est dans votre espace, page Photos, onglet « Les liens » : « Partager » y prépare le message et le nouveau QR code, à envoyer par WhatsApp ou par mail\./.test(mDepot(0).texte)
      && /Il est dans ton espace, page Photos, onglet « Les liens » : « Partager » y prépare le message et le nouveau QR code/.test(mDepot(0, "ecole_tu").texte)
      && /Les photos déjà reçues sont gardées\./.test(mDepot(0).texte) && /ni le QR code qui y menait/.test(mDepot(0).texte) && mDepot(0).sujet === "Nouveau lien des participants · Croisière Audencia"
      && /^Bonjour Camille,\n/.test(mDepot(0).texte));
  ok("le lien du responsable, lui, ne bouge pas (20/10) : son nouveau lien en bouton, rien d'autre",
    M.donneesLienRegenere(ed("entreprise_vous"), "responsable", "https://bellajour.fr", 0, false).espace === dResp.lien && (mResp.html.match(/<a /g) ?? []).length === 1 && mResp.texte.includes(`Ouvrir mon espace : ${dResp.lien}`));
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
  ok("l'ecran dit vrai sur le mail des participants (20/10) : il n'ecrit pas le lien, il renvoie a l'onglet « Les liens » ; celui du responsable garde « le nouveau y prendra sa place »",
    /quel === "depot"\s*\? " \(il n'écrit pas le lien des participants : il envoie le responsable le chercher dans son espace, page Photos, onglet « Les liens »\)\."\s*: " \(il montre le lien actuel ; le nouveau y prendra sa place\)\."/.test(panneauL)
      && /if \(quel === "depot" && etat === "envoye"\) return PHRASE_MAIL_DEPOT_ENVOYE;/.test(panneauL) && /le nouveau lien l'attend dans son espace, page Photos, onglet « Les liens »/.test(panneauL)
      && /phraseMail\(quel, resultat\.mail\)/.test(panneauL));

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
  ok("le moteur dit la meme chose si le lien meurt pendant l'envoi (404 de la verification, de la declaration, de la confirmation : `mourir`, une seule phrase)",
    (moteurL.match(/this\.fermer\(lienMort\(Boolean\(this\.cfg\.tu\)\)\.phrase\)/g) ?? []).length === 1 && (moteurL.match(/this\.mourir\(\);/g) ?? []).length === 3 && !/n'est plus actif/.test(moteurL));
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
  const albumTsx = lire("src/app/depot/[token]/Album.tsx");
  ok("la page : « Photos seulement : les vidéos ne partent pas. » AU-DESSUS du bouton (planche 6B, avant le choix), redit dans la barre de l'album ; plus de « fichier(s) ignoré(s) »",
    D.PHOTOS_SEULEMENT === "Photos seulement : les vidéos ne partent pas." && /<p className="ec-dp-videos">\s*<IcoSansVideo \/>\s*<span>\{PHOTOS_SEULEMENT\}<\/span>\s*<\/p>\s*\{entree\}\s*<button type="button" className="ec-dp-bouton"/.test(depotTsx)
      && /PHOTOS_SEULEMENT\.split\(" : "\)\[0\]/.test(albumTsx)
      && /phrasesIgnores\(vue\.ignores, vue\.videos, vue\.premiereVideo\)/.test(albumTsx) && !/fichier\(s\) ignoré\(s\)/.test(depotTsx + albumTsx));
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
      filter(c: string, op: string, v: string): FausseQ;
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
              /* Une liste citee par `listeIn` (S8 du 20/10) : relue comme PostgREST la lit. */
              filter: (c: string, op: string, v: string) => {
                a.valeurs = op === "in" ? (lireListePostgrest(v) ?? []) : [];
                return note(`${op} ${c}`);
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
    /* Depuis la corbeille (20/10) : un compte exact en GET `limit(0)`, jamais `head` (un HEAD filtre sur une
       colonne absente rend une erreur SANS code, mesure sur la vraie base ; le repli ne la reconnaitrait pas). */
    const tete = (a: Appel | undefined) => a?.table === "collectif_photos" && a.colonnes === "id" && JSON.stringify(a.options) === JSON.stringify({ count: "exact" }) && a.filtres[a.filtres.length - 1] === "limit";
    ok("deux comptes exacts SANS ligne (`limit(0)`), et rien d'autre : ni tri, ni tranche, ni `in`",
      avecLien.appels.length === 2 && avecLien.appels.every(tete) && avecLien.appels.every((a) => !a.filtres.some((f) => /^(order|range|in)/.test(f))));
    ok("le total : l'edition, le filtre du plafond, HORS corbeille ; par appareil : le meme, plus l'appareil, hors corbeille aussi (S4 du 20/10 : qui que soit celui qui a supprime) et le lien",
      total?.filtres.join(" | ") === `eq edition_id ed-1 | or ${filtre} | is supprimee_le | limit`
        && parAppareil?.filtres.join(" | ") === `eq edition_id ed-1 | or ${filtre} | eq appareil_id app-1 | is supprimee_le | eq provenance_id lien-1 | limit`);
    ok("le compte de la base est rendu tel quel, au-dela de 1 000 (le plafond total s'applique de nouveau)",
      lu?.total === 2500 && lu.parAppareil === 7);
    const sansLien = fausse(() => ({ count: 3, error: null }));
    await C.compterPourPlafond(sansLien.client, "ed-1", "app-1", LUNDI_MIDI);
    ok("hors d'un lien a plafond : l'appareil compte sur toute l'edition (aucun filtre de lien)",
      sansLien.appels[1]?.filtres.join(" | ") === `eq edition_id ed-1 | or ${filtre} | eq appareil_id app-1 | is supprimee_le | limit`);
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
    ok("collecte.ts : `compterPourPlafond` compte (GET `limit(0)`, aucune ligne), lance ses deux comptes ensemble",
      /select\("id", COMPTE_SANS_LIGNE\)/.test(collecte) && /Promise\.all\(\[\(avec \? compter\(\)\.is\("supprimee_le", null\) : compter\(\)\)\.limit\(0\), deLaPersonne\(avec\)\]\)/.test(collecte)
        && !/\.limit\([1-9]/.test(collecte) && !/compteDansPlafond\(/.test(collecte));

    const lot = lire("src/app/api/admin/collectif/editions/[id]/lot/route.ts");
    const iCompte = lot.indexOf('select("id", COMPTE_SANS_LIGNE)');
    ok("le lot : le compte exact AVANT la lecture ; moins de lignes lues que de photos comptees = 500 `lot_incomplet` qui donne les deux nombres ; `total` rendu",
      iCompte > 0 && iCompte < lot.indexOf("lireToutesLesLignes<Ligne>(") && /if \(total === null \|\| data\.length < total\)/.test(lot)
        && /error: "lot_incomplet", message, lues: data\.length, total \}, \{ status: 500 \}/.test(lot) && /photos lues sur \$\{total\.toLocaleString\("fr-FR"\)\} arrivées/.test(lot)
        && /return NextResponse\.json\(\{ photos, dossier, lien, personne, selection, total, lues: data\.length \}\)/.test(lot));
    const panneau = lire("src/app/admin/collectif/[id]/PanneauCollecte.tsx");
    ok("l'ecran du lot affiche le refus du serveur au lieu de « N photos écrites », et n'ouvre aucun dossier sur le disque",
      /if \(!rep\.ok\) \{/.test(panneau) && /setEtat\(typeof refus\?\.message === "string" \? refus\.message :/.test(panneau)
        && panneau.indexOf("if (!rep.ok) {") < panneau.indexOf("getDirectoryHandle("));

    const complete = lire("src/app/api/collectif/depot/complete/route.ts");
    /* T-194 : l'update vit dans `confirmerArrivee` (rattrapageCoffre.ts), partagee avec le rattrapage. */
    const coffreConf = lire("src/lib/collectif/rattrapageCoffre.ts");
    ok("la confirmation est idempotente : `confirmee_le` lu ; une photo deja confirmee est rendue sans update ; l'update porte `.is(\"confirmee_le\", null)`",
      /\.select\("id, r2_key, confirmee_le, mime"\)/.test(complete) && /for \(const l of lignes\) if \(l\.confirmee_le\) confirmees\.push\(l\.id\);/.test(complete)
        && /const aConfirmer = lignes\.filter\(\(l\) => !l\.confirmee_le\);/.test(complete) && /confirmerArrivee\(supabase, edition\.id, l, tete\.taille, maintenant\)/.test(complete)
        && /\.eq\("id", ligne\.id\)\s*\.is\("confirmee_le", null\)\s*\.select\("id"\)/.test(coffreConf));
    ok("seules les NOUVELLES se comptent, se journalisent et se relisent (un lot rejoue ne double rien)",
      /"photos_confirmees", \{ n: nouvelles\.length, role: acces\.role \}/.test(complete) && /enrichirCollectif\(makeSupabase\(\), edition\.id, nouvelles\)/.test(complete)
        && !/n: confirmees\.length/.test(complete) && /if \(r\.statut === "nouvelle"\) \{\s*nouvelles\.push\(l\.id\);/.test(complete)
        && /return ecrites\?\.length \? \{ statut: "nouvelle"/.test(coffreConf));

    const fiche = lire("src/app/admin/collectif/donnees.ts");
    ok("le journal de la fiche ne lit pas les lignes ecrites a chaque lot (`photos_confirmees`, `metadonnees_lues`, et depuis T-194 la machinerie du rattrapage) : elles ne chassent plus le reste",
      JOURNAL_DE_LOT.join() === "photos_confirmees,metadonnees_lues,rattrapage_demarre,rattrapage_fini,vignettes_fabriquees"
        && /\.not\("type", "in", `\(\$\{JOURNAL_DE_LOT\.join\(","\)\}\)`\)\s*\.order\("created_at", \{ ascending: false \}\)\s*\.limit\(100\)/.test(fiche));
    ok("ces lignes restent ecrites et lisibles en clair ; « Collecte terminée par » (un `geste`) reste dans le journal lu",
      JOURNAL_DE_LOT.every((t) => phraseEvenement(t, { n: 3, traitees: 3, lieux: 1 }) !== t) && !(JOURNAL_DE_LOT as readonly string[]).includes("geste")
        && /"photos_confirmees"/.test(lire("src/app/api/collectif/depot/complete/route.ts")) && /"metadonnees_lues"/.test(lire("src/lib/collectif/enrichissement.ts")));
  }
}

/* ═══════════════════ T-159 : LA FIN DES PHOTOS D'UNE ÉDITION LIVRÉE ═══════════════════ */

titre("— T-159 : le delai est la DECISION de Mathias (30 jours apres « Marquer livree », question 4) —");
{
  const S = Retention.delaiDuScript;
  ok("la constante vaut 30 (decision du 20/10) ; sans --jours, le script la prend, en lecture comme pour effacer",
    Retention.DELAI_RETENTION_JOURS === 30
      && JSON.stringify(S([], false)) === JSON.stringify({ ok: true, jours: 30, source: "decision" })
      && JSON.stringify(S(["--vraiment", "--edition", E], true)) === JSON.stringify({ ok: true, jours: 30, source: "decision" }));
  ok("--jours tape regarde plus tot ou plus tard en lecture seule (1, 29, 45) ; avec --vraiment, jamais plus court que 30 (1 et 29 refuses, 30 et 45 acceptes)",
    [1, 29, 45].every((n) => { const r = S(["--jours", String(n)], false); return r.ok && r.jours === n && r.source === "argument"; })
      && !S(["--jours", "1"], true).ok && !S(["--jours=29"], true).ok && S(["--jours", "30"], true).ok && S(["--jours", "45", "--vraiment"], true).ok);
  ok("un --jours tape MAIS illisible n'est jamais remplace par la decision (« --jours trente », « --jours= », « --jours » seul : refuses)",
    [["--jours", "trente"], ["--jours="], ["--jours"], ["--jours", "0"], ["--jours", "-3"]].every((a) => !S(a, false).ok && !S(a, true).ok));
  ok("aucun ecart entre ce qui est decide et ce que le passage quotidien lit : retentionServeur lit DELAI_RETENTION_JOURS, aucun chiffre ecrit",
    /verdictRetention\(e, maintenant, DELAI_RETENTION_JOURS\)/.test(lire("src/lib/collectif/retentionServeur.ts")) && /delai: DELAI_RETENTION_JOURS/.test(lire("src/lib/collectif/retentionServeur.ts"))
      && !/\b30\b/.test(lire("src/lib/collectif/retentionServeur.ts").replace(/\/\*[\s\S]*?\*\//g, "")));
}

titre("— T-159 : la lecture de --jours (le parseur, inchange) —");
{
  const D = Retention.lireDelaiJours;
  ok("absent = null (la DECISION est choisie ailleurs, par delaiDuScript), meme avec les autres arguments", D([]) === null && D(["--vraiment"]) === null && D(["--edition", E]) === null);
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
  ok("le PDF de chaque tour RESTE (decision de Mathias du 20/10, question 5 : le PDF du magazine termine est garde, duree non fixee)",
     F(clePdfTour(E, TOUR)) === "pdf_tour" && !EFF(clePdfTour(E, TOUR)) && /question 5/.test(Retention.FAMILLES.pdf_tour.pourquoi));
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

titre("— T-159 : le script lit par defaut, n'efface qu'apres --vraiment, par le meme chemin que le passage quotidien —");
{
  const brut = lire("scripts/collectif-retention.ts");
  const code = brut.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
  const main = code.slice(code.indexOf("async function main()"));
  const avantVraiment = main.slice(0, main.indexOf("if (!vraiment) {"));
  ok("le delai passe par delaiDuScript (la decision, ou --jours lisible et jamais plus court pour effacer), un refus arrete tout AVANT de lire .env.local ou la base",
     /const vraiment = argv\.includes\("--vraiment"\);\s*const delaiLu = delaiDuScript\(argv, vraiment\);\s*if \(!delaiLu\.ok\) throw new Error\(delaiLu\.erreur\);/.test(main)
       && main.indexOf("delaiDuScript(") < main.indexOf("chargerEnv()"));
  ok("aucun chiffre de delai ecrit dans le script (ni `30`, ni `delai = N`, ni `?? N`) : il vient de retention.ts",
     !/\b30\b/.test(code) && !/\bdelai\s*=\s*\d/.test(code) && !/(delai|jours)[^;\n]*(\?\?|\|\|)\s*\d/i.test(code));
  ok("`vraiment` ne vient que du mot --vraiment ; l'unique `effacerEdition(` et l'unique `reprendreRetention(` viennent APRES `if (!vraiment) {`",
     main.indexOf("if (!vraiment) {") > 0 && !/effacerEdition\(|reprendreRetention\(/.test(avantVraiment)
       && (code.match(/await effacerEdition\(/g) ?? []).length === 1 && (code.match(/await reprendreRetention\(/g) ?? []).length === 1);
  ok("le script n'ecrit RIEN lui-meme : aucun update, insert, upsert, delete, aucun effaceur, aucun journal (tout passe par retentionServeur)",
     !/\.(update|insert|upsert|delete)\(/.test(code) && !/supprimerCoffreEdition\(|supprimerClesEdition\(|supprimerPrefixe\(|journaliser(Id)?\(|DeleteObject/.test(code));
  ok("en lecture seule, le coffre se LISTE par la porte gardee (COFFRE_REEL.lister) ; les intentions restees se LISENT sans etre rejouees",
     /await COFFRE_REEL\.lister\(prefixeEdition\(e\.id\)\)/.test(avantVraiment) && /lireIntentionsRetention\(supabase\)/.test(avantVraiment) && /retentionsEnAttente\(intentions, maintenant\)/.test(avantVraiment));
  ok("aucune table du B2C n'est nommee ; les personnes se comptent en GET `limit(0)`, jamais en `head`",
     !/from\(["'](numeros|photos|evenements|mails_envoyes)["']\)/.test(code) && /\.select\(colonne, \{ count: "exact" \}\)\.eq\("edition_id", editionId\)\.limit\(0\)/.test(code));
  ok("aucun cron neuf, aucune route : le script n'est nomme ni par vercel.json ni par une route",
     !/collectif-retention/.test(lire("vercel.json")) && fichiersParSuffixe("src/app", /route\.ts$/).every((f) => !/collectif-retention/.test(lire(f))));
  const doc = lire("scripts/CLAUDE.md");
  const iPrudence = doc.indexOf("## À manier avec précaution");
  ok("scripts/CLAUDE.md le range parmi les scripts « À manier avec précaution »", iPrudence > 0 && doc.indexOf("`collectif-retention.ts`", iPrudence) > iPrudence);
}

titre("— T-159 : l'ORDRE d'un effacement (retentionServeur.ts) : l'intention, la base, le marqueur EN DERNIER, puis le coffre (audit S7) —");
{
  const src = lire("src/lib/collectif/retentionServeur.ts");
  const code = src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
  const eff = code.slice(code.indexOf("export async function effacerEdition("), code.indexOf("export type BilanReprise"));
  const pos = (s: string) => eff.indexOf(s);
  const etapes = [
    'verdictRetention(e, o.maintenant, o.delai)',
    "coffre.lister(prefixe)",
    "journaliserId(",
    'supprimerPersonnes(supabase, "collectif_participants_appareils", editionId)',
    'supprimerPersonnes(supabase, "collectif_participants", editionId)',
    '.update(PATCH_PHOTO_EFFACEE, { count: "exact" })',
    "photos_supprimees_le: o.maintenant.toISOString()",
    "coffre.effacer(prefixe, i.cles)",
    "TYPE_JOURNAL_RETENTION",
  ];
  ok("relire et refaire le verdict, lister, l'INTENTION, les telephones, les personnes, les photos, le MARQUEUR, PUIS le coffre, puis le resume : dans cet ordre",
     etapes.every((s) => pos(s) > 0) && etapes.every((s, i) => i === 0 || pos(etapes[i - 1]) < pos(s)));
  ok("le marqueur ne se pose qu'une fois (`.is(\"photos_supprimees_le\", null)`) ; chaque refus AVANT lui regle l'intention « gardee » et rend AVANT le coffre",
     /\.is\("photos_supprimees_le", null\)/.test(eff) && (eff.slice(0, pos("coffre.effacer(prefixe, i.cles)")).match(/await reglerGardees\(supabase, editionId, intentions\);\s*return \{ statut: "refusee"/g) ?? []).length === 5);
  ok("le vrai coffre passe par les deux portes gardees de r2.ts (listerCoffreEdition, supprimerClesEdition) ; aucune autre ecriture au coffre",
     /lister: \(prefixe\) => listerCoffreEdition\(prefixe\)/.test(code) && /effacer: \(prefixe, cles\) => supprimerClesEdition\(prefixe, cles\)/.test(code)
       && !/supprimerCoffreEdition\(|supprimerPrefixe\(|\bsupprimer\(|DeleteObject/.test(code));
  ok("seul retentionServeur appelle supprimerClesEdition ; plus personne n'appelle supprimerCoffreEdition (gardee pour sa garde)",
     fichiersParSuffixe("src", /\.tsx?$/).every((f) => f === "src/lib/atelier/r2.ts" || f === "src/lib/collectif/retentionServeur.ts" || !/supprimerClesEdition\(/.test(lire(f)))
       && fichiersParSuffixe("src", /\.tsx?$/).every((f) => f === "src/lib/atelier/r2.ts" || !/supprimerCoffreEdition\(/.test(lire(f))));
  ok("retentionServeur n'est charge que par la releve (import dynamique, apres la reponse) et par le script",
     fichiersParSuffixe("src", /\.tsx?$/).filter((f) => /collectif\/retentionServeur/.test(lire(f).replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, ""))).join() === "src/app/api/atelier/mails/relever/route.ts"
       && /from "@\/lib\/collectif\/retentionServeur"/.test(lire("scripts/collectif-retention.ts")));
  const releve = lire("src/app/api/atelier/mails/relever/route.ts");
  const lance = 'after(() => import("@/lib/collectif/retentionServeur").then((m) => m.retentionQuotidienne(makeSupabase(), debut + ECHEANCE_RELEVE_MS)));';
  ok("la releve le lance APRES sa reponse (after), apres la purge de la corbeille, meme echeance ; aucun cron de plus ; module charge a ce moment-la seulement",
     releve.includes(lance) && releve.indexOf(lance) > releve.indexOf("purgeQuotidienne") && releve.indexOf(lance) < releve.indexOf('.from("numeros")')
       && !/^import .*retentionServeur/m.test(releve) && (JSON.parse(lire("vercel.json")) as { crons: unknown[] }).crons.length === 2);
  const quotidien = code.slice(code.indexOf("export async function retentionQuotidienne("));
  ok("le passage quotidien : COUPE par defaut (COLLECTIF_OUVERT ET COLLECTIF_RETENTION_AUTO), avant toute lecture ; la reprise d'abord ; borne a RETENTION_AUTO_MAX_EDITIONS, journalise `par: \"auto\"`",
     /try \{\s*if \(!collectifOuvert\(\) \|\| !retentionAutoOuverte\(\)\) return null;\s*const reprise = await reprendreRetention\(/.test(quotidien)
       && /\.slice\(0, RETENTION_AUTO_MAX_EDITIONS\)/.test(quotidien) && /par: "auto"/.test(quotidien) && Retention.RETENTION_AUTO_MAX_EDITIONS === 2);
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

  /* La porte des CLES NOMMEES (20/10 au soir) : elle relit FAMILLES elle-meme. Aucune variable R2 ici : si elle
     acceptait une seule de ces cles, elle appellerait le coffre et leverait (makeR2 sans configuration). */
  const silencieux = async <R>(f: () => Promise<R>): Promise<R | "leve"> => {
    const avant = console.error;
    console.error = () => {};
    try {
      return await f();
    } catch {
      return "leve";
    } finally {
      console.error = avant;
    }
  };
  const AUTRE_ED = "22222222-3333-4444-8555-666666666666";
  const gardees = [clePdfTour(E, TOUR), cleDocument(E, P, "devis.pdf"), `collectif/${E}/inconnu/a.jpg`, clePhoto(AUTRE_ED, P, "image/jpeg"), `collectif/${E}/photos/../../${AUTRE_ED}/photos/${P}/original.jpg`, `numeros/${E}/photos/${P}/original.jpg`, cleStyle("riviera", "couverture-1.webp")];
  const r1 = await silencieux(() => supprimerClesEdition(prefixeEdition(E), gardees));
  ok("supprimerClesEdition REFUSE, sans appeler le coffre, un PDF de tour, un document, une cle inconnue, une cle d'une autre edition, un « .. », un dossier de particulier, un style",
     r1 !== "leve" && r1.partis.length === 0 && r1.rates.length === 0 && r1.refusees.length === gardees.length);
  const r2 = await silencieux(() => supprimerClesEdition("collectif/", [clePhoto(E, P, "image/jpeg")]));
  const r3 = await silencieux(() => supprimerClesEdition(prefixeCoffre("0f3e"), [clePhoto(E, P, "image/jpeg")]));
  ok("…et refuse tout prefixe qui n'est pas `collectif/<uuid>/` exact (« collectif/ », un dossier de particulier), meme pour une vraie photo",
     r2 !== "leve" && r2.refusees.length === 1 && r2.partis.length === 0 && r3 !== "leve" && r3.refusees.length === 1);
  /* Cette épreuve-là va JUSQU'AU coffre : elle ne se joue que sans aucune variable R2 (makeR2 lève alors avant tout
     réseau). Avec des variables chargées, elle appellerait un coffre : on ne la joue pas, et on le dit. */
  const sansCoffre = !process.env.R2_ENDPOINT && !process.env.R2_ACCESS_KEY_ID && !process.env.R2_SECRET_ACCESS_KEY && !process.env.R2_BUCKET_NAME;
  const r4 = sansCoffre ? await silencieux(() => supprimerClesEdition(prefixeEdition(E), [clePhoto(E, P, "image/jpeg")])) : "non_jouee";
  ok("une vraie photo de l'edition EST acceptee par la porte (elle va jusqu'au coffre : ici, sans configuration, elle leve avant tout reseau)", r4 === "leve");
  ok("le listage garde refuse un prefixe faux sans appeler le coffre",
     (await silencieux(() => listerCoffreEdition("collectif/"))) === null && (await silencieux(() => listerCoffreEdition(""))) === null);
}

/* T-193 / T-201 / T-197 (20/10) : l'atelier retrouve chaque lien, ses personnes, leurs photos, et le tout.
   Les regles PURES (regroupement, nommage, QR) jouees sur huit bateaux, puis les ecrans et routes relus. */
function verifT193() {
  const U = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
  const RESP = "Mathilde Dupont";
  type L = { provenance_id: string | null; provenance_type: string; role_deposant: string; deposant: string | null; appareil_id: string | null };
  const ph = (lien: string | null, deposant: string | null, role = "participant", appareil: string | null = null): L => ({ provenance_id: lien, provenance_type: "participant", role_deposant: role, deposant, appareil_id: appareil });
  const fois = (n: number, f: () => L) => Array.from({ length: n }, f);

  /* Huit bateaux, dont un sans photo, un supprime avec photos, un supprime sans photo, un doublon de nom. */
  const liens = [
    ...Array.from({ length: 8 }, (_, i) => ({ id: U(i + 1), libelle: `Bateau ${i + 1}` as string | null, retire_le: null as string | null })),
    { id: U(9), libelle: "Ancien", retire_le: "2026-10-19T10:00:00Z" },
    { id: U(10), libelle: "Vide", retire_le: "2026-10-19T10:00:00Z" },
    { id: U(11), libelle: "Bateau 1", retire_le: null },
    { id: U(12), libelle: "Lien général", retire_le: null },
  ];
  const photos: L[] = [
    ...fois(3, () => ph(U(1), "Léa Martin", "participant", "a")),
    ph(U(1), "léa  martin", "participant", "a"),
    ...fois(2, () => ph(U(1), "Tom Roy", "participant", "b")),
    ...fois(2, () => ph(U(2), "Léa Martin", "participant", "c")),
    ph(U(2), null, "participant", "d"),
    ph(U(2), "", "participant", "e"),
    ...fois(2, () => ph(U(9), "Zoé", "participant", "f")),
    ph(U(11), "Ana", "participant", "g"),
    ph(null, "Camille", "participant", "h"),
    ...fois(2, () => ph(null, "La soirée", "responsable")),
    ph(null, null, "atelier"),
  ];
  const groupes = Grille.deposantsParLien(photos, liens, RESP);
  const noms = groupes.map((g) => g.nom);

  titre("— T-193 : « Qui a déposé » se range PAR LIEN, une seule règle avec la page Photos du client —");
  const cles = ["vous", "participants", "atelier", ...liens.map((l) => `lien:${l.id}`)];
  ok("la clé d'un lien est CELLE de dossiers.ts : pour chaque photo et chaque clé, `cleDuLien` et `dansLeDossier` disent la même chose",
    photos.every((p) => cles.every((c) => (Grille.cleDuLien(p) === c) === Dossiers.dansLeDossier(p, c, RESP))));
  ok("le responsable, le lien général, l'atelier et un lien de contribution ont chacun leur clé",
    Grille.cleDuLien(ph(null, "x", "responsable")) === "vous" && Grille.cleDuLien(ph(null, "x")) === "participants" && Grille.cleDuLien(ph(null, "x", "atelier")) === "atelier"
      && Grille.cleDuLien(ph(U(3), "x")) === `lien:${U(3)}` && Grille.cleDuLien(ph(U(3), "x", "responsable")) === `lien:${U(3)}`);
  ok("l'ordre : les liens ouverts PAR NOM, dans l'ordre naturel (Bateau 1 a 8, meme celui qui n'a rien recu), puis les supprimes, puis le lien général, le responsable, l'atelier",
    JSON.stringify(noms) === JSON.stringify(["Bateau 1", "Bateau 1 (2)", "Bateau 2", "Bateau 3", "Bateau 4", "Bateau 5", "Bateau 6", "Bateau 7", "Bateau 8", "Lien général (2)", "Ancien", "Lien général", "Le responsable", "L'atelier"]));
  ok("l'ordre naturel : « Bateau 2 » avant « Bateau 10 », un lien ouvert avant un lien supprime, quel que soit l'ordre de creation",
    ["Bateau 10", "Bateau 2", "Bateau 1"].map((nom) => ({ nom, retire: false })).concat([{ nom: "Aaa", retire: true }]).sort(Grille.comparerLiens).map((x) => x.nom).join("|") === "Bateau 1|Bateau 2|Bateau 10|Aaa");
  ok("deux liens du même nom restent distincts (« Bateau 1 (2) »), et un lien appelé « Lien général » ne prend pas le nom du groupe fixe",
    noms.filter((n) => n === "Bateau 1").length === 1 && noms.includes("Bateau 1 (2)") && noms.filter((n) => n === "Lien général").length === 1);
  ok("un lien supprimé sans photo disparait, un lien supprimé avec photos reste et le dit",
    !noms.includes("Vide") && groupes.find((g) => g.nom === "Ancien")?.retire === true && groupes.find((g) => g.nom === "Ancien")?.n === 2);
  ok("aucune photo perdue, aucune comptee deux fois : le total des liens est le total des photos",
    groupes.reduce((n, g) => n + g.n, 0) === photos.length);
  const b1 = groupes.find((g) => g.nom === "Bateau 1") ?? groupes[0];
  ok("Bateau 1 : « Léa Martin » et « léa  martin » sont UNE personne (4 photos, la graphie la plus fréquente), Tom Roy 2",
    JSON.stringify(b1.personnes.map((p) => [p.nom, p.n])) === JSON.stringify([["Léa Martin", 4], ["Tom Roy", 2]]) && b1.n === 6 && b1.nbPersonnes === 2);
  const b2 = groupes.find((g) => g.nom === "Bateau 2") ?? groupes[0];
  ok("Bateau 2 : « Sans nom » compte un telephone par anonyme (3 personnes pour 2 lignes), et dit combien de telephones",
    b2.nbPersonnes === 3 && b2.personnes.length === 2 && b2.personnes.find((p) => p.nom === "Sans nom")?.telephones === 2 && b2.personnes.find((p) => p.nom === "Sans nom")?.n === 2);
  ok("un bateau qui n'a rien reçu : zéro photo, zéro personne, toujours listé",
    (groupes.find((g) => g.nom === "Bateau 3")?.n ?? -1) === 0 && groupes.find((g) => g.nom === "Bateau 3")?.personnes.length === 0 && groupes.find((g) => g.nom === "Bateau 3")?.nbPersonnes === 0);
  const resp = groupes.find((g) => g.genre === "responsable");
  ok("le responsable : sous son NOM (pas le nom de son dossier de photos), une personne, deux photos ; l'atelier sous « L'atelier »",
    resp?.personnes[0].nom === RESP && resp.n === 2 && resp.nbPersonnes === 1 && groupes.find((g) => g.genre === "atelier")?.personnes[0].nom === "L'atelier");
  ok("sans nom de responsable, il s'appelle « Le responsable »", Grille.personneDeLaPhoto(ph(null, "La soirée", "responsable"), null) === "Le responsable");
  ok("un lien sans nom s'appelle « Lien de contribution », deux fois sans nom : (2)",
    JSON.stringify([...Grille.nomsDesLiens([{ id: "a", libelle: null }, { id: "b", libelle: "  " }, { id: "c", libelle: "Le responsable" }]).values()]) === JSON.stringify(["Lien de contribution", "Lien de contribution (2)", "Le responsable (2)"]));

  titre("— T-193 : le lot d'un lien ne contient que ses photos, celui d'une personne que les siennes —");
  ok("`dansLeLot` sur un lien rend exactement le nombre de photos que la ligne annonce, pour chaque lien",
    groupes.every((g) => photos.filter((p) => Grille.dansLeLot(p, g.cle, null, RESP)).length === g.n));
  ok("`dansLeLot` sur une personne rend exactement son nombre de photos, et la somme des personnes est celle du lien",
    groupes.every((g) => g.personnes.every((x) => photos.filter((p) => Grille.dansLeLot(p, g.cle, x.cle, RESP)).length === x.n) && g.personnes.reduce((n, x) => n + x.n, 0) === g.n));
  ok("« Léa Martin » du Bateau 2 n'entre pas dans le lot de « Léa Martin » du Bateau 1 (la personne se lit DANS son lien)",
    photos.filter((p) => Grille.dansLeLot(p, `lien:${U(1)}`, "léa martin", RESP)).length === 4 && photos.filter((p) => Grille.dansLeLot(p, `lien:${U(2)}`, "léa martin", RESP)).length === 2);
  ok("sans filtre, tout le lot ; la sélection d'un lien inconnu ne rend rien",
    photos.every((p) => Grille.dansLeLot(p, null, null, RESP)) && photos.filter((p) => Grille.dansLeLot(p, `lien:${U(99)}`, null, RESP)).length === 0);
  ok("`estCleDeLien` : les quatre formes, rien d'autre (un libellé, un chemin, `constructor`, un uuid mal formé)",
    ["vous", "participants", "atelier", `lien:${U(5)}`].every(Grille.estCleDeLien) && ["Bateau 1", "", "constructor", "lien:../x", "lien:abc", "pers:x:y", 12, null].every((v) => !Grille.estCleDeLien(v)));

  titre("— T-193 : « <rang> - <lien> - <personne> - <date> - <nom d'origine> » —");
  const pl = (groupe: string, lien: string, personne: string, nom: string | null, priseLe: string | null = null) => ({ nom, priseLe, groupe, lien, personne });
  const lot = [
    pl("lien:A", "Bateau 3", "Léa Martin", "IMG_4207.jpg", "2026-10-08T14:03:00"),
    pl("lien:A", "Bateau 3", "Léa Martin", "IMG_4207.jpg"),
    pl("lien:B", "Équipe Lyon", "Zoë", "IMG_4207.jpg", "2026-10-08T14:03:00"),
  ];
  const n3 = LotCollectif.nomsDuLotCollectif(lot, true);
  ok("le format exact : le rang, le lien, la personne, la date, le nom d'origine ; sans date, le morceau manque",
    n3[0].nom === "01 - Bateau 3 - Lea Martin - 08 oct 2026 - IMG_4207.jpg" && n3[1].nom === "02 - Bateau 3 - Lea Martin - IMG_4207.jpg");
  ok("les accents sont retirés du lien et de la personne (le chemin `curl -OJ` n'écrit que l'ASCII : Chrome et curl donnent les MÊMES noms)",
    n3[2].nom === "01 - Equipe Lyon - Zoe - 08 oct 2026 - IMG_4207.jpg" && n3.every((x) => !/[^\x20-\x7e]/.test(x.nom)));
  ok("tout le lot : un sous-dossier par lien (accents gardés : le dossier n'est pas écrit par curl), le rang repart de 01 pour chaque lien",
    JSON.stringify(n3.map((x) => x.dossier)) === JSON.stringify(["Bateau 3", "Bateau 3", "Équipe Lyon"]));
  const n3plat = LotCollectif.nomsDuLotCollectif(lot, false);
  ok("sans sous-dossiers (un lien, une personne, la sélection) : un seul dossier, numéroté d'un bout à l'autre, `dossier` nul",
    n3plat.map((x) => x.nom.slice(0, 2)).join() === "01,02,03" && n3plat.every((x) => x.dossier === null));
  const memeNom = LotCollectif.nomsDuLotCollectif([pl("lien:A", "Bateau 1", "Léa", "a.jpg"), pl("lien:B", "Bateau 1", "Léa", "a.jpg")], true);
  ok("deux liens de même nom (donc deux rang 01) ne s'écrasent jamais : le second nom prend « -2 », et le sous-dossier « (2) »",
    memeNom[0].nom !== memeNom[1].nom && memeNom[1].nom.endsWith("a-2.jpg") && memeNom[0].dossier === "Bateau 1" && memeNom[1].dossier === "Bateau 1 (2)");
  const memeAscii = LotCollectif.nomsDuLotCollectif([pl("lien:A", "田中", "x", "a.jpg"), pl("lien:B", "山田", "x", "a.jpg")], true);
  ok("deux noms qui ne diffèrent qu'au-delà de l'ASCII sont départagés AVANT l'écriture (curl les écrirait pareils)",
    new Set(memeAscii.map((x) => x.nom.replace(/[^\x20-\x7e]/g, "-").toLowerCase())).size === 2);
  const dur = LotCollectif.nomsDuLotCollectif([pl("lien:A", 'Bateau 3 / Équipe: "A"?*<>|', "Léa\\Martin", 'IM/G:1?.jpg')], true)[0];
  ok("aucun caractère interdit par macOS ou Windows dans le nom, ni dans le dossier", !/[\\/:*?"<>|]/.test(dur.nom) && !/[\\/:*?"<>|]/.test(dur.dossier ?? ""));
  const long = LotCollectif.nomsDuLotCollectif([pl("lien:A", "B".repeat(200), "P".repeat(200), "x".repeat(300) + ".jpg", "2026-10-08T14:03:00")], true)[0];
  ok("des noms démesurés restent un nom de fichier valide (moins de 255 caractères)", long.nom.length < 255 && long.nom.endsWith(".jpg"));
  const cent = LotCollectif.nomsDuLotCollectif(Array.from({ length: 120 }, (_, i) => pl("lien:A", "Bateau 1", "Léa", `p${i}.jpg`)), true);
  ok("plus de 99 photos dans un lien : le rang passe à trois chiffres (001) pour que le Finder trie juste", cent[0].nom.startsWith("001 - ") && cent[119].nom.startsWith("120 - "));
  ok("l'ordre des photos est celui de l'appel : le rang monte avec lui, le nom i est celui de la photo i",
    LotCollectif.nomsDuLotCollectif([pl("lien:A", "B", "P", "z.jpg"), pl("lien:A", "B", "P", "a.jpg")], true).map((x) => x.nom).join("|") === "01 - B - P - z.jpg|02 - B - P - a.jpg");
  ok("une photo sans nom d'origine s'appelle « photo-N »", LotCollectif.nomsDuLotCollectif([pl("lien:A", "B", "P", null)], true)[0].nom === "01 - B - P - photo-1");
  ok("un lien ou une personne vide ne laisse pas un trou dans le nom (« Lien » et « Sans nom »)",
    LotCollectif.nomsDuLotCollectif([pl("lien:A", "..", "...", "a.jpg")], true)[0].nom === "01 - Lien - Sans nom - a.jpg");
  ok("le dossier d'un lot : le nom du lien et de la personne, « Lot complet », « Sélection du client »",
    LotCollectif.dossierDuLot({}) === "Lot complet" && LotCollectif.dossierDuLot({ selection: true }) === "Sélection du client" && LotCollectif.dossierDuLot({ lien: "Bateau 3" }) === "Lot - Bateau 3"
      && LotCollectif.dossierDuLot({ lien: "Bateau 3", personne: "Léa Martin" }) === "Lot - Bateau 3 - Léa Martin" && LotCollectif.dossierDuLot({ lien: "A/B" }) === "Lot - A-B");
  ok("le B2C ne bouge pas : `atelier/lot.ts` ne connaît pas l'édition collective et la route du lot n'appelle plus `nomsDeFichiers`",
    !/collectif/i.test(lire("src/lib/atelier/lot.ts")) && !/nomsDeFichiers/.test(lire("src/app/api/admin/collectif/editions/[id]/lot/route.ts")));

  titre("— T-197 : le QR en grand, avec le nom du lien, prêt à imprimer —");
  ok("le fichier du QR porte le nom du lien : « qr-equipe-lyon.svg », « qr-lien.svg » sans rien de lisible",
    nomFichierQr("Équipe Lyon") === "qr-equipe-lyon.svg" && nomFichierQr("Bateau 3") === "qr-bateau-3.svg" && nomFichierQr("  !!! ") === "qr-lien.svg");
  const page = pageQrImprimable({ nom: '<img src=x onerror="alert(1)">', url: "https://bellajour.fr/depot/abc?p=cle", consigne: "Scanner.", details: "30 photos par personne" });
  ok("la page imprimée : une feuille A4, un seul QR, le nom en titre ÉCHAPPÉ (jamais du HTML venu d'un nom de lien), le lien lui-même n'est pas écrit en clair",
    /@page\{size:A4/.test(page) && (page.match(/<svg /g) ?? []).length === 1 && /<h1>&lt;img src=x onerror=&quot;alert\(1\)&quot;&gt;<\/h1>/.test(page) && !page.includes("<img") && !page.includes("https://bellajour.fr/depot"));
  const vueQr = lire("src/app/edition/_composants/LienContribution.tsx");
  const vueCollecte = lirePagePhotos();
  ok("côté responsable : la fenêtre du grand QR n'est plus orpheline (`<FenetreQr` appelée depuis chaque carte de lien), un bouton « Afficher en grand » par carte, ouvert depuis le lien général comme depuis un lien de contribution",
    /<FenetreQr lien=\{grandQr\}/.test(vueCollecte) && (vueCollecte.match(/onGrand=\{\(\) => setGrandQr\(/g) ?? []).length === 2 && /Afficher en grand/.test(vueCollecte));
  ok("la fenêtre dit le NOM du lien sous le code (en grand), imprime la page A4 du nom et du code, et garde « Télécharger le QR »",
    /<QrCode[^>]*\/>\s*<strong className="ec-qr-grand-nom">\{lien\.libelle\}<\/strong>/.test(vueQr) && /imprimerPage\(\s*pageQrImprimable\(/.test(vueQr) && /Télécharger le QR/.test(vueQr) && /export function FenetreQr/.test(vueQr));
  const imprimerTs = lire("src/lib/collectif/imprimer.ts");
  ok("« Imprimer » passe par un cadre caché (jamais la page entière) et rend le focus : sans cela, Échap partait dans le cadre et la fenêtre ne se fermait plus (vu à la recette du 20/10)",
    /document\.createElement\("iframe"\)/.test(imprimerTs) && /cadre\.srcdoc = html/.test(imprimerTs) && /cadre\.blur\(\);\s*window\.focus\(\);\s*avant\?\.focus\(\);/.test(imprimerTs) && /afterprint/.test(imprimerTs) && !/window\.print\(/.test(imprimerTs));
  const cssEspace = lire("src/app/edition/[token]/espace.css");
  ok("le pied d'une carte de lien passe à la ligne : la règle garde 180 px au moins, sinon les trois gestes tiennent dessous (sur 375 px, elle se tassait en une colonne de mots)",
    /\.ec-espace \.ec-li-pied \{[^}]*flex-wrap: wrap;/.test(cssEspace) && /\.ec-espace \.ec-li-regle \{\s*flex: 1 1 180px;/.test(cssEspace));
  const fenAtelier = lire("src/app/admin/collectif/[id]/FenetreQrAtelier.tsx");
  ok("côté atelier : sa propre fenêtre de verre (la feuille de l'espace n'y est pas chargée), en PORTAIL dans `.eca-root` (un panneau de verre enferme ce qui est positionné dedans), le nom sous le code, Imprimer, Échap",
    /createPortal\(contenu, hote\)/.test(fenAtelier) && /querySelector\("\.eca-root"\)/.test(fenAtelier) && /<strong className="eca-fen-nom">\{nom\}<\/strong>/.test(fenAtelier) && /imprimerPage\(/.test(fenAtelier)
      && /e\.key === "Escape"/.test(fenAtelier) && /role="dialog"/.test(fenAtelier) && !/#[0-9a-fA-F]{3,8}\b/.test(fenAtelier));

  titre("— T-201 : l'atelier voit et crée les liens de contribution —");
  const rProv = lire("src/app/api/admin/collectif/editions/[id]/provenances/route.ts");
  const modifierLienTs = lire("src/lib/collectif/modifierLien.ts");
  const appelJournal = rProv.slice(rProv.indexOf("journaliser("), rProv.indexOf(");", rProv.indexOf("journaliser(")));
  ok("la route de création : sous /api/admin, l'admin REVÉRIFIÉ, l'interrupteur lu, les MÊMES règles que le responsable (`lirePlafondLien`, clé aléatoire), un seul INSERT dans `collectif_provenances`",
    /quiEstConnecteRequete\(request\)/.test(rProv) && /collectifOuvert\(\)/.test(rProv) && /lirePlafondLien\(corps, edition\)/.test(rProv) && /nouvelleCleProvenance\(\)/.test(rProv)
      && (rProv.match(/\.insert\(/g) ?? []).length === 1 && /from\("collectif_provenances"\)\s*\.insert\(ligne\)/.test(rProv) && !/\.from\("(numeros|photos|evenements|mails_envoyes)"\)/.test(rProv));
  ok("elle journalise QUI l'a créé (« par l'atelier »), jamais la clé du lien ; son récit le dit",
    /"provenance_creee"/.test(appelJournal) && /par, via: "atelier"/.test(appelJournal) && !/\bcle\b/.test(appelJournal) && /qui\s*$/.test(appelJournal.trim())
      && phraseEvenement("provenance_creee", { libelle: "Bateau 3", via: "atelier", par: "Mathias" }) === "Lien de dépôt créé par l'atelier (Mathias) : Bateau 3."
      && phraseEvenement("provenance_creee", { libelle: "Bateau 3", sansPlafond: true }) === "Lien de dépôt créé : Bateau 3 (sans plafond).");
  ok("deux refus que le responsable n'a pas : un nom déjà pris par un lien ouvert (409 `nom_deja_pris`) et une édition archivée (409) ; les noms des groupes fixes sont réservés",
    /refusNomDeLien\(libelle, existants\)/.test(rProv) && /nom_deja_pris/.test(modifierLienTs) && /!l\.retire_le && l\.id !== sauf && clePersonne\(l\.libelle\) === cle/.test(modifierLienTs) && /archivee/.test(rProv) && /status: 409/.test(rProv) && /nom_reserve/.test(modifierLienTs) && /LIBELLE_LIEN_GENERAL/.test(modifierLienTs));
  ok("le plafond de 5 à 100 ou « Sans limite » : borné par le plafond de l'atelier ; sans la migration de la révision, 503 (jamais un lien sans son plafond)",
    plafondLienMax({ plafond_participant_atelier: null }) === 100 && plafondLienMax({ plafond_participant_atelier: 40 }) === 40 && CURSEUR_LIEN.min === 5
      && /ERREUR_REVISION_ABSENTE/.test(rProv) && /if \(plafond\.plafond_par_personne !== null\) ligne\.plafond_par_personne/.test(rProv));
  ok("la route rend le lien ÉCRIT (l'écran l'affiche aussitôt, `router.refresh()` ne suffit pas), sans le journaliser",
    /lien: \{\s*id: ecrit\.data\.id,/.test(rProv) && /status: 201/.test(rProv));
  const pProv = lire("src/app/admin/collectif/[id]/PanneauProvenances.tsx");
  const pageFiche = lire("src/app/admin/collectif/[id]/page.tsx");
  ok("la carte « Liens de contribution » : nom, règle, personnes, photos, actif ou supprimé ; copier ; afficher en grand ; créer un lien (nom, nombre de 5 à 100 ou sans limite)",
    /Liens de contribution/.test(pProv) && /Actif/.test(pProv) && /Supprimé/.test(pProv) && /Copier le lien/.test(pProv) && /Afficher en grand/.test(pProv) && /Créer un lien/.test(pProv) && /Sans limite/.test(pProv)
      && /<Pastille/.test(pProv) && !/type="(date|datetime-local|time|number)"/.test(pProv) && /RACCOURCIS_LIEN/.test(pProv) && /CURSEUR_LIEN\.min/.test(pProv));
  ok("la carte est dans « Réglages et liens », sous les trois liens ; la fiche lui donne le plafond maximal de l'édition, l'adresse de dépôt, l'état de la collecte",
    /<PanneauLiens id=\{e\.id\} liens=\{liens\}(?: ouverture=\{ouverture\})? \/>\s*\{\/\*[^*]*\*\/\}\s*<PanneauProvenances/.test(pageFiche) && /max=\{plafondLienMax\(e\)\}/.test(pageFiche) && /ouverte=\{etat === "preparation"\}/.test(pageFiche) && /archivee=\{Boolean\(e\.archive_le\)\}/.test(pageFiche));
  ok("l'écran garde le lien écrit (dédoublonné quand la relecture le rend), vide le nom et remet le focus pour le bateau suivant",
    /setAjoutes\(\(a\) => \[\.\.\.a, \{ \.\.\.lien, url: `\$\{depot\}\?p=\$\{cle\}` \}\]\)/.test(pProv) && /ajoutes\.filter\(\(a\) => !liens\.some\(\(l\) => l\.id === a\.id\)\)/.test(pProv) && /champ\.current\?\.focus\(\)/.test(pProv));
  const donneesFiche2 = lire("src/app/admin/collectif/donnees.ts");
  ok("la fiche lit les liens par `lireProvenances` (la même lecture que l'espace, avec ses replis de colonnes) et rend leurs noms UNIQUES",
    /lireProvenances\(id\)/.test(donneesFiche2) && /nomsDesLiens\(provenances\)/.test(donneesFiche2) && /parLien: deposantsParLien\(lignesPhotos, provenances, edition\.responsable_nom\)/.test(donneesFiche2));

  titre("— T-193 : les écrans et la route du lot —");
  const lotRoute = lire("src/app/api/admin/collectif/editions/[id]/lot/route.ts");
  const pCollecte = lire("src/app/admin/collectif/[id]/PanneauCollecte.tsx");
  ok("la route filtre par CLÉ de lien (jamais par un libellé : deux liens peuvent porter le même nom), valide la forme, refuse l'ancien envoi par libellé, garde son compte avant de partir",
    /estCleDeLien\(b\.lien\)/.test(lotRoute) && /dansLeLot\(p, lien, personne, responsable\)/.test(lotRoute) && /page_ancienne/.test(lotRoute) && /lot_incomplet/.test(lotRoute) && !/libelleProvenance/.test(lotRoute));
  ok("les noms et les dossiers viennent du serveur : `nomsDuLotCollectif`, les noms de lien de `deposantsParLien`, un sous-dossier seulement pour « tout le lot »",
    /nomsDuLotCollectif\(/.test(lotRoute) && /deposantsParLien\(data, liensLus\.data \?\? \[\], responsable\)/.test(lotRoute) && /const separer = lien === null && !selection;/.test(lotRoute) && /dossierDuLot\(/.test(lotRoute));
  ok("le panneau : « Télécharger tout le lot », « Télécharger ce lien », « Télécharger » par personne ; les trois envoient une CLÉ ; les sous-dossiers par lien quand le disque s'écrit",
    /Télécharger tout le lot/.test(pCollecte) && /Télécharger ce lien/.test(pCollecte) && /telecharger\(\{ lien: l\.cle, personne: p\.cle \}\)/.test(pCollecte) && /telecharger\(\{ lien: l\.cle \}\)/.test(pCollecte)
      && /telecharger\(\{\}\)/.test(pCollecte) && /cible\(p\.dossier\)/.test(pCollecte) && !/parProvenance/.test(pCollecte));
  const nouveaux = ["src/app/admin/collectif/[id]/PanneauProvenances.tsx", "src/app/admin/collectif/[id]/FenetreQrAtelier.tsx", "src/app/admin/collectif/[id]/PanneauCollecte.tsx", "src/lib/collectif/lotCollectif.ts", "src/lib/collectif/imprimer.ts"].map((f) => lire(f));
  ok("la copie visible : aucun tiret cadratin ni demi-cadratin, jamais « cliente » (masculin générique)", nouveaux.every((t) => !/[—–]/.test(t) && !/\bclientes?\b/i.test(t)));
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

/* T-194 (le rattrapage des photos au coffre jamais confirmees), T-171 (la vignette fabriquee par
   le serveur), T-160 (les echecs au journal, le bloc « Editions » de la page Sante). Les regles
   pures, puis le passage ENTIER joue contre une fausse base et un faux coffre, puis le code relu. */
async function sondeT194() {
  const R = await import("@/lib/collectif/rattrapage");
  const E = await import("@/lib/collectif/echecs");
  const S = await import("@/lib/collectif/rattrapageServeur");
  const J = await import("@/lib/collectif/echecsJournal");
  const { JOURNAL_DE_LOT: LOT, phraseEvenement: phrase } = await import("@/lib/collectif/recit");
  const { MAX_FILE_BYTES } = await import("@/lib/atelier/formats");
  const { randomUUID } = await import("node:crypto");
  const MIN = 60 * 1000;
  const T0 = Date.parse("2026-10-20T12:00:00.000Z");
  const iso = (ms: number) => new Date(ms).toISOString();

  titre("— T-194 : qui examiner, et comment —");
  {
    const l = (minutes: number, confirmee_le: string | null = null) => ({ confirmee_le, created_at: iso(T0 - minutes * MIN) });
    ok("une ligne declaree depuis moins de dix minutes est laissee au navigateur ; a dix minutes, on la regarde",
      R.DELAI_AVANT_RATTRAPAGE_MS === 10 * MIN && !R.estCandidate(l(9), new Date(T0)) && R.estCandidate(l(10), new Date(T0)) && R.estCandidate(l(600), new Date(T0)));
    ok("une ligne confirmee, ou une date illisible, n'est jamais candidate",
      !R.estCandidate(l(60, iso(T0)), new Date(T0)) && !R.estCandidate({ confirmee_le: null, created_at: "le 4 octobre" }, new Date(T0)));
    ok("le filtre de la base dit la meme chose (lte seuil = dix minutes avant)", R.seuilCandidates(new Date(T0)) === iso(T0 - 10 * MIN));
    ok("peu de lignes : une tete chacune ; au-dela de 50 : la liste du dossier ; aucune : rien",
      R.strategie(0) === "rien" && R.strategie(1) === "tetes" && R.strategie(R.TETES_DIRECTES_MAX) === "tetes" && R.strategie(R.TETES_DIRECTES_MAX + 1) === "liste");
    const c = (id: string, minutes: number) => ({ id, r2_key: `k/${id}`, created_at: iso(T0 - minutes * MIN) });
    const plan = R.aExaminer([c("a", 30), c("b", 20), c("c", 40), c("d", 20)], new Set(["k/a", "k/b", "k/d"]), 2);
    ok("par la liste : seules les lignes au coffre, les plus recentes d'abord, bornees ; le reste compte (absentes, reportees)",
      plan.examiner.map((x) => x.id).join() === "d,b" && plan.absentes === 1 && plan.reportees === 1);
    ok("par les tetes : toutes les lignes sont examinees", R.aExaminer([c("a", 30), c("b", 20)], null).examiner.length === 2);
  }

  titre("— T-194 : la tete, le verdict, le patch : LES MEMES que depot/complete —");
  {
    ok("absente, panne, trop lourde (un octet de trop), arrivee (au maximum pile)",
      R.issueTete({ statut: "absente" }) === "absente" && R.issueTete({ statut: "panne" }) === "panne"
        && R.issueTete({ statut: "presente", taille: MAX_FILE_BYTES + 1 }) === "trop_lourde" && R.issueTete({ statut: "presente", taille: MAX_FILE_BYTES }) === "arrivee");
    const p = R.patchConfirmation(1234, "2026-10-20T12:00:00.000Z", "v/key", 2000, 512 * 1024);
    ok("le patch : trois champs exactement (taille, confirmee_le, vignette_key) ; ni l'accord, ni le participant, ni la provenance",
      Object.keys(p).sort().join() === "confirmee_le,taille,vignette_key" && p.vignette_key === "v/key" && p.taille === 1234);
    ok("la vignette n'est notee que si elle est au coffre ET sous 512 Ko",
      R.patchConfirmation(1, "x", "v", null, 512 * 1024).vignette_key === null && R.patchConfirmation(1, "x", "v", 512 * 1024 + 1, 512 * 1024).vignette_key === null
        && R.patchConfirmation(1, "x", "v", 512 * 1024, 512 * 1024).vignette_key === "v");
  }

  titre("— T-194 : un seul passage a la fois, par le journal —");
  {
    let n = 0;
    const ev = (type: string, secondes: number, payload: Record<string, unknown>) => ({ id: `e${n++}`, type, payload, created_at: iso(T0 - secondes * 1000) });
    const dem = (p: string, s: number) => ev(R.EVT_RATTRAPAGE_DEMARRE, s, { passage: p });
    const fin = (p: string, s: number, extra: Record<string, unknown> = {}) => ev(R.EVT_RATTRAPAGE_FINI, s, { demarre: p, ...extra });
    ok("journal vide : libre", R.etatVerrou([], T0).libre);
    ok("un demarrage sans fin depuis 10 s : en cours", !R.etatVerrou([dem("p1", 10)], T0).libre && (R.etatVerrou([dem("p1", 10)], T0) as { raison: string }).raison === "en_cours");
    ok("un demarrage sans fin depuis plus que la fenetre (60 s) : libre (la fonction qui l'a pose est morte)", R.etatVerrou([dem("p1", 61)], T0).libre);
    ok("une fin qui nomme le passage le ferme ; une fin recente met au repos (15 min)",
      (R.etatVerrou([dem("p1", 30), fin("p1", 20)], T0) as { raison?: string }).raison === "repos" && R.etatVerrou([dem("p1", 30 * 60), fin("p1", 20 * 60)], T0).libre);
    ok("une fin qui ne nomme pas CE passage ne le ferme pas", (R.etatVerrou([dem("p1", 10), fin("p2", 5)], T0) as { raison?: string }).raison === "en_cours");
    ok("une cession ne met pas au repos (elle n'a rien regarde)", R.etatVerrou([dem("p1", 30 * 60), fin("p1", 20 * 60), dem("p2", 70), fin("p2", 69, { cede: true })], T0).libre);
    ok("un age negatif (horloge de la base en avance) reste en cours", (R.etatVerrou([dem("p1", -2)], T0) as { raison?: string }).raison === "en_cours");
    ok("deux demarrages croises : le plus RECENT cede, le plus ancien continue",
      R.doitCeder([dem("vieux", 3), dem("moi", 1)], "moi", T0) && !R.doitCeder([dem("moi", 3), dem("jeune", 1)], "moi", T0));
    ok("au meme instant : l'identifiant du passage departage (un seul cede)",
      R.doitCeder([dem("a", 1), dem("b", 1)], "b", T0) !== R.doitCeder([dem("a", 1), dem("b", 1)], "a", T0));
    ok("un ancien deja ferme, ou son propre demarrage introuvable : on ne cede pas",
      !R.doitCeder([dem("vieux", 3), fin("vieux", 2), dem("moi", 1)], "moi", T0) && !R.doitCeder([dem("vieux", 3)], "moi", T0));
    ok("les vignettes impossibles des derniers passages sont retenues (on ne les retente pas a chaque ouverture)",
      [...R.impossiblesRecentes([fin("p1", 10, { impossibles: ["x", "y"] }), ev(R.EVT_PHOTOS_RATTRAPEES, 5, { demarre: "p2", impossibles: ["z", 3] })])].sort().join() === "x,y,z");
    ok("la fenetre du verrou vaut la maxDuration des trois appelants ; le budget et l'echeance de la releve tiennent dedans",
      R.FENETRE_VERROU_RATTRAPAGE_MS === 60 * 1000 && R.BUDGET_RATTRAPAGE_MS < R.FENETRE_VERROU_RATTRAPAGE_MS && R.ECHEANCE_RELEVE_MS < 60 * 1000
        && /export const maxDuration = 60;/.test(lire("src/app/admin/collectif/[id]/page.tsx")) && /export const maxDuration = 60\n/.test(lire("src/app/edition/[token]/photos/page.tsx"))
        && /export const maxDuration = 60;/.test(lire("src/app/api/atelier/mails/relever/route.ts")));
  }

  titre("— T-171 : quelle vignette, par qui, combien par passage —");
  {
    const jpeg = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0, 0, 0, 0, 0, 0, 0, 0]);
    const heic = new Uint8Array([0, 0, 0, 0x18, 0x66, 0x74, 0x79, 0x70, 0x68, 0x65, 0x69, 0x63]);
    const rien = new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]);
    ok("les OCTETS decident : un JPEG annonce HEIC passe par sharp, un HEIC annonce JPEG par libheif ; illisible et inconnu : aucune",
      R.fabriquePour(jpeg, "image/heic") === "sharp" && R.fabriquePour(heic, "image/jpeg") === "heic" && R.fabriquePour(rien, "image/heif") === "heic" && R.fabriquePour(rien, "image/jpeg") === null);
    const ph = (id: string, mime: string) => ({ id, mime });
    const plan = R.planVignettes([ph("r1", "image/jpeg"), ph("r2", "image/heic")], [ph("r1", "image/jpeg"), ph("a1", "image/png"), ph("x", "image/jpeg"), ph("a2", "image/heic"), ph("a3", "image/heic")], new Set(["x"]), { maxSharp: 2, maxHeic: 1 });
    ok("les retrouvees d'abord, sans doublon, hors des impossibles ; deux files bornees (sharp, HEIC) ; le reste reporte",
      plan.sharp.map((p) => p.id).join() === "r1,a1" && plan.heic.map((p) => p.id).join() === "r2" && plan.reportees === 2);
    const worker = lire("src/app/(atelier)/composer/depot/reduire.worker.js");
    ok("320 px, qualite 72 : les jumeaux du navigateur (reduire.worker.js)",
      R.COTE_VIGNETTE === 320 && new RegExp(`const COTE_VIGNETTE = ${R.COTE_VIGNETTE}\\b`).test(worker) && new RegExp(`const QUALITE_VIGNETTE = 0\\.${R.QUALITE_VIGNETTE}\\b`).test(worker));
    const vig = lire("src/lib/collectif/rattrapageVignettes.ts");
    ok("la vignette au coffre AVANT la cle en base, et la cle seulement si elle est encore vide ; l'orientation EXIF appliquee (rotate)",
      vig.indexOf("await ecrireObjet(key") > 0 && vig.indexOf("await ecrireObjet(key") < vig.indexOf('.update({ vignette_key: key })') && /\.update\(\{ vignette_key: key \}\)\.eq\("id", p\.id\)\.is\("vignette_key", null\)/.test(vig)
        && /\.rotate\(\)/.test(vig));
    ok("libheif : la meme bibliotheque que le navigateur et le script, epinglee, chargee a la premiere photo HEIC seulement",
      /"libheif-js": "1\.19\.8"/.test(lire("package.json")) && /import\("libheif-js\/wasm-bundle"\)/.test(vig) && !/^import .*libheif/m.test(vig));
    const complete = lire("src/app/api/collectif/depot/complete/route.ts");
    ok("depot/complete : la vignette qui manque se fabrique APRES la reponse et AVANT la lecture des metadonnees (l'empreinte se lit sur elle)",
      complete.indexOf("vignettesManquantes(edition.id, sansVignette)") > 0 && complete.indexOf("vignettesManquantes(edition.id, sansVignette)") < complete.indexOf("await enrichirCollectif(makeSupabase(), edition.id, nouvelles)")
        && /if \(!r\.vignette\) sansVignette\.push/.test(complete));
  }

  titre("— T-194 : le passage quotidien —");
  {
    const e = (id: string, etat: string, cloture_le: string | null, extra: Record<string, string | null> = {}) => ({ id, etat, cloture_le, archive_le: null, photos_supprimees_le: null, etat_maj_le: null, ...extra });
    const choisies = R.editionsDuPassageQuotidien([
      e("ouverte", "preparation", null),
      e("future", "preparation", iso(T0 + 5 * 24 * 60 * MIN)),
      e("hier", "preparation", iso(T0 - 24 * 60 * MIN)),
      e("vieille", "preparation", iso(T0 - 3 * 24 * 60 * MIN)),
      e("archivee", "preparation", null, { archive_le: iso(T0) }),
      e("videe", "preparation", null, { photos_supprimees_le: iso(T0) }),
      e("close-main", "composition", null, { etat_maj_le: iso(T0 - 60 * MIN) }),
      e("illisible", "preparation", "le 4 octobre"),
    ], new Date(T0)).map((x) => x.id);
    ok("en collecte, ou close depuis moins de deux jours ; jamais archivee ni videe ; une date illisible n'entre pas",
      choisies.join() === "ouverte,future,hier,close-main");
    ok("aucun cron neuf : vercel.json garde ses deux taches", (JSON.parse(lire("vercel.json")).crons ?? []).length === 2);
    const releve = lire("src/app/api/atelier/mails/relever/route.ts");
    const lance = 'after(() => import("@/lib/collectif/rattrapageServeur").then((m) => m.rattrapageQuotidien(makeSupabase(), debut + ECHEANCE_RELEVE_MS)));';
    ok("la releve des particuliers le lance APRES sa reponse (after), juste apres le secret, module charge a ce moment-la seulement ; rien d'autre ne change a son balayage",
      releve.includes(lance) && releve.indexOf("if (!autorise(request))") < releve.indexOf(lance) && releve.indexOf(lance) < releve.indexOf('.from("numeros")')
        && !/^import .*rattrapageServeur/m.test(releve));
    const avant = process.env.COLLECTIF_OUVERT;
    delete process.env.COLLECTIF_OUVERT;
    let touche = false;
    const muette = { from: () => { touche = true; throw new Error("aucune lecture attendue"); } } as unknown as Parameters<typeof S.rattrapageQuotidien>[0];
    const r = await S.rattrapageQuotidien(muette, Date.now() + 1000);
    if (avant !== undefined) process.env.COLLECTIF_OUVERT = avant;
    ok("COLLECTIF_OUVERT ferme : le passage quotidien ne lit rien", r === null && !touche);
    const fiche = lire("src/app/admin/collectif/[id]/page.tsx");
    const photos = lire("src/app/edition/[token]/photos/page.tsx");
    ok("la fiche et la page Photos du responsable le lancent en after() (la page part d'abord), module charge a ce moment-la seulement ; le lien de l'equipe ne lance rien",
      fiche.includes('after(() => import("@/lib/collectif/rattrapageServeur").then((m) => m.rattraperEdition(makeSupabase(), e.id, { declencheur: "fiche" })));')
        && /if \(role === 'responsable' \|\| acces\.appareilInconnu\) \{\s*after\(\(\) => import\('@\/lib\/collectif\/rattrapageServeur'\)\.then\(\(m\) => m\.rattraperEdition\(makeSupabase\(\), edition\.id, \{ declencheur: 'photos' \}\)\)\)/.test(photos)
        && ![fiche, photos].some((f) => /^import .*rattrapageServeur/m.test(f)));
  }

  titre("— T-194 : le journal du rattrapage —");
  {
    const b = R.bilanVide();
    b.retrouvees = 3; b.candidates = 7; b.absentes = 4;
    b.vignettes.impossibles = Array.from({ length: 40 }, (_, i) => `id-${i}`);
    const f = R.finDePassage("p1", "fiche", b);
    ok("au moins une retrouvee : `photos_rattrapees` (lu sur la fiche) ; aucune : `rattrapage_fini` (cache)",
      f.type === R.EVT_PHOTOS_RATTRAPEES && R.finDePassage("p1", "fiche", R.bilanVide()).type === R.EVT_RATTRAPAGE_FINI);
    ok("la fin nomme son passage, dit les nombres, garde 25 impossibles au plus, et ne porte aucune cle du coffre",
      f.payload.demarre === "p1" && f.payload.n === 3 && f.payload.absentes === 4 && (f.payload.impossibles as string[]).length === R.IMPOSSIBLES_MAX && !/collectif\//.test(JSON.stringify(f.payload)));
    ok("la machinerie (demarrage, fin sans photo, vignettes d'un lot) est cachee du journal de la fiche ; les photos retrouvees et les echecs y restent",
      [R.EVT_RATTRAPAGE_DEMARRE, R.EVT_RATTRAPAGE_FINI, "vignettes_fabriquees"].every((t) => (LOT as readonly string[]).includes(t))
        && ![R.EVT_PHOTOS_RATTRAPEES, E.EVT_ECHEC].some((t) => (LOT as readonly string[]).includes(t)));
    ok("chaque ligne nouvelle se lit en francais", [R.EVT_RATTRAPAGE_DEMARRE, R.EVT_RATTRAPAGE_FINI, R.EVT_PHOTOS_RATTRAPEES, "vignettes_fabriquees", E.EVT_ECHEC].every((t) => phrase(t, { n: 2, quoi: "confirmation" }) !== t)
      && /2 photo\(s\) retrouvée\(s\)/.test(phrase(R.EVT_PHOTOS_RATTRAPEES, { n: 2 })));
  }

  titre("— T-160 : un echec au journal, court, sans secret, freine —");
  {
    const jeton = "Abcdefghijklmnopqrstuvwxyz012345";
    const p = E.payloadEchec("declaration", { etape: "lecture", code: "PGRST204", n: 3.7, ...({ message: `cle ${jeton}`, token: jeton } as object) }, 2);
    ok("seulement quoi, etape, code, n, repetitions ; un nombre entier ; jamais un message brut",
      Object.keys(p).sort().join() === "code,etape,n,quoi,repetitions" && p.n === 3 && p.repetitions === 2 && !JSON.stringify(p).includes(jeton));
    ok("un code qui ressemble a un token est masque ; une etape inconnue est ignoree",
      !JSON.stringify(E.payloadEchec("confirmation", { code: jeton })).includes(jeton) && !("etape" in E.payloadEchec("confirmation", { etape: "nimporte" as never })));
    const a = E.freinerEchec(undefined, T0);
    const b2 = E.freinerEchec(a.etat, T0 + 10 * 1000);
    const c = E.freinerEchec(b2.etat, T0 + 20 * 1000);
    const d = E.freinerEchec(c.etat, T0 + 61 * 1000);
    ok("le frein : la premiere passe, les suivantes de la minute se comptent, la premiere d'apres porte leur nombre",
      a.ecrire && a.repetitions === 0 && !b2.ecrire && !c.ecrire && d.ecrire && d.repetitions === 2 && E.INTERVALLE_ECHEC_MS === 60 * 1000);
    ok("la phrase : le geste, le nombre, l'etape, le code", E.phraseEchec({ quoi: "confirmation", etape: "coffre", n: 3, code: "57014" }) === "Confirmation de photos impossible (3 photos) : le coffre n'a pas répondu, code 57014.");

    const inserts: { table: string; ligne: Record<string, unknown> }[] = [];
    const base = { from: (table: string) => ({ insert: async (ligne: Record<string, unknown>) => (inserts.push({ table, ligne }), { error: null }) }) } as unknown as Parameters<typeof J.noterEchec>[0];
    const ed = randomUUID();
    const un = await J.noterEchec(base, ed, "confirmation", { etape: "coffre", n: 2 });
    const deux = await J.noterEchec(base, ed, "confirmation", { etape: "coffre", n: 5 });
    const autre = await J.noterEchec(base, ed, "confirmation", { etape: "ecriture", n: 1 });
    ok("noterEchec : une ligne `echec` dans collectif_evenements, sur l'edition ; la meme dans la minute est comptee, une autre etape passe",
      un && deux && autre && inserts.length === 2 && inserts.every((i) => i.table === "collectif_evenements" && i.ligne.type === "echec" && i.ligne.edition_id === ed)
        && (inserts[0].ligne.payload as Record<string, unknown>).n === 2 && (inserts[1].ligne.payload as Record<string, unknown>).etape === "ecriture");
    const panne = { from: () => { throw new Error("base tombee"); } } as unknown as Parameters<typeof J.noterEchec>[0];
    const avantErr = console.error;
    console.error = () => {};
    const tombe = await J.noterEchec(panne, randomUUID(), "declaration", { etape: "ecriture" });
    console.error = avantErr;
    ok("une base tombee : false, jamais une exception (le geste qui l'a constate a deja sa reponse)", tombe === false);

    const presign = lire("src/app/api/collectif/depot/presign/route.ts");
    const completeR = lire("src/app/api/collectif/depot/complete/route.ts");
    const chaque500 = (code: string, quoi: string) => {
      const morceaux = code.split("{ status: 500 }");
      return morceaux.length > 1 && morceaux.slice(0, -1).every((m) => m.slice(-420).includes(`noterEchec(supabase, edition.id, "${quoi}"`));
    };
    ok("depot/presign : chaque refus 500 (lecture, ecriture, et depuis le 20/10 la personne illisible) s'ecrit aussi au journal", chaque500(presign, "declaration") && (presign.match(/\{ status: 500 \}/g) ?? []).length === 5);
    ok("depot/complete : la lecture ratee, le coffre muet et l'ecriture refusee s'ecrivent au journal ; la reponse ne change pas",
      chaque500(completeR, "confirmation") && /noterEchec\(supabase, edition\.id, "confirmation", \{ etape: "coffre", n: pannesCoffre \}\)/.test(completeR)
        && /noterEchec\(supabase, edition\.id, "confirmation", \{ etape: "ecriture", n: ecrituresRatees \}\)/.test(completeR) && /return NextResponse\.json\(\{ confirmees, rejetees, absentes \}\);/.test(completeR));
    ok("aucun echec ne nomme le token ni le message brut d'une erreur",
      ![presign, completeR, lire("src/lib/collectif/rattrapageServeur.ts")].some((f) => /noterEchec\([^)]*(token|\.message)/.test(f)));
  }

  titre("— T-160 : le bloc « Editions » de la page Sante —");
  {
    const s = (extra: Partial<Parameters<typeof E.constatEdition>[0]>) => E.constatEdition({ id: "e1", organisation: "Audencia", evenement: "Course croisiere", echecs: [], enAttente: 0, sansVignette: 0, dernierRattrapage: null, ...extra }, (x) => x.slice(0, 16));
    ok("rien a dire : rien", s({}) === null);
    const rouge = s({ echecs: Array.from({ length: 8 }, (_, i) => ({ payload: { quoi: "declaration", etape: "lecture" }, created_at: iso(T0 - i * MIN) })) });
    ok("un echec : rouge ; les cinq plus recents d'abord, le reste compte", rouge?.gravite === "rouge" && rouge.lignes.length === E.ECHECS_MONTRES + 1 && rouge.lignes[0].startsWith(iso(T0).slice(0, 16)) && /Et 3 échec/.test(rouge.lignes[5]));
    const orange = s({ enAttente: 4, sansVignette: 2, dernierRattrapage: { payload: { n: 1, absentes: 4 }, created_at: iso(T0) } });
    ok("des photos en attente ou sans vignette : orange, avec le dernier rattrapage et ce qu'il a trouve",
      orange?.gravite === "orange" && orange.lignes.length === 2 && /4 photo\(s\) déclarée\(s\)/.test(orange.lignes[0]) && /1 retrouvée\(s\), 4 absente\(s\)/.test(orange.lignes[0]) && /2 photo\(s\) sans vignette/.test(orange.lignes[1]));
    ok("un compte impossible se DIT, il ne passe jamais pour zero", (s({ enAttente: null, sansVignette: null })?.lignes ?? []).every((l) => /n'a pas pu se faire/.test(l)));
    ok("une heure d'attente : l'URL signee a expire", E.ATTENTE_SIGNALEE_MS === 60 * MIN && E.FENETRE_ECHECS_MS === 7 * 24 * 60 * MIN);
    const page = lire("src/app/admin/atelier/sante/page.tsx");
    const charge = lire("src/app/admin/atelier/sante/editions.ts");
    ok("la page lit les editions EN MEME TEMPS que les dossiers ; ferme (COLLECTIF_OUVERT), le bloc n'existe pas ; aucun token lu",
      /Promise\.all\(\[\s*chargerSante\(\),\s*chargerSanteEditions\(\)/.test(page) && /<BlocEditions sante=\{editions\} \/>/.test(page)
        && /if \(!collectifOuvert\(\)\) return \{ ouvert: false \};/.test(charge) && !/token/.test(charge));
  }

  titre("— T-194 : le passage entier, contre une fausse base et un faux coffre —");
  {
    type Ev = { id: string; edition_id: string; type: string; payload: Record<string, unknown>; created_at: string; qui: string | null };
    type Ph = { id: string; edition_id: string; r2_key: string; created_at: string; confirmee_le: string | null; mime: string | null; taille: number | null; vignette_key: string | null };
    type Filtre = [string, ...unknown[]];
    const monde = (photos: Ph[], journal: Ev[] = [], options: { journalIllisible?: boolean; apresDemarrage?: (j: Ev[]) => void } = {}) => {
      const inserts: Ev[] = [];
      const client = {
        from(table: string) {
          const f: Filtre[] = [];
          let op = "select";
          let valeurs: Record<string, unknown> = {};
          const b: Record<string, unknown> = {};
          for (const nom of ["eq", "is", "lte", "lt", "gte", "not", "in", "order", "limit", "range", "returns"]) b[nom] = (...a: unknown[]) => (f.push([nom, ...a]), b);
          b.select = () => b;
          b.insert = (v: Record<string, unknown>) => ((op = "insert"), (valeurs = v), b);
          b.update = (v: Record<string, unknown>) => ((op = "update"), (valeurs = v), b);
          b.then = (ok2: (r: unknown) => unknown, ko2: (e: unknown) => unknown) => {
            const val = (nom: string, col: string) => f.find((x) => x[0] === nom && x[1] === col);
            let r: { data: unknown; error: { code: string; message: string } | null } = { data: null, error: null };
            if (table === "collectif_evenements" && op === "insert") {
              const e: Ev = { id: randomUUID(), edition_id: String(valeurs.edition_id), type: String(valeurs.type), payload: valeurs.payload as Record<string, unknown>, qui: null, created_at: new Date().toISOString() };
              journal.push(e);
              inserts.push(e);
              if (e.type === R.EVT_RATTRAPAGE_DEMARRE) options.apresDemarrage?.(journal);
            } else if (table === "collectif_evenements") {
              if (options.journalIllisible) r = { data: null, error: { code: "57014", message: "timeout" } };
              else {
                const types = (val("in", "type")?.[2] as string[]) ?? [];
                const lim = Number(val("limit", undefined as never)?.[1] ?? f.find((x) => x[0] === "limit")?.[1] ?? 1000);
                r = { data: journal.filter((e) => types.includes(e.type)).sort((x, y) => (x.created_at < y.created_at ? 1 : -1)).slice(0, lim), error: null };
              }
            } else if (table === "collectif_photos") {
              if (val("is", "confirmee_le")) {
                const seuil = String(val("lte", "created_at")?.[2]);
                const range = f.find((x) => x[0] === "range") as [string, number, number] | undefined;
                const lignes = photos.filter((p) => !p.confirmee_le && p.created_at <= seuil).sort((x, y) => (x.created_at === y.created_at ? (x.id < y.id ? 1 : -1) : x.created_at < y.created_at ? 1 : -1));
                r = { data: range ? lignes.slice(range[1], range[2] + 1) : lignes, error: null };
              } else r = { data: photos.filter((p) => p.confirmee_le && !p.vignette_key), error: null };
            }
            return Promise.resolve(r).then(ok2, ko2);
          };
          return b;
        },
      } as unknown as Parameters<typeof S.rattraperEdition>[0];
      return { client, inserts, journal };
    };
    const ED = randomUUID();
    const photo = (minutes: number, extra: Partial<Ph> = {}): Ph => {
      const id = randomUUID();
      return { id, edition_id: ED, r2_key: `collectif/${ED}/photos/${id}/original.jpg`, created_at: new Date(Date.now() - minutes * MIN).toISOString(), confirmee_le: null, mime: "image/jpeg", taille: null, vignette_key: null, ...extra };
    };
    const coffre = (presentes: Map<string, number | "panne">, opts: { liste?: Set<string> | null; ecritureRefusee?: boolean } = {}) => {
      const appels = { tetes: [] as string[], confirmees: [] as string[], listes: 0, enrichies: [] as string[], vignettes: [] as string[] };
      const outils: Parameters<typeof S.rattraperEdition>[3] = {
        tete: async (k) => (appels.tetes.push(k), presentes.has(k) ? (presentes.get(k) === "panne" ? { statut: "panne" } : { statut: "presente", taille: presentes.get(k) as number }) : { statut: "absente" }),
        liste: async () => (appels.listes++, opts.liste === undefined ? new Set(presentes.keys()) : opts.liste),
        confirmer: async (_s, _e, l) => (opts.ecritureRefusee ? { statut: "erreur", code: "23514" } : (appels.confirmees.push(l.id), { statut: "nouvelle", vignette: false })),
        vignettes: async (_s, _e, prio) => (appels.vignettes.push(...prio.map((p) => p.id)), { faites: prio.length, ratees: 0, impossibles: [], reportees: 0 }),
        enrichir: async (_s, _e, ids) => (appels.enrichies.push(...(ids ?? [])), { traitees: 0, datees: 0, geolocalisees: 0, ratees: 0, lieux: 0 }),
      };
      return { outils, appels };
    };
    const silence = async <T,>(f: () => Promise<T>) => {
      const a = console.error;
      const b = console.log;
      console.error = () => {};
      console.log = () => {};
      try {
        return await f();
      } finally {
        console.error = a;
        console.log = b;
      }
    };

    /* 1. Rien a faire : aucune ecriture. */
    {
      const m = monde([photo(5), photo(60, { confirmee_le: iso(Date.now()), vignette_key: "v" })]);
      const c = coffre(new Map());
      const r = await S.rattraperEdition(m.client, ED, { declencheur: "fiche" }, c.outils);
      ok("rien a faire (une ligne de cinq minutes, une photo complete) : rien d'ecrit, rien demande au coffre", r.statut === "rien" && m.inserts.length === 0 && c.appels.tetes.length === 0);
    }
    /* 2. Le cas d'Audencia : trois photos, deux au coffre. */
    const a = photo(30), b = photo(20), absente = photo(15), jeune = photo(3);
    const m2 = monde([a, b, absente, jeune]);
    const c2 = coffre(new Map([[a.r2_key, 1000], [b.r2_key, 2000]]));
    const r2 = await silence(() => S.rattraperEdition(m2.client, ED, { declencheur: "fiche" }, c2.outils));
    ok("deux photos au coffre sur trois lignes declarees depuis plus de dix minutes : deux confirmees, une absente, la ligne de trois minutes jamais regardee",
      r2.statut === "fait" && r2.bilan.retrouvees === 2 && r2.bilan.absentes === 1 && c2.appels.confirmees.sort().join() === [a.id, b.id].sort().join() && !c2.appels.tetes.includes(jeune.r2_key));
    const types2 = m2.inserts.map((e) => e.type);
    ok("le journal : un demarrage, puis `photos_rattrapees` qui nomme son passage, avec le nombre",
      types2.join() === `${R.EVT_RATTRAPAGE_DEMARRE},${R.EVT_PHOTOS_RATTRAPEES}` && m2.inserts[1].payload.demarre === m2.inserts[0].payload.passage && m2.inserts[1].payload.n === 2 && m2.inserts[1].payload.par === "fiche");
    ok("les retrouvees sans vignette ont la leur, puis leurs metadonnees se lisent (comme apres depot/complete)",
      c2.appels.vignettes.sort().join() === [a.id, b.id].sort().join() && c2.appels.enrichies.sort().join() === [a.id, b.id].sort().join());
    ok("aucune ligne du journal ne porte une cle du coffre ni un token", !m2.inserts.some((e) => /collectif\/|[A-Za-z0-9]{32}/.test(JSON.stringify(e.payload))));
    /* 3. Rouvert aussitot : au repos. */
    const r3 = await S.rattraperEdition(m2.client, ED, { declencheur: "photos" }, c2.outils);
    ok("la fiche rouverte aussitot : au repos, rien d'ecrit (la ligne absente reste candidate)", r3.statut === "repos" && m2.inserts.length === 2);
    /* 4. Un passage tourne deja. */
    {
      const m = monde([photo(30)], [{ id: "x", edition_id: ED, type: R.EVT_RATTRAPAGE_DEMARRE, payload: { passage: "autre" }, created_at: new Date(Date.now() - 10 * 1000).toISOString(), qui: null }]);
      const c = coffre(new Map());
      const r = await S.rattraperEdition(m.client, ED, { declencheur: "releve" }, c.outils);
      ok("un passage tourne depuis 10 s : on n'y touche pas", r.statut === "en_cours" && m.inserts.length === 0 && c.appels.tetes.length === 0);
    }
    /* 5. Deux passages se croisent : le plus recent cede. */
    {
      const p = photo(30);
      const m = monde([p], [], {
        apresDemarrage: (j) => {
          if (!j.some((e) => e.payload.passage === "plus-ancien")) j.push({ id: "y", edition_id: ED, type: R.EVT_RATTRAPAGE_DEMARRE, payload: { passage: "plus-ancien" }, created_at: new Date(Date.now() - 2000).toISOString(), qui: null });
        },
      });
      const c = coffre(new Map([[p.r2_key, 10]]));
      const r = await S.rattraperEdition(m.client, ED, { declencheur: "fiche" }, c.outils);
      const finale = m.inserts.at(-1);
      ok("deux demarrages croises : le plus recent cede (une fin `cede`), sans toucher au coffre", r.statut === "cede" && c.appels.tetes.length === 0 && finale?.type === R.EVT_RATTRAPAGE_FINI && finale.payload.cede === true);
    }
    /* 6. Trop lourde, panne du coffre, ecriture refusee. */
    {
      const lourde = photo(30), muette = photo(25), ok3 = photo(20);
      const m = monde([lourde, muette, ok3]);
      const c = coffre(new Map<string, number | "panne">([[lourde.r2_key, MAX_FILE_BYTES + 1], [muette.r2_key, "panne"], [ok3.r2_key, 5]]), { ecritureRefusee: true });
      const r = await silence(() => S.rattraperEdition(m.client, ED, { declencheur: "fiche" }, c.outils));
      const echecs = m.inserts.filter((e) => e.type === "echec").map((e) => `${e.payload.quoi}/${e.payload.etape}/${e.payload.n}`);
      ok("trop lourde : laissee telle quelle (comptee, jamais effacee) ; coffre muet et ecriture refusee : des echecs au journal",
        r.statut === "fait" && r.bilan.tropLourdes === 1 && r.bilan.pannes.coffre === 1 && r.bilan.pannes.ecriture === 1 && r.bilan.retrouvees === 0
          && echecs.includes("rattrapage/coffre/1") && echecs.includes("rattrapage/ecriture/1") && m.inserts.some((e) => e.type === R.EVT_RATTRAPAGE_FINI));
    }
    /* 7. Beaucoup de lignes mortes : la liste du coffre d'abord. */
    {
      const lignes = Array.from({ length: 60 }, (_, i) => photo(30 + i));
      const presentes = new Map(lignes.slice(0, 5).map((l) => [l.r2_key, 100] as [string, number]));
      const m = monde(lignes);
      const c = coffre(presentes);
      const r = await silence(() => S.rattraperEdition(m.client, ED, { declencheur: "releve" }, c.outils));
      ok("60 lignes declarees (un wifi filtre) : UNE liste du dossier, une tete pour les 5 presentes seulement, 55 absentes",
        r.statut === "fait" && c.appels.listes === 1 && c.appels.tetes.length === 5 && r.bilan.retrouvees === 5 && r.bilan.absentes === 55);
      /* Une autre edition : le frein des echecs (une ligne par minute et par etape) a deja vu ED. */
      const m8 = monde(Array.from({ length: 60 }, (_, i) => photo(30 + i)));
      const c8 = coffre(new Map(), { liste: null });
      const r8 = await silence(() => S.rattraperEdition(m8.client, randomUUID(), { declencheur: "releve" }, c8.outils));
      ok("la liste ne repond pas : on ne conclut RIEN (aucune absente comptee, aucune tete), un echec au journal",
        r8.bilan.absentes === 0 && c8.appels.tetes.length === 0 && r8.bilan.pannes.coffre === 1 && m8.inserts.some((e) => e.type === "echec" && e.payload.etape === "coffre"));
    }
    /* 8. Le journal illisible : pas de passage « au cas ou ». */
    {
      const m = monde([photo(30)], [], { journalIllisible: true });
      const c = coffre(new Map());
      const r = await silence(() => S.rattraperEdition(m.client, ED, { declencheur: "fiche" }, c.outils));
      ok("journal illisible : pas de verrou, donc pas de passage ; un echec de lecture est note",
        r.statut === "erreur" && c.appels.tetes.length === 0 && !m.inserts.some((e) => e.type === R.EVT_RATTRAPAGE_DEMARRE) && m.inserts.some((e) => e.type === "echec" && e.payload.etape === "lecture"));
    }
    /* 9. L'echeance passee : rien de nouveau ne commence, et la fin le dit. */
    {
      const p = photo(30);
      const m = monde([p]);
      const c = coffre(new Map([[p.r2_key, 10]]));
      const r = await silence(() => S.rattraperEdition(m.client, ED, { declencheur: "releve", jusqua: Date.now() - 1 }, c.outils));
      ok("l'echeance passee : aucune tete, la ligne est reportee au passage suivant, le verrou est rendu", r.bilan.reportees === 1 && c.appels.tetes.length === 0 && m.inserts.at(-1)?.payload.reportees === 1);
    }
    const serveur = lire("src/lib/collectif/rattrapageServeur.ts");
    ok("le rattrapage confirme par LA fonction de depot/complete (`confirmerArrivee`), jamais une copie",
      /confirmer: confirmerArrivee/.test(serveur) && /import \{ clesDuCoffre, confirmerArrivee, teteObjet \} from "\.\/rattrapageCoffre";/.test(serveur) && !/\.update\(/.test(serveur));
  }
}

/* T-172 : la fabrique des tailles, jouée sur des images fabriquées (sharp, sans réseau ni coffre). */
async function sondeT172() {
  titre("— T-172 : les tailles fabriquees pour de vrai (sharp, en memoire) —");
  const motif = (l: number, h: number) => {
    const px = Buffer.alloc(l * h * 3);
    for (let y = 0; y < h; y++) for (let x = 0; x < l; x++) {
      const i = (y * l + x) * 3;
      px[i] = (x * 7 + y * 3) % 256;
      px[i + 1] = (x * y) % 251;
      px[i + 2] = ((x >> 3) ^ (y >> 3)) * 9 % 256;
    }
    return sharp(px, { raw: { width: l, height: h, channels: 3 } });
  };
  const key = "collectif/styles/riviera/double-dense-ab12cd34.webp";
  const grande = new Uint8Array(await motif(1800, 1200).webp({ quality: 86 }).toBuffer());
  const p1 = await produireTailles(key, grande);
  const dims = p1.ok ? await Promise.all(p1.tailles.map(async (t) => { const m = await sharp(Buffer.from(t.octets)).metadata(); return `${t.largeur}:${m.format}:${m.width}x${m.height}`; })) : [];
  ok(`une maitresse de 1 800 px : 600 et 1 200 px de large, en WebP, aux bonnes proportions (${dims.join(", ")})`,
     p1.ok && p1.largeur === 1800 && JSON.stringify(dims) === JSON.stringify(["600:webp:600x400", "1200:webp:1200x800"])
     && p1.tailles.every((t) => t.key === cleTailleImage(key, t.largeur) && t.octets.byteLength < grande.byteLength));
  ok("ce que la route garderait, la saisie le relit tel quel",
     p1.ok && JSON.stringify(lireTailles("riviera", key, listeDesTailles(key, p1.largeur, p1.tailles))) === JSON.stringify(listeDesTailles(key, p1.largeur, p1.tailles)));
  const debout = await produireTailles(key, new Uint8Array(await motif(1000, 1400).webp({ quality: 86 }).toBuffer()));
  ok("une couverture debout de 1 000 px de large : seulement 600 (on n'agrandit jamais)", debout.ok && debout.largeur === 1000 && JSON.stringify(debout.tailles.map((t) => t.largeur)) === "[600]");
  const petite = await produireTailles(key, new Uint8Array(await motif(500, 700).webp().toBuffer()));
  ok("une image de 500 px : aucune taille, la maitresse reste seule", petite.ok && petite.tailles.length === 0 && (await ecrireTailles(key, petite as Extract<typeof petite, { ok: true }>)).ok);
  /* Une photo couchée par l'EXIF (orientation 6) : 1 600 × 1 200 stockée, 1 200 de large à l'écran. */
  const couchee = new Uint8Array(await motif(1600, 1200).jpeg().withMetadata({ orientation: 6 }).toBuffer());
  const pc = await produireTailles(key, couchee);
  const pcDims = pc.ok && pc.tailles[0] ? await sharp(Buffer.from(pc.tailles[0].octets)).metadata() : null;
  ok("une image tournee par l'EXIF se mesure et se reduit A L'ENDROIT (1 200 px de large affiches → 600 x 800)",
     pc.ok && pc.largeur === 1200 && pc.tailles.length === 1 && pcDims?.width === 600 && pcDims?.height === 800);
  const casse = await produireTailles(key, new Uint8Array([1, 2, 3, 4, 5]));
  ok("des octets illisibles : un refus dit, jamais une exception (l'envoi de la maitresse ne tombe pas)", !casse.ok && typeof casse.raison === "string");
}

/* ═══════════ T-169, T-170, T-168 : la relève qui se repose, les doublons rangés, la grille comptée en base ═══════════ */
async function sondeLotA4() {
  const M = await import("@/lib/collectif/messages");
  const Db = await import("@/lib/collectif/doublons");
  const Ds = await import("@/lib/collectif/doublonsStockes");
  const R = await import("@/lib/collectif/resumePhotos");
  const G = await import("@/lib/collectif/grillePhotos");
  const Dos = await import("@/lib/collectif/dossiers");
  const { groupesDeDoublons: reference } = await import("@/lib/atelier/empreinte");
  const { randomUUID } = await import("node:crypto");
  const { performance } = await import("node:perf_hooks");

  /* Un hasard REPRODUCTIBLE (mulberry32) : un échec se rejoue à l'identique. */
  let graineA4 = 0x5eed1234;
  const hasard = () => {
    graineA4 = (graineA4 + 0x6d2b79f5) | 0;
    let t = Math.imul(graineA4 ^ (graineA4 >>> 15), 1 | graineA4);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return (t ^ (t >>> 14)) >>> 0;
  };
  const parmiA4 = <T>(l: readonly T[]): T => l[hasard() % l.length];
  const hex16 = () => Array.from({ length: 16 }, () => (hasard() % 16).toString(16)).join("");
  const voisinA4 = (h: string, nb: number) => {
    const b = [...h].map((c) => parseInt(c, 16).toString(2).padStart(4, "0")).join("").split("");
    const vus = new Set<number>();
    while (vus.size < nb) vus.add(hasard() % 64);
    for (const i of vus) b[i] = b[i] === "0" ? "1" : "0";
    return Array.from({ length: 16 }, (_, i) => parseInt(b.slice(i * 4, i * 4 + 4).join(""), 2).toString(16)).join("");
  };
  const ecouteA4 = async <T>(f: () => Promise<T> | T): Promise<T> => {
    const [e, w] = [console.error, console.warn];
    console.error = () => {};
    console.warn = () => {};
    try {
      return await f();
    } finally {
      console.error = e;
      console.warn = w;
    }
  };

  /* ─────────────────────────── T-169 ─────────────────────────── */
  titre("— T-169 : la messagerie ralentit quand rien ne bouge, repart vite au moindre mouvement —");
  const I = M.intervalleMessages;
  ok("les paliers : 3,5 s la premiere minute, 10 s jusqu'a 3 min, 30 s jusqu'a 10 min, puis 60 s",
    I(0) === 3500 && I(59_999) === 3500 && I(60_000) === 10_000 && I(179_999) === 10_000 && I(180_000) === 30_000 && I(599_999) === 30_000 && I(600_000) === 60_000 && I(86_400_000) === 60_000);
  ok("jamais plus lent qu'une minute, jamais plus rapide que 3,5 s ; une duree illisible ou negative = le palier rapide",
    Array.from({ length: 2000 }, (_, k) => I(k * 1000)).every((v, k, t) => v >= 3500 && v <= 60_000 && (k === 0 || v >= t[k - 1])) && I(-5000) === 3500 && I(Number.NaN) === 3500 && I(Number.POSITIVE_INFINITY) === 3500);
  ok("le premier palier EST l'intervalle d'avant (PRD §7, entre 3 et 4 s)", M.INTERVALLE_MESSAGES_MS === 3500 && M.PALIERS_MESSAGES[0].intervalleMs === M.INTERVALLE_MESSAGES_MS);
  /* Le modele de la minuterie du hook : apres chaque releve, attendre `intervalleMessages(maintenant - mouvement)` ;
     un mouvement avance la releve prevue si elle part plus tard que le palier rapide. */
  const simuler = (dureeMs: number, mouvements: readonly number[]) => {
    let t = 0;
    let mouvement = 0;
    let releves = 0;
    const file = [...mouvements].sort((a, b) => a - b);
    let prochaine = I(0);
    while (true) {
      const m = file[0];
      if (m !== undefined && m < prochaine) {
        file.shift();
        mouvement = m;
        if (prochaine - m > M.INTERVALLE_MESSAGES_MS) prochaine = m + I(0);
        continue;
      }
      t = prochaine;
      if (t > dureeMs) break;
      releves++;
      prochaine = t + I(t - mouvement);
    }
    return releves;
  };
  const avantParHeure = Math.floor(3_600_000 / 3500);
  const calme = simuler(3_600_000, []);
  console.log(`      mesure : un onglet ouvert une heure sans rien faire interroge ${calme} fois (avant : ${avantParHeure}) ; huit heures : ${simuler(8 * 3_600_000, [])} (avant : ${Math.floor((8 * 3_600_000) / 3500)})`);
  ok("une heure ouverte sans rien faire : 93 releves au lieu de 1 028 (dix fois moins)", calme === 93 && avantParHeure === 1028);
  const frappe = simuler(3_600_000, Array.from({ length: 20 }, (_, k) => 30 * 60_000 + k * 15_000));
  ok("une frappe a la 30e minute ramene aussitot au palier rapide (plus de releves que l'heure calme, toujours bien moins qu'avant)", frappe > calme && frappe < avantParHeure / 4);
  {
    /* Le mouvement a la 30e minute : la releve suivante part au plus 3,5 s apres lui. */
    let t = 0, mouvement = 0, prochaine = I(0);
    const instants: number[] = [];
    let fait = false;
    while (prochaine <= 3_600_000) {
      if (!fait && 30 * 60_000 < prochaine) {
        fait = true;
        mouvement = 30 * 60_000;
        if (prochaine - mouvement > 3500) prochaine = mouvement + I(0);
        continue;
      }
      t = prochaine;
      instants.push(t);
      prochaine = t + I(t - mouvement);
    }
    const apres = instants.find((x) => x > 30 * 60_000);
    ok("au mouvement, la releve suivante part en 3,5 s au plus (elle etait prevue jusqu'a 60 s plus tard)", apres !== undefined && apres - 30 * 60_000 <= 3500);
  }
  const hook = lire("src/app/edition/_composants/useMessagerie.ts");
  const hookCode = hook.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
  ok("le hook : une minuterie `setTimeout` reglee par intervalleMessages, plus de `setInterval`",
    /setTimeout\(\(\) => \{\s*minuteur = null;\s*void relire\(\);\s*\}, attente\)/.test(hookCode) && /const attente = intervalleMessages\(Date\.now\(\) - mouvement\.current\)/.test(hookCode) && !/setInterval/.test(hookCode));
  ok("le hook : jamais d'interrogation onglet cache (desarme a la sortie, relit et repart vite au retour)",
    /if \(!monte \|\| !visible\(\)\) return;/.test(hookCode) && /const auRetour = \(\) => \{\s*desarmer\(\);\s*if \(!visible\(\)\) return;\s*mouvement\.current = Date\.now\(\);\s*void relire\(\);/.test(hookCode) && /addEventListener\("visibilitychange", auRetour\)/.test(hookCode));
  ok("le hook : la frappe (input, ou qu'elle soit dans la page), un message recu ou envoye sont des mouvements",
    /addEventListener\("input", bouger, true\)/.test(hookCode) && /removeEventListener\("input", bouger, true\)/.test(hookCode)
      && /const ajouter = useCallback\(\(nouveaux: Message\[\]\) => \{\s*if \(!nouveaux\.length\) return;[\s\S]*?reveiller\.current\(\);/.test(hookCode));
  ok("le hook : un mouvement AVANCE la releve, ne la recule jamais ; une seule releve a la fois, une releve ratee n'arrete pas la suivante",
    /if \(!minuteur \|\| prevueA - Date\.now\(\) > INTERVALLE_MESSAGES_MS\) armer\(\);/.test(hookCode) && /if \(!monte \|\| !visible\(\) \|\| enCours\) return;/.test(hookCode) && /\} catch \{\s*\} finally \{\s*enCours = false;\s*\}\s*armer\(\);/.test(hookCode));
  ok("la veille de l'atelier reste a la minute (deja au palier le plus lent, elle ne lit qu'un nombre)",
    /PERIODE_MS = 60_000/.test(lire("src/app/admin/collectif/compteMessages.ts")) && /cette veille-ci reste à la minute/.test(lire("src/app/admin/collectif/VeilleMessages.tsx")));

  /* ─────────────────────────── T-170 ─────────────────────────── */
  titre("— T-170 : les doublons regroupes par empreinte exacte d'abord, bornes, et RANGES —");
  type PE = { id: string; empreinte: string | null; priseLe: string | null; ordre: number };
  let ecarts = 0;
  for (let lot = 0; lot < 60; lot++) {
    const n = 20 + (hasard() % 280);
    const graines = Array.from({ length: 1 + (hasard() % 10) }, hex16);
    const photosA4: PE[] = [];
    for (let i = 0; i < n; i++) {
      const r = hasard() % 10;
      const e = r === 0 ? null : r < 4 ? parmiA4(graines) : r < 7 ? voisinA4(parmiA4(graines), hasard() % 4) : hex16();
      photosA4.push({ id: `a4-${lot}-${i}`, empreinte: e, priseLe: hasard() % 4 === 0 ? null : `2026-10-0${1 + (hasard() % 9)}T1${hasard() % 10}:00:00`, ordre: hasard() % 50 });
    }
    if (JSON.stringify(Db.groupesDoublonsRapides(photosA4)) !== JSON.stringify(reference(photosA4))) ecarts++;
  }
  ok("60 lots de 20 a 300 photos (copies exactes en nombre, voisines a 0-3 bits, groupes dissous) : les MEMES groupes que le B2C", ecarts === 0);
  {
    /* Neuf copies exactes (dissous) et deux photos qui s'y rattachent par une voisine : tout est dissous, rien n'est marque. */
    const e = hex16();
    const x = voisinA4(e, 2);
    const chaine: PE[] = [...Array.from({ length: 9 }, (_, i) => ({ id: `c${i}`, empreinte: e, priseLe: null, ordre: i })), { id: "x", empreinte: x, priseLe: null, ordre: 9 }, { id: "y", empreinte: x, priseLe: null, ordre: 10 }];
    const huit: PE[] = Array.from({ length: 8 }, (_, i) => ({ id: `h${i}`, empreinte: e, priseLe: null, ordre: i }));
    ok("un petit groupe rattache a un groupe dissous est dissous avec lui ; huit copies exactes restent un groupe",
      Db.groupesDoublonsRapides(chaine).length === 0 && JSON.stringify(Db.groupesDoublonsRapides(chaine)) === JSON.stringify(reference(chaine))
        && Db.groupesDoublonsRapides(huit).length === 1 && Db.groupesDoublonsRapides(huit)[0].doublons.length === 7);
  }
  const lotMesure = (n: number, identiques: number): PE[] => {
    const meme = hex16();
    return Array.from({ length: n }, (_, i) => ({ id: `m${i}`, empreinte: i < identiques ? meme : hex16(), priseLe: null, ordre: i }));
  };
  const chrono = (p: readonly PE[]) => {
    const t0 = performance.now();
    const r = Db.calculerDoublons(p);
    return { ms: performance.now() - t0, r };
  };
  const m1 = chrono(lotMesure(2000, 0));
  const m2 = chrono(lotMesure(2000, 400));
  const m3 = chrono(lotMesure(2000, 1000));
  console.log(`      mesure (le vrai module) : 2 000 variees ${m1.ms.toFixed(1)} ms ; 400 identiques ${m2.ms.toFixed(1)} ms ; 1 000 identiques ${m3.ms.toFixed(1)} ms (avant, meme machine le 20/10 : 6,9 / 1 785 / 24 146 ms ; audit du 19/10 : 4,6 / 1 072 / 16 229 ms)`);
  ok("les trois cas de l'audit passent sous 500 ms (avant : jusqu'a 24 s)", m1.ms < 500 && m2.ms < 500 && m3.ms < 500 && m1.r.complet && m2.r.complet && m3.r.complet);
  ok("mille copies exactes ne coutent aucune comparaison (un seul noeud), et forment un groupe dissous", m3.r.comparaisons === 0 && m3.r.groupes.length === 0);
  {
    const tete = hex16().slice(0, 6);
    const pire: PE[] = Array.from({ length: 6400 }, (_, i) => ({ id: `q${i}`, empreinte: tete + hex16().slice(6), priseLe: null, ordre: i }));
    const t0 = performance.now();
    const r = Db.calculerDoublons(pire);
    console.log(`      mesure : 6 400 empreintes distinctes dans le meme tiroir, ${(performance.now() - t0).toFixed(0)} ms, ${r.comparaisons} comparaisons, complet=${String(r.complet)}`);
    ok("la borne : au-dela de COMPARAISONS_MAX, AUCUN groupe et `complet: false` (pas de remarque plutot qu'une fausse)",
      !r.complet && r.groupes.length === 0 && r.comparaisons === Db.COMPARAISONS_MAX && !Db.calculerDoublons(pire.slice(0, 50), 3).complet && Db.calculerDoublons(pire.slice(0, 50), 3).groupes.length === 0
        && Db.calculerDoublons(pire.slice(0, 50)).complet);
  }
  ok("la forme rangee : relue a l'identique, refusee si elle est abimee (on recalcule)",
    JSON.stringify(Db.lireGroupesStockes([{ originale: "a", doublons: ["b", "c"] }])) === '[{"originale":"a","doublons":["b","c"]}]'
      && [null, {}, [{ originale: "a" }], [{ originale: "a", doublons: [] }], [{ originale: 3, doublons: ["b"] }], [{ originale: "a", doublons: ["b", 4] }]].every((v) => Db.lireGroupesStockes(v) === null)
      && JSON.stringify(Db.lireGroupesStockes([])) === "[]");
  ok("la signature : le nombre de photos avec empreinte ET la derniere lecture ; une photo de plus ou une relecture la change",
    Db.signatureDoublons(12, "2026-10-20T10:00:00.123456+00:00") === "12|2026-10-20T10:00:00.123456+00:00" && Db.signatureDoublons(13, "2026-10-20T10:00:00.123456+00:00") !== Db.signatureDoublons(12, "2026-10-20T10:00:00.123456+00:00")
      && Db.signatureDoublons(12, "2026-10-20T10:00:01+00:00") !== Db.signatureDoublons(12, "2026-10-20T10:00:00.123456+00:00") && Db.signatureDoublons(null, null) === "?|");
  {
    const ix = Db.indexDoublons([{ originale: "o1", doublons: ["d1", "d2"] }, { originale: "o2", doublons: ["d3"] }]);
    ok("l'index : la copie mene a son originale, les membres comptent les originales, les copies non", ix.copies === 3 && ix.doublonDe.get("d2") === "o1" && !ix.doublonDe.has("o1") && ix.membres.size === 5);
  }

  /* La fausse base des doublons rangés : asynchrone (un vrai aller-retour), et elle compte ce qu'elle rend. */
  type LD = { id: string; empreinte: string | null; prise_le: string | null; ordre: number | null };
  const baseDoublons = (etat: { range: { groupes: unknown; signature: string; complet: boolean } | null | "absente"; photos: LD[]; metaMax: string | null }) => {
    const compte = { lignes: 0, upserts: [] as Record<string, unknown>[], signatures: 0 };
    const fabrique = (table: string) => {
      const ch: { select?: string; de?: number; a?: number } = {};
      const b: Record<string, unknown> = {};
      for (const m of ["eq", "not", "order", "limit", "returns", "is", "gt", "in", "filter", "or", "maybeSingle"]) b[m] = () => b;
      b.select = (s: string) => {
        ch.select = s;
        return b;
      };
      b.range = (de: number, a: number) => {
        ch.de = de;
        ch.a = a;
        return b;
      };
      b.upsert = async (ligne: Record<string, unknown>) => {
        await new Promise((r) => setTimeout(r, 2));
        compte.upserts.push(ligne);
        return { error: etat.range === "absente" ? { code: "PGRST205", message: "absente" } : null };
      };
      const repondre = async () => {
        await new Promise((r) => setTimeout(r, 2));
        if (table === "collectif_doublons") return etat.range === "absente" ? { data: null, error: { code: "PGRST205", message: "absente" } } : { data: etat.range, error: null };
        if (ch.select === "metadonnees_le") {
          compte.signatures++;
          return { data: [{ metadonnees_le: etat.metaMax }], count: etat.photos.filter((p) => p.empreinte).length, error: null };
        }
        const tranche = etat.photos.slice(ch.de ?? 0, Math.min((ch.a ?? 0) + 1, (ch.de ?? 0) + 1000));
        compte.lignes += tranche.length;
        return { data: tranche, error: null };
      };
      b.then = (ok2: (v: unknown) => unknown, ko2: (e: unknown) => unknown) => repondre().then(ok2, ko2);
      return b;
    };
    return { client: { from: fabrique } as unknown as Parameters<typeof Ds.doublonsDeLEdition>[0], compte };
  };
  {
    const photosD: LD[] = Array.from({ length: 2500 }, (_, i) => ({ id: `p${String(i).padStart(5, "0")}`, empreinte: i % 10 === 0 ? null : i % 7 === 1 ? "00ff00ff00ff00ff" : hex16(), prise_le: null, ordre: i % 3 === 0 ? null : i }));
    const meta = "2026-10-20T09:00:00.654321+00:00";
    const sig = Db.signatureDoublons(photosD.filter((p) => p.empreinte).length, meta);
    const attendu = Ds.calculerSurLignes(photosD).groupes;
    ok("le calcul range suit la regle de la grille et de la fiche (le rang de secours `ordre ?? i` dans l'ordre d'arrivee)",
      JSON.stringify(attendu) === JSON.stringify(Db.groupesDoublonsRapides(photosD.map((p, i) => ({ id: p.id, empreinte: p.empreinte, priseLe: p.prise_le, ordre: p.ordre ?? i })))));
    const frais = baseDoublons({ range: { groupes: attendu, signature: sig, complet: true }, photos: photosD, metaMax: meta });
    const r1 = await Ds.doublonsDeLEdition(frais.client, "ed");
    ok("a jour : le resultat range est LU tel quel ; aucune photo relue, rien de reecrit",
      r1?.source === "range" && r1.lues === 0 && frais.compte.lignes === 0 && frais.compte.upserts.length === 0 && JSON.stringify(r1.groupes) === JSON.stringify(attendu));
    const perime = baseDoublons({ range: { groupes: [], signature: "1|ancienne", complet: true }, photos: photosD, metaMax: meta });
    const r2 = await Ds.doublonsDeLEdition(perime.client, "ed");
    const range2 = perime.compte.upserts[0];
    ok("perime (la signature a change) : recalcule sur toutes les photos arrivees, par tranches, puis RANGE avec la signature d'aujourd'hui",
      r2?.source === "calcule" && r2.lues === 2500 && perime.compte.lignes === 2500 && perime.compte.upserts.length === 1 && range2?.signature === sig && range2?.photos === 2500 && range2?.complet === true
        && JSON.stringify(range2?.groupes) === JSON.stringify(attendu) && range2?.edition_id === "ed");
    const fournies = baseDoublons({ range: null, photos: photosD, metaMax: meta });
    const r3 = await Ds.doublonsDeLEdition(fournies.client, "ed", photosD);
    ok("absent, avec les lignes deja lues par l'appelant (la fiche, le repli de la grille) : aucune relecture, et range",
      r3?.source === "calcule" && r3.lues === 0 && fournies.compte.lignes === 0 && fournies.compte.upserts.length === 1);
    const sans = baseDoublons({ range: "absente", photos: photosD, metaMax: meta });
    const r4 = await ecouteA4(() => Ds.doublonsDeLEdition(sans.client, "ed"));
    ok("sans la migration (PGRST205) : calcule a l'affichage comme avant, RIEN n'est range",
      r4?.source === "repli" && sans.compte.upserts.length === 0 && JSON.stringify(r4.groupes) === JSON.stringify(attendu));
    const deux = baseDoublons({ range: null, photos: photosD, metaMax: meta });
    const [a, b] = await Promise.all([Ds.recalculerDoublons(deux.client, "ed"), Ds.recalculerDoublons(deux.client, "ed")]);
    ok("apres un lot : un seul calcul a la fois par edition ; un lot arrive pendant le calcul en demande UN de plus, apres",
      a?.source === "calcule" && b === null && deux.compte.signatures === 2 && deux.compte.upserts.length === 2 && deux.compte.lignes === 5000);
  }
  const enrich = lire("src/lib/collectif/enrichissement.ts");
  ok("le calcul tourne APRES la lecture des empreintes d'un lot (tache de fond), avant les lieux ; le journal dit les copies reperees",
    enrich.indexOf("bilan.traitees ? await recalculerDoublons(supabase, editionId) : null") > enrich.indexOf("empreinte: lu.empreinte") && enrich.indexOf("recalculerDoublons(supabase, editionId)") < enrich.indexOf("planGeocodage(")
      && /"metadonnees_lues", \{ \.\.\.bilan, \.\.\.repere \}/.test(enrich) && /doublons_complet: doublons\.complet/.test(enrich));
  const mig = lire("supabase/migrations/20261022_collectif_resume_photos.sql");
  ok("migration 20261022 : atomique, idempotente ; la vue du resume (security_invoker, fermee a anon/authenticated), la table des doublons (RLS), un index, PostgREST relit",
    /^begin;/m.test(mig) && /^commit;/m.test(mig) && /create or replace view public\.collectif_photos_resume\s+with \(security_invoker = true\)/.test(mig) && /revoke all on public\.collectif_photos_resume from anon, authenticated;/.test(mig)
      && /create table if not exists public\.collectif_doublons/.test(mig) && /alter table public\.collectif_doublons enable row level security;/.test(mig) && /revoke all on public\.collectif_doublons from anon, authenticated;/.test(mig)
      && /create index if not exists collectif_photos_arrivee_idx/.test(mig) && /notify pgrst, 'reload schema'/.test(mig) && !/insert into|update public|delete from/i.test(mig.replace(/--.*$/gm, "")));
  ok("la vue regroupe EXACTEMENT les colonnes que lisent dansLeDossier, l'arbre et le compte des personnes, et rend celles du module",
    /group by p\.edition_id, p\.role_deposant, p\.provenance_id, p\.provenance_type, p\.deposant, p\.appareil_cle;/.test(mig)
      && /case when c\.role_deposant = 'participant' or c\.provenance_id is not null then c\.appareil_id end as appareil_cle\n/.test(mig)
      /* 20/10 : collectif_photos a DEJA une colonne `appareil` ; un `appareil` calcule a cote de `c.*` rendait 42702 a l'application. */
      && !/end as appareil\s*$/m.test(mig) && !/p\.appareil\b(?!_)/.test(mig.replace(/--.*$/gm, ""))
      && /\(count\(\*\) filter \(where p\.preselection\)\)::integer as n_selection/.test(mig) && /\(count\(\*\) filter \(where not p\.signalee and not p\.preselection\)\)::integer as n_choisissables/.test(mig)
      && R.COLONNES_RESUME.split(", ").every((c) => new RegExp(`as ${c}\\b|p\\.${c},`).test(mig) || c === "id"));

  /* ─────────────────────────── T-168 ─────────────────────────── */
  titre("— T-168 : la grille et le tableau de bord ne lisent plus que la page et le resume (edition simulee de 5 000 photos) —");
  type LG = import("@/lib/collectif/grillePhotos").LigneGrille;
  const responsableA4 = "Claire Martin";
  const editionA4 = { responsable_nom: responsableA4, plafond_participant_atelier: 40, plafond_participant_client: 30, plafond_total: 6000 };
  const liensA4 = [
    { id: randomUUID(), cle: "k".repeat(22) + "1", libelle: "Équipe Lyon", sans_plafond: false, plafond_par_personne: 25, retire_le: null },
    { id: randomUUID(), cle: "k".repeat(22) + "2", libelle: "Photographe", sans_plafond: true, plafond_par_personne: null, retire_le: null },
    { id: randomUUID(), cle: "k".repeat(22) + "3", libelle: null, sans_plafond: false, plafond_par_personne: null, retire_le: "2026-10-18T10:00:00+00:00" },
    { id: randomUUID(), cle: "k".repeat(22) + "4", libelle: "Personne encore", sans_plafond: false, plafond_par_personne: 10, retire_le: null },
  ];
  /* Une vraie collecte : chaque participant garde SON nom, SON telephone et SON lien (T-192 : le nom ne change
     plus) ; dix d'entre eux ont un second telephone ou le nom s'ecrit autrement (« Léa » / « léa » : une seule
     personne) ; quinze n'ont pas de nom (un telephone chacun). Des noms avec virgule, point, deux-points, parentheses. */
  const prenoms = ["Léa", "Mathias Durand", "Tom", "Inès", "Zoé (CM2)", "Paul, Jean", "A.B: C", "Chloé", "Noah", "Jade", "Louis", "Emma", "Hugo", "Lina", "Arthur", "Rose", "Jules", "Alice", "Adam", "Mila"];
  type PersonneA4 = { dep: string | null; app: string; prov: string | null };
  const lienAuHasard = () => (hasard() % 4 === 0 ? null : parmiA4(liensA4.slice(0, 3)).id);
  const personnesA4: PersonneA4[] = [];
  for (let k = 0; k < 15; k++) personnesA4.push({ dep: parmiA4([null, "", "Sans nom"]), app: `anonyme-${k}`, prov: lienAuHasard() });
  for (let k = 0; k < 155; k++) {
    const nom = k < prenoms.length ? prenoms[k] : `${prenoms[k % prenoms.length]} ${Math.floor(k / prenoms.length)}`;
    const prov = lienAuHasard();
    personnesA4.push({ dep: nom, app: `tel-${k}`, prov });
    if (k < 10) personnesA4.push({ dep: k % 2 ? nom.toLowerCase() : `${nom} `, app: `tel-${k}-bis`, prov });
  }
  const dossiersResp = [responsableA4, "La soirée", "La soirée / Photobooth", "Mes photos / Coulisses", "Le dîner", "Le responsable"];
  /* 300 petites familles de copies (exactes ou a 1-2 bits) : des groupes de doublons de 2 a 6 photos, dissous au-dela de 8. */
  const graines = Array.from({ length: 300 }, hex16);
  const identique = hex16();
  const toutesA4: LG[] = [];
  let instant = Date.UTC(2026, 9, 19, 8, 0, 0);
  for (let i = 0; i < 5000; i++) {
    if (i % 25 === 0) instant += 1000 + (hasard() % 60_000);
    const micro = String(hasard() % 1_000_000).padStart(6, "0");
    const confirmee = `${new Date(instant).toISOString().slice(0, 19)}.${micro}+00:00`;
    const r = hasard() % 100;
    const qui = parmiA4(personnesA4);
    let role = "participant", prov: string | null = qui.prov, type = "participant", dep: string | null = qui.dep, app: string | null = qui.app;
    if (r < 25) {
      role = "responsable"; prov = null; type = hasard() % 10 === 0 ? "photographe" : "organisateur"; dep = hasard() % 15 === 0 ? null : parmiA4(dossiersResp); app = `resp-${hasard() % 2}`;
    } else if (r < 28) {
      role = "atelier"; prov = null; type = "autre"; dep = "L'atelier"; app = null;
    }
    const e = hasard() % 12 === 0 ? null : i < 400 && i % 5 === 0 ? identique : hasard() % 8 === 0 ? voisinA4(parmiA4(graines), hasard() % 3) : hex16();
    toutesA4.push({
      id: randomUUID(),
      vignette_key: hasard() % 10 === 0 ? null : `collectif/v/${i}.webp`,
      r2_key: `collectif/o/${i}.jpg`,
      nom_origine: `IMG_${i}.jpg`,
      provenance_type: type,
      deposant: dep,
      prise_le: hasard() % 3 === 0 ? null : `2026-10-${String(15 + (hasard() % 4)).padStart(2, "0")}T${String(hasard() % 24).padStart(2, "0")}:${String(hasard() % 60).padStart(2, "0")}:00`,
      confirmee_le: confirmee,
      ordre: hasard() % 6 === 0 ? null : hasard() % 25,
      empreinte: e,
      preselection: hasard() % 10 === 0,
      signalee: hasard() % 30 === 0,
      mime: hasard() % 20 === 0 ? "image/heic" : "image/jpeg",
      provenance_id: prov,
      role_deposant: role,
      appareil_id: app,
    });
  }
  /* L'ordre de la base : arrivée, puis id (`lireToutesLesLignes`). */
  const toutesTriees = R.trierCommeLaBase(toutesA4, R.TRI_ARRIVEE);
  const doublonsA4 = Ds.calculerSurLignes(toutesTriees).groupes;
  /* La vue rend ses lignes dans l'ordre de leur clé (un md5) : ici, au hasard. */
  const resumeA4 = R.resumerPhotos(toutesTriees).map((g) => ({ g, k: hasard() })).sort((a, b) => a.k - b.k).map(({ g }) => g);
  const compteA4 = { lignes: 0, requetes: 0, comptes: 0 };
  const versPage = (p: LG): import("@/lib/collectif/grillePhotos").LignePage => ({
    id: p.id, vignette_key: p.vignette_key, r2_key: p.r2_key, nom_origine: p.nom_origine, provenance_type: p.provenance_type, deposant: p.deposant,
    prise_le: p.prise_le, confirmee_le: p.confirmee_le, preselection: p.preselection, signalee: p.signalee, mime: p.mime, provenance_id: p.provenance_id, role_deposant: p.role_deposant,
  });
  const lectureA4: import("@/lib/collectif/grillePhotos").LectureGrille = {
    async page(conditions, tri, de, a) {
      compteA4.requetes++;
      const r = R.trierCommeLaBase(toutesA4.filter((p) => R.correspond(p, conditions)), tri).slice(de, Math.min(a + 1, de + 1000));
      compteA4.lignes += r.length;
      return r.map(versPage);
    },
    async parIds(ids, conditions) {
      compteA4.requetes++;
      const voulus = new Set(ids);
      const r = toutesA4.filter((p) => voulus.has(p.id) && R.correspond(p, conditions));
      compteA4.lignes += r.length;
      return r.map(versPage);
    },
    async compter(ids, conditions) {
      /* Un compte `head` : la base ne rend aucune ligne. */
      compteA4.comptes++;
      const voulus = new Set(ids);
      return toutesA4.filter((p) => voulus.has(p.id) && R.correspond(p, conditions)).length;
    },
    /* Lot w2 : le compte des « Ne pas publier » d'un dossier, sans ligne, comme `compter`. */
    async compterFiltre(conditions) {
      compteA4.comptes++;
      return toutesA4.filter((p) => R.correspond(p, conditions)).length;
    },
  };
  const contexteA4 = (partage: boolean) => ({ edition: editionA4, provenances: liensA4, partage, enCours: 7, signer: async (cle: string) => `signe:${cle}`, signerOriginal: async (cle: string) => `signe:${cle}` });

  console.log(`      le resume : ${resumeA4.length} lignes pour 5 000 photos (${personnesA4.length} telephones de participants, ${dossiersResp.length} noms de dossier du responsable, l'atelier)`);
  ok("la fausse vue = la vue : chaque photo comptee une fois (et la selection, et les choisissables), le telephone garde pour les participants seulement",
    R.somme(resumeA4) === 5000 && R.somme(resumeA4, () => true, "n_selection") === toutesA4.filter((p) => p.preselection).length
      && R.somme(resumeA4, () => true, "n_choisissables") === toutesA4.filter((p) => !p.preselection && !p.signalee).length
      && resumeA4.every((g) => g.appareil_id === null || g.role_deposant === "participant" || g.provenance_id !== null) && resumeA4.length < 260);
  ok("le resume ne depend pas de l'ordre des photos",
    JSON.stringify([...R.resumerPhotos([...toutesTriees].reverse())].sort((a, b) => (a.id < b.id ? -1 : 1))) === JSON.stringify([...resumeA4].sort((a, b) => (a.id < b.id ? -1 : 1))));
  ok("l'arbre et les personnes pesees sur le resume = ceux des 5 000 lignes (orthographes, sous-dossiers, liens, l'atelier)",
    [true, false].every((partage) => JSON.stringify(Dos.arbreDesPhotos(R.enLignesPesees(resumeA4), partage ? liensA4 : [], editionA4, partage)) === JSON.stringify(Dos.arbreDesPhotos(toutesTriees, partage ? liensA4 : [], editionA4, partage)))
      && Dos.compterPersonnes(resumeA4) === Dos.compterPersonnes(toutesTriees));

  /* Toutes les clés de dossier que l'écran peut demander, et quelques-unes qu'il ne demande jamais. */
  const arbreA4 = Dos.arbreDesPhotos(toutesTriees, liensA4, editionA4, true);
  const cles = new Set<string>(["tout", "selection", "vous", "liens", "atelier", "participants", Dos.QUI_RESPONSABLE, "pirate", "resp:inconnu:x", "lien:pas-un-uuid", "pers:general:personne", "qui:personne", `lien:${liensA4[3].id}`]);
  for (const n of [...arbreA4.vous, ...arbreA4.liens, ...(arbreA4.atelier ? [arbreA4.atelier] : []), ...arbreA4.personnes]) {
    cles.add(n.cle);
    for (const e of n.enfants) cles.add(e.cle);
  }
  let comparees = 0;
  const differentes: string[] = [];
  let k = 0;
  for (const dossier of cles) {
    for (const vue of G.VUES) {
      /* Une personne : sa premiere page ; un dossier ou un lien : quatre pages, jusqu'a celle qui n'existe pas. */
      for (const page of dossier.startsWith("qui:") || dossier.startsWith("pers:") ? [0] : [0, 1, 7, 41]) {
        const partage = k++ % 3 !== 0;
        const demande = { dossier, vue, page, seulementArbre: false };
        const avant = await G.grilleDepuisLignes(toutesTriees, doublonsA4, demande, contexteA4(partage));
        const apres = await G.grilleDepuisResume(resumeA4, doublonsA4, demande, contexteA4(partage), lectureA4);
        comparees++;
        if (JSON.stringify(avant) !== JSON.stringify(apres)) differentes.push(`${dossier} ${vue} p${page}`);
      }
    }
  }
  for (const dossier of ["tout", "vous", "liens"]) {
    const demande = { dossier, vue: "toutes" as const, page: 0, seulementArbre: true };
    const avant = await G.grilleDepuisLignes(toutesTriees, doublonsA4, demande, contexteA4(true));
    const apres = await G.grilleDepuisResume(resumeA4, doublonsA4, demande, contexteA4(true), lectureA4);
    comparees++;
    if (JSON.stringify(avant) !== JSON.stringify(apres)) differentes.push(`${dossier} seulementArbre`);
  }
  console.log(`      ${comparees} affichages compares (${cles.size} dossiers et personnes x 3 vues, jusqu'a 4 pages, liens montres ou non, fenetre de depot ; ${doublonsA4.length} groupes de doublons)${differentes.length ? ` ; ecarts : ${differentes.slice(0, 5).join(" | ")}` : ""}`);
  ok("la grille lue sur le resume rend EXACTEMENT la reponse de la lecture complete (photos, ordre, pages, comptes, arbre, couvertures, liens, doublons, derniere arrivee)",
    differentes.length === 0 && comparees > 1000 && doublonsA4.length > 50);

  /* Les lignes lues par affichage : avant (toutes les photos), après (le résumé, la page, les doublons rangés). */
  const mesurer = async (dossier: string, vue: "toutes" | "jour" | "doublons", page: number, seulementArbre = false) => {
    compteA4.lignes = 0;
    compteA4.requetes = 0;
    compteA4.comptes = 0;
    await G.grilleDepuisResume(resumeA4, doublonsA4, { dossier, vue, page, seulementArbre }, contexteA4(true), lectureA4);
    /* + le résumé, + 2 lignes : la signature des doublons et le résultat rangé. */
    return { apres: resumeA4.length + compteA4.lignes + 2, requetes: compteA4.requetes, comptes: compteA4.comptes };
  };
  const qui = arbreA4.personnes.find((n) => n.cle.startsWith("qui:") && n.cle !== Dos.QUI_RESPONSABLE)?.cle ?? "qui:lea";
  const affichages: [string, Awaited<ReturnType<typeof mesurer>>][] = [
    ["Toutes, page 1", await mesurer("tout", "toutes", 0)],
    ["Par jour, page 4", await mesurer("tout", "jour", 3)],
    ["Doublons", await mesurer("tout", "doublons", 0)],
    ["Vos dossiers (vue d'ensemble)", await mesurer("vous", "toutes", 0)],
    ["Une personne", await mesurer(qui, "toutes", 0)],
    ["Fenetre de depot (l'arbre seul)", await mesurer("tout", "toutes", 0, true)],
  ];
  const membresA4 = Db.indexDoublons(doublonsA4).membres.size;
  for (const [nom, m] of affichages) console.log(`      mesure : ${nom.padEnd(32)} avant 5 000 lignes (5 tranches) · apres ${String(m.apres).padStart(4)} lignes (${resumeA4.length} du resume, ${m.requetes} lecture(s) de photos, ${m.comptes} compte(s) sans ligne)`);
  ok("hors « Doublons », chaque affichage lit au moins dix fois moins de lignes qu'avant (5 000)", affichages.filter(([nom]) => nom !== "Doublons").every(([, m]) => m.apres * 10 < 5000));
  ok("« Doublons » ne lit que les photos des groupes (jamais toute l'edition)", (affichages.find(([nom]) => nom === "Doublons")?.[1].apres ?? 5000) <= resumeA4.length + membresA4 + 2);

  {
    /* Un nom qui ne s'écrit pas sans risque dans un filtre : la lecture complète d'avant, jamais une page fausse. */
    const guillemet = R.resumerPhotos([{ ...toutesTriees[0], deposant: 'Jean "JJ"', role_deposant: "participant", provenance_id: null, id: "g1", confirmee_le: toutesTriees[0].confirmee_le, appareil_id: "x", preselection: false, signalee: false, vignette_key: null, provenance_type: "participant" }]);
    const p1 = R.planDuDossier("qui:jean \"jj\"", guillemet, responsableA4);
    const repli = await G.grilleDepuisResume(guillemet, [], { dossier: "qui:jean \"jj\"", vue: "toutes", page: 0, seulementArbre: false }, contexteA4(true), lectureA4);
    ok("un nom avec un guillemet : le plan se replie (la route relit tout), aucune page fausse", p1.genre === "repli" && repli === G.REPLI);
    const beaucoup = Array.from({ length: R.VALEURS_PARMI_MAX + 1 }, (_, i) => ({ role_deposant: "responsable", provenance_id: null, provenance_type: "organisateur", deposant: `${"Mes photos"} / Sous ${i}` }));
    ok("trop de noms pour une adresse : repli aussi ; un dossier vide : rien a lire", R.planDuDossier("resp:organisateur:", beaucoup, responsableA4).genre === "repli" && R.planDuDossier("lien:pas-un-uuid", resumeA4, responsableA4).genre === "vide");
  }
  {
    const pl = (cle: string) => {
      const p = R.planDuDossier(cle, resumeA4, responsableA4);
      return p.genre === "filtre" ? JSON.stringify(R.enFiltresPostgrest(p.conditions)) : p.genre;
    };
    ok("le filtre ecrit pour PostgREST : « Les participants » et « L'atelier »",
      pl("liens") === '[{"methode":"or","filtres":"role_deposant.eq.participant,provenance_id.not.is.null"}]'
        && pl("atelier") === '[{"methode":"not","colonne":"role_deposant","operateur":"in","valeur":"(\\"responsable\\",\\"participant\\")"},{"methode":"is","colonne":"provenance_id"}]'
        && pl("tout") === "[]" && pl("selection") === '[{"methode":"eq","colonne":"preselection","valeur":true}]');
    const lea = R.planDuDossier("qui:léa", resumeA4, responsableA4);
    const appels = lea.genre === "filtre" ? R.enFiltresPostgrest(lea.conditions) : [];
    ok("une personne : chaque orthographe ENTRE GUILLEMETS (une virgule, un point, deux points restent du nom), le vide en `is.null`",
      lea.genre === "filtre" && appels.length === 2 && appels[1].methode === "filter"
        && (appels[1] as { valeur: string }).valeur === `(${[...new Set(toutesA4.filter((p) => Dos.deParticipant(p) && Dos.clePersonne(p.deposant) === "léa").map((p) => p.deposant as string))].sort().map((v) => `"${v}"`).join(",")})`
        && (appels[1] as { valeur: string }).valeur.includes('"Léa "'));
    const anonyme = R.planDuDossier("qui:sans nom", resumeA4, responsableA4);
    const appelsAnonyme = anonyme.genre === "filtre" ? R.enFiltresPostgrest(anonyme.conditions) : [];
    ok("« Sans nom » : le vide ET les noms vides ou « Sans nom », en un seul `or`",
      appelsAnonyme.some((a) => a.methode === "or" && a.filtres === 'deposant.is.null,deposant.in.("","Sans nom")'));
    const virgule = R.planDuDossier(`qui:${Dos.clePersonne("Paul, Jean")}`, resumeA4, responsableA4);
    ok("un nom qui porte une virgule passe en filtre, entre guillemets", virgule.genre === "filtre" && JSON.stringify(R.enFiltresPostgrest(virgule.conditions)).includes('\\"Paul, Jean\\"'));
  }
  {
    /* « Par jour » redit en colonnes : la même suite que le tri d'avant (clé du jour, prise de vue, arrivée). */
    const avantJour = [...toutesTriees].sort((a, b) => {
      const ja = a.prise_le ? a.prise_le.slice(0, 10) : `~${a.confirmee_le.slice(0, 10)}`;
      const jb = b.prise_le ? b.prise_le.slice(0, 10) : `~${b.confirmee_le.slice(0, 10)}`;
      return ja === jb ? (a.prise_le ?? "").localeCompare(b.prise_le ?? "") : ja.localeCompare(jb);
    });
    ok("« Par jour » : sans date d'abord (`~` passe avant les chiffres), puis par prise de vue, l'arrivee departage",
      "~2026-10-13".localeCompare("2024-08-08") < 0 && JSON.stringify(R.trierCommeLaBase(toutesTriees, R.TRI_JOUR).map((p) => p.id)) === JSON.stringify(avantJour.map((p) => p.id)));
    ok("« Toutes » : la derniere arrivee d'abord, l'id departage un lot (la lecture d'avant a l'envers)",
      JSON.stringify(R.trierCommeLaBase(toutesA4, R.TRI_TOUTES).map((p) => p.id)) === JSON.stringify([...toutesTriees].reverse().map((p) => p.id)));
    ok("les instants se comparent aux microsecondes (une `Date` les perd)",
      R.compareInstants("2026-10-19T10:00:00.000002+00:00", "2026-10-19T10:00:00.000001+00:00") > 0 && R.compareInstants("2026-10-19T10:00:00+00:00", "2026-10-19T10:00:00.5+00:00") < 0 && R.compareInstants("2026-10-19T10:00:00.1+00:00", "2026-10-19T10:00:00.100+00:00") === 0);
  }
  {
    /* Le tableau de bord : les memes chiffres, le meme arbre, les memes couvertures que la lecture complete d'avant (de la plus recente a la plus ancienne). */
    const desc = [...toutesTriees].reverse();
    const couvAvant = (cle: string) => desc.find((x) => x.vignette_key && Dos.dansLeDossier(x, cle, responsableA4))?.vignette_key ?? null;
    const premierNiveau = [...arbreA4.vous, ...arbreA4.liens, ...(arbreA4.atelier ? [arbreA4.atelier] : [])].map((n) => n.cle);
    ok("tableau de bord : photos, personnes, selection, photos par lien, couvertures = la lecture des 5 000 lignes",
      R.somme(resumeA4) === desc.length && Dos.compterPersonnes(resumeA4) === Dos.compterPersonnes(desc) && R.somme(resumeA4, () => true, "n_selection") === desc.filter((l) => l.preselection).length
        && liensA4.every((l) => R.somme(resumeA4, (g) => g.provenance_id === l.id) === desc.filter((x) => x.provenance_id === l.id).length)
        && premierNiveau.every((cle) => R.couvertureDe(resumeA4, cle, responsableA4) === couvAvant(cle)) && premierNiveau.length > 5);
    const tdb = lire("src/app/edition/[token]/donnees.ts");
    ok("tableau de bord : le resume en base d'abord ; sans la migration, toutes les photos relues et resumees EN MEMOIRE par la meme regle ; la mosaique lit six lignes",
      /from\(VUE_RESUME\)\.select\(COLONNES_RESUME\)/.test(tdb) && /if \(!resumeAbsent\(resume\.error\.code\)\) echec/.test(tdb) && /return resumerPhotos\(photos\.data \?\? \[\]\);/.test(tdb)
        && /\.not\("vignette_key", "is", null\)\s*\.order\("confirmee_le", \{ ascending: false \}\)\s*\.order\("id", \{ ascending: false \}\)\s*\.limit\(MOSAIQUE\)/.test(tdb) && /const MOSAIQUE = 6;/.test(tdb));
  }
  const routeA4 = lire("src/app/api/collectif/photos/route.ts");
  ok("la route : le resume par tranches, la page triee et decoupee PAR LA BASE ; repli sur la lecture complete si la vue manque (PGRST205/42P01) ou si le dossier ne s'ecrit pas en filtre",
    /lireToutesLesLignes<LigneResume>\(\s*\(\) => supabase\.from\(VUE_RESUME\)\.select\(COLONNES_RESUME\)\.eq\("edition_id", edition\.id\)/.test(routeA4) && /\{ colonne: "id", croissant: true \}/.test(routeA4)
      && /q\.range\(de, a\)/.test(routeA4) && /if \(reponse !== REPLI\) return NextResponse\.json\(reponse\);/.test(routeA4) && /\} else if \(!resumeAbsent\(resume\.error\.code\)\) \{/.test(routeA4)
      && routeA4.indexOf("grilleDepuisResume(") < routeA4.indexOf("grilleDepuisLignes(") && /for \(const f of enFiltresPostgrest\(conditions\)\)/.test(routeA4) && !/groupesDoublonsRapides/.test(routeA4));
  ok("la route : les doublons sont LUS (rangés), plus calcules a chaque page ; la lecture legere /photos/etat n'a pas bouge",
    /const doublons = await doublonsDeLEdition\(supabase, edition\.id\);/.test(routeA4) && /doublonsDeLEdition\(supabase, edition\.id, toutes\)/.test(routeA4)
      && !/\.(insert|update|upsert|delete)\(/.test(lire("src/app/api/collectif/photos/etat/route.ts")));
}


/* ═══════════════ Planches du 20/10 : personnes, corbeille, album, ouverture (lot w1, migration 20261023) ═══════════════ */

async function verifPersonnesCorbeille() {
  const Pe = await import("@/lib/collectif/personnes");
  const Co = await import("@/lib/collectif/corbeille");
  const Al = await import("@/lib/collectif/album");
  const Ou = await import("@/lib/collectif/ouverture");
  const Mi = await import("@/lib/collectif/migration");
  const Hc = await import("@/lib/collectif/horsCorbeille");
  const Col = await import("@/lib/collectif/collecte");
  const Rs = await import("@/lib/collectif/resumePhotos");
  const Dos = await import("@/lib/collectif/dossiers");
  const Dep = await import("@/lib/collectif/depot");
  const Ps = await import("@/lib/collectif/personnesServeur");
  const Cs = await import("@/lib/collectif/corbeilleServeur");
  const { phraseEvenement } = await import("@/lib/collectif/recit");
  const { randomUUID } = await import("node:crypto");
  const silence = async <R>(f: () => Promise<R>): Promise<R> => {
    const avant = console.error;
    console.error = () => {};
    try {
      return await f();
    } finally {
      console.error = avant;
    }
  };

  titre("— w1 : la personne, son adresse (personnes.ts) —");
  ok("l'adresse : sans blanc, en minuscules ; une forme fausse, trop longue ou hors ASCII est refusee",
    Pe.normaliserEmail("  Lea.Martin@Audencia.COM ") === "lea.martin@audencia.com" && Pe.normaliserEmail("lea@") === null && Pe.normaliserEmail("lea martin@a.fr") === null
      && Pe.normaliserEmail(`${"a".repeat(250)}@a.fr`) === null && Pe.normaliserEmail("léa@audencia.com") === null && Pe.normaliserEmail(42) === null);
  ok("le responsable voit l'adresse MASQUEE (« l•••@audencia.com »), l'atelier entiere, l'equipe rien",
    Pe.masquerEmail("lea.martin@audencia.com") === "l•••@audencia.com" && Pe.emailPour("lea@a.fr", "entier") === "lea@a.fr"
      && Pe.emailPour("lea@a.fr", "masque") === "l•••@a.fr" && Pe.emailPour("lea@a.fr", "aucun") === null && Pe.emailPour(null, "entier") === null);
  ok("le nom compare pour PROPOSER : sans accents, sans casse, espaces resserres",
    Pe.cleSansAccents("Léa  Martin") === Pe.cleSansAccents("lea martin") && Pe.cleSansAccents("Zoé") === "zoe" && Pe.cleSansAccents("Léa") !== Pe.cleSansAccents("Léo"));
  const id1 = Pe.lireIdentite({ email: "lea@a.fr" }, false);
  const id2 = Pe.lireIdentite({ email: "lea@a.fr", prenom: "Léa" }, true);
  const id3 = Pe.lireIdentite({ email: "lea@a.fr", prenom: " Léa ", nom: " Martin " }, false);
  ok("se presenter : l'adresse seule est une QUESTION (rien a creer), prenom sans nom un refus, les deux la personne",
    id1.ok && id1.identite === null && !id2.ok && id2.erreur === "nom_incomplet" && /Écris/.test(id2.message)
      && id3.ok && id3.identite?.prenom === "Léa" && id3.identite.nom === "Martin" && !Pe.lireIdentite({ email: "x" }, false).ok);
  ok("renommer (responsable ou atelier) : prenom ET nom, 80 caracteres chacun",
    Pe.lireRenommage({ prenom: "Léa", nom: "Martin" }).ok && !Pe.lireRenommage({ prenom: "Léa" }).ok && !Pe.lireRenommage({ prenom: "L", nom: "x".repeat(81) }).ok);
  const u = randomUUID();
  ok("une personne se designe par `p:<uuid>` ou `n:<nom compare>`, jamais par un libelle ; « Sans nom » ne se designe pas",
    JSON.stringify(Pe.lireRefPersonne(`p:${u.toUpperCase()}`)) === JSON.stringify({ genre: "participant", id: u })
      && JSON.stringify(Pe.lireRefPersonne("n:Léa  Martin")) === JSON.stringify({ genre: "nom", cle: "léa martin" })
      && Pe.lireRefPersonne("n:") === null && Pe.lireRefPersonne("n:Sans nom") === null && Pe.lireRefPersonne("p:pas-un-uuid") === null && Pe.lireRefPersonne("Léa") === null
      && Pe.ecrireRefPersonne({ genre: "nom", cle: "léa" }) === "n:léa");
  const ligne = (id: string, prenom: string, nom: string, fusionne_dans: string | null = null): import("@/lib/collectif/personnes").LigneParticipant => ({
    id, email: `${prenom.toLowerCase()}@a.fr`, prenom, nom, premier_lien_id: null, created_at: "2026-10-20T10:00:00Z", vu_le: "2026-10-20T10:00:00Z", renomme_le: null, fusionne_dans, fusionne_le: fusionne_dans ? "2026-10-20T11:00:00Z" : null,
  });
  const A = ligne(randomUUID(), "Léa", "Martin");
  const B = ligne(randomUUID(), "Lea", "Martin", A.id);
  const C = ligne(randomUUID(), "Lea", "Bis", B.id);
  const parId = new Map([A, B, C].map((x) => [x.id, x]));
  const boucle1 = ligne(randomUUID(), "X", "Y");
  const boucle2 = ligne(randomUUID(), "Z", "W", boucle1.id);
  boucle1.fusionne_dans = boucle2.id;
  ok("une adresse d'une personne fusionnee retrouve celle qui RESTE (au bout de la chaine) ; une boucle ne devine rien",
    Pe.auBoutDesFusions(C, parId)?.id === A.id && Pe.auBoutDesFusions(A, parId)?.id === A.id
      && Pe.auBoutDesFusions(boucle1, new Map([boucle1, boucle2].map((x) => [x.id, x]))) === null);

  const lien1 = randomUUID();
  const lien2 = randomUUID();
  const r = (o: Partial<import("@/lib/collectif/personnes").LigneResumePersonne>) => ({ role_deposant: "participant", provenance_id: lien1, deposant: null, appareil_id: null, participant_id: null, n: 1, derniere: "2026-10-20T12:00:00Z", ...o });
  const personnes = Pe.listerPersonnes(
    [A, B],
    [
      r({ participant_id: A.id, deposant: "Léa Martin", n: 20 }),
      r({ participant_id: A.id, deposant: "Léa Martin", provenance_id: null, n: 4, derniere: "2026-10-21T08:00:00Z" }),
      r({ deposant: "Lea Martin", n: 3, appareil_id: "tel-a" }),
      r({ deposant: "Léa", n: 2, appareil_id: "tel-b" }),
      r({ deposant: "Hugo", provenance_id: lien2, n: 7, appareil_id: "tel-c" }),
      r({ deposant: null, n: 1, appareil_id: "tel-d" }),
      { role_deposant: "responsable", provenance_id: null, deposant: "Mathilde", appareil_id: null, participant_id: null, n: 50, derniere: "2026-10-20T12:00:00Z" },
    ],
    new Map([[A.id, 2]]),
    "masque"
  );
  const lea = personnes.find((p) => p.ref === `p:${A.id}`);
  ok("la liste : une personne connue = sa ligne, ses photos de tous ses liens, ses telephones, son adresse masquee ; la fusionnee n'apparait plus",
    lea?.n === 24 && lea.liens.length === 2 && lea.liens[0].cle === `lien:${lien1}` && lea.liens[1].cle === "participants" && lea.telephones === 2 && lea.email === "l•••@a.fr"
      && lea.derniere === "2026-10-21T08:00:00Z" && !personnes.some((p) => p.ref === `p:${B.id}`));
  ok("la liste : une personne d'AVANT est un nom compare (`n:`), sans adresse ; le responsable et l'atelier ne sont pas des personnes",
    personnes.some((p) => p.ref === "n:lea martin" && !p.participant && p.email === null && p.n === 3 && p.telephones === 1)
      && personnes.some((p) => p.ref === "n:sans nom") && !personnes.some((p) => p.nom === "Mathilde") && personnes[0].ref === `p:${A.id}`);
  const proposees = Pe.proposerFusions(personnes);
  ok("les doublons de noms se PROPOSENT : « Léa Martin » et « Lea Martin » (meme nom sans accent), « Léa » et « Léa Martin » (meme prenom, meme lien)",
    proposees.some((f) => f.a === `p:${A.id}` && f.b === "n:lea martin" && f.raison === "meme_nom")
      && proposees.some((f) => f.b === "n:léa" && f.raison === "meme_prenom"));
  ok("…jamais « Sans nom », jamais deux personnes sans lien commun, jamais deux fois la meme paire",
    !proposees.some((f) => f.a === "n:sans nom" || f.b === "n:sans nom") && !proposees.some((f) => f.a === "n:hugo" || f.b === "n:hugo")
      && new Set(proposees.map((f) => [f.a, f.b].sort().join("|"))).size === proposees.length);
  const pf = Pe.planFusion({ genre: "participant", id: A.id }, { genre: "nom", cle: "lea martin" }, "cible");
  const pf2 = Pe.planFusion({ genre: "nom", cle: "léa" }, { genre: "participant", id: A.id }, "source");
  ok("fusionner : celle qui a une ADRESSE reste (elle seule se retrouve sur un autre telephone) ; « le nom garde » suit le choix",
    pf.ok && pf.reste.genre === "participant" && pf.part.genre === "nom" && pf.nomDe === "part"
      && pf2.ok && pf2.reste.genre === "participant" && pf2.nomDe === "part"
      && !Pe.planFusion({ genre: "nom", cle: "a" }, { genre: "nom", cle: "a" }, "cible").ok && !Pe.planFusion(null, { genre: "nom", cle: "a" }, "cible").ok);
  ok("un nom d'avant garde sur une personne a adresse : premier mot = prenom ; un seul mot ne s'invente pas de nom",
    JSON.stringify(Pe.decouperNom("Léa  Martin Dupont")) === JSON.stringify({ prenom: "Léa", nom: "Martin Dupont" }) && Pe.decouperNom("Léa") === null && Pe.decouperNom("") === null);
  const ids = [randomUUID(), randomUUID(), randomUUID()];
  const groupes = Pe.grouperAvantFusion([
    { id: ids[0], deposant: "Lea", participant_id: null },
    { id: ids[1], deposant: "Lea", participant_id: null },
    { id: ids[2], deposant: "Léa Martin", participant_id: A.id },
  ]);
  const journal = Pe.lireFusionJournal({ reste: `p:${A.id}`, part: "n:lea", resteAvant: null, nomApres: "Léa Martin", photos: groupes });
  ok("defaire une fusion : le journal garde CHAQUE photo et ce qu'elle portait avant ; il se relit tel quel, une forme abimee ne se relit pas",
    groupes.length === 2 && journal?.n === 3 && journal.photos.find((g) => g.deposant === "Lea")?.ids.length === 2 && journal.reste === `p:${A.id}`
      && Pe.lireFusionJournal({ reste: "p:x", part: "n:lea", nomApres: "a", photos: [] }) === null && Pe.lireFusionJournal({ reste: `p:${A.id}`, part: "n:lea", nomApres: "a", photos: [{ ids: ["pas-un-uuid"], deposant: null, participant_id: null }] }) === null);
  ok("le prenom seul dans l'album (jamais le nom complet des autres)",
    Pe.prenomPourAlbum({ prenom: "Léa", deposant: "Léa Martin" }) === "Léa" && Pe.prenomPourAlbum({ deposant: "Hugo Lefèvre" }) === "Hugo" && Pe.prenomPourAlbum({ deposant: null }) === Dos.SANS_NOM);

  titre("— w1 : la corbeille (corbeille.ts) —");
  ok("les ids d'un geste : des uuid, 500 au plus, sans doublon ; une entree illisible refuse tout le geste",
    JSON.stringify(Co.lireIdsPhotos([ids[0], ids[0].toUpperCase(), ids[1]])) === JSON.stringify([ids[0], ids[1]]) && Co.lireIdsPhotos([ids[0], "x"]) === null
      && Co.lireIdsPhotos([]) === null && Co.lireIdsPhotos(Array.from({ length: 501 }, () => randomUUID())) === null && Co.lireIdsPhotos(Array.from({ length: 500 }, () => randomUUID()))?.length === 500);
  const t0 = "2026-10-01T10:00:00.000Z";
  const apres = (jours: number) => new Date(Date.parse(t0) + jours * 86_400_000);
  ok("30 jours : l'echeance, les jours restants (alerte sous 3), la purge exactement a 30 jours ; le seuil de la purge dit la meme chose",
    Co.DELAI_CORBEILLE_JOURS === 30 && Co.echeanceCorbeille(t0) === "2026-10-31T10:00:00.000Z" && Co.joursRestants(t0, apres(0)) === 30 && Co.joursRestants(t0, apres(28.5)) === 2
      && Co.joursRestants(t0, apres(40)) === 0 && !Co.aPurger(t0, apres(29.99)) && Co.aPurger(t0, apres(30)) && !Co.aPurger(null, apres(99))
      && t0 < Co.seuilPurge(apres(30.01)) && !(t0 < Co.seuilPurge(apres(29.99))) && Co.ALERTE_JOURS === 3);
  const ph = (o: Partial<import("@/lib/collectif/corbeille").PhotoDuParticipant>) => ({ role_deposant: "participant", provenance_id: lien1, appareil_id: "tel-a", participant_id: A.id, confirmee_le: t0, supprimee_le: null, ...o });
  ok("un participant ne supprime QUE les photos de CE telephone et de sa personne (l'adresse, non verifiee, n'ouvre pas ce droit)",
    Co.peutSupprimerSaPhoto(ph({}), "tel-a", A.id) && !Co.peutSupprimerSaPhoto(ph({}), "tel-b", A.id) && !Co.peutSupprimerSaPhoto(ph({}), "tel-a", B.id)
      && !Co.peutSupprimerSaPhoto(ph({}), null, A.id) && Co.peutSupprimerSaPhoto(ph({ participant_id: null }), "tel-a", null)
      && !Co.peutSupprimerSaPhoto(ph({ role_deposant: "responsable", provenance_id: null }), "tel-a", A.id)
      && !Co.peutSupprimerSaPhoto(ph({ confirmee_le: null }), "tel-a", A.id) && !Co.peutSupprimerSaPhoto(ph({ supprimee_le: t0 }), "tel-a", A.id));
  /* Le filtre de la place, lu comme PostgREST le lit (`supprimee_le is null`, le meme que le total : audit du 20/10, S4), contre la regle pure. */
  const selonLaBase = (p: { supprimee_le?: string | null; supprimee_par?: string | null }) => p.supprimee_le === null || p.supprimee_le === undefined;
  const cas = [{}, { supprimee_le: t0, supprimee_par: "auteur" }, { supprimee_le: t0, supprimee_par: "responsable" }, { supprimee_le: t0, supprimee_par: "atelier" }];
  ok("la place : une photo de la corbeille ne compte plus, QUI que soit celui qui l'a supprimee (S4) ; le filtre de la base dit la meme chose",
    cas.every((p) => selonLaBase(p) === Co.compteDansLaPlace(p)) && cas.map((p) => Co.compteDansLaPlace(p)).join() === "true,false,false,false" && !("FILTRE_PLACE_PERSONNE" in Co));
  ok("qui a supprime, dit a l'ecran (planche 5)",
    Co.parQui("auteur", "Yanis Haddad", "Mathilde Roux") === "par son auteur, Yanis Haddad" && Co.parQui("responsable", null, "Mathilde Roux") === "par Mathilde Roux"
      && Co.parQui("atelier", null, null) === "par l'atelier" && Co.estSupprimeePar("auteur") && !Co.estSupprimeePar("constructor"));
  const edId = randomUUID();
  const phId = randomUUID();
  ok("l'effacement ne touche que les objets de la photo, sous le prefixe de SON edition (une cle etrangere est ignoree)",
    JSON.stringify(Cs.objetsDeLaPhoto({ id: phId, r2_key: `collectif/${edId}/photos/${phId}/original.jpg`, vignette_key: `collectif/${randomUUID()}/x.jpg` }, edId))
      === JSON.stringify([`collectif/${edId}/photos/${phId}/original.jpg`, `collectif/${edId}/photos/${phId}/vignette.jpg`]));

  titre("— w1 : l'album du lien (album.ts) et l'accord du 20/10 (accord.ts) —");
  const pa = (o: Partial<import("@/lib/collectif/album").PhotoAlbum>) => ({ role_deposant: "participant", provenance_id: lien1, confirmee_le: t0, supprimee_le: null, accord_version: "2026-10-20", ...o });
  ok("l'album d'un lien : ses photos, arrivees, hors corbeille, SOUS l'accord du 20/10 ; celles du 17/10 n'ont jamais ete promises aux autres",
    Al.dansLAlbum(pa({}), lien1) && !Al.dansLAlbum(pa({}), lien2) && !Al.dansLAlbum(pa({ supprimee_le: t0 }), lien1) && !Al.dansLAlbum(pa({ confirmee_le: null }), lien1)
      && !Al.dansLAlbum(pa({ accord_version: "2026-10-17" }), lien1) && !Al.dansLAlbum(pa({ accord_version: null }), lien1));
  ok("l'album du lien general : les photos de participant venues du lien general, jamais celles d'un lien de contribution ni du responsable",
    Al.dansLAlbum(pa({ provenance_id: null }), null) && !Al.dansLAlbum(pa({}), null) && !Al.dansLAlbum(pa({ provenance_id: null, role_deposant: "responsable" }), null));
  /* Le filtre ecrit pour PostgREST, rejoue sur des lignes : il retient exactement ce que `dansLAlbum` retient. */
  const appliquer = (p: Record<string, unknown>, f: import("@/lib/collectif/album").FiltreAlbum) =>
    f.methode === "eq" ? p[f.colonne] === f.valeur : f.methode === "is" ? p[f.colonne] === null || p[f.colonne] === undefined : f.methode === "not_is" ? p[f.colonne] !== null && p[f.colonne] !== undefined : f.valeurs.includes(p[f.colonne] as string);
  const lignesAlbum = [pa({}), pa({ provenance_id: lien2 }), pa({ provenance_id: null }), pa({ provenance_id: null, role_deposant: "responsable" }), pa({ supprimee_le: t0 }), pa({ accord_version: "2026-10-17" }), pa({ confirmee_le: null })];
  ok("le filtre de l'album ecrit pour la base retient EXACTEMENT les photos de `dansLAlbum`, lien de contribution comme lien general",
    [lien1, null].every((l) => lignesAlbum.every((p) => Al.filtreAlbum(l).every((f) => appliquer(p as Record<string, unknown>, f)) === Al.dansLAlbum(p, l))));
  ok("« a moi » : ma personne, ou, sans personne, ce telephone ; « N personnes » : une par personne, sinon par nom, « Sans nom » par telephone",
    Al.estAMoi({ participant_id: A.id, appareil_id: "tel-z" }, A.id, "tel-a") && !Al.estAMoi({ participant_id: A.id, appareil_id: "tel-a" }, B.id, "tel-a") && Al.estAMoi({ participant_id: null, appareil_id: "tel-a" }, null, "tel-a")
      && Al.personnesDeLAlbum([{ participant_id: A.id, deposant: "Léa Martin", appareil_id: "1" }, { participant_id: A.id, deposant: "Léa Martin", appareil_id: "2" }, { deposant: "hugo", appareil_id: "3" }, { deposant: "Hugo ", appareil_id: "4" }, { deposant: null, appareil_id: "5" }, { deposant: "", appareil_id: "6" }]) === 4);
  ok("l'accord du 20/10 : le texte du 17/10 MOT POUR MOT, puis la phrase de l'album ; la version affichee est celle de l'album depuis que la page montre la phrase (lot w2)",
    Accord.VERSION_ACCORD === "2026-10-20" && Accord.VERSION_ACCORD_ALBUM === "2026-10-20"
      && (Accord.TEXTES_ACCORD.get("2026-10-20") ?? "").startsWith(Accord.TEXTES_ACCORD.get("2026-10-17") as string) && Accord.TEXTES_ACCORD.get("2026-10-20")?.endsWith(" {album}") === true
      && [...Accord.VERSIONS_ALBUM].join() === "2026-10-20" && !Accord.VERSIONS_ALBUM.has("2026-10-17"));
  ok("la phrase validee nomme le lien ; le lien general a son equivalent sans nom ; le serveur accepte les versions DEJA affichees (C5 : celle de l'album le jour ou la page la montre), aucune autre",
    Accord.phraseAlbum(" Bateau  1 ") === "Les personnes de « Bateau 1 » verront aussi les photos que j'envoie ici." && Accord.phraseAlbum(null) === Accord.PHRASES_ALBUM.general && !Accord.phraseAlbum(null).includes("{")
      && (Accord.lireAccord({ accord: true, accordVersion: "2026-10-20" }) !== null) === (Accord.VERSION_ACCORD >= "2026-10-20") && Accord.lireAccord({ accord: true, accordVersion: "2026-10-17" })?.version === "2026-10-17"
      && Accord.lireAccord({ accord: true, accordVersion: "2026-10-21" }) === null && Accord.texteAccord("2026-10-21", { evenement: "a", deOrganisation: "b", lien: null }) === null
      && Accord.texteAccord("2026-10-20", { evenement: "Week-end en mer", deOrganisation: "d'Audencia", lien: "Bateau 1" }) === `J'accepte que Bellajour utilise ces photos pour composer le magazine « Week-end en mer » d'Audencia, et je confirme avoir le droit de les partager, y compris pour les personnes qu'on y voit. Les personnes de « Bateau 1 » verront aussi les photos que j'envoie ici.`);

  titre("— w1 : l'ouverture du depot (ouverture.ts, saisie.ts) —");
  const ouv = "2026-11-06T07:00:00.000Z";
  ok("sans ouverture (ou illisible) le depot est ouvert ; avant l'heure il est ferme, a l'heure il ouvre",
    Ou.depotOuvert(null, new Date()) && Ou.depotOuvert(undefined, new Date()) && Ou.depotOuvert("le 6 novembre", new Date("2026-01-01"))
      && !Ou.depotOuvert(ouv, new Date("2026-11-06T06:59:59Z")) && Ou.depotOuvert(ouv, new Date(ouv)));
  ok("« Il ouvrira le vendredi 6 novembre à 8 h » (heure de Paris), « 8 h 30 » quand les minutes comptent",
    Ou.quandOuvre(ouv) === "vendredi 6 novembre à 8 h" && Ou.quandOuvre("2026-11-06T07:30:00.000Z") === "vendredi 6 novembre à 8 h 30" && Ou.quandOuvre(null) === ""
      && Ou.phrasesPasEncoreOuvert(ouv, "ecole_tu").quand === "Il ouvrira le vendredi 6 novembre à 8 h." && /^Garde ce lien/.test(Ou.phrasesPasEncoreOuvert(ouv, "ecole_tu").garder)
      && Ou.messagePasOuvert(ouv) === "Le dépôt n'est pas encore ouvert : il ouvrira le vendredi 6 novembre à 8 h." && Ou.ERREUR_PAS_OUVERT === "depot_pas_ouvert");
  const base = { organisation: "Audencia", evenement: "Week-end en mer", registre: "ecole_tu", responsable_email: "m@a.fr", magazines: [{ nom: "Bateau" }], cloture_le: "2026-11-15T22:59:00.000Z" };
  const LE_20 = new Date("2026-10-20T12:00:00Z");
  const s1 = Saisie.lireSaisieEdition(base, "creation", undefined, LE_20);
  const s2 = Saisie.lireSaisieEdition({ ...base, ouverture_le: ouv }, "creation", undefined, LE_20);
  const s3 = Saisie.lireSaisieEdition({ ...base, ouverture_le: "2026-11-16T07:00:00.000Z" }, "creation", undefined, LE_20);
  const actuel = { plafond_participant_atelier: null, plafond_participant_client: null, plafond_total: null, cloture_le: "2026-11-15T22:59:00.000Z", ouverture_le: ouv };
  const s4 = Saisie.lireSaisieEdition({ ouverture_le: "2026-11-06T07:00:20.000Z" }, "modification", actuel, LE_20);
  const s5 = Saisie.lireSaisieEdition({ ouverture_le: "" }, "modification", actuel, LE_20);
  const s6 = Saisie.lireSaisieEdition({ ouverture_le: "" }, "modification", { ...actuel, ouverture_le: undefined }, LE_20);
  ok("la saisie : vide, rien n'est ecrit (une edition se cree sans la migration) ; reglee, un instant ; apres la cloture, refusee a son etape",
    s1.ok && !("ouverture_le" in s1.edition) && s2.ok && s2.edition.ouverture_le === ouv && !s3.ok && s3.erreurs[0].champ === "ouverture_le"
      && Saisie.ETAPE_DU_CHAMP.ouverture_le === "calendrier" && Saisie.LIBELLE_CHAMP.ouverture_le === "Ouverture du dépôt"
      && !Saisie.lireSaisieEdition({ ...base, ouverture_le: "demain" }, "creation", undefined, LE_20).ok);
  ok("en reglage : inchangee (a la minute) elle n'est pas reecrite ; videe, elle s'efface SEULEMENT si elle existait (sans la colonne, rien ne part)",
    s4.ok && !("ouverture_le" in s4.edition) && s5.ok && s5.edition.ouverture_le === null && s6.ok && !("ouverture_le" in s6.edition));

  titre("— w1 : la migration 20261023, vue du code (repli) —");
  ok("`personnesAbsentes` : une colonne OU une table de la migration nommee dans l'erreur (42703, PGRST204, PGRST205, 42P01) ; jamais la colonne d'une autre",
    Mi.personnesAbsentes({ code: "42703", message: "column collectif_photos.supprimee_le does not exist" }) && Mi.personnesAbsentes({ code: "PGRST204", message: "Could not find the 'participant_id' column of 'collectif_photos' in the schema cache" })
      && Mi.personnesAbsentes({ code: "PGRST205", message: "Could not find the table 'public.collectif_participants' in the schema cache" }) && Mi.personnesAbsentes({ code: "42703", message: "column collectif_editions.ouverture_le does not exist" })
      && !Mi.personnesAbsentes({ code: "42703", message: "column collectif_photos.accord_version does not exist" }) && !Mi.personnesAbsentes({ code: "57014", message: "supprimee_le" })
      && !Mi.personnesAbsentes(null) && !Mi.personnesAbsentes({ message: "" }) && Mi.MIGRATION_PERSONNES === "supabase/migrations/20261023_collectif_personnes_corbeille.sql");
  {
    Hc.oublierAbsence();
    const appels: boolean[] = [];
    const absente = { code: "42703", message: "column collectif_photos.supprimee_le does not exist" };
    const r1 = await Hc.lireHorsCorbeille(async (avec) => (appels.push(avec), avec ? { error: absente, n: 0 } : { error: null, n: 5 }));
    const r2 = await Hc.lireHorsCorbeille(async (avec) => (appels.push(avec), { error: null, n: avec ? -1 : 7 }));
    Hc.oublierAbsence();
    const r3 = await Hc.lireHorsCorbeille(async (avec) => (appels.push(avec), { error: null, n: avec ? 9 : -1 }));
    const autre = await Hc.lireHorsCorbeille(async (avec) => (appels.push(avec), { error: { code: "42703", message: "column collectif_photos.colonne_x does not exist" }, n: avec ? 1 : 2 }));
    const tete = await Hc.lireHorsCorbeille(async (avec) => (appels.push(avec), { error: { message: "" }, n: avec ? 1 : 2 }));
    ok("le repli : avec le filtre d'abord ; la migration absente (nommee), la meme lecture SANS lui, et l'absence retenue une minute ; oubliee, on reessaie avec",
      r1.n === 5 && !r1.avec && r2.n === 7 && !r2.avec && r3.n === 9 && r3.avec && JSON.stringify(appels.slice(0, 4)) === "[true,false,false,true]");
    ok("…une colonne d'une AUTRE migration, ou une erreur sans code (un HEAD), ne leve jamais le filtre de la corbeille",
      autre.avec && autre.n === 1 && tete.avec && tete.n === 1 && JSON.stringify(appels.slice(4)) === "[true,true]" && Hc.migrationPersonnesPresumee() && Hc.MEMOIRE_ABSENCE_MS === 60_000);
    Hc.oublierAbsence();
  }
  {
    /* compterPourPlafond contre une fausse base : la personne connue, puis la migration absente. */
    type Appel = { colonnes: string; options: unknown; filtres: string[] };
    const fausse = (rendre: (a: Appel, rang: number) => { count: number | null; error: { code: string; message: string } | null }) => {
      const appels: Appel[] = [];
      const client = {
        from: () => ({
          select: (colonnes: string, options?: unknown) => {
            const a: Appel = { colonnes, options, filtres: [] };
            const rang = appels.length;
            appels.push(a);
            const q = {
              eq: (c: string, v: unknown) => (a.filtres.push(`eq ${c} ${String(v)}`), q),
              or: (f: string) => (a.filtres.push(`or ${f}`), q),
              is: (c: string) => (a.filtres.push(`is ${c}`), q),
              limit: (n: number) => (a.filtres.push(`limit ${n}`), q),
              then: (oui: (r: unknown) => unknown, non?: (e: unknown) => unknown) => Promise.resolve(rendre(a, rang)).then(oui, non),
            };
            return q;
          },
        }),
      };
      return { client: client as unknown as Parameters<typeof Col.compterPourPlafond>[0], appels };
    };
    const MIDI = new Date("2026-10-20T12:00:00Z");
    const filtre = Col.filtreDansPlafond(MIDI);
    Hc.oublierAbsence();
    const connue = fausse((_a, rang) => ({ count: rang === 0 ? 100 : 12, error: null }));
    const lu = await Col.compterPourPlafond(connue.client, "ed", "tel-a", MIDI, "lien-1", A.id);
    ok("le plafond par PERSONNE : connue, elle se compte par sa personne (tous ses telephones), hors corbeille quel que soit qui l'a supprimee (S4), sur son lien ; jamais en `head`",
      lu?.total === 100 && lu.parAppareil === 12 && connue.appels[1]?.filtres.join(" | ") === `eq edition_id ed | or ${filtre} | eq participant_id ${A.id} | is supprimee_le | eq provenance_id lien-1 | limit 0`
        && connue.appels.every((a) => JSON.stringify(a.options) === JSON.stringify({ count: "exact" })));
    Hc.oublierAbsence();
    const sans = fausse((a) => (a.filtres.some((f) => /supprimee|participant_id/.test(f)) ? { count: null, error: { code: "42703", message: "column collectif_photos.supprimee_le does not exist" } } : { count: 3, error: null }));
    const lu2 = await Col.compterPourPlafond(sans.client, "ed", "tel-a", MIDI, null, A.id);
    ok("…sans la migration : les deux comptes se refont SANS la corbeille et par TELEPHONE (la personne ne peut pas etre connue), le depot continue",
      lu2?.total === 3 && lu2.parAppareil === 3 && sans.appels.length === 4 && sans.appels[3]?.filtres.join(" | ") === `eq edition_id ed | or ${filtre} | eq appareil_id tel-a | limit 0`
        && sans.appels[2]?.filtres.join(" | ") === `eq edition_id ed | or ${filtre} | limit 0`);
    Hc.oublierAbsence();
  }

  titre("— w1 : la vue redefinie, en memoire et en SQL —");
  {
    const p = (o: Partial<import("@/lib/collectif/resumePhotos").PhotoResumable>): import("@/lib/collectif/resumePhotos").PhotoResumable => ({
      id: randomUUID(), role_deposant: "participant", provenance_id: lien1, provenance_type: "participant", deposant: "Léa Martin", appareil_id: "tel-a", participant_id: null,
      preselection: false, signalee: false, confirmee_le: "2026-10-20T10:00:00Z", vignette_key: null, ...o,
    });
    const g = Rs.resumerPhotos([p({ participant_id: A.id }), p({ participant_id: A.id, appareil_id: "tel-b" }), p({}), p({ appareil_id: "tel-b" }), p({ role_deposant: "responsable", provenance_id: null, appareil_id: "tel-r" })]);
    const connue = g.filter((x) => x.participant_id === A.id);
    ok("la vue regroupe par PERSONNE quand elle est connue (deux telephones, une ligne, sans telephone) ; sans personne, par telephone comme avant ; le responsable sans telephone",
      connue.length === 1 && connue[0].n === 2 && connue[0].appareil_id === null && g.filter((x) => x.participant_id === null && x.role_deposant === "participant").length === 2
        && g.find((x) => x.role_deposant === "responsable")?.appareil_id === null && Rs.somme(g) === 5 && Dos.compterPersonnes(g) === 1);
    ok("la liste des personnes lit `participant_id` dans la vue ; la grille et le tableau de bord gardent les seize colonnes d'avant",
      Rs.COLONNES_RESUME_PERSONNES === `${Rs.COLONNES_RESUME}, participant_id` && !Rs.COLONNES_RESUME.includes("participant_id"));
  }
  const mig = lire("supabase/migrations/20261023_collectif_personnes_corbeille.sql");
  const ancienne = lire("supabase/migrations/20261022_collectif_resume_photos.sql");
  const sqlSeul = (s: string) => s.split("\n").filter((l) => !/^\s*--/.test(l)).join("\n");
  const colonnesDeLaVue = (s: string) => {
    const corps = sqlSeul(s).slice(sqlSeul(s).indexOf("create or replace view public.collectif_photos_resume"));
    const liste = corps.slice(corps.indexOf("select") + 6, corps.indexOf("\nfrom ("));
    const out: string[] = [];
    let prof = 0;
    let mot = "";
    for (const c of liste) {
      if (c === "(") prof++;
      if (c === ")") prof--;
      if (c === "," && prof === 0) {
        out.push(mot.trim());
        mot = "";
      } else mot += c;
    }
    out.push(mot.trim());
    return out.map((m) => (/\bas\s+(\w+)\s*$/.exec(m)?.[1] ?? m.replace(/^p\./, "")).trim());
  };
  const avant = colonnesDeLaVue(ancienne);
  const apresV = colonnesDeLaVue(mig);
  ok("`create or replace view` : les SEIZE colonnes d'avant, dans le meme ordre, puis `participant_id` EN FIN",
    avant.length === 16 && apresV.length === 17 && avant.every((c, i) => apresV[i] === c) && apresV[16] === "participant_id");
  ok("la vue ecarte la corbeille, regroupe par personne, garde `appareil_cle` (jamais un `appareil` calcule : 42702 du 20/10), reste `security_invoker` et fermee",
    /where c\.confirmee_le is not null\s+and c\.supprimee_le is null/.test(mig) && /group by p\.edition_id, p\.role_deposant, p\.provenance_id, p\.provenance_type, p\.deposant, p\.appareil_cle, p\.participant_id;/.test(mig)
      && /when c\.participant_id is null and \(c\.role_deposant = 'participant' or c\.provenance_id is not null\)\s+then c\.appareil_id\s+end as appareil_cle/.test(mig)
      && !/\bend as appareil\b/.test(mig) && /create or replace view public\.collectif_photos_resume\s+with \(security_invoker = true\)/.test(mig) && /revoke all on public\.collectif_photos_resume from anon, authenticated;/.test(mig));
  ok("migration 20261023 : atomique, idempotente, deux tables RLS sans politique fermees a anon et authenticated, colonnes sans valeur par defaut, aucune ligne ecrite, PostgREST relit",
    /^begin;$/m.test(mig) && /^commit;$/m.test(mig) && /notify pgrst, 'reload schema';/.test(mig)
      && ["collectif_participants", "collectif_participants_appareils"].every((t) => new RegExp(`create table if not exists public\\.${t} \\(`).test(mig) && new RegExp(`alter table public\\.${t} enable row level security;`).test(mig) && new RegExp(`revoke all on public\\.${t} from anon, authenticated;`).test(mig))
      && /add column if not exists participant_id uuid references public\.collectif_participants\(id\) on delete set null;/.test(mig) && /add column if not exists supprimee_le timestamptz;/.test(mig)
      && /add column if not exists supprimee_par text\s+check \(supprimee_par is null or supprimee_par in \('auteur', 'responsable', 'atelier'\)\);/.test(mig) && /alter table public\.collectif_editions\s+add column if not exists ouverture_le timestamptz;/.test(mig)
      && /constraint collectif_participants_email_unique unique \(edition_id, email\)/.test(mig) && /primary key \(edition_id, appareil_id\)/.test(mig)
      && /if not exists \(\s*select 1 from pg_constraint where conname = 'collectif_photos_corbeille_complete'/.test(mig)
      && !/\b(insert into|update public|delete from|truncate|drop )/i.test(sqlSeul(mig).replace(/'(?:[^']|'')*'/g, "''"))
      && !/add column if not exists (participant_id|supprimee_le|supprimee_par|ouverture_le)[^;]*\bdefault\b/i.test(mig));
  ok("les valeurs que le code ecrit sont celles du `check` (`supprimee_par`) ; les colonnes que le repli reconnait sont celles de la migration",
    Co.SUPPRIMEE_PAR.every((v) => mig.includes(`'${v}'`)) && Mi.COLONNES_PERSONNES.every((c) => new RegExp(`add column if not exists ${c}\\b`).test(mig)) && Mi.TABLES_PERSONNES.every((t) => mig.includes(`public.${t}`)));

  titre("— w1 : les lectures existantes ecartent la corbeille (relues dans le code) —");
  const sitesCorbeille = [
    "src/app/api/collectif/photos/route.ts",
    "src/app/api/collectif/photos/etat/route.ts",
    "src/app/api/collectif/photos/marquer/route.ts",
    "src/app/api/collectif/collecte/terminer/route.ts",
    "src/app/edition/[token]/donnees.ts",
    "src/app/admin/collectif/donnees.ts",
    "src/app/api/admin/collectif/editions/[id]/lot/route.ts",
    "src/lib/collectif/doublonsStockes.ts",
    "src/lib/collectif/participantConnu.ts",
    "src/lib/collectif/collecte.ts",
  ];
  ok(`grille, arrivees, selection, fin de collecte, tableau de bord, fiche atelier, lot, doublons, appareil, plafond (${sitesCorbeille.length} sites) : chaque lecture passe par \`lireHorsCorbeille\` et pose le filtre`,
    sitesCorbeille.every((f) => /lireHorsCorbeille\(/.test(lire(f)) && /\.is\("supprimee_le", null\)/.test(lire(f))));
  ok("aucun compte filtre sur la corbeille en `head` (un HEAD sans la colonne rend une erreur sans code) : GET `limit(0)`",
    sitesCorbeille.every((f) => {
      const code = lire(f);
      return !/head: true \}\)[^;]*\.is\("supprimee_le"/.test(code.replace(/\n\s*/g, " ")) && (!/COMPTE_SANS_LIGNE/.test(code) || /\.limit\(0\)/.test(code));
    }));
  const presign = lire("src/app/api/collectif/depot/presign/route.ts");
  ok("depot/presign : l'ouverture refuse le PARTICIPANT avant l'heure (409), avant la lecture du lot ; la personne de CE telephone avant les comptes, jamais une adresse du corps (S2) ; `participant_id` seulement connue",
    presign.indexOf("if (role === \"participant\" && !depotOuvert(edition.ouverture_le, maintenant))") > 0 && presign.indexOf("!depotOuvert(") < presign.indexOf("Array.isArray(corps.connues)")
      && /error: ERREUR_PAS_OUVERT, message: messagePasOuvert\(edition\.ouverture_le\)/.test(presign)
      && presign.indexOf("participantDeLAppareil(supabase, edition.id, appareilLu)") > 0 && presign.indexOf("participantDeLAppareil(") < presign.indexOf("compterPourPlafond(")
      && /participant\?\.id \?\? null\)/.test(presign) && /\.\.\.\(participant \? \{ participant_id: participant\.id \} : \{\}\)/.test(presign)
      && !/corps\.email|trouverParEmail|participant_inconnu|normaliserEmail/.test(presign.replace(/\/\*[\s\S]*?\*\//g, "")) && /\.\.\.\(d\.corbeille \? \{ corbeille: true \} : \{\}\)/.test(presign));
  ok("apres « Ce n'est pas toi ? », le telephone ne reprend pas le nom de la personne d'avant : seules les photos SANS personne disent le nom du telephone",
    /return \(avec \? q\.is\("participant_id", null\) : q\)\.order\("created_at", \{ ascending: false \}\)\.limit\(5\)/.test(lire("src/lib/collectif/participantConnu.ts")));
  ok("une photo a la corbeille redeclaree SANS le contexte de la page (la regle d'avant) : « deja la », ni dupliquee ni ressuscitee",
    (() => {
      const f = { cle: "a.jpg|1|2", nom: "a.jpg", taille: 1, type: "image/jpeg", tailleVignette: null, ordre: null };
      const d = Dep.planDeclaration([f], new Map([[f.cle, { id: "x", r2_key: "k", confirmee: true, corbeille: true }]]), { illimitee: true });
      return d[0].sorte === "deja" && "corbeille" in d[0] && d[0].corbeille === true;
    })());

  titre("— w1 : les routes nouvelles (relues dans le code) —");
  const rParticipant = lire("src/app/api/collectif/depot/participant/route.ts");
  const rAlbum = lire("src/app/api/collectif/depot/album/route.ts");
  const rSupprimer = lire("src/app/api/collectif/depot/supprimer/route.ts");
  const rCorbeille = lire("src/app/api/collectif/photos/corbeille/route.ts");
  const rPersonnes = lire("src/app/api/collectif/personnes/route.ts");
  const rAdmCorbeille = lire("src/app/api/admin/collectif/editions/[id]/corbeille/route.ts");
  const rAdmPersonnes = lire("src/app/api/admin/collectif/editions/[id]/personnes/route.ts");
  ok("le participant : la porte du DEPOT seulement (jamais l'espace), son droit, un frein par appelant ET par lien (S3) ; une personne ne se cree ni avant l'ouverture ni apres la cloture",
    [rParticipant, rAlbum, rSupprimer].every((f) => /chargerAcces\(String\(corps\.token \?\? ""\), "depot"\)/.test(f)) && /peut\(acces\.role, "se_presenter"\)/.test(rParticipant)
      && /creerFrein\(FREINS_DEPOT\.presenter\)/.test(rParticipant) && /const peutCreer = ouverte && ouvertureOk;/.test(rParticipant) && /identite: identite\.identite,\s*peutCreer,/.test(rParticipant)
      && /peut\(acces\.role, "voir_album"\)/.test(rAlbum) && /peut\(acces\.role, "supprimer_ses_photos"\)/.test(rSupprimer));
  ok("supprimer SES photos : le cookie du telephone EXIGE, la regle `peutSupprimerSaPhoto`, a la corbeille « par son auteur », jamais apres la cloture",
    /const appareil = appareilDeRequete\(request\);\s*if \(!appareil\)/.test(rSupprimer) && /mettreALaCorbeille\(supabase, edition\.id, ids, "auteur", null, \(p\) => peutSupprimerSaPhoto\(p, appareil, participantId\)\)/.test(rSupprimer)
      && rSupprimer.indexOf("collecteOuverte(") < rSupprimer.indexOf("mettreALaCorbeille("));
  ok("l'album : `filtreAlbum` (lien, arrivee, corbeille, accord du 20/10), le PRENOM seul, le badge et la suppression d'apres ce telephone ; rien n'est ecrit",
    /filtreAlbum\(provenanceId\)/.test(rAlbum) && /prenomPourAlbum\(/.test(rAlbum) && /peutSupprimerSaPhoto\(/.test(rAlbum) && !/\.(insert|update|upsert|delete)\(/.test(rAlbum) && !/deposant: p\.deposant,\s*$/m.test(rAlbum) && !/email/.test(rAlbum));
  ok("la corbeille du responsable : `gerer_corbeille` AVANT tout, lister compris (le lien d'equipe ne la voit pas) ; supprimer « par le responsable »",
    rCorbeille.indexOf('peut(acces.role, "gerer_corbeille")') > 0 && rCorbeille.indexOf('peut(acces.role, "gerer_corbeille")') < rCorbeille.indexOf('corps.action === "lister"')
      && /mettreALaCorbeille\(supabase, edition\.id, ids, "responsable", null\)/.test(rCorbeille) && !/effacer/.test(rCorbeille.replace(/\/\*[\s\S]*?\*\//g, "")));
  ok("les personnes : lister pour qui voit l'espace (adresse masquee au responsable, aucune a l'equipe) ; renommer et fusionner apres `gerer_personnes`",
    /chargerPersonnes\(supabase, edition\.id, acces\.role === "responsable" \? "masque" : "aucun"\)/.test(rPersonnes) && rPersonnes.indexOf('peut(acces.role, "gerer_personnes")') < rPersonnes.indexOf('corps.action === "renommer"')
      && !/defaireFusion/.test(rPersonnes));
  ok("l'atelier : l'adresse entiere, defaire une fusion, effacer pour de bon EN DEUX TEMPS (`verifier`), le journal dit qui",
    /chargerPersonnes\(supabase, id, "entier"\)/.test(rAdmPersonnes) && /defaireFusion\(supabase, id, corps\.evenement, par\)/.test(rAdmPersonnes)
      && /effacerMaintenant\(supabase, id, ids, par, corps\.verifier === true\)/.test(rAdmCorbeille) && /const par = prenomDe\(qui\);/.test(rAdmCorbeille) && /const par = prenomDe\(qui\);/.test(rAdmPersonnes));
  const releve = lire("src/app/api/atelier/mails/relever/route.ts");
  ok("la purge des 30 jours : apres la reponse de la releve (aucun cron de plus), la meme echeance que le rattrapage",
    releve.includes('after(() => import("@/lib/collectif/corbeilleServeur").then((m) => m.purgeQuotidienne(makeSupabase(), debut + ECHEANCE_RELEVE_MS)));')
      && releve.indexOf("purgeQuotidienne") > releve.indexOf("rattrapageQuotidien") && (JSON.parse(lire("vercel.json")) as { crons: unknown[] }).crons.length === 2);
  const serveur = lire("src/lib/collectif/corbeilleServeur.ts");
  /* Audit du 20/10 (S7) : l'ordre est RENVERSE. L'intention au journal, puis la LIGNE (re-controlee, qui rend ses
     cles), PUIS le coffre, et seulement pour les lignes parties. Prouve aussi contre une fausse base (section « durcissement »). */
  const paquetSrc = serveur.slice(serveur.indexOf("async function effacerPaquet("), serveur.indexOf("export async function effacer("));
  const iIntention = paquetSrc.indexOf("journaliserId(supabase, { editionId }, EVT_OBJETS_A_EFFACER");
  const iLigne = paquetSrc.indexOf("supprimerLignes(supabase, editionId,");
  const iCoffre = paquetSrc.indexOf("viderObjets(");
  ok("effacer : l'INTENTION au journal, puis la LIGNE (encore a la corbeille, et pour la purge encore vieille de 30 jours) qui rend ses cles, PUIS le coffre des seules lignes parties (S7)",
    iIntention > 0 && iLigne > iIntention && iCoffre > iLigne && /if \(!intention\) \{/.test(paquetSrc)
      && /\.delete\(\)\.eq\("edition_id", editionId\)\.in\("id", \[\.\.\.liste\]\)\.not\("supprimee_le", "is", null\)/.test(serveur) && /\(avant \? q\.lt\("supprimee_le", avant\) : q\)\.select\("id, r2_key, vignette_key"\)/.test(serveur)
      && /lignes\.valeur\.map\(\(l\) => \(\{ id: l\.id, objets: lireClesObjets\(objetsDeLaPhoto\(l, editionId\), editionId\) \}\)\)/.test(paquetSrc));
  ok("chaque geste de corbeille vide le cache des doublons et se journalise",
    (serveur.match(/await invaliderDoublons\(supabase, editionId\);/g) ?? []).length === 3 && /journaliser\(supabase, \{ editionId \}, EVT_SUPPRIMEES/.test(serveur) && /journaliser\(supabase, \{ editionId \}, EVT_RESTAUREES/.test(serveur) && /journaliser\(supabase, \{ editionId \}, EVT_EFFACEES/.test(serveur));
  {
    const avant = process.env.COLLECTIF_OUVERT;
    delete process.env.COLLECTIF_OUVERT;
    let touche = false;
    const muette = { from: () => { touche = true; throw new Error("aucune lecture attendue"); } } as unknown as Parameters<typeof Cs.purgeQuotidienne>[0];
    const rp = await Cs.purgeQuotidienne(muette, Date.now() + 1000);
    if (avant === undefined) delete process.env.COLLECTIF_OUVERT;
    else process.env.COLLECTIF_OUVERT = avant;
    ok("la purge sans COLLECTIF_OUVERT : rien, sans meme lire la base", rp === null && !touche);
  }
  ok("le journal dit chaque geste en francais", [
    phraseEvenement("photos_supprimees", { n: 3, par: "auteur" }) === "3 photo(s) mise(s) à la corbeille par leur auteur.",
    phraseEvenement("photos_effacees", { n: 2, par: "purge" }).includes("30 jours"),
    phraseEvenement("personnes_fusionnees", { nomPart: "Lea", nomAvant: "Léa Martin", nomApres: "Léa Martin", n: 6 }).includes("« Lea » rejoint « Léa Martin »"),
    phraseEvenement("personne_renommee", { avant: "Léa", apres: "Léa Martin", n: 4 }).includes("« Léa » devient « Léa Martin »"),
    ["participant_presente", "telephone_oublie", "fusion_defaite", "photos_restaurees", "photos_marquees"].every((t) => phraseEvenement(t, { n: 1, prenom: "Léa" }) !== t),
  ].every(Boolean));

  titre("— w1 : se presenter, contre une fausse base (personnesServeur.ts) —");
  {
    type Ecrit = { table: string; quoi: string; ligne?: Record<string, unknown> };
    const fausseBase = (connue: import("@/lib/collectif/personnes").LigneParticipant | null) => {
      const ecrits: Ecrit[] = [];
      const lecture = (rendu: unknown) => {
        const q: Record<string, unknown> = {};
        for (const m of ["select", "eq", "in", "not", "is", "order", "limit"]) q[m] = () => q;
        q.maybeSingle = async () => ({ data: rendu, error: null });
        q.single = async () => ({ data: rendu, error: null });
        q.then = (oui: (r: unknown) => unknown) => Promise.resolve({ data: [], error: null }).then(oui);
        return q;
      };
      const client = {
        from: (table: string) => ({
          select: () => lecture(table === "collectif_participants" ? connue : null),
          insert: (ligne: Record<string, unknown>) => {
            ecrits.push({ table, quoi: "insert", ligne });
            const cree = { ...ligne, id: randomUUID(), created_at: "x", vu_le: "x", renomme_le: null, fusionne_dans: null, fusionne_le: null };
            return { select: () => ({ single: async () => ({ data: cree, error: null }) }), then: (oui: (r: unknown) => unknown) => Promise.resolve({ error: null }).then(oui) };
          },
          upsert: async (ligne: Record<string, unknown>) => (ecrits.push({ table, quoi: "upsert", ligne }), { error: null }),
          update: (ligne: Record<string, unknown>) => (ecrits.push({ table, quoi: "update", ligne }), { eq: async () => ({ error: null }) }),
        }),
      };
      return { client: client as unknown as Parameters<typeof Ps.presenter>[0], ecrits };
    };
    const vide = fausseBase(null);
    const q1 = await Ps.presenter(vide.client, { editionId: edId, email: "lea@a.fr", identite: null, provenanceId: lien1, appareil: "A".repeat(22) });
    ok("une adresse inconnue SANS prenom ni nom : « inconnu », et RIEN n'est ecrit", q1.statut === "inconnu" && vide.ecrits.length === 0);
    const neuve = fausseBase(null);
    const q2 = await Ps.presenter(neuve.client, { editionId: edId, email: "lea@a.fr", identite: { prenom: "Léa", nom: "Martin" }, provenanceId: lien1, appareil: "A".repeat(22) });
    ok("une adresse inconnue AVEC prenom et nom : la personne, puis CE telephone parle pour elle, puis le journal (adresse masquee)",
      q2.statut === "cree" && neuve.ecrits.map((e) => `${e.table}:${e.quoi}`).join() === "collectif_participants:insert,collectif_participants_appareils:upsert,collectif_evenements:insert"
        && neuve.ecrits[2].ligne?.type === "participant_presente" && (neuve.ecrits[2].ligne?.payload as Record<string, unknown>).a === "l***@a.fr" && !JSON.stringify(neuve.ecrits[2].ligne).includes("lea@a.fr"));
    const deja = fausseBase(A);
    const q3 = await Ps.presenter(deja.client, { editionId: edId, email: "léa@a.fr", identite: { prenom: "Autre", nom: "Nom" }, provenanceId: null, appareil: "B".repeat(22) });
    ok("une adresse connue : sa personne, le nom envoye IGNORE (le participant ne se renomme pas), aucune personne creee ; la presentation se journalise (S5)",
      q3.statut === "connu" && q3.participant.id === A.id && q3.nomIgnore && !deja.ecrits.some((e) => e.table === "collectif_participants" && e.quoi === "insert")
        && deja.ecrits.some((e) => e.table === "collectif_participants_appareils" && e.quoi === "upsert") && deja.ecrits.some((e) => e.table === "collectif_evenements" && e.ligne?.type === "participant_retrouve"));
    const absente = { from: () => ({ select: () => { const q: Record<string, unknown> = {}; for (const m of ["eq"]) q[m] = () => q; q.maybeSingle = async () => ({ data: null, error: { code: "PGRST205", message: "Could not find the table 'public.collectif_participants' in the schema cache" } }); return q; } }) } as unknown as Parameters<typeof Ps.presenter>[0];
    const q4 = await silence(() => Ps.presenter(absente, { editionId: edId, email: "lea@a.fr", identite: { prenom: "L", nom: "M" }, provenanceId: null, appareil: "A".repeat(22) }));
    ok("sans la migration : « absente » (la route repond 503 et le nomme), rien d'ecrit", q4.statut === "absente");
  }
}


/* ════════════════════════════ LA PAGE PHOTOS DU RESPONSABLE (planches 1, 2, 3 du 20/10, T-193, T-199) ════════════════════════════ */

titre("— 20/10 : la page Photos du responsable, des listes qui filtrent, cocher, agrandir —");
{
  const F = FiltresPhotos;
  const V = F.FILTRES_VIDES;
  const L = "lien:0b1f3c2e-4a5b-4c6d-8e9f-001122334455";
  /* Les listes, traduites pour la route existante : la clé la plus précise gagne, « Ma sélection » est un dossier à part, Doublons une vue. */
  const q = (f: Partial<FiltresPhotos.Filtres>) => F.requeteDe({ ...V, ...f });
  ok("listes → route : rien = tout ; « Par lien » = les albums ; un lien, sa personne, un dossier du responsable : la clé la plus précise",
    JSON.stringify(q({})) === '{"dossier":"tout","vue":"toutes"}' && q({ mode: "liens" }).dossier === "liens" && q({ lien: L }).dossier === L
      && q({ lien: L, personne: "pers:x:léa" }).dossier === "pers:x:léa" && q({ lien: "vous", dossier: "resp:organisateur:La soirée" }).dossier === "resp:organisateur:La soirée");
  ok("listes → route : « Ma sélection » l'emporte sur tout ; « Doublons » est une vue qui se croise ; un jour ou l'ordre « Par jour » lisent la vue rangée par jour",
    q({ lien: L, selection: true }).dossier === "selection" && q({ lien: L, doublons: true }).vue === "doublons" && q({ lien: L, doublons: true }).dossier === L
      && q({ jour: "2026-11-07" }).vue === "jour" && q({ ordre: "jour" }).vue === "jour");
  ok("choisir un lien retire « Ma sélection » (elle ne se croise pas) ; choisir « Ma sélection » retire lien, dossier et personne",
    !F.avecLien({ ...V, selection: true }, L).selection && F.avecLien({ ...V, personne: "pers:a:b" }, L).personne === null
      && JSON.stringify(F.avecSelection({ ...V, lien: L, personne: "pers:a:b", dossier: "resp:organisateur:" }, true)) === JSON.stringify({ ...V, selection: true }));
  const cles = ["selection", "liens", "vous", "participants", "atelier", L, "resp:organisateur:La soirée", "pers:0b1f3c2e-4a5b-4c6d-8e9f-001122334455:léa martin", "pers:general:camille roux", "qui:léa martin", "qui:@responsable"];
  ok("`?dossier=` du tableau de bord : chaque clé se relit en listes et redonne la MÊME clé à la route (tout, liens, lien, personne, dossier)",
    cles.every((c) => F.requeteDe(F.filtresDepuis(c)).dossier === c) && F.requeteDe(F.filtresDepuis("tout")).dossier === "tout" && F.requeteDe(F.filtresDepuis("n'importe quoi")).dossier === "tout");
  ok("l'adresse garde l'endroit : un lien coché dans « Tout » se rouvre dans « Tout » (`mode=tout`) ; « Par lien » se rouvre en albums",
    F.adresseDe({ ...V, lien: L }) === `?dossier=${encodeURIComponent(L)}&mode=tout` && F.filtresDepuis(L, true).mode === "tout" && F.filtresDepuis(L).mode === "liens"
      && F.adresseDe(V) === "" && F.adresseDe({ ...V, mode: "liens" }) === "?dossier=liens");
  /* Le jour : filtré dans le navigateur sur les pages rangées par jour ; un nombre ne s'affiche que COMPLET. */
  const ph = (jourCle: string) => ({ jourCle });
  const j1 = F.joursVus([ph("2026-11-06"), ph("2026-11-06"), ph("2026-11-07")], false);
  const j2 = F.joursVus([ph("2026-11-06"), ph("2026-11-07")], true);
  ok("les jours lus : un jour est complet quand le suivant a commencé ou que la vue est lue jusqu'au bout (aucun nombre deviné)",
    j1.length === 2 && j1[0].n === 2 && j1[0].complet && !j1[1].complet && j2.every((j) => j.complet));
  ok("un jour choisi : on lit la page suivante tant que le dernier cliché lu n'a pas passé ce jour ; plus rien à lire = on s'arrête",
    F.jourEncoreALire([ph("2026-11-06")], "2026-11-06", 1, true) && !F.jourEncoreALire([ph("2026-11-07")], "2026-11-06", 1, true) && !F.jourEncoreALire([ph("2026-11-06")], "2026-11-06", null, true)
      && F.jourEncoreALire([ph("2026-11-07")], "2026-11-06", 1, false));
  ok("les jours se lisent SANS fuseau : « samedi 7 novembre », « sam. 7 nov. », une photo sans date dit son jour d'arrivée",
    F.jourLong("2026-11-07") === "samedi 7 novembre" && F.jourCourt("2026-11-07") === "sam. 7 nov." && F.jourLong("2026-11-01") === "dimanche 1er novembre" && F.jourLong("~2026-10-18") === "Sans date, arrivées le 18 octobre");
  ok("l'arrivée à l'heure de Paris (hiver comme été) : « samedi 7 novembre, 14 h 32 » (heure d hiver), « sam. 17 oct., 9 h 05 » (heure d été)",
    F.arriveeLongue("2026-11-07T13:32:00Z") === "samedi 7 novembre, 14 h 32" && F.arriveeCourte("2026-10-17T07:05:00Z") === "sam. 17 oct., 9 h 05" && F.arriveeLongue("pas une date") === "");
  ok("le téléphone : « 12 nouvelles · Léa, Hugo et 1 autre », les initiales sur les vignettes",
    F.annonceCourte(12, ["Léa Martin", "Hugo Lefèvre", "Sarah Cohen"], 3) === "12 nouvelles · Léa, Hugo et 1 autre" && F.annonceCourte(1, ["Léa Martin"], 1) === "1 nouvelle · Léa"
      && F.annonceCourte(2, ["Sans nom"], 1) === "2 nouvelles" && F.initialesDe("Léa Martin") === "LM" && F.initialesDe("Sans nom") === "?" && F.initialesDe("Zoé") === "ZO");
  const noeud = (cle: string, nom: string, enfants: Dossiers.Noeud[] = [], n = 1): Dossiers.Noeud => ({ cle, nom, n, enfants, renommable: false, deplacable: false, accueille: false });
  const arbreF: Dossiers.Arbre = {
    vous: [noeud("resp:organisateur:", "Mes photos", [], 4)],
    liens: [noeud("participants", "Tous les participants"), noeud("lien:b10", "Bateau 10", [noeud("pers:b10:léa martin", "Léa Martin")]), noeud("lien:b2", "Bateau 2", [noeud("pers:b2:léa martin", "Léa Martin"), noeud("pers:b2:hugo", "Hugo")])],
    atelier: noeud("atelier", "L'atelier"),
    personnes: [],
  };
  ok("l'ordre des liens : par nom naturel (« Bateau 2 » avant « Bateau 10 »), puis le lien général, « Mes photos », l'atelier",
    F.liensDansLOrdre(arbreF, true).map((x) => x.cle).join() === "lien:b2,lien:b10,participants,vous,atelier" && F.lienDe(arbreF, "vous", true)?.n === 4);
  ok("la photo agrandie dit son lien sans deviner : le lien ouvert, sinon le SEUL lien où ce nom apparaît ; deux « Léa Martin » = rien",
    F.lienDeLaPhoto(arbreF, { role: "participant", qui: "Hugo" }, undefined) === "Bateau 2" && F.lienDeLaPhoto(arbreF, { role: "participant", qui: "Léa Martin" }, undefined) === null
      && F.lienDeLaPhoto(arbreF, { role: "participant", qui: "Léa Martin" }, arbreF.liens[1]) === "Bateau 10" && F.lienDeLaPhoto(arbreF, { role: "responsable", qui: "M" }, undefined) === "Mes photos");

  const page = lirePagePhotos();
  const grilleTsx = lire("src/app/edition/[token]/photos/Grille.tsx");
  const agrandir = lire("src/app/edition/[token]/photos/Agrandir.tsx");
  const collecteTsx = lire("src/app/edition/[token]/photos/Collecte.tsx");
  const css = lire("src/app/edition/[token]/photos/photos.css");
  ok("toucher une photo l'AGRANDIT (le mode « cocher » coche) ; l'étoile garde Ma sélection en un clic ; l'appui long ouvre « cocher » au téléphone",
    /if \(g\.cocher && g\.ecrire\) g\.onCocher\(ph\.id, e\.shiftKey\);\s*else g\.onOuvrir\(ph\.id\);/.test(grilleTsx) && /onOuvrir=\{setAgrandi\}/.test(collecteTsx) && /onEtoile=\{\(ph\) => void basculer\(ph\)\}/.test(collecteTsx)
      && /APPUI_LONG_MS = 450/.test(grilleTsx) && /g\.onAppuiLong\(ph\.id\)/.test(grilleTsx) && /-webkit-touch-callout: none/.test(css));
  ok("la photo agrandie : précédente / suivante au clavier, balayage au téléphone, Échap ferme ; ouverte DANS la colonne de contenu (portail) ; qui, quel lien, quand",
    /e\.key === "ArrowLeft"/.test(agrandir) && /e\.key === "ArrowRight"/.test(agrandir) && /e\.key === "Escape"/.test(agrandir) && /onTouchEnd=/.test(agrandir) && /Math\.abs\(dx\) > 50/.test(agrandir)
      && /document\.querySelector\("\.ec-contenu"\)/.test(agrandir) && /createPortal\(vue, hote\)/.test(agrandir) && /<dt>Lien<\/dt>/.test(agrandir) && /<dt>Arrivée<\/dt>/.test(agrandir) && /<dt>Prise<\/dt>/.test(agrandir));
  /* Lot w2 : la même intention (Ne pas publier réversible) ; « Supprimer » a désormais son bouton, branché sur la corbeille, jamais pour l'équipe. */
  ok("« Ne pas publier » passe par la route existante (`signalee`), réversible (« Annuler ») ; « Supprimer » (lot w2) n'existe que pour le responsable",
    /signalee: oui/.test(collecteTsx) && /marquerLot\(a\.map\(\(x\) => x\.id\), \{ signalee: true \}\)/.test(collecteTsx) && /marquerLot\(faites, \{ signalee: false \}\)/.test(collecteTsx) && /Annuler/.test(collecteTsx)
      && /a\.onSupprimer \?/.test(agrandir) && /onSupprimer=\{p\.ecrire \? /.test(collecteTsx));
  const appels = [...page.matchAll(/(?:fetch|appeler)\("(\/api\/[^"]+)"/g)].map((m) => m[1]);
  /* Lot w2 : la corbeille et les personnes (les routes du lot w1-fondations) s'ajoutent à la liste. */
  const permis = new Set(["/api/collectif/photos", "/api/collectif/photos/etat", "/api/collectif/photos/marquer", "/api/collectif/dossiers", "/api/collectif/provenances", "/api/collectif/plafond", "/api/collectif/photos/corbeille", "/api/collectif/personnes"]);
  ok(`la page n'appelle que les routes EXISTANTES (${[...new Set(appels)].length} adresses : photos, etat, marquer, dossiers, provenances, plafond, corbeille, personnes)`, appels.length > 0 && appels.every((a) => permis.has(a)));
  ok("le lien d'équipe n'écrit rien : ni case, ni étoile qui écrive, ni barre d'actions, ni geste dans la photo agrandie, ni dépôt",
    /\{g\.ecrire \? \(\s*<button\s*type="button"\s*className="ec-ph-t-case"/.test(grilleTsx) && /\{p\.ecrire && nbCoches > 0 \? \(\s*<div className="ec-ph-barre-actions/.test(collecteTsx) && /\{a\.ecrire \? \(\s*<div className="ec-ag-gestes">/.test(agrandir)
      && /const cocherActif = p\.ecrire && /.test(collecteTsx) && /\{p\.ecrire && p\.ouverte && envoi\.ouvrir && !cocherActif && !envoiVisible( && !ecranPropre)? \?/.test(collecteTsx));
  const tel = css.slice(css.indexOf("@media (max-width: 860px) {\n  /* La page défile"));
  ok("téléphone : rien ne défile de côté (aucun overflow-x), 4 colonnes, la barre collée en haut, la barre d'actions fixe sous le pouce, la feuille du bas ; pas de dvh",
    tel.length > 1000 && !/overflow-x/.test(tel) && /grid-template-columns: repeat\(4, minmax\(0, 1fr\)\);\s*gap: 2px;/.test(tel) && /\.ec-ph-moutils,\s*\.ec-espace \.ec-ph-barre-cocher \{\s*position: sticky;/.test(tel)
      && /\.ec-ph-bas \{\s*position: fixed;/.test(tel) && /\.ec-ph-feuille \{\s*position: absolute;/.test(tel) && !/dvh/.test(css));
  ok("les chiffres en Cormorant passent en chiffres modernes (« Bateau 1 », jamais « Bateau I »)",
    /\.ec-espace \.ec-collecte,\s*\.ec-espace \.ec-ag,[^{]*\{\s*font-variant-numeric: lining-nums;\s*font-feature-settings: "lnum" 1;/.test(css));
  ok("la grille garde ses performances : 120 par page, l'IntersectionObserver sur SA zone, la tuile hors écran ne se peint pas",
    /root: racine/.test(collecteTsx) && /content-visibility: auto;/.test(css) && /charger\(suivante, f\)/.test(collecteTsx) && Grille.TAILLE_PAGE === 120);
}


/* ═══════════════ Le durcissement du lot w1 (audit de sécurité du 20/10, avant la migration 20261023) ═══════════════ */

/**
 * Une liste `in` lue comme PostgREST la lit (`("a","b\"c",d)`) : une valeur entre guillemets doubles, où `\x`
 * vaut `x`, ou une valeur nue jusqu'à la virgule. `null` : illisible (PostgREST répondrait 400). La grammaire
 * a été vérifiée le 20/10 contre la vraie base, en lecture seule (comptes `limit(0)` sur `collectif_editions`).
 */
function lireListePostgrest(v: string): string[] | null {
  if (!v.startsWith("(") || !v.endsWith(")")) return null;
  const s = v.slice(1, -1);
  if (s === "") return [];
  const out: string[] = [];
  let i = 0;
  for (;;) {
    if (s[i] === '"') {
      let val = "";
      i++;
      while (i < s.length && s[i] !== '"') {
        if (s[i] === "\\" && i + 1 < s.length) {
          val += s[i + 1];
          i += 2;
        } else {
          val += s[i];
          i++;
        }
      }
      if (s[i] !== '"') return null;
      i++;
      out.push(val);
    } else {
      let j = i;
      while (j < s.length && s[j] !== ",") j++;
      out.push(s.slice(i, j));
      i = j;
    }
    if (i >= s.length) return out;
    if (s[i] !== ",") return null;
    i++;
  }
}

/** Ce que `.in(colonne, valeurs)` de postgrest-js 2.x met dans l'URL (sa source, relue le 20/10) : des guillemets autour d'une valeur qui porte `,()` seulement, rien d'échappé. */
function listeDePostgrestJs(valeurs: readonly string[]): string {
  return `(${[...new Set(valeurs)].map((s) => (/[,()]/.test(s) ? `"${s}"` : s)).join(",")})`;
}

type LigneMem = Record<string, unknown>;
type RenduMem = { data: unknown; error: { code: string; message: string } | null; count?: number | null };
type PanneMem = (q: { table: string; op: string; lignes: LigneMem[]; payload: unknown }) => { code: string; message: string } | null;
type RequeteMem = {
  select(c?: string, o?: Record<string, unknown>): RequeteMem;
  insert(p: unknown): RequeteMem;
  update(p: unknown, o?: Record<string, unknown>): RequeteMem;
  upsert(p: unknown, o?: Record<string, unknown>): RequeteMem;
  delete(): RequeteMem;
  eq(c: string, v: unknown): RequeteMem;
  is(c: string, v: unknown): RequeteMem;
  not(c: string, op: string, v: unknown): RequeteMem;
  in(c: string, v: readonly unknown[]): RequeteMem;
  filter(c: string, op: string, v: string): RequeteMem;
  or(s: string): RequeteMem;
  lt(c: string, v: string): RequeteMem;
  gt(c: string, v: string): RequeteMem;
  order(c: string, o?: { ascending?: boolean }): RequeteMem;
  range(de: number, a: number): RequeteMem;
  limit(n: number): RequeteMem;
  returns(): RequeteMem;
  maybeSingle(): Promise<RenduMem>;
  single(): Promise<RenduMem>;
  then<T>(oui: (r: RenduMem) => T, non?: (e: unknown) => T): Promise<T>;
};

/**
 * Une FAUSSE BASE en mémoire, qui lit les filtres comme PostgREST : `.in()` passe par ce que postgrest-js en fait
 * vraiment (`listeDePostgrestJs`), `.filter(c, "in", …)` et `.or(…)` par `lireListePostgrest`. Les écritures
 * s'appliquent aux tableaux ; `trace` garde l'ordre des gestes ; `panne` refuse un geste choisi.
 */
function baseEnMemoire(tables: Record<string, LigneMem[]>, panne: PanneMem = () => null) {
  const trace: string[] = [];
  let horloge = Date.parse("2026-10-20T08:00:00.000Z");
  const instant = () => new Date((horloge += 1000)).toISOString();
  const table = (t: string) => (tables[t] ??= []);
  const condition = (c: string): ((l: LigneMem) => boolean) => {
    const m = /^([a-z0-9_]+)\.(not\.is|is|eq|neq|in|gt|lt)\.([\s\S]*)$/.exec(c);
    if (!m) throw new Error(`fausse base : condition illisible ${c}`);
    const [, col, op, val] = m;
    if (op === "is") return (l) => l[col] === null || l[col] === undefined;
    if (op === "not.is") return (l) => l[col] !== null && l[col] !== undefined;
    if (op === "eq") return (l) => String(l[col]) === val;
    if (op === "neq") return (l) => l[col] !== null && l[col] !== undefined && String(l[col]) !== val;
    if (op === "gt") return (l) => l[col] !== null && l[col] !== undefined && String(l[col]) > val;
    if (op === "lt") return (l) => l[col] !== null && l[col] !== undefined && String(l[col]) < val;
    const liste = lireListePostgrest(val);
    if (!liste) throw new Error(`fausse base : liste illisible ${val}`);
    return (l) => l[col] !== null && l[col] !== undefined && liste.includes(String(l[col]));
  };
  const decouperOu = (s: string): string[] => {
    const out: string[] = [];
    let prof = 0;
    let guillemet = false;
    let mot = "";
    for (let i = 0; i < s.length; i++) {
      const ch = s[i];
      if (guillemet) {
        mot += ch;
        if (ch === "\\") mot += s[++i] ?? "";
        else if (ch === '"') guillemet = false;
        continue;
      }
      if (ch === '"') guillemet = true;
      if (ch === "(") prof++;
      if (ch === ")") prof--;
      if (ch === "," && prof === 0) {
        out.push(mot);
        mot = "";
        continue;
      }
      mot += ch;
    }
    out.push(mot);
    return out;
  };
  const requete = (t: string): RequeteMem => {
    let op = "select";
    let payload: unknown = null;
    let options: Record<string, unknown> | undefined;
    let rendre = false;
    const filtres: ((l: LigneMem) => boolean)[] = [];
    const tri: { c: string; asc: boolean }[] = [];
    let de = 0;
    let a = Infinity;
    let limite = Infinity;
    const executer = async (unique: "single" | "maybe" | null): Promise<RenduMem> => {
      const lignes = table(t);
      const visees = op === "insert" || op === "upsert" ? [] : lignes.filter((l) => filtres.every((f) => f(l)));
      const err = panne({ table: t, op, lignes: visees, payload });
      if (err) return { data: null, error: err, count: null };
      let data: LigneMem[];
      if (op === "insert" || op === "upsert") {
        const nouvelles: LigneMem[] = (Array.isArray(payload) ? payload : [payload]).map((p) => ({ id: randomUUIDMem(), created_at: instant(), ...(p as LigneMem) }));
        if (op === "upsert") {
          const cles = String(options?.onConflict ?? "id").split(",");
          for (const n of nouvelles) {
            const i = lignes.findIndex((l) => cles.every((k) => l[k] === n[k]));
            if (i >= 0) lignes[i] = { ...lignes[i], ...n };
            else lignes.push(n);
          }
        } else lignes.push(...nouvelles);
        trace.push(`${op}:${t}${t === "collectif_evenements" ? `:${nouvelles.map((n) => String(n.type)).join("+")}` : ""}`);
        data = nouvelles;
      } else if (op === "update") {
        for (const l of visees) Object.assign(l, payload as LigneMem);
        trace.push(`update:${t}:${visees.length}`);
        data = visees;
      } else if (op === "delete") {
        for (const l of visees) lignes.splice(lignes.indexOf(l), 1);
        trace.push(`delete:${t}:${visees.length}`);
        data = visees;
      } else {
        data = [...visees];
        for (const k of [...tri].reverse()) {
          data.sort((x, y) => {
            const vx = String(x[k.c] ?? "");
            const vy = String(y[k.c] ?? "");
            return (vx < vy ? -1 : vx > vy ? 1 : 0) * (k.asc ? 1 : -1);
          });
        }
        trace.push(`select:${t}`);
      }
      const count = options?.count === "exact" ? data.length : null;
      if (op === "select") data = data.slice(de, Math.min(a + 1, de + limite));
      else if (!rendre) data = [];
      const copie = data.map((l) => ({ ...l }));
      if (unique) {
        const d = copie[0] ?? null;
        if (unique === "single" && !d) return { data: null, error: { code: "PGRST116", message: "aucune ligne" } };
        return { data: d, error: null };
      }
      return { data: copie, error: null, count };
    };
    const q: RequeteMem = {
      select(_c, o) {
        if (op === "select") options = o;
        else rendre = true;
        return q;
      },
      insert(p) {
        op = "insert";
        payload = p;
        return q;
      },
      update(p, o) {
        op = "update";
        payload = p;
        options = o;
        return q;
      },
      upsert(p, o) {
        op = "upsert";
        payload = p;
        options = o;
        return q;
      },
      delete() {
        op = "delete";
        return q;
      },
      eq(c, v) {
        filtres.push((l) => String(l[c]) === String(v));
        return q;
      },
      is(c) {
        filtres.push((l) => l[c] === null || l[c] === undefined);
        return q;
      },
      not(c, o) {
        if (o !== "is") throw new Error(`fausse base : not ${o}`);
        filtres.push((l) => l[c] !== null && l[c] !== undefined);
        return q;
      },
      in(c, v) {
        const liste = lireListePostgrest(listeDePostgrestJs(v.map(String))) ?? [];
        filtres.push((l) => l[c] !== null && l[c] !== undefined && liste.includes(String(l[c])));
        return q;
      },
      filter(c, o, v) {
        filtres.push(condition(`${c}.${o}.${v}`));
        return q;
      },
      or(s) {
        const conds = decouperOu(s).map(condition);
        filtres.push((l) => conds.some((f) => f(l)));
        return q;
      },
      lt(c, v) {
        filtres.push(condition(`${c}.lt.${v}`));
        return q;
      },
      gt(c, v) {
        filtres.push(condition(`${c}.gt.${v}`));
        return q;
      },
      order(c, o) {
        tri.push({ c, asc: o?.ascending !== false });
        return q;
      },
      range(x, y) {
        de = x;
        a = y;
        return q;
      },
      limit(n) {
        limite = n;
        return q;
      },
      returns() {
        return q;
      },
      maybeSingle: () => executer("maybe"),
      single: () => executer("single"),
      then: (oui, non) => executer(null).then(oui, non),
    };
    return q;
  };
  return { client: { from: (t: string) => requete(t) }, tables, trace };
}

let compteurMem = 0;
/** Un uuid prévisible (le harnais relit l'ordre des gestes, pas les valeurs). */
function randomUUIDMem(): string {
  compteurMem++;
  return `00000000-0000-4000-8000-${String(compteurMem).padStart(12, "0")}`;
}

async function verifDurcissement() {
  const Pe = await import("@/lib/collectif/personnes");
  const Co = await import("@/lib/collectif/corbeille");
  const Cs = await import("@/lib/collectif/corbeilleServeur");
  const Ps = await import("@/lib/collectif/personnesServeur");
  const Col = await import("@/lib/collectif/collecte");
  const Al = await import("@/lib/collectif/album");
  const Fr = await import("@/lib/collectif/freins");
  const Ga = await import("@/lib/compte/garde");
  const Li = await import("@/lib/collectif/lignes");
  const Dos = await import("@/lib/collectif/dossiers");
  const Hc = await import("@/lib/collectif/horsCorbeille");
  const { phraseEvenement } = await import("@/lib/collectif/recit");
  type Client = Parameters<typeof Cs.effacer>[0];
  const comme = (c: { from: (t: string) => RequeteMem }) => c as unknown as Client;
  const silence = async <R>(f: () => Promise<R>): Promise<R> => {
    const [e, l] = [console.error, console.log];
    console.error = () => {};
    console.log = () => {};
    try {
      return await f();
    } finally {
      console.error = e;
      console.log = l;
    }
  };
  const sansCommentaires = (s: string) => s.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
  const ED = "11111111-2222-4333-8444-555555555555";
  const LIEN = "aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee";
  const uuid = (n: number) => `99999999-0000-4000-8000-${String(n).padStart(12, "0")}`;

  /* ─────────────── S8 : un texte de client dans un `in` ─────────────── */
  titre("— durcissement S8 : un texte venu d'un client dans un filtre `in` (lignes.ts, `listeIn`) —");
  const piege = 'Zed","Léa Martin';
  ok("ce que fait `.in()` de postgrest-js (prouve le 20/10 sur la vraie base) : `Zed\",\"Léa Martin` part en DEUX valeurs, `\"Bob\"` perd ses guillemets",
    JSON.stringify(lireListePostgrest(listeDePostgrestJs([piege]))) === JSON.stringify(["Zed", "Léa Martin"]) && JSON.stringify(lireListePostgrest(listeDePostgrestJs(['"Bob"']))) === JSON.stringify(["Bob"]));
  const delicats = [piege, '"Bob"', "Martin (Léa), fils", "a\\b", 'x\\"y', "Léa", "", " espace ", "virgule,", "(", ")"];
  ok("`listeIn` : chaque valeur citee ET echappee revient TELLE QUELLE (guillemets, barre oblique inverse, virgule, parentheses, espaces), sans doublon",
    delicats.every((v) => JSON.stringify(lireListePostgrest(Li.listeIn([v]))) === JSON.stringify([v])) && JSON.stringify(lireListePostgrest(Li.listeIn(delicats))) === JSON.stringify(delicats)
      && Li.listeIn(["a", "a"]) === '("a")' && Li.citerPostgrest('a"b\\c') === '"a\\"b\\\\c"');
  {
    const photo = (id: number, deposant: string) => ({ id: uuid(id), edition_id: ED, deposant, role_deposant: "participant", provenance_id: LIEN, participant_id: null, created_at: `2026-10-20T10:00:${String(id).padStart(2, "0")}.000Z` });
    const photos = [photo(1, piege), photo(2, piege), photo(3, "Léa Martin"), photo(4, "Léa Martin"), photo(5, "Léa Martin"), photo(6, '"Bob"'), photo(7, "Bob"), photo(8, "Martin (Léa), fils"), photo(9, "Martin")];
    const resume = [...new Set(photos.map((p) => p.deposant))].map((d, i) => ({ id: `g${i}`, edition_id: ED, deposant: d, role_deposant: "participant", provenance_id: LIEN, participant_id: null }));
    const base = baseEnMemoire({ collectif_photos: photos.map((p) => ({ ...p })), collectif_photos_resume: resume });
    const deposants = () => Object.fromEntries((base.tables.collectif_photos ?? []).map((p) => [String(p.id).slice(-2), String(p.deposant)]));
    const r1 = await silence(() => Ps.renommerPersonne(comme(base.client), ED, { genre: "nom", cle: Dos.clePersonne(piege) }, { prenom: "Zed", nom: "Durand" }, null));
    const apres1 = deposants();
    ok("renommer `Zed\",\"Léa Martin` ne touche QUE ses deux photos : Léa Martin garde les siennes",
      r1.statut === "ok" && r1.n === 2 && apres1["01"] === "Zed Durand" && apres1["02"] === "Zed Durand" && ["03", "04", "05"].every((k) => apres1[k] === "Léa Martin"));
    const r2 = await silence(() => Ps.renommerPersonne(comme(base.client), ED, { genre: "nom", cle: Dos.clePersonne('"Bob"') }, { prenom: "Robert", nom: "Guillemets" }, null));
    const apres2 = deposants();
    ok("`\"Bob\"` reste renommable (ses guillemets font partie du nom) et le vrai « Bob » n'est pas touche",
      r2.statut === "ok" && r2.n === 1 && apres2["06"] === "Robert Guillemets" && apres2["07"] === "Bob");
    const r3 = await silence(() => Ps.renommerPersonne(comme(base.client), ED, { genre: "nom", cle: Dos.clePersonne("Martin (Léa), fils") }, { prenom: "Léa", nom: "Fils" }, null));
    const apres3 = deposants();
    ok("un nom avec virgule et parentheses se renomme seul (« Martin » a cote ne bouge pas)", r3.statut === "ok" && r3.n === 1 && apres3["08"] === "Léa Fils" && apres3["09"] === "Martin");
    const reprise = baseEnMemoire({ collectif_photos: [{ id: uuid(20), edition_id: ED, r2_key: "k", cle_fichier: "victime.jpg|1|2", confirmee_le: "2026-10-20T10:00:00Z" }] });
    Hc.oublierAbsence();
    const existants = await silence(() => Col.lireExistants(comme(reprise.client), ED, ['a","victime.jpg|1|2']));
    ok("une cle de fichier piegee (`a\",\"victime.jpg|1|2`) ne fait pas lire la photo d'un autre a la reprise", existants !== null && existants.size === 0);
    ok("…et les sites qui mettent un texte de client dans un `in` passent par `listeIn` (noms des personnes, cles de fichier, filtres de la grille)",
      /\.filter\("deposant", "in", listeIn\(paquet\)\)/.test(lire("src/lib/collectif/personnesServeur.ts")) && !/\.in\("deposant"/.test(lire("src/lib/collectif/personnesServeur.ts"))
        && /\.filter\("cle_fichier", "in", listeIn\(paquet\)\)/.test(lire("src/lib/collectif/collecte.ts")) && !/\.in\("cle_fichier"/.test(lire("src/lib/collectif/collecte.ts"))
        && /valeurs\.map\(citerPostgrest\)/.test(lire("src/lib/collectif/resumePhotos.ts")));
  }

  /* ─────────────── S1 + S5 + C4 : l'adresse d'un autre ─────────────── */
  titre("— durcissement S1, S5, C4 : taper l'adresse d'un autre (prenom seulement, journal, nom propose) —");
  const vue = Pe.vuePersonneConnue({ prenom: " Léa ", nom: "Martin" } as { prenom: string; nom: string });
  ok("une personne RETROUVEE ne rend que son prenom : `nom: null`, `nomAffiche` = le prenom, jamais le nom de famille",
    vue.prenom === "Léa" && vue.nom === null && vue.nomAffiche === "Léa" && !JSON.stringify(vue).includes("Martin"));
  const rP = sansCommentaires(lire("src/app/api/collectif/depot/participant/route.ts"));
  const rA = sansCommentaires(lire("src/app/api/collectif/depot/album/route.ts"));
  ok("depot/participant : « connu » et « qui » passent par `vuePersonneConnue` ; le nom complet seulement a la CREATION ; depot/album : `moi.participant` sans nom de famille",
    /participant: creee \? \{ prenom: participant\.prenom, nom: participant\.nom, nomAffiche: nomAffiche\(participant\) \} : vuePersonneConnue\(participant\)/.test(rP)
      && /reponseConnue\(lu\.valeur, appareilLu, \{ statut: "connu" \}, false\)/.test(rP) && /r\.statut === "cree"\s*\);/.test(rP) && !/function vuePersonne\b/.test(rP)
      && /const personne = moi \? vuePersonneConnue\(moi\) : null;/.test(rA) && /participant: personne \? \{ prenom: personne\.prenom, nom: personne\.nom \} : null/.test(rA) && !/moi\.nom\b/.test(rA));
  {
    const A = { id: uuid(30), edition_id: ED, email: "lea.martin@audencia.com", prenom: "Léa", nom: "Martin", premier_lien_id: null, created_at: "2026-10-19T10:00:00.000Z", vu_le: "2026-10-19T10:00:00.000Z", renomme_le: null, fusionne_dans: null, fusionne_le: null };
    const TEL = "T".repeat(22);
    const base = baseEnMemoire({ collectif_participants: [{ ...A }] });
    const memeNom = await silence(() => Ps.presenter(comme(base.client), { editionId: ED, email: A.email, identite: { prenom: "léa", nom: " MARTIN " }, provenanceId: LIEN, appareil: TEL }));
    const traceMeme = base.trace.filter((x) => x.startsWith("insert:collectif_evenements"));
    const autre = await silence(() => Ps.presenter(comme(base.client), { editionId: ED, email: A.email, identite: { prenom: "Léa", nom: "Dupont" }, provenanceId: LIEN, appareil: TEL }));
    const evts = (base.tables.collectif_evenements ?? []) as LigneMem[];
    const dif = evts.find((e) => e.type === "participant_nom_different");
    const tout = JSON.stringify(evts.map((e) => e.payload));
    ok("S1 : le nom tape est IGNORE et `nomIgnore` le dit TOUJOURS (bon nom ou non) : comparer et le dire serait un oracle du nom de famille",
      memeNom.statut === "connu" && memeNom.nomIgnore === true && autre.statut === "connu" && autre.nomIgnore === true);
    ok("S5 : chaque presentation d'une adresse connue se journalise (`participant_retrouve`) ; le bon nom n'ecrit pas de « nom different »",
      traceMeme.join() === "insert:collectif_evenements:participant_retrouve" && evts.filter((e) => e.type === "participant_retrouve").length === 2 && memeNom.statut === "connu" && memeNom.journal);
    ok("S5 : un AUTRE nom avec une adresse connue → `participant_nom_different` : les deux noms, l'adresse MASQUEE, ni adresse en clair, ni telephone, ni token",
      dif !== undefined && (dif.payload as LigneMem).nom === "Léa Martin" && (dif.payload as LigneMem).propose === "Léa Dupont" && (dif.payload as LigneMem).a === "l***@audencia.com"
        && (dif.payload as LigneMem).personne === `p:${A.id}` && !tout.includes(A.email) && !tout.includes(TEL) && (base.tables.collectif_participants?.[0] as LigneMem).nom === "Martin");
    ok("…dit en francais au journal de la fiche", phraseEvenement("participant_nom_different", (dif?.payload ?? {}) as Record<string, unknown>).includes("« Léa Dupont » au lieu de « Léa Martin »")
      && phraseEvenement("participant_retrouve", { prenom: "Léa", a: "l***@a.fr" }) !== "participant_retrouve" && phraseEvenement("fusion_interrompue", {}) !== "fusion_interrompue");
    /* C4 : la liste des personnes, contre la meme fausse base. */
    (base.tables.collectif_photos_resume ??= []).push({ id: "g-a", edition_id: ED, role_deposant: "participant", provenance_id: LIEN, provenance_type: "participant", deposant: "Léa Martin", appareil_id: null, participant_id: A.id, n: 3, n_selection: 0, n_choisissables: 3, premiere: "x", premiere_photo: "x", derniere: "2026-10-20T09:00:00.000Z", vignette_le: null, vignette_photo: null, vignette_key: null });
    const avantListe = base.trace.length;
    const resp = await silence(() => Ps.chargerPersonnes(comme(base.client), ED, "masque"));
    const lueResp = base.trace.slice(avantListe).includes("select:collectif_evenements");
    const avantEquipe = base.trace.length;
    const equipe = await silence(() => Ps.chargerPersonnes(comme(base.client), ED, "aucun"));
    const lueEquipe = base.trace.slice(avantEquipe).includes("select:collectif_evenements");
    const lea = resp.statut === "ok" ? resp.valeur.personnes.find((p) => p.ref === `p:${A.id}`) : undefined;
    const leaEq = equipe.statut === "ok" ? equipe.valeur.personnes.find((p) => p.ref === `p:${A.id}`) : undefined;
    ok("C4 : la liste du responsable (et de l'atelier) porte `nomPropose` : le dernier autre nom, et sa date ; l'equipe ne le voit pas (le journal n'est meme pas lu)",
      lea?.nomPropose?.nom === "Léa Dupont" && typeof lea.nomPropose.le === "string" && lueResp && leaEq !== undefined && leaEq.nomPropose === null && !lueEquipe);
    const P = { ...A, renomme_le: null as string | null };
    const ev = (le: string, propose: string, personne = `p:${A.id}`) => ({ type: "participant_nom_different", payload: { personne, propose }, created_at: le });
    const np = Pe.nomsProposes([ev("2026-10-20T10:00:00.000Z", "Léa Dupont"), ev("2026-10-20T11:00:00.000Z", "Lea Durand"), ev("2026-10-20T09:00:00.000Z", "Zoé")], [P]);
    const apresRenommage = Pe.nomsProposes([ev("2026-10-20T10:00:00.000Z", "Léa Dupont")], [{ ...P, renomme_le: "2026-10-20T10:30:00.000Z" }]);
    const dejaLeSien = Pe.nomsProposes([ev("2026-10-20T10:00:00.000Z", "léa  MARTIN")], [P]);
    const fusionnee = Pe.nomsProposes([ev("2026-10-20T10:00:00.000Z", "Léa Dupont")], [{ ...P, fusionne_dans: uuid(31) }]);
    ok("`nomsProposes` : le plus RECENT gagne ; un renommage plus recent l'efface (le responsable a tranche) ; son propre nom ou une personne fusionnee ne proposent rien",
      np.get(A.id)?.nom === "Lea Durand" && np.get(A.id)?.le === "2026-10-20T11:00:00.000Z" && apresRenommage.size === 0 && dejaLeSien.size === 0 && fusionnee.size === 0 && Pe.nomsProposes([ev("2026-10-20T10:00:00.000Z", "X", "n:x")], [P]).size === 0);
  }

  /* ─────────────── S2 + S4 : presign et la place ─────────────── */
  titre("— durcissement S2, S4 : presign ne lit plus d'adresse ; la corbeille rend la place —");
  const rPresign = sansCommentaires(lire("src/app/api/collectif/depot/presign/route.ts"));
  ok("S2 : presign IGNORE `email` : la personne est celle de CE telephone (`participantDeLAppareil`), plus aucun « inconnu » ni 409 qui dirait si une adresse existe",
    !/corps\.email|trouverParEmail|participant_inconnu|email_invalide|normaliserEmail/.test(rPresign) && /if \(role === "participant" && appareilLu\) \{\s*const lu = await participantDeLAppareil\(supabase, edition\.id, appareilLu\);/.test(rPresign));
  ok("S4 : une photo de la corbeille ne compte plus dans la place de sa personne, QUI que soit celui qui l'a supprimee",
    ["auteur", "responsable", "atelier"].every((par) => !Co.compteDansLaPlace({ supprimee_le: "2026-10-20T10:00:00Z", supprimee_par: par })) && Co.compteDansLaPlace({ supprimee_le: null }));
  {
    const filtres: string[] = [];
    const q = {
      eq: (c: string, v: unknown) => (filtres.push(`eq ${c} ${String(v)}`), q),
      or: (f: string) => (filtres.push(`or ${f}`), q),
      is: (c: string) => (filtres.push(`is ${c}`), q),
      limit: () => q,
      then: (oui: (r: unknown) => unknown) => Promise.resolve({ count: 1, error: null }).then(oui),
    };
    const client = { from: () => ({ select: () => (filtres.push("|"), q) }) } as unknown as Parameters<typeof Col.compterPourPlafond>[0];
    Hc.oublierAbsence();
    await Col.compterPourPlafond(client, "ed", "tel", new Date("2026-10-20T12:00:00Z"), null, "p-1");
    const personne = filtres.join(" ").split("|")[2] ?? "";
    ok("…en base : le compte de la personne porte `supprimee_le is null`, et plus rien sur `supprimee_par`", /is supprimee_le/.test(personne) && !/supprimee_par/.test(filtres.join(" ")));
  }

  /* ─────────────── S3 : le frein ─────────────── */
  titre("— durcissement S3, C1 : le frein par adresse du client ET par lien (freins.ts, compte/garde.ts) —");
  const req = (h: Record<string, string>) => new Request("https://www.bellajour.fr/api/collectif/depot/participant", { method: "POST", headers: h });
  ok("l'adresse du client : Cloudflare (`cf-connecting-ip`) s'il la pose, sinon la PREMIERE de `x-forwarded-for` (Vercel), sinon `x-real-ip` ; une valeur sans forme d'adresse est ignoree",
    Ga.ipDuClient(req({ "cf-connecting-ip": "203.0.113.7", "x-forwarded-for": "198.51.100.1" })) === "203.0.113.7" && Ga.ipDuClient(req({ "x-forwarded-for": "198.51.100.1, 10.0.0.1" })) === "198.51.100.1"
      && Ga.ipDuClient(req({ "x-real-ip": "2001:db8::1" })) === "2001:db8::1" && Ga.ipDuClient(req({ "cf-connecting-ip": "pas une ip", "x-forwarded-for": "198.51.100.1" })) === "198.51.100.1" && Ga.ipDuClient(req({})) === "inconnu");
  ok("le second frein lit l'adresse qui se CONNECTE a Vercel : un `cf-connecting-ip` forge n'y change rien",
    Ga.ipDeConnexion(req({ "cf-connecting-ip": "203.0.113.7", "x-forwarded-for": "198.51.100.1" })) === "198.51.100.1");
  {
    const avant = process.env.NODE_ENV;
    /* `process.env.X = undefined` ECRIT la chaine « undefined » : on efface, on ne remet pas. */
    const remettre = (v: string | undefined) => {
      if (v === undefined) delete (process.env as Record<string, string | undefined>).NODE_ENV;
      else (process.env as Record<string, string | undefined>).NODE_ENV = v;
    };
    (process.env as Record<string, string | undefined>).NODE_ENV = "production";
    const frein = Ga.creerFrein(Fr.FREINS_DEPOT.presenter);
    const plafondAncien = Ga.creerPlafond(20);
    remettre(avant);
    const TOKEN = "AbCdEfGhIjKlMnOpQrStUvWxYz012345";
    const campus = Fr.cleFreinDepot("192.0.2.10", TOKEN);
    let refuses = 0;
    for (let i = 0; i < 160; i++) if (frein(campus)) refuses++;
    let ancienRefuse = 0;
    for (let i = 0; i < 160; i++) if (plafondAncien(req({ "x-forwarded-for": "192.0.2.10" }))) ancienRefuse++;
    ok("80 personnes derriere le Wi-Fi du campus, deux presentations chacune, dans la meme minute : AUCUNE refusee (l'ancien `creerPlafond(20)` en refusait 140)",
      refuses === 0 && ancienRefuse === 140);
    for (let i = 160; i < Fr.FREINS_DEPOT.presenter; i++) frein(campus);
    ok("…au-dela du seuil, la meme adresse sur le meme lien est freinee ; un autre lien ou une autre adresse ne l'est pas",
      frein(campus) && !frein(Fr.cleFreinDepot("192.0.2.10", "Z".repeat(32))) && !frein(Fr.cleFreinDepot("192.0.2.11", TOKEN)));
    ok("la cle ne garde pas le token entier (12 caracteres), et des seuils penses pour une classe ; le frein large au-dessus",
      !Fr.cleFreinDepot("1.2.3.4", TOKEN).includes(TOKEN) && Fr.cleFreinDepot("1.2.3.4", TOKEN) === `1.2.3.4|${TOKEN.slice(-12)}` && Fr.cleFreinDepot("1.2.3.4", 42) === "1.2.3.4|"
        && Fr.FREINS_DEPOT.presenter >= 160 && Fr.FREINS_DEPOT.album >= Fr.FREINS_DEPOT.presenter && Fr.FREIN_LARGE > Fr.FREINS_DEPOT.album);
    (process.env as Record<string, string | undefined>).NODE_ENV = "production";
    const trois = Ga.creerPlafond(3);
    remettre(avant);
    const r = req({ "x-forwarded-for": "198.51.100.9" });
    ok("`creerPlafond` des autres routes ne change pas : la meme regle par `x-forwarded-for` brut (3 passent, la 4e est freinee)",
      !trois(r) && !trois(r) && !trois(r) && trois(r) && !trois(req({ "x-forwarded-for": "198.51.100.8" })));
  }
  const rSup = sansCommentaires(lire("src/app/api/collectif/depot/supprimer/route.ts"));
  ok("depot/participant ne freine QUE `presenter` (ni `qui`, ni `oublier`), par adresse du client ET par lien, plus le frein large ; plus de `creerPlafond(20)`",
    /if \(action === "presenter" && \(freinPresenter\(cleFreinDepot\(ipDuClient\(request\), corps\.token\)\) \|\| freinLarge\(ipDeConnexion\(request\)\)\)\)/.test(rP)
      && (rP.match(/freinPresenter\(/g) ?? []).length === 1 && !/creerPlafond/.test(rP) && rP.indexOf("freinPresenter(cleFreinDepot") < rP.indexOf("chargerAcces("));
  ok("C1 : un frein sur `depot/album` et `depot/supprimer`, avant toute lecture de la base",
    /creerFrein\(FREINS_DEPOT\.album\)/.test(rA) && rA.indexOf("freinAlbum(cleFreinDepot(ipDuClient(request), corps.token))") > 0 && rA.indexOf("freinAlbum(") < rA.indexOf("chargerAcces(")
      && /creerFrein\(FREINS_DEPOT\.supprimer\)/.test(rSup) && rSup.indexOf("freinSupprimer(cleFreinDepot(ipDuClient(request), corps.token))") > 0 && rSup.indexOf("freinSupprimer(") < rSup.indexOf("chargerAcces("));

  /* ─────────────── S6 + C5 : l'album et l'accord ─────────────── */
  titre("— durcissement S6, C5 : l'album ne signe jamais l'original ; l'accord de l'album seulement le jour ou la page l'affiche —");
  ok("S6 : l'album ne signe QUE la vignette (l'original porte l'EXIF et le GPS) ; sans vignette, `vignette: null`",
    !/signerGet/.test(rA) && /if \(p\.vignette_key\) vignette = await signerLectureVignette\(p\.vignette_key\);/.test(rA) && !/else if \(p\.mime/.test(rA));
  const versions = [...Accord.TEXTES_ACCORD.keys()];
  ok("C5 : une version n'est acceptee que si elle est CONNUE et pas plus recente que `VERSION_ACCORD` (le texte affiche) ; « 2026-10-20 » depuis que la page affiche la phrase de l'album (lot w2), « 2026-10-17 » toujours lisible",
    versions.every((v) => Accord.versionAcceptee(v) === v <= Accord.VERSION_ACCORD) && versions.every((v) => (Accord.lireAccord({ accord: true, accordVersion: v }) !== null) === Accord.versionAcceptee(v))
      && Accord.versionAcceptee(Accord.VERSION_ACCORD) && !Accord.versionAcceptee("2099-01-01") && !Accord.versionAcceptee("2000-01-01") && !Accord.versionAcceptee(20261017)
      && (Accord.VERSION_ACCORD !== "2026-10-17" || (!Accord.versionAcceptee("2026-10-20") && Accord.lireAccord({ accord: true, accordVersion: "2026-10-20" }) === null)));
  ok("…`accordAJour` compare a la version AFFICHEE (`VERSION_ACCORD`), la seule que le serveur prend de neuf",
    /accordAJour: comptes\.accord === VERSION_ACCORD,/.test(rP) && !/VERSION_ACCORD_ALBUM/.test(rP));

  /* ─────────────── C1 : les comptes de l'album ─────────────── */
  titre("— durcissement C1 : l'album compte dans une vue, il ne relit plus toutes les photos du lien —");
  {
    type Brute = { participant_id: string | null; deposant: string | null; appareil_id: string | null; provenance_id: string | null; role_deposant: string; accord_version: string | null };
    const brutes: Brute[] = [
      { participant_id: "p1", deposant: "Léa Martin", appareil_id: "t1", provenance_id: LIEN, role_deposant: "participant", accord_version: "2026-10-20" },
      { participant_id: "p1", deposant: "Léa Martin", appareil_id: "t2", provenance_id: LIEN, role_deposant: "participant", accord_version: "2026-10-20" },
      { participant_id: null, deposant: "Hugo", appareil_id: "t3", provenance_id: LIEN, role_deposant: "participant", accord_version: "2026-10-20" },
      { participant_id: null, deposant: "hugo ", appareil_id: "t4", provenance_id: LIEN, role_deposant: "participant", accord_version: "2026-10-20" },
      { participant_id: null, deposant: null, appareil_id: "t5", provenance_id: LIEN, role_deposant: "participant", accord_version: "2026-10-20" },
      { participant_id: null, deposant: null, appareil_id: "t5", provenance_id: LIEN, role_deposant: "participant", accord_version: "2026-10-20" },
      { participant_id: null, deposant: "Zoé", appareil_id: "t6", provenance_id: LIEN, role_deposant: "participant", accord_version: "2026-10-17" },
    ];
    /* Le miroir de la vue `collectif_photos_album` : regrouper comme le SQL (le telephone seulement sans personne). */
    const groupes = new Map<string, LigneVueAlbumMem>();
    for (const b of brutes.filter((x) => x.accord_version === "2026-10-20")) {
      const tel = b.participant_id ? null : b.appareil_id;
      const cle = JSON.stringify([b.role_deposant, b.provenance_id, b.accord_version, b.participant_id, b.deposant, tel]);
      const g = groupes.get(cle) ?? { id: cle, participant_id: b.participant_id, deposant: b.deposant, appareil_id: tel, n: 0 };
      g.n++;
      groupes.set(cle, g);
    }
    const c = Al.comptesDeLAlbum([...groupes.values()]);
    ok("les comptes de la vue disent la meme chose que la relecture complete : 6 photos, 3 personnes (une par personne, par nom, « Sans nom » par telephone)",
      c.photos === 6 && c.personnes === Al.personnesDeLAlbum(brutes.filter((x) => x.accord_version === "2026-10-20")) && c.personnes === 3 && groupes.size === 4);
    ok("le filtre pose sur la vue : celui de l'album, SANS l'arrivee ni la corbeille, que la vue ecarte elle-meme",
      [LIEN, null].every((l) => JSON.stringify(Al.filtreVueAlbum(l)) === JSON.stringify(Al.filtreAlbum(l).filter((f) => f.colonne !== "confirmee_le" && f.colonne !== "supprimee_le")))
        && Al.filtreVueAlbum(null).some((f) => f.colonne === "accord_version") && !Al.filtreVueAlbum(null).some((f) => f.colonne === "supprimee_le"));
    const mig = lire("supabase/migrations/20261023_collectif_personnes_corbeille.sql");
    const vueSql = mig.slice(mig.indexOf("create or replace view public.collectif_photos_album"), mig.indexOf("revoke all on public.collectif_photos_album"));
    ok("la vue (migration 20261023, NON appliquee) : arrivees, hors corbeille, par lien, version, personne, nom, telephone sans personne ; `security_invoker`, fermee a anon et authenticated",
      vueSql.length > 0 && /with \(security_invoker = true\)/.test(vueSql) && /where c\.confirmee_le is not null\s+and c\.supprimee_le is null/.test(vueSql)
        && /case when c\.participant_id is null then c\.appareil_id end as appareil_cle/.test(vueSql) && /p\.appareil_cle as appareil_id/.test(vueSql)
        && /group by p\.edition_id, p\.role_deposant, p\.provenance_id, p\.accord_version, p\.participant_id, p\.deposant, p\.appareil_cle;/.test(vueSql)
        && Al.COLONNES_VUE_ALBUM.split(", ").every((col) => col === "n" ? /count\(\*\)::integer as n/.test(vueSql) : new RegExp(`(as ${col}\\b|p\\.${col},)`).test(vueSql) || col === "id")
        && /revoke all on public\.collectif_photos_album from anon, authenticated;/.test(mig) && !/2026-10-\d\d/.test(sqlSansCommentaires(vueSql)));
    ok("la route : page 0 lit la VUE ; sans elle, un compte en GET `limit(0)` (jamais `head`) et `personnes: null`, jamais un nombre devine ; plus de relecture des photos du lien pour compter",
      /supabase\.from\(VUE_ALBUM\)\.select\(COLONNES_VUE_ALBUM\)/.test(rA) && /requete\(avec, "id", true\)\.limit\(0\)/.test(rA) && /select\(colonnes, compte \? COMPTE_SANS_LIGNE : undefined\)/.test(rA)
        && /return \{ photos: c\.count, personnes: null \};/.test(rA) && !/head: true/.test(rA) && !/lireToutesLesLignes<\{ id: string; deposant/.test(rA) && !/personnesDeLAlbum\(tous/.test(rA));
  }

  /* ─────────────── S7 + C2 : effacer pour de bon ─────────────── */
  titre("— durcissement S7, C2 : la LIGNE d'abord (re-controlee), puis le coffre ; ce qui resiste se retente —");
  {
    const cles = (id: string) => ({ r2_key: `collectif/${ED}/photos/${id}/original.jpg`, vignette_key: `collectif/${ED}/photos/${id}/vignette.jpg` });
    const corb = (id: string, supprimee_le: string | null) => ({ id, edition_id: ED, ...cles(id), supprimee_le, supprimee_par: supprimee_le ? "responsable" : null, confirmee_le: "2026-09-01T09:00:00.000Z" });
    const VIEUX = "2026-09-01T10:00:00.000Z";
    const SEUIL = Co.seuilPurge(new Date("2026-10-20T12:00:00.000Z"));
    const [p1, p2, p3, p4] = [uuid(41), uuid(42), uuid(43), uuid(44)];
    /* p3 a ete RESTAUREE entre la lecture et l'effacement ; p4 a ete restauree puis remise a la corbeille AUJOURD'HUI. */
    const base = baseEnMemoire({ collectif_photos: [corb(p1, VIEUX), corb(p2, VIEUX), corb(p3, null), corb(p4, "2026-10-20T11:00:00.000Z")] });
    const coffre = new Set([p1, p2, p3, p4].flatMap((id) => Object.values(cles(id))));
    const resiste = new Set([cles(p2).r2_key]);
    const effaceur = async (k: string) => {
      base.trace.push(`r2:${k.split("/")[3]?.slice(-2)}/${k.split("/").pop()}`);
      if (resiste.has(k)) return false;
      coffre.delete(k);
      return true;
    };
    const lues = [p1, p2, p3, p4].map((id) => ({ id, ...cles(id) }));
    const r = await silence(() => Cs.effacer(comme(base.client), ED, lues, "purge", null, Infinity, SEUIL, effaceur));
    const t = base.trace;
    const iIntention = t.indexOf("insert:collectif_evenements:objets_a_effacer");
    const iLigne = t.findIndex((x) => x.startsWith("delete:collectif_photos"));
    const iCoffre = t.findIndex((x) => x.startsWith("r2:"));
    ok("l'ordre : l'INTENTION au journal, puis la LIGNE, PUIS le coffre, puis ce qui est regle (`objets_effaces`)",
      iIntention >= 0 && iLigne > iIntention && iCoffre > iLigne && t.indexOf("insert:collectif_evenements:objets_effaces") > iCoffre);
    ok("la ligne est RE-CONTROLEE : une photo restauree entre-temps, ou remise a la corbeille trop recemment, reste en base avec TOUS ses objets",
      r.statut === "ok" && r.valeur.n === 2 && r.valeur.ids.includes(p1) && r.valeur.ids.includes(p2) && (base.tables.collectif_photos ?? []).map((l) => l.id).sort().join() === [p3, p4].sort().join()
        && [p3, p4].every((id) => coffre.has(cles(id).r2_key) && coffre.has(cles(id).vignette_key)) && !t.some((x) => /^r2:4[34]\//.test(x)));
    ok("un objet qui resiste : la ligne est partie quand meme (jamais une photo vide restaurable), `ratees` le dit, l'echec est note",
      r.statut === "ok" && r.valeur.ratees === 1 && coffre.has(cles(p2).r2_key) && !coffre.has(cles(p2).vignette_key) && !coffre.has(cles(p1).r2_key)
        && (base.tables.collectif_evenements ?? []).some((e) => e.type === "echec" && (e.payload as LigneMem).quoi === "corbeille"));
    const evts = () => (base.tables.collectif_evenements ?? []).map((e) => ({ id: String(e.id), edition_id: String(e.edition_id), type: String(e.type), payload: e.payload as Record<string, unknown>, created_at: String(e.created_at) }));
    const intention = (base.tables.collectif_evenements ?? []).find((e) => e.type === "objets_a_effacer");
    const payloadIntention = JSON.stringify(intention?.payload ?? {});
    ok("l'intention ne porte que des CLES du coffre (et un nombre) : ni nom, ni adresse, ni token",
      Object.keys((intention?.payload ?? {}) as LigneMem).sort().join() === "cles,n" && ((intention?.payload as LigneMem).cles as string[]).every((k) => k.startsWith(`collectif/${ED}/photos/`)) && !/@|deposant|Léa/.test(payloadIntention));
    const PLUS_TARD = new Date("2026-10-20T12:00:00.000Z");
    const enAttente = Co.objetsEnAttente(evts(), PLUS_TARD);
    ok("ce qui reste a effacer : la SEULE cle qui a resiste (les objets des photos restaurees sont regles : a garder)",
      enAttente.length === 1 && enAttente[0].cles.join() === cles(p2).r2_key && enAttente[0].editionId === ED && Co.objetsEnAttente(evts(), new Date("2026-10-20T08:05:00.000Z")).length === 0);
    resiste.clear();
    const rep = await silence(() => Cs.reprendreObjets(comme(base.client), Infinity, PLUS_TARD, effaceur));
    ok("la purge suivante la RETENTE et la regle ; ensuite plus rien n'attend", rep !== null && rep.effaces === 1 && !coffre.has(cles(p2).r2_key) && Co.objetsEnAttente(evts(), PLUS_TARD).length === 0
      && (base.tables.collectif_evenements ?? []).some((e) => e.type === "objets_effaces" && (e.payload as LigneMem).reprise === true));

    /* Une intention dont le journal de fin s'est perdu, sur une photo dont la ligne EXISTE encore : la reprise garde tout. */
    const p5 = uuid(45);
    const garde = baseEnMemoire({
      collectif_photos: [{ ...corb(p5, null), vignette_key: null }],
      collectif_evenements: [{ id: uuid(46), edition_id: ED, type: "objets_a_effacer", payload: { cles: Object.values(cles(p5)), n: 1 }, created_at: "2026-10-20T07:00:00.000Z" }],
    });
    const touches: string[] = [];
    const rep2 = await silence(() => Cs.reprendreObjets(comme(garde.client), Infinity, PLUS_TARD, async (k) => (touches.push(k), true)));
    ok("la reprise n'efface JAMAIS une cle qu'une ligne porte encore (meme la vignette rangee sous son id, `vignette_key` vide) : elle la regle « a garder »",
      rep2 !== null && touches.length === 0 && rep2.gardes === 2 && Co.objetsEnAttente((garde.tables.collectif_evenements ?? []).map((e) => ({ id: String(e.id), edition_id: String(e.edition_id), type: String(e.type), payload: e.payload as Record<string, unknown>, created_at: String(e.created_at) })), PLUS_TARD).length === 0);

    /* Sans intention ecrite, rien ne part. */
    const p6 = uuid(47);
    const sansJournal = baseEnMemoire({ collectif_photos: [corb(p6, VIEUX)] }, (q) => (q.table === "collectif_evenements" && q.op === "insert" && (q.payload as LigneMem)?.type === "objets_a_effacer" ? { code: "57014", message: "timeout" } : null));
    const touches3: string[] = [];
    const r3 = await silence(() => Cs.effacer(comme(sansJournal.client), ED, [{ id: p6, ...cles(p6) }], "atelier", "Mathias", Infinity, null, async (k) => (touches3.push(k), true)));
    ok("l'intention ne s'ecrit pas : NI la ligne NI le coffre ne bougent (un objet dont on perdrait la trace ne se retenterait jamais)",
      r3.statut === "erreur" && touches3.length === 0 && (sansJournal.tables.collectif_photos ?? []).length === 1 && !sansJournal.trace.some((x) => x.startsWith("delete:collectif_photos")));

    /* Une ligne coincee ne retient pas les autres. */
    const [q1, q2, q3] = [uuid(51), uuid(52), uuid(53)];
    const coincee = baseEnMemoire({ collectif_photos: [corb(q1, VIEUX), corb(q2, VIEUX), corb(q3, VIEUX)] }, (q) => (q.table === "collectif_photos" && q.op === "delete" && q.lignes.some((l) => l.id === q2) ? { code: "23503", message: "contrainte" } : null));
    const r4 = await silence(() => Cs.effacer(comme(coincee.client), ED, [q1, q2, q3].map((id) => ({ id, ...cles(id) })), "purge", null, Infinity, SEUIL, async () => true));
    ok("une ligne que la base refuse ne retient pas les autres : le paquet se rejoue photo par photo, elle seule reste",
      r4.statut === "ok" && r4.valeur.n === 2 && (coincee.tables.collectif_photos ?? []).map((l) => l.id).join() === q2);
    ok("« Effacer maintenant » : 200 et `ratees` (la photo est effacee de la base, son objet sera retente), plus de 502",
      !/status: r\.valeur\.ratees \? 502/.test(lire("src/app/api/admin/collectif/editions/[id]/corbeille/route.ts")) && /return NextResponse\.json\(\{ ok: true, \.\.\.r\.valeur \}\);/.test(lire("src/app/api/admin/collectif/editions/[id]/corbeille/route.ts")));
    ok("les cles d'une intention sont relues SANS confiance : sous le prefixe de SON edition, jamais `..`, jamais une autre edition",
      JSON.stringify(Co.lireClesObjets([`collectif/${ED}/photos/${p1}/original.jpg`, `collectif/${uuid(1)}/photos/x/original.jpg`, `collectif/${ED}/../numeros/x`, "numeros/x", 42], ED)) === JSON.stringify([`collectif/${ED}/photos/${p1}/original.jpg`])
        && Co.photoDeLaCle(`collectif/${ED}/photos/${p1}/vignette.jpg`, ED) === p1 && Co.photoDeLaCle(`collectif/${uuid(1)}/photos/${p1}/vignette.jpg`, ED) === null);
    ok("la purge reprend d'abord ce qui attend, puis efface la ligne re-controlee contre le seuil de 30 jours",
      /await reprendreObjets\(supabase, jusqua, new Date\(\), effaceur\);/.test(serveurSrc()) && /effacer\(supabase, editionId, photos, "purge", null, jusqua, seuil, effaceur\)/.test(serveurSrc()));
  }

  /* ─────────────── S9 : la fusion ─────────────── */
  titre("— durcissement S9 : la fusion journalise AVANT d'ecrire ; defaire remet d'aplomb une fusion interrompue —");
  {
    const pers = (id: string, prenom: string, nom: string) => ({ id, edition_id: ED, email: `${prenom.toLowerCase()}@a.fr`, prenom, nom, premier_lien_id: null, created_at: "2026-10-19T10:00:00.000Z", vu_le: "2026-10-19T10:00:00.000Z", renomme_le: null, fusionne_dans: null, fusionne_le: null });
    const A = pers(uuid(61), "Léa", "Martin");
    const B = pers(uuid(62), "Lea", "Bis");
    const ph = (n: number, qui: typeof A) => ({ id: uuid(n), edition_id: ED, deposant: `${qui.prenom} ${qui.nom}`, participant_id: qui.id, role_deposant: "participant", provenance_id: LIEN, created_at: `2026-10-20T09:00:${String(n).padStart(2, "0")}.000Z` });
    const photos = () => [ph(71, A), ph(72, A), ph(73, B), ph(74, B), ph(75, B)];
    const plan = { reste: { genre: "participant", id: A.id } as const, part: { genre: "participant", id: B.id } as const, nomDe: "reste" as const };
    const etat = (b: ReturnType<typeof baseEnMemoire>) => (b.tables.collectif_photos ?? []).map((p) => `${String(p.id).slice(-2)}:${String(p.participant_id).slice(-2)}:${String(p.deposant)}`).join(" | ");

    const sansJournal = baseEnMemoire({ collectif_participants: [{ ...A }, { ...B }], collectif_photos: photos() }, (q) => (q.table === "collectif_evenements" && q.op === "insert" ? { code: "57014", message: "timeout" } : null));
    const avant = etat(sansJournal);
    const r1 = await silence(() => Ps.fusionnerPersonnes(comme(sansJournal.client), ED, plan, "Mathias"));
    ok("le journal de la fusion ne s'ecrit pas : RIEN n'est ecrit (ni photo, ni personne)",
      r1.statut === "erreur" && etat(sansJournal) === avant && !sansJournal.trace.some((x) => x.startsWith("update:")) && (sansJournal.tables.collectif_participants?.[1] as LigneMem).fusionne_dans === null);

    const coupee = baseEnMemoire({ collectif_participants: [{ ...A }, { ...B }], collectif_photos: photos() }, (q) => (q.table === "collectif_participants" && q.op === "update" && "fusionne_dans" in ((q.payload ?? {}) as LigneMem) && (q.payload as LigneMem).fusionne_dans !== null ? { code: "57014", message: "timeout" } : null));
    const initial = etat(coupee);
    const r2 = await silence(() => Ps.fusionnerPersonnes(comme(coupee.client), ED, plan, "Mathias"));
    const iJournal = coupee.trace.indexOf("insert:collectif_evenements:personnes_fusionnees");
    const iPhotos = coupee.trace.findIndex((x) => x.startsWith("update:collectif_photos"));
    const evtFusion = (coupee.tables.collectif_evenements ?? []).find((e) => e.type === "personnes_fusionnees");
    const auMilieu = etat(coupee);
    ok("le journal (l'etat d'avant de CHAQUE photo) part AVANT la premiere ecriture ; une panne au milieu se dit (`fusion_interrompue`)",
      r2.statut === "erreur" && iJournal >= 0 && iPhotos > iJournal && coupee.trace.includes("insert:collectif_evenements:fusion_interrompue") && auMilieu !== initial
        && JSON.stringify(((evtFusion?.payload as LigneMem).photos as { ids: string[] }[]).flatMap((g) => g.ids).sort()) === JSON.stringify([uuid(73), uuid(74), uuid(75)]));
    const fusions = await silence(() => Ps.lireFusions(comme(coupee.client), ED));
    const f = fusions.statut === "ok" ? fusions.valeur[0] : undefined;
    const d = f ? await silence(() => Ps.defaireFusion(comme(coupee.client), ED, f.evenement, "Mathias")) : null;
    ok("l'atelier la voit interrompue et la DEFAIT : chaque photo revient a sa personne et a son nom d'avant",
      f !== undefined && f.interrompue && !f.defaite && d?.statut === "ok" && etat(coupee) === initial && (coupee.tables.collectif_participants?.[1] as LigneMem).fusionne_dans === null);
    const entiere = baseEnMemoire({ collectif_participants: [{ ...A }, { ...B }], collectif_photos: photos() });
    const r3 = await silence(() => Ps.fusionnerPersonnes(comme(entiere.client), ED, plan, "Mathias"));
    const lues = await silence(() => Ps.lireFusions(comme(entiere.client), ED));
    ok("une fusion entiere : le journal d'abord, toutes les photos chez celle qui reste, l'autre pointe vers elle, rien d'interrompu",
      r3.statut === "ok" && r3.n === 3 && etat(entiere).split(" | ").every((x) => x.includes(`:${A.id.slice(-2)}:Léa Martin`)) && (entiere.tables.collectif_participants?.[1] as LigneMem).fusionne_dans === A.id
        && lues.statut === "ok" && lues.valeur.length === 1 && !lues.valeur[0].interrompue && entiere.trace.indexOf("insert:collectif_evenements:personnes_fusionnees") < entiere.trace.findIndex((x) => x.startsWith("update:")));
  }

  /* ─────────────── C3 : en attente ─────────────── */
  titre("— durcissement : ce qui attend Mathias (C3), et le contrat —");
  const contrat = lire("docs/produit/collectif/CONTRAT-PERSONNES-CORBEILLE.md");
  ok("le contrat porte « Changements du durcissement » et dit C3 EN ATTENTE (la politique de confidentialite n'est pas tranchee)",
    /## 9\. Changements du durcissement/.test(contrat) && /C3[^\n]*en attente/i.test(contrat) && /cf-connecting-ip/.test(contrat) && /nomPropose/.test(contrat) && /objets_a_effacer/.test(contrat));
}

type LigneVueAlbumMem = { id: string; participant_id: string | null; deposant: string | null; appareil_id: string | null; n: number };
const sqlSansCommentaires = (s: string) => s.split("\n").filter((l) => !/^\s*--/.test(l)).join("\n");
const serveurSrc = () => lire("src/lib/collectif/corbeilleServeur.ts");


/* ═══════════ Planches 4C et 5 du 20/10, côté ATELIER : la corbeille, les personnes, l'ouverture du dépôt (lot w2-atelier, T-198, T-199) ═══════════ */

async function verifAtelierCorbeillePersonnes() {
  const Ap = await import("@/lib/collectif/atelierPhotos");
  const Pe = await import("@/lib/collectif/personnes");
  const Co = await import("@/lib/collectif/corbeille");
  const Cal = await import("@/lib/collectif/calendrier");
  const Ou = await import("@/lib/collectif/ouverture");
  const Mi = await import("@/lib/collectif/migration");
  const Da = await import("@/lib/collectif/dates");
  const Sa = await import("@/lib/collectif/saisie");

  titre("— w2-atelier : les phrases de la corbeille (atelierPhotos.ts) —");
  ok("l'échéance se dit en jours (« Effacée dans 2 jours », singulier à 1) ; à 0 le délai est passé et la purge du jour l'emporte",
    Ap.phraseEcheance(2) === "Effacée dans 2 jours" && Ap.phraseEcheance(1) === "Effacée dans 1 jour" && Ap.phraseEcheance(13) === "Effacée dans 13 jours" && Ap.phraseEcheance(0) === "Effacée à la prochaine purge" && Ap.phraseEcheance(Number.NaN) === "Effacée à la prochaine purge");
  ok("les dates sont celles de Paris, heure d'hiver comme d'été (« sam. 7 nov. à 15 h 02 », « sam. 17 oct., 9 h 05 »), jamais celles de la machine ; illisible : vide",
    Ap.jourEtHeureParis("2026-11-07T14:02:00Z").replace(/ /g, " ") === "sam. 7 nov. à 15 h 02" && Ap.quandArrivee("2026-11-07T13:32:00Z").replace(/ /g, " ") === "sam. 7 nov., 14 h 32" && Ap.quandArrivee("2026-10-17T07:05:00Z").replace(/ /g, " ") === "sam. 17 oct., 9 h 05"
      && Ap.jourEtHeureParis("pas une date") === "" && Ap.quandArrivee(null) === "");
  ok("l'heure garde ses espaces INSÉCABLES (« 16 h 18 » ne se coupe pas en fin de ligne sur un téléphone)",
    /^sam\. 7 nov\. à 15 h 02$/.test(Ap.jourEtHeureParis("2026-11-07T14:02:00Z")) && /, 14 h 32$/.test(Ap.quandArrivee("2026-11-07T13:32:00Z")));
  const mille = Array.from({ length: 1201 }, (_, i) => `id${i}`);
  const gestes = Ap.enGestes(mille);
  ok(`« Tout cocher » d'une grande corbeille part en gestes de ${Co.PHOTOS_PAR_GESTE} photos au plus (la route refuse davantage, 400 lot_invalide), dans l'ordre, sans perte ni doublon`,
    gestes.length === 3 && gestes.map((g) => g.length).join() === "500,500,201" && gestes.flat().join() === mille.join() && Ap.enGestes([]).length === 0 && Ap.enGestes(["a"]).length === 1);
  const e3 = Ap.phraseEffacer(3, 3), e0 = Ap.phraseEffacer(0, 3), e2 = Ap.phraseEffacer(2, 3);
  ok("« Effacer maintenant », premier temps : le serveur dit ce qui partirait ; DÉFINITIF dit en toutes lettres ; rien à effacer se dit et ne propose aucun geste ; une photo déjà restaurée est nommée",
    e3.titre === "Effacer pour de bon 3 photos ?" && /définitif/.test(e3.corps) && /l'original et la vignette/.test(e3.corps) && e0.titre === "Rien à effacer" && /plus à la corbeille/.test(e0.corps)
      && e2.titre === "Effacer pour de bon 2 photos ?" && /Sur les 3 photos cochées, 1 n'est plus à la corbeille : elle n'est pas touchée/.test(e2.corps) && Ap.phraseEffacer(1, 1).titre === "Effacer pour de bon 1 photo ?");
  ok("les bilans : restaurer dit où la photo revient ; effacer dit ce qui est parti ET le fichier resté au coffre (audit S7 : la ligne part d'abord, la purge suivante retire le fichier)",
    Ap.bilanRestauration(1, 0) === "1 photo restaurée : elle revient à sa place (son lien, sa personne, sa sélection)." && /3 photos restaurées : elles reviennent/.test(Ap.bilanRestauration(3, 0)) && /1 n'était plus à la corbeille/.test(Ap.bilanRestauration(2, 1)) && /Rien n'a été restauré/.test(Ap.bilanRestauration(0, 2))
      && Ap.bilanEffacement(3, 0) === "3 photos effacées pour de bon." && Ap.bilanEffacement(2, 1) === "2 photos effacées pour de bon. Pour l'une d'elles, un fichier est resté au coffre : la purge du jour le retirera." && /Pour 2 d'entre elles, un fichier est resté au coffre/.test(Ap.bilanEffacement(3, 2)) && /^Rien n'est effacé/.test(Ap.bilanEffacement(0, 0)) && !/reste à la corbeille/.test(Ap.bilanEffacement(2, 1)));
  const absente = Ap.phraseMigrationAbsente("La corbeille");
  ok("sans la migration 20261023 : l'écran DIT ce qui attend, NOMME le fichier de la migration et dit que rien n'est enregistré (sobrement, sans le mot « erreur »)",
    absente.includes(Mi.MIGRATION_PERSONNES) && /^La corbeille attend la mise à jour de la base/.test(absente) && /Rien n'est enregistré en attendant\.$/.test(absente) && !/erreur/i.test(absente) && Mi.MIGRATION_PERSONNES === "supabase/migrations/20261023_collectif_personnes_corbeille.sql");

  titre("— w2-atelier : les personnes, renommer, fusionner, défaire (atelierPhotos.ts) —");
  const pers = (o: Partial<import("@/lib/collectif/personnes").Personne> & { nom: string; ref: string; participant: boolean }): import("@/lib/collectif/personnes").Personne => ({ prenom: null, nomDeFamille: null, cle: o.nom.toLowerCase(), email: null, n: 1, liens: [], telephones: 0, derniere: null, depuis: null, ...o, nomPropose: o.nomPropose ?? null });
  const lea = pers({ ref: "p:11111111-1111-4111-8111-111111111111", participant: true, nom: "Léa Martin", prenom: "Léa", nomDeFamille: "Martin", email: "lea.martin@audencia.com", n: 24, liens: [{ cle: "lien:b1", n: 24 }], telephones: 2 });
  const lea2 = pers({ ref: "p:22222222-2222-4222-8222-222222222222", participant: true, nom: "Lea Martin", prenom: "Lea", nomDeFamille: "Martin", email: "lea.martin@gmail.com", n: 6, liens: [{ cle: "lien:b1", n: 6 }], telephones: 1 });
  const leaSeule = pers({ ref: "n:léa", participant: false, nom: "Léa", n: 2, liens: [{ cle: "lien:b1", n: 2 }] });
  const duo = pers({ ref: "n:marc roux", participant: false, nom: "Marc Roux", n: 3, liens: [{ cle: "lien:b2", n: 2 }, { cle: "participants", n: 1 }] });
  const noms = new Map([["lien:b1", "Bateau 1"], ["lien:b2", "Bateau 2"], ["participants", "Lien général"]]);
  ok("les liens d'une personne : un seul se nomme, plusieurs se comptent (« Bateau 2 (2), Lien général (1) ») ; un lien retiré ne montre jamais sa clé ; les téléphones, au pluriel ou absents",
    Ap.libelleLiens(lea, noms) === "Bateau 1" && Ap.libelleLiens(duo, noms) === "Bateau 2 (2), Lien général (1)" && Ap.libelleLiens(pers({ ref: "n:x", participant: false, nom: "X", liens: [{ cle: "lien:mort", n: 1 }] }), noms) === "Lien retiré"
      && Ap.libelleLiens(pers({ ref: "n:y", participant: false, nom: "Y" }), noms) === "aucun lien" && Ap.phraseTelephones(2) === "2 téléphones" && Ap.phraseTelephones(1) === "1 téléphone" && Ap.phraseTelephones(0) === "aucun téléphone connu");
  ok("les deux raisons de proposer une fusion se disent comme la planche 4C ; la plus fournie reste (la cible), à égalité la première",
    Ap.raisonFusion("meme_nom") === "même nom, sans l'accent" && Ap.raisonFusion("meme_prenom") === "même prénom, même lien" && Ap.sensDeLaFusion(lea2, lea).cible === lea && Ap.sensDeLaFusion(lea2, lea).source === lea2
      && Ap.sensDeLaFusion(lea, lea2).cible === lea && Ap.sensDeLaFusion(pers({ ref: "n:a", participant: false, nom: "A", n: 3 }), pers({ ref: "n:b", participant: false, nom: "B", n: 3 })).cible.nom === "A");
  const gardables = Ap.nomsGardables(lea, lea2);
  const gardablesSeule = Ap.nomsGardables(lea, leaSeule);
  const gardablesInverse = Ap.nomsGardables(leaSeule, lea);
  ok("le nom gardé : deux noms à choisir (la cible d'abord) ; garder un nom d'UN SEUL MOT pour la personne qui a une adresse est grisé AVANT le clic (le serveur refuserait, 409), quel que soit le sens de la fusion ; deux noms complets ne sont jamais grisés",
    gardables.length === 2 && gardables[0].nom === "Léa Martin" && gardables[0].garder === "cible" && gardables[1].garder === "source" && gardables.every((g) => g.refus === null)
      && gardablesSeule[0].refus === null && gardablesSeule[1].nom === "Léa" && /Un seul mot/.test(gardablesSeule[1].refus ?? "")
      && /Un seul mot/.test(gardablesInverse[0].refus ?? "") && gardablesInverse[1].refus === null && Pe.decouperNom("Léa") === null && Pe.decouperNom("Léa Martin")?.nom === "Martin");
  /* La même règle que le serveur : `planFusion` + `decouperNom`. Une ancienne d'un mot qui reste cible d'une personne à adresse : la personne à adresse reste (elle seule se retrouve), son nom ne peut pas devenir « Léa ». */
  const planInverse = Pe.planFusion(Pe.lireRefPersonne(lea.ref), Pe.lireRefPersonne(leaSeule.ref), "cible");
  ok("…et le plan que l'écran suppose est celui du serveur : la personne à adresse reste même si elle est la source ; garder le nom d'un seul mot pour elle est refusé des deux côtés",
    planInverse.ok && planInverse.reste.genre === "participant" && Ap.nomsGardables(leaSeule, lea).find((g) => g.garder === "cible")?.refus !== null);
  const phrase = Ap.phraseFusion(lea, lea2, "Léa Martin");
  ok("ce que dit la fusion (planche 4B) : le compte exact, le nom, les adresses qui suivent, rien n'est effacé et le journal permet de la défaire ; une seule photo s'accorde ; sans adresse, rien sur les adresses",
    phrase === "Les 30 photos sont rangées sous Léa Martin, sur tous les liens. Les deux adresses mènent ensuite à cette personne, sur chacun de ses téléphones. Rien n'est effacé, et le journal garde la fusion : l'atelier peut la défaire."
      && /^La 1 photo est rangée sous X, sur tous les liens\. L'adresse mène ensuite/.test(Ap.phraseFusion(pers({ ref: "p:33333333-3333-4333-8333-333333333333", participant: true, nom: "X", n: 1 }), pers({ ref: "n:z", participant: false, nom: "Z", n: 0 }), "X"))
      && !/adresse/.test(Ap.phraseFusion(leaSeule, duo, "Léa")));
  ok("les fusions passées : « Lea Martin → Léa Martin » ; « Défaire » dit ce qui revient (n photos, noms d'avant, une photo arrivée depuis reste chez celui qui est resté, un renommage depuis est défait aussi) ; singulier à 1",
    Ap.ligneFusion({ nomPart: "Lea Martin", nomApres: "Léa Martin" }) === "Lea Martin → Léa Martin" && Ap.ligneFusion({ nomPart: null, nomApres: "Léa" }) === "Sans nom → Léa"
      && /^6 photos reprennent leur personne et leur nom d'avant la fusion \(« Lea Martin » et « Léa Martin »\)\. Une photo arrivée depuis la fusion reste chez la personne qui est restée\. Si l'une des deux a été renommée depuis, elle reprend aussi son nom d'avant la fusion\.$/.test(Ap.phraseDefaire({ n: 6, nomAvant: "Léa Martin", nomPart: "Lea Martin" }))
      && /^1 photo reprend sa personne et son nom d'avant la fusion\./.test(Ap.phraseDefaire({ n: 1, nomAvant: null, nomPart: null })));
  ok("les bilans des gestes sur les personnes : la fusion dit le TOTAL lu à l'écran (le `n` du serveur ne compte que les photos réécrites), le renommage dit où le nom change, « Défaire » s'accorde",
    Ap.bilanFusion(30, "Léa Martin") === "Fusion faite : les 30 photos sont rangées sous Léa Martin. Elle est dans « Fusions passées » : l'atelier peut la défaire." && Ap.bilanFusion(1, "X").startsWith("Fusion faite : la 1 photo est rangée sous X.")
      && Ap.bilanRenommage("Camille Dubois", "Camille Dubois-Roy", 26) === "Camille Dubois s'appelle maintenant Camille Dubois-Roy : 26 photos renommées, dans la grille, les dossiers et le lot."
      && Ap.bilanDefaire(6) === "Fusion défaite : 6 photos ont retrouvé leur personne et leur nom d'avant." && Ap.bilanDefaire(1) === "Fusion défaite : 1 photo a retrouvé sa personne et son nom d'avant.");
  const tout = [e3.corps, e3.titre, e0.corps, absente, phrase, Ap.phraseDefaire({ n: 6, nomAvant: "A", nomPart: "B" }), Ap.bilanEffacement(2, 1), Ap.bilanRestauration(2, 1), Ap.phraseEcheance(2), Ap.bilanFusion(30, "Léa Martin"), Ap.bilanRenommage("A", "B", 2), Ap.bilanDefaire(2)].join(" ");
  ok("aucun cadratin ni demi-cadratin dans une phrase de l'écran (règle des tirets, 20/10) ; aucune phrase ne tutoie (l'atelier lit « vous » ou rien)", !/[—–]/.test(tout) && !/\b(tu|ton|ta|tes)\b/i.test(tout));

  titre("— w2-atelier : l'ouverture du dépôt dans le formulaire (calendrier.ts, FormulaireEdition.tsx) —");
  ok("un jour du calendrier et une heure de Paris : « 2026-11-06T08:00 » (heure d'ouverture proposée : 8 h, la phrase de la planche 9B) ; les minutes d'une ouverture déjà réglée sont gardées quand on change l'heure ; l'heure tient entre 0 et 23",
    Cal.HEURE_OUVERTURE === "08:00" && Cal.champCloture("2026-11-06", Cal.HEURE_OUVERTURE) === "2026-11-06T08:00" && Cal.champAvecHeure("2026-11-06T08:30", 9) === "2026-11-06T09:30" && Cal.champAvecHeure("2026-11-06T08:00", 99) === "2026-11-06T23:00"
      && Cal.champAvecHeure("2026-11-06T08:00", -4) === "2026-11-06T00:00" && Cal.champAvecHeure("", 8) === "" && Cal.champAvecHeure("n'importe quoi", 8) === "" && Cal.champAvecHeure("2026-11-06T08:00", Number.NaN) === "");
  ok("l'heure se dit sans minutes inutiles (« 8 h », « 8 h 30 ») et le choix se lit « vendredi 6 novembre, 8 h » (sans l'année : elle se lit au calendrier)",
    Cal.formaterHeureCourte("08:00") === "8 h" && Cal.formaterHeureCourte("08:30") === "8 h 30" && Cal.formaterHeureCourte("00:00") === "0 h" && Cal.formaterHeureCourte("8h") === "" && Cal.phraseChampOuverture("2026-11-06T08:00") === "vendredi 6 novembre, 8 h" && Cal.phraseChampOuverture("2026-11-01T18:30") === "dimanche 1er novembre, 18 h 30" && Cal.phraseChampOuverture("") === "");
  const iso8 = Da.instantDeParis("2026-11-06T08:00");
  const iso8ete = Da.instantDeParis("2026-07-06T08:00");
  ok("converti par `instantDeParis` (jamais par la machine) : 8 h à Paris = 7 h UTC l'hiver, 6 h l'été ; une heure qui n'existe pas (passage à l'heure d'été) n'est pas décalée en silence ; lu par la phrase de la page 9B, c'est la même heure",
    iso8 === "2026-11-06T07:00:00.000Z" && iso8ete === "2026-07-06T06:00:00.000Z" && Da.instantDeParis("2026-03-29T02:30") === null && Ou.quandOuvre(iso8) === "vendredi 6 novembre à 8 h" && Da.versChampParis(iso8) === "2026-11-06T08:00");
  const baseEd = { organisation: "Audencia", evenement: "Week-end en mer", registre: "ecole_tu", responsable_email: "m@a.fr", magazines: [{ nom: "Bateau" }], cloture_le: "2026-11-15T22:59:00.000Z" };
  const LE = new Date("2026-10-20T12:00:00Z");
  const avant = Sa.lireSaisieEdition({ ...baseEd, ouverture_le: iso8 }, "creation", undefined, LE);
  const apres = Sa.lireSaisieEdition({ ...baseEd, ouverture_le: Da.instantDeParis("2026-11-16T08:00") }, "creation", undefined, LE);
  ok("ce que l'écran envoie est ce que la règle du serveur accepte : une ouverture avant la clôture passe, après elle est refusée (champ `ouverture_le`, étape « Le calendrier », message affichable sous le champ)",
    avant.ok && avant.edition.ouverture_le === iso8 && !apres.ok && apres.erreurs[0].champ === "ouverture_le" && /avant la clôture/.test(apres.erreurs[0].message) && Sa.rangEtapeDuChamp("ouverture_le") === 1);

  const formulaire = lire("src/app/admin/collectif/FormulaireEdition.tsx");
  const pastille = lire("src/app/admin/collectif/Pastille.tsx");
  const nouvelle = lire("src/app/admin/collectif/nouvelle/page.tsx");
  const fiche = lire("src/app/admin/collectif/[id]/page.tsx");
  const liens = lire("src/app/admin/collectif/[id]/PanneauLiens.tsx");
  ok("le champ : un jour du calendrier existant (mode « jour », min = aujourd'hui) + une heure en pastille de 0 à 23, convertie par `instantDeParis` ; « Dès la création » le vide ; JAMAIS le champ du navigateur",
    /libelle="Ouverture du dépôt"\s*aujourdhui=\{aujourdhui\}\s*min=\{aujourdhui\}/.test(formulaire) && /choisirOuverture\(champCloture\(jour, ouv\?\.heure \?\? HEURE_OUVERTURE\)\)/.test(formulaire)
      && /min=\{0\}\s*max=\{23\}/.test(formulaire) && /const iso = instantDeParis\(v\.ouverture_local\);/.test(formulaire) && /Dès la création/.test(formulaire) && !/type="(date|datetime-local|time|number)"/.test(formulaire + pastille)
      && /max\?: number;/.test(pastille) && /Number\(c\) > plafond \? String\(plafond\)/.test(pastille));
  ok("envoyé comme la clôture : en création seulement s'il est réglé, en réglages seulement s'il a CHANGÉ (vide = l'effacer) ; une heure effacée en cours de frappe est refusée sur place ; l'édition garde le reste si elle est refusée",
    /const ouvertureChangee = !props\.ouvertureIndisponible && \(creation \? Boolean\(v\.ouverture_local\) : v\.ouverture_local !== props\.initiales\.ouverture_local\);/.test(formulaire) && /if \(ouvertureChangee\) corps\.ouverture_le = ouverture_le;/.test(formulaire)
      && /Ouverture du dépôt : indiquer l'heure\./.test(formulaire) && /signaler\(parChamp, Boolean\(json\.partiel\)\)/.test(formulaire) && /\{erreur\("ouverture_le"\)\}/.test(formulaire));
  ok("avant la clôture, dit sur place : l'avertissement rouge dès que l'ouverture rejoint la clôture, et le message du serveur (422) sous le champ ; la frise prend l'ouverture pour premier jalon, la durée part d'elle",
    /const ouvertureApresCloture = Number\.isFinite\(instantOuverture\) && Number\.isFinite\(instantCloture\) && instantOuverture >= instantCloture;/.test(formulaire) && /L'ouverture doit venir avant la clôture de la collecte\./.test(formulaire)
      && /ouv \? "Ouverture du dépôt" : creation \? "Aujourd'hui" : "Ouverture"/.test(formulaire) && /const departDepot = ouv && ouv\.jour > aujourdhui \? ouv\.jour : aujourdhui;/.test(formulaire));
  ok("sans la migration 20261023 : le champ le DIT en nommant le fichier et ne propose rien (la fiche lit `ouverture_le === undefined`, /nouvelle sonde la colonne), et un 503 `migration_personnes_absente` met la phrase sous le champ sans casser le reste du formulaire",
    /const ouvertureAbsente = e\.ouverture_le === undefined;/.test(fiche) && /ouvertureIndisponible=\{ouvertureAbsente\}/.test(fiche) && /select\("ouverture_le"\)\.limit\(1\)/.test(nouvelle) && /ouvertureIndisponible=\{ouvertureIndisponible\}/.test(nouvelle)
      && /json\.error === "migration_personnes_absente"/.test(formulaire) && /phraseMigrationAbsente\("Le réglage de l'ouverture du dépôt"\)/.test(formulaire) && /phraseMigrationAbsente\("Ce réglage"\)/.test(formulaire) && /ouverture_local: "",/.test(nouvelle));
  ok("affichée dans « Réglages et liens » : la carte des liens dit « Pas encore ouvert : le dépôt ouvre le … » / « Ouvert depuis … » / « Ouvert dès la création » ; la vue d'ensemble signale un dépôt qui n'est pas encore ouvert",
    /Pas encore ouvert : le dépôt ouvre le \$\{ouverture\.quand\}/.test(liens) && /Ouvert dès la création/.test(liens) && /Ouvert depuis le \$\{ouverture\.quand\}/.test(liens) && /<PanneauLiens id=\{e\.id\} liens=\{liens\} ouverture=\{ouverture\} \/>/.test(fiche)
      && /ouverture\?\.etat === "avenir" \? <span className="eca-puce eca-puce--ambre">Dépôt ouvert le \{ouverture\.quand\}<\/span>/.test(fiche) && /depotOuvert\(e\.ouverture_le, rendu\)/.test(fiche));

  titre("— w2-atelier : la corbeille et les personnes dans la fiche (PanneauCorbeille.tsx, PanneauPersonnes.tsx) —");
  const pCorbeille = lire("src/app/admin/collectif/[id]/PanneauCorbeille.tsx");
  const pPersonnes = lire("src/app/admin/collectif/[id]/PanneauPersonnes.tsx");
  const routeCorbeille = lire("src/app/api/admin/collectif/editions/[id]/corbeille/route.ts");
  const routePersonnes = lire("src/app/api/admin/collectif/editions/[id]/personnes/route.ts");
  ok("la fiche monte les deux panneaux dans l'onglet Photos, sous la collecte ; chacun lit sa route à son affichage (la fiche ne les attend pas) et le nomme dans son entête",
    /photos: \(\s*<>\s*<PanneauCollecte id=\{e\.id\} \{\.\.\.collecte\} effacees=\{effacees\} \/>\s*<div className="eca-cartes eca-cartes--une eca-photos-suite">\s*<PanneauPersonnes id=\{e\.id\} liens=\{collecte\.parLien\.map\(\(l\) => \(\{ cle: l\.cle, nom: l\.nom \}\)\)\} \/>\s*<PanneauCorbeille id=\{e\.id\} migrationAbsente=\{ouvertureAbsente\} \/>/.test(fiche)
      && /useEffect\(\(\) => \{\s*if \(!migrationAbsente\) void lire\(\);\s*\}, \[lire, migrationAbsente\]\);/.test(pCorbeille) && /useEffect\(\(\) => \{\s*void lire\(\);\s*\}, \[lire\]\);/.test(pPersonnes)
      && /await fetch\(adresse, \{ cache: "no-store" \}\)/.test(pCorbeille) && /await fetch\(adresse, \{ cache: "no-store" \}\)/.test(pPersonnes));
  const sansCommentaires = (t: string) => t.replace(/\/\*[\s\S]*?\*\//g, "");
  const adressesCorbeille = [...sansCommentaires(pCorbeille).matchAll(/`(\/api\/[^`]+)`/g)].map((m) => m[1]);
  const adressesPersonnes = [...sansCommentaires(pPersonnes).matchAll(/`(\/api\/[^`]+)`/g)].map((m) => m[1]);
  ok("chaque panneau n'appelle QUE sa route de l'atelier (celle qui revérifie le cookie et journalise qui) ; jamais la route du responsable ni celle du participant",
    adressesCorbeille.join() === "/api/admin/collectif/editions/${id}/corbeille" && adressesPersonnes.join() === "/api/admin/collectif/editions/${id}/personnes" && !/\/api\/collectif\//.test(sansCommentaires(pCorbeille + pPersonnes))
      && /quiEstConnecteRequete\(request\)/.test(routeCorbeille) && /quiEstConnecteRequete\(request\)/.test(routePersonnes));
  const actionsEcran = [...(pCorbeille + pPersonnes).matchAll(/action: "([a-z]+)"/g)].map((m) => m[1]);
  ok("les gestes de l'écran sont ceux que les routes connaissent (restaurer, effacer, renommer, fusionner, defaire) avec les mêmes clés de corps ; aucun « supprimer » : la fiche n'a pas de grille de photos avec sélection, il n'est pas inventé",
    [...new Set(actionsEcran)].sort().join() === "defaire,effacer,fusionner,renommer,restaurer" && ["restaurer", "effacer", "supprimer"].every((a) => routeCorbeille.includes(`"${a}"`)) && ["renommer", "fusionner", "defaire"].every((a) => routePersonnes.includes(`"${a}"`))
      && /photoIds: paquet/.test(pCorbeille) && /verifier: true/.test(pCorbeille + pPersonnes) && /personne: p\.ref, prenom: renommage\.prenom, nom: renommage\.nom/.test(pPersonnes) && /source: source\.ref, cible: cible\.ref, garder: gardeEffectif/.test(pPersonnes)
      && /evenement: f\.evenement, verifier: true/.test(pPersonnes) && /evenement: defaire\.evenement \}/.test(pPersonnes) && !/action: "supprimer"/.test(pCorbeille));
  ok("« Effacer maintenant » en DEUX TEMPS : le premier clic vérifie (`verifier: true`, rien n'est effacé) et affiche ce qui partirait ; le bouton rouge « Effacer définitivement » n'existe qu'après, et seulement s'il reste quelque chose à effacer ; changer la sélection désarme",
    /async function verifier\(\) \{[\s\S]*?action: "effacer", photoIds: paquet, verifier: true/.test(pCorbeille) && /async function effacer\(\) \{[\s\S]*?action: "effacer", photoIds: paquet \}/.test(pCorbeille) && pCorbeille.indexOf("async function verifier()") < pCorbeille.indexOf("async function effacer()")
      && /\{armee\.aEffacer > 0 \? \(\s*<button type="button" className="adm-btn eca-co-effacer"/.test(pCorbeille) && /function basculer\(photo: string\) \{\s*setArmee\(null\);/.test(pCorbeille) && /function toutCocher\(\) \{\s*setArmee\(null\);/.test(pCorbeille)
      && /if \(!armee \|\| occupe\) return;/.test(pCorbeille));
  ok("« Effacer maintenant » rend 200 et `ratees` (audit S7, plus de 502) : l'écran retire de la liste QUE les photos effacées, dit le fichier resté au coffre, et toute autre réponse relit la liste",
    /if \(r\.statut !== 200\) \{/.test(pCorbeille) && !/502\)/.test(pCorbeille) && /for \(const x of \(Array\.isArray\(r\.json\?\.ids\)/.test(pCorbeille) && /setPhotos\(\(p\) => p\.filter\(\(x\) => !parties\.has\(x\.id\)\)\)/.test(pCorbeille)
      && /Des photos ont pu quitter le coffre : la liste se relit/.test(pCorbeille) && /bilanEffacement\(n, ratees\)/.test(pCorbeille));
  ok("la corbeille dit qui, quand et dans combien de jours ; l'échéance passe en alerte sous trois jours (la réponse du serveur, pas un chiffre de l'écran) ; une photo sans aperçu le dit ; la sélection est rappelée",
    /p\.alerte \? "eca-puce eca-co-echeance eca-co-echeance--alerte"/.test(pCorbeille) && /phraseEcheance\(p\.joursRestants\)/.test(pCorbeille) && /supprimée \$\{p\.parQui\}, \$\{jourEtHeureParis\(p\.supprimeeLe\)\}/.test(pCorbeille) && /sans aperçu/.test(pCorbeille) && /dans la sélection du client/.test(pCorbeille)
      && !/\b3 jours\b|ALERTE_JOURS/.test(pCorbeille) && /\{jours\} jours<\/strong>/.test(pCorbeille));
  ok("sans la migration, la lecture de la corbeille (503 `migration_personnes_absente`) met la phrase qui nomme le fichier ; les gestes d'écriture qui recevraient 503 la répètent ; la fiche tient (aucune exception, la carte reste)",
    /rep\.status === 503 && json\?\.error === "migration_personnes_absente"/.test(pCorbeille) && /setEtat\(\{ genre: "absente" \}\)/.test(pCorbeille) && /useState<Etat>\(migrationAbsente \? \{ genre: "absente" \} : \{ genre: "chargement" \}\)/.test(pCorbeille) && (pCorbeille.match(/phraseMigrationAbsente\("La corbeille"\)/g) ?? []).length >= 4
      && /rep\.status === 503 && json\?\.error === "migration_personnes_absente"/.test(pPersonnes) && /!lecture\.avecAdresses/.test(pPersonnes) && /const gestes = lecture\?\.avecAdresses === true;/.test(pPersonnes)
      && /disabled=\{!gestes \|\| occupe !== null\}/.test(pPersonnes) && /phraseMigrationAbsente\(quoi\)/.test(pPersonnes));
  ok("l'atelier voit l'adresse ENTIÈRE (la route lit `chargerPersonnes(…, \"entier\")`), jamais masquée ici ; une personne d'avant le dit (« sans adresse ») ; les doublons se PROPOSENT et « Ignorer » n'écrit rien",
    /chargerPersonnes\(supabase, id, "entier"\)/.test(routePersonnes) && /p\.email \?\? SANS_ADRESSE/.test(pPersonnes) && /Rien n'est écrit\./.test(pPersonnes) && !/masquerEmail/.test(pPersonnes) && /Peut-être la même personne/.test(pPersonnes)
      && !/action: "fusionner"[^}]*proposees/.test(pPersonnes));
  ok("fusionner jamais d'office : seule la fenêtre (deux personnes, « Le nom gardé », la phrase, « Annuler ») envoie `fusionner`, sur un clic de « Fusionner » ; elle s'ouvre dans `.eca-root` par un portail (le verre d'une carte enfermerait une fenêtre fixe) et Échap la ferme",
    (pPersonnes.match(/action: "fusionner"/g) ?? []).length === 1 && /async function fusionner\(\) \{\s*if \(!source \|\| occupe\) return;/.test(pPersonnes) && /createPortal\(contenu, hote\)/.test(pPersonnes) && /document\.querySelector\("\.eca-root"\)/.test(pPersonnes)
      && /e\.key === "Escape"/.test(pPersonnes) && /<legend>Le nom gardé<\/legend>/.test(pPersonnes) && /disabled=\{Boolean\(g\.refus\)\}/.test(pPersonnes));
  ok("« Défaire » en DEUX TEMPS : « Défaire… » vérifie (`verifier: true`) et montre ce qui reviendrait, « Défaire la fusion » écrit ; une fusion déjà défaite n'a pas de bouton (« Défaite »), et un 409 relit la liste",
    /async function verifierDefaire\(f: FusionVue\)[\s\S]*?verifier: true/.test(pPersonnes) && /async function defaireLaFusion\(\)/.test(pPersonnes) && pPersonnes.indexOf("async function verifierDefaire") < pPersonnes.indexOf("async function defaireLaFusion")
      && /\{f\.defaite \? \(\s*<span className="eca-puce eca-puce--gris">Défaite<\/span>/.test(pPersonnes) && /if \(r\.statut === 409 \|\| r\.statut === 404\) await lire\(\);/.test(pPersonnes) && /Cette fusion est déjà défaite\./.test(pPersonnes) && /phraseDefaire\(defaire\)/.test(pPersonnes));
  ok("renommer : prénom ET nom (les deux requis pour valider), 80 caractères au plus comme le serveur, le nom d'une personne d'avant se découpe en prénom et nom ; le participant ne se renomme jamais (aucun écran ici qui ne passe par l'atelier)",
    /maxLength=\{80\}/.test(pPersonnes) && /disabled=\{occupe !== null \|\| !renommage\.prenom\.trim\(\) \|\| !renommage\.nom\.trim\(\)\}/.test(pPersonnes) && /decouperNom\(x\.nom\) \?\? \{ prenom: x\.nom, nom: "" \}/.test(pPersonnes) && /Le participant ne le corrige pas lui-même/.test(pPersonnes));

  const cssCo = lire("src/app/admin/collectif/corbeille.css");
  const cssPe = lire("src/app/admin/collectif/personnes.css");
  const selecteursHorsScope = [cssCo, cssPe].flatMap((css) => css.replace(/\/\*[\s\S]*?\*\//g, "").split("\n").filter((l) => /^\.(?!eca-root)/.test(l) || /^(?:html|body|\*|:root)\b/.test(l)));
  ok("les deux feuilles sont scopées par `.eca-root` (aucune classe courte hors scope, rien ne repeint une autre page), sans `dvh`, sans token mort (--cream, --steel, --ink), sans `!important`, sans `next/image`",
    selecteursHorsScope.length === 0 && !/dvh|--cream|--steel|--ink|!important/.test(cssCo + cssPe) && !/next\/image/.test(pCorbeille + pPersonnes + formulaire)
      && /@import|<link/.test(cssCo + cssPe) === false && /import "\.\.\/corbeille\.css";/.test(pCorbeille) && /import "\.\.\/personnes\.css";/.test(pPersonnes));
  ok("chaque classe du panneau a sa règle (aucune classe `eca-co-*` ou `eca-pe-*` posée dans le balisage sans feuille) ; le balisage ne porte aucun style en ligne",
    [...new Set([...(pCorbeille.match(/eca-co-[a-z-]+/g) ?? [])])].every((c) => cssCo.includes(`.${c}`)) && [...new Set([...(pPersonnes.match(/eca-pe-[a-z-]+/g) ?? [])])].every((c) => cssPe.includes(`.${c}`)) && !/style=\{\{/.test(pCorbeille + pPersonnes));
}


titre("— la fiche de l'atelier lit les nouvelles formes du durcissement (nomPropose, interrompue) —");
{
  const pPers = lire("src/app/admin/collectif/[id]/PanneauPersonnes.tsx");
  ok("un autre nom tapé sous une adresse connue se DIT sur la fiche de la personne (jamais renommé d'office) ; une fusion interrompue porte « Interrompue » et reste défaisable",
    /p\.nomPropose && !renommage/.test(pPers) && /className="eca-pe-propose"/.test(pPers) && /renommez la personne/.test(pPers)
      && /f\.interrompue && !f\.defaite/.test(pPers) && /Interrompue<\/span>/.test(pPers) && /\.eca-root \.eca-pe-propose \{/.test(lire("src/app/admin/collectif/personnes.css")));
}

/* ════════════ LOT w2 (20/10) : la page Photos du responsable, Supprimer, la corbeille, une personne (planches 3, 4, 5) ════════════ */

async function verifPhotosW2() {
  titre("— w2 : Supprimer, la corbeille, une personne, les cochées en une requête, les champs de la grille —");
  const F = FiltresPhotos;
  const V = F.FILTRES_VIDES;
  const G = await import("@/lib/collectif/grillePhotos");
  const R = await import("@/lib/collectif/resumePhotos");
  const L = "lien:0b1f3c2e-4a5b-4c6d-8e9f-001122334455";
  const q = (f: Partial<FiltresPhotos.Filtres>) => F.requeteDe({ ...V, ...f });

  /* Les listes. */
  ok("« Ne pas publier » est une VUE qui se croise avec le lien (`signalees`) ; elle et « Doublons » s'excluent (la route n'en lit qu'une)",
    JSON.stringify(q({ lien: L, signalees: true })) === JSON.stringify({ dossier: L, vue: "signalees" }) && F.avecSignalees({ ...V, doublons: true }, true).doublons === false
      && F.avecDoublons({ ...V, signalees: true }, true).signalees === false && F.nombreDeFiltres({ ...V, signalees: true, lien: L }) === 2 && G.VUES.includes("signalees"));
  ok("la corbeille : un endroit à part (`?dossier=corbeille`, rien des listes ne s'y croise) ; tout autre geste des listes en sort ; un lien ou « Ma sélection » la ferment",
    F.adresseDe(F.avecCorbeille({ ...V, lien: L, ordre: "jour" })) === "?dossier=corbeille" && F.filtresDepuis("corbeille").corbeille && JSON.stringify(F.avecCorbeille({ ...V, lien: L, ordre: "jour" })) === JSON.stringify({ ...V, ordre: "jour", corbeille: true })
      && !F.sortirDeLaCorbeille({ ...V, corbeille: true, mode: "liens" }).corbeille && !F.avecLien({ ...V, corbeille: true }, L).corbeille && !F.avecSelection({ ...V, corbeille: true }, true).corbeille
      && !F.estVueAlbums({ ...V, mode: "liens", corbeille: true }));
  ok("une personne a une FICHE (`qui:`, `pers:`) ; ni le responsable, ni « Sans nom » ; après un renommage, le même endroit sous le nouveau nom",
    F.cleDeLaPersonne("qui:léa martin") === "léa martin" && F.cleDeLaPersonne("pers:general:léa") === "léa" && F.cleDeLaPersonne(`pers:${L.slice(5)}:hugo`) === "hugo"
      && F.cleDeLaPersonne("qui:@responsable") === null && F.cleDeLaPersonne("qui:sans nom") === null && F.cleDeLaPersonne(L) === null && F.cleDeLaPersonne(null) === null
      && F.filtreSousLeNom("qui:léa", "Léa Martin") === "qui:léa martin" && F.filtreSousLeNom("pers:general:lea martin", "Léa Martin") === "pers:general:léa martin");
  const pv = (ref: string, nom: string, n: number, o: Partial<FiltresPhotos.PersonneVue> = {}): FiltresPhotos.PersonneVue => ({ ref, participant: ref.startsWith("p:"), nom, prenom: null, nomDeFamille: null, cle: Dossiers.clePersonne(nom), email: null, n, liens: [], telephones: 0, derniere: null, depuis: null, ...o });
  const listeP: FiltresPhotos.ListePersonnes = {
    /* L'homonyme d'avant (sans adresse) a PLUS de photos : la fiche garde quand même la personne qui s'est présentée. */
    personnes: [pv("n:léa martin", "Léa Martin", 30), pv("p:1", "Léa Martin", 24, { email: "l•••@audencia.com" }), pv("p:2", "Lea Martin", 6), pv("n:léa", "Léa", 2), pv("n:hugo", "Hugo", 9)],
    proposees: [{ a: "n:léa martin", b: "p:1", raison: "meme_nom" }, { a: "p:1", b: "p:2", raison: "meme_nom" }, { a: "p:1", b: "n:léa", raison: "meme_prenom" }, { a: "n:hugo", b: "p:9", raison: "meme_nom" }],
    avecAdresses: true,
  };
  const ficheLea = F.ficheDe(listeP, "léa martin");
  ok("la fiche : la personne de ce nom qui s'est présentée par son adresse (MASQUÉE par le serveur), et les doublons PROPOSÉS qui la touchent (l'homonyme d'avant compris), jamais ceux des autres",
    ficheLea?.personne.ref === "p:1" && ficheLea.personne.email === "l•••@audencia.com" && ficheLea.propositions.map((x) => x.personne.ref).join() === "n:léa martin,p:2,n:léa"
      && F.ficheDe(listeP, "personne") === null && F.ficheDe(null, "léa martin") === null && F.ficheDe(listeP, "hugo")?.propositions.length === 0);
  ok("les puces d'un doublon : « même nom, sans l'accent », « même prénom, même lien » ; renommer propose prénom ET nom",
    F.raisonTexte("meme_nom", "Léa Martin", "Lea Martin") === "même nom, sans l'accent" && F.raisonTexte("meme_prenom", "Léa Martin", "Léa") === "même prénom, même lien" && F.raisonTexte("meme_nom", "Léa Martin", "Léa Martin") === "même nom"
      && JSON.stringify(F.prenomEtNom({ prenom: null, nomDeFamille: null, nom: "Léa Martin Durand" })) === '{"prenom":"Léa","nom":"Martin Durand"}' && JSON.stringify(F.prenomEtNom({ prenom: "Léa", nomDeFamille: "Martin", nom: "x" })) === '{"prenom":"Léa","nom":"Martin"}');
  ok("la corbeille dit l'échéance et l'instant à l'heure de Paris ; une photo restaurée dit où elle est revenue, « La voir » ouvre son lien et sa personne",
    F.echeanceTexte(2) === "Effacée dans 2 jours" && F.echeanceTexte(1) === "Effacée dans 1 jour" && F.echeanceTexte(0) === "Effacée au prochain passage"
      && F.instantCourt("2026-11-07T14:02:00Z") === "sam. 7 nov. à 15 h 02" && F.jourDeLInstant("2026-11-07T23:30:00Z") === "dim. 8 nov."
      && F.phraseRetour(L, "Bateau 1", "Léa Martin") === "De retour dans Bateau 1, chez Léa Martin" && F.phraseRetour("vous", "Le responsable", "Mathilde") === "De retour dans Mes photos"
      && F.requeteDe(F.filtreDuRetour(L, "Léa Martin")).dossier === `pers:${L.slice(5)}:léa martin` && F.requeteDe(F.filtreDuRetour("participants", "Camille")).dossier === "pers:general:camille");
  const mille = Array.from({ length: 1001 }, (_, i) => String(i));
  ok("les cochées partent par lots de 500 (la règle de la route, `PHOTOS_PAR_GESTE`), jamais une requête par photo",
    F.LOT_ECRITURE === 500 && F.enLots(mille).map((l) => l.length).join() === "500,500,1" && F.enLots([]).length === 0);

  /* La grille : `signalee`, la photo en grand, la vue et le compte « Ne pas publier », la corbeille. */
  type LG = import("@/lib/collectif/grillePhotos").LigneGrille;
  const id = (i: number) => `00000000-0000-4000-8000-0000000000${String(i).padStart(2, "0")}`;
  const ligne = (i: number, o: Partial<LG> = {}): LG => ({
    id: id(i), vignette_key: `collectif/v/${i}.jpg`, r2_key: `collectif/o/${i}.jpg`, nom_origine: `IMG_${i}.jpg`, provenance_type: "participant", deposant: "Léa Martin", prise_le: null,
    confirmee_le: `2026-11-07T10:0${i}:00+00:00`, ordre: i, empreinte: null, preselection: false, signalee: false, mime: "image/jpeg", provenance_id: null, role_deposant: "participant", appareil_id: "a1", ...o,
  });
  const lignes = [ligne(1), ligne(2, { signalee: true }), ligne(3, { mime: "image/heic", vignette_key: null }), ligne(4, { mime: "image/heic" }), ligne(5, { vignette_key: null, signalee: true }), ligne(6, { deposant: "Hugo", signalee: true }), ligne(7, { mime: "image/png" })];
  const ctx = (corbeille?: number | null) => ({ edition: { responsable_nom: "Mathilde Roux", plafond_participant_atelier: 60, plafond_participant_client: null, plafond_total: null }, provenances: [], partage: true, enCours: 0, signer: async (c: string) => `v:${c}`, signerOriginal: async (c: string) => `o:${c}`, ...(corbeille === undefined ? {} : { corbeille }) });
  const dem = (dossier: string, vue: "toutes" | "signalees") => ({ dossier, vue, page: 0, seulementArbre: false });
  const tout = await G.grilleDepuisLignes(lignes, [], dem("tout", "toutes"), ctx(4));
  const t = (i: number) => tout.photos.find((x) => x.id === id(i));
  ok("chaque vignette dit « Ne pas publier » (`signalee`, relu à chaque page : il survit au rechargement)",
    t(2)?.signalee === true && t(1)?.signalee === false && tout.photos.filter((x) => x.signalee).length === 3);
  ok("la photo EN GRAND : l'original signé pour un JPEG ou un PNG ; un HEIC garde sa vignette (ou rien) ; une photo sans vignette réutilise l'original déjà signé",
    t(1)?.grande === "o:collectif/o/1.jpg" && t(1)?.vignette === "v:collectif/v/1.jpg" && t(7)?.grande === "o:collectif/o/7.jpg" && t(4)?.grande === "v:collectif/v/4.jpg" && t(3)?.grande === null && t(3)?.vignette === null
      && t(5)?.vignette === "o:collectif/o/5.jpg" && t(5)?.grande === "o:collectif/o/5.jpg" && G.afficheEnGrand("image/webp") && !G.afficheEnGrand("image/heic") && !G.afficheEnGrand(null));
  const sig = await G.grilleDepuisLignes(lignes, [], dem("tout", "signalees"), ctx(4));
  const sigHugo = await G.grilleDepuisLignes(lignes, [], dem("qui:hugo", "signalees"), ctx(4));
  ok("« Ne pas publier » : la vue montre les signalées du dossier, la plus récente d'abord ; la ligne de « Afficher » les compte (dans le dossier) ; la corbeille est comptée à part",
    sig.photos.map((x) => x.id).join() === [id(6), id(5), id(2)].join() && sig.compteurs.liste === 3 && sig.suivante === null && tout.compteurs.signalees === 3
      && sigHugo.photos.map((x) => x.id).join() === id(6) && sigHugo.compteurs.signalees === 1 && tout.stats.corbeille === 4 && (await G.grilleDepuisLignes(lignes, [], dem("tout", "toutes"), ctx())).stats.corbeille === null);
  ok("la condition « Ne pas publier » s'écrit pour PostgREST (`signalee=eq.true`) et se lit pareil en mémoire ; elle n'entre jamais dans un plan VÉRIFIÉ (le résumé ne la porte pas)",
    JSON.stringify(R.enFiltresPostgrest([{ op: "signalee" }])) === '[{"methode":"eq","colonne":"signalee","valeur":true}]' && R.correspond({ role_deposant: "participant", provenance_id: null, provenance_type: "participant", deposant: "x", signalee: true }, [{ op: "signalee" }])
      && !R.correspond({ role_deposant: "participant", provenance_id: null, provenance_type: "participant", deposant: "x" }, [{ op: "signalee" }]) && !/op: "signalee"/.test(lire("src/lib/collectif/resumePhotos.ts").slice(lire("src/lib/collectif/resumePhotos.ts").indexOf("export function planDuDossier"), lire("src/lib/collectif/resumePhotos.ts").indexOf("export function correspond"))));

  /* Le code : les routes, l'équipe, la migration qui manque. */
  const route = lire("src/app/api/collectif/photos/route.ts");
  const cs = lire("src/lib/collectif/corbeilleServeur.ts");
  const page = lirePagePhotos();
  const collecte = lire("src/app/edition/[token]/photos/Collecte.tsx");
  const corbeilleTsx = lire("src/app/edition/[token]/photos/Corbeille.tsx");
  const personneTsx = lire("src/app/edition/[token]/photos/Personne.tsx");
  const listesTsx = lire("src/app/edition/[token]/photos/Listes.tsx");
  ok("la route photos : « Ne pas publier » compté sans ligne (GET `limit(0)`, hors corbeille) ; la corbeille comptée pour le responsable seul, `null` sans la migration, jamais en `head`",
    /async compterFiltre\(conditions\) \{\s*const \{ count, error \} = await lireHorsCorbeille\(\(avec\) => base\(conditions, avec, true\)\.limit\(0\)\);/.test(route) && /peut\(acces\.role, "gerer_corbeille"\) \? compterCorbeille\(supabase, edition\.id\) : Promise\.resolve\(null\)/.test(route)
      && /if \(!migrationPersonnesPresumee\(\)\) return null;/.test(cs) && /\.select\("id", COMPTE_SANS_LIGNE\)\.eq\("edition_id", editionId\)\.not\("supprimee_le", "is", null\)\.limit\(0\)/.test(cs) && /COLONNES_PAGE = "[^"]*\bsignalee\b/.test(lire("src/lib/collectif/grillePhotos.ts")));
  ok("les cochées : UNE requête `marquer` par lot de 500 (`photoIds`), plus d'écriture photo par photo ; Supprimer et Annuler passent par la corbeille avec les MÊMES ids",
    /body: JSON\.stringify\(\{ token: p\.token, photoIds: lot, \.\.\.corps \}\)/.test(collecte) && !/unaUne|photoId: id/.test(collecte) && /"\/api\/collectif\/photos\/corbeille", \{ method: "POST", headers: \{ "content-type": "application\/json" \}, body: JSON\.stringify\(\{ token: p\.token, action, photoIds: lot \}\) \}\)/.test(collecte)
      && /annuler: \(\) => void annulerSuppression\(faites, retrait, v0\)/.test(collecte) && /issue = await ecrireCorbeille\("restaurer", ids\);/.test(collecte) && /issue = await ecrireCorbeille\("supprimer", ids\);/.test(collecte));
  ok("le lien d'équipe ne voit ni Supprimer, ni la corbeille, ni un geste sur une personne : `p.ecrire` partout, la route lui répond 403",
    /onSupprimer=\{p\.ecrire \? \(\) => void mettreALaCorbeille\(\[photoAgrandie\.id\]\) : undefined\}/.test(collecte) && /voirCorbeille=\{p\.ecrire\}/.test(collecte) && /\{l\.voirCorbeille \? \(/.test(listesTsx)
      && /return d\.corbeille && !p\.ecrire \? FILTRES_VIDES : d;/.test(collecte) && /const nf = nf0\.corbeille && !p\.ecrire \? \{ \.\.\.nf0, corbeille: false \} : nf0;/.test(collecte) && /if \(occupe \|\| !ids\.length \|\| !p\.ecrire\) return;/.test(collecte)
      && /\{f\.ecrire && p \? \(\s*<div className="ec-pe-gestes">/.test(personneTsx) && /const propositions = f\.ecrire && !ignorees/.test(personneTsx) && peut("equipe", "gerer_corbeille") === false && peut("equipe", "gerer_personnes") === false);
  ok("sans la migration 20261023 (503 `migration_personnes_absente`) : l'écran dit « La mise à jour de la base n'est pas encore appliquée », jamais le message brut de la route (il nomme le fichier SQL)",
    /export const BASE_PAS_A_JOUR = "La mise à jour de la base n'est pas encore appliquée";/.test(corbeilleTsx) && /if \(rep\.status === 503 && json\.error === ERREUR_PERSONNES_ABSENTE\) setEtat\(\{ genre: "absente" \}\);/.test(corbeilleTsx)
      && /if \(rep\.status === 503 && json\.error === ERREUR_PERSONNES_ABSENTE\) return fin\(\{ statut: "absente" \}\);/.test(collecte) && /setErreurFenetre\(json\.error === ERREUR_PERSONNES_ABSENTE \? MIGRATION_TEXTE :/.test(collecte)
      && /setErreur\(json\.error === ERREUR_PERSONNES_ABSENTE \? MIGRATION_TEXTE :/.test(collecte) && !/20261023_collectif_personnes_corbeille/.test(page));
  ok("une personne : lister, renommer (prénom ET nom), fusionner avec le nom gardé (`garder`) ; les doublons proposés, JAMAIS fusionnés d'office ; défaire reste à l'atelier",
    /action: "lister"/.test(collecte) && /action: "renommer", personne: qui\.ref, prenom, nom/.test(collecte) && /action: "fusionner", source: source\.ref, cible: cible\.ref, garder/.test(collecte)
      && !/defaire|défaire",/.test(collecte) && (collecte.match(/fusionnerPersonnes\(/g) ?? []).length === 2 && /onFusionner=\{\(autre, garder\) => void fusionnerPersonnes\(fiche\.personne, autre, garder\)\}/.test(collecte)
      && /Ignorer/.test(personneTsx) && /Prénom/.test(personneTsx) && /Le nom gardé/.test(personneTsx));
  ok("un autre nom tapé avec son adresse (`nomPropose`, durcissement C4) : dit sobrement sur la fiche (tu / vous), au responsable seul, avec le geste Renommer pré-rempli ; jamais de renommage d'office",
    F.phraseNomPropose({ nom: "Léa Marin", le: "2026-11-07T14:02:00Z" }, true) === "Quelqu'un a aussi tapé cette adresse sous le nom « Léa Marin » (le sam. 7 nov. à 15 h 02). L'adresse n'est pas vérifiée : si c'est le bon nom, renomme la personne."
      && F.phraseNomPropose({ nom: "Léa Marin", le: "2026-11-07T14:02:00Z" }, false).endsWith("renommez la personne.")
      && /\{f\.ecrire && p\?\.nomPropose \? \(/.test(personneTsx) && /onClick=\{\(\) => p\.nomPropose && f\.onRenommer\(p\.nomPropose\.nom\)\}/.test(personneTsx)
      && /const depart = r\.propose \? prenomEtNom\(\{ prenom: null, nomDeFamille: null, nom: r\.propose \}\) : prenomEtNom\(r\.personne\);/.test(personneTsx)
      && (collecte.match(/renommerPersonne\(/g) ?? []).length === 2 && /onGarder=\{\(prenom, nom\) => void renommerPersonne\(renommerP\.personne, prenom, nom\)\}/.test(collecte));
  ok("la visionneuse : la vignette tout de suite, l'original par-dessus dès qu'il arrive ; les voisines préchargent leur photo en grand",
    /className=\{grandes\[p\.id\] \? "ec-ag-img ec-ag-img--grande ec-ag-img--la" : "ec-ag-img ec-ag-img--grande"\}/.test(lire("src/app/edition/[token]/photos/Agrandir.tsx")) && /\.map\(\(x\) => x\?\.grande \?\? x\?\.vignette\)/.test(collecte));
}


/* ════════════════════ w2 : LA PAGE DU PARTICIPANT (planches 6 à 9 du 20/10, T-198, T-199) ════════════════════ */

async function verifDepotParticipant() {
  const DP = await import("@/lib/collectif/depotParticipant");
  const Ouv = await import("@/lib/collectif/ouverture");
  const Ap = await import("@/app/depot/[token]/appels");
  const depotW2 = lire("src/app/depot/[token]/Depot.tsx");
  const albumW2 = lire("src/app/depot/[token]/Album.tsx");
  const etatsW2 = lire("src/app/depot/[token]/Etats.tsx");
  const pageW2 = lire("src/app/depot/[token]/page.tsx");
  const lectureW2 = lire("src/app/depot/[token]/lecture.ts");
  const moteurW2 = lire("src/app/edition/_composants/depot/moteur.ts");

  titre("— w2 : se presenter par son adresse (planches 6 et 8) —");
  ok("la phrase sous l'adresse dit a quoi elle sert, et a rien d'autre (tu et vous)",
    depotW2.includes("Elle sert seulement à te reconnaître sur un autre appareil ou un autre lien. Nous ne t'écrirons pas pour autre chose.")
      && depotW2.includes("Elle sert seulement à vous reconnaître sur un autre appareil ou un autre lien. Nous ne vous écrirons pas pour autre chose."));
  ok("l'adresse complete est demandee au serveur SANS nom (rien n'est ecrit pour une adresse inconnue) ; inconnue, prenom ET nom",
    /const r = await presenter\(token, p, emailLu\);/.test(depotW2) && /r\.json\.statut === "connu"/.test(depotW2) && /autoComplete="email"/.test(depotW2) && /type="email"/.test(depotW2));
  const iPresenter = depotW2.indexOf("presenter(token, p, adresse, prenomSaisi, nomSaisi)");
  const iAjouter = depotW2.indexOf("moteur.ajouter(fichiers)");
  ok("presenter d'ABORD, envoyer ensuite : la personne nouvelle est creee avant que la premiere photo parte (le serveur rattache la photo a la personne du telephone)",
    iPresenter > 0 && iAjouter > iPresenter && !/definirEmail|email:/.test(moteurW2.replace(/\/\*[\s\S]*?\*\//g, "")));
  const connu = Ap.lirePersonne({ statut: "connu", participant: { prenom: "Léa", nom: "Martin", nomAffiche: "Léa Martin" }, photos: 24, ceTelephone: 3, accordAJour: true, place: 36 }, "Martin");
  const cree = Ap.lirePersonne({ statut: "cree", participant: { prenom: "Léa", nom: "Martin" }, photos: 0, ceTelephone: 0, accordAJour: false, place: null }, "Martin");
  ok("une personne RETROUVEE ne montre que son prenom (jamais son nom de famille) ; le nom complet seulement s'il vient d'etre tape (creation)",
    connu?.prenom === "Léa" && connu.nom === null && connu.photos === 24 && connu.accordAJour && connu.place === 36
      && cree?.nom === "Martin" && cree.place === null && !/\.nomAffiche|participant\.nom\b/.test(depotW2 + albumW2 + etatsW2));
  ok("« Ce n'est pas toi ? » (action oublier) : le telephone repart de zero et le dit (8C) ; l'accord est retire du moteur",
    /const r = await oublier\(token, p\);/.test(depotW2) && /Cet appareil n&apos;envoie plus au nom de <b>\{oublie\}<\/b>\. Ses photos restent à son nom\./.test(depotW2)
      && /setAccord\(false\);\s*moteur\.definirAccord\(null\);/.test(depotW2));
  ok("l'accord est redemande sur chaque nouveau telephone : il n'est repris que si CE telephone a deja accepte la version d'aujourd'hui",
    /accordAJour: comptes\?\.accord === VERSION_ACCORD,/.test(pageW2) && /if \(accordInitial\) m\.definirAccord\(VERSION_ACCORD\);/.test(depotW2) && /const accordInitial = Boolean\(props\.moi\?\.accordAJour\);/.test(depotW2));
  ok("sans la migration 20261023 (sonde ou 503 a la presentation) : la formule d'avant, sans adresse, et rien a supprimer",
    /const repli = !props\.personnes \|\| repliForce;/.test(depotW2) && (depotW2.match(/if \(r\.status === 503\) \{\s*(\/\*[^*]*\*\/\s*)?(enRepli = true;\s*)?setRepliForce\(true\);/g) ?? []).length >= 2
      && /personnes=\{!repli\}/.test(depotW2) && /const peutSupprimer = props\.personnes && !props\.lectureSeule && Boolean\(props\.moteur\);/.test(albumW2));
  ok("la page sait si la migration est la sans rien ecrire : la personne du telephone, ou une sonde GET `limit(0)` (jamais `head`)",
    /participantDeLAppareil\(supabase, editionId, appareil\)/.test(lectureW2) && /\.select\('participant_id', COMPTE_SANS_LIGNE\)/.test(lectureW2) && /\.limit\(0\)/.test(lectureW2) && !/head: true/.test(lectureW2) && /personnesAbsentes\(error\)/.test(lectureW2));
  ok("le nom garde sur le telephone (sans la migration) est PROPRE a ce lien (T-198), et la cle ne contient jamais le token",
    /function clePrenom\(token: string, p: string \| null\)/.test(depotW2) && !/"bj-depot-prenom"/.test(depotW2)
      && !DP.cleDeVisite("DpOuvertxxxxxxxxxxxxxxxxxxxxxxxx", null).includes("DpOuvert") && DP.cleDeVisite("a".repeat(32), "p") !== DP.cleDeVisite("a".repeat(32), null));

  titre("— w2 : l'envoi, par arrivee (planche 7B) —");
  const prog = DP.progression({ arrivees: 0, auCoffre: 7, enCours: 18 });
  ok("7 photos au coffre sur 18 : « 7 sur 18 envoyées · il en reste 11 » (plus « 0 photo reçue · 18 en cours » pendant 15 s)",
    prog.envoyees === 7 && prog.restent === 11 && prog.total === 18 && prog.part === 39 && DP.progression({ arrivees: 0, enCours: 18 }).envoyees === 0
      && DP.progression({ arrivees: 11, auCoffre: 3, enCours: 3 }).restent === 0);
  ok("le moteur compte le coffre (`auCoffre`) sans attendre la confirmation groupee ; la vue vide le connait",
    /if \(it\.etat === "envoye"\) auCoffre\+\+;/.test(moteurW2) && /auCoffre,\s*place: this\.place,/.test(moteurW2) && /auCoffre: 0 \}/.test(lire("src/app/edition/_composants/depot/useMoteur.ts"))
      && /const prog = progression\(lot\);/.test(albumW2) && /\{prog\.envoyees\} <small>sur \{prog\.total\} envoyée/.test(albumW2));
  const iRefus = moteurW2.indexOf('if (status === 409 && typeof json.error === "string" && REFUS_EXPLIQUES.includes(json.error)) {\n        /* Pas encore ouvert : le lot');
  ok("409 `depot_pas_ouvert` refuse le lot avec la phrase du serveur (comme `accord_requis`), jamais une coupure ni un « reessayer » sans fin",
    Ouv.ERREUR_PAS_OUVERT === "depot_pas_ouvert" && /const REFUS_EXPLIQUES: readonly string\[\] = \[ERREUR_PAS_OUVERT\];/.test(moteurW2)
      && iRefus > 0 && iRefus < moteurW2.indexOf("await attendre(1_000);") && iRefus < moteurW2.indexOf("throw new Error(`presign")
      && (moteurW2.match(/REFUS_EXPLIQUES\.includes\(json\.error\)/g) ?? []).length === 2);
  ok("une photo a la corbeille redeclaree n'est jamais dupliquee : « deja la » (et, depuis le 21/10, ou elle etait, ou revenue si son auteur l'avait supprimee)",
    /deja: true, photoId: d\.id, \.\.\.\(d\.corbeille \? \{ corbeille: true \} : \{\}\)/.test(lire("src/app/api/collectif/depot/presign/route.ts"))
      && /\} else if \(r\.deja \|\| r\.double\) \{[\s\S]{0,400}it\.deja = r\.double \? DEJA_CONNUE : lireDejaLa\(r\);\s*this\.finir\(it, "deja", null\);/.test(moteurW2));
  ok("aucune adresse ne part avec les photos (presign l'ignore : la personne est celle du telephone) ; le depot du responsable ne garde aucun apercu",
    !/premier\.email|definirEmail/.test(moteurW2)
      && !/definirEmail|apercus/.test(lire("src/app/edition/_composants/depot/DepotContexte.tsx") + lire("src/app/edition/_composants/depot/FenetreEnvoi.tsx") + lire("src/app/edition/_composants/depot/ZoneDepot.tsx")));
  ok("l'API du moteur reste compatible : tout ce qui est neuf est FACULTATIF (le depot du responsable cree toujours `new MoteurDepot({ token })`)",
    /apercus\?: number;/.test(moteurW2) && /private put\(url: string, corps: Blob, type: string, avancer\?: \(part: number\) => void\)/.test(moteurW2)
      && /new MoteurDepot\(\{ token \}\)/.test(lire("src/app/edition/_composants/depot/DepotContexte.tsx")) && /place\?: number \| null;/.test(moteurW2));
  ok("« Mes photos » pendant l'envoi : des vignettes de 320 px seulement, BORNEES (les plus anciennes liberees), rien sans `apercus`",
    /if \(!max \|\| !vignette \|\| it\.apercu/.test(moteurW2) && /autre\.n <= dernier - max\) this\.libererApercu\(autre\)/.test(moteurW2) && /URL\.revokeObjectURL\(it\.apercu\)/.test(moteurW2)
      && /apercus: TAILLE_PAGE_ALBUM/.test(depotW2));
  const envoi = DP.photosDeLEnvoi([{ photoId: "a" }, { photoId: null }, { photoId: "c" }], [{ id: "a" }]);
  ok("une photo arrivee n'est pas montree deux fois (l'envoi en cours et la liste du serveur)", envoi.length === 2 && envoi.every((e) => e.photoId !== "a"));

  titre("— w2 : l'album du lien et « Mes photos » (planches 7, 8A) —");
  const vues = [
    { id: "1", arrivee: "2026-10-20T10:00:00.000Z", moi: false },
    { id: "2", arrivee: "2026-10-20T12:00:00.000Z", moi: false },
    { id: "3", arrivee: "2026-10-20T12:30:00.000Z", moi: true },
  ];
  ok("« nouvelle » : arrivee apres la derniere visite de CE telephone, jamais une des miennes ; sans visite connue, aucune",
    [...DP.nouvellesDepuis(vues, "2026-10-20T11:00:00.000Z")].join() === "2" && DP.nouvellesDepuis(vues, null).size === 0 && DP.derniereArrivee(vues) === "2026-10-20T12:30:00.000Z");
  ok("la place dite tout de suite, au registre ; « sans limite » ; plus de place, le bouton se ferme",
    DP.phrasePlace(36, true) === "tu peux encore en envoyer 36" && DP.phrasePlace(36, false) === "vous pouvez encore en envoyer 36" && DP.phrasePlace(null, true) === "sans limite"
      && DP.phrasePlace(0, true) === "tu as envoyé toutes les photos prévues" && DP.phrasePlace(undefined, true) === "" && /disabled=\{plein\}/.test(albumW2));
  ok("les initiales : « LM » pour un nom tape ici, « L » pour une personne retrouvee", DP.initiales("Léa", "Martin") === "LM" && DP.initiales("léa", null) === "L" && DP.initiales(null) === "?");
  ok("une photo sans vignette n'a pas d'adresse d'image : la case dit « En préparation » (jamais l'original)",
    /vignette: typeof x\.vignette === "string" \? x\.vignette : null,/.test(lire("src/app/depot/[token]/appels.ts")) && /x\.vignette \? <img src=\{x\.vignette\}[^>]*\/> : <span className="ec-dp-t-prep">En préparation<\/span>/.test(albumW2));
  ok("l'album vide se dit (les photos d'avant l'accord du 20/10 n'y entrent pas)",
    /L&apos;album est vide pour l&apos;instant\./.test(albumW2) && /s'afficheront ici, avec le prénom de chacun/.test(albumW2));
  ok("supprimer : seulement depuis « Mes photos », seulement ce que la route dit supprimable, la feuille dit l'effet AVANT, et la place liberee s'affiche tout de suite",
    /const cochable = cocher && onglet === "miennes" && x\.supprimable;/.test(albumW2) && /supprimerPhotos\(props\.token, props\.p, ids\)/.test(albumW2)
      && /L'organisateur peut encore \$\{nb > 1 \? "les" : "la"\} récupérer pendant \$\{DELAI_CORBEILLE_JOURS\} jours\./.test(albumW2)
      && /setPlaceServeur\(\{ valeur: r\.json\.place as number \| null, le: Date\.now\(\) \}\)/.test(albumW2) && /"\/api\/collectif\/depot\/supprimer"/.test(lire("src/app/depot/[token]/appels.ts")));
  ok("le merci prend le compte CONFIRME par le serveur pour le DERNIER envoi, jamais le coffre seul, jamais une « deja la » (21/10 : « 8 photos reçues » sur un lien a 5)",
    /const recues = bilan\.recues;/.test(albumW2) && /const bilan = bilanDuLot\(lot\);/.test(albumW2) && /Merci\{props\.qui \? ` \$\{props\.qui\.prenom\}` : ""\}, \{recues\} photo/.test(albumW2)
      && !/vue\.arrivees \+ vue\.dejaLa/.test(albumW2 + lire("src/app/edition/_composants/depot/ZoneDepot.tsx") + lire("src/app/edition/_composants/depot/FenetreEnvoi.tsx")));
  ok("la barre fixe a son repli Android (pas de verre sur un `position: fixed`, piege 3)",
    /const android = useAndroid\(\);/.test(albumW2) && /\.bj-atelier \.ec-dp-bas--plat \{[^}]*backdrop-filter: none;/.test(lire("src/app/depot/[token]/depot.css")));

  titre("— w2 : les pages d'etat (planche 9) —");
  const iFerme = pageW2.indexOf("if (!ouvert) {");
  const iPasOuvert = pageW2.indexOf("{!ouvertureOk ? (");
  ok("l'ordre : collecte terminee (9C), puis pas encore ouvert (9B), puis plafond non regle (T-195), puis le depot",
    iFerme > 0 && iPasOuvert > iFerme && pageW2.indexOf("ouvert && !regle ?") > iPasOuvert && pageW2.indexOf("<Depot") > pageW2.indexOf("ouvert && !regle ?")
      && /const ouvertureOk = depotOuvert\(edition\.ouverture_le, maintenant\)/.test(pageW2));
  const ph = Ouv.phrasesPasEncoreOuvert("2026-11-06T07:00:00Z", "ecole_tu");
  ok("9B : « Il ouvrira le vendredi 6 novembre à 8 h. » (heure de Paris), le jour en gras, « Garde ce lien »",
    ph.quand === "Il ouvrira le vendredi 6 novembre à 8 h." && Ouv.quandOuvre("2026-11-06T07:00:00Z") === "vendredi 6 novembre à 8 h" && ph.garder === "Garde ce lien : c'est le même qui servira."
      && /const ph = phrasesPasEncoreOuvert\(ouvertureLe, registre\);/.test(etatsW2) && /<b>\{quand\}<\/b>/.test(etatsW2));
  ok("9C : la date, le merci, ce qui est arrive de CE telephone (son prenom), et l'album en lecture seule (rien ne s'y ajoute ni ne s'y supprime)",
    /La collecte est terminée/.test(etatsW2) && /Merci : l’atelier compose le magazine avec les photos reçues\./.test(etatsW2) && /Tes \$\{n\} photos sont bien arrivées/.test(etatsW2)
      && /lectureSeule\s*retour=/.test(etatsW2) && /\{props\.lectureSeule \? null : \(/.test(albumW2) && /recu = \{ prenom: qui\.participant\.prenom, photos: c\?\.photos \?\? 0 \}/.test(pageW2));
  const mortW2 = lire("src/app/depot/[token]/LienMort.tsx");
  ok("9A : la carte du depot, un lien casse, aucune edition nommee (pas d'annuaire)",
    /Il a été remplacé ou retiré par l’organisateur\./.test(mortW2) && /<IcoLienCasse/.test(mortW2) && !/organisation|evenement/.test(mortW2.replace(/\/\*[\s\S]*?\*\//g, "")));

  titre("— w2 : la feuille de style —");
  const cssW2 = lire("src/app/depot/[token]/depot.css");
  const sectionW2 = cssW2.slice(cssW2.indexOf("LES PLANCHES 6 À 9 DU 20/10 (lot w2)"));
  ok("tout est sous `.bj-atelier`, prefixe `ec-dp-`, aucune couleur ecrite hors des jetons (les masques mis a part), pas de dvh",
    sectionW2.length > 5000 && !/dvh/.test(cssW2.replace(/\/\*[\s\S]*?\*\//g, "")) && !/#[0-9a-f]{3,8}\b/i.test(sectionW2.replace(/mask:[^;]*;/g, ""))
      && sectionW2.split("\n").filter((l) => /^[.a-z@]/.test(l) && !/^@(media|keyframes)/.test(l) && !/^\s*(from|to)\b/.test(l)).every((l) => l.startsWith(".bj-atelier .ec-dp")));
}



/* T-159, lot du 20/10 au soir : la fin de conservation, 30 jours apres « Marquer livree » (questions 4, 5 et 6).
   Contre une FAUSSE base (`baseEnMemoire`) et un FAUX coffre en memoire : le vrai coffre n'est jamais touche. */
async function verifRetention30() {
  const Rs = await import("@/lib/collectif/retentionServeur");
  const { phraseEvenement } = await import("@/lib/collectif/recit");
  const { retentionAutoOuverte, VAR_RETENTION_AUTO } = await import("@/lib/collectif/interrupteur");
  const Ec = await import("@/lib/collectif/echecs");
  type Client = Parameters<typeof Rs.effacerEdition>[0];
  const comme = (c: { from: (t: string) => RequeteMem }) => c as unknown as Client;
  const silence = async <R>(f: () => Promise<R>): Promise<R> => {
    const [e, l] = [console.error, console.log];
    console.error = () => {};
    console.log = () => {};
    try {
      return await f();
    } finally {
      console.error = e;
      console.log = l;
    }
  };
  const avantOuvert = process.env.COLLECTIF_OUVERT;
  const avantAuto = process.env[VAR_RETENTION_AUTO];
  const poser = (ouvert: string | undefined, auto: string | undefined) => {
    if (ouvert === undefined) delete process.env.COLLECTIF_OUVERT;
    else process.env.COLLECTIF_OUVERT = ouvert;
    if (auto === undefined) delete process.env[VAR_RETENTION_AUTO];
    else process.env[VAR_RETENTION_AUTO] = auto;
  };

  const MAINT = new Date("2026-11-30T12:00:00.000Z");
  const ilYa = (j: number) => new Date(MAINT.getTime() - j * 86_400_000).toISOString();
  const ed = (n: number) => `aaaaaaaa-0000-4000-8000-${String(n).padStart(12, "0")}`;
  const ph = (n: number) => `bbbbbbbb-0000-4000-8000-${String(n).padStart(12, "0")}`;
  const pe = (n: number) => `dddddddd-0000-4000-8000-${String(n).padStart(12, "0")}`;
  const TR = "cccccccc-0000-4000-8000-000000000001";
  const edition = (id: string, etat: string, livreeLe: string | null, extra: LigneMem = {}): LigneMem => ({
    id, organisation: "Lycée Test", evenement: `Voyage ${id.slice(-2)}`, etat, cloture_le: ilYa(80), livraison: livreeLe ? { livree_le: livreeLe, adresse: "1 rue X" } : {},
    archive_le: null, photos_supprimees_le: null, demo: false, created_at: ilYa(120), ...extra,
  });
  const photo = (e: string, n: number): LigneMem => ({
    id: ph(n), edition_id: e, r2_key: clePhoto(e, ph(n), "image/jpeg"), vignette_key: cleVignette(e, ph(n)), cle_fichier: `s~IMG_${n}.jpg|1|2`, nom_origine: `IMG_${n}.jpg`,
    appareil_id: "A".repeat(22), prise_le: "2026-10-01T10:00:00", appareil: "iPhone 15", gps_lat: 47.21, gps_lon: -1.55, empreinte: "f0f0", lieu_ville: "Nantes", lieu_pays: "France",
    lieu_code_pays: "fr", deposant: "Léa Martin", accord_version: "2026-10-17", accord_le: ilYa(75), participant_id: pe(n), role_deposant: "participant", confirmee_le: ilYa(75),
  });
  const personne = (e: string, n: number): LigneMem => ({ id: pe(n), edition_id: e, email: `lea${n}@exemple.fr`, prenom: "Léa", nom: "Martin" });
  const telephone = (e: string, n: number): LigneMem => ({ edition_id: e, appareil_id: `${"T".repeat(21)}${n}`, participant_id: pe(n) });
  const coffreDe = (e: string, photos: LigneMem[]) => [
    ...photos.flatMap((p) => [String(p.r2_key), String(p.vignette_key)]),
    clePageTour(e, TR, 1, "webp"), cleGrisTour(e, TR), clePdfTour(e, TR), cleDocument(e, ph(900), "devis signé.pdf"),
    clePieceJointe(e, ph(901), "programme.pdf"), cleContenu(e, ph(902), "logo.png"), `collectif/${e}/inconnu/a.bin`,
  ];
  /* Le FAUX coffre : la liste de ses objets, ce qu'on lui a demandé d'effacer, et un refus réglable. */
  const coffreMem = (cles: readonly string[]) => {
    const objets = new Set(cles);
    const demandes: string[] = [];
    const etat: { refuse: (k: string) => boolean } = { refuse: () => false };
    const coffre: import("@/lib/collectif/retentionServeur").CoffreRetention = {
      async lister(prefixe) {
        return [...objets].filter((k) => k.startsWith(prefixe)).map((cle) => ({ cle, taille: 1000 }));
      },
      async effacer(prefixe, liste) {
        const partis: string[] = [];
        const rates: string[] = [];
        for (const k of liste) {
          demandes.push(k);
          if (!k.startsWith(prefixe) || etat.refuse(k)) rates.push(k);
          else {
            objets.delete(k);
            partis.push(k);
          }
        }
        return { partis, rates };
      },
    };
    return { coffre, objets, demandes, etat };
  };
  const jusqua = () => Date.now() + 60_000;

  titre("— T-159 (20/10 soir) : le passage quotidien est COUPE par defaut —");
  {
    let touche = false;
    const muette = comme({ from: () => { touche = true; throw new Error("aucune lecture attendue"); } });
    const { coffre } = coffreMem([]);
    poser("1", undefined);
    const a = await silence(() => Rs.retentionQuotidienne(muette, jusqua(), coffre, MAINT));
    poser("1", "peut-etre");
    const b = await silence(() => Rs.retentionQuotidienne(muette, jusqua(), coffre, MAINT));
    poser(undefined, "1");
    const c = await silence(() => Rs.retentionQuotidienne(muette, jusqua(), coffre, MAINT));
    poser("1", "0");
    const d = await silence(() => Rs.retentionQuotidienne(muette, jusqua(), coffre, MAINT));
    poser(avantOuvert, avantAuto);
    ok("sans COLLECTIF_RETENTION_AUTO, avec une valeur incomprise, avec « 0 », ou sans COLLECTIF_OUVERT : `null`, et la base n'est pas meme LUE",
      a === null && b === null && c === null && d === null && !touche);
    const avant = console.error;
    console.error = () => {};
    const lu = [retentionAutoOuverte({}), retentionAutoOuverte({ [VAR_RETENTION_AUTO]: "peut-etre" }), retentionAutoOuverte({ [VAR_RETENTION_AUTO]: " OUI " }), retentionAutoOuverte({ [VAR_RETENTION_AUTO]: "1" })];
    console.error = avant;
    ok("l'interrupteur : absent et incompris = ferme ; « oui », « 1 » = ouvert", lu.join() === "false,false,true,true" && VAR_RETENTION_AUTO === "COLLECTIF_RETENTION_AUTO");
  }

  titre("— T-159 (20/10 soir) : ouvert, il efface UNE edition livree depuis 30 jours, et rien d'autre —");
  {
    const E1 = ed(1), E2 = ed(2), E3 = ed(3);
    const p1 = [photo(E1, 1), photo(E1, 2), photo(E1, 3)];
    const p2 = [photo(E2, 4)];
    const base = baseEnMemoire({
      collectif_editions: [edition(E1, "livree", ilYa(40)), edition(E2, "livree", ilYa(10)), edition(E3, "expediee", null)],
      collectif_photos: [...p1, ...p2].map((p) => ({ ...p })),
      collectif_participants: [personne(E1, 1), personne(E1, 2), personne(E2, 4)],
      collectif_participants_appareils: [telephone(E1, 1), telephone(E1, 2), telephone(E2, 4)],
    });
    const m = coffreMem([...coffreDe(E1, p1), ...coffreDe(E2, p2), ...coffreDe(E3, [])]);
    poser("1", "1");
    const bilan = await silence(() => Rs.retentionQuotidienne(comme(base.client), jusqua(), m.coffre, MAINT));
    const deuxieme = await silence(() => Rs.retentionQuotidienne(comme(base.client), jusqua(), m.coffre, MAINT));
    poser(avantOuvert, avantAuto);
    const eds = base.tables.collectif_editions as LigneMem[];
    const marque = (id: string) => eds.find((e) => e.id === id)?.photos_supprimees_le ?? null;
    ok("une seule candidate (livree il y a 40 j) ; celle d'il y a 10 j et l'expediee sont epargnees ; le marqueur porte l'heure du passage",
      bilan !== null && bilan.candidates === 1 && bilan.effacees === 1 && marque(E1) === MAINT.toISOString() && marque(E2) === null && marque(E3) === null);
    const restent = [...m.objets];
    ok("au coffre de E1 partent photos, vignettes, rendus du BAT, piece jointe et contenu ; RESTENT le PDF du tour (Q5), le devis, la cle inconnue",
      coffreDe(E1, p1).every((k) => (Retention.cleEffacee(k, E1) ? !m.objets.has(k) : m.objets.has(k)))
        && m.objets.has(clePdfTour(E1, TR)) && m.objets.has(cleDocument(E1, ph(900), "devis signé.pdf")) && m.objets.has(`collectif/${E1}/inconnu/a.bin`));
    ok("le coffre des deux autres editions n'est pas touche, et on n'a JAMAIS demande au coffre une cle gardee",
      [...coffreDe(E2, p2), ...coffreDe(E3, [])].every((k) => restent.includes(k)) && m.demandes.length > 0 && m.demandes.every((k) => k.startsWith(`collectif/${E1}/`) && Retention.cleEffacee(k, E1)));
    const lignes1 = (base.tables.collectif_photos as LigneMem[]).filter((p) => p.edition_id === E1);
    ok("aucune ligne de photo supprimee ; l'image, le lieu, l'appareil, le nom de fichier VIDES ; le nom, la version et l'heure de l'accord, la cle effacee GARDES (Q7)",
      lignes1.length === 3 && lignes1.every((l) => Object.keys(Retention.PATCH_PHOTO_EFFACEE).every((c) => l[c] === null))
        && lignes1.every((l) => l.deposant === "Léa Martin" && l.accord_version === "2026-10-17" && typeof l.accord_le === "string" && typeof l.r2_key === "string"));
    const ligne2 = (base.tables.collectif_photos as LigneMem[]).find((p) => p.edition_id === E2);
    ok("…et la photo de l'edition encore dans le delai garde tout", ligne2?.nom_origine === "IMG_4.jpg" && ligne2?.gps_lat === 47.21 && ligne2?.vignette_key !== null);
    ok("Q6 : les personnes de E1 (et leur adresse) et leurs telephones SUPPRIMES ; ceux de E2 restent",
      (base.tables.collectif_participants as LigneMem[]).map((p) => p.edition_id).join() === E2 && (base.tables.collectif_participants_appareils as LigneMem[]).map((p) => p.edition_id).join() === E2);
    const ordre = ["insert:collectif_evenements:retention_a_effacer", "delete:collectif_participants_appareils:2", "delete:collectif_participants:2", "update:collectif_photos:3", "update:collectif_editions:1", "insert:collectif_evenements:retention_effacee", "insert:collectif_evenements:coffre_efface"];
    const i = ordre.map((t) => base.trace.indexOf(t));
    ok("l'ORDRE (audit S7) : l'intention, les telephones, les personnes, les photos, le MARQUEUR, puis ce qui est regle, puis le resume", i.every((x) => x >= 0) && i.every((x, k) => k === 0 || i[k - 1] < x));
    const evts = (base.tables.collectif_evenements as LigneMem[]).filter((e) => e.edition_id === E1);
    const intention = evts.find((e) => e.type === "retention_a_effacer");
    const regle = evts.find((e) => e.type === "retention_effacee");
    const resume = evts.find((e) => e.type === "coffre_efface")?.payload as LigneMem | undefined;
    const nEfface = coffreDe(E1, p1).filter((k) => Retention.cleEffacee(k, E1)).length;
    ok("le journal : l'intention nomme les cles (et rien d'autre), le regle les memes, le resume compte (objets, personnes, telephones, `par: \"auto\"`) ; ni adresse, ni nom de fichier",
      Array.isArray((intention?.payload as LigneMem)?.cles) && ((intention?.payload as LigneMem).cles as string[]).length === nEfface
        && regle !== undefined && (regle.payload as LigneMem).evenement === intention?.id && ((regle.payload as LigneMem).cles as string[]).length === nEfface
        && resume?.objets_effaces === nEfface && resume?.objets_restes === 0 && resume?.personnes_effacees === 2 && resume?.telephones_effaces === 2 && resume?.par === "auto" && resume?.delai_jours === 30
        && !/@|IMG_/.test(JSON.stringify(evts.map((e) => e.payload))));
    ok("jamais deux fois : le passage suivant ne trouve plus rien (deja effacee), aucune ecriture de plus",
      deuxieme !== null && deuxieme.candidates === 0 && deuxieme.effacees === 0 && base.trace.filter((t) => t.startsWith("update:collectif_editions")).length === 1);
    ok("le journal se lit en francais (fiche) : intention, regle, resume", ["retention_a_effacer", "retention_effacee", "coffre_efface"].every((t) => phraseEvenement(t, (evts.find((e) => e.type === t)?.payload ?? {}) as Record<string, unknown>) !== t));
  }

  titre("— T-159 (20/10 soir) : borne a deux editions par passage, la plus ancienne livraison d'abord —");
  {
    const ids = [ed(11), ed(12), ed(13)];
    const base = baseEnMemoire({ collectif_editions: [edition(ids[0], "livree", ilYa(35)), edition(ids[1], "livree", ilYa(50)), edition(ids[2], "livree", ilYa(40))] });
    const m = coffreMem([]);
    poser("1", "1");
    const bilan = await silence(() => Rs.retentionQuotidienne(comme(base.client), jusqua(), m.coffre, MAINT));
    poser(avantOuvert, avantAuto);
    const marquees = (base.tables.collectif_editions as LigneMem[]).filter((e) => e.photos_supprimees_le).map((e) => e.id);
    ok("trois eligibles : deux effacees (livrees il y a 50 et 40 j), la troisieme attend le lendemain",
      bilan?.candidates === 2 && bilan?.effacees === 2 && marquees.sort().join() === [ids[1], ids[2]].sort().join());
  }

  titre("— T-159 (20/10 soir) : ce qui resiste au coffre reste dans l'intention, la reprise le retente (et n'attend que 15 minutes) —");
  {
    const E1 = ed(21);
    const p1 = [photo(E1, 31), photo(E1, 32)];
    const base = baseEnMemoire({ collectif_editions: [edition(E1, "livree", ilYa(45))], collectif_photos: p1.map((p) => ({ ...p })) });
    const m = coffreMem(coffreDe(E1, p1));
    const vignettes = p1.map((p) => String(p.vignette_key));
    m.etat.refuse = (k) => vignettes.includes(k);
    const r = await silence(() => Rs.effacerEdition(comme(base.client), E1, { delai: 30, maintenant: MAINT, par: "script", coffre: m.coffre, jusqua: jusqua() }));
    ok("le coffre refuse deux vignettes : l'edition est effacee (marquee), deux objets RESTENT, l'echec est note (`echec`, quoi « retention »)",
      r.statut === "effacee" && r.restes === 2 && vignettes.every((k) => m.objets.has(k)) && (base.tables.collectif_editions as LigneMem[])[0].photos_supprimees_le === MAINT.toISOString()
        && (base.tables.collectif_evenements as LigneMem[]).some((e) => e.type === "echec" && (e.payload as LigneMem).quoi === "retention"));
    const regle = (base.tables.collectif_evenements as LigneMem[]).find((e) => e.type === "retention_effacee");
    ok("…et le regle NE nomme PAS les deux vignettes restees", regle !== undefined && vignettes.every((k) => !((regle.payload as LigneMem).cles as string[]).includes(k)));
    m.etat.refuse = () => false;
    const trop = await silence(() => Rs.reprendreRetention(comme(base.client), jusqua(), new Date("2026-10-20T08:10:00.000Z"), m.coffre));
    ok("une reprise moins de 15 minutes apres l'intention ne touche a rien (l'effacement pourrait etre en cours)", trop !== null && trop.intentions === 0 && vignettes.every((k) => m.objets.has(k)));
    const reprise = await silence(() => Rs.reprendreRetention(comme(base.client), jusqua(), new Date("2026-10-20T09:00:00.000Z"), m.coffre));
    const fin = await silence(() => Rs.reprendreRetention(comme(base.client), jusqua(), new Date("2026-10-20T10:00:00.000Z"), m.coffre));
    ok("passe 15 minutes : la reprise efface les deux vignettes, les regle (`reprise: true`), et la suivante n'a plus rien a faire",
      reprise?.effaces === 2 && reprise?.restes === 0 && vignettes.every((k) => !m.objets.has(k)) && fin?.intentions === 0
        && (base.tables.collectif_evenements as LigneMem[]).some((e) => e.type === "retention_effacee" && (e.payload as LigneMem).reprise === true));
  }

  titre("— T-159 (20/10 soir) : une base qui refuse avant le marqueur n'a RIEN touche au coffre ; le passage suivant rejoue tout —");
  {
    const E1 = ed(41);
    const p1 = [photo(E1, 51)];
    const lignes = { collectif_editions: [edition(E1, "livree", ilYa(60))], collectif_photos: p1.map((p) => ({ ...p })), collectif_participants: [personne(E1, 51)], collectif_participants_appareils: [telephone(E1, 51)] };
    const sansJournal = baseEnMemoire(structuredClone(lignes), (q) => (q.table === "collectif_evenements" && q.op === "insert" && (q.payload as LigneMem)?.type === "retention_a_effacer" ? { code: "XX000", message: "panne" } : null));
    const m0 = coffreMem(coffreDe(E1, p1));
    const r0 = await silence(() => Rs.effacerEdition(comme(sansJournal.client), E1, { delai: 30, maintenant: MAINT, par: "script", coffre: m0.coffre }));
    ok("l'intention ne s'ecrit pas : refus « journal », aucune suppression, aucune mise a jour, rien demande au coffre",
      r0.statut === "refusee" && r0.etape === "journal" && !sansJournal.trace.some((t) => /^(delete|update):/.test(t)) && m0.demandes.length === 0);
    const enPanne = { oui: true };
    const base = baseEnMemoire(structuredClone(lignes), (q) => (q.table === "collectif_photos" && q.op === "update" && enPanne.oui ? { code: "XX000", message: "panne" } : null));
    const m = coffreMem(coffreDe(E1, p1));
    const r1 = await silence(() => Rs.effacerEdition(comme(base.client), E1, { delai: 30, maintenant: MAINT, par: "script", coffre: m.coffre }));
    ok("les photos refusent : refus « photos », marqueur NON pose, coffre intact (rien demande), l'intention reglee « gardee »",
      r1.statut === "refusee" && r1.etape === "photos" && (base.tables.collectif_editions as LigneMem[])[0].photos_supprimees_le === null && m.demandes.length === 0
        && coffreDe(E1, p1).every((k) => m.objets.has(k)) && (base.tables.collectif_evenements as LigneMem[]).some((e) => e.type === "retention_effacee" && (e.payload as LigneMem).gardees === true));
    const reprise = await silence(() => Rs.reprendreRetention(comme(base.client), jusqua(), new Date("2026-12-31T00:00:00.000Z"), m.coffre));
    ok("la reprise ne retente pas une intention reglee « gardee » (l'edition n'est pas marquee : ses cles ne sont pas libres)", reprise?.intentions === 0 && m.demandes.length === 0);
    enPanne.oui = false;
    const r2 = await silence(() => Rs.effacerEdition(comme(base.client), E1, { delai: 30, maintenant: MAINT, par: "script", coffre: m.coffre }));
    ok("la panne passee, le passage suivant rejoue tout et efface", r2.statut === "effacee" && (base.tables.collectif_editions as LigneMem[])[0].photos_supprimees_le === MAINT.toISOString() && !m.objets.has(String(p1[0].r2_key)));
  }

  titre("— T-159 (20/10 soir) : la reprise n'efface JAMAIS une edition non marquee, ni une cle gardee glissee dans une intention —");
  {
    const NON = ed(61), OUI = ed(62), AUTRE = ed(63);
    const pNon = [photo(NON, 71)], pOui = [photo(OUI, 72)];
    const base = baseEnMemoire({
      collectif_editions: [edition(NON, "livree", ilYa(5)), edition(OUI, "livree", ilYa(60), { photos_supprimees_le: ilYa(1) })],
      collectif_evenements: [
        { id: "e-non", edition_id: NON, type: "retention_a_effacer", payload: { cles: [String(pNon[0].r2_key)] }, created_at: "2026-10-01T00:00:00.000Z" },
        { id: "e-oui", edition_id: OUI, type: "retention_a_effacer", payload: { cles: [String(pOui[0].r2_key), clePdfTour(OUI, TR), cleDocument(OUI, ph(1), "f.pdf"), clePhoto(AUTRE, ph(2), "image/jpeg"), `collectif/${OUI}/../x`] }, created_at: "2026-10-01T00:00:00.000Z" },
      ],
    });
    const m = coffreMem([...coffreDe(NON, pNon), ...coffreDe(OUI, pOui), clePhoto(AUTRE, ph(2), "image/jpeg")]);
    const r = await silence(() => Rs.reprendreRetention(comme(base.client), jusqua(), MAINT, m.coffre));
    ok("l'edition NON marquee garde sa photo ; l'intention est reglee « gardee »",
      m.objets.has(String(pNon[0].r2_key)) && (base.tables.collectif_evenements as LigneMem[]).some((e) => e.edition_id === NON && e.type === "retention_effacee" && (e.payload as LigneMem).gardees === true));
    ok("l'edition marquee : seule SA photo part ; le PDF du tour, le document, la photo d'une autre edition, le « .. » ne sont meme pas demandes au coffre",
      r !== null && !m.objets.has(String(pOui[0].r2_key)) && m.objets.has(clePdfTour(OUI, TR)) && m.objets.has(clePhoto(AUTRE, ph(2), "image/jpeg")) && m.demandes.join() === String(pOui[0].r2_key));
    ok("lireClesRetention : seulement des cles de l'edition, d'une famille effacee, sans « .. », sans doublon",
      Retention.lireClesRetention([String(pOui[0].r2_key), String(pOui[0].r2_key), clePdfTour(OUI, TR), `collectif/${OUI}/../x`, 12, null, "x".repeat(400)], OUI).join() === String(pOui[0].r2_key)
        && Retention.lireClesRetention("pas une liste", OUI).length === 0 && Retention.clesLibresRetention([String(pOui[0].r2_key)], OUI, null).length === 0);
  }

  titre("— T-159 (20/10 soir) : le plan, les phrases, l'echec nomme —");
  {
    const E1 = ed(81);
    const plan = Retention.planEffacement([{ cle: clePhoto(E1, ph(1), "image/jpeg"), taille: 10 }, { cle: clePhoto(E1, ph(1), "image/jpeg"), taille: 10 }, { cle: clePdfTour(E1, TR), taille: 5 }], E1);
    ok("planEffacement : une cle en double ne compte qu'une fois ; le PDF du tour est garde, compte a part", plan.aEffacer.length === 1 && plan.gardes === 1 && plan.parFamille.photos.n === 1 && plan.parFamille.pdf_tour.octets === 5);
    ok("« Les photos de cette édition ont été supprimées le 21 novembre 2026 » ; le 30/11 a 23 h 30 UTC est le 1er décembre a Paris ; rien sans date",
      Retention.phrasePhotosEffacees("2026-11-21T10:00:00.000Z") === "Les photos de cette édition ont été supprimées le 21 novembre 2026"
        && Retention.phrasePhotosEffacees("2026-11-30T23:30:00.000Z") === "Les photos de cette édition ont été supprimées le 1er décembre 2026"
        && Retention.phrasePhotosEffacees(null) === null && Retention.phraseBatEfface(undefined) === null
        && Retention.phraseBatEfface("2026-11-21T10:00:00.000Z") === "Les pages du bon à tirer ont été supprimées avec les photos le 21 novembre 2026"
        && Retention.phraseFichierEfface("2026-11-21T10:00:00.000Z") === "Fichier supprimé le 21 novembre 2026");
    ok("l'echec a son nom dans la sante (« retention »)", (Ec.QUOI_ECHEC as readonly string[]).includes("retention") && Ec.payloadEchec("retention", { etape: "coffre", n: 2 }).quoi === "retention");
    ok("Q6 decidee : les deux tables des personnes, telephones d'abord", Retention.TABLES_PERSONNES_EFFACEES.join() === "collectif_participants_appareils,collectif_participants");
  }

  titre("— Q5 (20/10 soir) : le PDF du magazine termine, GARDE 10 ans apres la livraison ; la regle est ecrite, RIEN ne l'applique —");
  {
    const V = (etat: string, livree_le: string | null, quand: string, extra: Partial<Retention.EditionPourRetention> = {}) =>
      Retention.verdictConservationPdf({ etat, cloture_le: null, livraison: livree_le ? { livree_le } : {}, ...extra }, new Date(quand));
    ok("10 ans (decision de Mathias) ; le PDF des tours reste dans les familles GARDEES, et sa raison le dit",
      Retention.CONSERVATION_PDF_MAGAZINE_ANS === 10 && !Retention.FAMILLES.pdf_tour.efface && /10 ans/.test(Retention.FAMILLES.pdf_tour.pourquoi) && /accord du client/.test(Retention.FAMILLES.pdf_tour.pourquoi));
    ok("la fin : la meme date dix ans plus tard ; un 29 fevrier donne le 1er mars (un jour de plus, jamais un de moins) ; une date sans fuseau, rien",
      Retention.finConservationPdf("2026-11-20T10:00:00.000Z") === Date.parse("2036-11-20T10:00:00.000Z")
        && Retention.finConservationPdf("2028-02-29T10:00:00.000Z") === Date.parse("2038-03-01T10:00:00.000Z") && Retention.finConservationPdf("2026-11-20T10:00") === null);
    const a = V("livree", "2026-11-20T10:00:00.000Z", "2036-11-20T09:59:59.999Z");
    const b = V("livree", "2026-11-20T10:00:00.000Z", "2036-11-20T10:00:00.000Z");
    ok("une milliseconde avant les dix ans : garde (et la fin est dite) ; a dix ans pile : effacable",
      !a.effacable && a.motif === "dans_les_dix_ans" && a.finLe === "2036-11-20T10:00:00.000Z" && b.effacable && b.finLe === "2036-11-20T10:00:00.000Z");
    ok("pas livree (meme quarante ans apres une date au jsonb), livree sans date, etat inconnu : garde",
      ["preparation", "bat", "impression", "expediee"].every((s) => { const v = V(s, "1990-01-01T00:00:00.000Z", "2036-12-01T00:00:00.000Z"); return !v.effacable && v.motif === "non_livree"; })
        && (() => { const v = V("livree", null, "2050-01-01T00:00:00.000Z"); return !v.effacable && v.motif === "livree_sans_date"; })()
        && (() => { const v = V("perdue", "2026-11-20T10:00:00.000Z", "2050-01-01T00:00:00.000Z"); return !v.effacable && v.motif === "etat_inconnu"; })());
    ok("le marqueur des PHOTOS ne decide rien pour le PDF : effacees il y a un an, le PDF reste dans ses dix ans",
      (() => { const v = V("livree", "2026-11-20T10:00:00.000Z", "2027-12-01T00:00:00.000Z", { photos_supprimees_le: "2026-12-20T10:00:00.000Z" }); return !v.effacable && v.motif === "dans_les_dix_ans"; })());
    const fichiers = [...fichiersParSuffixe("src", /\.tsx?$/), ...fichiersParSuffixe("scripts", /\.(ts|mjs)$/)].filter((f) => f !== "src/lib/collectif/retention.ts" && f !== "scripts/verif-collectif.ts");
    ok("SANS AUCUN EFFET : ni un module, ni un script, ni une route n'appelle la regle des dix ans",
      fichiers.every((f) => !/verdictConservationPdf|finConservationPdf|CONSERVATION_PDF_MAGAZINE_ANS/.test(lire(f))));
  }

  titre("— T-159 (20/10 soir) : les ecrans lisent `photos_supprimees_le` (une edition effacee le DIT, au lieu de vignettes vides) —");
  {
    const code = (f: string) => lire(f).replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
    const pagePhotos = code("src/app/edition/[token]/photos/page.tsx");
    ok("la page Photos de l'espace : la phrase (Verrou) AVANT le rattrapage, les en-tetes et la grille",
      /const effacees = phrasePhotosEffacees\(edition\.photos_supprimees_le\)\s*if \(effacees\) return <Verrou titre="Les photos" raison=\{effacees\} \/>/.test(pagePhotos)
        && pagePhotos.indexOf("phrasePhotosEffacees(") < pagePhotos.indexOf("after(") && pagePhotos.indexOf("phrasePhotosEffacees(") < pagePhotos.indexOf("<Collecte"));
    const bat = code("src/app/edition/[token]/bat/page.tsx");
    ok("le bon a tirer de l'espace : la phrase AVANT de signer la moindre page", /const batEfface = phraseBatEfface\(edition\.photos_supprimees_le\)\s*if \(batEfface\) return <Verrou titre="Bon à tirer" raison=\{batEfface\} \/>/.test(bat) && bat.indexOf("phraseBatEfface(") < bat.indexOf("chargerBat("));
    const carte = code("src/app/edition/[token]/CartePhotos.tsx");
    ok("le tableau de bord : la phrase a la place des dossiers et de la mosaique",
      /effacees=\{phrasePhotosEffacees\(edition\.photos_supprimees_le\)\}/.test(code("src/app/edition/[token]/page.tsx")) && /\{p\.effacees \? \(\s*<p className="ec-texte ec-tdb-effacees">\{p\.effacees\}\.<\/p>\s*\) : \(/.test(carte) && /p\.mosaique\.length && !p\.effacees/.test(carte));
    for (const [f, avant] of [["src/app/api/collectif/photos/route.ts", "makeSupabase()"], ["src/app/api/collectif/depot/album/route.ts", "makeSupabase()"], ["src/app/api/admin/collectif/editions/[id]/lot/route.ts", "lireHorsCorbeille("]] as const) {
      const c = code(f);
      ok(`${f.replace("src/app/api/", "")} : 410 \`photos_effacees\` avec la phrase, avant de lire ou signer une photo`,
        /if \(effacees\) return NextResponse\.json\(\{ error: "photos_effacees", message: `\$\{effacees\}[^`]*` \}, \{ status: 410 \}\);/.test(c) && c.indexOf('error: "photos_effacees"') < c.indexOf(avant, c.indexOf("phrasePhotosEffacees(")));
    }
    const panneau = code("src/app/admin/collectif/[id]/PanneauCollecte.tsx");
    ok("la fiche : la phrase dans la collecte (vue d'ensemble et onglet Photos), tous les telechargements eteints",
      /const ferme = occupe \|\| Boolean\(effacees\);/.test(panneau) && !/disabled=\{occupe/.test(panneau) && (panneau.match(/disabled=\{ferme/g) ?? []).length === 4
        && /const effacees = phrasePhotosEffacees\(e\.photos_supprimees_le\);/.test(code("src/app/admin/collectif/[id]/page.tsx")));
    ok("le bon a tirer de l'atelier : la phrase au lieu des pages rendues ; l'edition lue porte le marqueur",
      /phraseBatEfface\(bat\.edition\.photos_supprimees_le\) \? \(/.test(code("src/app/admin/collectif/[id]/bat/page.tsx")) && /archive_le, photos_supprimees_le"\)/.test(code("src/app/admin/collectif/donnees.ts")));
    ok("les contenus envoyes : plus signes une fois effaces (espace et fiche), le nom reste et « Fichier supprimé le … » se lit",
      /const \[url, telecharger\] = efface \? \[null, null\] :/.test(code("src/app/edition/[token]/donnees.ts")) && /e\.efface \? ` · \$\{e\.efface\}` : null/.test(code("src/app/edition/[token]/LigneContenus.tsx"))
        && /if \(c\.r2_key && !edition\.photos_supprimees_le\) \{/.test(code("src/app/admin/collectif/donnees.ts")));
  }
}

/* ════════════════════ 21/10 : LE DERNIER ENVOI, LES « DÉJÀ LÀ », LE LIEN MORT (édition « Recette 1 ») ════════════════════
   Les notes de Mathias : « Merci Mathias, 8 photos reçues » sur un lien à 5, rien de parti, rien dans l'album ;
   « Content de vous revoir, 11 photos déjà arrivées » (toute l'édition) ; « Envoyées depuis ce téléphone » sur un
   ordinateur ; un lien régénéré qui « fonctionne encore » dans l'onglet resté ouvert. */

async function verifDejaLa() {
  const Dep = await import("@/lib/collectif/depot");
  const DP = await import("@/lib/collectif/depotParticipant");
  const Al = await import("@/lib/collectif/album");
  const Arr = await import("@/lib/collectif/arrivees");
  const Cs = await import("@/lib/collectif/corbeilleServeur");
  const Ps = await import("@/lib/collectif/personnesServeur");
  const Col = await import("@/lib/collectif/collecte");
  const Hc = await import("@/lib/collectif/horsCorbeille");
  const { phraseEvenement } = await import("@/lib/collectif/recit");
  type Client = Parameters<typeof Cs.restaurer>[0];
  const comme = (c: { from: (t: string) => RequeteMem }) => c as unknown as Client;
  const silence = async <R>(f: () => Promise<R>): Promise<R> => {
    const [e, l] = [console.error, console.log];
    console.error = () => {};
    console.log = () => {};
    try {
      return await f();
    } finally {
      console.error = e;
      console.log = l;
    }
  };
  const B1 = "11111111-0000-4000-8000-000000000001";
  const B2 = "11111111-0000-4000-8000-000000000002";
  const TEL = "telephone-de-mathias-1";
  const PC = "ordinateur-de-mathias1";
  const MOI = "22222222-0000-4000-8000-000000000001";
  const ctxB1 = { role: "participant" as const, provenanceId: B1, appareil: TEL, participantId: MOI };
  const fic = (nom: string) => ({ cle: Dep.cleFichier(`sel~${nom}`, 1, 0), nom, taille: 1, type: "image/jpeg", tailleVignette: null, ordre: null });
  const ex = (o: Partial<import("@/lib/collectif/depot").Existant>): import("@/lib/collectif/depot").Existant => ({ id: "x", r2_key: "k", confirmee: true, role: "participant", provenanceId: B1, appareilId: TEL, participantId: MOI, ...o });

  titre("— 21/10 : « deja la » dit OU (depot.ts, la regle du serveur) —");
  const grille = [B1, B2, null].flatMap((prov) => ["participant", "responsable"].flatMap((role) => [B1, null].map((page) => ({ prov, role, page }))));
  ok("duMemeLien (depot.ts) dit exactement ce que duLien (album.ts) dit, sur tous les cas (lien, lien general, responsable)",
    grille.every((c) => Dep.duMemeLien({ provenanceId: c.prov, role: c.role }, c.page) === Al.duLien({ provenance_id: c.prov, role_deposant: c.role }, c.page)));
  ok("origineDeja : cet album ; un autre lien (son id, pour en dire le libelle) ; le lien general vu d'un bateau ; le depot de l'organisateur ; la corbeille du responsable ou de l'atelier ; l'auteur d'ailleurs ; une forme d'avant",
    Dep.origineDeja(ex({}), ctxB1).ou === "album"
      && JSON.stringify(Dep.origineDeja(ex({ provenanceId: B2 }), ctxB1)) === JSON.stringify({ ou: "lien", lienId: B2 })
      && JSON.stringify(Dep.origineDeja(ex({ provenanceId: null }), ctxB1)) === JSON.stringify({ ou: "lien", lienId: null })
      && Dep.origineDeja(ex({ provenanceId: null, role: "responsable" }), ctxB1).ou === "edition"
      && Dep.origineDeja(ex({ corbeille: true, par: "responsable" }), ctxB1).ou === "retiree" && Dep.origineDeja(ex({ corbeille: true, par: "atelier" }), ctxB1).ou === "retiree"
      && Dep.origineDeja(ex({ corbeille: true, par: "auteur" }), ctxB1).ou === "supprimee"
      && Dep.origineDeja({ id: "x", r2_key: "k", confirmee: true }, ctxB1).ou === "connue");
  ok("restaurableParChoix : supprimee par son AUTEUR, et choisie de nouveau depuis le meme appareil OU par la meme personne ; jamais celle du responsable ni de l'atelier ; jamais pour le responsable",
    Dep.restaurableParChoix(ex({ corbeille: true, par: "auteur" }), ctxB1)
      && Dep.restaurableParChoix(ex({ corbeille: true, par: "auteur", appareilId: PC }), ctxB1)
      && Dep.restaurableParChoix(ex({ corbeille: true, par: "auteur", participantId: null }), ctxB1)
      && !Dep.restaurableParChoix(ex({ corbeille: true, par: "auteur", appareilId: PC, participantId: "autre" }), ctxB1)
      && !Dep.restaurableParChoix(ex({ corbeille: true, par: "responsable" }), ctxB1) && !Dep.restaurableParChoix(ex({ corbeille: true, par: "atelier" }), ctxB1)
      && !Dep.restaurableParChoix(ex({ par: "auteur" }), ctxB1)
      && !Dep.restaurableParChoix(ex({ corbeille: true, par: "auteur" }), { ...ctxB1, role: "responsable" })
      && !Dep.restaurableParChoix(ex({ corbeille: true, par: "auteur", appareilId: PC }), { ...ctxB1, participantId: null }));

  titre("— 21/10 : le partage d'un lot avec le contexte de la page (planDeclaration) —");
  const huit = Array.from({ length: 8 }, (_, i) => fic(`IMG_${i}.HEIC`));
  const venuesDeB2 = new Map(huit.map((f, i) => [f.cle, ex({ id: `b2-${i}`, provenanceId: B2 })]));
  const planHuit = Dep.planDeclaration(huit, venuesDeB2, { illimitee: false, place: 2, borne: "plafond_participant" }, ctxB1);
  ok("la note de Mathias : 8 photos deja arrivees par « Bateau 2 », re-choisies sur « Bateau 1 » (5 au plus) : 8 « deja la » par un autre lien, AUCUNE nouvelle, aucune place prise",
    planHuit.every((d) => d.sorte === "deja" && d.ou === "lien" && d.lienId === B2));
  const nouvelle = fic("nouvelle.jpg");
  const autreNouvelle = fic("autre.jpg");
  const ici = fic("supprimee-ici.jpg");
  const exIci = new Map([[ici.cle, ex({ id: "R-ici", corbeille: true, par: "auteur" })]]);
  const p2 = Dep.planDeclaration([ici, nouvelle, autreNouvelle], exIci, { illimitee: false, place: 2, borne: "plafond_participant" }, ctxB1);
  ok("une photo supprimee par son auteur, choisie de nouveau sur SON lien, revient et prend une place, dans l'ordre du lot, comme une nouvelle",
    p2[0].sorte === "restaurer" && p2[0].ici && p2[0].id === "R-ici" && p2[1].sorte === "nouvelle" && p2[2].sorte === "refusee");
  const pPlein = Dep.planDeclaration([ici], exIci, { illimitee: false, place: 0, borne: "plafond_participant" }, ctxB1);
  ok("plus de place : elle reste a la corbeille, refusee par le plafond (la phrase du plafond le dira)",
    pPlein[0].sorte === "refusee" && pPlein[0].raison === "plafond_participant" && pPlein[0].corbeille === true);
  const ailleurs = fic("supprimee-sur-b2.jpg");
  const pAilleurs = Dep.planDeclaration([ailleurs, nouvelle], new Map([[ailleurs.cle, ex({ id: "R-b2", corbeille: true, par: "auteur", provenanceId: B2 })]]), { illimitee: false, place: 1, borne: "plafond_participant" }, ctxB1);
  ok("supprimee sur un AUTRE lien : elle revient dans SON album (la route tranche avec la place de son lien), sans prendre la place de celui-ci",
    pAilleurs[0].sorte === "restaurer" && !pAilleurs[0].ici && pAilleurs[0].lienId === B2 && pAilleurs[1].sorte === "nouvelle");
  const pRetiree = Dep.planDeclaration([ici], new Map([[ici.cle, ex({ id: "R", corbeille: true, par: "responsable" })]]), { illimitee: true }, ctxB1);
  ok("retiree par l'organisateur : « deja la », a la corbeille, elle ne revient pas",
    pRetiree[0].sorte === "deja" && pRetiree[0].ou === "retiree" && pRetiree[0].corbeille === true);
  const pDouble = Dep.planDeclaration([ici, ici], exIci, { illimitee: true }, ctxB1);
  ok("la meme photo deux fois dans le lot ne revient qu'une fois", pDouble[0].sorte === "restaurer" && pDouble[1].sorte === "double");
  const pResp = Dep.planDeclaration([ici], exIci, { illimitee: true }, { role: "responsable", provenanceId: null, appareil: TEL, participantId: null });
  ok("le responsable qui choisit de nouveau une photo de la corbeille : « deja la », rien ne revient tout seul (la corbeille de la page Photos la restaure)",
    pResp[0].sorte === "deja" && pResp[0].corbeille === true);
  const vu = Dep.partagerConnues(new Map([
    [fic("a").cle, ex({ id: "a" })],
    [fic("b").cle, ex({ id: "b", provenanceId: B2 })],
    [fic("c").cle, ex({ id: "c", corbeille: true, par: "auteur" })],
    [fic("d").cle, ex({ id: "d", corbeille: true, par: "responsable" })],
    [fic("e").cle, ex({ id: "e", confirmee: false })],
  ]), { ...ctxB1, participantId: null });
  ok("la verification d'une reprise : deja la avec ou (cet album, un autre lien, retiree) ; supprimee par son auteur = a revoir en declaration ; declaree jamais arrivee = ni l'un ni l'autre",
    vu.confirmees.length === 3 && vu.aRevoir.length === 1 && vu.aRevoir[0] === fic("c").cle
      && vu.details.map((d) => d.ou).join() === "album,lien,retiree" && vu.details[1].lienId === B2 && !vu.confirmees.includes(fic("e").cle));
  ok("lireDejaLa : un `ou` inconnu = « connue » ; la corbeille d'une reponse d'avant = « supprimee » ; le libelle nettoye",
    Dep.lireDejaLa({ ou: "ailleurs" }).ou === "connue" && Dep.lireDejaLa({ corbeille: true }).ou === "supprimee"
      && JSON.stringify(Dep.lireDejaLa({ ou: "lien", lien: "  Bateau 2 " })) === JSON.stringify({ ou: "lien", lien: "Bateau 2", ici: false }) && Dep.lireDejaLa({ ou: "restauree", ici: true }).ici);

  titre("— 21/10 : le merci compte le DERNIER envoi, et seulement ce qui est arrive (depotParticipant.ts) —");
  type It = { lot: number; etat: string; deja: import("@/lib/collectif/depot").DejaLa | null; raison: string | null };
  const it = (lot: number, etat: string, deja: It["deja"] = null): It => ({ lot, etat, deja, raison: null });
  const lien = (l: string | null): It["deja"] => ({ ou: "lien", lien: l, ici: false });
  /* Bateau 1 : un premier envoi de 3 photos arrivees, puis 8 photos re-choisies, deja arrivees par « Bateau 2 ». */
  const page = [...Array.from({ length: 3 }, () => it(1, "confirme")), ...Array.from({ length: 8 }, () => it(2, "deja", lien("Bateau 2")))];
  const lot2 = DP.compterLot(page, 2, 0);
  const b2 = DP.bilanDuLot(lot2);
  ok("« 8 photos reçues » ne se dit plus : le lot 2 a 0 photo recue, 8 deja arrivees par « Bateau 2 », et le premier envoi n'y est pas",
    lot2.total === 8 && b2.recues === 0 && b2.dejaLa === 8 && b2.fini && JSON.stringify(b2.dejaLiens) === JSON.stringify([{ lien: "Bateau 2", n: 8 }])
      && JSON.stringify(DP.phrasesDuLot(b2, { tu: false })) === JSON.stringify(["8 photos étaient déjà arrivées par « Bateau 2 » : elles ne repartent pas."]));
  const vingt = [...Array.from({ length: 16 }, () => it(5, "confirme")), ...Array.from({ length: 4 }, () => it(5, "deja", lien("Bateau 1")))];
  const b20 = DP.bilanDuLot(DP.compterLot(vingt, 5, 0));
  ok("« 20 photos sur Bateau 2 » : 16 recues (le merci), 4 deja arrivees par « Bateau 1 » (dites, jamais comptees)",
    b20.recues === 16 && b20.dejaLa === 4 && DP.phrasesDuLot(b20, { tu: false })[0] === "4 photos étaient déjà arrivées par « Bateau 1 » : elles ne repartent pas.");
  const melange = [
    it(3, "confirme"), it(3, "confirme"),
    ...Array.from({ length: 3 }, () => it(3, "deja", { ou: "album", lien: null, ici: true })),
    it(3, "deja", { ou: "restauree", lien: null, ici: true }),
    it(3, "deja", { ou: "restauree", lien: "Bateau 2", ici: false }),
    it(3, "deja", { ou: "retiree", lien: null, ici: false }),
    it(3, "deja", lien(null)),
    it(3, "refuse"),
  ];
  const bm = DP.bilanDuLot(DP.compterLot(melange, 3, 1));
  const phrasesVous = DP.phrasesDuLot(bm, { tu: false });
  const phrasesTu = DP.phrasesDuLot(bm, { tu: true });
  ok("chaque cas a sa phrase, courte, au vous : revenue, deja dans l'album, par un autre lien (nomme ou non), retiree par l'organisateur, choisie deux fois",
    bm.recues === 2 && bm.refusees === 1 && JSON.stringify(phrasesVous) === JSON.stringify([
      "1 photo que vous aviez supprimée est revenue dans l'album.",
      "1 photo que vous aviez supprimée est revenue dans l'album de « Bateau 2 ».",
      "3 photos étaient déjà dans l'album : elles ne repartent pas.",
      "1 photo était déjà arrivée par un autre lien : elle ne repart pas.",
      "1 photo avait été retirée par l'organisateur : elle ne repart pas.",
      "1 photo choisie deux fois ne part qu'une fois.",
    ]));
  ok("…et au tu ; aucun tiret cadratin, aucune phrase au feminin du participant",
    phrasesTu[0] === "1 photo que tu avais supprimée est revenue dans l'album." && ![...phrasesVous, ...phrasesTu].some((t) => /[—–]/.test(t)) && ![...phrasesVous, ...phrasesTu].some((t) => /participante|cliente/.test(t)));
  ok("le pluriel : « 2 photos que vous aviez supprimées sont revenues dans l'album », « 2 photos avaient été retirées par l'organisateur : elles ne repartent pas. »",
    DP.phrasesDuLot(DP.bilanDuLot(DP.compterLot([it(1, "deja", { ou: "restauree", lien: null, ici: true }), it(1, "deja", { ou: "restauree", lien: null, ici: true }), it(1, "deja", { ou: "retiree", lien: null, ici: false }), it(1, "deja", { ou: "retiree", lien: null, ici: false })], 1, 0)), { tu: false }).join(" | ")
      === "2 photos que vous aviez supprimées sont revenues dans l'album. | 2 photos avaient été retirées par l'organisateur : elles ne repartent pas.");
  ok("le responsable : seule la corbeille a sa phrase (sa fenetre a deja « deja la, sautees »), jamais « par l'organisateur »",
    JSON.stringify(DP.phrasesDuLot(bm, { tu: false, pour: "responsable" })) === JSON.stringify(["1 photo est à la corbeille : elle ne repart pas. La corbeille de la page Photos la restaure."]));
  const enCoursLot = DP.compterLot([it(4, "confirme"), it(4, "envoye"), it(4, "attente"), it(4, "deja", lien("Bateau 2"))], 4, 0);
  ok("la barre du lot ne compte pas les deja-la : « 2 sur 3 envoyées », il en reste 1 ; le bilan n'est pas fini",
    JSON.stringify(DP.progression(enCoursLot)) === JSON.stringify({ envoyees: 2, restent: 1, total: 3, part: 67 }) && !DP.bilanDuLot(enCoursLot).fini && DP.bilanDuLot(enCoursLot).enCours === 2);
  ok("un lot vide : rien a dire", DP.phrasesDuLot(DP.bilanDuLot(DP.LOT_VIDE), { tu: false }).length === 0 && !DP.bilanDuLot(DP.LOT_VIDE).fini);

  titre("— 21/10 : « Content de vous revoir » dit ce lien et ce qui reste ; « Mes photos » compte l'autre appareil —");
  ok("« 2 photos déjà sur « Bateau 1 ». Vous pouvez encore en envoyer 3. » ; sans lien nomme : « dans l'album » ; au tu ; sans limite ; plein ; rien encore",
    DP.phraseRetour(2, 3, "Bateau 1", false) === "2 photos déjà sur « Bateau 1 ». Vous pouvez encore en envoyer 3."
      && DP.phraseRetour(1, 4, null, false) === "1 photo déjà dans l'album. Vous pouvez encore en envoyer 4."
      && DP.phraseRetour(2, 3, "Bateau 1", true) === "2 photos déjà sur « Bateau 1 ». Tu peux encore en envoyer 3."
      && DP.phraseRetour(2, null, "Bateau 1", false) === "2 photos déjà sur « Bateau 1 ». Vous pouvez en envoyer sans limite."
      && DP.phraseRetour(5, 0, "Bateau 1", false) === "5 photos déjà sur « Bateau 1 ». Vous avez envoyé toutes les photos prévues."
      && DP.phraseRetour(0, 5, "Bateau 1", false) === "Vous pouvez en envoyer 5." && DP.phraseRetour(0, undefined, null, false) === "");
  ok("« 2 autres photos à votre nom, envoyées d'un autre appareil, sont dans Tout l'album. » (un nombre, jamais les photos) ; une ; aucune",
    DP.phraseAutresAppareils(2, false) === "2 autres photos à votre nom, envoyées d'un autre appareil, sont dans Tout l'album."
      && DP.phraseAutresAppareils(1, true) === "1 autre photo à ton nom, envoyée d'un autre appareil, est dans Tout l'album."
      && DP.phraseAutresAppareils(0, false) === "" && DP.phraseAutresAppareils(null, false) === "");
  ok("« Tout l'album » sans recharger : les nouvelles en tete, sans doublon ; toutes les 45 s, et au retour sur l'onglet au plus toutes les 20 s",
    DP.enTete([{ id: "n2" }, { id: "a" }, { id: "n2" }, { id: "n1" }], [{ id: "a" }, { id: "b" }]).map((x) => x.id).join() === "n2,n1,a,b"
      && DP.SONDAGE_ALBUM_MS === 45_000 && Arr.REPOS_MIN_MS === 20_000 && Arr.aRelire(20_000, 0, true, DP.SONDAGE_ALBUM_MS, true) && !Arr.aRelire(19_999, 0, true, DP.SONDAGE_ALBUM_MS, true) && !Arr.aRelire(99_000, 0, false, DP.SONDAGE_ALBUM_MS, false));

  titre("— 21/10 : le vrai moteur, contre un faux serveur (lots, deja-la, restauration, lien mort) —");
  {
    const { MoteurDepot } = await import("@/app/edition/_composants/depot/moteur");
    const avantFetch = globalThis.fetch;
    type Appel = { url: string; corps: Record<string, unknown> };
    const attendreMoteur = async (m: { occupe(): boolean }) => {
      for (let i = 0; i < 200 && m.occupe(); i++) await new Promise((r) => setTimeout(r, 0));
      for (let i = 0; i < 5; i++) await new Promise((r) => setTimeout(r, 0));
    };
    const serveur = (repondre: (a: Appel) => { status: number; corps: unknown }) => {
      const appels: Appel[] = [];
      globalThis.fetch = (async (url: string | URL | Request, init?: RequestInit) => {
        const a = { url: String(url), corps: JSON.parse(String(init?.body ?? "{}")) as Record<string, unknown> };
        appels.push(a);
        const r = repondre(a);
        return new Response(JSON.stringify(r.corps), { status: r.status });
      }) as typeof fetch;
      return appels;
    };
    const photos = (n: number, prefixe: string) => Array.from({ length: n }, (_, i) => new File([new Uint8Array(3)], `${prefixe}-${i}.jpg`, { type: "image/jpeg", lastModified: 1_700_000_000_000 + i }));
    try {
      /* Bateau 1 : 8 photos déjà arrivées par « Bateau 2 », dites par la vérification d'une reprise. */
      const appels = serveur((a) => {
        const connues = Array.isArray(a.corps.connues) ? (a.corps.connues as string[]) : [];
        return { status: 200, corps: { confirmees: connues, aRevoir: [], details: connues.map((cle) => ({ cle, ou: "lien", lien: "Bateau 2" })) } };
      });
      const m = new MoteurDepot({ token: "t".repeat(32), p: "clé-du-bateau-1-xxxxxx", tu: false });
      m.definirAccord("2026-10-20");
      const huitFichiers = photos(8, "IMG");
      m.ajouter(huitFichiers);
      await attendreMoteur(m);
      const v1 = m.vue();
      const b1 = DP.bilanDuLot(v1.lot);
      ok("8 photos deja arrivees par « Bateau 2 » : le lot dit 0 recue et la phrase, rien n'est declare ni envoye ; la verification porte le lien de la page",
        v1.lot.numero === 1 && b1.recues === 0 && b1.dejaLa === 8 && DP.phrasesDuLot(b1, { tu: false })[0] === "8 photos étaient déjà arrivées par « Bateau 2 » : elles ne repartent pas."
          && appels.length === 1 && appels[0].corps.p === "clé-du-bateau-1-xxxxxx" && Array.isArray(appels[0].corps.connues) && !appels.some((x) => Array.isArray(x.corps.fichiers)));
      m.ajouter(huitFichiers.slice(0, 3));
      await attendreMoteur(m);
      const v2 = m.vue();
      ok("re-choisies sur la meme page (un nouvel envoi) : un lot 2 de 3 « deja la », dits par la memoire de la page, sans un appel de plus",
        v2.lot.numero === 2 && v2.lot.total === 3 && DP.bilanDuLot(v2.lot).dejaLiens[0]?.n === 3 && appels.length === 1);
      m.detruire();

      /* Une photo supprimée d'ici, choisie de nouveau : la vérification la dit « à revoir », la déclaration la restaure. */
      const appelsR = serveur((a) => {
        if (Array.isArray(a.corps.connues)) return { status: 200, corps: { confirmees: [], aRevoir: a.corps.connues, details: [] } };
        const f = (a.corps.fichiers as { cle: string }[]) ?? [];
        return { status: 200, corps: { resultats: f.map((x) => ({ cle: x.cle, deja: true, photoId: "photo-revenue", restauree: true, ou: "restauree", ici: true, lien: null })), place: 2 } };
      });
      const r = new MoteurDepot({ token: "t".repeat(32), p: null, tu: true });
      r.definirAccord("2026-10-20");
      r.ajouter(photos(1, "SUPPR"));
      await attendreMoteur(r);
      const vr = r.vue();
      ok("supprimee puis choisie de nouveau : declaree SANS reduction, revenue (la phrase au tu), la place du serveur reprise",
        DP.phrasesDuLot(DP.bilanDuLot(vr.lot), { tu: true })[0] === "1 photo que tu avais supprimée est revenue dans l'album." && vr.place === 2 && DP.bilanDuLot(vr.lot).recues === 0
          && appelsR.length === 2 && Array.isArray(appelsR[1].corps.fichiers) && appelsR[1].corps.accord === true);
      r.detruire();

      /* Le lien régénéré pendant que la page est ouverte : 404. */
      serveur(() => ({ status: 404, corps: {} }));
      const mort = new MoteurDepot({ token: "t".repeat(32), p: null, tu: true });
      mort.definirAccord("2026-10-20");
      mort.ajouter(photos(2, "MORT"));
      await attendreMoteur(mort);
      const vm = mort.vue();
      ok("un 404 de la verification : le moteur se ferme avec la phrase de la page « Ce lien ne fonctionne plus » et le DIT (`lienMort`), la page bascule",
        vm.lienMort && vm.ferme === "Ce lien ne fonctionne plus. Demande le nouveau lien à l'organisateur." && vm.enCours === 0);
      mort.detruire();
    } finally {
      globalThis.fetch = avantFetch;
    }
  }

  titre("— 21/10 : cote serveur (contre la fausse base) —");
  {
    const ED = "33333333-0000-4000-8000-000000000001";
    const base = baseEnMemoire({
      collectif_photos: [
        { id: "A", edition_id: ED, supprimee_le: "2026-10-21T08:00:00Z", supprimee_par: "auteur", confirmee_le: "2026-10-20T10:00:00Z" },
        { id: "R", edition_id: ED, supprimee_le: "2026-10-21T08:00:00Z", supprimee_par: "responsable", confirmee_le: "2026-10-20T10:00:00Z" },
      ],
      collectif_doublons: [{ id: "d", edition_id: ED }],
    });
    const rest = await silence(() => Cs.restaurer(comme(base.client), ED, ["A", "R"], null, { par: "auteur" }));
    const journal = (base.tables.collectif_evenements ?? []).find((e) => e.type === "photos_restaurees");
    ok("restaurer par son auteur : seulement ce que l'AUTEUR avait supprime (le geste du responsable fait foi), journalise `par: \"auteur\"`, le cache des doublons vide",
      rest.statut === "ok" && rest.valeur.ids.join() === "A" && rest.valeur.refusees.join() === "R"
        && base.tables.collectif_photos.find((l) => l.id === "A")?.supprimee_le === null && base.tables.collectif_photos.find((l) => l.id === "R")?.supprimee_le !== null
        && (journal?.payload as { par?: string } | undefined)?.par === "auteur" && (base.tables.collectif_doublons ?? []).length === 0
        && phraseEvenement("photos_restaurees", { n: 1, par: "auteur" }) === "1 photo(s) restaurée(s) de la corbeille par leur auteur (choisie(s) de nouveau)."
        && phraseEvenement("photos_restaurees", { n: 2 }) === "2 photo(s) restaurée(s) de la corbeille.");
    const sansPar = baseEnMemoire({ collectif_photos: [{ id: "R", edition_id: ED, supprimee_le: "2026-10-21T08:00:00Z", supprimee_par: "responsable" }] });
    const resp = await silence(() => Cs.restaurer(comme(sansPar.client), ED, ["R"], null));
    ok("…et la restauration du responsable et de l'atelier ne change pas (toute photo de la corbeille)", resp.statut === "ok" && resp.valeur.ids.join() === "R");

    Hc.oublierAbsence();
    const cle = (n: string) => `sel~${n}|1|0`;
    const reprise = baseEnMemoire({
      collectif_photos: [
        { id: "p1", edition_id: ED, r2_key: "k1", cle_fichier: cle("a"), confirmee_le: "2026-10-20T10:00:00Z", provenance_id: B2, role_deposant: "participant", appareil_id: TEL, participant_id: MOI, supprimee_le: null, supprimee_par: null },
        { id: "p2", edition_id: ED, r2_key: "k2", cle_fichier: cle("b"), confirmee_le: "2026-10-20T10:00:00Z", provenance_id: B1, role_deposant: "participant", appareil_id: TEL, participant_id: MOI, supprimee_le: "2026-10-21T08:00:00Z", supprimee_par: "auteur" },
      ],
    });
    const lus = await silence(() => Col.lireExistants(comme(reprise.client), ED, [cle("a"), cle("b")]));
    ok("lireExistants rend d'ou vient la photo (son lien, son role, son appareil, sa personne) et qui l'a mise a la corbeille",
      lus?.get(cle("a"))?.provenanceId === B2 && lus.get(cle("a"))?.role === "participant" && lus.get(cle("a"))?.corbeille === undefined
        && lus.get(cle("b"))?.corbeille === true && lus.get(cle("b"))?.par === "auteur" && lus.get(cle("b"))?.appareilId === TEL && lus.get(cle("b"))?.participantId === MOI);
    const liens = baseEnMemoire({ collectif_provenances: [{ id: B2, edition_id: ED, type: "participant", libelle: "Bateau 2", sans_plafond: false, plafond_par_personne: 30, retire_le: null }, { id: B1, edition_id: "autre", libelle: "Pas d'ici" }] });
    const lus2 = await silence(() => Col.lireLiensParId(comme(liens.client), ED, [B2, B1, B2]));
    ok("lireLiensParId : le libelle d'un lien de L'EDITION par son id (celui d'une autre edition ne sort pas)", lus2?.get(B2)?.libelle === "Bateau 2" && !lus2.has(B1));

    Hc.oublierAbsence();
    const ph = (id: string, o: Record<string, unknown>) => ({ id, edition_id: ED, confirmee_le: "2026-10-20T10:00:00Z", role_deposant: "participant", appareil_id: TEL, participant_id: MOI, provenance_id: B1, supprimee_le: null, accord_version: "2026-10-20", ...o });
    const comptesBase = baseEnMemoire({
      collectif_photos: [
        ph("1", {}), ph("2", { appareil_id: PC }),
        ph("3", { provenance_id: B2 }), ph("4", { provenance_id: B2 }), ph("5", { provenance_id: B2 }), ph("6", { provenance_id: B2 }),
        ph("7", { supprimee_le: "2026-10-21T08:00:00Z" }), ph("8", { participant_id: "quelqu-un-d-autre", appareil_id: "autre-telephone-xxxxxx" }),
        ph("9", { provenance_id: null }),
      ],
    });
    const c = await silence(() => Ps.comptesDeLaPersonne(comme(comptesBase.client), ED, MOI, TEL, { provenanceId: B1 }));
    const cg = await silence(() => Ps.comptesDeLaPersonne(comme(comptesBase.client), ED, MOI, TEL, { provenanceId: null }));
    const sansLien = await silence(() => Ps.comptesDeLaPersonne(comme(comptesBase.client), ED, MOI, TEL));
    ok("« 2 photos déjà sur « Bateau 1 » » : SES photos de CE lien (ses deux appareils), hors corbeille, sans celles d'un autre lien ni d'une autre personne ; le lien general a les siennes ; `photos` reste le total de l'edition",
      c?.surCeLien === 2 && c.photos === 7 && cg?.surCeLien === 1 && sansLien?.surCeLien === 0);
  }

  titre("— 21/10 : les ecrans et les routes (relus dans le code) —");
  {
    const code = (f: string) => lire(f).replace(/\/\*[\s\S]*?\*\//g, "").replace(/\{\/\*[\s\S]*?\*\/\}/g, "");
    const album = code("src/app/depot/[token]/Album.tsx");
    const depot = code("src/app/depot/[token]/Depot.tsx");
    const etats = code("src/app/depot/[token]/Etats.tsx");
    const appelsF = code("src/app/depot/[token]/appels.ts");
    const mortF = lire("src/app/depot/[token]/LienMort.tsx");
    const presign = code("src/app/api/collectif/depot/presign/route.ts");
    const rAlbum = code("src/app/api/collectif/depot/album/route.ts");
    const rParticipant = code("src/app/api/collectif/depot/participant/route.ts");
    const rSupprimer = code("src/app/api/collectif/depot/supprimer/route.ts");
    const pageF = code("src/app/depot/[token]/page.tsx");
    const moteur = code("src/app/edition/_composants/depot/moteur.ts");
    ok("« cet appareil » partout sur la page de depot (un ordinateur n'est pas un telephone) : plus aucune phrase « ce téléphone » / « depuis ce téléphone » a l'ecran",
      /<span>Envoyées depuis cet appareil<\/span>/.test(album) && ![album, depot, etats, rSupprimer].some((t) => /(depuis|Ce|ce) téléphone/.test(t.replace(/\/\/.*$/gm, ""))));
    ok("« Mes photos » : la ligne des photos d'un autre appareil, sous l'onglet seulement ; le compte vient du serveur (par lien), jamais `photos - ceTelephone` (toute l'edition)",
      /\{onglet === "miennes" && autresAppareils \? <p className="ec-dp-note ec-dp-al-autres">\{autresAppareils\}<\/p> : null\}/.test(album) && /phraseAutresAppareils\(moiServeur\?\.autresAppareils, tu\)/.test(album)
        && !/moiServeur\?\.(photos|ceTelephone)/.test(album) && /autresAppareils: typeof m\.autresAppareils === "number"/.test(appelsF)
        && /for \(const f of filtreAlbum\(provenanceId\)\) q = poser\(q, f, avec\);\s*if \(avec\) q = q\.eq\("participant_id", personneId\);/.test(rAlbum) && /appareil_id\.is\.null,appareil_id\.neq\.\$\{appareil\}/.test(rAlbum)
        && /COMPTE_SANS_LIGNE/.test(rAlbum) && !/head: true/.test(rAlbum) && !/\.(insert|update|upsert|delete)\(/.test(rAlbum));
    ok("la carte et l'annonce de retour disent CE lien et ce qui reste (`phraseRetour`), plus le total de l'edition ; le serveur compte par lien",
      /phraseRetour\(reconnu\.surCeLien, place, lien, tu\)/.test(depot) && /phraseRetour\(accueilSurCeLien, placeLue, lienNom, tu\)/.test(album) && !/déjà arrivée\$\{|photos déjà arrivées/.test(depot)
        && /comptesDeLaPersonne\(supabase, edition\.id, participant\.id, appareil, \{ provenanceId: lien\?\.id \?\? null \}\)/.test(rParticipant) && /surCeLien: comptes\.surCeLien,/.test(rParticipant)
        && /comptesDeLaPersonne\(sb, edition\.id, qui\.participant\.id, telephone, \{ provenanceId: provenance\?\.id \?\? null \}\)/.test(pageF) && /surCeLien: nombre\(json\.surCeLien\)/.test(appelsF));
    ok("le bilan de l'envoi : les « deja la » dits par cas dans la barre du bas (pendant l'envoi aussi) ; une suppression efface le bilan precedent ; le moteur oublie les photos supprimees d'ici",
      /const phrasesLot = bilanVisible \? phrasesDuLot\(bilan, \{ tu \}\) : \[\];/.test(album) && /\{phrasesLot\.map\(\(t\) => \(/.test(album) && /if \(parties\.size\) setBilanEfface\(lot\.numero\);/.test(album)
        && /props\.moteur\?\.oublier\(parties\);/.test(album) && /oublier\(photoIds: Iterable<string>\): void/.test(moteur) && /const termine = lot\.total > 0 && lot\.enCours === 0 && lot\.erreurs === 0;/.test(album)
        && /Elle est dans l'album/.test(album));
    ok("un lot commence quand rien ne part (« Ajouter d'autres photos » pendant l'envoi s'y ajoute) ; une photo arrivee par un envoi precedent est dite « deja la » ; le moteur du responsable aussi",
      /private nouveauLotSiLibre\(\): void \{\s*if \(this\.occupe\(\)\) return;\s*this\.lot\+\+;/.test(moteur) && /ajouter\(fichiers: Iterable<File>\): void \{\s*if \(this\.ferme\) return;\s*const maintenant = Date\.now\(\);\s*this\.nouveauLotSiLibre\(\);/.test(moteur)
        && /lot: compterLot\(this\.items, this\.lot, this\.deuxFoisLot\),/.test(moteur) && /etat: deja \? "deja" : "neuf",/.test(moteur)
        && /progression\(vue\.lot\)/.test(lire("src/app/edition/_composants/depot/ZoneDepot.tsx")) && /progression\(vue\.lot\)/.test(lire("src/app/edition/_composants/depot/DepotContexte.tsx"))
        && /phrasesDuLot\(bilan, \{ tu, pour: "responsable" \}\)/.test(lire("src/app/edition/_composants/depot/FenetreEnvoi.tsx")));
    ok("le lien mort pendant que la page est ouverte : 404 d'album, d'envoi, de suppression ou de presentation = toute la page sur « Ce lien ne fonctionne plus », le meme texte que la 404 du serveur",
      /if \(r\.status === 404\) return \{ statut: "mort" \};/.test(appelsF) && /if \(mort \|\| vue\.lienMort\) return <CarteLienMort \/>;/.test(album) && /if \(mort\) return <CarteLienMort \/>;/.test(depot)
        && (depot.match(/if \(r\.status === 404\) \{\s*setMort\(true\);/g) ?? []).length === 3 && /\} else if \(r\.status === 404\) \{\s*setMort\(true\);/.test(depot)
        && /if \(r\.status === 404\) \{\s*setMort\(true\);/.test(album) && /export function CarteLienMort\(\)/.test(mortF) && /<main className="ec-dp">\s*<CarteLienMort \/>\s*<\/main>/.test(mortF)
        && /lienMort: this\.mort,/.test(moteur));
    ok("« Tout l'album » se relit (45 s, retour sur l'onglet) sans faire sauter la grille pendant un envoi ou pendant qu'on coche ; la relecture ne touche jamais « Mes photos »",
      /useSondage\(sonder, SONDAGE_ALBUM_MS, !mort\);/.test(album) && /const grilleFigee = enCours \|\| cocher;/.test(album) && /const photosAlbum = grilleFigee \? album\.photos : enTete\(neuvesAutres, album\.photos\);/.test(album)
        && /lireAlbum\(token, p, "album", 0\)/.test(album.slice(album.indexOf("const sonder"), album.indexOf("useSondage(sonder")))
        && !/setMiennes/.test(album.slice(album.indexOf("const sonder"), album.indexOf("useSondage(sonder"))));
    const iInsert = presign.indexOf('from("collectif_photos").insert(lignes)');
    const iRestaure = presign.indexOf("await restaurerDes(aRestaurer.filter((d) => d.ici)");
    ok("depot/presign : le lien lu AVANT la verification d'une reprise (qui dit ou), la restauration APRES l'insertion (un lot refuse ne restaure rien), `par: \"auteur\"`, la place relue apres un retour sur un autre lien ; aucun 500 de plus",
      presign.indexOf("estCleProvenance(corps.p)") < presign.indexOf("Array.isArray(corps.connues)") && /partagerConnues\(existants, \{ role, provenanceId, appareil: appareilDeRequete\(request\), participantId: null \}\)/.test(presign)
        && iInsert > 0 && iRestaure > iInsert && /restaurer\(supabase, edition\.id, photoIds, null, \{ par: "auteur" \}\)/.test(presign)
        && /planDeclaration\(declaration\.fichiers, existants, place, \{ role, provenanceId, appareil: appareilLu, participantId: participant\?\.id \?\? null \}\)/.test(presign)
        && /placeDuParticipant\(supabase, edition, origine \?\? null, appareil, participant\?\.id \?\? null, maintenant\)/.test(presign)
        && /deja: true, photoId: d\.id, restauree: true, ou: "restauree", ici: d\.ici/.test(presign) && /erreur: raison, message: messagePlafond\(raison, edition\.registre\), corbeille: true/.test(presign)
        && (presign.match(/\{ status: 500 \}/g) ?? []).length === 5 && /noterEchec\(supabase, edition\.id, "corbeille", \{ etape: "ecriture"/.test(presign));
  }
}



/* ════════════ 21/10 : la fin de collecte se DIT (espace, fiche de l'atelier, liste) ; un lien se modifie EN UNE FOIS ════════════ */

async function verifFinCollecte() {
  const code = (f: string) => lire(f).replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");

  titre("— 21/10 : la ligne d'état d'une collecte terminée (l'espace du client), à l'heure de Paris —");
  {
    /* Le 21/10/2026, Paris est en heure d'été (UTC+2) : 09 h 24 UTC = 11 h 24, le geste de Mathias dans le journal. */
    ok("la phrase de la maquette, avec la vraie date : « Collecte terminée le 21 octobre à 11 h 24 : les liens ne reçoivent plus de photos. L'atelier compose. »",
      Fin.ligneCollecteTerminee("2026-10-21T09:24:00.000Z") === "Collecte terminée le 21 octobre à 11 h 24 : les liens ne reçoivent plus de photos. L'atelier compose.");
    ok("l'heure d'hiver (UTC+1) et la fin de journée : 22 h 59 UTC le 4 novembre = 23 h 59 ; minuit passé : 22 h 30 UTC le 20 octobre = 00 h 30 le 21",
      Fin.quandParis("2026-11-04T22:59:00.000Z") === "le 4 novembre à 23 h 59" && Fin.quandParis("2026-10-20T22:30:00.000Z") === "le 21 octobre à 00 h 30");
    ok("le premier du mois s'écrit « 1er » (Intl écrit « 1 »)", Fin.quandParis("2026-11-01T10:00:00.000Z") === "le 1er novembre à 11 h 00");
    ok("une date illisible, sans fuseau ou absente : la phrase se TAIT sur la date, elle n'en invente jamais une",
      [null, undefined, "", "bientôt", "2026-10-21T11:24", "le 4 octobre"].every((x) => Fin.ligneCollecteTerminee(x) === "Collecte terminée : les liens ne reçoivent plus de photos. L'atelier compose."));
    const { tete, suite } = Fin.partiesCollecteTerminee("2026-10-21T09:24:00.000Z");
    ok("la tête (en gras à l'écran) et la suite recomposent la phrase", `${tete} : ${suite}` === Fin.ligneCollecteTerminee("2026-10-21T09:24:00.000Z") && tete === "Collecte terminée le 21 octobre à 11 h 24");
    ok("l'oubli suit le registre de l'édition (vous / tu), pour le responsable",
      Fin.ligneOubli(false) === "Un oubli ? Écrivez à l'atelier : il peut rouvrir." && Fin.ligneOubli(true) === "Un oubli ? Écris à l'atelier : il peut rouvrir.");
    const n = (x: number) => x.toLocaleString("fr-FR");
    ok("la fenêtre « Terminer la collecte maintenant ? » : les vrais nombres, la sélection seulement si elle existe, « vos » ou « tes »",
      Fin.phraseAtelierCommence(1248, 86, false) === `L'atelier commence avec les ${n(1248)} photos et vos 86 choisies.` && Fin.phraseAtelierCommence(1248, 86, true) === `L'atelier commence avec les ${n(1248)} photos et tes 86 choisies.`
        && Fin.phraseAtelierCommence(12, 0, false) === "L'atelier commence avec les 12 photos."
        && Fin.phraseAtelierCommence(1, 1, false) === "L'atelier commence avec la photo reçue." && Fin.phraseAtelierCommence(null, 0, false) === "L'atelier commence avec les photos reçues.");
    ok("aucun tiret cadratin dans ce que l'écran dit (phrases et libellés des trois fichiers)",
      !/[—–]/.test(code("src/lib/collectif/finCollecte.ts")) && !/[—–]/.test(code("src/app/edition/_composants/FinCollecte.tsx")) && !/[—–]/.test(Fin.RAISON_COLLECTE_TERMINEE));
  }

  titre("— 21/10 : le bloc d'état de la fiche de l'atelier, et la pastille de la liste —");
  {
    const g = (geste: "clore_collecte" | "terminer_collecte" | "rouvrir_collecte", par: string, le: string) => ({ geste, par, le });
    const bloc = (etat: EtatEdition, clotureLe: string | null, geste: ReturnType<typeof g> | null, archivee = false) => Fin.blocCollecte({ etat, clotureLe, archivee, geste });

    const ouverte = bloc("preparation", "2026-11-04T22:59:00.000Z", null);
    ok("ouverte : « Collecte ouverte jusqu'au 4 novembre à 23 h 59 », rien à rouvrir",
      !ouverte.termine && ouverte.titre === "Collecte ouverte jusqu'au 4 novembre à 23 h 59" && !ouverte.rouvrable && ouverte.detail === "");
    ok("ouverte sans date de clôture : on le dit",
      bloc("preparation", null, null).titre === "Collecte ouverte, sans date de clôture" && bloc("preparation", "pas une date", null).titre === "Collecte ouverte");
    ok("rouverte par un geste : « Rouverte par Louis le 21 octobre à 12 h 02. »",
      bloc("preparation", "2026-11-04T22:59:00.000Z", g("rouvrir_collecte", "Louis", "2026-10-21T10:02:00.000Z")).detail === "Rouverte par Louis le 21 octobre à 12 h 02.");

    const terminee = bloc("composition", "2026-10-21T09:24:00.000Z", g("terminer_collecte", "Mathias Durand", "2026-10-21T09:24:00.420Z"));
    ok("terminée par le RESPONSABLE : « Collecte terminée le 21 octobre à 11 h 24 par Mathias Durand », on peut rouvrir",
      terminee.termine && terminee.titre === "Collecte terminée le 21 octobre à 11 h 24 par Mathias Durand" && terminee.rouvrable
        && terminee.detail === "Les liens ne reçoivent plus de photos. Elle peut être rouverte tant qu'aucun bon à tirer n'est publié.");
    ok("clôturée par l'ATELIER (« Clore maintenant ») : « par l'atelier (Louis) »",
      bloc("composition", "2026-10-21T09:24:00.000Z", g("clore_collecte", "Louis", "2026-10-21T09:24:01.000Z")).titre === "Collecte terminée le 21 octobre à 11 h 24 par l'atelier (Louis)"
        && bloc("composition", "2026-10-21T09:24:00.000Z", g("clore_collecte", "", "2026-10-21T09:24:01.000Z")).titre.endsWith("par l'atelier"));
    const naturelle = bloc("composition", "2026-11-04T22:59:00.000Z", null);
    ok("arrivée à son terme sans geste : la date est la clôture, personne n'est nommé, la phrase dit pourquoi",
      naturelle.termine && naturelle.titre === "Collecte terminée le 4 novembre à 23 h 59" && naturelle.detail.startsWith("La date de clôture est passée. Les liens ne reçoivent plus de photos.") && naturelle.rouvrable);
    ok("un ancien geste ne parle pas d'une AUTRE clôture : la date a été déplacée depuis (plus de 10 minutes d'écart), personne n'est nommé",
      !/ par /.test(bloc("composition", "2026-11-04T22:59:00.000Z", g("terminer_collecte", "Mathias Durand", "2026-10-21T09:24:00.000Z")).titre)
        && /par Mathias/.test(bloc("composition", "2026-11-04T22:59:00.000Z", g("terminer_collecte", "Mathias", "2026-11-04T22:55:00.000Z")).titre));
    ok("rouverte PUIS arrivée à son terme : le dernier mot est « rouvrir », personne n'est nommé comme auteur de cette clôture",
      !/ par /.test(bloc("composition", "2026-11-04T22:59:00.000Z", g("rouvrir_collecte", "Louis", "2026-10-22T10:00:00.000Z")).titre));
    ok("un bon à tirer publié : la collecte ne rouvre plus, et la fiche le dit (le bouton ne se propose pas)",
      (["bat", "bat_valide", "impression", "expediee", "livree"] as EtatEdition[]).every((e) => {
        const b = bloc(e, "2026-10-21T09:24:00.000Z", g("terminer_collecte", "Mathias", "2026-10-21T09:24:00.000Z"));
        return b.termine && !b.rouvrable && /Elle ne peut plus être rouverte : un bon à tirer est publié\.$/.test(b.detail);
      }));
    const archivee = bloc("composition", "2026-10-21T09:24:00.000Z", null, true);
    ok("une édition archivée ne rouvre pas : il faut la récupérer d'abord", !archivee.rouvrable && /la récupérer pour pouvoir rouvrir/.test(archivee.detail));
    ok("terminée ⇔ l'état effectif a dépassé la préparation, pour chaque état (jamais la colonne brute)",
      ETATS_EDITION.every((e) => bloc(e, "2026-10-21T09:24:00.000Z", null).termine === (e !== "preparation")));

    const lignes = [
      { type: "geste", payload: { cle: "terminer_collecte", par: "Mathias Durand" }, created_at: "2026-10-21T09:24:00.000Z" },
      { type: "geste", payload: { cle: "rouvrir_collecte", par: "Louis" }, created_at: "2026-10-22T08:00:00.000Z" },
      { type: "geste", payload: { cle: "lancer_impression", par: "Louis" }, created_at: "2026-10-30T08:00:00.000Z" },
      { type: "message", payload: { cle: "terminer_collecte" }, created_at: "2026-10-31T08:00:00.000Z" },
      { type: "geste", payload: { cle: "clore_collecte", par: "Louis" }, created_at: "pas une date" },
    ];
    const dernier = Fin.dernierGesteDeCollecte(lignes);
    ok("le journal : le plus récent des TROIS gestes de collecte gagne (ni un autre geste, ni un autre type de ligne, ni une date illisible), dans n'importe quel ordre",
      dernier?.geste === "rouvrir_collecte" && dernier.par === "Louis" && Fin.dernierGesteDeCollecte([...lignes].reverse())?.geste === "rouvrir_collecte"
        && Fin.dernierGesteDeCollecte([]) === null && Fin.lireGesteDeCollecte(null) === null && Fin.lireGesteDeCollecte({ type: "geste", payload: null, created_at: "2026-10-21T09:24:00.000Z" }) === null);
    ok("la lecture SQL ne dépend pas des 100 dernières lignes du journal : une requête à part, triée du plus récent, une seule ligne",
      /\.eq\("type", "geste"\)\s*\.in\("payload->>cle", \[\.\.\.GESTES_COLLECTE\]\)\s*\.order\("created_at", \{ ascending: false \}\)\s*\.limit\(1\)/.test(code("src/app/admin/collectif/donnees.ts")));

    ok("la pastille de la liste : « Collecte ouverte » (vert) ou « Collecte terminée » (bleu), d'après l'état EFFECTIF",
      Fin.pastilleCollecte("preparation").texte === "Collecte ouverte" && Fin.pastilleCollecte("preparation").ton === "vert"
        && ETATS_EDITION.filter((e) => e !== "preparation").every((e) => Fin.pastilleCollecte(e).texte === "Collecte terminée" && Fin.pastilleCollecte(e).ton === "bleu"));
    const MAINT = new Date("2026-11-10T12:00:00.000Z");
    ok("une édition « préparation » en base dont la clôture est passée est TERMINÉE dans la liste ; ouverte tant que la clôture est à venir ; jamais l'inverse de `collecteOuverte`",
      (["2026-11-01T22:59:00.000Z", "2026-11-30T22:59:00.000Z", null] as (string | null)[]).every(
        (c) => (Fin.pastilleCollecte(etatEffectif("preparation", c, MAINT)).texte === "Collecte ouverte") === collecteOuverte("preparation", c, MAINT)
      ) && Fin.pastilleCollecte(etatEffectif("preparation", "2026-11-01T22:59:00.000Z", MAINT)).texte === "Collecte terminée");
    const liste = code("src/app/admin/collectif/page.tsx");
    const donneesAtelier = code("src/app/admin/collectif/donnees.ts");
    ok("la liste : la pastille et la date dans la colonne « Collecte », lues de `collecte: pastilleCollecte(etat)` (l'état effectif de `listerEditions`)",
      /collecte: pastilleCollecte\(etat\)/.test(donneesAtelier) && /eca-puce eca-puce--\$\{l\.collecte\.ton\}/.test(liste) && /\{l\.collecte\.texte\}/.test(liste) && /<th scope="col">Collecte<\/th>/.test(liste));

    const fiche = code("src/app/admin/collectif/[id]/page.tsx");
    const gestes = code("src/app/admin/collectif/[id]/PanneauGestes.tsx");
    ok("la fiche : le bloc est sous l'en-tête et AVANT les onglets (visible partout), « Rouvrir la collecte » est dans le bloc, par le MÊME flux que le menu (vérifier puis confirmer)",
      fiche.indexOf("</header>") < fiche.indexOf('aria-label="État de la collecte"') && fiche.indexOf('aria-label="État de la collecte"') < fiche.indexOf("<OngletsFiche")
        && /collecteBloc\.rouvrable \? <PanneauGestes id=\{e\.id\} etat=\{etat\} archivee=\{false\} seulement="rouvrir_collecte" bloc \/> : null/.test(fiche)
        && /blocCollecte\(\{ etat, clotureLe: e\.cloture_le, archivee: Boolean\(e\.archive_le\), geste: lu\.fiche\.gesteCollecte \}\)/.test(fiche)
        && (gestes.match(/fetch\(`\/api\/admin\/collectif\/editions\/\$\{id\}\/geste`/g) ?? []).length === 1 && /if \(seulement && c !== seulement\) return false;/.test(gestes) && /appeler\(true\)/.test(gestes) && /appeler\(false\)/.test(gestes));
    ok("la règle de rouvrir n'a pas bougé : `gestes.ts` (aucun tour publié, nouvelle date dans le futur) et la route de l'atelier, toujours listés dans la fiche",
      GESTES_DE_LA_FICHE.includes("rouvrir_collecte") && GESTES.rouvrir_collecte.libelle === "Rouvrir la collecte" && GESTES.rouvrir_collecte.de.join() === "composition"
        && refuse(preparerGeste("rouvrir_collecte", ctx({ etat: "composition", magazines: [mag({ toursPublies: 1 })], saisie: { cloture_le: DEMAIN } })), "tours"));
  }

  titre("— 21/10 : « Terminer la collecte » aussi depuis la page Photos, les boutons de dépôt éteints avec la raison —");
  {
    const fin = code("src/app/edition/_composants/FinCollecte.tsx");
    const collecte = code("src/app/edition/[token]/photos/Collecte.tsx");
    const carte = code("src/app/edition/[token]/CartePhotos.tsx");
    const pagePhotos = code("src/app/edition/[token]/photos/page.tsx");
    const tableau = code("src/app/edition/[token]/page.tsx");
    ok("UNE fenêtre, UN appel : le tableau de bord et la page Photos montent `FenetreTerminerCollecte` (la fenêtre n'est plus recopiée), l'appel à la route n'existe qu'à un endroit",
      /<FenetreTerminerCollecte/.test(carte) && /<FenetreTerminerCollecte/.test(fin) && /ActionsFinCollecte/.test(collecte)
        && [carte, collecte, fin].filter((c) => /\/api\/collectif\/collecte\/terminer/.test(c)).length === 1 && (fin.match(/Terminer la collecte maintenant \?/g) ?? []).length === 1 && !/Terminer la collecte maintenant/.test(carte + collecte));
    ok("la page Photos : « Terminer la collecte » dans l'en-tête, À CÔTÉ de « Déposer des photos » et « Créer un lien », réservé au droit `terminer_collecte` (jamais l'équipe)",
      collecte.indexOf("Déposer des photos") < collecte.indexOf("<ActionsFinCollecte") && /if \(variante === "tel" \|\| !fin\.terminer \|\| photos === 0\) return null;/.test(fin)
        && /terminer: peut\(role, 'terminer_collecte'\)/.test(pagePhotos) && peut("responsable", "terminer_collecte") && !peut("equipe", "terminer_collecte") && !peut("atelier", "terminer_collecte") && !peut("participant", "terminer_collecte"));
    ok("terminée : les boutons de dépôt et de création de lien sont ÉTEINTS (disabled), avec la raison (title et aria-describedby sur la ligne d'état), au bureau comme au téléphone",
      (fin.match(/disabled title=\{RAISON_COLLECTE_TERMINEE\} aria-describedby=\{ID_LIGNE_FIN\}/g) ?? []).length === 2 && /"Déposer des photos" : "Créer un lien"/.test(fin) && /ec-ph-fab--eteint/.test(fin)
        && (carte.match(/disabled title=\{RAISON_COLLECTE_TERMINEE\} aria-describedby=\{ID_LIGNE_FIN\}/g) ?? []).length === 2 && /Inviter quelqu&apos;un/.test(carte));
    ok("la ligne d'état s'affiche quand la collecte est terminée, sur le tableau de bord ET sur la page Photos, avec la date de la clôture ; l'oubli seulement pour le responsable, tant que l'atelier peut rouvrir",
      /\{!ouverte \? <LigneFinCollecte id=\{ID_LIGNE_FIN\} le=\{termineLe\} tu=\{p\.tu\} oubli=\{\(p\.oubli \|\| fin === "fait"\) && p\.terminer\} \/> : null\}/.test(carte)
        && /\{!p\.ouverte \? <LigneFinCollecte id=\{ID_LIGNE_FIN\} le=\{p\.fin\.le\} tu=\{p\.tu\} oubli=\{p\.fin\.terminer && p\.fin\.oubli\} \/> : null\}/.test(collecte)
        && /termineLe=\{ouverte \? null : edition\.cloture_le\}/.test(tableau) && /oubli=\{etat === 'composition'\}/.test(tableau) && /le: ouverte \? null : edition\.cloture_le/.test(pagePhotos));
    ok("au clic, l'écran se ferme tout de suite, sans attendre la relecture de la page (qui ne repeint pas toujours) : la route rend l'instant de la clôture, l'écran le garde et rafraîchit aussi",
      /termineLe: String\(prep\.patch\.cloture_le \?\? maintenant\.toISOString\(\)\)/.test(code("src/app/api/collectif/collecte/terminer/route.ts")) && /onFait\(typeof json\.termineLe === "string" \? json\.termineLe : new Date\(\)\.toISOString\(\)\)/.test(fin)
        && /ouverte=\{props\.ouverte && termineLe === null\}/.test(collecte) && /router\.refresh\(\)/.test(collecte) && /const ouverte = p\.ouverte && fin !== "fait";/.test(carte));
    const espaceCss = lire("src/app/edition/[token]/espace.css");
    const bloc = espaceCss.slice(espaceCss.indexOf("La fin de la collecte, dite là où l'on regarde"));
    ok("la feuille : jetons de l'espace seulement (aucune couleur écrite, aucun dvh), la ligne se pose sous l'en-tête de la page Photos",
      bloc.length > 200 && !/#[0-9a-fA-F]{3,8}\b/.test(bloc) && !/rgba?\(\s*\d/.test(bloc) && !/\bd?vh\b/.test(bloc) && /\.ec-espace \.ec-collecte > \.ec-fin-ligne/.test(bloc) && /var\(--ec-ok-soft\)/.test(bloc));
  }

  titre("— 21/10 : modifier un lien de contribution EN UNE FOIS (le nom ET le nombre de photos) —");
  {
    const EDITION = { plafond_participant_atelier: null as number | null };
    const A = "11111111-1111-4111-8111-111111111111";
    const B = "22222222-2222-4222-8222-222222222222";
    const C = "33333333-3333-4333-8333-333333333333";
    const liens: Mod.LienActuel[] = [
      { id: A, libelle: "Bateau 1", sans_plafond: false, plafond_par_personne: 30 },
      { id: B, libelle: "Bateau 2", sans_plafond: true, plafond_par_personne: null },
      { id: C, libelle: "Bateau 3", sans_plafond: false, plafond_par_personne: 10, retire_le: "2026-10-20T10:00:00.000Z" },
    ];
    const plan = (corps: Record<string, unknown>, ed = EDITION) => Mod.planModificationLien(corps, liens, ed);
    const refus = (corps: Record<string, unknown>, status: number, error: string, ed = EDITION) => {
      const p = plan(corps, ed);
      return !p.ok && p.status === status && p.error === error;
    };

    const les2 = plan({ id: A, libelle: "Équipe Lyon", plafond: 50 });
    ok("le nom ET le nombre dans UNE écriture : le patch porte les trois colonnes, le journal garde l'ancien nom",
      les2.ok && les2.nom === "Équipe Lyon" && les2.avant === "Bateau 1" && les2.nomChange && les2.plafondChange && les2.patch.libelle === "Équipe Lyon" && les2.patch.sans_plafond === false && les2.patch.plafond_par_personne === 50);
    const seulNombre = plan({ id: A, libelle: "Bateau 1", plafond: 10 });
    ok("le nombre seul : le nom n'est pas réécrit", seulNombre.ok && !seulNombre.nomChange && seulNombre.plafondChange && !("libelle" in seulNombre.patch) && seulNombre.patch.plafond_par_personne === 10);
    const seulNom = plan({ id: A, libelle: "Équipe Lyon", plafond: 30 });
    ok("le nom seul : le nombre n'est pas réécrit", seulNom.ok && seulNom.nomChange && !seulNom.plafondChange && seulNom.patch.libelle === "Équipe Lyon" && !("plafond_par_personne" in seulNom.patch));
    const rien = plan({ id: A, libelle: "Bateau 1", plafond: 30 });
    ok("rien ne change : rien à écrire (la route répond « inchangé », ni écriture ni ligne de journal)", rien.ok && Object.keys(rien.patch).length === 0 && !rien.nomChange && !rien.plafondChange);
    const sans = plan({ id: A, libelle: "Bateau 1", sansPlafond: true });
    ok("« Sans limite » : sans_plafond vrai, le nombre revient à null ; et l'inverse repose le nombre",
      sans.ok && sans.patch.sans_plafond === true && sans.patch.plafond_par_personne === null
        && (() => { const p = plan({ id: B, libelle: "Bateau 2", plafond: 40 }); return p.ok && p.patch.sans_plafond === false && p.patch.plafond_par_personne === 40; })());

    ok("un nom vide ou d'espaces : 422 « Écrire un nom. » (champ libelle) ; plus de 80 caractères : 422",
      refus({ id: A, libelle: "", plafond: 30 }, 422, "saisie") && refus({ id: A, libelle: "   ", plafond: 30 }, 422, "saisie") && refus({ id: A, plafond: 30 }, 422, "saisie") && refus({ id: A, libelle: "x".repeat(81), plafond: 30 }, 422, "saisie")
        && (() => { const p = plan({ id: A, libelle: "", plafond: 30 }); return !p.ok && p.champ === "libelle" && p.message === "Écrire un nom."; })());
    ok("un « / » tapé dans le nom devient « - » (comme pour les dossiers) ; les espaces se resserrent",
      (() => { const p = plan({ id: A, libelle: "  Équipe   Lyon / Nord ", plafond: 30 }); return p.ok && p.nom === "Équipe Lyon - Nord"; })());
    ok("le nombre suit la règle de la création : 1 au plafond de l'atelier, jamais 0, jamais un décimal, jamais un texte ; « 100 photos au plus » ou le plafond de l'atelier",
      refus({ id: A, libelle: "Bateau 1", plafond: 0 }, 422, "saisie") && refus({ id: A, libelle: "Bateau 1", plafond: 12.5 }, 422, "saisie") && refus({ id: A, libelle: "Bateau 1", plafond: "beaucoup" }, 422, "saisie") && refus({ id: A, libelle: "Bateau 1" }, 422, "saisie")
        && refus({ id: A, libelle: "Bateau 1", plafond: 101 }, 422, "saisie") && (() => { const p = plan({ id: A, libelle: "Bateau 1", plafond: 101 }); return !p.ok && p.champ === "plafond" && p.message === "100 photos au plus par personne pour cette édition."; })()
        && (() => { const p = plan({ id: A, libelle: "Bateau 1", plafond: 41 }, { plafond_participant_atelier: 40 }); return !p.ok && p.message === "40 photos au plus par personne pour cette édition."; })()
        && plan({ id: A, libelle: "Bateau 1", plafond: 40 }, { plafond_participant_atelier: 40 }).ok);
    ok("un nom déjà porté par un AUTRE lien ouvert : 409 `nom_deja_pris`, sans tenir compte de la casse ni des espaces ; un lien supprimé libère le sien ; le lien ne se refuse pas lui-même",
      refus({ id: A, libelle: "Bateau 2", plafond: 30 }, 409, "nom_deja_pris") && refus({ id: A, libelle: "  bateau   2 ", plafond: 30 }, 409, "nom_deja_pris")
        && plan({ id: A, libelle: "Bateau 3", plafond: 30 }).ok && plan({ id: A, libelle: "BATEAU 1", plafond: 30 }).ok);
    ok("les noms des groupes fixes sont réservés : 409 `nom_reserve` (Lien général, Le responsable, L'atelier, Tous les participants, Lien de contribution)",
      ["Lien général", "le responsable", "L'atelier", "Tous les participants", "Lien de contribution"].every((n) => refus({ id: A, libelle: n, plafond: 30 }, 409, "nom_reserve")));
    ok("changer le NOMBRE d'un lien qui porte déjà le nom d'un autre (écrit avant la règle) n'est pas refusé pour un nom qu'on n'a pas touché",
      (() => {
        const deux: Mod.LienActuel[] = [{ id: A, libelle: "Bateau 1", sans_plafond: false, plafond_par_personne: 30 }, { id: B, libelle: "Bateau 1", sans_plafond: false, plafond_par_personne: 30 }];
        const p = Mod.planModificationLien({ id: B, libelle: "Bateau 1", plafond: 50 }, deux, EDITION);
        const q = Mod.planModificationLien({ id: B, libelle: "Bateau 1 (2)", plafond: 50 }, deux, EDITION);
        return p.ok && !p.nomChange && q.ok && q.nomChange;
      })());
    ok("un lien inconnu, d'une autre édition, supprimé, ou un identifiant qui n'est pas un uuid : 404, jamais une écriture",
      refus({ id: "44444444-4444-4444-8444-444444444444", libelle: "x", plafond: 30 }, 404, "introuvable") && refus({ id: C, libelle: "Bateau 3", plafond: 30 }, 404, "introuvable")
        && refus({ id: "pas-un-uuid", libelle: "x", plafond: 30 }, 404, "introuvable") && refus({ libelle: "x", plafond: 30 }, 404, "introuvable") && refus({ id: ["x"], libelle: "x", plafond: 30 }, 404, "introuvable"));
    ok("le corps que l'écran envoie (`corpsModifierLien`) est celui que la règle comprend, avec un nombre ou « Sans limite »",
      JSON.stringify(Mod.corpsModifierLien(A, "Équipe Lyon", 50, false)) === JSON.stringify({ action: "modifier", id: A, libelle: "Équipe Lyon", plafond: 50 })
        && JSON.stringify(Mod.corpsModifierLien(A, "Équipe Lyon", 50, true)) === JSON.stringify({ action: "modifier", id: A, libelle: "Équipe Lyon", sansPlafond: true })
        && (() => { const p = plan(Mod.corpsModifierLien(A, "Équipe Lyon", 50, false)); return p.ok && p.patch.plafond_par_personne === 50; })()
        && (() => { const p = plan(Mod.corpsModifierLien(A, "Équipe Lyon", 50, true)); return p.ok && p.patch.sans_plafond === true; })());

    const route = code("src/app/api/collectif/provenances/route.ts");
    ok("la route : le droit `regler_plafond_participant` est demandé AVANT toute action, `modifier` passe par `planModificationLien` sur les liens de l'édition, UNE écriture bornée à l'édition, le journal garde ses deux phrases",
      route.indexOf('peut(acces.role, "regler_plafond_participant")') < route.indexOf('corps.action === "modifier"') && /planModificationLien\(corps, liens, edition\)/.test(route) && /lireProvenances\(edition\.id\)/.test(route)
        && /\.update\(plan\.patch\)\.eq\("id", String\(corps\.id\)\)\.eq\("edition_id", edition\.id\)/.test(route) && /"dossier_renomme", \{ avant: plan\.avant, apres: plan\.nom \}/.test(route) && /"provenance_plafond", \{ libelle: plan\.nom, sansPlafond: plan\.sans_plafond, plafond: plan\.plafond_par_personne \}/.test(route)
        && /if \(!Object\.keys\(plan\.patch\)\.length\) return NextResponse\.json/.test(route) && /ERREUR_REVISION_ABSENTE/.test(route) && !/\.delete\(/.test(route));
    ok("l'écran : UNE fenêtre « Modifier » (nom et nombre ensemble), envoyée par `corpsModifierLien`, pour un lien comme pour le lien général (nombre seul) ; les deux anciennes fenêtres sont archivées",
      /export function FenetreModifierLien/.test(lire("src/app/edition/[token]/photos/Liens.tsx")) && !/export function FenetreNom|export function FenetrePlafond/.test(lire("src/app/edition/[token]/photos/Liens.tsx"))
        && /corpsModifierLien\(modifier\.id, nom, valeur, sansLimite\)/.test(collecteDeLEcran()) && /\/api\/collectif\/plafond", \{ valeur \}/.test(collecteDeLEcran())
        && existsSync(resolve(RACINE, "archive/liens-nom-et-nombre-2026-10/Liens.tsx")) && existsSync(resolve(RACINE, "archive/liens-nom-et-nombre-2026-10/README.md"))
        && /export function FenetreNom/.test(lire("archive/liens-nom-et-nombre-2026-10/Liens.tsx")) && /export function FenetrePlafond/.test(lire("archive/liens-nom-et-nombre-2026-10/Liens.tsx")));
    ok("le menu d'un lien n'a plus que « Modifier » et « Supprimer le lien » ; le crayon du titre d'un lien ouvre la même fenêtre",
      (lire("src/app/edition/[token]/photos/Liens.tsx").match(/libelle: "Modifier"/g) ?? []).length === 2 && /libelle: "Supprimer le lien"/.test(lire("src/app/edition/[token]/photos/Liens.tsx"))
        && /else if \(ouvertNoeud && f\.lien\?\.startsWith\("lien:"\)\) \{[\s\S]{0,260}setModifier\(\{ id,/.test(collecteDeLEcran()));
  }
}

/** La page Photos (Collecte.tsx) sans ses commentaires : l'épreuve lit du code, pas des phrases. */
function collecteDeLEcran(): string {
  return lire("src/app/edition/[token]/photos/Collecte.tsx").replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
}

void sondeT191().then(sondeT167).then(gardeT159).then(sondeT194).then(verifT193).then(sondeT172).then(sondeLotA4).then(verifPersonnesCorbeille).then(verifDurcissement).then(verifAtelierCorbeillePersonnes).then(verifPhotosW2).then(verifDepotParticipant).then(verifRetention30).then(verifDejaLa).then(verifFinCollecte).then(() => {
  console.log(ko === 0 ? "\nTOUT PASSE\n" : `\n${ko} ECHEC(S)\n`);
  process.exit(ko === 0 ? 0 : 1);
});

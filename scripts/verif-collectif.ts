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
import {
  cleContenu,
  cleCouverture,
  cleDocument,
  clePageTour,
  clePdfTour,
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
  gestesDepuis,
  preparerGeste,
  quiPour,
  type ContexteGeste,
  type GesteCle,
  type MagazinePourGeste,
} from "@/lib/collectif/gestes";
import { lireInterrupteur } from "@/lib/collectif/interrupteur";
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
import { cheminSection, MENU, RAISON_VERROU, sectionDuChemin, verrousPour } from "@/lib/collectif/verrous";

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
     === "Tableau de bord | Style | Photos | Bon à tirer | Livraison | Votre dossier | Parler à l'atelier"
   && MENU.filter((e) => e.groupe === 2).map((e) => e.cle).join() === "dossier,atelier");
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
  saisir_livraison: ["atelier"],
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

titre("— chaque porte du B2B lit l'interrupteur —");
const layouts = ["src/app/edition/layout.tsx", "src/app/depot/layout.tsx", "src/app/admin/collectif/layout.tsx"];
ok("les trois layouts existent et appellent collectifOuvert() puis notFound()",
   layouts.every((f) => existsSync(resolve(RACINE, f)) && /collectifOuvert\(\)/.test(lire(f)) && /notFound\(\)/.test(lire(f))));
const routes = [...fichiers("src/app/api/collectif", "route.ts"), ...fichiers("src/app/api/admin/collectif", "route.ts")];
ok(`chaque route collectif (${routes.length}) lit l'interrupteur`,
   routes.every((f) => /collectifOuvert\(\)/.test(lire(f))));
const ECRITURE = /export\s+(async\s+)?function\s+(POST|PUT|PATCH|DELETE)\b/;
ok("chaque route publique qui ECRIT demande peut(role, action) avant d'agir",
   fichiers("src/app/api/collectif", "route.ts").filter((f) => ECRITURE.test(lire(f))).every((f) => /\bpeut\(/.test(lire(f))));
ok("chaque route admin revérifie l'admin (defense en profondeur)",
   fichiers("src/app/api/admin/collectif", "route.ts").every((f) => /quiEstConnecteRequete\(/.test(lire(f))));

titre("— le B2B n'ecrit jamais dans les tables du B2C —");
const libCollectif = readdirSync(resolve(RACINE, "src/lib/collectif")).filter((f) => f.endsWith(".ts"));
const interdits = /@\/lib\/atelier\/(evenements|mails|enrichissement|paiement|cloudprinter|apercu)["']/;
ok("aucun module de src/lib/collectif n'importe un module B2C qui ecrit dans numeros/photos/evenements",
   libCollectif.every((f) => !interdits.test(lire(`src/lib/collectif/${f}`))));
ok("aucun module de src/lib/collectif ne nomme une table du B2C",
   libCollectif.every((f) => !/from\(["'](numeros|photos|evenements|mails_envoyes)["']\)/.test(lire(`src/lib/collectif/${f}`))));

console.log(ko === 0 ? "\nTOUT PASSE\n" : `\n${ko} ECHEC(S)\n`);
process.exit(ko === 0 ? 0 : 1);

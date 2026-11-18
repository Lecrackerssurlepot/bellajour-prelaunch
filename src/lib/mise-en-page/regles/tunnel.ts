/**
 * Les règles du tunnel entrées À LA MAIN (18/11, T-216), dans l'ordre de leur poids :
 *   1. les retours de Mathias M-02 à M-10 (`docs/moteur/tunnel/RETOURS-MATHIAS.md`), qui PRIMENT ;
 *   2. les interdits durs déjà contrôlés (I-01 à I-07) ;
 *   3. les règles nées du banc du 17/11 (N-…, DA-…, `docs/moteur/tunnel/regles/REGLES-CODEES-AU-BANC.md`).
 * Chacune est GÉNÉRALE (M-01) : un profil ou une donnée mesurable, jamais un projet, un client ni une photo.
 * Les règles des cahiers des équipes sont dans `reprise.ts` (généré) et leurs retouches dans `surcharges.ts`.
 * Module pur.
 */

import type { Regle } from "./types";

const BANC = "design-explorations/tunnel-2026-11-17 (hors git)";

/* ─────────────────────────── 1. Les retours de Mathias ─────────────────────────── */

export const RETOURS_MATHIAS: readonly Regle[] = [
  {
    id: "M-02", domaine: "selection", famille: "interdit",
    enonce: "Rien n'est retiré en silence : toute proposition montre ce qui est posé, en réserve et écarté, avec la raison de chaque photo.",
    quand: "une proposition de magazine est rendue à l'atelier",
    alors: "chaque photo du lot porte un état (posée, réserve, écartée) et la règle qui l'y a mise ; une photo sans état ou sans raison bloque la proposition",
    profils: "tous", donnees: ["état de tri", "règle de la décision"], statut: "confirmee_mathias", source: "M-02", depuis: "2026-11-17",
  },
  {
    id: "M-03", domaine: "couverture", famille: "preference", poids: 3,
    enonce: "La photo de 1re de couverture est un temps fort : prise parmi les mieux notées des moments forts, jamais une photo de passage.",
    quand: "la machine propose des photos de 1re de couverture",
    alors: "les candidates sont prises dans le premier quart des notes, dans les moments les plus photographiés ; la sobriété de la couverture suit le profil",
    profils: "tous", donnees: ["INT", "moment fort", "DATE"], statut: "confirmee_mathias", source: "M-03", depuis: "2026-11-17",
  },
  {
    id: "M-04", domaine: "couverture", famille: "interdit",
    enonce: "Sur une couverture, une photo de personnes montre tout le groupe du projet, ou aucune personne : jamais une partie du groupe.",
    quand: "une photo candidate à la 1re ou à la 4e compte au moins un visage",
    alors: "refusée si son nombre de visages est inférieur à la taille du groupe (déclarée dans la fiche, sinon le plus grand nombre de visages compté de façon récurrente)",
    profils: "tous", donnees: ["VIS", "FICHE"], statut: "confirmee_mathias", source: "M-04", depuis: "2026-11-17",
  },
  {
    id: "M-05", domaine: "texte", famille: "preference", poids: 3,
    enonce: "Le thème d'album choisit la façon de nommer les chapitres : en road trip, les chapitres portent les lieux principaux, dans l'ordre du trajet.",
    quand: "le thème d'album est « road trip » et des lieux sûrs existent (GPS, lieu lu sûr, fiche du projet)",
    alors: "chaque chapitre prend le nom de son étape principale, dans l'ordre du trajet ; sans lieu sûr, le nom thématique reste le repli",
    profils: "tous", themes: ["road_trip"], donnees: ["LIEU", "DATE", "FICHE"], statut: "confirmee_mathias", source: "M-05", depuis: "2026-11-18",
  },
  {
    id: "M-06", domaine: "pose", famille: "preference", poids: 2,
    enonce: "Le degré de stylisation suit le profil : un voyage en famille reste sobre (peu d'effets, grandes photos, compositions nettes).",
    quand: "le profil du projet est un long voyage en famille",
    alors: "les gabarits sobres passent devant (pleines pages, grilles nettes) ; plus de gabarits ne veut pas dire plus d'extravagance",
    profils: ["long_voyage_famille"], donnees: ["profil"], statut: "confirmee_mathias", source: "M-06", depuis: "2026-11-18",
  },
  {
    id: "M-07", domaine: "structure", famille: "interdit",
    enonce: "Aucune page n'est vide ou presque : du texte ou de la couleur, jamais du vide complet.",
    quand: "la surface occupée d'une page (photos, textes, fonds) est sous le plancher `page_occupee_min`",
    alors: "la page reçoit un texte (un fait) ou un fond de couleur du nuancier, ou change de gabarit",
    profils: "tous", donnees: ["surface occupée"], reglages: ["page_occupee_min"], statut: "confirmee_mathias", source: "M-07", depuis: "2026-11-18",
  },
  {
    id: "M-08", domaine: "pose", famille: "interdit",
    enonce: "Une photo où l'on voit des personnes pèse plus dans la note et ne se pose jamais en petite vignette.",
    quand: "une photo compte au moins un visage (ou le tag « personnes ») et son cadre a un petit côté sous `personnes_cote_min_mm` ou une surface sous `personnes_surface_min_cm2`",
    alors: "elle prend un cadre plus grand, ou reste en réserve ; jamais posée sous ces tailles",
    profils: "tous", donnees: ["VIS", "taille du cadre"], reglages: ["personnes_cote_min_mm", "personnes_surface_min_cm2"], statut: "confirmee_mathias", source: "M-08", depuis: "2026-11-18",
  },
  {
    id: "M-09", domaine: "selection", famille: "interdit",
    enonce: "La réserve ne contient que des photos faibles : une bonne photo n'est jamais laissée de côté, c'est le nombre de pages qui s'adapte.",
    quand: "une photo n'est ni doublon, ni floue, et sa note est au-dessus de `note_plancher`",
    alors: "elle n'entre pas en réserve ; un lot déjà trié (presque aucune rafale ni doublon, notes hautes) est gardé presque entier, à `densite_tout_garder` photos par double, et la machine propose plusieurs tailles",
    profils: "tous", donnees: ["INT", "PILE", "NET"], reglages: ["note_plancher", "densite_tout_garder"], statut: "confirmee_mathias", source: "M-09", depuis: "2026-11-18",
  },
  {
    id: "M-10", domaine: "couverture", famille: "interdit",
    enonce: "La couverture reste un choix de l'atelier ; quand une photo est prise en couverture, l'intérieur se recompose pour ne pas la porter en double.",
    quand: "une photo est posée sur la 1re ou la 4e de couverture",
    alors: "elle quitte l'intérieur et la page qui la portait est recomposée ; M-03 et M-04 ne valent que pour les propositions",
    profils: "tous", donnees: ["photos posées"], statut: "confirmee_mathias", source: "M-10", depuis: "2026-11-18",
  },
  {
    id: "M-13", domaine: "analyse", famille: "interdit",
    enonce: "Jamais une case vide chez l'IA, jamais une lecture douteuse utilisée ; les marques de l'atelier priment toujours sur la machine.",
    quand: "une photo à lire n'a pas d'image chargée, ou plus de `lecture_illisibles_max` des photos d'une planche ou du lot n'en ont pas, ou plus de `lecture_ecarter_max` des photos lues sont « à écarter », ou une planche d'au moins `lecture_planche_uniforme_min` photos a partout le même rôle, ou une photo est gardée par l'atelier",
    alors: "l'illisible est retirée de la planche (ni case ni numéro) ; au-delà du seuil on s'arrête AVANT de payer, avec la phrase et le geste ; la lecture douteuse ne sert pas à écarter et l'écran propose de relire ses photos ; une photo gardée ou coup de cœur n'est jamais écartée ni mise en réserve par la machine",
    profils: "tous", donnees: ["image chargée", "rôle lu", "marque de l'atelier"], reglages: ["lecture_illisibles_max", "lecture_ecarter_max", "lecture_planche_uniforme_min"],
    statut: "confirmee_mathias", source: "M-13", depuis: "2026-11-18",
  },
  {
    id: "M-14", domaine: "structure", famille: "interdit",
    enonce: "Jamais d'impasse : une taille infaisable devient la plus proche faisable, et c'est dit ; sans de quoi composer, la cause et le geste en clair.",
    quand: "aucune répartition des doubles ne tient la taille demandée, ou moins de trois photos sont utilisables",
    alors: "la machine compose la taille faisable la plus proche (multiple de 4) et le dit (« 60 pages impossible avec 85 photos : 48 pages proposées ») ; sinon une phrase d'atelier dit la cause comptée et le geste, jamais un message technique",
    profils: "tous", donnees: ["photos utilisables", "pages"], statut: "confirmee_mathias", source: "M-14", depuis: "2026-11-18",
  },
  {
    id: "M-15", domaine: "structure", famille: "interdit",
    enonce: "La machine propose la taille : le nombre de pages n'est jamais demandé avant la composition ; les autres tailles sont offertes après, avec leurs vrais chiffres.",
    quand: "l'atelier lance « Composer le magazine »",
    alors: "la taille par défaut est le nombre de pages commandé s'il est connu, sinon M-09 (tout garder, `densite_tout_garder` photos par double) ; après la proposition, le bandeau offre « Plus court », « Tout garder », « Commandé », chacun composé pour de vrai",
    profils: "tous", donnees: ["pages commandées", "photos gardées"], reglages: ["densite_tout_garder"], statut: "confirmee_mathias", source: "M-15", depuis: "2026-11-18",
  },
];

/* ─────────────────────────── 2. Les interdits durs déjà contrôlés ─────────────────────────── */

export const INTERDITS_DURS: readonly Regle[] = [
  {
    id: "I-01", domaine: "pose", famille: "interdit",
    enonce: "Un visage n'est jamais coupé par le bord d'un cadre.",
    quand: "une photo à visages détectés est recadrée dans un cadre",
    alors: "le recadrage garde la zone importante (visages, air au-dessus de la tête, masse saillante) entière dans le cadre",
    profils: "tous", donnees: ["VIS", "SAIL"], reglages: ["air_tete", "masse_saillance"], statut: "codee", source: "R83, banc", depuis: "2026-11-09",
    controle: "recadrage.ts#recadrageParContenu",
  },
  {
    id: "I-02", domaine: "pose", famille: "interdit",
    enonce: "Aucune personne sur le pli d'une double.",
    quand: "la zone importante d'une photo posée à cheval sur le pli tombe à plus de 30 % dans la bande du pli",
    alors: "l'export avertit (visage au pli) ; la pose pénalise le gabarit qui la met là",
    profils: "tous", donnees: ["VIS", "SAIL"], reglages: ["pli_mm"], statut: "codee", source: "R-25, B3, DA-3", depuis: "2026-11-09",
    controle: "editeur/selecteurs.ts#visagesAuPli",
  },
  {
    id: "I-03", domaine: "pose", famille: "interdit",
    enonce: "Une photo ne se pose jamais deux fois sur une même planche, ni deux fois sur la couverture.",
    quand: "une planche ou la couverture porte deux fois le même identifiant de photo",
    alors: "l'état est refusé par les invariants (I9, C3)",
    profils: "tous", donnees: ["photos posées"], statut: "codee", source: "invariants I9 et C3", depuis: "2026-11-02",
    controle: "editeur/invariants.ts#deux fois sur",
  },
  {
    id: "I-04", domaine: "pose", famille: "interdit",
    enonce: "Une photo sous le seuil de définition de son cadre ne part pas sans avertissement.",
    quand: "la définition de la photo dans son cadre (pixels gardés après recadrage ÷ pouces imprimés) est sous 200 ppp (SEUIL_DPI), ou sous `definition_double_ppp` en pleine double",
    alors: "l'export la liste (basse définition) et l'atelier tranche",
    profils: "tous", donnees: ["DPI"], reglages: ["definition_double_ppp"], statut: "codee", source: "S-004, banc", depuis: "2026-11-02",
    controle: "editeur/selecteurs.ts#bassesDef",
  },
  {
    id: "I-05", domaine: "structure", famille: "interdit",
    enonce: "Aucune page intérieure sans photo.",
    quand: "une planche autre que la première et la dernière ne porte aucune photo",
    alors: "l'export la liste (page vide)",
    profils: "tous", donnees: ["photos posées"], statut: "codee", source: "F4, M-07", depuis: "2026-11-02",
    controle: "editeur/selecteurs.ts#pagesVides",
  },
  {
    id: "I-06", domaine: "texte", famille: "interdit",
    enonce: "Un texte posé par la machine est un fait (titre du dossier, pays, chapitre, dates de prise, lieu lu sûr), jamais inventé.",
    quand: "un cadre de texte reçoit un texte par défaut",
    alors: "le texte vient d'un fait ; sans source, le cadre reste vide et ne s'imprime pas (D2)",
    profils: "tous", donnees: ["DATE", "LIEU", "FICHE"], statut: "codee", source: "banc D30, D2", depuis: "2026-11-16",
    controle: "editeur/faits.ts#texteDeFait",
  },
  {
    id: "I-07", domaine: "analyse", famille: "interdit",
    enonce: "Aucune identité : on compte les visages, on ne les reconnaît jamais.",
    quand: "une lecture (locale ou IA) est chargée dans l'éditeur",
    alors: "toute clé d'identité (personne, nom, empreinte de visage) est refusée ; seuls le nombre, la taille et le selfie entrent",
    profils: "tous", donnees: ["VIS"], statut: "codee", source: "D29", depuis: "2026-11-14",
    controle: "editeur/lectureIA.ts#lireLectureIA",
  },
];

/* ─────────────────────────── 3. Les règles nées du banc (N-…) et du directeur artistique (DA-…) ─────────────────────────── */

const jouee = (ou: string, controle?: string) => ({ ou: `${BANC} : ${ou}`, etat: "jouee" as const, ...(controle ? { controle } : {}) });
const ecrite = { ou: BANC, etat: "ecrite" as const };

export const REGLES_DU_BANC: readonly Regle[] = [
  { id: "N-01", domaine: "analyse", famille: "interdit", enonce: "Une image reçue par messagerie n'a qu'une date de réception : elle ne date jamais un chapitre ; son chapitre est signalé douteux.", quand: "une photo sans date de prise, à la taille d'une image de messagerie", alors: "sa date est tenue pour douteuse ; elle se range à côté de sa voisine et son chapitre est signalé", profils: "tous", donnees: ["DATE", "PROV"], statut: "hypothese", source: "banc N-01", depuis: "2026-11-17", banc: jouee("charger") },
  { id: "N-02", domaine: "texte", famille: "interdit", enonce: "Un lieu lu sur un panneau légende une autre photo de la même double prise à 45 minutes au plus, jamais le panneau lui-même.", quand: "un lieu lu sûr vient d'une photo de panneau", alors: "il légende une photo voisine de la même double (± 45 min), pas le panneau", profils: "tous", donnees: ["TXT", "LIEU", "DATE"], statut: "hypothese", source: "banc N-02", depuis: "2026-11-17", banc: jouee("decider.py") },
  { id: "N-03", domaine: "texte", famille: "interdit", enonce: "Un nom de commerce lu (enseigne) n'est jamais un texte du magazine.", quand: "un texte lu sur une photo est un nom de commerce", alors: "il n'entre dans aucun titre ni aucune légende", profils: "tous", donnees: ["TXT"], statut: "hypothese", source: "banc N-03", depuis: "2026-11-17", banc: jouee("MARQUES") },
  { id: "N-04", domaine: "structure", famille: "preference", poids: 1, enonce: "L'ouverture d'un chapitre peut prendre la plus forte photo de son premier tiers.", quand: "une ouverture de chapitre se choisit", alors: "les candidates sont les photos du premier tiers du chapitre, la mieux notée d'abord", profils: "tous", donnees: ["INT", "DATE"], statut: "hypothese", source: "banc N-04", depuis: "2026-11-17", banc: jouee("options_ouverture") },
  { id: "N-05", domaine: "structure", famille: "interdit", enonce: "Une ouverture de chapitre n'est jamais « deux pleines pages » : le titre n'y tient pas.", quand: "une double ouvre un chapitre", alors: "la recette « deux pleines » lui est refusée", profils: "tous", donnees: ["rôle de la double"], statut: "hypothese", source: "banc N-05", depuis: "2026-11-17", banc: jouee("recettes") },
  { id: "N-07", domaine: "texte", famille: "interdit", enonce: "Pas de légende de lieu sur une double de six photos et plus.", quand: "une double porte six photos ou plus", alors: "aucune légende de lieu n'y est posée", profils: "tous", donnees: ["photos par double"], statut: "hypothese", source: "banc N-07", depuis: "2026-11-17", banc: jouee("decider.py") },
  { id: "N-08", domaine: "couverture", famille: "preference", poids: 2, enonce: "Les couvertures se classent d'abord par le type de photo que veut le profil.", quand: "les candidates de couverture se classent", alors: "le type voulu par le profil passe devant (un long voyage : un lieu avec des gens)", profils: "tous", donnees: ["SUJET", "VIS", "profil"], statut: "hypothese", source: "banc N-08", depuis: "2026-11-17", banc: jouee("decider.py") },
  { id: "N-09", domaine: "structure", famille: "preference", poids: 2, enonce: "La dernière page préfère nettement une verticale qui tient la page.", quand: "la photo de la dernière page se choisit", alors: "une verticale à la définition de la pleine page passe devant", profils: "tous", donnees: ["RATIO", "DPI"], statut: "hypothese", source: "banc N-09", depuis: "2026-11-17", banc: jouee("decider.py") },
  { id: "N-10", domaine: "selection", famille: "interdit", enonce: "Une photo au chapitre douteux ne va pas à l'intérieur : elle reste en réserve.", quand: "le chapitre d'une photo est signalé douteux (N-01)", alors: "elle va en réserve avec cette raison", profils: "tous", donnees: ["DATE", "PROV"], statut: "hypothese", source: "banc N-10", depuis: "2026-11-17", banc: jouee("entonnoir") },
  { id: "N-11", domaine: "pose", famille: "preference", poids: 1, enonce: "Un lot surtout panoramique peut revenir à la page « trois bandes » jusqu'au quart des planches, jamais sur deux planches voisines.", quand: "la majorité du lot est en 21:9 ou plus large", alors: "la page « trois bandes » est permise sur 25 % des planches au plus, jamais deux planches de suite", profils: "tous", donnees: ["RATIO"], statut: "hypothese", source: "banc N-11, N-11 bis", depuis: "2026-11-17", banc: jouee("pose.ts PART_MAX, FENETRE") },
  { id: "N-12", domaine: "pose", famille: "interdit", enonce: "Jamais quatre photos 21:9 sur une même page.", quand: "une page porterait quatre photos en 21:9", alors: "le gabarit est refusé", profils: "tous", donnees: ["RATIO"], statut: "hypothese", source: "banc N-12", depuis: "2026-11-17", banc: jouee("COUT_U") },
  { id: "N-13", domaine: "pose", famille: "preference", poids: 2, enonce: "Une double hors ouverture va à fond perdu : de grandes photos à mettre en valeur.", quand: "une double n'ouvre pas un chapitre", alors: "les gabarits à fond perdu passent devant", profils: "tous", donnees: ["rôle de la double"], statut: "hypothese", source: "banc N-13", depuis: "2026-11-17", banc: jouee("fond_perdu, pose.ts") },
  { id: "N-14", domaine: "pose", famille: "preference", poids: 2, enonce: "Mêler des 21:9 et des verticales sur deux ou trois photos, ou poser une image de messagerie en gabarit libre, coûte cher.", quand: "une double de deux ou trois photos mêle 21:9 et verticales, ou une image de messagerie irait en gabarit libre", alors: "la recette reçoit un coût fort", profils: "tous", donnees: ["RATIO", "PROV"], statut: "hypothese", source: "banc N-14", depuis: "2026-11-17", banc: jouee("recettes") },
  { id: "N-15", domaine: "selection", famille: "preference", poids: 1, enonce: "Une image de messagerie descend dans la note.", quand: "une photo est une image reçue par messagerie", alors: "sa note baisse de 0,12 (réglage de départ du banc)", profils: "tous", donnees: ["PROV", "INT"], statut: "hypothese", source: "banc N-15", depuis: "2026-11-17", banc: jouee("score") },
  { id: "N-16", domaine: "texte", famille: "interdit", enonce: "Une légende de lieu se pose seulement sur une recette qui laisse une marge de texte.", quand: "une légende de lieu est proposée", alors: "elle n'est posée que si la recette de la double laisse une marge de texte", profils: "tous", donnees: ["LIEU"], statut: "hypothese", source: "banc N-16", depuis: "2026-11-17", banc: ecrite },
  { id: "N-17", domaine: "pose", famille: "preference", poids: 1, enonce: "Une série de trois et trois bandes porte une répétition voulue.", quand: "une double pose deux séries de trois bandes", alors: "elle est marquée « répétition voulue » (S-103) et sort du compte des répétitions", profils: "tous", donnees: ["SÉRIE"], statut: "hypothese", source: "banc N-17", depuis: "2026-11-17", banc: ecrite },
  { id: "N-18", domaine: "couverture", famille: "interdit", enonce: "La vignette de 4e se prend parmi les photos de gens dont aucun visage ne touche le bord.", quand: "une photo de gens est candidate à la vignette de 4e", alors: "refusée si un visage touche le bord de la photo", profils: "tous", donnees: ["VIS"], statut: "hypothese", source: "banc N-18", depuis: "2026-11-17", banc: ecrite },
  { id: "N-18b", domaine: "couverture", famille: "preference", poids: 1, enonce: "La vignette de 4e est verticale.", quand: "la vignette de 4e se choisit", alors: "les verticales passent devant", profils: "tous", donnees: ["RATIO"], statut: "hypothese", source: "banc N-18 bis", depuis: "2026-11-17", banc: jouee("couvertures") },
  { id: "N-19", domaine: "selection", famille: "interdit", enonce: "Deux photos de la même scène ne vont jamais ensemble, même quand leur empreinte ne les rapproche pas.", quand: "deux photos à 5 minutes au plus, même sujet, même plan, même format", alors: "une seule est posée, l'autre en réserve", profils: "tous", donnees: ["DATE", "SUJET", "PLAN", "RATIO"], statut: "hypothese", source: "banc N-19, DA-6", depuis: "2026-11-17", banc: jouee("entonnoir") },
  { id: "N-20", domaine: "structure", famille: "interdit", enonce: "La taille commandée du magazine ne change pas d'une passe à l'autre.", quand: "une nouvelle passe recompose le magazine", alors: "le nombre de pages commandé est gardé ; seule la répartition change", profils: "tous", donnees: ["pages commandées"], statut: "hypothese", source: "banc N-20", depuis: "2026-11-17", banc: jouee("passe.sh") },
  { id: "N-21", domaine: "texte", famille: "preference", poids: 1, enonce: "Le titre d'une ouverture de chapitre va dans le cadre géant.", quand: "une ouverture de chapitre porte un cadre géant", alors: "le nom du chapitre y est posé", profils: "tous", donnees: ["rôle de la double"], statut: "hypothese", source: "banc N-21", depuis: "2026-11-17", banc: jouee("pose.ts force") },
  { id: "N-22", domaine: "pose", famille: "interdit", enonce: "Une série de bandes tient sur une seule double.", quand: "une série de photos en bandes est posée", alors: "elle n'est jamais coupée entre deux doubles", profils: "tous", donnees: ["SÉRIE", "RATIO"], statut: "hypothese", source: "banc N-22, N-17 bis", depuis: "2026-11-17", banc: jouee("recettes") },
  { id: "N-23", domaine: "structure", famille: "preference", poids: 1, enonce: "Le sommet du magazine est une photo seule.", quand: "la double du sommet se choisit (fenêtre de 55 à 85 % du magazine)", alors: "elle porte une seule photo", profils: "tous", donnees: ["INT"], statut: "hypothese", source: "banc N-23", depuis: "2026-11-17", banc: jouee("decouper") },
  { id: "N-24", domaine: "structure", famille: "interdit", enonce: "La dernière page vient avant les couvertures dans l'ordre des choix.", quand: "le magazine se compose", alors: "la dernière page est choisie avant la 1re et la 4e", profils: "tous", donnees: [], statut: "hypothese", source: "banc N-24", depuis: "2026-11-17", banc: jouee("decider.py") },
  { id: "N-25", domaine: "typo", famille: "preference", poids: 1, enonce: "Les lignes d'un itinéraire se composent en corps 14.", quand: "une page d'itinéraire est posée", alors: "ses lignes sont en corps 14", profils: "tous", donnees: [], statut: "hypothese", source: "banc N-25", depuis: "2026-11-17", banc: ecrite },
  { id: "N-26", domaine: "pose", famille: "interdit", enonce: "« Pleine et bandes » exige trois bandes, ou deux à la définition de la pleine page.", quand: "la recette « pleine et bandes » est proposée", alors: "refusée avec moins de trois bandes, sauf deux bandes à la définition de la pleine page", profils: "tous", donnees: ["RATIO", "DPI"], statut: "hypothese", source: "banc N-26", depuis: "2026-11-17", banc: ecrite },
  { id: "N-27", domaine: "pose", famille: "preference", poids: 1, enonce: "Quatre bandes se posent sur une épingle dessinée (E-D9a, E-D9b), jamais sur une double générée.", quand: "une double porte quatre bandes", alors: "les épingles E-D9a et E-D9b passent devant ; un gabarit GD1 est écarté", profils: "tous", donnees: ["RATIO"], statut: "hypothese", source: "banc N-27", depuis: "2026-11-17", banc: ecrite },
  { id: "N-28", domaine: "couverture", famille: "interdit", enonce: "Une enseigne lue écarte une photo de la 1re de couverture.", quand: "un nom de commerce est lu sur une photo", alors: "elle n'est pas candidate à la 1re de couverture", profils: "tous", donnees: ["TXT"], statut: "hypothese", source: "banc N-28", depuis: "2026-11-17", banc: ecrite },

  { id: "DA-1", domaine: "structure", famille: "interdit", enonce: "Une seule forme d'ouverture de chapitre dans un magazine, et une seule couleur de titre.", quand: "les ouvertures de chapitre se posent", alors: "toutes prennent la même forme (pleine page, nom en géant, dates) et la même couleur de titre", profils: "tous", donnees: ["rôle de la double"], statut: "hypothese", source: "DA", depuis: "2026-11-17", banc: jouee("decider.py étape 5", "mesurer.ts regles_da") },
  { id: "DA-2", domaine: "structure", famille: "interdit", enonce: "Jamais plus de deux doubles de suite sans fond perdu.", quand: "trois doubles de suite seraient sans photo à fond perdu", alors: "la troisième passe à fond perdu (S-097)", profils: "tous", donnees: ["fond perdu"], statut: "hypothese", source: "DA, S-097", depuis: "2026-11-17", banc: jouee("decouper", "mesurer.ts regles_da") },
  { id: "DA-3", domaine: "pose", famille: "interdit", enonce: "Aucun corps à moins de 15 mm du pli.", quand: "une silhouette ou une zone de gens tombe à moins de 15 mm du pli", alors: "le gabarit est refusé pour cette photo", profils: "tous", donnees: ["VIS", "SAIL"], statut: "hypothese", source: "DA", depuis: "2026-11-17", banc: jouee("pose.ts MARGE_PLI_CORPS", "mesurer.ts corps_pli") },
  { id: "DA-4", domaine: "selection", famille: "interdit", enonce: "Une photo faible n'est pas posée quand la réserve en a une nettement meilleure.", quand: "une photo posée a une note sous 0,55 et la réserve en garde une à 0,70 ou plus (réglages du banc)", alors: "elles sont échangées, ou la faible sort sans remplaçante", profils: "tous", donnees: ["INT"], statut: "hypothese", source: "DA", depuis: "2026-11-17", banc: jouee("decider.py étape 4", "mesurer.ts regles_da") },
  { id: "DA-5", domaine: "pose", famille: "interdit", enonce: "Pas de trou blanc dans une page.", quand: "un rectangle vide d'au moins 12 % × 25 % de la page apparaît dans l'enveloppe des cadres", alors: "le gabarit coûte cher ; une page sous `page_occupee_min` est refusée (M-07)", profils: "tous", donnees: ["surface occupée"], reglages: ["page_occupee_min"], statut: "hypothese", source: "DA", depuis: "2026-11-17", banc: jouee("pose.ts trouEnveloppe", "mesurer.ts regles_da") },
  { id: "DA-6", domaine: "selection", famille: "interdit", enonce: "Jamais deux fois la même scène, sur une double ni sur sa voisine.", quand: "deux photos de la même scène (N-19) iraient sur la même double ou sur deux doubles voisines", alors: "une seule est posée", profils: "tous", donnees: ["DATE", "SUJET", "PLAN"], statut: "hypothese", source: "DA", depuis: "2026-11-17", banc: jouee("entonnoir", "mesurer.ts regles_da") },
  { id: "DA-7", domaine: "pose", famille: "interdit", enonce: "Un gabarit sert quatre fois au plus, et deux planches voisines n'ont jamais le même.", quand: "un gabarit est posé une cinquième fois, ou sur la planche voisine du même", alors: "il est écarté (les ouvertures voulues et les pleines pages seules sont hors compte)", profils: "tous", donnees: ["gabarits posés"], statut: "hypothese", source: "DA", depuis: "2026-11-17", banc: jouee("pose.ts MAX_FOIS", "mesurer.ts regles_da") },
  { id: "DA-8", domaine: "texte", famille: "interdit", enonce: "Les légendes vont hors de la photo ; un titre de lieu seulement s'il est sûr.", quand: "une légende ou un titre de lieu est posé", alors: "jamais une légende dans une photo, corps 8 au moins ; un lieu ne titre que s'il est lu sûr au moins deux fois", profils: "tous", donnees: ["LIEU", "TXT"], statut: "hypothese", source: "DA", depuis: "2026-11-17", banc: jouee("pose.ts", "mesurer.ts regles_da") },
  { id: "DA-9", domaine: "structure", famille: "preference", poids: 2, enonce: "Le rythme suit le profil : un sommet vers 60 à 70 % du magazine, une alternance de grandes et de denses.", quand: "les doubles se répartissent", alors: "les parts de doubles à une photo et de doubles denses tombent dans les fourchettes du profil ; le sommet est placé dans sa fenêtre", profils: "tous", donnees: ["photos par double"], statut: "hypothese", source: "DA", depuis: "2026-11-17", banc: jouee("decouper", "mesurer.ts regles_da") },
  { id: "DA-10", domaine: "couleur", famille: "interdit", enonce: "La couleur vient de la photo.", quand: "un titre, une date ou un aplat reçoit une couleur", alors: "elle est prise dans une photo du magazine (l'accent, ou la couleur franche d'une photo voisine pour un aplat)", profils: "tous", donnees: ["PAL"], statut: "hypothese", source: "DA, C-047", depuis: "2026-11-17", banc: jouee("teinte_de", "mesurer.ts regles_da") },
];

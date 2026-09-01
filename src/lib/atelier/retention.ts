/**
 * T-076 — la rétention des dossiers abandonnés. Module PUR.
 *
 * ══════════════════════════════════════════════════════════════════════════
 * LA DÉCISION DE MATHIAS, 01/09/2026
 *
 * « Rétention de 90 jours, ANONYMISATION plutôt que suppression, avec un mail
 * de relance à J-7 avant échéance. »
 *
 * Trois mots comptent, et chacun est une contrainte de code :
 *
 * 90 JOURS        — RETENTION_JOURS. Le délai court depuis la DERNIÈRE
 *                   ACTIVITÉ du dossier, jamais depuis sa création : une
 *                   cliente qui revient déposer trois photos au 80e jour
 *                   remet le compteur à zéro.
 * ANONYMISATION   — la LIGNE RESTE, avec ses horodatages. Les métriques
 *                   (entonnoir, durées d'étape, taux d'abandon) se calculent
 *                   sur `created_at` / `etat_maj_le` / `nb_photos` : effacer
 *                   la ligne, c'est réécrire l'histoire du produit. Seules
 *                   les données PERSONNELLES partent.
 * RELANCE À J-7   — PREAVIS_JOURS. On ne referme pas un dossier en silence.
 *                   Le mail M10 part à J-83, et l'anonymisation EXIGE qu'il
 *                   soit parti depuis au moins 7 jours (`preavisRespecte`).
 *
 * ══════════════════════════════════════════════════════════════════════════
 * DEUX POPULATIONS, DEUX HORLOGES — décision de Mathias, 01/09/2026
 *
 * La première version de ce module épargnait TOUT dépôt terminé, pour
 * toujours. Mathias a tranché le trou que ça laissait le jour même :
 * « On fait 90 jours après le dépôt, cela me paraît bien. »
 *
 * A. LE DÉPÔT N'A JAMAIS ÉTÉ TERMINÉ (`consent_photos` faux).
 *    90 jours depuis la dernière activité : ouverture du dossier, changement
 *    d'état, ou dernière photo arrivée.
 *
 * B. LE DÉPÔT EST TERMINÉ MAIS RIEN N'A JAMAIS ÉTÉ PAYÉ.
 *    90 jours depuis LA DATE DU DÉPÔT, c'est-à-dire le moment où elle a
 *    cliqué « Envoyer à l'atelier ». Couvre les trois cas réels : le dossier
 *    que l'atelier n'a jamais composé, le 1b resté sans réponse, et surtout
 *    l'aperçu publié jamais payé.
 *
 * ⚠️ CETTE DATE N'EST PAS UNE COLONNE, ET C'EST VOULU. `numeros` ne porte pas
 * de `consent_photos_at` (seules les deux cases du paiement ont leur
 * horodatage, parce qu'elles sont opposables). L'horodatage du dépôt vit dans
 * `evenements`, type `consentements`, payload `consent_photos: true` — voir
 * le commentaire de PATCH /api/atelier/numero : « La date fait foi par le
 * journal ». C'est la MÊME source que `donnees.ts` (T2-5, où finit le premier
 * dépôt) et `mesure.ts` (le jalon `depot` de l'entonnoir). Elle est donc
 * fiable, mais elle coûte une lecture : d'où `Jalons`, que l'appelant fournit.
 *
 * ⚠️ ET SI ELLE MANQUE ? `logEvenement` est best-effort et ne throw jamais :
 * un dossier peut porter `consent_photos = true` sans avoir son événement.
 * Dans ce cas ON NE FERME PAS, et le motif le dit (`depot_sans_date`). Le
 * repli honnête est de garder, pas d'approximer : `created_at` est antérieur
 * au dépôt (on fermerait trop tôt) et `etat_maj_le` peut avoir été poussé par
 * un geste de l'atelier des semaines plus tard. Aucune des deux n'est « la
 * date du dépôt », et se tromper ici efface des photos.
 *
 * ══════════════════════════════════════════════════════════════════════════
 * CE QUI RESTE ABSOLU, QUELLE QUE SOIT L'HORLOGE
 *
 * 1. UN DOSSIER PAYÉ OU ENGAGÉ NE S'ANONYMISE JAMAIS. Ni maintenant, ni dans
 *    dix ans, ni par ce script. Obligations comptables (une facture ne
 *    s'efface pas) et contractuelles (un objet a été livré à une adresse).
 *    La garde est DOUBLE et c'est volontaire : `stripe_payment_intent` posé
 *    OU l'état dans ETATS_ENGAGES.
 *
 *    ⚠️ LE CAS QUI PROUVE QU'IL EN FAUT DEUX EXISTE POUR DE VRAI. Au palier
 *    30 €, le crédit d'une fondatrice couvre TOUT le prix : la session Stripe
 *    se solde en `no_payment_required` et le dossier n'a alors AUCUN
 *    `payment_intent` (cf. src/lib/atelier/CLAUDE.md, 01/09). Sur la seule
 *    garde Stripe, une fondatrice servie gratuitement aurait vu son dossier
 *    refermé. C'est l'état qui la sauve.
 *
 * 2. RIEN NE S'ANONYMISE DEUX FOIS (`anonymise_le`).
 *
 * 3. RIEN NE SE FERME SANS PRÉAVIS. M10 part à J-83 pour LES DEUX
 *    populations, et l'anonymisation exige qu'il soit parti depuis 7 jours
 *    (`preavisRespecte`). Une cliente qui a vu sa couverture et qui hésite
 *    encore mérite d'autant plus d'être prévenue : ce mail est aussi la
 *    dernière chance de vente du dossier.
 * ══════════════════════════════════════════════════════════════════════════
 *
 * PUR : aucune base, aucun réseau, aucun R2. Éprouvé par
 * `scripts/verif-atelier.ts`. Le module qui AGIT est
 * `scripts/anonymiser-dossiers.ts`, et lui seul.
 */

/** 90 jours de rétention. Décision de Mathias, 01/09/2026 (T-076). */
export const RETENTION_JOURS = 90;

/** Le préavis annoncé à la cliente avant la fermeture. Même décision. */
export const PREAVIS_JOURS = 7;

/**
 * Le jour où le préavis M10 part : 90 - 7 = 83.
 *
 * DÉRIVÉ, jamais écrit en dur. Les deux nombres du haut sont les seuls
 * réglages ; celui-ci doit les suivre sans qu'on y pense. Écrit à la main, il
 * aurait fini par dire 83 le jour où la rétention serait passée à 60.
 */
export const PREAVIS_A_JOURS = RETENTION_JOURS - PREAVIS_JOURS;

const JOUR = 86_400_000;

/**
 * Les états où l'argent ou la fabrication sont engagés. Aucun ne s'anonymise.
 *
 * `payee` et tout ce qui suit : il y a une transaction, un PDF chez
 * l'imprimeur, un colis, une adresse.
 *
 * ⚠️ `apercu_pret` et `photos_insuffisantes` N'Y SONT PAS, et depuis le 01/09
 * ce n'est plus un détail : ce sont exactement les dossiers de la population
 * B. Une couverture composée n'est pas un engagement de la cliente, c'est un
 * travail de l'atelier qu'elle n'a jamais acheté.
 */
export const ETATS_ENGAGES = [
  "payee",
  "maquette_prete",
  "validee",
  "en_production",
  "expediee",
  "livree",
] as const;

/** Ce que la règle a besoin de savoir d'un dossier. Rien de plus. */
export type NumeroPourRetention = {
  etat: string;
  consent_photos: boolean | null;
  stripe_payment_intent: string | null;
  created_at: string | null;
  etat_maj_le: string | null;
  /**
   * ⚠️ COLONNE FRAÎCHE (migration 20260901_atelier_retention). Optionnelle
   * dans le type parce que le repli 42703 la fait disparaître de la lecture :
   * `undefined` se lit alors comme « jamais anonymisé », ce qui est vrai tant
   * que la colonne n'existe pas. Voir supabase/CLAUDE.md.
   */
  anonymise_le?: string | null;
};

/** Pourquoi ce dossier n'est pas touché. Le dry-run l'affiche tel quel. */
export type MotifEpargne =
  | "deja_anonymise"
  | "paye"
  | "etat_engage"
  | "depot_termine"
  | "depot_sans_date"
  | "dans_la_retention"
  | "date_illisible";

export type Verdict =
  | { anonymisable: true; jours: number }
  | { anonymisable: false; motif: MotifEpargne; jours: number | null };

/** Le motif, en français, pour la console et le journal. */
export const TEXTE_MOTIF: Record<MotifEpargne, string> = {
  deja_anonymise: "déjà anonymisé",
  paye: "payé (obligations comptables)",
  etat_engage: "engagé en production ou livré",
  /* Conservé APRÈS la décision du 01/09, et volontairement : le dry-run doit
     distinguer les deux populations. « Encore dans les 90 jours » ne dit pas
     la même chose pour un questionnaire abandonné et pour une couverture
     composée qui attend une décision d'achat. */
  depot_termine: "dépôt terminé, encore dans les 90 jours",
  depot_sans_date: "dépôt terminé mais SANS date dans le journal (on garde)",
  dans_la_retention: "dépôt jamais terminé, encore dans les 90 jours",
  date_illisible: "aucune date lisible (on ne touche pas à ce qu'on ne date pas)",
};

/**
 * Les dates que la base porte AILLEURS que sur `numeros`, et que seul un
 * appelant avec un client Supabase peut aller chercher. Ce module reste pur :
 * il les reçoit, il ne les lit pas.
 *
 * Les deux sont optionnelles, et leur absence n'a PAS le même effet :
 * une photo manquante rend le dossier plus vieux qu'il n'est (on ferme trop
 * tôt), une date de dépôt manquante fait REFUSER la fermeture. Voir
 * `verdictRetention`.
 */
export type Jalons = {
  /**
   * Le clic « Envoyer à l'atelier », lu dans `evenements` (type
   * `consentements`, payload `consent_photos: true`). Le PLUS RÉCENT s'il y
   * en a plusieurs : un retour de 1b redépose, et c'est une activité.
   */
  depotLe?: string | null;
  /** `created_at` de la dernière photo arrivée dans la table `photos`. */
  dernierePhotoLe?: string | null;
};

/**
 * L'instant de la DERNIÈRE ACTIVITÉ du dossier, en ms. `null` si rien n'est
 * datable — et dans ce cas rien ne sera touché.
 *
 * Quatre sources, la plus récente gagne :
 *   `created_at`      — l'ouverture du dossier (écran 4) ;
 *   `etat_maj_le`     — tout passage d'état, 1b→1 et publication de l'aperçu
 *                       compris. Oui, un geste de l'ATELIER repousse
 *                       l'échéance : publier une couverture le 3 mars, c'est
 *                       lui donner 90 jours pour se décider à partir de là ;
 *   `depotLe`         — le clic « Envoyer à l'atelier » (population B) ;
 *   `dernierePhotoLe` — la dernière photo arrivée.
 *
 * ⚠️ LES DEUX DERNIÈRES NE SONT PAS SUR `numeros`, et ce n'est pas un oubli
 * de schéma. Déposer une photo n'écrit NI `etat_maj_le` NI aucune autre date
 * sur le dossier (vérifié : /api/atelier/photos/* ne touche que la table
 * `photos`) ; et l'horodatage du dépôt fait foi par le journal, par décision
 * explicite (PATCH /api/atelier/numero). Sans la première, une cliente qui
 * monte quarante photos au 85e jour verrait son dépôt effacé cinq jours plus
 * tard, en pleine activité.
 *
 * ⚠️ UN JALON NE PEUT QUE RAJEUNIR UN DOSSIER, jamais le vieillir. C'est ce
 * qui autorise le pré-tri bon marché de `meriteUnRegardDeRetention` : calculé
 * sans jalons, l'âge est un MAJORANT, donc un dossier écarté sans eux ne peut
 * pas devenir éligible avec.
 */
export function derniereActivite(
  n: NumeroPourRetention,
  jalons?: Jalons,
): number | null {
  const instants = [n.created_at, n.etat_maj_le, jalons?.depotLe, jalons?.dernierePhotoLe]
    .map((v) => (v ? Date.parse(v) : Number.NaN))
    .filter((t) => !Number.isNaN(t));
  return instants.length ? Math.max(...instants) : null;
}

/** Depuis combien de jours ce dossier ne bouge plus. `null` si indatable. */
export function joursDInactivite(
  n: NumeroPourRetention,
  maintenant: Date,
  jalons?: Jalons,
): number | null {
  const dernier = derniereActivite(n, jalons);
  if (dernier === null) return null;
  return (maintenant.getTime() - dernier) / JOUR;
}

/**
 * Le jour où ce dossier se refermera. C'est la date ANNONCÉE dans M10, et
 * c'est la même qui décide de l'effacement : une échéance de courtoisie qui
 * ne correspondrait pas à la fermeture réelle serait pire que pas de date
 * (même règle que DATE_LIMITE dans M5).
 *
 * ⚠️ ARITHMÉTIQUE EN MILLISECONDES, PAS EN JOURS DE CALENDRIER. `ajouterJours`
 * (dates.ts) fait un `setDate`, qui conserve l'heure LOCALE : à cheval sur le
 * changement d'heure d'octobre, 90 jours de calendrier valent 90 jours et une
 * heure de temps réel. La règle d'éligibilité, elle, compte en millisecondes.
 * Les deux divergeaient donc d'une heure deux fois par an, et le harnais l'a
 * attrapé : la veille de l'échéance annoncée, le dossier était déjà effaçable.
 * Une heure, mais du mauvais côté d'une promesse écrite à une cliente.
 */
export function dateDeCloture(
  n: NumeroPourRetention,
  jalons?: Jalons,
): Date | null {
  const dernier = derniereActivite(n, jalons);
  return dernier === null ? null : new Date(dernier + RETENTION_JOURS * JOUR);
}

/**
 * Les gardes qui n'ont RIEN à voir avec le temps : payé, engagé, déjà refermé.
 * Partagées par le verdict d'effacement et par le préavis — on n'annonce pas
 * une fermeture à quelqu'un qu'on n'a pas le droit de refermer. Une seule
 * copie de la règle, donc aucune divergence possible.
 *
 * ⚠️ `consent_photos` N'EST PLUS UNE GARDE STRUCTURELLE depuis le 01/09. Il
 * ne décide plus SI l'on ferme, seulement QUELLE HORLOGE compte. Le déplacer
 * ici serait revenir à la version d'avant la décision de Mathias.
 */
function motifStructurel(n: NumeroPourRetention): MotifEpargne | null {
  if (n.anonymise_le) return "deja_anonymise";
  if (n.stripe_payment_intent) return "paye";
  if ((ETATS_ENGAGES as readonly string[]).includes(n.etat)) return "etat_engage";
  return null;
}

/**
 * Ce dossier peut-il être anonymisé, et sinon pourquoi.
 *
 * ⚠️ LA BORNE EST À 90 JOURS PLEINS, INCLUS : à 89,9 jours on ne touche à
 * rien, à 90,0 pile on y touche. Éprouvé aux deux bornes dans verif-atelier.
 *
 * ⚠️ POPULATION B SANS `jalons.depotLe` : on REFUSE. Un dépôt terminé dont le
 * journal ne porte pas l'événement `consentements` n'a aucune date fiable, et
 * les deux candidates au remplacement mentent dans des directions opposées
 * (`created_at` est antérieur au dépôt, `etat_maj_le` peut lui être bien
 * postérieur). Le repli honnête est de garder et de le dire.
 */
export function verdictRetention(
  n: NumeroPourRetention,
  maintenant: Date,
  jalons?: Jalons,
): Verdict {
  const structurel = motifStructurel(n);
  const jours = joursDInactivite(n, maintenant, jalons);
  if (structurel) return { anonymisable: false, motif: structurel, jours };

  const depotTermine = n.consent_photos === true;
  if (jours === null) return { anonymisable: false, motif: "date_illisible", jours: null };

  /* ⚠️ L'ÂGE SE TESTE AVANT LA DATE DE DÉPÔT, et l'ordre n'est pas anodin.
     Un dossier récent est épargné parce qu'il est récent, pas parce qu'on
     ignore la date de son dépôt : sans ce test d'abord, tous les dépôts
     terminés du jour ressortaient « SANS date dans le journal » dans le
     dry-run, ce qui ressemble à une panne alors que tout va bien. Et l'âge
     calculé sans `depotLe` est un MAJORANT : s'il est déjà sous les 90 jours,
     la vraie date ne peut que le confirmer. */
  if (jours < RETENTION_JOURS) {
    /* Deux motifs pour un seul test, parce que le dry-run doit rester
       lisible : « encore dans les 90 jours » ne raconte pas la même histoire
       pour un questionnaire abandonné et pour une couverture composée. */
    return {
      anonymisable: false,
      motif: depotTermine ? "depot_termine" : "dans_la_retention",
      jours,
    };
  }

  /* Passé 90 jours, la date du dépôt devient indispensable : c'est elle qui
     fait courir l'horloge de la population B. Sans elle, on garde. */
  if (depotTermine && !jalons?.depotLe) {
    return { anonymisable: false, motif: "depot_sans_date", jours };
  }
  return { anonymisable: true, jours };
}

/** Raccourci booléen. La raison passe par `verdictRetention`. */
export function estAnonymisable(
  n: NumeroPourRetention,
  maintenant: Date,
  jalons?: Jalons,
): boolean {
  return verdictRetention(n, maintenant, jalons).anonymisable;
}

/**
 * LE PRÉ-TRI BON MARCHÉ : faut-il aller chercher les jalons de ce dossier ?
 *
 * Les jalons coûtent deux requêtes (`evenements` et `photos`). La relève
 * balaie jusqu'à 200 dossiers chaque matin et la quasi-totalité sont récents :
 * les charger pour tout le monde serait payer cher une réponse toujours non.
 *
 * ⚠️ CE FILTRE EST UN SUR-ENSEMBLE, ET C'EST DÉMONTRABLE : un jalon est une
 * date, `derniereActivite` prend le MAXIMUM, donc ajouter des jalons ne peut
 * que reculer la dernière activité, donc que DIMINUER l'âge. L'âge calculé
 * sans eux est un majorant ; un dossier écarté ici ne peut pas redevenir
 * éligible une fois les jalons connus. Rien ne peut passer au travers.
 */
export function meriteUnRegardDeRetention(
  n: NumeroPourRetention,
  maintenant: Date,
): boolean {
  if (motifStructurel(n)) return false;
  const majorant = joursDInactivite(n, maintenant);
  return majorant !== null && majorant >= PREAVIS_A_JOURS;
}

/**
 * Le préavis M10 est-il dû ? À J-83, soit 7 jours avant la fermeture.
 *
 * Les MÊMES gardes que l'effacement, plus le temps : on ne prévient que ceux
 * qu'on refermera vraiment. Depuis le 01/09, ça inclut la population B — une
 * cliente qui a vu sa couverture et hésite encore mérite d'autant plus d'être
 * prévenue, et ce mail est aussi la dernière chance de vente du dossier.
 *
 * ⚠️ Il reste dû AU-DELÀ de 90 jours, et ce n'est pas un oubli : si le
 * préavis n'est jamais parti (template absent, Brevo en panne, script jamais
 * lancé), le dossier ne doit pas se refermer pour autant. Il attend son
 * préavis, puis sept jours. Jamais de fermeture sans avertissement.
 *
 * ⚠️ Sans `depotLe` pour un dépôt terminé, PAS DE PRÉAVIS non plus : on
 * n'annonce pas une date qu'on ne sait pas calculer, et de toute façon
 * `verdictRetention` refusera de fermer. Les deux fonctions ne peuvent pas
 * diverger, elles partagent le même test.
 */
export function doitPrevenirCloture(
  n: NumeroPourRetention,
  maintenant: Date,
  jalons?: Jalons,
): boolean {
  if (motifStructurel(n)) return false;
  if (n.consent_photos === true && !jalons?.depotLe) return false;
  const jours = joursDInactivite(n, maintenant, jalons);
  return jours !== null && jours >= PREAVIS_A_JOURS;
}

/**
 * A-t-on le DROIT de refermer ce dossier maintenant ? La question du préavis,
 * séparée de celle de l'échéance.
 *
 * `preavisEnvoyeLe` : la date du M10 dans `mails_envoyes`, ou null.
 * `aUneAdresse`    : le dossier a-t-il un email où écrire.
 *
 * Deux cas rendent `true` :
 *   — le préavis est parti et a plus de PREAVIS_JOURS jours ;
 *   — il n'y a AUCUNE adresse : il n'y a personne à prévenir, et attendre un
 *     mail qui ne peut pas partir garderait la donnée pour toujours.
 *
 * ⚠️ Conséquence directe : sans `BREVO_TEMPLATE_M10_ID` sur Vercel, M10 ne
 * part jamais et PLUS RIEN ne s'anonymise. C'est le bon sens de l'échec —
 * on préfère cent fois garder trop longtemps qu'effacer sans prévenir — mais
 * il est silencieux, alors le dry-run le dit en toutes lettres.
 */
export function preavisRespecte(
  preavisEnvoyeLe: string | null | undefined,
  aUneAdresse: boolean,
  maintenant: Date,
): boolean {
  if (!aUneAdresse) return true;
  if (!preavisEnvoyeLe) return false;
  const t = Date.parse(preavisEnvoyeLe);
  if (Number.isNaN(t)) return false;
  return maintenant.getTime() - t >= PREAVIS_JOURS * JOUR;
}

/**
 * Ce qu'on écrit sur la ligne pour la vider de la cliente.
 *
 * ⚠️ CE QUI N'EST PAS LÀ EST AUSSI IMPORTANT QUE CE QUI Y EST.
 * Ne bougent pas : `created_at`, `etat_maj_le`, `etat`, `nb_photos`,
 * `nb_pages`, `palier`, `consent_*` — toute la matière des métriques
 * (entonnoir, durées, taux d'abandon). Une ligne anonymisée doit compter
 * EXACTEMENT comme avant dans /admin/atelier/metriques.
 * Ne bouge pas non plus le `token` : il est unique, il n'est pas une donnée
 * personnelle, et le changer casserait le lien entre le journal et la ligne.
 *
 * `titre` reçoit un marqueur plutôt que null : l'atelier doit comprendre au
 * premier coup d'œil ce qu'est cette ligne sans nom. Aucun risque de le voir
 * partir dans un mail : `email` est null, et `manquePour` refuse tout envoi
 * sans adresse, pour tous les codes, sans exception.
 */
export const TITRE_ANONYME = "Dossier refermé";

export function patchAnonymisation(): Record<string, string | null> {
  return {
    email: null,
    email_canonical: null,
    prenom: null,
    telephone: null,
    /* Ses mots à elle : l'occasion, l'histoire, le titre. Tout part. */
    occasion: null,
    histoire: null,
    titre: TITRE_ANONYME,
    /* Vide sur un dossier jamais payé, mais on ne parie pas là-dessus. */
    adresse_livraison: null,
  };
}

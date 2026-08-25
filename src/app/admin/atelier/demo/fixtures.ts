/**
 * Le jeu de démonstration.
 *
 * ══════════════════════════════════════════════════════════════════════════
 * POURQUOI IL EXISTE
 *
 * Le back-office ne se juge pas sur une capture : il se juge sur un lundi
 * matin. Or en production il n'y a qu'une poignée de dossiers, tous dans le
 * même état, et on ne voit donc jamais l'écran qui compte — celui où deux
 * dossiers sont en retard, trois attendent une couverture et un vient d'être
 * payé.
 *
 * Ces neuf dossiers couvrent les neuf états, avec des âges choisis pour que
 * le tri par urgence ait quelque chose à trier. Ils passent par les MÊMES
 * composants et le MÊME calcul d'urgence que les vrais : ce n'est pas une
 * maquette, c'est l'outil, avec d'autres données.
 *
 * Rien ici ne touche la base. Le panneau d'action détecte le mode et
 * n'appelle aucune route (cf. PanneauAction, `demo`).
 * ══════════════════════════════════════════════════════════════════════════
 */

import { eurosPour } from "@/lib/atelier/prix";
import { ETAPE_ETAT, LIBELLE_ETAT, actionsDepuis, type Etat } from "@/lib/atelier/transitions";
import { compter, comparerUrgence, urgencePour, etapeDepot, type EtapeDepot } from "@/lib/atelier/urgence";
import { raconter } from "@/lib/atelier/recit";
import { construireParcours } from "@/lib/atelier/parcours";
import { COLONNES } from "../donnees";
import type { Fiche, LigneDossier, VueListe } from "../types";

/* En démonstration, la règle d'envoi n'est pas rejouée : on montre le mail
   attendu à l'arrivée de chaque état. Sur un vrai dossier, c'est `codesPour`
   qui tranche (cf. donnees.ts, mailDeLAction). */
const MAIL_A_L_ARRIVEE: Partial<Record<Etat, string>> = {
  photos_recues: "M1",
  photos_insuffisantes: "M9",
  apercu_pret: "M3",
  maquette_prete: "M5",
  validee: "M6",
  expediee: "M7",
};

/* Des jetons de 32 caractères, comme les vrais : la fiche de démonstration
   se partage par URL et doit avoir la même tête qu'un vrai lien. */
const T = (n: string) => (n + "0".repeat(32)).slice(0, 32);

type Graine = {
  token: string;
  titre: string;
  prenom: string;
  email: string;
  telephone: string;
  occasion: string;
  histoire: string;
  etat: Etat;
  nbPhotos: number;
  nbPages: number | null;
  palier: "p30" | "p40" | "p45" | null;
  /** Heures écoulées depuis l'entrée dans l'état courant. */
  depuis: number;
  /** Jours depuis l'ouverture du dossier. */
  ouvertIlYA: number;
  paye?: boolean;
  rembourse?: boolean;
  dom?: boolean;
  fondatrice?: number;
  /**
   * Photos montées, bouton final jamais cliqué (cf. urgence.ts, etapeDepot).
   * Cas réel du 25/08 : sans lui, la démonstration ne montre jamais l'état
   * où le compteur de photos et l'avancement réel se contredisent.
   */
  depotAbandonne?: boolean;
};

const GRAINES: Graine[] = [
  {
    token: T("demo1"),
    titre: "Notre été à Séville",
    prenom: "Camille",
    email: "camille.reynaud@example.com",
    telephone: "06 12 34 56 78",
    occasion: "Un voyage à deux",
    histoire:
      "Dix jours en juillet, avec une chaleur à ne pas sortir avant sept heures du soir. On a marché des kilomètres dans Triana, on s'est perdus deux fois, et on a mangé les mêmes churros tous les matins au même comptoir. La photo que je préfère, c'est celle où il rit sur le pont de Isabel II, parce qu'il ne rit jamais sur les photos.",
    etat: "payee",
    nbPhotos: 74,
    nbPages: 34,
    palier: "p40",
    depuis: 96,
    ouvertIlYA: 9,
    paye: true,
  },
  {
    token: T("demo2"),
    titre: "Jeanne a un an",
    prenom: "Marion",
    email: "marion.leclerc@example.com",
    telephone: "06 98 76 54 32",
    occasion: "Le premier anniversaire",
    histoire:
      "Une année entière en photos. Il y a la maternité, les premiers bains, la maison de ma mère en Bretagne au mois d'août, et le gâteau qu'elle a écrasé avec les deux mains. Beaucoup d'intérieur, beaucoup de lumière chaude. Ses deux grands frères sont sur presque toutes, j'aimerais qu'on ne les oublie pas.",
    etat: "photos_recues",
    nbPhotos: 63,
    nbPages: null,
    palier: null,
    depuis: 61,
    ouvertIlYA: 3,
  },
  {
    token: T("demo3"),
    titre: "La maison de Kerlouan",
    prenom: "Élise",
    email: "elise.bertin@example.com",
    telephone: "07 61 20 44 09",
    occasion: "Une maison de famille",
    histoire:
      "Mes grands-parents l'ont vendue en mai. Trente ans d'étés dans le même jardin. J'ai récupéré les albums de ma mère et scanné ce que j'ai pu, il y a du très vieux et du très récent mélangés.",
    etat: "photos_recues",
    nbPhotos: 41,
    nbPages: null,
    palier: null,
    depuis: 14,
    ouvertIlYA: 1,
  },
  {
    token: T("demo4"),
    titre: "Le mariage de Léa et Sam",
    prenom: "Léa",
    email: "lea.marchand@example.com",
    telephone: "06 44 55 66 77",
    occasion: "Un mariage",
    histoire:
      "Cent quatre-vingts invités, une grange dans le Gers, et un orage à vingt-deux heures qui a tout fait rentrer d'un coup. Le photographe nous a rendu neuf cents photos, on a essayé d'en garder les plus vraies.",
    etat: "apercu_pret",
    nbPhotos: 88,
    nbPages: 44,
    palier: "p45",
    depuis: 52,
    ouvertIlYA: 6,
    fondatrice: 7,
  },
  {
    token: T("demo5"),
    titre: "Trois semaines au Japon",
    prenom: "Hugo",
    email: "hugo.vidal@example.com",
    telephone: "06 23 45 67 89",
    occasion: "Un voyage",
    histoire: "Tokyo, Kanazawa, Kyoto. Beaucoup de trains, beaucoup de pluie, aucun regret.",
    etat: "maquette_prete",
    nbPhotos: 96,
    nbPages: 48,
    palier: "p45",
    depuis: 40,
    ouvertIlYA: 14,
    paye: true,
  },
  {
    token: T("demo6"),
    titre: "Pour les 70 ans de papa",
    prenom: "Sophie",
    email: "sophie.nguyen@example.com",
    telephone: "06 11 22 33 44",
    occasion: "Un anniversaire",
    histoire: "On lui offre le 12 octobre, en famille. Il ne sait rien.",
    etat: "validee",
    nbPhotos: 52,
    nbPages: 30,
    palier: "p40",
    depuis: 30,
    ouvertIlYA: 19,
    paye: true,
  },
  {
    token: T("demo7"),
    titre: "L'année du déménagement",
    prenom: "Anaïs",
    email: "anais.pereira@example.com",
    telephone: "06 55 44 33 22",
    occasion: "Une année",
    histoire: "De Lille à Saint-Denis de La Réunion, avec deux chats et beaucoup de cartons.",
    etat: "en_production",
    nbPhotos: 58,
    nbPages: 36,
    palier: "p40",
    depuis: 26,
    ouvertIlYA: 24,
    paye: true,
    dom: true,
  },
  {
    token: T("demo8"),
    titre: "Le dernier été de Gribouille",
    prenom: "Thomas",
    email: "thomas.andre@example.com",
    telephone: "06 77 88 99 00",
    occasion: "Un souvenir",
    histoire: "Quinze ans de chat. Il est parti en juin, on voulait quelque chose de beau.",
    etat: "expediee",
    nbPhotos: 39,
    nbPages: 24,
    palier: "p30",
    depuis: 48,
    ouvertIlYA: 28,
    paye: true,
  },
  {
    token: T("demo9"),
    titre: "Marseille, encore",
    prenom: "Inès",
    email: "ines.moreau@example.com",
    telephone: "06 10 20 30 40",
    occasion: "Un week-end",
    histoire: "Le même week-end, tous les ans, depuis six ans.",
    etat: "photos_insuffisantes",
    nbPhotos: 11,
    nbPages: null,
    palier: null,
    depuis: 20,
    ouvertIlYA: 2,
  },
  {
    token: T("demoA"),
    titre: "Sans titre",
    prenom: "Claire",
    email: "claire.dumas@example.com",
    telephone: "",
    occasion: "Une naissance",
    histoire: "",
    etat: "photos_recues",
    nbPhotos: 0,
    nbPages: null,
    palier: null,
    depuis: 30,
    ouvertIlYA: 1,
  },
  {
    token: T("demoD"),
    titre: "Joëlle, quatre-vingts ans",
    prenom: "Sophie",
    email: "sophie.leroy@example.com",
    telephone: "06 22 33 44 55",
    occasion: "Un anniversaire",
    histoire: "Toute la famille pour ses quatre-vingts ans, dans le jardin de Vendée.",
    etat: "photos_recues",
    nbPhotos: 55,
    nbPages: null,
    palier: null,
    depuis: 26,
    ouvertIlYA: 1,
    depotAbandonne: true,
  },
  {
    token: T("demoB"),
    titre: "Le tour du Mont-Blanc",
    prenom: "Paul",
    email: "paul.girard@example.com",
    telephone: "06 60 70 80 90",
    occasion: "Une randonnée",
    histoire: "Sept jours, sept refuges. Remboursé à sa demande, il repassera commande plus tard.",
    etat: "payee",
    nbPhotos: 47,
    nbPages: 30,
    palier: "p40",
    depuis: 12,
    ouvertIlYA: 5,
    paye: true,
    rembourse: true,
  },
  {
    token: T("demoC"),
    titre: "Nos dimanches",
    prenom: "Fatou",
    email: "fatou.sarr@example.com",
    telephone: "06 30 40 50 60",
    occasion: "Une année",
    histoire: "Un an de dimanches au parc, avec les mêmes trois enfants qui grandissent.",
    etat: "livree",
    nbPhotos: 66,
    nbPages: 40,
    palier: "p45",
    depuis: 120,
    ouvertIlYA: 41,
    paye: true,
  },
];

const H = 3_600_000;
const J = 86_400_000;

function ligneDe(g: Graine, maintenant: Date): { ligne: LigneDossier; urgence: ReturnType<typeof urgencePour> } {
  const etatMajLe = new Date(maintenant.getTime() - g.depuis * H).toISOString();
  const createdAt = new Date(maintenant.getTime() - g.ouvertIlYA * J).toISOString();
  const depot: EtapeDepot =
    g.etat === "photos_recues" ? etapeDepot(g.depotAbandonne ? null : true, g.nbPhotos) : "termine";
  const urgence = urgencePour(g.etat, etatMajLe, maintenant, { depot });

  return {
    urgence,
    ligne: {
      numeroId: g.token,
      token: g.token,
      titre: g.titre === "Sans titre" ? null : g.titre,
      prenom: g.prenom,
      email: g.email,
      etat: g.etat,
      etape: ETAPE_ETAT[g.etat],
      libelleEtat: LIBELLE_ETAT[g.etat],
      nbPhotos: g.nbPhotos,
      nbPages: g.nbPages,
      euros: eurosPour(g.palier),
      createdAt,
      etatMajLe,
      urgence: {
        pile: urgence.pile,
        libelle: urgence.libelle,
        promesse: urgence.promesse,
        enRetard: urgence.pile === "retard",
        age: urgence.age,
      },
      depot,
      paye: Boolean(g.paye),
      rembourse: Boolean(g.rembourse),
      /* En démonstration, « nouveau » = arrivé dans les deux derniers jours
         et jamais ouvert : on veut voir le badge, pas simuler une table. */
      nouveau: depot === "termine" && g.ouvertIlYA <= 2,
      actions: actionsDepuis(g.etat).map((a) => ({
        cle: a.cle,
        libelle: a.libelle,
        explication: a.explication,
        vers: a.vers,
        /* La démonstration montre le cas nominal : tous les templates posés,
           et le mail de l'état d'arrivée sur le point de partir. */
        mail: MAIL_A_L_ARRIVEE[a.vers] ? { code: MAIL_A_L_ARRIVEE[a.vers]!, absent: false } : null,
        note: a.note,
      })),
    },
  };
}

export function listeDemo(qui: string): VueListe {
  const maintenant = new Date();
  const evaluees = GRAINES.map((g) => ligneDe(g, maintenant));
  evaluees.sort((a, b) => comparerUrgence(a.urgence, b.urgence));

  /* Un fil d'activité fabriqué : sans lui, la démonstration montrerait un
     encart vide là où, en vrai, se lit la journée de l'atelier. */
  const ilYA = (h: number) => new Date(maintenant.getTime() - h * 3_600_000).toISOString();
  const activite: VueListe["activite"] = [
    { t: T("demo1"), titre: "Notre été à Séville", h: 2, type: "etat_change", p: { vers: "payee", euros: 40 } },
    { t: T("demo1"), titre: "Notre été à Séville", h: 2, type: "mail_envoye", p: { code: "M4" } },
    { t: T("demo4"), titre: "Le mariage de Léa et Sam", h: 6, type: "mail_envoye", p: { code: "M3" } },
    {
      t: T("demo4"),
      titre: "Le mariage de Léa et Sam",
      h: 6,
      type: "etat_change",
      p: { vers: "apercu_pret", par: "Mathias", nbPages: 44, euros: 45 },
    },
    { t: T("demo9"), titre: "Marseille, encore", h: 20, type: "etat_change", p: { vers: "photos_insuffisantes", par: "Louis" } },
    { t: T("demo3"), titre: "La maison de Kerlouan", h: 14, type: "consentements", p: { consent_photos: true } },
    { t: T("demo8"), titre: "Le dernier été de Gribouille", h: 34, type: "etat_change", p: { vers: "expediee", par: "Louis", transporteur: "Colissimo" } },
  ].map((e, i) => ({
    id: `act-${i}`,
    token: e.t,
    titre: e.titre,
    createdAt: ilYA(e.h),
    recit: raconter(e.type, e.p as Record<string, unknown>),
  }));
  return {
    lignes: evaluees.map((e) => e.ligne),
    compteurs: compter(evaluees.map((e) => e.urgence)),
    colonnes: COLONNES,
    activite,
    flux: {
      demandesAujourdhui: evaluees.filter((e) => e.ligne.nouveau).length,
      demandesSemaine: GRAINES.filter((g) => g.nbPhotos > 0 && g.ouvertIlYA <= 7).length,
      sansDepot: evaluees.filter((e) => e.ligne.depot !== "termine").length,
      nouveaux: evaluees.filter((e) => e.ligne.nouveau).length,
      parJour: Array.from({ length: 14 }, (_, i) => {
        const jours = 13 - i;
        const d = new Date(maintenant.getTime() - jours * 86_400_000);
        return {
          date: d.toISOString().slice(0, 10),
          demandes: GRAINES.filter((g) => g.nbPhotos > 0 && g.ouvertIlYA === jours).length,
        };
      }),
      marqueurAbsent: false,
    },
    fetchedAt: maintenant.toISOString(),
    qui,
    demo: true,
  };
}

/* Des photos qui existent réellement dans /public : une grille de cadres gris
   ne dirait rien de ce que sera l'écran un lundi matin. */
const PHOTOS = [
  "/images/anxiete/grid-01.webp",
  "/images/anxiete/grid-02.webp",
  "/images/anxiete/grid-03.webp",
  "/images/anxiete/grid-04.webp",
  "/images/anxiete/grid-05.webp",
  "/images/anxiete/grid-06.webp",
  "/images/anxiete/float-01.webp",
  "/images/anxiete/float-02.webp",
  "/images/anxiete/float-03.webp",
  "/images/anxiete/float-04.webp",
  "/images/hero/hero-01.webp",
  "/images/hero/hero-03.webp",
];

export function ficheDemo(token: string, maintenant = new Date()): Fiche | null {
  const g = GRAINES.find((x) => x.token === token);
  if (!g) return null;

  const { ligne } = ligneDe(g, maintenant);
  const publie = !["photos_recues", "photos_insuffisantes"].includes(g.etat);
  const il = (h: number) => new Date(maintenant.getTime() - h * H).toISOString();

  /* Le journal, reconstitué à l'envers depuis l'état courant : c'est ce qui
     rend la démonstration crédible, un dossier sans histoire ne ressemble à
     rien. */
  const journal: Array<{ type: string; payload: Record<string, unknown>; h: number }> = [
    { type: "numero_cree", payload: { occasion: g.occasion }, h: g.ouvertIlYA * 24 },
  ];
  if (g.nbPhotos > 0) {
    journal.push({ type: "consentements", payload: { consent_photos: true }, h: g.ouvertIlYA * 24 - 2 });
    journal.push({ type: "mail_envoye", payload: { code: "M1" }, h: g.ouvertIlYA * 24 - 2 });
  }
  if (publie) {
    journal.push({
      type: "etat_change",
      payload: { de: "photos_recues", vers: "apercu_pret", par: "Mathias", nbPages: g.nbPages, euros: eurosPour(g.palier) },
      h: g.depuis + 48,
    });
    journal.push({ type: "mail_envoye", payload: { code: "M3" }, h: g.depuis + 48 });
  }
  if (g.paye) {
    journal.push({ type: "etat_change", payload: { de: "apercu_pret", vers: "payee", par: "Stripe" }, h: g.depuis + 24 });
    journal.push({ type: "mail_envoye", payload: { code: "M4" }, h: g.depuis + 24 });
  }
  if (g.rembourse) {
    journal.push({ type: "remboursement", payload: { montant: eurosPour(g.palier) }, h: g.depuis + 2 });
  }
  /* L'état courant, SAUF s'il vient déjà d'être poussé au-dessus : pour un
     dossier « payée », la boucle produisait deux « Paiement reçu » à la
     suite, ce qui donnait à la démonstration l'air d'un bug du journal. */
  if (!journal.some((e) => e.payload?.vers === g.etat)) {
    journal.push({ type: "etat_change", payload: { vers: g.etat, par: "Mathias" }, h: g.depuis });
  }

  /* `h` = « il y a tant d'heures », donc le plus PETIT h est le plus récent.
     La vraie requête trie `created_at` décroissant : la démo doit lire dans
     le même sens, sinon on met au point sur un ordre qui n'existe pas. */
  const evenementsVus = journal
    .sort((a, b) => a.h - b.h)
    .map((e, i) => ({
      id: `ev-${i}`,
      type: e.type,
      payload: e.payload,
      createdAt: il(Math.max(e.h, 0)),
      recit: raconter(e.type, e.payload),
    }));

  return {
    ligne,
    parcours: construireParcours(g.etat, evenementsVus),
    occasion: g.occasion,
    histoire: g.histoire || null,
    telephone: g.telephone || null,
    consentPhotos: !g.depotAbandonne && g.nbPhotos > 0,
    consentCommunication: g.nbPhotos > 40,
    cgvOk: Boolean(g.paye),
    cgvOkAt: g.paye ? il(g.depuis + 25) : null,
    renonciation: Boolean(g.paye),
    renonciationAt: g.paye ? il(g.depuis + 25) : null,
    palier: g.palier,
    canvaUrl: ["maquette_prete", "validee", "en_production", "expediee", "livree"].includes(g.etat)
      ? "https://www.canva.com/design/DEMO/view?mode=comment"
      : null,
    canvaTravail: publie ? "https://www.canva.com/design/DEMO/edit" : null,
    maquettePdfUrl: null,
    transporteur: ["expediee", "livree"].includes(g.etat) ? "Colissimo" : null,
    trackingUrl: ["expediee", "livree"].includes(g.etat) ? "https://www.laposte.fr/outils/suivre-vos-envois" : null,
    apercu: publie
      ? { c1: PHOTOS[0], c4: PHOTOS[1], double: PHOTOS[2] }
      : { c1: null, c4: null, double: null },
    apercuBrut: publie ? { c1: PHOTOS[0], c4: PHOTOS[1], double: PHOTOS[2] } : { c1: null, c4: null, double: null },
    adresse: g.paye
      ? {
          nom: `${g.prenom} ${g.email.split("@")[0].split(".")[1] ?? ""}`.trim(),
          ligne1: g.dom ? "12 rue des Filaos" : "8 rue de la Grange aux Belles",
          ligne2: null,
          codePostal: g.dom ? "97400" : "75010",
          ville: g.dom ? "Saint-Denis" : "Paris",
          pays: "FR",
          dom: Boolean(g.dom),
        }
      : null,
    stripePaymentIntent: g.paye ? "pi_3QdemoDEMO0000000000000" : null,
    photos: Array.from({ length: Math.min(g.nbPhotos, 12) }, (_, i) => ({
      id: `demo-${i}`,
      nom: `IMG_${4200 + i}.HEIC`,
      taille: 2_400_000 + i * 130_000,
      url: PHOTOS[i % PHOTOS.length],
    })),
    evenements: evenementsVus,
    mails: [
      ...(g.nbPhotos > 0 ? [{ code: "M1", templateId: 27, envoyeLe: il(g.ouvertIlYA * 24 - 2) }] : []),
      ...(publie ? [{ code: "M3", templateId: 28, envoyeLe: il(g.depuis + 48) }] : []),
      ...(g.paye ? [{ code: "M4", templateId: 29, envoyeLe: il(g.depuis + 24) }] : []),
    ],
    notes: g.histoire
      ? [
          {
            id: "note-1",
            qui: "mathias",
            prenom: "Mathias",
            texte:
              "Ton chaud, beaucoup d'intérieur. Éviter les cadres blancs, ça casse la lumière.",
            createdAt: il(g.depuis + 20),
          },
          {
            id: "note-2",
            qui: "louis",
            prenom: "Louis",
            texte: "Attention : deux enfants sur les photos, ne pas en faire disparaître un.",
            createdAt: il(g.depuis + 6),
          },
        ]
      : [],
    notesIndisponibles: false,
    client: {
      autres:
        g.token === T("demo1")
          ? [
              {
                token: T("demoC"),
                titre: "Nos dimanches",
                libelleEtat: LIBELLE_ETAT.livree,
                createdAt: il(41 * 24),
                euros: 45,
              },
            ]
          : [],
      totalPaye: g.paye ? (eurosPour(g.palier) ?? 0) + (g.token === T("demo1") ? 45 : 0) : 0,
      prevente: g.fondatrice
        ? {
            offerType: "founder",
            numeroFondateur: g.fondatrice,
            status: "confirmed",
            estAmbassadeur: true,
            pagesCredits: 15,
          }
        : null,
    },
    actions: ligne.actions,
  };
}

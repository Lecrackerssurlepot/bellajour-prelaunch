/**
 * Tout ce que le back-office de l'atelier LIT.
 *
 * Service key, donc strictement serveur : ce fichier n'est importé QUE par des
 * composants serveur (aucun "use client" dans la chaîne d'import), et il tire
 * @/lib/supabase, qui lit SUPABASE_SERVICE_KEY. Une seule règle qui ne bouge pas :
 * ce fichier ne fait AUCUNE écriture. Les écritures vivent dans
 * /api/admin/atelier/*, et nulle part ailleurs.
 *
 * Le volume est faible (quelques dizaines de dossiers) : on lit large et on
 * agrège en mémoire plutôt que d'empiler des vues SQL qu'il faudrait
 * maintenir. Le jour où ça pique, ce sera une bonne nouvelle.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import { makeSupabase } from "@/lib/supabase";
import { canonicalizeEmail } from "@/lib/email";
import { signerGet } from "@/lib/atelier/r2";
import { resoudreApercu } from "@/lib/atelier/apercu";
import { eurosPour, type PalierCle } from "@/lib/atelier/prix";
import {
  ETAPE_ETAT,
  ETATS,
  LIBELLE_ETAT,
  actionsDepuis,
  type Etat,
} from "@/lib/atelier/transitions";
import { compter, comparerUrgence, urgencePour, etapeDepot, type EtapeDepot } from "@/lib/atelier/urgence";
import { raconter } from "@/lib/atelier/recit";
import {
  codesPour,
  templateExiste,
  type Envoyes,
  type NumeroPourReleve,
} from "@/lib/atelier/mails";
import { construireParcours } from "@/lib/atelier/parcours";
import { prenomDe } from "@/lib/admin-auth";
import type {
  ActiviteVue,
  AdresseVue,
  FluxVue,
  ColonneVue,
  ClientVue,
  EvenementVue,
  Fiche,
  LigneDossier,
  MailVue,
  NoteVue,
  PhotoVue,
  VueListe,
} from "./types";

const CHAMPS_LIGNE =
  "token, titre, prenom, email, email_canonical, etat, nb_photos, nb_pages, palier, consent_photos, created_at, etat_maj_le, stripe_payment_intent, retouches_demandees_le";

type RangeeNumero = {
  id?: string;
  token: string;
  titre: string | null;
  prenom: string | null;
  email: string | null;
  email_canonical: string | null;
  etat: Etat;
  nb_photos: number | null;
  nb_pages: number | null;
  palier: PalierCle | null;
  /* Le SEUL signal serveur du dépôt terminé (cf. urgence.ts, etapeDepot). */
  consent_photos: boolean | null;
  created_at: string | null;
  etat_maj_le: string | null;
  stripe_payment_intent: string | null;
  /* T2-13 — la date du clic « j'ai noté des retouches », ou null. */
  retouches_demandees_le?: string | null;
  /* Clé du compte qui a le dossier en main, ou null. Absente tant que la
     migration 20260826 n'est pas passée (cf. lireNumeros). */
  en_charge?: string | null;
};

/**
 * Ce qui partira si on déclenche cette action, MAINTENANT, sur CE dossier.
 *
 * On ne le déclare pas : on le demande à la règle d'envoi, en projetant le
 * dossier dans son état d'arrivée. C'est la seule façon d'être d'accord avec
 * ce qui se passera réellement une seconde plus tard — une liste écrite à la
 * main mentait déjà sur trois actions sur sept.
 *
 * `etat_maj_le` est projeté à maintenant, sinon un mail conditionné à l'âge
 * de l'état (M8, trois jours après la livraison) serait annoncé comme
 * immédiat.
 */
function mailDeLAction(
  vers: Etat,
  r: RangeeNumero,
  envoyes: Envoyes,
  maintenant: Date,
): { code: string; absent: boolean } | null {
  const projete = {
    ...(r as unknown as NumeroPourReleve),
    etat: vers,
    etat_maj_le: maintenant.toISOString(),
  };
  const code = codesPour(projete, envoyes, maintenant)[0];
  return code ? { code, absent: !templateExiste(code) } : null;
}

/* Une copie de la carte des envois, sans un code — pour projeter la levée
   d'un verrou (republication après retouches) sans toucher l'original. */
function sans(envoyes: Envoyes, code: string): Envoyes {
  const copie = new Map(envoyes);
  copie.delete(code);
  return copie;
}

function versLigne(
  r: RangeeNumero,
  maintenant: Date,
  rembourse: boolean,
  nouveau = false,
  envoyes: Envoyes = new Map(),
  emailRebond = false,
): LigneDossier {
  const nbPhotos = r.nb_photos ?? 0;
  /* La question ne se pose QU'À L'ÉTAT 1 : une fois l'aperçu publié, ni le
     compteur de photos ni le consentement ne disent plus rien de l'avancement.
     Ailleurs, le dépôt est terminé par construction. */
  const depot: EtapeDepot =
    r.etat === "photos_recues" ? etapeDepot(r.consent_photos ?? null, nbPhotos) : "termine";
  /* T2-13 — la question ne se pose qu'à l'état 4 : ailleurs la colonne est
     un reliquat (elle est remise à null à la republication). */
  const retouches = r.etat === "maquette_prete" && Boolean(r.retouches_demandees_le);
  const u = urgencePour(r.etat, r.etat_maj_le, maintenant, { depot, retouches });

  return {
    numeroId: r.id ?? "",
    token: r.token,
    titre: r.titre,
    prenom: r.prenom,
    email: r.email,
    etat: r.etat,
    etape: ETAPE_ETAT[r.etat] ?? "?",
    libelleEtat: LIBELLE_ETAT[r.etat] ?? r.etat,
    nbPhotos,
    nbPages: r.nb_pages,
    euros: eurosPour(r.palier),
    createdAt: r.created_at,
    etatMajLe: r.etat_maj_le,
    urgence: {
      pile: u.pile,
      libelle: u.libelle,
      promesse: u.promesse,
      enRetard: u.pile === "retard",
      age: u.age,
    },
    depot,
    enCharge: r.en_charge ?? null,
    paye: Boolean(r.stripe_payment_intent),
    rembourse,
    emailRebond,
    nouveau,
    actions: actionsDepuis(r.etat).map((a) => ({
      cle: a.cle,
      libelle: a.libelle,
      explication: a.explication,
      vers: a.vers,
      /* T2-13 — republier après retouches lèvera le verrou M5 (la route le
         supprime avant la relève) : la projection doit le savoir, sinon
         l'écran annoncerait « aucun mail » alors que M5 repart. */
      mail: mailDeLAction(
        a.vers,
        r,
        a.cle === "publier_maquette" && retouches ? sans(envoyes, "M5") : envoyes,
        maintenant,
      ),
      note: a.note,
    })),
  };
}

/* Les neuf colonnes, dans l'ordre du parcours. Constante : elles ne
   dépendent d'aucune donnée. */
export const COLONNES: ColonneVue[] = ETATS.map((etat) => ({
  etat,
  etape: ETAPE_ETAT[etat],
  titre: LIBELLE_ETAT[etat],
}));

/**
 * Les dossiers, avec `en_charge` si la colonne existe.
 *
 * ══════════════════════════════════════════════════════════════════════════
 * POURQUOI CE REPLI PLUTÔT QU'UN SIMPLE SELECT
 *
 * `en_charge` arrive par la migration 20260826. Entre le déploiement du code
 * et le passage de la migration, il y a une fenêtre — quelques minutes, ou
 * quelques heures si personne n'est devant sa machine. Un `select` qui nomme
 * une colonne absente ne dégrade pas : PostgREST répond 42703 et la requête
 * ENTIÈRE échoue. Toute la table de travail tomberait, pas seulement le
 * sélecteur de la personne en charge.
 *
 * On tente donc avec, et on retombe sans. Une requête dans le cas normal,
 * deux seulement pendant la fenêtre. C'est le même principe que
 * `notesIndisponibles` : l'écran dit ce qui manque au lieu de mentir ou de
 * s'effondrer.
 * ══════════════════════════════════════════════════════════════════════════
 */
type RangeePhoto = {
  id: string;
  r2_key: string;
  nom_origine: string | null;
  taille: number | null;
  created_at: string | null;
  /* D7 — absente tant que la migration 20260830 n'est pas passée. */
  vignette_key?: string | null;
};

/**
 * Les photos d'un dossier, avec `vignette_key` si la colonne existe.
 *
 * Même repli que `lireNumeros()`, pour la même raison et avec un enjeu plus
 * direct : un `select` qui nomme une colonne absente échoue ENTIÈREMENT
 * (PostgREST, 42703). Sans ce repli, la fiche d'un dossier n'afficherait
 * AUCUNE photo entre le déploiement du code et le passage de la migration —
 * pas « des photos sans vignettes », zéro photo.
 *
 * Une requête dans le cas normal, deux pendant la fenêtre. Le jour où la
 * migration est acquise partout, ce repli peut disparaître ; il ne coûte
 * rien en attendant.
 */
async function lirePhotos(
  supabase: SupabaseClient,
  numeroId: string,
): Promise<{ data: RangeePhoto[] | null }> {
  const avec = await supabase
    .from("photos")
    .select("id, r2_key, nom_origine, taille, ordre, created_at, vignette_key")
    .eq("numero_id", numeroId)
    .order("ordre", { ascending: true })
    .returns<RangeePhoto[]>();

  if (!avec.error) return { data: avec.data };

  if (avec.error.code !== "42703") {
    console.error("[admin/atelier] lecture photos échouée", avec.error.code, avec.error.message);
    return { data: [] };
  }

  const sans = await supabase
    .from("photos")
    .select("id, r2_key, nom_origine, taille, ordre, created_at")
    .eq("numero_id", numeroId)
    .order("ordre", { ascending: true })
    .returns<RangeePhoto[]>();

  if (sans.error) {
    console.error("[admin/atelier] lecture photos échouée", sans.error.code, sans.error.message);
    return { data: [] };
  }
  return { data: sans.data };
}

async function lireNumeros(
  supabase: SupabaseClient,
): Promise<{ rangees: RangeeNumero[]; enChargeAbsent: boolean }> {
  const avec = await supabase
    .from("numeros")
    .select(`id, ${CHAMPS_LIGNE}, en_charge`)
    .order("etat_maj_le", { ascending: true })
    .returns<RangeeNumero[]>();

  if (!avec.error) return { rangees: avec.data ?? [], enChargeAbsent: false };

  /* 42703 = undefined_column. Toute autre erreur est une vraie panne : on la
     journalise et on rend une liste vide, comme avant. */
  if (avec.error.code !== "42703") {
    console.error("[admin/atelier] lecture liste échouée", avec.error.code, avec.error.message);
    return { rangees: [], enChargeAbsent: false };
  }

  const sans = await supabase
    .from("numeros")
    .select(`id, ${CHAMPS_LIGNE}`)
    .order("etat_maj_le", { ascending: true })
    .returns<RangeeNumero[]>();

  if (sans.error) {
    console.error("[admin/atelier] lecture liste échouée", sans.error.code, sans.error.message);
    return { rangees: [], enChargeAbsent: true };
  }
  return { rangees: sans.data ?? [], enChargeAbsent: true };
}

/* ─────────────────────────────── la liste ─────────────────────────────── */

export async function chargerListe(identite: { cle: string; prenom: string }): Promise<VueListe> {
  const supabase = makeSupabase();
  const maintenant = new Date();

  const { rangees, enChargeAbsent } = await lireNumeros(supabase);

  /* Un remboursement ne change AUCUN état, volontairement : rembourser avant
     impression et après livraison ne veulent pas dire la même chose (cf.
     paiement.ts). Conséquence : rien ne le montre nulle part. On va donc le
     chercher dans le journal, en une requête, pour l'afficher. */
  const rembourses = new Set<string>();
  /* Même raison, même forme : un rebond ne change aucun état non plus. Sans
     cette lecture, un dossier dont l'adresse est morte se présente comme
     n'importe quel autre — c'est exactement ce qui le rend coûteux. Les deux
     types partent dans LA MÊME requête : ils se lisent au même endroit, et
     doubler l'aller-retour pour une poignée de lignes serait payer deux fois
     la même latence à chaque ouverture de la table de travail. */
  const rebonds = new Set<string>();
  const ids = rangees.map((r) => r.id).filter(Boolean) as string[];
  if (ids.length) {
    const { data: remb } = await supabase
      .from("evenements")
      .select("numero_id, type")
      .in("type", ["remboursement", "email_rebond"])
      .in("numero_id", ids)
      .returns<Array<{ numero_id: string; type: string }>>();
    for (const e of remb ?? []) {
      if (e.type === "remboursement") rembourses.add(e.numero_id);
      else rebonds.add(e.numero_id);
    }
  }

  const activite = await chargerActivite(supabase, rangees);
  const { vus, marqueurAbsent } = await chargerVus(supabase, identite.cle);
  /* Ce qui est déjà parti, pour TOUS les dossiers en une requête : la règle
     d'envoi en a besoin pour dire, ligne par ligne, quel mail partirait. */
  const envoyesPar = await chargerEnvoyes(supabase, rangees.map((r) => r.id).filter(Boolean) as string[]);

  /* Une seule évaluation d'urgence par dossier : elle sert au tri, aux
     compteurs du bandeau et à l'affichage. La recalculer trois fois serait
     trois occasions de diverger. */
  const evaluees = rangees.map((r) => ({
    ligne: versLigne(
      r,
      maintenant,
      r.id ? rembourses.has(r.id) : false,
      estNouveau(r, vus, marqueurAbsent, maintenant),
      envoyesPar.get(r.id ?? "") ?? new Map(),
      r.id ? rebonds.has(r.id) : false,
    ),
    urgence: urgencePour(r.etat, r.etat_maj_le, maintenant, {
      depot:
        r.etat === "photos_recues"
          ? etapeDepot(r.consent_photos ?? null, r.nb_photos ?? 0)
          : "termine",
    }),
  }));

  evaluees.sort((a, b) => comparerUrgence(a.urgence, b.urgence));

  return {
    lignes: evaluees.map((e) => e.ligne),
    compteurs: compter(evaluees.map((e) => e.urgence)),
    colonnes: COLONNES,
    enChargeAbsent,
    activite,
    flux: mesurerFlux(evaluees.map((e) => e.ligne), rangees, maintenant, marqueurAbsent),
    fetchedAt: maintenant.toISOString(),
    qui: identite.prenom,
    quiCle: identite.cle,
  };
}

/** Les mails déjà partis, par dossier, avec leurs dates (M3b en dépend). */
async function chargerEnvoyes(
  supabase: ReturnType<typeof makeSupabase>,
  ids: string[],
): Promise<Map<string, Envoyes>> {
  const par = new Map<string, Envoyes>();
  if (!ids.length) return par;
  try {
    const { data } = await supabase
      .from("mails_envoyes")
      .select("numero_id, code, envoye_le")
      .in("numero_id", ids)
      .returns<Array<{ numero_id: string; code: string; envoye_le: string }>>();
    for (const e of data ?? []) {
      const m = par.get(e.numero_id) ?? new Map<string, string>();
      m.set(e.code, e.envoye_le);
      par.set(e.numero_id, m);
    }
  } catch (err) {
    console.error("[admin/atelier] envois illisibles", (err as Error)?.message);
  }
  return par;
}

/* ─────────────────────── le marqueur de lecture ─────────────────────── */

/** Repli quand la table n'existe pas encore : « arrivé depuis moins de 24 h ». */
const REPLI_NOUVEAU_H = 24;

/**
 * Ce que CETTE personne a déjà ouvert.
 *
 * Best-effort assumé : si la migration `dossiers_vus` n'a pas encore été
 * appliquée, la requête échoue et on le DIT (`marqueurAbsent`), au lieu de
 * rendre un ensemble vide qui ferait passer tous les dossiers pour neufs sans
 * que personne ne comprenne pourquoi.
 */
async function chargerVus(
  supabase: ReturnType<typeof makeSupabase>,
  qui: string,
): Promise<{ vus: Set<string>; marqueurAbsent: boolean }> {
  try {
    const { data, error } = await supabase
      .from("dossiers_vus")
      .select("numero_id")
      .eq("qui", qui)
      .returns<Array<{ numero_id: string }>>();

    if (error) {
      console.error("[admin/atelier] dossiers_vus indisponible", error.code, error.message);
      return { vus: new Set(), marqueurAbsent: true };
    }
    return { vus: new Set((data ?? []).map((v) => v.numero_id)), marqueurAbsent: false };
  } catch (err) {
    console.error("[admin/atelier] dossiers_vus exception", (err as Error)?.message);
    return { vus: new Set(), marqueurAbsent: true };
  }
}

/**
 * Un dossier est « nouveau » tant que la personne connectée n'a pas ouvert sa
 * fiche.
 *
 * ⚠️ Un dossier dont le dépôt n'est pas terminé n'est JAMAIS marqué nouveau :
 * il n'y a rien à y voir tant qu'elle n'a pas envoyé ses photos. Le compter
 * remplirait le badge du matin de dossiers sur lesquels il n'y a rien à faire,
 * et un compteur qu'on ne croit plus ne sert à rien.
 */
function estNouveau(
  r: RangeeNumero,
  vus: Set<string>,
  marqueurAbsent: boolean,
  maintenant: Date,
): boolean {
  if ((r.nb_photos ?? 0) === 0) return false;

  if (marqueurAbsent) {
    if (!r.created_at) return false;
    const age = (maintenant.getTime() - new Date(r.created_at).getTime()) / 3_600_000;
    return age >= 0 && age < REPLI_NOUVEAU_H;
  }

  return r.id ? !vus.has(r.id) : false;
}

/* ─────────────────────────────── le flux ─────────────────────────────── */

/* Date civile Europe/Paris : le serveur tourne en UTC, et « arrivé
   aujourd'hui » à 1 h du matin doit compter pour aujourd'hui à Lisbonne comme
   à Paris, pas pour la veille. */
const JOUR_PARIS = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Europe/Paris",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

const JOURS_FRISE = 14;

function mesurerFlux(
  lignes: LigneDossier[],
  rangees: RangeeNumero[],
  maintenant: Date,
  marqueurAbsent: boolean,
): FluxVue {
  /* Une ARRIVÉE compte le jour où le dossier a été ouvert ; une DEMANDE est
     une arrivée dont le dépôt est TERMINÉ.
     ⚠️ C'était `nb_photos > 0`, avec en commentaire « consent_photos dit la
     même chose ». Il ne dit PAS la même chose : le 25/08, un dossier de 55
     photos jamais envoyées comptait comme une demande du jour. Une cliente
     qui a fermé l'onglet avant le dernier bouton n'a rien demandé. */
  const demandes = rangees.filter((r) => r.consent_photos === true && r.created_at);

  const aujourdhui = JOUR_PARIS.format(maintenant);
  const ilYA = (jours: number) => JOUR_PARIS.format(new Date(maintenant.getTime() - jours * 86_400_000));

  const compteParJour = new Map<string, number>();
  for (const r of demandes) {
    const j = JOUR_PARIS.format(new Date(r.created_at as string));
    compteParJour.set(j, (compteParJour.get(j) ?? 0) + 1);
  }

  const parJour: FluxVue["parJour"] = [];
  for (let i = JOURS_FRISE - 1; i >= 0; i--) {
    const date = ilYA(i);
    parJour.push({ date, demandes: compteParJour.get(date) ?? 0 });
  }

  const seuilSemaine = maintenant.getTime() - 7 * 86_400_000;

  return {
    demandesAujourdhui: compteParJour.get(aujourdhui) ?? 0,
    demandesSemaine: demandes.filter((r) => new Date(r.created_at as string).getTime() >= seuilSemaine)
      .length,
    sansDepot: lignes.filter((l) => l.depot !== "termine").length,
    nouveaux: lignes.filter((l) => l.nouveau).length,
    parJour,
    marqueurAbsent,
  };
}

/**
 * Le fil d'activité de l'atelier — les deux derniers jours, tous dossiers
 * confondus.
 *
 * ⚠️ Fenêtre de 48 h et plafond à 60 lignes. Le journal grossit sans fin :
 * sans borne, cette requête deviendrait la plus lourde de la page, pour
 * afficher des événements que personne ne relit. Deux jours couvrent le
 * week-end et la question réelle — « qu'est-ce que j'ai fait, qu'est-ce qui
 * est parti ».
 *
 * Best-effort : un fil vide ne doit jamais empêcher la table de travail de
 * s'afficher.
 */
const FENETRE_ACTIVITE_H = 48;
const MAX_ACTIVITE = 60;

async function chargerActivite(
  supabase: ReturnType<typeof makeSupabase>,
  rangees: RangeeNumero[],
): Promise<ActiviteVue[]> {
  try {
    const depuis = new Date(Date.now() - FENETRE_ACTIVITE_H * 3_600_000).toISOString();
    const { data } = await supabase
      .from("evenements")
      .select("id, numero_id, type, payload, created_at")
      /* Même raison que sur la fiche : onze lignes d'upload noieraient la
         journée de l'atelier. */
      .neq("type", "photos_confirmees")
      .gte("created_at", depuis)
      .order("created_at", { ascending: false })
      .limit(MAX_ACTIVITE)
      .returns<
        Array<{
          id: string;
          numero_id: string;
          type: string;
          payload: Record<string, unknown>;
          created_at: string;
        }>
      >();

    const parId = new Map(rangees.filter((r) => r.id).map((r) => [r.id as string, r]));

    return (data ?? [])
      /* Un événement dont le dossier a disparu (suppression en cascade) n'a
         plus de titre ni de lien : il ne raconte plus rien. */
      .filter((e) => parId.has(e.numero_id))
      .map((e) => {
        const n = parId.get(e.numero_id)!;
        return {
          id: e.id,
          token: n.token,
          titre: n.titre,
          createdAt: e.created_at,
          recit: raconter(e.type, e.payload ?? {}),
        };
      });
  } catch (err) {
    console.error("[admin/atelier] fil d'activité indisponible", (err as Error)?.message);
    return [];
  }
}

/* ─────────────────────────────── la fiche ─────────────────────────────── */

/** Les DOM passent chez Stripe pour de la France (cf. prix.ts). Ici, on le voit. */
function estDom(codePostal: string | null): boolean {
  return Boolean(codePostal && /^9[78]/.test(codePostal.trim()));
}

function versAdresse(brut: unknown): AdresseVue | null {
  if (!brut || typeof brut !== "object") return null;
  const o = brut as Record<string, unknown>;
  /* Stripe renvoie soit { name, address: {...} }, soit l'adresse à plat selon
     l'endroit d'où on la recopie. On accepte les deux plutôt que d'imposer
     une forme à un objet qu'on ne fabrique pas. */
  const a = (o.address && typeof o.address === "object" ? o.address : o) as Record<string, unknown>;
  const s = (v: unknown) => (typeof v === "string" && v.trim() ? v.trim() : null);
  const codePostal = s(a.postal_code) ?? s(a.code_postal);
  return {
    nom: s(o.name) ?? s(o.nom),
    ligne1: s(a.line1) ?? s(a.ligne1),
    ligne2: s(a.line2) ?? s(a.ligne2),
    codePostal,
    ville: s(a.city) ?? s(a.ville),
    pays: s(a.country) ?? s(a.pays),
    dom: estDom(codePostal),
  };
}

/**
 * « Cette personne a ouvert ce dossier. »
 *
 * SEULE ÉCRITURE de tout ce fichier, et elle ne touche à aucune donnée
 * métier : c'est une marque de lecture, pas un état. Best-effort strict — un
 * marqueur perdu fait réapparaître un badge, jamais plus.
 *
 * `upsert` plutôt qu'`insert` : rouvrir un dossier rafraîchit la date au lieu
 * de renvoyer un doublon (23505) qu'il faudrait rattraper.
 */
export async function marquerVu(qui: string, numeroId: string): Promise<void> {
  try {
    const supabase = makeSupabase();
    const { error } = await supabase
      .from("dossiers_vus")
      .upsert({ qui, numero_id: numeroId, vu_le: new Date().toISOString() }, { onConflict: "qui,numero_id" });
    if (error) console.error("[admin/atelier] marquage vu échoué", error.code, error.message);
  } catch (err) {
    console.error("[admin/atelier] marquage vu exception", (err as Error)?.message);
  }
}

export async function chargerFiche(token: string): Promise<Fiche | null> {
  const supabase = makeSupabase();
  const maintenant = new Date();

  const { data: n } = await supabase
    .from("numeros")
    .select("*")
    .eq("token", token)
    .maybeSingle<Record<string, unknown>>();

  if (!n) return null;

  const id = String(n.id);
  const rangee = n as unknown as RangeeNumero;

  const [{ data: photos }, { data: evenements }, { data: mails }, notesLues] = await Promise.all([
    lirePhotos(supabase, id),
    supabase
      .from("evenements")
      .select("id, type, payload, created_at")
      .eq("numero_id", id)
      .order("created_at", { ascending: false })
      .limit(200)
      .returns<Array<{ id: string; type: string; payload: Record<string, unknown>; created_at: string }>>(),
    supabase
      .from("mails_envoyes")
      .select("code, template_id, envoye_le")
      .eq("numero_id", id)
      .order("envoye_le", { ascending: false })
      .returns<Array<{ code: string; template_id: number | null; envoye_le: string }>>(),
    chargerNotes(supabase, id),
  ]);

  const rembourse = (evenements ?? []).some((e) => e.type === "remboursement");
  const emailRebond = (evenements ?? []).some((e) => e.type === "email_rebond");

  /* Les vignettes. Une URL signée par photo, en parallèle : sur 80 photos,
     en série, l'ouverture de la fiche prendrait plusieurs secondes. Une
     signature qui échoue rend `null` et laisse un cadre vide — jamais une
     fiche en erreur.

     D7 — DEUX signatures par photo quand la vignette existe : l'original pour
     la loupe et le téléchargement, la vignette de 320 px pour la grille. Le
     coût est une signature de plus, calculée en local, sans appel réseau. Le
     gain est de servir ~20 Ko au lieu de plusieurs Mo dans une case de 84 px,
     sur l'écran que l'atelier laisse ouvert toute la journée. */
  const photosVues: PhotoVue[] = await Promise.all(
    (photos ?? []).map(async (p) => ({
      id: p.id,
      nom: p.nom_origine,
      taille: p.taille,
      ajouteLe: p.created_at,
      url: await signerGet(p.r2_key).catch(() => null),
      urlVignette: p.vignette_key
        ? await signerGet(p.vignette_key).catch(() => null)
        : null,
    })),
  );

  /* ── T2-5 : où finit le PREMIER dépôt ─────────────────────────────
     L'événement `consentements` avec consent_photos=true est LE moment où
     elle a cliqué « Envoyer à l'atelier » : toute photo arrivée APRÈS est
     un ajout (reprise 1b, complément). Requête dédiée plutôt que la liste
     d'affichage — celle-ci est triée desc et plafonnée à 200, un vieux
     dossier bavard aurait pu faire sortir l'événement de la fenêtre. */
  const { data: finsDepot } = await supabase
    .from("evenements")
    .select("payload, created_at")
    .eq("numero_id", id)
    .eq("type", "consentements")
    .order("created_at", { ascending: true })
    .limit(20)
    .returns<Array<{ payload: Record<string, unknown>; created_at: string }>>();
  const depotInitialJusqua =
    (finsDepot ?? []).find((e) => e.payload?.consent_photos === true)?.created_at ?? null;

  /* ── T-021 : le code fondatrice, s'il a déjà été frappé ───────────
     Même raison que `finsDepot` pour la requête dédiée : la liste
     d'affichage est triée desc et plafonnée à 200, un vieux dossier
     bavard pourrait faire sortir l'événement de la fenêtre — et un code
     « oublié » ferait recréer un second crédit de 30 €. */
  const { data: codesFondatrice } = await supabase
    .from("evenements")
    .select("payload, created_at")
    .eq("numero_id", id)
    .eq("type", "code_fondatrice_cree")
    .order("created_at", { ascending: true })
    .limit(1)
    .returns<Array<{ payload: Record<string, unknown>; created_at: string }>>();
  const brutCode = codesFondatrice?.[0];
  const codeFondatrice =
    brutCode && typeof brutCode.payload?.code === "string"
      ? { code: brutCode.payload.code, creeLe: brutCode.created_at }
      : null;

  const apercu = await resoudreApercu(n.apercu_urls);
  const brut = (n.apercu_urls && typeof n.apercu_urls === "object" ? n.apercu_urls : {}) as Record<string, string>;

  /* ── ce qui n'est PAS du récit ────────────────────────────────────
     `photos_confirmees` est écrit à chaque lot d'envoi : 41 photos en
     produisent onze lignes identiques, qui noient les quatre événements qui
     racontent vraiment le dossier. C'est une trace d'upload, précieuse pour
     déboguer une photo manquante, illisible dans une histoire.

     On la RETIRE de l'affichage, on ne la supprime pas de la table : le jour
     où une photo manque, c'est elle qu'on ira lire. Le nombre de photos, lui,
     est déjà écrit en toutes lettres au-dessus. */
  const HORS_RECIT = new Set(["photos_confirmees"]);

  const evenementsVus: EvenementVue[] = (evenements ?? []).filter((e) => !HORS_RECIT.has(e.type)).map((e) => ({
    id: e.id,
    type: e.type,
    payload: e.payload ?? {},
    createdAt: e.created_at,
    recit: raconter(e.type, e.payload ?? {}),
  }));

  return {
    ligne: versLigne(rangee, maintenant, rembourse, false, new Map(), emailRebond),
    parcours: construireParcours(rangee.etat, evenementsVus),
    occasion: (n.occasion as string) ?? null,
    histoire: (n.histoire as string) ?? null,
    telephone: (n.telephone as string) ?? null,
    consentPhotos: n.consent_photos === true,
    consentCommunication: n.consent_communication === true,
    cgvOk: n.cgv_ok === true,
    cgvOkAt: (n.cgv_ok_at as string) ?? null,
    renonciation: n.renonciation_retractation === true,
    renonciationAt: (n.renonciation_at as string) ?? null,
    palier: (n.palier as string) ?? null,
    canvaUrl: (n.canva_url as string) ?? null,
    canvaTravail: (n.canva_travail as string) ?? null,
    maquettePdfUrl: (n.maquette_pdf_url as string) ?? null,
    /* La colonne `impression_fichiers` (migration 20260827) arrive d'elle-même
       avec le select("*") ; avant la migration, les trois champs sont null. */
    impressionFichiers: (() => {
      const brut = (n.impression_fichiers && typeof n.impression_fichiers === "object"
        ? n.impression_fichiers
        : {}) as Record<string, unknown>;
      const cle = (k: string) => (typeof brut[k] === "string" ? (brut[k] as string) : null);
      return { product: cle("product"), cover: cle("cover"), book: cle("book") };
    })(),
    /* Les mêmes PDF, signés pour l'écran (1 h, comme les photos) : une
       signature qui échoue rend null et laisse le lien absent — jamais une
       fiche en erreur. */
    impressionUrls: await (async () => {
      const brut = (n.impression_fichiers && typeof n.impression_fichiers === "object"
        ? n.impression_fichiers
        : {}) as Record<string, unknown>;
      const url = async (k: string) =>
        typeof brut[k] === "string" ? await signerGet(brut[k] as string).catch(() => null) : null;
      return { product: await url("product"), cover: await url("cover"), book: await url("book") };
    })(),
    cloudprinterOrderId: (n.cloudprinter_order_id as string) ?? null,
    transporteur: (n.transporteur as string) ?? null,
    trackingUrl: (n.tracking_url as string) ?? null,
    /* Le NUMÉRO de suivi (migration 20260829) : il arrive avec le select("*")
       et vaut null tant que la migration n'est pas passée. */
    trackingCode: (n.tracking_code as string) ?? null,
    retouchesLe: (n.retouches_demandees_le as string) ?? null,
    depotInitialJusqua,
    apercu,
    apercuBrut: {
      plat: brut.plat ?? null,
      c1: brut.c1 ?? null,
      c4: brut.c4 ?? null,
      double: brut.double ?? null,
    },
    adresse: versAdresse(n.adresse_livraison),
    stripePaymentIntent: (n.stripe_payment_intent as string) ?? null,
    photos: photosVues,
    evenements: evenementsVus,
    mails: (mails ?? []).map(
      (m): MailVue => ({ code: m.code, templateId: m.template_id, envoyeLe: m.envoye_le }),
    ),
    notes: notesLues.notes,
    notesIndisponibles: notesLues.indisponible,
    codeFondatrice,
    /* `select("*")` : la colonne arrive d'elle-même quand elle existe. */
    enChargeAbsent: !("en_charge" in n),
    client: await chargerClient(rangee),
    /* Les mêmes que sur la ligne : une seule source, pas deux listes à
       garder d'accord. */
    actions: versLigne(
      rangee,
      maintenant,
      rembourse,
      false,
      new Map((mails ?? []).map((m) => [m.code, m.envoye_le])),
    ).actions,
  };
}

/**
 * Le carnet de l'éditeur pour ce dossier.
 *
 * Dégrade au lieu de tomber : tant que la migration `notes` n'est pas passée,
 * la requête échoue, la fiche s'affiche quand même et le bloc DIT pourquoi il
 * est vide. Une carte silencieusement vide ferait croire qu'on n'a rien écrit.
 */
async function chargerNotes(
  supabase: ReturnType<typeof makeSupabase>,
  numeroId: string,
): Promise<{ notes: NoteVue[]; indisponible: boolean }> {
  try {
    const { data, error } = await supabase
      .from("notes")
      .select("id, qui, texte, created_at")
      .eq("numero_id", numeroId)
      .order("created_at", { ascending: false })
      .returns<Array<{ id: string; qui: string; texte: string; created_at: string }>>();

    if (error) {
      console.error("[admin/atelier] notes indisponibles", error.code, error.message);
      return { notes: [], indisponible: true };
    }
    return {
      notes: (data ?? []).map((n) => ({
        id: n.id,
        qui: n.qui,
        prenom: prenomDe(n.qui),
        texte: n.texte,
        createdAt: n.created_at,
      })),
      indisponible: false,
    };
  } catch (err) {
    console.error("[admin/atelier] notes exception", (err as Error)?.message);
    return { notes: [], indisponible: true };
  }
}

/* ────────────────────────────── la cliente ────────────────────────────── */

/**
 * Qui est-elle, au-delà de ce dossier.
 *
 * ⚠️ SEUL ENDROIT DU BACK-OFFICE DE L'ATELIER QUI LIT LA PRÉVENTE, et
 * uniquement en lecture. La raison est contractuelle : les CGV v3.0 art. 5
 * bis accordent 30 EUR de crédit aux fondateurs, « après vérification
 * manuelle » de `waitlist`. Sans cette ligne à l'écran, la vérification se
 * fait en SQL à chaque commande, et un jour on l'oublie.
 *
 * Aucune écriture, jamais. Un échec de lecture rend `null` : la fiche
 * s'affiche sans le bloc, elle ne tombe pas.
 */
async function chargerClient(r: RangeeNumero): Promise<ClientVue> {
  const supabase = makeSupabase();
  const canonique = r.email_canonical ?? (r.email ? canonicalizeEmail(r.email) : null);
  const vide: ClientVue = { autres: [], totalPaye: 0, prevente: null };
  if (!canonique) return vide;

  try {
    const [{ data: autres }, { data: wl }] = await Promise.all([
      supabase
        .from("numeros")
        .select("token, titre, etat, created_at, palier, stripe_payment_intent")
        .eq("email_canonical", canonique)
        .neq("token", r.token)
        .order("created_at", { ascending: false })
        .returns<
          Array<{
            token: string;
            titre: string | null;
            etat: Etat;
            created_at: string | null;
            palier: PalierCle | null;
            stripe_payment_intent: string | null;
          }>
        >(),
      supabase
        .from("waitlist")
        .select("email, offer_type, numero_fondateur, status, is_ambassadeur")
        .eq("email_canonical", canonique)
        .maybeSingle<{
          email: string;
          offer_type: string | null;
          numero_fondateur: number | null;
          status: string | null;
          is_ambassadeur: boolean | null;
        }>(),
    ]);

    let pagesCredits = 0;
    if (wl?.email) {
      const { data: credits } = await supabase
        .from("pages_credits")
        .select("montant, status")
        .eq("email", wl.email)
        .returns<Array<{ montant: number | null; status: string | null }>>();
      pagesCredits = (credits ?? [])
        .filter((c) => c.status === "confirmed")
        .reduce((s, c) => s + (c.montant ?? 0), 0);
    }

    const lignesAutres = (autres ?? []).map((a) => ({
      token: a.token,
      titre: a.titre,
      libelleEtat: LIBELLE_ETAT[a.etat] ?? a.etat,
      createdAt: a.created_at,
      euros: eurosPour(a.palier),
    }));

    /* Le total déjà encaissé : uniquement les numéros réellement payés. Un
       aperçu publié n'est pas un chiffre d'affaires. */
    const totalPaye = (autres ?? [])
      .filter((a) => a.stripe_payment_intent)
      .reduce((s, a) => s + (eurosPour(a.palier) ?? 0), 0)
      + (r.stripe_payment_intent ? (eurosPour(r.palier) ?? 0) : 0);

    return {
      autres: lignesAutres,
      totalPaye,
      prevente: wl
        ? {
            offerType: wl.offer_type,
            numeroFondateur: wl.numero_fondateur,
            status: wl.status,
            estAmbassadeur: wl.is_ambassadeur === true,
            pagesCredits,
          }
        : null,
    };
  } catch (err) {
    console.error("[admin/atelier] fiche cliente incomplète", (err as Error)?.message);
    return vide;
  }
}

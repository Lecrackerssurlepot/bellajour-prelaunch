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

import { makeSupabase } from "@/lib/supabase";
import { canonicalizeEmail } from "@/lib/email";
import { signerGet } from "@/lib/atelier/r2";
import { resoudreApercu } from "@/lib/atelier/apercu";
import { eurosPour, type PalierCle } from "@/lib/atelier/prix";
import {
  ETAPE_ETAT,
  LIBELLE_ETAT,
  actionsDepuis,
  type Etat,
} from "@/lib/atelier/transitions";
import { compter, comparerUrgence, urgencePour } from "@/lib/atelier/urgence";
import type {
  AdresseVue,
  ClientVue,
  EvenementVue,
  Fiche,
  LigneDossier,
  MailVue,
  PhotoVue,
  VueListe,
} from "./types";

const CHAMPS_LIGNE =
  "token, titre, prenom, email, email_canonical, etat, nb_photos, nb_pages, palier, created_at, etat_maj_le, stripe_payment_intent";

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
  created_at: string | null;
  etat_maj_le: string | null;
  stripe_payment_intent: string | null;
};

function versLigne(r: RangeeNumero, maintenant: Date, rembourse: boolean): LigneDossier {
  const nbPhotos = r.nb_photos ?? 0;
  /* « Sans photos » ne veut PAS dire « nb_photos = 0 » à tous les états : une
     fois l'aperçu publié, le compteur n'a plus de sens comme signal. Le cas
     visé est précis — questionnaire rempli, dépôt jamais terminé. */
  const sansPhotos = r.etat === "photos_recues" && nbPhotos === 0;
  const u = urgencePour(r.etat, r.etat_maj_le, maintenant, { sansPhotos });

  return {
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
    sansPhotos,
    paye: Boolean(r.stripe_payment_intent),
    rembourse,
    actions: actionsDepuis(r.etat).map((a) => ({
      cle: a.cle,
      libelle: a.libelle,
      explication: a.explication,
      vers: a.vers,
      mail: a.mail,
    })),
  };
}

/* ─────────────────────────────── la liste ─────────────────────────────── */

export async function chargerListe(qui: string): Promise<VueListe> {
  const supabase = makeSupabase();
  const maintenant = new Date();

  const { data, error } = await supabase
    .from("numeros")
    .select(`id, ${CHAMPS_LIGNE}`)
    .order("etat_maj_le", { ascending: true })
    .returns<RangeeNumero[]>();

  if (error) {
    console.error("[admin/atelier] lecture liste échouée", error.code, error.message);
  }
  const rangees = data ?? [];

  /* Un remboursement ne change AUCUN état, volontairement : rembourser avant
     impression et après livraison ne veulent pas dire la même chose (cf.
     paiement.ts). Conséquence : rien ne le montre nulle part. On va donc le
     chercher dans le journal, en une requête, pour l'afficher. */
  const rembourses = new Set<string>();
  const ids = rangees.map((r) => r.id).filter(Boolean) as string[];
  if (ids.length) {
    const { data: remb } = await supabase
      .from("evenements")
      .select("numero_id")
      .eq("type", "remboursement")
      .in("numero_id", ids)
      .returns<Array<{ numero_id: string }>>();
    for (const e of remb ?? []) rembourses.add(e.numero_id);
  }

  /* Une seule évaluation d'urgence par dossier : elle sert au tri, aux
     compteurs du bandeau et à l'affichage. La recalculer trois fois serait
     trois occasions de diverger. */
  const evaluees = rangees.map((r) => ({
    ligne: versLigne(r, maintenant, r.id ? rembourses.has(r.id) : false),
    urgence: urgencePour(r.etat, r.etat_maj_le, maintenant, {
      sansPhotos: r.etat === "photos_recues" && (r.nb_photos ?? 0) === 0,
    }),
  }));

  evaluees.sort((a, b) => comparerUrgence(a.urgence, b.urgence));

  return {
    lignes: evaluees.map((e) => e.ligne),
    compteurs: compter(evaluees.map((e) => e.urgence)),
    fetchedAt: maintenant.toISOString(),
    qui,
  };
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

  const [{ data: photos }, { data: evenements }, { data: mails }] = await Promise.all([
    supabase
      .from("photos")
      .select("id, r2_key, nom_origine, taille, ordre")
      .eq("numero_id", id)
      .order("ordre", { ascending: true })
      .returns<Array<{ id: string; r2_key: string; nom_origine: string | null; taille: number | null }>>(),
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
  ]);

  const rembourse = (evenements ?? []).some((e) => e.type === "remboursement");

  /* Les vignettes. Une URL signée par photo, en parallèle : sur 80 photos,
     en série, l'ouverture de la fiche prendrait plusieurs secondes. Une
     signature qui échoue rend `null` et laisse un cadre vide — jamais une
     fiche en erreur. */
  const photosVues: PhotoVue[] = await Promise.all(
    (photos ?? []).map(async (p) => ({
      id: p.id,
      nom: p.nom_origine,
      taille: p.taille,
      url: await signerGet(p.r2_key).catch(() => null),
    })),
  );

  const apercu = await resoudreApercu(n.apercu_urls);
  const brut = (n.apercu_urls && typeof n.apercu_urls === "object" ? n.apercu_urls : {}) as Record<string, string>;

  return {
    ligne: versLigne(rangee, maintenant, rembourse),
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
    maquettePdfUrl: (n.maquette_pdf_url as string) ?? null,
    transporteur: (n.transporteur as string) ?? null,
    trackingUrl: (n.tracking_url as string) ?? null,
    apercu,
    apercuBrut: {
      c1: brut.c1 ?? null,
      c4: brut.c4 ?? null,
      double: brut.double ?? null,
    },
    adresse: versAdresse(n.adresse_livraison),
    stripePaymentIntent: (n.stripe_payment_intent as string) ?? null,
    photos: photosVues,
    evenements: (evenements ?? []).map(
      (e): EvenementVue => ({
        id: e.id,
        type: e.type,
        payload: e.payload ?? {},
        createdAt: e.created_at,
      }),
    ),
    mails: (mails ?? []).map(
      (m): MailVue => ({ code: m.code, templateId: m.template_id, envoyeLe: m.envoye_le }),
    ),
    client: await chargerClient(rangee),
    /* Les mêmes que sur la ligne : une seule source, pas deux listes à
       garder d'accord. */
    actions: versLigne(rangee, maintenant, rembourse).actions,
  };
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

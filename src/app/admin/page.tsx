import { makeSupabase } from "@/lib/supabase";
import { FOUNDER_CAP } from "@/lib/founder";
import AdminDashboard from "./AdminDashboard";
import "./admin.css";

/**
 * Dashboard interne Bellajour — LECTURE SEULE.
 *
 * Server component : tout le fetch se fait ici avec la SERVICE KEY (jamais exposée
 * au client). Volume faible → on récupère TOUT (waitlist + pages_credits) et on
 * agrège côté serveur, puis on passe des données pré-calculées + sérialisables au
 * composant client interactif.
 *
 * ⚠️ Pas d'auth pour l'instant (sera rebranchée plus tard via middleware + cookie).
 * Seule protection : URL non liée dans la nav, service key strictement server-side.
 *
 * ⚠️ Aucune écriture métier. Seule écriture autorisée : admin_last_seen (timestamp
 * global "dernière visite", utilisé pour badger les nouveautés).
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type WaitlistRow = {
  id: string;
  email: string;
  prenom: string | null;
  ref_code: string | null;
  referred_by: string | null;
  created_at: string | null;
  offer_type: string | null;
  status: string | null;
  numero_fondateur: number | null;
  is_ambassadeur: boolean | null;
  confirmed_at: string | null;
};

type CreditRow = {
  email: string | null;
  montant: number | null;
  niveau: number | null;
  status: string | null;
};

export type AdminInscrit = {
  id: string;
  email: string;
  prenom: string;
  status: string;
  offerType: string | null;
  numeroFondateur: number | null;
  createdAt: string | null;
  confirmedAt: string | null;
  refCode: string | null;
  referredBy: string | null;
  parrainLabel: string | null; // prénom (ou email) du parrain résolu depuis referred_by
  isAmbassadeur: boolean;
  isNew: boolean; // inscrit depuis la dernière visite
};

export type AdminAmbassadeur = {
  email: string;
  prenom: string;
  refCode: string | null;
  createdAt: string | null;
  niveau1Confirmed: number;
  niveau1Pending: number;
  niveau2Confirmed: number;
  niveau2Pending: number;
  pagesGagnees: number; // Σ montant niveau 1+2 confirmés (= dashboard public)
  pagesPending: number; // Σ montant niveau 1+2 en attente
  isNew: boolean;
};

export type AdminData = {
  kpis: {
    totalInscrits: number;
    totalClients: number;
    refunded: number;
    founderConfirmed: number;
    standardConfirmed: number;
    influencerConfirmed: number;
    founderCap: number;
    placesRestantes: number;
    totalAmbassadeurs: number;
    conversionRate: number; // clients / inscrits, en % (0 si aucun inscrit)
  };
  nouveautes: {
    inscrits: number;
    clients: number;
    ambassadeurs: number;
  };
  inscrits: AdminInscrit[];
  ambassadeurs: AdminAmbassadeur[];
  inscritsParJour: { date: string; count: number }[]; // 13 juin → aujourd'hui (jours à 0 inclus)
  lastSeen: string | null; // visite précédente (avant cette MAJ)
  fetchedAt: string;
};

/* Date "civile" Europe/Paris au format YYYY-MM-DD (bucket du graphique). */
const PARIS_DAY = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Europe/Paris",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});
const parisDay = (iso: string) => PARIS_DAY.format(new Date(iso));

/* Liste inclusive de jours (YYYY-MM-DD) de start à end. Itère en UTC pour éviter
   les surprises DST. Renvoie [] si end < start. */
function dayRange(start: string, end: string): string[] {
  const out: string[] = [];
  const [sy, sm, sd] = start.split("-").map(Number);
  const [ey, em, ed] = end.split("-").map(Number);
  let cur = Date.UTC(sy, sm - 1, sd);
  const last = Date.UTC(ey, em - 1, ed);
  while (cur <= last) {
    const d = new Date(cur);
    out.push(
      `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(
        d.getUTCDate(),
      ).padStart(2, "0")}`,
    );
    cur += 86_400_000;
  }
  return out;
}

const CHART_START = "2026-06-13"; // début prévente

export default async function AdminPage() {
  const supabase = makeSupabase();

  // 1. Lire la dernière visite AVANT de la mettre à jour (sert aux badges "nouveau").
  let prevSeen: string | null = null;
  {
    const { data } = await supabase
      .from("admin_last_seen")
      .select("last_seen_at")
      .eq("id", true)
      .maybeSingle();
    prevSeen = data?.last_seen_at ?? null;
  }
  // Edge case : table vide / ligne absente → on ne badge rien.
  // L'infini DIT cette règle, là où `Date.now()` la simulait : les trois usages
  // ci-dessous sont des comparaisons `>`, et rien n'est postérieur à l'infini.
  // Au passage, plus de lecture d'horloge pendant un rendu (react-hooks/purity)
  // ni de dépendance à une dérive entre l'heure du serveur et celle de la base.
  const prevSeenMs = prevSeen ? new Date(prevSeen).getTime() : Number.POSITIVE_INFINITY;

  // 2. Fetch tout (volume faible).
  const [{ data: waitlistData }, { data: creditsData }] = await Promise.all([
    supabase
      .from("waitlist")
      .select(
        "id, email, prenom, ref_code, referred_by, created_at, offer_type, status, numero_fondateur, is_ambassadeur, confirmed_at",
      )
      .order("created_at", { ascending: false }),
    supabase.from("pages_credits").select("email, montant, niveau, status"),
  ]);

  const waitlist = (waitlistData ?? []) as WaitlistRow[];
  const credits = (creditsData ?? []) as CreditRow[];

  // 3. KPI.
  const isConfirmed = (r: WaitlistRow) => r.status === "confirmed";
  const totalInscrits = waitlist.length;
  const confirmedRows = waitlist.filter(isConfirmed);
  const totalClients = confirmedRows.length;
  const refunded = waitlist.filter((r) => r.status === "refunded").length;
  const founderConfirmed = confirmedRows.filter((r) => r.offer_type === "founder").length;
  const standardConfirmed = confirmedRows.filter((r) => r.offer_type === "standard").length;
  const influencerConfirmed = confirmedRows.filter((r) => r.offer_type === "influencer").length;
  const totalAmbassadeurs = waitlist.filter((r) => r.is_ambassadeur === true).length;
  const placesRestantes = Math.max(0, FOUNDER_CAP - founderConfirmed);
  const conversionRate = totalInscrits > 0 ? (totalClients / totalInscrits) * 100 : 0;

  // 4. Inscrits (sérialisés + flag "nouveau" + parrain résolu).
  //    Map ref_code → personne pour résoudre referred_by en prénom/email lisible.
  const byRefCode = new Map<string, WaitlistRow>();
  for (const r of waitlist) {
    if (r.ref_code) byRefCode.set(r.ref_code, r);
  }
  const tsMs = (s: string | null) => (s ? new Date(s).getTime() : 0);
  const inscrits: AdminInscrit[] = waitlist.map((r) => {
    // Parrain : referred_by est un ref_code → on remonte à la personne. Si le
    // ref_code est introuvable (orphelin), on garde la valeur brute plutôt que de
    // la perdre. "—" (côté client) seulement si aucun referred_by.
    let parrainLabel: string | null = null;
    if (r.referred_by) {
      const p = byRefCode.get(r.referred_by);
      parrainLabel = p ? (p.prenom || "").trim() || p.email : r.referred_by;
    }
    return {
      id: r.id,
      email: r.email,
      prenom: (r.prenom || "").trim(),
      status: r.status || "waitlist",
      offerType: r.offer_type,
      numeroFondateur: r.numero_fondateur,
      createdAt: r.created_at,
      confirmedAt: r.confirmed_at,
      refCode: r.ref_code,
      referredBy: r.referred_by,
      parrainLabel,
      isAmbassadeur: r.is_ambassadeur === true,
      isNew: tsMs(r.created_at) > prevSeenMs,
    };
  });

  // 5. Ambassadeurs : agrégation des crédits niveau 1/2 par email bénéficiaire.
  //    pages_credits.email = email d'affichage (cf. referral-credits.ts), donc on
  //    indexe sur waitlist.email. Base = confirmés + en attente (deux nombres/niveau).
  type Agg = {
    n1c: number;
    n1p: number;
    n2c: number;
    n2p: number;
    pagesC: number;
    pagesP: number;
  };
  const byEmail = new Map<string, Agg>();
  for (const c of credits) {
    if (!c.email || (c.niveau !== 1 && c.niveau !== 2)) continue;
    const agg = byEmail.get(c.email) ?? { n1c: 0, n1p: 0, n2c: 0, n2p: 0, pagesC: 0, pagesP: 0 };
    const m = c.montant ?? 0;
    const confirmed = c.status === "confirmed";
    const pending = c.status === "pending";
    if (c.niveau === 1) {
      if (confirmed) agg.n1c += 1;
      else if (pending) agg.n1p += 1;
    } else {
      if (confirmed) agg.n2c += 1;
      else if (pending) agg.n2p += 1;
    }
    if (confirmed) agg.pagesC += m;
    else if (pending) agg.pagesP += m;
    byEmail.set(c.email, agg);
  }

  const ambassadeurs: AdminAmbassadeur[] = waitlist
    .filter((r) => r.is_ambassadeur === true)
    .map((r) => {
      const agg = byEmail.get(r.email) ?? { n1c: 0, n1p: 0, n2c: 0, n2p: 0, pagesC: 0, pagesP: 0 };
      return {
        email: r.email,
        prenom: (r.prenom || "").trim(),
        refCode: r.ref_code,
        createdAt: r.created_at,
        niveau1Confirmed: agg.n1c,
        niveau1Pending: agg.n1p,
        niveau2Confirmed: agg.n2c,
        niveau2Pending: agg.n2p,
        pagesGagnees: agg.pagesC,
        pagesPending: agg.pagesP,
        isNew: tsMs(r.created_at) > prevSeenMs,
      };
    })
    .sort((a, b) => b.pagesGagnees - a.pagesGagnees || b.niveau1Confirmed - a.niveau1Confirmed);

  // 6. Compteur de nouveautés depuis la dernière visite.
  const nouveautes = {
    inscrits: inscrits.filter((i) => i.isNew).length,
    clients: confirmedRows.filter((r) => tsMs(r.confirmed_at) > prevSeenMs).length,
    ambassadeurs: ambassadeurs.filter((a) => a.isNew).length,
  };

  const fetchedAt = new Date().toISOString();

  // 6b. Inscrits par jour (Europe/Paris), 13 juin → aujourd'hui, jours à 0 inclus.
  const dayCounts = new Map<string, number>();
  for (const r of waitlist) {
    if (!r.created_at) continue;
    const d = parisDay(r.created_at);
    dayCounts.set(d, (dayCounts.get(d) ?? 0) + 1);
  }
  const today = parisDay(fetchedAt);
  const inscritsParJour = dayRange(CHART_START, today).map((date) => ({
    date,
    count: dayCounts.get(date) ?? 0,
  }));

  // 7. MAJ de la dernière visite à maintenant (SEULE écriture). Best-effort : un
  //    échec ne casse pas l'affichage (au pire les badges restent au prochain tour).
  await supabase
    .from("admin_last_seen")
    .update({ last_seen_at: fetchedAt })
    .eq("id", true);

  const data: AdminData = {
    kpis: {
      totalInscrits,
      totalClients,
      refunded,
      founderConfirmed,
      standardConfirmed,
      influencerConfirmed,
      founderCap: FOUNDER_CAP,
      placesRestantes,
      totalAmbassadeurs,
      conversionRate,
    },
    nouveautes,
    inscrits,
    ambassadeurs,
    inscritsParJour,
    lastSeen: prevSeen,
    fetchedAt,
  };

  return <AdminDashboard data={data} />;
}

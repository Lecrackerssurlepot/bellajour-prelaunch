/**
 * Combien de temps Brevo met-il à remettre nos mails ?
 *
 *   npx tsx --tsconfig tsconfig.json scripts/delais-brevo.ts [--jours=30] [--seuil=60]
 *
 * ══════════════════════════════════════════════════════════════════════════
 * CE QU'IL MESURE (T-107)
 *
 * Pour chaque mail des N derniers jours (90 au plus, la rétention de Brevo),
 * l'écart entre `requests` (Brevo a accepté l'appel du site) et `delivered`
 * (le serveur du destinataire a accepté le mail). Le site n'y est pour rien :
 * `mail_envoye` est écrit à la seconde de l'appel.
 *
 * Il range les mails lents par messagerie (Gmail, Microsoft, Orange…), par
 * adresse IP de sortie de Brevo, et les regroupe en ÉPISODES : le 21/10, trois
 * mails partis entre 11:13 et 11:34 sont arrivés ensemble entre 11:39 et
 * 11:44. C'est ce regroupement, et l'IP, qui disent la cause.
 *
 * À relancer après tout changement de formule Brevo ou de fournisseur : la
 * part des mails au-delà du seuil doit tomber à zéro.
 *
 * Lecture seule : deux GET (`/smtp/statistics/events`, `/account`). Aucun
 * mail n'est envoyé, rien n'est modifié chez Brevo. Aucune adresse n'est
 * imprimée, seulement son domaine.
 * ══════════════════════════════════════════════════════════════════════════
 */

import { readFileSync } from "node:fs";

type Evenement = {
  email: string;
  date: string;
  messageId: string;
  event: string;
  subject?: string;
  tag?: string;
  ip?: string;
};

type Envoi = {
  domaine: string;
  sujet: string;
  tag: string;
  demande?: number;
  remis?: number;
  ip: string;
  types: Set<string>;
};

/* ⚠️ Les valeurs de .env.local peuvent être entre guillemets : dotenv les
   retire, un lecteur maison non. (Même lecteur que verif-mails-brevo.ts.) */
function env(nom: string): string | undefined {
  const brut = readFileSync(".env.local", "utf8");
  const m = brut.match(new RegExp(`^${nom}=(.*)$`, "m"));
  if (!m) return undefined;
  const t = m[1].trim();
  const v = t.length > 1 && (t[0] === '"' || t[0] === "'") && t.at(-1) === t[0] ? t.slice(1, -1) : t;
  return v || undefined;
}

function option(nom: string, defaut: number): number {
  const a = process.argv.find((x) => x.startsWith(`--${nom}=`));
  const n = a ? Number(a.split("=")[1]) : defaut;
  return Number.isFinite(n) && n > 0 ? n : defaut;
}

function famille(domaine: string): string {
  if (/^(gmail|googlemail)\./.test(domaine)) return "gmail";
  if (/^(hotmail|outlook|live|msn)\./.test(domaine)) return "microsoft";
  if (/^(orange|wanadoo)\./.test(domaine)) return "orange";
  if (/^(yahoo|ymail)\./.test(domaine)) return "yahoo";
  if (/^(icloud|me|mac)\./.test(domaine)) return "apple";
  return "autre";
}

const heure = (t: number) =>
  new Date(t).toLocaleString("fr-FR", {
    timeZone: "Europe/Paris",
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });

const duree = (s: number) => (s < 120 ? `${Math.round(s)} s` : s < 7200 ? `${(s / 60).toFixed(1)} min` : `${(s / 3600).toFixed(1)} h`);

async function main() {
  const cle = env("BREVO_API_KEY");
  if (!cle) throw new Error("BREVO_API_KEY absente de .env.local");
  const jours = Math.min(option("jours", 30), 90);
  const seuil = option("seuil", 60);
  const entetes = { "api-key": cle, accept: "application/json" };

  const evenements: Evenement[] = [];
  for (let offset = 0; ; offset += 2500) {
    const r = await fetch(`https://api.brevo.com/v3/smtp/statistics/events?limit=2500&offset=${offset}&days=${jours}&sort=desc`, { headers: entetes });
    if (!r.ok) throw new Error(`Brevo a répondu ${r.status} sur les événements`);
    const page = ((await r.json()) as { events?: Evenement[] }).events ?? [];
    evenements.push(...page);
    if (page.length < 2500) break;
  }

  const compte = (await (await fetch("https://api.brevo.com/v3/account", { headers: entetes })).json()) as {
    plan?: Array<{ type: string; credits: number; creditsType: string }>;
  };

  const envois = new Map<string, Envoi>();
  for (const e of evenements) {
    const x = envois.get(e.messageId) ?? { domaine: e.email.split("@")[1] ?? "?", sujet: e.subject ?? "", tag: e.tag ?? "", ip: "", types: new Set<string>() };
    const t = new Date(e.date).getTime();
    x.types.add(e.event);
    if (e.event === "requests") x.demande = Math.min(x.demande ?? Infinity, t);
    if (e.event === "delivered") {
      x.remis = Math.min(x.remis ?? Infinity, t);
      x.ip = e.ip ?? x.ip;
    }
    envois.set(e.messageId, x);
  }

  const demandes = [...envois.values()].filter((x) => x.demande !== undefined).sort((a, b) => a.demande! - b.demande!);
  const remis = demandes.filter((x) => x.remis !== undefined).map((x) => ({ ...x, delai: (x.remis! - x.demande!) / 1000 }));
  const lents = remis.filter((x) => x.delai > seuil);
  const tries = remis.map((x) => x.delai).sort((a, b) => a - b);
  const centile = (p: number) => tries[Math.min(tries.length - 1, Math.floor(p * tries.length))] ?? 0;

  console.log(`\nCompte Brevo : ${(compte.plan ?? []).map((p) => `${p.type} (${p.credits} ${p.creditsType})`).join(", ") || "illisible"}`);
  console.log(`Fenêtre : ${jours} jours · ${demandes.length} envois · ${remis.length} remis · ${demandes.length - remis.length} jamais remis (rebonds, blocages)`);
  if (!remis.length) return;
  console.log(`Délai request → delivered : médiane ${duree(centile(0.5))} · 9 sur 10 sous ${duree(centile(0.9))} · max ${duree(tries.at(-1) ?? 0)}`);
  console.log(`Au-delà de ${seuil} s : ${lents.length} sur ${remis.length} (${((100 * lents.length) / remis.length).toFixed(1)} %)`);
  const differes = evenements.filter((e) => e.event === "deferred").length;
  console.log(`Événements « deferred » : ${differes}${differes ? "" : " (le retard n'est pas un refus temporaire déclaré par Brevo)"}`);

  console.log("\nPar messagerie :");
  const parFamille = new Map<string, { n: number; lents: number }>();
  for (const x of remis) {
    const f = parFamille.get(famille(x.domaine)) ?? { n: 0, lents: 0 };
    f.n++;
    if (x.delai > seuil) f.lents++;
    parFamille.set(famille(x.domaine), f);
  }
  for (const [f, v] of [...parFamille].sort((a, b) => b[1].n - a[1].n)) console.log(`  ${f.padEnd(10)} ${String(v.n).padStart(4)} remis · ${v.lents} lents`);

  console.log("\nVers Gmail, par IP de sortie Brevo :");
  const parIp = new Map<string, { n: number; lents: number; debut: number; fin: number }>();
  for (const x of remis.filter((x) => famille(x.domaine) === "gmail")) {
    const v = parIp.get(x.ip) ?? { n: 0, lents: 0, debut: x.demande!, fin: x.demande! };
    v.n++;
    if (x.delai > seuil) v.lents++;
    v.fin = Math.max(v.fin, x.demande!);
    parIp.set(x.ip, v);
  }
  for (const [ip, v] of parIp) console.log(`  ${(ip || "?").padEnd(15)} ${String(v.n).padStart(4)} remis · ${v.lents} lents · du ${heure(v.debut)} au ${heure(v.fin)}`);

  /* Un épisode : des mails lents vers la même messagerie dont les attentes se
     chevauchent. Ce qui part pendant un épisode par une AUTRE IP passe-t-il ? */
  const episodes: Array<{ famille: string; debut: number; fin: number; mails: typeof lents }> = [];
  for (const x of lents) {
    const f = famille(x.domaine);
    const ouvert = episodes.find((e) => e.famille === f && x.demande! <= e.fin);
    if (ouvert) {
      ouvert.mails.push(x);
      ouvert.fin = Math.max(ouvert.fin, x.remis!);
    } else episodes.push({ famille: f, debut: x.demande!, fin: x.remis!, mails: [x] });
  }
  console.log(`\nÉpisodes de lenteur (${episodes.length}) :`);
  for (const e of episodes) {
    const ips = new Set(e.mails.map((m) => m.ip));
    const voisins = remis.filter((x) => famille(x.domaine) === e.famille && x.demande! >= e.debut && x.demande! <= e.fin && x.delai <= seuil);
    const voisinsAutreIp = voisins.filter((x) => !ips.has(x.ip)).length;
    console.log(
      `  ${heure(e.debut)} · ${e.famille} · ${e.mails.length} mail(s) de ${duree(Math.min(...e.mails.map((m) => m.delai)))} à ${duree(Math.max(...e.mails.map((m) => m.delai)))}` +
        ` · remis entre ${heure(Math.min(...e.mails.map((m) => m.remis!)))} et ${heure(Math.max(...e.mails.map((m) => m.remis!)))} · IP ${[...ips].join(", ")}` +
        (voisins.length ? ` · pendant ce temps ${voisins.length} autre(s) ${e.famille} passé(s) vite, dont ${voisinsAutreIp} par une autre IP` : ""),
    );
    for (const m of e.mails) console.log(`      ${heure(m.demande!)} → ${duree(m.delai).padEnd(9)} ${m.tag.padEnd(16)} ${m.sujet.slice(0, 50)}`);
  }
}

main().catch((e: unknown) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});

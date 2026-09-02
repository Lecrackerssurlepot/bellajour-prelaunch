/**
 * La page santé — le tableau de bord du tableau de bord.
 *
 * ══════════════════════════════════════════════════════════════════════════
 * ELLE RÉPOND À UNE SEULE QUESTION
 *
 * « Est-ce que tout ce qui devait partir est parti ? »
 *
 * Le reste du back-office montre le travail à faire. Celui-ci montre ce qui a
 * ÉCHOUÉ SANS BRUIT : un mail refusé par Brevo, un dossier passé en état 2
 * sans son aperçu, un template qui n'existe pas, une relève qui n'a pas
 * tourné depuis huit jours. Aucun de ces cas ne se voit dans la liste : le
 * dossier y a l'air normal, il attend simplement une cliente qui n'a jamais
 * rien reçu.
 *
 * Chaque constat porte ce qu'il faut faire. Un diagnostic sans remède se
 * relit trois fois sans rien déclencher.
 * ══════════════════════════════════════════════════════════════════════════
 */

import { makeSupabase } from "@/lib/supabase";
import {
  lireNumerosMail,
  OBJET_MAIL,
  codesPour,
  manquePour,
  templateExiste,
  type CodeMail,
  type Envoyes,
  type NumeroPourReleve,
} from "@/lib/atelier/mails";
import { LIBELLE_ETAT, type Etat } from "@/lib/atelier/transitions";
import { DELAIS, echeancePour, etapeDepot } from "@/lib/atelier/urgence";
import { ETATS_ENGAGES } from "@/lib/atelier/retention";
import type { SupabaseClient } from "@supabase/supabase-js";

export type Constat = {
  /** `rouge` = quelqu'un attend pour rien. `orange` = ça va le devenir. */
  gravite: "rouge" | "orange";
  titre: string;
  /** Ce qu'il faut faire, en une phrase. */
  remede: string;
  lignes: Array<{ token: string | null; quoi: string }>;
};

export type Sante = {
  constats: Constat[];
  /** Tout va bien : on le dit, plutôt que d'afficher une page vide. */
  toutVaBien: boolean;
  /** Combien de dossiers existent. T-024 : « rien à signaler » ne veut pas
      dire la même chose sur une base vide (« il n'y a encore rien ») et sur
      une base pleine (« tout ce qui devait partir est parti »). L'écran doit
      pouvoir dire lequel des deux, sinon le calme d'avant l'ouverture se lit
      comme une vérification qui n'a pas eu lieu. */
  nbDossiers: number;
  /** Dernier mail effectivement parti — le pouls de la relève. */
  dernierMail: string | null;
  fetchedAt: string;
};

/* Les mails que la relève peut avoir à envoyer un jour. M4 est exclu : il
   part au webhook et n'est jamais rattrapé (cf. codesPour). */
/* ⚠️ M10 (T-076) y est, et c'est sa raison d'être : sans son template, le
   préavis de fermeture ne part jamais, donc PLUS AUCUN dossier abandonné ne
   s'anonymise (preavisRespecte refuse). Une rétention qui ne retient plus
   rien, sans une erreur nulle part. Cet écran est le seul à pouvoir le dire. */
const CODES_ATTENDUS: CodeMail[] = ["M0", "M1", "M2", "M2b", "M3", "M3b", "M5", "M6", "M7", "M8", "M9", "M10"];

/* Au-delà de deux fois le délai annoncé, ce n'est plus du retard, c'est un
   dossier oublié. Le seuil est volontairement large : la page santé doit
   crier rarement pour qu'on la croie quand elle crie. */
const FACTEUR_OUBLI = 2;

type RangeeDoublon = {
  token: string;
  titre: string | null;
  email_canonical: string | null;
  etat: string;
  /* Colonne fraîche (migration 20260901, T-076) : absente pendant la fenêtre
     déploiement→migration. Optionnelle exprès, cf. le repli 42703 ci-dessous. */
  anonymise_le?: string | null;
};

/**
 * Les adresses portant PLUS D'UN dossier non payé et non anonymisé (T-084).
 *
 * On SIGNALE, on ne fusionne jamais : deux dossiers sur la même adresse sont
 * souvent légitimes — un second numéro pour un autre moment est le rachat que
 * M8 cherche. Un dossier payé (état engagé) n'entre pas dans le compte, il est
 * légitime par construction. Le rapprochement se fait sur `email_canonical`,
 * jamais sur `email` brut : les alias (`m.durand+bj@`) sont le cas où la
 * cliente se croit la même et où nous, non (cf. T-047).
 *
 * Repli 42703 sur `anonymise_le` (même raison que `donnees.ts`) : à défaut, on
 * ne filtre pas dessus. Montrer un doublon de trop ne coûte rien à un signal ;
 * en manquer un, si.
 */
async function lireDoublonsAdresse(supabase: SupabaseClient): Promise<Constat["lignes"]> {
  const CHAMPS = "token, titre, email_canonical, etat";
  const avec = await supabase
    .from("numeros")
    .select(`${CHAMPS}, anonymise_le`)
    .order("created_at", { ascending: true })
    .returns<RangeeDoublon[]>();

  let rangees: RangeeDoublon[];
  if (!avec.error) {
    rangees = avec.data ?? [];
  } else if (avec.error.code === "42703") {
    const sans = await supabase
      .from("numeros")
      .select(CHAMPS)
      .order("created_at", { ascending: true })
      .returns<RangeeDoublon[]>();
    if (sans.error) {
      console.error("[admin/atelier] lecture doublons échouée", sans.error.code, sans.error.message);
      return [];
    }
    rangees = sans.data ?? [];
  } else {
    console.error("[admin/atelier] lecture doublons échouée", avec.error.code, avec.error.message);
    return [];
  }

  const engages = new Set<string>(ETATS_ENGAGES as readonly string[]);
  const parAdresse = new Map<string, string[]>();
  for (const d of rangees) {
    if (!d.email_canonical) continue;
    if (d.anonymise_le) continue;
    if (engages.has(d.etat)) continue;
    const liste = parAdresse.get(d.email_canonical) ?? [];
    liste.push(d.titre?.trim() || "sans titre");
    parAdresse.set(d.email_canonical, liste);
  }

  const lignes: Constat["lignes"] = [];
  for (const [email, titres] of parAdresse) {
    if (titres.length < 2) continue;
    lignes.push({ token: null, quoi: `${email} — ${titres.join(", ")}` });
  }
  return lignes;
}

export async function chargerSante(): Promise<Sante> {
  const supabase = makeSupabase();
  const maintenant = new Date();
  const constats: Constat[] = [];

  /* ── 1. les templates Brevo absents ────────────────────────────────
     Se lit sans toucher la base, et c'est la panne la plus silencieuse de
     toutes : le code marche, la transition passe, et rien ne part. */
  const sansTemplate = CODES_ATTENDUS.filter((c) => !templateExiste(c));
  if (sansTemplate.length) {
    constats.push({
      gravite: "orange",
      titre: `${sansTemplate.length} mail${sansTemplate.length > 1 ? "s" : ""} sans template`,
      remede:
        "Créer le template dans Brevo, puis poser BREVO_TEMPLATE_<CODE>_ID sur Vercel. Aucun verrou n'est posé entre-temps : le mail partira dès que la variable existe.",
      lignes: sansTemplate.map((c) => ({ token: null, quoi: `${c} — « ${OBJET_MAIL[c]} »` })),
    });
  }

  const { data: dossiers } = await lireNumerosMail<NumeroPourReleve[] | null>((champs) =>
    supabase
      .from("numeros")
      .select(champs)
      .order("etat_maj_le", { ascending: true })
      .returns<NumeroPourReleve[]>(),
  );

  const lignes = dossiers ?? [];
  const ids = lignes.map((d) => d.id);

  /* ── les envois, en une requête ── */
  const envoyesPar = new Map<string, Envoyes>();
  let dernierMail: string | null = null;
  if (ids.length) {
    const { data: envois } = await supabase
      .from("mails_envoyes")
      .select("numero_id, code, envoye_le")
      .in("numero_id", ids)
      .order("envoye_le", { ascending: false })
      .returns<Array<{ numero_id: string; code: string; envoye_le: string }>>();
    for (const e of envois ?? []) {
      const m = envoyesPar.get(e.numero_id) ?? new Map<string, string>();
      m.set(e.code, e.envoye_le);
      envoyesPar.set(e.numero_id, m);
      if (!dernierMail) dernierMail = e.envoye_le;
    }
  }

  /* ── 2. les mails refusés par Brevo ────────────────────────────────
     `mail_echec` est journalisé quand l'envoi échoue ET que le verrou est
     retiré. La relève réessaie donc seule — mais si l'échec se répète, c'est
     que quelque chose ne passera jamais tout seul. */
  const echecs: Constat["lignes"] = [];
  if (ids.length) {
    const depuis = new Date(maintenant.getTime() - 7 * 86_400_000).toISOString();
    const { data: evts } = await supabase
      .from("evenements")
      .select("numero_id, payload, created_at")
      .eq("type", "mail_echec")
      .gte("created_at", depuis)
      .order("created_at", { ascending: false })
      .returns<Array<{ numero_id: string; payload: Record<string, unknown>; created_at: string }>>();

    const parToken = new Map(lignes.map((d) => [d.id, d]));
    for (const e of evts ?? []) {
      const d = parToken.get(e.numero_id);
      /* Un échec suivi d'un envoi réussi du même code est réparé : on ne le
         montre pas, sinon la page se remplit de fantômes. */
      const code = String(e.payload?.code ?? "");
      if (!d || envoyesPar.get(e.numero_id)?.has(code)) continue;
      echecs.push({
        token: d.token,
        quoi: `${code} jamais parti — ${d.titre?.trim() || "sans titre"} (${d.prenom ?? "—"})`,
      });
    }
  }
  if (echecs.length) {
    constats.push({
      gravite: "rouge",
      titre: `${echecs.length} mail${echecs.length > 1 ? "s" : ""} en échec`,
      remede:
        "Vérifier la clé Brevo et les IP autorisées, puis relancer la relève. Le verrou a été retiré : elle réessaiera seule.",
      lignes: echecs,
    });
  }

  /* ── 3. les dossiers dont un mail est dû mais impossible ───────────
     Le cas le plus coûteux : le dossier a l'air normal dans la liste, mais
     la cliente n'a rien reçu et n'a aucune raison de revenir. */
  const incomplets: Constat["lignes"] = [];
  /* Combien de mails la relève DEVRAIT envoyer à cet instant. Sert deux fois :
     ici pour ceux qui sont bloqués, et au constat nº6 pour savoir si le
     silence de la relève est suspect ou parfaitement normal. */
  let dusMaintenant = 0;
  for (const d of lignes) {
    const envoyes = envoyesPar.get(d.id) ?? new Map<string, string>();
    for (const code of codesPour(d, envoyes, maintenant)) {
      const manque = manquePour(code, d);
      /* On ne compte comme « dû » que ce que la relève pourrait RÉELLEMENT
         envoyer. Un mail bloqué faute de pagination, ou sans template Brevo,
         n'accuse pas la relève : il a déjà son propre constat au-dessus.
         Les compter ici ferait dire à la page « la relève se tait » alors
         que la relève fait exactement ce qu'on lui demande. */
      if (!manque.length && templateExiste(code)) dusMaintenant++;
      if (manque.length) {
        incomplets.push({
          token: d.token,
          quoi: `${code} bloqué — ${d.titre?.trim() || "sans titre"} : il manque ${manque.join(", ")}`,
        });
      }
    }
  }
  if (incomplets.length) {
    constats.push({
      gravite: "rouge",
      titre: `${incomplets.length} dossier${incomplets.length > 1 ? "s" : ""} attendent un mail impossible`,
      remede: "Compléter le champ manquant sur la fiche. Le mail partira à la relève suivante.",
      lignes: incomplets,
    });
  }

  /* ── 4. les dossiers oubliés ───────────────────────────────────────
     Deux fois le délai annoncé, sur un état où c'est NOUS qui devons jouer. */
  const oublies: Constat["lignes"] = [];
  for (const d of lignes) {
    const delai = DELAIS[d.etat as Etat];
    if (!delai || !d.etat_maj_le) continue;
    /* Un dépôt non terminé attend LA CLIENTE, pas nous. Le compter parmi les
       oubliés ferait crier la page pour des dossiers sur lesquels il n'y a
       rien à faire — et une page santé qui crie pour rien cesse d'être crue.
       Même règle que la table de travail.

       ⚠️ C'était `nb_photos === 0`. Un dossier de 55 photos jamais envoyées
       passait donc le filtre et se retrouvait « oublié » à 96 h, alors que la
       balle n'a jamais été dans notre camp (incident du 25/08). */
    if (d.etat === "photos_recues" && etapeDepot(d.consent_photos, d.nb_photos ?? 0) !== "termine") {
      continue;
    }
    const echeance = echeancePour(d.etat as Etat, d.etat_maj_le);
    if (!echeance) continue;
    const depasse = maintenant.getTime() - echeance.getTime();
    const budget = echeance.getTime() - Date.parse(d.etat_maj_le);
    if (depasse > budget * (FACTEUR_OUBLI - 1)) {
      oublies.push({
        token: d.token,
        quoi: `${d.titre?.trim() || "sans titre"} — ${LIBELLE_ETAT[d.etat as Etat]} depuis ${Math.round(
          (maintenant.getTime() - Date.parse(d.etat_maj_le)) / 86_400_000,
        )} jours`,
      });
    }
  }
  if (oublies.length) {
    constats.push({
      gravite: "rouge",
      titre: `${oublies.length} dossier${oublies.length > 1 ? "s" : ""} oublié${oublies.length > 1 ? "s" : ""}`,
      remede: "Traiter, ou prévenir le client d'un délai. Le silence est ce qui coûte le plus.",
      lignes: oublies,
    });
  }

  /* ── 5. les dossiers sans email ────────────────────────────────────
     Aucun mail ne leur parviendra jamais, quel que soit l'état. */
  const sansEmail = lignes.filter((d) => !d.email);
  if (sansEmail.length) {
    constats.push({
      gravite: "orange",
      titre: `${sansEmail.length} dossier${sansEmail.length > 1 ? "s" : ""} sans adresse`,
      remede: "Aucun mail ne peut leur parvenir. Récupérer l'adresse, ou archiver le dossier.",
      lignes: sansEmail.map((d) => ({ token: d.token, quoi: d.titre?.trim() || "sans titre" })),
    });
  }

  /* ── 5 bis. les adresses qui ne reçoivent pas ──────────────────────
     Le pire cas de toute cette page, et le seul qui soit strictement
     invisible partout ailleurs : le dossier a une adresse, elle a l'air
     normale, et aucun de nos mails n'arrive. Avant le webhook Brevo
     (29/08/2026), rien nulle part ne le disait.
     ⚠️ On lit SANS borne de date, contrairement aux mails en échec juste
     au-dessus : un rebond n'est pas un incident passager qui se périme au
     bout d'une semaine, c'est un dossier durablement injoignable. Tant que
     l'atelier n'a pas corrigé l'adresse, il doit rester sous les yeux. */
  const rebonds: Constat["lignes"] = [];
  /* T-037 — les plaintes, dans la MÊME requête mais jamais dans le même
     constat : « spam » veut dire qu'elle a REÇU, confondre les deux ferait
     appeler une cliente pour lui dire qu'on n'arrive pas à la joindre. */
  const plaintes: Constat["lignes"] = [];
  if (ids.length) {
    const { data: evts } = await supabase
      .from("evenements")
      .select("numero_id, type, payload")
      .in("type", ["email_rebond", "email_plainte"])
      .in("numero_id", ids)
      .returns<
        Array<{ numero_id: string; type: string; payload: Record<string, unknown> | null }>
      >();

    const parId = new Map(lignes.map((d) => [d.id, d]));
    const vus = new Set<string>();
    for (const e of evts ?? []) {
      const cle = `${e.type}:${e.numero_id}`;
      if (vus.has(cle)) continue;
      const d = parId.get(e.numero_id);
      if (!d) continue;
      vus.add(cle);
      const raison = typeof e.payload?.raison === "string" ? e.payload.raison.trim() : "";
      const ligne = {
        token: d.token,
        quoi: `${d.email ?? "—"} — ${d.titre?.trim() || "sans titre"}${raison ? ` (${raison})` : ""}`,
      };
      if (e.type === "email_rebond") rebonds.push(ligne);
      else plaintes.push(ligne);
    }
  }
  if (rebonds.length) {
    constats.push({
      gravite: "rouge",
      titre: `${rebonds.length} adresse${rebonds.length > 1 ? "s ne reçoivent" : " ne reçoit"} pas nos mails`,
      remede:
        "Elles n'ont RIEN reçu et ne recevront rien. Corriger l'adresse sur la fiche, ou appeler.",
      lignes: rebonds,
    });
  }

  /* ── 5 ter. les mails marqués comme indésirables ───────────────────
     T-037 — le webhook Brevo journalise `email_plainte` depuis le 29/08,
     mais rien ne le montrait hors de la frise du récit, qu'il faut ouvrir
     dossier par dossier. Or c'est le signal le plus direct qu'on ait sur
     notre délivrabilité. ORANGE, pas rouge, et rien sur la ligne de la
     liste : une plainte n'est pas une panne de CE dossier, c'est une
     information sur NOS mails — l'adresse a bien reçu. Aucune décision
     automatique : un rebond ou une plainte ne déclenche ni état ni mail. */
  if (plaintes.length) {
    constats.push({
      gravite: "orange",
      titre: `${plaintes.length} mail${plaintes.length > 1 ? "s ont été marqués" : " a été marqué"} comme indésirable${plaintes.length > 1 ? "s" : ""}`,
      remede:
        "L'adresse fonctionne : elle a reçu, puis cliqué « indésirable ». Rien à réparer sur le dossier — c'est un signal sur la délivrabilité de nos mails, les suivants risquent le dossier spam.",
      lignes: plaintes,
    });
  }

  /* ── 5 quater. deux dossiers pour la même adresse (T-084) ──────────
     Le tunnel n'a aucune authentification : une cliente qui ne retrouve
     pas son mail recommence, et rien ne le dit. Ce qui coûte, dans l'ordre :
     deux relances en parallèle sur la même personne, un dépôt de photos
     réparti sur deux dossiers dont aucun n'atteint le seuil, et l'atelier
     qui compose le dossier vide en ignorant que les photos sont à côté.
     ORANGE : c'est un doute à lever avant de composer, pas une panne. */
  const doublons = await lireDoublonsAdresse(supabase);
  if (doublons.length) {
    constats.push({
      gravite: "orange",
      titre: `${doublons.length} adresse${doublons.length > 1 ? "s portent" : " porte"} plusieurs dossiers non payés`,
      remede:
        "Vérifier AVANT de composer : les photos peuvent être réparties sur deux dossiers dont aucun n'atteint le seuil. Ne pas fusionner à l'aveugle — un second numéro pour un autre moment est légitime.",
      lignes: doublons,
    });
  }

  /* ── 6. la relève tourne-t-elle ? ──────────────────────────────────
     M2, M2b, M3b, M8 et l'auto-validation n'existent QUE par elle. Une relève
     muette depuis une semaine, c'est du chiffre d'affaires qui ne part pas.

     ⚠️ LE GARDE-FOU A CHANGÉ. Il était « au moins un dossier existe » : sur
     une base vidée, ou pendant une semaine calme, la page criait « aucun mail
     parti depuis longtemps » alors qu'il n'y avait strictement rien à
     envoyer. Une alerte qui se déclenche sans raison apprend à être ignorée,
     et le jour où la relève tombe vraiment, personne ne la lit.

     Le silence n'est suspect que si un mail EST DÛ MAINTENANT et n'est pas
     parti. Là, ce n'est plus du calme : c'est une panne. */
  const silence = dernierMail
    ? (maintenant.getTime() - Date.parse(dernierMail)) / 86_400_000
    : null;
  if (dusMaintenant > 0 && (silence === null || silence > 1)) {
    constats.push({
      gravite: "rouge",
      titre: `${dusMaintenant} mail${dusMaintenant > 1 ? "s sont dus" : " est dû"} et la relève se tait`,
      remede:
        "Vérifier que le cron quotidien tourne (/api/atelier/mails/relever, vercel.json, CRON_SECRET). Sans lui, M3b — le mail qui rapporte le plus — ne part jamais. En attendant : `node scripts/recette.mjs relever`.",
      lignes: [
        {
          token: null,
          quoi: dernierMail
            ? `Dernier envoi il y a ${Math.round(silence as number)} jour(s), alors que ${dusMaintenant} mail(s) attendent`
            : `Aucun mail n'a jamais été envoyé, alors que ${dusMaintenant} mail(s) attendent`,
        },
      ],
    });
  }

  return {
    constats,
    toutVaBien: constats.length === 0,
    nbDossiers: lignes.length,
    dernierMail,
    fetchedAt: maintenant.toISOString(),
  };
}

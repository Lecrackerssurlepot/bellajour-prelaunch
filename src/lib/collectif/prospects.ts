/**
 * Les rendez-vous pris depuis /partenaires (18/11/2026) : un prospect, pas
 * encore d'édition. Module À EFFETS (Supabase, Google Agenda) : serveur
 * uniquement. Les règles de saisie, pures, sont dans `prospectsSaisie.ts`.
 *
 * Ce que Mathias a tranché le 18/11 :
 * - on ne montre que les créneaux où TOUTES les personnes de l'atelier qui
 *   prennent des rendez-vous (`actif`) sont libres : l'appel se fait à deux ;
 * - la connexion Google de chacun : l'événement est posé chez la première
 *   (l'organisateur), les autres et le prospect sont INVITÉS par Google, avec
 *   une visio Meet neuve. Aucun mail ne part de chez nous.
 * Les créneaux sont ceux de `REGLES_RDV` (creneaux.ts) : aucune autre règle.
 *
 * L'ordre d'une réservation est celui de rendezvous.ts : la règle → les
 * agendas (libre / occupé seulement) → le VERROU en base (index unique sur le
 * début) → l'événement Google ; un événement raté défait la ligne.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import { plagesOccupees, poserEvenementComplet, type Raison } from "./agenda";
import { chevauche, REGLES_RDV, type Creneau, type Plage } from "./creneaux";
import { colonneAbsente, tableAbsente } from "./migration";
import type { DemandeProspect } from "./prospectsSaisie";
import { connexionDe, lireInterlocuteurs, type Interlocuteur } from "./rendezvous";

export const MIGRATION_PARTENAIRES = "supabase/migrations/20261118_partenaires_rendez_vous.sql";

export type EchecProspect = { statut: number; error: string; message: string };

/** Quelqu'un de l'atelier, prêt pour un appel : son agenda et sa connexion (jamais rendue au navigateur). */
type Personne = { inter: Interlocuteur; connexion: string };

const PAS_PRET: EchecProspect = { statut: 503, error: "agenda_non_relie", message: "La prise de rendez-vous n'est pas encore ouverte." };

function echecAgenda(raison: Raison, message: string): EchecProspect {
  return { statut: raison === "non_configure" ? 503 : 502, error: `agenda_${raison}`, message };
}

/**
 * L'équipe de l'appel : chaque personne `actif` de l'atelier. UNE seule
 * personne active non connectée ferme tout : on ne propose jamais un créneau
 * sans savoir si elle est libre. Pour un appel à un seul, décocher « Prend
 * des rendez-vous » de l'autre dans « Les agendas ».
 */
export async function equipeDeLAppel(supabase: SupabaseClient): Promise<{ ok: true; equipe: Personne[] } | { ok: false; echec: EchecProspect }> {
  const lu = await lireInterlocuteurs(supabase);
  if (!lu.ok) return { ok: false, echec: PAS_PRET };
  const actifs = lu.valeur.filter((i) => i.actif);
  if (actifs.length === 0) return { ok: false, echec: PAS_PRET };
  const equipe: Personne[] = [];
  for (const inter of actifs) {
    const connexion = inter.agenda_id ? await connexionDe(supabase, inter.cle) : null;
    if (!connexion) return { ok: false, echec: PAS_PRET };
    equipe.push({ inter, connexion });
  }
  return { ok: true, equipe };
}

/** Chez qui l'événement est posé : Mathias s'il est de l'appel, sinon la première personne par clé. */
function organisateurDe(equipe: readonly Personne[]): Personne {
  return equipe.find((p) => p.inter.cle === "mathias") ?? [...equipe].sort((a, b) => a.inter.cle.localeCompare(b.inter.cle))[0];
}

/** Les plages où AU MOINS une personne de l'appel est occupée, entre deux instants. */
export async function occupesDeLEquipe(equipe: readonly Personne[], debut: string, fin: string): Promise<{ ok: true; occupes: Plage[] } | { ok: false; echec: EchecProspect }> {
  const lus = await Promise.all(equipe.map((p) => plagesOccupees(p.inter.agenda_id as string, debut, fin, p.connexion)));
  const occupes: Plage[] = [];
  for (const l of lus) {
    if (!l.ok) return { ok: false, echec: echecAgenda(l.raison, l.message) };
    occupes.push(...l.valeur);
  }
  return { ok: true, occupes };
}

export type RdvProspect = { id: string; debut: string; fin: string; visio: string | null; avec: string[] };

const pris = (): EchecProspect => ({ statut: 409, error: "creneau_pris", message: "Ce créneau vient d'être pris. Choisissez-en un autre." });

/** Réserver un créneau DÉJÀ validé par `lireCreneau`, pour une demande DÉJÀ lue par `lireDemandeProspect`. */
export async function reserverProspect(supabase: SupabaseClient, demande: DemandeProspect, creneau: Creneau, maintenant: Date): Promise<{ ok: true; rdv: RdvProspect } | { ok: false; echec: EchecProspect }> {
  const pret = await equipeDeLAppel(supabase);
  if (!pret.ok) return pret;
  const { equipe } = pret;

  /* La règle : un seul rendez-vous à venir par adresse (un double clic, un formulaire renvoyé). */
  const { data: deja, error: errDeja } = await supabase
    .from("collectif_rdv_prospects")
    .select("id")
    .eq("email", demande.email)
    .eq("statut", "pris")
    .gt("debut", maintenant.toISOString())
    .limit(1);
  if (errDeja) {
    return { ok: false, echec: tableAbsente(errDeja.code) || colonneAbsente(errDeja.code) ? PAS_PRET : { statut: 500, error: "lecture_impossible", message: "Lecture impossible." } };
  }
  if ((deja ?? []).length > 0) {
    return { ok: false, echec: { statut: 409, error: "deja_un_rdv", message: "Un rendez-vous est déjà pris avec cette adresse : l'invitation est dans votre boîte mail." } };
  }

  const occ = await occupesDeLEquipe(equipe, creneau.debut, creneau.fin);
  if (!occ.ok) return occ;
  if (occ.occupes.some((o) => chevauche(o, creneau))) return { ok: false, echec: pris() };

  const organisateur = organisateurDe(equipe);
  const { data: ligne, error } = await supabase
    .from("collectif_rdv_prospects")
    .insert({
      nom: demande.nom,
      organisation: demande.organisation,
      email: demande.email,
      telephone: demande.telephone,
      message: demande.message,
      debut: creneau.debut,
      fin: creneau.fin,
      organisateur_cle: organisateur.inter.cle,
    })
    .select("id")
    .single<{ id: string }>();
  if (error) {
    if (error.code === "23505") return { ok: false, echec: pris() };
    return { ok: false, echec: tableAbsente(error.code) ? PAS_PRET : { statut: 500, error: "ecriture_impossible", message: "Le rendez-vous n'a pas été enregistré." } };
  }

  const autres = equipe.filter((p) => p !== organisateur);
  const ev = await poserEvenementComplet(
    organisateur.inter.agenda_id as string,
    {
      debut: creneau.debut,
      fin: creneau.fin,
      titre: `Bellajour · ${demande.organisation} · Premier échange`,
      description: [
        "Rendez-vous pris depuis bellajour.fr/partenaires.",
        `${demande.nom} · ${demande.organisation}`,
        `${demande.email}${demande.telephone ? ` · ${demande.telephone}` : ""}`,
        demande.message ? `Projet : ${demande.message}` : null,
      ]
        .filter(Boolean)
        .join("\n"),
      lieu: null,
      invites: [...autres.map((p) => ({ email: p.inter.agenda_id as string, nom: p.inter.prenom })), { email: demande.email, nom: demande.nom }],
      visio: true,
      visioCle: `bj-p-${ligne.id}`,
    },
    organisateur.connexion
  );
  if (!ev.ok) {
    /* Défait : le créneau se libère, rien n'est confirmé au prospect. */
    await supabase.from("collectif_rdv_prospects").update({ statut: "annule", annule_le: new Date().toISOString() }).eq("id", ligne.id);
    return { ok: false, echec: echecAgenda(ev.raison, `${ev.message} Rien n'est réservé.`) };
  }
  const { error: errId } = await supabase.from("collectif_rdv_prospects").update({ google_event_id: ev.valeur.id, visio_url: ev.valeur.visio }).eq("id", ligne.id);
  if (errId) console.error("[partenaires] identifiant d'événement non gardé", errId.code);
  console.info(`[partenaires] rendez-vous pris (${demande.organisation})`);

  return { ok: true, rdv: { id: ligne.id, debut: creneau.debut, fin: creneau.fin, visio: ev.valeur.visio, avec: equipe.map((p) => p.inter.prenom) } };
}

export const DUREE_APPEL_MINUTES = REGLES_RDV.dureeMinutes;

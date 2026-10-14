"use client";

/* Choisir un créneau (D23, T-148) : un panneau latéral en verre, la semaine
   en cours puis les suivantes, du lundi au vendredi, les créneaux LIBRES de
   l'interlocuteur. Un clic choisit, le pied confirme. Sert à prendre un
   rendez-vous comme à le déplacer.

   Rien du contenu de l'agenda n'arrive ici : la route ne rend que des débuts
   de créneau (free/busy). Un créneau pris entre-temps est refusé par le
   serveur, avec une phrase, et la semaine se relit. */

import { useCallback, useEffect, useState } from "react";
import { libelleCreneau, MOTIF_MAX, REGLES_RDV } from "@/lib/collectif/creneaux";
import Fenetre from "../../_composants/Fenetre";
import type { VueRendezVous } from "../donnees";

type Jour = { jour: string; libelle: string; creneaux: { debut: string; heure: string }[] };
type Semaine = { semaine: number; derniere: boolean; libelle: string; avec: string; jours: Jour[] };

export type Fait = { rdv: Omit<VueRendezVous, "avec" | "quand"> & { creeLe: string }; mail: string; avertissement: string | null };

export default function Reservation(p: {
  token: string;
  /** Le rendez-vous qu'on déplace ; absent : on en prend un nouveau. */
  deplace: VueRendezVous | null;
  avec: string | null;
  meet: string | null;
  tu: boolean;
  onFermer: () => void;
  onFait: (f: Fait) => void;
}) {
  const v = (vous: string, toi: string) => (p.tu ? toi : vous);
  const [semaine, setSemaine] = useState(0);
  const [donnees, setDonnees] = useState<Semaine | null>(null);
  const [charge, setCharge] = useState(true);
  const [erreur, setErreur] = useState<string | null>(null);
  const [choisi, setChoisi] = useState<string | null>(null);
  const [motif, setMotif] = useState("");
  const [occupe, setOccupe] = useState(false);

  const lire = useCallback(
    async (s: number) => {
      setCharge(true);
      setErreur(null);
      try {
        const rep = await fetch("/api/collectif/rendez-vous/creneaux", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ token: p.token, semaine: s, rdvId: p.deplace?.id }),
        });
        const json = (await rep.json().catch(() => ({}))) as Semaine & { message?: string };
        if (!rep.ok) {
          setDonnees(null);
          setErreur(json.message ?? `Les créneaux n'ont pas pu se lire (erreur ${rep.status}).`);
          return;
        }
        setDonnees(json);
      } catch {
        setErreur("Le réseau n'a pas répondu.");
      } finally {
        setCharge(false);
      }
    },
    [p.token, p.deplace]
  );

  useEffect(() => {
    void lire(semaine);
  }, [lire, semaine]);

  async function confirmer() {
    if (!choisi) return;
    setOccupe(true);
    setErreur(null);
    try {
      const rep = await fetch("/api/collectif/rendez-vous", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(
          p.deplace ? { token: p.token, action: "deplacer", rdvId: p.deplace.id, debut: choisi } : { token: p.token, action: "prendre", debut: choisi, motif }
        ),
      });
      const json = (await rep.json().catch(() => ({}))) as Partial<Fait> & { message?: string; error?: string };
      if (!rep.ok || !json.rdv) {
        setErreur(json.message ?? `Non enregistré (erreur ${rep.status}).`);
        if (json.error === "creneau_pris") {
          setChoisi(null);
          void lire(semaine);
        }
        return;
      }
      p.onFait({ rdv: json.rdv, mail: json.mail ?? "", avertissement: json.avertissement ?? null });
    } catch {
      setErreur("Le réseau n'a pas répondu. Rien n'est réservé.");
    } finally {
      setOccupe(false);
    }
  }

  const avec = donnees?.avec ?? p.avec;
  const libres = donnees?.jours.reduce((n, j) => n + j.creneaux.length, 0) ?? 0;

  return (
    <Fenetre
      cote
      titre={p.deplace ? "Déplacer le rendez-vous" : "Choisir un créneau"}
      sous={[
        avec ? `Avec ${avec}` : null,
        `${REGLES_RDV.dureeMinutes} minutes${p.meet ? " en visio" : ""}`,
        p.deplace ? `aujourd'hui prévu ${libelleCreneau(p.deplace.debut)}` : null,
      ]
        .filter(Boolean)
        .join(" · ")}
      onFermer={p.onFermer}
      pied={
        <div className="ec-rdv-pied">
          <span className="ec-rdv-choix">{choisi ? libelleCreneau(choisi).replace(/^./, (c) => c.toUpperCase()) : v("Choisissez un créneau", "Choisis un créneau")}</span>
          <button type="button" className="ec-bouton" disabled={!choisi || occupe} onClick={confirmer}>
            {occupe ? "Un instant…" : p.deplace ? "Déplacer ici" : "Confirmer le rendez-vous"}
          </button>
        </div>
      }
    >
      <div className="ec-rdv-semaine">
        <button type="button" className="ec-rdv-rond" aria-label="Semaine précédente" disabled={semaine === 0 || charge} onClick={() => setSemaine((s) => s - 1)}>
          ‹
        </button>
        <strong>{donnees?.libelle ?? (semaine === 0 ? "Cette semaine" : "…")}</strong>
        <button type="button" className="ec-rdv-rond" aria-label="Semaine suivante" disabled={Boolean(donnees?.derniere) || charge} onClick={() => setSemaine((s) => s + 1)}>
          ›
        </button>
      </div>

      {erreur ? (
        <p className="ec-note ec-note--erreur" role="alert">
          {erreur}
        </p>
      ) : null}
      {charge ? <p className="ec-note" aria-busy="true">Lecture des disponibilités…</p> : null}

      {!charge && donnees ? (
        <div className="ec-rdv-jours">
          {donnees.jours.map((j) => (
            <section key={j.jour} className="ec-rdv-jour" aria-label={j.libelle}>
              <span className="ec-rdv-jour-nom">{j.libelle}</span>
              {j.creneaux.length ? (
                <div className="ec-rdv-heures">
                  {j.creneaux.map((c) => (
                    <button key={c.debut} type="button" className="ec-rdv-heure" aria-pressed={choisi === c.debut} onClick={() => setChoisi(c.debut)}>
                      {c.heure}
                    </button>
                  ))}
                </div>
              ) : (
                <span className="ec-note">Aucun créneau libre</span>
              )}
            </section>
          ))}
          {libres === 0 ? <p className="ec-note">{v("Rien de libre cette semaine : regardez la suivante.", "Rien de libre cette semaine : regarde la suivante.")}</p> : null}
        </div>
      ) : null}

      {!p.deplace ? (
        <label className="ec-curseur">
          {v("Un mot sur le sujet (facultatif)", "Un mot sur le sujet (facultatif)")}
          <input className="ec-champ" value={motif} maxLength={MOTIF_MAX} placeholder="Relire le bon à tirer, ajouter des pages…" onChange={(e) => setMotif(e.target.value)} />
        </label>
      ) : null}
    </Fenetre>
  );
}

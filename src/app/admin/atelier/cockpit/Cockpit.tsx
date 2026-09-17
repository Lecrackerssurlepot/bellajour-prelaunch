"use client";

/**
 * Le cockpit vivant : les curseurs d'hypothèses et le verdict qu'ils
 * produisent, rejoué à chaque mouvement par `calculerCockpit` (module pur,
 * le même que le harnais). Rien n'est calculé côté serveur qui ne le soit
 * aussi ici : un curseur qu'on bouge doit répondre sans aller-retour.
 *
 * Deux gestes écrivent : « Enregistrer » (les hypothèses, table
 * cockpit_settings) et « Recalculer » (relance le job du lundi, table
 * weekly_metrics). Ni l'un ni l'autre ne touche un dossier.
 */

import { useCallback, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  BORNES,
  CLES_REGLAGES,
  FENETRE_PROCHE_SEMAINES,
  LIBELLE_VERDICT,
  LISSAGE_SEMAINES,
  SOCLE_FROID_MIN,
  calculerCockpit,
  phraseVerdict,
  type LigneSemaine,
  type Reglages,
} from "@/lib/cockpit/modele";
import { lundiDecale } from "@/lib/cockpit/semaine";
import type { ReglagesLus } from "@/lib/cockpit/donnees";

const JOUR = new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "long", timeZone: "Europe/Paris" });
const EUROS = new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: 0 });

/* Décimales à la française : « 3,2 », pas « 3.2 ». */
function fr(v: number): string {
  return String(Math.round(v * 10) / 10).replace(".", ",");
}

function sem(v: number | null): string {
  return v === null ? "—" : fr(v);
}

function pct(g: number | null): string {
  if (g === null) return "—";
  const s = Math.round(g * 1000) / 10;
  return `${s > 0 ? "+" : ""}${String(s).replace(".", ",")} %`;
}

/* La date limite en CALENDRIER : `dateLimite` est comptée en semaines depuis
   la fin de S (la dernière semaine complète, donc le lundi de la semaine en
   cours). */
function dateCalendrier(dateDebutS: string | undefined, semaines: number | null): string | null {
  if (!dateDebutS || semaines === null) return null;
  const lundiS = new Date(`${dateDebutS}T12:00:00Z`);
  const lundiSuivant = lundiDecale(lundiS, 1);
  return JOUR.format(new Date(lundiSuivant.getTime() + semaines * 7 * 86_400_000));
}

function Curseur({
  cle,
  valeur,
  onChange,
}: {
  cle: keyof Reglages;
  valeur: number;
  onChange: (v: number) => void;
}) {
  const b = BORNES[cle];
  const id = `ck-${cle}`;
  return (
    <label className="ck-curseur" htmlFor={id}>
      <span className="ck-curseur-tete">
        <span className="ck-curseur-label">{b.label}</span>
        <span className="ck-curseur-val">
          {cle === "cout_dev" ? EUROS.format(valeur) : `${valeur} ${b.unite}`}
        </span>
      </span>
      <input
        id={id}
        type="range"
        min={b.min}
        max={b.max}
        step={b.pas}
        value={valeur}
        onChange={(e) => onChange(Number(e.target.value))}
      />
    </label>
  );
}

export default function Cockpit({
  reglages,
  lignes,
  calculeLe,
  demo,
}: {
  reglages: ReglagesLus;
  lignes: LigneSemaine[];
  calculeLe: string | null;
  /** Démonstration : les curseurs jouent, rien n'est écrit. */
  demo?: boolean;
}) {
  const router = useRouter();
  const { regle_le, regle_par, ...initiaux } = reglages;
  const [r, setR] = useState<Reglages>(initiaux);
  const [sale, setSale] = useState(false);
  const [occupe, setOccupe] = useState<"enregistrer" | "recalculer" | null>(null);
  const [message, setMessage] = useState<{ ton: "ok" | "ko"; texte: string } | null>(null);

  const c = useMemo(() => calculerCockpit(lignes, r), [lignes, r]);

  const regler = useCallback((cle: keyof Reglages, v: number) => {
    setR((prev) => ({ ...prev, [cle]: v }));
    setSale(true);
    setMessage(null);
  }, []);

  const enregistrer = useCallback(async () => {
    if (demo) return;
    setOccupe("enregistrer");
    setMessage(null);
    try {
      const rep = await fetch("/api/admin/cockpit/reglages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(r),
      });
      if (rep.status === 503) throw new Error("La migration 20260917 n’est pas passée sur cette base.");
      if (!rep.ok) throw new Error("Les hypothèses n’ont pas été enregistrées. Réessaie.");
      setSale(false);
      setMessage({ ton: "ok", texte: "Hypothèses enregistrées." });
      router.refresh();
    } catch (e) {
      setMessage({ ton: "ko", texte: (e as Error).message });
    } finally {
      setOccupe(null);
    }
  }, [r, router, demo]);

  const recalculer = useCallback(async () => {
    if (demo) return;
    setOccupe("recalculer");
    setMessage(null);
    try {
      const rep = await fetch("/api/admin/cockpit/agreger", { method: "POST" });
      if (rep.status === 503) throw new Error("La migration 20260917 n’est pas passée sur cette base.");
      if (!rep.ok) throw new Error("Le recalcul a échoué. Les logs Vercel disent pourquoi.");
      const j = (await rep.json()) as { semaines?: number; commandes?: number };
      setMessage({
        ton: "ok",
        texte: `${j.semaines ?? 0} semaine${(j.semaines ?? 0) > 1 ? "s" : ""} réécrite${(j.semaines ?? 0) > 1 ? "s" : ""} à partir de ${j.commandes ?? 0} commande${(j.commandes ?? 0) > 1 ? "s" : ""}.`,
      });
      router.refresh();
    } catch (e) {
      setMessage({ ton: "ko", texte: (e as Error).message });
    } finally {
      setOccupe(null);
    }
  }, [router, demo]);

  const delai = r.t_dev + r.buffer;
  const limiteCalendrier = dateCalendrier(c.derniere?.date_debut, c.dateLimite);
  const murCalendrier = dateCalendrier(c.derniere?.date_debut, c.semaineMur);

  return (
    <>
      {regle_le === null ? (
        <div className="ate-bandeau ate-bandeau--attention">
          Les hypothèses n’ont jamais été réglées : les curseurs sont sur des points de départ neutres, pas
          sur des chiffres du produit. Règle-les, puis enregistre.
        </div>
      ) : null}

      <section className={`ck-verdict ck-verdict--${c.verdict}`}>
        <span className="ate-m-cle-titre">Verdict</span>
        <span className="ck-verdict-mot">{LIBELLE_VERDICT[c.verdict]}</span>
        <p className="ck-verdict-phrase">{phraseVerdict(c, r)}</p>
        <p className="ck-verdict-fiab">
          {c.fiabilite.fiable ? (
            <>
              Socle froid fiable : au moins {SOCLE_FROID_MIN} commandes froides sur la dernière semaine complète, toutes avec
              une origine.
            </>
          ) : (
            <>
              <strong>Non fiable</strong> : {c.fiabilite.raisons.join(" ; ")}.
            </>
          )}
        </p>
        {c.constatMargePages ? <p className="ck-verdict-constat">{c.constatMargePages}</p> : null}
      </section>

      <div className="ate-m-cles ck-cles">
        <div className="ate-m-cle">
          <span className="ate-m-cle-titre">Froid, dernière semaine</span>
          <span className="ate-m-cle-val">
            {c.derniere ? c.froides : "—"}
            <span className="ate-m-cle-unite">/ sem</span>
          </span>
          <span className="ate-m-cle-pied">
            <span className="ate-m-cle-note">
              {c.derniere ? `S${String(c.derniere.semaine % 100).padStart(2, "0")}` : "aucune semaine"}
              {c.reference ? ` · S−${LISSAGE_SEMAINES} : ${c.reference.commandes_froides}` : ""}
            </span>
          </span>
        </div>
        <div className="ate-m-cle">
          <span className="ate-m-cle-titre">Croissance lissée</span>
          <span className="ate-m-cle-val">
            {pct(c.g)}
            {c.g !== null ? <span className="ate-m-cle-unite">/ sem</span> : null}
          </span>
          <span className="ate-m-cle-pied">
            <span className="ate-m-cle-note">
              {c.g === null ? `il faut S et S−${LISSAGE_SEMAINES} avec du froid` : `racine cubique de S / S−${LISSAGE_SEMAINES}`}
            </span>
          </span>
        </div>
        <div className="ate-m-cle">
          <span className="ate-m-cle-titre">Le mur</span>
          <span className="ate-m-cle-val">
            {sem(c.semaineMur)}
            {c.semaineMur !== null ? <span className="ate-m-cle-unite">sem</span> : null}
          </span>
          <span className="ate-m-cle-pied">
            <span className="ate-m-cle-note">
              {c.semaineMur === null
                ? "pas de mur sans croissance"
                : c.semaineMur === 0
                  ? "atteint"
                  : `vers le ${murCalendrier} · capacité ${r.capacite}`}
            </span>
          </span>
        </div>
        <div className="ate-m-cle">
          <span className="ate-m-cle-titre">Décider avant</span>
          <span className="ate-m-cle-val">
            {sem(c.dateLimite)}
            {c.dateLimite !== null ? <span className="ate-m-cle-unite">sem</span> : null}
          </span>
          <span className="ate-m-cle-pied">
            <span className="ate-m-cle-note">
              {c.dateLimite === null
                ? `mur − ${delai} semaines de dev et de marge`
                : c.dateLimite <= 0
                  ? "déjà passé"
                  : `le ${limiteCalendrier} · fenêtre proche sous ${FENETRE_PROCHE_SEMAINES}`}
            </span>
          </span>
        </div>
      </div>

      <div className="ck-finance">
        <div className="ck-finance-case">
          <span className="ate-m-mesure-titre">Seuil de déclenchement</span>
          <span className="ate-m-val">{c.dTrigger === null ? "—" : fr(c.dTrigger)}</span>
          <span className="ate-m-sous">
            commandes froides / semaine : au-delà, le dev doit déjà être lancé (capacité ÷ (1+g)^{delai})
          </span>
        </div>
        <div className="ck-finance-case">
          <span className="ate-m-mesure-titre">Marge retenue</span>
          <span className="ate-m-val">{`${fr(c.marge.valeur)} €`}</span>
          <span className="ate-m-sous">
            {c.marge.source === "agregat" ? "mesurée sur la dernière semaine" : "par défaut : aucune marge mesurée"}
          </span>
        </div>
        <div className="ck-finance-case">
          <span className="ate-m-mesure-titre">Financement mensuel</span>
          <span className="ate-m-val">{EUROS.format(c.financementMensuel)}</span>
          <span className="ate-m-sous">{`${c.marge.valeur} € × ${r.volume_mensuel} / mois × ${r.reinvesti_pct} %`}</span>
        </div>
        <div className="ck-finance-case">
          <span className="ate-m-mesure-titre">Pour financer le dev</span>
          <span className="ate-m-val">{c.moisPourFinancer === null ? "—" : `${fr(c.moisPourFinancer)} mois`}</span>
          <span className="ate-m-sous">{`${EUROS.format(r.cout_dev)} à ce rythme`}</span>
        </div>
      </div>

      <section className="ck-section">
        <h2 className="ck-h2">Les hypothèses</h2>
        <p className="ate-m-sous ck-note">
          Tout le reste se remplit tout seul. Ici, ce que seul toi peux dire.
          {regle_le
            ? ` Réglées le ${JOUR.format(new Date(regle_le))}${regle_par ? ` par ${regle_par}` : ""}.`
            : ""}
        </p>
        <div className="ck-curseurs">
          {CLES_REGLAGES.map((cle) => (
            <Curseur key={cle} cle={cle} valeur={r[cle]} onChange={(v) => regler(cle, v)} />
          ))}
        </div>
        <div className="ck-actions">
          <button
            type="button"
            className="adm-btn"
            onClick={enregistrer}
            disabled={occupe !== null || !sale || demo}
          >
            {occupe === "enregistrer" ? "…" : sale ? "Enregistrer les hypothèses" : "Hypothèses enregistrées"}
          </button>
          <button type="button" className="adm-btn adm-btn--ghost" onClick={recalculer} disabled={occupe !== null || demo}>
            {occupe === "recalculer" ? "…" : "Recalculer les semaines"}
          </button>
          <span className="ate-faint ck-actions-note">
            {demo ? "Démonstration : rien n’est écrit." : calculeLe ? "Le job tourne seul le lundi matin." : "Le job n’a encore rien écrit."}
          </span>
        </div>
        {message ? <p className={message.ton === "ok" ? "ck-msg ck-msg--ok" : "ck-msg ck-msg--ko"}>{message.texte}</p> : null}
      </section>
    </>
  );
}

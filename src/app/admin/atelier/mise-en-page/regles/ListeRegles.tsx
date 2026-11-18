"use client";

import { useEffect, useState } from "react";
/* les types et le pont seulement, jamais l'index : le registre entier arrive par la page serveur, pas dans le paquet du navigateur */
import { A_PRECISER, DOMAINES, PROFILS, STATUTS, type Profil, type Regle, type Statut } from "@/lib/mise-en-page/regles/types";
import { correctionsParRegle, type Corrections, type LeconComptee } from "@/lib/mise-en-page/regles/retours";
import { NOM_DOMAINE, NOM_FAMILLE, NOM_PROFIL, NOM_STATUT } from "./libelles";

/** Une règle du registre et ses réglages avec leur valeur actuelle (lus par la page serveur). */
export type RegleVue = Regle & { reglagesVus: { nom: string; valeur: number }[] };

type EtatLecons = { etat: "attente" } | { etat: "pret"; comptes: Record<string, Corrections>; table: boolean } | { etat: "erreur" };

const dateCourte = (iso: string): string => {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "" : d.toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit" });
};

function Pastilles<T extends string>({ valeurs, nom, choisi, choisir, libelle }: { valeurs: readonly T[]; nom: (v: T) => string; choisi: T | null; choisir: (v: T | null) => void; libelle: string }) {
  return (
    <div className="mep-regles-filtre" role="group" aria-label={libelle}>
      <button type="button" className="mep-regles-pastille" aria-pressed={choisi === null} onClick={() => choisir(null)}>
        Tous
      </button>
      {valeurs.map((v) => (
        <button key={v} type="button" className="mep-regles-pastille" aria-pressed={choisi === v} onClick={() => choisir(choisi === v ? null : v)}>
          {nom(v)}
        </button>
      ))}
    </div>
  );
}

function Carte({ r, lecons }: { r: RegleVue; lecons: EtatLecons }) {
  const c = lecons.etat === "pret" ? lecons.comptes[r.id] : undefined;
  const ecrite = r.quand !== A_PRECISER || r.alors !== A_PRECISER;
  return (
    <li className={`mep-regle mep-regle--${r.famille}`}>
      <div className="mep-regle-tete">
        <span className="mep-regle-id">{r.id}</span>
        <span className={`mep-regle-statut mep-regle-statut--${r.statut}`}>{NOM_STATUT[r.statut]}</span>
        <span className="mep-regle-famille">
          {NOM_FAMILLE[r.famille]}
          {r.famille === "preference" && r.poids !== undefined ? ` · ${r.poids}` : ""}
        </span>
        {r.banc ? <span className="mep-regle-banc">{r.banc.etat === "jouee" ? "Jouée au banc" : "Écrite au banc"}</span> : null}
        <span className="mep-regle-corrections" title={c?.derniere ? `Dernière le ${dateCourte(c.derniere)}` : undefined}>
          {lecons.etat === "pret" ? `${c?.corrections ?? 0} correction${(c?.corrections ?? 0) > 1 ? "s" : ""}` : ""}
          {c?.derniere ? ` · ${dateCourte(c.derniere)}` : ""}
        </span>
      </div>
      <p className="mep-regle-enonce">{r.enonce}</p>
      {ecrite ? (
        <dl className="mep-regle-si">
          <div>
            <dt>Quand</dt>
            <dd>{r.quand}</dd>
          </div>
          <div>
            <dt>Alors</dt>
            <dd>{r.alors}</dd>
          </div>
        </dl>
      ) : null}
      <dl className="mep-regle-meta">
        <div>
          <dt>Profils</dt>
          <dd>
            {r.profils === "tous" ? "Tous" : r.profils.map((p) => NOM_PROFIL[p]).join(", ")}
            {r.themes?.length ? ` · thème ${r.themes.join(", ").replace(/_/g, " ")}` : ""}
          </dd>
        </div>
        {r.donnees.length ? (
          <div>
            <dt>Données</dt>
            <dd>{r.donnees.join(", ")}</dd>
          </div>
        ) : null}
        {r.reglagesVus.length ? (
          <div>
            <dt>Réglages</dt>
            <dd>
              {r.reglagesVus.map((x) => (
                <code key={x.nom} className="mep-regle-reglage">
                  {x.nom} = {String(x.valeur).replace(".", ",")}
                </code>
              ))}
            </dd>
          </div>
        ) : null}
        {r.controle ? (
          <div>
            <dt>Contrôle</dt>
            <dd>
              <code>{r.controle}</code>
            </dd>
          </div>
        ) : null}
        <div>
          <dt>Source</dt>
          <dd>
            {r.source} · {r.depuis.split("-").reverse().slice(0, 2).join("/")}
          </dd>
        </div>
      </dl>
    </li>
  );
}

export default function ListeRegles({ regles }: { regles: readonly RegleVue[] }) {
  const [statut, setStatut] = useState<Statut | null>(null);
  const [famille, setFamille] = useState<"interdit" | "preference" | null>(null);
  const [profil, setProfil] = useState<Profil | null>(null);
  const [lecons, setLecons] = useState<EtatLecons>({ etat: "attente" });

  useEffect(() => {
    let vivant = true;
    fetch("/api/admin/atelier/mise-en-page/lecons?bilan=regles", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then((j: { lecons?: LeconComptee[]; migration?: boolean }) => {
        if (vivant) setLecons({ etat: "pret", comptes: correctionsParRegle(Array.isArray(j.lecons) ? j.lecons : []), table: j.migration !== false });
      })
      .catch(() => {
        if (vivant) setLecons({ etat: "erreur" });
      });
    return () => {
      vivant = false;
    };
  }, []);

  const visibles = regles.filter((r) => (statut === null || r.statut === statut) && (famille === null || r.famille === famille)
    && (profil === null || r.profils === "tous" || r.profils.includes(profil)));

  return (
    <>
      <div className="mep-regles-filtres">
        <Pastilles libelle="Statut" valeurs={STATUTS} nom={(s) => NOM_STATUT[s]} choisi={statut} choisir={setStatut} />
        <Pastilles libelle="Famille" valeurs={["interdit", "preference"] as const} nom={(f) => NOM_FAMILLE[f]} choisi={famille} choisir={setFamille} />
        <Pastilles libelle="Profil" valeurs={PROFILS} nom={(p) => NOM_PROFIL[p]} choisi={profil} choisir={setProfil} />
      </div>
      <p className="mep-regles-etat" aria-live="polite">
        {visibles.length} sur {regles.length}
        {lecons.etat === "attente" ? " · leçons en lecture" : lecons.etat === "erreur" ? " · leçons indisponibles" : !lecons.table ? " · aucune leçon en base" : ""}
      </p>
      {DOMAINES.map((d) => {
        const rs = visibles.filter((r) => r.domaine === d);
        if (!rs.length) return null;
        return (
          <section key={d} className="mep-regles-domaine" id={`domaine-${d}`}>
            <h2 className="mep-regles-titre">
              {NOM_DOMAINE[d]} <span>{rs.length}</span>
            </h2>
            <ul className="mep-regles-liste">
              {rs.map((r) => (
                <Carte key={r.id} r={r} lecons={lecons} />
              ))}
            </ul>
          </section>
        );
      })}
      {visibles.length === 0 ? <p className="mep-regles-etat">Aucune règle</p> : null}
    </>
  );
}

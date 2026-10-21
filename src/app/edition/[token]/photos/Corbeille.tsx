"use client";

/* La corbeille du responsable (planche 5 du 20/10, T-199 ; contrat
   `docs/produit/collectif/CONTRAT-PERSONNES-CORBEILLE.md` §3).

   - Une LISTE plutôt qu'une grille : il faut lire qui l'a envoyée, qui l'a
     supprimée et quand, et dans combien de jours elle part pour de bon
     (`joursRestants` du serveur ; sous 3 jours, l'échéance passe en alerte).
   - Restaurer une photo, ou les cochées : elle revient à sa place (son lien, sa
     personne, Ma sélection si elle y était) ; la page le dit (« La voir »).
   - Une route : `POST /api/collectif/photos/corbeille` (`lister`, `restaurer`).
     Le lien d'équipe ne voit jamais cet écran (la route lui répond 403).
   - Sans la migration 20261023, la route répond 503 `migration_personnes_absente` :
     l'écran le dit en une phrase, jamais l'erreur brute.
   Effacer pour de bon reste à l'atelier (sa fiche) : rien ici ne l'appelle. */

import { useEffect, useState } from "react";
import { DELAI_CORBEILLE_JOURS } from "@/lib/collectif/corbeille";
import { ERREUR_PERSONNES_ABSENTE } from "@/lib/collectif/migration";
import { echeanceTexte, enLots, instantCourt, jourDeLInstant, nombre } from "./filtres";
import { ICONES, Trace } from "./Grille";

/** Une photo de la corbeille, telle que la route la rend (`VuePhotoCorbeille`, corbeilleServeur.ts). */
export type PhotoCorbeille = {
  id: string;
  vignette: string | null;
  nom: string | null;
  qui: string;
  lien: string;
  lienNom: string;
  supprimeeLe: string;
  supprimeePar: "auteur" | "responsable" | "atelier";
  parQui: string;
  effaceeLe: string | null;
  joursRestants: number;
  alerte: boolean;
  selection: boolean;
};

type Etat = { genre: "lecture" } | { genre: "absente" } | { genre: "erreur" } | { genre: "ok"; photos: PhotoCorbeille[] };

/** La phrase sobre quand la base n'a pas encore la migration (jamais le nom du fichier SQL). */
export const BASE_PAS_A_JOUR = "La mise à jour de la base n'est pas encore appliquée";

const FERMER = "M6 6l12 12M18 6 6 18";

/**
 * `version` : le nombre de photos que la page compte. Quand il change (un participant a supprimé une photo de son
 * téléphone, le sondage de la page l'a vu), la liste se relit d'elle-même, sans repasser par « Chargement ».
 */
export default function Corbeille({ token, tu, version, onRestaurees }: { token: string; tu: boolean; version: number; onRestaurees: (photos: PhotoCorbeille[]) => void }) {
  const v = (vous: string, toi: string) => (tu ? toi : vous);
  const [etat, setEtat] = useState<Etat>({ genre: "lecture" });
  const [coches, setCoches] = useState<ReadonlySet<string>>(new Set());
  const [modeCocher, setModeCocher] = useState(false);
  const [occupe, setOccupe] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);

  useEffect(() => {
    let fini = false;
    void (async () => {
      try {
        const rep = await fetch("/api/collectif/photos/corbeille", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ token, action: "lister" }) });
        const json = (await rep.json().catch(() => ({}))) as { error?: string; photos?: PhotoCorbeille[] };
        if (fini) return;
        if (rep.status === 503 && json.error === ERREUR_PERSONNES_ABSENTE) setEtat({ genre: "absente" });
        else if (!rep.ok || !Array.isArray(json.photos)) setEtat({ genre: "erreur" });
        else {
          const lues = json.photos;
          setEtat({ genre: "ok", photos: lues });
          /* Une photo cochée qui n'est plus à la corbeille (restaurée ailleurs, effacée) se décoche. */
          const presentes = new Set(lues.map((x) => x.id));
          setCoches((c) => (c.size && [...c].some((id) => !presentes.has(id)) ? new Set([...c].filter((id) => presentes.has(id))) : c));
        }
      } catch {
        if (!fini) setEtat({ genre: "erreur" });
      }
    })();
    return () => {
      fini = true;
    };
  }, [token, version]);

  const photos = etat.genre === "ok" ? etat.photos : [];
  const n = etat.genre === "ok" ? photos.length : null;
  const tout = photos.length > 0 && photos.every((x) => coches.has(x.id));

  function basculer(id: string) {
    setCoches((c) => {
      const s = new Set(c);
      if (s.has(id)) s.delete(id);
      else s.add(id);
      return s;
    });
  }

  /** Restaurer : par lots de 500, l'un après l'autre ; ce qui est revenu quitte la liste. */
  async function restaurer(ids: string[]) {
    if (occupe || !ids.length) return;
    setOccupe(true);
    setErreur(null);
    const revenues: string[] = [];
    try {
      for (const lot of enLots(ids)) {
        const rep = await fetch("/api/collectif/photos/corbeille", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ token, action: "restaurer", photoIds: lot }) });
        const json = (await rep.json().catch(() => ({}))) as { error?: string; ids?: unknown };
        if (!rep.ok) {
          setErreur(rep.status === 503 && json.error === ERREUR_PERSONNES_ABSENTE ? `${BASE_PAS_A_JOUR} : rien n'a changé.` : `La restauration n'a pas abouti (erreur ${rep.status}). Réessayer.`);
          break;
        }
        if (Array.isArray(json.ids)) revenues.push(...json.ids.filter((x): x is string => typeof x === "string"));
      }
    } catch {
      setErreur("Le réseau n'a pas répondu. Rien n'a changé.");
    } finally {
      setOccupe(false);
    }
    if (!revenues.length) return;
    const parti = new Set(revenues);
    const retour = photos.filter((x) => parti.has(x.id));
    setEtat((e) => (e.genre === "ok" ? { genre: "ok", photos: e.photos.filter((x) => !parti.has(x.id)) } : e));
    setCoches((c) => new Set([...c].filter((id) => !parti.has(id))));
    onRestaurees(retour);
  }

  const restaurerLibelle = coches.size > 1 ? `Restaurer les ${nombre(coches.size)} cochées` : "Restaurer la cochée";

  return (
    <div className={`ec-cb${modeCocher ? " ec-cb--cocher" : ""}`}>
      <div className="ec-cb-tete">
        <div className="ec-ph-zone-titres">
          <h2 className="ec-ph-zone-titre ec-cb-titre">
            <span className="ec-cb-titre-ic ec-ph-ordi" aria-hidden="true">
              <Trace d={ICONES.corbeille} taille={22} epais={1.6} />
            </span>
            Corbeille
          </h2>
          <span className="ec-note">
            {n !== null ? (
              <>
                <b>{nombre(n)}</b> photo{n > 1 ? "s" : ""} ·{" "}
              </>
            ) : null}
            {`${DELAI_CORBEILLE_JOURS} jours pour changer d'avis`}
          </span>
        </div>
        <div className="ec-ph-outils">
          {coches.size ? (
            <button type="button" className="ec-bouton ec-bouton--clair ec-bouton--petit ec-ph-ordi" disabled={occupe} onClick={() => void restaurer([...coches])}>
              <Trace d={ICONES.restaurer} taille={15} epais={1.8} />
              {restaurerLibelle}
            </button>
          ) : null}
          {photos.length ? (
            <button
              type="button"
              className={modeCocher ? "ec-ph-pilule ec-ph-pilule--on ec-ph-tel" : "ec-ph-pilule ec-ph-tel"}
              aria-pressed={modeCocher}
              onClick={() => {
                setModeCocher((m) => !m);
                setCoches(new Set());
              }}
            >
              Cocher
            </button>
          ) : null}
        </div>
      </div>

      <div className="ec-collecte-grille ec-ph-defile ec-defile ec-cb-defile">
        <p className="ec-cb-info">
          <Trace d={ICONES.info} taille={16} epais={1.8} />
          <span className="ec-ph-ordi">
            Une photo supprimée <b>disparaît tout de suite pour tout le monde</b> et ne part pas à l&apos;atelier. Elle reste ici <b>{DELAI_CORBEILLE_JOURS} jours</b>, puis elle est effacée pour de bon. Restaurée, elle revient à sa place : son lien, sa personne, {v("votre", "ta")} sélection.
          </span>
          <span className="ec-ph-tel">
            Supprimée, une photo <b>disparaît pour tout le monde</b> et ne part pas à l&apos;atelier. Elle s&apos;efface pour de bon {DELAI_CORBEILLE_JOURS} jours après.
          </span>
        </p>

        {erreur ? (
          <p className="ec-note ec-note--erreur" role="alert">
            {erreur}
          </p>
        ) : null}

        {etat.genre === "lecture" ? <p className="ec-note ec-ph-chargement">Chargement de la corbeille…</p> : null}
        {etat.genre === "absente" ? (
          <div className="ec-a-venir ec-cb-absente" role="status">
            <p className="ec-texte">
              <b>{BASE_PAS_A_JOUR}.</b>
              {" La corbeille s'ouvrira dès qu'elle le sera ; aucune photo n'y est pour l'instant."}
            </p>
          </div>
        ) : null}
        {etat.genre === "erreur" ? (
          <div className="ec-a-venir">
            <p className="ec-texte">La corbeille n&apos;a pas pu se charger. Réessayer en rechargeant la page.</p>
          </div>
        ) : null}
        {etat.genre === "ok" && !photos.length ? (
          <div className="ec-a-venir">
            <p className="ec-texte">La corbeille est vide. Une photo supprimée y reste {DELAI_CORBEILLE_JOURS} jours, puis elle est effacée pour de bon.</p>
          </div>
        ) : null}

        {photos.length ? (
          <>
            <button
              type="button"
              className={modeCocher ? "ec-cb-tout" : "ec-cb-tout ec-ph-ordi"}
              aria-pressed={tout}
              onClick={() => setCoches(tout ? new Set() : new Set(photos.map((x) => x.id)))}
            >
              <span className={tout ? "ec-ph-case ec-ph-case--on" : "ec-ph-case"}>{tout ? <Trace d={ICONES.coche} taille={12} epais={3} /> : null}</span>
              {tout ? "Tout décocher" : `Tout cocher (${nombre(photos.length)})`}
            </button>
            <ul className="ec-cb-liste">
              {photos.map((x) => {
                const on = coches.has(x.id);
                return (
                  <li key={x.id} className={on ? "ec-cb-ligne ec-cb-ligne--cochee" : "ec-cb-ligne"}>
                    <button type="button" className="ec-cb-case" aria-pressed={on} aria-label={on ? "Décocher cette photo" : "Cocher cette photo"} onClick={() => basculer(x.id)}>
                      <span className={on ? "ec-ph-case ec-ph-case--on" : "ec-ph-case"}>{on ? <Trace d={ICONES.coche} taille={12} epais={3} /> : null}</span>
                    </button>
                    <span className="ec-cb-vign" aria-hidden="true">
                      {x.vignette ? <img src={x.vignette} alt="" loading="lazy" decoding="async" draggable={false} /> : null}
                    </span>
                    <span className="ec-cb-txt">
                      <b>
                        {x.qui} · {x.lienNom}
                      </b>
                      <span className="ec-ph-ordi">{[x.nom, `supprimée ${x.parQui}, ${instantCourt(x.supprimeeLe)}`].filter(Boolean).join(" · ")}</span>
                      <span className="ec-ph-tel">{`${x.parQui}, ${jourDeLInstant(x.supprimeeLe)}`}</span>
                    </span>
                    <span className={x.alerte ? "ec-cb-echeance ec-cb-echeance--alerte" : "ec-cb-echeance"}>{echeanceTexte(x.joursRestants)}</span>
                    <button type="button" className="ec-bouton ec-bouton--clair ec-bouton--petit ec-cb-restaurer" disabled={occupe} onClick={() => void restaurer([x.id])}>
                      <Trace d={ICONES.restaurer} taille={15} epais={1.8} />
                      Restaurer
                    </button>
                  </li>
                );
              })}
            </ul>
          </>
        ) : null}
      </div>

      {/* Téléphone : cocher plusieurs photos, « Restaurer » sous le pouce. */}
      {modeCocher ? (
        <div className="ec-ph-bas ec-ph-tel ec-cb-bas" role="toolbar" aria-label="Agir sur les photos cochées">
          <button
            type="button"
            className="ec-ph-x"
            aria-label="Quitter le mode cocher"
            onClick={() => {
              setModeCocher(false);
              setCoches(new Set());
            }}
          >
            <Trace d={FERMER} taille={18} epais={2} />
          </button>
          <b>
            {nombre(coches.size)} cochée{coches.size > 1 ? "s" : ""}
          </b>
          <button type="button" className="ec-bouton ec-bouton--petit ec-ph-droite" disabled={occupe || !coches.size} onClick={() => void restaurer([...coches])}>
            <Trace d={ICONES.restaurer} taille={15} epais={1.8} />
            Restaurer
          </button>
        </div>
      ) : null}
    </div>
  );
}

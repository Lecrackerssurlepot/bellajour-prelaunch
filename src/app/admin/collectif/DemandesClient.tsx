"use client";

/* L'étape « À envoyer par le client » du formulaire d'une édition (T-191,
   planche 12 du 19/10 au soir, validée par Mathias) : la même pour la création
   et pour les réglages.

   - Une ligne par DEMANDE : l'icône de sa forme, son NOM (écrit par l'atelier,
     modifiable en place : c'est ce que le client lit), en petit ce que le
     client voit, la FORME en pastille segmentée (Images, PDF ou SVG, Tout ; ou
     Questionnaire, Fichier pour le « mot de… »), la poubelle.
   - « + Ajouter une demande » et ses modèles en un clic : Logo, Programme,
     Le mot de… (le nom à compléter), Liste des participants, Autre.
   - En bas, « Ce que voit le client, dans « À envoyer » ».

   Les règles sont dans `@/lib/collectif/demandes` (pur), relues par
   `lireSaisieEdition` avant l'envoi et par la route : ce composant ne fait que
   les montrer. Une demande d'avant T-191 (une clé « logo »…) reste écrite
   comme avant tant qu'on n'y touche pas : son client ne voit rien changer.

   La migration 20261021 : sans elle, une demande NOUVELLE se crée (c'est du
   jsonb) et se voit chez le client, mais ce qu'il y envoie est refusé.
   L'écran le DIT, après UNE sonde par chargement de page
   (`/api/admin/collectif/demandes`, qui n'écrit rien). */

import { useEffect, useId, useRef, useSyncExternalStore } from "react";
import {
  aideAtelier,
  changerForme,
  DEMANDES_MAX,
  demandesDuFormulaire,
  estCleHeritee,
  formeAffichee,
  FORMES_FICHIER,
  iconeDe,
  lireDemandesSaisies,
  MODELES_DEMANDE,
  nettoyerNom,
  nomInacheve,
  NOM_DEMANDE_MAX,
  nouvelleCle,
  renommer,
  versBase,
  type Demande,
  type DemandeEnBase,
} from "@/lib/collectif/demandes";
import "./demandes.css";

/* ─────────────── la sonde de la migration : une fois par chargement ─────────────── */

type EtatSonde = { migration: "appliquee" | "absente" | "inconnue"; fichier: string } | null;
let sonde: EtatSonde = null;
let lancee = false;
const abonnes = new Set<() => void>();

function abonner(f: () => void) {
  abonnes.add(f);
  if (!lancee) {
    lancee = true;
    fetch("/api/admin/collectif/demandes", { cache: "no-store" })
      .then((r) => (r.ok ? (r.json() as Promise<EtatSonde>) : null))
      .catch(() => null)
      .then((j) => {
        sonde = j && j.migration ? j : { migration: "inconnue", fichier: "" };
        for (const a of abonnes) a();
      });
  }
  return () => {
    abonnes.delete(f);
  };
}

/** Un nombre dans [0, 1[ tiré par le navigateur (la clé d'une demande neuve). */
function hasard(): number {
  const a = new Uint32Array(1);
  crypto.getRandomValues(a);
  return a[0] / 4294967296;
}

const POUBELLE = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true">
    <path d="M4 7h16M10 11v6M14 11v6M6 7l1 12a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-12M9 7V4h6v3" />
  </svg>
);

type Props = {
  /** `contenus_demandes` du formulaire : des clés d'origine, ou `{ cle, nom, forme }`. */
  valeur: DemandeEnBase[];
  onChange: (valeur: DemandeEnBase[]) => void;
  /** L'erreur de `lireSaisieEdition` sur ce champ (un nom vide, deux noms pareils…). */
  erreur?: string;
};

export default function DemandesClient({ valeur, onChange, erreur }: Props) {
  const uid = useId();
  const demandes = demandesDuFormulaire(valeur);
  const etat = useSyncExternalStore(abonner, () => sonde, () => null);
  /* La ligne qu'on vient d'ajouter prend le curseur (« Le mot de… » se complète, « Autre » se nomme). */
  const aFocaliser = useRef<string | null>(null);
  useEffect(() => {
    const cle = aFocaliser.current;
    if (!cle) return;
    aFocaliser.current = null;
    const champ = document.getElementById(`${uid}-${cle}`) as HTMLInputElement | null;
    if (!champ) return;
    champ.focus();
    champ.setSelectionRange(champ.value.length, champ.value.length);
  });

  const emettre = (liste: Demande[]) => onChange(liste.map(versBase));
  const remplacer = (cle: string, d: Demande) => emettre(demandes.map((x) => (x.cle === cle ? d : x)));
  const plein = demandes.length >= DEMANDES_MAX;

  function ajouter(m: (typeof MODELES_DEMANDE)[number]) {
    if (plein) return;
    const cle = nouvelleCle(demandes.map((d) => d.cle), hasard);
    aFocaliser.current = cle;
    emettre([...demandes, { cle, nom: m.nom, forme: m.forme, heritee: false }]);
  }

  const nouvelles = demandes.filter((d) => !estCleHeritee(d.cle));
  const migrationManque = etat?.migration === "absente" && nouvelles.length > 0;
  /* Après un essai refusé, l'erreur suit la saisie (la même règle, relue à chaque frappe) : une
     demande corrigée ou retirée ne laisse pas un message qui ne la concerne plus. */
  const aCorriger = erreur ? lireDemandesSaisies(valeur).erreurs.join(" ") : "";

  return (
    <div className="eca-dem">
      {demandes.length ? (
        <ul className="eca-dem-liste">
          {demandes.map((d) => {
            const on = formeAffichee(d);
            const nom = nettoyerNom(d.nom);
            return (
              <li key={d.cle} className="eca-dem-ligne">
                <span className="eca-dem-ico" aria-hidden="true">
                  {iconeDe(d)}
                </span>
                <span className="eca-dem-nom">
                  <input
                    id={`${uid}-${d.cle}`}
                    className="eca-dem-champ"
                    value={d.nom}
                    maxLength={NOM_DEMANDE_MAX}
                    placeholder="Le nom que lira le client"
                    aria-label="Nom de la demande, tel que le client le lit"
                    aria-invalid={aCorriger && (!nom || nomInacheve(nom)) ? true : undefined}
                    onChange={(e) => remplacer(d.cle, renommer(d, e.target.value))}
                  />
                  <small>{aideAtelier(d)}</small>
                </span>
                <span className="eca-dem-formes" role="radiogroup" aria-label={`Ce que le client envoie pour « ${nom || "cette demande"} »`}>
                  {d.forme === "questionnaire" ? (
                    <>
                      <button type="button" role="radio" aria-checked={true}>
                        Questionnaire
                      </button>
                      <button type="button" role="radio" aria-checked={false} onClick={() => remplacer(d.cle, changerForme(d, "tout"))}>
                        Fichier
                      </button>
                    </>
                  ) : (
                    FORMES_FICHIER.map((f) => (
                      <button key={f.cle} type="button" role="radio" aria-checked={on === f.cle} onClick={() => remplacer(d.cle, changerForme(d, f.cle))}>
                        {f.libelle}
                      </button>
                    ))
                  )}
                </span>
                <button
                  type="button"
                  className="eca-dem-poubelle"
                  aria-label={`Retirer « ${nom || "cette demande"} »`}
                  title="Retirer"
                  onClick={() => emettre(demandes.filter((x) => x.cle !== d.cle))}
                >
                  {POUBELLE}
                </button>
              </li>
            );
          })}
        </ul>
      ) : null}

      <div className="eca-dem-modeles" role="group" aria-label="Ajouter une demande">
        <b>+ Ajouter une demande</b>
        {MODELES_DEMANDE.map((m) => (
          <button key={m.cle} type="button" disabled={plein} onClick={() => ajouter(m)}>
            {m.libelle}
          </button>
        ))}
      </div>
      {plein ? <span className="eca-champ-aide">{`${DEMANDES_MAX} demandes au plus : en retirer une pour en ajouter une autre.`}</span> : null}
      {aCorriger ? (
        <span className="eca-champ-erreur" role="alert">
          {aCorriger}
        </span>
      ) : null}

      <div className="eca-dem-client" aria-label="Ce que voit le client">
        <span className="eca-dem-client-titre">Ce que voit le client, dans « À envoyer »</span>
        {demandes.length ? (
          demandes.map((d) => {
            const nom = nettoyerNom(d.nom);
            return (
              <span key={d.cle} className={nom ? "eca-dem-client-puce" : "eca-dem-client-puce eca-dem-client-puce--vide"}>
                <i aria-hidden="true">○</i>
                {nom || "à nommer"}
              </span>
            );
          })
        ) : (
          <span className="eca-dem-client-rien">{"Rien : la ligne « À envoyer » n'apparaît pas dans son espace."}</span>
        )}
      </div>

      {migrationManque ? (
        <p className="eca-encart eca-dem-migration" role="status">
          {`Mise à jour de la base à appliquer (${etat?.fichier.replace(/^supabase\/migrations\//, "")}) : tant qu'elle manque, le client voit ${nouvelles.map((d) => `« ${nettoyerNom(d.nom) || "à nommer"} »`).join(", ")}, mais ce qu'il y envoie est refusé. Les demandes d'origine (logo, programme, mot du dirigeant, liste, rubrique) marchent déjà, même renommées.`}
        </p>
      ) : null}
    </div>
  );
}

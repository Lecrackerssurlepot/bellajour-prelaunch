"use client";

/* Une personne (planche 4 du 20/10, T-198 ; contrat §3, `POST /api/collectif/personnes`).

   Choisie dans la liste « Personne », par « Voir ses N photos » de la photo
   agrandie, ou par la ligne du bas au téléphone, elle a une FICHE au-dessus de
   ses photos : son nom, son adresse MASQUÉE (« l•••@audencia.com », jamais
   entière : c'est le serveur qui masque), ses liens, ses téléphones, sa
   dernière arrivée.
   - Renommer : prénom ET nom ; toutes ses photos suivent (le nom vit sur les
     photos, la grille reste rangée par nom).
   - Les doublons sont PROPOSÉS par le serveur (« Léa Martin » et « Lea
     Martin », « Léa » et « Léa Martin » sur un même lien), jamais fusionnés
     d'office : « Fusionner » ouvre une fenêtre où l'on choisit le nom gardé
     (`garder`). « Ignorer » les range, pour cet écran.
   - Défaire une fusion : l'atelier seul (sa fiche), rien ici ne l'appelle.
   Le lien d'équipe voit la fiche, sans geste ni adresse ni proposition. */

import { useState } from "react";
import type { Arbre } from "@/lib/collectif/dossiers";
import Fenetre from "../../_composants/Fenetre";
import { arriveeCourte, initialesDe, nombre, nomDuLien, photosDe, phraseNomPropose, pourChercher, prenomEtNom, raisonTexte, type PersonneVue, type Proposition } from "./filtres";
import { ICONES, Trace } from "./Grille";

/* Ses liens par nom ; un lien que la page ne nomme pas (le lien d'équipe ne voit pas les liens) ne s'écrit pas. */
const liensDe = (arbre: Arbre | null, p: Pick<PersonneVue, "liens">) => [...new Set(p.liens.map((l) => nomDuLien(arbre, l.cle)).filter((x): x is string => Boolean(x)))].join(", ");
const telephones = (n: number) => (n > 0 ? `${nombre(n)} téléphone${n > 1 ? "s" : ""}` : "");

export function FichePersonne(f: {
  /** Le nom de la grille (la liste « Personne »), montré tant que la fiche se lit. */
  nomGrille: string;
  fiche: { personne: PersonneVue; propositions: Proposition[] } | null;
  /** La liste des personnes ne s'est pas lue : la fiche le dit, la grille reste. */
  erreur: boolean;
  avecAdresses: boolean;
  arbre: Arbre | null;
  ecrire: boolean;
  /** Le nombre de photos de la vue (le bouton « Tout cocher »). */
  totalVue: number | null;
  /** Le fil (ordinateur) : « Toutes les photos › », ou le lien ouvert. */
  fil: React.ReactNode;
  tu: boolean;
  /** Renommer ; `propose` : un autre nom tapé avec son adresse, que la fenêtre propose (jamais écrit d'office). */
  onRenommer: (propose?: string) => void;
  onFusionner: (autre: PersonneVue | null) => void;
  onToutCocher: () => void;
  onCocher: () => void;
}) {
  const [ignorees, setIgnorees] = useState(false);
  const p = f.fiche?.personne ?? null;
  const nom = p?.nom ?? f.nomGrille;
  const liens = p ? liensDe(f.arbre, p) : "";
  const derniere = p?.derniere ? arriveeCourte(p.derniere) : "";
  const email = p ? (p.email ?? (f.avecAdresses && !p.participant ? "sans adresse" : null)) : null;
  const meta = [email, liens, p ? telephones(p.telephones) : "", derniere ? `dernière arrivée ${derniere}` : ""].filter(Boolean).join(" · ");
  const metaTel = [p ? photosDe(p.n) : "", liens, p ? telephones(p.telephones) : "", derniere ? `dernière ${derniere}` : ""].filter(Boolean).join(" · ");
  const propositions = f.ecrire && !ignorees ? (f.fiche?.propositions ?? []) : [];

  return (
    <div className="ec-pe">
      {f.fil}
      <div className="ec-pe-carte">
        <span className="ec-pe-avatar" aria-hidden="true">
          {initialesDe(nom)}
        </span>
        <div className="ec-pe-id">
          <h2 className="ec-pe-nom">{nom}</h2>
          {email ? <span className="ec-pe-email ec-ph-tel">{email}</span> : null}
          {meta ? <span className="ec-pe-meta ec-ph-ordi">{meta}</span> : null}
          {metaTel ? <span className="ec-pe-meta ec-ph-tel">{metaTel}</span> : null}
          {f.erreur ? <span className="ec-note">Les détails de cette personne n&apos;ont pas pu se lire. Ses photos sont là.</span> : null}
          {f.ecrire && p?.nomPropose ? (
            <p className="ec-pe-propose" role="note">
              <span>{phraseNomPropose(p.nomPropose, f.tu)}</span>{" "}
              <button type="button" className="ec-ph-lien" onClick={() => p.nomPropose && f.onRenommer(p.nomPropose.nom)}>
                Renommer
              </button>
            </p>
          ) : null}
        </div>
        {f.ecrire && p ? (
          <div className="ec-pe-gestes">
            <button type="button" className="ec-ph-pilule ec-pe-geste" onClick={() => f.onRenommer()}>
              <Trace d={ICONES.crayon} taille={15} epais={1.7} />
              Renommer
            </button>
            <button type="button" className="ec-ph-pilule ec-pe-geste" onClick={() => f.onFusionner(null)}>
              <Trace d={ICONES.fusionner} taille={15} epais={1.7} />
              <span className="ec-ph-ordi">Fusionner avec…</span>
              <span className="ec-ph-tel">Fusionner</span>
            </button>
            {f.totalVue ? (
              <button type="button" className="ec-ph-pilule ec-pe-geste ec-ph-ordi" onClick={f.onToutCocher}>
                Tout cocher ({nombre(f.totalVue)})
              </button>
            ) : null}
            <button type="button" className="ec-ph-pilule ec-pe-geste ec-ph-tel" onClick={f.onCocher}>
              Cocher
            </button>
          </div>
        ) : null}
      </div>

      {propositions.length ? (
        <div className="ec-pe-doublons">
          <div className="ec-pe-doublons-tete">
            <b>Peut-être la même personne</b>
            <button type="button" className="ec-ph-lien ec-ph-lien--doux" onClick={() => setIgnorees(true)}>
              Ignorer
            </button>
          </div>
          {propositions.map(({ personne: o, raison }) => (
            <div key={o.ref} className="ec-pe-doublon">
              <span className="ec-ph-ini ec-ph-ini--grand" aria-hidden="true">
                {initialesDe(o.nom)}
              </span>
              <span className="ec-pe-doublon-txt">
                <span className="ec-pe-doublon-l1">
                  <b>{o.nom}</b>
                  <span className="ec-pe-raison">{raisonTexte(raison, nom, o.nom)}</span>
                </span>
                <span className="ec-pe-doublon-l2">{[liensDe(f.arbre, o), photosDe(o.n), o.email ?? (f.avecAdresses && !o.participant ? "sans adresse" : null)].filter(Boolean).join(" · ")}</span>
              </span>
              <button type="button" className="ec-ph-pilule ec-pe-geste ec-pe-fusionner" onClick={() => f.onFusionner(o)}>
                <Trace d={ICONES.fusionner} taille={15} epais={1.7} />
                Fusionner
              </button>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}

/** Renommer (planche 4E) : prénom ET nom, l'effet dit avant le geste. `propose` : l'autre nom tapé avec son adresse, pré-rempli, jamais écrit sans le geste. */
export function FenetreRenommer(r: { personne: PersonneVue; propose: string | null; tu: boolean; occupe: boolean; erreur: string | null; onFermer: () => void; onGarder: (prenom: string, nom: string) => void }) {
  const depart = r.propose ? prenomEtNom({ prenom: null, nomDeFamille: null, nom: r.propose }) : prenomEtNom(r.personne);
  const [prenom, setPrenom] = useState(depart.prenom);
  const [nom, setNom] = useState(depart.nom);
  const pret = Boolean(prenom.trim() && nom.trim()) && !r.occupe;
  const garder = () => pret && r.onGarder(prenom, nom);
  const n = r.personne.n;
  const effet = `${n > 1 ? `Ses ${nombre(n)} photos suivent` : "Sa photo suit"}, sur tous les liens. Le nouveau nom se lit partout : ici, chez l'atelier, sur ses vignettes et sur son téléphone (« ${r.tu ? "Tu envoies" : "Vous envoyez"} en tant que … »).`;
  return (
    <Fenetre titre="Renommer" onFermer={r.onFermer}>
      <div className="ec-pe-feuille">
        <span className="ec-pe-libelle">Le nom de cette personne</span>
        <div className="ec-pe-champs">
          <label className="ec-curseur">
            Prénom
            <input className="ec-champ" value={prenom} maxLength={80} autoFocus autoComplete="off" onChange={(e) => setPrenom(e.target.value)} onKeyDown={(e) => e.key === "Enter" && garder()} />
          </label>
          <label className="ec-curseur">
            Nom
            <input className="ec-champ" value={nom} maxLength={80} autoComplete="off" onChange={(e) => setNom(e.target.value)} onKeyDown={(e) => e.key === "Enter" && garder()} />
          </label>
        </div>
        <p className="ec-note">{effet}</p>
        {r.erreur ? (
          <p className="ec-note ec-note--erreur" role="alert">
            {r.erreur}
          </p>
        ) : null}
        <button type="button" className="ec-bouton ec-bouton--plein ec-pe-valider" disabled={!pret} onClick={garder}>
          Renommer
        </button>
      </div>
    </Fenetre>
  );
}

/** Fusionner deux personnes (planche 4B) : côte à côte, le nom gardé, l'effet en une phrase. */
export function FenetreFusion(z: {
  personne: PersonneVue;
  autre: PersonneVue | null;
  /** Les autres personnes de l'édition (« Fusionner avec… ») : les doublons proposés d'abord. */
  candidates: PersonneVue[];
  arbre: Arbre | null;
  avecAdresses: boolean;
  occupe: boolean;
  erreur: string | null;
  onFermer: () => void;
  onFusionner: (autre: PersonneVue, garder: "cible" | "source") => void;
}) {
  const [autre, setAutre] = useState<PersonneVue | null>(z.autre);
  const [cherche, setCherche] = useState("");
  const [garder, setGarder] = useState<"cible" | "source">("cible");
  const p = z.personne;
  const trouvees = (cherche.trim() ? z.candidates.filter((x) => pourChercher(x.nom).includes(pourChercher(cherche))) : z.candidates).slice(0, 8);
  const carte = (x: PersonneVue) => (
    <div className="ec-pe-carte-mini">
      <b>{x.nom}</b>
      <span>{[photosDe(x.n), liensDe(z.arbre, x)].filter(Boolean).join(" · ")}</span>
      <span>{x.email ?? (z.avecAdresses && !x.participant ? "sans adresse" : "")}</span>
    </div>
  );
  const nomGarde = autre && garder === "source" ? autre.nom : p.nom;
  const adresses = autre ? [p, autre].filter((x) => x.participant).length : 0;
  const phraseAdresses =
    adresses === 2
      ? "Les deux adresses mènent ensuite à cette personne, sur chacun de ses téléphones."
      : adresses === 1
        ? "Son adresse mène ensuite à cette personne, sur chacun de ses téléphones."
        : "";
  return (
    <Fenetre titre="Fusionner deux personnes" onFermer={z.onFermer} large>
      <div className="ec-pe-feuille">
        {autre ? (
          <>
            <div className="ec-pe-paire">
              {carte(p)}
              <span className="ec-pe-paire-ic" aria-hidden="true">
                <Trace d={ICONES.fusionner} taille={18} epais={1.7} />
              </span>
              {carte(autre)}
            </div>
            {!z.autre ? (
              <button type="button" className="ec-ph-lien ec-ph-lien--doux ec-pe-changer" onClick={() => setAutre(null)}>
                Choisir une autre personne
              </button>
            ) : null}
            {p.nom !== autre.nom ? (
              <fieldset className="ec-pe-garde">
                <legend>Le nom gardé</legend>
                {(["cible", "source"] as const).map((g) => (
                  <label key={g} className={garder === g ? "ec-pe-choix ec-pe-choix--on" : "ec-pe-choix"}>
                    <input type="radio" name="ec-pe-garder" className="ec-pe-radio" checked={garder === g} onChange={() => setGarder(g)} />
                    <span>{g === "cible" ? p.nom : autre.nom}</span>
                  </label>
                ))}
              </fieldset>
            ) : null}
            <p className="ec-texte ec-pe-effet">
              Les <b>{photosDe(p.n + autre.n)}</b> sont rangées sous <b>{nomGarde}</b>, sur tous les liens.
              {phraseAdresses ? ` ${phraseAdresses}` : ""}
              {" Rien n'est effacé, et le journal garde la fusion : l'atelier peut la défaire."}
            </p>
          </>
        ) : (
          <div className="ec-pe-choisir">
            <span className="ec-pe-libelle">{`Fusionner « ${p.nom} » avec`}</span>
            <label className="ec-ph-cherche">
              <Trace d="M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14zM20 20l-4-4" taille={15} epais={1.8} />
              <input type="search" value={cherche} placeholder="Chercher une personne" aria-label="Chercher une personne" autoFocus onChange={(e) => setCherche(e.target.value)} />
            </label>
            <div className="ec-pe-candidates">
              {trouvees.map((x) => (
                <button key={x.ref} type="button" className="ec-ph-li ec-ph-li--grand" onClick={() => setAutre(x)}>
                  <span className="ec-ph-ini" aria-hidden="true">
                    {initialesDe(x.nom)}
                  </span>
                  <span className="ec-ph-nom">{x.nom}</span>
                  <span className="ec-ph-n">{nombre(x.n)}</span>
                </button>
              ))}
              {!trouvees.length ? <p className="ec-note">Personne de ce nom.</p> : null}
            </div>
          </div>
        )}
        {z.erreur ? (
          <p className="ec-note ec-note--erreur" role="alert">
            {z.erreur}
          </p>
        ) : null}
        <div className="ec-envoi-gestes">
          <button type="button" className="ec-bouton ec-bouton--clair" onClick={z.onFermer}>
            Annuler
          </button>
          <button type="button" className="ec-bouton" disabled={!autre || z.occupe} onClick={() => autre && z.onFusionner(autre, garder)}>
            Fusionner
          </button>
        </div>
      </div>
    </Fenetre>
  );
}

"use client";

/* Le formulaire d'une édition : le même pour l'ouvrir (/nouvelle) et pour la
   régler (la fiche). La règle est dans `@/lib/collectif/saisie`, relue par la
   route ; ce composant ne fait que la montrer.

   ⚠️ AUCUN CHIFFRE PRÉ-REMPLI. Un champ chiffré vide part vide, la base le
   garde à null et la fiche l'écrit [À FIXER] (PRD §0.3, §12). Les valeurs des
   maquettes (30, 2000, 300, 24, 120, 2, 3) sont des exemples, pas des
   décisions.

   La clôture se tape à l'heure de PARIS et part en instant ISO avec fuseau
   (`instantDeParis`) : l'heure de la machine n'est pas celle de Paris. */

import { useState } from "react";
import { useRouter } from "next/navigation";
import { suggestionEmail } from "@/lib/atelier/questionnaire";
import { instantDeParis } from "@/lib/collectif/dates";
import { MAX_MAGAZINES } from "@/lib/collectif/saisie";
import { CONTENUS } from "@/lib/collectif/types";

export type MagazineFormulaire = { id: string | null; nom: string; vide: boolean };

export type ValeursEdition = {
  organisation: string;
  evenement: string;
  dates_texte: string;
  registre: string;
  cloture_local: string;
  plafond_participant_atelier: string;
  plafond_total: string;
  preselection_max: string;
  pagination_prevue: string;
  tirage: string;
  tours_inclus: string;
  nb_propositions_couverture: string;
  couvertures_aimees_max: string;
  styles_segment: string;
  contenus_demandes: string[];
  invitation_texte: string;
  responsable_email: string;
  responsable_nom: string;
  rdv_url: string;
  magazines: MagazineFormulaire[];
};

type Props =
  | { mode: "creation"; initiales: ValeursEdition }
  | { mode: "modification"; id: string; initiales: ValeursEdition; plafondClient: number | null };

type Erreurs = Record<string, string>;

const CHIFFRES: { champ: keyof ValeursEdition; label: string; aide?: string; min: number }[] = [
  { champ: "plafond_participant_atelier", label: "Photos au plus par participant", aide: "Le responsable peut baisser ce nombre, jamais le dépasser.", min: 1 },
  { champ: "plafond_total", label: "Photos au plus pour toute l'édition", aide: "Compte tout le monde sauf l'atelier.", min: 1 },
  { champ: "preselection_max", label: "Présélection remise à l'atelier", aide: "Le client peut présélectionner, jamais obligé.", min: 0 },
];

const CHIFFRES_BAT: { champ: keyof ValeursEdition; label: string; aide?: string; min: number }[] = [
  { champ: "pagination_prevue", label: "Pagination prévue au devis", aide: "Indicative. La pagination réelle est lue dans chaque PDF déposé.", min: 1 },
  { champ: "tirage", label: "Tirage prévu au devis", min: 1 },
  { champ: "tours_inclus", label: "Tours de corrections inclus", min: 1 },
  { champ: "nb_propositions_couverture", label: "Propositions de couverture au premier tour", aide: "Le client les voit avec le premier bon à tirer.", min: 1 },
];

export default function FormulaireEdition(props: Props) {
  const router = useRouter();
  const [v, setV] = useState<ValeursEdition>(props.initiales);
  const [erreurs, setErreurs] = useState<Erreurs>({});
  const [message, setMessage] = useState<{ ok: boolean; texte: string } | null>(null);
  const [envoi, setEnvoi] = useState(false);

  const maj = <K extends keyof ValeursEdition>(champ: K, valeur: ValeursEdition[K]) => {
    setV((x) => ({ ...x, [champ]: valeur }));
    setMessage(null);
  };

  const suggestion = v.responsable_email.includes("@") ? suggestionEmail(v.responsable_email.trim().toLowerCase()) : null;

  async function envoyer(e: React.FormEvent) {
    e.preventDefault();
    if (envoi) return;
    const locales: Erreurs = {};
    let cloture_le = "";
    if (v.cloture_local.trim()) {
      const iso = instantDeParis(v.cloture_local);
      if (!iso) locales.cloture_le = "Cette heure n'existe pas à Paris (changement d'heure) ou la date est illisible.";
      else cloture_le = iso;
    }
    if (Object.keys(locales).length) {
      setErreurs(locales);
      return;
    }

    const corps = {
      organisation: v.organisation,
      evenement: v.evenement,
      dates_texte: v.dates_texte,
      registre: v.registre,
      cloture_le,
      plafond_participant_atelier: v.plafond_participant_atelier,
      plafond_total: v.plafond_total,
      preselection_max: v.preselection_max,
      pagination_prevue: v.pagination_prevue,
      tirage: v.tirage,
      tours_inclus: v.tours_inclus,
      nb_propositions_couverture: v.nb_propositions_couverture,
      couvertures_aimees_max: v.couvertures_aimees_max,
      styles_segment: v.styles_segment,
      contenus_demandes: v.contenus_demandes,
      invitation_texte: v.invitation_texte,
      responsable_email: v.responsable_email,
      responsable_nom: v.responsable_nom,
      rdv_url: v.rdv_url,
      magazines: v.magazines.map((m) => ({ id: m.id, nom: m.nom })),
    };

    setEnvoi(true);
    setErreurs({});
    setMessage(null);
    try {
      const rep = await fetch(
        props.mode === "creation" ? "/api/admin/collectif/editions" : `/api/admin/collectif/editions/${props.id}`,
        {
          method: props.mode === "creation" ? "POST" : "PATCH",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(corps),
        }
      );
      const json = (await rep.json().catch(() => ({}))) as {
        id?: string;
        error?: string;
        erreurs?: { champ: string; message: string }[];
      };
      if (!rep.ok) {
        if (json.erreurs?.length) {
          const parChamp: Erreurs = {};
          for (const er of json.erreurs) parChamp[er.champ] = parChamp[er.champ] ? `${parChamp[er.champ]} ${er.message}` : er.message;
          setErreurs(parChamp);
          setMessage({ ok: false, texte: "Rien n'est enregistré : corriger les champs signalés." });
        } else if (json.error === "migration_collectif_absente") {
          setMessage({ ok: false, texte: "La migration collectif n'est pas appliquée." });
        } else {
          setMessage({ ok: false, texte: `Rien n'est enregistré (erreur ${rep.status}). Réessayer.` });
        }
        return;
      }
      if (props.mode === "creation" && json.id) {
        router.push(`/admin/collectif/${json.id}`);
        return;
      }
      setMessage({ ok: true, texte: "Enregistré." });
      router.refresh();
    } catch {
      setMessage({ ok: false, texte: "Le réseau n'a pas répondu. Rien n'est enregistré." });
    } finally {
      setEnvoi(false);
    }
  }

  const erreur = (champ: string) =>
    erreurs[champ] ? (
      <span className="eca-champ-erreur" role="alert">
        {erreurs[champ]}
      </span>
    ) : null;

  const texteChamp = (champ: keyof ValeursEdition, label: string, opts: { requis?: boolean; aide?: string; large?: boolean; type?: string } = {}) => (
    <label className={`eca-champ${opts.large ? " eca-champ--large" : ""}`}>
      <span className="eca-champ-label">
        {label}
        {opts.requis ? " *" : ""}
      </span>
      <input
        className="eca-input"
        type={opts.type ?? "text"}
        value={v[champ] as string}
        onChange={(e) => maj(champ, e.target.value as never)}
        required={opts.requis}
      />
      {opts.aide ? <span className="eca-champ-aide">{opts.aide}</span> : null}
      {erreur(champ)}
    </label>
  );

  const chiffre = (c: { champ: keyof ValeursEdition; label: string; aide?: string; min: number }) => (
    <label className="eca-champ" key={c.champ}>
      <span className="eca-champ-label">{c.label}</span>
      <input
        className="eca-input"
        type="number"
        inputMode="numeric"
        min={c.min}
        step={1}
        value={v[c.champ] as string}
        placeholder="[À FIXER]"
        onChange={(e) => maj(c.champ, e.target.value as never)}
      />
      {c.aide ? <span className="eca-champ-aide">{c.aide}</span> : null}
      {erreur(c.champ)}
    </label>
  );

  const dernier = v.magazines[v.magazines.length - 1];
  const peutRetirer = v.magazines.length > 1 && dernier && (dernier.id === null || dernier.vide);

  return (
    <form className="eca-form" onSubmit={envoyer} noValidate>
      <fieldset className="eca-fieldset">
        <legend className="eca-legende">Le client et l&apos;événement</legend>
        <div className="eca-champs">
          {texteChamp("organisation", "Organisation", { requis: true })}
          {texteChamp("evenement", "Nom de l'événement", { requis: true })}
          {texteChamp("dates_texte", "Dates de l'événement", { aide: "En clair, tel que le client le lira (ex. du 2 au 4 octobre)." })}
          <label className="eca-champ">
            <span className="eca-champ-label">Registre *</span>
            <select className="eca-select" value={v.registre} onChange={(e) => maj("registre", e.target.value)}>
              <option value="entreprise_vous">Entreprise, vouvoiement</option>
              <option value="ecole_tu">École, tutoiement</option>
            </select>
            {erreur("registre")}
          </label>
        </div>
      </fieldset>

      <fieldset className="eca-fieldset">
        <legend className="eca-legende">La collecte des photos</legend>
        <div className="eca-champs">
          <label className="eca-champ">
            <span className="eca-champ-label">Clôture de la collecte</span>
            <input
              className="eca-input"
              type="datetime-local"
              value={v.cloture_local}
              onChange={(e) => maj("cloture_local", e.target.value)}
            />
            <span className="eca-champ-aide">Heure de Paris. Le lien participants se ferme tout seul à cette heure-là.</span>
            {erreur("cloture_le")}
          </label>
          {CHIFFRES.map(chiffre)}
          {props.mode === "modification" ? (
            <p className="eca-champ eca-champ-aide">
              Réglé par le responsable au curseur :{" "}
              {props.plafondClient === null ? "pas encore (le plafond de l'atelier s'applique)" : `${props.plafondClient} photos par personne`}.
            </p>
          ) : null}
          <label className="eca-champ eca-champ--large">
            <span className="eca-champ-label">Message d&apos;accueil du lien participants</span>
            <textarea
              className="eca-textarea"
              value={v.invitation_texte}
              onChange={(e) => maj("invitation_texte", e.target.value)}
            />
            <span className="eca-champ-aide">La phrase d&apos;invitation que lisent les participants. Rien n&apos;est promis à leur place.</span>
            {erreur("invitation_texte")}
          </label>
        </div>
      </fieldset>

      <fieldset className="eca-fieldset">
        <legend className="eca-legende">Le magazine et le bon à tirer</legend>
        <div className="eca-champs">
          {CHIFFRES_BAT.map(chiffre)}
          {texteChamp("responsable_email", "E-mail du responsable du bon à tirer", {
            requis: true,
            type: "email",
            aide: "Une seule personne, la seule à pouvoir choisir le style, noter et valider.",
          })}
          {texteChamp("responsable_nom", "Nom du responsable")}
          {suggestion ? (
            <p className="eca-encart eca-champ--large">
              Faute de frappe ? Vouliez-vous dire <strong>{suggestion}</strong> ?{" "}
              <button type="button" className="adm-btn adm-btn--ghost" onClick={() => maj("responsable_email", suggestion)}>
                Corriger
              </button>
            </p>
          ) : null}
          {texteChamp("rdv_url", "Lien de rendez-vous (Google)", {
            large: true,
            type: "url",
            aide: "La page de prise de rendez-vous, ouverte dans un nouvel onglet. https:// seulement.",
          })}
        </div>
      </fieldset>

      <fieldset className="eca-fieldset">
        <legend className="eca-legende">Les magazines et le mur des styles</legend>
        <div className="eca-champs">
          <div className="eca-champ eca-champ--large">
            <span className="eca-champ-label">Magazines *</span>
            <div className="eca-magazines">
              {v.magazines.map((m, i) => (
                <div className="eca-magazine" key={m.id ?? `nouveau-${i}`}>
                  <span className="eca-magazine-rang">Magazine {i + 1}</span>
                  <input
                    className="eca-input"
                    value={m.nom}
                    placeholder="Le séminaire, la soirée…"
                    onChange={(e) =>
                      maj(
                        "magazines",
                        v.magazines.map((x, j) => (j === i ? { ...x, nom: e.target.value } : x))
                      )
                    }
                  />
                </div>
              ))}
            </div>
            <div className="eca-barre">
              <button
                type="button"
                className="adm-btn adm-btn--ghost"
                disabled={v.magazines.length >= MAX_MAGAZINES}
                onClick={() => maj("magazines", [...v.magazines, { id: null, nom: "", vide: true }])}
              >
                Ajouter un magazine
              </button>
              {peutRetirer ? (
                <button
                  type="button"
                  className="adm-btn adm-btn--ghost"
                  onClick={() => maj("magazines", v.magazines.slice(0, -1))}
                >
                  Retirer le dernier
                </button>
              ) : null}
            </div>
            <span className="eca-champ-aide">
              Dans un magazine, tout l&apos;intérieur suit le style choisi ; seule la couverture peut venir d&apos;un autre style.
            </span>
            {erreur("magazines")}
          </div>
          {chiffre({ champ: "couvertures_aimees_max", label: "Couvertures aimées au plus, par magazine", min: 0 })}
          <label className="eca-champ">
            <span className="eca-champ-label">Styles proposés sur le mur</span>
            <select className="eca-select" value={v.styles_segment} onChange={(e) => maj("styles_segment", e.target.value)}>
              <option value="tous">Tous</option>
              <option value="entreprise">Entreprise seulement</option>
              <option value="ecole">École seulement</option>
            </select>
          </label>
        </div>
      </fieldset>

      <fieldset className="eca-fieldset">
        <legend className="eca-legende">Ce qu&apos;on demande au client dans son espace</legend>
        <div className="eca-cases">
          {CONTENUS.map((c) => (
            <label className="eca-case" key={c.cle}>
              <input
                type="checkbox"
                checked={v.contenus_demandes.includes(c.cle)}
                onChange={(e) =>
                  maj(
                    "contenus_demandes",
                    e.target.checked ? [...v.contenus_demandes, c.cle] : v.contenus_demandes.filter((x) => x !== c.cle)
                  )
                }
              />
              {c.libelle}
            </label>
          ))}
        </div>
        {props.mode === "creation" ? (
          <p className="eca-champ-aide" style={{ marginTop: 12 }}>
            <label className="eca-case eca-case--eteinte">
              <input type="checkbox" disabled /> Édition de démonstration
            </label>{" "}
            Arrive plus tard (photos et notes fictives, aucun mail, hors chiffres).
          </p>
        ) : null}
      </fieldset>

      <div className="eca-barre">
        <button type="submit" className="adm-btn" disabled={envoi}>
          {envoi
            ? "Enregistrement…"
            : props.mode === "creation"
              ? "Créer l'édition et obtenir les liens"
              : "Enregistrer les modifications"}
        </button>
        {message ? (
          <p className={`eca-message ${message.ok ? "eca-message--ok" : "eca-message--erreur"}`} role="status">
            {message.texte}
          </p>
        ) : null}
        {props.mode === "creation" ? (
          <p className="eca-champ-aide">Aucun mail ne part à cette étape. Vous envoyez les liens vous-même, après relecture.</p>
        ) : null}
      </div>
    </form>
  );
}

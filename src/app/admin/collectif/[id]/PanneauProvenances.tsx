"use client";

/* Les liens de contribution d'une édition, vus de l'ATELIER (T-201) : le nom que
   le responsable leur a donné, leur règle (le nombre de photos par personne),
   ce qu'ils ont reçu, actif ou supprimé ; copier le lien, l'afficher en grand
   (QR, T-197) ; et en CRÉER un, sans passer par le lien du responsable.

   Pour Audencia (8 bateaux, une dizaine de personnes par lien) : préparer les
   huit liens avant de remettre l'espace au responsable lui épargne une étape.
   Le vocabulaire est celui de l'espace du client (« lien de contribution »,
   « photos par personne », « Sans limite »). Les règles sont celles de la
   création par le responsable (`lirePlafondLien`, de 5 à 100 ou sans limite,
   borné par le plafond de l'atelier), relues par le serveur.

   Ouverte aussi depuis l'écran « L'édition est créée » (planche 5C du 21/10,
   « Préparer les groupes maintenant ») : `onCree` y fait suivre le compte de la
   carte « Les liens des participants ». */

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { lienDeGroupe } from "@/lib/collectif/liens";
import { CURSEUR_LIEN, RACCOURCIS_LIEN } from "@/lib/collectif/plafonds";
import type { LienFiche } from "../donnees";
import Pastille from "../Pastille";
import FenetreQrAtelier from "./FenetreQrAtelier";
/* Le dessin de `Pastille` (le nombre de photos par personne) : la fiche le charge avec le formulaire, l'écran
   « L'édition est créée » non (planche 5C, 21/10 : la carte s'y ouvre aussi). Next ne le charge qu'une fois. */
import "../formulaire.css";

/** Un lien, avec son adresse à copier (la clé `?p=` n'est jamais écrite dans le journal). */
export type LienCarte = Omit<LienFiche, "cle"> & { url: string };

const pluriel = (n: number, mot: string) => `${n.toLocaleString("fr-FR")} ${mot}${n > 1 ? "s" : ""}`;

export default function PanneauProvenances({
  id,
  liens,
  depot,
  max,
  ouverte,
  archivee,
  cloture,
  onCree,
}: {
  id: string;
  liens: LienCarte[];
  /** L'adresse de dépôt des participants : celle d'un lien est celle-ci suivie de `?p=<clé>`. */
  depot: string;
  /** Le plus de photos par personne qu'un lien peut porter (`plafondLienMax`). */
  max: number;
  /** La collecte reçoit encore des photos. */
  ouverte: boolean;
  archivee: boolean;
  /** « 4 novembre » : la clôture, pour la feuille à imprimer ; vide si aucune. */
  cloture: string;
  /** Un lien vient d'être écrit (l'écran qui ouvre la carte suit son compte). */
  onCree?: (lien: LienCarte) => void;
}) {
  const router = useRouter();
  const min = Math.min(CURSEUR_LIEN.min, max);
  const [ajoutes, setAjoutes] = useState<LienCarte[]>([]);
  const [nom, setNom] = useState("");
  const [valeur, setValeur] = useState(String(Math.min(30, max)));
  const [sansLimite, setSansLimite] = useState(false);
  const [occupe, setOccupe] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const [fait, setFait] = useState<string | null>(null);
  const [copie, setCopie] = useState<string | null>(null);
  const [grand, setGrand] = useState<LienCarte | null>(null);
  const champ = useRef<HTMLInputElement>(null);

  /* Ce que la route vient d'écrire s'affiche aussitôt ; la relecture (`router.refresh()`) le confirme, et
     le même lien relu ne se montre pas deux fois. */
  const affiches = [...liens, ...ajoutes.filter((a) => !liens.some((l) => l.id === a.id))];
  const actifs = affiches.filter((l) => !l.retire).length;
  const n = Number(valeur);
  const valeurInvalide = !sansLimite && valeur !== "" && (!Number.isInteger(n) || n < min || n > max);

  async function copier(l: LienCarte) {
    try {
      await navigator.clipboard.writeText(l.url);
      setCopie(l.id);
      setTimeout(() => setCopie((c) => (c === l.id ? null : c)), 2000);
    } catch {
      setErreur("Copie impossible : ouvrir le QR en grand, ou copier le lien à la main depuis le lien du responsable.");
    }
  }

  async function creer() {
    setErreur(null);
    setFait(null);
    if (!nom.trim()) {
      setErreur("Donner un nom au lien : le bateau, le groupe, l'équipe.");
      champ.current?.focus();
      return;
    }
    if (!sansLimite && (!Number.isInteger(n) || n < min || n > max)) {
      setErreur(`Choisir un nombre de photos entre ${min} et ${max}, ou « Sans limite ».`);
      return;
    }
    setOccupe(true);
    try {
      const rep = await fetch(`/api/admin/collectif/editions/${id}/provenances`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(sansLimite ? { libelle: nom, sansPlafond: true } : { libelle: nom, plafond: n }),
      });
      const json = (await rep.json().catch(() => null)) as { message?: unknown; journal?: unknown; lien?: LienFiche } | null;
      if (!rep.ok || !json?.lien) {
        setErreur(typeof json?.message === "string" ? json.message : `Le lien n'a pas été créé (erreur ${rep.status}).`);
        return;
      }
      const { cle, ...lien } = json.lien;
      setAjoutes((a) => [...a, { ...lien, url: lienDeGroupe(depot, cle) }]);
      onCree?.({ ...lien, url: lienDeGroupe(depot, cle) });
      setFait(`Le lien « ${lien.nom} » est créé.${json.journal === false ? " Il n'a pas pu être noté au journal." : ""}`);
      setNom("");
      champ.current?.focus();
      router.refresh();
    } catch {
      setErreur("Le réseau n'a pas répondu. Aucun lien n'a été créé.");
    } finally {
      setOccupe(false);
    }
  }

  const detailsQr = (l: LienCarte) => `${l.plafondTexte}${cloture ? `, ouvert jusqu'au ${cloture}` : ""}`;

  return (
    <section className="eca-carte">
      <span className="eca-carte-tete">
        <h2 className="eca-carte-titre">Liens de contribution</h2>
        <span className="eca-puce">{affiches.length ? `${actifs} actif${actifs > 1 ? "s" : ""}` : "aucun"}</span>
      </span>
      <p className="eca-champ-aide">
        Un lien par bateau, par équipe ou par groupe : chacun dépose depuis son téléphone, sans compte, et ses photos arrivent sous son nom.
      </p>

      {affiches.length ? (
        <ul className="eca-lc">
          {affiches.map((l) => (
            <li key={l.id} className={l.retire ? "eca-lc-ligne eca-lc-ligne--retire" : "eca-lc-ligne"}>
              <span className="eca-lc-tete">
                <strong className="eca-lc-nom">{l.nom}</strong>
                <span className={l.retire ? "eca-puce eca-puce--gris" : "eca-puce eca-puce--vert"}>{l.retire ? "Supprimé" : "Actif"}</span>
              </span>
              <span className="eca-sous">{l.plafondTexte}</span>
              <span className="eca-sous">
                {pluriel(l.personnes, "personne")} · {pluriel(l.photos, "photo")}
              </span>
              {l.retire ? null : (
                <span className="eca-lc-gestes">
                  <button type="button" className="adm-btn adm-btn--ghost" onClick={() => copier(l)}>
                    {copie === l.id ? "Copié" : "Copier le lien"}
                  </button>
                  <button type="button" className="adm-btn adm-btn--ghost" onClick={() => setGrand(l)}>
                    Afficher en grand
                  </button>
                </span>
              )}
            </li>
          ))}
        </ul>
      ) : (
        <p className="eca-vide">Aucun lien de contribution pour l&apos;instant : un lien par groupe, chacun sous son nom.</p>
      )}

      {archivee ? (
        <p className="eca-bandeau">L&apos;édition est archivée : la récupérer pour créer un lien.</p>
      ) : (
        <form
          className="eca-lc-form"
          onSubmit={(e) => {
            e.preventDefault();
            void creer();
          }}
        >
          <h3 className="eca-lc-sous-titre">Créer un lien</h3>
          <label className="eca-champ">
            <span className="eca-champ-label">Nom du lien</span>
            <input
              ref={champ}
              className="eca-input"
              value={nom}
              maxLength={80}
              autoComplete="off"
              placeholder="Bateau 1, Équipe Lyon, Le photographe…"
              onChange={(e) => setNom(e.target.value)}
            />
          </label>
          <div className="eca-champ">
            <span className="eca-champ-label">
              Photos par personne
            </span>
            <div className="eca-lc-plafond">
              {sansLimite ? (
                <span className="eca-lc-sans-limite">Sans limite</span>
              ) : (
                <Pastille
                  id="lc-plafond"
                  valeur={valeur}
                  onChange={setValeur}
                  unite="photos par personne"
                  min={min}
                  vide="à fixer"
                  libelle="Photos par personne"
                  invalide={valeurInvalide}
                  rapides={RACCOURCIS_LIEN.filter((r) => r <= max)}
                />
              )}
              <button type="button" className="adm-btn adm-btn--ghost" aria-pressed={sansLimite} onClick={() => setSansLimite(!sansLimite)}>
                {sansLimite ? "Fixer un nombre" : "Sans limite"}
              </button>
            </div>
            <span className="eca-champ-aide">
              {sansLimite
                ? "Chaque personne dépose autant qu'elle veut, dans la limite du total de l'édition."
                : `De ${min} à ${max} photos par personne${max < CURSEUR_LIEN.max ? " (le plafond de l'atelier)" : ""}.`}
            </span>
          </div>
          {ouverte ? null : <p className="eca-champ-aide">La collecte est close : ce lien ne recevra rien tant qu&apos;elle n&apos;est pas rouverte.</p>}
          {erreur ? (
            <p className="eca-message eca-message--erreur" role="alert">
              {erreur}
            </p>
          ) : null}
          {fait ? (
            <p className="eca-message eca-message--ok" role="status">
              {fait}
            </p>
          ) : null}
          <div className="eca-barre">
            <button type="submit" className="adm-btn" disabled={occupe}>
              {occupe ? "Création…" : "Créer le lien"}
            </button>
          </div>
        </form>
      )}

      {grand ? <FenetreQrAtelier nom={grand.nom} url={grand.url} details={detailsQr(grand)} onFermer={() => setGrand(null)} /> : null}
    </section>
  );
}

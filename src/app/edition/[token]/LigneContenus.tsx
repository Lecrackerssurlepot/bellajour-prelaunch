"use client";

/* « À envoyer à l'atelier » (PRD §14.2, retours du 14/10 point 3, maquette
   Contenus validée) : une puce par contenu demandé dans la fiche, cochée quand
   il est reçu, avec le nombre de fichiers. Un clic ouvre la fenêtre :
   - rien de reçu : la zone d'envoi (un ou plusieurs fichiers), ou le
     questionnaire du mot du dirigeant, question par question ;
   - déjà reçu : CE QUE L'ATELIER A REÇU, à revoir (aperçu d'une image, ou
     « Ouvrir »), avec « Remplacer » sur chaque fichier et « Ajouter un autre
     fichier » ; pour le questionnaire, les réponses et « Modifier ».
   Un fichier remplacé reste à l'atelier comme ancienne version : rien ne se
   perd. Le lien d'équipe revoit ce qui est reçu, sans rien pouvoir envoyer.

   T-191 (19/10) : les puces sont les DEMANDES de l'atelier, sous le nom qu'il
   a choisi (« Le mot du proviseur »), avec leur forme : un fichier refusé dit
   pourquoi AVANT de partir (« Seulement une image »), par la même règle que
   la route (`lireFichierDemande`). Une édition d'avant garde exactement son
   écran (demandes héritées). */

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { contenuClient, QUESTIONS_MOT } from "@/lib/collectif/contenus";
import { accepteDe, lireFichierDemande, type VueDemande } from "@/lib/collectif/demandes";
import Fenetre from "../_composants/Fenetre";
import { useVisionneuse } from "../_composants/Visionneuse";
import type { EnvoiClient } from "./donnees";

/** À partir de combien de contenus demandés la ligne « À envoyer » prend toute la largeur. */
const LIGNE_LONGUE = 3;

type Props = { token: string; demandes: VueDemande[]; envois: EnvoiClient[]; ecrire: boolean; tu: boolean };

export default function LigneContenus(p: Props) {
  const [ouvert, setOuvert] = useState<VueDemande | null>(null);
  /* Ce qui vient d'être envoyé se montre TOUT DE SUITE, puce et fenêtre (la
     route rend l'envoi) : la relecture de la page le confirme ensuite, sans
     qu'on dépende d'elle (vu le 14/10 : elle n'arrive pas toujours). */
  const [ajoutes, setAjoutes] = useState<EnvoiClient[]>([]);
  const [retires, setRetires] = useState<string[]>([]);
  const envois = courantsAffiches(p.envois, ajoutes, retires, p.demandes);
  const contenus = p.demandes;
  if (!contenus.length) return null;
  /* Règle de Mathias (15/10) : à partir de TROIS choses à envoyer, la ligne
     prend toute la largeur pour qu'on les voie toutes, et le message de
     l'atelier passe dessous. */
  const longue = contenus.length >= LIGNE_LONGUE;
  return (
    <section className={longue ? "ec-tdb-ligne ec-tdb-ligne--longue" : "ec-tdb-ligne"} aria-labelledby="ec-tdb-contenus">
      <span className="ec-tdb-etiquette ec-tdb-etiquette--sourde" id="ec-tdb-contenus">
        3 · À envoyer
      </span>
      <div className="ec-tdb-puces">
        {contenus.map((c) => {
          const n = envois.filter((e) => e.type === c.cle).length;
          return (
            <button
              key={c.cle}
              type="button"
              className={n ? "ec-tdb-puce ec-tdb-puce--recue" : "ec-tdb-puce"}
              disabled={!p.ecrire && !n}
              onClick={() => setOuvert(c)}
              title={p.ecrire ? (n ? "Revoir, remplacer ou ajouter un fichier" : "Envoyer à l'atelier") : undefined}
              aria-label={`${c.libelle}${n ? `, reçu${n > 1 ? `, ${n} fichiers` : ""}` : ", à envoyer"}`}
            >
              <span className="ec-tdb-coche" aria-hidden="true">
                {n ? "✓" : ""}
              </span>
              <span className="ec-tdb-puce-nom">
                {c.libelle}
                {n > 1 ? ` · ${n} fichiers` : ""}
              </span>
            </button>
          );
        })}
      </div>
      {ouvert ? (
        <FenetreContenu
          token={p.token}
          contenu={ouvert}
          recus={envois.filter((e) => e.type === ouvert.cle)}
          ecrire={p.ecrire}
          tu={p.tu}
          onEnvoye={(envoi, remplace) => {
            setAjoutes((l) => [...l, envoi]);
            if (remplace) setRetires((l) => [...l, remplace]);
          }}
          onFermer={() => setOuvert(null)}
        />
      ) : null}
    </section>
  );
}

/** Les envois du serveur, plus ceux de cette page, moins les remplacés ; le questionnaire garde sa réponse la plus récente. */
function courantsAffiches(serveur: EnvoiClient[], ajoutes: EnvoiClient[], retires: string[], demandes: VueDemande[]): EnvoiClient[] {
  const tous = [...serveur, ...ajoutes.filter((a) => !serveur.some((s) => s.id === a.id))].filter((e) => !retires.includes(e.id));
  const mode = (type: string) => demandes.find((d) => d.cle === type)?.mode ?? contenuClient(type)?.mode;
  const mots = tous.filter((e) => mode(e.type) === "questionnaire");
  const dernierMot = new Map(mots.map((e) => [e.type, e.id]));
  return tous.filter((e) => mode(e.type) !== "questionnaire" || dernierMot.get(e.type) === e.id);
}

function extension(nom: string | null): string {
  return /\.([A-Za-z0-9]{1,5})$/.exec(nom ?? "")?.[1].toUpperCase() ?? "FICHIER";
}

function FenetreContenu({
  token,
  contenu,
  recus,
  ecrire,
  tu,
  onEnvoye,
  onFermer,
}: {
  token: string;
  contenu: VueDemande;
  recus: EnvoiClient[];
  ecrire: boolean;
  tu: boolean;
  /** L'envoi qui vient d'arriver (et le fichier qu'il remplace) : la ligne le montre tout de suite. */
  onEnvoye: (envoi: EnvoiClient, remplace: string | null) => void;
  onFermer: () => void;
}) {
  const router = useRouter();
  const v = (vous: string, toi: string) => (tu ? toi : vous);
  const [occupe, setOccupe] = useState<string | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);
  const [fait, setFait] = useState<string | null>(null);
  const [survol, setSurvol] = useState(false);
  const [modifier, setModifier] = useState(false);
  const vision = useVisionneuse();
  const [question, setQuestion] = useState(0);
  const courants = recus;
  const deja = courants[0]?.reponses ?? null;
  const [reponses, setReponses] = useState<string[]>(QUESTIONS_MOT.map((q) => deja?.[q] ?? ""));
  /* Deux champs : AJOUTER prend plusieurs fichiers, REMPLACER un seul. */
  const ajout = useRef<HTMLInputElement>(null);
  const remplacement = useRef<HTMLInputElement>(null);
  /** Le fichier que le prochain choix remplace (`null` : on en ajoute). */
  const remplace = useRef<string | null>(null);

  async function envoyer(corps: FormData | string): Promise<boolean> {
    setErreur(null);
    const remplaceAvant = remplace.current;
    try {
      const rep = await fetch("/api/collectif/contenus", {
        method: "POST",
        headers: typeof corps === "string" ? { "content-type": "application/json" } : undefined,
        body: corps,
      });
      const json = (await rep.json().catch(() => ({}))) as { message?: string; envoi?: EnvoiClient; remplace?: string | null };
      if (!rep.ok) {
        setErreur(json.message ?? `Non envoyé (erreur ${rep.status}).`);
        return false;
      }
      if (json.envoi) onEnvoye(json.envoi, json.remplace ?? remplaceAvant);
      return true;
    } catch {
      setErreur("Le réseau n'a pas répondu. Rien n'est parti.");
      return false;
    }
  }

  /** Un ou plusieurs fichiers, l'un après l'autre ; « Remplacer » n'en prend qu'un. */
  async function envoyerFichiers(liste: FileList | File[] | null | undefined) {
    const fichiers = [...(liste ?? [])];
    if (!fichiers.length) return;
    const cible = remplace.current;
    const lot = cible ? fichiers.slice(0, 1) : fichiers;
    let arrives = 0;
    for (const [i, f] of lot.entries()) {
      /* La forme de la demande, AVANT de rien envoyer : la même règle que la route. */
      const lu = lireFichierDemande(contenu, f.name, f.size, f.type);
      if (!lu.ok) {
        setErreur(lot.length > 1 ? `${f.name} : ${lu.message}` : lu.message);
        break;
      }
      setOccupe(lot.length > 1 ? `Envoi ${i + 1} sur ${lot.length}…` : "Envoi…");
      const d = new FormData();
      d.set("token", token);
      d.set("type", contenu.cle);
      d.set("fichier", f);
      if (cible) d.set("remplace", cible);
      if (!(await envoyer(d))) break;
      arrives++;
    }
    setOccupe(null);
    remplace.current = null;
    if (arrives) {
      setFait(cible ? "Remplacé. L'ancienne version reste à l'atelier." : arrives > 1 ? `${arrives} fichiers arrivés à l'atelier. Merci.` : "C'est arrivé à l'atelier. Merci.");
      router.refresh();
    }
  }

  function choisir(cible: string | null) {
    remplace.current = cible;
    (cible ? remplacement : ajout).current?.click();
  }

  async function envoyerReponses() {
    setOccupe("Envoi…");
    const ok = await envoyer(JSON.stringify({ token, type: contenu.cle, reponses }));
    setOccupe(null);
    if (ok) {
      setFait("C'est arrivé à l'atelier. Merci.");
      setModifier(false);
      router.refresh();
    }
  }

  const accept = accepteDe(contenu);
  /* Les réponses se rangent sous la question au vouvoiement (`QUESTIONS_MOT`) ; l'écran lit celle de l'édition. */
  const libelleQuestion = (q: string) => contenu.questions[QUESTIONS_MOT.indexOf(q as (typeof QUESTIONS_MOT)[number])] ?? q;
  const entree = (
    <>
      <input
        ref={ajout}
        type="file"
        multiple
        hidden
        accept={accept}
        onChange={(e) => {
          remplace.current = null;
          void envoyerFichiers(e.target.files);
          e.target.value = "";
        }}
      />
      <input
        ref={remplacement}
        type="file"
        hidden
        accept={accept}
        onChange={(e) => {
          void envoyerFichiers(e.target.files);
          e.target.value = "";
        }}
      />
    </>
  );
  const etat = (
    <>
      {occupe ? (
        <p className="ec-note" role="status">
          {occupe}
        </p>
      ) : fait ? (
        <p className="ec-note ec-note--ok" role="status">
          {fait}
        </p>
      ) : null}
      {erreur ? (
        <p className="ec-note ec-note--erreur" role="alert">
          {erreur}
        </p>
      ) : null}
    </>
  );

  /* Le questionnaire déjà rempli : les réponses, et « Modifier ». */
  if (contenu.mode === "questionnaire" && courants.length && !modifier) {
    const r = courants[0];
    return (
      <Fenetre titre={contenu.titre} sous={`Reçu le ${r.recuLe}. L'atelier écrit le texte à partir de ces réponses.`} onFermer={onFermer} large>
        <dl className="ec-reponses">
          {Object.entries(r.reponses ?? {}).map(([q, rep]) => (
            <div key={q}>
              <dt>{libelleQuestion(q)}</dt>
              <dd>{rep}</dd>
            </div>
          ))}
        </dl>
        {etat}
        {ecrire ? (
          <button type="button" className="ec-bouton ec-bouton--clair" onClick={() => { setFait(null); setModifier(true); }}>
            Modifier {v("vos", "tes")} réponses
          </button>
        ) : null}
      </Fenetre>
    );
  }

  /* Des fichiers déjà reçus : les revoir, remplacer, ajouter. */
  if (contenu.mode === "fichier" && courants.length) {
    return (
      <Fenetre titre={contenu.titre} sous={ecrire ? "Ce que l'atelier a reçu. Remplacez un fichier, ou ajoutez-en un." : "Ce que l'atelier a reçu."} onFermer={onFermer} large>
        <ul className="ec-envois-recus">
          {courants.map((e) => (
            <li key={e.id} className="ec-envoi-recu">
              <span className="ec-envoi-apercu">
                {e.apercu ? <img src={e.apercu} alt="" loading="lazy" decoding="async" /> : <span>{extension(e.nom)}</span>}
              </span>
              <span className="ec-envoi-recu-texte">
                <strong>{e.nom ?? contenu.libelle}</strong>
                <span className="ec-note">
                  Envoyé le {e.recuLe}
                  {e.efface ? ` · ${e.efface}` : null}
                </span>
              </span>
              <span className="ec-envoi-recu-gestes">
                {e.url ? (
                  <button
                    type="button"
                    className="ec-bouton ec-bouton--clair ec-bouton--petit"
                    onClick={() => vision.ouvrir({ titre: e.nom ?? contenu.libelle, sous: `${contenu.libelle} · envoyé le ${e.recuLe}`, voir: e.url as string, telecharger: e.telecharger, nom: e.nom })}
                  >
                    Ouvrir
                  </button>
                ) : null}
                {ecrire ? (
                  <button type="button" className="ec-bouton ec-bouton--clair ec-bouton--petit" disabled={Boolean(occupe)} onClick={() => choisir(e.id)}>
                    Remplacer
                  </button>
                ) : null}
              </span>
            </li>
          ))}
        </ul>
        {vision.rendu}
        {ecrire ? (
          <>
            <button type="button" className="ec-envoi-ajouter" disabled={Boolean(occupe)} onClick={() => choisir(null)}>
              Ajouter un autre fichier
            </button>
            <p className="ec-note">Un fichier remplacé reste à l&apos;atelier, rangé comme ancienne version : rien ne se perd.</p>
          </>
        ) : null}
        {etat}
        {entree}
      </Fenetre>
    );
  }

  return (
    <Fenetre titre={contenu.titre} sous={contenu.aide} onFermer={onFermer}>
      {contenu.mode === "fichier" ? (
        <div
          className={`ec-zone-depot ec-zone-depot--compacte${survol ? " ec-zone-depot--survol" : ""}`}
          onDragOver={(e) => {
            e.preventDefault();
            setSurvol(true);
          }}
          onDragLeave={() => setSurvol(false)}
          onDrop={(e) => {
            e.preventDefault();
            setSurvol(false);
            remplace.current = null;
            void envoyerFichiers(e.dataTransfer.files);
          }}
        >
          <strong className="ec-zone-depot-titre">{v("Glissez le fichier ici", "Glisse le fichier ici")}</strong>
          <span className="ec-note">{contenu.formats} · 4 Mo au plus · plusieurs fichiers possibles</span>
          <button type="button" className="ec-bouton" disabled={Boolean(occupe)} onClick={() => choisir(null)}>
            {occupe ? "Envoi…" : "Choisir un fichier"}
          </button>
          {entree}
        </div>
      ) : (
        <div className="ec-questionnaire">
          <label className="ec-curseur">
            {question + 1}. {contenu.questions[question] ?? QUESTIONS_MOT[question]}
            <textarea
              className="ec-champ ec-zone-texte"
              rows={4}
              value={reponses[question]}
              maxLength={2000}
              onChange={(e) => setReponses((r) => r.map((x, i) => (i === question ? e.target.value : x)))}
            />
          </label>
          <p className="ec-note">
            Question {question + 1} sur {QUESTIONS_MOT.length} · l&apos;atelier écrit le texte à partir de {v("vos", "tes")} réponses
          </p>
          <div className="ec-actions">
            {question > 0 ? (
              <button type="button" className="ec-bouton ec-bouton--clair" onClick={() => setQuestion((q) => q - 1)}>
                Précédente
              </button>
            ) : null}
            {question < QUESTIONS_MOT.length - 1 ? (
              <button type="button" className="ec-bouton" onClick={() => setQuestion((q) => q + 1)}>
                Question suivante
              </button>
            ) : (
              <button type="button" className="ec-bouton" disabled={Boolean(occupe) || reponses.every((r) => !r.trim())} onClick={envoyerReponses}>
                {occupe ? "Envoi…" : "Envoyer à l'atelier"}
              </button>
            )}
          </div>
        </div>
      )}
      {etat}
    </Fenetre>
  );
}

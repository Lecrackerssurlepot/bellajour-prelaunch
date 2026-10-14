"use client";

/* « À envoyer à l'atelier » (PRD §14.2) : une puce par contenu demandé dans
   la fiche, cochée quand il est reçu. Un clic ouvre la fenêtre d'envoi : un
   fichier (logo, programme, liste…) ou le questionnaire du mot du dirigeant,
   question par question. Envoyer de nouveau REMPLACE à l'écran (le plus
   récent gagne) ; rien ne s'efface. Le lien d'équipe voit les puces, sans
   pouvoir rien envoyer. */

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { CONTENUS_CLIENT, QUESTIONS_MOT, type ContenuClient } from "@/lib/collectif/contenus";
import Fenetre from "../_composants/Fenetre";

type Props = { token: string; demandes: string[]; recus: string[]; ecrire: boolean; tu: boolean };

export default function LigneContenus(p: Props) {
  const [ouvert, setOuvert] = useState<ContenuClient | null>(null);
  const contenus = CONTENUS_CLIENT.filter((c) => p.demandes.includes(c.cle));
  if (!contenus.length) return null;
  return (
    <section className="ec-tdb-ligne" aria-labelledby="ec-tdb-contenus">
      <span className="ec-tdb-etiquette ec-tdb-etiquette--sourde" id="ec-tdb-contenus">
        3 · À envoyer à l&apos;atelier
      </span>
      <div className="ec-tdb-puces">
        {contenus.map((c) => {
          const recu = p.recus.includes(c.cle);
          return (
            <button
              key={c.cle}
              type="button"
              className={recu ? "ec-tdb-puce ec-tdb-puce--recue" : "ec-tdb-puce"}
              disabled={!p.ecrire}
              onClick={() => setOuvert(c)}
              aria-label={`${c.libelle}${recu ? ", reçu" : ", à envoyer"}`}
            >
              <span className="ec-tdb-coche" aria-hidden="true">
                {recu ? "✓" : ""}
              </span>
              {c.libelle}
            </button>
          );
        })}
      </div>
      {p.ecrire ? <span className="ec-note ec-tdb-ligne-aide">Cliquez pour envoyer ou remplacer</span> : null}
      {ouvert ? <FenetreContenu token={p.token} contenu={ouvert} recu={p.recus.includes(ouvert.cle)} tu={p.tu} onFermer={() => setOuvert(null)} /> : null}
    </section>
  );
}

function FenetreContenu({ token, contenu, recu, tu, onFermer }: { token: string; contenu: ContenuClient; recu: boolean; tu: boolean; onFermer: () => void }) {
  const router = useRouter();
  const v = (vous: string, toi: string) => (tu ? toi : vous);
  const [occupe, setOccupe] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const [fait, setFait] = useState(false);
  const [survol, setSurvol] = useState(false);
  const [question, setQuestion] = useState(0);
  const [reponses, setReponses] = useState<string[]>(QUESTIONS_MOT.map(() => ""));
  const fichier = useRef<HTMLInputElement>(null);

  async function envoyer(corps: FormData | string) {
    setOccupe(true);
    setErreur(null);
    try {
      const rep = await fetch("/api/collectif/contenus", {
        method: "POST",
        headers: typeof corps === "string" ? { "content-type": "application/json" } : undefined,
        body: corps,
      });
      const json = (await rep.json().catch(() => ({}))) as { message?: string };
      if (!rep.ok) {
        setErreur(json.message ?? `Non envoyé (erreur ${rep.status}).`);
        return;
      }
      setFait(true);
      router.refresh();
    } catch {
      setErreur("Le réseau n'a pas répondu. Rien n'est parti.");
    } finally {
      setOccupe(false);
    }
  }

  function envoyerFichier(f: File | undefined) {
    if (!f) return;
    const d = new FormData();
    d.set("token", token);
    d.set("type", contenu.cle);
    d.set("fichier", f);
    void envoyer(d);
  }

  if (fait) {
    return (
      <Fenetre titre={contenu.titre} onFermer={onFermer}>
        <p className="ec-texte">{v("C'est arrivé à l'atelier. Merci.", "C'est arrivé à l'atelier. Merci.")}</p>
        <button type="button" className="ec-bouton ec-bouton--plein" onClick={onFermer}>
          Terminé
        </button>
      </Fenetre>
    );
  }

  return (
    <Fenetre titre={contenu.titre} sous={contenu.aide} onFermer={onFermer}>
      {recu ? <p className="ec-note">Déjà reçu : un nouvel envoi le remplacera.</p> : null}
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
            envoyerFichier(e.dataTransfer.files[0]);
          }}
        >
          <strong className="ec-zone-depot-titre">{v("Glissez le fichier ici", "Glisse le fichier ici")}</strong>
          <span className="ec-note">{contenu.extensions.map((e) => e.toUpperCase()).join(", ")} · 4 Mo au plus</span>
          <button type="button" className="ec-bouton" disabled={occupe} onClick={() => fichier.current?.click()}>
            {occupe ? "Envoi…" : "Choisir un fichier"}
          </button>
          <input
            ref={fichier}
            type="file"
            hidden
            accept={contenu.extensions.map((e) => `.${e}`).join(",")}
            onChange={(e) => {
              envoyerFichier(e.target.files?.[0]);
              e.target.value = "";
            }}
          />
        </div>
      ) : (
        <div className="ec-questionnaire">
          <label className="ec-curseur">
            {question + 1}. {QUESTIONS_MOT[question]}
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
              <button
                type="button"
                className="ec-bouton"
                disabled={occupe || reponses.every((r) => !r.trim())}
                onClick={() => envoyer(JSON.stringify({ token, type: contenu.cle, reponses }))}
              >
                {occupe ? "Envoi…" : "Envoyer à l'atelier"}
              </button>
            )}
          </div>
        </div>
      )}
      {erreur ? (
        <p className="ec-note ec-note--erreur" role="alert">
          {erreur}
        </p>
      ) : null}
    </Fenetre>
  );
}

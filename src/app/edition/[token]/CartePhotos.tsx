"use client";

/* L'encart « Les photos » du tableau de bord (maquette Espace) : le lien à
   partager aux participants, et le curseur « Photos par participant ».

   Le curseur ne dépasse jamais le plafond de l'atelier (la route et la base
   le refusent aussi). Sans plafond atelier, il ne s'affiche pas : on ne
   règle pas un chiffre que personne n'a fixé. Le lien d'équipe voit tout,
   sans curseur. Le QR code arrive avec la collecte (phase 3). */

import { useState } from "react";

type Props = {
  token: string;
  lienDepot: string;
  photos: number;
  participants: number;
  plafondAtelier: number | null;
  plafondClient: number | null;
  peutRegler: boolean;
  tu: boolean;
};

export default function CartePhotos(p: Props) {
  const [copie, setCopie] = useState(false);
  const [valeur, setValeur] = useState<number | null>(p.plafondClient ?? p.plafondAtelier);
  const [etat, setEtat] = useState<{ ok: boolean; texte: string } | null>(null);
  const v = (vous: string, toi: string) => (p.tu ? toi : vous);

  async function copier() {
    try {
      await navigator.clipboard.writeText(p.lienDepot);
      setCopie(true);
      setTimeout(() => setCopie(false), 2000);
    } catch {
      setEtat({ ok: false, texte: v("Copie impossible : sélectionnez le lien.", "Copie impossible : sélectionne le lien.") });
    }
  }

  async function enregistrer(n: number) {
    setEtat(null);
    try {
      const rep = await fetch("/api/collectif/plafond", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ token: p.token, valeur: n }),
      });
      const json = (await rep.json().catch(() => ({}))) as { message?: string };
      setEtat(rep.ok ? { ok: true, texte: "Enregistré." } : { ok: false, texte: json.message ?? `Non enregistré (erreur ${rep.status}).` });
    } catch {
      setEtat({ ok: false, texte: "Le réseau n'a pas répondu. Non enregistré." });
    }
  }

  return (
    <section className="ec-carte" aria-labelledby="ec-carte-photos">
      <div className="ec-carte-tete">
        <span>2 · Les photos</span>
        <span className={p.photos > 0 ? "ec-statut ec-statut--ok" : "ec-statut"}>{p.photos > 0 ? "En cours" : "À lancer"}</span>
      </div>
      {p.photos > 0 ? (
        <>
          <h2 className="ec-h2" id="ec-carte-photos">
            La collecte avance
          </h2>
          <div className="ec-compteurs">
            <span className="ec-compteur">
              <span className="ec-compteur-n">{p.photos}</span>
              <span className="ec-compteur-l">photos reçues</span>
            </span>
            <span className="ec-compteur">
              <span className="ec-compteur-n">{p.participants}</span>
              <span className="ec-compteur-l">participants</span>
            </span>
          </div>
        </>
      ) : (
        <>
          <h2 className="ec-h2" id="ec-carte-photos">
            Aucune photo pour l&apos;instant
          </h2>
          <p className="ec-texte">
            {v(
              "Partagez ce lien aux participants : chacun dépose ses photos depuis son téléphone, sans compte.",
              "Partage ce lien aux participants : chacun dépose ses photos depuis son téléphone, sans compte."
            )}
          </p>
        </>
      )}
      <div className="ec-lien-ligne">
        <input className="ec-champ" readOnly value={p.lienDepot} aria-label="Lien des participants" onFocus={(e) => e.currentTarget.select()} />
        <button type="button" className="ec-bouton ec-bouton--clair" onClick={copier}>
          {copie ? "Copié" : "Copier"}
        </button>
      </div>
      {p.plafondAtelier === null ? (
        <p className="ec-note">Le nombre de photos par participant sera fixé par l&apos;atelier.</p>
      ) : p.peutRegler && valeur !== null ? (
        <label className="ec-curseur">
          <span>
            Photos par participant : <strong>{valeur}</strong>
          </span>
          <input
            type="range"
            min={1}
            max={p.plafondAtelier}
            step={1}
            value={valeur}
            onChange={(e) => setValeur(Number(e.target.value))}
            onPointerUp={() => enregistrer(valeur)}
            onKeyUp={() => enregistrer(valeur)}
          />
        </label>
      ) : (
        <p className="ec-note">Photos par participant : {p.plafondClient ?? p.plafondAtelier}</p>
      )}
      {etat ? <p className={etat.ok ? "ec-note" : "ec-note ec-note--erreur"} role="status">{etat.texte}</p> : null}
    </section>
  );
}

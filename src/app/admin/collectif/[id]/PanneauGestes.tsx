"use client";

/* Les gestes de l'atelier sur l'état d'une édition, armés en deux temps :
   le premier clic demande au serveur ce qui va se passer (`verifier: true`),
   le second l'écrit. La table des gestes vit dans `@/lib/collectif/gestes`,
   relue par la route : cet écran ne décide rien.

   `menu` (15/10, la fiche en cartes) : les gestes se rangent derrière un
   bouton « Gestes » de l'en-tête, dans une fenêtre de verre qui se referme
   au clic dehors ou une fois le geste écrit.

   `seulement` + `bloc` (21/10, retour de Mathias : « Rouvrir la collecte », je ne le trouve
   pas) : le MÊME flux (vérifier, puis confirmer, avec le champ de la nouvelle clôture), pour UN
   seul geste, posé dans le bloc d'état de la collecte en tête de la fiche. Rien n'est réécrit :
   la règle est celle de `gestes.ts`, relue par la route. */

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { GESTES, GESTES_DE_LA_FICHE, type GesteCle } from "@/lib/collectif/gestes";
import type { EtatEdition } from "@/lib/collectif/etats";
import { instantDeParis } from "@/lib/collectif/dates";

type Verification = { libelle: string; explication: string; de: string; vers: string };

export default function PanneauGestes({
  id,
  etat,
  archivee,
  menu,
  seulement,
  bloc,
}: {
  id: string;
  etat: EtatEdition;
  archivee: boolean;
  menu?: boolean;
  /** Ne proposer que ce geste (le bloc de la collecte : « Rouvrir la collecte »). */
  seulement?: GesteCle;
  /** Rendu dans le bloc d'état : ni menu, ni carte, ni titre ; le bouton et sa confirmation prennent la place que le bloc leur laisse. */
  bloc?: boolean;
}) {
  const router = useRouter();
  const tiroir = useRef<HTMLDetailsElement>(null);
  const [choisi, setChoisi] = useState<GesteCle | null>(null);
  const [cloture, setCloture] = useState("");
  const [transporteur, setTransporteur] = useState("");
  const [suivi, setSuivi] = useState("");
  const [verif, setVerif] = useState<Verification | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);
  const [envoi, setEnvoi] = useState(false);

  /* Ce qui se propose ici : la fiche n'affiche pas un bouton condamné à être
     refusé. La route rejuge de toute façon. */
  const proposes = GESTES_DE_LA_FICHE.filter((c) => {
    if (seulement && c !== seulement) return false;
    if (c === "desarchiver") return archivee;
    if (archivee) return false;
    if (c === "archiver") return true;
    return GESTES[c].de.includes(etat);
  });

  function saisie(): Record<string, unknown> | null {
    if (choisi === "rouvrir_collecte") {
      const iso = cloture ? instantDeParis(cloture) : null;
      if (!iso) {
        setErreur("Indiquer la nouvelle date de clôture (heure de Paris).");
        return null;
      }
      return { cloture_le: iso };
    }
    if (choisi === "marquer_expediee") return { transporteur, suivi };
    return {};
  }

  async function appeler(verifier: boolean) {
    if (!choisi) return;
    const s = saisie();
    if (!s) return;
    setEnvoi(true);
    setErreur(null);
    try {
      const rep = await fetch(`/api/admin/collectif/editions/${id}/geste`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ cle: choisi, saisie: s, verifier }),
      });
      const json = (await rep.json().catch(() => ({}))) as {
        error?: string;
        erreurs?: { message: string }[];
        geste?: { libelle: string; explication: string };
        de?: string;
        vers?: string;
      };
      if (!rep.ok) {
        if (json.erreurs?.length) setErreur(json.erreurs.map((e) => e.message).join(" "));
        else if (json.error === "etat_change") setErreur("L'édition a changé entre-temps : la page se relit.");
        else setErreur(`Refusé (erreur ${rep.status}). Rien n'a changé.`);
        if (json.error === "etat_change") router.refresh();
        return;
      }
      if (verifier && json.geste) {
        setVerif({ libelle: json.geste.libelle, explication: json.geste.explication, de: json.de ?? "", vers: json.vers ?? "" });
        return;
      }
      setChoisi(null);
      setVerif(null);
      if (tiroir.current) tiroir.current.open = false;
      router.refresh();
    } catch {
      setErreur("Le réseau n'a pas répondu. Rien n'a changé.");
    } finally {
      setEnvoi(false);
    }
  }

  function choisir(c: GesteCle) {
    setChoisi(c === choisi ? null : c);
    setVerif(null);
    setErreur(null);
  }

  useEffect(() => {
    if (!menu) return;
    function dehors(ev: PointerEvent) {
      const d = tiroir.current;
      if (d?.open && !d.contains(ev.target as Node)) d.open = false;
    }
    document.addEventListener("pointerdown", dehors);
    return () => document.removeEventListener("pointerdown", dehors);
  }, [menu]);

  const corps = (
    <>
      {proposes.length === 0 ? (
        <p className="eca-vide">Aucun geste de l&apos;atelier à cette étape.</p>
      ) : (
        <div className="eca-gestes">
          {proposes.map((c) => (
            <button
              key={c}
              type="button"
              className={c === choisi ? "adm-btn" : "adm-btn adm-btn--ghost"}
              onClick={() => choisir(c)}
              aria-pressed={c === choisi}
            >
              {GESTES[c].libelle}
            </button>
          ))}
        </div>
      )}

      {choisi ? (
        <div className="eca-confirm eca-confirm--geste">
          <p>{GESTES[choisi].explication}</p>
          {choisi === "rouvrir_collecte" ? (
            <label className="eca-champ">
              <span className="eca-champ-label">Nouvelle clôture (heure de Paris)</span>
              <input className="eca-input" type="datetime-local" value={cloture} onChange={(e) => { setCloture(e.target.value); setVerif(null); }} />
            </label>
          ) : null}
          {choisi === "marquer_expediee" ? (
            <>
              <label className="eca-champ">
                <span className="eca-champ-label">Transporteur</span>
                <input className="eca-input" value={transporteur} onChange={(e) => { setTransporteur(e.target.value); setVerif(null); }} />
              </label>
              <label className="eca-champ">
                <span className="eca-champ-label">Numéro ou lien de suivi</span>
                <input className="eca-input" value={suivi} onChange={(e) => { setSuivi(e.target.value); setVerif(null); }} />
              </label>
            </>
          ) : null}
          {verif ? (
            <>
              <p>
                <strong>{verif.libelle}</strong> : {verif.de} → {verif.vers}.
              </p>
              <div className="eca-barre">
                <button type="button" className="adm-btn" disabled={envoi} onClick={() => appeler(false)}>
                  {envoi ? "En cours…" : "Confirmer"}
                </button>
                <button type="button" className="adm-btn adm-btn--ghost" onClick={() => choisir(choisi)}>
                  Annuler
                </button>
              </div>
            </>
          ) : (
            <div className="eca-barre">
              <button type="button" className="adm-btn" disabled={envoi} onClick={() => appeler(true)}>
                {envoi ? "Vérification…" : "Vérifier"}
              </button>
              <button type="button" className="adm-btn adm-btn--ghost" onClick={() => choisir(choisi)}>
                Annuler
              </button>
            </div>
          )}
        </div>
      ) : null}

      {erreur ? (
        <p className="eca-message eca-message--erreur eca-message--geste" role="alert">
          {erreur}
        </p>
      ) : null}
    </>
  );

  if (bloc) {
    if (proposes.length === 0) return null;
    return <div className="eca-collecte-gestes">{corps}</div>;
  }

  if (menu) {
    return (
      <details ref={tiroir} className="eca-gestes-menu">
        <summary className="eca-gestes-bouton">
          Gestes
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M6 9l6 6 6-6" />
          </svg>
        </summary>
        <div className="eca-gestes-pop">
          <span className="eca-gestes-pop-titre">Faire avancer l&apos;édition</span>
          {corps}
        </div>
      </details>
    );
  }

  return (
    <section className="ate-carte">
      <h2 className="ate-carte-titre">Gestes</h2>
      {corps}
    </section>
  );
}

"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { ActionVue, LigneDossier } from "./types";

/**
 * L'action, directement sur la ligne.
 *
 * ══════════════════════════════════════════════════════════════════════════
 * JAMAIS D'UN SEUL CLIC
 *
 * Ces boutons envoient des mails et lancent des impressions. Un clic unique
 * sur une ligne de tableau, c'est la faute qu'on commet en scrollant d'une
 * main. Chaque action passe donc par un état « armé » : le bouton se
 * transforme, annonce ce qui va se passer, et attend un second geste. Échap
 * ou un clic ailleurs désarme.
 *
 * CE QUI RESTE SUR LA FICHE
 * « Publier l'aperçu » demande trois images et une pagination : ça ne rentre
 * pas dans une ligne, et surtout ça mérite qu'on s'arrête. Le bouton ouvre
 * la fiche, il n'agit pas.
 * ══════════════════════════════════════════════════════════════════════════
 */

/* Les champs à remplir, par action. Libellés seulement — aucune règle
   métier ici : c'est le serveur qui valide, et lui seul (transitions.ts). */
const CHAMPS: Record<string, Array<{ cle: string; label: string; requis: boolean; type?: string }>> = {
  publier_maquette: [
    { cle: "canva_url", label: "Lien Canva à partager (commentaire)", requis: true, type: "url" },
    { cle: "maquette_pdf_url", label: "PDF feuilletable (facultatif)", requis: false, type: "url" },
  ],
  marquer_expediee: [
    { cle: "transporteur", label: "Transporteur", requis: true },
    { cle: "tracking_url", label: "Lien de suivi (facultatif)", requis: false, type: "url" },
  ],
};

/* Celles qui ne peuvent pas se faire ici : elles ouvrent la fiche. */
const SUR_LA_FICHE = new Set(["publier_apercu", "corriger_apercu"]);

export default function ActionRapide({
  ligne,
  demo,
  onFait,
}: {
  ligne: LigneDossier;
  demo?: boolean;
  onFait: (message: string) => void;
}) {
  const router = useRouter();
  const [armee, setArmee] = useState<ActionVue | null>(null);
  const [valeurs, setValeurs] = useState<Record<string, string>>({});
  const [occupe, setOccupe] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const [menuOuvert, setMenuOuvert] = useState(false);
  const boite = useRef<HTMLDivElement | null>(null);

  /* Échap désarme, et un clic hors de la boîte aussi : une action armée qu'on
     oublie sur une ligne pendant qu'on lit ailleurs est un piège. */
  useEffect(() => {
    if (!armee && !menuOuvert) return;
    const surTouche = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setArmee(null);
        setMenuOuvert(false);
        setErreur(null);
      }
    };
    const surClic = (e: MouseEvent) => {
      if (boite.current && !boite.current.contains(e.target as Node)) {
        setArmee(null);
        setMenuOuvert(false);
        setErreur(null);
      }
    };
    document.addEventListener("keydown", surTouche);
    document.addEventListener("mousedown", surClic);
    return () => {
      document.removeEventListener("keydown", surTouche);
      document.removeEventListener("mousedown", surClic);
    };
  }, [armee, menuOuvert]);

  if (!ligne.actions.length) return <span className="ate-act-rien">—</span>;

  const principale = ligne.actions[0];
  const autres = ligne.actions.slice(1);

  function armer(a: ActionVue) {
    setMenuOuvert(false);
    setErreur(null);
    const champs = CHAMPS[a.cle] ?? [];
    setValeurs(Object.fromEntries(champs.map((c) => [c.cle, ""])));
    setArmee(a);
  }

  async function executer(a: ActionVue) {
    const champs = CHAMPS[a.cle] ?? [];
    const manquant = champs.find((c) => c.requis && !valeurs[c.cle]?.trim());
    if (manquant) {
      setErreur(`${manquant.label} : à remplir.`);
      return;
    }

    if (demo) {
      setArmee(null);
      onFait(`Démonstration : « ${a.libelle} » n'a rien écrit.`);
      return;
    }

    setOccupe(true);
    setErreur(null);
    try {
      const r = await fetch("/api/admin/atelier/transition", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ token: ligne.token, action: a.cle, saisie: valeurs }),
      });
      const data = await r.json();

      if (r.status === 422) {
        setErreur(data.erreurs?.[0]?.message ?? "Saisie incomplète.");
        return;
      }
      if (r.status === 409) {
        setArmee(null);
        onFait("Ce dossier a changé entre-temps. La liste se recharge.");
        router.refresh();
        return;
      }
      if (!r.ok) {
        setErreur("Échec. Rien n'a été écrit.");
        return;
      }

      setArmee(null);
      const titre = ligne.titre?.trim() || "le dossier";
      onFait(
        data.mail?.statut === "envoye"
          ? `${titre} : ${a.libelle.toLowerCase()}. Mail ${data.mail.code} parti.`
          : `${titre} : ${a.libelle.toLowerCase()}.`,
      );
      router.refresh();
    } catch {
      setErreur("Réseau interrompu. Vérifie avant de recommencer.");
    } finally {
      setOccupe(false);
    }
  }

  /* Une action qui ouvre la fiche est un lien, pas un bouton : elle doit se
     comporter comme un lien (nouvel onglet au clic du milieu, etc.). */
  if (SUR_LA_FICHE.has(principale.cle) && !armee) {
    return (
      <div className="ate-act" ref={boite}>
        <a
          className="ate-act-btn ate-act-btn--principal"
          href={`${demo ? "/admin/atelier/demo" : "/admin/atelier"}/${ligne.token}`}
        >
          {principale.libelle}
        </a>
        {autres.length ? (
          <Overflow
            autres={autres}
            ouvert={menuOuvert}
            setOuvert={setMenuOuvert}
            onChoisir={armer}
          />
        ) : null}
      </div>
    );
  }

  if (!armee) {
    return (
      <div className="ate-act" ref={boite}>
        <button
          type="button"
          className="ate-act-btn ate-act-btn--principal"
          onClick={() => armer(principale)}
        >
          {principale.libelle}
        </button>
        {autres.length ? (
          <Overflow autres={autres} ouvert={menuOuvert} setOuvert={setMenuOuvert} onChoisir={armer} />
        ) : null}
      </div>
    );
  }

  const champs = CHAMPS[armee.cle] ?? [];

  return (
    <div className="ate-act ate-act--armee" ref={boite}>
      <div className="ate-act-boite">
        <p className="ate-act-quoi">{armee.explication}</p>

        {champs.map((c) => (
          <input
            key={c.cle}
            className="adm-input ate-act-input"
            type={c.type ?? "text"}
            placeholder={c.label}
            value={valeurs[c.cle] ?? ""}
            autoFocus={c === champs[0]}
            onChange={(e) => {
              setValeurs((v) => ({ ...v, [c.cle]: e.target.value }));
              setErreur(null);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") executer(armee);
            }}
          />
        ))}

        {/* Le mail est le vrai enjeu : ce qu'elle va recevoir, ou ne pas
            recevoir. C'est la dernière chose lue avant de confirmer. */}
        {/* Ce qui partira VRAIMENT : la règle d'envoi appliquée à ce dossier,
            pas une déclaration. La note explique le reste — pourquoi rien ne
            part, ou quand ça partira. */}
        <p className="ate-act-mail">
          {armee.mail ? (
            armee.mail.absent ? (
              <span className="ate-alerte">{armee.mail.code} pas encore câblé : elle ne sera PAS prévenue.</span>
            ) : (
              <>Le mail {armee.mail.code} partira.</>
            )
          ) : (
            "Aucun mail ne partira maintenant."
          )}
          {armee.note ? <span className="ate-faint"> {armee.note}</span> : null}
        </p>

        {erreur ? <p className="ate-act-erreur">{erreur}</p> : null}

        <div className="ate-act-boutons">
          <button
            type="button"
            className="ate-act-btn ate-act-btn--annuler"
            onClick={() => {
              setArmee(null);
              setErreur(null);
            }}
          >
            Annuler
          </button>
          <button
            type="button"
            className="ate-act-btn ate-act-btn--confirmer"
            disabled={occupe}
            onClick={() => executer(armee)}
          >
            {occupe ? "…" : "Confirmer"}
          </button>
        </div>
      </div>
    </div>
  );
}

function Overflow({
  autres,
  ouvert,
  setOuvert,
  onChoisir,
}: {
  autres: ActionVue[];
  ouvert: boolean;
  setOuvert: (v: boolean) => void;
  onChoisir: (a: ActionVue) => void;
}) {
  return (
    <div className="ate-act-plus">
      <button
        type="button"
        className="ate-act-btn ate-act-btn--plus"
        aria-label="Autres actions"
        aria-expanded={ouvert}
        onClick={() => setOuvert(!ouvert)}
      >
        ⋯
      </button>
      {ouvert ? (
        <ul className="ate-act-menu">
          {autres.map((a) => (
            <li key={a.cle}>
              <button type="button" onClick={() => onChoisir(a)}>
                {a.libelle}
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

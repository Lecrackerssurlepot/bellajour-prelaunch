"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { ActionVue, Fiche } from "../types";

/**
 * L'action du moment — le geste que ce lot remplace.
 *
 * ══════════════════════════════════════════════════════════════════════════
 * DEUX TEMPS, TOUJOURS : ON PRÉPARE, PUIS ON CONFIRME
 *
 * « Publier l'aperçu » ouvre une page de vente et envoie un mail avec un
 * prix. Ça ne se déclenche pas d'un clic distrait. Le premier bouton ne fait
 * qu'INTERROGER le serveur : il renvoie le palier, le prix et le nom de la
 * personne qui va recevoir le mail. Le second écrit.
 *
 * Le prix affiché n'est jamais calculé ici. Il vient du serveur, par le
 * chemin exact qui l'écrira (invariant nº2) : la grille de prix n'entre pas
 * dans le bundle du navigateur, même sur une page protégée.
 * ══════════════════════════════════════════════════════════════════════════
 */

type Verif = {
  action: { cle: string; libelle: string; vers: string; note?: string };
  resume: { nbPages?: number; palier?: string; euros?: number };
  destinataire: { prenom: string | null; email: string | null; titre: string | null };
};

type Erreur = { champ: string; message: string };

const SLOTS = [
  { cle: "apercu_c1", json: "c1", label: "Première de couverture" },
  { cle: "apercu_c4", json: "c4", label: "Quatrième de couverture" },
  { cle: "apercu_double", json: "double", label: "La double page" },
] as const;

export default function PanneauAction({ fiche, demo }: { fiche: Fiche; demo?: boolean }) {
  const router = useRouter();
  const [choisie, setChoisie] = useState<ActionVue | null>(
    fiche.actions.length === 1 ? fiche.actions[0] : null,
  );
  const [saisie, setSaisie] = useState<Record<string, string>>({
    nb_pages: fiche.ligne.nbPages ? String(fiche.ligne.nbPages) : "",
    apercu_c1: fiche.apercuBrut.c1 ?? "",
    apercu_c4: fiche.apercuBrut.c4 ?? "",
    apercu_double: fiche.apercuBrut.double ?? "",
    canva_url: fiche.canvaUrl ?? "",
    maquette_pdf_url: fiche.maquettePdfUrl ?? "",
    transporteur: fiche.transporteur ?? "",
    tracking_url: fiche.trackingUrl ?? "",
  });
  const [apercus, setApercus] = useState<Record<string, string>>({
    apercu_c1: fiche.apercu.c1 ?? "",
    apercu_c4: fiche.apercu.c4 ?? "",
    apercu_double: fiche.apercu.double ?? "",
  });
  const [envoiEnCours, setEnvoiEnCours] = useState<string | null>(null);
  const [erreurs, setErreurs] = useState<Erreur[]>([]);
  const [verif, setVerif] = useState<Verif | null>(null);
  const [occupe, setOccupe] = useState(false);
  const [fait, setFait] = useState<string | null>(null);
  const inputs = useRef<Record<string, HTMLInputElement | null>>({});

  const erreurDe = (champ: string) => erreurs.find((e) => e.champ === champ)?.message;
  const set = (champ: string, v: string) => {
    setSaisie((s) => ({ ...s, [champ]: v }));
    setVerif(null);
    setErreurs((e) => e.filter((x) => x.champ !== champ));
  };

  /* ── le dépôt d'un visuel ───────────────────────────────────────────
     Le fichier part DIRECTEMENT vers le coffre : il ne traverse jamais
     Vercel. La vignette affichée est l'objet local, pas un aller-retour
     réseau — l'atelier voit immédiatement ce qu'il vient de déposer. */
  async function televerser(champ: string, json: string, file: File) {
    setEnvoiEnCours(champ);
    setErreurs((e) => e.filter((x) => x.champ !== champ));
    try {
      const r = await fetch("/api/admin/atelier/apercu/presign", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          token: fiche.ligne.token,
          slot: json,
          nom: file.name,
          type: file.type,
          taille: file.size,
        }),
      });
      const data = await r.json();
      if (!r.ok) {
        const messages: Record<string, string> = {
          format_refuse: "Format refusé. JPEG, PNG, WebP ou HEIC.",
          taille_refusee: "Fichier trop lourd (50 Mo maximum).",
        };
        setErreurs((e) => [
          ...e,
          { champ, message: messages[data?.error] ?? "Envoi impossible." },
        ]);
        return;
      }

      /* ⚠️ On ne pose PAS Content-Length à la main : le navigateur le calcule
         et il DOIT valoir exactement la taille déclarée à la signature. Un
         octet d'écart, R2 répond 403 sans en-tête CORS, ce qui s'affiche
         comme une trompeuse erreur d'accès (piège nº1 du mémo d'upload). */
      const put = await fetch(data.url, {
        method: "PUT",
        headers: { "content-type": data.contentType },
        body: file,
      });
      if (!put.ok) {
        setErreurs((e) => [...e, { champ, message: "Le coffre a refusé le fichier." }]);
        return;
      }

      set(champ, data.key);
      setApercus((a) => ({ ...a, [champ]: URL.createObjectURL(file) }));
    } catch {
      setErreurs((e) => [...e, { champ, message: "Envoi interrompu. Réessaie." }]);
    } finally {
      setEnvoiEnCours(null);
    }
  }

  async function appeler(verifier: boolean) {
    if (!choisie) return;
    if (demo) {
      /* En démonstration, la vérification est simulée pour que le parcours
         se déroule en entier ; rien ne part, ni en base, ni chez Brevo. */
      setVerif({
        action: { cle: choisie.cle, libelle: choisie.libelle, vers: choisie.vers, note: choisie.note },
        resume: simulerResume(choisie.cle, saisie.nb_pages),
        destinataire: {
          prenom: fiche.ligne.prenom,
          email: fiche.ligne.email,
          titre: fiche.ligne.titre,
        },
      });
      if (!verifier) setFait("Rien n'a été écrit : c'est la démonstration.");
      return;
    }

    setOccupe(true);
    setErreurs([]);
    try {
      const r = await fetch("/api/admin/atelier/transition", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          token: fiche.ligne.token,
          action: choisie.cle,
          saisie,
          verifier,
        }),
      });
      const data = await r.json();

      if (r.status === 422) {
        setErreurs(data.erreurs ?? []);
        setVerif(null);
        return;
      }
      if (r.status === 409) {
        setFait("Le dossier a changé pendant que tu remplissais. La page se recharge.");
        router.refresh();
        return;
      }
      if (!r.ok) {
        setErreurs([{ champ: "action", message: "L'opération a échoué. Rien n'a été écrit." }]);
        return;
      }

      if (verifier) {
        setVerif(data as Verif);
        return;
      }

      const mail = data.mail;
      setFait(
        mail
          ? mail.statut === "envoye"
            ? `C'est fait. Le mail ${mail.code} est parti.`
            : mail.statut === "deja_envoye"
              ? `C'est fait. Le mail ${mail.code} était déjà parti.`
              : `C'est fait, mais le mail ${mail.code} n'est pas parti (${mail.statut}). La relève réessaiera.`
          : "C'est fait. Aucun mail n'était prévu à cette étape.",
      );
      setVerif(null);
      router.refresh();
    } catch {
      setErreurs([{ champ: "action", message: "Réseau interrompu. Vérifie l'état avant de recommencer." }]);
    } finally {
      setOccupe(false);
    }
  }

  if (!fiche.actions.length) {
    return (
      <section className="ate-carte ate-action">
        <h2 className="ate-carte-titre">L&apos;action du moment</h2>
        <p className="ate-faint">
          Rien à faire depuis « {fiche.ligne.libelleEtat} ». La suite ne dépend pas de nous.
        </p>
      </section>
    );
  }

  const besoinApercu = choisie?.cle === "publier_apercu" || choisie?.cle === "corriger_apercu";

  return (
    <section className="ate-carte ate-action">
      <h2 className="ate-carte-titre">L&apos;action du moment</h2>

      {fiche.actions.length > 1 ? (
        <div className="ate-choix">
          {fiche.actions.map((a) => (
            <button
              key={a.cle}
              type="button"
              className={choisie?.cle === a.cle ? "ate-choix-btn ate-choix-btn--actif" : "ate-choix-btn"}
              onClick={() => {
                setChoisie(a);
                setVerif(null);
                setErreurs([]);
              }}
            >
              {a.libelle}
            </button>
          ))}
        </div>
      ) : null}

      {choisie ? (
        <>
          <p className="ate-action-explication">{choisie.explication}</p>

          {besoinApercu ? (
            <>
              <div className="ate-slots">
                {SLOTS.map((s) => (
                  <div key={s.cle} className="ate-slot">
                    <span className="ate-slot-label">{s.label}</span>
                    <button
                      type="button"
                      className={apercus[s.cle] ? "ate-slot-zone ate-slot-zone--pleine" : "ate-slot-zone"}
                      onClick={() => inputs.current[s.cle]?.click()}
                      disabled={envoiEnCours !== null}
                    >
                      {apercus[s.cle] ? (
                        /* eslint-disable-next-line @next/next/no-img-element */
                        <img src={apercus[s.cle]} alt="" className="ate-slot-img" />
                      ) : envoiEnCours === s.cle ? (
                        <span className="ate-slot-vide">Envoi…</span>
                      ) : (
                        <span className="ate-slot-vide">Choisir le fichier</span>
                      )}
                    </button>
                    <input
                      ref={(el) => {
                        inputs.current[s.cle] = el;
                      }}
                      type="file"
                      accept="image/jpeg,image/png,image/webp,image/heic,image/heif"
                      hidden
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        if (f) televerser(s.cle, s.json, f);
                        e.target.value = "";
                      }}
                    />
                    {erreurDe(s.cle) ? <span className="ate-erreur">{erreurDe(s.cle)}</span> : null}
                  </div>
                ))}
              </div>

              <label className="ate-champ ate-champ--court">
                <span className="ate-champ-label">Nombre de pages composées</span>
                <input
                  className="adm-input"
                  type="number"
                  min={20}
                  max={50}
                  inputMode="numeric"
                  value={saisie.nb_pages}
                  onChange={(e) => set("nb_pages", e.target.value)}
                  placeholder="34"
                />
                <span className="ate-champ-aide">
                  Le prix en découle. De 20 à 50 pages, jamais saisi à la main.
                </span>
                {erreurDe("nb_pages") ? <span className="ate-erreur">{erreurDe("nb_pages")}</span> : null}
              </label>
            </>
          ) : null}

          {choisie.cle === "publier_maquette" ? (
            <>
              <label className="ate-champ">
                <span className="ate-champ-label">Lien Canva à PARTAGER</span>
                <input
                  className="adm-input"
                  type="url"
                  value={saisie.canva_url}
                  onChange={(e) => set("canva_url", e.target.value)}
                  placeholder="https://www.canva.com/design/…"
                />
                {/* PRD §11 : en édition, elle casse les fonds perdus, écrase une
                    police ou insère du 72 dpi, et ça se découvre à la livraison. */}
                <span className="ate-champ-aide ate-champ-aide--attention">
                  Mode COMMENTAIRE uniquement. Jamais le lien d&apos;édition.
                </span>
                {erreurDe("canva_url") ? <span className="ate-erreur">{erreurDe("canva_url")}</span> : null}
              </label>

              <label className="ate-champ">
                <span className="ate-champ-label">PDF feuilletable (facultatif)</span>
                <input
                  className="adm-input"
                  type="url"
                  value={saisie.maquette_pdf_url}
                  onChange={(e) => set("maquette_pdf_url", e.target.value)}
                  placeholder="https://…"
                />
                {erreurDe("maquette_pdf_url") ? (
                  <span className="ate-erreur">{erreurDe("maquette_pdf_url")}</span>
                ) : null}
              </label>
            </>
          ) : null}

          {choisie.cle === "marquer_expediee" ? (
            <>
              <label className="ate-champ ate-champ--court">
                <span className="ate-champ-label">Transporteur</span>
                <input
                  className="adm-input"
                  value={saisie.transporteur}
                  onChange={(e) => set("transporteur", e.target.value)}
                  placeholder="Colissimo"
                />
                {erreurDe("transporteur") ? <span className="ate-erreur">{erreurDe("transporteur")}</span> : null}
              </label>
              <label className="ate-champ">
                <span className="ate-champ-label">Lien de suivi (facultatif)</span>
                <input
                  className="adm-input"
                  type="url"
                  value={saisie.tracking_url}
                  onChange={(e) => set("tracking_url", e.target.value)}
                  placeholder="https://…"
                />
                {erreurDe("tracking_url") ? <span className="ate-erreur">{erreurDe("tracking_url")}</span> : null}
              </label>
            </>
          ) : null}

          {erreurDe("action") ? <p className="ate-erreur ate-erreur--bloc">{erreurDe("action")}</p> : null}
          {erreurDe("etat") ? <p className="ate-erreur ate-erreur--bloc">{erreurDe("etat")}</p> : null}

          {/* ── l'écran de confirmation ─────────────────────────────────
              Ce que la cliente va recevoir, avant que ça parte. C'est la
              réponse à « est-ce que j'ai bien envoyé les bonnes infos au bon
              client ». */}
          {verif ? (
            <div className="ate-confirm">
              <h3 className="ate-confirm-titre">Avant de confirmer</h3>
              <dl className="ate-confirm-liste">
                {verif.resume.nbPages ? (
                  <>
                    <dt>Pagination</dt>
                    <dd>{verif.resume.nbPages} pages</dd>
                    <dt>Prix</dt>
                    <dd className="ate-confirm-prix">
                      {verif.resume.euros}&nbsp;€ <span className="ate-faint">({verif.resume.palier})</span>
                    </dd>
                  </>
                ) : null}
                <dt>Destinataire</dt>
                <dd>
                  {verif.destinataire.prenom || "—"}{" "}
                  <span className="ate-faint">{verif.destinataire.email}</span>
                </dd>
                <dt>Mail</dt>
                <dd>
                  {/* Le mail vient de la RÈGLE d'envoi, projetée sur ce
                      dossier : ce qui est annoncé ici est ce qui partira une
                      seconde plus tard, pas ce qu'une table déclarait. */}
                  {choisie.mail ? (
                    choisie.mail.absent ? (
                      <span className="ate-alerte">
                        {choisie.mail.code} n&apos;est pas encore câblé — elle ne sera PAS prévenue.
                        Préviens-la à la main.
                      </span>
                    ) : (
                      <>Le mail {choisie.mail.code} partira maintenant.</>
                    )
                  ) : (
                    "Aucun mail ne partira maintenant."
                  )}
                  {verif.action.note ? (
                    <span className="ate-faint"> {verif.action.note}</span>
                  ) : null}
                </dd>
              </dl>

              <div className="ate-confirm-boutons">
                <a
                  className="adm-btn adm-btn--ghost"
                  href={`/numero/${fiche.ligne.token}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  Voir sa page
                </a>
                <button
                  className="adm-btn ate-btn-valider"
                  type="button"
                  disabled={occupe}
                  onClick={() => appeler(false)}
                >
                  {occupe ? "…" : `Confirmer — ${choisie.libelle}`}
                </button>
              </div>
            </div>
          ) : (
            <button
              className="adm-btn ate-btn-preparer"
              type="button"
              disabled={occupe || envoiEnCours !== null}
              onClick={() => appeler(true)}
            >
              {occupe ? "…" : "Préparer"}
            </button>
          )}

          {fait ? <p className="ate-fait">{fait}</p> : null}
        </>
      ) : (
        <p className="ate-faint">Choisis une action.</p>
      )}
    </section>
  );
}

/* Le seul calcul de prix côté navigateur de tout le projet, et il n'existe
   QUE pour la démonstration : sans lui, l'écran de confirmation de la démo
   serait vide et le parcours ne se raconterait pas. Il ne sert jamais sur un
   vrai dossier — là, le résumé vient du serveur. */
function simulerResume(cle: string, nbPagesBrut: string) {
  if (cle !== "publier_apercu" && cle !== "corriger_apercu") return {};
  const n = Number(nbPagesBrut);
  if (!Number.isInteger(n)) return {};
  if (n >= 20 && n <= 29) return { nbPages: n, palier: "p30", euros: 30 };
  if (n >= 30 && n <= 39) return { nbPages: n, palier: "p40", euros: 40 };
  if (n >= 40 && n <= 50) return { nbPages: n, palier: "p45", euros: 45 };
  return { nbPages: n };
}
